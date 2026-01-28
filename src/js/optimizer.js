/**
 * CuttingOptimizer - Thuật toán tối ưu hóa cắt nhôm
 * Sử dụng First Fit Decreasing + Global Optimization
 */

class CuttingOptimizer {
  constructor() {
    this.results = null;
  }

  /**
   * Hàm chính: Tối ưu hóa cắt stock
   * @param {Array} items - Danh sách chi tiết [{length, quantity}]
   * @param {Object} config - Cấu hình {kerf, minLength, maxLength, stepSize, maxWaste}
   * @param {Array} existingStocks - Tồn kho có sẵn [{length, quantity}]
   * @returns {Object} Kết quả tối ưu
   */
  optimize(items, config, existingStocks = []) {
    // Validate input
    if (!items || items.length === 0) {
      throw new Error("Danh sách chi tiết không được rỗng");
    }

    // Expand items (chuyển quantity thành mảng riêng lẻ)
    const expandedItems = this.expandItems(items);

    // Sắp xếp từ dài đến ngắn (First Fit Decreasing)
    expandedItems.sort((a, b) => b - a);

    // Kiểm tra item dài hơn max
    const maxItem = expandedItems[0];
    if (maxItem > config.maxLength) {
      throw new Error(
        `Chi tiết ${maxItem}mm dài hơn kích thước tối đa ${config.maxLength}mm`,
      );
    }

    // Thử sử dụng tồn kho trước
    let remainingItems = [...expandedItems];
    const usedStocks = [];

    if (existingStocks && existingStocks.length > 0) {
      const stockResult = this.useExistingStocks(
        remainingItems,
        existingStocks,
        config.kerf,
      );
      remainingItems = stockResult.remainingItems;
      usedStocks.push(...stockResult.usedStocks);
    }

    // Nếu còn items, tìm kích thước tối ưu
    let bestResult = null;

    if (remainingItems.length > 0) {
      bestResult = this.findOptimalStockLength(remainingItems, config);
    }

    // Kết hợp kết quả
    const finalResult = this.combineResults(
      usedStocks,
      bestResult,
      expandedItems.length,
      config,
    );

    this.results = finalResult;
    return finalResult;
  }

