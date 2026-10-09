/* The embed shows the stamped reference. If a live data service answers with a valid calculation, that replaces it and says so. */
(async()=>{
 const value=document.getElementById('widget-value'),status=document.getElementById('widget-status');
 try{const d=await window.ObservatoryEstimate.read();value.textContent=window.ObservatoryTicker.format(d.net_worth_usd);status.textContent='Our calculated estimate from live prices'}catch{}
})();
