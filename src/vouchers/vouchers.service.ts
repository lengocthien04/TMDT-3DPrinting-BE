import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../database/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVoucherDto, currentUser: JwtPayload) {
    this.assertAdmin(currentUser);
    this.ensureVoucherValidity(dto.discount, dto.expiresAt);

    return this.prisma.voucher.create({
      data: {
        code: dto.code,
        discount: dto.discount,
        expiresAt: new Date(dto.expiresAt),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(isActive?: boolean) {
    const now = new Date();
    return this.prisma.voucher.findMany({
      where:
        isActive === undefined
          ? { isActive: true, expiresAt: { gt: now } }
          : { isActive, ...(isActive ? { expiresAt: { gt: now } } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });

    if (!voucher) {
      throw new NotFoundException('Voucher khong ton tai');
    }

    return voucher;
  }

  async update(id: string, dto: UpdateVoucherDto, currentUser: JwtPayload) {
    this.assertAdmin(currentUser);
    const existing = await this.findOne(id);
    this.ensureVoucherValidity(dto.discount ?? existing.discount, dto.expiresAt ?? existing.expiresAt.toISOString());

    return this.prisma.voucher.update({
      where: { id },
      data: {
        code: dto.code,
        discount: dto.discount,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    this.assertAdmin(currentUser);
    await this.findOne(id);
    return this.prisma.voucher.delete({ where: { id } });
  }

  private assertAdmin(user?: JwtPayload) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Chi ADMIN moi thuc hien duoc hanh dong nay');
    }
  }

  private ensureVoucherValidity(discount: number, expiresAt: string | Date) {
    const rate = Number(discount);
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      throw new BadRequestException('Discount phai trong khoang tu 0 den 1');
    }
    const expiry = new Date(expiresAt);
    if (expiry.getTime() <= Date.now()) {
      throw new BadRequestException('Ngay het han phai o tuong lai');
    }
  }
}
