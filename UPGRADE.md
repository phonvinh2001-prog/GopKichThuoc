# Nâng cấp 1.1 — Gộp để sản xuất

Mở index.html để dùng. Excel cần kết nối mạng để tải SheetJS. Hoặc npm install và npm run dev. Chạy kiểm tra bằng npm test (không cần cài thư viện).

## Quy trình
1. Chạy riêng từng mã vật tư/profile, màu và đợt sản xuất.
2. Nhập chiều dài và số lượng, thanh tồn nếu có.
3. Chọn Dễ cắt; đặt giới hạn 1, 2 hoặc 3 loại chiều dài mỗi mẫu.
4. Tính toán, xem số mẫu và số thanh phải mua; điều chỉnh giới hạn để so sánh.
5. Tìm theo chiều dài hoặc mã A01. Xuất Excel hoặc in toàn bộ lô.

## Cách chọn
Dễ cắt sử dụng một chiều dài phôi mới cho cả lô. Với mỗi chiều dài phôi, xếp giảm dần và giới hạn số loại chi tiết. Ưu tiên số mẫu ít, sau đó tổng chiều dài phôi ít, rồi số thanh ít. Thanh tồn được sử dụng trước, từ ngắn đến dài, cùng giới hạn loại chi tiết. Mã mẫu thống nhất giữa màn hình và Excel, mẫu lặp nhiều đứng trước.

Chế độ tận dụng phôi ưu tiên tổng chiều dài phôi, không giới hạn loại chi tiết. Cả hai chế độ là heuristic, không bảo đảm tối ưu toàn cục. Giới hạn loại phôi mới hiện là một loại, chưa có tùy chọn nhiều loại. Ngưỡng phế liệu chỉ dùng cảnh báo; không phải ràng buộc cứng. Nên xem lượng dư trước khi phát hành.

Mạch cắt áp dụng giữa các đoạn (n−1), chưa gồm sửa đầu/cắt cuối, cắt góc hoặc giới hạn kẹp máy. Phiếu là kế hoạch; đối chiếu quy trình máy trước khi sản xuất. Dư chưa được phân loại thành đoạn thu hồi/phế bỏ. Chưa tự động trừ tồn kho.

## Kiểm tra
tests/production.cjs kiểm tra giới hạn loại, bảo toàn số lượng, cân bằng chiều dài, tồn/mua riêng, phôi Max ngoài bước tìm kiếm, đầu vào sai và 40 lô biến thể. Có kiểm tra nội dung xuất workbook bằng thư viện giả lập; chưa kiểm tra trình duyệt và file Excel bằng ứng dụng thật.

Sửa khóa lưu trữ và giữ lịch sử khi autosave. Kết quả bị vô hiệu khi thay đổi dữ liệu. Hiệu suất là thành phẩm/phôi; kerf và đoạn dư báo riêng. Excel gồm nhu cầu, phiếu cắt, mua mới, xuất tồn, tra cứu và thông số.

## 1.2 — Giao diện và nhập liệu
Bố cục hai vùng, bảng sửa trực tiếp, Enter từ chiều dài sang số lượng và Enter để thêm. Chiều dài trùng được cộng dồn khi nhập nhanh. Hoàn tác một thao tác gần nhất (nhấn lại để làm lại). Xóa danh sách có hoàn tác. Mẫu đã lưu có thể nạp lại.

Dán Excel hoặc đọc sheet đầu từ file, chọn cột, bỏ tiêu đề, xem trước và chọn cộng dồn/thêm riêng/thay danh sách. Nếu có dòng lỗi, chưa cho nhập cho đến khi sửa nguồn rồi xem trước lại. Dán hỗ trợ tab, dấu chấm phẩy, dấu phẩy hoặc khoảng trắng; dùng tab và số không có phân cách hàng nghìn để tránh hiểu nhầm. Excel cần tải thư viện qua mạng.

Đã kiểm tra logic nhập, sửa, cộng dồn, hoàn tác, chọn cột và báo lỗi. Chưa xác nhận hình ảnh trình duyệt: trình xem thử từ chối giao thức file cục bộ.

## 1.3 — Sửa lượng dư lớn (thay quy tắc 1.1/1.2)
Ưu tiên tổng chiều dài phôi trước số mẫu. Có thể chọn 1–5 loại chiều dài phôi mới, mặc định 3. Vẫn áp dụng giới hạn 1–3 loại chi tiết/mẫu. Với mỗi phương án xếp, thử rút phôi về chiều dài nhỏ nhất trên lưới Min/Max/bước phôi mà vẫn đủ chứa chi tiết và kerf, giữ nguyên mẫu cắt. So sánh phương án đồng nhất và phương án rút phôi, không vượt giới hạn loại phôi. Đây là heuristic, chưa bảo đảm tối ưu toàn cục. Chỉ dùng khoảng chiều dài mà nhà máy thực sự cung cấp.

