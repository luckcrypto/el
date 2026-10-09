/* The price engine. It takes the dated Forbes reading and moves it by what his Tesla and SpaceX holdings
   have gained or lost since the close on the day of that reading. It runs in the browser, needs no keys,
   and always returns a figure: a current price when one can be reached, otherwise the latest close on the
   record, labelled as such. It never invents movement. The figure changes only when a fetched price does.
   Token prices stay labelled as token prices and are used only when no share price can be reached. */
(function(root){
 const SYMBOLS=['TSLA','SPCX'];
 const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const etParts=t=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t)).map(p=>[p.type,p.value]));
 const etDate=t=>{const p=etParts(t);return p.year+'-'+p.month+'-'+p.day};
 const etMinutes=t=>{const p=etParts(t);return +p.hour*60+ +p.minute};
 const shortDate=iso=>{const [y,m,d]=String(iso).split('-').map(Number);return d+' '+MONTHS[m-1]};

 function latestClose(rec,symbol){
  let best=null;for(const c of rec.closes||[])if(typeof c[symbol]==='number'&&(!best||c.date>best.date))best={date:c.date,price:c[symbol]};return best;
 }
 function baseClose(rec,symbol){const c=(rec.closes||[]).find(c=>c.date===rec.base.date);return c&&typeof c[symbol]==='number'?c[symbol]:null}
 /* The close a quote should be compared with: the latest close before the quote's trading day,
    or that day's own close once the regular session has ended. */
 function previousClose(rec,symbol,quote){
  let day,afterClose;
  if(quote.kind==='close'){day=quote.close_date;afterClose=false}else{day=etDate(quote.at);afterClose=etMinutes(quote.at)>=960}
  let best=null;
  for(const c of rec.closes||[])if(typeof c[symbol]==='number'&&(c.date<day||(afterClose&&c.date===day))&&(!best||c.date>best.date))best={date:c.date,price:c[symbol]};
  return best;
 }
 function recordQuote(rec,symbol){
  const c=latestClose(rec,symbol);
  return c?{symbol,price:c.price,at:null,close_date:c.date,kind:'close',provider:'Closing price'}:null;
 }
 function sane(rec,q){const c=latestClose(rec,q.symbol);return !!c&&Number.isFinite(q.price)&&q.price>0&&Math.abs(q.price/c.price-1)<=(rec.feeds?.sanity_band??0.25)}
 const fresh=(at,now,maxSeconds)=>Number.isFinite(at)&&now-at<=maxSeconds*1000&&at-now<=60000;

 function fromRobinhood(raw,symbol,feed,now){
  const contract=String(feed.contracts[symbol]).toLowerCase();
  const list=Array.isArray(raw?.quotes)?raw.quotes:raw&&raw.tokenSymbol?[raw]:[];
  const q=list.find(q=>q&&q.tokenSymbol===symbol&&Array.isArray(q.deployments)&&q.deployments.some(d=>d.chainId===feed.chain_id&&String(d.contractAddress).toLowerCase()===contract));
  if(!q)return null;
  const dec=v=>typeof v==='string'&&/^\d+(\.\d+)?$/.test(v);
  if(q.currency!=='USD'||!dec(q.bid)||!dec(q.ask)||q.isTradingHalt!==false)return null;
  const bid=Number(q.bid),ask=Number(q.ask),at=Date.parse(q.generatedAt);
  if(!(bid>0)||ask<bid||!fresh(at,now,feed.max_age_seconds))return null;
  return {symbol,price:Math.round((bid+ask)/2*10000)/10000,at:new Date(at).toISOString(),kind:'equity',provider:'Robinhood'};
 }
 function fromCoinGecko(raw,symbol,feed,now){
  const q=raw&&raw[String(feed.contracts[symbol]).toLowerCase()];
  if(!q||typeof q.usd!=='number'||!(q.usd>0)||typeof q.last_updated_at!=='number')return null;
  const at=q.last_updated_at*1000;
  if(!fresh(at,now,feed.max_age_seconds))return null;
  return {symbol,price:q.usd,at:new Date(at).toISOString(),kind:'token',provider:'CoinGecko'};
 }
 function fromService(raw,symbol,now){
  const q=(Array.isArray(raw?.quotes)?raw.quotes:[]).find(q=>q&&q.symbol===symbol);
  if(!q||typeof q.price!=='number'||!(q.price>0))return null;
  const at=Date.parse(q.observedAt);
  if(!fresh(at,now,120))return null;
  return {symbol,price:q.price,at:new Date(at).toISOString(),kind:'equity',provider:q.provider==='Finnhub'?'Finnhub':'Robinhood'};
 }

 function compute(rec,ref,quotes,now=Date.now()){
  if(!rec?.base||rec.base.revision!==ref?.revision)throw new Error('base_mismatch');
  if(!Number.isSafeInteger(ref.net_worth_usd))throw new Error('invalid_reference');
  const lines=rec.holdings.map(h=>{
   const q=quotes[h.symbol],base=baseClose(rec,h.symbol);
   if(!q||base===null)throw new Error('missing_price');
   const units=h.shares+(h.options||0);
   return {symbol:h.symbol,company:h.company,units,base_price:base,price:q.price,delta_usd:Math.round(units*(q.price-base)),quote:q,previous:previousClose(rec,h.symbol,q)};
  });
  const net=ref.net_worth_usd+lines.reduce((a,l)=>a+l.delta_usd,0);
  const kinds=new Set(lines.map(l=>l.quote.kind));
  const live=lines.map(l=>l.quote).filter(q=>q.at);
  const oldest=live.length?live.map(q=>q.at).sort()[0]:null;
  return {status:'price_moved_estimate',currency:'USD',net_worth_usd:net,base_usd:ref.net_worth_usd,base_revision:ref.revision,base_date:rec.base.date,
   lines,basis:kinds.size===1&&kinds.has('close')?'close':kinds.has('close')?'mixed':kinds.has('token')?'token':'equity',
   providers:[...new Set(lines.map(l=>l.quote.provider))],oldest_price_at:oldest,calculated_at:new Date(now).toISOString()};
 }

 function timed(fetcher,url,ms){
  const ctl=typeof AbortController==='function'?new AbortController():null;
  const t=setTimeout(()=>ctl&&ctl.abort(),ms);
  return fetcher(url,{headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:ctl?ctl.signal:undefined})
   .then(r=>{if(!r.ok)throw new Error('http_'+r.status);return r.json()}).finally(()=>clearTimeout(t));
 }

 /* Reads every reachable source at once, then picks per symbol: our own service, Robinhood, CoinGecko tokens,
    and finally the latest close on the record. Always resolves. */
 async function read({record,reference,fetcher=root.fetch&&root.fetch.bind(root),now=()=>Date.now(),service=null,offline=false,timeout=5000}={}){
  const feeds=record.feeds||{},candidates={TSLA:[],SPCX:[]},tried=[];
  if(!offline&&fetcher){
   const jobs=[];
   if(service)jobs.push(timed(fetcher,service,timeout).then(raw=>{tried.push('service');for(const s of SYMBOLS){const q=fromService(raw,s,now());if(q)candidates[s].push(q)}}).catch(()=>tried.push('service:failed')));
   if(feeds.robinhood)for(const s of SYMBOLS)jobs.push(timed(fetcher,feeds.robinhood.base+s,timeout).then(raw=>{tried.push('robinhood');const q=fromRobinhood(raw,s,feeds.robinhood,now());if(q)candidates[s].push(q)}).catch(()=>tried.push('robinhood:failed')));
   if(feeds.coingecko){const c=feeds.coingecko,u=c.url+'?contract_addresses='+SYMBOLS.map(s=>c.contracts[s]).join(',')+'&vs_currencies=usd&include_last_updated_at=true&precision=full';
    jobs.push(timed(fetcher,u,timeout).then(raw=>{tried.push('coingecko');for(const s of SYMBOLS){const q=fromCoinGecko(raw,s,c,now());if(q)candidates[s].push(q)}}).catch(()=>tried.push('coingecko:failed')));}
   await Promise.all(jobs);
  }
  const rank={equity:0,token:1};
  const quotes={};
  for(const s of SYMBOLS){
   const ok=candidates[s].filter(q=>sane(record,q)).sort((a,b)=>(rank[a.kind]-rank[b.kind])||(b.at>a.at?1:-1));
   quotes[s]=ok[0]||recordQuote(record,s);
  }
  const result=compute(record,reference,quotes,now());
  result.sources_tried=tried;
  return result;
 }

 const whole=n=>(n<0?'\u2212':'')+'$'+Math.abs(n).toLocaleString('en-US');
 const signed=n=>(n<0?'\u2212':'+')+'$'+Math.abs(n).toLocaleString('en-US');
 const price=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
 const formula=(l,rec)=>{const h=rec.holdings.find(h=>h.symbol===l.symbol);return l.units.toLocaleString('en-US')+(h&&h.options?' shares and options':' shares')+' \u00d7 ('+price(l.price)+' \u2212 '+price(l.base_price)+')'};
 const api={read,compute,previousClose,latestClose,baseClose,recordQuote,fromRobinhood,fromCoinGecko,fromService,shortDate,etDate,whole,signed,price,formula,SYMBOLS};

 if(typeof document!=='undefined'){
  const island=id=>{try{return JSON.parse(document.getElementById(id)?.textContent||'null')}catch{return null}};
  let record=island('price-record'),reference=island('reference-data');
  let last=null,lastFetch=0,pending=null,timer=0,gen=0;
  const subs=new Set();
  const saveData=navigator.connection?.saveData===true;
  const serviceUrl=()=>root.ObservatoryAPI?.available?root.ObservatoryAPI.url('./api/v1/quotes.json'):null;
  const publish=r=>{last=r;subs.forEach(f=>{try{f(r)}catch{}});return r};
  const seed=()=>{if(!record||!reference)return null;try{const r=compute(record,reference,Object.fromEntries(SYMBOLS.map(s=>[s,recordQuote(record,s)])));r.seeded=true;return r}catch{return null}};
  function refresh(force=false){
   if(!record||!reference)return Promise.resolve(null);
   if(pending)return pending;
   const age=Date.now()-lastFetch;
   if(last&&lastFetch&&age<(force?10000:45000))return Promise.resolve(last);
   const g=gen;
   pending=read({record,reference,service:serviceUrl()}).then(r=>{if(g!==gen)return last;lastFetch=Date.now();return publish(r)}).catch(()=>last||publish(seed())).finally(()=>{if(g===gen)pending=null;schedule()});
   return pending;
  }
  function schedule(){clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>refresh(),60000)}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(lastFetch&&Date.now()-lastFetch>45000)refresh();else schedule()});
  api.record=record;
  api.saveData=saveData;
  api.current=()=>last;
  api.refresh=refresh;
  api.subscribe=fn=>{subs.add(fn);if(last)fn(last);return()=>subs.delete(fn)};
  // Luck's daily Forbes reading with that day's closes (reading.js): the estimate moves its base to it.
  api.reanchor=(rec,ref)=>{if(!rec||!ref)return;gen++;record=rec;reference=ref;api.record=rec;lastFetch=0;pending=null;publish(seed());if(!saveData)refresh(true)};
  last=seed();
  if(last&&!saveData)refresh();
 }
 root.ObservatoryMeter=api;
})(typeof window==='undefined'?globalThis:window);
