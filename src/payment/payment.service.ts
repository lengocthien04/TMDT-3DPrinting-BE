import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    order: {
      select: {
        id: true,
        userId: true,
        status: true,
        totalAmount: true,
      },
    },
  } as const;

  async create(dto: CreatePaymentDto, currentUser: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        totalAmount: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order khong ton tai');
    }

    this.assertOrderOwnership(order.userId, currentUser);
    this.ensureOrderAllowsPayment(order.status);

    if (order.payment) {
      throw new BadRequestException('Don hang nay da co thong tin thanh toan');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        method: dto.method,
        status: dto.status ?? PaymentStatus.UNPAID,
        amount: dto.amount ?? Number(order.totalAmount),
        transactionId: dto.transactionId,
      },
      include: this.defaultInclude,
    });

    if (payment.status === PaymentStatus.PAID) {
      await this.markOrderPaid(payment.order.id, payment.order.status);
    }

    return payment;
  }

  async findAll(
    status?: PaymentStatus,
    method?: PaymentMethod,
    currentUser?: JwtPayload,
  ) {
    const where: Prisma.PaymentWhereInput = {
      ...(status ? { status } : {}),
      ...(method ? { method } : {}),
      ...(currentUser && this.isCustomer(currentUser)
        ? {
            order: { userId: currentUser.sub },
          }
        : {}),
    };

    return this.prisma.payment.findMany({
      where,
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: this.defaultInclude,
    });

    if (!payment) {
      throw new NotFoundException('Payment khong ton tai');
    }

    this.assertOrderOwnership(payment.order.userId, currentUser);
    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto, currentUser: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: { select: { id: true, userId: true, status: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment khong ton tai');
    }

    this.assertOrderOwnership(payment.order.userId, currentUser);
    this.ensureOrderAllowsPayment(payment.order.status);

    if (payment.status === PaymentStatus.PAID && dto.status && dto.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Khong the sua thanh toan da thanh cong sang trang thai khac');
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        method: dto.method,
        status: dto.status,
        amount: dto.amount,
        transactionId: dto.transactionId,
      },
      include: this.defaultInclude,
    });

    if (dto.status === PaymentStatus.PAID) {
      await this.markOrderPaid(payment.order.id, payment.order.status);
    }

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: { select: { id: true, userId: true, status: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment khong ton tai');
    }

    this.assertOrderOwnership(payment.order.userId, currentUser);
    this.ensureOrderAllowsPayment(payment.order.status);
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Khong the xoa thanh toan da thanh cong');
    }

    return this.prisma.payment.delete({ where: { id } });
  }

  private assertOrderOwnership(orderUserId: string, currentUser?: JwtPayload) {
    if (!currentUser) {
      throw new ForbiddenException('Khong xac dinh nguoi dung');
    }

    if (this.isAdmin(currentUser)) {
      return;
    }

    if (orderUserId !== currentUser.sub) {
      throw new ForbiddenException('Ban khong co quyen truy cap don hang nay');
    }
  }

  private ensureOrderAllowsPayment(status: OrderStatus) {
    if (status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Khong the thanh toan cho don hang da huy');
    }
    if (status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Don hang da giao, khong the thay doi thanh toan');
    }
  }

  private async markOrderPaid(orderId: string, currentStatus: OrderStatus) {
    const terminalStatuses: OrderStatus[] = [
      OrderStatus.CANCELLED,
      OrderStatus.DELIVERED,
    ];
    if (terminalStatuses.includes(currentStatus)) {
      return;
    }
    if (currentStatus === OrderStatus.PENDING) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });
    }
  }

  private isAdmin(user?: JwtPayload) {
    return user?.role === 'ADMIN';
  }

  private isCustomer(user?: JwtPayload) {
    return !this.isAdmin(user);
  }
}
