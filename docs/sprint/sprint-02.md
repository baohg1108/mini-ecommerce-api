# SPRINT 02 TEST REPORT

**Module:** Shop & Product Management
**Dự án:** Mini E-commerce System
**Thời gian:** 02/08/2026 – 09/08/2026
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

## 1. Sprint Overview

**Sprint Goal:** Xây dựng module Shop và Product MVP, cho phép Seller đăng ký và quản lý gian hàng, Admin phê duyệt và quản lý gian hàng, Seller quản lý sản phẩm, Admin xử lý sản phẩm vi phạm và cung cấp API công khai cho Shop/Product.

**Phạm vi chính:**

- Seller đăng ký Shop.
- Admin duyệt/từ chối Shop.
- Admin khóa/mở khóa Shop.
- Seller cập nhật thông tin Shop.
- Kiểm soát quyền truy cập dựa trên trạng thái Shop.
- Public API cho Shop.
- Seller tạo, cập nhật, xóa/ẩn Product.
- Admin gỡ Product vi phạm.
- Public API cho Product.
- Thiết kế và kiểm thử Unit Test, E2E Test.

---

## 2. Kết quả tổng quan

| Metric                     |        Kết quả |
| -------------------------- | -------------: |
| Jira Issue thuộc Sprint    |   28/28 (100%) |
| Jira Issue hoàn thành      | 27/28 (96,43%) |
| Story Point hoàn thành     |          45 SP |
| Test Case được thiết kế    |            203 |
| Design Unit Test           |            137 |
| Design E2E Test            |             66 |
| Production Unit Test       |             47 |
| Production E2E Test        |             29 |
| Tổng Production Test Scope |             76 |
| Test Case đã thực thi      |            137 |
| Test Case PASS             |            137 |
| Test Case FAIL             |              0 |
| P0 – Critical              |             56 |
| P1 – High                  |             73 |
| P2 – Medium                |             55 |
| P3 – Low                   |             19 |
| Defect phát sinh           |              0 |
| Defect đã Fixed            |            0/0 |
| Code Coverage              |         ~30,5% |

### Priority Distribution

| Priority          | Số lượng |    Tỷ lệ |
| ----------------- | -------: | -------: |
| **P0 – Critical** |       56 |   27,59% |
| **P1 – High**     |       73 |   35,96% |
| **P2 – Medium**   |       55 |   27,09% |
| **P3 – Low**      |       19 |    9,36% |
| **Tổng**          |  **203** | **100%** |

### Test Status

| Metric                          |    Kết quả |
| ------------------------------- | ---------: |
| Design                          |        203 |
| Executed                        |        137 |
| Execution Completion Rate       | **67,49%** |
| PASS                            |        137 |
| FAIL                            |          0 |
| Pass Rate trên test đã thực thi |   **100%** |

> **E2E Status:** 66 E2E Test Case (30 Shop + 36 Product) đã được thiết kế nhưng chưa thực thi trong Sprint 02. Các E2E Test này được deferred đến Sprint 03.

**Sprint Status: MOSTLY ACHIEVED**

Sprint 02 hoàn thành 27/28 Jira Issue (96,43%), tương ứng 45 Story Point. Theo Test Matrix (đã loại phần Search thuộc Sprint 03), tổng cộng **203 test case được thiết kế** cho Shop (83) và Product (120), gồm **137 Unit Test và 66 E2E Test**. Toàn bộ **137 Unit Test đã được thực thi và đạt 137/137 PASS**. 66 E2E Test (30 Shop + 36 Product) chưa được thực thi, deferred đến Sprint 03.

> **Lưu ý:** 137 Unit Test được thực thi trong Sprint 02, trong khi Production Unit Test Scope chính thức chỉ là 47 (29 Shop + 18 Product). Điều này cho thấy nhiều Unit Test bổ sung đã được thực thi ngoài phạm vi Production Test Scope ban đầu — tương tự tình trạng ghi nhận ở Sprint 03. Con số Production Scope (76) được lấy nguyên từ dòng tổng hợp trong file gốc; do file không đánh dấu từng dòng có thuộc Production Scope hay không, mình chưa thể loại trừ chính xác phần Search (nếu có) khỏi 2 con số này.

---

## 3. Sprint Goal Achievement

|   # | Sprint Success Criteria           | Requirement  | Status   |
| --: | --------------------------------- | ------------ | -------- |
|   1 | Seller đăng ký Shop               | FR-06, UC-03 | Achieved |
|   2 | Admin duyệt/từ chối Shop          | FR-07, UC-04 | Achieved |
|   3 | Admin khóa/mở khóa Shop           | FR-09        | Achieved |
|   4 | Seller cập nhật Shop              | FR-08        | Achieved |
|   5 | Guard chặn Seller chưa được duyệt | BR-01, BR-08 | Achieved |
|   6 | Seller thêm Product               | FR-11, UC-05 | Achieved |
|   7 | Seller sửa/xóa/ẩn Product         | FR-13        | Achieved |
|   8 | Admin gỡ Product vi phạm          | FR-14        | Achieved |
|   9 | Public API Product Detail         | FR-17        | Achieved |
|  10 | Public API Shop                   | FR-18        | Partial  |

