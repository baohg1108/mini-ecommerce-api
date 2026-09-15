# SPRINT 06 TEST REPORT

**Module:** Voucher & Review
**Dự án:** Mini E-commerce System
**Thời gian:** 30/08/2026 – 04/09/2026
**Nhóm:** Hoàng Gia Bảo, Văn Ngọc Phương

---

## 1. Sprint Overview

**Sprint Goal:** Hoàn thiện module Voucher (tạo mã giảm giá theo scope System/Shop, validate & áp dụng voucher vào giỏ hàng, phân bổ giảm giá đa Shop) và module Review (đánh giá sản phẩm sau khi đơn hàng hoàn tất, Seller phản hồi đánh giá, thống kê rating trung bình Product/Shop).

**Phạm vi chính:**

- CreateVoucherDto: validate code, discountValue, minOrderValue, maxDiscountValue, usageLimit, discountType, ngày hiệu lực.
- VouchersService.createVoucher: phân giải scope theo Role (Admin → SYSTEM, Seller → SHOP), validate ngày, validate % giảm giá, đảm bảo mã không trùng (kể cả race condition DB).
- VoucherValidationService: validate điều kiện áp dụng voucher (scope, trạng thái, thời hạn, giới hạn lượt dùng tổng/theo user, đơn tối thiểu), tính discountAmount (percentage/fixed, chặn bởi maxDiscountValue).
- VoucherValidationService.applyVouchersToCart: áp dụng nhiều voucher cùng lúc, dedup mã trùng, chặn xung đột scope (System/Shop), phân bổ giảm giá cho giỏ hàng 1 Shop và nhiều Shop.
- VoucherValidationService.findAvailableVouchers: liệt kê voucher khả dụng theo giỏ hàng hiện tại.
- CreateReviewDto / ReplyReviewDto: validate rating, comment, reply.
- ReviewEligibilityGuard: kiểm tra quyền đánh giá (chủ đơn, trạng thái đơn delivered/completed, chưa từng đánh giá).
- ReviewsService: tạo review + cập nhật avgRating/reviewCount cho Product và Shop; Seller phản hồi review; liệt kê review theo sản phẩm.
- API Thống kê Doanh thu/Đơn hàng (Seller) và API Admin xem toàn bộ đơn hàng — bổ sung từ backlog Order/Payment.
- 2 Bug phát sinh giữa sprint được đưa vào scope: xác nhận COD không cập nhật history, lỗi TypeORM migration khi generate bảng.

---

## 2. Kết quả tổng quan

| Metric                     |        Kết quả |
| -------------------------- | -------------: |
| Jira Issue thuộc Sprint    | 16/16 (100%)\* |
| Story Point hoàn thành     |          52 SP |
| Test Case được thiết kế    |             88 |
| Design Unit Test           |             88 |
| Design E2E Test            |              0 |
| Production Unit Test       |             56 |
| Production E2E Test        |              0 |
| Tổng Production Test Scope |             56 |
| Test Case đã thực thi      |             56 |
| Test Case PASS             |             56 |
| Test Case FAIL             |              0 |
| P0 – Critical              |             37 |
| P1 – High                  |             25 |
| P2 – Medium                |             26 |
| P3 – Low                   |              0 |
| Defect phát sinh           |              2 |
| Defect đã Fixed            |            1/2 |
| Code Coverage              |        Chưa đo |

> \* 16 issue gồm **14 Task nghiệp vụ** (Done, 52/52 SP) + **2 Bug bổ sung giữa sprint** (SCRUM-139, SCRUM-140 – không có ước tính Story Point). Xem chi tiết ở mục Scope Change và mục 7 (Defect Log).

> **Scope Change:** Trong quá trình Sprint 06 phát sinh 2 issue Bug được thêm vào sprint (không ước tính Story Point):
>
> - **SCRUM-139 / BUG-001-SP6** – Xác nhận COD confirm nhưng history không xác nhận. Phát hiện 30/08/2026, hiện **Blocked** (chưa tích hợp Delivery bên thứ 3 nên đơn COD còn giữ trạng thái pending thay vì success).
> - **SCRUM-140 / BUG-002-SP6** – Lỗi TypeORM Migration khi generate table. Phát hiện 31/08/2026, đã **Done** (fix cùng ngày, nguyên nhân do lệnh migration dùng alter table thay vì create khi tạo bảng mới).
>
> Nhãn Jira "Bug-Dev-Done" chỉ phản ánh trạng thái **đã fix code**; theo Bug Tracking Log thì BUG-002-SP6 thực sự Done, còn BUG-001-SP6 vẫn **Blocked** ở tầng vận hành.

