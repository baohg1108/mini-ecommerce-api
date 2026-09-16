# SPRINT 05 TEST REPORT

**Module:** Order Management & Refund
**Dự án:** Mini E-commerce System
**Thời gian:** 22/08/2026 – 28/08/2026
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

## 1. Sprint Overview

**Sprint Goal:** Hoàn thiện luồng quản lý vòng đời Đơn hàng (Order) sau khi checkout — state machine chuyển trạng thái cho Seller (confirm → preparing → shipping → delivered → completed), huỷ đơn từ cả Seller và Customer, tự động huỷ đơn PENDING_PAYMENT quá hạn 15 phút, đồng bộ trạng thái Payment khi huỷ — đồng thời xây dựng luồng Yêu cầu & Duyệt hoàn tiền (Refund Request) sau khi đơn hoàn tất.

**Phạm vi chính:**

- Validation DTO: `CreateOrderDto`, `CancelOrderDto`, `SellerOrderListQueryDto`, `CreateRefundRequestDto`, `RejectRefundRequestDto`, `RefundRequestListQueryDto`.
- State Machine chặn nhảy trạng thái đơn (`assertTransition`, `lockOrderForSeller`).
- API Seller cập nhật trạng thái đơn: confirm, preparing, shipping, delivered, complete.
- API Seller / Customer huỷ đơn (`cancelOrder`, `cancelOrderByCustomer`) + đồng bộ trạng thái Payment khi huỷ.
- Cronjob tự động huỷ đơn `PENDING_PAYMENT` quá hạn 15 phút, nhả tồn kho (`OrdersCleanupScheduler`).
- API Seller xem danh sách đơn hàng theo Shop (phân trang, filter status).
- API Customer yêu cầu hoàn tiền (`RefundRequestsService.create`), giới hạn 7 ngày kể từ `deliveredAt`.
- API Admin/Seller duyệt/từ chối hoàn tiền (`approve`, `reject`, `retryRefund`), gọi cổng refund VNPay/Momo (sandbox).
- API thống kê lịch sử hoàn tiền theo Shop.
- Bug fix ngoài phạm vi Order/Refund: Become-seller trả về sai mã lỗi (403 → cần là 409).

---

## 2. Kết quả tổng quan

| Metric                     |      Kết quả |
| -------------------------- | -----------: |
| Jira Issue thuộc Sprint    | 16/16 (100%) |
| Story Point hoàn thành     |        66 SP |
| Test Case được thiết kế    |          140 |
| Design Unit Test           |          140 |
| Design E2E Test            |            0 |
| Production Unit Test       |          140 |
| Production E2E Test        |            0 |
| Tổng Production Test Scope |          140 |
| Test Case đã thực thi      |            0 |
| Test Case PASS             |            0 |
| Test Case FAIL             |            0 |
| P0 – Critical              |           51 |
| P1 – High                  |           43 |
| P2 – Medium                |           45 |
| P3 – Low                   |            1 |
| Defect phát sinh           |     1 (xác nhận) + 29 gap cần Dev xác nhận |
| Defect đã Fixed            |          1/1 (bug ngoài Order/Refund: BUG-001-SP5) |
| Code Coverage              |      Chưa đo |

> **Scope Change:** Ngày 24/08/2026, Sprint 05 được bổ sung 15 Jira Task (BE-049, BE-050 → BE-060, BE-079b, BE-084*, BE-085*) với tổng cộng 66 Story Point (trong đó BE-054 được điều chỉnh estimate từ 3 lên 5 SP). Ngày 26/08/2026, 1 Bug (BUG-001-SP5 — Become-seller trả về 403 thay vì 409) được bổ sung vào sprint. Toàn bộ 16 Jira Issue của sprint đã hoàn thành (100%).

### Priority Distribution

| Priority          | Số lượng |     Tỷ lệ |
| ----------------- | -------: | --------: |
| **P0 – Critical** |       51 |     36.4% |
| **P1 – High**     |       43 |     30.7% |
| **P2 – Medium**   |       45 |     32.1% |
| **P3 – Low**      |        1 |      0.7% |
| **Tổng**          |  **140** | **100%**  |

### Test Status

| Metric                          |  Kết quả |
| -------------------------------- | -------: |
| Design                            |      140 |
| Executed                          |        0 |
| Execution Completion Rate         |  **0%**  |
| PASS                              |        0 |
| FAIL                              |        0 |
| Pass Rate trên test đã thực thi   |  **N/A** (0/0) |

