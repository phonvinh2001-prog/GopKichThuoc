function escapeCell(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parseImportRows(rows,lengthColumn,quantityColumn,skipHeader){
  const valid=[],errors=[];
  rows.forEach((row,i)=>{
    if(skipHeader&&i===0 || row.every(v=>String(v??'').trim()===''))return;
    const raw=String(row[lengthColumn]??'').trim(),qraw=String(row[quantityColumn]??'').trim();
    const length=Number(raw.replace(',','.')),quantity=Number(qraw);
    if(!raw||!qraw||!Number.isFinite(length)||length<=0||!Number.isSafeInteger(quantity)||quantity<=0)errors.push(i+1);
    else valid.push({length,quantity});
  });return {valid,errors};
}
App.prototype.notify=function(message,error=false){const el=document.getElementById('notice');el.textContent=message;el.className=error?'notice error':'notice';};
App.prototype.snapshot=function(){this.undoData=JSON.stringify({items:this.items,stocks:this.stocks});document.getElementById('btnUndo').disabled=false;};
App.prototype.persist=function(){const ok=this.storage.saveData(this.getCurrentData());document.getElementById('saveStatus').textContent=ok?'Đã lưu trên trình duyệt':'Chưa lưu được — hãy giữ trang mở';return ok;};
App.prototype.renderEntryTable=function(kind){
  this.invalidateResult();
  const rows=this[kind],id=kind==='items'?'itemsList':'stockList';
  document.getElementById(id).innerHTML=rows.length?`<table class="entry-table"><thead><tr><th>#</th><th>Chiều dài (mm)</th><th>${kind==='items'?'Số chi tiết':'Số thanh'}</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td>${['length','quantity'].map(key=>`<td><input aria-label="${key==='length'?'Chiều dài':'Số lượng'} dòng ${i+1}" type="number" min="${key==='length'?'0.001':'1'}" step="${key==='length'?'any':'1'}" value="${r[key]}" onchange="app.changeCell('${kind}',${i},'${key}',this)"></td>`).join('')}<td><button class="text-btn danger" aria-label="Xóa dòng ${i+1}" onclick="app.removeRow('${kind}',${i})">×</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty-input">Chưa có dữ liệu. Nhập từng dòng hoặc dán từ Excel.</div>';
  document.getElementById('inputSummary').textContent=`${this.items.length} dòng · ${this.items.reduce((s,r)=>s+r.quantity,0)} chi tiết · ${(this.items.reduce((s,r)=>s+r.length*r.quantity,0)/1000).toLocaleString('vi-VN',{maximumFractionDigits:2})} m`;
  document.getElementById('stockCount').textContent=`(${this.stocks.reduce((s,r)=>s+r.quantity,0)} thanh)`;
};
App.prototype.renderItems=function(){this.renderEntryTable('items');};
App.prototype.renderStocks=function(){this.renderEntryTable('stocks');};
App.prototype.changeCell=function(kind,i,key,input){const value=Number(input.value);if(!input.value||!Number.isFinite(value)||value<=0||(key==='quantity'&&!Number.isSafeInteger(value))){input.value=this[kind][i][key];this.notify('Chiều dài phải dương, số lượng phải là số nguyên dương.',true);return;}this.snapshot();this[kind][i][key]=value;this.invalidateResult();document.getElementById('inputSummary').textContent=`${this.items.length} dòng · ${this.items.reduce((s,r)=>s+r.quantity,0)} chi tiết · ${(this.items.reduce((s,r)=>s+r.length*r.quantity,0)/1000).toLocaleString('vi-VN',{maximumFractionDigits:2})} m`;document.getElementById('stockCount').textContent=`(${this.stocks.reduce((s,r)=>s+r.quantity,0)} thanh)`;this.persist();};
App.prototype.removeRow=function(kind,i){this.snapshot();this[kind].splice(i,1);this.renderEntryTable(kind);this.persist();};
App.prototype.addEntry=function(kind){const prefix=kind==='items'?'item':'stock',length=Number(document.getElementById(prefix+'Length').value),quantity=Number(document.getElementById(prefix+'Quantity').value);
  if(!Number.isFinite(length)||length<=0||!Number.isSafeInteger(quantity)||quantity<=0){this.notify('Nhập chiều dài dương và số lượng nguyên dương.',true);return;}
  this.snapshot();const match=this[kind].find(r=>r.length===length);if(match)match.quantity+=quantity;else this[kind].push({length,quantity});this.renderEntryTable(kind);this.persist();this.notify(`Đã ${match?'cộng dồn':'thêm'} ${quantity} ${kind==='items'?'chi tiết':'thanh'} dài ${length} mm.`);document.getElementById(prefix+'Length').value='';document.getElementById(prefix+'Length').focus();
};
App.prototype.addItem=function(){this.addEntry('items');};App.prototype.addStock=function(){this.addEntry('stocks');};
App.prototype.prepareImport=function(rows){
  this.importRows=rows;const cols=Math.max(2,...rows.map(r=>r.length));
  if(cols>100||rows.length>20000){this.notify('File quá lớn. Tối đa 100 cột và 20.000 dòng.',true);this.importRows=null;return;}
  document.getElementById('importPreview').hidden=false;
  for(const id of ['lengthColumn','quantityColumn'])document.getElementById(id).innerHTML=Array.from({length:cols},(_,i)=>`<option value="${i}">Cột ${i+1} · ${escapeCell(rows[0]?.[i]??'')}</option>`).join('');
  document.getElementById('quantityColumn').value='1';
  const first=rows.find(r=>r.some(v=>String(v??'').trim()));document.getElementById('skipHeader').checked=first?(!Number.isFinite(Number(first[0]))||!Number.isFinite(Number(first[1]))):false;
  this.previewImport();
};
App.prototype.processImportText=function(text){
  const rows=text.trim().split(/\r?\n/).map(line=>line.includes('\t')?line.split('\t'):line.includes(';')?line.split(';'):line.trim().split(/[,\s]+/));this.prepareImport(rows);
};
App.prototype.processImportFile=function(file){
  if(file.size>10*1024*1024){this.notify('File tối đa 10 MB.',true);return;}
  const reader=new FileReader();reader.onerror=()=>this.notify('Không đọc được file.',true);
  reader.onload=e=>{try{if(typeof XLSX==='undefined')throw Error('Chưa tải thư viện Excel. Hãy dán hai cột từ Excel.');const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});this.prepareImport(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''}));}catch(error){this.notify(error.message,true);}};reader.readAsArrayBuffer(file);
};
App.prototype.previewImport=function(){
  if(!this.importRows)return;
  const l=Number(document.getElementById('lengthColumn').value),q=Number(document.getElementById('quantityColumn').value);
  const data=parseImportRows(this.importRows,l,q,document.getElementById('skipHeader').checked);this.pendingImport=data;
  const same=l===q;document.getElementById('commitImport').disabled=same||!data.valid.length||!!data.errors.length;
  document.getElementById('previewStatus').textContent=same?'Chọn hai cột khác nhau.':`${data.valid.length} dòng hợp lệ${data.errors.length?` · Sửa các dòng lỗi trong nguồn: ${data.errors.slice(0,20).join(', ')}. Chưa nhập dữ liệu.`:' · Sẵn sàng nhập.'}`;
  document.getElementById('previewTable').innerHTML=`<table><thead><tr><th>Chiều dài (mm)</th><th>Số lượng</th></tr></thead><tbody>${data.valid.slice(0,50).map(r=>`<tr><td>${r.length}</td><td>${r.quantity}</td></tr>`).join('')}</tbody></table>${data.valid.length>50?'<p>Hiển thị 50 dòng đầu.</p>':''}`;
};
const productionEvents=App.prototype.setupEventListeners;
App.prototype.setupEventListeners=function(){
  productionEvents.call(this);
  // Replace the old paste action: preview first, keep dialog open until committed.
  const old=document.getElementById('btnProcessPaste'),button=old.cloneNode(true);old.replaceWith(button);button.onclick=()=>this.processImportText(document.getElementById('pasteArea').value);
  for(const id of ['lengthColumn','quantityColumn','skipHeader'])document.getElementById(id).addEventListener('change',()=>this.previewImport());
  document.getElementById('commitImport').onclick=()=>{this.previewImport();if(document.getElementById('commitImport').disabled)return;this.snapshot();const mode=document.getElementById('importMode').value;this.applyImportedRows(this.pendingImport.valid,mode);this.persist();this.notify(`Đã nhập ${this.pendingImport.valid.length} dòng. Có thể hoàn tác.`);this.closeImport();};
  this.closeImport=()=>{document.getElementById('importModal').classList.remove('active');document.getElementById('btnImport').focus();};
  document.querySelector('.close-modal').onclick=()=>this.closeImport();
  document.getElementById('importModal').addEventListener('keydown',e=>{if(e.key==='Escape')this.closeImport();if(e.key==='Tab'){const nodes=[...document.getElementById('importModal').querySelectorAll('button,input,select,textarea')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  for(const prefix of ['item','stock']){document.getElementById(prefix+'Length').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();document.getElementById(prefix+'Quantity').focus();}},true);document.getElementById(prefix+'Quantity').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();this.addEntry(prefix==='item'?'items':'stocks');}});}
  // Remove legacy keypress handler that would submit before quantity entry.
  document.getElementById('itemLength').addEventListener('keypress',e=>{if(e.key==='Enter')e.stopImmediatePropagation();},true);
  document.getElementById('btnUndo').onclick=()=>{if(!this.undoData)return;const old=JSON.stringify({items:this.items,stocks:this.stocks});Object.assign(this,JSON.parse(this.undoData));this.undoData=old;this.renderItems();this.renderStocks();this.persist();this.notify('Đã hoàn tác. Nhấn lần nữa để làm lại.');};
  document.getElementById('btnSort').onclick=()=>{this.snapshot();this.items.sort((a,b)=>b.length-a.length);this.renderItems();this.persist();};
  const clear=document.getElementById('btnClearItems'),replacement=clear.cloneNode(true);clear.replaceWith(replacement);replacement.onclick=()=>{this.snapshot();this.items=[];this.renderItems();this.persist();this.notify('Đã xóa danh sách. Chọn Hoàn tác để khôi phục.');};
  const templates=()=>{const select=document.getElementById('templateSelect');select.innerHTML='<option value="">Chọn mẫu đã lưu…</option>';for(const name of Object.keys(this.storage.getTemplates())){const o=document.createElement('option');o.value=name;o.textContent=name;select.append(o);}};templates();
  const save=document.getElementById('btnSaveTemplate'),saveNew=save.cloneNode(true);save.replaceWith(saveNew);saveNew.onclick=()=>{if(readEntryDrafts(this.entryDrafts?.items||[]).errors.length)return this.notify('Hoàn tất các dòng đang nhập trước khi lưu mẫu.',true);if(!this.items.length)return this.notify('Thêm chi tiết trước khi lưu mẫu.',true);const name=prompt('Tên danh sách mẫu:');if(name?.trim()){if(this.storage.saveTemplate(name.trim(),this.items)){templates();this.notify('Đã lưu danh sách mẫu.');}else this.notify('Không lưu được mẫu. Kiểm tra dung lượng trình duyệt.',true);}};
  document.getElementById('loadTemplate').onclick=()=>{const name=document.getElementById('templateSelect').value,data=this.storage.getTemplates()[name];if(!Array.isArray(data))return;this.snapshot();this.items=JSON.parse(JSON.stringify(data));this.renderItems();this.persist();this.notify('Đã nạp mẫu. Có thể hoàn tác.');};
  const mode=()=>{const simple=document.getElementById('productionMode').value==='simple';document.getElementById('maxTypes').disabled=!simple;document.getElementById('modeHint').textContent=simple?'Đặt riêng: ưu tiên mẫu cùng chiều dài lặp nhiều, tính phôi theo mẫu; ghép phần lẻ trong giới hạn loại chi tiết.':'Ưu tiên giảm tổng chiều dài phôi; không giới hạn loại chi tiết/mẫu.';};mode();document.getElementById('productionMode').addEventListener('change',()=>{mode();syncStockModeUI();});
  for(const id of ['productionMode','maxTypes','maxStockTypes','stockMode','fixedLength','endAllowance','orderIncrement','mergeTolerance','kerf','maxWaste','minLength','maxLength','stepSize'])document.getElementById(id).addEventListener('change',()=>{this.updateConfig();this.persist();});
  window.addEventListener('beforeunload',()=>this.persist());
};

const renderProductionResult=App.prototype.renderResults;
App.prototype.renderResults=function(r){renderProductionResult.call(this,r);const el=document.getElementById('factoryOrder');el.hidden=false;el.innerHTML='<h3>Đặt phôi cho nhà máy</h3><table><thead><tr><th>Chiều dài đặt (mm)</th><th>Số thanh</th><th>Mẫu cắt tại xưởng</th></tr></thead><tbody>'+r.summary.filter(s=>!s.isExisting).sort((a,b)=>a.length-b.length).map(s=>'<tr><td>'+s.length+'</td><td>'+s.quantity+'</td><td>'+r.patterns.filter(g=>!g.isExisting&&g.length===s.length).map(g=>g.id).join(', ')+'</td></tr>').join('')+'</tbody></table>';};
const invalidateProduction=App.prototype.invalidateResult;
App.prototype.invalidateResult=function(){invalidateProduction.call(this);document.getElementById('factoryOrder').hidden=true;};

const setupCustomInputs=App.prototype.setupEventListeners;
function syncStockModeUI(){
  const mode=document.getElementById('stockMode').value,custom=mode==='custom',fixed=mode==='fixed';
  document.getElementById('fixedLengthField').hidden=!fixed;document.getElementById('fixedLength').disabled=!fixed;
  for(const id of ['minLength','maxLength','maxStockTypes'])document.getElementById(id).disabled=fixed;
  document.getElementById('stepSize').disabled=mode!=='standard';
  document.getElementById('endAllowance').disabled=mode==='standard';
  for(const id of ['orderIncrement','mergeTolerance'])document.getElementById(id).disabled=!custom;
  document.getElementById('modeHint').textContent=fixed?'Phôi mới dùng đúng chiều dài cố định. Trừ dư gia công trước khi xếp; giữ giới hạn loại chi tiết/mẫu và báo đoạn dư.':custom?'Tạo mẫu ghép trước, tính chiều dài phôi sau. Ưu tiên ít dư, mẫu lặp và cùng loại; mục tiêu số loại phôi chỉ cảnh báo.':'Chọn phôi trên lưới Min–Max theo bước phôi, giới hạn số loại phôi mới.';
}
App.prototype.setupEventListeners=function(){setupCustomInputs.call(this);syncStockModeUI();for(const event of ['input','change'])document.getElementById('stockMode').addEventListener(event,syncStockModeUI);};
