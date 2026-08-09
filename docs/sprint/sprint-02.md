# Sprint 02 Test Report — Shop & Product Management

**Project:** Mini E-commerce System  
**Sprint:** Sprint 02  
**Thời gian:** 02/08/2026 – 09/08/2026  
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

# 1. Sprint Overview

## 1.1. Sprint Goal

> Xây dựng module **Shop** và **Product** MVP, cho phép Seller đăng ký và quản lý gian hàng, Admin phê duyệt và quản lý gian hàng, Seller quản lý sản phẩm, Admin xử lý sản phẩm vi phạm và cung cấp API công khai cho Shop/Product.

## 1.2. Sprint Scope

Sprint 02 tập trung vào hai module chính.

### Shop Management

- Seller đăng ký Shop.
- Admin duyệt/từ chối Shop.
- Admin khóa/mở khóa Shop.
- Seller cập nhật thông tin Shop.
- Kiểm soát quyền truy cập dựa trên trạng thái Shop.
- Public API cho Shop.

### Product Management

- Seller tạo Product.
- Seller cập nhật Product.
- Seller xóa/ẩn Product.
- Admin gỡ Product vi phạm.
- Public API cho Product.
- Các nghiệp vụ liên quan đến quyền Seller/Admin.

---

# 2. Sprint Result Summary

| Metric                                        |                    Result |
| --------------------------------------------- | ------------------------: |
| Jira Issue thuộc Sprint                       |                 **28/28** |
| Jira Issue hoàn thành                         |        **27/28 (96,43%)** |
| Story Point hoàn thành                        |                 **45 SP** |
| Test Case được thiết kế                       |                   **128** |
| Test Case thuộc Execution Scope               |                    **84** |
| Test Case đã thực thi                         |                    **84** |
| Test Case PASS                                |                    **84** |
| Test Case FAIL                                |                     **0** |
| Test Case chưa thực thi ngoài Execution Scope |                    **44** |
| Execution Completion Rate                     |          **100% (84/84)** |
| Design-to-Execution Coverage                  |       **65,63% (84/128)** |
| Pass Rate trên test đã thực thi               |          **100% (84/84)** |
| Requirement có Test Case                      |        **10/12 (~83,3%)** |
| Code Coverage toàn dự án                      |                **~30,5%** |
| Static Analysis                               | **SonarQube – Completed** |

### Overall Assessment

**Sprint Status: MOSTLY ACHIEVED**

Sprint 02 đã hoàn thành phần lớn các chức năng chính trong phạm vi Shop và Product.

Tổng cộng **128 test case được thiết kế**. Trong đó, **84 test case được đưa vào Execution Scope của Sprint 02** và toàn bộ 84 test case đã được thực thi với kết quả **84/84 PASS**.

Do đó:

- Execution Completion Rate trong Execution Scope: **100%**.
- Pass Rate trên test case đã thực thi: **100%**.
- Design-to-Execution Coverage: **65,63%**.

Có **44 test case được thiết kế nhưng không thuộc Execution Scope của Sprint 02**. Các test case này không được tính là test execution chưa hoàn thành của Sprint mà được xem là test case nằm ngoài phạm vi execution hiện tại.

Ngoài ra, **8 E2E test case của Shop đã được thiết kế nhưng chưa thực thi** và Product chưa có E2E test case. Vì vậy, execution evidence ở tầng HTTP/API chưa đầy đủ.

Sprint được đánh giá **Mostly Achieved** thay vì Fully Achieved.

---

# 3. Sprint Goal Achievement

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

### Assessment

**9/10 Sprint Success Criteria được xác nhận đầy đủ; 1/10 được đánh giá Partial.**

FR-18 được đánh giá Partial vì functionality đã được triển khai và được kiểm thử ở tầng Unit, nhưng chưa có đầy đủ E2E/API execution evidence để xác nhận behavior thực tế qua HTTP/API.

---

# 4. Requirement Traceability Matrix

