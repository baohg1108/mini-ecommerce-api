# Sprint 01 - Backend Foundation

**Thời gian:** 25/07/2026 - 12/08/2026

## Sprint Goal

Hoàn thành nền tảng backend cốt lõi bao gồm Project Setup, Authentication, User Management, Category Management, File Upload và Redis Cache, làm nền tảng cho các module nghiệp vụ ở các Sprint tiếp theo.

---

# Phạm vi công việc

Trong Sprint này nhóm thực hiện:

- ✅ Project Bootstrap
- ✅ Authentication
- ✅ User Management
- ✅ Category Management
- ✅ Upload Service
- ✅ Redis Cache
- ✅ Unit Test (Authentication)
- ⏳ Forgot Password

Theo tài liệu:

- [SRS v1.0](https://docs.google.com/document/d/1XthIdOT8P7io5OxSOE51LhAlBkWkYvjiJ4FlSbmyaPw/edit?hl=vi&pli=1&tab=t.0)
- [Authentication Design](N/A)
- [API Specification](https://docs.google.com/document/d/1XthIdOT8P7io5OxSOE51LhAlBkWkYvjiJ4FlSbmyaPw/edit?hl=vi&pli=1&tab=t.w3he5p2kc0ye)

---

# Jira Issues

| Jira   | Title                 | Status         |
| ------ | --------------------- | -------------- |
| BE-001 | Project Setup         | ✅ Done        |
| BE-002 | Redis + Storage       | ✅ Done        |
| BE-003 | JWT Strategy          | ✅ Done        |
| BE-004 | Upload                | ✅ Done        |
| BE-005 | Authentication        | ✅ Done        |
| BE-006 | Category Schema       | ✅ Done        |
| BE-007 | Forgot Password       | ⏳ Not Started |
| BE-008 | Category CRUD         | ✅ Done        |
| BE-009 | User CRUD             | ✅ Done        |
| BE-010 | Public Category Cache | ✅ Done        |
| BE-011 | Unit Test Auth        | ✅ Done        |
| BE-012 | Integration Test      | ⏳ Not Started |

---

# Deliverables

## Infrastructure

- ✅ Khởi tạo dự án NestJS theo kiến trúc Module
- ✅ Cấu hình Docker Compose cho PostgreSQL và Redis
- ✅ Thiết lập TypeORM và Migration
- ✅ Cấu hình Environment Variables
- ✅ Thiết lập Global Validation Pipe
- ✅ Thiết lập Global Exception Filter
- ✅ Thiết lập Logging

---

## Authentication

- ✅ API Đăng ký tài khoản (Register)
- ✅ API Đăng nhập (Login)
- ✅ JWT Access Token
- ✅ JWT Refresh Token Rotation
- ✅ API Đăng xuất (Logout)
- ✅ JWT Strategy
- ✅ JWT Guards
- ✅ Mã hóa mật khẩu bằng bcrypt

---

## Storage & Cache

- ✅ Tích hợp Redis Cache
- ✅ Tích hợp Cloudinary/AWS S3
- ✅ Xây dựng Upload Service dùng chung
- ✅ API Upload File

---

## User Management

- ✅ API lấy thông tin cá nhân (Profile)
- ✅ CRUD User dành cho Admin
- ✅ Validation và Authorization

---

## Category Management

- ✅ Thiết kế Database Category
- ✅ CRUD Category
- ✅ Public Category API
- ✅ Redis Cache cho Public Category API

---

## Testing

- ✅ Unit Test cho Authentication Module
- ✅ Manual Test các API chính

---

## Chưa hoàn thành

- ⏳ Forgot Password
- ⏳ Gửi OTP qua Email
- ⏳ Đặt lại mật khẩu (Reset Password)
- ⏳ Integration Test

---

# Technical Changes

## Database

- Tạo bảng User
- Thiết kế bảng Category
- Thiết lập Migration
- Cấu hình Redis Cache

---

## API

### Authentication

- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

### User

- GET /users/whoami
- GET /users
- GET /users/:id
- GET /users/:email/email
- PATCH /users/:id
- PATCH /users/:id/soft-delete
- PATCH /users/:id/restore
- DELETE /users/:id

### Category

- POST /categories
- GET /categories/tree
- GET /categories?parentId=
- GET /categories/:id/subtree
- GET /categories/:id/ancestors
- PATCH /categories/:id
- PATCH /categories/:id/move
- DELETE /categories/:id

### Upload

- POST /products/avatar
- POST /products/:id/images

### Product

**Admin**

- GET /products/admin/review
- PATCH /products/admin/:id/approve
- PATCH /products/admin/:id/reject
- PATCH /products/admin/:id/remove

# Risks / Issues

## Issue

- Chưa hoàn thành chức năng Forgot Password và Integration Test do ưu tiên hoàn thiện các chức năng cốt lõi của hệ thống

## Resolution

- Chuyển các hạng mục còn lại sang Sprint tiếp theo để tiếp tục triển khai

---

# Sprint Review

## Sprint Goal

✅ **Achieved**

- Hoàn thành **11/12 Jira Issues**.
- Hoàn thành toàn bộ nền tảng Backend gồm Authentication, User Management, Category Management, Upload Service và Redis Cache
- Các API chính đã được kiểm thử thủ công và đáp ứng Acceptance Criteria
- Chức năng Forgot Password và Integration Test được chuyển sang Sprint tiếp theo

---

# Retrospective

## What went well

- Hoàn thành Sprint đúng tiến độ
- Không phát sinh lỗi nghiêm trọng (Blocker/Critical Bug)
- Quy trình Git Flow và Jira được áp dụng khá ổn định
- Các thành viên phối hợp và merge code đúng quy trình

## What can improve

- Commit còn khá lớn, chưa bám sát từng Jira Issue
- Commit còn chưa đúng theo rules đã đề ra
- Mới chỉ triển khai Unit Test cho Authentication Module
- Chưa có Integration Test cho các module còn lại

## Action Items

- Chia nhỏ commit theo từng Jira Issue
- Commit đúng theo rules đã đặt ra
- Viết Unit Test ngay sau khi hoàn thành từng module
- Triển khai Integration Test trong Sprint tiếp theo
- Tiếp tục hoàn thiện chức năng Forgot Password
