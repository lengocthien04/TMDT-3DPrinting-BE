import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Auth E2E Tests (3D Printing Backend)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    // Clean database before running tests
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('Authentication Flow (E2E)', () => {
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    let accessToken: string;
    let refreshToken: string;

    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      // support both {data: {...}} and flat response
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.role).toBe('CUSTOMER');

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it('should not register with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
    });

    it('should not login with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should get current user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.email).toBe(testUser.email);
      expect(data).toHaveProperty('role');
      expect(data.role).toBe('CUSTOMER');
    });

    it('should not access protected route without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should refresh access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });
  });
});
