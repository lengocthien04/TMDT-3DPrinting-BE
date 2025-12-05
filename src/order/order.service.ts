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
  Prisma,
  Shipment as ShipmentModel,
  ShipmentStatus,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  //them ham ship & fax fee
  private calculateShippingFee(subTotal: number): number {
  // Ví dụ: ship cố định 50k như Figma
  if (subTotal <= 0) return 0;
  return 50_000;
}

private calculateTaxAmount(taxBase: number): number {
  // Ví dụ: thuế 6% để ra 15k từ 250k trong mock (200k + 50k)
  const TAX_RATE = 0.06;
  return Math.round(taxBase * TAX_RATE);
}


  private readonly orderInclude = {
    items: {
      include: {
        variant: {
          select: {
            id: true,
            //sku: true,
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
    voucher: {
      select: { id: true, code: true, discount: true, expiresAt: true, isActive: true },
    },
  } as const;
/*
  async create(dto: CreateOrderDto, currentUser: JwtPayload) {
    if (!dto.items?.length) {
      throw new BadRequestException('Don hang phai co it nhat 1 san pham');
    }

    const userId = this.resolveUserId(dto.userId, currentUser);
    this.assertOwnership(userId, currentUser);
    await this.ensureAddressBelongsToUser(dto.addressId, userId);

    const variants = await this.loadVariants(dto.items);
    const itemsTotal = this.calculateTotalFromVariants(dto.items, variants);
    const voucherResult = dto.voucherCode
      ? await this.applyVoucherCode(dto.voucherCode, itemsTotal)
      : null;

    const totalAmount = this.applyDiscount(itemsTotal, voucherResult?.discountAmount);

    return this.prisma.order.create({
      data: {
        userId,
        addressId: dto.addressId,
        status: dto.status ?? OrderStatus.PENDING,
        totalAmount,
        discountAmount: voucherResult?.discountAmount ?? 0,
        voucherId: voucherResult?.voucherId,
        items: {
          create: dto.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            price: variants[item.variantId].price,
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
  } */
 async create(dto: CreateOrderDto, currentUser: JwtPayload) {
  const userId = this.resolveUserId(dto.userId, currentUser);

  await this.ensureAddressBelongsToUser(dto.addressId, userId);

  // 1. Lấy variants + tính tổng tiền sản phẩm
  const variants = await this.loadVariants(dto.items);
  const itemsTotal = this.calculateTotalFromVariants(dto.items, variants);


  const subTotal = itemsTotal;

  // 2. Tính phí ship & thuế
  const shippingFee = this.calculateShippingFee(subTotal);
  const taxBase = subTotal + shippingFee;
  const taxAmount = this.calculateTaxAmount(taxBase);

  // 3. Áp voucher (nếu có)
  let discountAmount = 0;
  let voucherId: string | null = null;

  if (dto.voucherCode) {
    const voucherResult = await this.applyVoucherCode(dto.voucherCode, taxBase);
    discountAmount = voucherResult.discountAmount;
    voucherId = voucherResult.voucherId;
  }

  // 4. Tổng cuối cùng
  const totalAmount = taxBase + taxAmount - discountAmount;

  // 5. Tạo order
  const order = await this.prisma.order.create({
    data: {
      userId,
      addressId: dto.addressId,
      status: dto.status ?? OrderStatus.PENDING,

      subTotal,
      shippingFee,
      taxAmount,
      discountAmount,
      totalAmount,
      voucherId,

      items: {
        create: dto.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          price: variants[item.variantId].price, // giá chốt theo DB
        })),
      },

      payment: dto.payment
        ? {
            create: {
              ...dto.payment,
              // nếu FE không gửi amount thì mặc định = totalAmount
              amount:
                dto.payment.amount !== undefined
                  ? dto.payment.amount
                  : totalAmount,
            },
          }
        : undefined,

      shipment: dto.shipment
        ? {
            create: dto.shipment,
          }
        : undefined,
    },
    include: this.orderInclude,
  });

  return order;
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
  // Thêm vào trong class OrderService, bên dưới/ bên trên findOne đều được
private async findOneOrThrow(id: string) {
  const order = await this.prisma.order.findUnique({
    where: { id },
    include: this.orderInclude,
  });

  if (!order) {
    throw new NotFoundException('Order khong ton tai');
  }

  return order;
}


  /*
  async update(id: string, dto: UpdateOrderDto, currentUser: JwtPayload) {
    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        shipment: true,
        user: { select: { id: true } },
        voucher: { select: { id: true, code: true, discount: true, expiresAt: true, isActive: true } },
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

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.order.update({
          where: { id },
          data: {
            items: {
              create: dto.items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
                price: variants![item.variantId].price,
              })),
            },
          },
        });
      }

      const itemsTotal = await this.calculateItemsTotalFromDb(id, tx);
      const voucherResult = await this.resolveVoucherForUpdate({
        incomingCode: dto.voucherCode,
        existingVoucherId: existing.voucher?.id ?? null,
        itemsTotal,
        client: tx,
      });

      const totalAmount = this.applyDiscount(itemsTotal, voucherResult?.discountAmount);

      const updated = await tx.order.update({
        where: { id },
        data: {
          addressId: dto.addressId ?? existing.addressId,
          status: dto.status ?? existing.status,
          totalAmount,
          discountAmount: voucherResult?.discountAmount ?? 0,
          voucherId: voucherResult?.voucherId ?? null,
          payment: this.buildPaymentWrite(existing.payment, dto.payment, totalAmount),
          shipment: this.buildShipmentWrite(existing.shipment, dto.shipment),
        },
        include: this.orderInclude,
      });

      return updated;
    });
  } */
 async update(id: string, dto: UpdateOrderDto, currentUser: JwtPayload) {
  const existing = await this.findOneOrThrow(id);

  this.assertOwnership(existing.userId, currentUser);

  // update address / status / payment / shipment như cũ...

  // Nếu có items mới → xóa items cũ, tạo lại
  let subTotal = existing.subTotal.toNumber(); // nếu dùng Prisma.Decimal
  if (dto.items && dto.items.length > 0) {
    await this.prisma.orderItem.deleteMany({ where: { orderId: id } });

    const variants = await this.loadVariants(dto.items);
  const itemsTotal = this.calculateTotalFromVariants(dto.items, variants);


    await this.prisma.orderItem.createMany({
      data: dto.items.map((item) => ({
        orderId: id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: variants[item.variantId].price,
      })),
    });

    subTotal = itemsTotal;
  }

  // Tính lại shippingFee & taxAmount (có thể giữ nguyên rule hoặc cho sửa qua dto)
  const shippingFee = this.calculateShippingFee(subTotal);
  const taxBase = subTotal + shippingFee;
  const taxAmount = this.calculateTaxAmount(taxBase);

  // Áp voucher
  let discountAmount = existing.discountAmount.toNumber();
  let voucherId = existing.voucherId;

  if (dto.voucherCode !== undefined) {
    if (dto.voucherCode === null) {
      // hủy voucher
      discountAmount = 0;
      voucherId = null;
    } else {
      const voucherResult = await this.applyVoucherCode(
        dto.voucherCode,
        taxBase,
      );
      discountAmount = voucherResult.discountAmount;
      voucherId = voucherResult.voucherId;
    }
  }

  const totalAmount = taxBase + taxAmount - discountAmount;

  return this.prisma.order.update({
    where: { id },
    data: {
      addressId: dto.addressId ?? existing.addressId,
      status: dto.status ?? existing.status,
      subTotal,
      shippingFee,
      taxAmount,
      discountAmount,
      totalAmount,
      voucherId,
      // payment / shipment update như code cũ của bạn
    },
    include: this.orderInclude,
  });
}


  async remove(id: string, currentUser: JwtPayload) {
    await this.findOne(id, currentUser);
    return this.prisma.order.delete({ where: { id }, include: this.orderInclude });
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

  private applyDiscount(total: number, discountAmount = 0) {
    return Math.max(0, total - discountAmount);
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
      map[v.id] = { price: Number(v.product.basePrice), stock: (v as any).stock };
    });

    for (const item of items) {
      const variant = map[item.variantId];
      if (variant.stock !== undefined && variant.stock !== null && item.quantity > variant.stock) {
        throw new BadRequestException('So luong vuot qua ton kho');
      }
    }

    return map;
  }

  private async calculateItemsTotalFromDb(
    orderId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const items = await client.orderItem.findMany({
      where: { orderId },
      select: { quantity: true, price: true },
    });

    return items.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);
  }

  private async applyVoucherCode(
    code: string,
    total: number,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const voucher = await client.voucher.findUnique({
      where: { code },
      select: { id: true, code: true, discount: true, expiresAt: true, isActive: true },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher khong ton tai');
    }

    this.validateVoucher(voucher);
    const discountAmount = this.calculateDiscount(total, voucher.discount);
    return { voucherId: voucher.id, discountAmount };
  }

  private async applyVoucherId(
    voucherId: string,
    total: number,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const voucher = await client.voucher.findUnique({
      where: { id: voucherId },
      select: { id: true, code: true, discount: true, expiresAt: true, isActive: true },
    });
    if (!voucher) {
      throw new NotFoundException('Voucher khong ton tai');
    }
    this.validateVoucher(voucher);
    const discountAmount = this.calculateDiscount(total, voucher.discount);
    return { voucherId: voucher.id, discountAmount };
  }

  private validateVoucher(voucher: { isActive: boolean; expiresAt: Date }) {
    if (!voucher.isActive) {
      throw new BadRequestException('Voucher khong hoat dong');
    }
    if (voucher.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Voucher da het han');
    }
  }

  private calculateDiscount(total: number, discountRate: number) {
    const rate = Math.min(Math.max(discountRate, 0), 1);
    return total * rate;
  }

  private async resolveVoucherForUpdate(params: {
    incomingCode?: string | null;
    existingVoucherId: string | null;
    itemsTotal: number;
    client: PrismaService | Prisma.TransactionClient;
  }) {
    const { incomingCode, existingVoucherId, itemsTotal, client } = params;
    if (incomingCode === null) {
      return null;
    }
    if (incomingCode) {
      return this.applyVoucherCode(incomingCode, itemsTotal, client);
    }
    if (existingVoucherId) {
      return this.applyVoucherId(existingVoucherId, itemsTotal, client);
    }
    return null;
  }

  private resolveUserId(userId: string | undefined, currentUser: JwtPayload) {
    if (userId) {
      if (!this.isAdmin(currentUser) && userId !== currentUser.sub) {
        throw new ForbiddenException('Khong co quyen tao don hang cho nguoi dung khac');
      }
      return userId;
    }
    return currentUser.sub;
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
