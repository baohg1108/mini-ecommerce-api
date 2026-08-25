# SPRINT 04 TEST REPORT

**Module:** Payment & Checkout
**Dự án:** Mini E-commerce System
**Thời gian:** 16/08/2026 – 21/08/2026
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

## 1. Sprint Overview

**Sprint Goal:** Hoàn thiện luồng Đặt hàng và Thanh toán — cho phép Customer checkout giỏ hàng thành một hoặc nhiều đơn hàng (tách theo Shop) trong một transaction duy nhất, hỗ trợ thanh toán COD và thanh toán trực tuyến qua VNPay/Momo, đảm bảo tính toàn vẹn tồn kho bằng Pessimistic Locking, đồng thời cung cấp API xem lịch sử giao dịch và danh sách đơn hàng cho Seller.

**Phạm vi chính:**

- Bảng Order, Payment; dựng Base DB Transaction cho checkout.
- Logic tách 1 giỏ hàng thành N đơn hàng theo từng Shop.
- API Checkout tạo Order trong 1 Transaction.
- Logic trừ tồn kho bằng Pessimistic Locking.
- Tích hợp cổng thanh toán VNPay: sinh URL thanh toán, API IPN, validate Secure Hash.
- Tích hợp cổng thanh toán Momo: sinh QR/URL, API IPN, validate chữ ký.
- API xem lịch sử giao dịch thanh toán.
- API Seller xem danh sách đơn hàng.
- Unit Test Transaction Rollback; Test IPN webhook bằng Ngrok.
- Refresh token/revoke và đánh Index DB — đẩy sớm từ backlog để hỗ trợ các luồng truy vấn nặng của Payment/Order.

---

## 2. Kết quả tổng quan

| Metric                     |      Kết quả |
| -------------------------- | -----------: |
| Jira Issue thuộc Sprint    | 14/14 (100%) |
| Story Point hoàn thành     |        58 SP |
| Test Case được thiết kế    |           75 |
| Design Unit Test           |           46 |
| Design E2E Test            |           29 |
| Production Unit Test       |           35 |
| Production E2E Test        |           27 |
| Tổng Production Test Scope |           62 |
| Test Case đã thực thi      |           39 |
| Test Case PASS             |           39 |
| Test Case FAIL             |            0 |
| P0 – Critical              |           35 |
| P1 – High                  |           27 |
| P2 – Medium                |           13 |
| P3 – Low                   |            0 |
| Defect phát sinh           |            0 |
| Defect đã Fixed            |          0/0 |
| Code Coverage              |      Chưa đo |

> **Scope Change:** Sprint 04 ban đầu gồm 15 Jira Issue (63 SP). Ngày 23/08/2026, issue SCRUM-53 [BE-048]: "Test lock DB khi checkout đồng thời" (5 SP) bị đưa ra khỏi phạm vi sprint và chuyển về Backlog. Sprint 04 hoàn thành 14/14 Jira Issue thuộc phạm vi cuối cùng (100%), tương ứng 58 SP.

### Priority Distribution

| Priority          | Số lượng |    Tỷ lệ |
| ----------------- | -------: | -------: |
| **P0 – Critical** |       35 |    46.7% |
| **P1 – High**     |       27 |    36.0% |
| **P2 – Medium**   |       13 |    17.3% |
| **P3 – Low**      |        0 |       0% |
| **Tổng**          |   **75** | **100%** |

### Test Status

| Metric                          |  Kết quả |
| ------------------------------- | -------: |
| Design                          |       75 |
| Executed                        |       39 |
| Execution Completion Rate       |  **52%** |
| PASS                            |       39 |
| FAIL                            |        0 |
| Pass Rate trên test đã thực thi | **100%** |

> **E2E Status:** 29 E2E Test Case đã được thiết kế nhưng chưa thực thi trong Sprint 04. Các E2E Test này được deferred đến **Sprint 07 – Final E2E Regression & Project Test Summary**.

