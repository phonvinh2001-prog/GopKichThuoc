# System Overview

## 1. Project Description

Ứng dụng tối ưu hóa cắt nhôm (Aluminum Cutting Optimizer) giúp tính toán cách cắt các thanh nhôm từ phôi có sẵn để giảm thiểu phế liệu.

## 2. Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: LocalStorage (quản lý lịch sử, cấu hình, templates)
- **Library**: SheetJS (xlsx) để đọc/ghi file Excel

## 3. Core Modules

- **App (`app.js`)**: Controller chính, quản lý UI và tương tác người dùng.
- **Optimizer (`optimizer.js`)**: Core engine tính toán.
  - _Features_: Multi-stock optimization, Iterative Residual algorithm, Bad stock detection.
- **Storage (`storage.js`)**: Quản lý dữ liệu bền vững (Data persistence) và Templates.
- **Export (`export.js`)**: Xuất báo cáo Excel, In ấn.

## 4. Key Features

- **Tối ưu hóa đa kích thước**: Hỗ trợ nhập nhiều loại phôi (Stocks) đầu vào.
- **Nhập liệu thông minh**:
  - Import từ Excel/CSV.
  - Paste từ Clipboard.
  - Phát hiện trùng lặp & Gộp số lượng.
- **Chỉnh sửa linh hoạt**: Sửa trực tiếp Items/Stocks, Lưu mẫu (Templates).
- **Trực quan hóa**: Sơ đồ cắt (Cutting Diagram) với tính năng gộp nhóm hiển thị.
- **Cảnh báo thông minh**: Phát hiện phế liệu cao, gợi ý giảm Min Stock, cảnh báo hiệu suất thấp.

## 5. Data Flow

1. User nhập liệu (Items + Stocks + Config) -> `App`
2. `App` gọi `Optimizer.optimize(items, config, stocks)`
3. `Optimizer` thực hiện tính toán (FFD, Multi-stock logic) -> Trả về `Result`
4. `App` hiển thị `Result` -> Update UI (Diagram, Statistics, Warnings)
5. `App` lưu history vào `Storage`

## 6. Directory Structure

```
/
├── index.html          # Main UI
├── src/
│   ├── css/
│   │   └── styles.css  # Styles
│   ├── js/
│   │   ├── app.js      # Main Controller
│   │   ├── optimizer.js# Core Logic
│   │   ├── storage.js  # Data Manager
│   │   └── export.js   # Export Utils
├── assets/             # Images/Icons
└── README.md           # Instructions
```