### Priority Distribution

| Priority          | Số lượng |    Tỷ lệ |
| ----------------- | -------: | -------: |
| **P0 – Critical** |       37 |    42.0% |
| **P1 – High**     |       25 |    28.4% |
| **P2 – Medium**   |       26 |    29.5% |
| **P3 – Low**      |        0 |       0% |
| **Tổng**          |   **88** | **100%** |

### Test Status

| Metric                          |   Kết quả |
| ------------------------------- | --------: |
| Design                          |        88 |
| Executed                        |        56 |
| Execution Completion Rate       | **63.6%** |
| PASS                            |        56 |
| FAIL                            |         0 |
| Pass Rate trên test đã thực thi |  **100%** |

> **Voucher Unit Test:** 56 Unit Test được thực thi ngày 04/09/2026, đạt 56/56 PASS, 0 FAIL — bao phủ CreateVoucherDto, VouchersService.createVoucher (resolveScope, validateDateRange, validateDiscountValue, ensureCodeIsUnique) và toàn bộ VoucherValidationService (validateVoucher, calculateDiscountAmount, applyVouchersToCart, findAvailableVouchers). Test Matrix thiết kế 56 Unit Test cho module Voucher.

> **Review Unit Test:** 32 Unit Test được thiết kế cho module Review nhưng **chưa được thực thi trong Sprint 06** (0/32). Trong đó 13/32 test case được đánh dấu "Cần viết (Prod)" — tức phần logic production tương ứng (chủ yếu ở `ReviewEligibilityGuard` và `ReviewsService`) cần được rà soát/bổ sung trước khi có thể chạy test.

> **E2E Status:** Sprint 06 **không thiết kế E2E Test** cho Voucher & Review (Design = 0/0, Executed = 0, Production = 0). Toàn bộ kiểm thử của sprint này ở tầng Unit. E2E cho hai module này có thể được bổ sung ở sprint kế tiếp, hoặc gộp vào **Sprint 07 – Final E2E Regression & Project Test Summary**.

**Sprint Status: PARTIALLY ACHIEVED**

Sprint 06 hoàn thành **14/14 Task nghiệp vụ** thuộc phạm vi sprint (100%), tương ứng **52 Story Point**, cộng thêm 2 Bug được bổ sung giữa sprint (không ước tính SP). Tổng cộng 88 test case được thiết kế, toàn bộ ở tầng Unit (56 Voucher + 32 Review), không có E2E Test trong sprint này. Trong Sprint 06, 56 Unit Test (module Voucher) được thực thi và đạt 56/56 PASS. 32 Unit Test của module Review đã thiết kế nhưng chưa thực thi, một phần do còn thiếu logic production.

---

## 3. Sprint Goal Achievement

|   # | Sprint Success Criteria                                                                      | Requirement | Status                                                          |
| --: | -------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
|   1 | Validate CreateVoucherDto (code, discountValue, ngày, enum...)                               | —           | Achieved                                                        |
|   2 | Phân giải scope Voucher theo Role (Admin/Seller/Customer)                                    | BR-11       | Achieved                                                        |
|   3 | Validate ngày hiệu lực & % giảm giá khi tạo Voucher                                          | —           | Achieved                                                        |
|   4 | Đảm bảo mã Voucher không trùng (kể cả race condition DB 23505)                               | —           | Achieved                                                        |
|   5 | Validate điều kiện áp dụng Voucher (trạng thái, thời hạn, giới hạn lượt dùng, đơn tối thiểu) | BR-12       | Achieved                                                        |
|   6 | Tính discountAmount (percentage/fixed, giới hạn bởi maxDiscountValue)                        | —           | Achieved                                                        |
|   7 | Áp dụng nhiều Voucher vào giỏ hàng, chặn xung đột scope, phân bổ đa Shop                     | UC-15       | Achieved                                                        |
|   8 | Liệt kê Voucher khả dụng theo giỏ hàng                                                       | —           | Achieved                                                        |
|   9 | Validate CreateReviewDto / ReplyReviewDto                                                    | UC-11       | Designed — Chưa thực thi                                        |
|  10 | Kiểm soát điều kiện đủ quyền đánh giá (ReviewEligibilityGuard)                               | BR-05       | Designed — Chưa thực thi                                        |
|  11 | Tạo Review + cập nhật avgRating/reviewCount cho Product & Shop                               | FR-35       | Designed — Chưa thực thi                                        |
|  12 | Seller phản hồi Review (replyReview)                                                         | FR-34       | Designed — Chưa thực thi _(phát hiện gap nghiệp vụ, xem mục 7)_ |
|  13 | Liệt kê Review theo sản phẩm                                                                 | —           | Designed — Chưa thực thi                                        |
|  14 | Phân quyền endpoint Review (AccessTokenGuard/RolesGuard)                                     | —           | Designed — Chưa thực thi                                        |

