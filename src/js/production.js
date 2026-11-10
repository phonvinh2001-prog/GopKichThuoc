/* Production planning: deterministic grouping shared by UI and workbook. */
function productionPatterns(stocks) {
  const groups = new Map();
  stocks.forEach(s => {
    const cuts = [...s.cuts].sort((a,b)=>b-a);
    const key = JSON.stringify([s.length,s.isExisting,cuts]);
    if (!groups.has(key)) groups.set(key,{...s,cuts,count:0});
    groups.get(key).count++;
  });
  return [...groups.values()].sort((a,b)=>b.count-a.count || b.length-a.length)
    .map((s,i)=>({...s,id:`A${String(i+1).padStart(2,'0')}`}));
}
function patternWarnings(result,config){
  const warnings=result.patterns.filter(p=>p.remaining>config.maxWaste+1e-7).map(p=>({
    type:'warning',patternId:p.id,count:p.count,remaining:p.remaining,
    percent:100*p.remaining/p.length,totalRemaining:p.remaining*p.count,
    message:`${p.id}: ${p.count} thanh, dư ${p.remaining} mm/thanh.`
  }));
  const types=new Set(result.stocks.filter(s=>!s.isExisting).map(s=>s.length)).size;
  if(config.stockMode==='custom'&&types>config.maxStockTypes)warnings.push({type:'info',message:`${types} loại phôi; giới hạn ${config.maxStockTypes}.`});
  return warnings;
}
// Warnings are computed only after the final pattern IDs and totals exist.
CuttingOptimizer.prototype.generateWarnings=function(){return [];};

