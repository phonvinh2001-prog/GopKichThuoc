/**
 * StorageManager - Quản lý LocalStorage
 * Tự động lưu và khôi phục dữ liệu
 */

class StorageManager {
  constructor() {
    this.KEYS = {
      DATA: "cutting_opt_data",
      HISTORY: "cutting_opt_history",
      TEMPLATES: "cutting_opt_templates",
    };
    this.autoSaveInterval = null;
  }

  /**
   * Lưu dữ liệu vào LocalStorage
   */
  saveData(data) {
    try {
      const previous = this.loadData();
      const jsonData = JSON.stringify({ ...data, history: data.history || previous.history || [] });
      localStorage.setItem(this.KEYS.DATA, jsonData);
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
      const jsonData = localStorage.getItem(this.KEYS.DATA) ?? localStorage.getItem("undefined");
      if (jsonData) {
        const parsed=JSON.parse(jsonData);
        if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return this.getDefaultData();
        return {...this.getDefaultData(),...parsed,items:Array.isArray(parsed.items)?parsed.items:[],stocks:Array.isArray(parsed.stocks)?parsed.stocks:[],config:{...this.getDefaultData().config,...parsed.config}};
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
   * Lưu Template mẫu
   */
  saveTemplate(name, items) {
    try{const templates = this.getTemplates();
    Object.defineProperty(templates,name,{value:items,enumerable:true,configurable:true,writable:true});
    localStorage.setItem(this.KEYS.TEMPLATES, JSON.stringify(templates));return true;}catch(error){console.error('Không lưu được mẫu:',error);return false;}
  }

  /**
   * Lấy danh sách Templates
   */
  getTemplates() {
    try{const value=JSON.parse(localStorage.getItem(this.KEYS.TEMPLATES));return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
  }

  /**
   * Xóa tất cả dữ liệu
   */
  clearData() {
    try {
      localStorage.removeItem(this.KEYS.DATA);
      localStorage.removeItem("undefined");
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

