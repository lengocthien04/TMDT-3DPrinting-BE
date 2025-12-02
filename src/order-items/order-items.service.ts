import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@Injectable()
export class OrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    variant: {
      select: {
        id: true,
        sku: true,
        product: { select: { id: true, name: true } },
      },
    },
  } as const;

  async create(dto: CreateOrderItemDto, currentUser: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.ensureOrderExists(dto.orderId, tx);
      this.assertOwnership(order.userId, currentUser);
      const variant = await this.ensureVariant(dto.variantId, tx);
      this.ensureStock(dto.quantity, variant.stock);

      const item = await tx.orderItem.create({
        data: {
          orderId: dto.orderId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          price: variant.price,
        },
        include: this.include,
      });

      await this.recalculateOrderTotal(dto.orderId, tx);
      return item;
    });
  }

  async findByOrder(orderId: string, currentUser: JwtPayload) {
    const order = await this.ensureOrderExists(orderId);
    this.assertOwnership(order.userId, currentUser);

    return this.prisma.orderItem.findMany({
      where: { orderId },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      include: { ...this.include, order: { select: { userId: true } } },
    });

    if (!item) {
      throw new NotFoundException('Order item khong ton tai');
    }

    this.assertOwnership(item.order.userId, currentUser);
    return item;
  }

  async update(id: string, dto: UpdateOrderItemDto, currentUser: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findOneWithClient(id, tx);
      this.assertOwnership(existing.order.userId, currentUser);

      const variantId = dto.variantId ?? existing.variantId;
      const variant = await this.ensureVariant(variantId, tx);
      const quantity = dto.quantity ?? existing.quantity;
      this.ensureStock(quantity, variant.stock);

      const updated = await tx.orderItem.update({
        where: { id },
        data: {
          variantId,
          quantity,
          price: variant.price,
        },
        include: this.include,
      });

      await this.recalculateOrderTotal(existing.order.id, tx);
      return updated;
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findOneWithClient(id, tx);
      this.assertOwnership(existing.order.userId, currentUser);
      const deleted = await tx.orderItem.delete({ where: { id } });
      await this.recalculateOrderTotal(existing.order.id, tx);
      return deleted;
    });
  }

  private async ensureOrderExists(
    orderId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });

    if (!order) {
      throw new NotFoundException('Order khong ton tai');
    }
    return order;
  }

  private async ensureVariant(
    variantId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const variant = await client.variant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        stock: true,
        product: { select: { basePrice: true } },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant khong ton tai');
    }

    return {
      id: variant.id,
      price: Number(variant.product.basePrice),
      stock: (variant as any).stock,
    };
  }

  private async findOneWithClient(
    id: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const item = await client.orderItem.findUnique({
      where: { id },
      select: {
        id: true,
        variantId: true,
        quantity: true,
        order: { select: { id: true, userId: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Order item khong ton tai');
    }

    return item;
  }

  private async recalculateOrderTotal(
    orderId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const [items, order] = await Promise.all([
      client.orderItem.findMany({
        where: { orderId },
        select: { quantity: true, price: true },
      }),
      client.order.findUnique({
        where: { id: orderId },
        select: {
          voucher: {
            select: {
              id: true,
              discount: true,
              expiresAt: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    const itemsTotal = items.reduce(
      (sum, item) => sum + item.quantity * Number(item.price),
      0,
    );

    let discountAmount = 0;
    if (order?.voucher) {
      if (!order.voucher.isActive) {
        throw new BadRequestException('Voucher khong hoat dong');
      }
      if (order.voucher.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Voucher da het han');
      }
      const rate = Math.min(Math.max(order.voucher.discount, 0), 1);
      discountAmount = itemsTotal * rate;
    }

    await client.order.update({
      where: { id: orderId },
      data: { totalAmount: Math.max(0, itemsTotal - discountAmount), discountAmount },
    });
  }

  private assertOwnership(orderUserId: string, currentUser?: JwtPayload) {
    if (!currentUser) {
      throw new ForbiddenException('Khong xac dinh nguoi dung');
    }
    if (currentUser.role === 'ADMIN') {
      return;
    }
    if (orderUserId !== currentUser.sub) {
      throw new ForbiddenException('Khong co quyen truy cap don hang nay');
    }
  }

  private ensureStock(quantity: number, stock?: number | null) {
    if (stock !== undefined && stock !== null && quantity > stock) {
      throw new BadRequestException('So luong vuot qua ton kho');
    }
  }
}
