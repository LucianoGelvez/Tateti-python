// Herramientas compartidas por todos los dioramas hechos por código.
// Un diorama es una "sopa de triángulos": posiciones + un color por triángulo, más una lista
// de puntos con efectos vivos (features). Ver .claude/skills/crear-diorama para la guía completa.
import * as THREE from '../vendor/three.module.js';

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

export function makeNoise(seed) {
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = smooth(x - xi), fy = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => 0.6 * noise(x, y) + 0.3 * noise(x * 2.1 + 7, y * 2.1 + 3) + 0.1 * noise(x * 4.3, y * 4.3);
}

// Utilidades compartidas por todos los dioramas hechos por código.
export function makeBuilder(seed) {
  const rng = mulberry32(seed);
  const fbm = makeNoise(seed);
  const pos = [];
  const col = [];
  const tmpColor = new THREE.Color();
  // puntos donde el diorama "cobra vida" (luces, humo, destellos…); los usa js/life.js
  const features = [];

  const rgbOf = (hex, k = 1) => { tmpColor.setHex(hex); return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k]; };
  const jitter = (hex, amt = 0.06) => rgbOf(hex, 1 + (rng() - 0.5) * 2 * amt);

  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  function addTri(a, b, c, rgb, want) {
    if (want) {
      e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
      if (e1.dot(want) < 0) { const t = b; b = c; c = t; }
    }
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    col.push(rgb[0], rgb[1], rgb[2]);
  }
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const EUL = new THREE.Euler();
  // r: giro en ángulos de Euler; q: giro como cuaternión (tiene prioridad)
  function addGeo(geo, hex, { p = [0, 0, 0], r = [0, 0, 0], q = null, s = [1, 1, 1], amt = 0.05, colorFn = null } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (q) Q.copy(q); else Q.setFromEuler(EUL.set(r[0], r[1], r[2]));
    M.compose(new THREE.Vector3(...p), Q, new THREE.Vector3(...s));
    g.applyMatrix4(M);
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) {
      va.set(a[i], a[i + 1], a[i + 2]); vb.set(a[i + 3], a[i + 4], a[i + 5]); vc.set(a[i + 6], a[i + 7], a[i + 8]);
      e1.subVectors(vb, va); e2.subVectors(vc, va);
      if (e1.cross(e2).lengthSq() < 1e-16) continue;
      const rgb = colorFn ? colorFn(va, vb, vc) : jitter(hex, amt);
      addTri(va, vb, vc, rgb);
    }
    geo.dispose();
  }
  // varilla o cuerda entre dos puntos
  const UPV = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), rq = new THREE.Quaternion();
  function addRod(a, b, radius, hex, sides = 5) {
    dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = dir.length();
    rq.setFromUnitVectors(UPV, dir.normalize());
    addGeo(new THREE.CylinderGeometry(radius, radius, len, sides, 1, true), hex,
      { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], q: rq, amt: 0.04 });
  }
  const finish = (name) => ({ name, positions: new Float32Array(pos), colors: new Float32Array(col), features });
  return { rng, fbm, features, tmpColor, rgbOf, jitter, addTri, addGeo, addRod, finish, e1, e2, stats: () => ({ triangles: col.length / 3 }) };
}
