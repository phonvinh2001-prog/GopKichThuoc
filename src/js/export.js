/**
 * ExportManager - Xuất Excel và In ấn
 */

class ExportManager {
  constructor() {
    this.result = null;
  }

  /**
   * Xuất Excel sử dụng SheetJS
   */
  exportExcel(result) {
    if (!result) {
      alert("Chưa có dữ liệu để xuất");
      return;
    }

    try {
      // Tạo workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Tổng hợp đặt hàng
      const summaryData = this.createSummarySheet(result);
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, "Tổng hợp đặt hàng");

      // Sheet 2: Sơ đồ cắt chi tiết
      const cuttingData = this.createCuttingSheet(result);
      const ws2 = XLSX.utils.aoa_to_sheet(cuttingData);
      XLSX.utils.book_append_sheet(wb, ws2, "Sơ đồ cắt");

      // Sheet 3: Thống kê
      const statsData = this.createStatsSheet(result);
      const ws3 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws3, "Thống kê");

      // Xuất file
      const fileName = `Toi_uu_cat_nhom_${this.getDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      return true;
    } catch (error) {
      console.error("Lỗi khi xuất Excel:", error);
      alert("Có lỗi khi xuất Excel. Vui lòng thử lại.");
      return false;
    }
  }

  /**
   * Tạo sheet tổng hợp đặt hàng
   */
  createSummarySheet(result) {
    const data = [
      ["TỔNG HỢP ĐẶT HÀNG PHÔI NHÔM"],
      ["Ngày tạo:", new Date().toLocaleString("vi-VN")],
      [],
      ["Kích thước (mm)", "Số lượng", "Ghi chú"],
    ];

    result.summary.forEach((item) => {
      data.push([
        item.length,
        item.quantity,
        item.isExisting ? "Tồn kho" : "Đặt mới",
      ]);
    });

    data.push([]);
    data.push(["TỔNG CỘNG", result.totalStocks, "thanh"]);

    return data;
  }

  /**
   * Tạo sheet sơ đồ cắt
   */
  createCuttingSheet(result) {
    const data = [
      ["SƠ ĐỒ CẮT CHI TIẾT"],
      [],
      [
        "STT",
        "Kích thước phôi (mm)",
        "Chi tiết cắt (mm)",
        "Phế liệu (mm)",
        "Ghi chú",
      ],
    ];

    result.stocks.forEach((stock, index) => {
      const cutsStr = stock.cuts.join(" + ");
      data.push([
        index + 1,
        stock.length,
        cutsStr,
        stock.remaining.toFixed(1),
        stock.isExisting ? "Tồn kho" : "Đặt mới",
      ]);
    });

    return data;
  }

  /**
   * Tạo sheet thống kê
   */
  createStatsSheet(result) {
    const data = [
      ["THỐNG KÊ CHI TIẾT"],
      [],
      ["Chỉ số", "Giá trị"],
      ["Hiệu suất", `${result.efficiency}%`],
      ["Tổng số phôi", `${result.totalStocks} thanh`],
      ["Tổng chiều dài sử dụng", `${result.totalUsed.toFixed(0)} mm`],
      ["Tổng chiều dài phôi", `${result.totalLength.toFixed(0)} mm`],
      ["Tổng phế liệu", `${result.totalWaste.toFixed(0)} mm`],
      [
        "Kích thước tối ưu",
        result.optimalLength ? `${result.optimalLength} mm` : "N/A",
      ],
      ["Tổng chi tiết cần cắt", `${result.totalItems} chi tiết`],
    ];

    if (result.warnings && result.warnings.length > 0) {
      data.push([]);
      data.push(["CẢNH BÁO"]);
      result.warnings.forEach((warning) => {
        data.push(["⚠️", warning.message]);
      });
    }

    return data;
  }

  /**
   * In ấn
   */
  printResults() {
    window.print();
  }

  /**
   * Lấy chuỗi ngày giờ cho tên file
   */
  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    return `${year}${month}${day}_${hour}${minute}`;
  }
}

// Export
window.ExportManager = ExportManager;
