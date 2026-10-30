/* Made-to-order stock: form repeatable cutting recipes, then size the stock. */
CuttingOptimizer.prototype.customStockPlanning=function(items,c,limit){
  const allowance=c.endAllowance,unit=c.orderIncrement;
  const size=cuts=>Math.ceil((Math.max(c.minLength,cuts.reduce((s,l)=>s+l,0)+Math.max(0,cuts.length-1)*c.kerf+allowance)-1e-8)/unit)*unit;
  const make=cuts=>({cuts:[...cuts],length:size(cuts),remaining:size(cuts)-cuts.reduce((s,l)=>s+l,0)-Math.max(0,cuts.length-1)*c.kerf-allowance,isExisting:false,allowance});
  const counts=new Map();items.forEach(l=>counts.set(l,(counts.get(l)||0)+1));
  const feasible=cuts=>new Set(cuts).size<=limit&&size(cuts)<=c.maxLength+1e-7;
  let best=null,score=null;
  for(const strategy of ['full','divisor']){
    const stocks=[],left=[];
    for(const [l,q] of [...counts].sort((a,b)=>b[0]-a[0])){
      let k=Math.min(q,Math.floor((c.maxLength-allowance+c.kerf)/(l+c.kerf)));
      while(k>0&&!feasible(Array(k).fill(l)))k--;
      if(!k)throw new Error(`Chi tiết ${l} mm không vừa phôi sau khi cộng dư gia công và làm tròn.`);
      if(strategy==='divisor'){
        let divisor=k;while(divisor>1&&(q%divisor||size(Array(divisor).fill(l))>c.maxLength))divisor--;
        // Do not sacrifice minimum production length just to obtain a divisor.
        if(l*divisor+(divisor-1)*c.kerf+allowance>=c.minLength)k=divisor;
      }
      for(let n=0;n<Math.floor(q/k);n++)stocks.push(make(Array(k).fill(l)));
      for(let n=0;n<q%k;n++)left.push(l);
    }
    // Place residuals in a repeated recipe where there is room, or form a tail recipe.
    for(const l of left.sort((a,b)=>b-a)){
      let target=stocks.filter(s=>feasible([...s.cuts,l])).sort((a,b)=>size([...a.cuts,l])-size([...b.cuts,l]))[0];
      if(target)Object.assign(target,make([...target.cuts,l]));else stocks.push(make([l]));
    }
    // Merge nearby purchase lengths upwards only. The full span is bounded.
    const lengths=[...new Set(stocks.map(s=>s.length))].sort((a,b)=>b-a);
    const targets=[];
    for(const length of lengths){const near=targets.find(t=>t-length<=c.mergeTolerance+1e-7);if(near===undefined)targets.push(length);}
    for(const stock of stocks){const t=targets.filter(t=>t>=stock.length-1e-7&&t-stock.length<=c.mergeTolerance+1e-7).sort((a,b)=>a-b)[0];stock.remaining+=t-stock.length;stock.length=t;}
    const waste=stocks.reduce((s,r)=>s+r.remaining,0),patterns=productionPatterns(stocks).length,types=new Set(stocks.map(s=>s.length)).size;
    const candidate=[waste,patterns,types,stocks.length];
    if(!score||candidate.some((v,i)=>v<score[i]-1e-7&&candidate.slice(0,i).every((v,j)=>Math.abs(v-score[j])<1e-7))){best=stocks;score=candidate;}
  }
  return {stocks:best,stockLength:this.detectStockLengthType(best)};
};
