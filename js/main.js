// Diorama 3D — rompecabezas tridimensional para navegador y WebXR (Meta Quest).
import * as THREE from './vendor/three.module.js';
import { DIORAMAS, mulberry32 } from './model.js';
import { slice } from './slicer.js';
import { loadGLB, normalizeModel } from './loader.js';
import { Sfx } from './audio.js';
import { buildLife, dayNight, newSky } from './life.js';
import { XRHandMeshModel } from './vendor/addons/webxr/XRHandMeshModel.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'diorama3d-faro-v1';
const C = new THREE.Vector3(0, 1.15, -0.45);   // centro de la zona de armado
const PEDESTAL_Y = 0.78;

// ---------------------------------------------------------------- escena
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); // alpha: necesario para la realidad mixta
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe6ec);
scene.fog = new THREE.Fog(0xcfe6ec, 5, 22);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.02, 80);

const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa3b5, 1.7);
scene.add(hemi);
const skyUniforms = { uA: { value: new THREE.Color(0xcfe6ec) }, uB: { value: new THREE.Color(0x5c9ed4) } };
const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
sun.position.set(1.5, 3, 2);
scene.add(sun);

const envOnly = []; // lo que se oculta en realidad mixta para ver la habitación real
{ // cielo en degradé
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, fog: false, depthWrite: false, uniforms: skyUniforms,
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uA; uniform vec3 uB; varying float h; void main(){ gl_FragColor = vec4(mix(uA,uB,smoothstep(0.0,0.75,h)),1.0); }',
    }));
  scene.add(sky);
  envOnly.push(sky);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshLambertMaterial({ color: 0xdfe9e4 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  envOnly.push(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.28, 64), new THREE.MeshLambertMaterial({ color: 0xb9cfd2 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(C.x, 0.002, C.z);
  scene.add(ring);
  envOnly.push(ring);
  // pedestal de la miniatura de referencia
  const wood = new THREE.MeshLambertMaterial({ color: 0xb08a5e });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, PEDESTAL_Y - 0.01, 12), wood);
  col.position.set(C.x, (PEDESTAL_Y - 0.01) / 2, C.z);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.014, 32), wood);
  top.position.set(C.x, PEDESTAL_Y - 0.007, C.z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.02, 24), wood);
  base.position.set(C.x, 0.01, C.z);
  scene.add(col, top, base);
}

const world = new THREE.Group(); // contiene los grupos de piezas
scene.add(world);

function backfaceShader(shader) {
  // el interior de las piezas (caras traseras) se pinta oscuro
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    '#include <dithering_fragment>\n if (!gl_FrontFacing) { gl_FragColor.rgb = gl_FragColor.rgb * 0.25 + vec3(0.2, 0.185, 0.18); }');
}
// def: material del modelo ({map, doubleSided, alphaTest}); sin def, solo colores por vértice.
function makeMaterial(def) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  if (def && def.map) m.map = def.map;
  if (def && def.alphaTest) m.alphaTest = def.alphaTest;
  // los materiales de doble cara (hojas, telas) se ven igual por detrás; el resto muestra el interior oscuro
  if (!(def && def.doubleSided)) m.onBeforeCompile = backfaceShader;
  return m;
}
// Crea la malla de una pieza (o del modelo entero) a partir de la salida del cortador.
function buildMesh(r) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(r.positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(r.colors, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3));
  if (r.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(r.uvs, 2));
  const mats = r.groups.map((g, i) => { geo.addGroup(g.start, g.count, i); return makeMaterial(model.materials[g.mat]); });
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, mats);
  mesh.userData.mats = mats;
  return mesh;
}
function disposeMesh(mesh) {
  mesh.geometry.dispose();
  for (const m of mesh.userData.mats) m.dispose(); // las texturas son del modelo y se conservan
}

// ---------------------------------------------------------------- modelo
// Dioramas generados por código (los de la carpeta "modelos/" se suman después).
function buildBuiltin(pz) {
  const m = normalizeModel(pz.build());
  m.id = pz.id;
  m.materials = [{ map: null, doubleSided: false, alphaTest: 0 }];
  return m;
}
const FARO = DIORAMAS[0];
let model = buildBuiltin(FARO);

// Modelo completo: en el menú se muestra grande; durante la partida es la miniatura de referencia.
let showcase = null;
let lifeShow = null, lifeGame = null; // efectos "vivos": del modelo del menú y de la partida
function rebuildShowcase() {
  if (lifeShow) { lifeShow.dispose(); lifeShow = null; }
  if (showcase) { scene.remove(showcase); disposeMesh(showcase); }
  showcase = buildMesh(slice(model, 1, 1)[0]);
  scene.add(showcase);
  const host = { object: showcase, active: () => !state.inGame };
  lifeShow = buildLife(model.features || [], () => host);
}
rebuildShowcase();
let showRef = true;
function placeShowcase() {
  if (state.inGame) {
    showcase.scale.setScalar(0.3);
    showcase.position.set(C.x, PEDESTAL_Y + model.size[1] / 2 * 0.3 + 0.004, C.z);
    showcase.visible = showRef;
  } else {
    showcase.scale.setScalar(1);
    showcase.position.copy(C);
    showcase.visible = true;
  }
}

// ---------------------------------------------------------------- estado
const state = {
  pieces: [], groups: new Set(), total: 0,
  count: 40, mode: 'relax', seed: 1,
  elapsed: 0, playing: false, inGame: false, complete: false, finale: null,
};
const sfx = new Sfx();
const SETTINGS_KEY = 'diorama3d-settings-v1';
const settings = { showTimer: false, dayNight: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) { /* valores por defecto */ }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* nada */ } }
const anims = new Set();   // mallas deslizándose a su sitio tras un encastre
let saveTimer = 0;

