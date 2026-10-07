# Kế hoạch trang chủ (Home)

Trạng thái: **H1–H4 đã xong**; H5 chưa làm. Code theo từng phase; chỉ làm phase đã được duyệt.

## 1. Bối cảnh và phạm vi

- Luồng sản phẩm đích: chọn sản phẩm → chọn màu/size → thêm giỏ → thiết kế nếu muốn → nhập thông tin
  → xác nhận đặt hàng. Công cụ thiết kế hiện có chỉ là **một bước tùy chọn** của luồng này.
- Kế hoạch này chỉ gồm **trang chủ** và khung điều hướng cần cho nó. Các trang Sản phẩm, Bộ sưu tập,
  Tra cứu đơn hàng, chọn màu/size, giỏ hàng và đặt hàng là các phase sau (xem mục 8).
- Chưa có backend: mọi dữ liệu cần BE được **mock bằng file dữ liệu tĩnh** trong feature, không có
  lớp API giả. Khi có BE (hoặc trang admin) chỉ thay nguồn dữ liệu, không sửa component.
- Tham khảo bố cục và nhịp section của embroidera.us. Không sao chép chữ; ảnh xem mục 4.

## 2. Quyết định đã chốt

| Chủ đề           | Quyết định                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Thanh thông báo  | Nằm trên header; nội dung mock, sau này lấy từ BE                                                               |
| Header           | Logo, menu (Trang chủ, Sản phẩm, Bộ sưu tập, Tra cứu đơn hàng), icon giỏ hàng                                   |
| Banner           | Thư viện **Swiper** (`swiper/vue`)                                                                              |
| Dải cam kết      | 3–5 mục **cố định** trong code; bỏ "Worldwide shipping"                                                         |
| Sản phẩm nổi bật | Lưới, mock từ 6 sản phẩm trong catalog hiện có                                                                  |
| Danh mục         | Thay bằng **bộ sưu tập theo mùa** (Giáng sinh, …)                                                               |
| Quy trình        | 3–4 bước, chữ + ảnh                                                                                             |
| Đánh giá         | Mock, có nhãn **"Dữ liệu mẫu"**                                                                                 |
| Footer           | Chỉ phần trên: giới thiệu + các cột liên kết + mạng xã hội (bỏ đăng ký email, thanh toán, pháp lý)              |
| Giao diện        | Token hiện có của Lituta (nền kem, xanh lá, hồng nhạt, Be Vietnam Pro); không dùng popup, chat nổi, mã giảm giá |
| Package manager  | **Yarn** (`yarn@3.8.7`, một `yarn.lock` ở root), không dùng npm                                                 |

## 3. Quy ước kỹ thuật

- Vue 3 `<script setup lang="ts">`, Tailwind + token, dùng `@lituta/ui` (`Container`, `Row/Col`, `Flex`,
  `Link`, `Typography`, `Button`, `Image`, `EmptyState`). Dùng `Flex` thay cho class `flex`
  (`<Flex as="ul">` cho danh sách, giữ `<li>` thuần) và `Link` thay cho thẻ `<a>`. Chỉ thêm component dùng chung khi thật sự thiếu, theo
  skill `shared-ui-component`.
- Cấu trúc dự kiến:
  - `apps/client/src/pages/HomePage.vue`, `ComingSoonPage.vue`
  - `apps/client/src/features/home/` (section, component, `data/` mock)
  - `apps/client/src/assets/home/` (ảnh)
  - route/layout đặt trong `apps/client/src/` (chỉ tạo thư mục khi có file thật)
- Router: thêm `vue-router` (nhu cầu thực: nhiều trang). Route: `/` trang chủ, `/thiet-ke` công cụ
  thiết kế hiện có (không đổi hành vi). Mục menu chưa có trang tạm trỏ về một trang "Sắp ra mắt"
  dùng chung; không dựng trang giả cho từng mục.
- Cài đặt: `yarn workspace @lituta/client add swiper vue-router`, kiểm tra phiên bản tương thích Vue 3.5
  và đọc tài liệu Swiper theo đúng phiên bản đã cài (Context7 nếu cần). Commit kèm `yarn.lock`.