| Requirement                | Jira               | Test Case           | Test Type | Coverage    | Execution         |
| -------------------------- | ------------------ | ------------------- | --------- | ----------- | ----------------- |
| FR-06 – Đăng ký Shop       | SCRUM-13           | SHOP-001 → SHOP-009 | Unit      | Covered     | Executed          |
| FR-07 – Duyệt/từ chối Shop | SCRUM-15           | SHOP-010 → SHOP-016 | Unit      | Covered     | Executed          |
| FR-08 – Cập nhật Shop      | SCRUM-19           | SHOP-023 → SHOP-029 | Unit      | Covered     | Executed          |
| FR-09 – Khóa/mở khóa Shop  | SCRUM-17           | SHOP-017 → SHOP-022 | Unit      | Covered     | Executed          |
| BR-01/BR-08 – Guard        | SCRUM-21           | SHOP-030 → SHOP-035 | Unit      | Covered     | Executed          |
| FR-11 – Thêm Product       | SCRUM-16, SCRUM-20 | PROD-001 → PROD-004 | Unit      | Covered     | Executed          |
| FR-13 – Sửa/xóa/ẩn Product | SCRUM-18, SCRUM-22 | PROD-005 → PROD-046 | Unit      | Covered     | Executed          |
| FR-14 – Admin gỡ Product   | SCRUM-14           | PROD-021 → PROD-030 | Unit      | Covered     | Executed          |
| FR-17 – Product Detail API | SCRUM-25           | PROD-019 → PROD-020 | Unit      | Covered     | Executed          |
| FR-18 – Shop Public API    | SCRUM-26           | PROD-013 → PROD-015 | Unit/E2E  | Partial     | E2E chưa thực thi |
| FR-10 – System Category    | —                  | —                   | —         | Not Covered | —                 |
| FR-12 – SKU/Variant        | —                  | —                   | —         | Not Covered | —                 |

### Requirement Coverage

**10/12 = ~83,3%**

Các requirement chưa thực hiện:

- **FR-10 – System Category**
- **FR-12 – SKU/Variant**

Hai requirement được chuyển sang Sprint 03.

---

# 5. Test Strategy

## 5.1. Test Levels

Sprint 02 áp dụng các cấp độ kiểm thử sau:

| Test Level      | Mục đích                               | Shop    | Product        |
| --------------- | -------------------------------------- | ------- | -------------- |
| Unit Test       | Kiểm tra logic Service/Business Logic  | Có      | Có             |
| E2E/API Test    | Kiểm tra behavior thực tế qua HTTP/API | Partial | Chưa thực hiện |
| Static Analysis | Kiểm tra chất lượng source code        | Có      | Có             |

### Testing Approach

Testing được thực hiện theo hướng:

> **Requirement-based + Risk-based + Negative Testing**

Các chức năng liên quan đến Authorization, trạng thái Shop và quyền Seller/Admin được ưu tiên do có rủi ro cao đối với Security và Business Rule.

---

# 6. Test Design Techniques

## 6.1. Equivalence Partitioning

Được áp dụng để chia input thành các nhóm có behavior tương đương.

Ví dụ với thông tin Shop:

| Partition           | Ví dụ                | Expected |
| ------------------- | -------------------- | -------- |
| Valid               | Tên Shop hợp lệ      | Accept   |
| Invalid – Empty     | Tên Shop rỗng        | Reject   |
| Invalid – Format    | Dữ liệu không hợp lệ | Reject   |
| Invalid – Duplicate | Giá trị đã tồn tại   | Reject   |

## 6.2. Boundary Value Analysis

Được áp dụng với các field có giới hạn về độ dài hoặc giá trị.

Ví dụ nếu một field cho phép **1–100 characters**:

| Boundary      | Input |
| ------------- | ----: |
| Below minimum |     0 |
| Minimum       |     1 |
| Valid middle  |    50 |
| Maximum       |   100 |
| Above maximum |   101 |

