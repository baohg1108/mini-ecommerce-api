# Phân Task Jira — Mini E-commerce Marketplace (v2.0 — Bổ sung đầy đủ)

Tài liệu này là bản cập nhật của bảng phân task gốc, đối chiếu lại toàn bộ SRS để bổ sung các task còn thiếu (chủ yếu ở Notification Service, một số API public, và các FR/UC chưa được cover). Các task **mới thêm** được đánh dấu 🆕 và giữ nguyên toàn bộ task gốc (không đổi nội dung, chỉ dịch chuyển vị trí ngày nếu cần để chèn task mới vào đúng luồng phụ thuộc).

> **Lưu ý:** Mã `[BE-XXX]` trong bảng chỉ mang tính tham chiếu nội bộ giữa 2 dev khi làm việc; khi tạo trên Jira, hệ thống sẽ tự sinh mã ticket (theo đúng ghi chú gốc của bạn), bạn chỉ cần copy **Tên task + (UC-XX)/(FR-XX)/(BR-XX)** vào phần tiêu đề/mô tả.

---

## 🆕 Danh sách các task bổ sung (tổng hợp nhanh)

| Mã (tạm) | Task                                                                  | Lý do bổ sung                                                                                                       |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| BE-081   | Setup Notification Module nền (Mailer + Queue BullMQ)                 | SRS mục 3.2 liệt kê Notification Service là thành phần chính nhưng chưa có task hạ tầng                             |
| BE-082   | Setup Winston Logger + Global Exception Filter (đưa sớm lên Sprint 1) | Log lỗi cần có từ sớm để debug các sprint sau, không nên để dồn cuối                                                |
| BE-083   | (FR-18) API xem trang Shop công khai + danh sách SP theo shop         | FR-18 chưa có task                                                                                                  |
| BE-084   | (FR-17) API xem chi tiết sản phẩm                                     | FR-17 chưa có task                                                                                                  |
| BE-085   | (FR-39) Trigger gửi email xác nhận đơn hàng                           | FR-39 chưa có task                                                                                                  |
| BE-086   | Setup Event Emitter cho Order (nền cho FR-40)                         | Chuẩn bị hạ tầng bắn sự kiện đổi trạng thái đơn                                                                     |
| BE-087   | (FR-40) Trigger notification khi Order đổi trạng thái                 | FR-40 chưa có task                                                                                                  |
| BE-088   | (FR-32) API Admin xem toàn bộ đơn hàng hệ thống                       | FR-32 chưa có task                                                                                                  |
| BE-089   | (FR-41) Cảnh báo tồn kho thấp cho Seller                              | FR-41 chưa có task                                                                                                  |
| BE-090   | (FR-28) API lịch sử giao dịch thanh toán (Customer)                   | FR-28 chưa có task (priority Low, có thể cắt nếu thiếu thời gian)                                                   |
| BE-091   | (UC-12) API hàng đợi kiểm duyệt sản phẩm bị báo cáo (đầy đủ luồng)    | Task gốc BE-014 chỉ là "gỡ sản phẩm" đơn lẻ, chưa đúng luồng UC-12 (danh sách chờ duyệt + lý do + thông báo Seller) |
| BE-092   | (FR-46) Tích hợp API refund thật của VNPay/Momo sandbox               | Làm rõ luồng hoàn tiền online thay vì chỉ ghi nhận thủ công                                                         |

---

## Sprint 1: Base Architecture, Auth Module & Core Infra (Ngày 1–7)