Hồi quy theo ảnh: 1500×124, 3580×12, 2250×32; Min 2000, Max 6000, bước 100, kerf 5, tối đa 2 loại chi tiết và 3 loại phôi. Kết quả: 4600×37 (1500×3), 4600×16 (2250×2), 5100×12 (3580+1500), 2000×1 (1500). Tổng phôi 307000 mm, thành phẩm 300960 mm, kerf 510 mm, đoạn dư 5530 mm; thành phẩm 98,03%. So với ảnh: dư giảm 86,4%.

## 1.4 — Đặt phôi theo mẫu ghép (mặc định mới)
Nhà máy sản xuất chiều dài đặt riêng. Tool tạo mẫu lặp cùng chiều dài, thử hai chiến lược (ghép đầy và chia số lượng thành mẫu lặp hết), ghép phần lẻ vào mẫu khả dụng rồi tính chiều dài đặt. Chọn theo đoạn dư, số mẫu, số loại phôi, số thanh. Đây là heuristic, không bảo đảm tối ưu toàn cục. Số loại chi tiết/mẫu vẫn là ràng buộc cứng; mục tiêu số loại phôi trong chế độ đặt riêng chỉ cảnh báo, không ép tăng dư để đạt.

Chiều dài đặt = làm tròn lên của max(Min, tổng chi tiết + (n−1)×kerf + dư gia công dự phòng). Không vượt Max. Dư gia công là tổng dự phòng/phôi do người dùng khai báo (mặc định 0), chưa mô phỏng từng lượt cắt sửa đầu/cắt cuối. Với thanh tồn, giữ quy tắc cũ n−1, không cộng dự phòng mới; cần kiểm tra thanh tồn đã sửa đầu.

Gộp gần nhau: luôn nâng chiều dài nhỏ lên chiều dài lớn, chênh lệch không vượt ngưỡng khai báo (mặc định 0); phần tăng được tính vào đoạn dư. Tắt bước phôi cố định trong chế độ này. Chế độ phôi cố định của 1.3 vẫn có thể chọn lại; các trường dự phòng/làm tròn/gộp gần nhau chỉ áp dụng cho phôi đặt riêng.

Với dữ liệu ảnh, Min 2000 Max 6000 kerf 5, làm tròn 1, dự phòng 0 và gộp 0: 3005×62 (1500+1500), 4505×16 (2250+2250), 3580×12 (giữ nguyên). Thành phẩm 300960 mm, mạch cắt 390 mm, dư 0 mm lý thuyết. Nếu Min khác hoặc có dự phòng, kết quả thay đổi.

Bảng đặt phôi cho nhà máy được hiển thị riêng phía trên phiếu cắt thợ. Excel giữ sheet Mua mới và Phiếu cắt, có thêm dư gia công/phôi. Kiểm tra Node gồm 40 lô mới cho chế độ đặt riêng và toàn bộ bộ kiểm tra cũ. Chưa kiểm tra hình ảnh trình duyệt hoặc cắt thử tại xưởng.

## 1.5 — Bảng nhập bằng bàn phím
Bỏ thao tác Thêm từng kích thước, thay bằng bảng có sẵn ít nhất ba dòng và dòng trống cuối. Enter/Tab: chiều dài → số lượng → chiều dài dòng sau. Shift+Enter/Tab đi ngược; mũi tên lên/xuống cùng cột. Ô nhận focus được chọn hết để gõ đè. Có nút + Dòng mới. Áp dụng cả bảng tồn kho.

Dán trực tiếp hai cột Excel tại một ô sẽ ghi đè vùng tương ứng, giữ các dòng khác; có thể hoàn tác. Dán một cột tại cột số lượng cũng được. Dán nhiều cột hơn giới hạn sẽ bị từ chối; dùng hộp nhập nâng cao để chọn cột. Không tự bỏ tiêu đề khi dán trực tiếp: tiêu đề giữ như dòng lỗi để sửa hoặc xóa. Kích thước trùng giữ dòng riêng, thuật toán vẫn tổng hợp đầy đủ.

Dòng nhập thiếu/sai được giữ và đánh dấu, không đưa vào số lượng hợp lệ. Chặn tính khi còn dòng lỗi. Bản nháp cả ô chưa hoàn tất được lưu trong dữ liệu trình duyệt và khôi phục khi mở lại. Hoàn tác giữ cả bản nháp; sắp xếp không bỏ dòng lỗi. Dán/import nâng cao và các chức năng cũ vẫn còn. Bộ kiểm tra mới xác nhận dán tại vị trí, lỗi nhập, giữ bản nháp, tạo dòng, chặn tính và dữ liệu hoàn tác; chưa kiểm tra trực quan trình duyệt.