const V = () => new THREE.Vector3();
const t1 = V(), t2 = V(), t3 = V(), tS = V();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
const m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4();
const IDENT_Q = new THREE.Quaternion();

function worldCentroid(g, out = V()) {
  return out.copy(g.userData.centroid).applyQuaternion(g.quaternion).add(g.position);
}
function setPivot(g, pivot) { // coloca el grupo para que su centroide quede en "pivot"
  g.position.copy(g.userData.centroid).applyQuaternion(g.quaternion).multiplyScalar(-1).add(pivot);
}
function recomputeCentroid(g) {
  const c = g.userData.centroid.set(0, 0, 0);
  for (const p of g.userData.pieces) c.add(p.centroid);
  c.multiplyScalar(1 / g.userData.pieces.length);
}
function makeGroup(pieces) {
  const g = new THREE.Group();
  g.userData = { pieces: [], centroid: V() };
  for (const p of pieces) { g.add(p.mesh); p.group = g; g.userData.pieces.push(p); }
  recomputeCentroid(g);
  world.add(g);
  state.groups.add(g);
  return g;
}

function clearGame() {
  if (lifeGame) { lifeGame.dispose(); lifeGame = null; }
  for (const p of state.pieces) disposeMesh(p.mesh);
  for (const g of state.groups) world.remove(g);
  state.pieces = []; state.groups.clear(); anims.clear();
  state.finale = null; state.complete = false;
  drag = null; hoverGroup = null;
  for (const h of hands) h.held = null;
  confetti.visible = false;
}

function buildGame({ count, mode, seed, saved = null }) {
  clearGame();
  Object.assign(state, { count, mode, seed, elapsed: saved ? saved.elapsed : 0 });
  const raw = slice(model, count, seed);
  state.pieces = raw.map((r) => {
    const mesh = buildMesh(r);
    const piece = {
      id: r.id, mesh, mats: mesh.userData.mats, seedPos: r.seedPos, centroid: new THREE.Vector3(...r.centroid), radius: r.radius, group: null, flash: 0,
      neighbors: new Map([...r.neighbors].map(([j, a]) => [j, new THREE.Vector3(...a)])),
    };
    mesh.userData.piece = piece;
    return piece;
  });
  state.total = state.pieces.length;
  // cada efecto cuelga de la pieza que contiene su punto (la de semilla más cercana)
  // y despierta cuando esa pieza ya está unida a alguna otra
  lifeGame = buildLife(model.features || [], (pos) => {
    let best = null, bd = Infinity;
    for (const p of state.pieces) {
      const d = (p.seedPos[0] - pos[0]) ** 2 + (p.seedPos[1] - pos[1]) ** 2 + (p.seedPos[2] - pos[2]) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best && { object: best.mesh, active: () => best.group.userData.pieces.length >= 2 };
  });

  let restored = false;
  if (saved && saved.groups && saved.groups.flat) {
    const ids = saved.groups.flatMap((g) => g.p);
    if (ids.length === state.total && new Set(ids).size === state.total && ids.every((i) => i >= 0 && i < state.total)) {
      for (const sg of saved.groups) {
        const g = makeGroup(sg.p.map((i) => state.pieces[i]));
        g.position.fromArray(sg.pos); g.quaternion.fromArray(sg.q).normalize();
      }
      restored = true;
    }
  }
  if (!restored) {
    for (const p of state.pieces) makeGroup([p]);
    layout(renderer.xr.isPresenting, true);
  }
  state.inGame = true;
  state.complete = state.groups.size === 1;
  placeShowcase();
  updateHud(true);
  sfx.setProgress(progress());
}

const progress = () => (state.total > 1 ? (state.total - state.groups.size) / (state.total - 1) : 0);

// Reparte los grupos en el espacio. vr=true: en arco alrededor del jugador.
function layout(vr, all) {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const list = [...state.groups].filter((g) => all || g.userData.pieces.length === 1);
  if (!list.length) return;
  // el grupo más grande (si ya hay algo armado) va al centro
  let center = null;
  if (all) {
    center = list.reduce((a, b) => (b.userData.pieces.length > a.userData.pieces.length ? b : a));
    if (center.userData.pieces.length === 1) center = null;
  }
  const rest = list.filter((g) => g !== center);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const n = rest.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * 2.4))), rows = Math.ceil(n / cols);
  rest.forEach((g, i) => {
    if (state.mode === 'relax') g.quaternion.identity();
    else if (g.userData.pieces.length === 1 || all) {
      g.quaternion.set(rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    }
    if (vr) {
      const cx = i % cols, cy = Math.floor(i / cols);
      const az = THREE.MathUtils.degToRad(-112 + 224 * ((cx + 0.5 + (rng() - 0.5) * 0.5) / cols));
      const y = 0.88 + 0.75 * ((cy + 0.5 + (rng() - 0.5) * 0.5) / rows);
      const r = 0.72 + rng() * 0.2;
      t1.set(Math.sin(az) * r, y, -Math.cos(az) * r);
    } else {
      // esfera de Fibonacci achatada alrededor del centro
      const k = (i + 0.5) / n;
      const yy = 1 - 2 * k, rad = Math.sqrt(Math.max(0, 1 - yy * yy)), th = i * 2.399963;
      const r = 0.46 + rng() * 0.26;
      t1.set(Math.cos(th) * rad * r * 1.15, yy * r * 0.72, Math.sin(th) * rad * r * 1.15).add(C);
      t1.y = Math.max(t1.y, PEDESTAL_Y + 0.2);
    }
    setPivot(g, t1);
  });
  if (center) {
    if (state.mode === 'relax') center.quaternion.identity();
    setPivot(center, C);
  }
}