- Dữ liệu mock có kiểu rõ ràng và nhãn tạm; dữ liệu chưa có (giá, số lượng đánh giá, thời gian giao)
  **không bịa**. Sản phẩm nổi bật chưa hiển thị giá vì chưa có dữ liệu giá.
- Mọi ảnh thiếu có chỗ giữ chỗ ổn định (không import hỏng, không request lỗi).
- Dev playground và công cụ chỉ dùng khi phát triển vẫn phải loại khỏi bản production.

## 4. Chính sách ảnh mock

- Có thể dùng ảnh trên embroidera.us **chỉ để dựng thử giao diện cục bộ**.
- Ảnh đó đặt trong `apps/client/src/assets/home/_reference/` và **bị gitignore** (thêm quy tắc ở H2,
  trước khi tải ảnh đầu tiên). Không commit, không có trong lịch sử git.
- Dữ liệu mock chỉ tham chiếu **tên file**; khi file không tồn tại (máy khác, CI, deploy) thì hiện
  ô giữ chỗ. Workflow `deploy.yml` deploy `develop` lên GitHub Pages, nên bản công khai luôn sạch.
- Trước khi công khai trang: thay bằng ảnh của chính bạn hoặc ảnh có giấy phép thương mại, đặt vào
  `assets/home/` (được commit), hoặc đổi nguồn dữ liệu sang BE/admin. Không cần sửa component.
- Danh sách ảnh cần: 3 banner (ngang cho desktop, dọc cho mobile), 5–6 ảnh bộ sưu tập mùa,
  4 ảnh minh họa quy trình. Sản phẩm nổi bật dùng ảnh PNG trong suốt đã có trong catalog.

## 5. Các phase

Mỗi phase kết thúc bằng: `yarn check` (typecheck, lint, format, test, build), kiểm tra Playwright ở
375/768/1440 (không tràn ngang, focus và bàn phím, không lỗi console hay request hỏng), cập nhật
README phần liên quan, báo cáo kết quả và phần chưa kiểm chứng. Không tự commit.

### H1 — Điều hướng và khung trang

Phạm vi:

- `vue-router` với `/` và `/thiet-ke`; trang "Sắp ra mắt" dùng chung cho các mục chưa làm.
- Layout chung: thanh thông báo (nút đóng), header, footer (phần trên).
- Header: logo, 4 mục menu, icon giỏ hàng (chưa có logic giỏ; trỏ về trang "Sắp ra mắt"). Mobile dùng
  hamburger, đóng bằng Escape và trả focus; mục đang mở có trạng thái active.
- Mock: thông báo, menu, cột footer trong `features/home/data/`.
- Trang thiết kế chuyển thành route `/thiet-ke`, giữ nguyên hành vi Phase 1–5.

Nghiệm thu: điều hướng đúng URL (tải thẳng `/thiet-ke` vẫn chạy trên GitHub Pages — cần xác nhận cách
xử lý đường dẫn gốc/base khi deploy), menu active, bàn phím và focus, trang thiết kế không hồi quy,
playground vẫn chỉ có ở dev.

### H2 — Banner và dải cam kết

Phạm vi:

- Banner `swiper/vue`: 3 slide (tiêu đề, mô tả ngắn, nút), tự chạy có tạm dừng khi hover/focus, phân
  trang, mũi tên, điều khiển bằng bàn phím, tôn trọng `prefers-reduced-motion`, chỉ nạp module Swiper
  cần dùng. Ảnh banner có bản ngang và dọc.
- Dải cam kết 4 mục cố định (làm thủ công, cá nhân hóa tên/logo, đóng gói quà, thời gian chuẩn bị) —
  chữ chốt cùng chủ dự án.
- Thêm quy tắc gitignore cho `assets/home/_reference/` và cơ chế tìm ảnh theo tên file với ô giữ chỗ.

Nghiệm thu: banner chạy/dừng/điều hướng được bằng bàn phím và cảm ứng, không nhảy bố cục khi ảnh tải,
thiếu ảnh vẫn hiển thị ổn, Swiper không làm nặng các trang khác.

### H3 — Sản phẩm nổi bật và bộ sưu tập mùa

Phạm vi:

