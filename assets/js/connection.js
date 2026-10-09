const status=document.getElementById('connection-status'),button=document.getElementById('check-feed'),result=document.getElementById('quote-check');
const messages={market_data_license_required:'Public display configuration is incomplete.',market_data_credential_required:'The market API key has not been added yet.',market_closed:'Regular trading is closed.',provider_access_denied:'The provider rejected access.',provider_rate_limited:'The provider rate limit was reached.',provider_unreachable:'The provider could not be reached.',contract_not_in_registry:'Contract not found in the official mainnet registry.',contract_inactive:'The registered contract is inactive.',unsupported_underlying:'The registered asset is not a supported Tesla or SpaceX equity.',quote_contract_mismatch:'The quote does not match the registered contract.',trading_halt_or_unknown:'Trading is halted or its halt status is unknown.',stale_quote:'The quote timestamp is too old.',future_quote:'The quote timestamp is in the future.',invalid_quote:'The provider returned an unusable price.',coingecko_access_required:'CoinGecko requires API access for this request.',invalid_quote_timestamp:'The provider supplied no usable price timestamp.'};
if(!window.ObservatoryAPI.available){
 status.textContent='No live data service is connected to this copy of the site, so feeds are not checked here. The reference record and its CSV are static files and still download.';
 result.textContent='Nothing to check without the data service.';button.disabled=true;
}else{
let timer,inFlight=false;
window.ObservatoryAPI.fetch('./api/v1/status.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{status.textContent=d.price_provider+'. '+(d.development_feed?'Development connection enabled. ':d.price_feed_configured?'Feed configured. ':'Feed not configured. ')+(d.ownership_ready?'Ownership model reviewed.':'Ownership model still needs source verification.');}).catch(()=>{status.textContent='Connection status is temporarily unavailable.'});
async function check(){
 if(inFlight||document.hidden)return;inFlight=true;button.disabled=true;clearTimeout(timer);
 result.textContent='Checking registered contracts and current quotes…';
 try{
  const r=await window.ObservatoryAPI.fetch('./api/v1/feeds.json',{cache:'no-store',signal:AbortSignal.timeout(15000)}),d=await r.json();
  const rows=[...(d.equities||[]),...(d.tokens||[])];result.replaceChildren();
  if(!rows.length){result.textContent=messages[d.reason]||'The direct feed is unavailable. No price was substituted.';return}
  for(const q of rows){const p=document.createElement('p');
   p.textContent=q.status==='unavailable'?(q.symbol||q.contract_address.slice(0,8)+'…'+q.contract_address.slice(-4))+': '+(messages[q.reason]||'Quote unavailable.'):
   q.symbol+(q.price_basis==='token_market_price'?' · token price':' · equity quote')+' $'+q.price.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:4})+' · '+(q.bid?'bid/ask midpoint · generated ':'observed ')+new Date(q.observedAt).toLocaleTimeString('en-GB');
   result.append(p);
  }
  const note=document.createElement('p');note.textContent='Checks every 60 seconds while visible. Token prices are reported separately from equity prices. Verified holdings in the net-worth model: '+d.ownership.holding_count+'.';result.append(note);
 }catch{result.textContent='The quote check did not complete. Retrying shortly.'}
 finally{button.disabled=false;inFlight=false;timer=setTimeout(check,60000)}
}
button.onclick=check;document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden)check()});check();
}
