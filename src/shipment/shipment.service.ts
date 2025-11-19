import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentService {
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

  async create(dto: CreateShipmentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, shipment: true },
    });

    if (!order) {
      throw new NotFoundException('Order không tồn tại');
    }

    if (order.shipment) {
      throw new BadRequestException('Đơn hàng này đã có thông tin vận chuyển');
    }

    return this.prisma.shipment.create({
      data: {
        orderId: dto.orderId,
        carrier: dto.carrier,
        trackingNo: dto.trackingNo,
        status: dto.status ?? ShipmentStatus.PREPARING,
        shippedAt: dto.shippedAt ? new Date(dto.shippedAt) : undefined,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : undefined,
      },
      include: this.defaultInclude,
    });
  }

  async findAll(status?: ShipmentStatus) {
    const where = status ? { status } : {};
    return this.prisma.shipment.findMany({
      where,
      include: this.defaultInclude,
      orderBy: { shippedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: this.defaultInclude,
    });

    if (!shipment) {
      throw new NotFoundException('Shipment không tồn tại');
    }

    return shipment;
  }

  async update(id: string, dto: UpdateShipmentDto) {
    await this.ensureShipmentExists(id);

    return this.prisma.shipment.update({
      where: { id },
      data: {
        carrier: dto.carrier,
        trackingNo: dto.trackingNo,
        status: dto.status,
        shippedAt: dto.shippedAt ? new Date(dto.shippedAt) : undefined,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : undefined,
      },
      include: this.defaultInclude,
    });
  }

  async remove(id: string) {
    await this.ensureShipmentExists(id);
    return this.prisma.shipment.delete({ where: { id } });
  }

  private async ensureShipmentExists(id: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) {
      throw new NotFoundException('Shipment không tồn tại');
    }
  }
}
