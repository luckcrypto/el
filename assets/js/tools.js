/* Currency conversion and the proportion calculator. Pure functions are exported for the stamp step and the tests;
   the page wiring runs only in a browser. Nothing typed into the calculator leaves the page. */
(function(root){
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const longDate=iso=>{const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);return d+' '+months[m-1]+' '+y};
 function perUsd(rates,code){
  if(code==='USD')return 1;
  if(rates.pegs&&rates.pegs[code])return rates.pegs[code].per_usd;
  if(rates.official&&rates.official[code])return rates.official[code].per_usd;
  if(code==='EUR')return 1/rates.per_euro.USD;
  const v=rates.per_euro[code];
  if(typeof v!=='number')throw Error('No verified rate for '+code);
  return v/rates.per_euro.USD;
 }
 function symbol(rates,code){if(code==='USD')return '$';const c=(rates.currencies||[]).concat(rates.more||[]).find(x=>x.code===code);return c?c.symbol:code+' '}
 function big(value,sym){
  if(value>=1e15)return sym+(value/1e15).toFixed(2)+' quadrillion';
  if(value>=1e12)return sym+(value/1e12).toFixed(2)+' trillion';
  if(value>=1e9)return sym+(value/1e9).toFixed(1)+' billion';
  if(value>=1e6)return sym+(value/1e6).toFixed(1)+' million';
  return sym+Math.round(value).toLocaleString('en-GB');
 }
 function count(n){if(n>=100)return Math.round(n).toLocaleString('en-GB');if(n>=1)return n.toFixed(1).replace(/\.0$/,'');return n.toFixed(2)}
 function compute(figureUsd,pay,code,rates){
  const figure=figureUsd*perUsd(rates,code);
  const years=figure/pay;
  return {figure,years,lives:years/45,needed:figure/45};
 }
 function parsePay(text){
  const cleaned=String(text||'').replace(/[\s,£$€¥₹]/g,'').replace(/^[A-Za-z]{3}(?=[\d.])/,'');
  if(cleaned==='')return {empty:true};
  if(!/^\d+(\.\d+)?$/.test(cleaned))return {error:true};
  const v=Number(cleaned);return v>0?{value:v}:{empty:true};
 }
 root.ObservatoryTools={perUsd,symbol,big,count,compute,parsePay,longDate};

 if(typeof document==='undefined')return;
 const form=document.getElementById('calc-form');if(!form)return;
 let ref={},rates={};
 try{ref=JSON.parse(document.getElementById('reference-data').textContent)}catch{}
 try{rates=JSON.parse(document.getElementById('rates-data').textContent)}catch{}
 // Luck's daily Forbes reading (reading.js), when it is newer than the stamped one.
 if(window.ObservatoryReading?.ref)ref=window.ObservatoryReading.ref;
 addEventListener('observatory-reading',e=>{ref=e.detail.ref;if(!list.hidden)run(false)});
 const $=id=>document.getElementById(id);
 const pay=$('pay'),cur=$('cur'),msg=$('calc-msg'),list=$('calc-results'),shareRow=$('calc-share-row'),share=$('calc-share');
 const EMPTY='Enter a yearly amount above zero.',ERROR='That is not a number we can use. Try digits only, like 35000.';
 function money(v,code){try{return new Intl.NumberFormat('en-GB',{style:'currency',currency:code,maximumFractionDigits:0}).format(v)}catch{return symbol(rates,code)+Math.round(v).toLocaleString('en-GB')}}
 function clear(text,isError){list.hidden=true;shareRow.hidden=true;msg.textContent=text;msg.classList.toggle('is-error',!!isError);pay.setAttribute('aria-invalid',isError?'true':'false')}
 function run(updateUrl){
  const p=parsePay(pay.value);
  if(p.empty)return clear(EMPTY,false);
  if(p.error)return clear(ERROR,true);
  const code=cur.value,r=compute(ref.net_worth_usd,p.value,code,rates),sym=symbol(rates,code),fig=big(r.figure,sym);
  $('r1n').textContent=count(r.years);$('r1').textContent='At '+money(p.value,code)+' a year it would take '+count(r.years)+' years to earn '+fig+'.';
  $('r2n').textContent=count(r.lives);$('r2').textContent='That is '+count(r.lives)+' working lives of 45 years.';
  $('r3n').textContent=big(r.needed,sym);$('r3').textContent='To earn it within one 45-year working life, the pay would need to be '+big(r.needed,sym)+' a year.';
  $('r4n').textContent=fig;$('r4').textContent=fig+' is the Forbes estimate for '+longDate(ref.as_of_date)+(code==='USD'?'.':', converted at the dated rate on the currency page.');
  msg.textContent='';msg.classList.remove('is-error');pay.setAttribute('aria-invalid','false');list.hidden=false;shareRow.hidden=false;share.textContent='Copy a link to this result';
  if(updateUrl){const u=new URL(location.href);u.searchParams.set('a',String(p.value));u.searchParams.set('c',code);history.replaceState(null,'',u)}
 }
 form.addEventListener('submit',e=>{e.preventDefault();run(true)});
 cur.addEventListener('change',()=>{if(!list.hidden)run(true)});
 share.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);share.textContent='Link copied'}catch{share.textContent='Copy the address from your browser'}});
 const q=new URLSearchParams(location.search);
 if(q.get('c')&&[...cur.options].some(o=>o.value===q.get('c')))cur.value=q.get('c');
 if(q.get('a')){pay.value=q.get('a');run(false)}else clear(EMPTY,false);
})(globalThis);
