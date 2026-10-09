/* Quote-driven display. Interpolation is visual only; no invented market ticks. */
(function(root){
 const format=v=>'$'+Math.round(v).toLocaleString('en-US');
 function words(value,unit){
  if(!Number.isSafeInteger(value)||value<0)return '';
  const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function group(n){if(n<20)return small[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?'-'+small[n%10]:'');return small[Math.floor(n/100)]+' hundred'+(n%100?' and '+group(n%100):'')}
  let n=value;const parts=[],scales=['','thousand','million','billion','trillion','quadrillion'];
  for(let i=0;n>0;i++,n=Math.floor(n/1000)){const chunk=n%1000;if(chunk)parts.unshift(group(chunk)+(scales[i]?' '+scales[i]:''))}
  const u=unit||{word:'dollars',one:'dollar'};
  const text=(parts.join(', ')||'zero')+' '+(value===1?u.one:u.word);return text[0].toUpperCase()+text.slice(1);
 }
 function validLive(d,now=Date.now()){
  const t=Date.parse(d?.oldest_quote_at),m=Date.parse(d?.market_status_checked_at);
  return d?.status==='market_adjusted_estimate'&&d.market_session==='open'&&Number.isSafeInteger(d.net_worth_usd)&&d.net_worth_usd>=0&&Number.isFinite(t)&&now-t<=90000&&now-t>=-5000&&Number.isFinite(m)&&now-m<=60000&&now-m>=-5000;
 }
 // The line under the number keeps to its two leading groups ("About one hundred and sixty-six trillion, two hundred
 // and ninety-nine billion yen"); the exact figure is in the digits above and, in full, in the readout's accessible name.
 function wordsShort(value,unit){
  if(!Number.isSafeInteger(value)||value<1e6)return words(value,unit);
  const step=Math.pow(1000,Math.floor(Math.log10(value)/3)-1),rounded=Math.round(value/step)*step;
  if(rounded===value)return words(value,unit);
  const w=words(rounded,unit);return 'About '+w[0].toLowerCase()+w.slice(1);
 }
 // Without measurements, fixed fallbacks. With them (from the font actually on screen), each digit cell is as wide as
 // the widest digit really is, so no digit is clipped and no comma runs into its neighbour, whatever the browser.
 function fittedSize(text,width,m){
  const units=m?[...text].reduce((sum,c)=>sum+(/\d/.test(c)?m.digit:c==='$'?m.dollar:m.comma),0)
   :[...text].reduce((sum,c,i)=>sum+(/\d/.test(c)?.61:i===0?.72:.33),0)+Math.max(0,text.length-1)*.025;
  return Math.max(1,Math.min(180,(width-4)/units));
 }
 function measure(element,pre,suf){
  const doc=element.ownerDocument,fs=parseFloat(root.getComputedStyle?.(element).fontSize);
  if(!doc||!(fs>0))return null;
  const probe=doc.createElement('span');probe.setAttribute('aria-hidden','true');
  probe.style.cssText='position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre';
  element.append(probe);
  const advance=(t,cls)=>{probe.className=cls;probe.style.width='auto';probe.style.padding='0';probe.style.margin='0';probe.textContent=t;return probe.getBoundingClientRect().width/fs};
  const widths={};let digit=0,least=Infinity;for(const c of '0123456789'){const w=advance(c,'ticker-digit');widths[c]=w+.05;digit=Math.max(digit,w);least=Math.min(least,w)}
  const comma=advance(',','ticker-punctuation'),dollar=advance('$','ticker-punctuation');
  const preW=pre?advance(pre,'ticker-punctuation ticker-pre'):0,sufW=suf?advance(suf,'ticker-punctuation ticker-suf'):0;
  probe.remove();
  if(!(digit>0))return null;
  // A little room either side of every glyph: digits get .05em, punctuation .1em, matching the CSS padding; a unit after
  // the number gets its .3em gap. If the font has no tabular figures, each settled digit takes its own width.
  return {digit:digit+.05,comma:comma+.1,dollar:dollar+.1,pre:pre?preW+.1:0,suf:suf?sufW+.12:0,widths,tabular:digit-least<.02};
 }
 const DOLLAR={pre:'$',suf:'',word:'dollars',one:'dollar'};
 function parts(value,u){const body=Math.round(value).toLocaleString('en-US');return {pre:u.pre||'',body,suf:u.suf||''}}
 function unitsFor(p,m){return (p.pre?m.pre:0)+[...p.body].reduce((s,c)=>s+(/\d/.test(c)?m.digit:m.comma),0)+(p.suf?m.suf:0)}
 function mount(element,initial,options={}){
  let previous=Number.isSafeInteger(initial)?initial:null;
  const unitOf=()=>{const u=typeof options.unit==='function'?options.unit():null;return u&&typeof u==='object'?{...DOLLAR,...u}:DOLLAR};
  const label=typeof options.label==='function'?options.label:v=>format(v)+' estimated value';const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||root.observatoryMotionPaused===true;
  element.classList.add('numeric-display');element.setAttribute('role','img');
  let metrics=null,shape='',fitKey='';
  function settle(){for(const cell of element.children){if(!cell.classList.contains('ticker-digit'))continue;cell.style.width=metrics&&!metrics.tabular&&!cell._animation&&cell.dataset.digit?metrics.widths[cell.dataset.digit].toFixed(3)+'em':''}}
  function fit(){
   if(previous===null)return;
   const width=element.parentElement?.clientWidth||element.clientWidth;if(!(width>0))return;
   const p=parts(previous,unitOf()),key=width+'|'+p.pre+p.body+p.suf+'|'+(element.ownerDocument?.fonts?.status||'');
   // Only when the width, the text or the font has changed: a resize observer must never chase its own tail.
   if(key===fitKey)return;fitKey=key;
   // Measure, size, then measure again: the font's optical size changes its widths as it grows or shrinks.
   for(let pass=0;pass<2;pass++){
    metrics=measure(element,p.pre,p.suf)||metrics;
    if(metrics)element.style.setProperty('--dw',metrics.digit.toFixed(3)+'em');
    settle();
    const size=Math.min(128,metrics?Math.max(1,(width-4)/unitsFor(p,metrics)):fittedSize(p.pre+p.body+p.suf,width));
    if(Math.abs(size-parseFloat(element.style.fontSize||0))>.25)element.style.fontSize=size+'px';
   }
  }
  const fonts=element.ownerDocument?.fonts;
  const refit=()=>{fitKey='';fit()};
  if(fonts){fonts.ready?.then(refit).catch(()=>{});fonts.addEventListener?.('loadingdone',refit)}
  if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(fit);observer.observe(element.parentElement||element)}
  root.addEventListener?.('resize',fit);
  function roll(cell,target,animate,index){
   const from=Number(cell.dataset.digit??0);cell.dataset.digit=target;
   cell._animation?.cancel();
   if(!animate||reduced()||typeof cell.animate!=='function'){cell.textContent=target;return}
   cell.style.width='';
   const count=10+(Number(target)-from+10)%10;
   const strip=document.createElement('span');strip.className='reel-strip';
   for(let n=0;n<=count;n++){const face=document.createElement('span');face.className='reel-face';face.textContent=String((from+n)%10);strip.append(face)}
   cell.replaceChildren(strip);
   const animation=strip.animate([{transform:'translateY(0)'},{transform:'translateY(-'+count+'em)'}],{duration:650+(index%4)*85,easing:'cubic-bezier(.16,.75,.19,1)',fill:'forwards'});
   cell._animation=animation;
   animation.onfinish=()=>{if(cell._animation===animation){cell.textContent=target;cell._animation=null;if(metrics&&!metrics.tabular)cell.style.width=metrics.widths[target].toFixed(3)+'em'}};
  }
  function cellFor(kind,text){const cell=document.createElement('span');cell.setAttribute('aria-hidden','true');cell.className=kind==='d'?'ticker-digit':kind==='pre'?'ticker-punctuation ticker-pre':kind==='suf'?'ticker-punctuation ticker-suf':'ticker-punctuation';if(kind!=='d')cell.textContent=text;return cell}
  function paint(value,animate){
   const next=Math.round(value),u=unitOf(),p=parts(next,u);
   element.setAttribute('aria-label',label(next));element.dataset.direction=next>=previous?'up':'down';
   const tokens=[...(p.pre?[['pre',p.pre]]:[]),...[...p.body].map(c=>[/\d/.test(c)?'d':'sep',c]),...(p.suf?[['suf',p.suf]]:[])];
   const nextShape=tokens.map(t=>t[0]==='d'?'d':t[0]+':'+t[1]).join('|');
   const rebuild=nextShape!==shape||element.childElementCount!==tokens.length;
   if(rebuild){for(const child of element.children)child._animation?.cancel();element.replaceChildren(...tokens.map(([k,t])=>cellFor(k,t)));shape=nextShape}
   tokens.forEach(([k,t],i)=>{const cell=element.children[i];if(k==='d'){if(rebuild||cell.dataset.digit!==t)roll(cell,t,animate,i)}else cell.textContent=t});
   const wordsElement=element.ownerDocument?.getElementById(element.id+'-words');if(wordsElement)wordsElement.textContent=wordsShort(next,u);
   previous=next;fit();
  }if(previous!==null)paint(previous,false);
  return {set(value,{animate=true}={}){if(!Number.isSafeInteger(value)||value<0)return false;paint(value,animate);return true},refit,get value(){return previous}};
 }
 root.ObservatoryTicker={format,validLive,mount,fittedSize,words,wordsShort};
})(typeof window==='undefined'?globalThis:window);