**8/14 Sprint Success Criteria đã được xác nhận ở tầng Unit Test (module Voucher).**

6/14 tiêu chí còn lại (module Review) đã có test case thiết kế nhưng **chưa có bằng chứng thực thi**; không có tiêu chí nào trong sprint này yêu cầu kiểm thử E2E.

---

## 4. Requirement Traceability Matrix

> Ghi chú: nguồn dữ liệu Voucher/Review không gắn mã FR/UC/BR trực tiếp cho từng test case, nên cột Execution dưới đây phản ánh trạng thái ở cấp Jira Issue (đối chiếu với Test ID Range chi tiết ở mục 5).

| Requirement                                                | Jira               | Test Type | Execution                                                 |
| ---------------------------------------------------------- | ------------------ | --------- | --------------------------------------------------------- |
| UC-14 – Tạo mã giảm giá (Admin/Seller)                     | SCRUM-70 (BE-061)  | Unit      | Executed / PASS                                           |
| BR-12 – Validate Voucher (thời gian, lượt dùng)            | SCRUM-71 (BE-063)  | Unit      | Executed / PASS                                           |
| BR-11 – Phân biệt Voucher Hệ thống/Shop                    | SCRUM-72 (BE-065)  | Unit      | Executed / PASS                                           |
| UC-11 – Customer tạo đánh giá sản phẩm                     | SCRUM-73 (BE-062)  | Unit      | Designed / Chưa thực thi                                  |
| UC-15 – Tích hợp tính tiền giảm vào Checkout               | SCRUM-74 (BE-067)  | Unit      | Executed / PASS                                           |
| BR-05 – Middleware chặn đánh giá đơn chưa giao             | SCRUM-75 (BE-064)  | Unit      | Designed / Chưa thực thi                                  |
| — API hiển thị Voucher hợp lệ trong giỏ hàng               | SCRUM-76 (BE-069)  | Unit      | Executed / PASS                                           |
| FR-35 – Logic tính rating trung bình Product               | SCRUM-77 (BE-066)  | Unit      | Designed / Chưa thực thi                                  |
| — Test tính toán tổng tiền sau giảm giá                    | SCRUM-78 (BE-071)  | Unit      | Executed / PASS                                           |
| FR-35 – Logic tính rating trung bình Shop                  | SCRUM-79 (BE-068)  | Unit      | Designed / Chưa thực thi                                  |
| UC-13 – API Thống kê Doanh thu, Đơn hàng                   | SCRUM-80 (BE-073)  | —         | Không có test case liên kết trực tiếp trong nguồn dữ liệu |
| FR-34 – API Seller phản hồi (Reply) đánh giá               | SCRUM-81 (BE-070)  | Unit      | Designed / Chưa thực thi _(gap nghiệp vụ, xem mục 7)_     |
| FR-32 – API Admin xem toàn bộ đơn hàng                     | SCRUM-82 (BE-073b) | —         | Không có test case liên kết trực tiếp trong nguồn dữ liệu |
| — Test rating cập nhật real-time                           | SCRUM-83 (BE-072)  | Unit      | Designed / Chưa thực thi                                  |
| — [BUG-001]-[SP6] COD confirm nhưng history không xác nhận | SCRUM-139          | —         | Blocked (chưa fix)                                        |
| — [BUG-002]-[SP6] Lỗi TypeORM Migration khi generate table | SCRUM-140          | —         | Done (đã fix 31/08/2026)                                  |

---

## 5. Test Case Summary

### 5.1 Test Design

| Test Level          | Designed |
| ------------------- | -------: |
| Unit Test (Voucher) |       56 |
| Unit Test (Review)  |       32 |
| E2E Test            |        0 |
| **Total**           |   **88** |

### 5.2 Production Test Scope

| Test Level                 | Production Scope |
| -------------------------- | ---------------: |
| Unit Test (Voucher)        |               56 |
| Unit Test (Review)         |              0\* |
| E2E Test                   |                0 |
| **Total Production Scope** |           **56** |

