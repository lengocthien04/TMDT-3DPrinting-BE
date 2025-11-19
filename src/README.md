### 1. Order Module (`src/order/*`)
Quản lý vòng đời đơn hàng với CRUD đầy đủ và DTO chuẩn hóa.
| Endpoint | Method | Mô tả |
| --- | --- | --- |
| `/order` | `POST` | Tạo đơn mới từ `CreateOrderDto` (tổng tiền, phương thức thanh toán, địa chỉ giao, mã shipment, v.v.). |
| `/order` | `GET` | Trả về toàn bộ backlog đơn (hiện lưu tạm trong bộ nhớ để gom logic). |
| `/order/:id` | `GET` | Tra cứu chi tiết đơn. |
| `/order/:id` | `PUT` | Cập nhật trạng thái/thông tin đơn qua `UpdateOrderDto`. |
| `/order/:id` | `DELETE` | Xóa đơn khi cần rollback. |
> Service (`order.service.ts`) hiện dùng mảng in-memory, thuận tiện cho unit test; có thể thay bằng Prisma repository sau.

### 2. Notification Module (`src/notification/*`)
Gửi và quản lý trạng thái thông báo liên quan đến order/shipment.
| Endpoint | Method | Mô tả |
| --- | --- | --- |
| `/notification` | `POST` | Tạo thông báo mới với loại (`order`, `shipment`, `promo`, `system`), ưu tiên và trạng thái đọc. |
| `/notification` | `GET` | Liệt kê toàn bộ thông báo (giúp team CS theo dõi). |
| `/notification/:id` | `GET` | Xem chi tiết một thông báo. |
| `/notification/:id` | `DELETE` | Xóa/thanh lọc thông báo cũ theo id. |

DTO `CreateNotificationDto` đã gắn `ApiProperty` để Swagger tự sinh schema, kèm validation `IsEnum`, `IsBoolean`, `IsInt`.

### 3. Shipment Module (`src/shipment/*`)
Đồng bộ logistics: lưu hãng vận chuyển, tracking, trạng thái và chi phí.
| Endpoint | Method | Mô tả |
| --- | --- | --- |
| `/shipment` | `POST` | Khởi tạo shipment mới (carrier, tracking, địa chỉ, chi phí). |
| `/shipment` | `GET` | Danh sách shipment đang theo dõi. |
| `/shipment/:id` | `GET` | Xem shipment cụ thể. |
| `/shipment/:id` | `PUT` | Cập nhật trạng thái/chi phí qua `UpdateShipmentDto`. |
| `/shipment/:id` | `DELETE` | Gỡ shipment đã hoàn tất/hủy. |

Cả `ShipmentService` và `OrderService` dùng mảng tạm thời để tập trung vào luồng nghiệp vụ; khi gắn database thực, chỉ cần thay bằng Prisma Client mà không đổi controller.

## DTO & Validation Highlights
- `CreateOrderDto` / `UpdateOrderDto`: bắt buộc `amount`, `status`, `payment_method`, hỗ trợ trường tùy chọn như `discount`, `estimated_delivery`.
- `CreateNotificationDto`: bắt buộc `user_id`, `message`, `type`, `status`; thêm `read_status`, `priority`.
- `CreateShipmentDto` / `UpdateShipmentDto`: quản lý `carrier`, `tracking_number`, `address`, `cost` với `IsString`, `IsNumber`.

Tất cả DTO đều nằm trong thư mục `src/<module>/dto` và được khai báo với decorator Swagger để tự sinh tài liệu.

## Hướng dẫn chạy local
```bash
# 1. Cài Node.js 18+, Docker, npm
# 2. Cài dependencies
npm install --legacy-peer-deps

# 3. Copy biến môi trường
cp .env.example .env   # chỉnh DB_URL, JWT_SECRET, v.v.

# 4. Khởi động PostgreSQL qua Docker
docker-compose up -d postgres

# 5. Prisma migrate + seed
npx prisma migrate dev
npm run prisma:seed

# 6. Chạy dev server
npm run start:dev  # API tại http://localhost:3000, Swagger ở /api/docs