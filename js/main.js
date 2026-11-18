// Tiny Worlds VR (Piece by Piece) — rompecabezas tridimensional para navegador y WebXR (Meta Quest).
import * as THREE from './vendor/three.module.js';
import { DIORAMAS } from './dioramas/index.js';
import { mulberry32 } from './dioramas/builder.js';
import { slice } from './slicer.js';
import { loadGLB, normalizeModel } from './loader.js';
import { Sfx } from './audio.js';
import { themeFor } from './music.js';
import { buildLife, dayNight, newSky } from './life.js';
import { XRHandMeshModel } from './vendor/addons/webxr/XRHandMeshModel.js';
import { buildEnvironment } from './environment.js';
import { createVRBar } from './vrbar.js';
import { svgIcon } from './icons.js';

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
scene.fog = new THREE.Fog(0xcfe6ec, 16, 150);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.02, 700);

const hemi = new THREE.HemisphereLight(0xffffff, 0x8fa3b5, 1.7);
scene.add(hemi);
const skyUniforms = { uA: { value: new THREE.Color(0xcfe6ec) }, uB: { value: new THREE.Color(0x5c9ed4) } };
const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
sun.position.set(1.5, 3, 2);
scene.add(sun);

let standMesh = null;
const envOnly = []; // lo que se oculta en realidad mixta para ver la habitación real
const env = buildEnvironment(C); // pradera, plataforma, árboles, montañas, nubes, astros
{ // cielo en degradé
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, fog: false, depthWrite: false, uniforms: skyUniforms,
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uA; uniform vec3 uB; varying float h; void main(){ gl_FragColor = vec4(mix(uA,uB,smoothstep(-0.02,0.7,h)),1.0); }',
    }));
  sky.renderOrder = -10;
  scene.add(sky, env.group);
  envOnly.push(sky, env.group);
  // pedestal torneado para la miniatura de referencia (también se ve en realidad mixta)
  const profile = [[0.125, 0], [0.13, 0.014], [0.095, 0.03], [0.045, 0.058], [0.028, 0.11], [0.022, 0.38], [0.034, 0.41], [0.034, 0.43],
    [0.021, 0.46], [0.019, 0.69], [0.03, 0.735], [0.1, 0.758], [0.118, 0.764], [0.118, PEDESTAL_Y], [0, PEDESTAL_Y]];
  const stand = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 28), new THREE.MeshLambertMaterial({ color: 0xb08a5e }));
  stand.position.set(C.x, 0, C.z);
  scene.add(stand);
  standMesh = stand;
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
function buildMesh(r, mdl = model) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(r.positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(r.colors, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3));
  if (r.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(r.uvs, 2));
  const mats = r.groups.map((g, i) => { geo.addGroup(g.start, g.count, i); return makeMaterial(mdl.materials[g.mat]); });
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

// Miniaturas para las tarjetas del menú: se dibujan una vez y se guardan en el navegador.
const APP_VERSION = $('version').textContent.trim();
const THUMB_W = 360, THUMB_H = 270, THUMB_PREFIX = 'diorama3d-thumb:';
const thumbKey = (pz) => `${THUMB_PREFIX}${APP_VERSION}:${pz.id}:${pz.mb || ''}`;
const thumbTools = (() => {
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8fa3b5, 1.7));
  const l = new THREE.DirectionalLight(0xfff0d8, 2.3); l.position.set(1.5, 3, 2); sc.add(l);
  const lut = new Uint8Array(256); // el destino de dibujo es lineal: se pasa a sRGB a mano
  for (let i = 0; i < 256; i++) { const c = i / 255; lut[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); }
  return { sc, cam: new THREE.PerspectiveCamera(28, THUMB_W / THUMB_H, 0.05, 30), rt: null, lut };
})();
function getThumb(pz) { try { return localStorage.getItem(thumbKey(pz)); } catch (e) { return null; } }
// Dibuja una malla centrada en el origen y devuelve la imagen (o null si ahora no se puede).
function renderThumb(mesh, size) {
  if (renderer.xr.isPresenting) return null;
  const T = thumbTools, W = THUMB_W * 2, H = THUMB_H * 2;
  if (!T.rt) T.rt = new THREE.WebGLRenderTarget(W, H);
  const keep = { parent: mesh.parent, pos: mesh.position.clone(), rot: mesh.rotation.clone(), scale: mesh.scale.clone(), vis: mesh.visible };
  try {
    T.sc.add(mesh);
    mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.setScalar(1); mesh.visible = true;
    const r = 0.5 * Math.hypot(size[0], size[1], size[2]);
    const d = r / Math.sin(THREE.MathUtils.degToRad(T.cam.fov / 2)) * 0.9, az = 0.6, el = 0.36;
    T.cam.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    T.cam.lookAt(0, 0, 0);
    const prevAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(T.rt);
    renderer.clear();
    renderer.render(T.sc, T.cam);
    const buf = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(T.rt, 0, 0, W, H, buf);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(prevAlpha);
    const big = document.createElement('canvas'); big.width = W; big.height = H;
    const img = big.getContext('2d').createImageData(W, H);
    for (let y = 0; y < H; y++) { // la imagen leída viene cabeza abajo
      const src = (H - 1 - y) * W * 4, dst = y * W * 4;
      for (let x = 0; x < W * 4; x += 4) {
        img.data[dst + x] = T.lut[buf[src + x]]; img.data[dst + x + 1] = T.lut[buf[src + x + 1]];
        img.data[dst + x + 2] = T.lut[buf[src + x + 2]]; img.data[dst + x + 3] = buf[src + x + 3];
      }
    }
    big.getContext('2d').putImageData(img, 0, 0);
    const small = document.createElement('canvas'); small.width = THUMB_W; small.height = THUMB_H;
    small.getContext('2d').drawImage(big, 0, 0, THUMB_W, THUMB_H);
    return small.toDataURL('image/webp', 0.86);
  } catch (e) {
    console.warn('No se pudo crear la miniatura', e);
    renderer.setRenderTarget(null);
    return null;
  } finally {
    if (keep.parent) keep.parent.add(mesh); else T.sc.remove(mesh);
    mesh.position.copy(keep.pos); mesh.rotation.copy(keep.rot); mesh.scale.copy(keep.scale); mesh.visible = keep.vis;
  }
}
function saveThumb(pz, url) {
  if (!url) return;
  try { localStorage.setItem(thumbKey(pz), url); } catch (e) { /* sin espacio: se regenera la próxima vez */ }
  const img = document.querySelector(`#puzzle-grid [data-id="${CSS.escape(pz.id)}"] img`);
  if (img) { img.src = url; img.classList.remove('empty'); }
}
let showRef = true;
function placeShowcase() {
  if (state.inGame) {
    showcase.scale.setScalar(0.3);
    showcase.position.set(C.x, PEDESTAL_Y + model.size[1] / 2 * 0.3 + 0.004, C.z);
    showcase.visible = showRef && !state.complete;
  } else {
    showcase.scale.setScalar(1);
    showcase.position.copy(C);
    showcase.visible = true;
  }
}

