# Công Cụ Tính Khối Lượng Bê Tông Online 🏗️

Một ứng dụng web đơn giản, gọn nhẹ giúp kỹ sư xây dựng, thầu thợ hoặc chủ nhà tự động tính toán nhanh thể tích và khối lượng bê tông cần thiết để đổ móng, sàn, sảnh và dầm.

Giao diện trực quan, dễ sử dụng, hoàn toàn tính toán trên trình duyệt (client-side) và hỗ trợ xuất PDF (Print-friendly).

## Tính Năng Chính
- **Tính toán Sàn:** Nhập chiều dài, chiều rộng, và chiều dày (hỗ trợ mét/cm).
- **Tính toán Sảnh (Nhiều sảnh):** Có thể thêm/xóa linh hoạt nhiều khu vực sảnh với kích thước khác nhau.
- **Tính toán Dầm (Danh sách dầm):** 
  - Hỗ trợ lưu danh sách các loại dầm.
  - Tùy chọn "Trừ sàn" (Tự động trừ chiều dày sàn khỏi chiều cao dầm) hoặc "Không trừ sàn".
  - Có các nút gợi ý kích thước dầm phổ biến (22x30, 22x35, 22x40, v.v.).
- **Đề Xuất Đặt Hàng:** Tự động tính toán tổng thể tích lý thuyết và cho phép nhập "Hệ số hao hụt (%)" để đưa ra con số đề xuất đặt hàng bê tông tươi cuối cùng một cách chính xác.
- **Tự động lưu (Local Storage):** Mọi kích thước bạn nhập đều tự động được lưu lại trên trình duyệt, không bị mất khi tải lại trang.
- **Xuất PDF:** Giao diện được tối ưu hóa đặc biệt khi nhấn nút "In / Xuất PDF" (tự động ẩn các nút chức năng thừa).

## Cấu Trúc File
- `index.html`: Cấu trúc giao diện ứng dụng và SEO Meta tags.
- `style.css`: Giao diện (UI) thiết kế hiện đại (Glassmorphism), Responsive trên mọi thiết bị và tối ưu cho trang in (Print CSS).
- `app.js`: Logic tính toán, quy đổi đơn vị, quản lý danh sách dầm/sảnh và lưu trữ dữ liệu (LocalStorage).

## Cách Sử Dụng & Triển Khai (Deploy)
Dự án này là một trang web tĩnh (Static Site) hoàn toàn không cần server/backend.

**Chạy trên máy tính (Local):**
Chỉ cần tải code về và nhấp đúp vào file `index.html` để mở trên bất kỳ trình duyệt nào.

**Deploy lên GitHub Pages / Cloudflare Pages:**
1. Tạo một repository mới trên GitHub.
2. Push toàn bộ code lên nhánh `main` hoặc `master`.
3. Vào Settings > Pages và chọn nhánh chứa code làm nguồn hiển thị.
4. Xong! Bạn sẽ có một đường link công cụ online để chia sẻ cho mọi người.

## Giấy Phép (License)
Dự án được phân phối dưới giấy phép MIT. Bạn có thể tự do sử dụng, chỉnh sửa và phân phối lại.