// ---------------------------------------------------------------- encastre
function merge(A, B) { // todas las piezas de A pasan a B
  A.updateMatrix(); B.updateMatrix();
  m1.copy(B.matrix).invert().multiply(A.matrix);
  for (const p of A.userData.pieces) {
    p.mesh.updateMatrix();
    m2.multiplyMatrices(m1, p.mesh.matrix).decompose(p.mesh.position, p.mesh.quaternion, tS);
    p.mesh.scale.set(1, 1, 1);
    B.add(p.mesh);
    p.group = B; p.flash = 1;
    p.mesh.userData.t = 0;
    anims.add(p.mesh);
    B.userData.pieces.push(p);
  }
  for (const p of B.userData.pieces) p.flash = Math.max(p.flash, 0.3);
  world.remove(A);
  state.groups.delete(A);
  recomputeCentroid(B);
}

// Busca el grupo vecino con el que G encajaría ahora mismo (o null).
function findSnap(G, flat) {
  if (state.complete) return null;
  const posTol = flat ? 0.05 : 0.04;
  const angTol = THREE.MathUtils.degToRad(30);
  let best = null, bestD = Infinity;
  for (const a of G.userData.pieces) {
    for (const [j, anchor] of a.neighbors) {
      const B = state.pieces[j].group;
      if (B === G) continue;
      if (G.quaternion.angleTo(B.quaternion) > angTol) continue;
      t1.copy(anchor).applyQuaternion(G.quaternion).add(G.position);
      t2.copy(anchor).applyQuaternion(B.quaternion).add(B.position);
      if (flat) t3.subVectors(t2, camera.position).normalize(); // rayo cámara → punto de unión
      t1.sub(t2);
      if (flat) { // con ratón se ignora (casi) la distancia a lo largo de ese rayo
        const depth = t1.dot(t3);
        if (Math.abs(depth) > 0.9) continue;
        t1.addScaledVector(t3, -depth);
      }
      const d = t1.length();
      if (d < posTol && d < bestD) { bestD = d; best = B; }
    }
  }
  return best;
}

// Une G con el vecino que tenga a tiro. Se llama al soltar la pieza.
function trySnap(G, flat) {
  const best = findSnap(G, flat);
  if (!best) return false;

  const heldBy = (g) => hands.find((h) => h.held === g) || (drag && drag.group === g ? drag : null);
  let from = G, to = best;
  if (!heldBy(best) && G.userData.pieces.length >= best.userData.pieces.length) { from = best; to = G; }
  // quien sostenía el grupo absorbido lo suelta
  for (const h of hands) if (h.held === from) { h.held = null; h.cand = null; }
  if (drag && drag.group === from) { drag = null; canvas.style.cursor = ''; }
  if (hoverGroup === from) hoverGroup = null;
  merge(from, to);

  sfx.setProgress(progress());
  sfx.snap();
  for (const h of hands) if (h.held === to || h.held === null) pulse(h, 0.7, 70);
  updateHud(true);
  if (state.groups.size === 1) onComplete(to);
  scheduleSave();
  return true;
}

function onComplete(g) {
  state.complete = true;
  for (const h of hands) h.held = null;
  if (drag) endDrag();
  state.finale = { t: 0, g, fromQ: g.quaternion.clone(), fromP: worldCentroid(g), angle: 0 };
  sfx.complete();
  burstConfetti();
  $('done-text').textContent = settings.showTimer ? `${state.total} piezas en ${fmtTime(state.elapsed)}` : `${state.total} piezas`;
  if (!renderer.xr.isPresenting) $('done').classList.remove('hidden');
  updateHud(true);
}

// ---------------------------------------------------------------- confeti
const confetti = (() => {
  const N = 260;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const col = new Float32Array(N * 3);
  const palette = [0xd2553f, 0xf2c14e, 0x4fa3c7, 0x79b25e, 0xffffff].map((h) => new THREE.Color(h));
  for (let i = 0; i < N; i++) palette[i % palette.length].toArray(col, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true }));
  pts.frustumCulled = false; pts.visible = false;
  pts.userData = { vel: new Float32Array(N * 3), life: 0, N };
  scene.add(pts);
  return pts;
})();
function burstConfetti() {
  const { vel, N } = confetti.userData;
  const pos = confetti.geometry.attributes.position.array;
  for (let i = 0; i < N; i++) {
    pos[i * 3] = C.x; pos[i * 3 + 1] = C.y; pos[i * 3 + 2] = C.z;
    const a = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 0.9;
    vel[i * 3] = Math.cos(a) * s; vel[i * 3 + 1] = 0.8 + Math.random() * 1.6; vel[i * 3 + 2] = Math.sin(a) * s;
  }
  confetti.userData.life = 3.5; confetti.visible = true;
}
function updateConfetti(dt) {
  const u = confetti.userData;
  if (u.life <= 0) return;
  u.life -= dt;
  const pos = confetti.geometry.attributes.position.array;
  for (let i = 0; i < u.N; i++) {
    u.vel[i * 3 + 1] -= 2.2 * dt;
    for (let k = 0; k < 3; k++) { u.vel[i * 3 + k] *= 1 - 0.9 * dt; pos[i * 3 + k] += u.vel[i * 3 + k] * dt; }
  }
  confetti.geometry.attributes.position.needsUpdate = true;
  confetti.material.opacity = Math.min(1, u.life);
  if (u.life <= 0) confetti.visible = false;
}

// ---------------------------------------------------------------- guardado
function scheduleSave() { saveTimer = 0.4; }
function saveNow() {
  if (!state.inGame) return;
  try {
    const r = (x) => Math.round(x * 1e4) / 1e4;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      puzzle: model.id, count: state.count, mode: state.mode, seed: state.seed, elapsed: Math.round(state.elapsed),
      groups: [...state.groups].map((g) => ({ p: g.userData.pieces.map((p) => p.id), pos: g.position.toArray().map(r), q: g.quaternion.toArray().map(r) })),
    }));
  } catch (e) { /* almacenamiento no disponible */ }
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.groups) && s.groups.length > 1 && Number.isFinite(s.count)) return s;
  } catch (e) { /* sin partida */ }
  return null;
}