## 6.3. Negative Testing

Các tình huống negative được kiểm thử bao gồm:

- Seller chưa được approve tạo Product.
- User không có quyền Admin gọi API Admin.
- Seller truy cập Shop của Seller khác.
- Product không tồn tại.
- Shop không tồn tại.
- Request thiếu required field.
- Request chứa dữ liệu không hợp lệ.
- Token không hợp lệ.
- Token hết hạn.

## 6.4. Decision Table

Decision Table được áp dụng cho các nghiệp vụ phụ thuộc nhiều điều kiện.

Ví dụ đối với Seller tạo Product:

| User   | Shop Status | Permission | Expected           |
| ------ | ----------- | ---------- | ------------------ |
| Seller | Active      | Valid      | Allow              |
| Seller | Pending     | Valid      | Reject             |
| Seller | Rejected    | Valid      | Reject             |
| Seller | Suspended   | Valid      | Reject             |
| User   | Active      | Invalid    | Reject             |
| Admin  | N/A         | Admin      | Theo business rule |

---

# 7. Test Case Design

## 7.1. Test Case Classification

| Priority          | Ý nghĩa                                                       | Ví dụ                             |
| ----------------- | ------------------------------------------------------------- | --------------------------------- |
| **P0 – Critical** | Chức năng ảnh hưởng trực tiếp đến Security/Business Integrity | Authorization, Admin actions      |
| **P1 – High**     | Chức năng nghiệp vụ chính                                     | Create/Update/Delete Shop/Product |
| **P2 – Medium**   | Validation và edge cases                                      | Invalid input, boundary           |
| **P3 – Low**      | Trường hợp ít ảnh hưởng                                       | Low-risk behavior                 |

---

# 8. Test Case Summary by Priority

> Số liệu `Designed`, `In Execution Scope`, `Executed` theo Priority được nhóm lấy trực tiếp từ **Master Test Case List** và **Test Execution Results** của Sprint 02.

| Priority  | Designed | In Execution Scope | Executed |   PASS |  FAIL | Not Executed |
| --------- | -------: | -----------------: | -------: | -----: | ----: | -----------: |
| P0        |       82 |                 44 |       44 |     44 |     0 |            0 |
| P1        |       28 |                 24 |       24 |     24 |     0 |            0 |
| P2        |       10 |                  6 |        6 |      6 |     0 |            0 |
| P3        |        8 |                 10 |       10 |     10 |     0 |            0 |
| **Total** |  **128** |             **84** |   **84** | **84** | **0** |       **0*** |

> **\*** `Not Executed = 0` chỉ áp dụng cho **84 test case thuộc Execution Scope**.

### 8.1. Interpretation

Sprint 02 có tổng cộng **128 test case được thiết kế** trong Full Test Case List.

Trong đó, nhóm lựa chọn **84 test case** làm Execution Scope dựa trên mức độ ưu tiên, business risk và phạm vi chức năng của Sprint.

Toàn bộ **84/84 test case thuộc Execution Scope đã được thực thi**, không có test case bị bỏ lại.

Kết quả:

- **Executed:** 84/84
- **PASS:** 84
- **FAIL:** 0
- **Not Executed:** 0
- **Execution Rate:** 100%
- **Pass Rate:** 100%

Có **44 test case được thiết kế nhưng không nằm trong Execution Scope** của Sprint 02.

> `128 - 84 = 44`

Các test case ngoài Execution Scope vẫn được giữ trong **Full Test Case List** để phục vụ regression testing, mở rộng coverage hoặc đưa vào execution scope ở các Sprint tiếp theo.

### 8.2. Priority Selection

P0 và P1 được ưu tiên đưa vào Execution Scope do liên quan trực tiếp đến:

- Authentication và Authorization.
- Business-critical functionality.
- Seller và Admin operations.
- Shop/Product lifecycle.
- Business rules.
- Negative testing và security-related scenarios.