> **E2E Status:** Sprint 05 KHÔNG có E2E Test nào được thiết kế/thực thi (0/0). Toàn bộ E2E cho module Order & Refund tiếp tục được gộp vào **Sprint 07 – Final E2E Regression & Project Test Summary** cùng với phần E2E còn tồn đọng của Sprint 04.

> **Unit Test Status:** Test Matrix của Sprint 05 gồm **140 Unit Test** (98 case cho module Order, 42 case cho module Refund), bao phủ DTO validation, `OrdersService` (checkout, state machine, cancel, cleanup scheduler), `OrdersController`/`SellerOrdersController`, và `RefundRequestsService` (create/approve/reject/retryRefund). Tính đến thời điểm lập báo cáo, **toàn bộ 140 test case đang ở trạng thái "Chưa chạy"** — Dev đã hoàn thành code (16/16 Jira Done) nhưng bước thực thi Unit Test qua `npm run test` **chưa được ghi nhận**.

**Sprint Status: PARTIALLY ACHIEVED — Dev Complete, QA Execution Pending**

Sprint 05 hoàn thành 16/16 Jira Issue (100%), tương ứng 66 Story Point, đáp ứng đầy đủ mục tiêu về mặt triển khai code cho luồng State Machine đơn hàng và luồng Refund Request. Tuy nhiên, trong 140 Unit Test đã được thiết kế, **chưa có test case nào được thực thi** tại thời điểm lập báo cáo này — đây là khoảng trống cần được xử lý ngay đầu Sprint 06 trước khi coi Sprint 05 là "Achieved" đầy đủ về chất lượng.

---

## 3. Sprint Goal Achievement

|   # | Sprint Success Criteria                                  | Requirement | Status                                  |
| --: | --------------------------------------------------------- | ----------- | ---------------------------------------- |
|   1 | Cấu hình Cronjob quét đơn pending > 15p                   | BR-06       | Dev Done / Unit Execution Pending        |
|   2 | API Seller cập nhật trạng thái đơn                        | FR-30       | Dev Done / Unit Execution Pending        |
|   3 | Logic tự động huỷ đơn pending, nhả tồn kho                | -           | Dev Done / Unit Execution Pending        |
|   4 | State Machine chặn nhảy trạng thái đơn                    | -           | Dev Done / Unit Execution Pending        |
|   5 | API Yêu cầu hoàn tiền (Customer)                          | UC-16       | Dev Done / Unit Execution Pending        |
|   6 | API Customer theo dõi, Huỷ đơn                            | FR-31       | Dev Done / Unit Execution Pending        |
|   7 | API Admin/Seller duyệt hoàn tiền                          | FR-45       | Dev Done / Unit Execution Pending        |
|   8 | Đồng bộ trạng thái Payment khi đơn bị huỷ                 | -           | Dev Done / Unit Execution Pending        |
|   9 | API thống kê lịch sử hoàn tiền                            | FR-58       | Dev Done / Unit Execution Pending        |
|  10 | Gọi API refund VNPay/Momo (sandbox)                       | FR-46       | Dev Done / Unit Execution Pending        |
|  11 | End-to-end test vòng đời đơn hàng                         | -           | Deferred → Sprint 07                     |
|  12 | Test Cronjob timeout đơn hàng                             | -           | Dev Done / Unit Execution Pending        |
|  13 | API Seller xem danh sách Đơn hàng                         | FR-29       | Dev Done / Unit Execution Pending        |
|  14 | API hàng đợi kiểm duyệt sản phẩm (Admin)                  | UC-12       | Dev Done (ngoài phạm vi Test Matrix này) |
|  15 | API duyệt/gỡ sản phẩm vi phạm + thông báo Seller          | UC-12       | Dev Done (ngoài phạm vi Test Matrix này) |
|  16 | Fix bug Become-seller trả sai mã lỗi (403 → 409)          | BUG-001-SP5 | Fixed                                     |

**16/16 Jira Issue đã Done ở tầng code**, nhưng chỉ 1/16 (bug fix) có thể coi là "Achieved" đầy đủ về kiểm thử (đã fix, chưa có test case riêng trong matrix này để verify). 14 criteria còn lại liên quan trực tiếp đến Order/Refund đã có Unit Test thiết kế đầy đủ nhưng **chưa thực thi**, nên chưa thể xác nhận "Achieved" ở tầng kiểm thử. Tiêu chí #14, #15 (kiểm duyệt sản phẩm) nằm ngoài phạm vi Test Matrix Order/Refund của báo cáo này.

