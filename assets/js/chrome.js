(()=>{
 const root=document.documentElement;
 // The banner under the menu bar is placed from where the menu bar actually ends and where the banner actually lands,
 // not from arithmetic on the notch. Whatever sits above the page (a notch, a browser bar, a viewer's own padding),
 // the opening's top padding is corrected so the banner starts 12px under the menu bar.
 const navEl=document.getElementById('nav');
 function fitNav(){
  if(!navEl)return;const h=navEl.offsetHeight;if(!(h>0))return;
  root.style.setProperty('--nav-h',h+'px');root.classList.add('has-nav-h');
  const crown=document.getElementById('crown'),open=crown&&crown.closest('.opening');if(!open)return;
  const pad=parseFloat(getComputedStyle(open).paddingTop)||0,top=crown.getBoundingClientRect().top+scrollY;
  const next=Math.max(0,Math.round(pad+(h+12-top)));
  if(Math.abs(next-pad)>.5)root.style.setProperty('--open-pad',next+'px');
 }
 fitNav();addEventListener('resize',fitNav,{passive:true});addEventListener('orientationchange',fitNav);addEventListener('pageshow',fitNav);addEventListener('load',fitNav);setTimeout(fitNav,400);
 if(navEl&&typeof ResizeObserver==='function')new ResizeObserver(fitNav).observe(navEl);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),systemLight=matchMedia('(prefers-color-scheme: light)');

 const effective=()=>root.dataset.theme||(systemLight.matches?'light':'dark');
 function paintToggles(){
  const next=effective()==='light'?'dark':'light';
  document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.setAttribute('aria-label','Switch to '+next+' theme');if(!b.querySelector('svg'))b.textContent=next==='light'?'Light theme':'Dark theme'});
 }
 function announce(){window.dispatchEvent(new CustomEvent('observatory-theme-change',{detail:effective()}))}
 function setTheme(theme){root.dataset.theme=theme;try{localStorage.setItem('observatory-theme',theme)}catch{}paintToggles();announce()}
 document.addEventListener('click',event=>{if(event.target.closest('[data-theme-toggle]'))setTheme(effective()==='light'?'dark':'light')});
 systemLight.addEventListener('change',()=>{if(!root.dataset.theme){paintToggles();announce()}});
 paintToggles();
 window.ObservatoryTheme={current:effective};

 let paused=root.classList.contains('motion-paused');
 window.observatoryMotionPaused=paused;
 const motionButton=document.getElementById('motion-toggle');
 function paintMotion(){if(!motionButton)return;motionButton.setAttribute('aria-pressed',String(paused));motionButton.textContent=paused?'Resume motion':'Pause motion'}
 motionButton?.addEventListener('click',()=>{
  paused=!paused;root.classList.toggle('motion-paused',paused);window.observatoryMotionPaused=paused;
  try{localStorage.setItem('observatory-motion',paused?'paused':'on')}catch{}
  paintMotion();window.dispatchEvent(new Event('observatory-motion-change'));
 });
 paintMotion();

 const nav=document.getElementById('nav'),dock=document.getElementById('dock');
 let lastY=scrollY,queued=false;
 function onScroll(){
  queued=false;const y=scrollY,phone=innerWidth<=720;
  const threshold=phone?Math.max(80,(document.documentElement.scrollHeight-innerHeight)*.07):160;
  const focusInside=nav?.contains(document.activeElement);
  if(y<threshold||focusInside){nav?.classList.remove('is-tucked');dock?.classList.remove('is-up')}
  else if(y>lastY+4){nav?.classList.add('is-tucked');dock?.classList.add('is-up')}
  else if(y<lastY-4){nav?.classList.remove('is-tucked');dock?.classList.remove('is-up')}
  lastY=y;
 }
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(onScroll)}},{passive:true});
 nav?.addEventListener('focusin',()=>nav.classList.remove('is-tucked'));

 const anchors=[...document.querySelectorAll('.nav-links a[href^="#"],.dock-bar a[href^="#"]')];
 const sections=[...new Set(anchors.map(a=>document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean))];
 if(sections.length&&'IntersectionObserver' in window){
  const seen=new Map();
  const io=new IntersectionObserver(entries=>{
   entries.forEach(e=>seen.set(e.target.id,e.isIntersecting?e.intersectionRatio:0));
   let best=null,score=0;seen.forEach((v,k)=>{if(v>score){score=v;best=k}});
   anchors.forEach(a=>{if(a.getAttribute('href')==='#'+best)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')});
  },{threshold:[0,.25,.5,.75],rootMargin:'-20% 0px -40% 0px'});
  sections.forEach(s=>io.observe(s));
 }

 document.addEventListener('toggle',event=>{
  const d=event.target;if(!(d instanceof HTMLDetailsElement)||!d.open)return;
  const group=d.getAttribute('name');if(!group)return;
  document.querySelectorAll('details[name="'+group+'"]').forEach(o=>{if(o!==d&&o.open)o.open=false});
 },true);

 const items=[...document.querySelectorAll('[data-reveal]')];
 items.forEach(el=>{const siblings=[...el.parentElement.children].filter(c=>c.hasAttribute('data-reveal'));const i=siblings.indexOf(el);if(i>0)el.style.transitionDelay=Math.min(i,5)*70+'ms'});
 if(reduce.matches||paused||!('IntersectionObserver' in window))items.forEach(el=>el.classList.add('is-in'));
 else{
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -6% 0px',threshold:.1});
  items.forEach(el=>io.observe(el));
 }

 document.getElementById('share')?.addEventListener('click',()=>{
  window.open('https://x.com/intent/tweet?text='+encodeURIComponent("Elon Musk's net worth, with its date and its source.")+'&url='+encodeURIComponent(location.origin+'/'),'_blank','noopener,noreferrer');
 });

 let toastTimer=0;
 window.observatoryToast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('is-on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('is-on'),3200)};

 const menu=document.getElementById('menu'),menuButton=document.querySelector('.menu-toggle');
 if(menu&&menuButton){
  menuButton.addEventListener('click',()=>{if(typeof menu.showModal==='function')menu.showModal();else menu.setAttribute('open','');menuButton.setAttribute('aria-expanded','true');menuButton.setAttribute('aria-label','Close menu');root.classList.add('menu-open')});
  menu.addEventListener('close',()=>{menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open menu');root.classList.remove('menu-open');menuButton.focus({preventScroll:true});window.dispatchEvent(new Event('observatory-motion-change'))});
  menu.addEventListener('click',event=>{if(event.target.closest('[data-menu-close]')||event.target.closest('a'))menu.close()});
 }
})();