// ---------------------------------------------------------------- HUD
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const panel = (() => {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.09), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  mesh.position.set(C.x, PEDESTAL_Y - 0.09, C.z + 0.13);
  mesh.rotation.x = -0.5;
  mesh.visible = false;
  scene.add(mesh);
  return { cv, tex, mesh, ctx: cv.getContext('2d') };
})();
let lastHudSec = -1;
function updateHud(force) {
  const sec = Math.floor(state.elapsed);
  if (!force && sec === lastHudSec) return;
  lastHudSec = sec;
  const done = state.total - state.groups.size + (state.total ? 1 : 0);
  const prog = `${state.complete ? state.total : done} / ${state.total} piezas`;
  $('progress').textContent = prog;
  $('timer').textContent = fmtTime(state.elapsed);
  $('timer').classList.toggle('hidden', !settings.showTimer);
  const { ctx, cv, tex } = panel;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = 'rgba(250,247,240,0.95)';
  ctx.beginPath(); ctx.roundRect(4, 4, cv.width - 8, cv.height - 8, 40); ctx.fill();
  ctx.fillStyle = '#1d2733'; ctx.textAlign = 'center';
  ctx.font = '600 58px system-ui, sans-serif';
  ctx.fillText(state.complete ? '¡Completado!' : prog, cv.width / 2, 84);
  ctx.font = '44px system-ui, sans-serif'; ctx.globalAlpha = 0.7;
  ctx.fillText(settings.showTimer ? `${model.name} · ${fmtTime(state.elapsed)}` : model.name, cv.width / 2, 150, cv.width - 40);
  ctx.globalAlpha = 1;
  tex.needsUpdate = true;
}
let hintTimer = 0;
function hint(text, secs = 6) { $('hint').textContent = text; $('hint').classList.remove('hidden'); hintTimer = secs; }

// ---------------------------------------------------------------- cámara orbital
const orbit = { az: 0.35, pol: 1.02, dist: 1.85 };
function updateCamera() {
  const sp = Math.sin(orbit.pol);
  camera.position.set(
    C.x + orbit.dist * sp * Math.sin(orbit.az),
    C.y + orbit.dist * Math.cos(orbit.pol),
    C.z + orbit.dist * sp * Math.cos(orbit.az));
  camera.lookAt(C);
}

// ---------------------------------------------------------------- ratón / táctil
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let drag = null;        // {type:'move'|'rotate'|'orbit', group, ...}
let hoverGroup = null;
let pinch = 0;
const dragPlane = new THREE.Plane();

function setRay(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  raycaster.far = 50;
}
function pickPiece() {
  const hits = raycaster.intersectObjects(world.children, true);
  for (const h of hits) if (h.object.userData.piece) return h; // se ignora todo lo que no sea una pieza
  return null;
}
function endDrag() {
  const g = drag && drag.group;
  drag = null;
  canvas.style.cursor = '';
  if (g) { if (!trySnap(g, true)) sfx.drop(); scheduleSave(); } // las piezas se unen al soltar
}
function clampToArena(g) {
  worldCentroid(g, t1).sub(C);
  const L = t1.length();
  let changed = false;
  if (L > 1.6) { t1.multiplyScalar(1.6 / L); changed = true; }
  t1.add(C);
  if (t1.y < 0.15) { t1.y = 0.15; changed = true; }
  if (changed) setPivot(g, t1);
}
function applyMove(e) {
  setRay(e);
  if (!raycaster.ray.intersectPlane(dragPlane, t2)) return;
  drag.group.position.copy(t2).add(drag.offset);
  clampToArena(drag.group);
}
function rotateGroup(g, q) {
  worldCentroid(g, t1);
  g.quaternion.premultiply(q).normalize();
  setPivot(g, t1);
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (renderer.xr.isPresenting) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    if (drag && drag.group) endDrag();
    drag = null;
    const [a, b] = [...pointers.values()];
    pinch = Math.hypot(a.x - b.x, a.y - b.y);
    return;
  }
  const wantsRotate = e.button === 2 || e.shiftKey;
  let hit = null;
  if (state.playing) { setRay(e); hit = pickPiece(); }
  if (hit && !(wantsRotate && state.mode === 'relax')) {
    const group = hit.object.userData.piece.group;
    if (state.finale && state.finale.g === group) state.finale = null;
    sfx.pick();
    if (wantsRotate) {
      drag = { type: 'rotate', group, id: e.pointerId, x: e.clientX, y: e.clientY };
    } else {
      camera.getWorldDirection(t1);
      dragPlane.setFromNormalAndCoplanarPoint(t1, hit.point);
      drag = { type: 'move', group, id: e.pointerId, offset: group.position.clone().sub(hit.point), last: e };
    }
    canvas.style.cursor = 'grabbing';
  } else {
    drag = { type: 'orbit', id: e.pointerId, x: e.clientX, y: e.clientY };
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (renderer.xr.isPresenting) return;
  const p = pointers.get(e.pointerId);
  if (p) { p.x = e.clientX; p.y = e.clientY; }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch > 0) orbit.dist = THREE.MathUtils.clamp(orbit.dist * (pinch / d), 0.7, 4);
    pinch = d;
    return;
  }
  if (!drag) {
    if (!state.playing || e.pointerType === 'touch') return;
    setRay(e);
    const hit = pickPiece();
    hoverGroup = hit ? hit.object.userData.piece.group : null;
    canvas.style.cursor = hoverGroup ? 'grab' : '';
    return;
  }
  if (drag.id !== e.pointerId) return;
  if (drag.type === 'move') {
    drag.last = e;
    applyMove(e);
  } else {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.type === 'orbit') {
      orbit.az -= dx * 0.006;
      orbit.pol = THREE.MathUtils.clamp(orbit.pol - dy * 0.006, 0.15, Math.PI - 0.5);
    } else {
      t2.set(0, 1, 0).applyQuaternion(camera.quaternion);
      t3.set(1, 0, 0).applyQuaternion(camera.quaternion);
      q1.setFromAxisAngle(t2, dx * 0.012);
      q2.setFromAxisAngle(t3, dy * 0.012);
      rotateGroup(drag.group, q1.multiply(q2));
    }
  }
});
const pointerUp = (e) => {
  pointers.delete(e.pointerId);
  pinch = 0;
  if (drag && drag.id === e.pointerId) endDrag();
};
canvas.addEventListener('pointerup', pointerUp);
canvas.addEventListener('pointercancel', pointerUp);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (renderer.xr.isPresenting) return;
  const d = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) / 120;
  if (drag && drag.type === 'move') {
    dragPlane.constant -= d * 0.05; // aleja o acerca la pieza
    applyMove(drag.last);
  } else {
    orbit.dist = THREE.MathUtils.clamp(orbit.dist * (1 + d * 0.1), 0.7, 4);
  }
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (!state.playing || state.mode === 'relax') return;
  const k = e.key.toLowerCase();
  if (k !== 'q' && k !== 'e') return;
  const g = (drag && drag.group) || hoverGroup;
  if (!g) return;
  camera.getWorldDirection(t2);
  rotateGroup(g, q1.setFromAxisAngle(t2, k === 'q' ? -0.14 : 0.14));
  if (!drag) trySnap(g, true);
  scheduleSave();
});

