const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{},document:{addEventListener(){}},console};vm.createContext(ctx);
for(const f of ['optimizer','storage','export','app','production','custom-stock'])vm.runInContext(fs.readFileSync(`src/js/${f}.js`,'utf8'),ctx);
function run(items,options={}){
  const c={minLength:2000,maxLength:6000,kerf:5,maxWaste:500,stepSize:100,maxTypes:2,maxStockTypes:3,stockMode:'custom',orderIncrement:1,mergeTolerance:0,endAllowance:0,...options};
  const r=vm.runInContext(`new CuttingOptimizer().optimize(${JSON.stringify(items)},${JSON.stringify(c)})`,ctx);
  const actual=new Map(),expected=new Map();for(const i of items)expected.set(i.length,(expected.get(i.length)||0)+i.quantity);
  for(const s of r.stocks){assert(s.length>=c.minLength&&s.length<=c.maxLength);assert(s.remaining>=-1e-6);assert(new Set(s.cuts).size<=c.maxTypes);assert(Math.abs(s.length/c.orderIncrement-Math.round(s.length/c.orderIncrement))<1e-6);
    assert(Math.abs(s.cuts.reduce((a,b)=>a+b,0)+(s.cuts.length-1)*c.kerf+s.allowance+s.remaining-s.length)<1e-6);for(const l of s.cuts)actual.set(l,(actual.get(l)||0)+1);}
  assert.deepEqual(actual,expected);assert(Math.abs(r.totalUsed+r.kerfLoss+r.allowanceLoss+r.totalWaste-r.totalLength)<1e-6);return r;
}
const input=[{length:1500,quantity:124},{length:3580,quantity:12},{length:2250,quantity:32}];
const r=run(input);assert(new Set(r.stocks.map(s=>s.length)).size<=3);assert(r.patterns.some(p=>new Set(p.cuts).size>1));
console.log('Custom screenshot:',JSON.stringify({patterns:r.patterns.map(p=>({length:p.length,count:p.count,cuts:p.cuts})),waste:r.totalWaste,kerf:r.kerfLoss}));
const rounded=run(input,{endAllowance:10,orderIncrement:5,mergeTolerance:10});assert(rounded.allowanceLoss>0);
// Nearby recipes merge upward, and that addition appears as remaining length.
const nearby=run([{length:2250,quantity:20},{length:2252.5,quantity:20}],{maxLength:5000,mergeTolerance:10});assert.equal(new Set(nearby.stocks.map(s=>s.length)).size,1);assert(nearby.totalWaste>0);
run(input,{maxTypes:1});
for(let seed=1;seed<=40;seed++)run(Array.from({length:5},(_,i)=>({length:400+(seed*123+i*379)%4200,quantity:1+(seed+i)%15})),{maxTypes:1+seed%3,orderIncrement:5,endAllowance:10,mergeTolerance:10});
assert.throws(()=>run([{length:6000,quantity:1}],{endAllowance:5}));assert.throws(()=>run(input,{orderIncrement:0}));
// Production lot supplied by the user: keep factory sizes few and field cuts simple.
const lot=`6000 528
5470 24
4400 12
4200 168
3175 48
3100 156
3060 48
3025 48
2970 96
2950 48
2850 12
2650 12
2500 24
2400 48
2300 6
2125 24
2100 6
2060 48
2025 12
1950 24
1750 24
1225 48
1200 18
1125 24
1000 36
950 24
6000 64
965 64
6000 24
5800 18
4800 72
3500 6
3100 16
3075 12
830 12
6000 13
4450 83
3850 13
3100 50
2850 13
2600 209
2300 63
2200 83
2000 123
1400 167
1000 83
900 84
6000 14
5700 28
4800 14
3225 56
2075 28
1350 304`.split('\n').map(row=>{const [length,quantity]=row.split(' ').map(Number);return {length,quantity};});
const real=run(lot,{minLength:3000,kerf:3,maxTypes:3,maxStockTypes:3});
const stockSizes=[...new Set(real.stocks.map(s=>s.length))].sort((a,b)=>a-b);
const warnings=real.stocks.filter(s=>s.remaining>500);
console.log('User lot:',JSON.stringify({stockSizes,stockCount:real.stocks.length,stockOrders:stockSizes.map(length=>({length,count:real.stocks.filter(s=>s.length===length).length})),patterns:real.patterns.length,cutTypeCounts:[1,2,3].map(types=>({types,bars:real.stocks.filter(s=>new Set(s.cuts).size===types).length})),warnings:warnings.map(s=>({length:s.length,cuts:s.cuts,remaining:s.remaining})),waste:real.totalWaste}));
assert.deepEqual(stockSizes,[5500,6000]);
assert.equal(warnings.length,0);
const oneSize=run(lot,{minLength:3000,kerf:3,maxTypes:3,maxStockTypes:1});
assert(oneSize.stocks.filter(s=>s.cuts.length===1&&s.cuts[0]===5470&&s.remaining>500).length>=24);
const twoCuts=run(lot,{minLength:3000,kerf:3,maxTypes:2,maxStockTypes:3});
console.log('User lot with 2 cut types:',JSON.stringify({stockSizes:[...new Set(twoCuts.stocks.map(s=>s.length))],patterns:twoCuts.patterns.length,warnings:twoCuts.stocks.filter(s=>s.remaining>500).length,waste:twoCuts.totalWaste}));
assert.deepEqual([...new Set(run(lot,{minLength:3000,kerf:3,maxTypes:3,maxStockTypes:3,mergeTolerance:500}).stocks.map(s=>s.length))],[6000]);
console.log('PASS: custom sizing, exact quantities, repeat recipes, allowance, rounding, nearby merging, 40 varied lots and impossible input');
