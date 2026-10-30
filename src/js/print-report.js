function printTable(headers,rows){return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(value=>`<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function printCutBar(pattern){
  const width=680,height=42,total=pattern.length;let x=0;
  const kerf=Math.max(0,total-pattern.cuts.reduce((s,l)=>s+l,0)-pattern.remaining-(pattern.allowance||0))/Math.max(1,pattern.cuts.length-1);
  const segments=pattern.cuts.map((length,index)=>{const gap=index?width*kerf/total:0;const gapRect=gap?`<rect x="${x}" y="1" width="${gap}" height="${height-2}" fill="black"/>`:'';x+=gap;const w=width*length/total,rect=`<rect x="${x}" y="1" width="${w}" height="${height-2}" fill="white" stroke="black" stroke-width="1"/>${w>48?`<text x="${x+w/2}" y="26" text-anchor="middle" font-size="13" fill="black">${mm(length)}</text>`:''}`;x+=w;return gapRect+rect;}).join('');
  return `<svg class="print-bar" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sơ đồ ${pattern.id}">${segments}${x<width?`<rect x="${x}" y="1" width="${width-x}" height="${height-2}" fill="white" stroke="black" stroke-dasharray="3 3"/>`:''}</svg>`;
}
function buildPrintReport(result,items){
  const input=new Map();(result.inputItems||items).forEach(i=>input.set(i.length,(input.get(i.length)||0)+i.quantity));
  const date=new Date().toLocaleString('vi-VN'),mode={custom:'Đặt phôi theo mẫu ghép',fixed:'Phôi cố định',standard:'Phôi theo khoảng'}[result.config.stockMode];
  const warnings=result.warnings.filter(w=>w.patternId);
  return `<header class="print-title"><div><h1>PHIẾU SẢN XUẤT & CẮT THANH</h1><p>GopKichThuoc · ${date}</p></div><div>${mode}<br><strong>Đơn vị: mm</strong></div></header>
  <div class="print-totals"><span>Chi tiết: <b>${result.totalItems}</b></span><span>Mẫu cắt: <b>${result.patterns.length}</b></span><span>Phôi mới: <b>${result.newStocks} thanh</b></span><span>Dư: <b>${mm(result.totalWaste)} mm</b></span></div>
  <h2>1. KÍCH THƯỚC KHÁCH YÊU CẦU</h2>${printTable(['STT','Chiều dài (mm)','Số lượng chi tiết','Tổng dài (m)'],[...[...input].sort((a,b)=>b[0]-a[0]).map(([l,q],i)=>[i+1,mm(l),q,mm(l*q/1000)]),['','TỔNG',result.totalItems,mm(result.totalUsed/1000)]])}
  <h2>2. ĐẶT PHÔI NHÀ MÁY</h2>${printTable(['Chiều dài phôi (mm)','Số thanh','Mã mẫu cắt'],result.summary.filter(s=>!s.isExisting).sort((a,b)=>a.length-b.length).map(s=>[mm(s.length),s.quantity,result.patterns.filter(p=>!p.isExisting&&p.length===s.length).map(p=>p.id).join(', ')]))}
  ${result.summary.some(s=>s.isExisting)?`<h3>Thanh lấy từ tồn kho</h3>${printTable(['Chiều dài (mm)','Số thanh'],result.summary.filter(s=>s.isExisting).map(s=>[mm(s.length),s.quantity]))}`:''}
  <p class="print-config">Mạch cắt giữa các đoạn: <b>${mm(result.config.kerf)} mm</b>. Dự phòng/phôi mới: <b>${mm(result.config.stockMode==='standard'?0:result.config.endAllowance||0)} mm</b>. Ngưỡng cảnh báo dư: <b>${mm(result.config.maxWaste)} mm/thanh</b>.</p>
  ${warnings.length?`<h3>Các mẫu cần kiểm tra đoạn dư</h3>${printTable(['Mẫu','Số thanh','Dư / thanh (mm)','Dư (% phôi)'],warnings.map(w=>[w.patternId,w.count,mm(w.remaining),w.percent.toFixed(1)+'%']))}`:'<p>Không có mẫu vượt ngưỡng cảnh báo dư.</p>'}
  <section class="print-patterns"><h2>3. HƯỚNG DẪN CẮT TẠI XƯỞNG</h2><p>Lặp đúng số thanh ghi trên từng mẫu. Bảng “mỗi thanh” là số chi tiết cần cắt từ một phôi.</p>
  ${result.patterns.map(p=>`<article class="print-pattern"><div class="print-pattern-title"><h3>${p.id} · PHÔI ${mm(p.length)} mm</h3><strong>LẶP ${p.count} THANH</strong></div><p class="print-recipe">${patternRecipe(p.cuts).map(([l,n])=>`${mm(l)} mm × ${n}`).join(' + ')}</p>${printCutBar(p)}${printTable(['Chiều dài (mm)','Chi tiết / mỗi thanh','Chi tiết / cả mẫu'],patternRecipe(p.cuts).map(([l,n])=>[mm(l),n,n*p.count]))}<div class="print-pattern-footer"><span>${p.isExisting?'Nguồn: tồn kho':'Nguồn: đặt mới'}</span><span>Dư / thanh: <b>${mm(p.remaining)} mm</b></span><span>Dự phòng: ${mm(p.allowance||0)} mm</span></div></article>`).join('')}</section>`;
}
App.prototype.preparePrintReport=function(){
  const target=document.getElementById('printReport');
  target.innerHTML=this.currentResult?buildPrintReport(this.currentResult,this.items):'<h1>Chưa có phiếu cắt</h1><p>Hãy tạo phương án cắt trước khi in.</p>';
};
App.prototype.printResults=function(){if(!this.currentResult){this.notify('Tạo phương án cắt trước khi in.',true);return;}this.preparePrintReport();window.print();};
const setupPrintReport=App.prototype.setupEventListeners;
App.prototype.setupEventListeners=function(){setupPrintReport.call(this);window.addEventListener('beforeprint',()=>this.preparePrintReport());};