| Ngày | Dev A (Lead Base, User & Auth)                                                                   | Dev B (Category, Media & Infra)                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | [BE-001] Khởi tạo NestJS, Docker, DB, Base Pattern                                               | [BE-002] Thiết lập Redis, tích hợp AWS S3/Cloudinary                                                                     |
| 2    | [BE-003] Thiết kế ERD User, Guard, JWT Strategy                                                  | [BE-004] Viết API Upload File chung                                                                                      |
| 3    | [BE-005] (UC-01, UC-02) API Đăng ký, Đăng nhập                                                   | [BE-006] Thiết kế DB Cây danh mục (Category)                                                                             |
| 4    | [BE-007] (FR-03) Gửi OTP, Quên/Đặt lại mật khẩu                                                  | [BE-008] (FR-10) API Admin Quản lý Danh mục (CRUD)                                                                       |
| 5    | [BE-009] (FR-04, FR-36) API Profile & Admin CRUD User                                            | [BE-010] (FR-16) API Public lấy danh mục & Redis Cache                                                                   |
| 6 🆕 | [BE-081] 🆕 Setup Notification Module nền (Mailer service + Queue BullMQ, template email cơ bản) | [BE-082] 🆕 Setup Winston Logger + Global Exception Filter + format response lỗi chuẩn (JSON thống nhất theo mục 11 SRS) |
| 7    | [BE-011] Viết Unit Test Auth & Merge code                                                        | [BE-012] Test Media Upload, Cache & Merge code                                                                           |

**Ghi chú:** Đưa Logger + Notification infra lên sớm giúp các sprint sau tận dụng ngay (log lỗi, bắn email) thay vì phải refactor lại ở Sprint 7.

---

## Sprint 2: Shop Domain & Core Product (Ngày 8–14)

| Ngày  | Dev A (Shop Domain)                                                                                  | Dev B (Core Product Domain)                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 8     | [BE-013] (UC-03) API Đăng ký gian hàng                                                               | [BE-014] Tạo bảng Product, API Admin gỡ sản phẩm (thao tác đơn lẻ)                                                  |
| 9     | [BE-015] (UC-04) API Admin duyệt/từ chối gian hàng                                                   | [BE-016] (UC-05) API Seller Thêm sản phẩm cơ bản                                                                    |
| 10    | [BE-017] (FR-09) API Admin khoá/mở khoá gian hàng                                                    | [BE-018] (FR-13) API Seller Sửa/Xoá/Ẩn sản phẩm                                                                     |
| 11    | [BE-019] (FR-08) API Seller cập nhật thông tin Shop                                                  | [BE-020] Tích hợp Media API vào logic tạo sản phẩm                                                                  |
| 12 🆕 | [BE-083] 🆕 (FR-18) API xem trang Shop công khai (profile + danh sách sản phẩm của shop, phân trang) | [BE-084] 🆕 (FR-17) API xem chi tiết sản phẩm (thông tin, ảnh, giá, tồn kho — chưa gồm rating, sẽ nối vào Sprint 6) |
| 13    | [BE-021] Cập nhật Guard chặn Seller chưa duyệt                                                       | [BE-022] Logic xoá ảnh trên S3 khi xoá sản phẩm                                                                     |
| 14    | [BE-023] Test luồng Shop & Merge code                                                                | [BE-024] Test luồng Product & Merge code                                                                            |

---

## Sprint 3: Giỏ hàng (Cart) & Biến thể Sản phẩm (Variant) (Ngày 15–20)

| Ngày | Dev A (Cart Logic)                                  | Dev B (Variant & Search)                             |
| ---- | --------------------------------------------------- | ---------------------------------------------------- |
| 15   | [BE-025] (UC-07) Bảng Cart, API Thêm vào giỏ        | [BE-026] (FR-12) Bảng ProductVariant, Logic SKU      |
| 16   | [BE-027] (FR-19) API Cập nhật/Xoá CartItem          | [BE-028] (FR-12) API tạo/cập nhật hàng loạt biến thể |
| 17   | [BE-029] Validate tồn kho khi xem giỏ hàng          | [BE-030] (UC-06) API QueryBuilder tìm kiếm sản phẩm  |
| 18   | [BE-031] (FR-20) Thuật toán nhóm CartItem theo shop | [BE-032] (FR-16) Logic Lọc sản phẩm & Phân trang     |
| 19   | [BE-033] API Clear Cart (dùng sau khi Checkout)     | [BE-034] Tối ưu Query Search chống N+1               |
| 20   | [BE-035] Test luồng gom nhóm giỏ hàng               | [BE-036] Bắn tải API Search, test lọc SKU            |

---

## Sprint 4: Tích hợp Thanh toán & Giao dịch Checkout (Ngày 21–27)