**9/10 Sprint Success Criteria đã được xác nhận đầy đủ; 1/10 được đánh giá Partial.**

FR-18 được đánh giá Partial vì functionality đã được triển khai và kiểm thử ở tầng Unit, nhưng chưa có đầy đủ E2E/API execution evidence để xác nhận behavior thực tế qua HTTP/API.

---

## 4. Requirement Traceability Matrix

| Requirement                | Jira               | Test Case (Test Matrix)                                  | Test Type  | Execution                    |
| -------------------------- | ------------------ | -------------------------------------------------------- | ---------- | ---------------------------- |
| FR-06 – Đăng ký Shop       | SCRUM-13           | SHOP-UNIT-021→027 · SHOP-E2E-001→005,014                 | Unit / E2E | Unit Executed / E2E Deferred |
| FR-07 – Duyệt/từ chối Shop | SCRUM-15           | SHOP-UNIT-035→039 · SHOP-E2E-008,013,015                 | Unit / E2E | Unit Executed / E2E Deferred |
| FR-08 – Cập nhật Shop      | SCRUM-19           | SHOP-UNIT-044→046 · SHOP-E2E-020→022                     | Unit / E2E | Unit Executed / E2E Deferred |
| FR-09 – Khóa/mở khóa Shop  | SCRUM-17           | SHOP-UNIT-040→043 · SHOP-E2E-016→019                     | Unit / E2E | Unit Executed / E2E Deferred |
| BR-01/BR-08 – Guard        | SCRUM-21           | SHOP-UNIT-032→034 · SHOP-E2E-017 · PROD-E2E-005          | Unit / E2E | Unit Executed / E2E Deferred |
| FR-11 – Thêm Product       | SCRUM-16, SCRUM-20 | PROD-UNIT-024→033 · PROD-E2E-001→006                     | Unit / E2E | Unit Executed / E2E Deferred |
| FR-13 – Sửa/xóa/ẩn Product | SCRUM-18, SCRUM-22 | PROD-UNIT-034→064 · PROD-E2E-009→016                     | Unit / E2E | Unit Executed / E2E Deferred |
| FR-14 – Admin gỡ Product   | SCRUM-14           | PROD-UNIT-044,047→054 · PROD-E2E-017→025                 | Unit / E2E | Unit Executed / E2E Deferred |
| FR-17 – Product Detail API | SCRUM-25           | PROD-UNIT-045,046,092→096 · PROD-E2E-028→030             | Unit / E2E | Unit Executed / E2E Deferred |
| FR-18 – Shop Public API    | SCRUM-26           | SHOP-UNIT-030,031,052 · PROD-UNIT-043 · SHOP-E2E-009→012 | Unit / E2E | Unit Executed / E2E Deferred |
| FR-12 – SKU/Variant        | —                  | —                                                        | —          | Not Covered                  |

> Ghi chú: nhiều Requirement dùng chung nhóm test DTO validation (`SHOP-UNIT-001→020`, `PROD-UNIT-001→027`) và test truy xuất chung (`getAllShops`, `findMyProducts`...) không liệt kê riêng ở trên để tránh trùng lặp.

---

## 5. Test Case Summary

### 5.1 Test Design (theo Module, đã loại 15 test Search thuộc Sprint 03)

| Module    | Unit Test | E2E Test |   Total |
| --------- | --------: | -------: | ------: |
| Shop      |        53 |       30 |      83 |
| Product   |        84 |       36 |     120 |
| **Total** |   **137** |   **66** | **203** |

### 5.2 Production Test Scope

| Test Level                       | Production Scope |
| -------------------------------- | ---------------: |
| Unit Test (Shop 29 + Product 18) |               47 |
| E2E Test (Shop 16 + Product 13)  |               29 |
| **Total Production Scope**       |           **76** |

### 5.3 Test Execution

| Test Level | Designed | Production Scope | Executed |    PASS |  FAIL |
| ---------- | -------: | ---------------: | -------: | ------: | ----: |
| Unit Test  |      137 |               47 |      137 |     137 |     0 |
| E2E Test   |       66 |               29 |        0 |       0 |     0 |
| **Total**  |  **203** |           **76** |  **137** | **137** | **0** |

**Execution Completion Rate:**

> 137 / 203 = **67,49%**

**Pass Rate trên test đã thực thi:**

> 137 / 137 = **100%**

**Production Scope Coverage:**

> 76 / 203 = **37,44%**

