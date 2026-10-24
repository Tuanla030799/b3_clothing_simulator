# Kế hoạch ghép API (I1–I5)

Trạng thái: **I1–I5 đã xong**.

Backend: repo `b3_clothing_simulator_api` (NestJS). Hợp đồng chi tiết nằm ở repo đó: `README.md`
(mục API contract, Endpoints), `docs/designer-contract.md`, `docs/guest-design-contract.md`,
`docs/order-contract.md`, `docs/backend-v1-acceptance.md` (mục 10 "FE chưa tích hợp").

## 1. Quyết định đã chốt

- **Bỏ mock.** Dữ liệu catalog, designer, banner, collection lấy từ API. Không có API thì hiện lỗi
  và nút "Thử lại", không rơi về dữ liệu giả.
- **Tra cứu đơn hàng:** chỉ có trang kết quả ngay sau khi đặt (đọc đơn bằng guest token của phiên).
  Menu "Tra cứu đơn hàng" giữ trang "coming soon" cho tới khi BE có endpoint tra cứu.
- **GitHub Pages:** bản build cần `VITE_API_BASE_URL` (biến repo `vars.VITE_API_BASE_URL` trong
  workflow). Chưa có BE production thì bản Pages hiện trạng thái lỗi kết nối.
- Không thêm thư viện fetch/state: `fetch` + `createApiClient` + `useRemoteData` là đủ cho nhu cầu
  hiện tại.

## 2. Các phase

### I1 — Nền tảng API (xong)

- `apps/client/src/api/http.ts`: `createApiClient({ baseUrl, fetch })` với `get` và `getAll`
  (đọc mọi trang, `pageSize` 100), bóc envelope `{ code: "API-000", data }`, mọi lỗi thành
  `ApiError` (`kind`: `config` | `network` | `http` | `invalid-response`; `status`, `code`,
  `requestId`, `errors`). `loadErrorMessage()` cho câu thông báo tiếng Việt.
- `VITE_API_BASE_URL` (xem `apps/client/.env.example`); dev mặc định `http://localhost:3000/api/v1`.
  BE phải có origin của client trong `CORS_ORIGINS` (mặc định `http://localhost:5173`).
- `useRemoteData(load)`: tải khi gọi, `reload()`, hủy request cũ và khi rời trang.

### I2 — Designer và sản phẩm nổi bật dùng API (xong)

- `features/designer/catalog.ts` (`loadDesignerCatalog`): `GET public/designer/config`,
  `public/categories`, `public/products` (mọi trang), rồi `public/products/:slug/designer` cho
  từng sản phẩm. Mỗi **màu** thành một `Product` của designer (`id` = color id, `productId` = product
  id, tên "Sản phẩm – Màu", ảnh = `designImage`, vùng thêu = `zones`, rỗng khi
  `designerEnabled = false`). Sản phẩm bị ẩn giữa hai request (404) thì bỏ qua; lỗi khác làm cả lần
  tải thất bại.
- `DesignerPage` tải catalog, hiện loading/lỗi/thử lại, rồi mới tạo `DesignerWorkspace` (state của
  phiên). Component đọc catalog bằng `injectCatalog()` / `useCategoryName()`.
- Giới hạn chọn món lấy từ config theo category ID. Ưu tiên bố cục (`COMPOSITION.categoryPriority`)
  giờ theo **slug** danh mục và đang rỗng: điền khi biết slug thật do admin đặt.
- Ảnh vẽ lên canvas được tải với `crossOrigin = "anonymous"` để xuất PNG không bị chặn.
- Trang chủ: "Sản phẩm nổi bật" = 6 sản phẩm public đầu tiên theo thứ tự admin (API không có cờ
  featured cho sản phẩm).
- Font và màu chữ vẫn là hằng số trong client (BE chép nguyên từ client). I4 phải kiểm tra lại khi
  gửi thiết kế.

### I3 — Trang chủ, Sản phẩm, Bộ sưu tập (xong)

- Banner: `HomeHero` tải `GET public/banners`, `HomeBanner` hiển thị (ảnh desktop từ 640 px, ảnh
  mobile dưới đó). `linkUrl` nội bộ (`/…`) điều hướng trong app, https mở tab mới; không có link thì
  không có nút. Không có banner (hoặc lỗi) → khối giới thiệu tĩnh với nút "Bắt đầu thiết kế".
  **Lưu ý cho admin:** `linkUrl` nội bộ phải là đường dẫn của client (`/bo-suu-tap/giang-sinh`,
  `/san-pham/...`), không phải ví dụ `/collections/...` trong README của BE.
- Trang chủ: bộ sưu tập nổi bật (`public/collections?featured=true`), sản phẩm nổi bật dùng chung
  `ProductCard` (có giá). Các khối tĩnh giữ nguyên: thanh thông báo, footer, mạng xã hội, cam kết,
  quy trình, đánh giá.
- `/san-pham`: lọc theo danh mục, tìm theo tên, giữ trên URL (`?danh-muc=&q=`), "Xem thêm" 24 món
  mỗi trang. `/san-pham/:slug`: màu, size (chỉ hiển thị), giá, mô tả, nút "Thêm vào giỏ hàng".
