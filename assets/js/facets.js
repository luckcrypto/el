/* Directional highlight and a slight tilt on faceted buttons under a fine pointer. Touch and reduced-motion users get static facets. */
(()=>{
 const enabled=matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
 let active=null,frame=0,point=null;
 function reset(){cancelAnimationFrame(frame);frame=0;if(active){for(const name of ['--facet-x','--facet-y','--facet-rx','--facet-ry'])active.style.removeProperty(name)}active=null;point=null}
 document.addEventListener('pointermove',event=>{
  if(!enabled.matches||event.pointerType==='touch'||window.observatoryMotionPaused)return;
  const target=event.target.closest('.button');if(target!==active){reset();active=target}if(!active)return;
  point={x:event.clientX,y:event.clientY};if(frame)return;
  frame=requestAnimationFrame(()=>{frame=0;if(!active||!point)return;const box=active.getBoundingClientRect();if(!box.width||!box.height)return;const x=Math.max(0,Math.min(1,(point.x-box.left)/box.width)),y=Math.max(0,Math.min(1,(point.y-box.top)/box.height));active.style.setProperty('--facet-x',x*100+'%');active.style.setProperty('--facet-y',y*100+'%');active.style.setProperty('--facet-rx',(0.5-y)*4+'deg');active.style.setProperty('--facet-ry',(x-0.5)*4+'deg')});
 },{passive:true});
 document.addEventListener('pointerout',e=>{if(active&&!active.contains(e.relatedTarget))reset()});
 addEventListener('blur',reset);enabled.addEventListener('change',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
})();
