import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, ShipmentStatus } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
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

  async create(dto: CreateShipmentDto, currentUser: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order khong ton tai');
    }

    this.assertOrderOwnership(order.userId, currentUser);
    this.ensureOrderAllowsShipment(order.status);

    if (order.shipment) {
      throw new BadRequestException('Don hang nay da co thong tin van chuyen');
    }

    const shipment = await this.prisma.shipment.create({
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

    await this.updateOrderStatusFromShipment(dto.orderId, shipment.status);
    return shipment;
  }

  async findAll(status?: ShipmentStatus, currentUser?: JwtPayload) {
    const where: Prisma.ShipmentWhereInput = {
      ...(status ? { status } : {}),
      ...(currentUser && this.isCustomer(currentUser)
        ? { order: { userId: currentUser.sub } }
        : {}),
    };

    return this.prisma.shipment.findMany({
      where,
      include: this.defaultInclude,
      orderBy: { shippedAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: this.defaultInclude,
    });

    if (!shipment) {
      throw new NotFoundException('Shipment khong ton tai');
    }

    this.assertOrderOwnership(shipment.order.userId, currentUser);
    return shipment;
  }

  async update(id: string, dto: UpdateShipmentDto, currentUser: JwtPayload) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { userId: true, status: true } } },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment khong ton tai');
    }

    this.assertOrderOwnership(shipment.order.userId, currentUser);
    this.ensureOrderAllowsShipment(shipment.order.status);

    const updated = await this.prisma.shipment.update({
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

    await this.updateOrderStatusFromShipment(updated.order.id, updated.status);
    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { userId: true, status: true } } },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment khong ton tai');
    }

    this.assertOrderOwnership(shipment.order.userId, currentUser);
    this.ensureOrderAllowsShipment(shipment.order.status);

    return this.prisma.shipment.delete({ where: { id } });
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

  private ensureOrderAllowsShipment(status: OrderStatus) {
    if (status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Khong the giao hang cho don da huy');
    }
    if (status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Don hang da giao, khong the thay doi van chuyen');
    }
  }

  private async updateOrderStatusFromShipment(orderId: string, status: ShipmentStatus) {
    if (status === ShipmentStatus.DELIVERED) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED },
      });
    } else if (status === ShipmentStatus.IN_TRANSIT) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SHIPPED },
      });
    } else if (status === ShipmentStatus.RETURNED) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
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
