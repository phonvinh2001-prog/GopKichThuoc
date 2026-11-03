const productionSettingKeys=['stockMode','productionMode','fixedLength','minLength','maxLength','stepSize','maxTypes','maxStockTypes','kerf','maxWaste','endAllowance','orderIncrement','mergeTolerance'];
function checkedProductionSettings(value){
  const c={...value};
  if(!['custom','fixed','standard'].includes(c.stockMode)||!['simple','material'].includes(c.productionMode))throw Error('Chọn cách cấp phôi và cách gộp.');
  if(![1,2,3].includes(c.maxTypes)||!Number.isInteger(c.maxStockTypes)||c.maxStockTypes<1||c.maxStockTypes>5)throw Error('Kiểm tra giới hạn loại chi tiết/phôi.');
  const nonnegative=['kerf','maxWaste'];if(c.stockMode!=='standard')nonnegative.push('endAllowance');if(c.stockMode==='custom')nonnegative.push('mergeTolerance');
  if(nonnegative.some(k=>!Number.isFinite(c[k])||c[k]<0))throw Error('Mạch cắt, dư gia công và ngưỡng dư phải là số không âm.');
  if(c.stockMode==='fixed'){
    if(!Number.isFinite(c.fixedLength)||c.fixedLength<=c.endAllowance)throw Error('Phôi cố định phải lớn hơn dư gia công.');
  }else{
    if(!Number.isFinite(c.minLength)||!Number.isFinite(c.maxLength)||c.minLength<=0||c.maxLength<c.minLength)throw Error('Kiểm tra chiều dài phôi Min–Max.');
    const key=c.stockMode==='custom'?'orderIncrement':'stepSize';if(!Number.isFinite(c[key])||c[key]<=0)throw Error('Bước phôi / làm tròn phải lớn hơn 0.');
  }
  const defaults={fixedLength:6000,minLength:3500,maxLength:6000,stepSize:100,orderIncrement:1,endAllowance:0,mergeTolerance:0};
  return Object.fromEntries(productionSettingKeys.map(k=>[k,typeof c[k]==='number'&&!Number.isFinite(c[k])?defaults[k]:c[k]]));
}
StorageManager.prototype.getProductionPresets=function(){try{const rows=JSON.parse(localStorage.getItem('cutting_opt_production_presets')||'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.name==='string'&&r.config&&typeof r.config==='object'):[];}catch{return [];}};
StorageManager.prototype.saveProductionPreset=function(name,config){
  const normalized=name.trim();if(!normalized||normalized.length>80)throw Error('Nhập tên bộ cài đặt từ 1–80 ký tự.');
  const settings=checkedProductionSettings(config),rows=this.getProductionPresets();
  const existing=rows.find(p=>p.name===normalized);if(existing)existing.config=settings;else{if(rows.length>=100)throw Error('Đã đủ 100 bộ cài đặt. Dùng tên cũ để cập nhật.');rows.push({name:normalized,config:settings});}
  try{localStorage.setItem('cutting_opt_production_presets',JSON.stringify(rows));}catch{throw Error('Không lưu được cài đặt. Kiểm tra dung lượng hoặc quyền lưu của trình duyệt.');}
  return normalized;
};
App.prototype.refreshProductionPresets=function(selected=''){
  const select=document.getElementById('productionPreset');select.innerHTML='<option value="">Chọn bộ cài đặt…</option>';
  const presets=this.storage.getProductionPresets();document.getElementById('savedSettingsBox').hidden=!presets.length;
  for(const row of presets){const option=document.createElement('option');option.value=row.name;option.textContent=row.name;select.append(option);}
  select.value=selected;document.getElementById('applyProductionPreset').disabled=!selected;
};
App.prototype.saveProductionPreset=function(){
  try{this.updateConfig();const name=this.storage.saveProductionPreset(document.getElementById('productionPresetName').value,this.config);this.refreshProductionPresets(name);this.notify(`Đã lưu cài đặt “${name}”. Chọn lại để áp dụng lần sau.`);}catch(error){this.notify(error.message,true);}
};
App.prototype.applyProductionPreset=function(){
  try{
    const name=document.getElementById('productionPreset').value,row=this.storage.getProductionPresets().find(p=>p.name===name);if(!row)throw Error('Chọn bộ cài đặt cần áp dụng.');
    const config=checkedProductionSettings(row.config);this.config={...this.config,...config};this.invalidateResult();this.updateConfigUI();syncStockModeUI();document.getElementById('maxTypes').disabled=this.config.productionMode==='material';
    document.getElementById('productionPresetName').value=name;this.persist();this.notify(`Đã áp dụng “${name}”. Nhấn Tạo phương án cắt để tính lại.`);
  }catch(error){this.notify(error.message,true);}
};
const setupProductionPresets=App.prototype.setupEventListeners;
App.prototype.setupEventListeners=function(){setupProductionPresets.call(this);this.refreshProductionPresets();
  document.getElementById('saveProductionPreset').onclick=()=>this.saveProductionPreset();
  document.getElementById('applyProductionPreset').onclick=()=>this.applyProductionPreset();
  document.getElementById('productionPreset').onchange=()=>{const name=document.getElementById('productionPreset').value;document.getElementById('applyProductionPreset').disabled=!name;if(name)document.getElementById('productionPresetName').value=name;};
};
