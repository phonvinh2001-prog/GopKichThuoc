const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const data=new Map(),nodes=new Map();function get(id){if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',style:{},append(){},disabled:false});return nodes.get(id);}
const ctx={window:{addEventListener(){},print(){ctx.printCount=(ctx.printCount||0)+1;}},document:{addEventListener(){},getElementById:get,createElement(){return {};}},console,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};vm.createContext(ctx);
for(const f of ['optimizer','storage','export','app','production','custom-stock','workspace','entry-grid','results-view','print-report','production-presets'])vm.runInContext(fs.readFileSync(`src/js/${f}.js`,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`globalThis.c={stockMode:'fixed',productionMode:'simple',fixedLength:6000,minLength:2000,maxLength:6000,stepSize:100,maxTypes:2,maxStockTypes:3,kerf:5,maxWaste:500,endAllowance:10,orderIncrement:1,mergeTolerance:0};globalThis.items=[{length:2300,quantity:2},{length:2300,quantity:1},{length:1130,quantity:2}];globalThis.r=new CuttingOptimizer().optimize(items,c);globalThis.html=buildPrintReport(r,[]);`);
const html=run('html');assert(html.includes('KÍCH THƯỚC KHÁCH YÊU CẦU'));assert(html.includes('ĐẶT PHÔI NHÀ MÁY'));assert(html.includes('HƯỚNG DẪN CẮT'));assert(html.includes('Chi tiết / mỗi thanh'));assert(html.includes('Chi tiết / cả mẫu'));assert(html.includes('<svg'));assert(html.includes('stroke="black"'));
// Input snapshot is included even if the caller passes an empty current list.
assert(html.includes('<td>2.300</td><td>3</td>'));for(const p of run('r.patterns'))assert(html.includes(p.id));
run('globalThis.storage=new StorageManager();storage.saveProductionPreset("Nhôm 6m",c)');assert.equal(run('storage.getProductionPresets().length'),1);
run('storage.saveProductionPreset("Nhôm 6m",{...c,kerf:3})');assert.equal(run('storage.getProductionPresets().length'),1);assert.equal(run('storage.getProductionPresets()[0].config.kerf'),3);
assert.throws(()=>run('storage.saveProductionPreset("Lỗi",{...c,fixedLength:0})'));assert.throws(()=>run('storage.saveProductionPreset(" ",c)'));
run('globalThis.app=new App();app.items=items;app.stocks=[{length:4000,quantity:1}];app.currentResult=r;app.notify=()=>{};app.persist=()=>true;');
get('productionPreset').value='Nhôm 6m';run('app.applyProductionPreset()');assert.equal(run('app.config.kerf'),3);assert.equal(run('app.config.fixedLength'),6000);assert.equal(run('app.currentResult'),null);assert.equal(run('app.items.length'),3);assert.equal(run('app.stocks[0].length'),4000);assert.equal(get('fixedLengthField').hidden,false);
run('app.currentResult=r;app.printResults()');assert.equal(ctx.printCount,1);assert(get('printReport').innerHTML.includes('KÍCH THƯỚC KHÁCH YÊU CẦU'));
run('storage.saveProductionPreset("Tận dụng",{...c,productionMode:"material",stockMode:"custom",kerf:2,mergeTolerance:7})');
get('productionPreset').value='Tận dụng';run('app.applyProductionPreset()');assert.equal(get('productionMode').value,'material');assert.equal(get('maxTypesField').hidden,true);assert.equal(get('customOrderFields').hidden,false);assert(get('advancedSettingsSummary').textContent.includes('Mạch cắt 2 mm'));assert.equal(run('app.items.length'),3);
run('app.refreshProductionPresets()');assert.equal(get('savedSettingsBox').hidden,false);
data.set('cutting_opt_production_presets','broken');assert.equal(run('storage.getProductionPresets().length'),0);
run('app.refreshProductionPresets()');assert.equal(get('savedSettingsBox').hidden,true);
ctx.localStorage.setItem=()=>{throw Error('Quota');};assert.throws(()=>run('storage.saveProductionPreset("Lỗi lưu",c)'));
assert.match(fs.readFileSync('src/css/print-report.css','utf8'),/body>\.container\{display:none!important\}/);
assert.match(fs.readFileSync('src/css/print-report.css','utf8'),/size:A4 portrait/);
console.log('PASS: input snapshot and aggregated print quantities, factory/cutting sections, monochrome SVG, print command, saved settings update/reload/apply, input preservation and storage failure');
