import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentStatus, ShipmentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Order/Payment/Shipment/Voucher E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let adminToken: string;
  let userId: string;
  let addressId: string;
  let variantId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.address.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.material.deleteMany();
    await prisma.voucher.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    const password = 'Test123!@#';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: 'orderuser',
        email: 'orderuser@example.com',
        passwordHash,
        role: 'CUSTOMER',
      },
    });
    userId = user.id;

    const admin = await prisma.user.create({
      data: {
        username: 'admin1',
        email: 'admin@example.com',
        passwordHash,
        role: 'ADMIN',
      },
    });

    const address = await prisma.address.create({
      data: {
        userId,
        recipient: 'John Doe',
        phone: '123456789',
        address1: '123 Street',
        city: 'City',
        state: 'State',
        postal: '00000',
        country: 'VN',
        isDefault: true,
      },
    });
    addressId = address.id;

    const material = await prisma.material.create({
      data: { name: 'PLA', color: 'Red' },
    });
    const product = await prisma.product.create({
      data: { name: 'Model X', basePrice: 20 },
    });
    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        materialId: material.id,
        name: 'Variant 1',
        stock: 10,
      },
    });
    variantId = variant.id;

    // login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: user.email,
        password,
      })
      .expect(200);

    customerToken = (loginRes.body.data || loginRes.body).accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: admin.email,
        password,
      })
      .expect(200);

    adminToken = (adminLogin.body.data || adminLogin.body).accessToken;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.address.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.material.deleteMany();
    await prisma.voucher.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('should create order and recalc total after adding order item', async () => {
    const createOrderRes = await request(app.getHttpServer())
      .post('/api/v1/order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        userId,
        addressId,
        items: [
          {
            variantId,
            quantity: 1,
            price: 20,
          },
        ],
      })
      .expect(201);

    const order = createOrderRes.body.data || createOrderRes.body;
    orderId = order.id;
    expect(order.totalAmount).toBe(20);

    await request(app.getHttpServer())
      .post('/api/v1/order-items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        variantId,
        quantity: 2,
        price: 5,
      })
      .expect(201);

    const refreshedOrder = await request(app.getHttpServer())
      .get(`/api/v1/order/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const data = refreshedOrder.body.data || refreshedOrder.body;
    expect(Number(data.totalAmount)).toBe(60); // 20 + 2*20 (server-side price)
  });

  it('should create payment for the order', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        method: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    const data = res.body.data || res.body;
    expect(data.order.id).toBe(orderId);
    expect(data.status).toBe(PaymentStatus.UNPAID);
  });

  it('should create shipment for the order', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/shipment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        carrier: 'GHN',
        trackingNo: 'TRACK123',
        status: ShipmentStatus.PREPARING,
      })
      .expect(201);

    const data = res.body.data || res.body;
    expect(data.order.id).toBe(orderId);
    expect(data.status).toBe(ShipmentStatus.PREPARING);
  });

  it('should manage vouchers CRUD', async () => {
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const create = await request(app.getHttpServer())
      .post('/api/v1/vouchers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'SALE10',
        discount: 0.1,
        expiresAt,
      })
      .expect(201);

    const voucher = create.body.data || create.body;
    expect(voucher.code).toBe('SALE10');

    const list = await request(app.getHttpServer())
      .get('/api/v1/vouchers')
      .expect(200);
    const listData = list.body.data || list.body;
    expect(listData.length).toBeGreaterThan(0);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/vouchers/${voucher.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discount: 0.2 })
      .expect(200);

    const updatedData = updated.body.data || updated.body;
    expect(updatedData.discount).toBe(0.2);
  });
});