---

## 4. Requirement Traceability Matrix

| Requirement                                            | Jira                | Test Type | Execution        |
| -------------------------------------------------------- | ------------------- | --------- | ----------------- |
| BR-06 – Cronjob quét đơn pending > 15p                    | SCRUM-56 (BE-050)   | Unit      | Designed / Not Run |
| FR-30 – API Seller cập nhật trạng thái đơn                | SCRUM-57 (BE-051)   | Unit      | Designed / Not Run |
| — Logic tự động huỷ đơn pending, nhả tồn kho              | SCRUM-58 (BE-052)   | Unit      | Designed / Not Run |
| — State Machine chặn nhảy trạng thái đơn                  | SCRUM-59 (BE-053)   | Unit      | Designed / Not Run |
| UC-16 – API Yêu cầu hoàn tiền (Customer)                  | SCRUM-60 (BE-054)   | Unit      | Designed / Not Run |
| FR-31 – API Customer theo dõi, Huỷ đơn                    | SCRUM-61 (BE-055)   | Unit      | Designed / Not Run |
| FR-45 – API Admin/Seller duyệt hoàn tiền                  | SCRUM-62 (BE-056)   | Unit      | Designed / Not Run |
| — Đồng bộ trạng thái Payment khi đơn bị huỷ               | SCRUM-64 (BE-057)   | Unit      | Designed / Not Run |
| — API thống kê lịch sử hoàn tiền                          | SCRUM-66 (BE-058)   | Unit      | Designed / Not Run |
| FR-46 – Gọi API refund VNPay/Momo (sandbox)               | SCRUM-67 (BE-079b)  | Unit      | Designed / Not Run |
| — E2E test vòng đời đơn hàng                              | SCRUM-68 (BE-059)   | E2E       | Deferred → Sprint 07 |
| — Test Cronjob timeout đơn hàng                           | SCRUM-69 (BE-060)   | Unit      | Designed / Not Run |
| FR-29 – API Seller xem danh sách Đơn hàng                 | SCRUM-55 (BE-049)   | Unit      | Designed / Not Run |
| UC-12 – API hàng đợi kiểm duyệt sản phẩm (Admin)          | SCRUM-63 (BE-084*)  | -         | Ngoài phạm vi Test Matrix này |
| UC-12 – API duyệt/gỡ sản phẩm vi phạm + thông báo Seller  | SCRUM-65 (BE-085*)  | -         | Ngoài phạm vi Test Matrix này |
| BUG-001-SP5 – Become-seller trả sai mã lỗi                | SCRUM-127           | -         | Fixed (Bug-Dev-Done) |

---

## 5. Test Case Summary

### 5.1 Test Design

| Test Level | Designed |
| ---------- | -------: |
| Unit Test  |      140 |
| E2E Test   |        0 |
| **Total**  |  **140** |

Trong đó:
- **Order module:** 98 Unit Test (ORD-UNIT-002 → ORD-UNIT-099), bao phủ DTO validation, `OrdersService.checkout`, state machine (`confirmOrder`/`markPreparing`/`markShipping`/`markDelivered`/`completeOrder`), `cancelOrder`/`cancelOrderByCustomer`, `OrdersController`/`SellerOrdersController`, `OrdersCleanupScheduler`.
- **Refund module:** 42 Unit Test (RFD-UNIT-001 → RFD-UNIT-042), bao phủ DTO validation, `RefundRequestsService.create/approve/reject/retryRefund/findForSeller/queryList`.

### 5.2 Production Test Scope

| Test Level                 | Production Scope |
| --------------------------- | ---------------: |
| Unit Test                   |               140 |
| E2E Test                    |                 0 |
| **Total Production Scope**  |           **140** |

### 5.3 Test Execution

| Test Level | Designed | Production Scope | Executed | PASS | FAIL |
| ---------- | -------: | ----------------: | -------: | ---: | ---: |
| Unit Test  |      140 |                140 |        0 |    0 |    0 |
| E2E Test   |        0 |                  0 |        0 |    0 |    0 |
| **Total**  |  **140** |            **140** |    **0** |  **0** |  **0** |

**Execution Completion Rate:**

> 0 / 140 = **0%**

**Pass Rate trên test đã thực thi:**

> 0 / 0 = **N/A**

