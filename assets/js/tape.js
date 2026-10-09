/* The price banner. Tesla and SpaceX prices scroll right to left, fed by the same engine as Calculate now.
   It moves only when motion is allowed; with reduced motion it sits still and can be swiped. A pause button
   stops it for anyone who finds movement distracting. */
(()=>{
 const tape=document.getElementById('tape'),view=tape?.querySelector('.tape-view'),track=document.getElementById('tape-track');
 const M=window.ObservatoryMeter;
 if(!tape||!view||!track||!M)return;
 const template=track.querySelector('.tape-run');
 if(!template)return;
 const whole=n=>(n<0?'−':'')+'$'+Math.abs(n).toLocaleString('en-US');
 const timeOf=iso=>new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 const sourceLabel=q=>q.kind==='close'?'Close, '+M.shortDate(q.close_date):q.kind==='token'?'Token price, '+timeOf(q.at):q.provider+', '+timeOf(q.at);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');

 function paint(r){
  if(!r)return;
  for(const l of r.lines){
   const prev=l.previous,chg=prev?(l.price/prev.price-1)*100:null;
   track.querySelectorAll('[data-sym="'+l.symbol+'"]').forEach(li=>{
    li.querySelector('.tape-px').textContent=M.price(l.price);
    const c=li.querySelector('.tape-chg');
    if(chg===null){c.textContent='';c.className='tape-chg'}
    else{const dir=chg>0.0049?'up':chg<-0.0049?'down':'flat';c.className='tape-chg is-'+dir;c.textContent=(dir==='up'?'▲ ':dir==='down'?'▼ ':'')+Math.abs(chg).toFixed(2)+'%';c.title='Since the close on '+M.shortDate(prev.date)}
    li.querySelector('.tape-src').textContent=sourceLabel(l.quote);
   });
  }
  const move=r.net_worth_usd-r.base_usd;
  track.querySelectorAll('[data-tape="estimate"]').forEach(e=>e.textContent=M.whole(r.net_worth_usd));
  track.querySelectorAll('[data-tape="move"]').forEach(e=>e.textContent=(move>=0?'+':'−')+'$'+(Math.abs(move)/1e9).toFixed(1)+'B since Forbes, '+M.shortDate(r.base_date));
  clock();
  if(!filled)fill();
 }
 function clock(){
  const s=window.ObservatoryMarketClock?.session();if(!s)return;
  const [h,m]=String(s.eastern_time||'').split(':').map(Number);
  const t=Number.isFinite(h)?((h%12)||12)+'.'+String(m).padStart(2,'0')+(h<12?'am':'pm')+' in New York':'';
  track.querySelectorAll('[data-tape="session"]').forEach(e=>e.textContent=s.label);
  track.querySelectorAll('[data-tape="clock"]').forEach(e=>e.textContent=t);
 }

 // Copies of the run so the loop is seamless at any width. Only the first copy is read by screen readers.
 let lastWidth=0,filled=false;
 function fill(){
  const runs=[...track.querySelectorAll('.tape-run')];
  runs.slice(1).forEach(r=>r.remove());
  if(reduce.matches){tape.classList.add('is-still');view.tabIndex=0;view.setAttribute('role','region');view.setAttribute('aria-label','Price banner, scrolls sideways');return}
  tape.classList.remove('is-still');view.removeAttribute('tabindex');view.removeAttribute('role');view.removeAttribute('aria-label');
  const runW=template.getBoundingClientRect().width,viewW=view.getBoundingClientRect().width;
  if(!runW)return;
  const perHalf=Math.max(1,Math.ceil(viewW/runW));
  for(let i=1;i<perHalf*2;i++){const c=template.cloneNode(true);c.setAttribute('aria-hidden','true');c.removeAttribute('id');track.append(c)}
  track.style.setProperty('--tape-dur',Math.round(runW*perHalf/42)+'s');
  lastWidth=viewW;filled=true;
 }

 const pause=document.getElementById('tape-pause');
 let paused=false;
 try{paused=sessionStorage.getItem('tape-paused')==='1'}catch{}
 function setPaused(p){
  paused=p;tape.classList.toggle('is-paused',p);
  if(pause){pause.setAttribute('aria-pressed',String(p));pause.setAttribute('aria-label',p?'Play the price banner':'Pause the price banner')}
  try{sessionStorage.setItem('tape-paused',p?'1':'0')}catch{}
 }
 pause?.addEventListener('click',()=>setPaused(!paused));
 setPaused(paused);

 reduce.addEventListener?.('change',fill);
 let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Math.abs(view.getBoundingClientRect().width-lastWidth)>2)fill()},150)});
 setInterval(()=>{if(!document.hidden)clock()},30000);
 tape.classList.add('is-ready');
 M.subscribe(paint);
 if(!M.current())fill();
})();
