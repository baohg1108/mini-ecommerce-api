# SPRINT 03 TEST REPORT

**Module:** Giỏ hàng & Tìm kiếm (Cart & Search)  
**Dự án:** Mini E-commerce System  
**Thời gian:** 10/08/2026 – 15/08/2026  
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

## 1. Sprint Overview

**Sprint Goal:** Hoàn thiện luồng Giỏ hàng và Tìm kiếm sản phẩm — cho phép Customer thêm, cập nhật và xoá sản phẩm trong giỏ hàng; hệ thống tự động nhóm giỏ hàng theo từng Shop khi checkout; đồng thời cung cấp API tìm kiếm, lọc sản phẩm và hoàn thiện logic SKU/biến thể sản phẩm carry-over từ Sprint 02.

**Phạm vi chính:**

- Cart & CartItem: thêm, cập nhật, xoá sản phẩm.
- Gom nhóm CartItem theo Shop phục vụ checkout.
- Product Search & Filter bằng Query Builder.
- Phân trang và tối ưu truy vấn, hạn chế N+1 query.
- ProductVariant / SKU: dữ liệu, logic tạo và cập nhật biến thể.
- Tìm kiếm sản phẩm theo SKU.
- Inventory validation khi thao tác với giỏ hàng.
- Clear Cart sau Checkout.
- Thiết kế và kiểm thử Unit Test, E2E Test.

---

## 2. Kết quả tổng quan

| Metric                     |      Kết quả |
| -------------------------- | -----------: |
| Jira Issue thuộc Sprint    | 12/12 (100%) |
| Story Point hoàn thành     |        41 SP |
| Test Case được thiết kế    |           78 |
| Design Unit Test           |           39 |
| Design E2E Test            |           39 |
| Production Unit Test       |           32 |
| Production E2E Test        |           28 |
| Tổng Production Test Scope |           60 |
| Test Case đã thực thi      |           39 |
| Test Case PASS             |           39 |
| Test Case FAIL             |            0 |
| P0 – Critical              |           27 |
| P1 – High                  |           37 |
| P2 – Medium                |           14 |
| P3 – Low                   |            0 |
| Defect phát sinh           |            4 |
| Defect đã Fixed            |          4/4 |
| Code Coverage              |        33.7% |

### Priority Distribution

| Priority          | Số lượng |    Tỷ lệ |
| ----------------- | -------: | -------: |
| **P0 – Critical** |       27 |    34.6% |
| **P1 – High**     |       37 |    47.4% |
| **P2 – Medium**   |       14 |    18.0% |
| **P3 – Low**      |        0 |       0% |
| **Tổng**          |   **78** | **100%** |

### Test Status

| Metric                          |  Kết quả |
| ------------------------------- | -------: |
| Design                          |       78 |
| Executed                        |       39 |
| Execution Completion Rate       |  **50%** |
| PASS                            |       39 |
| FAIL                            |        0 |
| Pass Rate trên test đã thực thi | **100%** |

> **E2E Status:** 39 E2E Test Case đã được thiết kế nhưng chưa thực thi trong Sprint 03. Các E2E Test này được deferred đến **Sprint 07 – Final E2E Regression & Project Test Summary**.

**Sprint Status: MOSTLY ACHIEVED**

Toàn bộ 12 Jira Issue của Sprint 03 được hoàn thành, tương ứng 41 Story Point. Tổng cộng 78 test case được thiết kế, trong đó 39 Unit Test và 39 E2E Test. Trong Sprint 03, 39 Unit Test được thực thi và đạt 39/39 PASS. E2E Test chưa được execution và được deferred đến Sprint 07.

---

## 3. Sprint Goal Achievement

|   # | Sprint Success Criteria                            | Requirement   | Status                         |
| --: | -------------------------------------------------- | ------------- | ------------------------------ |
|   1 | Customer thêm sản phẩm vào giỏ hàng                | UC-07, FR-19  | Achieved                       |
|   2 | Customer cập nhật / xoá CartItem                   | FR-19         | Achieved                       |
|   3 | Hệ thống nhóm giỏ hàng theo từng Shop khi checkout | FR-20         | Achieved                       |
|   4 | Inventory validation khi thao tác giỏ hàng         | BR-03         | Achieved                       |
|   5 | API tìm kiếm sản phẩm bằng Query Builder           | UC-06, FR-15  | Achieved                       |
|   6 | Lọc sản phẩm & phân trang                          | FR-16         | Achieved                       |
|   7 | Tối ưu Search chống N+1 query                      | NFR-Hiệu năng | Achieved                       |
|   8 | Bảng ProductVariant & logic SKU                    | FR-12         | Achieved                       |
|   9 | API tạo/cập nhật hàng loạt biến thể SKU            | FR-12         | Achieved                       |
|  10 | Tìm kiếm theo SKU                                  | FR-12         | Achieved ở Unit / E2E deferred |
|  11 | API Clear Cart sau Checkout                        | FR-20         | Achieved                       |

