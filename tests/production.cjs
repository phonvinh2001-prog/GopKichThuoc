const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{},document:{addEventListener(){}},console};vm.createContext(ctx);
for(const f of ['optimizer','storage','export','app','production','custom-stock'])vm.runInContext(fs.readFileSync(`src/js/${f}.js`,'utf8'),ctx);
const run=(items,c={},inv=[])=>vm.runInContext(`new CuttingOptimizer().optimize(${JSON.stringify(items)},${JSON.stringify({kerf:5,maxWaste:500,minLength:3500,maxLength:6000,stepSize:100,stockMode:'standard',productionMode:'simple',maxTypes:2,...c})},${JSON.stringify(inv)})`,ctx);
function check(items,c,inv){const r=run(items,c,inv);const actual=new Map();for(const s of r.stocks){assert(s.remaining>=-1e-6);assert(new Set(s.cuts).size<=(c?.maxTypes||2));for(const l of s.cuts)actual.set(l,(actual.get(l)||0)+1);assert(Math.abs(s.cuts.reduce((a,b)=>a+b,0)+Math.max(0,s.cuts.length-1)*r.config.kerf+s.remaining-s.length)<1e-6);}const expected=new Map();items.forEach(i=>expected.set(i.length,(expected.get(i.length)||0)+i.quantity));assert.deepEqual(actual,expected);assert.equal(r.patterns.reduce((s,p)=>s+p.count,0),r.totalStocks);return r;}
for(let n=1;n<=3;n++)check([{length:2100,quantity:20},{length:1650,quantity:15},{length:1200,quantity:30},{length:800,quantity:12}],{maxTypes:n});
const mixed=check([{length:3500,quantity:2}],{},[{length:3500,quantity:1}]);assert.equal(mixed.summary.length,2);assert.equal(mixed.newStocks,1);
check([{length:6500,quantity:1}],{},[{length:7000,quantity:1}]);
check([{length:5990,quantity:1}],{stepSize:200});
const kerf=check([{length:1000,quantity:2}],{minLength:2005,maxLength:2005});assert.equal(kerf.efficiency,'99.75');
assert.throws(()=>run([{length:1000,quantity:1.5}]));assert.throws(()=>run([{length:1000,quantity:1}],{stepSize:0}));
for(let seed=1;seed<=40;seed++){const items=Array.from({length:5},(_,i)=>({length:500+((seed*137+i*419)%4500),quantity:1+(seed+i)%8}));check(items,{maxTypes:1+seed%3});}
// Workbook must include every pattern even when search hides some cards.
ctx.XLSX={utils:{book_new:()=>({sheets:[]}),json_to_sheet:r=>r,book_append_sheet:(w,r,n)=>w.sheets.push({n,r})},writeFile:w=>{ctx.book=w;}};
ctx.testResult=mixed;vm.runInContext('new ExportManager().exportToExcel([],testResult)',ctx);
assert.equal(ctx.book.sheets.find(s=>s.n==='Mua mới').r[0]['Số thanh'],1);
assert.equal(ctx.book.sheets.find(s=>s.n==='Xuất tồn').r[0]['Số thanh'],1);
console.log('PASS: production limits, quantity conservation, kerf, inventory, validation, 40 varied lots, workbook source separation');

const screenshotItems=[{length:1500,quantity:124},{length:3580,quantity:12},{length:2250,quantity:32}];
const screenshot=check(screenshotItems,{minLength:2000,maxStockTypes:3});
assert(screenshot.totalWaste<10000);assert(screenshot.patterns.length<=4);
assert(new Set(screenshot.stocks.map(s=>s.length)).size<=3);
const uniform=check(screenshotItems,{minLength:2000,maxStockTypes:1});
assert.equal(new Set(uniform.stocks.map(s=>s.length)).size,1);
assert(screenshot.totalLength<=uniform.totalLength);
console.log(JSON.stringify({case:'Screenshot regression',efficiency:screenshot.efficiency,waste:screenshot.totalWaste,kerf:screenshot.kerfLoss,total:screenshot.totalLength,patterns:screenshot.patterns.map(p=>({length:p.length,cuts:p.cuts,count:p.count,remaining:p.remaining})),uniformWaste:uniform.totalWaste}));