// ---------------------------------------------------------------- estado
const state = {
  pieces: [], groups: new Set(), total: 0,
  count: 50, mode: 'relax', seed: 1,
  elapsed: 0, playing: false, inGame: false, complete: false, finale: null,
};
const sfx = new Sfx();
const SETTINGS_KEY = 'diorama3d-settings-v1';
const PHASES = [0, 0.25, 0.5, 0.75], PHASE_NAMES = ['mediodía', 'atardecer', 'noche', 'amanecer'];
let fixedPhase = null; // modo explorar: hora elegida a mano
const settings = { showTimer: false, dayNight: true, showFps: false, music: true, where: 'vr', whereChosen: false };
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
  return out.copy(g.userData.centroid).multiplyScalar(g.scale.x).applyQuaternion(g.quaternion).add(g.position);
}
function setPivot(g, pivot) { // coloca el grupo para que su centroide quede en "pivot"
  g.position.copy(g.userData.centroid).multiplyScalar(g.scale.x).applyQuaternion(g.quaternion).multiplyScalar(-1).add(pivot);
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
  state.finale = null; state.complete = false; state.inspect = false; zoomAnim = null; twoHand = null; fixedPhase = null;
  if (standMesh) standMesh.visible = true;
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
    Object.assign(orbit, ORBIT_PLAY);
  }
  state.inGame = true;
  state.complete = state.groups.size === 1;
  placeShowcase();
  updateHud(true);
  sfx.setProgress(progress());
}

// ---------------------------------------------------------------- modo explorar
// Muestra el modelo entero, ya armado, para revisarlo de cerca: se agranda, se gira, se le cambia
// la hora del día y se pasa al anterior o al siguiente sin salir del visor. No toca la partida guardada.
function buildInspect() {
  clearGame();
  state.inspect = true;
  Object.assign(state, { count: 1, mode: 'relax', seed: 1, elapsed: 0 });
  const r = slice(model, 1, 1)[0];
  const mesh = buildMesh(r);
  const piece = { id: 0, mesh, mats: mesh.userData.mats, seedPos: r.seedPos, centroid: new THREE.Vector3(...r.centroid), radius: r.radius, group: null, flash: 0, neighbors: new Map() };
  mesh.userData.piece = piece;
  state.pieces = [piece];
  state.total = 1;
  const host = { object: mesh, active: () => true }; // todos los efectos encendidos
  lifeGame = buildLife(model.features || [], () => host);
  const g = makeGroup([piece]);
  state.inGame = true;
  state.complete = true;
  state.finale = { t: 2, g, fromQ: new THREE.Quaternion(), fromPos: new THREE.Vector3(), fromScale: 1, scale: 1, angle: 0.5, spin: true };
  Object.assign(orbit, ORBIT_MENU);
  placeShowcase();
  updateHud(true);
  sfx.setProgress(1);
  syncHud();
}
async function inspectModel() {
  if (loadingModel) await loadingModel.catch(() => {});
  saveNow(); // la partida que hubiera queda guardada tal cual
  setBusy(`Preparando «${model.name}»…`);
  await new Promise((r) => setTimeout(r, 30));
  try { buildInspect(); } finally { setBusy(''); }
  play();
}
let inspectBusy = false;
async function inspectStep(d) {
  if (inspectBusy) return;
  inspectBusy = true;
  try {
    const i = puzzles.findIndex((p) => p.id === model.id);
    const next = puzzles[(i + d + puzzles.length) % puzzles.length];
    const keepPhase = fixedPhase;
    if (await selectPuzzle(next.id)) { buildInspect(); fixedPhase = keepPhase; play(); }
  } finally { inspectBusy = false; }
}
function toggleSpin() {
  const f = state.finale;
  if (f) f.spin = f.spin === false;
  else resetModelSize(); // si lo habían agarrado, vuelve a la exhibición girando
  syncHud();
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
  state.finale = { t: 0, g, fromQ: g.quaternion.clone(), fromPos: g.position.clone(), fromScale: g.scale.x, scale: 1, angle: 0 };
  placeShowcase();
  syncHud();
  sfx.complete();
  burstConfetti();
  $('done-text').textContent = settings.showTimer ? `${state.total} piezas en ${fmtTime(state.elapsed)}` : `${state.total} piezas`;
  if (!renderer.xr.isPresenting) $('done').classList.remove('hidden');
  updateHud(true);
}