**11/11 Sprint Success Criteria đã được xác nhận ở tầng Unit Test.**

Tuy nhiên, execution evidence ở tầng E2E/API chưa đầy đủ do E2E Test chưa được thực thi trong Sprint 03.

---

## 4. Requirement Traceability Matrix

| Requirement                                  | Jira                        | Test Type  | Execution                    |
| -------------------------------------------- | --------------------------- | ---------- | ---------------------------- |
| FR-19 – Thêm/cập nhật/xoá CartItem           | SCRUM-27, SCRUM-29          | Unit / E2E | Unit Executed / E2E Deferred |
| FR-20 – Nhóm CartItem theo Shop khi Checkout | SCRUM-33                    | Unit / E2E | Unit Executed / E2E Deferred |
| FR-12 – ProductVariant / SKU                 | SCRUM-26 (BE-026), SCRUM-30 | Unit / E2E | Unit Executed / E2E Deferred |
| FR-12 – Search by SKU                        | SCRUM-38                    | Unit / E2E | Unit Executed / E2E Deferred |
| UC-06 / FR-15 – Tìm kiếm sản phẩm            | SCRUM-32                    | Unit / E2E | Unit Executed / E2E Deferred |
| FR-16 – Lọc sản phẩm & phân trang            | SCRUM-34                    | Unit / E2E | Unit Executed / E2E Deferred |
| NFR – Tối ưu Query Search (N+1)              | SCRUM-36                    | Unit       | Executed / PASS              |
| BR-03 – Inventory validation trên Cart       | SCRUM-31                    | Unit / E2E | Unit Executed / E2E Deferred |
| UC-07 – Thêm sản phẩm vào giỏ hàng           | SCRUM-27                    | Unit / E2E | Unit Executed / E2E Deferred |
| Regression – Gom nhóm giỏ hàng               | SCRUM-37                    | Unit / E2E | Unit Executed / E2E Deferred |
| Clear Cart sau Checkout                      | SCRUM-35                    | Unit / E2E | Unit Executed / E2E Deferred |

---

## 5. Test Case Summary

### 5.1 Test Design

| Test Level | Designed |
| ---------- | -------: |
| Unit Test  |       39 |
| E2E Test   |       39 |
| **Total**  |   **78** |

### 5.2 Production Test Scope

| Test Level                 | Production Scope |
| -------------------------- | ---------------: |
| Unit Test                  |               32 |
| E2E Test                   |               28 |
| **Total Production Scope** |           **60** |

### 5.3 Test Execution

| Test Level | Designed | Production Scope | Executed |   PASS |  FAIL |
| ---------- | -------: | ---------------: | -------: | -----: | ----: |
| Unit Test  |       39 |               32 |       39 |     39 |     0 |
| E2E Test   |       39 |               28 |        0 |      0 |     0 |
| **Total**  |   **78** |           **60** |   **39** | **39** | **0** |

**Execution Completion Rate:**

> 39 / 78 = **50%**

**Pass Rate trên test đã thực thi:**

> 39 / 39 = **100%**

**Production Scope Coverage:**

> 60 / 78 = **76.9%**

---

## 6. Test Priority

Các test case được phân loại theo **Risk-Based Testing**, dựa trên mức độ ảnh hưởng đến nghiệp vụ, security và tính ổn định của hệ thống.

| Priority  | Mức độ   | Số lượng |    Tỷ lệ | Ý nghĩa                                                                |
| --------- | -------- | -------: | -------: | ---------------------------------------------------------------------- |
| **P0**    | Critical |       27 |    34.6% | Chức năng cốt lõi, security, inventory hoặc lỗi ảnh hưởng nghiêm trọng |
| **P1**    | High     |       37 |    47.4% | Core business functionality và validation quan trọng                   |
| **P2**    | Medium   |       14 |    18.0% | Edge case và supporting functionality                                  |
| **P3**    | Low      |        0 |       0% | Nice-to-have / mức độ ưu tiên thấp                                     |
| **Total** |          |   **78** | **100%** |

