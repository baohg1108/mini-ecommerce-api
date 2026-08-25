# MoMo Integration Guide

## 1. Overview

Tích hợp MoMo để hỗ trợ thanh toán đơn hàng trong hệ thống

## 2. Payment Flow

## 3. Environment Variables

```env
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_REDIRECT_URL=
MOMO_IPN_URL=
MOMO_REQUEST_TIMEOUT_MS=
```

## 4. API

### Create Payment

`POST /payments/momo`

- Input:
- Output:

### MoMo Webhook

`POST /payments/momo/webhook`
-

-
-

## 5. Rules

-
-
-

## 6. Payment Status

| MoMo    | System  |
| ------- | ------- |
| Success | PAID    |
| Failed  | FAILED  |
| Pending | PENDING |

## 7. Testing
