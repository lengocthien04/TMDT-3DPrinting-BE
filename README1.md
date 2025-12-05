# Hướng dẫn nhanh cho FE (Order/Payment/Shipment/Voucher)

Base URL: `/api/v1` (Swagger: `/api/docs`). Mọi response được bọc `{ data, timestamp, path }`.

## Chuẩn bị
- Đăng nhập lấy JWT: `POST /auth/login` → dùng `Authorization: Bearer <token>`.
- Chạy migrate trước khi dùng (DB PostgreSQL theo `.env`): `npx prisma migrate dev --name add-order-voucher-discount` rồi `npx prisma generate`.

## Quy tắc chung
- CUSTOMER chỉ thấy/tác động tài nguyên của mình; ADMIN thấy tất cả.
- BE tự tính giá và tổng tiền (bao gồm giảm giá); `totalAmount` client gửi sẽ bị bỏ qua.
- Voucher chỉ được tính nếu còn hạn và `isActive = true`.

## Order
- Tạo: `POST /order`
  - Body: `{ addressId, items:[{variantId, quantity, price?}], voucherCode?, payment?, shipment? }`
  - `userId`: bỏ trống nếu là CUSTOMER (lấy từ token); ADMIN có thể chỉ định để tạo hộ.
  - `price` trong item là tùy chọn, server lấy giá hiện tại của variant.
- Danh sách/chi tiết: `GET /order?userId?&status?`, `GET /order/:id`
- Cập nhật: `PATCH /order/:id` với items (đẩy toàn bộ danh sách mới nếu đổi), `voucherCode` (string để áp dụng / null để bỏ), address, payment/shipment details.
- Xóa: `DELETE /order/:id`
- Order trả về kèm `items`, `payment`, `shipment`, `address`, `voucher` và các trường `totalAmount`, `discountAmount`.

## Order Items
- Thêm: `POST /order-items` `{ orderId, variantId, quantity, price? }`
- Xem theo đơn: `GET /order-items?orderId=...`
- Chi tiết: `GET /order-items/:id`
- Sửa: `PATCH /order-items/:id`
- Xóa: `DELETE /order-items/:id`
- Mỗi thao tác sẽ tính lại tổng và giảm giá của order.

## Payment
- Tạo: `POST /payment` `{ orderId, method, amount?, transactionId?, status? }`
  - Chặn nếu đơn đã có payment, hoặc trạng thái đơn CANCELLED/DELIVERED.
  - Nếu gửi `status=PAID`, đơn PENDING sẽ tự chuyển `CONFIRMED`.
- Danh sách/chi tiết: `GET /payment?status?&method?`, `GET /payment/:id`
- Sửa: `PATCH /payment/:id` (không thể đổi khỏi PAID sau khi đã PAID)
- Xóa: `DELETE /payment/:id` (không xóa payment đã PAID)

## Shipment
- Tạo: `POST /shipment` `{ orderId, carrier?, trackingNo?, status?, shippedAt?, deliveredAt? }`
  - Chặn nếu đơn đã có shipment, hoặc trạng thái đơn CANCELLED/DELIVERED.
  - Status sẽ cập nhật trạng thái đơn: IN_TRANSIT → SHIPPED, DELIVERED → DELIVERED, RETURNED → CANCELLED.
- Danh sách/chi tiết: `GET /shipment?status?`, `GET /shipment/:id`
- Sửa: `PATCH /shipment/:id` (không đổi nếu order DELIVERED)
- Xóa: `DELETE /shipment/:id`

## Voucher (ADMIN CRUD, public đọc)
- Public list: `GET /vouchers` (mặc định trả voucher còn hạn & active)
- Public detail: `GET /vouchers/:id`
- Tạo: `POST /vouchers` (ADMIN) `{ code, discount (0-1), expiresAt, isActive? }`
- Sửa: `PATCH /vouchers/:id` (ADMIN) - validate discount, ngày hết hạn phải tương lai.
- Xóa: `DELETE /vouchers/:id` (ADMIN)
- Áp dụng vào order qua field `voucherCode` trên create/update order.