### Priority Strategy

Thứ tự ưu tiên kiểm thử:

**P0 → P1 → P2 → P3**

- **P0:** Critical, bắt buộc kiểm thử trước Production Release.
- **P1:** High, ưu tiên kiểm thử sau P0 và cần đảm bảo đối với core business.
- **P2:** Medium, thực hiện trong regression hoặc sau khi hoàn thành P0/P1.
- **P3:** Low, có thể thực hiện khi còn thời gian hoặc trong các cycle tiếp theo.

---

## 7. Defect Log

| Bug ID      | Mô tả                                                                    | Phát hiện qua | Trạng thái |
| ----------- | ------------------------------------------------------------------------ | ------------- | ---------- |
| SP3-BUG-004 | Thông báo lỗi trả về không đúng định dạng, liên quan BE-14, BE-16, BE-18 | Postman / API | Fixed      |
| SP3-BUG-003 | Thiếu phân quyền cho nhiều API trong dự án                               | Postman / API | Fixed      |
| SP3-BUG-001 | Sai ngôn ngữ khi trả về lỗi                                              | Postman / API | Fixed      |
| SP3-BUG-002 | Chưa chuẩn hoá slug trong Product                                        | Postman / API | Fixed      |

**Tổng cộng: 4 defect.**

Cả 4 defect được phát hiện thông qua kiểm thử thủ công bằng Postman/API và đã được Fixed.

Việc các defect được phát hiện ở tầng API thay vì Unit Test cho thấy cần bổ sung automated API/E2E regression để tăng khả năng phát hiện và ngăn ngừa regression.

---

## 8. Risk & Limitation

| Risk / Limitation                       | Severity   | Impact                                                                   |
| --------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| E2E Test chưa được execution            | **High**   | Thiếu execution evidence ở tầng HTTP/API cho các chức năng Cart & Search |
| Production E2E chưa được thực thi       | **High**   | Chưa xác nhận đầy đủ hành vi của hệ thống qua API thực tế                |
| 4 defect chỉ được phát hiện qua Postman | **Medium** | Có nguy cơ regression nếu không chuyển thành automated test              |
| Code Coverage chưa có số liệu           | **Medium** | Chưa đánh giá được mức độ bao phủ code tự động                           |

> **E2E Status:** Các E2E Test được thiết kế trong Sprint 03 chưa được thực thi và được **deferred đến Sprint 07 – Final E2E Regression & Project Test Summary**.

---

## 9. Test Quality Metrics

| Metric                    |     Value |
| ------------------------- | --------: |
| Total Test Design         |        78 |
| Unit Design               |        39 |
| E2E Design                |        39 |
| Production Unit           |        32 |
| Production E2E            |        28 |
| Total Production Scope    |        60 |
| P0                        |        27 |
| P1                        |        37 |
| P2                        |        14 |
| P3                        |         0 |
| Executed                  |        39 |
| PASS                      |        39 |
| FAIL                      |         0 |
| Execution Completion      |   **50%** |
| Pass Rate                 |  **100%** |
| Production Scope Coverage | **76.9%** |
| Defect                    |         4 |
| Fixed Defect              |         4 |
| Code Coverage             |     33.7% |

---

## 10. Kết luận

Sprint 03 hoàn thành **12/12 Jira Issue**, tương ứng **41 Story Point**, đáp ứng các mục tiêu chính của Sprint về Cart, Search, ProductVariant/SKU và Inventory Validation.

Về kiểm thử, Sprint 03 đã thiết kế **78 test case**, gồm **39 Unit Test và 39 E2E Test**. Các test case được phân loại theo mức độ ưu tiên gồm **27 P0, 37 P1 và 14 P2**.

Trong Sprint 03, **39 Unit Test được thực thi và đạt 39/39 PASS (100%)**. Tuy nhiên, E2E Test chưa được thực thi, do đó **Execution Completion Rate trên toàn bộ Test Design là 50%**.

Ngoài ra, **4 defect được phát hiện qua Postman/API testing và đã được Fixed**. Các defect này cho thấy sự cần thiết của automated API/E2E regression trong giai đoạn kiểm thử tổng thể.

Các E2E Test chưa thực thi trong Sprint 03 được **deferred đến Sprint 07 – Final E2E Regression & Project Test Summary**.

**Sprint Status: MOSTLY ACHIEVED**
