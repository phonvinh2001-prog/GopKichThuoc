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

    // Nếu còn items, tìm kích thước tối ưu (Sử dụng Multi-Stock)
    let bestResult = null;

    if (remainingItems.length > 0) {
      // Sử dụng thuật toán đa kích thước để tối ưu triệt để
      bestResult = this.multiStockOptimization(remainingItems, config);
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
  /**
   * Tìm kích thước phôi tối ưu bằng Global Search
   */
  findOptimalStockLength(items, config) {
    let bestResult = null;
    let bestEfficiency = -1; // Khởi tạo -1 để đảm bảo có kết quả đầu tiên

    // Sort items để đảm bảo First Fit Decreasing hoạt động đúng
    // (Copy để không ảnh hưởng mảng gốc)
    const sortedItems = [...items].sort((a, b) => b - a);
    const maxItemLength = sortedItems[0];

    // Thử tất cả kích thước từ min đến max với bước nhảy
    for (
      let stockLength = config.minLength;
      stockLength <= config.maxLength;
      stockLength += config.stepSize
    ) {
      // 🛑 QUAN TRỌNG: Bỏ qua nếu kích thước phôi nhỏ hơn chi tiết lớn nhất
      // Ngăn chặn lỗi "Phế liệu âm" và chọn sai stock ảo
      if (stockLength < maxItemLength) continue;

      const result = this.firstFitDecreasing(
        sortedItems,
        stockLength,
        config.kerf,
      );

      // Tính hiệu suất
      const totalUsed = result.stocks.reduce(
        (sum, stock) => sum + stock.cuts.reduce((s, cut) => s + cut, 0),
        0,
      );
      const totalLength = result.stocks.length * stockLength;

      // Tính waste chuẩn xác (dựa trên remaining thực tế)
      const totalWaste = result.stocks.reduce(
        (sum, stock) => sum + stock.remaining,
        0,
      );
      const totalUsedWithKerf = totalLength - totalWaste;

      const efficiency = (totalUsedWithKerf / totalLength) * 100;

      result.efficiency = efficiency;
      result.totalUsed = totalUsed;
      result.totalLength = totalLength;
      result.totalWaste = totalWaste;
      result.stockLength = stockLength;

      // Chọn phương án tốt nhất
      // Ưu tiên: Hiệu suất cao > Số thanh ít
      if (
        efficiency > bestEfficiency ||
        (Math.abs(efficiency - bestEfficiency) < 0.01 && // So sánh float an toàn
          result.stocks.length <
            (bestResult ? bestResult.stocks.length : Infinity))
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

    // Cảnh báo nếu dùng kích thước gần min HOẶC có thể dùng kích thước nhỏ hơn Min
    stocks.forEach((stock, index) => {
      if (stock.isExisting) return; // Bỏ qua tồn kho

      const usedLength = stock.length - stock.remaining; // Chiều dài thực tế sử dụng (đã gồm mạch cắt)

      // Nếu sử dụng ít hơn Min đáng kể (ví dụ dư > 200mm so với Min)
      // VD: Min 3500, dùng 3250 (dư 250). Có thể gợi ý dùng Stock 3300.
      if (usedLength < config.minLength && stock.length === config.minLength) {
        warnings.push({
          type: "info",
          message: `Thanh #${index + 1}: Chỉ sử dụng ${usedLength.toFixed(0)}mm. Nếu được, hãy giảm "Kích thước Min" xuống khoảng ${Math.ceil(usedLength / 100) * 100}mm để tiết kiệm hơn.`,
        });
      }
    });

    const minStocks = stocks.filter(
      (s) => !s.isExisting && s.length < config.minLength + 500,
    );
    if (minStocks.length > 0) {
      warnings.push({
        type: "info",
        message: `Có ${minStocks.length} thanh dùng kích thước gần Min (${config.minLength}mm).`,
      });
    }

    return warnings;
  }

  /**
   * Multi-Stock Optimization (Nâng cao - Phase 2)
   * Thử kết hợp nhiều kích thước khác nhau
   */
  /**
   * Multi-Stock Optimization (Thuật toán Iterative Residual)
   * Tự động kết hợp nhiều kích thước phôi để tối ưu hóa
   */
  multiStockOptimization(items, config) {
    let remainingItems = [...items];
    const finalStocks = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5; // Tránh lặp vô hạn

    while (remainingItems.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;

      // 1. Tìm kích thước tốt nhất cho lô hàng hiện tại
      const bestResult = this.findOptimalStockLength(remainingItems, config);

      // Nếu không tìm được, break
      if (!bestResult) break;

      // 2. Lọc ra các thanh "Tốt" (Good Stocks)
      // 🛑 FIX: Thắt chặt điều kiện. Chỉ chấp nhận thanh có phế liệu <= maxWaste
      // Bỏ điều kiện < 10% vì nó quá lỏng với thanh dài (VD: 10% của 6000 là 600mm > 100mm maxWaste)
      const goodStocks = bestResult.stocks.filter((stock) => {
        return stock.remaining <= config.maxWaste;
      });

      // 3. Xử lý trường hợp không có thanh nào đạt chuẩn
      // Nếu không có thanh nào <= maxWaste, ta thử tìm những thanh "tạm chấp nhận được"
      // (Ví dụ: phế liệu chỉ nhỉnh hơn chút xíu, hoặc hiệu suất rất cao > 98%)
      if (goodStocks.length === 0) {
        const acceptableStocks = bestResult.stocks.filter((stock) => {
          const wastePercent = stock.remaining / stock.length;
          return wastePercent < 0.02; // Chỉ chấp nhận nếu phế liệu < 2% (rất tối ưu)
        });

        if (acceptableStocks.length > 0) {
          finalStocks.push(...acceptableStocks);

          // Những thanh còn lại (tệ thật sự) sẽ đẩy xuống vòng lặp
          const badStocks = bestResult.stocks.filter(
            (s) => !acceptableStocks.includes(s),
          );
          const nextItems = [];
          badStocks.forEach((stock) => nextItems.push(...stock.cuts));
          remainingItems = nextItems;

          if (remainingItems.length === 0) break; // Xong hết
          continue; // Tiếp tục vòng lặp với items còn lại
        }

        // Nếu tất cả đều tệ và không thể tối ưu hơn, đành chấp nhận kết quả hiện tại
        finalStocks.push(...bestResult.stocks);
        remainingItems = [];
        break;
      }

      // 4. Chấp nhận các thanh tốt
      finalStocks.push(...goodStocks);

      // 5. Lấy các item từ các thanh "Tệ" (remaining > maxWaste) để tối ưu lại
      const badStocks = bestResult.stocks.filter((stock) => {
        return stock.remaining > config.maxWaste;
      });

      const nextItems = [];
      badStocks.forEach((stock) => {
        nextItems.push(...stock.cuts);
      });

      remainingItems = nextItems;
    }

    // Nếu vẫn còn hàng sau khi hết số vòng lặp tối đa
    if (remainingItems.length > 0) {
      const lastResult = this.findOptimalStockLength(remainingItems, config);
      finalStocks.push(...lastResult.stocks);
    }

    return {
      stocks: finalStocks,
      // Nếu chỉ có 1 loại kích thước, trả về kích thước đó. Nếu nhiều, trả về "Đa kích thước"
      stockLength: this.detectStockLengthType(finalStocks),
    };
  }

  /**
   * Helper để xác định loại kích thước kết quả
   */
  detectStockLengthType(stocks) {
    if (stocks.length === 0) return 0;
    const firstLen = stocks[0].length;
    const isSingle = stocks.every((s) => s.length === firstLen);
    return isSingle ? firstLen : "Đa kích thước"; // String này sẽ hiển thị ở UI
  }
}

// Export để sử dụng trong app.js
window.CuttingOptimizer = CuttingOptimizer;
