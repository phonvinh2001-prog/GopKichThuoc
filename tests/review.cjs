const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const data=new Map(),nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',value:'',disabled:false,hidden:false,style:{}});return nodes.get(id);};
const ctx={window:{},document:{addEventListener(){},getElementById:get,querySelector(){return null;}},console:{log(){},error(){}},setTimeout,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};vm.createContext(ctx);
for(const f of ['optimizer','storage','export','app','production','custom-stock','workspace','entry-grid'])vm.runInContext(fs.readFileSync(`src/js/${f}.js`,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
data.set('undefined',JSON.stringify({items:[{length:1500,quantity:2}]}));assert.equal(run('new StorageManager().loadData().items.length'),1);
data.set('cutting_opt_data','null');assert.equal(run('new StorageManager().loadData().items.length'),0);
data.set('cutting_opt_data','invalid json');assert.equal(run('new StorageManager().saveData({items:[],history:[]})'),true);
data.set('cutting_opt_templates','broken');assert.equal(run('Object.keys(new StorageManager().getTemplates()).length'),0);
assert.equal(run("new StorageManager().saveTemplate('__proto__',[{length:1,quantity:1}])"),true);assert.equal(JSON.parse(data.get('cutting_opt_templates')).__proto__[0].length,1);
ctx.localStorage.setItem=()=>{throw Error('Quota');};run('globalThis.a=new App();a.notify=()=>{};');assert.equal(run('a.persist()'),false);assert(get('saveStatus').textContent.includes('Chưa lưu'));
run("a.invalidateResult=()=>{};a.drawEntryGrid=()=>{};a.entryDrafts={items:[{length:'1500',quantity:'2'},{length:'3580',quantity:''}]};a.items=[{length:1500,quantity:2}];a.applyImportedRows([{length:1500,quantity:3},{length:2250,quantity:4}],'merge')");assert.equal(run('a.entryDrafts.items[1].length'),'3580');assert.equal(run('a.entryDrafts.items[1].quantity'),'');assert.equal(run('a.items[0].quantity'),5);
run("a.applyImportedRows([{length:1000,quantity:1}],'replace')");assert.equal(run('a.items.length'),1);assert.equal(run('a.entryDrafts.items.length'),1);
// Test the real delayed calculation, including an edit during the paint delay.
(async()=>{
  ctx.alert=msg=>{ctx.lastAlert=msg;};run("a.entryDrafts={items:[{length:'1500',quantity:'2'}],stocks:[]};a.items=[{length:1500,quantity:2}];a.updateConfig=()=>{a.config={stockMode:'fixed',fixedLength:6000,kerf:5,maxWaste:500}};a.showLoading=()=>{};a.storage.saveToHistory=()=>{};a.renderResults=()=>{a.rendered=true;};a.persist=()=>true;");
  const pending=run('a.calculate()');run("a.entryDrafts.items[0].quantity=''");await pending;assert(ctx.lastAlert.includes('dòng lỗi'));assert.equal(run('!!a.rendered'),false);
  run("a.entryDrafts.items[0].quantity='2'");await run('a.calculate()');assert.equal(run('a.currentResult.totalItems'),2);assert.equal(run('a.rendered'),true);
  console.log('PASS: storage recovery/migration/quota, safe templates, unfinished import preservation, delayed calculation validation');
})().catch(e=>{console.error(e);process.exitCode=1;});
