# 🔧 Hệ thống Tối Ưu Hóa Cắt Nhôm

Ứng dụng web giúp tính toán kích thước phôi nhôm tối ưu để giảm thiểu phế liệu.

## ✨ Tính năng

- 🧮 **Thuật toán tối ưu đa kích thước**: Tìm kiếm phương án tốt nhất trong khoảng min-max
- 📊 **Sơ đồ cắt trực quan**: Hiển thị chi tiết cách cắt từng thanh
- 💾 **Lưu trữ tự động**: Dữ liệu được lưu vào LocalStorage, không lo mất khi F5
- 📄 **Xuất Excel**: Tạo file Excel để gửi cho nhà máy
- 🖨️ **In ấn**: Chế độ in A4 cho thợ cắt
- 📦 **Quản lý tồn kho**: Tận dụng thanh nhôm cụt có sẵn
- 📱 **Responsive**: Hoạt động tốt trên máy tính, tablet, điện thoại

## 🚀 Cách sử dụng

### Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy ứng dụng
npm run dev
```

Ứng dụng sẽ mở tại: `http://localhost:3000`

### Sử dụng không cần cài đặt

Mở file `index.html` trực tiếp bằng trình duyệt.

## 📖 Hướng dẫn

1. **Nhập danh sách chi tiết**: Chiều dài (mm) và số lượng
2. **Cài đặt thông số**:
   - Mạch cắt (độ dày lưỡi cưa)
   - Phế liệu tối đa cho phép
   - Khoảng tìm kiếm (Min - Max)
   - Bước nhảy
3. **Tính toán**: Nhấn nút "Tính toán"
4. **Xem kết quả**: Sơ đồ cắt, tổng hợp số lượng, hiệu suất
5. **Xuất file**: Excel hoặc In ấn

## 🏗️ Cấu trúc dự án

```
GopKichThuoc/
├── index.html              # Giao diện chính
├── src/
│   ├── css/
│   │   └── styles.css      # Thiết kế responsive
│   ├── js/
│   │   ├── app.js          # Logic chính
│   │   ├── optimizer.js    # Thuật toán tối ưu
│   │   ├── storage.js      # LocalStorage handler
│   │   └── export.js       # Xuất Excel & Print
├── docs/
│   └── algorithm.md        # Giải thích thuật toán
├── .brain/
│   └── brain.json          # AI context
└── package.json
```

## 🧮 Thuật toán

Ứng dụng sử dụng thuật toán **First Fit Decreasing (FFD)** kết hợp với **Global Optimization**:

1. Sắp xếp chi tiết từ dài đến ngắn
2. Thử tất cả kích thước trong khoảng [Min, Max] với bước nhảy
3. Với mỗi kích thước, tính toán phương án cắt
4. So sánh tổng thể và chọn phương án có hiệu suất cao nhất
5. Hỗ trợ đa kích thước (Multi-Stock) để tối ưu hơn

Chi tiết xem tại: [docs/algorithm.md](docs/algorithm.md)

## 📝 License

MIT
