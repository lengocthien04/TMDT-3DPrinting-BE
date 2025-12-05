# 3D Printing Store API

Backend NestJS cho nền tảng thương mại điện tử dịch vụ in 3D. Hệ thống quản lý sản phẩm, khách hàng, đơn hàng, thanh toán, giao vận và voucher dựa trên PostgreSQL + Prisma, cung cấp REST API bảo mật bằng JWT.

## Tech Stack

- **Framework:** NestJS 11
- **Language:** TypeScript 5
- **Database:** PostgreSQL 14+ (Docker)
- **ORM:** Prisma 6
- **Authentication:** JWT + Passport.js
- **Validation:** class-validator & class-transformer
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest & Supertest
- **Containerization:** Docker & Docker Compose

## Domain Highlights

- **Orders & Order Items:** tạo/cập nhật đơn hàng nhiều dòng sản phẩm, lưu lịch sử giá từng biến thể, cập nhật trạng thái theo `OrderStatus`.
- **Payments:** mô hình một-một với đơn hàng, hỗ trợ `PaymentMethod`, `PaymentStatus`, lưu transactionId và số tiền thực thu.
- **Shipments:** quản lý tiến trình vận chuyển (`ShipmentStatus`), tracking, thời điểm gửi/nhận.
- **Vouchers:** mã giảm giá với phần trăm giảm, ngày hết hạn, cờ kích hoạt; dễ dàng áp dụng cho chiến dịch marketing.
- **Reviews & Q&A:** khách hàng đánh giá sản phẩm và đặt câu hỏi, admin có thể trả lời.

## Getting Started

1. **Clone repo**
   ```bash
   git clone <repository-url>
   cd TMDT-3DPrinting-BE
   ```
2. **Cài phụ thuộc**
   ```bash
   npm install --legacy-peer-deps
   ```
3. **Tạo file cấu hình**
   ```bash
   cp .env.example .env
   ```
4. **Chạy PostgreSQL**
   ```bash
   docker-compose up -d postgres
   ```
5. **Migrate + seed**
   ```bash
   npx prisma migrate dev
   npm run prisma:seed
   ```
6. **Khởi động server**
   ```bash
   npm run start:dev
   ```
   Swagger nằm tại `http://localhost:3000/api/docs`.

## API Endpoints

### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Users
- `GET /api/v1/users/profile`
- `PUT /api/v1/users/profile`
- `PATCH /api/v1/users/password`
- `DELETE /api/v1/users/account`

### Orders
- `POST /order` – tạo đơn hàng (items + payment/shipment tùy chọn)
- `GET /order` – lọc theo `userId` hoặc `status`
- `GET /order/:id`
- `PATCH /order/:id`
- `DELETE /order/:id`

### Order Items
- `POST /order-items` – thêm dòng sản phẩm vào order
- `GET /order-items?orderId=...`
- `GET /order-items/:id`
- `PATCH /order-items/:id`
- `DELETE /order-items/:id`

### Payments
- `POST /payment` – tạo bản ghi thanh toán cho order
- `GET /payment` – lọc theo `status`, `method`
- `GET /payment/:id`
- `PATCH /payment/:id`
- `DELETE /payment/:id`

### Shipments
- `POST /shipment`
- `GET /shipment` – lọc theo `status`
- `GET /shipment/:id`
- `PATCH /shipment/:id`
- `DELETE /shipment/:id`

### Vouchers
- `POST /vouchers`
- `GET /vouchers` – tham số `isActive`
- `GET /vouchers/:id`
- `PATCH /vouchers/:id`
- `DELETE /vouchers/:id`

### Reviews & Q&A
- `POST /reviews` / `PATCH /reviews/:id` / `DELETE /reviews/:id`
- `GET /reviews?productId=...`
- `POST /qnas` / `PATCH /qnas/:id/answer` / `DELETE /qnas/:id`
- `GET /qnas?productId=...`

## Testing

```bash
npm run test        # unit
npm run test:e2e    # e2e
npm run test:cov    # coverage
```

## Docker Deployment

```bash
docker-compose up              # dev
# hoặc
docker-compose -f docker-compose.yml up --build
```

## Database & Tooling

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run prisma:seed
npm run lint
npm run format
```

## Project Structure (rút gọn)

```
src/
  auth/
  users/
  products/
  order/
  order-items/
  payment/
  shipment/
  vouchers/
  reviews/
  qnas/
  common/ | config/ | database/
prisma/
  schema.prisma
  migrations/
```

## Security Features

- Hash mật khẩu bằng bcrypt (10 rounds)
- JWT access + refresh token rotation
- Rate limiting 100 requests/phút
- Validation lớp DTO + Prisma guard SQL injection
- Bộ lọc HTTP exception & interceptor chuẩn hóa response

## Environment Variables (tham khảo `.env.example`)

- `PORT`, `DATABASE_URL`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`
- `BCRYPT_ROUNDS`
- `CORS_ORIGIN`

## License

MIT License.