**Production Scope Coverage:**

> 140 / 140 = **100%** (thiết kế bao phủ toàn bộ scope xác định, chưa phản ánh mức độ thực thi)

---

## 6. Test Priority

Test case tiếp tục được phân loại theo **Risk-Based Testing**, ưu tiên các luồng ảnh hưởng trực tiếp đến tồn kho, tiền hoàn trả và phân quyền Seller/Customer/Admin.

| Priority  | Mức độ   | Số lượng |     Tỷ lệ | Ý nghĩa                                                                                     |
| --------- | -------- | -------: | --------: | -------------------------------------------------------------------------------------------- |
| **P0**    | Critical |       51 |     36.4% | Checkout/lock tồn kho, chuyển trạng thái đơn, huỷ đơn & hoàn tiền, phân quyền Seller/Customer |
| **P1**    | High     |       43 |     30.7% | Validation DTO, nhánh lỗi 404/403/400/409, timestamp trạng thái                               |
| **P2**    | Medium   |       45 |     32.1% | Edge case, giá trị mặc định, phân trang, filter phụ                                           |
| **P3**    | Low      |        1 |      0.7% | note quá dài không giới hạn @MaxLength (rủi ro thấp)                                          |
| **Total** |          |  **140** | **100%**  |

### Priority Strategy

**P0 → P1 → P2 → P3**, ưu tiên chạy trước khi merge lên môi trường staging:

- **P0:** Critical — các case liên quan tồn kho (pessimistic lock, reserve/commit/release/restock), tiền hoàn trả (approve/reject refund, gọi gateway), và phân quyền giữa Seller/Customer/Admin.
- **P1:** High — đảm bảo state machine trả đúng mã lỗi khi chuyển trạng thái sai thứ tự, và validation DTO đầu vào.
- **P2:** Medium — phân trang, default value, filter phụ; chạy trong regression sau P0/P1.
- **P3:** Low — 1 case duy nhất (giới hạn độ dài field `note`), rủi ro thấp, không chặn release.

---

## 7. Defect Log

| Bug ID       | Mô tả                                                                                                   | Phát hiện qua           | Trạng thái     |
| ------------ | --------------------------------------------------------------------------------------------------------- | ------------------------ | -------------- |
| ORD-DEFECT-01 | `confirmCodOrder()` và `confirmOrder()` cùng khai báo route `PATCH :id/confirm` trong `OrdersController` — Nest chỉ đăng ký 1 handler, `confirmOrder()` là dead code không bao giờ được gọi | ORD-UNIT-086 (đọc source, chưa cần chạy) | Open — cần Dev xoá/đổi route |
| BUG-001-SP5   | API Become-seller trả về 403 Forbidden thay vì 409 Conflict khi user đã là seller                          | Test thủ công/Story riêng | **Fixed** (Bug-Dev-Done) |

**Tổng cộng: 1 defect Open (cần Dev xử lý) + 1 defect đã Fixed.**

Ngoài ra, quá trình thiết kế test case (đọc source, chưa cần chạy) đã phát hiện **29 gap nghiệp vụ khác** cần Dev/BA xác nhận trước khi coi là "chấp nhận được" (đánh dấu "Cần viết (Prod) = Có" trong Test Matrix), tiêu biểu:

- **ORD-UNIT-005:** `@ValidateNested` không có `@IsDefined`/`@IsNotEmptyObject` → thiếu `address` vẫn pass validation khi checkout.
- **ORD-UNIT-034:** `discountAmount`/`shippingFee` đang hardcode = 0 (chưa tích hợp Voucher/phí ship).
- **ORD-UNIT-058:** Khi Seller huỷ đơn VNPAY/MOMO đã `PAID_PENDING_CONFIRMATION`, code chỉ gọi `releaseReservedStock` thay vì `restock`, dù đơn đã thanh toán online — cần xác nhận nghiệp vụ.
- **ORD-UNIT-090:** `SellerOrdersController` không có `SellerApprovedGuard` — seller chưa được duyệt vẫn xem được danh sách đơn của shop mình.
- **RFD-UNIT-013→019:** Các nhánh lỗi 404/403/409/410 của `RefundRequestsService.create` chưa có case PASS xác nhận qua execution.
- **RFD-UNIT-021:** Đơn đã có refund `APPROVED` trước đó vẫn có thể tạo thêm refund request mới (chỉ check status=PENDING) — nghi vấn lỗ hổng nghiệp vụ.
- **RFD-UNIT-033:** Khi gateway hoàn tiền lỗi, `approve()` vẫn trả 200 OK — lỗi chỉ được log, không throw ra ngoài.
- **RFD-UNIT-039:** `retryRefund` không giới hạn số lần retry gọi gateway.