// ---------------------------------------------------------------- agrandar el modelo terminado
// Con el rompecabezas completo, el modelo se puede agrandar o achicar: con los botones (barra del
// visor o de la página), con las dos manos (agarrarlo con ambas y separarlas, como estirando) o con
// la palanca horizontal del mando mientras se lo sostiene.
const SCALE_MIN = 0.35, SCALE_MAX = 16;
let zoomAnim = null;   // { g, s0, s1, t, anchor }
let twoHand = null;    // { g, a, b, d0, s0, mid0, yaw0, G0 }
const completedGroup = () => (state.complete && state.groups.size === 1 ? [...state.groups][0] : null);
const bottomLocal = (out) => out.set(0, -model.size[1] / 2, 0); // el modelo está centrado en el origen
// Exhibición: centrado sobre el pedestal; al crecer baja hasta el suelo y se aleja para no tapar al jugador.
function displayPos(s, q, out) {
  const h = model.size[1], r = Math.hypot(model.size[0], model.size[2]) / 2; // radio hasta las esquinas: el modelo gira
  const rest = C.y - h / 2;
  const bottom = s <= 1 ? C.y - h * s / 2 : rest + (0.005 - rest) * THREE.MathUtils.smoothstep(s, 1.3, 3.2);
  tS.set(C.x, bottom, C.z - Math.max(0, s - 1) * r - 0.45 * THREE.MathUtils.smoothstep(s, 1, 2.5));
  return out.copy(bottomLocal(t3)).multiplyScalar(s).applyQuaternion(q).multiplyScalar(-1).add(tS);
}
function scaleAbout(g, anchor, s) {
  const f = s / g.scale.x;
  g.position.sub(anchor).multiplyScalar(f).add(anchor);
  g.scale.setScalar(s);
}
function zoomModel(factor) {
  const g = completedGroup();
  if (!g) return;
  if (hands.some((h) => h.held === g)) return; // mientras se sostiene, se escala con las manos
  const f = state.finale && state.finale.g === g ? state.finale : null;
  const cur = f ? f.scale : g.scale.x;
  const target = factor === 0 ? 1 : THREE.MathUtils.clamp(cur * factor, SCALE_MIN, SCALE_MAX);
  g.updateMatrixWorld(true);
  zoomAnim = { g, s0: cur, s1: target, t: 0, anchor: f ? null : bottomLocal(V()).applyMatrix4(g.matrixWorld) };
  if (!renderer.xr.isPresenting) orbit.dist = THREE.MathUtils.clamp(orbit.dist * Math.pow(target / cur, 0.8), 0.7, maxOrbit(target));
  sfx.init(); sfx.pick();
}
function resetModelSize() { // vuelve a la exhibición original: centrado, tamaño 1 y girando
  const g = completedGroup();
  if (!g) return;
  for (const h of hands) if (h.held === g) { h.held = null; h.pull = null; }
  twoHand = null; zoomAnim = null;
  q2.copy(g.quaternion); t2.set(0, 0, 1).applyQuaternion(q2);
  state.finale = { t: 0, g, fromQ: g.quaternion.clone(), fromPos: g.position.clone(), fromScale: g.scale.x, scale: 1, angle: Math.atan2(t2.x, t2.z) };
  if (!renderer.xr.isPresenting) orbit.dist = Math.min(orbit.dist, maxOrbit(1));
}
function updateZoom(dt) {
  const z = zoomAnim;
  if (!z) return;
  z.t = Math.min(1, z.t + dt / 0.45);
  const k = z.t * z.t * (3 - 2 * z.t), s = z.s0 + (z.s1 - z.s0) * k;
  if (state.finale && state.finale.g === z.g) state.finale.scale = s;
  else if (z.anchor) scaleAbout(z.g, z.anchor, s);
  if (z.t >= 1) zoomAnim = null;
}
const maxOrbit = (s) => 4 * Math.max(1, s * 0.75);
// Dos manos sobre el modelo: la distancia entre ellas da la escala y el giro horizontal, el giro del modelo.
function startTwoHand(a, b, g) {
  state.finale = null; zoomAnim = null;
  a.pull = null; b.pull = null;
  tp.setFromMatrixPosition(a.pose); tp2.setFromMatrixPosition(b.pose);
  g.updateMatrix();
  twoHand = { g, a, b, d0: Math.max(0.02, tp.distanceTo(tp2)), s0: g.scale.x, mid0: tp.clone().add(tp2).multiplyScalar(0.5),
    yaw0: Math.atan2(tp2.x - tp.x, tp2.z - tp.z), G0: g.matrix.clone() };
  pulse(a, 0.3, 25); pulse(b, 0.3, 25);
}
const mTwo = new THREE.Matrix4(), mT = new THREE.Matrix4(), qY = new THREE.Quaternion(), vS = V(), UPY = new THREE.Vector3(0, 1, 0);
function updateTwoHand() {
  const T = twoHand;
  tp.setFromMatrixPosition(T.a.pose); tp2.setFromMatrixPosition(T.b.pose);
  const s = THREE.MathUtils.clamp(T.s0 * tp.distanceTo(tp2) / T.d0, SCALE_MIN, SCALE_MAX), f = s / T.s0;
  const yaw = Math.atan2(tp2.x - tp.x, tp2.z - tp.z) - T.yaw0;
  t3.copy(tp).add(tp2).multiplyScalar(0.5);
  mTwo.compose(t3, qY.setFromAxisAngle(UPY, yaw), vS.setScalar(f));
  mT.makeTranslation(-T.mid0.x, -T.mid0.y, -T.mid0.z);
  mTwo.multiply(mT).multiply(T.G0).decompose(T.g.position, T.g.quaternion, T.g.scale);
  T.g.scale.setScalar(THREE.MathUtils.clamp(T.g.scale.x, SCALE_MIN, SCALE_MAX));
}
function endTwoHand(released) { // la otra mano sigue sosteniendo el modelo
  const T = twoHand, other = released === T.a ? T.b : T.a;
  twoHand = null;
  T.g.updateMatrix();
  m2.copy(other.pose).invert();
  other.offset.multiplyMatrices(m2, T.g.matrix);
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
  if (!state.inGame || state.inspect) return;
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
let fpsNow = 0, fpsFrames = 0, fpsTime = 0; // cuadros por segundo, promediados cada segundo
function updateHud(force) {
  const sec = Math.floor(state.elapsed);
  if (!force && sec === lastHudSec) return;
  lastHudSec = sec;
  const done = state.total - state.groups.size + (state.total ? 1 : 0);
  const prog = state.inspect ? `${model.name} · ${Math.round(model.positions.length / 9000)} mil triángulos` : `${state.complete ? state.total : done} / ${state.total} piezas`;
  $('progress').textContent = prog;
  $('timer').textContent = fmtTime(state.elapsed);
  $('timer').classList.toggle('hidden', !settings.showTimer);
  $('fps').classList.toggle('hidden', !settings.showFps);
  $('fps').textContent = `${fpsNow} fps`;
  const { ctx, cv, tex } = panel;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = 'rgba(250,247,240,0.95)';
  ctx.beginPath(); ctx.roundRect(4, 4, cv.width - 8, cv.height - 8, 40); ctx.fill();
  ctx.fillStyle = '#1d2733'; ctx.textAlign = 'center';
  ctx.font = '600 58px system-ui, sans-serif';
  ctx.fillText(state.inspect ? 'Modo explorar' : state.complete ? '¡Completado!' : prog, cv.width / 2, 84, cv.width - 40);
  ctx.font = '44px system-ui, sans-serif'; ctx.globalAlpha = 0.7;
  const extra = [settings.showTimer ? fmtTime(state.elapsed) : '', settings.showFps ? `${fpsNow} fps` : ''].filter(Boolean).join(' · ');
  ctx.fillText(extra ? `${model.name} · ${extra}` : model.name, cv.width / 2, 150, cv.width - 40);
  ctx.globalAlpha = 1;
  tex.needsUpdate = true;
}
let hintTimer = 0;
function hint(text, secs = 6) { $('hint').textContent = text; $('hint').classList.remove('hidden'); hintTimer = secs; }

// ---------------------------------------------------------------- cámara orbital
const ORBIT_MENU = { az: 0.45, pol: 1.3, dist: 1.75 }, ORBIT_PLAY = { az: 0.35, pol: 1.02, dist: 1.85 };
const orbit = { ...ORBIT_MENU };
const orbitTarget = C.clone();
function updateCamera(dt = 0.016) {
  // con el modelo terminado, la cámara mira a su centro (que se mueve al agrandarlo)
  const g = completedGroup();
  if (g) { worldCentroid(g, t3); t3.y = Math.max(t3.y, 0.4); } else t3.copy(C);
  orbitTarget.lerp(t3, Math.min(1, dt * 4));
  const sp = Math.sin(orbit.pol);
  camera.position.set(
    orbitTarget.x + orbit.dist * sp * Math.sin(orbit.az),
    orbitTarget.y + orbit.dist * Math.cos(orbit.pol),
    orbitTarget.z + orbit.dist * sp * Math.cos(orbit.az));
  camera.lookAt(orbitTarget);
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
    if (pinch > 0) orbit.dist = THREE.MathUtils.clamp(orbit.dist * (pinch / d), 0.7, maxOrbit(completedGroup() ? completedGroup().scale.x : 1));
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
    orbit.dist = THREE.MathUtils.clamp(orbit.dist * (1 + d * 0.1), 0.7, maxOrbit(completedGroup() ? completedGroup().scale.x : 1));
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
    held: null, offset: new THREE.Matrix4(), pull: null, hover: null, cand: null, ui: null,
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
    const sc = p.group.scale.x;
    tp2.copy(p.centroid).multiplyScalar(sc).applyQuaternion(p.group.quaternion).add(p.group.position);
    const d = tp2.distanceTo(tp) - p.radius * 0.6 * sc;
    if (d < bd) { bd = d; best = p; }
  }
  if (best) return { group: best.group, dist: 0, point: null };
  setHandRay(h);
  const hit = pickPiece();
  return hit ? { group: hit.object.userData.piece.group, dist: hit.distance, point: hit.point } : null;
}
// Deja en "raycaster" el rayo con el que apunta la mano o el mando.
function setHandRay(h) {
  h.c.getWorldPosition(tp);
  tp2.set(0, 0, -1).applyQuaternion(h.c.getWorldQuaternion(q1));
  raycaster.set(tp, tp2);
  raycaster.far = state.complete ? 40 : 6;
}
function grabVR(h) {
  if (h.ui && !h.held) { pressBar(h); return; }
  if (!state.playing || h.held) return;
  refreshPose(h);
  const pk = pickVR(h);
  if (!pk) return;
  const other = hands.find((o) => o !== h && o.held === pk.group);
  if (other && state.complete) { // segunda mano sobre el modelo terminado: escalar y girar con las dos
    h.held = pk.group;
    startTwoHand(other, h, pk.group);
    sfx.pick();
    return;
  }
  if (other) { other.held = null; other.cand = null; other.pull = null; }
  if (state.finale && state.finale.g === pk.group) state.finale = null;
  if (zoomAnim && zoomAnim.g === pk.group) zoomAnim = null;
  h.held = pk.group;
  pk.group.updateMatrix();
  m2.copy(h.pose).invert();
  h.offset.multiplyMatrices(m2, pk.group.matrix);
  // tomada a distancia: la pieza viaja hasta la mano (punto apuntado → punto de agarre)
  h.pull = pk.point && !state.complete ? pk.point.clone().applyMatrix4(m2) : null; // el modelo terminado se maneja a distancia
  sfx.pick();
  pulse(h, 0.3, 25);
}
function releaseVR(h) {
  const g = h.held;
  if (!g) return;
  if (twoHand && (twoHand.a === h || twoHand.b === h)) endTwoHand(h);
  h.held = null; h.cand = null; h.pull = null;
  if (!trySnap(g, false)) sfx.drop();   // las piezas se unen al soltar
  scheduleSave();
}
function updateHands(dt) {
  for (const h of hands) refreshPose(h);
  if (twoHand) {
    if (twoHand.a.held !== twoHand.g || twoHand.b.held !== twoHand.g) twoHand = null;
    else updateTwoHand();
  }
  for (const h of hands) {
    if (twoHand && (twoHand.a === h || twoHand.b === h)) { h.hover = h.held; h.ui = null; h.ray.visible = false; h.cand = null; continue; }
    if (h.held) {
      const g = h.held;
      const E = h.offset.elements;
      // la palanca del mando acerca o aleja la pieza
      const ax = h.src && h.src.gamepad && h.src.gamepad.axes;
      const stick = ax ? (Math.abs(ax[3] || 0) > 0.15 ? ax[3] : (Math.abs(ax[1] || 0) > 0.15 ? ax[1] : 0)) : 0;
      if (stick) { h.pull = null; E[14] = Math.min(E[14] + stick * dt * 1.2 * Math.max(1, g.scale.x * 0.6), 0.3); }
      // con el modelo terminado, la palanca hacia los lados lo agranda o achica
      const sx = ax && state.complete ? (Math.abs(ax[2] || 0) > 0.2 ? ax[2] : (Math.abs(ax[0] || 0) > 0.2 && !ax[2] ? ax[0] : 0)) : 0;
      if (sx) {
        const s = THREE.MathUtils.clamp(g.scale.x * Math.exp(sx * dt * 1.4), SCALE_MIN, SCALE_MAX);
        tp.setFromMatrixPosition(h.pose);
        g.updateMatrix(); scaleAbout(g, tp, s); g.updateMatrix();
        m2.copy(h.pose).invert(); h.offset.multiplyMatrices(m2, g.matrix);
      }
      if (h.pull) {
        const k = 1 - Math.exp(-dt * 9);
        tp.set(0, 0, h.isHand ? 0 : -0.03).sub(h.pull);
        if (tp.length() < 0.004) h.pull = null;
        else { tp.multiplyScalar(k); h.pull.add(tp); E[12] += tp.x; E[13] += tp.y; E[14] += tp.z; }
      }
      // la pieza sigue a la mano con total libertad: posición y giro
      if (h.tracked) m1.multiplyMatrices(h.pose, h.offset).decompose(g.position, g.quaternion, tS);
      h.hover = g; h.ui = null;
      h.ray.visible = false;
      const cand = findSnap(g, false);
      if (cand && !h.cand) pulse(h, 0.25, 15); // aviso: si la sueltas aquí, encaja
      h.cand = cand;
    } else {
      h.cand = null;
      let pk = null, ui = null;
      if (h.src && h.tracked) {
        pk = state.playing ? pickVR(h) : null;
        // la barra de iconos: si el rayo la toca, gana (está por encima y detrás de todo, así que
        // apuntarla es siempre a propósito), salvo que haya una pieza al alcance de la mano
        if (!pk || pk.dist > 0) {
          setHandRay(h);
          ui = bar.pick(raycaster);
        }
      }
      h.ui = ui ? ui.btn : null;
      if (h.ui) pk = null;
      h.hover = pk ? pk.group : null;
      h.ray.visible = true;
      h.ray.scale.z = ui ? ui.dist : pk && pk.dist > 0 ? pk.dist : (pk ? 0.001 : 1.5);
    }
  }
}

