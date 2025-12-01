import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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
  tags?: string[];
};

type UpdateProductPayload = Partial<CreateProductPayload>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};

    const products = await this.prisma.product.findMany({
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

    // Transform tags to return only tag data without productId/tagId
    return products.map((product) => ({
      ...product,
      tags: product.tags.map((pt) => pt.tag),
    }));
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
      tags: product.tags.map((pt) => pt.tag),
    };

    return productWithPrices;
  }

  async create(payload: CreateProductPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.PRODUCT.PERMISSION_DENIED);
    }

    const { name, description, basePrice, isActive, images, tags } = payload;

    // Validate all tags exist
    if (tags?.length) {
      const existingTags = await this.prisma.tag.findMany({
        where: { id: { in: tags } },
      });

      if (existingTags.length !== tags.length) {
        throw new BadRequestException('One or more tag IDs do not exist.');
      }
    }

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
        tags: tags?.length
          ? {
              create: tags.map((tagId) => ({
                tag: { connect: { id: tagId } },
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

    return {
      ...product,
      tags: product.tags.map((pt) => pt.tag),
    };
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
        tags: {
          select: { tagId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    // Validate all new tags exist
    if (dto.tags?.length) {
      const existingTags = await this.prisma.tag.findMany({
        where: { id: { in: dto.tags } },
      });

      if (existingTags.length !== dto.tags.length) {
        throw new BadRequestException('One or more tag IDs do not exist.');
      }
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

    // Handle tag updates if tags array is provided
    if (dto.tags !== undefined) {
      const existingTagIds = existing.tags.map((pt) => pt.tagId);
      const newTagIds = dto.tags || [];

      // Find tags to add
      const tagsToAdd = newTagIds.filter((id) => !existingTagIds.includes(id));

      // Find tags to remove
      const tagsToRemove = existingTagIds.filter(
        (id) => !newTagIds.includes(id),
      );

      // Delete tag links that are no longer needed
      if (tagsToRemove.length > 0) {
        await this.prisma.productTag.deleteMany({
          where: {
            productId: id,
            tagId: { in: tagsToRemove },
          },
        });
      }

      // Create new tag links
      if (tagsToAdd.length > 0) {
        await this.prisma.productTag.createMany({
          data: tagsToAdd.map((tagId) => ({
            productId: id,
            tagId,
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

    return {
      ...updated,
      tags: updated.tags.map((pt) => pt.tag),
    };
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
