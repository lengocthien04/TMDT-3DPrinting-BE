import { Injectable, NotFoundException } from '@nestjs/common';
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
        price: true,
        product: { select: { id: true, name: true } },
      },
    },
  } as const;

  async create(dto: CreateOrderItemDto) {
    await this.ensureOrderExists(dto.orderId);
    await this.ensureVariantExists(dto.variantId);

    return this.prisma.orderItem.create({
      data: {
        orderId: dto.orderId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        price: dto.price,
      },
      include: this.include,
    });
  }

  async findByOrder(orderId: string) {
    await this.ensureOrderExists(orderId);
    return this.prisma.orderItem.findMany({
      where: { orderId },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      include: this.include,
    });

    if (!item) {
      throw new NotFoundException('Order item không tồn tại');
    }

    return item;
  }

  async update(id: string, dto: UpdateOrderItemDto) {
    await this.findOne(id);

    if (dto.variantId) {
      await this.ensureVariantExists(dto.variantId);
    }

    return this.prisma.orderItem.update({
      where: { id },
      data: {
        variantId: dto.variantId,
        quantity: dto.quantity,
        price: dto.price,
      },
      include: this.include,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.orderItem.delete({ where: { id } });
  }

  private async ensureOrderExists(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order không tồn tại');
    }
  }

  private async ensureVariantExists(variantId: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundException('Variant không tồn tại');
    }
  }
}