P2 và P3 được lựa chọn bổ sung dựa trên risk, khả năng thực thi trong Sprint và mức độ ảnh hưởng đến chức năng.

### 8.3. Source of Test Case Metrics

| Metric             | Source                                |
| ------------------ | ------------------------------------- |
| Designed           | Full Test Case List                   |
| In Execution Scope | Production / Execution Test Case List |
| Executed           | Test Execution Results                |
| PASS               | Test Execution Results                |
| FAIL               | Test Execution Results                |
| Not Executed       | Test Execution Results                |

---

# 9. Sample Test Case — Shop

## SHOP-001 — Seller đăng ký Shop thành công

| Field           | Detail                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| Test Case ID    | SHOP-001                                                                  |
| Requirement     | FR-06                                                                     |
| Jira            | SCRUM-13                                                                  |
| Priority        | P1                                                                        |
| Test Type       | Positive / Functional                                                     |
| Test Level      | Unit                                                                      |
| Preconditions   | User có role Seller và chưa có Shop                                       |
| Test Data       | Shop name hợp lệ, description hợp lệ                                      |
| Steps           | 1. Gửi request tạo Shop → 2. Cung cấp dữ liệu hợp lệ → 3. Execute request |
| Expected Result | Shop được tạo thành công và trạng thái ban đầu là Pending                 |
| Actual Result   | Unit Test thực thi thành công                                             |
| Status          | PASS                                                                      |

## SHOP-030 — Seller chưa được duyệt không được thực hiện thao tác yêu cầu Active Shop

| Field           | Detail                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| Test Case ID    | SHOP-030                                                                    |
| Requirement     | BR-01, BR-08                                                                |
| Jira            | SCRUM-21                                                                    |
| Priority        | P0                                                                          |
| Test Type       | Negative / Authorization                                                    |
| Test Level      | Unit                                                                        |
| Preconditions   | Seller tồn tại nhưng Shop chưa được Admin approve                           |
| Test Data       | Valid Seller + Pending Shop                                                 |
| Steps           | 1. Seller đăng nhập → 2. Gọi API yêu cầu Active Shop → 3. Kiểm tra response |
| Expected Result | Request bị từ chối theo business rule                                       |
| Actual Result   | Unit Test thực thi thành công                                               |
| Status          | PASS                                                                        |

---

# 10. Sample Test Case — Product

## PROD-001 — Seller tạo Product thành công

| Field           | Detail                                                                        |
| --------------- | ----------------------------------------------------------------------------- |
| Test Case ID    | PROD-001                                                                      |
| Requirement     | FR-11                                                                         |
| Jira            | SCRUM-16 / SCRUM-20                                                           |
| Priority        | P1                                                                            |
| Test Type       | Positive / Functional                                                         |
| Test Level      | Unit                                                                          |
| Preconditions   | Seller có Shop Active                                                         |
| Test Data       | Product data hợp lệ                                                           |
| Steps           | 1. Seller đăng nhập → 2. Gửi request tạo Product → 3. Cung cấp dữ liệu hợp lệ |
| Expected Result | Product được tạo thành công                                                   |
| Actual Result   | Unit Test thực thi thành công                                                 |
| Status          | PASS                                                                          |

## PROD-[ID] — Seller không có quyền tạo Product

| Field           | Detail                                          |
| --------------- | ----------------------------------------------- |
| Test Case ID    | PROD-[ID thực tế]                               |
| Requirement     | FR-11 / BR                                      |
| Priority        | P0                                              |
| Test Type       | Negative / Authorization                        |
| Test Level      | Unit                                            |
| Preconditions   | User không đáp ứng điều kiện Seller/Shop Active |
| Test Data       | Valid Product data                              |
| Steps           | Gọi API tạo Product                             |
| Expected Result | Request bị từ chối                              |
| Actual Result   | Unit Test thực thi thành công                   |
| Status          | PASS                                            |

---

# 11. Test Execution Summary