> **Unit Test Status:** 39 Unit Test được thực thi qua `npm run test` (Jest) ngày 24/08/2026, đạt 39/39 PASS, 0 FAIL — bao gồm PaymentService, VnpayService, MomoService và các DTO validation. Test Matrix thiết kế 46 Unit Test cho module Payment; 7 case còn lại chưa có trong code hiện tại và cần được bổ sung ở sprint sau.

**Sprint Status: PARTIALLY ACHIEVED**

Sprint 04 hoàn thành 14/14 Jira Issue thuộc phạm vi cuối cùng của sprint (100%), tương ứng 58 Story Point, sau khi 1 issue (SCRUM-53 [BE-048], 5 SP) bị đưa ra khỏi sprint ngày 23/08/2026 và trả về Backlog. Tổng cộng 75 test case được thiết kế, trong đó 46 Unit Test và 29 E2E Test. Trong Sprint 04, 39 Unit Test được thực thi qua `npm run test` và đạt 39/39 PASS. E2E Test chưa được thực thi và được deferred đến Sprint 07.

---

## 3. Sprint Goal Achievement

|   # | Sprint Success Criteria                                | Requirement | Status                         |
| --: | ------------------------------------------------------ | ----------- | ------------------------------ |
|   1 | Bảng Payment, luồng đơn COD                            | FR-24       | Achieved                       |
|   2 | Bảng Order, dựng Base DB Transaction                   | -           | Achieved                       |
|   3 | Tích hợp VNPay, sinh URL thanh toán                    | FR-25       | Achieved ở Unit / E2E deferred |
|   4 | Logic trừ tồn kho bằng Pessimistic Locking             | BR-03       | Achieved                       |
|   5 | API IPN VNPay, validate Secure Hash                    | FR-27       | Achieved ở Unit / E2E deferred |
|   6 | Logic tách 1 giỏ hàng thành N đơn hàng                 | BR-02       | Achieved                       |
|   7 | Tích hợp Momo, sinh QR/URL                             | FR-26       | Achieved ở Unit / E2E deferred |
|   8 | API Checkout — tạo Order trong 1 Transaction           | UC-08       | Achieved                       |
|   9 | API IPN Momo, validate chữ ký                          | FR-27       | Achieved ở Unit / E2E deferred |
|  10 | Unit Test Transaction (cố tình Error để test Rollback) | -           | Achieved                       |
|  11 | Test IPN webhook bằng Ngrok                            | FR-27       | Achieved                       |
|  12 | API xem lịch sử giao dịch thanh toán                   | FR-28       | Achieved ở Unit / E2E deferred |
|  13 | API Seller xem danh sách Đơn hàng                      | FR-29       | Achieved                       |

**13/13 Sprint Success Criteria đã được xác nhận ở tầng Unit Test.**

Tiêu chí #14 (Test lock DB khi checkout đồng thời, BR-03 bổ sung) không còn thuộc phạm vi Sprint 04 do bị đưa ra khỏi sprint (scope change ngày 23/08/2026) và hiện ở Backlog.

Tuy nhiên, execution evidence ở tầng E2E/API chưa đầy đủ do E2E Test chưa được thực thi trong Sprint 04.

---

## 4. Requirement Traceability Matrix