Danh sách đầy đủ 30 gap (5 ở module Order, 25 ở module Refund) được lưu trong Test Matrix gốc (cột "Cần viết (Prod)").

---

## 8. Risk & Limitation

| Risk / Limitation                                                        | Severity   | Impact                                                                                             |
| -------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| 0/140 Unit Test đã được thực thi                                          | **Critical** | Chưa có bằng chứng thực tế (PASS/FAIL) cho toàn bộ luồng State Machine và Refund — rủi ro release code chưa qua kiểm thử tự động |
| 0 E2E Test cho Sprint 05 (dồn về Sprint 07)                               | **High**   | Thiếu execution evidence ở tầng HTTP/API cho các API mới của Order state machine và Refund           |
| Dead code trùng route `PATCH :id/confirm` trong `OrdersController`       | **High**   | `confirmOrder()` không bao giờ được gọi trong thực tế — cần Dev xử lý trước khi coi tính năng "confirm" là hoàn chỉnh |
| 25/42 case Refund và 5/98 case Order được gắn cờ "Cần viết (Prod)"       | **Medium** | Nhiều gap nghiệp vụ (retry không giới hạn, thiếu Guard duyệt Seller, hardcode phí ship/voucher) cần BA/Dev xác nhận trước go-live |
| `SellerOrdersController` thiếu `SellerApprovedGuard`                     | **Medium** | Seller chưa được duyệt vẫn truy cập được danh sách đơn của shop mình                                 |
| Code Coverage chưa có số liệu                                             | **Medium** | Chưa đánh giá được mức độ bao phủ code tự động cho module Order & Refund                             |

> **Khuyến nghị:** Ưu tiên chạy 51 test case P0-Critical (đặc biệt các case liên quan pessimistic lock, refund gateway, phân quyền) trong tuần đầu Sprint 06 trước khi merge lên staging.

---

## 9. Test Quality Metrics

| Metric                    |     Value |
| -------------------------- | --------: |
| Total Test Design          |       140 |
| Unit Design                |       140 |
| E2E Design                 |         0 |
| Production Unit            |       140 |
| Production E2E             |         0 |
| Total Production Scope     |       140 |
| P0                         |        51 |
| P1                         |        43 |
| P2                         |        45 |
| P3                         |         1 |
| Executed                   |         0 |
| PASS                       |         0 |
| FAIL                       |         0 |
| Execution Completion       |    **0%** |
| Pass Rate                  |   **N/A** |
| Production Scope Coverage  | **100%**  |
| Defect (Open)              |         1 |
| Defect (Fixed)             |       1/1 |
| Code Coverage              |    Chưa đo |

---

## 10. Kết luận

Sprint 05 hoàn thành **16/16 Jira Issue** (100%), tương ứng **66 Story Point**, đáp ứng đầy đủ mục tiêu triển khai code cho State Machine đơn hàng, cronjob tự động huỷ đơn quá hạn, đồng bộ trạng thái Payment, và toàn bộ luồng Yêu cầu/Duyệt hoàn tiền (Refund Request), kèm 1 bug fix ngoài phạm vi (Become-seller sai mã lỗi).

Về kiểm thử, Sprint 05 đã thiết kế **140 Unit Test** (98 cho Order, 42 cho Refund) và **0 E2E Test** (toàn bộ E2E tiếp tục dồn về Sprint 07). Tuy nhiên, khác với Sprint 04, **chưa có Unit Test nào được thực thi tại thời điểm lập báo cáo** — Execution Completion Rate = **0%**, Pass Rate = **N/A**. Đây là khoảng trống lớn nhất của Sprint 05 và cần được ưu tiên xử lý ngay trong Sprint 06, bắt đầu từ 51 case P0-Critical.

Quá trình thiết kế test cũng phát hiện **1 defect xác nhận** (dead code do trùng route `PATCH :id/confirm`) và **29 gap nghiệp vụ** cần Dev/BA xác nhận (retry hoàn tiền không giới hạn, thiếu Guard duyệt Seller, hardcode phí ship/voucher, v.v.).

**Sprint Status: PARTIALLY ACHIEVED — Dev Complete, QA Execution Pending**
