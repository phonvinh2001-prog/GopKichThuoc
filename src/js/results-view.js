const mm=value=>Number(value).toLocaleString('vi-VN',{maximumFractionDigits:2});
App.prototype.renderStats=function(r){
  document.getElementById('statsArea').innerHTML=[['Mẫu cắt',r.patterns.length],['Thanh đặt',r.newStocks],['Thành phẩm',r.efficiency+'%'],['Đoạn dư',mm(r.totalWaste/1000)+' m']].map(([label,value])=>`<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`).join('')+`<details class="metrics-detail"><summary>Thông số tổng hợp</summary><div class="metrics-row"><span>Loại phôi mới <strong>${new Set(r.stocks.filter(s=>!s.isExisting).map(s=>s.length)).size}</strong></span><span>Thanh tồn <strong>${r.totalStocks-r.newStocks}</strong></span><span>Mạch cắt <strong>${mm(r.kerfLoss)} mm</strong></span><span>Dự phòng <strong>${mm(r.allowanceLoss||0)} mm</strong></span></div></details>`;
};
function patternRecipe(cuts){const counts=new Map();cuts.forEach(l=>counts.set(l,(counts.get(l)||0)+1));return [...counts];}
App.prototype.renderCuttingDiagram=function(stocks){
  const r=this.currentResult;
  const groups=r&&r.stocks===stocks?r.patterns:productionPatterns(stocks);
  const threshold=r?.config.maxWaste??this.config.maxWaste;
  const query=document.getElementById('cutSearch').value.trim().toLowerCase();
  const visible=groups.filter(g=>!query||g.id.toLowerCase().includes(query)||g.cuts.some(l=>String(l).includes(query)));
  const el=document.getElementById('cuttingDiagram');el.style.display='block';
  document.getElementById('searchStatus').textContent=`${visible.length}/${groups.length} mẫu · In / Excel: toàn bộ lô`;
  el.innerHTML=groups.map(g=>{
    const recipe=patternRecipe(g.cuts),over=g.remaining>threshold+1e-7;
    const used=g.cuts.reduce((s,l)=>s+l,0),kerf=Math.max(0,g.length-used-g.remaining-(g.allowance||0));
    return `<article id="pattern-${g.id}" tabindex="-1" class="stock-item production-pattern compact-pattern ${over?'over-waste':''} ${visible.includes(g)?'':'search-hidden'}">
      <div class="pattern-heading"><h3><span class="pattern-code">${g.id}</span> Phôi ${mm(g.length)} mm <span class="pattern-source">${g.isExisting?'Tồn kho':'Đặt mới'}</span></h3><span class="repeat-count">× ${g.count} thanh</span></div>
      <div class="pattern-main"><div class="recipe">${recipe.map(([l,n])=>`<span>${mm(l)} <small>× ${n}</small></span>`).join('<b>+</b>')}<small class="unit">mm / thanh</small></div><span class="remainder ${over?'warning-value':''}">Dư <strong>${mm(g.remaining)} mm</strong>${over?' <span aria-label="Vượt ngưỡng">⚠</span>':''}</span></div>
      <div class="stock-bar" aria-label="Sơ đồ cắt ${g.id}">${g.cuts.map(l=>`<div class="cut-segment segment-color-${recipe.findIndex(([x])=>x===l)%10}" style="width:${100*l/g.length}%" title="${mm(l)} mm">${100*l/g.length>8?mm(l):''}</div>`).join('')}${kerf>0?`<div class="kerf-segment" style="width:${100*kerf/g.length}%" title="Mạch cắt ${mm(kerf)} mm"></div>`:''}${g.allowance>0?`<div class="allowance-segment" style="width:${100*g.allowance/g.length}%" title="Dự phòng ${mm(g.allowance)} mm"></div>`:''}<div class="waste-segment" style="width:${100*g.remaining/g.length}%" title="Dư ${mm(g.remaining)} mm"></div></div>
      <details class="pattern-detail"><summary>Sản lượng & thông số</summary><div class="pattern-output">${recipe.map(([l,n])=>`<span>${mm(l)} mm <strong>→ ${n*g.count} chi tiết</strong></span>`).join('')}</div><p>Mạch cắt ${mm(kerf)} mm · Dự phòng ${mm(g.allowance||0)} mm / thanh</p></details>
      <div class="print-output">Thu được: ${recipe.map(([l,n])=>`${mm(l)} mm × ${n*g.count}`).join(' · ')}</div></article>`;
  }).join('');
};
App.prototype.renderWarnings=function(warnings){
  const el=document.getElementById('warningsArea'),rows=warnings.filter(w=>w.patternId),info=warnings.filter(w=>!w.patternId);
  el.style.display='block';
  const threshold=this.currentResult?.config.maxWaste??this.config.maxWaste;
  el.innerHTML=rows.length?`<div class="warning-heading"><h3>Cần kiểm tra <span>${rows.length} mẫu · ${rows.reduce((s,w)=>s+w.count,0)} thanh</span></h3><small>Toàn bộ lô · Dư vượt ${mm(threshold)} mm / thanh</small></div><div class="warning-scroll"><table class="warning-table"><thead><tr><th>Mẫu</th><th>Số thanh</th><th>Dư / thanh</th><th>% phôi</th></tr></thead><tbody>${rows.map(w=>`<tr><td><a href="#pattern-${w.patternId}" onclick="app.jumpToPattern('${w.patternId}');return false;">${w.patternId} ↗</a></td><td>${w.count}</td><td>${mm(w.remaining)} mm</td><td>${w.percent.toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`:`<p class="warning-ok">Không có mẫu vượt ngưỡng dư ${mm(threshold)} mm / thanh.</p>`;
  el.innerHTML+=info.map(w=>`<p class="warning-note">${escapeCell(w.message)}</p>`).join('');
};
App.prototype.jumpToPattern=function(id){
  if(!this.currentResult)return;
  document.getElementById('cutSearch').value='';this.renderCuttingDiagram(this.currentResult.stocks);
  const el=document.getElementById(`pattern-${id}`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus({preventScroll:true});}
};
// The factory order already supplies the purchase table; show the second table only for inventory.
App.prototype.renderSummaryTable=function(summary){
  const el=document.getElementById('summaryTable'),rows=summary.filter(s=>s.isExisting);
  el.style.display=rows.length?'block':'none';
  el.innerHTML=rows.length?`<h3>Thanh lấy từ kho</h3><table><thead><tr><th>Chiều dài</th><th>Số thanh</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${mm(r.length)} mm</td><td>${r.quantity}</td></tr>`).join('')}</tbody></table>`:'';
};
