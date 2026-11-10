# GopKichThuoc — Lập kế hoạch phôi và phiếu cắt

Phiên bản 1.9.0. Gộp kích thước nhỏ khách đặt thành phôi thuận tiện cho nhà máy, sau đó lập mẫu cắt lặp cho thợ.

## Chạy ứng dụng

Mở index.html trực tiếp. Dữ liệu tự lưu trong trình duyệt; giữ nguyên thư mục/file hoặc dùng một địa chỉ localhost ổn định để tái sử dụng dữ liệu. Excel cần kết nối mạng để tải thư viện SheetJS. Có thể in phiếu khi không tải được Excel.

Nếu có Node.js và npm: npm install rồi npm run dev. Kiểm tra logic không cần cài dependency: node tests/run.cjs (hoặc npm test).

## Nhập và sử dụng

1. Chạy riêng từng mã vật tư/profile, màu và đợt sản xuất.
2. Nhập chiều dài mm và số lượng ngay trong bảng. Enter/Tab sang ô tiếp theo; tự thêm dòng. Dán hai cột Excel tại ô đang chọn sẽ thay vùng tương ứng, giữ các dòng khác. Có hoàn tác. Dòng lỗi được giữ và chặn tính đến khi sửa.
3. Hoặc dùng Dán Excel / Nhập file để xem trước, chọn cột, bỏ tiêu đề, cộng dồn, thêm riêng hoặc thay danh sách. File dùng sheet đầu. Khi nhập cộng dồn/thêm riêng, giữ cả dòng đang nhập dở.
4. Chọn cách nhà máy cấp phôi, giới hạn loại chi tiết/mẫu và thông số.
5. Tạo phương án, đối chiếu bảng đặt phôi nhà máy và phiếu cắt xưởng. Tra theo chiều dài/mã mẫu. In và Excel luôn gồm cả lô dù màn hình đang lọc.

## Ba cách cấp phôi

- Đặt theo mẫu ghép (mặc định): ghép chi tiết vào phôi dài nhất trước, giới hạn 1–3 kích thước chi tiết trong mỗi mẫu khi chọn chế độ dễ cắt. Chỉ bổ sung chiều dài đặt hàng ngắn hơn khi giúp nhiều thanh giảm dư; tổng số chiều dài không vượt giới hạn đã chọn. Bước hoán đổi chi tiết giữa các thanh xử lý mẫu lẻ mà không thêm loại phôi. Có thể khai báo dư gia công và bước làm tròn chiều dài đặt.
- Phôi cố định: nhập duy nhất chiều dài (ví dụ 6000 mm). Mọi phôi mới giữ đúng chiều dài đó; trừ dự phòng gia công trước khi xếp. Không sử dụng Min/Max/bước phôi.
- Phôi theo khoảng: thử lưới Min–Max/bước, giới hạn số loại phôi mới, rút phôi về kích thước khả dụng trên lưới. Không áp dụng dự phòng/làm tròn/gộp của chế độ đặt riêng.

Dễ cắt giới hạn 1–3 loại chi tiết/mẫu. Tận dụng phôi bỏ giới hạn này; với phôi đặt riêng vẫn ưu tiên mẫu lặp. Thanh tồn dùng trước; độ dài có thể khác phôi mới.

## Quy tắc đối soát

Tổng phôi = thành phẩm + mạch cắt + dự phòng gia công + đoạn dư.

Mạch cắt hiện tính giữa các đoạn (n−1). Dự phòng gia công là tổng sửa đầu/cắt cuối/dung sai do người dùng khai báo, không phải mô phỏng từng lượt cưa. Thanh tồn hiện không cộng dự phòng này; cần xác nhận tồn đã sửa đầu. Đoạn dư chưa phân loại thu hồi/phế bỏ. Tồn kho chưa tự trừ theo thực cắt.

Ví dụ 1500×124, 3580×12, 2250×32, Min=2000, Max=6000, kerf=5, làm tròn=1, dự phòng=0, gộp=0: 3005×62 (1500×2), 4505×16 (2250×2), 3580×12. Dư lý thuyết 0, mạch cắt 390 mm, đủ 168 chi tiết. Cần cộng dự phòng theo quy trình máy trước khi phát hành.

## Kiểm tra và giới hạn

