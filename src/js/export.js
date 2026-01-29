/**
 * ExportManager - Xuất Excel và In ấn
 */

class ExportManager {
  constructor() {
    this.result = null;
  }

  /**
   * Xuất báo cáo Excel chi tiết
   */
  exportToExcel(items, result) {
    if (!result) return;

    // Kiểm tra thư viện XLSX
    if (typeof XLSX === "undefined") {
      alert(
        "Lỗi: Thư viện SheetJS chưa được tải. Vui lòng kiểm tra kết nối mạng hoặc file index.html",
      );
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // --- SHEET 1: DANH SÁCH ĐẶT HÀNG (Order List) ---
      // Đây là danh sách yêu cầu cắt (Items) mà user nhập vào
      const inputData = items.map((item, index) => ({
        STT: index + 1,
        "Kích thước yêu cầu (mm)": item.length,
        "Số lượng": item.quantity,
        "Tổng chiều dài (m)": ((item.length * item.quantity) / 1000).toFixed(2),
      }));
      const wsInput = XLSX.utils.json_to_sheet(inputData);

      // Auto-width columns roughly
      wsInput["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, wsInput, "Danh Sách Đặt Hàng");

      // --- SHEET 2: SƠ ĐỒ CẮT (Cutting Diagram) - GỘP NHÓM ---
      const groupedStocks = [];
      result.stocks.forEach((stock, originalIndex) => {
        const matchDetails = JSON.stringify(stock.cuts);
        // Gom nhóm các thanh cùng chiều dài phôi VÀ cùng cách cắt
        const existingGroup = groupedStocks.find(
          (g) =>
            g.stock.length === stock.length &&
            JSON.stringify(g.stock.cuts) === matchDetails,
        );

        if (existingGroup) {
          existingGroup.count++;
          existingGroup.indices.push(originalIndex + 1);
        } else {
          groupedStocks.push({
            stock: stock,
            count: 1,
            indices: [originalIndex + 1],
          });
        }
      });

      const resultData = groupedStocks.map((group, idx) => {
        const s = group.stock;
        const wastePercent = ((s.remaining / s.length) * 100).toFixed(1);

        return {
          STT: idx + 1,
          "Loại Phôi (mm)": s.length,
          "Số lượng thanh": group.count,
          "Cách cắt (Chi tiết mm)": s.cuts.join(" + "),
          "Phế liệu (mm)": s.remaining.toFixed(0),
          "% Phế liệu": `${wastePercent}%`,
          // "Vị trí (Index)": group.indices.length > 5 ? `${group.indices[0]}...${group.indices[group.indices.length-1]}` : group.indices.join(", ")
        };
      });
      const wsResult = XLSX.utils.json_to_sheet(resultData);
      wsResult["!cols"] = [
        { wch: 5 },
        { wch: 15 },
        { wch: 15 },
        { wch: 50 },
        { wch: 15 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, wsResult, "Sơ Đồ Cắt");

      // --- SHEET 3: THỐNG KÊ CHI TIẾT (Statistics) ---
      const stats = result;

      // B1: Thống kê số lượng từng loại phôi
      const stockBreakdown = {};
      result.stocks.forEach((s) => {
        stockBreakdown[s.length] = (stockBreakdown[s.length] || 0) + 1;
      });

      const statsData = [];

      // Phần 1: Tổng quan
      statsData.push({ "Hạng mục": "TỔNG QUAN", "Giá trị": "", "Đơn vị": "" });
      statsData.push({
        "Hạng mục": "Tổng số thanh nhôm cần mua",
        "Giá trị": stats.totalStocks,
        "Đơn vị": "thanh",
      });
      statsData.push({
        "Hạng mục": "Tổng chiều dài phôi nhập",
        "Giá trị": (stats.totalLength / 1000).toFixed(2),
        "Đơn vị": "mét",
      });
      statsData.push({
        "Hạng mục": "Tổng chiều dài thành phẩm",
        "Giá trị": (stats.totalUsed / 1000).toFixed(2),
        "Đơn vị": "mét",
      });
      statsData.push({
        "Hạng mục": "Tổng phế liệu",
        "Giá trị": (stats.totalWaste / 1000).toFixed(2),
        "Đơn vị": "mét",
      });
      statsData.push({
        "Hạng mục": "Hiệu suất sử dụng",
        "Giá trị": stats.efficiency,
        "Đơn vị": "%",
      });
      statsData.push({ "Hạng mục": "", "Giá trị": "", "Đơn vị": "" }); // Spacer

      // Phần 2: Chi tiết vật tư (Breakdown)
      statsData.push({
        "Hạng mục": "CHI TIẾT VẬT TƯ CẦN NHẬP",
        "Giá trị": "",
        "Đơn vị": "",
      });
      Object.entries(stockBreakdown)
        .sort((a, b) => b[0] - a[0])
        .forEach(([length, count]) => {
          statsData.push({
            "Hạng mục": `Phôi dài ${length}mm`,
            "Giá trị": count,
            "Đơn vị": "thanh",
          });
        });

      const wsStats = XLSX.utils.json_to_sheet(statsData);
      wsStats["!cols"] = [{ wch: 35 }, { wch: 15 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsStats, "Thống Kê");

      // --- SAVE FILE ---
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Bao_Cao_Cat_Nhom_${dateStr}.xlsx`);
    } catch (error) {
      console.error("Lỗi Xuất Excel:", error);
      alert(
        `Lỗi khi xuất file Excel: ${error.message}\nVui lòng kiểm tra console (F12) để biết thêm chi tiết.`,
      );
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
  /**
   * Alias cho exportToExcel (để tương thích hoặc tránh gọi nhầm)
   */
  exportExcel(result) {
    console.warn(
      "Cảnh báo: Hàm exportExcel(result) đã cũ. Vui lòng dùng exportToExcel(items, result).",
    );
    this.exportToExcel([], result);
  }
}

// Export
window.ExportManager = ExportManager;
