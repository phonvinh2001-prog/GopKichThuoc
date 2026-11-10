const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',disabled:false,hidden:false,textContent:''});return nodes.get(id);};
const ctx={window:{},document:{addEventListener(){},getElementById:get},console};vm.createContext(ctx);
for(const name of ['optimizer','storage','export','app','production','custom-stock','workspace'])vm.runInContext(fs.readFileSync(`src/js/${name}.js`,'utf8'),ctx);
for(const mode of ['custom','fixed','standard','fixed','custom']){
  get('stockMode').value=mode;get('fixedLength').value='6000';vm.runInContext('syncStockModeUI()',ctx);
  assert.equal(get('fixedLengthField').hidden,mode!=='fixed');assert.equal(get('fixedLength').disabled,mode!=='fixed');
  assert.equal(get('minLength').disabled,mode==='fixed');assert.equal(get('stepSize').disabled,mode!=='standard');
  assert.equal(get('orderIncrement').disabled,mode!=='custom');assert.equal(get('endAllowance').disabled,mode==='standard');
  assert.equal(get('fixedLength').value,'6000'); // Keep value for returning to fixed mode.
  assert.equal(get('rangeLengthFields').hidden,mode==='fixed');
  assert.equal(get('customOrderFields').hidden,mode!=='custom');
  assert.equal(get('endAllowanceField').hidden,mode==='standard');
  assert.equal(get('stepSizeField').hidden,mode!=='standard');
  assert.equal(get('maxStockTypesField').hidden,mode==='fixed');
}
get('stockMode').value='custom';get('kerf').value='3';get('endAllowance').value='10';get('orderIncrement').value='5';get('mergeTolerance').value='8';get('maxWaste').value='200';
get('productionMode').value='material';vm.runInContext('syncStockModeUI()',ctx);assert.equal(get('maxTypesField').hidden,true);
assert(get('advancedSettingsSummary').textContent.includes('Mạch cắt 3 mm'));assert(get('advancedSettingsSummary').textContent.includes('Dự phòng 10 mm'));assert(get('advancedSettingsSummary').textContent.includes('Gộp ≤ 8 mm'));
get('productionMode').value='simple';vm.runInContext('syncStockModeUI()',ctx);assert.equal(get('maxTypesField').hidden,false);
assert.equal(get('maxStockTypesLabel').textContent,'Tối đa số loại phôi');get('stockMode').value='standard';vm.runInContext('syncStockModeUI()',ctx);assert.equal(get('maxStockTypesLabel').textContent,'Tối đa số loại phôi');
assert.match(fs.readFileSync('src/css/workspace.css','utf8'),/\[hidden\]\s*\{\s*display:\s*none\s*!important\s*;/);
console.log('PASS: switching all 3 modes, fixed field visibility, disabled controls, saved value, CSS hidden precedence');
