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

    // === ACTION BUTTONS ===
    document.getElementById("btnClearItems").addEventListener("click", () => {
      if (confirm("Bạn có chắc muốn xóa toàn bộ danh sách chi tiết không?")) {
        this.items = [];
        this.renderItems();
      }
    });

    document.getElementById("btnSaveTemplate").addEventListener("click", () => {
      if (this.items.length === 0) {
        alert("Danh sách trống, không có gì để lưu.");
        return;
      }
      const name = prompt("Đặt tên cho danh sách mẫu này:", "Mẫu 01");
      if (name) {
        this.storage.saveTemplate(name, this.items);
        alert("✅ Đã lưu mẫu thành công! (Tính năng load mẫu sẽ cập nhật sau)");
      }
    });

    // === IMPORT EVENTS ===
    const modal = document.getElementById("importModal");
    const btnImport = document.getElementById("btnImport");
    const closeBtn = document.querySelector(".close-modal");

    // Mở modal
    btnImport.onclick = () => {
      modal.classList.add("active");
      document.getElementById("pasteArea").focus();
    };

    // Đóng modal
    closeBtn.onclick = () => modal.classList.remove("active");
    window.onclick = (e) => {
      if (e.target == modal) modal.classList.remove("active");
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
          .forEach((c) => c.classList.remove("active"));

        // Set active
        btn.classList.add("active");
        const tabId = btn.getAttribute("data-tab");
        const targetId = tabId === "paste" ? "tabPaste" : "tabFile";
        document.getElementById(targetId).classList.add("active");
      });
    });

    // Process Paste
    document.getElementById("btnProcessPaste").addEventListener("click", () => {
      const text = document.getElementById("pasteArea").value;
      this.processImportText(text);
      modal.classList.remove("active");
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
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => this.updateConfig());
      }
    });
  }

  /**
   * Xử lý import chung (Text hoặc File)
   */
  async processImportData(newItems) {
    if (newItems.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;
    const duplicates = [];

    // Phân loại items: Mới hoàn toàn hay Trùng lặp
    newItems.forEach((newItem) => {
      const existingItem = this.items.find((i) => i.length === newItem.length);
      if (existingItem) {
        duplicates.push({ newItem, existingItem });
      } else {
        this.items.push(newItem);
        addedCount++;
      }
    });

    // Xử lý trùng lặp
    if (duplicates.length > 0) {
      // Hỏi user: Cộng dồn hay Giữ nguyên?
      // (Để đơn giản và nhanh, ta hỏi 1 lần cho tất cả thay vì từng cái)
      const shouldMerge = confirm(
        `Phát hiện ${duplicates.length} mục có kích thước trùng lặp.\n\n` +
          `Bạn có muốn CỘNG DỒN số lượng vào các mục cũ không?\n` +
          `(Nhấn OK để Cộng Dồn, Cancel để Bỏ Qua hoặc Nhập Mới dòng riêng)`,
      );

      if (shouldMerge) {
        duplicates.forEach(({ newItem, existingItem }) => {
          existingItem.quantity += newItem.quantity;
          updatedCount++;
        });
      } else {
        // Nếu user không muốn cộng dồn, hỏi tiếp: Nhập thành dòng mới hay Bỏ qua?
        const shouldAddNew = confirm(
          `Bạn đã chọn không cộng dồn.\n` +
            `Vậy bạn có muốn nhập chúng thành các dòng MỚI riêng biệt không?\n` +
            `(OK: Nhập mới, Cancel: Bỏ qua)`,
        );

        if (shouldAddNew) {
          duplicates.forEach(({ newItem }) => {
            this.items.push(newItem);
            addedCount++;
          });
        }
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      this.renderItems();
      alert(
        `Đã hoàn tất!\n- Thêm mới: ${addedCount}\n- Cập nhật số lượng: ${updatedCount}`,
      );
      document.getElementById("importModal").classList.remove("active");
      document.getElementById("pasteArea").value = "";
    } else {
      alert("Không có thay đổi nào được thực hiện.");
    }
  }

  /**
   * Xử lý text paste từ clipboard/excel
   */
  processImportText(text) {
    if (!text || !text.trim()) return;

    const lines = text.trim().split(/\r?\n/);
    const newItems = [];

    lines.forEach((line) => {
      const parts = line.trim().split(/[\t,;|\s]+/);
      const numbers = parts
        .filter((p) => !isNaN(parseFloat(p)) && isFinite(p))
        .map(Number);

      if (numbers.length >= 2) {
        const length = numbers[0];
        const quantity = numbers[1];
        if (length > 0 && quantity > 0) {
          newItems.push({ length, quantity });
        }
      }
    });

    this.processImportData(newItems);
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
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const newItems = [];
      jsonData.forEach((row) => {
        const numbers = row.filter((cell) => typeof cell === "number");
        if (numbers.length >= 2) {
          const length = numbers[0];
          const quantity = numbers[1];
          if (length > 0 && quantity > 0) {
            newItems.push({ length, quantity });
          }
        }
      });

      this.processImportData(newItems);
    };
    reader.readAsArrayBuffer(file);
  }

  /**
   * Chỉnh sửa item
   */
  editItem(index) {
    if (index < 0 || index >= this.items.length) return;
    const item = this.items[index];

    // Prompt Length
    let newLength = prompt(
      `Sửa Chiều Dài (hiện tại: ${item.length}mm):`,
      item.length,
    );
    if (newLength === null) return; // User cancel entire operation
    if (newLength.trim() === "") newLength = item.length; // Keep old if empty

    // Prompt Quantity
    let newQuantity = prompt(
      `Sửa Số Lượng (hiện tại: ${item.quantity} thanh):`,
      item.quantity,
    );
    if (newQuantity === null) return; // User cancel
    if (newQuantity.trim() === "") newQuantity = item.quantity; // Keep old if empty

    const l = parseFloat(newLength);
    const q = parseInt(newQuantity);

    if (!l || !q || l <= 0 || q <= 0) {
      alert("Giá trị không hợp lệ! Vui lòng nhập số dương.");
      return;
    }

    this.items[index] = { length: l, quantity: q };
    this.renderItems();
  }

  /**
   * Cập nhật config từ UI
   */
  updateConfig() {
    this.config.kerf = parseFloat(document.getElementById("kerf")?.value) || 5;
    this.config.maxWaste =
      parseFloat(document.getElementById("maxWaste")?.value) || 500;
    this.config.minLength =
      parseFloat(document.getElementById("minLength")?.value) || 3500;
    this.config.maxLength =
      parseFloat(document.getElementById("maxLength")?.value) || 6000;
    this.config.stepSize =
      parseFloat(document.getElementById("stepSize")?.value) || 100;
  }

  /**
   * Cập nhật UI config
   */
  updateConfigUI() {
    if (document.getElementById("kerf"))
      document.getElementById("kerf").value = this.config.kerf;
    if (document.getElementById("maxWaste"))
      document.getElementById("maxWaste").value = this.config.maxWaste;
    if (document.getElementById("minLength"))
      document.getElementById("minLength").value = this.config.minLength;
    if (document.getElementById("maxLength"))
      document.getElementById("maxLength").value = this.config.maxLength;
    if (document.getElementById("stepSize"))
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
      container.innerHTML = `<div class="empty-list" style="padding: 2rem; text-align: center; color: var(--text-muted); font-style: italic;">Chưa có chi tiết nào</div>`;
      return;
    }

    container.innerHTML = this.items
      .map(
        (item, index) => `
        <div class="item-row">
            <div class="item-info">
                <strong>${item.length}mm</strong> × ${item.quantity} thanh
            </div>
            <div class="item-actions">
                <button class="item-btn item-edit" onclick="app.editItem(${index})" title="Sửa">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="item-btn item-delete" onclick="app.deleteItem(${index})" title="Xóa">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>
    `,
      )
      .join("");
  }

  /**
   * Render danh sách stocks (tồn kho)
   */
  renderStocks() {
    const container = document.getElementById("stockList");
    if (this.stocks.length === 0) {
      container.innerHTML = ``;
      return;
    }

    container.innerHTML = this.stocks
      .map(
        (stock, index) => `
        <div class="item-row">
            <div class="item-info">
                <strong>${stock.length}mm</strong> × ${stock.quantity} thanh
            </div>
            <div class="item-actions">
                <button class="item-btn item-edit" onclick="app.editStock(${index})" title="Sửa">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="item-btn item-delete" onclick="app.deleteStock(${index})" title="Xóa">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>
    `,
      )
      .join("");
  }

  /**
   * Chỉnh sửa stock
   */
  editStock(index) {
    if (index < 0 || index >= this.stocks.length) return;
    const stock = this.stocks[index];

    let newLength = prompt(
      `Sửa Chiều Dài Stock (hiện tại: ${stock.length}mm):`,
      stock.length,
    );
    if (newLength === null) return;
    if (newLength.trim() === "") newLength = stock.length;

    let newQuantity = prompt(
      `Sửa Số Lượng Stock (hiện tại: ${stock.quantity} thanh):`,
      stock.quantity,
    );
    if (newQuantity === null) return;
    if (newQuantity.trim() === "") newQuantity = stock.quantity;

    const l = parseFloat(newLength);
    const q = parseInt(newQuantity);

    if (!l || !q || l <= 0 || q <= 0) {
      alert("Giá trị không hợp lệ!");
      return;
    }

    this.stocks[index] = { ...stock, length: l, quantity: q };
    this.renderStocks();
    this.updateConfig(); // Save if specific logic needs
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
        const efficiency = ((usedLength / stock.length) * 100).toFixed(1);

        // Tạo label tiêu đề
        let headerLabel = `Thanh #${group.indices[0]}`;
        if (group.count > 1) {
          const lastIndex = group.indices[group.indices.length - 1];
          headerLabel = `Thanh #${group.indices[0]} – #${lastIndex}`;
        }

        let html = `
                <div class="stock-item">
                    <div class="stock-header">
                        <h4>${headerLabel} ${group.count > 1 ? `(${group.count} thanh)` : ""}</h4>
                        <div class="stock-usage">
                            ${stock.length}mm ${stock.isExisting ? "• Tồn kho" : ""} 
                            <span style="color: var(--primary); margin-left: 8px;">Dùng: ${usedLength}mm (${efficiency}%)</span>
                        </div>
                    </div>
                    <div class="stock-bar">
            `;

        // Tạo màu ngẫu nhiên nhưng cố định cho từng loại kích thước
        const getColorClass = (len) => {
          const hash = String(len)
            .split("")
            .reduce((a, b) => {
              a = (a << 5) - a + b.charCodeAt(0);
              return a & a;
            }, 0);
          return `segment-color-${Math.abs(hash) % 10}`;
        };

        stock.cuts.forEach((cut) => {
          const cutPercent = (cut / stock.length) * 100;
          const colorClass = getColorClass(cut);
          html += `
                    <div class="cut-segment ${colorClass}" style="width: ${cutPercent}%" title="Kích thước: ${cut}mm">
                        ${cutPercent > 5 ? cut : ""}
                    </div>
                `;
        });

        if (stock.remaining > 0) {
          const wastePercent = (stock.remaining / stock.length) * 100;
          html += `
                    <div class="waste-segment" style="width: ${wastePercent}%" title="Phế liệu: ${stock.remaining.toFixed(1)}mm">
                        ${wastePercent > 8 ? stock.remaining.toFixed(0) : ""}
                    </div>
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
    const statsArea = document.getElementById("statsArea");
    statsArea.innerHTML = `
        <div class="stat-card primary">
            <div class="stat-label">Hiệu suất</div>
            <div class="stat-value">${result.efficiency}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Tổng thanh nhôm</div>
            <div class="stat-value">${result.totalStocks}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Tổng phế liệu</div>
            <div class="stat-value">${result.totalWaste.toFixed(0)}mm</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Kích thước tối ưu</div>
            <div class="stat-value">${result.optimalLength || "N/A"}mm</div>
        </div>
    `;
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

    this.exporter.exportToExcel(this.items, this.currentResult);
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
   * Xử lý xóa tất cả
   */
  clearAll() {
    if (!confirm("Bạn có chắc muốn xóa TOÀN BỘ dữ liệu (bao gồm cả Tồn kho)?"))
      return;

    this.items = [];
    this.stocks = [];
    this.currentResult = null;

    this.renderItems();
    this.renderStocks();

    // Reset result area
    if (document.querySelector(".empty-state"))
      document.querySelector(".empty-state").style.display = "block";
    if (document.getElementById("cuttingDiagram"))
      document.getElementById("cuttingDiagram").style.display = "none";
    if (document.getElementById("summaryTable"))
      document.getElementById("summaryTable").style.display = "none";
    if (document.getElementById("warningsArea"))
      document.getElementById("warningsArea").style.display = "none";

    // Reset stats
    const statsArea = document.getElementById("statsArea");
    if (statsArea) statsArea.innerHTML = "";

    // Disable export buttons
    if (document.getElementById("btnExportExcel"))
      document.getElementById("btnExportExcel").disabled = true;
    if (document.getElementById("btnPrint"))
      document.getElementById("btnPrint").disabled = true;

    // Clear storage
    this.storage.clearData();
  }
}

// Khởi tạo ứng dụng
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  window.app = app;
  app.init();
});
