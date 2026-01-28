# Changelog

## [2026-01-28] - Improved Optimization & Data Management

### Added

- **Smart Import**: Paste từ Excel/Text, Import file .xlsx/.csv.
- **Duplicate Handling**: Tự động phát hiện trùng lặp khi import, gợi ý Gộp (Merge) hoặc Thêm mới.
- **Edit/Delete**: Chức năng chỉnh sửa và xóa nhanh cho cả danh sách Chi tiết (Items) và Tồn kho (Stocks).
- **Template System**: Lưu danh sách mẫu (Templates) để dùng lại.
- **UI Improvements**:
  - Gộp hiển thị Sơ đồ cắt (Cutting Diagram) cho các thanh giống nhau.
  - Gộp cảnh báo (Warnings) theo range index (#1-#10) giúp gọn gàng hơn.

### Changed

- **Algorithm**: Nâng cấp thuật toán `Multi-Stock Optimization` (Iterative Residual) để xử lý tốt hơn các thanh có phế liệu > MaxWaste (ưu tiên tìm kích thước stock khác thay vì chấp nhận phế liệu cao).
- **Warning Logic**: Thêm gợi ý giảm "Min Stock Length" nếu phát hiện lãng phí do ràng buộc kích thước tối thiểu.

### Fixed

- Lỗi chọn sai kích thước Stock (5400mm vs 5100mm) do logic lọc "Good Stock" quá lỏng lẻo.
- Lỗi `editItem` không hoạt động do vấn đề scope biến.

## [2026-01-26] - Initial Release

- Basic optimization logic (First Fit Decreasing).
- Single stock optimization.
- Basic UI & Export functionality.