> \* 13/32 Review Unit Test case còn phụ thuộc logic production chưa hoàn thiện (`ReviewEligibilityGuard`, `ReviewsService`); 19/32 case còn lại đã có production tương ứng nhưng cũng chưa được thực thi trong sprint này. Do đó module Review chưa được tính vào Production Scope của Sprint 06.

### 5.3 Test Execution

| Test Level | Designed | Production Scope | Executed |   PASS |  FAIL |
| ---------- | -------: | ---------------: | -------: | -----: | ----: |
| Unit Test  |       88 |               56 |       56 |     56 |     0 |
| E2E Test   |        0 |                0 |        0 |      0 |     0 |
| **Total**  |   **88** |           **56** |   **56** | **56** | **0** |

**Execution Completion Rate:**

> 56 / 88 = **63.6%**

**Pass Rate trên test đã thực thi:**

> 56 / 56 = **100%**

**Production Scope Coverage:**

> 56 / 88 = **63.6%**

---

## 6. Test Priority

Các test case được phân loại theo **Risk-Based Testing**, ưu tiên các luồng ảnh hưởng trực tiếp đến tiền (tính discount, phân bổ giảm giá đa Shop) và tính toàn vẹn nghiệp vụ (chống trùng mã, chống xung đột scope, phân quyền đánh giá).

| Priority  | Mức độ   | Số lượng |    Tỷ lệ | Ý nghĩa                                                                                                              |
| --------- | -------- | -------: | -------: | -------------------------------------------------------------------------------------------------------------------- |
| **P0**    | Critical |       37 |    42.0% | Logic tính discount, resolveScope, chống trùng mã, validate điều kiện áp dụng voucher, phân quyền/eligibility review |
| **P1**    | High     |       25 |    28.4% | Validation DTO đầu vào, các nhánh lỗi nghiệp vụ quan trọng (404/403/400)                                             |
| **P2**    | Medium   |       26 |    29.5% | Edge case, giá trị mặc định, dedup, optional field                                                                   |
| **P3**    | Low      |        0 |       0% | Không có                                                                                                             |
| **Total** |          |   **88** | **100%** |

### Priority Strategy

Thứ tự ưu tiên kiểm thử:

**P0 → P1 → P2 → P3**

- **P0:** Critical — bắt buộc kiểm thử trước khi đưa Voucher vào luồng Checkout thật, vì sai sót ảnh hưởng trực tiếp đến số tiền khách trả; tương tự với Review, sai sót ở Guard/phân quyền có thể cho phép đánh giá gian lận.
- **P1:** High — đảm bảo các nhánh lỗi trả đúng mã HTTP và message cho FE xử lý.
- **P2:** Medium — thực hiện trong regression sau khi P0/P1 đã pass.
- **P3:** Low — không phát sinh trong sprint này.

---

## 7. Defect Log

| Bug ID                  | Mô tả                                                                                                                           | Phát hiện qua               | Trạng thái                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| SCRUM-139 / BUG-001-SP6 | Xác nhận COD confirm nhưng history không xác nhận (seller nhận tiền, nhấn thành công nhưng hệ thống vẫn giữ trạng thái pending) | Kiểm thử/QA trong Sprint 06 | **Blocked** — chưa tích hợp Delivery bên thứ 3 |
| SCRUM-140 / BUG-002-SP6 | Lỗi TypeORM Migration khi generate table (dùng alter table thay vì create khi tạo bảng mới)                                     | Kiểm thử/QA trong Sprint 06 | **Done** (fix 31/08/2026)                      |

**Tổng cộng: 2 defect** — 1/2 Fixed (BUG-002-SP6), 1/2 Blocked (BUG-001-SP6).

Ngoài ra, test case **REV-UNIT-028** phát hiện một **gap nghiệp vụ** (chưa phải bug đã xác nhận): `replyReview` hiện không chặn việc Seller phản hồi lại lần 2 — nội dung và thời gian phản hồi cũ bị ghi đè mà không có cảnh báo. Cần xác nhận với Product Owner đây có phải hành vi chủ đích hay không trước khi coi là defect chính thức.

---

## 8. Risk & Limitation