// ---------------------------------------------------------------- VR
// Cada "mano" puede ser un mando o una mano real (seguimiento de manos de WebXR).
// Con mandos se agarra con gatillo o agarre; con las manos, haciendo pinza (pulgar + índice).
const ONE = new THREE.Vector3(1, 1, 1);
const tp = V(), tp2 = V();
const jointGeo = new THREE.SphereGeometry(1, 10, 8);
const handMat = new THREE.MeshLambertMaterial({ color: 0xf3e3d3 });
const handSkin = new THREE.MeshStandardMaterial({ color: 0xf0dfd0, roughness: 0.85, metalness: 0 });
// Carga la malla de mano (izquierda o derecha) la primera vez que aparece esa mano.
// Mientras carga, o si fallara, se siguen viendo las esferitas en las articulaciones.
function ensureHandMesh(h, side) {
  if (side !== 'left' && side !== 'right') return;
  if (h.meshSide === side) return;
  if (h.meshRoot) scene.remove(h.meshRoot);
  h.meshSide = side; h.meshReady = false;
  const root = (h.meshRoot = new THREE.Group());
  root.visible = false;
  scene.add(root);
  h.handMesh = new XRHandMeshModel(root, h.hand, 'assets/hands/', side, null, (obj) => {
    obj.traverse((o) => { if (o.isSkinnedMesh) { o.material = handSkin; o.castShadow = false; o.receiveShadow = false; } });
    if (h.meshRoot === root) h.meshReady = true;
  });
}
const hands = [0, 1].map((i) => {
  const c = renderer.xr.getController(i);     // espacio del rayo (mando o mano)
  const hand = renderer.xr.getHand(i);        // articulaciones de la mano
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const ray = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  c.add(tip, ray);
  scene.add(c, hand);
  const h = {
    c, hand, ray, tip, src: null, isHand: false,
    pose: new THREE.Matrix4(), tracked: false,   // punto y orientación de agarre, en el mundo
    held: null, offset: new THREE.Matrix4(), pull: null, hover: null, cand: null,
    handMesh: null, meshRoot: null, meshSide: null, meshReady: false,
  };
  c.addEventListener('connected', (e) => { h.src = e.data; h.isHand = !!(e.data && e.data.hand); tip.visible = !h.isHand; if (h.isHand) ensureHandMesh(h, e.data.handedness); });
  c.addEventListener('disconnected', () => { h.src = null; h.isHand = false; h.held = null; h.cand = null; h.pull = null; });
  for (const ev of ['selectstart', 'squeezestart']) c.addEventListener(ev, () => grabVR(h));
  for (const ev of ['selectend', 'squeezeend']) c.addEventListener(ev, () => releaseVR(h));
  return h;
});
function pulse(h, strength, ms) {
  try { h.src && h.src.gamepad && h.src.gamepad.hapticActuators && h.src.gamepad.hapticActuators[0] && h.src.gamepad.hapticActuators[0].pulse(strength, ms); } catch (e) { /* sin vibración */ }
}
// Actualiza h.pose. Con manos: el punto de pinza (entre pulgar e índice) con la orientación de la muñeca.
function refreshPose(h) {
  if (h.meshRoot) h.meshRoot.visible = false;
  if (h.isHand) {
    const j = h.hand.joints, a = j['thumb-tip'], b = j['index-finger-tip'], w = j['wrist'];
    if (!(a && b && w && a.visible && b.visible && w.visible)) { h.tracked = false; return; } // mano fuera de vista: se conserva la última pose
    tp.addVectors(a.position, b.position).multiplyScalar(0.5);
    h.pose.compose(tp, w.quaternion, ONE);
    // dibujo de la mano: malla articulada; esferitas solo como respaldo
    const mesh = h.meshReady && j['pinky-finger-tip'];
    if (mesh) { h.handMesh.updateMesh(); h.meshRoot.visible = true; }
    for (const name in j) {
      const jt = j[name];
      if (!jt.userData.ball) { jt.userData.ball = new THREE.Mesh(jointGeo, handMat); jt.add(jt.userData.ball); }
      jt.userData.ball.visible = !mesh;
      jt.userData.ball.scale.setScalar(jt.jointRadius || 0.008);
    }
  } else {
    h.c.updateMatrixWorld();
    h.pose.copy(h.c.matrixWorld);
  }
  h.tracked = true;
}
// Devuelve {group, dist, point}: primero la pieza al alcance de la mano; si no, la que apunta el rayo.
function pickVR(h) {
  tp.setFromMatrixPosition(h.pose);
  let best = null, bd = 0.05;
  for (const p of state.pieces) {
    tp2.copy(p.centroid).applyQuaternion(p.group.quaternion).add(p.group.position);
    const d = tp2.distanceTo(tp) - p.radius * 0.6;
    if (d < bd) { bd = d; best = p; }
  }
  if (best) return { group: best.group, dist: 0, point: null };
  h.c.getWorldPosition(tp);
  tp2.set(0, 0, -1).applyQuaternion(h.c.getWorldQuaternion(q1));
  raycaster.set(tp, tp2);
  raycaster.far = 6;
  const hit = pickPiece();
  return hit ? { group: hit.object.userData.piece.group, dist: hit.distance, point: hit.point } : null;
}
function grabVR(h) {
  if (!state.playing || h.held) return;
  refreshPose(h);
  const pk = pickVR(h);
  if (!pk) return;
  for (const o of hands) if (o !== h && o.held === pk.group) { o.held = null; o.cand = null; o.pull = null; }
  if (state.finale && state.finale.g === pk.group) state.finale = null;
  h.held = pk.group;
  pk.group.updateMatrix();
  m2.copy(h.pose).invert();
  h.offset.multiplyMatrices(m2, pk.group.matrix);
  // tomada a distancia: la pieza viaja hasta la mano (punto apuntado → punto de agarre)
  h.pull = pk.point ? pk.point.clone().applyMatrix4(m2) : null;
  sfx.pick();
  pulse(h, 0.3, 25);
}
function releaseVR(h) {
  const g = h.held;
  if (!g) return;
  h.held = null; h.cand = null; h.pull = null;
  if (!trySnap(g, false)) sfx.drop();   // las piezas se unen al soltar
  scheduleSave();
}
function updateHands(dt) {
  for (const h of hands) {
    refreshPose(h);
    if (h.held) {
      const g = h.held;
      const E = h.offset.elements;
      // la palanca del mando acerca o aleja la pieza
      const ax = h.src && h.src.gamepad && h.src.gamepad.axes;
      const stick = ax ? (Math.abs(ax[3] || 0) > 0.15 ? ax[3] : (Math.abs(ax[1] || 0) > 0.15 ? ax[1] : 0)) : 0;
      if (stick) { h.pull = null; E[14] = Math.min(E[14] + stick * dt * 1.2, 0.3); }
      if (h.pull) {
        const k = 1 - Math.exp(-dt * 9);
        tp.set(0, 0, h.isHand ? 0 : -0.03).sub(h.pull);
        if (tp.length() < 0.004) h.pull = null;
        else { tp.multiplyScalar(k); h.pull.add(tp); E[12] += tp.x; E[13] += tp.y; E[14] += tp.z; }
      }
      // la pieza sigue a la mano con total libertad: posición y giro
      if (h.tracked) m1.multiplyMatrices(h.pose, h.offset).decompose(g.position, g.quaternion, tS);
      h.hover = g;
      h.ray.visible = false;
      const cand = findSnap(g, false);
      if (cand && !h.cand) pulse(h, 0.25, 15); // aviso: si la sueltas aquí, encaja
      h.cand = cand;
    } else {
      h.cand = null;
      const pk = state.playing && h.src && h.tracked ? pickVR(h) : null;
      h.hover = pk ? pk.group : null;
      h.ray.visible = true;
      h.ray.scale.z = pk && pk.dist > 0 ? pk.dist : (pk ? 0.001 : 1.5);
    }
  }
}