CuttingOptimizer.prototype.optimize = function(items, config, inventory=[]) {
  const c = {stockMode:'custom',fixedLength:6000,endAllowance:0,orderIncrement:1,mergeTolerance:0,...config};
  if(!['custom','standard','fixed'].includes(c.stockMode))throw new Error('Chọn cách cấp phôi hợp lệ.');
  if(c.stockMode==='fixed'){
    if(!Number.isFinite(c.fixedLength)||c.fixedLength<=0)throw new Error('Chiều dài phôi cố định phải là số dương.');
    if(!Number.isFinite(c.endAllowance)||c.endAllowance<0||c.endAllowance>=c.fixedLength)throw new Error('Dư gia công phải nhỏ hơn chiều dài phôi cố định.');
    c.minLength=c.maxLength=c.fixedLength;c.stepSize=1;c.maxStockTypes=1;
  }
  if(c.stockMode!=='custom'){c.orderIncrement=1;c.mergeTolerance=0;}
  if(c.stockMode==='standard')c.endAllowance=0;
  for(const k of ['endAllowance','orderIncrement','mergeTolerance'])if(!Number.isFinite(c[k])||c[k]<0||(k==='orderIncrement'&&c[k]===0))throw new Error('Kiểm tra dư gia công, bước làm tròn và khoảng gộp phôi.');
  for (const rows of [items,inventory]) for (const row of rows) {
    if (!Number.isFinite(row.length) || row.length<=0 || !Number.isSafeInteger(row.quantity) || row.quantity<=0)
      throw new Error('Chiều dài phải dương; số lượng phải là số nguyên dương.');
  }
  if (!items.length) throw new Error('Chưa có chi tiết.');
  if(c.stockMode==='custom')c.stepSize=1;
  for (const key of ['kerf','maxWaste','minLength','maxLength','stepSize'])
    if (!Number.isFinite(c[key])) throw new Error('Thông số không hợp lệ.');
  if(c.kerf<0 || c.maxWaste<0 || c.minLength<=0 || c.maxLength<c.minLength || c.stepSize<=0)
    throw new Error('Kiểm tra Min, Max, bước phôi và mạch cắt.');
  if((c.stockMode==='standard'&&(c.maxLength-c.minLength)/c.stepSize>1000) || [...items,...inventory].reduce((s,r)=>s+r.quantity,0)>20000)
    throw new Error('Lô quá lớn: tối đa 20.000 thanh/chi tiết và 1.001 bước phôi. Hãy chia lô.');
  c.maxTypes = Number(c.maxTypes || 2);
  if (![1,2,3].includes(c.maxTypes)) throw new Error('Chọn từ 1 đến 3 loại chi tiết/mẫu.');
  c.maxStockTypes=Number(c.maxStockTypes ?? 3);
  if(!Number.isInteger(c.maxStockTypes)||c.maxStockTypes<1||c.maxStockTypes>5) throw new Error('Chọn từ 1 đến 5 loại phôi mới.');
  const simple = c.productionMode !== 'material';
  const fits = (s,l)=>s.remaining+1e-7>=l+(s.cuts.length?c.kerf:0) &&
    (!simple || s.cuts.includes(l) || new Set(s.cuts).size<c.maxTypes);
  const place = (s,l)=>{s.remaining-=l+(s.cuts.length?c.kerf:0);s.cuts.push(l);};
  let remaining=this.expandItems(items).sort((a,b)=>b-a), used=[];
  for(const length of this.expandItems(inventory).sort((a,b)=>a-b)) {
    const s={length,cuts:[],remaining:length,isExisting:true};
    remaining=remaining.filter(l=>{if(fits(s,l)){place(s,l);return false;}return true;});
    if(s.cuts.length) used.push(s);
  }
  let result;
  if(!remaining.length) result=this.combineResults(used,null,this.expandItems(items).length,c);
  else if(c.stockMode==='fixed') {
    const usable=c.fixedLength-c.endAllowance;
    if(remaining[0]>usable)throw new Error(`Chi tiết ${remaining[0]} mm dài hơn phần dùng được ${usable} mm của phôi cố định ${c.fixedLength} mm.`);
    const best=this.productionStockSearch(remaining,{...c,minLength:usable,maxLength:usable,stepSize:1},simple?c.maxTypes:Infinity);
    for(const stock of best.stocks){stock.length=c.fixedLength;stock.allowance=c.endAllowance;}
    best.stockLength=c.fixedLength;
    result=this.combineResults(used,best,this.expandItems(items).length,c);
  } else if(c.stockMode==='custom') {
    result=this.combineResults(used,this.customStockPlanning(remaining,c,simple?c.maxTypes:Infinity),this.expandItems(items).length,c);
  } else if(!simple) {
    // Include upper bound even if the step grid misses it; never reject usable inventory first.
    const best=this.productionStockSearch(remaining,c,Infinity);
    result=this.combineResults(used,best,this.expandItems(items).length,c);
  } else {
    const best=this.productionStockSearch(remaining,c,c.maxTypes);
    result=this.combineResults(used,best,this.expandItems(items).length,c);
  }
  result.patterns=productionPatterns(result.stocks);
  result.inputItems=items.map(i=>({...i}));
  result.allowanceLoss=result.stocks.reduce((sum,s)=>sum+(s.allowance||0),0);
  result.kerfLoss=result.totalLength-result.totalUsed-result.totalWaste-result.allowanceLoss;
  result.efficiency=(100*result.totalUsed/result.totalLength).toFixed(2);
  result.newStocks=result.stocks.filter(s=>!s.isExisting).length;
  result.config={...c};
  result.summary=[];
  for(const s of result.stocks){let r=result.summary.find(r=>r.length===s.length && r.isExisting===s.isExisting);
    if(!r){r={length:s.length,isExisting:s.isExisting,quantity:0};result.summary.push(r);}r.quantity++;}
  result.warnings=patternWarnings(result,c);
  this.results=result; return result;
};
CuttingOptimizer.prototype.productionStockSearch=function(items,c,limit){
  const lengths=[];for(let l=c.minLength;l<=c.maxLength;l+=c.stepSize) lengths.push(l);
  if(lengths[lengths.length-1]!==c.maxLength) lengths.push(c.maxLength);
  let best=null,bestScore=null;
  for(const length of lengths){
    if(length<items[0]) continue;
    const stocks=[];
    for(const l of items){
      let s=stocks.find(s=>s.remaining+1e-7>=l+(s.cuts.length?c.kerf:0) && (s.cuts.includes(l)||new Set(s.cuts).size<limit));
      if(!s){s={length,cuts:[],remaining:length,isExisting:false};stocks.push(s);}
      s.remaining-=l+(s.cuts.length?c.kerf:0);s.cuts.push(l);
    }
    // Compare the uniform plan and a compacted plan. Round UP on the allowed
    // purchase grid, including Max; never change cuts or the worker type limit.
    const compact=stocks.map(s=>{
      const occupied=s.length-s.remaining;
      const shorter=lengths.find(l=>l+1e-7>=occupied);
      return {...s,cuts:[...s.cuts],length:shorter,remaining:Math.max(0,shorter-occupied)};
    });
    for(const plan of [stocks,compact]) {
      if(new Set(plan.map(s=>s.length)).size>c.maxStockTypes)continue;
      const patterns=productionPatterns(plan).length,total=plan.reduce((sum,s)=>sum+s.length,0);
      // Material is primary: a small pattern count must never justify huge waste.
      const score=[total,patterns,new Set(plan.map(s=>s.length)).size,plan.length];
      const better=!bestScore || score.some((v,i)=>v<bestScore[i] && score.slice(0,i).every((x,j)=>x===bestScore[j]));
      if(better){best={stocks:plan,stockLength:this.detectStockLengthType(plan)};bestScore=score;}
    }
  }
  if(!best) throw new Error('Có chi tiết dài hơn mọi phôi mới khả dụng.');
  return best;
};
const baseConfig=App.prototype.updateConfig;
App.prototype.updateConfig=function(){
  baseConfig.call(this);
  for(const id of ['kerf','maxWaste','minLength','maxLength','stepSize']) this.config[id]=Number(document.getElementById(id).value);
  this.config.productionMode=document.getElementById('productionMode').value;
  this.config.maxTypes=Number(document.getElementById('maxTypes').value);
  this.config.maxStockTypes=Number(document.getElementById('maxStockTypes').value);
  this.config.stockMode=document.getElementById('stockMode').value;
  this.config.fixedLength=Number(document.getElementById('fixedLength').value);
  for(const id of ['endAllowance','orderIncrement','mergeTolerance'])this.config[id]=Number(document.getElementById(id).value);
};
const baseUI=App.prototype.updateConfigUI;
App.prototype.updateConfigUI=function(){baseUI.call(this);document.getElementById('productionMode').value=this.config.productionMode||'simple';document.getElementById('productionMode').value=this.config.productionMode||'simple';document.getElementById('maxTypes').value=this.config.maxTypes||2;document.getElementById('maxStockTypes').value=this.config.maxStockTypes??3;
  document.getElementById('stockMode').value=this.config.stockMode||'custom';document.getElementById('fixedLength').value=this.config.fixedLength??6000;
  for(const id of ['endAllowance','orderIncrement','mergeTolerance'])document.getElementById(id).value=this.config[id]??(id==='orderIncrement'?1:0);};
