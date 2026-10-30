const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{},document:{addEventListener(){}},console};vm.createContext(ctx);
for(const f of ['optimizer','storage','export','app','production','custom-stock'])vm.runInContext(fs.readFileSync(`src/js/${f}.js`,'utf8'),ctx);
function check(items,extra={},inventory=[]){
  const config={stockMode:'fixed',fixedLength:6000,kerf:5,maxWaste:500,maxTypes:2,productionMode:'simple',...extra};
  const r=vm.runInContext(`new CuttingOptimizer().optimize(${JSON.stringify(items)},${JSON.stringify(config)},${JSON.stringify(inventory)})`,ctx);
  const actual=new Map(),expected=new Map();items.forEach(i=>expected.set(i.length,(expected.get(i.length)||0)+i.quantity));
  for(const s of r.stocks){if(!s.isExisting){assert.equal(s.length,config.fixedLength);assert.equal(s.allowance,config.endAllowance||0);}assert(s.remaining>=-1e-6);assert(new Set(s.cuts).size<=config.maxTypes);s.cuts.forEach(l=>actual.set(l,(actual.get(l)||0)+1));assert(Math.abs(s.length-s.cuts.reduce((a,b)=>a+b,0)-(s.cuts.length-1)*config.kerf-(s.allowance||0)-s.remaining)<1e-6);}
  assert.deepEqual(actual,expected);assert(Math.abs(r.totalLength-r.totalUsed-r.kerfLoss-r.allowanceLoss-r.totalWaste)<1e-6);return r;
}
const r=check([{length:1500,quantity:124},{length:3580,quantity:12},{length:2250,quantity:32}]);
assert.equal(new Set(r.stocks.map(s=>s.length)).size,1);
check([{length:1500,quantity:4}],{endAllowance:10});
check([{length:3580,quantity:2}],{},[{length:4000,quantity:1}]);
const fits=check([{length:6000,quantity:1}],{minLength:10000,maxLength:1,stepSize:0});assert.equal(fits.totalWaste,0);
assert.throws(()=>check([{length:6001,quantity:1}]));assert.throws(()=>check([{length:6000,quantity:1}],{endAllowance:5}));assert.throws(()=>check([{length:1000,quantity:1}],{fixedLength:0}));
for(let seed=1;seed<=30;seed++)check(Array.from({length:4},(_,i)=>({length:400+(seed*123+i*379)%4200,quantity:1+(seed+i)%10})),{maxTypes:1+seed%3,endAllowance:10});
console.log('PASS: one fixed stock length, allowance, inventory separation, quantities, type limits, invalid and oversized input, 30 lots');
