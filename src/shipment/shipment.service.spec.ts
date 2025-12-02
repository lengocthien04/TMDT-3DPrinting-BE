import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, ShipmentStatus } from '@prisma/client';
import { ShipmentService } from './shipment.service';

const customer = { sub: 'user-1', role: 'CUSTOMER' } as any;
const admin = { sub: 'admin-1', role: 'ADMIN' } as any;

describe('ShipmentService', () => {
  const prismaMock = {
    order: { findUnique: jest.fn() },
    shipment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as any;

  let service: ShipmentService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ShipmentService(prismaMock);
  });

  it('should forbid creating shipment for other user order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'o1',
      userId: 'other-user',
      status: OrderStatus.PENDING,
      shipment: null,
    });

    await expect(
      service.create(
        { orderId: 'o1', status: ShipmentStatus.PREPARING },
        customer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should block shipment for cancelled order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'o1',
      userId: 'user-1',
      status: OrderStatus.CANCELLED,
      shipment: null,
    });

    await expect(
      service.create(
        { orderId: 'o1', status: ShipmentStatus.PREPARING },
        customer,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findAll should filter by user for customer', async () => {
    prismaMock.shipment.findMany.mockResolvedValue([]);
    await service.findAll(undefined, customer);

    expect(prismaMock.shipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: { userId: 'user-1' },
        }),
      }),
    );
  });

  it('admin can fetch any shipment', async () => {
    prismaMock.shipment.findUnique.mockResolvedValue({
      id: 's1',
      order: { userId: 'other', status: OrderStatus.PENDING },
    });
    const res = await service.findOne('s1', admin);
    expect(res.id).toBe('s1');
  });
});
