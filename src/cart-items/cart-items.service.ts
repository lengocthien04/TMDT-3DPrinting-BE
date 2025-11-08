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
};

type UpdateCartItemPayload = Partial<Pick<CreateCartItemPayload, 'quantity'>>;

@Injectable()
export class CartItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, payload: CreateCartItemPayload) {
    const { variantId, quantity } = payload;

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
      data: { cartId: cart.id, variantId, quantity },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            stock: true,
            product: { select: { id: true, name: true, basePrice: true } },
            material: { select: { id: true, name: true, priceFactor: true } },
          },
        },
      },
    });

    return {
      ...cartItem,
      variant: {
        ...cartItem.variant,
        price:
          Number(cartItem.variant.product.basePrice) *
          (cartItem.variant.material.priceFactor ?? 1.0),
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
            product: { select: { id: true, name: true, basePrice: true } },
            material: { select: { id: true, name: true, priceFactor: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate price for each variant
    return items.map((item) => ({
      ...item,
      variant: {
        ...item.variant,
        price:
          Number(item.variant.product.basePrice) *
          (item.variant.material.priceFactor ?? 1.0),
      },
    }));
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
      data: { quantity: dto.quantity ?? existing.quantity },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            stock: true,
            product: { select: { id: true, name: true, basePrice: true } },
            material: { select: { id: true, name: true, priceFactor: true } },
          },
        },
      },
    });

    return {
      ...updated,
      variant: {
        ...updated.variant,
        price:
          Number(updated.variant.product.basePrice) *
          (updated.variant.material.priceFactor ?? 1.0),
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
}
