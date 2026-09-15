# Mini E-commerce API

## Giới thiệu

Mini E-commerce API là backend cho nền tảng thương mại điện tử nhiều shop, nơi khách hàng có thể tìm sản phẩm, quản lý giỏ hàng, đặt hàng và thanh toán; seller có thể quản lý shop, sản phẩm và đơn hàng; admin có thể quản trị toàn hệ thống.

Ứng dụng được xây dựng theo mô hình module của NestJS, sử dụng PostgreSQL làm cơ sở dữ liệu chính và Redis cho cache/client. Các luồng thanh toán online hỗ trợ VNPay và MoMo; ảnh sản phẩm được lưu qua Cloudinary.

## Tính năng chính

- **Xác thực và phân quyền:** đăng ký, đăng nhập, JWT access/refresh token, quản lý profile, phân quyền Customer, Seller và Admin.
- **Người dùng và shop:** quản lý người dùng, đăng ký shop, duyệt/từ chối, khóa/mở khóa và cập nhật thông tin shop.
- **Danh mục và sản phẩm:** danh mục phân cấp, CRUD sản phẩm, trạng thái sản phẩm, hình ảnh, biến thể/SKU, tồn kho và tìm kiếm/lọc/phân trang.
- **Giỏ hàng:** thêm, cập nhật, xóa sản phẩm; kiểm tra tồn kho; nhóm sản phẩm theo shop.
- **Đơn hàng:** checkout transaction, tách đơn theo shop, khóa tồn kho, theo dõi và cập nhật trạng thái đơn hàng, tự động xử lý đơn chờ quá hạn.
- **Thanh toán:** COD, VNPay, MoMo, xử lý callback/IPN và đồng bộ trạng thái thanh toán.
- **Voucher:** voucher hệ thống/shop, điều kiện áp dụng, thời hạn và giới hạn lượt sử dụng.
- **Đánh giá:** khách hàng đánh giá sản phẩm sau khi nhận hàng, seller phản hồi, cập nhật điểm trung bình sản phẩm/shop.
- **Hoàn tiền và thống kê:** yêu cầu/phê duyệt hoàn tiền, lịch sử hoàn tiền, thống kê doanh thu và đơn hàng.
- **Thông báo và media:** module notification, upload ảnh Cloudinary và cache Redis.

## Công nghệ

- Node.js, TypeScript, NestJS
- PostgreSQL 16, TypeORM và TypeORM migrations
- Redis 7
- JWT, Passport, bcrypt, class-validator và Zod
- Cloudinary cho lưu trữ hình ảnh
- VNPay và MoMo cho thanh toán online
- Jest, Supertest và CodeceptJS cho kiểm thử
- Docker Compose cho PostgreSQL và Redis

## Yêu cầu môi trường

- Node.js 20 trở lên
- npm
- Docker Desktop và Docker Compose (khuyến nghị)
- Tài khoản Cloudinary nếu cần upload ảnh
- Tài khoản sandbox VNPay/MoMo nếu cần kiểm thử thanh toán online

## Cài đặt và chạy local

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo file môi trường

Sao chép `.env.example` thành `.env`, sau đó điền các giá trị tương ứng:

```bash
copy .env.example .env
```

Trên macOS/Linux có thể dùng:

```bash
cp .env.example .env
```

Các nhóm biến bắt buộc gồm:

| Nhóm       | Biến tiêu biểu                                                                                 | Mục đích                     |
| ---------- | ---------------------------------------------------------------------------------------------- | ---------------------------- |
| Ứng dụng   | `NODE_ENV`, `APP_PORT`, `APP_HOST`                                                             | Môi trường và cổng chạy API  |
| PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`                                      | Kết nối cơ sở dữ liệu        |
| Redis      | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`                                                   | Cache và dữ liệu tạm         |
| JWT        | `JWT_SECRET`, `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`                            | Ký và xác thực token         |
| Cloudinary | `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                               | Upload/xóa ảnh               |
| VNPay      | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`                 | Thanh toán và callback VNPay |
| MoMo       | `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_REDIRECT_URL`, `MOMO_IPN_URL` | Thanh toán và callback MoMo  |

Ứng dụng kiểm tra biến môi trường khi khởi động. Không commit `.env` hoặc thông tin bí mật lên repository.

### 3. Khởi động PostgreSQL và Redis

```bash
docker compose up -d postgres redis
```

Mặc định Docker Compose expose PostgreSQL ở cổng `5444` và Redis ở cổng `6333` trên máy host. Vì vậy, `.env` local cần dùng `DB_PORT=5444` và `REDIS_PORT=6333` nếu kết nối từ máy host.

### 4. Chạy migration và seed dữ liệu

```bash
npm run migration:run
npm run seed
```

`synchronize` của TypeORM đang tắt để tránh tự động thay đổi schema. Khi phát triển schema, dùng các lệnh:

```bash
npm run migration:generate -- src/databases/migrations/ten-migration
npm run migration:show
npm run migration:revert
```

### 5. Chạy API

```bash
# Development, tự reload khi source thay đổi
npm run start:dev

# Production
npm run build
npm run start:prod
```

