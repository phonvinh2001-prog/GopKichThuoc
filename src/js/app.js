/**
 * App - Logic chính của ứng dụng
 */

class App {
  constructor() {
    this.optimizer = new CuttingOptimizer();
    this.storage = new StorageManager();
    this.exporter = new ExportManager();

    this.items = [];
    this.stocks = [];
    this.config = {
      kerf: 5,
      maxWaste: 500,
      minLength: 3500,
      maxLength: 6000,
      stepSize: 100,
    };

    this.currentResult = null;
  }

  /**
   * Khởi tạo ứng dụng
   */
  init() {
    console.log("🚀 Khởi động ứng dụng...");

    // Load dữ liệu từ LocalStorage
    this.loadFromStorage();

    // Render UI
    this.renderItems();
    this.renderStocks();
    this.updateConfigUI();

    // Bắt đầu auto-save
    this.storage.startAutoSave(() => this.getCurrentData());

    // Setup event listeners
    this.setupEventListeners();

    console.log("✅ Ứng dụng đã sẵn sàng!");
  }

  /**
   * Load dữ liệu từ storage
   */
  loadFromStorage() {
    const data = this.storage.loadData();
    this.items = data.items || [];
    this.stocks = data.stocks || [];
    this.config = data.config || this.config;
  }

  /**
   * Lấy dữ liệu hiện tại để lưu
   */
  getCurrentData() {
    return {
      items: this.items,
      stocks: this.stocks,
      config: this.config,
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Enter key shortcuts...
    document.getElementById("itemLength").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addItem();
    });
    // ... (Giữ nguyên các event cũ)

    // === IMPORT EVENTS ===
    const modal = document.getElementById("importModal");
    const btnImport = document.getElementById("btnImport");
    const closeBtn = document.querySelector(".close-modal");

    // Mở modal
    btnImport.onclick = () => {
      modal.style.display = "flex";
      document.getElementById("pasteArea").focus();
    };