| Ngày  | Dev A (Payment Gateways)                                                                                              | Dev B (Checkout Transaction)                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 21    | [BE-037] (FR-24) Bảng Payment, Luồng đơn COD                                                                          | [BE-038] Bảng Order, Dựng Base DB Transaction                        |
| 22    | [BE-039] (FR-25) Tích hợp VNPay, sinh URL thanh toán                                                                  | [BE-040] (BR-03) Logic trừ tồn kho (Pessimistic Locking)             |
| 23    | [BE-041] (FR-27) API IPN VNPay, validate Secure Hash                                                                  | [BE-042] (BR-02) Logic tách 1 giỏ hàng thành N đơn hàng              |
| 24    | [BE-043] (FR-26) Tích hợp Momo, sinh QR/URL                                                                           | [BE-044] (UC-08) API Checkout (Tạo Order trong 1 Transaction)        |
| 25 🆕 | [BE-085] 🆕 (FR-39) Trigger gửi email xác nhận ngay sau khi đơn hàng tạo thành công (COD & sau khi thanh toán online) | [BE-086] 🆕 Setup Event Emitter cho Order (nền cho FR-40 ở Sprint 5) |
| 26    | [BE-045] (FR-27) API IPN Momo, validate chữ ký                                                                        | [BE-046] Unit Test Transaction (cố tình Error để test Rollback)      |
| 27    | [BE-047] Test IPN webhook bằng Ngrok                                                                                  | [BE-048] Test lock DB khi checkout đồng thời                         |

---

## Sprint 5: Vòng đời Đơn hàng & Cronjob (Ngày 28–34)

| Ngày  | Dev A (Order Workflow)                                                                                                    | Dev B (Cronjob & Refund)                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 28    | [BE-049] (FR-29) API Seller xem danh sách Đơn hàng                                                                        | [BE-050] (BR-06) Cấu hình Cronjob quét đơn pending > 15p                                                       |
| 29    | [BE-051] (FR-30) API Seller cập nhật trạng thái đơn                                                                       | [BE-052] Logic tự động huỷ đơn pending, nhả tồn kho                                                            |
| 30 🆕 | [BE-087] 🆕 (FR-40) Trigger notification khi Order đổi trạng thái (subscribe event từ BE-086, gửi email/lưu Notification) | [BE-088] 🆕 (FR-32) API Admin xem toàn bộ đơn hàng hệ thống (list + filter + detail, phục vụ hỗ trợ khiếu nại) |
| 31    | [BE-053] State Machine chặn nhảy trạng thái đơn                                                                           | [BE-054] (UC-16) API Yêu cầu hoàn tiền (Customer)                                                              |
| 32    | [BE-055] (FR-31) API Customer theo dõi, Huỷ đơn                                                                           | [BE-056] (FR-45) API Admin/Seller duyệt hoàn tiền                                                              |
| 33    | [BE-057] Đồng bộ trạng thái Payment khi đơn bị huỷ                                                                        | [BE-058] API thống kê lịch sử hoàn tiền                                                                        |
| 34    | [BE-059] End-to-end test vòng đời đơn hàng                                                                                | [BE-060] Test Cronjob timeout đơn hàng                                                                         |

---

## Sprint 6: Khuyến mãi (Voucher) & Đánh giá (Review) (Ngày 35–41)

| Ngày  | Dev A (Discount/Voucher)                                                                                         | Dev B (Review & Rating)                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 35    | [BE-061] (UC-14) API Tạo mã giảm giá (Admin/Seller)                                                              | [BE-062] (UC-11) API Customer tạo đánh giá sản phẩm                                                              |
| 36    | [BE-063] (BR-12) Validate Voucher (thời gian, lượt dùng)                                                         | [BE-064] (BR-05) Middleware chặn đánh giá đơn chưa giao                                                          |
| 37    | [BE-065] (BR-11) Logic phân biệt Voucher Hệ thống/Shop                                                           | [BE-066] (FR-35) Logic tính điểm rating trung bình Product                                                       |
| 38    | [BE-067] (UC-15) Tích hợp tính tiền giảm vào Checkout                                                            | [BE-068] (FR-35) Logic tính điểm rating trung bình Shop                                                          |
| 39    | [BE-069] API hiển thị Voucher hợp lệ trong giỏ hàng                                                              | [BE-070] (FR-34) API Seller phản hồi (Reply) đánh giá                                                            |
| 40 🆕 | [BE-089] 🆕 (FR-41) Cảnh báo tồn kho thấp cho Seller (cấu hình ngưỡng, trigger notification qua module Sprint 1) | [BE-090] 🆕 (FR-28) API lịch sử giao dịch thanh toán (Customer) — _có thể cắt nếu thiếu thời gian, priority Low_ |
| 41    | [BE-071] Test tính toán tổng tiền sau giảm giá                                                                   | [BE-072] Test rating cập nhật real-time                                                                          |

