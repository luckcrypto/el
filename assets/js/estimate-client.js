(function(root){
 function validate(d,now=Date.now()){
  if(!d||!Number.isSafeInteger(d.net_worth_usd)||d.net_worth_usd<0||d.currency!=='USD')return false;
  if(d.status==='market_adjusted_estimate')return root.ObservatoryTicker.validLive(d,now);
  return false;
 }
 async function read(){const r=await window.ObservatoryAPI.fetch('./api/v1/current.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});const d=await r.json();if(!r.ok)throw new Error(d.reason||'estimate_unavailable');if(!validate(d))throw new Error('invalid_estimate');return d;}
 root.ObservatoryEstimate={read,validate};
})(typeof window==='undefined'?globalThis:window);
