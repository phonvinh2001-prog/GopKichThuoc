/* Made-to-order stock: pack mixed cut lengths into as few purchase sizes as possible. */
CuttingOptimizer.prototype.customStockPlanning=function(items,c,limit){
  const unit=c.orderIncrement,kerf=c.kerf,allowance=c.endAllowance;
  // One common purchase length minimizes factory setup and makes ordering simple.
  // Pack largest details first, choosing the bar with the least remaining room.
  const length=Math.floor((c.maxLength+1e-7)/unit)*unit;
  if(length<c.minLength||items[0]>length-allowance)throw new Error('Không có chiều dài phôi đặt hàng phù hợp với dữ liệu.');
  const stocks=[];
  for(const detail of items){
    let best=null,bestLeft=Infinity;
    for(const stock of stocks){
      if(!stock.cuts.includes(detail)&&new Set(stock.cuts).size>=limit)continue;
      const need=detail+(stock.cuts.length?kerf:0);
      const left=stock.remaining-need;
      if(left>=-1e-7&&left<bestLeft){best=stock;bestLeft=left;}
    }
    if(!best){
      best={length,cuts:[],remaining:length-allowance,isExisting:false,allowance};
      stocks.push(best);
    }
    best.remaining-=detail+(best.cuts.length?kerf:0);
    best.cuts.push(detail);
  }
  // A new purchase length has a setup cost. Add one only when it removes
  // warnings for a meaningful share of the lot, up to the configured cap.
  const occupied=stocks.map(s=>length-s.remaining);
  const lengths=[length],stride=Math.ceil(Math.max(c.maxWaste,100)/unit)*unit;
  const minHelp=Math.max(2,Math.ceil(stocks.length*0.01));
  const assigned=used=>Math.min(...lengths.filter(l=>l+1e-7>=used));
  while(lengths.length<c.maxStockTypes){
    let choice=null,bestHelp=0,bestSaving=0;
    for(let candidate=length-stride;candidate>=c.minLength-1e-7;candidate-=stride){
      let help=0,saving=0;
      for(const used of occupied){
        if(candidate+1e-7<used)continue;
        const current=assigned(used);
        if(candidate>=current)continue;
        saving+=current-candidate;
        if(current-used>c.maxWaste+1e-7&&candidate-used<=c.maxWaste+1e-7)help++;
      }
      if(help>bestHelp||(help===bestHelp&&saving>bestSaving)){
        choice=candidate;bestHelp=help;bestSaving=saving;
      }
    }
    if(bestHelp<minHelp)break;
    lengths.push(choice);
  }
  if(c.mergeTolerance>0){
    const grouped=[];
    for(const chosen of lengths.sort((a,b)=>b-a))
      if(!grouped.some(higher=>higher-chosen<=c.mergeTolerance+1e-7))grouped.push(chosen);
    lengths.splice(0,lengths.length,...grouped);
  }
  for(let i=0;i<stocks.length;i++){
    stocks[i].length=assigned(occupied[i]);
    stocks[i].remaining=Math.max(0,stocks[i].length-occupied[i]);
  }
  // Rebalance tail bars by exchanging a short cut for a longer cut on a full
  // bar. The donor may then use a shorter already-selected purchase length.
  // Never create another warning or add a purchase length in this pass.
  for(const tail of stocks.filter(s=>s.remaining>c.maxWaste+1e-7).sort((a,b)=>b.remaining-a.remaining)){
    for(let pass=0;pass<tail.cuts.length&&tail.remaining>c.maxWaste+1e-7;pass++){
      let best=null;
      for(const donor of stocks){
        if(donor===tail||donor.remaining>c.maxWaste+1e-7)continue;
        for(const short of new Set(tail.cuts))for(const long of new Set(donor.cuts)){
          if(long<=short)continue;
          const tailCuts=[...tail.cuts],donorCuts=[...donor.cuts];
          tailCuts[tailCuts.indexOf(short)]=long;
          donorCuts[donorCuts.indexOf(long)]=short;
          if(new Set(tailCuts).size>limit||new Set(donorCuts).size>limit)continue;
          const tailUsed=tail.length-tail.remaining+long-short;
          const donorUsed=donor.length-donor.remaining-long+short;
          const tailLength=assigned(tailUsed),donorLength=assigned(donorUsed);
          if(!Number.isFinite(tailLength)||!Number.isFinite(donorLength))continue;
          const tailWaste=tailLength-tailUsed,donorWaste=donorLength-donorUsed;
          if(donorWaste>c.maxWaste+1e-7||tailWaste+donorWaste>tail.remaining+donor.remaining+1e-7)continue;
          const score=[tailWaste>c.maxWaste?1:0,tailWaste,tailWaste+donorWaste];
          if(!best||score.some((value,i)=>value<best.score[i]-1e-7&&score.slice(0,i).every((v,j)=>Math.abs(v-best.score[j])<1e-7)))
            best={donor,tailCuts,donorCuts,tailLength,donorLength,tailWaste,donorWaste,score};
        }
      }
      if(!best||best.tailWaste>=tail.remaining-1e-7)break;
      Object.assign(tail,{cuts:best.tailCuts,length:best.tailLength,remaining:best.tailWaste});
      Object.assign(best.donor,{cuts:best.donorCuts,length:best.donorLength,remaining:best.donorWaste});
    }
  }
  const patterns=productionPatterns(stocks).length;
  return {stocks,stockLength:this.detectStockLengthType(stocks),patterns};
};