| Risk / Limitation                                                                    | Severity   | Impact                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review Unit Test chưa được thực thi (0/32)                                           | **High**   | Chưa có bằng chứng xác nhận logic phân quyền đánh giá, cập nhật rating Product/Shop, và luồng reply hoạt động đúng                                               |
| 13/32 Review test case cần bổ sung logic Production (đánh dấu "Cần viết")            | **High**   | Một phần chức năng Review (đặc biệt ReviewEligibilityGuard, ReviewsService) có thể chưa được implement đầy đủ                                                    |
| Gap nghiệp vụ tại `replyReview` (REV-UNIT-028): cho phép ghi đè reply cũ             | **Medium** | Rủi ro Seller vô tình mất nội dung phản hồi trước đó; cần xác nhận chủ đích nghiệp vụ                                                                            |
| BUG-001-SP6 (COD confirm) đang Blocked, phụ thuộc tích hợp Delivery bên thứ 3        | **Medium** | Đơn hàng COD có thể bị kẹt ở trạng thái pending, ảnh hưởng trải nghiệm Seller/Customer cho đến khi tích hợp xong                                                 |
| Không thiết kế E2E cho Voucher & Review trong Sprint 06 (Design/Executed = 0)        | **Medium** | Thiếu execution evidence ở tầng HTTP/API cho hai module này; các luồng tích hợp thực tế (Controller → Service → DB) chưa được xác thực đầu-cuối                  |
| Chênh lệch giữa trạng thái "Done" trên Jira (14/14) và bằng chứng test Review (0/32) | **Medium** | Có khoảng trống giữa Definition of Done trên Jira và bằng chứng kiểm thử thực tế cho module Review — cần làm rõ tiêu chí DoD có bao gồm test execution hay không |
| Code Coverage chưa có số liệu                                                        | **Medium** | Chưa đánh giá được mức độ bao phủ code tự động cho Voucher & Review                                                                                              |

> **E2E Status:** Sprint 06 không thiết kế E2E Test cho Voucher & Review. Có thể bổ sung ở sprint kế tiếp hoặc gộp vào **Sprint 07 – Final E2E Regression & Project Test Summary**.

---

## 9. Test Quality Metrics

| Metric                    |     Value |
| ------------------------- | --------: |
| Total Test Design         |        88 |
| Unit Design (Voucher)     |        56 |
| Unit Design (Review)      |        32 |
| E2E Design                |         0 |
| Production Unit           |        56 |
| Production E2E            |         0 |
| Total Production Scope    |        56 |
| P0                        |        37 |
| P1                        |        25 |
| P2                        |        26 |
| P3                        |         0 |
| Executed                  |        56 |
| PASS                      |        56 |
| FAIL                      |         0 |
| Execution Completion      | **63.6%** |
| Pass Rate                 |  **100%** |
| Production Scope Coverage | **63.6%** |
| Defect                    |         2 |
| Fixed Defect              |       1/2 |
| Code Coverage             |   Chưa đo |

---

## 10. Kết luận

Sprint 06 hoàn thành **14/14 Jira Task nghiệp vụ** thuộc phạm vi sprint (100%), tương ứng **52 Story Point**, đáp ứng các mục tiêu chính về Voucher (tạo mã giảm giá theo scope, validate & áp dụng vào giỏ hàng, phân bổ đa Shop) và Review (đánh giá sản phẩm, Seller phản hồi, thống kê rating). Sprint 06 cũng tiếp nhận **2 Bug bổ sung giữa sprint** — SCRUM-139 (BUG-001-SP6) và SCRUM-140 (BUG-002-SP6) — không có ước tính Story Point.

Về kiểm thử, Sprint 06 đã thiết kế **88 test case**, toàn bộ ở tầng Unit (**56 Voucher + 32 Review**), không có E2E Test trong sprint này. Các test case được phân loại theo mức độ ưu tiên gồm **37 P0, 25 P1 và 26 P2**.

Trong Sprint 06, **56 Unit Test của module Voucher được thực thi và đạt 56/56 PASS (100%)**. Module Review mới dừng ở bước thiết kế (32 test case), **chưa được thực thi**, do đó **Execution Completion Rate trên toàn bộ Test Design là 63.6%**.

Có **2 defect** được ghi nhận trong sprint: BUG-002-SP6 (lỗi TypeORM Migration) đã được fix trong ngày; BUG-001-SP6 (xác nhận COD) hiện **Blocked** do phụ thuộc tích hợp Delivery bên thứ 3. Ngoài ra, một **gap nghiệp vụ** tại chức năng Seller phản hồi đánh giá (`replyReview`) cần được xác nhận với Product Owner.

E2E Test cho Voucher & Review chưa được thiết kế trong Sprint 06 và có thể được bổ sung ở sprint kế tiếp hoặc gộp vào **Sprint 07 – Final E2E Regression & Project Test Summary**.

**Sprint Status: PARTIALLY ACHIEVED**
