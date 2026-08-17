# SPRINT 01 TEST REPORT

**Module:** Backend Foundation – Authentication & User Management  
**Dự án:** Mini E-commerce System  
**Thời gian:** 25/07/2026 – 03/08/2026  
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

## 1. Sprint Overview

**Sprint Goal:** Hoàn thành nền tảng backend cốt lõi bao gồm Project Setup, Authentication, User Management, Category Management, File Upload và Redis Cache, làm nền tảng cho các module nghiệp vụ ở các Sprint tiếp theo.

**Phạm vi chính:** Authentication, User Management, Category Management, Upload Service, Redis Cache và Unit Test cho các module Authentication/User.

---

## 2. Kết quả tổng quan

| Metric                  |      Kết quả |
| ----------------------- | -----------: |
| Jira Issue thuộc Sprint |        11/12 |
| Test Case được thiết kế |          115 |
| Design Unit Test        |           77 |
| Design E2E Test         |           38 |
| Production Unit Test    |           63 |
| Production E2E Test     |           27 |
| Unit Test đã thực thi   |           77 |
| Unit Test PASS          | 77/77 (100%) |
| Unit Test FAIL          |            0 |
| E2E Test đã thực thi    |            0 |
| E2E Test Deferred       |           38 |
| P0 – Critical           |           17 |
| P1 – High               |           47 |
| P2 – Medium             |           43 |
| P3 – Low                |            8 |
| Total Priority          |          115 |
| Defect phát sinh        |            0 |
| Code Coverage           |          N/A |

**Sprint Status: MOSTLY ACHIEVED**

Sprint 01 hoàn thành **11/12 Jira Issue**. Toàn bộ Unit Test đã thực thi đều PASS, đạt **77/77 (100%)**.

Có tổng cộng **115 test case được thiết kế**, gồm 77 Unit Test và 38 E2E Test. E2E Test chưa được thực thi trong Sprint 01 và được chuyển thẳng đến **Sprint 07 – Final E2E Regression & Project Test Summary**.

Các backlog chưa hoàn thành cũng được chuyển đến Sprint 07 để xử lý tập trung.

---

## 3. Sprint Goal Achievement

|   # | Sprint Success Criteria  | Requirement         | Status                |
| --: | ------------------------ | ------------------- | --------------------- |
|   1 | Project Bootstrap        | Infrastructure      | Achieved              |
|   2 | Authentication           | Authentication      | Achieved              |
|   3 | JWT Strategy & Guards    | Authentication      | Achieved              |
|   4 | User Management          | User Management     | Achieved              |
|   5 | Category Management      | Category Management | Achieved              |
|   6 | Upload Service           | Storage             | Achieved              |
|   7 | Redis Cache              | Infrastructure      | Achieved              |
|   8 | Authentication Unit Test | Testing             | Achieved              |
|   9 | User Unit Test           | Testing             | Achieved              |
|  10 | Manual API Testing       | Testing             | Achieved              |
|  11 | Forgot Password          | Authentication      | Deferred to Sprint 07 |

**10/11 Sprint Success Criteria được hoàn thành trong Sprint 01.**

Các chức năng Authentication, User Management, Category Management, Upload Service và Redis Cache đã được triển khai.

Toàn bộ Unit Test được thực thi đều PASS.

Hạng mục **Forgot Password** chưa hoàn thành và được chuyển đến **Sprint 07**.

---

## 4. Requirement Traceability Matrix

| Requirement                       | Jira   | Test Type  | Execution                             |
| --------------------------------- | ------ | ---------- | ------------------------------------- |
| Authentication – Register / Login | BE-005 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| JWT Strategy                      | BE-003 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| Refresh Token Rotation            | BE-005 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| Logout                            | BE-005 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| User Profile                      | BE-009 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| User CRUD                         | BE-009 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| User Validation & Authorization   | BE-009 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| Category CRUD                     | BE-008 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| Public Category Cache             | BE-010 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| Upload Service                    | BE-004 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |
| Redis + Storage                   | BE-002 | Unit / E2E | Unit: Executed / PASS – E2E: Deferred |

---

## 5. Test Case Summary

| Test Level | Designed | Production Scope | Executed |   PASS |  FAIL |
| ---------- | -------: | ---------------: | -------: | -----: | ----: |
| Unit Test  |       77 |               63 |       77 |     77 |     0 |
| E2E Test   |       38 |               27 |        0 |      0 |     0 |
| **Total**  |  **115** |           **90** |   **77** | **77** | **0** |

### Execution Metrics

**Unit Test Execution Rate:**

> 77 / 77 = **100%**

**Unit Test Pass Rate:**

> 77 / 77 = **100%**

**Overall Test Execution Rate:**

> 77 / 115 = **66.96%**

**E2E Execution Rate:**

> 0 / 38 = **0%**

> **E2E Status:** 38 E2E Test Case đã được thiết kế nhưng chưa thực thi. Toàn bộ E2E Test được deferred đến **Sprint 07 – Final E2E Regression & Project Test Summary**.