// Una sola sesión sirve para las dos cosas: si el visor ofrece realidad mixta se abre una sesión
// "immersive-ar" y el mundo virtual se muestra u oculta al instante (xrMixed), sin salir del visor.
let xrMixed = false, xrOK = false, arOK = false, xrPassthrough = false;
const SKY_COLOR = scene.background, SKY_FOG = scene.fog;
function setMixed(on) {
  xrMixed = on;
  for (const o of envOnly) o.visible = !on;
  scene.background = on ? null : SKY_COLOR;
  scene.fog = on ? null : SKY_FOG;
}
async function enterXR(mixed) {
  if (!navigator.xr || renderer.xr.isPresenting) return;
  const mode = arOK ? 'immersive-ar' : 'immersive-vr';
  try {
    const session = await navigator.xr.requestSession(mode, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    xrPassthrough = mode === 'immersive-ar';
    setMixed(mixed && xrPassthrough);
    await renderer.xr.setSession(session);
  } catch (e) {
    xrPassthrough = false;
    setMixed(false);
    hint('No se pudo iniciar la sesión: ' + e.message);
  }
}
function exitXR() { const s = renderer.xr.getSession(); if (s) s.end().catch(() => {}); }

// --- barra de iconos dentro del visor ---
function toggleRef() { showRef = !showRef; placeShowcase(); syncHud(); }
function toggleSound() { sfx.init(); sfx.setMuted(!sfx.muted); syncHud(); }
let restartArmed = 0; // "Nueva partida" pide confirmar con una segunda pulsación
const bar = createVRBar([
  { id: 'exit', icon: () => 'exit', label: () => 'Salir del visor', press: exitXR },
  { id: 'mixed', icon: () => 'room', label: () => (xrMixed ? 'Volver al mundo virtual' : 'Realidad mixta: ver mi habitación'),
    active: () => xrMixed, visible: () => xrPassthrough, press: () => setMixed(!xrMixed) },
  { id: 'prev', icon: () => 'prev', label: () => 'Modelo anterior', visible: () => state.inspect, press: () => inspectStep(-1) },
  { id: 'next', icon: () => 'next', label: () => 'Modelo siguiente', visible: () => state.inspect, press: () => inspectStep(1) },
  { id: 'ref', icon: () => 'picture', label: () => (showRef ? 'Ocultar la miniatura de referencia' : 'Mostrar la miniatura de referencia'),
    dim: () => !showRef, visible: () => !state.complete, press: toggleRef },
  { id: 'shuffle', icon: () => 'shuffle', label: () => 'Reordenar las piezas sueltas', visible: () => !state.complete,
    press: () => { if (state.inGame && !state.complete) { layout(true, false); scheduleSave(); } } },
  { id: 'shrink', icon: () => 'zoomout', label: () => 'Achicar el modelo', visible: () => state.complete, press: () => zoomModel(1 / 1.6) },
  { id: 'size1', icon: () => 'size1', label: () => 'Tamaño y lugar originales', visible: () => state.complete, press: resetModelSize },
  { id: 'grow', icon: () => 'zoomin', label: () => 'Agrandar el modelo (o agárralo con las dos manos y sepáralas)', visible: () => state.complete, press: () => zoomModel(1.6) },
  { id: 'spin', icon: () => 'spin', label: () => (state.finale && state.finale.spin !== false ? 'Detener el giro' : 'Hacerlo girar'),
    visible: () => state.inspect, dim: () => !(state.finale && state.finale.spin !== false), press: toggleSpin },
  { id: 'time', icon: () => 'clock', label: () => `Hora: ${PHASE_NAMES[phaseIndex()]} (pulsa para cambiar)`, visible: () => state.inspect, press: nextPhase },
  { id: 'sound', icon: () => (sfx.muted ? 'mute' : 'sound'), label: () => (sfx.muted ? 'Activar el sonido' : 'Silenciar'), dim: () => sfx.muted, press: toggleSound },
  { id: 'day', visible: () => !state.inspect, icon: () => (settings.dayNight ? 'sun' : 'moon'), label: () => (settings.dayNight ? 'Detener el ciclo de día y noche' : 'Activar el ciclo de día y noche'),
    dim: () => !settings.dayNight, press: () => { settings.dayNight = !settings.dayNight; saveSettings(); $('opt-daynight').checked = settings.dayNight; } },
  { id: 'new', visible: () => !state.inspect, icon: () => 'restart', label: () => (performance.now() < restartArmed ? 'Pulsa otra vez para confirmar' : 'Nueva partida'),
    active: () => performance.now() < restartArmed,
    press: () => { if (performance.now() < restartArmed) { restartArmed = 0; newGame(); } else restartArmed = performance.now() + 5000; } },
]);
scene.add(bar.group);
function pressBar(h) {
  const b = h.ui;
  sfx.init(); sfx.pick();
  pulse(h, 0.5, 30);
  b.def.press();
  bar.refresh();
}
let barTimer = 0, barTick = 0;
function updateBar(dt) {
  if (barTimer > 0) { // se coloca cuando ya se conoce la altura de la cabeza
    barTimer -= dt;
    if (barTimer <= 0) {
      renderer.xr.getCamera().getWorldPosition(t1);
      if (t1.y < 0.3) barTimer = 0.3; else bar.place(t1, C);
    }
  }
  if (++barTick % 8 === 0) bar.refresh();
  bar.update(dt, hands.map((h) => h.ui).filter(Boolean));
}

renderer.xr.addEventListener('sessionstart', () => {
  if (drag) endDrag();
  hoverGroup = null;
  camera.clearViewOffset();
  panel.mesh.visible = true;
  bar.group.visible = true; bar.refresh(); barTimer = 0.5;
  $('done').classList.add('hidden');
  if (state.inGame) layout(true, true);
});
renderer.xr.addEventListener('sessionend', () => {
  for (const h of hands) { h.held = null; h.cand = null; h.pull = null; h.hover = null; h.ui = null; }
  panel.mesh.visible = false;
  bar.group.visible = false;
  xrPassthrough = false;
  setMixed(false);
  if (state.inGame) { layout(false, true); scheduleSave(); }
  onResize();
  if (state.complete && state.playing && !state.inspect) $('done').classList.remove('hidden');
});
function refreshXRSupport() {
  $('btn-vr').classList.toggle('hidden', !xrOK);
  $('btn-ar').classList.toggle('hidden', !arOK);
  $('where-box').classList.toggle('hidden', !xrOK);
  $('seg-where').querySelector('[data-v="mixed"]').classList.toggle('hidden', !arOK);
  if (!xrOK) settings.where = 'screen'; else if (settings.where === 'mixed' && !arOK) settings.where = 'vr';
  for (const x of $('seg-where').children) x.classList.toggle('on', x.dataset.v === settings.where);
  $('vr-note').textContent = xrOK ? '' : 'Para jugar con el visor, abre esta página (por HTTPS) en el navegador de tu Meta Quest.';
}
if (navigator.xr && navigator.xr.isSessionSupported) {
  Promise.all([
    navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
    navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
  ]).then(([vr, ar]) => { xrOK = vr || ar; arOK = ar; if (settings.where === 'screen' && xrOK && !settings.whereChosen) settings.where = 'vr'; refreshXRSupport(); });
}

// ---------------------------------------------------------------- menú
const MODE_NOTES = {
  relax: 'Las piezas empiezan bien orientadas. En VR igual puedes girarlas libremente con la mano.',
  classic: 'Las piezas empiezan giradas al azar: hay que rotarlas para que encajen.',
};
let selCount = 50, selMode = 'relax';

// Rompecabezas disponibles: El Faro (generado por código) + los modelos de la carpeta "modelos/".
const puzzles = [...DIORAMAS];
let loadingModel = null;
function setBusy(text) {
  for (const id of ['btn-start', 'btn-continue', 'btn-inspect']) $(id).disabled = !!text;
  $('puzzle-grid').classList.toggle('busy', !!text);
  if (text !== null) $('puzzle-note').textContent = text || '';
}
function markSelected() {
  for (const el of $('puzzle-grid').children) el.classList.toggle('on', el.dataset.id === model.id);
}
// Cambia el modelo activo. Devuelve true si quedó cargado.
async function selectPuzzle(id) {
  if (loadingModel) await loadingModel.catch(() => {});
  if (model.id === id) { markSelected(); return true; }
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
    markSelected();
    sfx.setTheme(themeFor(pz));
    if (!getThumb(pz)) saveThumb(pz, renderThumb(showcase, model.size));
    return true;
  } catch (e) {
    console.error(e);
    setBusy('');
    $('puzzle-note').textContent = `No se pudo cargar «${pz.name}»: ${e.message}`;
    markSelected();
    return false;
  } finally {
    loadingModel = null;
    refreshContinue();
  }
}
function fillPuzzleList() {
  const grid = $('puzzle-grid');
  grid.innerHTML = '';
  for (const p of puzzles) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pz'; b.dataset.id = p.id; b.title = p.name;
    const thumb = getThumb(p);
    b.innerHTML = `<span class="thumb"><img alt="" ${thumb ? `src="${thumb}"` : 'class="empty"'}><span class="badge">${svgIcon('check', 14)}</span></span><span class="name"></span>`;
    b.querySelector('.name').textContent = p.name;
    b.addEventListener('click', () => { if (!grid.classList.contains('busy')) selectPuzzle(p.id); });
    grid.appendChild(b);
  }
  markSelected();
}
fillPuzzleList();
fetch('modelos/index.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((list) => {
  for (const it of list) if (it && it.file) puzzles.push({ id: it.file, name: it.name || it.file, mb: it.mb, url: 'modelos/' + it.file.split('/').map(encodeURIComponent).join('/') });
  fillPuzzleList();
  refreshContinue();
}).catch(() => {});
// Las miniaturas que falten de los dioramas incluidos se dibujan de a una, sin trabar la página.
async function makeMissingThumbs() {
  try { // limpia miniaturas de versiones anteriores
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(THUMB_PREFIX) && !k.startsWith(THUMB_PREFIX + APP_VERSION + ':')) localStorage.removeItem(k);
    }
  } catch (e) { /* sin almacenamiento */ }
  for (const pz of DIORAMAS) {
    if (getThumb(pz)) continue;
    await new Promise((r) => setTimeout(r, 60));
    while (state.playing || renderer.xr.isPresenting) await new Promise((r) => setTimeout(r, 1000)); // nunca en plena partida: construir un diorama grande da un tirón
    if (pz.id === model.id) { saveThumb(pz, renderThumb(showcase, model.size)); continue; }
    const m = buildBuiltin(pz), mesh = buildMesh(slice(m, 1, 1)[0], m);
    saveThumb(pz, renderThumb(mesh, m.size));
    disposeMesh(mesh);
  }
}
setTimeout(makeMissingThumbs, 400);
function refreshContinue() {
  const live = state.inGame && !state.complete, s = live ? null : loadSave();
  $('btn-continue').classList.toggle('hidden', !(live || s));
  let detail = '';
  if (live) detail = `${model.name} · ${state.total - state.groups.size + 1}/${state.total}`;
  else if (s) {
    const pz = puzzles.find((p) => p.id === (s.puzzle || FARO.id));
    detail = `${pz ? pz.name : 'Partida guardada'} · ${s.count - s.groups.length + 1}/${s.count}`;
  }
  $('continue-detail').textContent = detail;
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
// dónde se juega al pulsar "Nueva partida" o "Continuar": visor (virtual o mixta) o pantalla
bindSeg('seg-where', (v) => { settings.where = v; settings.whereChosen = true; saveSettings(); });
$('opt-timer').checked = settings.showTimer;
$('opt-music').checked = settings.music;
$('opt-music').addEventListener('change', (e) => { sfx.init(); settings.music = e.target.checked; saveSettings(); sfx.setMusicOn(settings.music); syncHud(); });
// Música: el tema del rompecabezas elegido. En el menú suena a media intensidad, como anticipo;
// el navegador solo deja empezar el audio tras un primer toque.
sfx.setMusicOn(settings.music);
sfx.setTheme(themeFor(FARO));
sfx.setMusicActive(true);
sfx.setProgress(0.5);
document.addEventListener('pointerdown', () => sfx.init(), { once: true, capture: true });
$('opt-daynight').checked = settings.dayNight;
$('opt-daynight').addEventListener('change', (e) => { settings.dayNight = e.target.checked; saveSettings(); });
$('opt-fps').checked = settings.showFps;
$('opt-fps').addEventListener('change', (e) => { settings.showFps = e.target.checked; saveSettings(); updateHud(true); });
$('opt-timer').addEventListener('change', (e) => { settings.showTimer = e.target.checked; saveSettings(); updateHud(true); });

// Con el menú abierto en pantallas anchas, la vista 3D se corre para que el diorama quede a la derecha del panel.
function applyViewOffset() {
  const open = !$('menu').classList.contains('hidden'), W = window.innerWidth, H = window.innerHeight;
  if (open && W >= 900 && !renderer.xr.isPresenting) camera.setViewOffset(W, H, -Math.min(250, W * 0.22), 0, W, H);
  else camera.clearViewOffset();
}
// Iconos de la barra superior de la página y su estado.
const HUD_ICONS = { 'btn-ref': 'picture', 'btn-shuffle': 'shuffle', 'btn-shrink': 'zoomout', 'btn-size1': 'size1', 'btn-grow': 'zoomin', 'btn-sound': 'sound', 'btn-prev': 'prev', 'btn-next': 'next', 'btn-spin': 'spin', 'btn-time': 'clock', 'btn-vr': 'vr', 'btn-ar': 'room', 'btn-menu': 'menu' };
function syncHud() {
  for (const id in HUD_ICONS) $(id).innerHTML = svgIcon(id === 'btn-sound' && sfx.muted ? 'mute' : HUD_ICONS[id]);
  $('btn-ref').classList.toggle('off', !showRef);
  $('btn-sound').classList.toggle('off', sfx.muted);
  $('btn-spin').classList.toggle('off', !(state.finale && state.finale.spin !== false));
  for (const id of ['btn-prev', 'btn-next', 'btn-spin', 'btn-time']) $(id).classList.toggle('hidden', !state.inspect);
  if (state.inspect) $('btn-time').title = `Hora del día: ${PHASE_NAMES[phaseIndex()]}`;
  for (const id of ['btn-ref', 'btn-shuffle']) $(id).classList.toggle('hidden', state.complete);
  $('btn-menu').title = state.inspect ? 'Volver al menú' : 'Menú';
  for (const id of ['btn-shrink', 'btn-size1', 'btn-grow']) $(id).classList.toggle('hidden', !state.complete);
  bar.refresh();
}
function showMenu() {
  state.playing = false;
  if (drag) endDrag();
  saveNow();
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('done').classList.add('hidden');
  $('hint').classList.add('hidden');
  if (!state.inGame) Object.assign(orbit, ORBIT_MENU);
  sfx.setProgress(state.complete ? 1 : 0.5);
  refreshContinue();
  applyViewOffset();
}
function play() {
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  applyViewOffset();
  state.playing = true;
  sfx.init();
  sfx.setProgress(state.complete ? 1 : progress());
  if (state.complete && !state.inspect) $('done').classList.remove('hidden');
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
  if (!renderer.xr.isPresenting && settings.where === 'screen') {
    hint(selMode === 'relax'
      ? 'Arrastra una pieza junto a su vecina y suéltala para unirlas. Arrastra el fondo para girar la vista.'
      : 'Clic derecho (o Mayús) + arrastrar gira la pieza. Q / E la hacen rodar.', 8);
  }
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
// Al empezar se entra al visor (si corresponde) dentro del mismo gesto del usuario.
function launch(start) {
  if (xrOK && settings.where !== 'screen') enterXR(settings.where === 'mixed');
  return start();
}
$('btn-start').addEventListener('click', () => launch(newGame));
$('btn-continue').addEventListener('click', () => launch(continueGame));
$('btn-menu').addEventListener('click', showMenu);
$('btn-again').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nada */ } state.inGame = false; placeShowcase(); showMenu(); });
$('btn-admire').addEventListener('click', () => $('done').classList.add('hidden'));
$('btn-ref').addEventListener('click', toggleRef);
$('btn-shuffle').addEventListener('click', () => { layout(false, false); scheduleSave(); });
$('btn-sound').addEventListener('click', toggleSound);
$('btn-grow').addEventListener('click', () => zoomModel(1.6));
$('btn-shrink').addEventListener('click', () => zoomModel(1 / 1.6));
$('btn-size1').addEventListener('click', resetModelSize);
$('btn-prev').addEventListener('click', () => inspectStep(-1));
$('btn-next').addEventListener('click', () => inspectStep(1));
$('btn-spin').addEventListener('click', toggleSpin);
$('btn-time').addEventListener('click', nextPhase);
$('btn-inspect').addEventListener('click', () => launch(inspectModel));
$('btn-vr').addEventListener('click', () => enterXR(false));
$('btn-ar').addEventListener('click', () => enterXR(true));
$('start-label').insertAdjacentHTML('beforebegin', svgIcon('play', 18));
for (const el of document.querySelectorAll('[data-icon]')) el.insertAdjacentHTML('afterbegin', svgIcon(el.dataset.icon, +el.dataset.size || 18));
syncHud();
refreshXRSupport();
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

