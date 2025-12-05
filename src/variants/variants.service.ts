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
  volume?: number;
  stock: number;
};

type UpdateVariantPayload = Partial<
  Pick<CreateVariantPayload, 'materialId' | 'name' | 'volume' | 'stock'>
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
            printFile: { select: { volume: true } },
          },
        },
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
      orderBy: { createdAt: 'desc' },
    });

    // Calculate price for each variant using volume ratio
    return variants.map((variant) => ({
      ...variant,
      price: this.calculatePrice(
        Number(variant.product.basePrice),
        variant.volume,
        variant.product.printFile?.volume,
        variant.material.priceFactor,
        variant.material.pricePerMm3,
      ),
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
            printFile: { select: { volume: true } },
          },
        },
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
      orderBy: { name: 'asc' },
    });

    // Calculate price for each variant using volume ratio
    return variants.map((variant) => ({
      ...variant,
      price: this.calculatePrice(
        Number(variant.product.basePrice),
        variant.volume,
        variant.product.printFile?.volume,
        variant.material.priceFactor,
        variant.material.pricePerMm3,
      ),
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
            printFile: { select: { volume: true } },
          },
        },
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
    });

    if (!variant) {
      throw new NotFoundException(ERROR_MESSAGES.VARIANT.NOT_FOUND);
    }

    return {
      ...variant,
      price: this.calculatePrice(
        Number(variant.product.basePrice),
        variant.volume,
        variant.product.printFile?.volume,
        variant.material.priceFactor,
        variant.material.pricePerMm3,
      ),
    };
  }

  async create(payload: CreateVariantPayload) {
    const { productId, materialId, name, volume, stock } = payload;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true },
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
        volume,
        stock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            printFile: { select: { volume: true } },
          },
        },
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
    });

    return {
      ...variant,
      price: this.calculatePrice(
        Number(variant.product.basePrice),
        variant.volume,
        variant.product.printFile?.volume,
        variant.material.priceFactor,
        variant.material.pricePerMm3,
      ),
    };
  }

  async update(id: string, dto: UpdateVariantPayload, user: any) {
    const existing = await this.prisma.variant.findUnique({
      where: { id },
      include: {
        product: { select: { userId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.VARIANT.NOT_FOUND);
    }

    // Check if user is admin or product owner
    if (
      user?.role !== UserRole.ADMIN &&
      existing.product.userId !== user?.sub
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.VARIANT.PERMISSION_DENIED);
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
        volume: dto.volume !== undefined ? dto.volume : existing.volume,
        stock: dto.stock ?? existing.stock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            printFile: { select: { volume: true } },
          },
        },
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
    });

    return {
      ...updated,
      price: this.calculatePrice(
        Number(updated.product.basePrice),
        updated.volume,
        updated.product.printFile?.volume,
        updated.material.priceFactor,
        updated.material.pricePerMm3,
      ),
    };
  }

  async delete(id: string, user: any) {
    const existing = await this.prisma.variant.findUnique({
      where: { id },
      include: {
        product: { select: { userId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.VARIANT.NOT_FOUND);
    }

    // Check if user is admin or product owner
    if (
      user?.role !== UserRole.ADMIN &&
      existing.product.userId !== user?.sub
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.VARIANT.PERMISSION_DENIED);
    }

    await this.prisma.variant.delete({
      where: { id },
    });

    return { message: ERROR_MESSAGES.VARIANT.DELETED_SUCCESS };
  }

  private calculatePrice(
    basePrice: number,
    variantVolume?: number | null,
    printFileVolume?: number | null,
    materialPriceFactor?: number | null,
    materialPricePerMm3?: number | null,
  ): number {
    if (basePrice === 0 && materialPricePerMm3 && variantVolume) {
      return materialPricePerMm3 * variantVolume;
    } else {
      const volumeRatio =
        printFileVolume && variantVolume
          ? variantVolume / printFileVolume
          : 1.0;
      return basePrice * volumeRatio * (materialPriceFactor ?? 1.0);
    }
  }
}
