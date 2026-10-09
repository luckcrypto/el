/* The trajectory simulator. It starts from our estimate today (the Forbes reading moved by share prices, from the
   price engine), grows the Tesla and SpaceX share prices at a steady yearly rate, holds everything else at today's
   value, and draws the result as it grows. Scenarios, not forecasts: every rate is on screen and can be changed. */
(function(root){
 const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const SYMBOLS=['SPCX','TSLA'];

 // A steady yearly rate, applied month by month so the line is smooth. Nothing random.
 function project({start,record,rates,years,from=new Date()}){
  const holdings=Object.fromEntries(record.holdings.map(h=>[h.symbol,h]));
  const units=s=>holdings[s].shares+(holdings[s].options||0);
  const price0={TSLA:start.prices.TSLA,SPCX:start.prices.SPCX};
  const value0=price0.TSLA*units('TSLA')+price0.SPCX*units('SPCX');
  const other=Math.max(0,start.net-value0);
  const steps=years*12,out=[];
  for(let i=0;i<=steps;i++){
   const t=i/12,d=new Date(from.getFullYear(),from.getMonth()+i,1);
   const price={TSLA:price0.TSLA*Math.pow(1+rates.TSLA,t),SPCX:price0.SPCX*Math.pow(1+rates.SPCX,t)};
   const value={TSLA:price.TSLA*units('TSLA'),SPCX:price.SPCX*units('SPCX')};
   out.push({i,t,year:d.getFullYear(),month:d.getMonth(),price,value,company:{TSLA:price.TSLA*holdings.TSLA.shares_outstanding,SPCX:price.SPCX*holdings.SPCX.shares_outstanding},other,net:value.TSLA+value.SPCX+other});
  }
  return out;
 }
 // Axis steps of 1, 2, 2.5 or 5 times a power of ten, four or five of them, so every label is a round number.
 function niceAxis(v){
  if(!(v>0))return {max:1,step:.25};
  const rough=v/4,p=Math.pow(10,Math.floor(Math.log10(rough))),f=rough/p;
  const step=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;
  return {max:Math.ceil(v/step)*step,step};
 }
 const niceMax=v=>niceAxis(v).max;
 function money(n){
  if(n>=1e12){const t=n/1e12;return '$'+(t>=100?t.toFixed(0):t>=10?t.toFixed(1):t.toFixed(2))+' trillion'}
  if(n>=1e9){const b=n/1e9;return '$'+(b>=100?b.toFixed(0):b.toFixed(1))+' billion'}
  return '$'+Math.round(n).toLocaleString('en-US');
 }
 function short(n){
  if(n>=1e12){const t=n/1e12;return '$'+(Number.isInteger(t)?t:t>=10?t.toFixed(0):t.toFixed(1))+'T'}
  if(n>=1e9)return '$'+Math.round(n/1e9)+'B';
  return '$'+Math.round(n);
 }
 const sharePrice=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const pct=r=>(r>0?'+':r<0?'−':'')+Math.abs(Math.round(r*100))+'%';
 function milestones(points){
  const out=[];
  for(const m of [2e12,3e12,5e12,10e12,20e12,50e12,100e12]){
   if(points[0].net>=m)continue;
   const p=points.find(p=>p.net>=m);if(p)out.push({at:m,point:p});
  }
  return out.slice(0,3);
 }
 const api={project,niceMax,niceAxis,money,short,milestones,sharePrice,pct,MONTHS};

 if(typeof document!=='undefined'){
  const $=s=>document.querySelector(s);
  const sim=$('#trajectory');if(!sim){root.ObservatoryTrajectory=api;return}
  const island=id=>{try{return JSON.parse(document.getElementById(id)?.textContent||'null')}catch{return null}};
  const record=island('price-record'),reference=island('reference-data');
  const M=root.ObservatoryMeter;
  if(!record||!reference||!M){root.ObservatoryTrajectory=api;return}
  const cases=record.scenarios.cases;
  const svg=$('#tr-chart'),wrap=$('#tr-plot'),range=$('#tr-year');
  const NS='http://www.w3.org/2000/svg';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const still=()=>reduce.matches||root.observatoryMotionPaused===true;
  const state={id:'base',rates:{TSLA:cases[0].TSLA,SPCX:cases[0].SPCX},years:10,points:null,scrub:null,geo:null,start:null};
  let drawing=0;

  function el(name,attrs={},parent=svg){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent?.append(e);return e}
  function startFrom(r){
   const q={};for(const l of r.lines)q[l.symbol]=l.price;
   return {net:r.net_worth_usd,prices:q,basis:r.basis,at:r.calculated_at,seeded:!!r.seeded};
  }

  function geometry(points){
   const W=Math.max(300,Math.round(wrap.clientWidth||600)),phone=W<560;
   const H=Math.round(Math.min(460,Math.max(300,W*.56)));
   const m={l:phone?46:62,r:phone?92:132,t:18,b:34};
   const axis=niceAxis(Math.max(...points.map(p=>p.net))*1.04),ymax=axis.max;
   const x=i=>m.l+(W-m.l-m.r)*i/(points.length-1);
   const y=v=>m.t+(H-m.t-m.b)*(1-v/ymax);
   return {W,H,m,ymax,step:axis.step,x,y,phone};
  }
  const pathFor=(points,g,key)=>points.map((p,i)=>(i?'L':'M')+g.x(i).toFixed(1)+' '+g.y(key(p)).toFixed(1)).join('');

  function draw(animate){
   cancelAnimationFrame(drawing);
   const points=state.points=project({start:state.start,record,rates:state.rates,years:state.years});
   const g=state.geo=geometry(points);
   svg.setAttribute('viewBox','0 0 '+g.W+' '+g.H);svg.setAttribute('width',g.W);svg.setAttribute('height',g.H);
   svg.replaceChildren();
   // Grid and axis: recessive, one scale in dollars.
   const grid=el('g',{class:'tr-grid'});
   for(let v=0;v<=g.ymax+1;v+=g.step){const yy=g.y(v),k=v;el('line',{x1:g.m.l,x2:g.W-g.m.r+8,y1:yy,y2:yy},grid);const t=el('text',{x:g.m.l-8,y:yy+4,'text-anchor':'end'},grid);t.textContent=k?short(v):'$0'}
   const every=state.years>10?(g.phone?5:2):(g.phone?2:1);
   for(let yr=0;yr<=state.years;yr+=every){const i=yr*12,t=el('text',{x:g.x(i),y:g.H-10,'text-anchor':yr===0?'start':yr===state.years?'end':'middle'},grid);t.textContent=String(points[i].year)}
   // Lines: the two stakes first, net worth on top.
   const series=[['spcx',p=>p.value.SPCX],['tsla',p=>p.value.TSLA],['net',p=>p.net]];
   const paths=series.map(([k,f])=>el('path',{class:'tr-line tr-'+k,d:pathFor(points,g,f)}));
   // Milestones on the net worth line.
   const marks=el('g',{class:'tr-marks'});
   for(const ms of milestones(points)){const cx=g.x(ms.point.i),cy=g.y(ms.point.net);el('circle',{cx,cy,r:4.5},marks);const t=el('text',{x:cx,y:cy-12,'text-anchor':'middle'},marks);t.textContent='First '+short(ms.at)+', '+ms.point.year}
   // Direct labels at the right end, kept at least 16px apart.
   const ends=series.map(([k,f])=>({k,y:g.y(f(points[points.length-1])),name:k==='net'?'Net worth':k==='spcx'?'SpaceX stake':'Tesla stake'})).sort((a,b)=>a.y-b.y);
   for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<16)ends[i].y=ends[i-1].y+16;
   const labels=el('g',{class:'tr-labels'});
   for(const e of ends){const t=el('text',{x:g.W-g.m.r+12,y:e.y+4,class:'tr-lab-'+e.k},labels);t.textContent=e.name}
   // Crosshair and head dots.
   const cross=el('line',{class:'tr-cross',y1:g.m.t,y2:g.H-g.m.b});
   const dots=series.map(([k])=>el('circle',{class:'tr-dot tr-'+k,r:5}));
   const hit=el('rect',{class:'tr-hit',x:g.m.l,y:0,width:g.W-g.m.l-g.m.r,height:g.H});
   state.parts={paths,dots,cross,series,marks,labels};
   range.max=String(state.years);range.value=String(state.years);
   table(points);
   if(!animate||still()){place(points.length-1);marks.style.opacity=1;labels.style.opacity=1;return}
   // The growing chart: each line draws from today to the horizon, with the readout counting alongside.
   const lens=paths.map(p=>p.getTotalLength());
   paths.forEach((p,i)=>{p.style.strokeDasharray=lens[i]+' '+lens[i];p.style.strokeDashoffset=lens[i]});
   marks.style.opacity=0;labels.style.opacity=0;
   const t0=performance.now(),dur=1900;
   const step=now=>{
    const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);
    paths.forEach((p,i)=>{p.style.strokeDashoffset=String(lens[i]*(1-e))});
    place(Math.round(e*(points.length-1)),true);
    if(k<1)drawing=requestAnimationFrame(step);
    else{paths.forEach(p=>{p.style.strokeDasharray='';p.style.strokeDashoffset=''});marks.style.opacity=1;labels.style.opacity=1;place(points.length-1)}
   };
   drawing=requestAnimationFrame(step);
  }

  function place(i,growing=false){
   const points=state.points,g=state.geo,p=points[i];if(!p)return;
   state.scrub=i;
   const {dots,cross,series}=state.parts;
   series.forEach(([k,f],n)=>{dots[n].setAttribute('cx',g.x(i));dots[n].setAttribute('cy',g.y(f(p)))});
   cross.setAttribute('x1',g.x(i));cross.setAttribute('x2',g.x(i));
   cross.style.opacity=growing||i===points.length-1?0:1;
   readout(p);
   if(!growing&&i%12===0)range.value=String(i/12);
  }
  function readout(p){
   $('#tr-when').textContent=MONTHS[p.month]+' '+p.year;
   $('#tr-net').textContent=money(p.net);
   $('#tr-spcx').textContent=money(p.value.SPCX);$('#tr-spcx-px').textContent=sharePrice(p.price.SPCX)+' a share';
   $('#tr-tsla').textContent=money(p.value.TSLA);$('#tr-tsla-px').textContent=sharePrice(p.price.TSLA)+' a share';
   $('#tr-co').textContent='At those prices SpaceX would be worth '+money(p.company.SPCX)+' and Tesla '+money(p.company.TSLA)+'.';
  }
  function table(points){
   const body=$('#tr-rows');if(!body)return;body.replaceChildren();
   for(const p of points.filter(p=>p.i%12===0)){
    const tr=document.createElement('tr');
    for(const [v,h] of [[String(p.year),true],[money(p.net)],[money(p.value.SPCX)],[sharePrice(p.price.SPCX)],[money(p.value.TSLA)],[sharePrice(p.price.TSLA)]]){const c=document.createElement(h?'th':'td');if(h)c.scope='row';c.textContent=v;tr.append(c)}
    body.append(tr);
   }
  }
  function describe(){
   const c=cases.find(c=>c.id===state.id);
   $('#tr-case-line').textContent=c?c.line:'Your own rates.';
   $('#tr-rates').textContent='SpaceX shares '+pct(state.rates.SPCX)+' a year, Tesla shares '+pct(state.rates.TSLA)+' a year, everything else held at today’s value.';
   document.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===state.id)));
   document.querySelectorAll('[data-years]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.years)===state.years)));
   for(const s of ['TSLA','SPCX']){const r=$('#tr-r-'+s);r.value=String(Math.round(state.rates[s]*100));$('#tr-r-'+s+'-out').textContent=pct(state.rates[s])}
   const st=state.start;
   $('#tr-start').textContent='Starting from our estimate of '+money(st.net)+(st.basis==='close'?', at the latest closing prices.':', at prices from '+new Date(st.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' today.');
  }
  function go(animate=true){describe();draw(animate)}

  document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{const c=cases.find(c=>c.id===b.dataset.case);state.id=c.id;state.rates={TSLA:c.TSLA,SPCX:c.SPCX};go()}));
  document.querySelectorAll('[data-years]').forEach(b=>b.addEventListener('click',()=>{state.years=Number(b.dataset.years);go()}));
  for(const s of ['TSLA','SPCX']){
   const r=$('#tr-r-'+s);
   r.addEventListener('input',()=>{state.rates[s]=Number(r.value)/100;state.id='custom';describe();draw(false)});
  }
  range.addEventListener('input',()=>{cancelAnimationFrame(drawing);place(Number(range.value)*12)});
  svg.addEventListener('pointermove',e=>{
   if(!state.geo||!e.target.classList?.contains('tr-hit'))return;
   const g=state.geo,box=svg.getBoundingClientRect(),x=(e.clientX-box.left)*(g.W/box.width);
   const i=Math.round((x-g.m.l)/(g.W-g.m.l-g.m.r)*(state.points.length-1));
   cancelAnimationFrame(drawing);place(Math.max(0,Math.min(state.points.length-1,i)));
  });
  svg.addEventListener('pointerleave',()=>{if(state.points)place(state.points.length-1)});
  let rt=0;new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(()=>{if(state.points)draw(false)},120)}).observe(wrap);

  // Start from the engine's figure; when a live price arrives, redraw quietly from it.
  state.start=startFrom(M.current());
  M.subscribe(r=>{if(!r)return;const before=state.start;state.start=startFrom(r);if(before&&before.net===state.start.net)return;describe();if(state.points)draw(false)});
  sim.classList.add('is-live');
  // Grow the chart the first time it comes into view.
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();go(true)}},{threshold:.35});
  describe();draw(false);io.observe(wrap);
 }
 root.ObservatoryTrajectory=api;
})(typeof window==='undefined'?globalThis:window);