API mặc định chạy tại `http://localhost:3000` hoặc cổng được cấu hình trong biến môi trường.

## Kiểm thử và chất lượng mã nguồn

```bash
# Unit test
npm test

# Test ở chế độ watch
npm run test:watch

# Test kèm coverage
npm run test:cov

# E2E test
npm run test:e2e

# Format và lint
npm run format
npm run lint
```

Nên khởi động các service phụ thuộc và chuẩn bị database test trước khi chạy E2E test.

## Cấu trúc thư mục

```text
src/
├── common/                 # Decorator, DTO dùng chung, guard, filter, pipe, interceptor
├── configs/                # Cấu hình database và validation biến môi trường
├── databases/
│   ├── migrations/         # Migration TypeORM
│   └── seeds/              # Dữ liệu mẫu
├── modules/
│   ├── auth/               # Đăng ký, đăng nhập và JWT
│   ├── users/              # Người dùng và profile
│   ├── shops/              # Shop
│   ├── categogies/         # Danh mục sản phẩm
│   ├── products/           # Sản phẩm và hình ảnh
│   ├── product-variant/    # Biến thể/SKU
│   ├── cart/               # Giỏ hàng
│   ├── orders/             # Đơn hàng và checkout
│   ├── payment/            # COD, VNPay, MoMo
│   ├── refund-requests/    # Hoàn tiền
│   ├── vouchers/           # Voucher
│   ├── reviews/            # Đánh giá và phản hồi
│   ├── statistics/         # Thống kê
│   ├── redis/              # Redis cache/client
│   ├── cloudinary/         # Upload media
│   └── notifications/      # Notification
└── main.ts                 # Bootstrap ứng dụng
```

Mỗi module nghiệp vụ thường gồm controller, service, entity, DTO và module riêng. `AccessTokenGuard` được đăng ký global; các endpoint cần xác thực được bảo vệ mặc định, còn endpoint công khai có thể dùng decorator `@Public()`.

## Quy ước xử lý request

- `ValidationPipe` global bật `whitelist`, `forbidNonWhitelisted` và `transform` để kiểm tra DTO đầu vào.
- Response được chuẩn hóa qua `TransformInterceptor`.
- Exception được chuẩn hóa qua `AllExceptionsFilter`.
- Các API có phân trang nên truyền các tham số query theo DTO phân trang hiện có.
- Các thao tác checkout, trừ tồn kho và cập nhật trạng thái thanh toán cần được xử lý theo transaction/state rule tương ứng.

## Tích hợp thanh toán

Để kiểm thử VNPay/MoMo, cần cấu hình credential sandbox trong `.env`. Các URL callback/IPN phải có thể được gateway truy cập; khi phát triển local có thể dùng tunnel như ngrok. Không sử dụng credential production trong môi trường development hoặc test.

Chi tiết tích hợp tham khảo:

- [Hướng dẫn MoMo](docs/integrations/momo/intergration-guide.md)
- [Tài liệu thanh toán](docs/integrations/payments/payment.md)
- [Hướng dẫn VNPay](docs/integrations/vnpay/)

## Tài liệu dự án

- [Tài liệu ma trận test và thiết kế ](https://docs.google.com/spreadsheets/d/10ftW99N-aqs1ksUZKP3nHfNYmi_Rq_JgOnnPQ4IGzXA/edit?gid=72087714#gid=72087714)
- [Phân task và phạm vi nghiệp vụ](https://gbao1108.atlassian.net/jira/software/projects/SCRUM/boards/1)
- [Tài liệu SRS](https://docs.google.com/document/d/1XthIdOT8P7io5OxSOE51LhAlBkWkYvjiJ4FlSbmyaPw/edit?hl=vi&tab=t.0)
- [Use Case Design](https://docs.google.com/document/d/1XthIdOT8P7io5OxSOE51LhAlBkWkYvjiJ4FlSbmyaPw/edit?hl=vi&tab=t.k46kd5dxvbes)
- [Tài liệu Database](https://docs.google.com/document/d/1XthIdOT8P7io5OxSOE51LhAlBkWkYvjiJ4FlSbmyaPw/edit?hl=vi&tab=t.3tp9k8s8xo3)
- [Postman collection](https://lunar-eclipse-497150.postman.co/workspace/My-Workspace~7e5082c3-a76c-49ca-8c72-4e16ef628fcd/collection/43311776-b77044ca-bf0d-4a1a-af09-301f41991d79?action=share&source=copy-link&creator=43311776)
- [Sprint plan](docs/sprint/)

## Lưu ý phát triển

- Không bật `synchronize` trên môi trường có dữ liệu thật; thay đổi schema phải đi qua migration.
- Giữ secret, password, token và credential thanh toán ngoài source code.
- Khi thêm endpoint cần cập nhật DTO validation, phân quyền, test tương ứng và tài liệu API.
- Trước khi mở pull request nên chạy build, lint và test phù hợp với phần thay đổi.

## Notes:

```
Trên đây là bản tóm tắt ngắn gọn về dự án. File README.md sẽ được cập nhật đầy đủ khi dự án hoàn thiện hoàn toàn
```
