import {
  BadRequestException,
  ForbiddenException,
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
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Decimal } from '@prisma/client/runtime/library';

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
            material: {
              select: { id: true, name: true, color: true },
            },
            product: {
              select: { id: true, name: true, basePrice: true },
            },
          },
        },
      },
    },
    payment: true,
    shipment: true,
    address: true,
  } as const;

  async create(dto: CreateOrderDto, userId: string) {
    const { shippingAddress, items } = dto;

    return this.prisma.$transaction(async (tx) => {
      const variants = await tx.variant.findMany({
        where: {
          id: { in: items.map((i) => i.variantId) },
        },
        include: {
          product: true,
        },
      });

      if (variants.length !== items.length) {
        throw new NotFoundException('Một hoặc nhiều variant không tồn tại');
      }

      // 2️⃣ Map price + tính totalAmount
      let totalAmount = new Decimal(0);

      const orderItemsData = items.map((item) => {
        const variant = variants.find((v) => v.id === item.variantId)!;
        const price = new Decimal(variant.product.basePrice);
        totalAmount = totalAmount.add(price.mul(item.quantity));

        return {
          variantId: item.variantId,
          quantity: item.quantity,
          price, // Decimal
        };
      });

      // 3️⃣ TẠO ADDRESS (AUTO FILL)
      const address = await tx.address.create({
        data: {
          userId,
          recipient: shippingAddress.recipient,
          phone: shippingAddress.phone,
          address1: shippingAddress.addressText,
          city: 'Ho Chi Minh City',
          state: 'Ho Chi Minh',
          postal: '700000',
          country: 'Vietnam',
          isDefault: false,
        },
      });

      // 4️⃣ TẠO ORDER (ĐÃ CÓ totalAmount)
      const order = await tx.order.create({
        data: {
          userId,
          addressId: address.id,
          status: 'PENDING',
          totalAmount, // ✅ FIX LỖI TS
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
          address: true,
        },
      });

      return order;
    });
  }

  async findAll(
    userId: string | undefined,
    status: OrderStatus | undefined,
    currentUser?: JwtPayload,
  ) {
    const scopedUserId =
      currentUser && !this.isAdmin(currentUser) ? currentUser.sub : userId;

    return this.prisma.order.findMany({
      where: {
        ...(scopedUserId ? { userId: scopedUserId } : {}),
        ...(status ? { status } : {}),
      },
      include: this.orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order khong ton tai');
    }

    this.assertOwnership(order.userId, currentUser);
    return order;
  }

  async update(id: string, dto: UpdateOrderDto, currentUser: JwtPayload) {
    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        shipment: true,
        user: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Order khong ton tai');
    }

    this.assertOwnership(existing.userId, currentUser);

    if (dto.items && dto.items.length === 0) {
      throw new BadRequestException('Danh sach san pham khong hop le');
    }

    if (dto.addressId) {
      await this.ensureAddressBelongsToUser(dto.addressId, existing.userId);
    }

    const variants = dto.items ? await this.loadVariants(dto.items) : null;

    const totalAmount =
      dto.totalAmount ??
      (dto.items && variants
        ? this.calculateTotalFromVariants(dto.items, variants)
        : Number(existing.totalAmount));

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
                  price: variants![item.variantId].price,
                })),
              }
            : undefined,
          payment: this.buildPaymentWrite(
            existing.payment,
            dto.payment,
            totalAmount,
          ),
          shipment: this.buildShipmentWrite(existing.shipment, dto.shipment),
        },
        include: this.orderInclude,
      });

      return updated;
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    await this.findOne(id, currentUser);
    return this.prisma.order.delete({
      where: { id },
      include: this.orderInclude,
    });
  }

  private calculateTotalFromVariants(
    items: OrderItemDto[],
    variants: Record<string, { price: number; stock?: number | null }>,
  ) {
    return items.reduce(
      (sum, item) => sum + item.quantity * variants[item.variantId].price,
      0,
    );
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

  private async ensureAddressBelongsToUser(addressId: string, userId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
      select: { userId: true },
    });

    if (!address) {
      throw new NotFoundException('Address khong ton tai');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('Dia chi khong thuoc nguoi dung nay');
    }
  }

  private async loadVariants(items: OrderItemDto[]) {
    const ids = [...new Set(items.map((i) => i.variantId))];
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        stock: true,
        product: { select: { basePrice: true } },
      },
    });

    if (variants.length !== ids.length) {
      throw new NotFoundException('Co bien the khong ton tai');
    }

    const map: Record<string, { price: number; stock?: number | null }> = {};
    variants.forEach((v) => {
      map[v.id] = {
        price: Number(v.product.basePrice),
        stock: (v as any).stock,
      };
    });

    for (const item of items) {
      const variant = map[item.variantId];
      if (
        variant.stock !== undefined &&
        variant.stock !== null &&
        item.quantity > variant.stock
      ) {
        throw new BadRequestException('So luong vuot qua ton kho');
      }
    }

    return map;
  }

  private assertOwnership(orderUserId: string, currentUser?: JwtPayload) {
    if (!currentUser) {
      throw new ForbiddenException('Khong xac dinh nguoi dung');
    }
    if (this.isAdmin(currentUser)) {
      return;
    }
    if (orderUserId !== currentUser.sub) {
      throw new ForbiddenException('Khong co quyen truy cap don hang nay');
    }
  }

  private isAdmin(user?: JwtPayload) {
    return user?.role === 'ADMIN';
  }
}
