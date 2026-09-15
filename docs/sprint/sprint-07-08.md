# SPRINT 07-08 TEST REPORT

**Module:** Shop & Product Management
**Dự án:** Mini E-commerce System
**Loại Sprint:** Test Design & Execution
**Thời gian:** 29/08/2026 – 13/09/2026
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

## 1. Sprint Overview

**Sprint Goal:** Thiết kế test case áp dụng kỹ thuật **Equivalence Partitioning (EP)**, **Boundary Value Analysis (BVA)** và **Combined EP + BVA** cho tầng **DTO, Service, Controller**  của hệ thống; thực thi **Unit Test** và **E2E Test** (bao gồm phần E2E deferred từ Sprint trước) và tiến hành phân loại dạng test case, thiết kế lại ma trận test case theo giảng viên yêu cầu. Cuối cùng dùng postman test hành vi của api.

**Phạm vi chính:**

- Thiết kế test EP cho DTO
- Thiết kế test BVA cho các field có ràng buộc (độ dài, giá trị số, số lượng...).
- Thiết kế test Combined EP + BVA
- Thiết kế E2E test case lại toàn bộ
- Thực kế API test (Postman test) để kiểm tra hành vi của API
- Viết và thực thi Unit Test cho DTO
- Viết và thực thi Unit Test cho Service
- Viết và thực thi Unit Test cho Controller
- Thực thi E2E Test từ sprint trước

---

## 2. Kết quả tổng quan

| Metric                    | Kết quả |
| ------------------------- | ------: |
| Jira Issue thuộc Sprint   |      23 |
| Jira Issue hoàn thành     |      23 |
| Story Point hoàn thành    |       0 |
| Test Case được thiết kế   |     N/A |
| Test Case EP              |     547 |
| Test Case BVA             |     508 |
| Test Case Combined EP+BVA |     788 |
| Postman Test Case         |     547 |
| Unit Test                 |     247 |
| E2E Test                  |      20 |
| Unit Test (Executed)      |     247 |
| E2E Test (Executed)       |      20 |
| Test Case PASS            |     247 |
| Test Case FAIL            |      18 |
| Defect phát sinh          |       2 |
| Defect đã Fixed           |       0 |
| Code Coverage             |     N/A |

### 2.1 Phân loại theo kỹ thuật thiết kế test

Xem chi tiết trong [SUMMARY MATRIX TEST CASE](https://docs.google.com/spreadsheets/d/10ftW99N-aqs1ksUZKP3nHfNYmi_Rq_JgOnnPQ4IGzXA/edit?gid=72087714#gid=72087714)

### 2.2 Phân loại theo tầng (Layer) và loại test

Xem chi tiết trong [SUMMARY MATRIX TEST CASE](https://docs.google.com/spreadsheets/d/10ftW99N-aqs1ksUZKP3nHfNYmi_Rq_JgOnnPQ4IGzXA/edit?gid=72087714#gid=72087714)

### 2.3 Priority Distribution

Xem chi tiết trong [SUMMARY MATRIX TEST CASE](https://docs.google.com/spreadsheets/d/10ftW99N-aqs1ksUZKP3nHfNYmi_Rq_JgOnnPQ4IGzXA/edit?gid=72087714#gid=72087714)

### 2.4 Test Status

Xem chi tiết trong [SUMMARY MATRIX TEST CASE](https://docs.google.com/spreadsheets/d/10ftW99N-aqs1ksUZKP3nHfNYmi_Rq_JgOnnPQ4IGzXA/edit?gid=72087714#gid=72087714)

**Sprint Status:** ☐ Achieved ☐ Mostly Achieved ☐ Partial ☐ Not Achieved

---

## 3. Test Design Technique Matrix

| DTO / Field / Logic | Kỹ thuật        | Test Case ID | Layer      | Ghi chú                      |
| ------------------- | --------------- | ------------ | ---------- | ---------------------------- |
|                     | EP              |              | DTO        | phân vùng tương đương        |
|                     | BVA             |              | DTO        | biên và thiết kế theo 6n + 1 |
|                     | Combined EP+BVA |              | DTO        | kết hợp partition + boundary |
|                     | -               |              | Controller | Test hành vi trạng thái      |
|                     | -               |              | Service    | Test luồng logic, business   |

---

## 4. Test Case Summary

Xem chi tiết tại [SUMMARY MATRIX TEST CASE](https://docs.google.com/spreadsheets/d/10ftW99N-aqs1ksUZKP3nHfNYmi_Rq_JgOnnPQ4IGzXA/edit?gid=72087714#gid=72087714)
|

## 5. Priority Strategy

Thứ tự ưu tiên kiểm thử: **P0 → P1 → P2 → P3**

- **P0:** Critical, bắt buộc kiểm thử trước Production Release
- **P1:** High, ưu tiên kiểm thử sau P0 và cần đảm bảo đối với core business
- **P2:** Medium, thực hiện trong regression hoặc sau khi hoàn thành P0/P1
- **P3:** Low, có thể thực hiện khi còn thời gian hoặc trong các cycle tiếp theo

---

## 6. Defect Log

Xem chi tiết tại [BUG ANALYTICS](https://docs.google.com/spreadsheets/d/10ftW99N-aqs1ksUZKP3nHfNYmi_Rq_JgOnnPQ4IGzXA/edit?gid=735698839#gid=735698839)

---

## 7. Kết luận

Sprint 7 và 8 tập trung vào việc **thiết kế test case theo kỹ thuật EP / BVA / Combined EP+BVA, E2E, Postman Test** cho các tầng DTO, Service, Controller hay hành vi, logic, business của hệ thống, cùng với việc **thực thi Unit Test và E2E Test** (bao gồm phần deferred từ sprint trước).

Tổng cộng đã thiết kế (EP: _547_, BVA: _508_, Combined: _788_, E2E: _20_)

**Sprint Status: [MOSTLY ACHIEVE]**