---

## Sprint 7: Thống kê, Kiểm duyệt, Tối ưu & Nghiệm thu (Ngày 42–46)

| Ngày  | Dev A (Admin Reports & Polish)                                                                                                                                 | Dev B (Optimize & Deploy)                                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 42    | [BE-073] (UC-13) API Thống kê Doanh thu, Đơn hàng                                                                                                              | [BE-074] Đánh Index DB (status, shop_id, created_at)                                                                                                                    |
| 43    | [BE-075] (UC-13) API Thống kê hiệu quả Khuyến mãi                                                                                                              | [BE-076] Cấu hình bổ sung try-catch còn thiếu, review toàn bộ log                                                                                                       |
| 44 🆕 | [BE-091] 🆕 (UC-12) API hàng đợi kiểm duyệt sản phẩm đầy đủ: danh sách SP bị báo cáo/cần duyệt → phê duyệt/gỡ kèm lý do → thông báo Seller (mở rộng từ BE-014) | [BE-092] 🆕 (FR-46) Tích hợp API refund thật của VNPay/Momo sandbox cho luồng hoàn tiền online (nếu sandbox hỗ trợ endpoint refund), fallback ghi nhận thủ công cho COD |
| 45    | [BE-077] Cập nhật Swagger API Docs toàn hệ thống                                                                                                               | [BE-078] Viết DB Seeder (Tạo data giả: Shop, User, Product)                                                                                                             |
| 46    | [BE-079] Fix bug phát sinh, rà soát response format                                                                                                            | [BE-080] Build image, đóng gói Docker Compose cuối cùng                                                                                                                 |

---

## Bảng đối chiếu độ phủ FR / UC / BR (dùng để nghiệm thu chéo với SRS)

| Nhóm                           | Trạng thái sau bổ sung                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 → FR-46                  | ✅ Đã có task cho toàn bộ (bao gồm FR-17, 18, 28, 32, 39, 40, 41, 46 mới thêm)                                                                                    |
| UC-01 → UC-16                  | ✅ Đã có task; **UC-12** được làm đầy đủ hơn qua BE-091 (thay vì chỉ BE-014)                                                                                      |
| BR-01 → BR-16                  | ✅ Đã cover qua các task Guard/State Machine/Locking hiện có; BR-16 (giới hạn thời gian hoàn tiền) nên được validate trong BE-054 — nhắc dev kiểm tra kỹ khi code |
| Notification Service (mục 3.2) | ✅ Có hạ tầng riêng (BE-081, BE-086) + các điểm trigger (BE-085, BE-087, BE-089)                                                                                  |

---

### Gợi ý khi đưa vào Jira

- Tạo Epic theo từng Sprint ở trên (7 Epic), mỗi dòng task = 1 Issue con (Story/Task), gắn label `FR-xx` / `UC-xx` / `BR-xx` tương ứng để lọc nhanh khi test nghiệm thu (đối chiếu mục 12 SRS).
- Có thể gắn thêm Story Point ước lượng: các task loại "Setup/Infra" thường 3-5 SP, "API CRUD đơn giản" 2-3 SP, "Logic nghiệp vụ phức tạp" (transaction, state machine, IPN) 5-8 SP.
- Task 🆕 nên gắn thêm label `bo-sung-v2` để phân biệt với task gốc khi review lại tiến độ.
