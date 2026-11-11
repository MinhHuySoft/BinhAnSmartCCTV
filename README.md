# Bình An Smart CCTV – Demo giao diện (Hạng mục A – Mục 3)

Bản demo tĩnh của hệ thống Camera AI giám sát cho **Khu 3.1 Trạm sạc xe điện** và **Khu 3.2 Sân nền**. Toàn bộ dữ liệu là dữ liệu mẫu (mock). Giao diện dựng từ thiết kế Dark Mode trên Google Stitch, project `3647741843617756661`.

## Chạy thử trên máy

```bash
npx http-server . -p 5173 -c-1
```

Sau đó mở http://localhost:5173. Trang gốc sẽ tự chuyển sang `pages/dashboard.html`.

## Deploy

Đây là site tĩnh, không cần bước build. Deploy nguyên thư mục gốc lên bất kỳ static host nào: GitHub Pages, Netlify, Vercel hoặc Cloudflare Pages. Với GitHub Pages, chọn nhánh `main` và thư mục `/ (root)`.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang mở đầu, tự chuyển sang Trung tâm giám sát |
| `pages/*.html` | 13 màn hình xuất từ Stitch |
| `assets/js/mock-db.js` | Mock DB theo schema mục 4.1 của tài liệu kỹ thuật: Cameras, CameraRules, AI_Alerts, RegisteredVehicles, ANPR_Logs. Dữ liệu được lưu trong `localStorage` |
| `assets/js/app.js` | Nối điều hướng giữa các màn, toast thay cho `alert()`, menu "Màn hình demo", mô phỏng cảnh báo realtime |
| `assets/css/app.css` | Style cho toast và menu demo |
| `assets/img/` | Ảnh CCTV do Stitch sinh ra |

## Các màn hình

| File | Màn hình |
|---|---|
| `dashboard.html` | Trung tâm giám sát: bản đồ mặt bằng, lưới live, luồng cảnh báo |
| `live-grid.html` | Lưới camera trực tiếp |
| `incidents.html` | Hàng đợi sự cố: Nhận xử lý → Hoàn tất / Báo giả |
| `alert-popup.html` | Popup cảnh báo khẩn cấp (lối PCCC) |
| `ev-charging.html` | Khu 3.1: trạm sạc xe điện (camera nhiệt, OCPP chỉ đọc) |
| `ground-firelane.html` | Khu 3.2: sân nền, lối PCCC, đồ bỏ rơi, tụ tập, lảng vảng đêm |
| `anpr.html` | Nhật ký biển số (ANPR) |
| `rules.html` | Cấu hình vùng ROI và 9 loại luật AI |
| `cameras.html`, `camera-edit.html` | Quản lý camera |
| `vehicles.html` | Danh sách xe cư dân (EV/ICE) |
| `reports.html` | Báo cáo vận hành theo tuần/tháng |
| `server.html` | Core Server (WinForms, .NET 10) |

## Mẹo khi demo

- Nút **Màn hình demo** ở góc trái dưới mở danh sách tất cả màn hình.
- Mục **Đặt lại dữ liệu mẫu** trong menu đó đưa mock DB về trạng thái ban đầu.
- Khoảng 20 giây sau khi mở một màn, hệ thống tự đẩy một cảnh báo mới (giả lập SignalR), sau đó lặp lại mỗi 45 giây.
