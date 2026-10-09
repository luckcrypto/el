/* The Orrery: the figure at the core and six companies in orbit, placed by how each is owned.
   The figure is a gold star; its light falls on six worlds in their company colours (Tesla's red and SpaceX's blue are the
   same colours the trajectory chart uses), so every world shows a lit face towards the figure it belongs to. Choosing one
   lights the ownership chain as a beam from the star, through each parent, to that world.
   Scene state mirrors the list in main.js: available, hover, selected, parent chain, settled, still. */
import * as THREE from './three.module.js';

const stage=document.getElementById('orrery-stage'),host=document.getElementById('orrery-gl'),labelHost=document.getElementById('orrery-labels');
const BODIES=[
 {id:'tesla',name:'Tesla',tag:'Listed, Nasdaq: TSLA',radius:2.13,size:.17,color:0xd95926,surface:'rust',offset:3.5,tilt:.1,listed:true},
 {id:'spacex',name:'SpaceX',tag:'Listed, Nasdaq: SPCX',radius:3.24,size:.24,color:0x3987e5,surface:'ocean',offset:.95,tilt:.29,listed:true,ring:true},
 {id:'xai',name:'xAI',tag:'Owned by SpaceX',parent:'spacex',radius:.78,size:.1,color:0xb9c3cb,surface:'moon',offset:1.1,tilt:1.05,listed:true},
 {id:'x',name:'X',tag:'Held through xAI',parent:'xai',radius:.3,size:.062,color:0xe8edf0,surface:'obsidian',offset:.4,tilt:.7,listed:true},
 {id:'neuralink',name:'Neuralink',tag:'Private',radius:3.8,size:.14,color:0x8f86a8,surface:'veil',offset:2.3,tilt:.38,listed:false},
 {id:'boring',name:'The Boring Company',tag:'Private',radius:4.26,size:.19,color:0x8c8378,surface:'strata',offset:4.9,tilt:.48,listed:false}
];

/* Seamless value noise for the world textures: a fixed lattice, periodic across the texture's width so the seam closes.
   Deterministic, so every visit paints the same worlds. */
