# Thuật toán Tối Ưu Hóa Cắt Nhôm

## Tổng quan

Hệ thống sử dụng thuật toán **First Fit Decreasing (FFD)** kết hợp với **Global Optimization** để tìm phương án cắt tối ưu nhất.

## Mục tiêu

Tìm kích thước phôi nhôm (hoặc kết hợp nhiều kích thước) sao cho:

1. **Hiệu suất cao nhất**: Tỷ lệ sử dụng / tổng chiều dài tối đa
2. **Phế liệu tối thiểu**: Giảm lãng phí
3. **Số lượng thanh ít nhất**: Giảm chi phí đặt hàng

## Thuật toán

### Bước 1: Preprocessing (Tiền xử lý)

```javascript
// Sắp xếp danh sách chi tiết từ dài → ngắn
items.sort((a, b) => b.length - a.length);
```

**Lý do**: Các chi tiết dài khó xếp hơn, nên ưu tiên xếp trước.

### Bước 2: Global Search (Tìm kiếm toàn cục)

```javascript
for (stockLength = minLength; stockLength <= maxLength; stockLength += step) {
  result = firstFitDecreasing(items, stockLength, kerf);
  if (result.efficiency > bestEfficiency) {
    bestResult = result;
    bestEfficiency = result.efficiency;
  }
}
```

**Lý do**: Thử tất cả kích thước trong khoảng cho phép để tìm phương án tốt nhất.

### Bước 3: First Fit Decreasing (FFD)

Với mỗi kích thước phôi:

```javascript
function firstFitDecreasing(items, stockLength, kerf) {
  stocks = []; // Danh sách thanh phôi

  for (item of items) {
    placed = false;

    // Thử xếp vào thanh hiện có
    for (stock of stocks) {
      if (stock.remainingSpace >= item.length + kerf) {
        stock.addItem(item);
        stock.remainingSpace -= item.length + kerf;
        placed = true;
        break;
      }
    }

    // Nếu không xếp được, tạo thanh mới
    if (!placed) {
      newStock = createStock(stockLength);
      newStock.addItem(item);
      newStock.remainingSpace -= item.length + kerf;
      stocks.push(newStock);
    }
  }

  return {
    stocks: stocks,
    totalUsed: calculateTotalUsed(stocks),
    totalLength: stocks.length * stockLength,
    efficiency: (totalUsed / totalLength) * 100,
    waste: totalLength - totalUsed,
  };
}
```

### Bước 4: Scoring (Đánh giá)

```javascript
efficiency = (Tổng chiều dài sử dụng / Tổng chiều dài phôi) × 100%

// Ví dụ:
// Sử dụng: 5400mm
// Tổng phôi: 6000mm
// Hiệu suất: 90%
```

### Bước 5: Multi-Stock Optimization (Nâng cao)

Thay vì chỉ dùng 1 kích thước, thử kết hợp 2-3 kích thước:

```javascript
// Ví dụ:
// Input: [2500mm × 5, 1000mm × 20, 600mm × 30]

// Phương án 1: Chỉ dùng 6000mm
// → 10 thanh, hiệu suất 85%

// Phương án 2: Kết hợp 5800mm + 4200mm
// → 5 thanh 5800mm (cho 2500mm)
// → 8 thanh 4200mm (cho 1000mm + 600mm)
// → Tổng 13 thanh, hiệu suất 92% ✅ TỐT HƠN
```

**Logic**:

1. Phân nhóm items theo kích thước (lớn, trung, nhỏ)
2. Với mỗi nhóm, tìm kích thước phôi tối ưu
3. Kết hợp các phương án

## Xử lý Edge Cases

### Case 1: Item dài hơn Max

```javascript
if (item.length > maxLength) {
  alert(
    `⚠️ Chi tiết ${item.length}mm dài hơn kích thước tối đa ${maxLength}mm!`,
  );
  // Gợi ý: Tăng Max hoặc chia nhỏ chi tiết
}
```

### Case 2: Phế liệu quá nhiều

```javascript
if (waste > maxWasteThreshold) {
  warning = `⚠️ Phế liệu ${waste}mm vượt ngưỡng ${maxWasteThreshold}mm`;
  // Gợi ý: Thử kích thước khác hoặc điều chỉnh step
}
```

### Case 3: Hiệu suất thấp

```javascript
if (efficiency < 80%) {
  warning = `⚠️ Hiệu suất chỉ ${efficiency}%, có thể chưa tối ưu`
  // Gợi ý: Thử Multi-Stock hoặc điều chỉnh khoảng tìm kiếm
}
```

## Ví dụ Minh họa

### Ví dụ 1: Đơn giản

**Input**:

- Danh sách: 800mm × 20 thanh
- Mạch cắt: 5mm
- Khoảng: 3500mm - 6000mm
- Bước: 100mm

**Quá trình**:

1. **Thử 3500mm**:
   - Thanh 1: 800 + 5 + 800 + 5 + 800 + 5 + 800 = 3215mm (dư 285mm)
   - Thanh 2-5: Tương tự
   - Tổng: 5 thanh, hiệu suất 91.4%

2. **Thử 3600mm**:
   - Thanh 1: 800 + 5 + 800 + 5 + 800 + 5 + 800 = 3215mm (dư 385mm)
   - Tổng: 5 thanh, hiệu suất 88.9%

3. **Thử 4000mm**:
   - Thanh 1: 800 + 5 + 800 + 5 + 800 + 5 + 800 + 5 + 800 = 4015mm (KHÔNG VỪA)
   - Thanh 1: 800 + 5 + 800 + 5 + 800 + 5 + 800 = 3215mm (dư 785mm)
   - Tổng: 5 thanh, hiệu suất 80%

**Kết quả**: Chọn **3500mm** (hiệu suất 91.4%)

### Ví dụ 2: Phức tạp (Multi-Stock)

**Input**:

- Danh sách:
  - 2500mm × 5
  - 1200mm × 10
  - 800mm × 15
  - 500mm × 20
- Mạch cắt: 5mm
- Khoảng: 3500mm - 6000mm

**Phương án 1: Chỉ dùng 6000mm**:

- Thanh 1: 2500 + 5 + 2500 = 5005mm (dư 995mm)
- Thanh 2: 2500 + 5 + 1200 + 5 + 1200 = 4910mm (dư 1090mm)
- ...
- Tổng: 15 thanh, hiệu suất 82%

**Phương án 2: Multi-Stock (5800mm + 4200mm)**:

- **Nhóm 1** (2500mm): Dùng 5800mm
  - Thanh 1: 2500 + 5 + 2500 = 5005mm (dư 795mm)
  - Thanh 2-3: Tương tự
  - Tổng: 3 thanh 5800mm
- **Nhóm 2** (1200mm, 800mm, 500mm): Dùng 4200mm
  - Thanh 1: 1200 + 5 + 1200 + 5 + 1200 + 5 + 500 = 4115mm (dư 85mm)
  - ...
  - Tổng: 10 thanh 4200mm

**Kết quả**: Phương án 2 hiệu suất 89% ✅ TỐT HƠN

## Độ phức tạp

- **Time Complexity**: O(n × m × k)
  - n: số lượng items
  - m: số lượng kích thước thử (max - min) / step
  - k: số lượng thanh phôi trung bình
- **Space Complexity**: O(n + k)

## Tối ưu hóa

1. **Early termination**: Dừng nếu đạt hiệu suất 95%+
2. **Caching**: Lưu kết quả đã tính
3. **Parallel search**: Thử nhiều kích thước song song (Web Workers)
