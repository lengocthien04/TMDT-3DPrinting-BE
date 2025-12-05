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
  printFileId?: string;
};

type UpdateProductPayload = Partial<CreateProductPayload>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: boolean, userId?: string, userRole?: string) {
    const filter: any = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (userId) filter.userId = userId;
    if (userRole) filter.user = { role: userRole };

    const products = await this.prisma.product.findMany({
      where: filter,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true,
          },
        },
        variants: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                color: true,
                priceFactor: true,
                pricePerMm3: true,
              },
            },
          },
        },
        images: {
          select: { id: true, url: true, altText: true },
        },
        printFile: true,
        tags: {
          include: {
            tag: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { reviews: true, qnas: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform tags and flatten user profile
    return products.map((product) => ({
      ...product,
      user: product.user
        ? {
            id: product.user.id,
            email: product.user.email,
            role: product.user.role,
            fullName: product.user.profile?.fullName || null,
          }
        : null,
      tags: product.tags.map((pt) => pt.tag),
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true,
          },
        },
        variants: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                color: true,
                density: true,
                priceFactor: true,
                pricePerMm3: true,
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
        printFile: true,
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
                profile: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    // Calculate price for each variant and flatten user profile
    return {
      ...product,
      user: product.user
        ? {
            id: product.user.id,
            email: product.user.email,
            role: product.user.role,
            fullName: product.user.profile?.fullName || null,
          }
        : null,
      variants: product.variants.map((variant) => ({
        ...variant,
        price:
          Number(product.basePrice) * (variant.material.priceFactor ?? 1.0),
      })),
      tags: product.tags.map((pt) => pt.tag),
    };
  }

  async create(payload: CreateProductPayload, user: any) {
    const {
      name,
      description,
      basePrice,
      isActive,
      images,
      tags,
      printFileId,
    } = payload;

    // Validate print file exists if provided
    if (printFileId) {
      const printFile = await this.prisma.printFile.findUnique({
        where: { id: printFileId },
      });

      if (!printFile) {
        throw new BadRequestException('Print file not found.');
      }

      if (printFile.productId) {
        throw new BadRequestException(
          'Print file is already linked to another product.',
        );
      }
    }

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
        userId: user?.sub,
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
        printFile: true,
        tags: { include: { tag: true } },
      },
    });

    // Link print file if provided
    if (printFileId) {
      await this.prisma.printFile.update({
        where: { id: printFileId },
        data: { productId: product.id },
      });
    }

    return {
      ...product,
      tags: product.tags.map((pt) => pt.tag),
    };
  }

  async update(id: string, dto: UpdateProductPayload, user: any) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        basePrice: true,
        isActive: true,
        images: { select: { id: true, url: true } },
        tags: { select: { tagId: true } },
        printFile: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    // Check if user is admin or owner
    if (user?.role !== UserRole.ADMIN && existing.userId !== user?.sub) {
      throw new ForbiddenException(ERROR_MESSAGES.PRODUCT.PERMISSION_DENIED);
    }

    // Validate print file if provided
    if (dto.printFileId !== undefined) {
      if (dto.printFileId) {
        const printFile = await this.prisma.printFile.findUnique({
          where: { id: dto.printFileId },
        });

        if (!printFile) {
          throw new BadRequestException('Print file not found.');
        }

        if (printFile.productId && printFile.productId !== id) {
          throw new BadRequestException(
            'Print file is already linked to another product.',
          );
        }
      }
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

    // Handle print file updates
    if (dto.printFileId !== undefined) {
      const currentPrintFileId = existing.printFile?.id;

      // If changing print file
      if (currentPrintFileId !== dto.printFileId) {
        // Unlink old print file
        if (currentPrintFileId) {
          await this.prisma.printFile.update({
            where: { id: currentPrintFileId },
            data: { productId: null },
          });
        }

        // Link new print file
        if (dto.printFileId) {
          await this.prisma.printFile.update({
            where: { id: dto.printFileId },
            data: { productId: id },
          });
        }
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
                pricePerMm3: true,
              },
            },
          },
        },
        images: true,
        printFile: true,
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

  async delete(id: string, user: any) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    // Check if user is admin or owner
    if (user?.role !== UserRole.ADMIN && existing.userId !== user?.sub) {
      throw new ForbiddenException(ERROR_MESSAGES.PRODUCT.PERMISSION_DENIED);
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: ERROR_MESSAGES.PRODUCT.DELETED_SUCCESS };
  }
}
