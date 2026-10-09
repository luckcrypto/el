(function(root){
 const holidays={2026:['01-01','01-19','02-16','04-03','05-25','06-19','07-03','09-07','11-26','12-25'],2027:['01-01','01-18','02-15','03-26','05-31','06-18','07-05','09-06','11-25','12-24'],2028:['01-17','02-21','04-14','05-29','06-19','07-04','09-04','11-23','12-25']};
 const early=new Set(['2026-11-27','2026-12-24','2027-11-26','2028-07-03','2028-11-24']);
 function session(at=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(p=>[p.type,p.value]));
  const y=+parts.year,date=parts.year+'-'+parts.month+'-'+parts.day,md=parts.month+'-'+parts.day,minutes=+parts.hour*60+ +parts.minute;
  if(!holidays[y])return {state:'unknown',label:'Market schedule unavailable',basis:'calendar',date};
  const weekend=['Sat','Sun'].includes(parts.weekday),holiday=holidays[y].includes(md),close=early.has(date)?780:960;
  const open=!weekend&&!holiday&&minutes>=570&&minutes<close;
  return {state:open?'open':'closed',label:open?'Market open':'Market closed',basis:'published_regular_session_calendar',date,eastern_time:parts.hour+':'+parts.minute,reason:weekend?'Weekend':holiday?'Exchange holiday':minutes<570?'Before regular session':minutes>=close?'After regular session':'Regular session',early_close:early.has(date),source:'https://www.nyse.com/trade/hours-calendars'};
 }
 root.ObservatoryMarketClock={session};
 if(typeof document!=='undefined'){
  const update=()=>{const badge=document.querySelector('#market-session'),detail=document.querySelector('#market-session-detail');if(!badge)return;const s=session();badge.textContent=s.label;badge.dataset.state=s.state;if(badge.parentElement)badge.parentElement.dataset.state=s.state;detail.textContent=s.state==='unknown'?'Calendar needs updating.':s.reason+' · '+s.eastern_time+' ET · Scheduled regular session';};update();setInterval(update,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 }
})(typeof window==='undefined'?globalThis:window);