| Requirement                                          | Jira               | Test Type  | Execution                     |
| ---------------------------------------------------- | ------------------ | ---------- | ----------------------------- |
| FR-24 – COD payment flow                             | SCRUM-41 (BE-037)  | Unit       | Executed / PASS               |
| — Order table & DB Transaction base                  | SCRUM-42 (BE-038)  | Unit       | Executed / PASS               |
| FR-25 – Tích hợp VNPay, sinh URL thanh toán          | SCRUM-43 (BE-039)  | Unit / E2E | Unit Executed / E2E Deferred  |
| BR-03 – Pessimistic Locking khi trừ tồn kho          | SCRUM-44 (BE-040)  | Unit       | Executed / PASS               |
| FR-27 – API IPN VNPay, validate Secure Hash          | SCRUM-45 (BE-041)  | Unit / E2E | Unit Executed / E2E Deferred  |
| BR-02 – Tách giỏ hàng thành N đơn theo Shop          | SCRUM-46 (BE-042)  | Unit       | Executed / PASS               |
| FR-26 – Tích hợp Momo, sinh QR/URL                   | SCRUM-47 (BE-043)  | Unit / E2E | Unit Executed / E2E Deferred  |
| UC-08 – API Checkout (tạo Order trong 1 Transaction) | SCRUM-48 (BE-044)  | Unit / E2E | Unit Executed / E2E Deferred  |
| FR-27 – API IPN Momo, validate chữ ký                | SCRUM-49 (BE-045)  | Unit / E2E | Unit Executed / E2E Deferred  |
| Rollback Transaction khi checkout lỗi giữa chừng     | SCRUM-50 (BE-046)  | Unit       | Executed / PASS               |
| FR-27 – Webhook IPN (Ngrok end-to-end)               | SCRUM-51 (BE-047)  | E2E        | Executed / PASS               |
| FR-28 – Lịch sử giao dịch thanh toán                 | SCRUM-54 (BE-083*) | Unit / E2E | Unit Executed / E2E Deferred  |
| FR-29 – Seller xem danh sách đơn hàng                | SCRUM-55 (BE-049)  | Unit       | Executed / PASS               |
| BR-03 (bổ sung) – Lock DB khi checkout đồng thời     | SCRUM-53 (BE-048)  | -          | Removed khỏi sprint — Backlog |

---

## 5. Test Case Summary

### 5.1 Test Design

| Test Level | Designed |
| ---------- | -------: |
| Unit Test  |       46 |
| E2E Test   |       29 |
| **Total**  |   **75** |

### 5.2 Production Test Scope

| Test Level                 | Production Scope |
| -------------------------- | ---------------: |
| Unit Test                  |               35 |
| E2E Test                   |               27 |
| **Total Production Scope** |           **62** |

### 5.3 Test Execution

| Test Level | Designed | Production Scope | Executed |   PASS |  FAIL |
| ---------- | -------: | ---------------: | -------: | -----: | ----: |
| Unit Test  |       46 |               35 |       39 |     39 |     0 |
| E2E Test   |       29 |               27 |        0 |      0 |     0 |
| **Total**  |   **75** |           **62** |   **39** | **39** | **0** |

**Execution Completion Rate:**

> 39 / 75 = **52%**

**Pass Rate trên test đã thực thi:**

> 39 / 39 = **100%**

**Production Scope Coverage:**

> 62 / 75 = **82.7%**

---

## 6. Test Priority

Các test case được phân loại theo **Risk-Based Testing**, ưu tiên các luồng liên quan trực tiếp đến tiền (thanh toán), tính toàn vẹn tồn kho, và bảo mật chữ ký callback (IPN).

| Priority  | Mức độ   | Số lượng |    Tỷ lệ | Ý nghĩa                                                                                |
| --------- | -------- | -------: | -------: | -------------------------------------------------------------------------------------- |
| **P0**    | Critical |       35 |    46.7% | Luồng tạo/xác nhận thanh toán, validate chữ ký IPN, trừ/giải phóng tồn kho, phân quyền |
| **P1**    | High     |       27 |    36.0% | Validation DTO đầu vào, các nhánh lỗi nghiệp vụ quan trọng (404/403/400)               |
| **P2**    | Medium   |       13 |    17.3% | Edge case, giá trị mặc định, phân trang, filter phụ                                    |
| **P3**    | Low      |        0 |       0% | Không có                                                                               |
| **Total** |          |   **75** | **100%** |

### Priority Strategy

Thứ tự ưu tiên kiểm thử:

**P0 → P1 → P2 → P3**

- **P0:** Critical — bắt buộc kiểm thử trước khi tích hợp VNPay/Momo lên môi trường thật (kể cả sandbox), vì sai sót ở đây ảnh hưởng trực tiếp đến tồn kho và tiền của giao dịch.
- **P1:** High — đảm bảo các nhánh lỗi trả đúng mã HTTP và message cho FE xử lý.
- **P2:** Medium — thực hiện trong regression sau khi P0/P1 đã pass.
- **P3:** Low — không phát sinh trong sprint này.

