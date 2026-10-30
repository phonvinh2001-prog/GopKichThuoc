const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,hidden:true,checked:false,focus(){},classList:{remove(){}}});return nodes.get(id);}
const ctx={window:{},document:{addEventListener(){},getElementById:node},console};vm.createContext(ctx);
for(const f of ['optimizer','storage','export','app','production','custom-stock','workspace'])vm.runInContext(fs.readFileSync(`src/js/${f}.js`,'utf8'),ctx);
const evalJS=s=>vm.runInContext(s,ctx);
let parsed=evalJS("parseImportRows([['Dài','SL'],['2100','20'],['1650','1.5'],['','']],0,1,true)");assert.equal(parsed.valid.length,1);assert.equal(parsed.errors[0],3);
parsed=evalJS("parseImportRows([['A',10,1234.5],['B',3,500]],2,1,false)");assert.equal(parsed.valid[0].length,1234.5);assert.equal(parsed.valid[1].quantity,3);
evalJS("globalThis.a=new App(); a.persist=()=>{}; a.notify=()=>{}; a.invalidateResult=()=>{};");
node('itemLength').value='2100';node('itemQuantity').value='20';evalJS('a.addItem()');assert.equal(evalJS('a.items[0].quantity'),20);
node('itemLength').value='2100';node('itemQuantity').value='5';evalJS('a.addItem()');assert.equal(evalJS('a.items.length'),1);assert.equal(evalJS('a.items[0].quantity'),25);
node('itemLength').value='1000';node('itemQuantity').value='1.5';evalJS('a.addItem()');assert.equal(evalJS('a.items.length'),1);
ctx.editInput={value:'-2'};evalJS("a.changeCell('items',0,'quantity',editInput)");assert.equal(evalJS('a.items[0].quantity'),25);assert.equal(ctx.editInput.value,25);
ctx.editInput.value='30';evalJS("a.changeCell('items',0,'quantity',editInput)");assert.equal(evalJS('a.items[0].quantity'),30);assert.equal(JSON.parse(evalJS('a.undoData')).items[0].quantity,25);
evalJS("a.prepareImport([['Dài','SL'],['2100',20],['1650',15]])");assert.equal(node('commitImport').disabled,false);assert.equal(evalJS('a.pendingImport.valid.length'),2);
evalJS("a.prepareImport([['Dài','SL'],['2100',20],['x',15]])");assert.equal(node('commitImport').disabled,true);assert.equal(evalJS('a.pendingImport.errors[0]'),3);
assert.equal(evalJS("escapeCell('<img src=x>')"),'&lt;img src=x&gt;');
// Every static DOM dependency exists in the new document.
const html=fs.readFileSync('index.html','utf8');for(const f of ['app','production','workspace']){const code=fs.readFileSync(`src/js/${f}.js`,'utf8');for(const m of code.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g))assert(html.includes(`id="${m[1]}"`),`Missing ${m[1]}`);}
console.log('PASS: parsing, mapped columns, row errors, inline edits, merge, undo snapshot, preview gating, HTML dependencies');
