/* Live parts of the generated pages and the two home cards.
   Every page starts from the close stamped into its #extras-data island. When reading.js has a newer checkpoint
   (Luck's daily line in api/v1/checkpoint.txt), the listed holdings, the shared-out sum, the what-if card and the
   road to $2 trillion are all worked again from its prices. Nothing here invents a number: listed lines are filed
   share counts times closing prices, and private lines keep the sourced values they were stamped with. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const island=$('extras-data');let X={};try{X=JSON.parse(island?island.textContent:'{}')}catch{X={}}
 const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const long=iso=>{const [y,m,d]=iso.split('-').map(Number);return d+' '+MONTHS[m-1]+' '+y};
 const whole=v=>(v<0?'−':'')+'$'+Math.abs(Math.round(v)).toLocaleString('en-GB');
 const short=v=>{const a=Math.abs(v),s=v<0?'−':'';return a>=1e12?s+'$'+(+(a/1e12).toFixed(3))+'T':a>=1e9?s+'$'+(+(a/1e9).toFixed(1))+'B':s+'$'+(+(a/1e6).toFixed(0))+'M'};
 const price=p=>'$'+Number(p).toFixed(2);
 const count=n=>Number(n).toLocaleString('en-GB');
 let close=X.close||null;
 // 'At the close on Thursday 15 October 2026' or 'Just after the open on Monday 19 October 2026'
 const atText=(c,day)=>(c.kind==='open'?'Just after the open on ':'At the close on ')+(day?DAYS[new Date(c.date+'T12:00:00Z').getUTCDay()]+' ':'')+long(c.date);

 function newer(){
  const c=window.ObservatoryReading&&window.ObservatoryReading.checkpoint;
  if(!c||!c.quote||!Number.isSafeInteger(c.usd))return null;
  if(close&&(c.date+' '+(c.time||''))<=(close.date+' '+(close.time||'')))return null;
  return {date:c.date,time:c.time,usd:c.usd,TSLA:Number(c.quote.TSLA),SPCX:Number(c.quote.SPCX),kind:c.kind||'close'};
 }

 // Every holding: the switches, the bar, and the listed lines at the newest close.
 const on={};
 function holdings(){
  const box=$('holdings');if(!box||!X.holdings||!close)return;
  const rows=X.holdings.map(h=>h.kind==='listed'?{...h,low:h.shares*close[h.symbol],high:h.shares*close[h.symbol]}:h);
  let lo=0,hi=0;for(const r of rows){if(r.in==='always'){lo+=r.low;hi+=r.high}else if(on[r.id]!==false)hi+=r.high}
  $('hd-range').innerHTML=lo===hi?short(lo):short(lo)+'<small>to</small>'+short(hi);
  $('hd-mid').textContent=short((lo+hi)/2);$('hd-cp').textContent=short(close.usd);
  $('hd-when').textContent=atText(close,true)+': Tesla '+price(close.TSLA)+', SpaceX '+price(close.SPCX)+'.';
  const all=rows.reduce((a,r)=>a+r.high,0);
  for(const r of rows){
   const inc=r.in==='always'||on[r.id]!==false;
   const bar=box.querySelector('[data-bar="'+r.id+'"]');if(bar)bar.style.width=(inc?r.high/all*100:0).toFixed(2)+'%';
   const row=box.querySelector('[data-line="'+r.id+'"]');if(row)row.classList.toggle('is-out',!inc);
   if(r.kind==='listed'){
    const v=box.querySelector('[data-value="'+r.id+'"]');if(v)v.firstChild.nodeValue=short(r.low);
    const how=box.querySelector('[data-how="'+r.id+'"]');if(how)how.textContent=how.textContent.replace(/× \$[\d,]+\.\d{2}/,'× '+price(close[r.symbol]));
   }
  }
 }
 document.addEventListener('change',e=>{const id=e.target&&e.target.dataset&&e.target.dataset.switch;if(id){on[id]=e.target.checked;holdings()}});

 // Shared with everyone on Earth.
 function everyone(){
  if(!$('ev-each')||!close||!X.population)return;
  const each=whole(close.usd/X.population);
  $('ev-each').textContent=each;$('ev-each2').textContent=each;$('ev-sum').textContent=whole(close.usd);$('ev-date').textContent=long(close.date);const evAt=$('ev-at');if(evAt)evAt.textContent=close.kind==='open'?'just after the open':'at the close';
 }

 // Home: What if, and the road to $2 trillion.
 function whatIf(){
  const card=$('w-whatif');if(!card||!close||!X.whatif)return;
  const W=X.whatif,t=$('wi-t'),s=$('wi-s');
  // Until a slider moves, the exact closing prices are used, so the card opens on the close to the dollar.
  const paint=()=>{
   const tp=t.dataset.moved?+t.value:close.TSLA,sp=s.dataset.moved?+s.value:close.SPCX,v=close.usd+(tp-close.TSLA)*W.tsla+(sp-close.SPCX)*W.spcx,d=v-close.usd;
   $('wi-fig').textContent=whole(v);
   const el=$('wi-delta'),flat=Math.abs(d)<5e8;
   el.textContent=flat?atText(close):(d>0?'+':'−')+short(Math.abs(d))+(close.kind==='open'?' against the checkpoint':' against the close');
   el.className='wi-delta'+(flat?'':d>0?' is-up':' is-down');
   $('wi-to').textContent='$'+Math.round(tp);$('wi-so').textContent='$'+Math.round(sp);
  };
  if(!card.dataset.ready){
   card.dataset.ready='1';
   const move=e=>{e.target.dataset.moved='1';paint()};
   t.addEventListener('input',move);s.addEventListener('input',move);
   $('wi-reset').addEventListener('click',()=>{delete t.dataset.moved;delete s.dataset.moved;t.value=Math.round(close.TSLA);s.value=Math.round(close.SPCX);paint()});
  }
  delete t.dataset.moved;delete s.dataset.moved;t.value=Math.round(close.TSLA);s.value=Math.round(close.SPCX);paint();
 }
 function road(){
  if(!$('w-road-when')||!close||!X.road)return;
  const r=X.road,years=Math.log(2e12/close.usd)/Math.log(1+r.rate);
  const [y,m]=close.date.split('-').map(Number),t=(y*12+m-1)+Math.round(years*12);
  $('w-road-when').textContent=MONTHS[t%12]+' '+Math.floor(t/12);
  $('w-road-now').textContent='Now '+short(close.usd);
  const bar=$('w-road-bar');if(bar)bar.style.width=Math.max(0,Math.min(100,close.usd/2e12*100)).toFixed(1)+'%';
 }

 function all(){holdings();everyone();whatIf();road()}
 function take(){const n=newer();if(n){close=n;all()}}
 all();take();
 addEventListener('observatory-checkpoint',take);
})();