    // Đóng modal
    closeBtn.onclick = () => (modal.style.display = "none");
    window.onclick = (e) => {
      if (e.target == modal) modal.style.display = "none";
    };

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // Remove active
        document
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => (c.style.display = "none"));

        // Set active
        btn.classList.add("active");
        const tabId = btn.getAttribute("data-tab");
        const map = { paste: "tabPaste", file: "tabFile" };
        document.getElementById(map[tabId]).style.display = "block";
      });
    });

    // Process Paste
    document.getElementById("btnProcessPaste").addEventListener("click", () => {
      const text = document.getElementById("pasteArea").value;
      this.processImportText(text);
      modal.style.display = "none";
    });

    // Process File
    const fileInput = document.getElementById("fileInput");
    const dropZone = document.getElementById("dropZone");

    // Drag & Drop
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#007bff";
    });
    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#ced4da";
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#ced4da";
      if (e.dataTransfer.files.length)
        this.processImportFile(e.dataTransfer.files[0]);
    });

    // File Input
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) this.processImportFile(e.target.files[0]);
    });

    // Lưu config khi thay đổi
    ["kerf", "maxWaste", "minLength", "maxLength", "stepSize"].forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        this.updateConfig();
      });
    });
  }

  /**
   * Xử lý text paste từ clipboard/excel
   */
  processImportText(text) {
    if (!text || !text.trim()) return;

    const lines = text.trim().split(/\r?\n/);
    let count = 0;

    lines.forEach((line) => {
      // Tách bằng tab, dấu phẩy, hoặc khoảng trắng
      // Regex: Bắt số đầu tiên là length, số thứ 2 là quantity. Bỏ qua ký tự lạ.
      // VD: "5300 15", "5300,15", "5300mm 15 cay"

      // Clean line: replace all non-digit chars with space, except dot (if needed for float?)
      // Nhưng kích thước nhôm thường là int.
      const parts = line.trim().split(/[\t,;|\s]+/); // Split by common separators

      // Tìm 2 số hợp lệ đầu tiên
      const numbers = parts
        .filter((p) => !isNaN(parseFloat(p)) && isFinite(p))
        .map(Number);

      if (numbers.length >= 2) {
        const length = numbers[0];
        const quantity = numbers[1];

        if (length > 0 && quantity > 0) {
          this.items.push({ length, quantity });
          count++;
        }
      }
    });

    if (count > 0) {
      this.renderItems();
      alert(`Đã nhập thành công ${count} mục!`);
      document.getElementById("pasteArea").value = ""; // Clear
    } else {
      alert(
        "Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra format (Chiều dài Số lượng)",
      );
    }
  }

  /**
   * Xử lý import file Excel
   */
  processImportFile(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      // Convert to JSON (mảng mảng)
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      let count = 0;
      jsonData.forEach((row) => {
        // Tìm 2 ô số đầu tiên trong row
        const numbers = row.filter((cell) => typeof cell === "number");

        if (numbers.length >= 2) {
          const length = numbers[0];
          const quantity = numbers[1];
          if (length > 0 && quantity > 0) {
            this.items.push({ length, quantity });
            count++;
          }
        }
      });

      if (count > 0) {
        this.renderItems();
        alert(`Đã nhập thành công ${count} mục từ file Excel!`);
        document.getElementById("importModal").style.display = "none";
      } else {
        alert("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  /**
   * Cập nhật config từ UI
   */
  updateConfig() {
    this.config.kerf = parseFloat(document.getElementById("kerf").value) || 5;
    this.config.maxWaste =
      parseFloat(document.getElementById("maxWaste").value) || 500;
    this.config.minLength =
      parseFloat(document.getElementById("minLength").value) || 3500;
    this.config.maxLength =
      parseFloat(document.getElementById("maxLength").value) || 6000;
    this.config.stepSize =
      parseFloat(document.getElementById("stepSize").value) || 100;
  }

  /**
   * Cập nhật UI config
   */
  updateConfigUI() {
    document.getElementById("kerf").value = this.config.kerf;
    document.getElementById("maxWaste").value = this.config.maxWaste;
    document.getElementById("minLength").value = this.config.minLength;
    document.getElementById("maxLength").value = this.config.maxLength;
    document.getElementById("stepSize").value = this.config.stepSize;
  }

  /**
   * Thêm item
   */
  addItem() {
    const length = parseFloat(document.getElementById("itemLength").value);
    const quantity = parseInt(document.getElementById("itemQuantity").value);

    if (!length || !quantity || length <= 0 || quantity <= 0) {
      alert("Vui lòng nhập chiều dài và số lượng hợp lệ");
      return;
    }

    this.items.push({ length, quantity });
    this.renderItems();

    // Clear inputs
    document.getElementById("itemLength").value = "";
    document.getElementById("itemQuantity").value = "";
    document.getElementById("itemLength").focus();
  }

  /**
   * Xóa item
   */
  deleteItem(index) {
    this.items.splice(index, 1);
    this.renderItems();
  }

  /**
   * Render danh sách items
   */
  renderItems() {
    const container = document.getElementById("itemsList");

    if (this.items.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = this.items
      .map(
        (item, index) => `
            <div class="item-row">
                <div class="item-info">
                    <strong>${item.length}mm</strong> × ${item.quantity} thanh
                </div>
                <button class="item-delete" onclick="app.deleteItem(${index})">Xóa</button>
            </div>
        `,
      )
      .join("");
  }

  /**
   * Thêm stock (tồn kho)
   */
  addStock() {
    const length = parseFloat(document.getElementById("stockLength").value);
    const quantity = parseInt(document.getElementById("stockQuantity").value);

    if (!length || !quantity || length <= 0 || quantity <= 0) {
      alert("Vui lòng nhập chiều dài và số lượng hợp lệ");
      return;
    }

    this.stocks.push({ length, quantity });
    this.renderStocks();

    // Clear inputs
    document.getElementById("stockLength").value = "";
    document.getElementById("stockQuantity").value = "";
    document.getElementById("stockLength").focus();
  }

  /**
   * Xóa stock
   */
  deleteStock(index) {
    this.stocks.splice(index, 1);
    this.renderStocks();
  }

  /**
   * Render danh sách stocks
   */
  renderStocks() {
    const container = document.getElementById("stockList");

    if (this.stocks.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = this.stocks
      .map(
        (stock, index) => `
            <div class="item-row">
                <div class="item-info">
                    <strong>${stock.length}mm</strong> × ${stock.quantity} thanh
                </div>
                <button class="item-delete" onclick="app.deleteStock(${index})">Xóa</button>
            </div>
        `,
      )
      .join("");
  }

  /**
   * Tính toán
   */
  async calculate() {
    // Validate
    if (this.items.length === 0) {
      alert("Vui lòng nhập danh sách chi tiết");
      return;
    }

    // Cập nhật config
    this.updateConfig();

    // Validate config
    if (this.config.minLength >= this.config.maxLength) {
      alert("Min phải nhỏ hơn Max");
      return;
    }

    // Show loading
    this.showLoading(true);

    try {
      // Delay nhỏ để UI update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Tính toán
      const result = this.optimizer.optimize(
        this.items,
        this.config,
        this.stocks,
      );
      this.currentResult = result;

      // Lưu vào lịch sử
      this.storage.saveToHistory(result);

      // Render kết quả
      this.renderResults(result);

      // Enable export buttons
      document.getElementById("btnExportExcel").disabled = false;
      document.getElementById("btnPrint").disabled = false;
    } catch (error) {
      console.error("Lỗi khi tính toán:", error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Hiển thị loading
   */
  showLoading(show) {
    document.getElementById("loadingOverlay").style.display = show
      ? "flex"
      : "none";
  }

  /**
   * Render kết quả
   */
  renderResults(result) {
    // Ẩn empty state
    document.querySelector(".empty-state").style.display = "none";

    // Render sơ đồ cắt
    this.renderCuttingDiagram(result.stocks);

    // Render bảng tổng hợp
    this.renderSummaryTable(result.summary);

    // Render thống kê
    this.renderStats(result);

    // Render warnings
    this.renderWarnings(result.warnings);
  }

  /**
   * Render sơ đồ cắt (đã gộp các thanh giống nhau)
   */
  renderCuttingDiagram(stocks) {
    const container = document.getElementById("cuttingDiagram");
    container.style.display = "block";

    // Gộp các thanh giống nhau
    const groupedStocks = [];
    stocks.forEach((stock, originalIndex) => {
      // Key để so sánh: chiều dài + danh sách cắt + loại (tồn kho/mới)
      // JSON.stringify mảng cuts là cách đơn giản nhất để so sánh nội dung
      const matchDetails = JSON.stringify(stock.cuts);

      const existingGroup = groupedStocks.find(
        (g) =>
          g.stock.length === stock.length &&
          JSON.stringify(g.stock.cuts) === matchDetails &&
          g.stock.isExisting === stock.isExisting,
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

    container.innerHTML = groupedStocks
      .map((group) => {
        const stock = group.stock;
        const usedLength = stock.cuts.reduce((sum, cut) => sum + cut, 0);
        const usedPercent = (usedLength / stock.length) * 100;
        const wastePercent = (stock.remaining / stock.length) * 100;

        // Tạo label tiêu đề (VD: Thanh #1 - #5 (5 thanh))
        let headerLabel = `Thanh #${group.indices[0]}`;
        if (group.count > 1) {
          const lastIndex = group.indices[group.indices.length - 1];
          headerLabel = `Thanh #${group.indices[0]} ➝ #${lastIndex}`;
        }

        let html = `
                <div class="stock-item">
                    <div class="stock-header">
                        <span class="stock-index">${headerLabel}</span>
                        ${group.count > 1 ? `<span class="stock-count-badge">${group.count} thanh</span>` : ""}
                        <span class="stock-specs">
                            ${stock.length}mm 
                            ${stock.isExisting ? "(Tồn kho)" : ""}
                            - Phế liệu: ${stock.remaining.toFixed(1)}mm
                        </span>
                    </div>
                    <div class="stock-bar">
            `;

        let currentPos = 0;
        stock.cuts.forEach((cut, cutIndex) => {
          const cutPercent = (cut / stock.length) * 100;
          html += `
                    <div class="cut-segment" style="left: ${currentPos}%; width: ${cutPercent}%">
                        ${cut}mm
                    </div>
                `;
          currentPos += cutPercent;
        });

        if (stock.remaining > 0) {
          html += `
                    <div class="waste-segment" style="width: ${wastePercent}%"></div>
                `;
        }

        html += `
                    </div>
                </div>
            `;

        return html;
      })
      .join("");
  }

  /**
   * Render bảng tổng hợp
   */
  renderSummaryTable(summary) {
    const container = document.getElementById("summaryTable");
    container.style.display = "block";

    container.innerHTML = `
            <h3>📋 Tổng hợp đặt hàng</h3>
            <table>
                <thead>
                    <tr>
                        <th>Kích thước (mm)</th>
                        <th>Số lượng</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary
                      .map(
                        (item) => `
                        <tr>
                            <td><strong>${item.length}mm</strong></td>
                            <td>${item.quantity} thanh</td>
                            <td>${item.isExisting ? "🏪 Tồn kho" : "🆕 Đặt mới"}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  }

  /**
   * Render thống kê
   */
  renderStats(result) {
    document.getElementById("efficiency").textContent = `${result.efficiency}%`;
    document.getElementById("totalStocks").textContent =
      `${result.totalStocks} thanh`;
    document.getElementById("totalWaste").textContent =
      `${result.totalWaste.toFixed(0)} mm`;
    document.getElementById("optimalLength").textContent = result.optimalLength
      ? `${result.optimalLength} mm`
      : "N/A";
  }

  /**
   * Render warnings
   */
  renderWarnings(warnings) {
    const container = document.getElementById("warningsArea");

    if (!warnings || warnings.length === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "block";
    container.innerHTML = `
            <h4>⚠️ Cảnh báo</h4>
            ${warnings
              .map(
                (warning) => `
                <div class="warning-item">
                    <span>${warning.type === "warning" ? "⚠️" : "ℹ️"}</span>
                    <span>${warning.message}</span>
                </div>
            `,
              )
              .join("")}
        `;
  }

  /**
   * Xuất Excel
   */
  exportExcel() {
    if (!this.currentResult) {
      alert("Chưa có kết quả để xuất");
      return;
    }

    this.exporter.exportExcel(this.currentResult);
  }

  /**
   * In ấn
   */
  printResults() {
    if (!this.currentResult) {
      alert("Chưa có kết quả để in");
      return;
    }

    this.exporter.printResults();
  }

  /**
   * Xóa tất cả
   */
  clearAll() {
    if (!confirm("Bạn có chắc muốn xóa tất cả dữ liệu?")) {
      return;
    }

    this.items = [];
    this.stocks = [];
    this.currentResult = null;

    this.renderItems();
    this.renderStocks();

    // Reset result area
    document.querySelector(".empty-state").style.display = "block";
    document.getElementById("cuttingDiagram").style.display = "none";
    document.getElementById("summaryTable").style.display = "none";
    document.getElementById("warningsArea").style.display = "none";

    // Reset stats
    document.getElementById("efficiency").textContent = "--%";
    document.getElementById("totalStocks").textContent = "--";
    document.getElementById("totalWaste").textContent = "-- mm";
    document.getElementById("optimalLength").textContent = "-- mm";

    // Disable export buttons
    document.getElementById("btnExportExcel").disabled = true;
    document.getElementById("btnPrint").disabled = true;

    // Clear storage
    this.storage.clearData();
  }
}

// Khởi tạo app khi DOM ready
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new App();
  app.init();
});
