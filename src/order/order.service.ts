import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Payment as PaymentModel,
  PaymentMethod,
  PaymentStatus,
  Shipment as ShipmentModel,
  ShipmentStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly orderInclude = {
    items: {
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            price: true,
            material: {
              select: { id: true, name: true, color: true },
            },
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    },
    payment: true,
    shipment: true,
    address: true,
  } as const;

  async create(dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    const totalAmount = dto.totalAmount ?? this.calculateTotal(dto.items);

    return this.prisma.order.create({
      data: {
        userId: dto.userId,
        addressId: dto.addressId,
        status: dto.status ?? OrderStatus.PENDING,
        totalAmount,
        items: {
          create: dto.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
        payment: dto.payment
          ? {
              create: {
                method: dto.payment.method,
                status: dto.payment.status ?? PaymentStatus.UNPAID,
                amount: dto.payment.amount ?? totalAmount,
                transactionId: dto.payment.transactionId,
              },
            }
          : undefined,
        shipment: dto.shipment
          ? {
              create: {
                carrier: dto.shipment.carrier,
                trackingNo: dto.shipment.trackingNo,
                status: dto.shipment.status ?? ShipmentStatus.PREPARING,
                shippedAt: this.toDate(dto.shipment.shippedAt),
                deliveredAt: this.toDate(dto.shipment.deliveredAt),
              },
            }
          : undefined,
      },
      include: this.orderInclude,
    });
  }

  async findAll(userId?: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(status ? { status } : {}),
      },
      include: this.orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order không tồn tại');
    }

    return order;
  }

  async update(id: string, dto: UpdateOrderDto) {
    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        shipment: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Order không tồn tại');
    }

    if (dto.items && dto.items.length === 0) {
      throw new BadRequestException('Danh sách sản phẩm không hợp lệ');
    }

    const totalAmount =
      dto.totalAmount ??
      (dto.items ? this.calculateTotal(dto.items) : Number(existing.totalAmount));

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          addressId: dto.addressId ?? existing.addressId,
          status: dto.status ?? existing.status,
          totalAmount,
          items: dto.items
            ? {
                create: dto.items.map((item) => ({
                  variantId: item.variantId,
                  quantity: item.quantity,
                  price: item.price,
                })),
              }
            : undefined,
          payment: this.buildPaymentWrite(existing.payment, dto.payment, totalAmount),
          shipment: this.buildShipmentWrite(existing.shipment, dto.shipment),
        },
        include: this.orderInclude,
      });

      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id }, include: this.orderInclude });
  }

  private calculateTotal(items: OrderItemDto[]) {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private buildPaymentWrite(
    existing: PaymentModel | null,
    data: UpdateOrderDto['payment'],
    fallbackAmount: number,
  ) {
    if (!data) {
      return undefined;
    }

    if (existing) {
      return {
        update: {
          method: data.method,
          status: data.status,
          amount: data.amount ?? fallbackAmount,
          transactionId: data.transactionId,
        },
      };
    }

    return {
      create: {
        method: data.method ?? PaymentMethod.CREDIT_CARD,
        status: data.status ?? PaymentStatus.UNPAID,
        amount: data.amount ?? fallbackAmount,
        transactionId: data.transactionId,
      },
    };
  }

  private buildShipmentWrite(
    existing: ShipmentModel | null,
    data: UpdateOrderDto['shipment'],
  ) {
    if (!data) {
      return undefined;
    }

    if (existing) {
      return {
        update: {
          carrier: data.carrier,
          trackingNo: data.trackingNo,
          status: data.status,
          shippedAt: this.toDate(data.shippedAt),
          deliveredAt: this.toDate(data.deliveredAt),
        },
      };
    }

    return {
      create: {
        carrier: data.carrier,
        trackingNo: data.trackingNo,
        status: data.status ?? ShipmentStatus.PREPARING,
        shippedAt: this.toDate(data.shippedAt),
        deliveredAt: this.toDate(data.deliveredAt),
      },
    };
  }
}