// mode: 'immersive-vr' (mundo virtual) o 'immersive-ar' (realidad mixta: las piezas flotan en tu habitación)
let xrMixed = false;
const SKY_COLOR = scene.background, SKY_FOG = scene.fog;
function setMixed(on) {
  xrMixed = on;
  for (const o of envOnly) o.visible = !on;
  scene.background = on ? null : SKY_COLOR;
  scene.fog = on ? null : SKY_FOG;
}
async function enterVR(mode = 'immersive-vr') {
  if (!navigator.xr) return;
  try {
    const session = await navigator.xr.requestSession(mode, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    setMixed(mode === 'immersive-ar');
    await renderer.xr.setSession(session);
  } catch (e) {
    setMixed(false);
    hint('No se pudo iniciar la sesión: ' + e.message);
  }
}
renderer.xr.addEventListener('sessionstart', () => {
  if (drag) endDrag();
  hoverGroup = null;
  panel.mesh.visible = true;
  $('done').classList.add('hidden');
  if (state.inGame) layout(true, true);
});
renderer.xr.addEventListener('sessionend', () => {
  for (const h of hands) { h.held = null; h.cand = null; h.pull = null; h.hover = null; }
  panel.mesh.visible = false;
  setMixed(false);
  if (state.inGame) { layout(false, true); scheduleSave(); }
  onResize();
});
if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
    if (ok) { $('btn-vr').classList.remove('hidden'); $('btn-vr-menu').classList.remove('hidden'); }
    else $('vr-note').textContent = 'Para jugar en VR abre esta página (por HTTPS) en el navegador de tu Meta Quest.';
  }).catch(() => {});
  navigator.xr.isSessionSupported('immersive-ar').then((ok) => {
    if (ok) { $('btn-ar').classList.remove('hidden'); $('btn-ar-menu').classList.remove('hidden'); }
  }).catch(() => {});
} else {
  $('vr-note').textContent = 'Para jugar en VR abre esta página (por HTTPS) en el navegador de tu Meta Quest.';
}

