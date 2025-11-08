import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/app.constants';

type CreateVariantPayload = {
  productId: string;
  materialId: string;
  name: string;
  stock: number;
};

type UpdateVariantPayload = Partial<
  Pick<CreateVariantPayload, 'materialId' | 'name' | 'stock'>
>;

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const variants = await this.prisma.variant.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
        material: {
          select: {
            id: true,
            name: true,
            color: true,
            priceFactor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate price for each variant
    return variants.map((variant) => ({
      ...variant,
      price:
        Number(variant.product.basePrice) *
        (variant.material.priceFactor ?? 1.0),
    }));
  }

  async findByProduct(productId: string) {
    if (!productId) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
    }

    const variants = await this.prisma.variant.findMany({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
        material: {
          select: {
            id: true,
            name: true,
            color: true,
            priceFactor: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate price for each variant
    return variants.map((variant) => ({
      ...variant,
      price:
        Number(variant.product.basePrice) *
        (variant.material.priceFactor ?? 1.0),
    }));
  }

  async findOne(id: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
          },
        },
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
    });

    if (!variant) {
      throw new NotFoundException(ERROR_MESSAGES.VARIANT.NOT_FOUND);
    }

    // Calculate price
    return {
      ...variant,
      price:
        Number(variant.product.basePrice) *
        (variant.material.priceFactor ?? 1.0),
    };
  }

  async create(payload: CreateVariantPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.VARIANT.PERMISSION_DENIED);
    }

    const { productId, materialId, name, stock } = payload;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    // Verify material exists
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true },
    });

    if (!material) {
      throw new NotFoundException(ERROR_MESSAGES.MATERIAL.NOT_FOUND);
    }

    const variant = await this.prisma.variant.create({
      data: {
        productId,
        materialId,
        name,
        stock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
        material: {
          select: {
            id: true,
            name: true,
            color: true,
            priceFactor: true,
          },
        },
      },
    });

    // Calculate price
    return {
      ...variant,
      price:
        Number(variant.product.basePrice) *
        (variant.material.priceFactor ?? 1.0),
    };
  }

  async update(id: string, dto: UpdateVariantPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.VARIANT.PERMISSION_DENIED);
    }

    const existing = await this.prisma.variant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.VARIANT.NOT_FOUND);
    }

    // If materialId is being updated, verify the material exists
    if (dto.materialId) {
      const material = await this.prisma.material.findUnique({
        where: { id: dto.materialId },
        select: { id: true },
      });

      if (!material) {
        throw new NotFoundException(ERROR_MESSAGES.MATERIAL.NOT_FOUND);
      }

      // Check if a variant with the same product and new material already exists
      const duplicate = await this.prisma.variant.findFirst({
        where: {
          productId: existing.productId,
          materialId: dto.materialId,
          id: { not: id }, // Exclude current variant
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'A variant with this product and material combination already exists.',
        );
      }
    }

    const updated = await this.prisma.variant.update({
      where: { id },
      data: {
        materialId: dto.materialId ?? existing.materialId,
        name: dto.name ?? existing.name,
        stock: dto.stock ?? existing.stock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
        material: {
          select: {
            id: true,
            name: true,
            color: true,
            priceFactor: true,
          },
        },
      },
    });

    // Calculate price
    return {
      ...updated,
      price:
        Number(updated.product.basePrice) *
        (updated.material.priceFactor ?? 1.0),
    };
  }

  async delete(id: string, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.VARIANT.PERMISSION_DENIED);
    }

    const existing = await this.prisma.variant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.VARIANT.NOT_FOUND);
    }

    await this.prisma.variant.delete({
      where: { id },
    });

    return { message: ERROR_MESSAGES.VARIANT.DELETED_SUCCESS };
  }
}
