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
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import * as qs from 'qs';
import { error } from 'console';

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

  /* ======================================================
     BASIC PAYMENT CRUD
     ====================================================== */

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

  async findAll(
    status?: PaymentStatus,
    method?: PaymentMethod,
    currentUser?: JwtPayload,
  ) {
    const where: Prisma.PaymentWhereInput = {
      ...(status ? { status } : {}),
      ...(method ? { method } : {}),
      ...(currentUser && this.isCustomer(currentUser)
        ? { order: { userId: currentUser.sub } }
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
      include: { order: { select: { userId: true, status: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment khong ton tai');
    }

    this.assertOrderOwnership(payment.order.userId, currentUser);
    this.ensureOrderAllowsPayment(payment.order.status);

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

  async remove(id: string, currentUser: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: { select: { userId: true, status: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment khong ton tai');
    }

    this.assertOrderOwnership(payment.order.userId, currentUser);
    this.ensureOrderAllowsPayment(payment.order.status);

    return this.prisma.payment.delete({ where: { id } });
  }

  /* ======================================================
     VNPAY - CREATE PAYMENT URL
     ====================================================== */

  async createVnPayUrl(paymentId: string, ipAddr: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment || !payment.order) {
      throw new NotFoundException('Payment hoặc Order không tồn tại');
    }

    process.env.TZ = 'Asia/Ho_Chi_Minh';

    const amount = Number(payment.order.totalAmount);

    const vnpParams: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: process.env.VNP_TMN_CODE!,
      vnp_Amount: Math.round(amount * 100), // ✅ đảm bảo integer
      vnp_CurrCode: 'VND',
      vnp_TxnRef: paymentId,
      vnp_OrderInfo: `Thanh_toan_don_hang_${paymentId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: process.env.VNP_RETURN_URL!,
      vnp_IpAddr: ipAddr === '::1' ? '127.0.0.1' : ipAddr,
      vnp_CreateDate: dayjs().format('YYYYMMDDHHmmss'),
    };

    // ✅ giống demo: sort + encode value trước
    const sortedParams = this.sortObjectVnpay(vnpParams);

    const signData = qs.stringify(sortedParams, { encode: false });

    const secureHash = crypto
      .createHmac('sha512', process.env.VNP_HASH_SECRET!)
      .update(signData, 'utf-8')
      .digest('hex');

    sortedParams.vnp_SecureHash = secureHash;

    const paymentUrl =
      process.env.VNP_URL + '?' + qs.stringify(sortedParams, { encode: false });

    return { url: paymentUrl };
  }

  /* ======================================================
     VNPAY - IPN (SERVER → SERVER)  ✅ NGUỒN SỰ THẬT
     ====================================================== */

  async handleVnPayIpn(query: any) {
    if (!this.verifyVnPaySignature(query)) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const paymentId = query['vnp_TxnRef'];
    const responseCode = query['vnp_ResponseCode'];
    const amount = Number(query['vnp_Amount']);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { RspCode: '01', Message: 'Payment not found' };
    }

    if (amount !== Number(payment.amount) * 100) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    // Idempotent
    if (payment.status === PaymentStatus.PAID) {
      return { RspCode: '00', Message: 'Already processed' };
    }

    // Fail
    if (responseCode !== '00') {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });
      return { RspCode: '00', Message: 'Payment failed' };
    }

    // Success → update PAYMENT + ORDER
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          transactionId: query['vnp_TransactionNo'],
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });
    });

    return { RspCode: '00', Message: 'Success' };
  }

  /* ======================================================
     VNPAY - RETURN URL (BROWSER) ❌ KHÔNG UPDATE DB
     ====================================================== */

  handleVnPayReturn(query: any) {
    if (!this.verifyVnPaySignature(query)) {
      throw new BadRequestException('Chu ky khong hop le');
    }

    return {
      paymentId: query['vnp_TxnRef'],
      responseCode: query['vnp_ResponseCode'],
      success: query['vnp_ResponseCode'] === '00',
    };
  }

  /* ======================================================
     HELPERS
     ====================================================== */
  private verifyVnPaySignature(query: any): boolean {
    const secureHash = query['vnp_SecureHash'];
    if (!secureHash) return false;

    const cloned = { ...query };
    delete cloned['vnp_SecureHash'];
    delete cloned['vnp_SecureHashType'];

    // ✅ giống demo: sort + encode value rồi stringify encode:false
    const sorted = this.sortObjectVnpay(cloned);
    const signData = qs.stringify(sorted, { encode: false });

    const signed = crypto
      .createHmac('sha512', process.env.VNP_HASH_SECRET!)
      .update(signData, 'utf-8')
      .digest('hex');

    return signed === secureHash;
  }

  private sortObjectVnpay(obj: Record<string, any>) {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
      .map((k) => encodeURIComponent(k))
      .sort();

    for (const encKey of keys) {
      // key của bạn đều ASCII "vnp_..." nên encKey == key
      const rawVal = obj[decodeURIComponent(encKey)];
      sorted[encKey] = encodeURIComponent(String(rawVal)).replace(/%20/g, '+');
    }

    return sorted;
  }

  private assertOrderOwnership(orderUserId: string, currentUser?: JwtPayload) {
    if (!currentUser) {
      throw new ForbiddenException('Khong xac dinh nguoi dung');
    }

    if (this.isAdmin(currentUser)) return;

    if (orderUserId !== currentUser.sub) {
      throw new ForbiddenException('Khong co quyen truy cap don hang');
    }
  }

  private ensureOrderAllowsPayment(status: OrderStatus) {
    if (status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Khong the thanh toan don hang da huy');
    }
  }

  private isAdmin(user?: JwtPayload) {
    return user?.role === 'ADMIN';
  }

  private isCustomer(user?: JwtPayload) {
    return !this.isAdmin(user);
  }
}
