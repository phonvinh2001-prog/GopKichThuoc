/* Keyboard-first entry. Raw drafts are retained independently of valid optimizer input. */
function readEntryDrafts(rows){
  const valid=[],errors=[];
  rows.forEach((r,i)=>{
    const l=String(r.length??'').trim(),q=String(r.quantity??'').trim();
    if(!l&&!q)return;
    const length=Number(l.replace(',','.')),quantity=Number(q);
    if(!l||!q||!Number.isFinite(length)||length<=0||!Number.isSafeInteger(quantity)||quantity<=0)errors.push(i+1);
    else valid.push({length,quantity});
  });return {valid,errors};
}
function parseGridPaste(text){
  const lines=text.replace(/\r/g,'').trimEnd().split('\n');
  return lines.map(line=>line.includes('\t')?line.split('\t'):line.includes(';')?line.split(';'):line.trim().split(/\s+/));
}
const getEntryData=App.prototype.getCurrentData;
App.prototype.snapshot=function(){this.undoData=JSON.stringify({items:this.items,stocks:this.stocks,entryDrafts:this.entryDrafts});document.getElementById('btnUndo').disabled=false;};
App.prototype.getCurrentData=function(){return {...getEntryData.call(this),entryDrafts:this.entryDrafts};};
const loadEntryData=App.prototype.loadFromStorage;
App.prototype.loadFromStorage=function(){loadEntryData.call(this);const data=this.storage.loadData();this.restoredEntryDrafts=data.entryDrafts;};
App.prototype.entrySummary=function(){
  document.getElementById('inputSummary').textContent=`${this.items.length} dòng hợp lệ · ${this.items.reduce((s,r)=>s+r.quantity,0)} chi tiết · ${(this.items.reduce((s,r)=>s+r.length*r.quantity,0)/1000).toLocaleString('vi-VN',{maximumFractionDigits:2})} m`;
  document.getElementById('stockCount').textContent=`(${this.stocks.reduce((s,r)=>s+r.quantity,0)} thanh)`;
};
App.prototype.renderEntryTable=function(kind){
  this.invalidateResult();this.entryDrafts??={};
  const saved=this.restoredEntryDrafts?.[kind];
  this.entryDrafts[kind]=Array.isArray(saved)?saved.map(r=>({length:String(r.length??''),quantity:String(r.quantity??'')})):this[kind].map(r=>({length:String(r.length),quantity:String(r.quantity)}));
  if(this.restoredEntryDrafts)delete this.restoredEntryDrafts[kind];
  this.drawEntryGrid(kind);
};
App.prototype.drawEntryGrid=function(kind,focus){
  const rows=this.entryDrafts[kind];while(rows.length<3||rows.at(-1).length||rows.at(-1).quantity)rows.push({length:'',quantity:''});
  const id=kind==='items'?'itemsList':'stockList',errors=readEntryDrafts(rows).errors;
  document.getElementById(id).innerHTML=`<table class="entry-table keyboard-grid"><thead><tr><th>#</th><th>Chiều dài (mm)</th><th>${kind==='items'?'Số chi tiết':'Số thanh'}</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${errors.includes(i+1)?'draft-error':''}"><td>${i+1}</td>${['length','quantity'].map((key,col)=>`<td><input data-grid="${kind}" data-row="${i}" data-col="${col}" aria-label="${key==='length'?'Chiều dài':'Số lượng'} dòng ${i+1}" type="text" inputmode="${col?'numeric':'decimal'}" autocomplete="off" value="${escapeCell(r[key])}" placeholder="${i===0?(col?'Ví dụ 124':'Ví dụ 1500'):''}" oninput="app.gridInput('${kind}',${i},${col},this)" onkeydown="app.gridKey(event,'${kind}',${i},${col})" onpaste="app.gridPaste(event,'${kind}',${i},${col})"></td>`).join('')}<td><button class="text-btn danger" aria-label="Xóa dòng ${i+1}" onclick="app.gridDelete('${kind}',${i})" tabindex="-1">×</button></td></tr>`).join('')}</tbody></table><p class="grid-status" id="${kind}GridStatus" aria-live="polite">${errors.length?'Cần hoàn tất dòng '+errors.join(', '):'Tab / Enter để chuyển ô · Dán hai cột trực tiếp từ Excel'}</p>`;
  this.entrySummary();if(focus)this.focusGrid(kind,focus[0],focus[1]);
};
App.prototype.focusGrid=function(kind,row,col){const el=document.querySelector(`[data-grid="${kind}"][data-row="${row}"][data-col="${col}"]`);if(el){const details=el.closest('details');if(details)details.open=true;el.focus();el.select();}};
App.prototype.gridInput=function(kind,row,col,input){
  if(!this.gridEditing){this.snapshot();this.gridEditing=true;}
  this.entryDrafts[kind][row][col?'quantity':'length']=input.value;
  const parsed=readEntryDrafts(this.entryDrafts[kind]);this[kind]=parsed.valid;this.invalidateResult();this.entrySummary();this.persist();
  // Update the row without replacing focused inputs; keyboard navigation stays stable.
  input.closest('tr').classList.toggle('draft-error',parsed.errors.includes(row+1));
  document.getElementById(kind+'GridStatus').textContent=parsed.errors.length?'Cần hoàn tất dòng '+parsed.errors.join(', '):'Đã lưu · Tab / Enter để nhập tiếp';
};
App.prototype.gridKey=function(e,kind,row,col){
  if(!['Enter','Tab','ArrowUp','ArrowDown','Escape'].includes(e.key))return;
  if(e.key==='Escape'){e.target.blur();this.gridEditing=false;return;}
  let r=row,c=col;
  if(e.key==='ArrowUp')r=Math.max(0,row-1);
  else if(e.key==='ArrowDown')r=row+1;
  else if(e.shiftKey){if(col===1)c=0;else if(row>0){r=row-1;c=1;}else return;}
  else if(col===0)c=1;else {r=row+1;c=0;}
  e.preventDefault();this.gridEditing=false;
  while(this.entryDrafts[kind].length<=r)this.entryDrafts[kind].push({length:'',quantity:''});
  this.drawEntryGrid(kind,[r,c]);
};
App.prototype.gridDelete=function(kind,row){this.snapshot();this.entryDrafts[kind].splice(row,1);this[kind]=readEntryDrafts(this.entryDrafts[kind]).valid;this.gridEditing=false;this.invalidateResult();this.drawEntryGrid(kind,[Math.min(row,this.entryDrafts[kind].length),0]);this.persist();};
App.prototype.gridPaste=function(e,kind,row,col){
  const text=e.clipboardData.getData('text');
  if(!/[\t\n;]/.test(text))return;
  e.preventDefault();const cells=parseGridPaste(text);
  if(cells.length>20000||cells.some(r=>r.length>2-col)){this.notify('Dán tối đa 2 cột: chiều dài và số lượng. Có nhiều cột hơn, hãy dùng Nhập file để chọn cột.',true);return;}
  this.snapshot();const draft=this.entryDrafts[kind];
  cells.forEach((cells,i)=>{draft[row+i]??={length:'',quantity:''};cells.forEach((value,j)=>draft[row+i][col+j?'quantity':'length']=value.trim());});
  this[kind]=readEntryDrafts(draft).valid;this.gridEditing=false;this.invalidateResult();this.drawEntryGrid(kind,[row+cells.length-1,Math.min(1,col+cells[0].length-1)]);this.persist();
  this.notify(`Đã dán ${cells.length} dòng tại dòng ${row+1}. Ô được dán sẽ thay nội dung tại vị trí đó; dòng lỗi được giữ để sửa.`);
};
const calculateGrid=App.prototype.calculate;
App.prototype.calculate=function(){
  for(const kind of ['items','stocks']){const parsed=readEntryDrafts(this.entryDrafts?.[kind]||[]);if(parsed.errors.length){this.notify(`Hoàn tất ${kind==='items'?'chi tiết':'thanh tồn'} ở dòng ${parsed.errors.join(', ')} trước khi tính.`,true);this.focusGrid(kind,parsed.errors[0]-1,0);return;}this[kind]=parsed.valid;}
  return calculateGrid.call(this);
};
const setupGrid=App.prototype.setupEventListeners;
App.prototype.applyImportedRows=function(rows,mode){
  this.entryDrafts??={};const draft=mode==='replace'?[]:(this.entryDrafts.items||[]).filter(r=>String(r.length).trim()||String(r.quantity).trim()).map(r=>({...r}));
  for(const row of rows){const match=mode==='merge'&&draft.find(r=>readEntryDrafts([r]).valid.length&&Number(String(r.length).replace(',','.'))===row.length);if(match)match.quantity=String(Number(match.quantity)+row.quantity);else draft.push({length:String(row.length),quantity:String(row.quantity)});}
  this.entryDrafts.items=draft;this.items=readEntryDrafts(draft).valid;this.gridEditing=false;this.invalidateResult();this.drawEntryGrid('items');
};
App.prototype.setupEventListeners=function(){setupGrid.call(this);
  document.getElementById('btnUndo').onclick=()=>{if(!this.undoData)return;const current=JSON.stringify({items:this.items,stocks:this.stocks,entryDrafts:this.entryDrafts});const saved=JSON.parse(this.undoData);Object.assign(this,saved);this.restoredEntryDrafts=JSON.parse(JSON.stringify(saved.entryDrafts||{}));this.undoData=current;this.gridEditing=false;this.renderItems();this.renderStocks();this.persist();this.notify('Đã hoàn tác. Nhấn lại để làm lại.');};
  document.getElementById('btnSort').onclick=()=>{this.snapshot();this.entryDrafts.items.sort((a,b)=>{const av=Number(String(a.length).replace(',','.')),bv=Number(String(b.length).replace(',','.'));return (Number.isFinite(bv)?bv:0)-(Number.isFinite(av)?av:0);});this.items=readEntryDrafts(this.entryDrafts.items).valid;this.gridEditing=false;this.invalidateResult();this.drawEntryGrid('items');this.persist();};
  for(const kind of ['items','stocks'])document.getElementById(kind==='items'?'itemsList':'stockList').addEventListener('focusout',()=>{this.gridEditing=false;});
  document.getElementById('addGridRow').onclick=()=>{const rows=this.entryDrafts.items;let row=rows.findIndex(r=>!r.length&&!r.quantity);if(row<0){row=rows.length;rows.push({length:'',quantity:''});}this.drawEntryGrid('items',[row,0]);};
};
