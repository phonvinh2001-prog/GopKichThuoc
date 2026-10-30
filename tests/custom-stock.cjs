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
const r=run(input);assert.equal(r.totalWaste,0);assert.equal(r.patterns.length,3);assert.equal(r.patterns.find(p=>p.length===3005).count,62);assert.equal(r.patterns.find(p=>p.length===4505).count,16);assert.equal(r.patterns.find(p=>p.length===3580).count,12);
console.log('Custom screenshot:',JSON.stringify({patterns:r.patterns.map(p=>({length:p.length,count:p.count,cuts:p.cuts})),waste:r.totalWaste,kerf:r.kerfLoss}));
const rounded=run(input,{endAllowance:10,orderIncrement:5,mergeTolerance:10});assert(rounded.allowanceLoss>0);
// Nearby recipes merge upward, and that addition appears as remaining length.
const nearby=run([{length:2250,quantity:20},{length:2252.5,quantity:20}],{maxLength:5000,mergeTolerance:10});assert.equal(new Set(nearby.stocks.map(s=>s.length)).size,1);assert(nearby.totalWaste>0);
run(input,{maxTypes:1});
for(let seed=1;seed<=40;seed++)run(Array.from({length:5},(_,i)=>({length:400+(seed*123+i*379)%4200,quantity:1+(seed+i)%15})),{maxTypes:1+seed%3,orderIncrement:5,endAllowance:10,mergeTolerance:10});
assert.throws(()=>run([{length:6000,quantity:1}],{endAllowance:5}));assert.throws(()=>run(input,{orderIncrement:0}));
console.log('PASS: custom sizing, exact quantities, repeat recipes, allowance, rounding, nearby merging, 40 varied lots and impossible input');
