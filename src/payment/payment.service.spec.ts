import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentService } from './payment.service';

const userCustomer = { sub: 'user-1', role: 'CUSTOMER' } as any;
const userAdmin = { sub: 'admin-1', role: 'ADMIN' } as any;

describe('PaymentService', () => {
  const prismaMock = {
    order: { findUnique: jest.fn() },
    payment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as any;

  let service: PaymentService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PaymentService(prismaMock);
  });

  it('should prevent customer from creating payment for other user order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'o1',
      userId: 'other-user',
      status: OrderStatus.PENDING,
      totalAmount: 100,
      payment: null,
    });

    await expect(
      service.create(
        { orderId: 'o1', method: PaymentMethod.CREDIT_CARD },
        userCustomer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should block payment if order is cancelled', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'o1',
      userId: 'user-1',
      status: OrderStatus.CANCELLED,
      totalAmount: 100,
      payment: null,
    });

    await expect(
      service.create(
        { orderId: 'o1', method: PaymentMethod.CREDIT_CARD },
        userCustomer,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should allow admin to view any payment', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'p1',
      order: { userId: 'other', status: OrderStatus.PENDING },
    });

    const res = await service.findOne('p1', userAdmin);
    expect(res.id).toBe('p1');
  });

  it('findAll should scope to current customer', async () => {
    prismaMock.payment.findMany.mockResolvedValue([]);
    await service.findAll(undefined, undefined, userCustomer);

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: { userId: 'user-1' },
        }),
      }),
    );
  });

  it('findAll should not scope for admin', async () => {
    prismaMock.payment.findMany.mockResolvedValue([]);
    await service.findAll(undefined, undefined, userAdmin);

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({
        where: expect.objectContaining({
          order: expect.objectContaining({ userId: 'user-1' }),
        }),
      }),
    );
  });
});
