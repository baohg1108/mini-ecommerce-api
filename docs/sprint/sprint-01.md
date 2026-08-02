# Sprint 02 - Authentication

**Duration:** 01/08/2026 - 14/08/2026

**Sprint Goal**

Hoàn thành module Authentication cho hệ thống.

---

# Sprint Scope

Trong Sprint này nhóm thực hiện:

- User Registration
- User Login
- Refresh Token
- Logout
- JWT Authentication

Theo tài liệu:

- SRS v1.0
- Authentication Design
- API Specification

---

# Jira Issues

| Jira   | Title         | Status  |
| ------ | ------------- | ------- |
| BE-001 | Project Setup | ✅ Done |
| BE-002 | Register API  | ✅ Done |
| BE-003 | Login API     | ✅ Done |
| BE-004 | Refresh Token | ✅ Done |
| BE-005 | Logout        | ✅ Done |

---

# Deliverables

Đã hoàn thành:

- Register API
- Login API
- JWT Strategy
- Access Token
- Refresh Token Rotation
- Logout API

---

# Technical Changes

## Database

Không thay đổi schema.

---

## API

POST /auth/register

POST /auth/login

POST /auth/refresh

POST /auth/logout

---

## Source Code

Modules:

- AuthModule
- UsersModule

Guards:

- JwtAuthGuard
- RefreshTokenGuard

Strategies:

- JwtStrategy
- JwtRefreshStrategy

---

# Testing

## Unit Test

- AuthService

- UsersService

## Manual Test

| Scenario             | Result |
| -------------------- | ------ |
| Register Success     | ✅     |
| Register Duplicate   | ✅     |
| Login Success        | ✅     |
| Login Wrong Password | ✅     |
| Refresh Success      | ✅     |
| Refresh Expired      | ✅     |

---

# Risks / Issues

### Issue

Refresh Token bị ghi đè khi login nhiều thiết bị.

### Resolution

Hash Refresh Token trước khi lưu.

---

# Sprint Review

Đã đạt Sprint Goal.

Các API hoạt động đúng theo Acceptance Criteria.

---

# Retrospective

## What went well

- Đúng tiến độ
- Không phát sinh bug nghiêm trọng

## What can improve

- Commit còn quá lớn
- Thiếu Unit Test

## Action

- Commit nhỏ hơn
- Viết test ngay sau khi hoàn thành từng API
