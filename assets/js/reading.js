/* The daily Forbes reading.
   Luck reads Elon Musk's figure on the Forbes Real-Time Billionaires list and writes it in api/v1/forbes.txt from his
   phone. Every page fetches that file and, when it holds a newer valid reading than the one stamped into the page,
   shows it everywhere the stamped one appears. A missing, garbled or future-dated file, one older than the stamp, or
   one more than 30% away from it, is ignored and the stamped reading stands. Nothing is ever invented: the figure is
   the one Forbes showed, with the date it was read.
   Calculate now only moves to the new reading when the file also gives that day's Tesla and SpaceX closes, because
   the estimate is the reading plus the change in share prices since that day's close.
   The same functions write the stamped text at build time (scripts/stamp-reference.mjs), so the two always agree. */
(function(root){
 const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const SHORT=MONTHS.map(m=>m.slice(0,3).toLowerCase());
 const long=iso=>{const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);return d+' '+MONTHS[m-1]+' '+y};
 const trim=s=>s.replace(/\.?0+$/,'');
 const billions=n=>{const b=n/1e9;return Number.isInteger(b)?String(b):b.toFixed(1)};
 const money=n=>n>=1e12?'$'+trim((n/1e12).toFixed(3))+' trillion':'$'+billions(n)+' billion';
 const moneyCompact=n=>n>=1e12?'$'+trim((n/1e12).toFixed(3))+'T':'$'+billions(n)+'B';
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const pad=n=>String(n).padStart(2,'0');
 const LIMIT=0.3,SYMBOLS=['TSLA','SPCX'];

 function realDate(y,m,d){const t=new Date(Date.UTC(y,m-1,d));return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d?y+'-'+pad(m)+'-'+pad(d):null}
 // 2026-10-09, 9/10/2026 (UK order), 9 October 2026 or 9 Oct 2026
 function parseDate(s){
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return realDate(+m[1],+m[2],+m[3]);
  m=s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);if(m)return realDate(+m[3],+m[2],+m[1]);
  m=s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/i);if(m){const i=SHORT.indexOf(m[2].slice(0,3).toLowerCase());if(i>=0)return realDate(+m[3],i+1,+m[1])}
  return null;
 }
 // 1062, 1,062, $1,062B, 1062.4 billion, 1.062T, $1.062 trillion, or the whole number of dollars
 function parseFigure(s){
  const t=s.toLowerCase().replace(/[$£,\s]/g,'').replace(/(usd|dollars?)$/,'');
  const m=t.match(/^(\d+(?:\.\d+)?)(t|tn|trillion|b|bn|billion)?$/);if(!m)return null;
  const n=Number(m[1]),dec=(m[1].split('.')[1]||'').length;let bn,places;
  if(m[2]&&m[2][0]==='t'){bn=n*1000;places=Math.max(0,dec-3)}
  else if(!m[2]&&n>=1e9){bn=n/1e9;places=1}
  else{bn=n;places=dec}
  const usd=Math.round(bn*1e9);
  return Number.isSafeInteger(usd)?{usd,rounding_short:places>=1?'the nearest $100 million':'the nearest $1 billion'}:null;
 }
 function parse(text){
  const lines=String(text||'').split(/\r?\n/).map(l=>l.replace(/#.*$/,'').trim()).filter(Boolean);
  const out={figure:null,date:null,closes:{}};
  for(const l of lines){
   const c=l.match(/^(TSLA|SPCX)\s*[:=]?\s*\$?\s*(\d+(?:\.\d+)?)$/i);
   if(c){out.closes[c[1].toUpperCase()]=Number(c[2]);continue}
   const d=parseDate(l);if(d&&!out.date){out.date=d;continue}
   const f=parseFigure(l);if(f&&!out.figure){out.figure=f;continue}
   return {error:'unreadable_line',line:l};
  }
  if(!out.figure)return {error:'no_figure'};
  if(!out.date)return {error:'no_date'};
  return out;
 }
 // Checks a parsed file against the stamped reading. Returns the reasons it is refused, or none.
 function check(r,stamped,prices,now=Date.now()){
  if(!r||r.error)return [r?r.error:'no_file'];
  const why=[],v=r.figure.usd,s=stamped.net_worth_usd;
  if(!(v>=1e11&&v<=1e13))why.push('figure_out_of_range');
  const t=new Date(now+14*3600e3),today=t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(t.getUTCDate());
  if(r.date>today)why.push('date_in_future');
  if(r.date<stamped.as_of_date)why.push('older_than_stamp');
  if(Math.abs(v/s-1)>LIMIT)why.push('too_far_from_stamp');
  if(r.date===stamped.as_of_date&&v===s)why.push('same_as_stamp');
  return why;
 }
 // The closes count only when both are there, sane, and on or after the latest close on record.
 function closesUsable(r,prices){
  if(!prices||!prices.closes||!prices.closes.length)return false;
  const last=prices.closes[prices.closes.length-1];
  if(r.date<last.date)return false;
  return SYMBOLS.every(k=>typeof r.closes[k]==='number'&&r.closes[k]>0&&Math.abs(r.closes[k]/last[k]-1)<=LIMIT);
 }
 function build(r,stamped){
  const prev={revision:stamped.revision,net_worth_usd:stamped.net_worth_usd,as_of_date:stamped.as_of_date,checked_on:stamped.checked_on,publisher:stamped.publisher,source_url:stamped.source_url,rounding_short:stamped.rounding_short,replaced_on:r.date};
  const previous=r.date===stamped.as_of_date?(stamped.previous||[]):[prev,...(stamped.previous||[])];
  const ref={...stamped,net_worth_usd:r.figure.usd,as_of_date:r.date,checked_on:r.date,revision:'forbes-'+r.date+'-daily',
   rounding_short:r.figure.rounding_short,rounding:'Shown on the Forbes Real-Time Billionaires list to '+r.figure.rounding_short+'.',
   verification:'Read from the Forbes Real-Time Billionaires list on '+long(r.date)+' and entered in this site’s daily reading file. Underlying assets not independently audited.',
   previous,daily:true};
  delete ref.as_of_time_label;
  return ref;
 }
 function anchorPrices(r,prices,ref){
  const closes=prices.closes.filter(c=>c.date!==r.date).concat([{date:r.date,TSLA:r.closes.TSLA,SPCX:r.closes.SPCX}]);
  return {...prices,checked_on:r.date,closes,base:{...prices.base,revision:ref.revision,date:r.date}};
 }
 // Every stamped text that follows from the reading and the dated rates.
 function values(ref,rates,T,X){
  const v=ref.net_worth_usd,readings=[ref,...(ref.previous||[])].sort((a,b)=>b.as_of_date.localeCompare(a.as_of_date));
  const out={
   'figure-full':T.format(v),'figure-short':money(v),'figure-compact':moneyCompact(v),'figure-words':T.words(v),
   'as-of':long(ref.as_of_date),'checked':long(ref.checked_on),'rounding-note':'Forbes shows this to '+(ref.rounding_short||'the nearest $100 million')+'.',
   'publisher':ref.publisher,'revision':ref.revision,'source-name':ref.source_name||ref.publisher,'source-url':ref.source_url,
   'as-of-clock':ref.as_of_time_label||'the time of reading','rounding':ref.rounding_short||'the nearest $100 million',
   'reading-count':String(readings.length),'first-reading':long(readings[readings.length-1].as_of_date),
   'trillion-yesno':v>=1e12?'Yes':'No','trillion-relation':v>=1e12?'above':'below'
  };
  if(rates&&rates.currencies){
   out['rate-date']=long(rates.rate_date);
   const rateText=n=>n>=10?n.toFixed(2):n.toFixed(4);
   for(const c of rates.currencies){
    const per=X.perUsd(rates,c.code);if(!(per>0))continue;const value=v*per,pr=+per.toFixed(6);
    out['fx-'+c.code+'-figure']=X.big(value,c.symbol);out['fx-'+c.code+'-rate']=rateText(pr);
    out['fx-'+c.code+'-source']=rates.pegs&&rates.pegs[c.code]?'Fixed peg, '+rates.pegs[c.code].source.replace(/ peg$/,''):rates.official&&rates.official[c.code]?long(rates.official[c.code].date)+', Bank of Russia':long(rates.rate_date)+', ECB';
    if(c.code==='INR'){out['inr-lakh-crore']=(value/1e12).toFixed(1);out['inr-full']='₹'+Math.round(value).toLocaleString('en-IN');out['inr-rate']=pr.toFixed(2)}
   }
  }
  return out;
 }
 function readoutLabel(ref,T){return T.words(ref.net_worth_usd)+', the '+ref.publisher+' estimate for '+long(ref.as_of_date)}
 function rows(ref){
  const readings=[ref,...(ref.previous||[])].sort((a,b)=>b.as_of_date.localeCompare(a.as_of_date));
  return readings.map((r,i)=>{const next=readings[i+1];const change=next?((r.net_worth_usd-next.net_worth_usd>=0?'+':'−')+money(Math.abs(r.net_worth_usd-next.net_worth_usd))):'First reading';
   return '<tr><th scope="row"><time datetime="'+r.as_of_date+'">'+long(r.as_of_date)+'</time></th><td>'+money(r.net_worth_usd)+'</td><td>'+change+'</td><td><a href="'+esc(r.source_url)+'" target="_blank" rel="noopener">'+esc(r.publisher)+' <span aria-hidden="true">↗</span></a></td><td><code>'+esc(r.revision)+'</code></td></tr>'}).join('');
 }
 function fileText(ref,prices){
  const last=prices&&prices.closes&&prices.closes.find(c=>c.date===ref.as_of_date);
  const fig=ref.rounding_short==='the nearest $1 billion'?String(Math.round(ref.net_worth_usd/1e9)):(ref.net_worth_usd/1e9).toFixed(1);
  return ['# Elon Musk on the Forbes Real-Time Billionaires list: https://www.forbes.com/real-time-billionaires/',
   '# Line 1: the figure Forbes shows, in billions of US dollars (1062, or 1.062T, both work).',
   '# Line 2: the date you read it, as YYYY-MM-DD.',
   '# Read it after 9pm UK time on a weekday, when the US market has closed.',
   '# Optional: that day’s closing prices, so Calculate now builds on this reading too.',
   '# Anything after a # is a note and is ignored. A mistake is ignored too: the last good reading stays up.',
   fig,ref.as_of_date].concat(last?['TSLA '+last.TSLA,'SPCX '+last.SPCX]:[]).join('\n')+'\n';
 }
 const api={parse,check,closesUsable,build,anchorPrices,values,readoutLabel,rows,fileText,money,moneyCompact,long,ref:null,anchored:false};

 if(typeof document!=='undefined'){
  const here=document.currentScript&&document.currentScript.src;
  const island=id=>{try{return JSON.parse(document.getElementById(id)?.textContent||'null')}catch{return null}};
  const data=island('reading-data');
  const need=(name,global)=>root[global]?Promise.resolve(root[global]):new Promise(res=>{if(!here)return res(null);const s=document.createElement('script');s.src=new URL(name,here).href;s.onload=()=>res(root[global]||null);s.onerror=()=>res(null);document.head.append(s)});
  const ready=new Promise(res=>{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',res,{once:true});else res()});
  function paint(ref,anchored){
   return Promise.all([need('ticker.js','ObservatoryTicker'),need('tools.js','ObservatoryTools')]).then(([T,X])=>{
    if(!T||!X)return;
    const vals=values(ref,data.rates,T,X),dt={'as-of':ref.as_of_date,'checked':ref.checked_on};
    document.querySelectorAll('[data-ref]').forEach(el=>{
     const k=el.getAttribute('data-ref');if(!(k in vals))return;
     if(el.getAttribute('data-ref-label')==='readout')el.setAttribute('aria-label',readoutLabel(ref,T));
     if(el.children.length)return; // the mounted readout: main.js rolls its digits to the new figure
     if(el.textContent!==vals[k])el.textContent=vals[k];
     if(dt[k]&&el.hasAttribute('datetime'))el.setAttribute('datetime',dt[k]);
    });
    const wealth=document.getElementById('wealth');if(wealth)wealth.setAttribute('data-digits',String(String(ref.net_worth_usd).length));
    const tb=document.getElementById('readings-rows');if(tb)tb.innerHTML=rows(ref);
    const first=document.querySelector('#meter-rows .meter-row:first-child');
    if(anchored&&first){first.querySelector('dt').textContent='Forbes reading, '+long(ref.as_of_date);first.querySelector('dd').textContent=T.format(ref.net_worth_usd)}
    if(anchored)document.querySelectorAll('[data-ref="meter-base-date"],[data-ref="meter-latest-close"]').forEach(el=>el.textContent=long(ref.as_of_date));
    if(anchored)document.querySelectorAll('[data-ref="meter-basis"]').forEach(el=>el.textContent='From the closing prices on '+long(ref.as_of_date)+'. Press Calculate now for current prices.');
   });
  }
  function teachElon(ref,prices){
   const D=root.ELON_DATA;if(!D)return;
   D.latest={...D.latest,v:ref.net_worth_usd,as_of:ref.as_of_date,checked:ref.checked_on,rounding:ref.rounding_short,revision:ref.revision};
   if(Array.isArray(D.readings)){D.readings=D.readings.filter(r=>r.date!==ref.as_of_date);D.readings.unshift({n:'Forbes reading, '+long(ref.as_of_date),v:ref.net_worth_usd,date:ref.as_of_date,mk:'≈',src:ref.publisher,revision:ref.revision,u:'./history.html'})}
   if(prices&&D.prices){D.prices.base=prices.base;D.prices.closes=prices.closes;D.prices.checked_on=prices.checked_on}
   const I=root.ELON_INDEX;
   if(Array.isArray(I)){const fig='Forbes put Elon Musk’s net worth at '+money(ref.net_worth_usd)+' on '+long(ref.as_of_date)+', rounded to '+ref.rounding_short+'. It is a dated estimate, not a live figure.';
    for(const e of I)if(e&&e.t==='Elon Musk net worth'){e.s=fig;e.a=fig;if(e.f)e.f.valuation=fig}}
  }
  if(data&&data.ref&&Number.isSafeInteger(data.ref.net_worth_usd)&&typeof fetch==='function'){
   api.stamped=data.ref;
   // The file sits in api/v1/ beside the pages: two folders up from assets/js/ in the static copy, at the root on the Worker.
   const target=here?new URL(/\/assets\/js\/[^/]*$/.test(new URL(here).pathname)?'../../api/v1/forbes.txt':'api/v1/forbes.txt',here):new URL('api/v1/forbes.txt',location.href);
   api.done=fetch(target.href,{cache:'no-cache',credentials:'omit'}).then(r=>r.ok?r.text():null).then(text=>{
    if(text===null){api.reason=['no_file'];return null}
    const r=parse(text),why=check(r,data.ref,data.prices);api.reason=why;api.parsed=r;
    if(why.length)return null;
    const ref=build(r,data.ref),anchored=closesUsable(r,data.prices),prices=anchored?anchorPrices(r,data.prices,ref):null;
    api.ref=ref;api.anchored=anchored;api.prices=prices;
    return ready.then(()=>paint(ref,anchored)).then(()=>{
     teachElon(ref,prices);
     const M=root.ObservatoryMeter;
     if(anchored&&M&&M.reanchor&&M.record)M.reanchor({...M.record,checked_on:prices.checked_on,closes:prices.closes,base:prices.base},ref);
     root.dispatchEvent(new CustomEvent('observatory-reading',{detail:{ref,anchored,prices}}));
     return ref;
    });
   }).catch(()=>null);
  }
 }
 root.ObservatoryReading=api;
})(typeof window==='undefined'?globalThis:window);
