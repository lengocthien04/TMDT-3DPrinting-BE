import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from '../common/constants/app.constants';
import { PrismaService } from '../database/prisma.service';

type CreateCartItemPayload = {
  variantId: string;
  quantity: number;
  note?: string;
};

type UpdateCartItemPayload = Partial<
  Pick<CreateCartItemPayload, 'quantity' | 'note'>
>;

@Injectable()
export class CartItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, payload: CreateCartItemPayload) {
    const { variantId, quantity, note } = payload;

    if (!quantity || quantity < 1) {
      throw new BadRequestException(ERROR_MESSAGES.CART_ITEM.INVALID_QUANTITY);
    }

    // Get or create user's cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Verify variant exists
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException(ERROR_MESSAGES.VARIANT.NOT_FOUND);

    // Check if item already exists in cart
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.CART_ITEM.ALREADY_EXISTS);
    }

    const cartItem = await this.prisma.cartItem.create({
      data: { cartId: cart.id, variantId, quantity, note },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            stock: true,
            volume: true,
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
                priceFactor: true,
                pricePerMm3: true,
              },
            },
          },
        },
      },
    });

    return {
      ...cartItem,
      variant: {
        ...cartItem.variant,
        price: this.calculatePrice(
          Number(cartItem.variant.product.basePrice),
          cartItem.variant.volume,
          cartItem.variant.product.printFile?.volume,
          cartItem.variant.material.priceFactor,
          cartItem.variant.material.pricePerMm3,
        ),
      },
    };
  }

  async findByUser(userId: string) {
    // Get user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      return []; // User has no cart yet
    }

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            stock: true,
            volume: true,
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
                priceFactor: true,
                pricePerMm3: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate price for each variant using volume ratio
    return items.map((item) => {
      const printFileVolume = item.variant.product.printFile?.volume;
      const variantVolume = item.variant.volume;
      const volumeRatio =
        printFileVolume && variantVolume
          ? variantVolume / printFileVolume
          : 1.0;

      return {
        ...item,
        variant: {
          ...item.variant,
          price: this.calculatePrice(
            Number(item.variant.product.basePrice),
            item.variant.volume,
            item.variant.product.printFile?.volume,
            item.variant.material.priceFactor,
            item.variant.material.pricePerMm3,
          ),
        },
      };
    });
  }

  async update(userId: string, itemId: string, dto: UpdateCartItemPayload) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true } } },
    });
    if (!existing)
      throw new NotFoundException(ERROR_MESSAGES.CART_ITEM.NOT_FOUND);

    if (existing.cart.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CART_ITEM.PERMISSION_DENIED);
    }

    if (dto.quantity !== undefined && dto.quantity < 1) {
      throw new BadRequestException(ERROR_MESSAGES.CART_ITEM.INVALID_QUANTITY);
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity ?? existing.quantity,
        note: dto.note !== undefined ? dto.note : existing.note,
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            stock: true,
            volume: true,
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
                priceFactor: true,
                pricePerMm3: true,
              },
            },
          },
        },
      },
    });

    return {
      ...updated,
      variant: {
        ...updated.variant,
        price: this.calculatePrice(
          Number(updated.variant.product.basePrice),
          updated.variant.volume,
          updated.variant.product.printFile?.volume,
          updated.variant.material.priceFactor,
          updated.variant.material.pricePerMm3,
        ),
      },
    };
  }

  async delete(userId: string, itemId: string) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true } } },
    });
    if (!existing)
      throw new NotFoundException(ERROR_MESSAGES.CART_ITEM.NOT_FOUND);

    if (existing.cart.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CART_ITEM.PERMISSION_DENIED);
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return { message: ERROR_MESSAGES.CART_ITEM.DELETED_SUCCESS };
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