## 1.6 — Một chiều dài phôi cố định
Trong Cách nhà máy cấp phôi, chọn Phôi cố định — nhập một chiều dài. Nhập ví dụ 6000 mm. Mọi thanh phôi mới dùng đúng giá trị này, không tự rút phôi và không tìm theo Min–Max. Các ô Min/Max/bước phôi và mục tiêu số loại phôi được vô hiệu hóa. Dư gia công/phôi vẫn áp dụng, trừ trước khi xếp chi tiết. Giữ giới hạn loại chi tiết/mẫu trong chế độ dễ cắt. Tồn kho vẫn dùng trước nên các thanh tồn có thể dài khác phôi mới. Báo rõ chi tiết không vừa chiều dài khả dụng. Thiết lập được lưu và đưa vào sheet thông số Excel. Kiểm tra thêm 30 lô cố định, cân bằng chiều dài, dự phòng, đầu vào lỗi và tồn kho.

## 1.6.1 — Sửa ô phôi cố định vẫn hiện
CSS label display:block đã ghi đè hidden. Thêm quy tắc [hidden] display:none !important, đồng bộ trạng thái khi thay lựa chọn bằng input/change, làm rõ ô vô hiệu. Giá trị 6000 giữ lại để dùng khi quay về phôi cố định nhưng không hiện/không áp dụng trong chế độ đặt theo mẫu. Kiểm tra chuyển cả ba chế độ và hồi quy phôi cố định đã đạt; chưa xác nhận ảnh trình duyệt.


## 1.7 — Rà soát trước khi đưa lên GitHub
Giữ dòng nhập dở khi nhập bổ sung Excel, báo đúng khi không lưu được, đọc dữ liệu legacy khóa undefined và phục hồi khi JSON lỗi. Kiểm tra lại bản nháp/cấu hình sau khoảng chờ cập nhật UI trước khi tính. Không để thông số đang bị vô hiệu ở chế độ khác chặn tính. Chặn lưu mẫu thiếu dữ liệu. Thêm kiểm tra hồi quy và CI, README thống nhất với hành vi hiện tại.

## 1.8 — Cảnh báo khớp mẫu và rút gọn màn hình
Thay cảnh báo theo thanh # bằng mã mẫu A, cùng nguồn dữ liệu với phiếu và Excel. Ngưỡng dư mm/thanh thống nhất giữa bảng cảnh báo và màu mẫu. Link đến mẫu tự xóa bộ lọc. Cảnh báo đặt phía trên danh sách, rút thành bảng số liệu. Mẫu cắt có đầu mục, số thanh, công thức và dư; thông tin sản lượng/kerf/dự phòng thu gọn, sản lượng vẫn hiện khi in. Bỏ bảng đặt hàng lặp, thống kê phụ gộp trong mục mở rộng. Thêm sheet Cảnh báo và bộ kiểm tra đối chiếu mẫu–cảnh báo–Excel.

### Bổ sung phiếu in và cài đặt nhanh trong 1.8
Phiếu A4 riêng, có kích thước và số lượng đầu vào theo ảnh chụp dữ liệu lúc tính. Sơ đồ SVG đen trắng, bảng số chi tiết/thanh và sản lượng cả mẫu. Tách trang hướng dẫn cắt, tránh ngắt giữa mẫu thông thường. Thêm bộ cài đặt có tên, lưu/cập nhật và chọn áp dụng lại; giữ nguyên đầu vào khách. Kiểm tra nội dung phiếu và lưu/áp dụng cài đặt, chưa xác nhận ảnh PDF thực tế.

## 1.9 — Rút gọn thông số đầu vào
Chuyển thông số ít dùng vào phần nâng cao mặc định đóng. Phần chính chỉ gồm cách cấp phôi, chiều dài hoặc khoảng Min–Max, giới hạn loại chi tiết/mẫu. Ẩn trường không áp dụng theo chế độ, ghi rõ mục tiêu số loại phôi ở đặt riêng là cảnh báo còn theo khoảng là giới hạn. Thêm tóm tắt thông số máy đang áp dụng. Tách lưu tên bộ cài đặt vào mục mở rộng, chỉ hiện danh sách chọn nhanh khi đã có bộ lưu. Sửa đồng bộ cách gộp khi nạp cài đặt, kiểm tra lại hiển thị các chế độ và giữ nguyên dữ liệu khách.
