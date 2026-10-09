/* Land a booster. A first stage falls out of a dusk sky towards a drone ship rolling on the sea. The player steers it over
   the deck, lights the engine late and puts it down upright, slower than 5 m/s. Simplified physics, real proportions:
   a 45 m booster, a 90 m by 52 m deck. Everything the scene shows is also in the text read-out under it. */
import * as THREE from './three.module.js';

let cleanup = null;
window.stopMission = () => { cleanup?.(); cleanup = null; };

const SHIP = 'Of Course I Checked The Source';
const G = 9.81, THRUST = 27, BURN_SECONDS = 15, DRAG = 0.00042, START_Y = 2200, START_VY = -145;
const DECK_HALF_X = 45, DECK_HALF_Z = 26, DECK_TOP = 2.4, LEG_DROP = 1.05, LEGS_AT = 380;
const SAFE_VY = 5, SAFE_VX = 3, SAFE_TILT = 10 * Math.PI / 180;

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function glowTexture(stops) {
  return canvasTexture(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); stops.forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, w, w); });
}

window.setupMission = () => {
  window.stopMission();
  const $ = id => document.getElementById(id);
  const stage = $('game-stage'); if (!stage) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || window.observatoryMotionPaused === true;
  const small = matchMedia('(max-width: 720px)').matches;
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch { $('game-status').textContent = 'The game needs WebGL, which this browser has turned off. The rest of the site works without it.'; $('start-mission').disabled = true; return; }
  r.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.domElement.className = 'game-canvas';
  stage.prepend(r.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 16000);
  const SUN = new THREE.Vector3(-0.62, 0.11, -0.78).normalize();
  const HORIZON = new THREE.Color(0xf0a066), ZENITH = new THREE.Color(0x0a1830), FOG = new THREE.Color(0x3a3f55);

  /* Sky: a dusk gradient with a low sun and its haze, drawn on the inside of a sphere. */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: SUN }, horizon: { value: HORIZON }, zenith: { value: ZENITH } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 sun; uniform vec3 horizon; uniform vec3 zenith; varying vec3 vDir;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      vec3 hz(vec3 d, vec3 sun, vec3 horizon){ vec2 a = normalize(d.xz + 1e-4), b = normalize(sun.xz); float k = 0.5 + 0.5 * dot(a, b); return mix(vec3(0.34, 0.33, 0.46), horizon, pow(k, 2.2)); }
      void main(){
        vec3 d = normalize(vDir); float y = max(d.y, 0.0);
        vec3 c = mix(hz(d, sun, horizon), zenith, pow(y, 0.42));
        c = mix(c, hz(vec3(d.x, 0.0, d.z), sun, horizon), step(d.y, 0.0));
        float s = max(dot(normalize(vec3(d.x, max(d.y, 0.0), d.z)), sun), 0.0);
        c += vec3(1.0, 0.62, 0.32) * pow(s, 9.0) * 0.55 + vec3(1.0, 0.9, 0.7) * pow(s, 900.0) * 3.0;
        vec3 q = floor(d * 420.0); float st = step(0.9975, h(q)) * smoothstep(0.18, 0.6, y);
        c += vec3(st) * 0.6;
        gl_FragColor = vec4(c, 1.0);
      }` }));
  sky.renderOrder = -1; sky.material.depthTest = false; scene.add(sky);

  /* Sea: summed travelling waves, displaced in the vertex shader; normals are rebuilt per pixel from the same waves,
     so the swell catches the sun without faceting. */
  const WAVES = 'const vec4 W1 = vec4(0.82, 0.57, 0.050, 1.10); const vec4 W2 = vec4(-0.45, 0.89, 0.083, 0.55); const vec4 W3 = vec4(0.30, -0.95, 0.140, 0.28); const vec4 W4 = vec4(-0.92, -0.40, 0.230, 0.16);' +
    'float wv(vec4 w, vec2 p, float t){ return w.w * sin(dot(w.xy, p) * w.z + t * sqrt(9.81 * w.z)); }' +
    'vec2 wd(vec4 w, vec2 p, float t){ return w.xy * w.z * w.w * cos(dot(w.xy, p) * w.z + t * sqrt(9.81 * w.z)); }' +
    'float sea(vec2 p, float t){ return wv(W1,p,t)+wv(W2,p,t)+wv(W3,p,t)+wv(W4,p,t); }' +
    'vec2 seaD(vec2 p, float t){ return wd(W1,p,t)+wd(W2,p,t)+wd(W3,p,t)+wd(W4,p,t); }';
  const seaMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, sun: { value: SUN }, horizon: { value: HORIZON }, zenith: { value: ZENITH }, fogc: { value: FOG }, cam: { value: new THREE.Vector3() }, flare: { value: 0 }, flarePos: { value: new THREE.Vector3() } },
    vertexShader: WAVES + `uniform float time; varying vec3 vW; void main(){ vec3 p = (modelMatrix * vec4(position, 1.0)).xyz; float fade = 1.0 - smoothstep(600.0, 1600.0, length(p.xz)); p.y += sea(p.xz, time) * fade; vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: WAVES + `uniform float time; uniform vec3 sun; uniform vec3 horizon; uniform vec3 zenith; uniform vec3 fogc; uniform vec3 cam; uniform float flare; uniform vec3 flarePos; varying vec3 vW;
      vec3 hz(vec3 d, vec3 sun, vec3 horizon){ vec2 a = normalize(d.xz + 1e-4), b = normalize(sun.xz); float k = 0.5 + 0.5 * dot(a, b); return mix(vec3(0.34, 0.33, 0.46), horizon, pow(k, 2.2)); }
      void main(){
        float dist = length(cam.xz - vW.xz); float fade = 1.0 - smoothstep(600.0, 1600.0, length(vW.xz));
        vec2 g = seaD(vW.xz, time) * fade; vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(cam - vW); vec3 rf = reflect(-v, n);
        float fr = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        vec3 skyc = mix(hz(rf, sun, horizon), zenith, pow(max(rf.y, 0.0), 0.42));
        vec3 deep = vec3(0.010, 0.050, 0.075), shallow = vec3(0.030, 0.12, 0.15);
        vec3 c = mix(deep, shallow, clamp(0.5 + 0.5 * g.x, 0.0, 1.0) * 0.35);
        c = mix(c, skyc, fr * 0.85);
        float sp = pow(max(dot(rf, sun), 0.0), 320.0); c += vec3(1.0, 0.75, 0.45) * sp * 3.2;
        float glow = flare / (1.0 + pow(length(vW.xz - flarePos.xz) / 40.0, 2.0)); c += vec3(1.0, 0.55, 0.2) * glow * 0.9;
        vec3 hd = vec3(-v.x, 0.0, -v.z); vec3 fc = hz(hd, sun, horizon) + vec3(1.0, 0.62, 0.32) * pow(max(dot(normalize(hd + 1e-4), sun), 0.0), 9.0) * 0.55;
        c = mix(c, fc, 1.0 - exp(-pow(dist / 6500.0, 1.8)));
        gl_FragColor = vec4(c, 1.0);
      }` });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200, small ? 200 : 300, small ? 200 : 300).rotateX(-Math.PI / 2), seaMat);
  const farSea = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000, 1, 1).rotateX(-Math.PI / 2), seaMat); farSea.position.y = -2;
  scene.add(farSea, sea);

  /* Light: the low sun, a cool sky fill and, while the engine burns, the flame itself. */
  scene.add(new THREE.HemisphereLight(0x9fb4d6, 0x1a2430, 1.1));
  const sunLight = new THREE.DirectionalLight(0xffc89a, 2.6); sunLight.position.copy(SUN).multiplyScalar(500); scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0xb7c6e0, 1.5); fill.position.set(400, 260, 600); scene.add(fill);
  const flameLight = new THREE.PointLight(0xff9a3c, 0, 0, 1.6); scene.add(flameLight);

  /* The drone ship: a hull, two side walls, thrusters, a painted deck with the landing X, and her name on the side. */
  const ship = new THREE.Group(); scene.add(ship);
  const deckTex = canvasTexture(1024, 592, (g, w, h) => {
    g.fillStyle = '#2b3036'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? '#2f343a' : '#282c31'; g.fillRect(i * w / 26, 0, w / 26, h); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { g.beginPath(); g.moveTo(i * w / 26, 0); g.lineTo(i * w / 26, h); g.stroke(); }
    g.fillStyle = 'rgba(10,10,10,.28)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(w / 2 + (Math.sin(i * 7.1) * 60), h / 2 + Math.cos(i * 3.3) * 50, 40 + (i % 5) * 18, 0, 7); g.fill(); }
    g.strokeStyle = '#f2f2ee'; g.lineWidth = 22; g.beginPath(); g.arc(w / 2, h / 2, 230, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 40; g.lineCap = 'butt'; const k = 150;
    g.beginPath(); g.moveTo(w / 2 - k, h / 2 - k); g.lineTo(w / 2 + k, h / 2 + k); g.moveTo(w / 2 + k, h / 2 - k); g.lineTo(w / 2 - k, h / 2 + k); g.stroke();
    g.strokeStyle = '#e6c07a'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, 262, 0, Math.PI * 2); g.stroke();
  });
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.82, metalness: 0.35 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(DECK_HALF_X * 2, 9, DECK_HALF_Z * 2), [hullMat, hullMat, new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.9, metalness: 0.15 }), hullMat, hullMat, hullMat]);
  hull.position.y = DECK_TOP - 4.5; ship.add(hull);
  const nameTex = canvasTexture(2048, 128, (g, w, h) => { g.fillStyle = '#3a4148'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8ecef'; g.font = '600 64px "DM Sans", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SHIP, w / 2, h / 2 + 4); });
  const name = new THREE.Mesh(new THREE.PlaneGeometry(80, 5), new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.8 })); name.position.set(0, DECK_TOP - 3.2, DECK_HALF_Z + 0.06); ship.add(name);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a525a, roughness: 0.7, metalness: 0.5 });
  for (const s of [-1, 1]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(70, 4.5, 1.2), wallMat); wall.position.set(0, DECK_TOP + 2.2, s * (DECK_HALF_Z - 0.6)); ship.add(wall); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 5, 16), wallMat); t.position.set(sx * (DECK_HALF_X - 4), DECK_TOP + 2.5, sz * (DECK_HALF_Z - 4)); ship.add(t); }
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff5a3c }); const beacons = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), beaconMat); b.position.set(sx * (DECK_HALF_X - 4), DECK_TOP + 5.4, sz * (DECK_HALF_Z - 4)); ship.add(b); beacons.push(b); }
  const beaconGlowMat = new THREE.SpriteMaterial({ map: glowTexture([[0, 'rgba(255,120,80,1)'], [0.3, 'rgba(255,80,50,.4)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const beaconGlows = beacons.map(b => { const s = new THREE.Sprite(beaconGlowMat); s.scale.setScalar(9); s.position.copy(b.position); ship.add(s); return s; });

  /* The booster. Its origin is the bottom of the engine bells; the legs fold up along the body and swing down on the way in. */
  const booster = new THREE.Group(); scene.add(booster);
  const bodyTex = canvasTexture(512, 1024, (g, w, h) => {
    g.fillStyle = '#eef0f1'; g.fillRect(0, 0, w, h);
    const soot = g.createLinearGradient(0, h, 0, h * 0.3); soot.addColorStop(0, 'rgba(18,16,14,.95)'); soot.addColorStop(0.45, 'rgba(40,34,28,.55)'); soot.addColorStop(1, 'rgba(60,50,40,0)');
    g.fillStyle = soot; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(30,26,22,' + (0.08 + (i % 7) * 0.02) + ')'; g.fillRect((i * 97) % w, h * 0.35 + (i * 53) % (h * 0.55), 3 + (i % 4) * 4, 60 + (i % 9) * 30); }
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let y = 0; y < h; y += h / 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = 'rgba(20,20,22,.85)'; g.fillRect(w * 0.47, h * 0.12, w * 0.06, h * 0.7);
  });
  const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.5, metalness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.55, metalness: 0.6 });
  const R = 1.85;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 38, 32, 1, true), bodyMat); body.position.y = 2.2 + 19; booster.add(body);
  const inter = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 5, 32), darkMat); inter.position.y = 2.2 + 38 + 2.5; booster.add(inter);
  const octa = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.02, 2.2, 32), darkMat); octa.position.y = 1.1; booster.add(octa);
  const bellMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const a = i / 8 * Math.PI * 2, rr = i === 8 ? 0 : 1.2;
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, 1.0, 14, 1, true), bellMat); bell.position.set(Math.cos(a) * rr, -0.1, Math.sin(a) * rr); booster.add(bell);
  }
  const finMat = new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.4, metalness: 0.85 });
  const fins = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * R, 2.2 + 36.5, Math.sin(a) * R); pivot.rotation.y = -a; booster.add(pivot);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.8), finMat); fin.position.x = 0.75; pivot.add(fin); fins.push(pivot);
  }
  const legs = [], LEG_LEN = 11.5, LEG_HINGE = 9.2;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * (R + 0.15), LEG_HINGE, Math.sin(a) * (R + 0.15)); pivot.rotation.y = -a; booster.add(pivot);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, LEG_LEN, 0.7), darkMat); leg.position.y = LEG_LEN / 2; pivot.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.3, 12), darkMat); foot.position.y = LEG_LEN; pivot.add(foot);
    legs.push(pivot);
  }

  /* The flame: an outer kerosene-orange plume and a hot core, both flickering in the shader, plus a glow at the nozzles. */
  const flameShader = (inner) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, power: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float time; uniform float power; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        float along = 1.0 - vUv.y; float flick = n(vec2(vUv.x * 6.0, vUv.y * 9.0 + time * 14.0));
        float a = pow(1.0 - along, ${inner ? '1.8' : '1.1'}) * (0.55 + 0.45 * flick) * power;
        vec3 c = ${inner ? 'mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.75, 0.4), along)' : 'mix(vec3(1.0, 0.62, 0.22), vec3(0.85, 0.25, 0.05), along)'};
        gl_FragColor = vec4(c * a * 1.7, a);
      }` });
  const plumeMat = flameShader(false), coreMat = flameShader(true);
  const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 2.4, 1, 24, 1, true), plumeMat); booster.add(plume);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.6, 1, 16, 1, true), coreMat); booster.add(core);
  const nozzleGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture([[0, 'rgba(255,240,210,1)'], [0.25, 'rgba(255,170,80,.7)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  nozzleGlow.scale.setScalar(14); nozzleGlow.position.y = -1.5; booster.add(nozzleGlow);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture([[0, 'rgba(255,250,235,1)'], [0.18, 'rgba(255,190,90,.9)'], [0.45, 'rgba(240,90,30,.35)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  flash.visible = false; scene.add(flash); let boom = -1;

  /* Particles: one pool for exhaust smoke, deck spray, splash and fire, updated in place with no allocation per frame. */
  const MAX = small ? 700 : 1400;
  const pAlpha = new Float32Array(MAX), pPos = new Float32Array(MAX * 3), pCol = new Float32Array(MAX * 3), pSize = new Float32Array(MAX), pVel = new Float32Array(MAX * 3), pLife = new Float32Array(MAX), pMax = new Float32Array(MAX), pGrow = new Float32Array(MAX), pKind = new Uint8Array(MAX);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, uniforms: { scale: { value: 1 } },
    vertexShader: 'attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; void main(){ vC = color; vA = alpha; vec4 p = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * 900.0 / -p.z; gl_Position = projectionMatrix * p; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }' });
  const particles = new THREE.Points(pGeo, pMat); particles.frustumCulled = false; scene.add(particles);
  let pNext = 0;
  function emit(x, y, z, vx, vy, vz, life, size, grow, kind) {
    const i = pNext; pNext = (pNext + 1) % MAX;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
    pLife[i] = life; pMax[i] = life; pSize[i] = size; pGrow[i] = grow; pKind[i] = kind;
  }
  function stepParticles(dt) {
    for (let i = 0; i < MAX; i++) {
      if (pLife[i] <= 0) { pSize[i] = 0; pAlpha[i] = 0; continue; }
      pLife[i] -= dt; const k = pLife[i] / pMax[i], kind = pKind[i];
      pVel[i * 3 + 1] += (kind === 2 ? -9.81 : kind === 3 ? 3 : 1.2) * dt;
      const drag = kind === 2 ? 0.2 : 1.6; pVel[i * 3] *= 1 - drag * dt; pVel[i * 3 + 1] *= 1 - drag * 0.5 * dt; pVel[i * 3 + 2] *= 1 - drag * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      if (kind !== 2 && pPos[i * 3 + 1] < DECK_TOP && Math.abs(pPos[i * 3]) < DECK_HALF_X && Math.abs(pPos[i * 3 + 2]) < DECK_HALF_Z) { pPos[i * 3 + 1] = DECK_TOP; pVel[i * 3 + 1] = Math.abs(pVel[i * 3 + 1]) * 0.1; }
      pSize[i] += pGrow[i] * dt;
      const fade = Math.min(1, k * 1.6);
      if (kind === 3) { const hot = Math.max(0, (k - 0.55) * 2.2); pCol[i * 3] = 0.3 + 0.7 * hot; pCol[i * 3 + 1] = 0.27 + 0.45 * hot; pCol[i * 3 + 2] = 0.25 + 0.1 * hot; pAlpha[i] = fade * (0.55 + 0.4 * hot); }
      else if (kind === 2) { pCol[i * 3] = 0.86; pCol[i * 3 + 1] = 0.9; pCol[i * 3 + 2] = 0.93; pAlpha[i] = fade * 0.7; }
      else { const v = 0.58 + 0.2 * k; pCol[i * 3] = v; pCol[i * 3 + 1] = v * 0.96; pCol[i * 3 + 2] = v * 0.92; pAlpha[i] = fade * 0.22; }
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; pGeo.attributes.size.needsUpdate = true; pGeo.attributes.alpha.needsUpdate = true;
  }

  /* The approach strip in the corner: where the booster is against the ship, at a glance, while the ship is still a dot. */
  const radar = $('game-radar'), rg = radar?.getContext('2d');
  function drawRadar() {
    if (!rg) return; const w = radar.width, h = radar.height; rg.clearRect(0, 0, w, h);
    rg.fillStyle = 'rgba(8,12,16,.62)'; rg.fillRect(0, 0, w, h);
    const span = 220, cx = w / 2, deckY = h - 10, toX = x => cx + Math.max(-1, Math.min(1, x / span)) * (w / 2 - 6);
    const alt = Math.max(0, s.y - DECK_TOP), toY = y => deckY - Math.log10(1 + y) / Math.log10(1 + START_Y + 200) * (h - 20);
    rg.strokeStyle = 'rgba(230,192,122,.9)'; rg.lineWidth = 3; rg.beginPath(); rg.moveTo(toX(-DECK_HALF_X), deckY); rg.lineTo(toX(DECK_HALF_X), deckY); rg.stroke();
    rg.strokeStyle = 'rgba(230,192,122,.25)'; rg.lineWidth = 1; rg.setLineDash([3, 4]); rg.beginPath(); rg.moveTo(cx, deckY); rg.lineTo(cx, 6); rg.stroke(); rg.setLineDash([]);
    rg.fillStyle = Math.abs(s.x) < DECK_HALF_X ? '#e9eded' : '#f0907f'; rg.beginPath(); rg.arc(toX(s.x), toY(alt), 3.5, 0, 7); rg.fill();
  }

  /* Game state, physics and outcome. */
  const s = { x: 0, y: START_Y, vx: 0, vy: START_VY, th: 0, om: 0, fuel: 1, thr: 0, legs: 0, t: 0 };
  let started = false, ended = false, burnHeld = false, steerL = false, steerR = false, outcome = null, shake = 0, legsCalled = false, fuelCalled = false;
  let best = 0; try { best = +localStorage.getItem('emn-landing-best') || 0; } catch {}
  const deckHeave = t => Math.sin(t * 0.55) * 0.5 + Math.sin(t * 1.3) * 0.15;
  const deckRoll = t => Math.sin(t * 0.42) * 0.012;

  function hud() {
    if (!$('altitude')) return;
    const alt = Math.max(0, s.y - DECK_TOP);
    $('altitude').textContent = Math.round(alt).toLocaleString('en-GB') + ' m';
    $('velocity').textContent = Math.abs(s.vy).toFixed(1) + ' m/s' + (s.vy > 0.05 ? ' ↑' : ' ↓');
    if ($('drift')) $('drift').textContent = Math.abs(s.x) < 0.5 ? 'On the X' : Math.abs(s.x).toFixed(0) + ' m ' + (s.x > 0 ? 'right' : 'left');
    if ($('tilt')) $('tilt').textContent = Math.abs(s.th * 180 / Math.PI).toFixed(0) + '°';
    $('fuel').textContent = Math.round(s.fuel * 100) + '%';
  }
  function say(t) { const el = $('game-status'); if (el && el.textContent !== t) el.textContent = t; }
  function showBest() { const el = $('game-best'); if (el) el.textContent = best ? 'Best in this browser: ' + best.toLocaleString('en-GB') + ' points.' : ''; }

  function reset() {
    const side = Math.random() < 0.5 ? -1 : 1;
    Object.assign(s, { x: side * (55 + Math.random() * 45), y: START_Y, vx: -side * (2 + Math.random() * 4), vy: START_VY, th: 0, om: 0, fuel: 1, thr: 0, legs: 0 });
    started = true; ended = false; outcome = null; legsCalled = false; fuelCalled = false; shake = 0;
    booster.visible = true; booster.rotation.set(0, 0, 0); boom = -1; flash.visible = false;
    for (let i = 0; i < MAX; i++) pLife[i] = 0;
    $('start-mission').textContent = 'Restart'; $('burn').disabled = false; $('steer-left') && ($('steer-left').disabled = false); $('steer-right') && ($('steer-right').disabled = false);
    say('Falling at 145 m/s. Steer over the ship, then light the engine late and land under 5 m/s.'); hud();
    $('burn').focus({ preventScroll: true });
  }
  function finish(kind, text) {
    ended = true; outcome = kind; burnHeld = false; setBurnUi();
    $('burn').disabled = true; $('steer-left') && ($('steer-left').disabled = true); $('steer-right') && ($('steer-right').disabled = true);
    $('start-mission').textContent = kind === 'landed' ? 'Fly again' : 'Try again';
    say(text); hud(); showBest();
    setTimeout(() => { if (ended && $('game-dialog')?.open) $('start-mission')?.focus({ preventScroll: true }); }, 700);
  }
  function touchdown(onDeck) {
    const vy = Math.abs(s.vy), vx = Math.abs(s.vx), tilt = Math.abs(s.th), deg = Math.round(tilt * 180 / Math.PI), dx = Math.abs(s.x);
    if (!onDeck) {
      s.vy = 0; for (let i = 0; i < 160; i++) { const a = Math.random() * 6.283, sp = 4 + Math.random() * 16; emit(s.x, 0.5, 0, Math.cos(a) * sp, 8 + Math.random() * 22, Math.sin(a) * sp, 1.8 + Math.random(), 2 + Math.random() * 2, 3, 2); }
      booster.visible = false; shake = reduce ? 0 : 0.8;
      return finish('missed', 'Splashdown, ' + Math.round(dx - DECK_HALF_X) + ' m past the edge of the deck. Steer with the arrows while you are still high, before you light the engine.');
    }
    const legsOut = s.legs > 0.95, safe = legsOut && vy <= SAFE_VY && vx <= SAFE_VX && tilt <= SAFE_TILT;
    if (safe) {
      s.y = DECK_TOP + deckHeave(s.t) + LEG_DROP; s.vy = 0; s.vx = 0; s.om = 0;
      const rating = dx < 4 ? 'Bullseye' : dx < 14 ? 'On the X' : 'On the deck';
      const score = Math.max(0, Math.round(1000 - dx * 12 - vy * 40 - vx * 40 - deg * 12 + s.fuel * 400));
      const isBest = score > best; if (isBest) { best = score; try { localStorage.setItem('emn-landing-best', String(best)); } catch {} }
      for (let i = 0; i < 120; i++) { const a = Math.random() * 6.283, sp = 6 + Math.random() * 14; emit(s.x + Math.cos(a) * 2, DECK_TOP + 0.5, Math.sin(a) * 2, Math.cos(a) * sp, 1 + Math.random() * 2, Math.sin(a) * sp, 2.5 + Math.random() * 1.5, 2.5, 5, 0); }
      return finish('landed', rating + ': ' + dx.toFixed(1) + ' m from the X at ' + vy.toFixed(1) + ' m/s, with ' + Math.round(s.fuel * 100) + '% fuel left. ' + score.toLocaleString('en-GB') + ' points' + (isBest ? ', your best yet' : '') + '. A reusable rocket, and one very relieved accountant.');
    }
    booster.visible = false; shake = reduce ? 0 : 1.4; boom = 0; flash.position.set(s.x, DECK_TOP + 8, 0);
    for (let i = 0; i < 260; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.2, sp = 6 + Math.random() * 26; emit(s.x, DECK_TOP + 2 + Math.random() * 10, 0, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 4, Math.sin(a) * Math.cos(e) * sp, 1.4 + Math.random() * 2.2, 3 + Math.random() * 3, 7, 3); }
    const why = !legsOut ? 'The legs were still folded.' : vy > SAFE_VY ? 'You met the deck at ' + vy.toFixed(1) + ' m/s; under 5 is the goal, so light the engine a little earlier.' : vx > SAFE_VX ? 'It was still sliding sideways at ' + vx.toFixed(1) + ' m/s; steer it still before the last few metres.' : 'It came down at ' + deg + '° and toppled; keep it upright with the arrows near the deck.';
    return finish('lost', 'Rapid unscheduled disassembly. ' + why);
  }

  function physics(dt) {
    s.t += dt;
    if (ended && outcome === 'landed') { s.y = DECK_TOP + deckHeave(s.t) + LEG_DROP; return; }
    if (!started || ended) return;
    const steer = (steerR ? 1 : 0) - (steerL ? 1 : 0);
    const want = burnHeld && s.fuel > 0 ? 1 : 0; s.thr += (want - s.thr) * Math.min(1, dt * 7);
    if (s.fuel <= 0) s.thr = Math.max(0, s.thr - dt * 6);
    const speed = Math.hypot(s.vx, s.vy), authority = 0.9 * s.thr + Math.min(1, speed / 120);
    s.om += (steer * authority * 0.9 - s.th * 2.4 - s.om * 2.6) * dt; s.th += s.om * dt; s.th = Math.max(-0.7, Math.min(0.7, s.th));
    const a = THRUST * s.thr, gust = Math.sin(s.t * 0.37) * 0.25 + Math.sin(s.t * 1.13 + 1) * 0.15;
    const ax = a * Math.sin(s.th) + s.th * speed * 0.055 * (1 - s.thr) - DRAG * 3 * s.vx * Math.abs(s.vx) + gust;
    const ay = a * Math.cos(s.th) - G - DRAG * s.vy * Math.abs(s.vy);
    s.vx += ax * dt; s.vy += ay * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    s.fuel = Math.max(0, s.fuel - s.thr * dt / BURN_SECONDS);
    if (!legsCalled && s.y < LEGS_AT) { legsCalled = true; say('Legs out. Keep it upright and come down slow.'); }
    s.legs += ((s.y < LEGS_AT ? 1 : 0) - s.legs) * Math.min(1, dt * 1.6);
    if (!fuelCalled && s.fuel <= 0) { fuelCalled = true; say('Out of fuel. Whatever happens now, happens.'); }
    const bottom = s.y - (s.legs > 0.5 ? LEG_DROP : 0);
    const onDeck = Math.abs(s.x) <= DECK_HALF_X;
    if (onDeck && bottom <= DECK_TOP + deckHeave(s.t)) touchdown(true);
    else if (!onDeck && bottom <= 0.3) touchdown(false);
    if (s.y > START_Y + 400) { s.y = START_Y + 400; s.vy = Math.min(s.vy, 0); }
  }

  /* Input: buttons, keys and a held press. Pointer capture keeps a burn going while a finger drifts. */
  const btn = id => $(id);
  function setBurnUi() { btn('burn')?.classList.toggle('primary', burnHeld && started && !ended); }
  const hold = (el, on, off) => { if (!el) return []; const d = e => { e.preventDefault(); on(); try { el.setPointerCapture?.(e.pointerId); } catch {} }, u = () => off(); el.addEventListener('pointerdown', d); el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('lostpointercapture', u); el.addEventListener('contextmenu', e => e.preventDefault()); return [[el, 'pointerdown', d], [el, 'pointerup', u], [el, 'pointercancel', u], [el, 'lostpointercapture', u]]; };
  const bound = [
    ...hold(btn('burn'), () => { burnHeld = started && !ended; setBurnUi(); }, () => { burnHeld = false; setBurnUi(); }),
    ...hold(btn('steer-left'), () => { steerL = true; }, () => { steerL = false; }),
    ...hold(btn('steer-right'), () => { steerR = true; }, () => { steerR = false; })
  ];
  const keyDown = e => {
    if (!started || ended) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); burnHeld = true; setBurnUi(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); steerL = true; }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); steerR = true; }
  };
  const keyUp = e => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { if (started && document.activeElement !== $('start-mission')) e.preventDefault(); burnHeld = false; setBurnUi(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') steerL = false;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') steerR = false;
  };
  const release = () => { burnHeld = false; steerL = steerR = false; setBurnUi(); };
  const visibility = () => { if (document.hidden) { release(); last = 0; } };
  $('start-mission').onclick = reset;
  addEventListener('keydown', keyDown); addEventListener('keyup', keyUp); addEventListener('blur', release); document.addEventListener('visibilitychange', visibility);

  /* Camera: a chase view that sits behind and above the booster, widening as it falls, then settling on the deck. */
  const camPos = new THREE.Vector3(160, START_Y + 60, 260), camLook = new THREE.Vector3(0, START_Y, 0), tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
  function placeCamera(dt, settle) {
    if (!started) {
      // Before the first descent: an establishing shot of the ship on the swell, the sun behind it, the booster still a speck.
      const t = s.t * 0.05; tmpV.set(130 + Math.sin(t) * 12, 26, 150); tmpL.set(-10, 8, -20);
      camPos.copy(tmpV); camLook.copy(tmpL); camera.position.copy(camPos); camera.lookAt(camLook); return;
    }
    const alt = Math.max(0, s.y - DECK_TOP), near = THREE.MathUtils.smoothstep(alt, 0, 600);
    const dist = 95 + 150 * near, lift = 18 + 40 * near;
    tmpV.set(s.x + dist * 0.42, Math.max(14, s.y + lift), dist);
    const toShip = (1 - near) * 0.45;
    tmpL.set(s.x * (1 - toShip), s.y + 18 * near + (DECK_TOP - s.y) * toShip * 0.4, 0);
    const k = settle ? 1 : Math.min(1, dt * 2.4);
    camPos.lerp(tmpV, k); camLook.lerp(tmpL, k);
    camera.position.copy(camPos);
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 2; camera.position.y += (Math.random() - 0.5) * shake * 2; shake = Math.max(0, shake - dt * 1.2); }
    camera.lookAt(camLook);
  }

  function render(t) {
    const time = t / 1000;
    seaMat.uniforms.time.value = time; seaMat.uniforms.cam.value.copy(camera.position);
    ship.position.y = deckHeave(s.t); ship.rotation.z = deckRoll(s.t);
    const blink = (Math.sin(time * 4) > 0.6) ? 1 : 0.15; beaconGlows.forEach(b => { b.material.opacity = blink; });
    booster.position.set(s.x, s.y, 0); booster.rotation.z = -s.th;
    legs.forEach(l => { l.rotation.z = -s.legs * (Math.PI - 0.47); });
    const finOut = ended ? 1 : THREE.MathUtils.smoothstep(START_Y - s.y, 0, 120);
    fins.forEach(f => { f.rotation.z = (1 - finOut) * -1.4 + finOut * s.th * 0.6; });
    const thr = ended ? 0 : s.thr, alt = Math.max(0, s.y - DECK_TOP);
    const len = (14 + 26 * thr) * (1 + Math.min(1, alt / 800) * 0.6);
    plume.visible = core.visible = thr > 0.02;
    plume.scale.set(1 + (1 - Math.min(1, alt / 40)) * 1.4, len, 1 + (1 - Math.min(1, alt / 40)) * 1.4); plume.position.y = -0.6 - len / 2;
    core.scale.set(1, len * 0.45, 1); core.position.y = -0.6 - len * 0.225;
    plumeMat.uniforms.time.value = coreMat.uniforms.time.value = time; plumeMat.uniforms.power.value = coreMat.uniforms.power.value = thr;
    nozzleGlow.material.opacity = thr; nozzleGlow.scale.setScalar(10 + thr * 10);
    tmpV.set(0, -6, 0).applyMatrix4(booster.matrixWorld); flameLight.position.copy(tmpV); flameLight.intensity = thr * 9000;
    if (boom >= 0) { boom += 1 / 60; const k = Math.min(1, boom / 1.3), e = (1 - k) * (1 - k); flash.visible = k < 1; flash.scale.setScalar(20 + 110 * Math.sqrt(k)); flash.material.opacity = e; flameLight.position.copy(flash.position); flameLight.intensity = 60000 * e; if (k >= 1) boom = -1; }
    seaMat.uniforms.flare.value = thr * Math.max(0, 1 - alt / 300); seaMat.uniforms.flarePos.value.set(s.x, 0, 0);
    sky.position.copy(camera.position);
    r.render(scene, camera); drawRadar();
  }

  /* Smoke and deck spray come from the flame; a fixed physics step keeps the landing the same at any frame rate. */
  function spawnExhaust(dt) {
    if (ended || s.thr < 0.05) return;
    booster.updateMatrixWorld(); const n = Math.min(8, Math.ceil(s.thr * dt * (small ? 90 : 170)));
    const alt = Math.max(0, s.y - DECK_TOP);
    for (let i = 0; i < n; i++) {
      tmpV.set((Math.random() - 0.5) * 1.5, -8 - Math.random() * 10, (Math.random() - 0.5) * 1.5).applyMatrix4(booster.matrixWorld);
      emit(tmpV.x, tmpV.y, tmpV.z, s.vx * 0.3 + (Math.random() - 0.5) * 4, s.vy * 0.2 - 12 * Math.random(), (Math.random() - 0.5) * 4, 2.2 + Math.random() * 1.6, 1.4, 3.2, 0);
      if (alt < 45 && Math.abs(s.x) < DECK_HALF_X) { const a = Math.random() * 6.283, sp = 18 + Math.random() * 20; emit(s.x, DECK_TOP + 0.6, 0, Math.cos(a) * sp, 0.8 + Math.random(), Math.sin(a) * sp, 1.6 + Math.random(), 1.8, 4.5, 0); }
    }
  }

  let frame = 0, last = 0, acc = 0, lastHud = 0, disposed = false, slow = 0, frames = 0;
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; r.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  function loop(t) {
    if (disposed) return; frame = requestAnimationFrame(loop);
    if (document.hidden) { last = t; return; }
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t;
    frames++; if (frames < 90) slow += dt; else if (frames === 90 && slow / 90 > 0.03 && r.getPixelRatio() > 1) { r.setPixelRatio(1); resize(); }
    acc += dt; const STEP = 1 / 120; while (acc >= STEP) { physics(STEP); acc -= STEP; }
    if (started && !ended) spawnExhaust(dt);
    stepParticles(dt);
    booster.updateMatrixWorld(); placeCamera(dt, false); render(t);
    if (t - lastHud > 100) { hud(); lastHud = t; }
  }

  s.x = 70; s.vx = -3; hud(); showBest(); placeCamera(0, true);
  say('Ready when you are. Press Begin descent.');
  $('start-mission').textContent = 'Begin descent'; $('burn').disabled = true;
  if ($('steer-left')) $('steer-left').disabled = true; if ($('steer-right')) $('steer-right').disabled = true;
  frame = requestAnimationFrame(loop);

  cleanup = () => {
    disposed = true; cancelAnimationFrame(frame); ro.disconnect();
    removeEventListener('keydown', keyDown); removeEventListener('keyup', keyUp); removeEventListener('blur', release); document.removeEventListener('visibilitychange', visibility);
    bound.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
    scene.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); });
    r.dispose(); r.domElement.remove(); if (rg) rg.clearRect(0, 0, radar.width, radar.height);
  };
  window.__landing = s;
};
