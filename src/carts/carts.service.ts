import { Injectable, NotFoundException } from '@nestjs/common';
import { CartItemsService } from '../cart-items/cart-items.service';
import { ERROR_MESSAGES } from '../common/constants/app.constants';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartItemsService: CartItemsService,
  ) {}

  async getOrCreate(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Get items using cart-items service
    const items = await this.cartItemsService.findByUser(userId);

    return {
      ...cart,
      items,
    };
  }

  async delete(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
    }

    await this.prisma.cart.delete({ where: { id: cart.id } });

    return { message: 'Cart deleted successfully' };
  }
}
