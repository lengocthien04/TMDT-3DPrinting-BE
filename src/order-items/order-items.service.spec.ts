import { NotFoundException } from '@nestjs/common';
import { OrderItemsService } from './order-items.service';

describe('OrderItemsService', () => {
  const prismaMock = {
    order: { findUnique: jest.fn(), update: jest.fn() },
    orderItem: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    variant: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as any;

  let service: OrderItemsService;

  beforeEach(() => {
    jest.resetAllMocks();
    // $transaction simply runs callback with the same mock client
    (prismaMock.$transaction as jest.Mock).mockImplementation((cb: any) =>
      cb(prismaMock),
    );
    service = new OrderItemsService(prismaMock);
  });

  const user = { sub: 'user-1', role: 'CUSTOMER' } as any;

  it('create() should recalculate total after adding item', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'user-1' });
    prismaMock.variant.findUnique.mockResolvedValue({
      id: 'variant-1',
      stock: 5,
      product: { basePrice: 10 },
    });
    prismaMock.orderItem.create.mockResolvedValue({
      id: 'oi-1',
      orderId: 'order-1',
    });
    prismaMock.orderItem.findMany.mockResolvedValue([
      { quantity: 2, price: 10 },
      { quantity: 1, price: 5 },
    ]);
    prismaMock.order.update.mockResolvedValue({});

    await service.create(
      {
        orderId: 'order-1',
        variantId: 'variant-1',
        quantity: 2,
        price: 10,
      },
      user,
    );

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { totalAmount: 25 },
    });
  });

  it('update() should recalculate total after update', async () => {
    prismaMock.orderItem.findUnique.mockResolvedValue({
      id: 'oi-1',
      variantId: 'variant-1',
      quantity: 1,
      order: { id: 'order-1', userId: 'user-1' },
    });
    prismaMock.variant.findUnique.mockResolvedValue({
      id: 'variant-2',
      stock: 10,
      product: { basePrice: 20 },
    });
    prismaMock.orderItem.update.mockResolvedValue({ id: 'oi-1' });
    prismaMock.orderItem.findMany.mockResolvedValue([
      { quantity: 1, price: 20 },
    ]);
    prismaMock.order.update.mockResolvedValue({});

    await service.update(
      'oi-1',
      {
        variantId: 'variant-2',
        quantity: 1,
        price: 20,
      },
      user,
    );

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { totalAmount: 20 },
    });
  });

  it('remove() should recalculate total after delete', async () => {
    prismaMock.orderItem.findUnique.mockResolvedValue({
      id: 'oi-1',
      variantId: 'v1',
      quantity: 1,
      order: { id: 'order-1', userId: 'user-1' },
    });
    prismaMock.orderItem.delete.mockResolvedValue({ id: 'oi-1' });
    prismaMock.orderItem.findMany.mockResolvedValue([]);
    prismaMock.order.update.mockResolvedValue({});

    await service.remove('oi-1', user);

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { totalAmount: 0 },
    });
  });

  it('should throw if order not found', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        {
          orderId: 'missing',
          variantId: 'v1',
          quantity: 1,
          price: 5,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
