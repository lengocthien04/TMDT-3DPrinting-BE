import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVoucherDto) {
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
      throw new NotFoundException('Voucher không tồn tại');
    }

    return voucher;
  }

  async update(id: string, dto: UpdateVoucherDto) {
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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.voucher.delete({ where: { id } });
  }
}