- Lưới 6 sản phẩm từ catalog hiện có (ảnh PNG trong suốt), nút dẫn vào `/thiet-ke`. Chưa có giá.
- Bộ sưu tập theo mùa dạng thẻ ảnh bo góc (Giáng sinh, Tết, Trung thu, Mùa hè, Khai trường, …),
  mock, có ô giữ chỗ khi thiếu ảnh; click tạm trỏ về "Sắp ra mắt".
- Mobile: lưới chuyển thành cuộn ngang hoặc ít cột hơn, không tràn trang.

Nghiệm thu: dữ liệu lấy từ catalog (không sao chép), thiếu ảnh có giữ chỗ, thẻ có thể thao tác bằng
bàn phím và có tên accessible.

### H4 — Quy trình và đánh giá

Phạm vi:

- Quy trình 4 bước chữ + ảnh theo luồng đích: chọn sản phẩm → chọn màu/size → thiết kế nếu muốn →
  xác nhận đặt hàng. Mô tả phải khớp thực tế chưa có tính năng đặt hàng (không hứa tính năng chưa có
  trong chữ gắn với nút hành động).
- Đánh giá dạng thẻ (băng chuyền hoặc lưới), nhãn "Dữ liệu mẫu" hiển thị rõ; không có điểm trung bình
  hay tổng số đánh giá giả.

Nghiệm thu: nhãn dữ liệu mẫu hiển thị, nội dung đọc được trên mobile, băng chuyền (nếu dùng Swiper)
có điều khiển bàn phím.

### H5 — Hoàn thiện

Phạm vi:

- Responsive toàn trang, trợ năng (heading một cấp, landmark, tên accessible, tương phản), ảnh lazy
  và kích thước khai báo để tránh nhảy bố cục, kiểm tra kích thước bundle (Swiper chỉ ở trang chủ).
- Test cho hành vi có rủi ro (menu mobile, dữ liệu mock thiếu/không hợp lệ, route); không viết test
  chỉ phản chiếu dữ liệu tĩnh.
- README: route, cấu trúc `features/home`, dữ liệu mock và cách thay bằng BE/admin, quy ước ảnh
  `assets/home/` và chính sách `_reference/`.

Nghiệm thu: toàn bộ checklist chung ở đầu mục này, kèm ảnh chụp desktop/mobile và danh sách phần chưa
kiểm chứng.

## 6. Dữ liệu mock (phác thảo, chốt khi làm H1)

- `announcement`: `{ id, text, link? }`
- `navItems`: `{ id, label, to }` (4 mục)
- `footer`: `{ about, columns: { title, links: { label, to }[] }[], socials: { id, label, href }[] }`
- `banners`: `{ id, title, description, cta: { label, to }, image: { desktop?, mobile? } }`
- `commitments`: `{ id, icon, title, description? }` (cố định)
- `seasonalCollections`: `{ id, name, description?, image?, to }`
- `processSteps`: `{ id, title, description, image? }`
- `reviews`: `{ id, author, rating, text, product?, image? }` (+ cờ dữ liệu mẫu)

Mọi trường ảnh chỉ là tên file hoặc URL tùy chọn; thiếu thì dùng ô giữ chỗ.

## 7. Rủi ro và điểm cần chốt khi vào phase

- **GitHub Pages và router:** trang tĩnh không có rewrite, nên tải thẳng `/thiet-ke` cần history mode
  với `base` đúng hoặc dùng hash mode. Chốt ở H1 sau khi xem cấu hình deploy.
- **Ảnh mock:** xem mục 4; không commit ảnh bên ngoài.
- **Chữ cam kết, tên bộ sưu tập, nội dung quy trình:** tôi đề xuất, chủ dự án duyệt.
- **Màu/size và giá:** chưa có dữ liệu; trang chủ không hiển thị.

## 8. Ngoài phạm vi (các phase sau)

Trang Sản phẩm, Bộ sưu tập, Tra cứu đơn hàng, chọn màu/size, giỏ hàng, nhập thông tin, xác nhận đặt
hàng, trang admin. Luồng này mâu thuẫn với các quy tắc hiện hành trong `AGENTS.md` (không đặt hàng
và không variants khi chưa có yêu cầu mở rộng phạm vi); cần cập nhật các quy tắc đó trước khi bắt đầu
các phase này.