---

## 6. Test Priority

Các test case được phân loại theo **Risk-Based Testing**, dựa trên mức độ ảnh hưởng đến nghiệp vụ, security và tính ổn định của hệ thống.

| Priority          | Mức độ   | Số lượng |    Tỷ lệ |
| ----------------- | -------- | -------: | -------: |
| **P0 – Critical** | Critical |       17 |    14.8% |
| **P1 – High**     | High     |       47 |    40.9% |
| **P2 – Medium**   | Medium   |       43 |    37.4% |
| **P3 – Low**      | Low      |        8 |     7.0% |
| **Total**         |          |  **115** | **100%** |

### Priority Strategy

Thứ tự ưu tiên kiểm thử:

**P0 → P1 → P2 → P3**

- **P0:** Chức năng Critical, security hoặc lỗi có thể ảnh hưởng nghiêm trọng đến hệ thống.
- **P1:** Core business functionality và validation quan trọng.
- **P2:** Edge case và supporting functionality.
- **P3:** Các trường hợp có mức độ ảnh hưởng thấp.

---

## 7. Defect Log

Sprint 01 không ghi nhận defect trong quá trình kiểm thử.

| Bug ID | Mô tả                  | Phát hiện qua | Trạng thái |
| ------ | ---------------------- | ------------- | ---------- |
| —      | Không phát sinh defect | —             | —          |

**Tổng cộng: 0 defect.**

Các hạng mục Forgot Password, OTP Email, Reset Password và Integration Test là **backlog/task chưa hoàn thành**, không được tính là defect.

---

## 8. Risk & Limitation

| Risk / Limitation                          | Severity   | Impact                                           |
| ------------------------------------------ | ---------- | ------------------------------------------------ |
| 38 E2E Test Case chưa được thực thi        | **High**   | Chưa có execution evidence ở tầng HTTP/API       |
| Integration Test chưa hoàn thành           | **High**   | Chưa xác nhận đầy đủ interaction giữa các module |
| Forgot Password chưa hoàn thành            | **Medium** | Authentication flow chưa đầy đủ                  |
| OTP Email / Reset Password chưa hoàn thành | **Medium** | Password recovery flow chưa hoàn thiện           |
| E2E Test chưa được automated execution     | **High**   | Chưa có automated regression ở tầng API          |

### Deferred đến Sprint 07

Các hạng mục sau được **chuyển thẳng đến Sprint 07 – Final E2E Regression & Project Test Summary**:

- 38 E2E Test Case của Authentication và User Management.
- Forgot Password.
- OTP Email.
- Reset Password.
- Integration Test.
- Các backlog testing còn tồn đọng từ Sprint 01.

> Không carry-over các E2E Test qua từng Sprint. Các test được thiết kế ở Sprint 01 sẽ được tập hợp và execution tập trung tại Sprint 07.

---

## 9. Test Quality Metrics

| Metric                 |      Value |
| ---------------------- | ---------: |
| Total Test Design      |        115 |
| Unit Test Design       |         77 |
| E2E Test Design        |         38 |
| Production Unit Test   |         63 |
| Production E2E Test    |         27 |
| Total Production Scope |         90 |
| Unit Test Executed     |         77 |
| Unit Test PASS         |         77 |
| Unit Test FAIL         |          0 |
| Unit Test Pass Rate    |   **100%** |
| Overall Test Execution | **66.96%** |
| E2E Executed           |          0 |
| E2E Deferred           |         38 |
| P0 – Critical          |         17 |
| P1 – High              |         47 |
| P2 – Medium            |         43 |
| P3 – Low               |          8 |
| Defect                 |          0 |
| Code Coverage          |        N/A |

---

## 10. Kết luận

Sprint 01 hoàn thành **11/12 Jira Issue**, xây dựng được nền tảng Backend cốt lõi gồm Authentication, User Management, Category Management, Upload Service và Redis Cache.

Về kiểm thử, Sprint 01 đã thiết kế tổng cộng **115 test case**, gồm **77 Unit Test và 38 E2E Test**.

Toàn bộ **77 Unit Test đã được thực thi và PASS 100%**, không có Unit Test FAIL.

Test case được phân loại theo mức độ ưu tiên:

- **P0 – Critical:** 17
- **P1 – High:** 47
- **P2 – Medium:** 43
- **P3 – Low:** 8

Sprint không phát sinh defect.

Tuy nhiên, **38 E2E Test Case chưa được thực thi**. Toàn bộ E2E Test cùng các backlog chưa hoàn thành gồm **Forgot Password, OTP Email, Reset Password và Integration Test** được **deferred đến Sprint 07 – Final E2E Regression & Project Test Summary**.

Việc tập trung E2E execution tại Sprint 07 giúp tránh việc cùng một E2E Test phải carry-over và báo cáo lặp lại qua nhiều Sprint.

**Sprint Status: MOSTLY ACHIEVED**