---

## 7. Defect Log

| Bug ID | Mô tả                                                                   | Phát hiện qua | Trạng thái |
| ------ | ----------------------------------------------------------------------- | ------------- | ---------- |
| —      | Chưa ghi nhận defect chính thức nào cho module Payment trong sprint này | —             | —          |

**Tổng cộng: 0 defect.**

39 Unit Test đã thực thi qua `npm run test` không phát hiện FAIL nào. Kiểm thử thủ công (Postman/Ngrok) cho luồng Order/Checkout và webhook IPN cũng không phát hiện lỗi nghiệp vụ nào tại thời điểm kiểm thử. 29 E2E Test case chưa được thực thi nên chưa có cơ sở kết luận không có defect ở tầng E2E.

---

## 8. Risk & Limitation

| Risk / Limitation                                                  | Severity   | Impact                                                                                                              |
| ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| E2E Test chưa được execution (0/29)                                | **High**   | Thiếu execution evidence ở tầng HTTP/API cho các chức năng VNPay/Momo/Payment History                               |
| [BE-048] Test lock DB khi checkout đồng thời bị loại khỏi sprint   | **High**   | Chưa xác minh hành vi `pessimistic_write` lock dưới tải đồng thời thật — rủi ro bán vượt tồn kho nếu có traffic cao |
| Chênh lệch giữa Design Unit Test (46) và số Unit Test thực tế (39) | **Medium** | Cần rà soát để xác nhận 7 test case còn thiếu đã được viết hay chưa                                                 |
| Code Coverage chưa có số liệu                                      | **Medium** | Chưa đánh giá được mức độ bao phủ code tự động cho module Payment                                                   |

> **E2E Status:** Các E2E Test được thiết kế trong Sprint 04 chưa được thực thi và được **deferred đến Sprint 07 – Final E2E Regression & Project Test Summary**.

---

## 9. Test Quality Metrics

| Metric                    |     Value |
| ------------------------- | --------: |
| Total Test Design         |        75 |
| Unit Design               |        46 |
| E2E Design                |        29 |
| Production Unit           |        35 |
| Production E2E            |        27 |
| Total Production Scope    |        62 |
| P0                        |        35 |
| P1                        |        27 |
| P2                        |        13 |
| P3                        |         0 |
| Executed                  |        39 |
| PASS                      |        39 |
| FAIL                      |         0 |
| Execution Completion      |   **52%** |
| Pass Rate                 |  **100%** |
| Production Scope Coverage | **82.7%** |
| Defect                    |         0 |
| Fixed Defect              |       0/0 |
| Code Coverage             |   Chưa đo |

---

## 10. Kết luận

Sprint 04 hoàn thành **14/14 Jira Issue** thuộc phạm vi cuối cùng của sprint (100%), tương ứng **58 Story Point**, đáp ứng các mục tiêu chính của Sprint về Order, Payment, tích hợp VNPay/Momo và trừ tồn kho bằng Pessimistic Locking. Sprint 04 ban đầu gồm 15 Jira Issue (63 SP); một issue — **SCRUM-53 [BE-048]: Test lock DB khi checkout đồng thời** — bị đưa ra khỏi phạm vi sprint (scope change ngày 23/08/2026, -5 SP) và hiện đang ở **Backlog**.

Về kiểm thử, Sprint 04 đã thiết kế **75 test case**, gồm **46 Unit Test và 29 E2E Test**. Các test case được phân loại theo mức độ ưu tiên gồm **35 P0, 27 P1 và 13 P2**.

Trong Sprint 04, **39 Unit Test được thực thi qua `npm run test` và đạt 39/39 PASS (100%)**. Tuy nhiên, E2E Test chưa được thực thi, do đó **Execution Completion Rate trên toàn bộ Test Design là 52%**.

Không có defect chính thức nào được ghi nhận trong sprint này.

Các E2E Test chưa thực thi trong Sprint 04 được **deferred đến Sprint 07 – Final E2E Regression & Project Test Summary**.

**Sprint Status: PARTIALLY ACHIEVED**