function onResize() {
  if (renderer.xr.isPresenting) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  applyViewOffset();
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
const phaseIndex = () => Math.round(((fixedPhase !== null ? fixedPhase : dayPhase) % 1) * 4) % 4;
function nextPhase() { fixedPhase = PHASES[(phaseIndex() + 1) % 4]; syncHud(); }
function updateSky(dt) {
  if (fixedPhase !== null) { // avanza hasta la hora elegida (siempre hacia adelante, como un reloj)
    const diff = (((fixedPhase - dayPhase) % 1) + 1) % 1;
    dayPhase = diff < 0.002 ? fixedPhase : (dayPhase + Math.min(diff, dt * 0.6)) % 1;
  } else if (!settings.dayNight) dayPhase += (Math.round(dayPhase) - dayPhase) * Math.min(1, dt * 1.5); // vuelve al mediodía
  else if (state.playing) dayPhase = (dayPhase + dt / DAY_SECONDS) % 1;
  dayNight(dayPhase, skyNow);
  sun.color.copy(skyNow.sun); sun.intensity = skyNow.sunI;
  hemi.color.copy(skyNow.hemi); hemi.groundColor.copy(skyNow.ground); hemi.intensity = skyNow.hemiI;
  skyUniforms.uA.value.copy(skyNow.sky); skyUniforms.uB.value.copy(skyNow.top);
  SKY_COLOR.copy(skyNow.sky); SKY_FOG.color.copy(skyNow.sky);
  env.update(dt, lifeT, dayPhase, skyNow.night, sun); // astros, nubes, faroles y dirección de la luz
}
function tick(time) {
  const dt = Math.min(Math.max((time - lastTime) / 1000, 0), 0.1);
  lastTime = time;
  const vr = renderer.xr.isPresenting;

  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 1) { fpsNow = Math.round(fpsFrames / fpsTime); fpsFrames = 0; fpsTime = 0; if (settings.showFps) updateHud(true); }
  if (state.playing && !state.complete) { state.elapsed += dt; updateHud(false); }
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) $('hint').classList.add('hidden'); }
  if (saveTimer > 0) { saveTimer -= dt; if (saveTimer <= 0) saveNow(); }

  updateSky(dt);
  lifeT += dt;
  if (lifeShow && showcase.visible) lifeShow.update(dt, lifeT, skyNow.night);
  if (lifeGame) lifeGame.update(dt, lifeT, skyNow.night);
  if (vr) { updateHands(dt); updateBar(dt); } else updateCamera(dt);
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
  updateZoom(dt);
  const f = state.finale;
  if (f) {
    f.t += dt;
    const k = Math.min(1, f.t / 1.6), s = k * k * (3 - 2 * k);
    if (f.t > 1.6 && f.spin !== false) f.angle += dt * 0.35 / Math.sqrt(Math.max(1, f.scale)); // grande, gira más despacio
    q1.setFromAxisAngle(t2.set(0, 1, 0), f.angle);
    displayPos(f.scale, q1, t1);
    const sc = f.fromScale + (f.scale - f.fromScale) * s;
    if (k < 1) { f.g.quaternion.copy(f.fromQ).slerp(q1, s); f.g.position.copy(f.fromPos).lerp(t1, s); f.g.scale.setScalar(sc); }
    else { f.g.quaternion.copy(q1); f.g.position.copy(t1); f.g.scale.setScalar(f.scale); f.fromScale = f.scale; }
  }
  if (standMesh) standMesh.visible = !(state.complete && state.groups.size && [...state.groups][0].scale.x > 1.15);
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
    state, layout, trySnap, inspectModel, inspectStep, nextPhase, toggleSpin, get dayPhase() { return dayPhase; }, zoomModel, resetModelSize, get sfx() { return sfx; }, get twoHand() { return twoHand; }, completedGroup, orbit, bar, env, pressBar, enterXR, get xr() { return { xrMixed, xrOK, arOK, xrPassthrough }; }, studio(on) { env.group.visible = !on; if (on) camera.clearViewOffset(); else applyViewOffset(); }, setXR(o) { if ('passthrough' in o) xrPassthrough = o.passthrough; bar.refresh(); }, get showRef() { return showRef; }, setPhase(v) { dayPhase = v; }, get life() { return lifeGame; }, setMixed, scene, selectPuzzle, puzzles, get model() { return model; }, findSnap, camera, C, hands, grabVR, releaseVR, updateHands, THREE,
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
