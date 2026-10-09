/* A string origin means a live data service is connected ('' is the same origin). Null means a static copy with no backend. */
(()=>{
 const origin=window.OBSERVATORY_API_ORIGIN;
 const available=typeof origin==='string';
 if(!available)document.documentElement.classList.add('no-backend');
 window.ObservatoryAPI={available,url:path=>(origin||'')+path,fetch:(path,options)=>available?fetch((origin||'')+path,options):Promise.reject(new Error('backend_not_connected'))};
 if(origin)document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('a[href^="./api/"]:not([data-static])').forEach(a=>{a.href=origin+a.getAttribute('href')});
 });
})();
