/* Elon Musk's net worth, close by close (net-worth-by-day.html).
   The page is a ledger of our checkpoints: one line a trading day in api/v1/checkpoint.txt, each carrying the Tesla
   and SpaceX closes it was worked from. Every line is rechecked here (dist/reading.js), so a slip is never shown.
   The build stamps the closes this release knows of (server/checkpoint-record.txt) into the page so it reads without
   JavaScript; in the browser the page joins those to the live file and redraws, so a line Luck adds on GitHub
   appears the next time anyone opens the page. The same functions write both versions. */
(function(root){
 const MINUS='−',DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const R=()=>root.ObservatoryReading;
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const whole=n=>'$'+Math.abs(n).toLocaleString('en-US');
 const signed=n=>(n<0?MINUS:'+')+whole(n);
 const trimmed=(n,d)=>n.toFixed(d).replace(/\.?0+$/,'');
 const compact=n=>{const a=Math.abs(n);return a>=1e12?'$'+trimmed(a/1e12,3)+' trillion':a>=1e9?'$'+trimmed(a/1e9,1)+' billion':a>=1e6?'$'+trimmed(a/1e6,1)+' million':whole(a)};
 const signedCompact=n=>(n<0?MINUS:'+')+compact(n);
 const axis=n=>n>=1e12?'$'+trimmed(n/1e12,3)+'T':'$'+trimmed(n/1e9,1)+'B';
 const parts=iso=>iso.split('-').map(Number);
 const weekday=iso=>{const [y,m,d]=parts(iso);return DAYS[new Date(Date.UTC(y,m-1,d)).getUTCDay()]};
 const long=iso=>{const [y,m,d]=parts(iso);return d+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][m-1]+' '+y};
 const short=iso=>{const [,m,d]=parts(iso);return d+' '+MON[m-1]};
 const dir=n=>n>0?'is-up':n<0?'is-down':'is-flat';
 const clock=t=>{const [h,m]=t.split(':').map(Number);return (h%12||12)+(m?'.'+String(m).padStart(2,'0'):'')+(h<12?'am':'pm')};
 const since=r=>r.sinceForbes?'since the Forbes reading on '+long(r.since):'since the close on '+weekday(r.since)+' '+long(r.since);
 const SHOW=90; // the chart draws the latest 90 closes; the table keeps them all

 function latest(L){
  const r=L.latest;
  if(!r)return '<p class="day-when">No close recorded yet. The first one is taken after the next US market close.</p>';
  const t=Math.abs(r.parts.TSLA),s=Math.abs(r.parts.SPCX),sum=t+s||1;
  return '<p class="day-when">At the close on <time datetime="'+r.date+'T'+r.time+'">'+weekday(r.date)+' '+long(r.date)+'</time>, '+clock(r.time)+' New York</p>'
   +'<p class="day-figure">'+whole(r.usd)+'</p>'
   +'<p class="day-change '+dir(r.change)+'"><strong>'+signed(r.change)+'</strong> '+since(r)+'</p>'
   +'<div class="day-split" aria-hidden="true"><i class="day-split-t" style="flex-grow:'+(t/sum).toFixed(4)+'"></i><i class="day-split-s" style="flex-grow:'+(s/sum).toFixed(4)+'"></i></div>'
   +'<dl class="day-parts"><div><dt><i class="tr-key tr-tsla" aria-hidden="true"></i>From his Tesla shares</dt><dd class="'+dir(r.parts.TSLA)+'">'+signed(r.parts.TSLA)+'</dd><dd class="day-px">Closed at $'+r.quote.TSLA.toFixed(2)+'</dd></div>'
   +'<div><dt><i class="tr-key tr-spcx" aria-hidden="true"></i>From his SpaceX shares and options</dt><dd class="'+dir(r.parts.SPCX)+'">'+signed(r.parts.SPCX)+'</dd><dd class="day-px">Closed at $'+r.quote.SPCX.toFixed(2)+'</dd></div></dl>';
 }
 function records(L){
  const n=L.rows.length,r=L.latest;
  const day=x=>x?'<dd class="'+dir(x.change)+'">'+signedCompact(x.change)+'</dd><dd class="day-px">'+weekday(x.date)+' '+long(x.date)+'</dd>':'<dd class="day-px">From the second close</dd>';
  return '<div><dt>Closes recorded</dt><dd>'+n+'</dd><dd class="day-px">'+(n?'Since '+long(L.first.date):'None yet')+'</dd></div>'
   +'<div><dt>Since the Forbes reading</dt>'+(r?'<dd class="'+dir(r.usd-L.anchor.usd)+'">'+signedCompact(r.usd-L.anchor.usd)+'</dd>':'<dd>None yet</dd>')+'<dd class="day-px">'+compact(L.anchor.usd)+' on '+long(L.anchor.date)+'</dd></div>'
   +(L.best?'<div><dt>Best day</dt>'+day(L.best)+'</div><div><dt>Worst day</dt>'+day(L.worst)+'</div>'
    :'<div class="day-span"><dt>Best and worst day</dt><dd class="day-wait">From the next close</dd><dd class="day-px">A day here is always one close to the next, so the first close, measured from the Forbes reading, does not count.</dd></div>');
 }
 function rows(L){
  if(!L.rows.length)return '<tr><td colspan="7">No close recorded yet.</td></tr>';
  return L.rows.map(r=>'<tr><th scope="row"><time datetime="'+r.date+'T'+r.time+'">'+weekday(r.date).slice(0,3)+' '+long(r.date)+'</time></th>'
   +'<td class="lg-fig" data-label="Our figure">'+whole(r.usd)+'</td>'
   +'<td class="'+dir(r.change)+'" data-label="Change">'+signed(r.change)+'<small>'+(r.sinceForbes?'since Forbes, '+short(r.since):'since '+short(r.since))+'</small></td>'
   +'<td class="'+dir(r.parts.TSLA)+'" data-label="From Tesla">'+signed(r.parts.TSLA)+'</td>'
   +'<td class="'+dir(r.parts.SPCX)+'" data-label="From SpaceX">'+signed(r.parts.SPCX)+'</td>'
   +'<td data-label="Tesla close">$'+r.quote.TSLA.toFixed(2)+'</td>'
   +'<td data-label="SpaceX close">$'+r.quote.SPCX.toFixed(2)+'</td></tr>').join('');
 }
 function label(L){
  if(!L.rows.length)return 'No closes recorded yet.';
  const up=L.rows.slice(0,SHOW).reverse();
  return 'Chart of our figure at '+up.length+' US market close'+(up.length>1?'s':'')+', starting from the Forbes reading of '+compact(L.anchor.usd)+' on '+long(L.anchor.date)+' and reaching '+compact(L.latest.usd)+' on '+long(L.latest.date)+'. Below the line, each close’s change is split between Tesla and SpaceX shares. Every number is in the table that follows.';
 }
 // Drawn in the box's own pixels: a line of our figure from the Forbes reading on, and under it each close's change,
 // Tesla and SpaceX stacked on either side of zero.
 function chart(L,W,H){
  if(!L.rows.length)return '';
  const up=L.rows.slice(0,SHOW).reverse(),fromForbes=up[0].sinceForbes;
  const pts=(fromForbes?[{date:L.anchor.date,usd:L.anchor.usd,forbes:true}]:[]).concat(up);
  const padX=Math.min(28,W*0.05),lineTop=24,lineBot=Math.round(H*0.56),barTop=Math.round(H*0.64),barBot=H-26,mid=(barTop+barBot)/2;
  const vals=pts.map(p=>p.usd),hi=Math.max(...vals),lo=Math.min(...vals),span=(hi-lo)||hi*0.01;
  const step=pts.length>1?(W-padX*2)/(pts.length-1):0,x=i=>pts.length>1?padX+i*step:W/2;
  const y=v=>lineBot-(v-(lo-span*0.12))/(span*1.24)*(lineBot-lineTop);
  const xy=pts.map((p,i)=>[x(i),y(p.usd)]);
  const d='M'+xy.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');
  let svg='<line class="day-zero" x1="0" x2="'+W+'" y1="'+mid.toFixed(1)+'" y2="'+mid.toFixed(1)+'"/>';
  svg+='<text class="day-axis" x="0" y="13">'+axis(hi)+'</text><text class="day-axis" x="0" y="'+(lineBot+16)+'">'+axis(lo)+'</text>';
  svg+='<path class="day-area" d="'+d+'L'+xy[xy.length-1][0].toFixed(1)+' '+lineBot+'L'+xy[0][0].toFixed(1)+' '+lineBot+'Z"/>';
  svg+='<path class="day-line" d="'+d+'" pathLength="1"/>';
  const max=Math.max(1,...up.map(r=>Math.max(Math.max(0,r.parts.TSLA)+Math.max(0,r.parts.SPCX),-(Math.min(0,r.parts.TSLA)+Math.min(0,r.parts.SPCX)))));
  const half=(barBot-barTop)/2,bw=Math.max(2,Math.min(26,step*0.56||26));
  up.forEach((r,j)=>{
   const i=j+(fromForbes?1:0),cx=x(i);let pos=0,neg=0;
   for(const k of ['TSLA','SPCX']){
    const v=r.parts[k],h=Math.abs(v)/max*half;if(!h)continue;
    const top=v>0?mid-pos-h:mid+neg;if(v>0)pos+=h;else neg+=h;
    svg+='<rect class="day-bar day-bar-'+(k==='TSLA'?'t':'s')+(r.sinceForbes?' is-since':'')+'" x="'+(cx-bw/2).toFixed(1)+'" y="'+top.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,h).toFixed(1)+'"/>';
   }
  });
  pts.forEach((p,i)=>{const [px,py]=xy[i];svg+=p.forbes?'<circle class="day-ring" cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="5"/>':i===pts.length-1?'<circle class="day-dot is-last" cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="5.5"/>':pts.length<=40?'<circle class="day-dot" cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="3"/>':''});
  svg+='<text class="day-axis" x="'+x(0).toFixed(1)+'" y="'+(H-6)+'"'+(pts.length>1?'':' text-anchor="middle"')+'>'+short(pts[0].date)+(pts[0].forbes?', Forbes':'')+'</text>';
  if(pts.length>1)svg+='<text class="day-axis" x="'+x(pts.length-1).toFixed(1)+'" y="'+(H-6)+'" text-anchor="end">'+short(pts[pts.length-1].date)+'</text>';
  return svg;
 }
 function answer(L){
  const r=L.latest;
  if(!r)return 'Our first checkpoint is taken after the next US market close and appears here.';
  return 'At the close on '+weekday(r.date)+' '+long(r.date)+', our figure was '+whole(r.usd)+', '+signed(r.change)+' '+since(r)+': '+signed(r.parts.TSLA)+' from his Tesla shares and '+signed(r.parts.SPCX)+' from his SpaceX shares and options. The ledger on this page adds a line after every US close.';
 }
 function csv(L){
  return 'date,time_new_york,net_worth_usd,change_usd,change_since,from_tesla_usd,from_spacex_usd,tsla_close,spcx_close\n'
   +L.rows.map(r=>[r.date,r.time,r.usd,r.change,(r.sinceForbes?'forbes ':'')+r.since,r.parts.TSLA,r.parts.SPCX,r.quote.TSLA,r.quote.SPCX].join(',')).join('\n')+'\n';
 }
 const api={latest,records,rows,chart,label,answer,csv,count:L=>L.rows.length===1?'1 close':L.rows.length+' closes',SHOW};

 if(typeof document!=='undefined'){
  const $=id=>document.getElementById(id);
  const island=id=>{try{return JSON.parse($(id)?.textContent||'null')}catch{return null}};
  const go=()=>{
   const Rd=R(),data=island('reading-data'),baked=island('ledger-data')||{lines:[]},box=$('day');
   if(!Rd||!box||!data||!data.prices)return;
   const build=text=>Rd.ledger(Rd.parseCheckpoints(baked.lines.join('\n')+'\n'+(text||''),data.ref,data.prices).list,data.ref,data.prices);
   let L=build('');
   const plot=$('day-chart'),wrap=$('day-plot');
   const draw=()=>{if(!plot||!wrap)return;const W=Math.max(260,Math.round(wrap.clientWidth||720)),H=Math.max(220,Math.round(wrap.clientHeight||300));plot.setAttribute('viewBox','0 0 '+W+' '+H);plot.innerHTML=chart(L,W,H);plot.setAttribute('aria-label',label(L))};
   const paint=()=>{
    const set=(id,html)=>{const el=$(id);if(el&&el.innerHTML!==html)el.innerHTML=html};
    set('day-latest',latest(L));set('day-records',records(L));set('day-rows',rows(L));
    const c=$('day-count');if(c)c.textContent=api.count(L);
    const a=$('day-faq-latest');if(a)a.textContent=answer(L);
    draw();
   };
   paint();
   let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(draw,150)},{passive:true});
   // The line draws itself the first time the chart comes into view.
   if(wrap&&'IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.classList.contains('motion-paused')){
    wrap.classList.add('will-draw');
    const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){wrap.classList.add('is-live');io.disconnect()}},{threshold:.3});io.observe(wrap);
   }
   const dl=$('day-csv');
   if(dl){dl.hidden=false;dl.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv(L)],{type:'text/csv'}));a.download='elon-musk-net-worth-by-day.csv';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)})}
   // The live file, fetched once by reading.js for every page, joins the stamped closes.
   Promise.resolve(Rd.done).then(()=>{if(typeof Rd.checkpointRaw==='string'){L=build(Rd.checkpointRaw);paint()}});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go,{once:true});else go();
 }
 root.ObservatoryDay=api;
})(typeof window==='undefined'?globalThis:window);
