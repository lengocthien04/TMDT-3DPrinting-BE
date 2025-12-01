import {
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
    return this.prisma.voucher.findMany({
      where: isActive === undefined ? undefined : { isActive },
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
    await this.findOne(id);

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
}