## 11.1. Overall

| Metric                             |     Result |
| ---------------------------------- | ---------: |
| Test Cases Designed                |    **128** |
| Test Cases thuộc Execution Scope   |     **84** |
| Test Cases Executed                |     **84** |
| PASS                               |     **84** |
| FAIL                               |      **0** |
| BLOCKED                            |      **0** |
| NOT EXECUTED trong Execution Scope |      **0** |
| Execution Completion Rate          |   **100%** |
| Pass Rate                          |   **100%** |
| Design-to-Execution Coverage       | **65,63%** |

### Calculation

**Execution Completion Rate**

> 84 / 84 × 100 = **100%**

**Pass Rate**

> 84 / 84 × 100 = **100%**

**Design-to-Execution Coverage**

> 84 / 128 × 100 = **65,63%**

> Design-to-Execution Coverage chỉ phản ánh tỷ lệ test case được đưa vào và thực thi trong Sprint; 44 test case còn lại nằm ngoài Execution Scope.

---

# 12. Test Execution by Test Level

| Test Level | Module  | Designed | In Execution Scope | Executed |   PASS |  FAIL | Not Executed |
| ---------- | ------- | -------: | -----------------: | -------: | -----: | ----: | -----------: |
| Unit       | Shop    |       43 |                 43 |       43 |     43 |     0 |            0 |
| Unit       | Product |       77 |                 41 |       41 |     41 |     0 |            0 |
| E2E        | Shop    |        8 |                  0 |        0 |      0 |     0 |            0 |
| E2E        | Product |        0 |                  0 |        0 |      0 |     0 |            0 |
| **Total**  |         |  **128** |             **84** |   **84** | **84** | **0** |        **0** |

### Execution Scope Interpretation

```text
128 Test Cases Designed
│
├── 84 Test Cases → Execution Scope
│   ├── 84 Executed
│   ├── 84 PASS
│   └── 0 Not Executed
│
└── 44 Test Cases → Outside Execution Scope
    └── Không thực thi trong Sprint 02
```

Trong 44 test case nằm ngoài Execution Scope, **8 test case là E2E Shop** đã được thiết kế nhưng chưa thực thi. Các test case còn lại nằm ngoài phạm vi execution được xác định cho Sprint 02.

---

# 13. Test Environment

## 13.1. Application Environment

| Component       | Configuration    |
| --------------- | ---------------- |
| Backend         | NestJS / Node.js |
| Language        | TypeScript       |
| Database        | PostgreSQL       |
| ORM             | TypeORM          |
| Authentication  | JWT              |
| Test Framework  | Jest             |
| E2E/API Tool    | Postman          |
| Static Analysis | SonarQube        |
| Runtime         | Docker           |

## 13.2. Test Environment

Testing được thực hiện trên:

> **Docker Development Environment**

Database:

> **PostgreSQL**

Test data được tạo thông qua:

- Seed data.
- Test fixtures.
- Mock data.
- Database records phục vụ từng test case.

---

# 14. Test Data

Các nhóm test data chính:

| Data Category     | Example                      |
| ----------------- | ---------------------------- |
| Valid Seller      | Seller có account hợp lệ     |
| Pending Shop      | Shop chưa được Admin approve |
| Active Shop       | Shop đã được approve         |
| Rejected Shop     | Shop bị Admin reject         |
| Suspended Shop    | Shop bị khóa                 |
| Valid Product     | Product có dữ liệu hợp lệ    |
| Invalid Product   | Product thiếu hoặc sai field |
| Non-existing ID   | ID không tồn tại             |
| Unauthorized User | User không có permission     |
| Invalid Token     | JWT không hợp lệ             |
| Expired Token     | JWT hết hạn                  |

---

# 15. Defect / Bug Log

## 15.1. Defect Summary

