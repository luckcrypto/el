/* Press card built from the reference record, so the card, its file names and the citation always carry the same date as the page.
   When Luck's daily Forbes reading (reading.js) is newer than the stamped one, the card is redrawn from it. */
(()=>{
 const $=s=>document.querySelector(s);
 let ref={};try{ref=JSON.parse($('#reference-data')?.textContent||'{}')}catch{}
 if(!Number.isSafeInteger(ref.net_worth_usd))return;
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const longDate=iso=>{const [y,m,d]=iso.split('-').map(Number);return d+' '+months[m-1]+' '+y};
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let svg='',name='';
 function render(){
  const v=ref.net_worth_usd,trim=s=>s.replace(/\.?0+$/,''),short=v>=1e12?'$'+trim((v/1e12).toFixed(3))+'T':'$'+(Number.isInteger(v/1e9)?String(v/1e9):(v/1e9).toFixed(1))+'B';
  svg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="#0b0e11"/><g font-family="DM Sans,Arial,Helvetica,sans-serif"><text x="100" y="140" fill="#9aa4ab" font-size="30">ElonMuskNetWorth.org</text><text x="100" y="290" fill="#e9eded" font-size="64" font-weight="500">Elon Musk net worth</text><text x="92" y="520" fill="#e9eded" font-size="200" font-weight="500" letter-spacing="-4">'+esc(short)+'</text><text x="100" y="640" fill="#c9d0d4" font-size="40">'+esc(ref.publisher)+' estimate for '+esc(longDate(ref.as_of_date))+'</text><path d="M100 712H1500" stroke="#3a4652" stroke-width="2"/><text x="100" y="782" fill="#9aa4ab" font-size="30">Checked '+esc(longDate(ref.checked_on))+'. A dated estimate, not a live figure.</text><text x="100" y="842" fill="#9aa4ab" font-size="26">Source: '+esc(ref.source_url)+'</text><text x="100" y="902" fill="#7d878e" font-size="24">Publisher estimate. The underlying holdings are not independently audited.</text></g></svg>';
  name='forbes-estimate-'+ref.as_of_date;
  const preview=$('#press-preview');if(preview)preview.innerHTML=svg;
 }
 if(window.ObservatoryReading?.ref)ref=window.ObservatoryReading.ref;
 render();
 addEventListener('observatory-reading',e=>{ref=e.detail.ref;render()});
 function download(blob,file){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('#export-svg')?.addEventListener('click',()=>download(new Blob([svg],{type:'image/svg+xml'}),name+'.svg'));
 $('#export-png')?.addEventListener('click',()=>{
  const button=$('#export-png');button.disabled=true;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();
  img.onload=()=>{const c=document.createElement('canvas');c.width=1600;c.height=1000;c.getContext('2d').drawImage(img,0,0);c.toBlob(b=>{if(b)download(b,name+'.png');button.disabled=false;URL.revokeObjectURL(url)},'image/png')};
  img.onerror=()=>{button.disabled=false;button.textContent='Use the SVG download';URL.revokeObjectURL(url)};
  img.src=url;
 });
 $('[data-copy]')?.addEventListener('click',async e=>{const b=e.currentTarget;try{await navigator.clipboard.writeText($('#citation').textContent.trim());b.textContent='Citation copied'}catch{b.textContent='Select the citation to copy it'}});
})();