- `/bo-suu-tap` (mọi bộ sưu tập đang bật) và `/bo-suu-tap/:slug` (mô tả + sản phẩm, "Xem thêm").
- Giá: `Intl.NumberFormat('vi-VN', VND, currencyDisplay: 'code')` → "199.000 VND"; hiển thị ở mọi thẻ
  sản phẩm.
- Trạng thái: đang tải, lỗi + thử lại, rỗng, không tìm thấy (API 404).

### I4 — Đặt hàng (xong)

Quyết định đã chốt: đặt thẳng từ trang thiết kế (không có giỏ riêng, `/gio-hang` chuyển về
`/thiet-ke`); không lưu draft (tải lại trang vẫn mất bộ); phiên khách hết hạn thì tự tạo phiên mới.

- Nút "Đặt hàng" (bước 4) mở phần đặt hàng ngay trong designer, giữ nguyên bộ và thiết kế khi quay
  lại. Chọn size cho từng món có size (bắt buộc), giá lấy từ `public/products/:slug`.
- Form khách kiểm tra theo đúng quy tắc của BE (tên 1–100, SĐT chuẩn hóa về `0…`, địa chỉ 1–500,
  ghi chú ≤ 1000); lỗi `errors[].field` của API được gắn lại vào từng ô bằng tiếng Việt.
- Gửi đơn: phiên khách (token trong `sessionStorage`, dùng lại khi còn ≥ 10 phút) → upload ảnh khách
  (`customer_image`, mỗi ảnh một lần) → ảnh xem trước JPEG 1600 px (`design_preview`, bỏ qua nếu không
  tạo được) → `POST public/orders` (`source.type = "design"`, `Idempotency-Key` = `crypto.randomUUID()`).
- Gửi lại an toàn: cùng nội dung thì dùng lại file đã upload và cùng key (server trả lại đơn cũ);
  401 → tạo phiên mới và upload lại; 422 "has expired" → upload lại (mỗi loại một lần).
- `/don-hang/:id`: mã đơn, trạng thái, món, tạm tính, phí thêu "Chờ báo giá", tổng "Sau khi báo phí
  thêu", người nhận, ảnh xem trước (private, đọc bằng token). Hết phiên → hiện mã đơn đã lưu ở tab.
- Giới hạn ảnh khách hạ từ 10 MB xuống 5 MB cho khớp `UPLOAD_MAX_BYTES` của BE.
- Chưa làm: lưu draft qua reload, trang tra cứu đơn (BE chưa có endpoint).

### I6 — Giỏ hàng và phạm vi thiết kế (xong)

- Giỏ hàng lưu ở trình duyệt (localStorage, chỉ id), tối đa `maxOrderItems` (API: 50). Trang
  `/gio-hang`: "Thiết kế" (thiết kế các món trong giỏ) và "Đặt hàng không thiết kế".
- Trang thiết kế chỉ tải sản phẩm của giỏ, hoặc của một bộ sưu tập (`?bo-suu-tap=<slug>`, nút
  "Thiết kế bộ sưu tập này"); không tải toàn bộ catalog. Trang chủ: "Chọn bộ sưu tập".
- Ảnh cả bộ chỉ vẽ tối đa `maxItems` món trong giới hạn theo loại; món còn lại vẫn được thiết kế và
  gửi với `inPreview: false`, khách thấy cảnh báo, admin thấy nhãn "Không có trong ảnh".
- Chưa làm: lưu thiết kế khi rời trang (draft).

### I5 — App admin (xong)

- `apps/admin` (Vue 3 + Vite, cổng 5174): dùng `@lituta/ui` trước, Ant Design Vue 4.2 cho phần thiếu
  (Table, Modal, Drawer, Menu, các ô nhập, RangePicker, Timeline, Tag, thông báo).
- `httpClient`: `get/post/put/patch/delete/upload/blob/getAll`, tự refresh một lần khi 401.
- Phiên: access token trong bộ nhớ, refresh token (xoay vòng) trong `localStorage`; refresh
  single-flight, xử lý khi tab khác đã xoay token; refresh bị từ chối → về trang đăng nhập.
- Trang: đơn hàng (lọc, chi tiết, ảnh private, báo phí thêu, đổi trạng thái theo revision, lịch
  sử), sản phẩm (nháp → màu + 2 ảnh → size → bật bán), vùng thêu trực quan, danh mục, bộ sưu tập +
  thành viên, banner, nền, hình có sẵn, giới hạn bộ quà.
- Chưa làm: deploy admin, quản lý tài khoản admin trên giao diện (BE chỉ có lệnh console).

## 3. Đề xuất cho BE (không chặn)

- Một endpoint trả mọi sản phẩm có designer kèm vùng thêu, thay cho N+1 request hiện tại.
- Endpoint tra cứu đơn (ví dụ mã đơn + SĐT, có rate limit) nếu cần trang "Tra cứu đơn hàng".