Chín bộ kiểm tra Node và kiểm tra cú pháp JavaScript; CI tự chạy trên push/PR. Bao gồm bảo toàn số lượng, cân bằng chiều dài, 3 chế độ phôi, giới hạn mẫu, lỗi nhập, chuyển chế độ, bản nháp, hoàn tác, nhập bổ sung, lưu trữ lỗi và thay đổi dữ liệu trong lúc tính. Xuất workbook được kiểm tra bằng mock; chưa xác nhận bằng Excel thật hoặc thử cắt tại xưởng. Chưa xác nhận trực quan trên trình duyệt trong môi trường hiện tại.

Thuật toán heuristic, không bảo đảm tối ưu toàn cục. Giới hạn 20000 chi tiết/thanh và 1001 điểm lưới ở chế độ khoảng. Phôi dài Min/Max phải phù hợp năng lực nhà máy và máy cắt.

Chi tiết lịch sử thay đổi: UPGRADE.md. Tài liệu docs/algorithm.md và test-dry-run.js mô tả bản 1.0; không dùng thay cho bộ kiểm tra hiện hành.

## Cấu trúc

- index.html, src/css/: giao diện
- optimizer.js: hàm nền và cảnh báo
- production.js: đối soát, chế độ phôi, phiếu và Excel
- custom-stock.js: ghép mẫu và tính phôi đặt riêng
- app.js, workspace.js, entry-grid.js: thao tác giao diện, nhập hàng loạt, bảng bàn phím
- storage.js: dữ liệu, lịch sử và mẫu
- tests/: bộ kiểm tra không cần dependency

MIT.

## Hiển thị và cảnh báo 1.8
Cảnh báo dùng cùng mã mẫu A01… với phiếu cắt và Excel; nhấn mã để đến mẫu (tự bỏ lọc tìm kiếm). Bảng cảnh báo luôn áp dụng toàn bộ lô. Chỉ đánh dấu khi đoạn dư mỗi thanh vượt ngưỡng mm đã đặt; tại ngưỡng thì không báo. Không trộn số thứ tự thanh với mã mẫu. Mỗi mẫu hiển thị phôi, số thanh lặp, công thức cắt và dư mỗi thanh; sản lượng/thông số có thể mở rộng. Khi in, sản lượng vẫn có trên phiếu. Không lặp bảng mua mới; bảng bổ sung chỉ dành cho thanh tồn.

## Phiếu in và cài đặt nhanh
Phiếu in A4 riêng gồm bảng đầu vào, bảng đặt phôi, cảnh báo theo mẫu và hướng dẫn cắt. Chữ đen, bảng có viền và sơ đồ SVG không phụ thuộc tùy chọn in nền. Khi in, trang nhập và giao diện màn hình được ẩn. Tắt Đầu trang/chân trang trong hộp thoại trình duyệt nếu không muốn URL/ngày tự động. Bố cục và nội dung có kiểm tra bằng mã; chưa xác nhận ảnh PDF thực tế trong môi trường hiện tại.

Cài đặt sản xuất đã lưu: nhập tên rồi Lưu / cập nhật. Lần sau chọn tên và Áp dụng; dùng lại tên cũ để cập nhật. Chỉ lưu thông số sản xuất, không lưu kích thước khách. Cài đặt lưu trên trình duyệt hiện tại và cùng địa chỉ ứng dụng, chưa đồng bộ sang máy khác. Áp dụng sẽ yêu cầu tính lại.

## Thiết lập gọn 1.9
Chỉ hiện thông số chính của chế độ đang chọn: phôi cố định có chiều dài và giới hạn loại chi tiết/mẫu; đặt riêng hoặc theo khoảng có Min–Max và giới hạn loại chi tiết/mẫu. Các thông số máy, dự phòng, làm tròn, gộp phôi, bước phôi, mục tiêu loại phôi và ngưỡng cảnh báo nằm trong Tùy chỉnh nâng cao (mặc định đóng). Dòng tóm tắt hiển thị giá trị đang dùng. Trường không áp dụng bị ẩn và vô hiệu hóa, không bị xóa giá trị. Có thể lưu/cập nhật tên bộ cài đặt ở mục riêng cuối phần thiết lập; danh sách chọn nhanh chỉ hiện khi đã có bộ lưu. Nạp lại bộ cài đặt đồng bộ cả cách gộp, hiển thị và thông số tóm tắt.
