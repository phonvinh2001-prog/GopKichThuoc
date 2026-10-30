const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',style:{},scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;}});return nodes.get(id);};
const ctx={console,window:{},document:{addEventListener(){},getElementById:get},alert:()=>{}};vm.createContext(ctx);
for(const name of ['optimizer','storage','export','app','production','custom-stock','workspace','entry-grid','results-view'])vm.runInContext(fs.readFileSync(`src/js/${name}.js`,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`globalThis.r=new CuttingOptimizer().optimize([{length:2300,quantity:3},{length:2650,quantity:30}],{stockMode:'fixed',fixedLength:6000,kerf:5,maxWaste:500,maxTypes:1});globalThis.app=new App();app.currentResult=r;app.config=r.config;app.renderCuttingDiagram(r.stocks);app.renderWarnings(r.warnings);`);
assert.equal(run('r.warnings.length'),3);assert.equal(run('r.warnings.reduce((s,w)=>s+w.count,0)'),17);
for(const w of run('r.warnings')){const pattern=run(`r.patterns.find(p=>p.id==='${w.patternId}')`);assert.equal(w.count,pattern.count);assert.equal(w.remaining,pattern.remaining);assert(get('warningsArea').innerHTML.includes(w.patternId));assert(get('cuttingDiagram').innerHTML.includes(`id="pattern-${w.patternId}"`));}
assert(!get('warningsArea').innerHTML.includes('#68'));assert(!get('warningsArea').innerHTML.includes('WARNING'));
get('cutSearch').value='no match';run('app.renderCuttingDiagram(r.stocks)');assert(get('cuttingDiagram').innerHTML.includes('search-hidden'));
const id=run('r.patterns[0].id');run(`app.jumpToPattern('${id}')`);assert.equal(get('cutSearch').value,'');assert.equal(get(`pattern-${id}`).focused,true);
run('app.renderSummaryTable(r.summary)');assert.equal(get('summaryTable').style.display,'none');
const atLimit=run('patternWarnings({patterns:[{id:"A01",count:2,remaining:500,length:6000}],stocks:[]},{maxWaste:500,stockMode:"fixed"})');assert.equal(atLimit.length,0);
ctx.XLSX={utils:{book_new:()=>({sheets:[]}),json_to_sheet:r=>r,book_append_sheet:(w,r,name)=>w.sheets.push({name,r})},writeFile:book=>{ctx.book=book;}};
run('new ExportManager().exportToExcel([],r)');const exported=ctx.book.sheets.find(s=>s.name==='Cảnh báo').r;assert.equal(exported.length,3);assert.equal(exported[0]['Mã mẫu'],run('r.warnings[0].patternId'));
console.log('PASS: shared pattern IDs, warning quantities/waste, threshold boundary, jump clears filter, no duplicate purchase table, workbook warning IDs');