// ---------------------------------------------------------------- menú
const MODE_NOTES = {
  relax: 'Las piezas empiezan bien orientadas. En VR igual puedes girarlas libremente con la mano.',
  classic: 'Las piezas empiezan giradas al azar: hay que rotarlas para que encajen.',
};
let selCount = 40, selMode = 'relax';

// Rompecabezas disponibles: El Faro (generado por código) + los modelos de la carpeta "modelos/".
const puzzles = [...DIORAMAS];
let loadingModel = null;
function setBusy(text) {
  for (const id of ['btn-start', 'btn-continue', 'btn-vr-menu', 'btn-ar-menu']) $(id).disabled = !!text;
  $('sel-puzzle').disabled = !!text;
  if (text !== null) $('puzzle-note').textContent = text || '';
}
// Cambia el modelo activo. Devuelve true si quedó cargado.
async function selectPuzzle(id) {
  if (loadingModel) await loadingModel.catch(() => {});
  if (model.id === id) { $('sel-puzzle').value = id; return true; }
  const pz = puzzles.find((p) => p.id === id);
  if (!pz) { $('puzzle-note').textContent = 'Ese modelo ya no está en la carpeta "modelos".'; return false; }
  setBusy(`Cargando «${pz.name}»…`);
  loadingModel = (async () => {
    const next = pz.build ? buildBuiltin(pz) : Object.assign(await loadGLB(pz.url, pz.name), { id: pz.id });
    await new Promise((r) => setTimeout(r, 0));
    clearGame();
    state.inGame = false;
    if (model.dispose) model.dispose();
    model = next;
    rebuildShowcase();
    placeShowcase();
    updateHud(true);
  })();
  try {
    await loadingModel;
    setBusy('');
    $('puzzle-note').textContent = pz.build ? '' : `${Math.round(model.positions.length / 9000)} mil triángulos`;
    $('sel-puzzle').value = id;
    return true;
  } catch (e) {
    console.error(e);
    setBusy('');
    $('puzzle-note').textContent = `No se pudo cargar «${pz.name}»: ${e.message}`;
    $('sel-puzzle').value = model.id;
    return false;
  } finally {
    loadingModel = null;
    refreshContinue();
  }
}
function fillPuzzleList() {
  const sel = $('sel-puzzle');
  sel.innerHTML = '';
  for (const p of puzzles) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); }
  sel.value = model.id;
}
$('sel-puzzle').addEventListener('change', (e) => selectPuzzle(e.target.value));
fillPuzzleList();
fetch('modelos/index.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((list) => {
  for (const it of list) if (it && it.file) puzzles.push({ id: it.file, name: it.name || it.file, url: 'modelos/' + it.file.split('/').map(encodeURIComponent).join('/') });
  fillPuzzleList();
  refreshContinue();
}).catch(() => {});
function refreshContinue() {
  const canContinue = (state.inGame && !state.complete) || !!loadSave();
  $('btn-continue').classList.toggle('hidden', !canContinue);
}
function bindSeg(id, set) {
  const seg = $(id);
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of seg.children) x.classList.toggle('on', x === b);
    set(b.dataset.v);
  });
}
bindSeg('seg-count', (v) => { selCount = +v; });
bindSeg('seg-mode', (v) => { selMode = v; $('mode-note').textContent = MODE_NOTES[v]; });
$('mode-note').textContent = MODE_NOTES.relax;
$('opt-timer').checked = settings.showTimer;
$('opt-daynight').checked = settings.dayNight;
$('opt-daynight').addEventListener('change', (e) => { settings.dayNight = e.target.checked; saveSettings(); });
$('opt-timer').addEventListener('change', (e) => { settings.showTimer = e.target.checked; saveSettings(); updateHud(true); });

function showMenu() {
  state.playing = false;
  if (drag) endDrag();
  saveNow();
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('done').classList.add('hidden');
  $('hint').classList.add('hidden');
  refreshContinue();
}
function play() {
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  state.playing = true;
  sfx.init();
  if (state.complete) $('done').classList.remove('hidden');
}
async function newGame() {
  if (loadingModel) await loadingModel.catch(() => {});
  setBusy(`Cortando «${model.name}» en piezas…`);
  await new Promise((r) => setTimeout(r, 30)); // deja pintar el aviso antes del trabajo pesado
  try { buildGameSafe(); } finally { setBusy(''); }
}
function buildGameSafe() {
  buildGame({ count: selCount, mode: selMode, seed: (Math.random() * 2 ** 31) | 0 });
  saveNow();
  play();
  hint(selMode === 'relax'
    ? 'Arrastra una pieza junto a su vecina y suéltala para unirlas. Arrastra el fondo para girar la vista.'
    : 'Clic derecho (o Mayús) + arrastrar gira la pieza. Q / E la hacen rodar.', 8);
}
async function continueGame() {
  if (!(state.inGame && !state.complete)) {
    const s = loadSave();
    if (!s) return newGame();
    if (!(await selectPuzzle(s.puzzle || FARO.id))) return;
    setBusy(`Preparando «${model.name}»…`);
    await new Promise((r) => setTimeout(r, 30));
    try { buildGame({ count: s.count, mode: s.mode === 'classic' ? 'classic' : 'relax', seed: s.seed, saved: s }); } finally { setBusy(''); }
  }
  play();
}
$('btn-start').addEventListener('click', newGame);
$('btn-continue').addEventListener('click', continueGame);
$('btn-menu').addEventListener('click', showMenu);
$('btn-again').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nada */ } state.inGame = false; placeShowcase(); showMenu(); });
$('btn-admire').addEventListener('click', () => $('done').classList.add('hidden'));
$('btn-ref').addEventListener('click', () => { showRef = !showRef; placeShowcase(); });
$('btn-shuffle').addEventListener('click', () => { layout(false, false); scheduleSave(); });
$('btn-sound').addEventListener('click', () => {
  sfx.setMuted(!sfx.muted);
  $('btn-sound').textContent = 'Sonido: ' + (sfx.muted ? 'no' : 'sí');
});
$('btn-vr').addEventListener('click', () => enterVR('immersive-vr'));
$('btn-ar').addEventListener('click', () => enterVR('immersive-ar'));
function startImmersive(mode) {
  const p = enterVR(mode); // debe pedirse dentro del gesto del usuario
  if (state.inGame && !state.complete) continueGame(); else if (loadSave()) continueGame(); else newGame();
  return p;
}
$('btn-vr-menu').addEventListener('click', () => startImmersive('immersive-vr'));
$('btn-ar-menu').addEventListener('click', () => startImmersive('immersive-ar'));
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

