import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/app.constants';

type CreateProductPayload = {
  name: string;
  description?: string;
  basePrice: number;
  isActive?: boolean;
  images?: string[];
};

type UpdateProductPayload = Partial<CreateProductPayload>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};

    return this.prisma.product.findMany({
      where,
      include: {
        variants: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                color: true,
                priceFactor: true,
              },
            },
          },
        },
        images: {
          select: { id: true, url: true, altText: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { reviews: true, qnas: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                color: true,
                density: true,
                priceFactor: true,
              },
            },
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            type: true,
            altText: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: { fullName: true, avatarUrl: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        qnas: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: { fullName: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    // Calculate price for each variant
    const productWithPrices = {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        price:
          Number(product.basePrice) * (variant.material.priceFactor ?? 1.0),
      })),
    };

    return productWithPrices;
  }

  async create(payload: CreateProductPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.PRODUCT.PERMISSION_DENIED);
    }

    const { name, description, basePrice, isActive, images } = payload;

    const product = await this.prisma.product.create({
      data: {
        name,
        description,
        basePrice,
        isActive: isActive ?? true,
        images: images?.length
          ? {
              create: images.map((url) => ({
                url,
                type: 'image',
                altText: name,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
        images: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    return product;
  }

  async update(id: string, dto: UpdateProductPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.PRODUCT.PERMISSION_DENIED);
    }

    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          select: { id: true, url: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    // Handle image updates if images array is provided
    if (dto.images !== undefined) {
      const existingUrls = existing.images.map((img) => img.url);
      const newUrls = dto.images || [];

      // Find URLs to add (in newUrls but not in existingUrls)
      const urlsToAdd = newUrls.filter((url) => !existingUrls.includes(url));

      // Find URLs to delete (in existingUrls but not in newUrls)
      const urlsToDelete = existingUrls.filter((url) => !newUrls.includes(url));

      // Delete media assets that are no longer needed
      if (urlsToDelete.length > 0) {
        await this.prisma.mediaAsset.deleteMany({
          where: {
            productId: id,
            url: { in: urlsToDelete },
          },
        });
      }

      // Create new media assets
      if (urlsToAdd.length > 0) {
        await this.prisma.mediaAsset.createMany({
          data: urlsToAdd.map((url) => ({
            productId: id,
            url,
            type: 'image',
            altText: dto.name ?? existing.name,
          })),
        });
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        basePrice: dto.basePrice ?? existing.basePrice,
        isActive: dto.isActive ?? existing.isActive,
      },
      include: {
        variants: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                color: true,
                priceFactor: true,
              },
            },
          },
        },
        images: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    return updated;
  }

  async delete(id: string, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.PRODUCT.PERMISSION_DENIED);
    }

    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: ERROR_MESSAGES.PRODUCT.DELETED_SUCCESS };
  }
}
