(()=>{
 const $=s=>document.querySelector(s);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const still=()=>reduce.matches||window.observatoryMotionPaused===true;
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const longDate=iso=>{const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);return d+' '+months[m-1]+' '+y};
 let ref={};try{ref=JSON.parse($('#reference-data')?.textContent||'{}')}catch{}

 let mode='reference',cp=null;
 const T=window.ObservatoryTicker,M=window.ObservatoryMeter;
 const island=id=>{try{return JSON.parse(document.getElementById(id)?.textContent||'null')}catch{return null}};

 let lastEstimate=null;
 // The currency strip: the same figure in dollars, pounds, euros, yen, ounces of gold or bitcoin. Money at the dated
 // ECB rates; gold and bitcoin at a live price when one answers, otherwise the dated price in the record, and the
 // line under the keys always says which.
 const rates=island('rates-data'),stores=island('stores-data');
 const UNITS={USD:{pre:'$',word:'dollars',one:'dollar',tag:'dollar'},GBP:{pre:'\u00a3',word:'pounds',one:'pound',tag:'pound'},EUR:{pre:'\u20ac',word:'euros',one:'euro',tag:'euro'},JPY:{pre:'\u00a5',word:'yen',one:'yen',tag:'yen'},CNY:{pre:'CN\u00a5',word:'yuan',one:'yuan',tag:'yuan'},INR:{pre:'\u20b9',word:'rupees',one:'rupee',tag:'rupee'},
  GOLD:{pre:'',suf:'oz',word:'troy ounces of gold',one:'troy ounce of gold',tag:'ounce',store:'gold'},BTC:{pre:'',suf:'BTC',word:'bitcoin',one:'bitcoin',tag:'bitcoin',store:'bitcoin'},ETH:{pre:'',suf:'ETH',word:'ether',one:'ether',tag:'ether',store:'ethereum'}};
 // The More list: sixteen more currencies at the same dated ECB rates, the dirham and riyal at their fixed pegs, and the
 // rouble at the Bank of Russia's official rate for the same day.
 Object.assign(UNITS,{CAD:{pre:'CA$',word:'Canadian dollars',one:'Canadian dollar',tag:'Canadian dollar'},AUD:{pre:'A$',word:'Australian dollars',one:'Australian dollar',tag:'Australian dollar'},
  CHF:{pre:'',suf:'CHF',word:'Swiss francs',one:'Swiss franc',tag:'franc'},AED:{pre:'',suf:'AED',word:'dirhams',one:'dirham',tag:'dirham'},SAR:{pre:'',suf:'SAR',word:'riyals',one:'riyal',tag:'riyal'},
  HKD:{pre:'HK$',word:'Hong Kong dollars',one:'Hong Kong dollar',tag:'Hong Kong dollar'},SGD:{pre:'S$',word:'Singapore dollars',one:'Singapore dollar',tag:'Singapore dollar'},
  KRW:{pre:'\u20a9',word:'won',one:'won',tag:'won'},BRL:{pre:'R$',word:'reais',one:'real',tag:'real'},MXN:{pre:'MX$',word:'Mexican pesos',one:'Mexican peso',tag:'peso'},
  ZAR:{pre:'R',word:'rand',one:'rand',tag:'rand'},SEK:{pre:'',suf:'SEK',word:'Swedish kronor',one:'Swedish krona',tag:'krona'},
  NOK:{pre:'',suf:'NOK',word:'Norwegian kroner',one:'Norwegian krone',tag:'krone'},RUB:{pre:'\u20bd',word:'roubles',one:'rouble',tag:'rouble'},NZD:{pre:'NZ$',word:'New Zealand dollars',one:'New Zealand dollar',tag:'New Zealand dollar'},TRY:{pre:'\u20ba',word:'Turkish lira',one:'Turkish lira',tag:'lira'}});
 const MORE=new Set((rates?.more||[]).map(c=>c.code));
 let cur='USD',usdShown=null;const liveStore={};let liveAt=0;
 const storeUsd=k=>liveStore[k]?.usd||stores?.[k]?.usd;
 function perUsd(code){
  const u=UNITS[code];
  if(u.store)return storeUsd(u.store)?1/storeUsd(u.store):null;
  if(code==='USD')return 1;
  if(rates?.pegs?.[code])return rates.pegs[code].per_usd;
  if(rates?.official?.[code])return rates.official[code].per_usd;
  const pe=rates?.per_euro,per=code==='EUR'?1:pe?.[code];return per&&pe?.USD?per/pe.USD:null;
 }
 const fmtUsd=(n,d=0)=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
 function note(){
  const u=UNITS[cur],el=$('#cur-note');if(!el)return;el.dataset.base=String(cur==='USD');
  if(cur==='USD'){el.textContent='Our daily checkpoints, built on live TSLA and SPCX prices, are what make this live calculation work.';return}
  if(u.store){const s=stores[u.store],l=liveStore[u.store],px=l?l.usd:s.usd;
   el.textContent='At '+fmtUsd(px,u.store==='gold'?0:2)+({gold:' a troy ounce, ',bitcoin:' a bitcoin, ',ethereum:' an ether, '}[u.store])+(l?'from '+stores.live.labels[u.store]+' at '+timeOf(l.at)+'.':'the price at '+s.time+' on '+longDate(s.as_of)+'.')+(u.store==='ethereum'&&s.supply&&usdShown?' The funny part: on paper he could own all '+(s.supply/1e6).toFixed(1)+' million ether in existence '+(usdShown/(s.supply*px)).toFixed(1)+' times over.':'');return}
  const r=perUsd(cur),each=(r>=10?r.toFixed(2):r.toFixed(4)),amount=u.pre?u.pre+each:each+' '+u.suf,peg=rates?.pegs?.[cur],off=rates?.official?.[cur];
  el.textContent=(peg?'At the fixed peg set by the '+peg.source.replace(/ peg$/,''):off?'At the '+off.source+' for '+longDate(off.date):'At the ECB rate for '+longDate(rates.rate_date))+': '+amount+' to the dollar.'+(off?.why?' '+off.why:'');
 }
 function labelFor(value){
  const u=UNITS[cur];
  return T.words(value,u)+(mode==='estimate'?', our estimate: '+(lastEstimate&&/^checkpoint-/.test(lastEstimate.base_revision||'')?'our last checkpoint':'the published reading')+' moved by Tesla and SpaceX share prices since':mode==='checkpoint'&&cp?', our checkpoint '+(cp.kind==='open'?'just after the open':'at the close')+' on '+longDate(cp.date):', the published estimate for '+longDate(ref.as_of_date))+(cur==='USD'?'':', converted from US dollars');
 }
 const readout=$('#wealth')?T.mount($('#wealth'),null,{label:labelFor,unit:()=>UNITS[cur]}):null;
 function show(usd,animate=true){
  usdShown=usd;const r=perUsd(cur);
  dispatchEvent(new CustomEvent('observatory-figure',{detail:{usd}}));
  if(UNITS[cur].store==='ethereum')note();
  if(!readout||!(r>0))return;
  readout.set(Math.round(usd*r),{animate:animate&&!still()});
 }
 async function fetchLive(){
  if(!stores?.live||navigator.connection?.saveData===true||Date.now()-liveAt<60000)return false;
  liveAt=Date.now();
  const L=stores.live,ctl=typeof AbortController==='function'?new AbortController():null,t=setTimeout(()=>ctl&&ctl.abort(),5000);
  try{
   const r=await fetch(L.url+'?ids='+Object.values(L.ids).join(',')+'&vs_currencies=usd&include_last_updated_at=true',{headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:ctl?.signal});
   if(!r.ok)return false;const d=await r.json();let changed=false;
   for(const [k,id] of Object.entries(L.ids)){
    const q=d?.[id],at=q?.last_updated_at*1000;
    if(typeof q?.usd!=='number'||!(q.usd>0)||!Number.isFinite(at)||Date.now()-at>L.max_age_seconds*1000)continue;
    if(Math.abs(q.usd/stores[k].usd-1)>L.sanity_band)continue;
    liveStore[k]={usd:q.usd,at:new Date(at).toISOString()};changed=true;
   }
   return changed;
  }catch{return false}finally{clearTimeout(t)}
 }
 // The strip and its More list are one shell (#cur-box). More springs it open the way Elon's bar opens: a short
 // overshoot, then it settles; closing lifts slightly first. Under reduced motion it simply opens and closes.
 const curBox=$('#cur-box'),keys=$('#cur-keys'),drop=$('#cur-drop'),moreBtn=$('#cur-more'),moreLabel=$('#cur-more-label');
 let moreOpen=false,moreAnim=null;
 function spring(from,to,opening){
  if(!drop)return;
  if(moreAnim){moreAnim.cancel();moreAnim=null}
  if(still()||typeof drop.animate!=='function'){drop.style.height=opening?'auto':'0px';if(!opening)curBox.classList.remove('is-open');return}
  const frames=opening?[{height:from+'px'},{height:(to*1.07+4)+'px',offset:.55},{height:(to*.98)+'px',offset:.8},{height:to+'px'}]:[{height:from+'px'},{height:(from*1.04+3)+'px',offset:.22},{height:'0px'}];
  drop.style.height=from+'px';
  moreAnim=drop.animate(frames,{duration:opening?560:360,easing:opening?'cubic-bezier(.22,.8,.25,1)':'cubic-bezier(.55,0,.75,.4)'});
  moreAnim.onfinish=()=>{moreAnim=null;drop.style.height=opening?'auto':'0px';if(!opening)curBox.classList.remove('is-open')};
 }
 function openMore(){
  if(!curBox||moreOpen)return;moreOpen=true;
  const from=drop.getBoundingClientRect().height;curBox.classList.add('is-open');drop.style.height='auto';
  const to=drop.scrollHeight;moreBtn.setAttribute('aria-expanded','true');spring(from,to,true);
 }
 function closeMore(){
  if(!curBox||!moreOpen)return;moreOpen=false;moreBtn.setAttribute('aria-expanded','false');
  spring(drop.getBoundingClientRect().height,0,false);
 }
 function markMore(code){
  if(!moreBtn)return;const extra=MORE.has(code);
  moreLabel.textContent=extra?code:'More';moreBtn.classList.toggle('is-chosen',extra);
  moreBtn.setAttribute('aria-label',extra?'More currencies, '+UNITS[code].one+' chosen':'More currencies');
  const key=keys?.querySelector('[data-cur="'+code+'"]');
  if(key&&keys.scrollWidth>keys.clientWidth+1){const l=key.offsetLeft-keys.offsetLeft,r=l+key.offsetWidth;if(l<keys.scrollLeft||r>keys.scrollLeft+keys.clientWidth)keys.scrollTo({left:Math.max(0,l-8),behavior:still()?'auto':'smooth'})}
 }
 function fades(){if(!keys)return;const max=keys.scrollWidth-keys.clientWidth;keys.classList.toggle('fade-start',keys.scrollLeft>2);keys.classList.toggle('fade-end',max>2&&keys.scrollLeft<max-2)}
 if(curBox&&moreBtn&&drop){
  moreBtn.addEventListener('click',()=>moreOpen?closeMore():openMore());
  curBox.addEventListener('keydown',e=>{if(e.key==='Escape'&&moreOpen){e.preventDefault();closeMore();moreBtn.focus({preventScroll:true})}});
  document.addEventListener('pointerdown',e=>{if(moreOpen&&!curBox.contains(e.target))closeMore()});
  document.addEventListener('focusin',e=>{if(moreOpen&&!curBox.contains(e.target))closeMore()});
  keys.addEventListener('scroll',fades,{passive:true});
  if(typeof ResizeObserver==='function')new ResizeObserver(fades).observe(keys);
  fades();
 }
 function choose(code,{animate=true,remember=true}={}){
  if(!UNITS[code]||!(perUsd(code)>0))return;
  cur=code;
  document.querySelectorAll('[data-cur]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cur===code)));
  markMore(code);
  if(remember)try{localStorage.setItem('emn-currency',code)}catch{}
  note();if(usdShown!==null)show(usdShown,animate);
  if(mode==='estimate'&&lastEstimate)tagEstimate(lastEstimate);
  if(UNITS[code].store)fetchLive().then(ch=>{if(ch&&cur===code){note();show(usdShown,true)}});
 }
 document.querySelectorAll('[data-cur]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.cur);if(b.classList.contains('cur-pick')){closeMore();moreBtn?.focus({preventScroll:true})}}));
 // Links such as Elon's "Switch the number above to it" carry ?cur=GOLD; on this page they switch without a reload.
 document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href*="?cur="]');if(!a)return;const u=new URL(a.href,location.href);if(u.pathname!==location.pathname)return;const c=u.searchParams.get('cur');if(!UNITS[c])return;e.preventDefault();choose(c);document.getElementById('number')?.scrollIntoView({behavior:still()?'auto':'smooth'})});
 let saved=null;try{saved=localStorage.getItem('emn-currency')}catch{}
 const asked=new URLSearchParams(location.search).get('cur');if(asked&&UNITS[asked])saved=asked;
 if(Number.isSafeInteger(ref.net_worth_usd)){usdShown=ref.net_worth_usd;if(saved&&saved!=='USD'&&UNITS[saved])choose(saved,{animate:false,remember:false});else show(ref.net_worth_usd,true)}

 function daysSince(iso){const [y,m,d]=iso.split('-').map(Number),now=new Date();return Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(y,m-1,d))/864e5)}
 function paintAge(){
  const tag=$('#age-tag');if(!tag||!ref.checked_on||mode!=='reference')return;
  const n=daysSince(ref.checked_on);tag.classList.toggle('is-stale',n>7);
  tag.textContent=n>7?'The published reading is '+n+' days old. Calculate now moves it by the share prices since.':'Published to '+(ref.rounding_short||'the nearest $100 million')+'.';
 }
 paintAge();
 // Luck's daily Forbes reading (reading.js): when it is newer than the stamped one, the headline rolls to it.
 function takeReading(next){
  if(!next||!Number.isSafeInteger(next.net_worth_usd))return;
  ref=next;
  if(mode==='reference'){usdShown=ref.net_worth_usd;choose(cur,{animate:true,remember:false})}
  paintAge();
 }
 if(window.ObservatoryReading?.ref)takeReading(window.ObservatoryReading.ref);
 addEventListener('observatory-reading',e=>takeReading(e.detail.ref));
 // Our daily checkpoint at the US close (reading.js, api/v1/checkpoint.txt): the headline shows it to the dollar,
 // with its date and time, until Calculate now moves it on.
 const clock=t=>{const [h,m]=t.split(':').map(Number);return (h%12||12)+(m?'.'+String(m).padStart(2,'0'):'')+(h<12?'am':'pm')};
 function takeCheckpoint(c){
  if(!c||!Number.isSafeInteger(c.usd))return;cp=c;
  if(mode==='estimate')return;
  mode='checkpoint';usdShown=c.usd;choose(cur,{animate:true,remember:false});
  const when=longDate(c.date)+' at '+clock(c.time)+' New York time';
  const prov=$('#headline-provenance');if(prov)prov.textContent=(c.kind==='open'?'Our checkpoint just after the US market opened, on ':'Our checkpoint at the US market close on ')+when+': the published reading of '+longDate(c.ref?c.ref.checkpoint.anchor_date:ref.as_of_date)+', moved by what Tesla and SpaceX shares had done by then.';
  const tag=$('#age-tag');if(tag){tag.classList.remove('is-stale');tag.classList.add('is-calculated');tag.textContent=c.kind==='open'?'To the dollar*, just after the open. Calculate now moves it on.':'To the dollar*, at the close. Calculate now moves it on.'}
  const note=$('#figure-note-text');
  if(note){note.textContent='*Our checkpoint, taken '+(c.kind==='open'?'just after the open on ':'after the close on ')+when+' from Tesla at $'+Number(c.quote.TSLA).toFixed(2)+' and SpaceX at $'+Number(c.quote.SPCX).toFixed(2)+' a share. Printing it to the dollar does not make it certain to the dollar: it rests on a published reading rounded to '+(ref.rounding_short||'the nearest $1 billion')+' and on filed share counts. ';
   const a=document.createElement('a');a.href='./net-worth-by-day.html';a.textContent='Every close, day by day';note.append(a,'.')}
 }
 if(window.ObservatoryReading?.checkpoint)takeCheckpoint(window.ObservatoryReading.checkpoint);
 addEventListener('observatory-checkpoint',e=>takeCheckpoint({...e.detail.checkpoint,ref:e.detail.ref}));

 const timeOf=iso=>{const t=new Date(iso);return isNaN(t)?'':t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})};
 const marketClosed=()=>window.ObservatoryMarketClock?.session().state==='closed';
 // One plain phrase for where the prices came from, per company when they differ.
 function basis(r){
  const part=q=>q.kind==='close'?'the close on '+longDate(q.close_date):q.kind==='token'?'CoinGecko token prices at '+timeOf(q.at):q.provider+' prices at '+timeOf(q.at);
  const parts=r.lines.map(l=>part(l.quote));
  let text=parts.every(p=>p===parts[0])?(r.basis==='close'?'the closing prices on '+longDate(r.lines[0].quote.close_date):parts[0]):r.lines.map((l,i)=>l.company+' from '+parts[i]).join(', ');
  if(r.basis!=='close'&&marketClosed())text+=', outside US market hours';
  return text;
 }
 // The short form for the line under the button, kept to one line on a laptop.
 function shortBasis(r){
  const qs=r.lines.map(l=>l.quote),one=qs.every(q=>q.kind===qs[0].kind&&q.provider===qs[0].provider);
  const dm=iso=>longDate(iso).replace(/ \d{4}$/,'');
  if(one)return qs[0].kind==='close'?'the closing prices of '+dm(qs[0].close_date):qs[0].kind==='token'?'token prices at '+timeOf(r.oldest_price_at):qs[0].provider+' prices at '+timeOf(r.oldest_price_at);
  const names=[...new Set(qs.map(q=>q.kind==='close'?'closing':q.kind==='token'?'token':q.provider))];
  return names.join(' and ')+' prices';
 }
 function paintCount(r){
  if(!r)return;
  const v=$('#live-value');if(v)v.textContent=M.whole(r.net_worth_usd);
  const st=$('#live-status');if(st)st.textContent=r.seeded?'From '+basis(r)+'. '+(M.saveData?'Press Calculate now for current prices.':'Checking for current prices\u2026'):r.basis==='close'?'No current price could be reached, so this uses '+basis(r)+'.':'Calculated at '+timeOf(r.calculated_at)+' from '+basis(r)+'.';
  for(const l of r.lines){const row=document.querySelector('[data-meter="'+l.symbol+'"]');if(row){row.querySelector('small').textContent=M.formula(l,M.record||{holdings:[]});row.querySelector('dd').textContent=M.signed(l.delta_usd)}}
  const total=document.querySelector('[data-meter="total"] dd');if(total)total.textContent=M.whole(r.net_worth_usd);
 }
 function tagEstimate(r){const tag=$('#age-tag');if(tag)tag.textContent='To the '+UNITS[cur].tag+'*, from '+shortBasis(r)+'.'}
 function showEstimate(r){
  if(!r)return;
  mode='estimate';show(r.net_worth_usd);
  $('#headline-provenance').textContent=/^checkpoint-/.test(r.base_revision||'')&&cp?'Our estimate: our checkpoint '+(cp.kind==='open'?'just after the open':'at the close')+' on '+longDate(cp.date)+', moved by what Tesla and SpaceX shares have done since.':'Our estimate: the published reading of '+longDate(r.base_date)+', moved by what Tesla and SpaceX shares have done since that day’s close.';
  const tag=$('#age-tag');tag.classList.remove('is-stale');tag.classList.add('is-calculated');
  lastEstimate=r;tagEstimate(r);
  const note=$('#figure-note-text');
  note.textContent='*Our estimate, calculated at '+timeOf(r.calculated_at)+' from '+basis(r)+'. Printing it to the dollar does not make it certain to the dollar: it rests on a reading rounded to '+(ref.rounding_short||'the nearest $1 billion')+' and on filed share counts. ';
  const a=document.createElement('a');a.href='#own-count';a.textContent='How it is worked out';note.append(a,'.');
 }
 let inFlight=false;
 async function calculate(source){
  if(inFlight||!M)return;inFlight=true;
  const buttons=['#calculate-now','#refresh-live'].map(sel=>$(sel)).filter(Boolean);
  buttons.forEach(b=>{b.disabled=true;if(b===source){b.textContent='Calculating…';b.setAttribute('aria-busy','true')}});
  try{
   const [r]=await Promise.all([M.refresh(true),new Promise(ok=>setTimeout(ok,450))]);
   if(r){showEstimate(r);paintCount(r);$('#calc-halo')?.classList.remove('is-calling')}
   else{const tag=$('#age-tag');tag.textContent='The price record could not be read. The published figure stays.'}
  }finally{buttons.forEach(b=>{b.disabled=false;b.textContent='Calculate now';b.removeAttribute('aria-busy')});inFlight=false}
 }
 $('#calculate-now')?.addEventListener('click',e=>calculate(e.currentTarget));
 // Help me increase my net worth: each copy button copies its own address, and stays off until the address is filled in.
 document.querySelectorAll('[data-copy-address]').forEach(b=>{const t=$(b.dataset.copyAddress);if(!t||!t.dataset.address){b.disabled=true;return}b.disabled=false;
  b.addEventListener('click',async()=>{const label=b.textContent,coin=t.dataset.coin||'The';let ok=true;try{await navigator.clipboard.writeText(t.dataset.address);b.textContent='Copied';b.classList.add('is-copied')}catch{ok=false;b.textContent='Select it';const r=document.createRange();r.selectNodeContents(t);const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}
   window.observatoryToast?.(ok?coin+' address copied. Check its start and end when you paste it.':'Copying is blocked here, so the address is selected: copy it from your keyboard or menu.');setTimeout(()=>{b.textContent=label;b.classList.remove('is-copied')},2500)})});
 // The owner's checkpoint tool: open the home page with ?checkpoint after the US close, press Calculate now, and copy
 // the line into api/v1/checkpoint.txt. The dollars are worked from the stamped Forbes reading so every page can check them.
 if(new URLSearchParams(location.search).has('checkpoint')&&M&&$('#age-tag')){
  const box=document.createElement('div');box.className='checkpoint-tool';box.id='checkpoint-tool';
  box.innerHTML='<p class="checkpoint-note" id="cp-note" role="status">Checkpoint tool. Twice a trading day: from 10am New York, half an hour after the open, and after 4pm New York, once it has closed. Press Calculate now, then copy the line into api/v1/checkpoint.txt.</p><pre class="embed-code" tabindex="0" id="cp-line" aria-label="Checkpoint line">No line yet.</pre><button class="button quiet" type="button" id="cp-copy" disabled>Copy checkpoint line</button><p class="checkpoint-note" id="cp-sources"></p>';
  $('#age-tag').after(box);
  const R=window.ObservatoryReading,data=(()=>{try{return JSON.parse(document.getElementById('reading-data').textContent)}catch{return null}})();
  let line='';
  const make=r=>{
   const note=$('#cp-note'),out=$('#cp-line'),btn=$('#cp-copy'),s=window.ObservatoryMarketClock?.session();
   line='';btn.disabled=true;
   const src=$('#cp-sources');if(src&&r&&r.sources_tried)src.textContent='Price sources just now: '+(r.sources_tried.length?r.sources_tried.join('; '):'none tried')+'.';
   if(!r||!R||!data)return;
   // A morning line from 10am to 12.59pm New York while the market is open; a close line once it has shut.
   const nyt=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value])),mins=+nyt.hour*60+ +nyt.minute,morning=s&&s.state==='open'&&mins>=600&&mins<780;
   if(!s||(!morning&&s.reason!=='After regular session')){note.textContent=s&&s.state==='open'?(mins<600?'The market has just opened. Come back from 10am New York for the morning line.':'The market is open. The close line is ready after 4pm New York.'):'No checkpoint to record now ('+(s?s.reason.toLowerCase():'market calendar unavailable')+').';out.textContent='No line yet.';return}
   if(r.lines.some(l=>l.quote.kind!=='equity')){note.textContent=r.lines.some(l=>l.quote.kind==='token')?'Only token prices could be reached, and a checkpoint needs share prices. Try Calculate now again.':'No current share price could be reached. Try Calculate now again.';out.textContent='No line yet.';return}
   const quote=Object.fromEntries(r.lines.map(l=>[l.symbol,l.price])),usd=R.exact(data.ref,data.prices,quote);
   if(!Number.isSafeInteger(usd)){note.textContent='The prices could not be worked into a figure.';return}
   const t=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(r.oldest_price_at||r.calculated_at)).map(p=>[p.type,p.value]));
   line=R.checkpointLine(s.date,t.hour+':'+t.minute,usd,quote);
   out.textContent=line;btn.disabled=false;note.textContent='Ready: '+M.whole(usd)+(morning?' just after the open on ':' at the close on ')+longDate(s.date)+'. Copy it into api/v1/checkpoint.txt on a new line.';
  };
  M.subscribe(r=>{if(!r.seeded)make(r)});
  $('#cp-copy').addEventListener('click',async e=>{const b=e.currentTarget;try{await navigator.clipboard.writeText(line);b.textContent='Line copied'}catch{b.textContent='Select the line to copy it'}});
 }
 $('#refresh-live')?.addEventListener('click',e=>calculate(e.currentTarget));
 if(M){try{M.record=JSON.parse($('#price-record')?.textContent||'null')}catch{}M.subscribe(r=>{paintCount(r);if(mode==='estimate'&&!inFlight)showEstimate(r)})}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)paintAge()});

 const rows=[...document.querySelectorAll('.body-row')];
 const live=$('#orrery-live');
 let selected=null;
 function select(id,source){
  if(selected===id)return;selected=id;
  rows.forEach(r=>r.classList.toggle('is-selected',r.dataset.body===id));
  document.querySelectorAll('.svg-body').forEach(g=>g.classList.toggle('is-selected',g.dataset.body===id));
  window.dispatchEvent(new CustomEvent('orrery-select',{detail:{id,source}}));
  if(id&&live){const row=document.getElementById('body-'+id);live.textContent=row.querySelector('.body-name').textContent+' selected. '+row.querySelector('.body-tag').textContent+'.'}
 }
 rows.forEach(row=>{
  row.addEventListener('toggle',()=>{if(row.open)select(row.dataset.body,'list');else if(selected===row.dataset.body&&!rows.some(r=>r.open))select(null,'list')});
  row.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')window.dispatchEvent(new CustomEvent('orrery-hover',{detail:{id:row.dataset.body}}))});
  row.addEventListener('pointerleave',()=>window.dispatchEvent(new CustomEvent('orrery-hover',{detail:{id:null}})));
 });
 function pick(id){const row=document.getElementById('body-'+id);if(!row)return;if(row.open)select(id,'scene');else row.open=true;if(matchMedia('(max-width: 720px)').matches)row.scrollIntoView({block:'start',behavior:still()?'auto':'smooth'})}
 window.addEventListener('orrery-pick',e=>pick(e.detail.id));
 window.addEventListener('orrery-scene-hover',e=>rows.forEach(r=>r.classList.toggle('is-hover',r.dataset.body===e.detail.id)));
 $('#orrery-svg')?.addEventListener('click',e=>{const g=e.target.closest('.svg-body');if(g)pick(g.dataset.body)});
 window.ObservatoryOrrery={get selected(){return selected}};
 function fromHash(){const h=/^#body-([a-z0-9]+)$/.exec(location.hash);if(h&&document.getElementById('body-'+h[1]))pick(h[1])}
 window.addEventListener('hashchange',fromHash);fromHash();

 const forced=matchMedia('(forced-colors: active)').matches,saveData=navigator.connection?.saveData===true;
 function loadScenes(){if(forced||saveData)return;import('./orrery.js').catch(()=>{});import('./starfield.js').catch(()=>{})}
 if('requestIdleCallback' in window)requestIdleCallback(loadScenes,{timeout:1800});else setTimeout(loadScenes,900);

 const toggle=$('#companion-toggle'),panel=$('#companion-panel');
 const lines=['Paper wealth is a price multiplied by a share count. Neither number is cash.','A figure without its date is only half a figure.','The game on this page is fiction. The figure above is not part of it.'];
 let line=0;
 function companion(open){if(!panel)return;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open))}
 toggle?.addEventListener('click',()=>companion(panel.hidden));
 $('#companion-next')?.addEventListener('click',()=>{line=(line+1)%lines.length;$('#companion-line').textContent=lines[line]});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel&&!panel.hidden){companion(false);toggle.focus()}});

 const loadQuotes=$('#load-quotes');
 loadQuotes?.addEventListener('click',()=>{
  loadQuotes.disabled=true;
  const status=$('#quote-widget-status');status.textContent='Loading the TradingView panel…';
  const config=JSON.parse($('#quote-widget-config').textContent);config.colorTheme=window.ObservatoryTheme?.current()==='light'?'light':'dark';
  const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';script.async=true;script.textContent=JSON.stringify(config);
  script.onload=()=>{loadQuotes.hidden=true;$('.tradingview-widget-copyright').hidden=false;status.textContent='Quote panel loaded. TradingView and the exchange decide availability and delays.'};
  script.onerror=()=>{script.remove();loadQuotes.disabled=false;status.textContent='The quote panel could not load. The TradingView links under market hours still work.'};
  $('.tradingview-widget-container').append(script);
 });

 const dialog=$('#game-dialog');
 function openGame(){
  if(!dialog)return;if(!dialog.open)dialog.showModal();
  $('#game-status').textContent='Loading the game…';
  import('./game.js').then(()=>window.setupMission?.()).catch(()=>{$('#game-status').textContent='The game could not load. The rest of the site works without it.'});
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-open="mission"]'))openGame()});
 dialog?.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());
 dialog?.addEventListener('close',()=>window.stopMission?.());
 dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
})();