| Metric        | Result |
| ------------- | -----: |
| Defects Found |  **0** |
| Critical      |  **0** |
| High          |  **0** |
| Medium        |  **0** |
| Low           |  **0** |
| Fixed         |  **0** |
| Retested      |  **0** |
| Open          |  **0** |

### Defect Assessment

Trong phạm vi **84 test case thuộc Execution Scope và đã được thực thi**, nhóm không ghi nhận defect.

Tất cả **84/84 test case đều PASS**.

Do không phát hiện defect trong Execution Scope nên không phát sinh hoạt động Fix hoặc Retest defect trong Sprint 02.

## 15.2. Defect Lifecycle

Quy trình xử lý defect được định nghĩa:

> **Detected → Logged → Fixed → Retested → Closed**

Trong Sprint 02, quy trình trên không phát sinh execution do không có defect được ghi nhận.

---

# 16. Regression Testing

Regression testing trong Sprint 02 được thực hiện chủ yếu ở phạm vi Unit Test đối với các chức năng bị ảnh hưởng bởi thay đổi code.

| Regression Area       | Unit Regression | E2E/API Regression |
| --------------------- | --------------- | ------------------ |
| Shop Registration     | PASS            | Not Executed       |
| Shop Approval         | PASS            | Not Executed       |
| Shop Status           | PASS            | Not Executed       |
| Shop Authorization    | PASS            | Not Executed       |
| Product Creation      | PASS            | Not Executed       |
| Product Update        | PASS            | Not Executed       |
| Product Delete/Hide   | PASS            | Not Executed       |
| Admin Product Removal | PASS            | Not Executed       |

> E2E/API regression chưa hoàn thành do execution evidence ở tầng HTTP/API chưa đầy đủ.

---

# 17. Static Analysis & Code Quality

| Metric                | Result         | Assessment        |
| --------------------- | -------------- | ----------------- |
| SonarQube Analysis    | Completed      | Completed         |
| Unit Test Pass Rate   | **100%**       | Passed            |
| Overall Code Coverage | **~30,5%**     | Needs Improvement |
| Test Case Execution   | **84/84 PASS** | Passed            |

Coverage toàn dự án khoảng **30,5%**, chủ yếu do các module ngoài phạm vi Sprint 02 chưa được kiểm thử đầy đủ.

Coverage cần tiếp tục được cải thiện trong các Sprint tiếp theo.

---

# 18. Definition of Done

| Definition of Done                 | Status    |
| ---------------------------------- | --------- |
| Requirement được xác định từ SRS   | Completed |
| Jira Issue được tạo                | Completed |
| Implementation hoàn thành          | Completed |
| Code được tích hợp                 | Completed |
| Unit Test được thiết kế            | Completed |
| Unit Test được thực thi            | Completed |
| Unit Test PASS                     | Completed |
| Test Case được document            | Completed |
| Test Design Technique được áp dụng | Completed |
| Static Analysis                    | Completed |
| Requirement Traceability           | Completed |
| E2E Test Case được thiết kế        | Partial   |
| E2E Test Case được thực thi        | Partial   |
| Test Execution Evidence đầy đủ     | Partial   |
| Defect được log và retest          | N/A       |
| Sprint Documentation               | Completed |

> **N/A — No defect was identified during the Sprint 02 test execution scope.**

### DoD Assessment

DoD của Sprint 02 **chưa hoàn toàn đạt** do execution evidence ở tầng E2E/API chưa đầy đủ.

---

# 19. Risk & Limitation

| Risk / Limitation                  | Severity | Impact                                | Mitigation              |
| ---------------------------------- | -------- | ------------------------------------- | ----------------------- |
| Product chưa có E2E test           | High     | Không xác nhận được HTTP/API behavior | Bổ sung Sprint 03       |
| 8 Shop E2E chưa chạy               | High     | Thiếu execution evidence              | Execute + record result |
| FR-10 chưa triển khai              | Medium   | Requirement chưa covered              | Sprint 03               |
| FR-12 chưa triển khai              | Medium   | Requirement chưa covered              | Sprint 03               |
| Coverage ~30,5%                    | Medium   | Coverage tổng thể thấp                | Tăng coverage           |
| Test data chưa chuẩn hóa hoàn toàn | Medium   | Có thể ảnh hưởng reproducibility      | Chuẩn hóa fixture/seed  |