const LATTICE=(()=>{const a=new Float32Array(65536);let s=1013904223;for(let i=0;i<a.length;i++){s=(s*1664525+1013904223)>>>0;a[i]=s/4294967296}return a})();
function noise(x,y,period){
 const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const x0=((xi%period)+period)%period,x1=(x0+1)%period,y0=yi&255,y1=(yi+1)&255;
 const a=LATTICE[y0*256+x0],b=LATTICE[y0*256+x1],c=LATTICE[y1*256+x0],d=LATTICE[y1*256+x1];
 return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function fbm(x,y,period,octaves=4){let s=0,amp=.5,f=1;for(let o=0;o<octaves;o++){s+=amp*noise(x*f,y*f,period*f);f*=2;amp*=.5}return s/(1-Math.pow(.5,octaves))}
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
function worldTexture(kind,hex,width){
 const W=width,H=width/2,c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d'),img=g.createImageData(W,H),d=img.data,P=8;
 const base=[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255];
 for(let y=0;y<H;y++){
  const lat=y/H,pole=Math.abs(lat-.5)*2;
  for(let x=0;x<W;x++){
   const u=x/W*P,v=lat*P*.5;
   let r,gr,b;
   if(kind==='rust'){
    const n=fbm(u,v+3,P),m=fbm(u*2+5,v*2,P*2,3);
    const k=.55+.75*n-.25*smooth(.55,.7,m);
    r=base[0]*k;gr=base[1]*k*.92;b=base[2]*k*.8;
    const cap=smooth(.84,.93,pole+(n-.5)*.12);r=mix(r,.96,cap);gr=mix(gr,.9,cap);b=mix(b,.86,cap);
   }else if(kind==='ocean'){
    const land=smooth(.56,.62,fbm(u+11,v,P));
    const warp=fbm(u*1.5+7,v*1.5,P*1.5|0||12,3);
    const cloud=smooth(.55,.72,fbm(u*2+warp*2.2,v*2.4+warp,P*2,4));
    r=mix(base[0]*.45,.32,land);gr=mix(base[1]*.62,.52,land);b=mix(base[2]*.95,.36,land);
    r=mix(r,.97,cloud*.9);gr=mix(gr,.98,cloud*.9);b=mix(b,1,cloud*.9);
   }else if(kind==='moon'){
    const n=fbm(u*1.5,v*1.5+9,P*1.5|0||12),pit=smooth(.62,.66,fbm(u*3+2,v*3,P*3,2));
    const k=.55+.5*n-.18*pit;r=base[0]*k;gr=base[1]*k;b=base[2]*k;
   }else if(kind==='obsidian'){
    const n=fbm(u,v*3,P,3),line=Math.pow(Math.abs(Math.sin((lat*14+n*.6)*Math.PI)),40);
    const k=.07+.05*n+.55*line;r=k;gr=k;b=k*1.04;
   }else if(kind==='veil'){
    const n=fbm(u*.8,v*3+4,P,4),band=.5+.5*Math.sin(lat*22+n*5);
    const k=.62+.28*band+.15*n;r=base[0]*k;gr=base[1]*k;b=base[2]*k;
   }else{
    const n=fbm(u,v*4+1,P,4),band=.5+.5*Math.sin(lat*40+n*3);
    const k=.6+.22*band+.25*n;r=base[0]*k;gr=base[1]*k*.98;b=base[2]*k*.95;
   }
   const i=(y*W+x)*4;d[i]=clamp(r)*255;d[i+1]=clamp(gr)*255;d[i+2]=clamp(b)*255;d[i+3]=255;
  }
 }
 g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=2;return t;
}
function glowTexture(stops,size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),r=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
 stops.forEach(([o,col])=>r.addColorStop(o,col));g.fillStyle=r;g.fillRect(0,0,size,size);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function coronaTexture(){
 // One sprite for the corona and its rays, so the glow costs a single blended quad.
 const S=512,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
 const r=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);
 [[0,'rgba(255,236,190,1)'],[.1,'rgba(255,206,120,.72)'],[.26,'rgba(240,150,50,.2)'],[.55,'rgba(200,110,30,.05)'],[1,'rgba(0,0,0,0)']].forEach(([o,col])=>r.addColorStop(o,col));
 g.fillStyle=r;g.fillRect(0,0,S,S);g.translate(S/2,S/2);g.globalCompositeOperation='lighter';
 for(let i=0;i<28;i++){
  const a=i/28*Math.PI*2+LATTICE[i*7]*.18,len=S*(.24+.25*LATTICE[i*13+5]),w=1+2.5*LATTICE[i*3+1];
  g.save();g.rotate(a);const l=g.createLinearGradient(0,0,len,0);l.addColorStop(0,'rgba(255,226,170,.22)');l.addColorStop(1,'rgba(255,190,90,0)');
  g.fillStyle=l;g.beginPath();g.moveTo(S*.05,-w);g.lineTo(len,0);g.lineTo(S*.05,w);g.closePath();g.fill();g.restore();
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const NOISE3=`
 float h3(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm3(vec3 p){float s=0.0,a=0.5;for(int i=0;i<3;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}`;

if(stage&&host){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width: 720px)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
 const still=()=>reduce.matches||window.observatoryMotionPaused===true;
 const isLight=()=>(window.ObservatoryTheme?.current?.()||'dark')==='light';
 let renderer=null;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:!small.matches,powerPreference:'low-power'})}catch{renderer=null}
 if(renderer){
  renderer.setPixelRatio(Math.min(devicePixelRatio,small.matches?1.25:1.6));
  renderer.setClearColor(0x000000,0);
  host.appendChild(renderer.domElement);host.style.backgroundSize='cover';host.style.backgroundPosition='center';host.style.backgroundRepeat='no-repeat';
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,80);camera.position.set(0,0,14.2);
  const system=new THREE.Group();scene.add(system);
  const baseRotation={x:.64,y:-.24,z:-.38};system.rotation.set(baseRotation.x,baseRotation.y,baseRotation.z);
  const themed=[];
  const theme=(material,dark,light)=>{themed.push({material,dark,light});return material};
  const ADD=THREE.AdditiveBlending,NORMAL=THREE.NormalBlending;

  // The figure: a gold star. Its surface boils slowly (domain-warped noise), darkens towards the limb like a real star,
  // and brightens when a chosen company's chain reaches it.
  const starMaterial=theme(new THREE.ShaderMaterial({
   uniforms:{time:{value:0},boost:{value:0},deep:{value:new THREE.Color()},mid:{value:new THREE.Color()},hot:{value:new THREE.Color()},limb:{value:.5}},
   vertexShader:'varying vec3 vPos; varying vec3 vN; varying vec3 vV; void main(){vPos=position;vec4 p=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
   fragmentShader:'uniform float time; uniform float boost; uniform vec3 deep; uniform vec3 mid; uniform vec3 hot; uniform float limb; varying vec3 vPos; varying vec3 vN; varying vec3 vV;'+NOISE3+`
    void main(){
     vec3 p=normalize(vPos)*3.4;
     float q=fbm3(p+vec3(0.0,0.0,time*0.05));
     float f=fbm3(p*1.7+q*2.2+vec3(time*0.03,0.0,-time*0.04));
     float cells=fbm3(p*9.0+vec3(time*0.12));
     float heat=clamp(f*1.2+cells*0.34-0.06+boost*0.25,0.0,1.0);
     vec3 c=mix(deep,mid,smoothstep(0.2,0.55,heat));
     c=mix(c,hot,smoothstep(0.55,0.9,heat));
     float mu=max(dot(normalize(vN),normalize(vV)),0.0);
     c*=mix(1.0,0.42+0.58*pow(mu,0.55),limb);
     c+=hot*pow(1.0-mu,3.0)*0.35*limb;
     gl_FragColor=vec4(c,1.0);
    }`}),
   {u_deep:[.5,.22,.03],u_mid:[.95,.6,.16],u_hot:[1,.95,.78],u_limb:.75},
   {u_deep:[.32,.21,.06],u_mid:[.6,.41,.1],u_hot:[.92,.76,.38],u_limb:.45});
  const star=new THREE.Mesh(new THREE.SphereGeometry(1.0,small.matches?48:72,small.matches?32:48),starMaterial);system.add(star);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.12,48,32),theme(new THREE.ShaderMaterial({
   uniforms:{tint:{value:new THREE.Color(0xffc56b)},glow:{value:0},strength:{value:1}},
   vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
   fragmentShader:'uniform vec3 tint; uniform float glow; uniform float strength; varying vec3 n; varying vec3 v; void main(){float rim=pow(1.0-max(dot(normalize(n),normalize(v)),0.0),2.4);gl_FragColor=vec4(tint,rim*(0.55+glow*0.6)*strength);}',
   transparent:true,depthWrite:false,blending:ADD}),{u_tint:0xffc56b,blending:ADD,u_strength:1},{u_tint:0x9a6a12,blending:NORMAL,u_strength:.55}));system.add(atmosphere);
  // Corona and light rays: camera-facing, in the scene rather than the tilted system, so they always sit round the star.
  const coronaMaterial=theme(new THREE.SpriteMaterial({map:coronaTexture(),transparent:true,depthWrite:false,blending:ADD,opacity:.85}),{blending:ADD,opacity:.85},{blending:NORMAL,opacity:.3});
  const corona=new THREE.Sprite(coronaMaterial);corona.scale.setScalar(5.6);scene.add(corona);

  // An open collector swarm around the star: three tilted, counter-rotating bands, instanced so each band is two draw calls.
  const dyson=new THREE.Group();system.add(dyson);
  const collectorBands=[],panelGeometry=new THREE.BoxGeometry(.17,.11,.018);
  const panelMaterial=theme(new THREE.MeshStandardMaterial({color:0x7d6a4c,metalness:.45,roughness:.38,emissive:0x6a4512,emissiveIntensity:.85}),{color:0x7d6a4c,emissive:0x6a4512,emissiveIntensity:.85,metalness:.45},{color:0xc9b48a,emissive:0x6a4a14,emissiveIntensity:.35,metalness:.05});
  const beaconBlue=theme(new THREE.MeshBasicMaterial({color:0xa3e0ec}),{color:0xa3e0ec},{color:0x2d5d73});
  const beaconGold=theme(new THREE.MeshBasicMaterial({color:0xffd796}),{color:0xffd796},{color:0x7a5710});
  const railMaterial=theme(new THREE.MeshBasicMaterial({color:0xc9a76a,transparent:true,opacity:.32}),{color:0xc9a76a,opacity:.32},{color:0x9a7a3a,opacity:.45});
  const matrixObject=new THREE.Object3D();
  for(let band=0;band<3;band++){
   const group=new THREE.Group();group.rotation.set(.35+band*.88,band*.62,band*.47);dyson.add(group);
   const count=small.matches?24:48,radius=1.3+band*.065;
   const panels=new THREE.InstancedMesh(panelGeometry,panelMaterial,count);
   const beacons=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.012,.024),band===1?beaconGold:beaconBlue,count);
   for(let j=0;j<count;j++){const a=j/count*Math.PI*2;matrixObject.position.set(Math.cos(a)*radius,Math.sin(a)*radius,0);matrixObject.rotation.set(0,0,a+Math.PI/2);matrixObject.updateMatrix();panels.setMatrixAt(j,matrixObject.matrix);matrixObject.position.z=.018;matrixObject.updateMatrix();beacons.setMatrixAt(j,matrixObject.matrix)}
   group.add(panels,beacons,new THREE.Mesh(new THREE.TorusGeometry(radius,.008,5,small.matches?64:128),railMaterial));
   collectorBands.push(group);
  }
  const energy=theme(new THREE.ShaderMaterial({uniforms:{phase:{value:0},low:{value:new THREE.Color(.55,.38,.12)},high:{value:new THREE.Color(1,.86,.58)},boost:{value:0}},
   vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform float phase; uniform vec3 low; uniform vec3 high; uniform float boost; varying vec2 vUv; void main(){float angle=atan(vUv.y-0.5,vUv.x-0.5);float pulse=pow(0.5+0.5*cos(angle-phase),8.0);gl_FragColor=vec4(mix(low,high,pulse),0.12+pulse*0.42+boost*0.4);}',
   transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:ADD}),{blending:ADD,u_low:[.55,.38,.12],u_high:[1,.86,.58]},{blending:NORMAL,u_low:[.3,.22,.08],u_high:[.48,.34,.06]});
  const energyRing=new THREE.Mesh(new THREE.RingGeometry(1.47,1.495,128),energy);energyRing.rotation.x=.3;dyson.add(energyRing);

  // Orbits carry their own light trail: the line brightens just behind each world and fades round the circle, in that
  // company's colour. Private companies keep dashed paths. The paths draw themselves in on first sight.
  const orbitShader={
   vertexShader:'attribute float aAngle; varying float vAngle; void main(){vAngle=aAngle;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:`uniform vec3 color; uniform vec3 trail; uniform float head; uniform float reveal; uniform float base; uniform float strength; uniform float dashed; uniform float radius; uniform float lit; varying float vAngle;
    void main(){
     const float TAU=6.2831853;
     if(vAngle>reveal*TAU)discard;
     float behind=mod(head-vAngle,TAU);
     float tr=exp(-behind*2.4)*strength*(1.0+lit*0.8);
     float a=base*(1.0+lit*0.9);
     if(dashed>0.5&&fract(vAngle*radius*1.7)>0.46)a=0.0;
     gl_FragColor=vec4(mix(color,trail,clamp(tr*1.6,0.0,1.0)),min(1.0,a+tr));
    }`};
  const orbitMaterial=(def)=>{
   const m=new THREE.ShaderMaterial({...orbitShader,uniforms:{color:{value:new THREE.Color()},trail:{value:new THREE.Color(def.color)},head:{value:0},reveal:{value:0},base:{value:.3},strength:{value:.8},dashed:{value:def.listed?0:1},radius:{value:def.radius},lit:{value:0}},transparent:true,depthWrite:false,blending:ADD});
   return theme(m,{blending:ADD,u_color:0x8b9ba8,u_trail:def.color,u_base:def.listed?.26:.2,u_strength:def.listed?.85:.45},{blending:NORMAL,u_color:0x6b665c,u_trail:def.color,u_base:def.listed?.5:.4,u_strength:def.listed?.7:.4});
  };
  const rimMaterial=theme(new THREE.MeshBasicMaterial({color:0x8b9ba8,side:THREE.BackSide,transparent:true,opacity:.5}),{color:0x8b9ba8,opacity:.5},{color:0x4f5a62,opacity:.6});
  const ringMaterial=theme(new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(0xbcd0e0)},alpha:{value:.55}},
   vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform vec3 tint; uniform float alpha; varying vec2 vUv; void main(){float r=length(vUv-0.5)*2.0;float t=clamp((r-0.644)/0.356,0.0,1.0);float bands=0.55+0.45*sin(t*42.0)*sin(t*9.0+1.3);float edge=smoothstep(0.0,0.08,t)*smoothstep(1.0,0.82,t);gl_FragColor=vec4(tint*(0.75+0.25*bands),alpha*edge*(0.45+0.55*bands));}',
   transparent:true,depthWrite:false,side:THREE.DoubleSide}),{u_tint:0xbcd0e0,u_alpha:.55},{u_tint:0x4f5a62,u_alpha:.5});
  const circle=(radius,segments)=>{const p=[],a=[];for(let j=0;j<=segments;j++){const t=j/segments*Math.PI*2;p.push(Math.cos(t)*radius,Math.sin(t)*radius,0);a.push(t)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('aAngle',new THREE.Float32BufferAttribute(a,1));return g};

  const haloTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.arc(64,64,54,0,Math.PI*2);g.stroke();g.globalAlpha=.35;g.lineWidth=2;g.beginPath();g.arc(64,64,61,0,Math.PI*2);g.stroke();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  const haloSelected=new THREE.SpriteMaterial({map:haloTexture,color:0xe6c07a,transparent:true,depthWrite:false,opacity:0});
  const airShader={
   vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
   fragmentShader:'uniform vec3 tint; uniform float strength; varying vec3 n; varying vec3 v; void main(){float rim=pow(1.0-max(dot(normalize(n),normalize(v)),0.0),2.2);gl_FragColor=vec4(tint,rim*strength);}'};

  const byId=new Map(),hitTargets=[];
  const texWidth=small.matches?128:256;
  const bodyGeometry=new THREE.SphereGeometry(1,small.matches?28:40,small.matches?18:28),hitGeometry=new THREE.SphereGeometry(1,8,6),hitMaterial=new THREE.MeshBasicMaterial({visible:false});
  for(const def of BODIES){
   const parent=def.parent?byId.get(def.parent):null;
   const orbit=new THREE.Group();orbit.rotation.x=def.tilt;
   (parent?parent.holder:system).add(orbit);
   const pathMaterial=orbitMaterial(def);
   const path=new THREE.Line(circle(def.radius,def.parent?96:256),pathMaterial);
   orbit.add(path);
   const holder=new THREE.Group();orbit.add(holder);
   const glossy=def.surface==='obsidian';
   const material=new THREE.MeshStandardMaterial({map:worldTexture(def.surface,def.color,texWidth),roughness:glossy?.32:def.listed?.78:.92,metalness:glossy?.55:.04});
   const mesh=new THREE.Mesh(bodyGeometry,material);mesh.scale.setScalar(def.size);mesh.rotation.z=.35;holder.add(mesh);
   const air=new THREE.Mesh(bodyGeometry,theme(new THREE.ShaderMaterial({...airShader,uniforms:{tint:{value:new THREE.Color(def.color)},strength:{value:.8}},transparent:true,depthWrite:false,blending:ADD}),
    {blending:ADD,u_tint:def.surface==='obsidian'?0xdfe8ee:def.color,u_strength:def.listed?.9:.45},{blending:NORMAL,u_tint:0x12171b,u_strength:def.listed?.35:.25}));
   air.scale.setScalar(1.16);mesh.add(air);
   if(!def.listed){const rim=new THREE.Mesh(bodyGeometry,rimMaterial);rim.scale.setScalar(1.22);mesh.add(rim)}
   if(def.ring){const ring=new THREE.Mesh(new THREE.RingGeometry(1.45,2.25,96,1),ringMaterial);ring.rotation.x=1.15;ring.rotation.y=.2;holder.add(ring);ring.scale.setScalar(def.size)}
   const hit=new THREE.Mesh(hitGeometry,hitMaterial);hit.scale.setScalar(Math.max(def.size*2,small.matches?.42:.3));hit.userData.id=def.id;holder.add(hit);hitTargets.push(hit);
   const halo=new THREE.Sprite(haloSelected.clone());halo.material.opacity=0;halo.scale.setScalar(def.size*(def.ring?7:5.4));halo.renderOrder=3;holder.add(halo);
   themed.push({material:halo.material,dark:{color:0xe6c07a},light:{color:0x7a5710}});
   const label=document.createElement('div');label.className='orrery-label'+(def.listed?'':' is-private');label.innerHTML='<span class="label-name"></span><span class="label-tag" hidden></span>';label.querySelector('.label-name').textContent=def.name;label.querySelector('.label-tag').textContent=def.tag;labelHost.appendChild(label);
   byId.set(def.id,{def,orbit,holder,mesh,ring:holder.children.find(c=>c.geometry?.type==='RingGeometry')||null,halo,label,path:pathMaterial,lift:0,liftTarget:0,glow:0,glowTarget:0,angle:def.offset,order:byId.size});
  }
  const coreLabel=document.createElement('div');coreLabel.className='orrery-label';coreLabel.textContent=document.querySelector('[data-ref="figure-compact"]')?.textContent||'The figure';labelHost.appendChild(coreLabel);

  // Stars and the belt: sizes and tints vary per point, and the stars twinkle in the shader, not in JavaScript.
  function cloud(count,belt){
   const positions=[],sizes=[],tints=[];
   for(let i=0;i<count;i++){
    const a=i*2.399963,r=belt?2.75+(Math.sin(i*17.7)+1)*.22:5+(Math.sin(i*91.3)+1)*3.5;
    positions.push(Math.cos(a)*r,Math.sin(a)*r,belt?Math.sin(i*3.7)*.13:Math.cos(i*5.1)*4-3);
    const s=LATTICE[i*5+11];sizes.push(belt?.8+s*1.4:.6+Math.pow(s,4)*3.2);
    const warm=LATTICE[i*3+29];tints.push(warm,i*.37%1,LATTICE[i*7+3]);
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));g.setAttribute('aSeed',new THREE.Float32BufferAttribute(tints,3));
   const m=new THREE.ShaderMaterial({uniforms:{pointSize:{value:belt?1.5:2.1},cool:{value:new THREE.Color(belt?0x9fb0be:0xbfd3ff)},warm:{value:new THREE.Color(belt?0xc9a77a:0xffe0b0)},strength:{value:.6},time:{value:0},ratio:{value:1}},
    vertexShader:'uniform float pointSize; uniform float time; uniform float ratio; attribute float aSize; attribute vec3 aSeed; varying vec3 vSeed; varying float vTw; void main(){vSeed=aSeed;vTw=0.72+0.28*sin(time*(0.6+aSeed.y*1.4)+aSeed.z*40.0);vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(pointSize*aSize*12.0/-p.z,1.0,6.0)*ratio;gl_Position=projectionMatrix*p;}',
    fragmentShader:'uniform vec3 cool; uniform vec3 warm; uniform float strength; varying vec3 vSeed; varying float vTw; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=1.0-smoothstep(0.04,0.5,d);gl_FragColor=vec4(mix(cool,warm,vSeed.x),a*strength*vTw);}',
    transparent:true,depthWrite:false,blending:ADD});
   theme(m,{blending:ADD,u_cool:belt?0x9fb0be:0xbfd3ff,u_warm:belt?0xc9a77a:0xffe0b0,u_strength:.6},{blending:NORMAL,u_cool:0x4f5a62,u_warm:0x7a6a50,u_strength:.5});
   return new THREE.Points(g,m);
  }
  const stars=cloud(small.matches?220:640,false),belt=cloud(small.matches?140:420,true);scene.add(stars);system.add(belt);

  // A faint nebula behind everything, warm near the star and cool at the edges; dark theme only. It is painted once and
  // laid behind the canvas as an image, so it costs the scene nothing per frame.
  const nebulaUrl=(()=>{
   const W=256,H=154,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),img=g.createImageData(W,H),d=img.data;
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const u=x/W*4,v=y/H*2.4,a=fbm(u,v+20,4),b2=fbm(u*2+a*2.4,v*2+a*1.6,8),dx=x/W-.5,dy=y/H-.5,centre=Math.exp(-(dx*dx+dy*dy)*7);
    const warm=smooth(.45,.8,b2)*centre,cool=smooth(.42,.75,a)*.55*(1-centre*.5),k=.42*255;
    const i=(y*W+x)*4;d[i]=(.55*warm+.1*cool)*k;d[i+1]=(.33*warm+.18*cool)*k;d[i+2]=(.1*warm+.36*cool)*k;d[i+3]=Math.min(255,Math.max(d[i],d[i+1],d[i+2])*2.2);
   }
   g.putImageData(img,0,0);return c.toDataURL('image/png');
  })();

  // The ownership beam: from the star's surface through each parent to the chosen world, with light flowing outwards.
  const BEAM_STEPS=small.matches?30:44,beamPositions=new Float32Array(3*BEAM_STEPS*3),beamT=new Float32Array(BEAM_STEPS*3);
  for(let i=0;i<beamT.length;i++)beamT[i]=i/(beamT.length-1);
  const beamGeometry=new THREE.BufferGeometry();beamGeometry.setAttribute('position',new THREE.BufferAttribute(beamPositions,3).setUsage(THREE.DynamicDrawUsage));beamGeometry.setAttribute('aT',new THREE.BufferAttribute(beamT,1));
  const beamMaterial=theme(new THREE.ShaderMaterial({uniforms:{time:{value:0},fade:{value:0},segments:{value:1},tint:{value:new THREE.Color(0xffd28a)},moving:{value:1},ratio:{value:1}},
   vertexShader:'attribute float aT; uniform float time; uniform float segments; uniform float fade; uniform float moving; uniform float ratio; varying float vA; void main(){float run=aT*3.0/segments;float pulse=pow(fract(run*segments*1.4-time*0.9),5.0)*moving;vA=run>1.0?0.0:fade*(0.5+0.5*pulse);gl_PointSize=(2.6+4.6*pulse)*ratio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform vec3 tint; varying float vA; void main(){if(vA<=0.0)discard;float d=length(gl_PointCoord-vec2(0.5));gl_FragColor=vec4(tint,(1.0-smoothstep(0.08,0.5,d))*vA);}',
   transparent:true,depthWrite:false,blending:ADD}),{blending:ADD,u_tint:0xffd28a},{blending:NORMAL,u_tint:0x7a5710});
  const beam=new THREE.Points(beamGeometry,beamMaterial);beam.frustumCulled=false;beam.renderOrder=4;scene.add(beam);
  let beamFade=0,beamTarget=0,beamChain=[];
  const va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3(),up=new THREE.Vector3();
  function updateBeam(){
   if(!beamChain.length||beamFade<.01){beam.visible=false;return}
   const pts=[new THREE.Vector3(0,0,0)];beamChain.forEach(b=>{const v=new THREE.Vector3();b.holder.getWorldPosition(v);pts.push(v)});
   const dir=pts[1].clone().normalize();pts[0].copy(dir).multiplyScalar(1.05);
   const segs=pts.length-1;beamMaterial.uniforms.segments.value=segs;
   let k=0;
   for(let s=0;s<3;s++){
    const from=pts[Math.min(s,segs-1)],to=pts[Math.min(s+1,segs)];
    va.copy(from);vb.copy(to);const len=va.distanceTo(vb);up.set(0,1,0).multiplyScalar(len*.16);vc.copy(va).add(vb).multiplyScalar(.5).add(up);
    for(let i=0;i<BEAM_STEPS;i++){const t=i/(BEAM_STEPS-1),u=1-t;beamPositions[k++]=u*u*va.x+2*u*t*vc.x+t*t*vb.x;beamPositions[k++]=u*u*va.y+2*u*t*vc.y+t*t*vb.y;beamPositions[k++]=u*u*va.z+2*u*t*vc.z+t*t*vb.z}
   }
   beamGeometry.attributes.position.needsUpdate=true;beam.visible=true;
  }

  const pulseGeometry=new THREE.RingGeometry(.985,1,128),pulses=[];
  const pulseMaterial=()=>new THREE.MeshBasicMaterial({color:isLight()?0x7a5710:0xffd28a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:isLight()?NORMAL:ADD});

  // Light comes from the figure: a warm point light at the star, a dim ambient and a cool rim so night sides keep their edge.
  const ambient=new THREE.AmbientLight(0x6a7c92,.32);scene.add(ambient);
  const sun=new THREE.PointLight(0xffd7a0,9,0,0);system.add(sun);
  const key=new THREE.DirectionalLight(0xe2f5ff,.5);key.position.set(3,4,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x668ddc,1.3);rim.position.set(-4,-1,-2);scene.add(rim);

  function applyTheme(){
   const light=isLight();
   for(const {material,dark,light:lightProps} of themed){
    const p=light?lightProps:dark;
    for(const k in p){
     const v=p[k];
     if(k==='color'||k==='emissive')material[k].setHex(v);
     else if(k.startsWith('u_')){const u=material.uniforms[k.slice(2)];if(u.value&&u.value.isColor){Array.isArray(v)?u.value.setRGB(...v):u.value.setHex(v)}else u.value=v}
     else material[k]=v;
    }
    material.needsUpdate=true;
   }
   host.style.backgroundImage=light?'none':'url('+nebulaUrl+')';
   ambient.intensity=light?1.5:.32;sun.intensity=light?5:9;key.intensity=light?1.6:.5;rim.intensity=light?.6:1.3;
   requestDraw();
  }

  const pointer={x:0,y:0},aim={x:0,y:0};
  let frame=0,last=0,elapsed=0,visible=true,lost=false,disposed=false,selected=null,hovered=null,spin=0,spinTarget=0,coreBoost=0,introStart=0,intro=0;
  const tmp=new THREE.Vector3();
  const easeOut=t=>1-Math.pow(1-t,3),easeBack=t=>{const c=1.6;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};

  function chain(id){const out=[];let b=byId.get(id);while(b){out.push(b);b=b.def.parent?byId.get(b.def.parent):null}return out}
  function setSelection(id){
   selected=id;
   const lit=new Set(id?chain(id).map(b=>b.def.id):[]);
   byId.forEach(b=>{b.liftTarget=b.def.id===id?1:b.def.id===hovered?.35:0;b.glowTarget=b.def.id===id?1:lit.has(b.def.id)?.45:0});
   if(id)beamChain=chain(id).reverse();beamTarget=id?1:0;
   if(id){
    let delay=0;
    for(const b of chain(id)){
     const parent=b.def.parent?byId.get(b.def.parent):null;
     firePulse(b.orbit,b.def.radius,parent?parent.def.size*1.6:1.15,delay);delay+=still()?0:260;
    }
    setTimeout(()=>{coreBoost=1;requestDraw()},still()?0:delay+250);
   }
   if(still()){byId.forEach(b=>{b.lift=b.liftTarget;b.glow=b.glowTarget});beamFade=beamTarget}
   requestDraw();
  }
  function firePulse(orbit,from,to,delay){
   if(still())return;
   const mesh=new THREE.Mesh(pulseGeometry,pulseMaterial());mesh.visible=false;orbit.add(mesh);
   pulses.push({mesh,from,to,start:performance.now()+delay,duration:800});
  }
  function setHover(id){
   if(hovered===id)return;hovered=id;
   byId.forEach(b=>{if(b.def.id!==selected)b.liftTarget=b.def.id===id?.35:0});
   renderer.domElement.classList.toggle('is-pickable',!!id);
   window.dispatchEvent(new CustomEvent('orrery-scene-hover',{detail:{id}}));
   if(still())byId.forEach(b=>{b.lift=b.liftTarget});
   requestDraw();
  }

  let w=1,h=1;
  function placeLabels(){
   const phone=small.matches,chainIds=selected?chain(selected).map(b=>b.def.id):[];
   byId.forEach(b=>{
    b.holder.getWorldPosition(tmp);tmp.project(camera);
    const x=(tmp.x*.5+.5)*w,y=(-tmp.y*.5+.5)*h,isSelected=b.def.id===selected;
    let hide=tmp.z>1||b.appear<.6;
    if(phone)hide=hide||(selected?!isSelected:!!b.def.parent);
    else if(b.def.parent)hide=hide||(selected&&chainIds.includes(b.def.parent)&&!isSelected&&selected!==b.def.id&&chainIds.length>1);
    const offset=10+b.def.size*(b.def.ring?90:60)*(h/560);
    let transform;
    if(isSelected)transform='translate3d('+Math.round(x)+'px,'+Math.round(y-offset-6)+'px,0) translate(-50%,-100%)';
    else{const width=b.def.name.length*7.6+18,over=x+offset+width>w-8;transform=over?'translate3d('+Math.round(Math.min(x,w-width/2-8))+'px,'+Math.round(y-offset-4)+'px,0) translate(-50%,-100%)':'translate3d('+Math.round(x+offset)+'px,'+Math.round(y-10)+'px,0)'}
    b.label.style.transform=transform;
    b.label.classList.toggle('is-hidden',hide);
    b.label.classList.toggle('is-selected',isSelected);
    b.label.querySelector('.label-tag').hidden=!isSelected;
   });
   star.getWorldPosition(tmp);tmp.project(camera);
   coreLabel.style.transform='translate3d('+Math.round((tmp.x*.5+.5)*w)+'px,'+Math.round((-tmp.y*.5+.5)*h)+'px,0) translate(-50%,-50%)';
   coreLabel.classList.toggle('is-hidden',phone||intro<.5);
  }
  function scrollProgress(){const r=stage.getBoundingClientRect();return Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)))}
  function draw(dt){
   if(!still())elapsed+=dt;
   const now=performance.now();
   // First sight: the star swells, the paths draw round, and the worlds arrive one after another (about two seconds).
   if(still())intro=1;else if(introStart)intro=Math.min(1,(now-introStart)/2200);
   const time=elapsed*.065;
   pointer.x+=(aim.x-pointer.x)*.06;pointer.y+=(aim.y-pointer.y)*.06;
   spinTarget=still()?0:(scrollProgress()-.5)*1.1;spin+=(spinTarget-spin)*(still()?1:.08);
   system.rotation.x=baseRotation.x+(still()?0:pointer.y*.08);
   system.rotation.y=baseRotation.y+(still()?0:pointer.x*.11);
   system.rotation.z=baseRotation.z+spin;
   const k=still()?1:Math.min(1,dt*7);
   const swell=easeOut(Math.min(1,intro/.35));
   star.scale.setScalar(.2+.8*swell);atmosphere.scale.setScalar(.2+.8*swell);dyson.scale.setScalar(.6+.4*easeOut(Math.min(1,intro/.5)));
   byId.forEach(b=>{
    const speed=b.def.parent?2.2:1;
    b.angle=b.def.offset+time*speed/(1+b.def.radius*.32);
    b.holder.position.set(Math.cos(b.angle)*b.def.radius,Math.sin(b.angle)*b.def.radius,0);
    b.lift+=(b.liftTarget-b.lift)*k;b.glow+=(b.glowTarget-b.glow)*k;
    const t=Math.max(0,Math.min(1,(intro-.25-b.order*.07)/.4));b.appear=t<=0?0:easeBack(t);
    const s=b.def.size*(1+.38*b.lift)*Math.max(.0001,b.appear);
    b.mesh.scale.setScalar(s);if(b.ring)b.ring.scale.setScalar(s);
    b.mesh.rotation.y=time*(1.2+b.order*.15);
    b.halo.material.opacity=Math.min(1,b.glow*.95+(b.def.id===hovered&&b.def.id!==selected?.3:0))*b.appear;
    b.path.uniforms.head.value=((b.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
    b.path.uniforms.reveal.value=easeOut(Math.max(0,Math.min(1,(intro-b.order*.05)/.6)))*1.001;
    b.path.uniforms.lit.value=b.glow;
   });
   belt.rotation.z=-time*.12;stars.rotation.z=time*.02;
   collectorBands.forEach((band,i)=>{band.rotation.z=i*.47+time*(i%2?-.32:.24)});
   energy.uniforms.phase.value=elapsed*.24;
   coreBoost=Math.max(0,coreBoost-dt*1.4);if(still())coreBoost=selected?.35:0;
   const flare=(1-intro)*(intro>0?1:0);
   energy.uniforms.boost.value=coreBoost;atmosphere.material.uniforms.glow.value=coreBoost+flare;
   starMaterial.uniforms.time.value=elapsed;starMaterial.uniforms.boost.value=coreBoost;
   const breathe=still()?1:1+.035*Math.sin(elapsed*.8);
   corona.scale.setScalar(5.6*swell*breathe*(1+coreBoost*.12+flare*.35));coronaMaterial.rotation=elapsed*.02;
   stars.material.uniforms.time.value=belt.material.uniforms.time.value=elapsed;
   beamFade+=(beamTarget-beamFade)*(still()?1:Math.min(1,dt*4));
   if(beamFade<.01&&!beamTarget)beamChain=[];
   updateBeam();beamMaterial.uniforms.fade.value=beamFade*(isLight()?.9:.85);beamMaterial.uniforms.time.value=elapsed;beamMaterial.uniforms.moving.value=still()?0:1;
   for(let i=pulses.length-1;i>=0;i--){
    const p=pulses[i],t=(now-p.start)/p.duration;
    if(t<0){p.mesh.visible=false;continue}
    if(t>=1){p.mesh.parent?.remove(p.mesh);p.mesh.material.dispose();pulses.splice(i,1);continue}
    const e=1-Math.pow(1-t,3);p.mesh.visible=true;p.mesh.scale.setScalar(p.from+(p.to-p.from)*e);p.mesh.material.opacity=(1-t)*.85;
   }
   renderer.render(scene,camera);
   placeLabels();
  }
  function busy(){return intro<1||pulses.length>0||coreBoost>0.01||Math.abs(beamFade-beamTarget)>.01||[...byId.values()].some(b=>Math.abs(b.lift-b.liftTarget)>.002||Math.abs(b.glow-b.glowTarget)>.002)}
  // Measured, not guessed: if the first frames run slow on this device, drop to one pixel per CSS pixel, once.
  let probeFrames=0,probeTime=0,eased=false;
  function loop(t){
   frame=0;if(disposed||!visible||document.hidden||lost||document.documentElement.matches('.menu-open,.elon-typing'))return;
   const dt=last?Math.min((t-last)/1000,.05):0;
   if(last&&!eased){probeFrames++;probeTime+=t-last;if(probeFrames===50){if(probeTime/50>26&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);size()}eased=true}}
   last=t;draw(dt);
   if(!still()||busy())frame=requestAnimationFrame(loop);
  }
  function requestDraw(){if(!frame&&!disposed&&visible&&!lost){last=0;frame=requestAnimationFrame(loop)}}
  function wake(){cancelAnimationFrame(frame);frame=0;requestDraw()}

  function resize(){if(size())wake()}
  function size(){
   w=host.clientWidth;h=host.clientHeight;if(!w||!h)return false;
   renderer.setSize(w,h,false);camera.aspect=w/h;
   camera.position.z=Math.max(10.8,Math.min(20,4.55/(Math.tan(THREE.MathUtils.degToRad(17.5))*camera.aspect)));
   camera.updateProjectionMatrix();
   stars.material.uniforms.ratio.value=belt.material.uniforms.ratio.value=beamMaterial.uniforms.ratio.value=renderer.getPixelRatio();
   return true;
  }
  const ro=new ResizeObserver(resize);ro.observe(host);
  const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake()},{rootMargin:'120px'});io.observe(stage);
  // The arrival plays once, when at least a third of the stage is on screen.
  const seen=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!introStart){introStart=performance.now();seen.disconnect();wake()}},{threshold:.33});seen.observe(stage);

  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
  function hitAt(event){
   const r=renderer.domElement.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height)*2+1);
   raycaster.setFromCamera(ndc,camera);const hits=raycaster.intersectObjects(hitTargets,false);return hits[0]?.object.userData.id||null;
  }
  renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!fine.matches)return;setHover(hitAt(e))});
  renderer.domElement.addEventListener('pointerleave',()=>setHover(null));
  renderer.domElement.addEventListener('click',e=>{const id=hitAt(e);if(id)window.dispatchEvent(new CustomEvent('orrery-pick',{detail:{id}}))});
  const move=e=>{if(e.pointerType==='touch'||still())return;const box=host.getBoundingClientRect();aim.x=Math.max(-1,Math.min(1,(e.clientX-box.left)/box.width*2-1));aim.y=Math.max(-1,Math.min(1,(e.clientY-box.top)/box.height*2-1));if(visible)requestDraw()};
  const onScroll=()=>{if(visible&&!still())requestDraw()};
  const onSelect=e=>setSelection(e.detail.id);
  const onHover=e=>setHover(e.detail.id);
  document.addEventListener('pointermove',move,{passive:true});
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('orrery-select',onSelect);addEventListener('orrery-hover',onHover);
  addEventListener('observatory-theme-change',applyTheme);addEventListener('observatory-motion-change',wake);
  document.addEventListener('visibilitychange',wake);reduce.addEventListener('change',wake);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;stage.classList.remove('is-live')});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;stage.classList.add('is-live');wake()});
  addEventListener('pagehide',e=>{
   if(e.persisted)return;disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();seen.disconnect();
   document.removeEventListener('pointermove',move);removeEventListener('scroll',onScroll);removeEventListener('orrery-select',onSelect);removeEventListener('orrery-hover',onHover);
   scene.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose();m.dispose()})});haloTexture.dispose();renderer.dispose();
  });

  applyTheme();resize();
  if(window.ObservatoryOrrery?.selected)setSelection(window.ObservatoryOrrery.selected);
  stage.classList.add('is-live');
 }
}