> Lưu ý: Toàn bộ 137 Unit Test (kể cả những test ngoài Production Unit Scope chính thức là 47) đã được thực thi và PASS trong Sprint 02. 66 E2E Test (30 Shop + 36 Product) chưa thực thi, deferred sang Sprint 03. Con số Production Scope (47/29) giữ nguyên theo dòng tổng hợp gốc của file, có thể vẫn còn lẫn một phần liên quan Search do file không đánh dấu chi tiết theo từng dòng.

---

## 6. Test Priority

Các test case được phân loại theo **Risk-Based Testing**, dựa trên mức độ ảnh hưởng đến nghiệp vụ, security và tính ổn định của hệ thống.

| Priority  | Mức độ   | Số lượng |    Tỷ lệ | Ý nghĩa                                                                                  |
| --------- | -------- | -------: | -------: | ---------------------------------------------------------------------------------------- |
| **P0**    | Critical |       56 |   27,59% | Chức năng ảnh hưởng trực tiếp Security/Business Integrity (Authorization, Admin actions) |
| **P1**    | High     |       73 |   35,96% | Chức năng nghiệp vụ chính (Create/Update/Delete Shop/Product)                            |
| **P2**    | Medium   |       55 |   27,09% | Validation và edge case                                                                  |
| **P3**    | Low      |       19 |    9,36% | Trường hợp ít ảnh hưởng                                                                  |
| **Total** |          |  **203** | **100%** |                                                                                          |

### Priority Strategy

Thứ tự ưu tiên kiểm thử: **P0 → P1 → P2 → P3**

- **P0:** Critical, bắt buộc kiểm thử trước Production Release.
- **P1:** High, ưu tiên kiểm thử sau P0 và cần đảm bảo đối với core business.
- **P2:** Medium, thực hiện trong regression hoặc sau khi hoàn thành P0/P1.
- **P3:** Low, có thể thực hiện khi còn thời gian hoặc trong các cycle tiếp theo.

---

## 7. Defect Log

| Bug ID | Mô tả                                        | Phát hiện qua | Trạng thái |
| ------ | -------------------------------------------- | ------------- | ---------- |
| —      | Không phát hiện defect trong Execution Scope | —             | —          |

**Tổng cộng: 0 defect.**

Trong phạm vi 137 test case thuộc Execution Scope và đã được thực thi, nhóm không ghi nhận defect nào. Do đó không phát sinh hoạt động Fix hoặc Retest trong Sprint 02.

---

## 8. Risk & Limitation

| Risk / Limitation        | Severity   | Impact                                   |
| ------------------------ | ---------- | ---------------------------------------- |
| Product chưa có E2E test | **High**   | Không xác nhận được HTTP/API behavior    |
| 8 Shop E2E chưa chạy     | **High**   | Thiếu execution evidence ở tầng HTTP/API |
| FR-12 chưa triển khai    | **Medium** | Requirement chưa covered                 |
| Code Coverage ~30,5%     | **Medium** | Coverage tổng thể còn thấp               |

> **E2E Status:** Các E2E Test được thiết kế trong Sprint 02 (Shop) chưa được thực thi, Product chưa có E2E Test Case. Cả hai được **deferred đến Sprint 03**.

---

## 9. Test Quality Metrics

| Metric                    |      Value |
| ------------------------- | ---------: |
| Total Test Design         |        203 |
| Unit Design               |        137 |
| E2E Design                |         66 |
| Production Unit           |         47 |
| Production E2E            |         29 |
| Total Production Scope    |         76 |
| P0                        |         56 |
| P1                        |         73 |
| P2                        |         55 |
| P3                        |         19 |
| Executed                  |        137 |
| PASS                      |        137 |
| FAIL                      |          0 |
| Execution Completion      | **67,49%** |
| Pass Rate                 |   **100%** |
| Production Scope Coverage | **37,44%** |
| Defect                    |          0 |
| Fixed Defect              |          0 |
| Code Coverage             |     ~30,5% |

---

## 10. Kết luận

Sprint 02 hoàn thành **27/28 Jira Issue (96,43%)**, tương ứng **45 Story Point**, đáp ứng phần lớn các mục tiêu chính của Sprint về Shop và Product Management.

Về kiểm thử, theo Test Matrix (đã loại phần Search thuộc Sprint 03), Sprint 02 đã thiết kế **203 test case** (Shop 83 + Product 120), gồm **137 Unit Test và 66 E2E Test**. Các test case được phân loại theo mức độ ưu tiên gồm **56 P0, 73 P1, 55 P2 và 19 P3**.

Trong Sprint 02, **137 test case (toàn bộ Unit) được thực thi và đạt 137/137 PASS (100%)**. Tuy nhiên, 66 E2E Test (30 Shop + 36 Product) chưa được thực thi, do đó **Execution Completion Rate trên toàn bộ Test Design là 67,49%**.

Không phát sinh defect nào trong phạm vi Execution Scope của Sprint 02.

Các E2E Test chưa thực thi, cùng requirement chưa triển khai (**FR-12 – SKU/Variant**), được **deferred đến Sprint 03**.

**Sprint Status: MOSTLY ACHIEVED**