App.prototype.invalidateResult=function(){
  if(!this.currentResult)return;
  this.currentResult=null;
  for(const id of ['btnExportExcel','btnPrint'])document.getElementById(id).disabled=true;
  for(const id of ['cuttingDiagram','summaryTable','warningsArea'])document.getElementById(id).style.display='none';
  document.getElementById('statsArea').textContent='Dữ liệu đã đổi. Hãy tính lại trước khi phát hành phiếu cắt.';
};
for(const name of ['renderItems','renderStocks']){const base=App.prototype[name];App.prototype[name]=function(...args){this.invalidateResult();return base.apply(this,args);};}
const baseEvents=App.prototype.setupEventListeners;
App.prototype.setupEventListeners=function(){baseEvents.call(this);
  for(const id of ['productionMode','maxTypes','maxStockTypes','stockMode','fixedLength','endAllowance','orderIncrement','mergeTolerance','kerf','maxWaste','minLength','maxLength','stepSize'])document.getElementById(id).addEventListener('input',()=>this.invalidateResult());
  document.getElementById('cutSearch').addEventListener('input',()=>this.currentResult&&this.renderCuttingDiagram(this.currentResult.stocks));
};
App.prototype.renderCuttingDiagram=function(stocks){
  const groups=productionPatterns(stocks),query=document.getElementById('cutSearch').value.trim().toLowerCase();
  const filtered=groups.filter(g=>!query||g.id.toLowerCase().includes(query)||g.cuts.some(l=>String(l).includes(query)));
  const container=document.getElementById('cuttingDiagram');container.style.display='block';
  document.getElementById('searchStatus').textContent=`Hiển thị ${filtered.length}/${groups.length} mẫu. In và Excel luôn gồm toàn bộ lô.`;
  container.innerHTML=groups.map(g=>{
    const counts=new Map();g.cuts.forEach(l=>counts.set(l,(counts.get(l)||0)+1));
    return `<article class="stock-item production-pattern ${filtered.includes(g)?'':'search-hidden'}"><h3>${g.id} · Phôi ${g.length} mm × ${g.count} thanh · ${g.isExisting?'Tồn kho':'Đặt mới'}</h3>
    <p><strong>Mỗi thanh:</strong> ${[...counts].map(([l,n])=>`${l} mm × ${n}`).join(' + ')}</p>
    <div class="stock-bar">${g.cuts.map(l=>`<div class="cut-segment segment-color-1" style="width:${100*l/g.length}%">${l}</div>`).join('')}<div class="waste-segment" style="width:${100*g.remaining/g.length}%"></div></div>
    <p><strong>Thu được cả mẫu:</strong> ${[...counts].map(([l,n])=>`${l} mm: ${n*g.count} chi tiết`).join(' · ')}</p>
    <p>Dư gia công dự phòng: ${(g.allowance||0).toFixed(1)} mm/phôi · Dư còn lại: ${g.remaining.toFixed(1)} mm/phôi · ${counts.size} loại chiều dài. Thực hiện cùng mẫu đủ ${g.count} thanh rồi chuyển mẫu.</p></article>`;
  }).join('');
};
App.prototype.renderStats=function(r){document.getElementById('statsArea').innerHTML=[['Mẫu cắt',r.patterns.length],['Loại phôi mới',new Set(r.stocks.filter(s=>!s.isExisting).map(s=>s.length)).size],['Thanh đặt mới',r.newStocks],['Thanh dùng từ kho',r.totalStocks-r.newStocks],['Tỷ lệ thành phẩm',r.efficiency+'%'],['Hao hụt mạch cắt',r.kerfLoss.toFixed(1)+' mm'],['Dư gia công dự phòng',(r.allowanceLoss||0).toFixed(1)+' mm'],['Đoạn dư',r.totalWaste.toFixed(1)+' mm']].map(([l,v])=>`<div class="stat-card"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></div>`).join('');};
ExportManager.prototype.exportToExcel=function(items,r){
  if(typeof XLSX==='undefined'){alert('Chưa tải được thư viện Excel. Có thể dùng In phiếu cắt.');return;}
  const wb=XLSX.utils.book_new();
  const add=(name,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),name);
  add('Nhu cầu',items.map(i=>({'Dài mm':i.length,'Số lượng':i.quantity})));
  add('Phiếu cắt',r.patterns.map(g=>({'Mã mẫu':g.id,'Phôi mm':g.length,'Nguồn':g.isExisting?'Tồn kho':'Mua mới','Số thanh':g.count,'Cắt mỗi thanh':g.cuts.join(' + '),'Dư gia công mm':g.allowance||0,'Dư mỗi thanh mm':g.remaining,'Loại chiều dài':new Set(g.cuts).size})));
  add('Mua mới',r.summary.filter(s=>!s.isExisting).map(s=>({'Phôi mm':s.length,'Số thanh':s.quantity})));
  add('Xuất tồn',r.summary.filter(s=>s.isExisting).map(s=>({'Phôi mm':s.length,'Số thanh':s.quantity})));
  add('Tra cứu',r.patterns.flatMap(g=>[...new Set(g.cuts)].map(l=>({'Dài mm':l,'Mã mẫu':g.id,'SL mỗi thanh':g.cuts.filter(x=>x===l).length,'Tổng SL':g.cuts.filter(x=>x===l).length*g.count}))));
  add('Cảnh báo',r.warnings.map(w=>({'Mã mẫu':w.patternId||'','Số thanh':w.count??'','Dư mỗi thanh mm':w.remaining??'','Dư %':w.percent??'','Nội dung':w.message})));
  add('Thông số',[{...r.config,'Quy tắc kerf':'Giữa các đoạn n−1; dư gia công dự phòng khai báo riêng','Tỷ lệ thành phẩm %':Number(r.efficiency),'Dư mm':r.totalWaste,'Kerf mm':r.kerfLoss}]);
  XLSX.writeFile(wb,'Phieu_Cat_San_Xuat.xlsx');
};
