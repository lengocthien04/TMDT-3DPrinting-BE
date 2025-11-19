import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
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

  async create(dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, totalAmount: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order không tồn tại');
    }

    if (order.payment) {
      throw new BadRequestException('Đơn hàng này đã có thông tin thanh toán');
    }

    return this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        method: dto.method,
        status: dto.status ?? PaymentStatus.UNPAID,
        amount: dto.amount ?? Number(order.totalAmount),
        transactionId: dto.transactionId,
      },
      include: this.defaultInclude,
    });
  }

  async findAll(status?: PaymentStatus, method?: PaymentMethod) {
    return this.prisma.payment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(method ? { method } : {}),
      },
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: this.defaultInclude,
    });

    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    await this.ensurePaymentExists(id);

    return this.prisma.payment.update({
      where: { id },
      data: {
        method: dto.method,
        status: dto.status,
        amount: dto.amount,
        transactionId: dto.transactionId,
      },
      include: this.defaultInclude,
    });
  }

  async remove(id: string) {
    await this.ensurePaymentExists(id);
    return this.prisma.payment.delete({ where: { id } });
  }

  private async ensurePaymentExists(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment không tồn tại');
    }
  }
}
