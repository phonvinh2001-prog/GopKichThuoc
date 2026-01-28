/**
 * StorageManager - Quản lý LocalStorage
 * Tự động lưu và khôi phục dữ liệu
 */

class StorageManager {
  constructor() {
    this.STORAGE_KEY = "aluminum_cutting_data";
    this.autoSaveInterval = null;
  }

  /**
   * Lưu dữ liệu vào LocalStorage
   */
  saveData(data) {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(this.STORAGE_KEY, jsonData);
      return true;
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu:", error);
      return false;
    }
  }

  /**
   * Đọc dữ liệu từ LocalStorage
   */
  loadData() {
    try {
      const jsonData = localStorage.getItem(this.STORAGE_KEY);
      if (jsonData) {
        return JSON.parse(jsonData);
      }
      return this.getDefaultData();
    } catch (error) {
      console.error("Lỗi khi đọc dữ liệu:", error);
      return this.getDefaultData();
    }
  }

  /**
   * Dữ liệu mặc định
   */
  getDefaultData() {
    return {
      items: [],
      stocks: [],
      config: {
        kerf: 5,
        maxWaste: 500,
        minLength: 3500,
        maxLength: 6000,
        stepSize: 100,
      },
      history: [],
    };
  }

  /**
   * Bắt đầu auto-save (mỗi 5 giây)
   */
  startAutoSave(getDataCallback) {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      const data = getDataCallback();
      this.saveData(data);
    }, 5000);
  }

  /**
   * Dừng auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Xóa tất cả dữ liệu
   */
  clearData() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu:", error);
      return false;
    }
  }

  /**
   * Lưu vào lịch sử
   */
  saveToHistory(result) {
    const data = this.loadData();

    const historyItem = {
      timestamp: new Date().toISOString(),
      efficiency: result.efficiency,
      totalStocks: result.totalStocks,
      optimalLength: result.optimalLength,
      totalWaste: result.totalWaste,
    };

    // Đảm bảo history luôn là array (fix lỗi unshift undefined)
    if (!data.history || !Array.isArray(data.history)) {
      data.history = [];
    }

    data.history.unshift(historyItem);

    // Giữ tối đa 10 lịch sử
    if (data.history.length > 10) {
      data.history = data.history.slice(0, 10);
    }

    this.saveData(data);
  }

  /**
   * Lấy lịch sử
   */
  getHistory() {
    const data = this.loadData();
    return data.history || [];
  }
}

// Export
window.StorageManager = StorageManager;
