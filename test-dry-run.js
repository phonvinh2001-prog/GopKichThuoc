/**
 * TEST CASE: Kiểm tra lỗi logic thuật toán cắt nhôm
 * Scenario: 10 thanh 5800mm + 1 thanh 1000mm
 * Config: Min=3500mm, Max=6000mm, Kerf=4mm
 *
 * VẤN ĐỀ DỰ KIẾN:
 * - Thuật toán chọn thanh 3500mm để cắt 1000mm
 * - Dư 2496mm (hiệu suất ~28%)
 * - Đây là lựa chọn TỆ vì phế liệu quá lớn
 */

// Simulate optimizer logic
function dryRunTest() {
  console.log("=".repeat(80));
  console.log("🧪 DRY-RUN TEST CASE: Thuật toán cắt nhôm");
  console.log("=".repeat(80));

  // Input
  const items = [
    { length: 5800, quantity: 10 }, // 10 thanh dài
    { length: 1000, quantity: 1 }, // 1 thanh ngắn (thanh gây lỗi)
  ];

  const config = {
    minLength: 3500,
    maxLength: 6000,
    stepSize: 100,
    kerf: 4,
    maxWaste: 500,
  };

  console.log("\n📋 INPUT:");
  console.log("  - Items:", JSON.stringify(items, null, 2));
  console.log("  - Config:", JSON.stringify(config, null, 2));

  // Expand items
  const expandedItems = [];
  items.forEach((item) => {
    for (let i = 0; i < item.quantity; i++) {
      expandedItems.push(item.length);
    }
  });

  // Sort descending (FFD)
  expandedItems.sort((a, b) => b - a);
  console.log("\n📊 EXPANDED & SORTED ITEMS:");
  console.log("  ", expandedItems);

  // Simulate finding optimal stock
  console.log("\n🔍 SIMULATING GLOBAL SEARCH:");
  console.log("-".repeat(80));

  let bestResult = null;
  let bestEfficiency = 0;

  for (
    let stockLength = config.minLength;
    stockLength <= config.maxLength;
    stockLength += config.stepSize
  ) {
    // Simulate First Fit Decreasing
    const stocks = [];
    const itemsCopy = [...expandedItems];

    itemsCopy.forEach((itemLength) => {
      let placed = false;

      // Try to fit in existing stock
      for (let stock of stocks) {
        const requiredSpace =
          itemLength + (stock.cuts.length > 0 ? config.kerf : 0);
        if (stock.remaining >= requiredSpace) {
          stock.cuts.push(itemLength);
          stock.remaining -= requiredSpace;
          placed = true;
          break;
        }
      }

      // Create new stock if not placed
      if (!placed) {
        stocks.push({
          length: stockLength,
          cuts: [itemLength],
          remaining: stockLength - itemLength,
        });
      }
    });

    // Calculate efficiency
    const totalUsed = stocks.reduce(
      (sum, stock) => sum + stock.cuts.reduce((s, cut) => s + cut, 0),
      0,
    );
    const totalLength = stocks.length * stockLength;
    const totalWaste = stocks.reduce((sum, stock) => sum + stock.remaining, 0);
    const totalUsedWithKerf = totalLength - totalWaste;
    const efficiency = (totalUsedWithKerf / totalLength) * 100;

    // Log each attempt
    console.log(
      `Stock ${stockLength}mm: ${stocks.length} thanh, Hiệu suất ${efficiency.toFixed(2)}%`,
    );

    // Detailed log for specific cases
    if (stockLength === 3500 || stockLength === 6000) {
      console.log(`  📌 Chi tiết:`);
      stocks.forEach((stock, idx) => {
        const wastePercent = (stock.remaining / stock.length) * 100;
        console.log(
          `     Thanh #${idx + 1}: Cắt [${stock.cuts.join(", ")}], Dư ${stock.remaining}mm (${wastePercent.toFixed(1)}%)`,
        );
      });
    }

    // Track best
    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency;
      bestResult = { stockLength, stocks, efficiency, totalWaste };
    }
  }

  console.log("-".repeat(80));
  console.log("\n✅ KẾT QUẢ TỐI ƯU (Theo thuật toán hiện tại):");
  console.log(`  - Kích thước: ${bestResult.stockLength}mm`);
  console.log(`  - Số lượng: ${bestResult.stocks.length} thanh`);
  console.log(`  - Hiệu suất: ${bestResult.efficiency.toFixed(2)}%`);
  console.log(`  - Tổng phế liệu: ${bestResult.totalWaste}mm`);

  console.log("\n📊 CHI TIẾT TỪNG THANH:");
  bestResult.stocks.forEach((stock, idx) => {
    const wastePercent = (stock.remaining / stock.length) * 100;
    const isProblematic = wastePercent > 50;
    const flag = isProblematic ? "🚨 CẢNH BÁO" : "✅";
    console.log(`  ${flag} Thanh #${idx + 1} (${stock.length}mm):`);
    console.log(`     Cắt: [${stock.cuts.join(", ")}]`);
    console.log(`     Dư: ${stock.remaining}mm (${wastePercent.toFixed(1)}%)`);
  });

  // ANALYSIS
  console.log("\n" + "=".repeat(80));
  console.log("🔬 PHÂN TÍCH VẤN ĐỀ:");
  console.log("=".repeat(80));

  const problematicStocks = bestResult.stocks.filter(
    (s) => s.remaining / s.length > 0.5,
  );

  if (problematicStocks.length > 0) {
    console.log("\n❌ PHÁT HIỆN VẤN ĐỀ:");
    console.log(`  - Có ${problematicStocks.length} thanh có phế liệu > 50%`);
    problematicStocks.forEach((stock) => {
      const wastePercent = (stock.remaining / stock.length) * 100;
      console.log(
        `  - Thanh ${stock.length}mm: Cắt ${stock.cuts[0]}mm, dư ${stock.remaining}mm (${wastePercent.toFixed(1)}%)`,
      );
    });

    console.log("\n🐛 NGUYÊN NHÂN:");
    console.log("  1. Thuật toán chỉ so sánh HIỆU SUẤT TỔNG THỂ");
    console.log("  2. Không phạt nặng các thanh có phế liệu quá lớn");
    console.log("  3. Thiếu logic kiểm tra % phế liệu từng thanh");

    console.log("\n💡 ĐỀ XUẤT FIX:");
    console.log("  1. Thêm penalty cho thanh có waste% > 50%");
    console.log("  2. Thêm cảnh báo BAD_SOLUTION");
    console.log("  3. Đề xuất ghép hoặc dùng kích thước khác");
  } else {
    console.log("\n✅ KHÔNG CÓ VẤN ĐỀ:");
    console.log("  - Tất cả thanh đều có hiệu suất hợp lý");
  }

  console.log("\n" + "=".repeat(80));
}

// Run test
try {
  dryRunTest();
} catch (error) {
  console.error("❌ Test failed:", error.message);
}