---

# 20. Carry-over to Sprint 03

## Functional

- FR-10 — System Category.
- FR-12 — SKU/Variant.

## Testing

- Execute 8 Shop E2E test cases.
- Design Product E2E test cases.
- Execute Product E2E test cases.
- Bổ sung API-level execution evidence.
- Tiếp tục regression testing.

## Quality

- Tăng code coverage.
- Chuẩn hóa test data.
- Duy trì defect tracking.
- Bổ sung automated API/E2E testing.

---

# 21. Sprint Testing Conclusion

Sprint 02 đã hoàn thành phần lớn mục tiêu kiểm thử đối với các chức năng Shop và Product.

Tổng cộng **128 test case được thiết kế**. Trong số đó, **84 test case thuộc Execution Scope của Sprint 02 và đã được thực thi**, với kết quả:

> **84/84 PASS**

Tương ứng:

- **Execution Completion Rate:** 100%.
- **Pass Rate:** 100%.
- **Design-to-Execution Coverage:** 65,63%.

Requirement Traceability đã được thiết lập theo chuỗi:

> **SRS → Jira → Requirement → Test Case → Test Execution**

giúp xác định mối liên hệ giữa yêu cầu nghiệp vụ, implementation và hoạt động kiểm thử.

Nhóm áp dụng các kỹ thuật thiết kế test gồm:

- Equivalence Partitioning.
- Boundary Value Analysis.
- Negative Testing.
- Decision Table.
- Risk-based Test Prioritization.

### Test Execution Assessment

Unit Test cho các chức năng nằm trong Execution Scope đạt kết quả **84/84 PASS**.

Tuy nhiên, execution ở tầng HTTP/API chưa hoàn chỉnh:

- **8 Shop E2E test case đã được thiết kế nhưng chưa thực thi.**
- **Product chưa có E2E test case.**

Do đó, chưa có đầy đủ evidence để xác nhận toàn bộ behavior của hệ thống ở tầng HTTP/API.

### Requirement Assessment

Có **10/12 requirement có Test Case**, tương đương khoảng **83,3% requirement coverage**.

Hai requirement chưa nằm trong Sprint 02:

- **FR-10 — System Category**
- **FR-12 — SKU/Variant**

được chuyển sang Sprint 03.

## Final Assessment

> **SPRINT 02 — MOSTLY ACHIEVED**

### Đạt

- **27/28 Jira Issue hoàn thành.**
- **45 Story Point hoàn thành.**
- **84/84 test case trong Execution Scope PASS.**
- **100% Execution Completion Rate trong Execution Scope.**
- **100% Pass Rate trên test đã thực thi.**
- Requirement Traceability được thiết lập.
- Test Design Techniques được áp dụng.
- Static Analysis được thực hiện.
- Không phát hiện defect trong Execution Scope.

### Chưa đạt hoàn toàn

- **8 Shop E2E test case chưa execute.**
- **Product chưa có E2E test.**
- Requirement coverage đạt **10/12 (~83,3%)**.
- Code coverage toàn dự án còn khoảng **30,5%**.
- HTTP/API execution evidence chưa đầy đủ.

## Recommended Actions

1. Hoàn thành execution cho 8 Shop E2E test case.
2. Thiết kế và execute E2E test cho Product.
3. Bổ sung API-level execution evidence.
4. Chuẩn hóa Test Data và Test Environment.
5. Tiếp tục tăng code coverage.
6. Duy trì defect tracking và retest evidence khi phát sinh defect.
7. Thực hiện regression testing sau các thay đổi lớn.
8. Triển khai **FR-10** và **FR-12** trong Sprint 03.
