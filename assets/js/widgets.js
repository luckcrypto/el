/* The home page's small, true widgets: the trajectory in miniature, the figure stacked in $100 notes, how long
   $1 million a day would last, and your pay against it. Each is worked from the figure the headline shows (the Forbes
   reading, our checkpoint or a Calculate now estimate), so they all move together, and none invents a number. */
(()=>{
 const $=s=>document.querySelector(s);
 const box=$('#widgets');if(!box)return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const island=id=>{try{return JSON.parse(document.getElementById(id)?.textContent||'null')}catch{return null}};
 const ref=island('reference-data')||{},record=island('price-record'),rates=island('rates-data');
 let usd=Number.isSafeInteger(ref.net_worth_usd)?ref.net_worth_usd:null;
 const fmt=n=>Math.round(n).toLocaleString('en-GB');
 const money=n=>n>=1e12?'$'+(n/1e12).toFixed(2).replace(/\.?0+$/,'')+' trillion':'$'+Math.round(n/1e9)+' billion';

 // $100 notes are 0.0043 inches thick (US Bureau of Engraving and Printing): 0.10922 mm each.
 // The International Space Station flies about 400 km up (NASA).
 const NOTE_MM=0.10922,ISS_KM=400;
 function stack(){
  const km=usd/100*NOTE_MM/1e6,el=$('#w-stack-km'),bar=$('#w-stack-bar'),iss=$('#w-stack-iss');
  if(el)el.textContent=fmt(km)+' km';
  const times=km/ISS_KM;
  const line=$('#w-stack-line');if(line)line.textContent=times>=1?'About '+(times>=10?Math.round(times):times.toFixed(1))+' times as high as the International Space Station flies.':'About '+Math.round(times*100)+'% of the way up to the International Space Station.';
  const top=Math.max(km,ISS_KM)*1.08;
  if(bar)bar.style.setProperty('--h',(km/top*100).toFixed(1)+'%');
  if(iss)iss.style.setProperty('--at',(ISS_KM/top*100).toFixed(1)+'%');
 }
 function spend(){
  const days=usd/1e6,years=days/365.25,end=new Date().getFullYear()+Math.floor(years);
  const y=$('#w-spend-years');if(y)y.textContent=fmt(years)+' years';
  const l=$('#w-spend-line');if(l)l.textContent='Start today and the last million goes in the year '+end+'.';
 }
 function pay(){
  const X=window.ObservatoryTools,input=$('#w-pay'),cur=$('#w-pay-cur'),out=$('#w-pay-out'),link=$('#w-pay-link');
  if(!X||!input||!rates||!usd)return;
  const p=X.parsePay(input.value),code=cur.value;
  if(p.empty||p.error){out.textContent=p.error?'Digits only, like 35000.':'Type a yearly pay to see.';link.href='./in-proportion.html';return}
  const r=X.compute(usd,p.value,code,rates);
  out.textContent=fmt(r.years)+' years, or '+fmt(r.lives)+' working lives.';
  link.href='./in-proportion.html?a='+encodeURIComponent(p.value)+'&c='+encodeURIComponent(code);
 }
 // The trajectory in miniature: the Base case, ten years from the latest closes, drawn once when it comes into view.
 function trajectory(){
  const M=window.ObservatoryMeter,TR=window.ObservatoryTrajectory,svg=$('#w-traj-svg');
  if(!M||!TR||!record||!svg||!Number.isSafeInteger(ref.net_worth_usd))return;
  const seed=M.compute(record,ref,Object.fromEntries(M.SYMBOLS.map(s=>[s,M.recordQuote(record,s)])));
  const base=record.scenarios.cases[0],[y,m]=record.checked_on.split('-').map(Number);
  const pts=TR.project({start:{net:seed.net_worth_usd,prices:Object.fromEntries(seed.lines.map(l=>[l.symbol,l.price]))},record,rates:{TSLA:base.TSLA,SPCX:base.SPCX},years:10,from:new Date(y,m-1,1)});
  // Drawn in the box's own pixels, so the line keeps its weight and the end dot stays round at any width.
  const W=Math.max(200,Math.round(svg.clientWidth||320)),H=Math.max(80,Math.round(svg.clientHeight||120)),max=pts[pts.length-1].net*1.04,min=pts[0].net*0.9;
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  const xy=pts.map((p,i)=>[(i/(pts.length-1)*W).toFixed(1),(H-(p.net-min)/(max-min)*H).toFixed(1)]);
  const d='M'+xy.map(p=>p.join(' ')).join('L');
  svg.innerHTML='<path class="w-traj-area" d="'+d+'L'+W+' '+H+'L0 '+H+'Z"/><path class="w-traj-line" id="w-traj-line" d="'+d+'" pathLength="1"/><circle class="w-traj-dot" cx="'+xy[xy.length-1][0]+'" cy="'+xy[xy.length-1][1]+'" r="4"/>';
  const end=pts[pts.length-1];
  $('#w-traj-end').textContent=money(end.net);
  $('#w-traj-when').textContent='by '+TR.MONTHS[end.month]+' '+end.year;
  $('#w-traj-rates').textContent='Base case: Tesla shares '+TR.pct(base.TSLA)+' a year, SpaceX '+TR.pct(base.SPCX)+' a year. An illustration, not a forecast.';
 }
 function all(){if(!usd)return;stack();spend();pay()}
 const ready=()=>{
  trajectory();all();
  let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(trajectory,150)},{passive:true});
  $('#w-pay')?.addEventListener('input',pay);$('#w-pay-cur')?.addEventListener('change',pay);
  // The line draws itself, and the stack rises, the first time the widgets scroll into view.
  if('IntersectionObserver' in window&&!reduce.matches){
   const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){e.target.classList.add('is-live');io.unobserve(e.target)}},{threshold:.35});
   box.querySelectorAll('.w-anim').forEach(el=>io.observe(el));
  }else box.querySelectorAll('.w-anim').forEach(el=>el.classList.add('is-live'));
 };
 // Nothing is worked out until the section is close to the screen, so the widgets cost the page nothing at load.
 let started=false;
 const start=()=>{if(started)return;started=true;ready()};
 const wait=()=>{if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();start()}},{rootMargin:'600px 0px'});io.observe(box)}else start()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
 addEventListener('observatory-figure',e=>{const v=e.detail&&e.detail.usd;if(Number.isFinite(v)&&v>0){usd=v;if(started)all()}});
})();
