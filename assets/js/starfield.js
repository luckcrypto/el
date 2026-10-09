/* Star cluster for the opening and closing bands. One renderer, one full-band shader; its canvas moves to whichever band is on screen.
   Stars are synthesised per pixel rather than allocated as objects. Dark theme only. */
import * as THREE from './three.module.js';
const hosts=[...document.querySelectorAll('[data-starfield]')];
if(hosts.length){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:720px)');
 const still=()=>reduced.matches||window.observatoryMotionPaused===true;
 const dark=()=>(window.ObservatoryTheme?.current?.()||'dark')!=='light';
 let renderer=null,active=null,frame=0,last=0,time=0,px=0,py=0,tx=0,ty=0,lost=false,disposed=false;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'})}catch{renderer=null}
 if(renderer){
  renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
  // Gas and dust are painted once into a small tiling texture (periodic value noise), so each frame reads it rather than
  // computing noise for every pixel of the band.
  const gasMap=(()=>{
   const N=256,hash=(x,y)=>{let h=Math.imul(x,374761393)+Math.imul(y,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296};
   const n=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*fx*(fx*(fx*6-15)+10),v=fy*fy*fy*(fy*(fy*6-15)+10);const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v};
   const f=(x,y)=>{let s=0,a=.5;for(let o=0;o<5;o++){s+=a*n(x,y);const rx=x*1.6-y*1.2,ry=x*1.2+y*1.6;x=rx+3.1;y=ry+1.7;a*=.5}return s/.96875};
   const data=new Uint8Array(N*N*4);
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=x/N*4,v=y/N*4,w=f(u*1.3+4,v*1.3),g=f(u+w*1.4,v+w*1.4),l=f(u*2.4+9,v*2.4);const i=(y*N+x)*4;data[i]=Math.min(255,g*255);data[i+1]=Math.min(255,l*255);data[i+2]=0;data[i+3]=255}
   const t=new THREE.DataTexture(data,N,N,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
  })();
  const uniforms={resolution:{value:new THREE.Vector2(1,1)},scrollDepth:{value:0},pointer:{value:new THREE.Vector2()},clock:{value:0},layers:{value:mobile.matches?3:5},gasMap:{value:gasMap}};
  const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,transparent:true,
   vertexShader:'varying vec2 screenUv; void main(){screenUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
   fragmentShader:`
 precision highp float;
 varying vec2 screenUv;
 uniform vec2 resolution;
 uniform vec2 pointer;
 uniform float scrollDepth;
 uniform float clock;
 uniform int layers;
 uniform sampler2D gasMap;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 vec3 stars(vec2 uv,float scale,float depth){
   vec2 grid=uv*scale;
   vec2 id=floor(grid),f=fract(grid)-.5;
   float seed=hash(id+depth*17.0);
   vec2 center=vec2(hash(id+1.3),hash(id+6.7))*.62-.31;
   float radius=mix(.022,.09,pow(seed,6.0));
   vec2 q=f-center;float d=length(q);
   float point=1.0-smoothstep(radius*.12,radius,d);
   float halo=exp(-d*22.0)*.12*step(.9,seed);
   // The brightest few carry a soft four-point cross, the way a telescope sees them.
   float spike=step(.985,seed)*(exp(-abs(q.x)*90.0)+exp(-abs(q.y)*90.0))*exp(-d*7.0)*.55;
   float shimmer=.82+.18*sin(clock*(.25+seed*.6)+seed*60.0);
   vec3 tint=mix(vec3(.55,.7,.95),vec3(1.0,.84,.6),hash(id+9.0));
   return tint*(point+halo+spike)*mix(.16,.95,seed)*shimmer;
 }
 void main(){
   vec2 uv=screenUv-.5;uv.x*=resolution.x/resolution.y;
   vec2 galaxy=uv+vec2(.32,-.08)+pointer*.012;
   galaxy.y+=scrollDepth*.006;
   float along=galaxy.y+galaxy.x*.46;
   float band=exp(-pow(along*4.2,2.0));
   float core=exp(-dot(galaxy*vec2(.85,2.9),galaxy*vec2(.85,2.9))*2.2);
   // Gas and dust along the band: warm gold near the core, indigo out along the arms, cut by dark lanes.
   vec2 np=galaxy*vec2(2.2,3.4)+vec2(clock*.004,0.0);
   vec2 dust=texture2D(gasMap,np*.16+vec2(.5)).rg;
   float gas=dust.r;
   float lane=smoothstep(.42,.62,dust.g);
   vec3 warm=vec3(.52,.34,.14),cool=vec3(.16,.2,.42);
   vec3 color=mix(cool,warm,clamp(core*1.6,0.0,1.0))*band*smoothstep(.28,.72,gas)*(1.0-lane*.7)*.62;
   color+=vec3(.5,.36,.3)*core*.2;
   for(int i=0;i<5;i++){
     if(i>=layers)break;
     float depth=float(i)+1.0;
     vec2 offset=vec2(pointer.x*.003*depth,scrollDepth*.012*depth+pointer.y*.002*depth);
     float scale=mix(185.0,28.0,float(i)/4.0);
     color+=stars(uv+offset+depth*12.1,scale,depth)*(i<2?(.3+band*.9*(1.0-lane*.6)):.75);
   }
   float edge=1.0-smoothstep(.2,1.2,length(screenUv-.5));
   gl_FragColor=vec4(color,.7*edge);
 }`});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);
  const visibleHosts=new Set();
  function depth(){if(!active)return 0;const r=active.getBoundingClientRect();return -r.top/Math.max(1,innerHeight)}
  function draw(){uniforms.scrollDepth.value=still()?0:depth()*1.6;uniforms.pointer.value.set(still()?0:px,still()?0:py);uniforms.clock.value=time;renderer.render(scene,camera)}
  function loop(t){frame=0;if(disposed||lost||document.hidden||!active||document.documentElement.matches('.menu-open,.elon-typing'))return;if(t-last>=33||still()){const dt=last?Math.min((t-last)/1000,.1):0;last=t;if(!still())time+=dt;px+=(tx-px)*.08;py+=(ty-py)*.08;draw()}if(!still())frame=requestAnimationFrame(loop)}
  function wake(){cancelAnimationFrame(frame);frame=0;last=0;if(!disposed&&!lost&&!document.hidden&&active)frame=requestAnimationFrame(loop)}
  function resize(){if(!active)return;const w=active.clientWidth,h=active.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio,mobile.matches?1:1.35));renderer.setSize(w,h,false);uniforms.resolution.value.set(w,h);uniforms.layers.value=mobile.matches?3:5;wake()}
  function choose(){
   const next=dark()?hosts.find(h=>visibleHosts.has(h))||null:null;
   if(next!==active){active?.classList.remove('is-on');active=next;if(active){active.appendChild(renderer.domElement);resize();requestAnimationFrame(()=>active?.classList.add('is-on'))}}
   wake();
  }
  const io=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?visibleHosts.add(e.target):visibleHosts.delete(e.target));choose()},{rootMargin:'80px'});
  hosts.forEach(h=>io.observe(h));
  const ro=new ResizeObserver(resize);hosts.forEach(h=>ro.observe(h));
  const onMove=e=>{if(e.pointerType==='touch')return;tx=e.clientX/innerWidth*2-1;ty=e.clientY/innerHeight*2-1};
  addEventListener('pointermove',onMove,{passive:true});
  addEventListener('observatory-motion-change',wake);addEventListener('observatory-theme-change',choose);
  document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);active?.classList.remove('is-on')});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;choose()});
  addEventListener('pagehide',e=>{if(e.persisted)return;disposed=true;cancelAnimationFrame(frame);io.disconnect();ro.disconnect();removeEventListener('pointermove',onMove);mesh.geometry.dispose();material.dispose();gasMap.dispose();renderer.dispose()});
 }
}