  /**
   * Expand items từ {length, quantity} thành mảng riêng lẻ
   */
  expandItems(items) {
    const expanded = [];
    items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        expanded.push(item.length);
      }
    });
    return expanded;
  }

  /**
   * Sử dụng thanh tồn kho trước
   */
  useExistingStocks(items, existingStocks, kerf) {
    const usedStocks = [];
    const remainingItems = [...items];

    // Expand existing stocks
    const expandedStocks = this.expandItems(existingStocks);
    expandedStocks.sort((a, b) => b - a); // Dùng thanh dài trước

    expandedStocks.forEach((stockLength) => {
      const stock = {
        length: stockLength,
        cuts: [],
        remaining: stockLength,
        isExisting: true,
      };

      let i = 0;
      while (i < remainingItems.length) {
        const itemLength = remainingItems[i];
        const requiredSpace = itemLength + (stock.cuts.length > 0 ? kerf : 0);

        if (stock.remaining >= requiredSpace) {
          stock.cuts.push(itemLength);
          stock.remaining -= requiredSpace;
          remainingItems.splice(i, 1);
        } else {
          i++;
        }
      }

      if (stock.cuts.length > 0) {
        usedStocks.push(stock);
      }
    });

    return { usedStocks, remainingItems };
  }

  /**
   * Tìm kích thước phôi tối ưu bằng Global Search
   */
  findOptimalStockLength(items, config) {
    let bestResult = null;
    let bestEfficiency = 0;

    // Thử tất cả kích thước từ min đến max với bước nhảy
    for (
      let stockLength = config.minLength;
      stockLength <= config.maxLength;
      stockLength += config.stepSize
    ) {
      const result = this.firstFitDecreasing(items, stockLength, config.kerf);

      // Tính hiệu suất
      const totalUsed = result.stocks.reduce(
        (sum, stock) => sum + stock.cuts.reduce((s, cut) => s + cut, 0),
        0,
      );
      const totalLength = result.stocks.length * stockLength;
      const efficiency = (totalUsed / totalLength) * 100;

      result.efficiency = efficiency;
      result.totalUsed = totalUsed;
      result.totalLength = totalLength;
      result.totalWaste = totalLength - totalUsed;
      result.stockLength = stockLength;

      // Chọn phương án tốt nhất
      // Ưu tiên: Hiệu suất cao > Số thanh ít
      if (
        efficiency > bestEfficiency ||
        (efficiency === bestEfficiency &&
          result.stocks.length < bestResult.stocks.length)
      ) {
        bestEfficiency = efficiency;
        bestResult = result;
      }
    }

    return bestResult;
  }

  /**
   * Thuật toán First Fit Decreasing
   */
  firstFitDecreasing(items, stockLength, kerf) {
    const stocks = [];

    items.forEach((itemLength) => {
      let placed = false;

      // Thử xếp vào thanh hiện có
      for (let stock of stocks) {
        const requiredSpace = itemLength + (stock.cuts.length > 0 ? kerf : 0);

        if (stock.remaining >= requiredSpace) {
          stock.cuts.push(itemLength);
          stock.remaining -= requiredSpace;
          placed = true;
          break;
        }
      }

      // Nếu không xếp được, tạo thanh mới
      if (!placed) {
        const newStock = {
          length: stockLength,
          cuts: [itemLength],
          remaining: stockLength - itemLength,
          isExisting: false,
        };
        stocks.push(newStock);
      }
    });

    return { stocks };
  }

  /**
   * Kết hợp kết quả từ tồn kho và phôi mới
   */
  combineResults(usedStocks, newStocksResult, totalItems, config) {
    const allStocks = [...usedStocks];

    if (newStocksResult) {
      allStocks.push(...newStocksResult.stocks);
    }

    // Tính toán tổng hợp
    // totalUsed = tổng chiều dài chi tiết (không tính mạch cắt)
    const totalUsed = allStocks.reduce(
      (sum, stock) => sum + stock.cuts.reduce((s, cut) => s + cut, 0),
      0,
    );

    const totalLength = allStocks.reduce((sum, stock) => sum + stock.length, 0);

    // totalWaste = tổng phế liệu thực tế (đã tính mạch cắt)
    // Phải dùng stock.remaining vì nó đã trừ cả mạch cắt
    const totalWaste = allStocks.reduce(
      (sum, stock) => sum + stock.remaining,
      0,
    );

    // totalUsedWithKerf = tổng sử dụng thực tế (bao gồm cả mạch cắt)
    const totalUsedWithKerf = totalLength - totalWaste;

    const efficiency = (totalUsedWithKerf / totalLength) * 100;

    // Tạo summary theo kích thước
    const summary = this.createSummary(allStocks);

    // Tạo warnings
    const warnings = this.generateWarnings(allStocks, config, efficiency);

    return {
      stocks: allStocks,
      summary,
      efficiency: efficiency.toFixed(2),
      totalUsed,
      totalLength,
      totalWaste,
      totalStocks: allStocks.length,
      totalItems,
      optimalLength: newStocksResult ? newStocksResult.stockLength : null,
      warnings,
    };
  }

  /**
   * Tạo bảng tổng hợp theo kích thước
   */
  createSummary(stocks) {
    const summary = {};

    stocks.forEach((stock) => {
      const key = stock.length;
      if (!summary[key]) {
        summary[key] = {
          length: key,
          quantity: 0,
          isExisting: stock.isExisting,
        };
      }
      summary[key].quantity++;
    });

    return Object.values(summary).sort((a, b) => b.length - a.length);
  }

  /**
   * Tạo cảnh báo
   */
  generateWarnings(stocks, config, efficiency) {
    const warnings = [];

    // Cảnh báo hiệu suất thấp
    if (efficiency < 80) {
      warnings.push({
        type: "warning",
        message: `Hiệu suất chỉ ${efficiency.toFixed(1)}%, có thể chưa tối ưu. Thử điều chỉnh khoảng tìm kiếm hoặc bước nhảy.`,
      });
    }

    // 🆕 BAD SOLUTION DETECTION - Phát hiện thanh có phế liệu quá lớn
    const badSolutions = [];
    stocks.forEach((stock, index) => {
      const wastePercent = (stock.remaining / stock.length) * 100;

      if (wastePercent > 70) {
        badSolutions.push({
          index: index + 1,
          length: stock.length,
          cuts: stock.cuts,
          waste: stock.remaining,
          wastePercent: wastePercent.toFixed(1),
          severity: "CRITICAL",
        });
      } else if (wastePercent > 50) {
        badSolutions.push({
          index: index + 1,
          length: stock.length,
          cuts: stock.cuts,
          waste: stock.remaining,
          wastePercent: wastePercent.toFixed(1),
          severity: "WARNING",
        });
      }
    });

    // Tạo cảnh báo cho Bad Solutions
    badSolutions.forEach((bad) => {
      if (bad.severity === "CRITICAL") {
        warnings.push({
          type: "error",
          message: `🚨 CRITICAL: Thanh #${bad.index} (${bad.length}mm) cắt ${bad.cuts.join("+")}mm, dư ${bad.waste.toFixed(0)}mm (${bad.wastePercent}%). Đề xuất: Ghép với thanh khác hoặc đặt custom size.`,
        });
      } else {
        warnings.push({
          type: "warning",
          message: `⚠️ WARNING: Thanh #${bad.index} (${bad.length}mm) có phế liệu ${bad.wastePercent}%. Cân nhắc tối ưu lại hoặc sử dụng thanh tồn kho.`,
        });
      }
    });

    // Cảnh báo phế liệu vượt ngưỡng (giữ nguyên logic cũ)
    stocks.forEach((stock, index) => {
      const wastePercent = (stock.remaining / stock.length) * 100;
      // Chỉ cảnh báo nếu chưa được phát hiện bởi Bad Solution Detection
      if (stock.remaining > config.maxWaste && wastePercent <= 50) {
        warnings.push({
          type: "warning",
          message: `Thanh #${index + 1} (${stock.length}mm) có phế liệu ${stock.remaining.toFixed(0)}mm vượt ngưỡng ${config.maxWaste}mm`,
        });
      }
    });

    // Cảnh báo nếu dùng kích thước gần min
    const minStocks = stocks.filter(
      (s) => !s.isExisting && s.length < config.minLength + 500,
    );
    if (minStocks.length > 0) {
      warnings.push({
        type: "info",
        message: `Có ${minStocks.length} thanh dùng kích thước gần Min. Có thể giảm Min để tối ưu hơn.`,
      });
    }

    return warnings;
  }

  /**
   * Multi-Stock Optimization (Nâng cao - Phase 2)
   * Thử kết hợp nhiều kích thước khác nhau
   */
  multiStockOptimization(items, config) {
    // TODO: Implement trong phase 2
    // Phân nhóm items theo kích thước
    // Tìm kích thước tối ưu cho từng nhóm
    // Kết hợp các phương án
    console.log("Multi-stock optimization - Coming soon");
  }
}

// Export để sử dụng trong app.js
window.CuttingOptimizer = CuttingOptimizer;