function onResize() {
  if (renderer.xr.isPresenting) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ---------------------------------------------------------------- bucle
let lastTime = 0;
// día y noche: una vuelta completa cada DAY_SECONDS mientras se juega
const DAY_SECONDS = 180;
const skyNow = newSky();
let dayPhase = 0, lifeT = 0;
function updateSky(dt) {
  if (!settings.dayNight) dayPhase += (Math.round(dayPhase) - dayPhase) * Math.min(1, dt * 1.5); // vuelve al mediodía
  else if (state.playing) dayPhase = (dayPhase + dt / DAY_SECONDS) % 1;
  dayNight(dayPhase, skyNow);
  sun.color.copy(skyNow.sun); sun.intensity = skyNow.sunI;
  hemi.color.copy(skyNow.hemi); hemi.groundColor.copy(skyNow.ground); hemi.intensity = skyNow.hemiI;
  skyUniforms.uA.value.copy(skyNow.sky); skyUniforms.uB.value.copy(skyNow.top);
  SKY_COLOR.copy(skyNow.sky); SKY_FOG.color.copy(skyNow.sky);
}
function tick(time) {
  const dt = Math.min(Math.max((time - lastTime) / 1000, 0), 0.1);
  lastTime = time;
  const vr = renderer.xr.isPresenting;

  if (state.playing && !state.complete) { state.elapsed += dt; updateHud(false); }
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) $('hint').classList.add('hidden'); }
  if (saveTimer > 0) { saveTimer -= dt; if (saveTimer <= 0) saveNow(); }

  updateSky(dt);
  lifeT += dt;
  if (lifeShow && showcase.visible) lifeShow.update(dt, lifeT, skyNow.night);
  if (lifeGame) lifeGame.update(dt, lifeT, skyNow.night);
  if (vr) updateHands(dt); else updateCamera();
  if (drag && drag.group) drag.cand = findSnap(drag.group, true);

  // piezas deslizándose a su lugar
  for (const mesh of anims) {
    mesh.userData.t += dt;
    const k = Math.exp(-dt * 22);
    mesh.position.multiplyScalar(k);
    mesh.quaternion.slerp(IDENT_Q, 1 - k);
    if (mesh.userData.t > 0.3) { mesh.position.set(0, 0, 0); mesh.quaternion.identity(); anims.delete(mesh); }
  }

  // resaltado
  for (const p of state.pieces) {
    if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 2.2);
    const g = p.group;
    const lit = !state.complete && (g === hoverGroup || (drag && drag.group === g) || hands[0].hover === g || hands[1].hover === g);
    // "a punto de encajar": brillan la pieza sostenida y su vecina
    const ready = !state.complete && (hands.some((h) => h.cand && (h.cand === g || h.held === g)) || (drag && drag.cand && (drag.cand === g || drag.group === g)));
    // La pieza agarrada conserva su color. Solo quedan avisos muy tenues: al apuntar sin agarrar,
    // cuando está a punto de encajar y un pulso breve en el momento de unirse.
    const held = (drag && drag.group === g) || hands[0].held === g || hands[1].held === g;
    const e = (ready ? 0.035 : lit && !held ? 0.015 : 0) + p.flash * 0.1;
    for (const m of p.mats) m.emissive.setScalar(e);
  }

  // final: el diorama armado vuelve al centro y gira
  const f = state.finale;
  if (f) {
    f.t += dt;
    const k = Math.min(1, f.t / 1.6), s = k * k * (3 - 2 * k);
    if (f.t > 1.6) f.angle += dt * 0.35;
    q1.setFromAxisAngle(t2.set(0, 1, 0), f.angle);
    f.g.quaternion.copy(f.fromQ).slerp(q1, s);
    setPivot(f.g, t1.copy(f.fromP).lerp(C, s));
  }
  updateConfetti(dt);

  if (showcase.visible) showcase.rotation.y += dt * (state.inGame ? 0.25 : 0.2);
  renderer.render(scene, camera);
}

placeShowcase();
showMenu();
renderer.setAnimationLoop(tick);

// Utilidades de depuración / pruebas automáticas: abrir con ?debug
if (new URLSearchParams(location.search).has('debug')) {
  window.__game = {
    state, layout, trySnap, orbit, setPhase(v) { dayPhase = v; }, get life() { return lifeGame; }, setMixed, scene, selectPuzzle, puzzles, get model() { return model; }, findSnap, camera, C, hands, grabVR, releaseVR, updateHands, THREE,
    pieceAt(x, y) { setRay({ clientX: x, clientY: y }); const h = pickPiece(); return h ? h.object.userData.piece.id : -1; },
    // une un par de grupos vecinos colocándolos casi en su sitio y dejando actuar al encastre
    solveStep() {
      for (const a of state.pieces) for (const j of a.neighbors.keys()) {
        const B = state.pieces[j].group, A = a.group;
        if (A === B) continue;
        A.quaternion.copy(B.quaternion);
        A.position.copy(B.position).add(new THREE.Vector3(0.01, 0.005, 0));
        return trySnap(A, false);
      }
      return false;
    },
  };
}
