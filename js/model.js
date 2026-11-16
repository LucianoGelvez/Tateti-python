// Generador procedural del diorama "El Faro".
// Devuelve una sopa de triángulos (posiciones + un color por triángulo) en metros.
import * as THREE from './vendor/three.module.js';

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

function makeNoise(seed) {
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
function makeBuilder(seed) {
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
  return { rng, fbm, features, tmpColor, rgbOf, jitter, addTri, addGeo, addRod, finish, e1, e2 };
}

// ============================================================ El Faro
export function buildFaro(seed = 7) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, finish, e1, e2 } = makeBuilder(seed);

  // --- terreno + mar (disco polar) ---
  const R = 0.36, FLOOR = -0.06;
  const rawHeight = (x, z) => {
    const d1 = Math.hypot(x + 0.04, z - 0.02);
    const d2 = Math.hypot(x - 0.13, z + 0.09);
    return -0.05 + 0.19 * smooth(1 - d1 / 0.27) + 0.12 * smooth(1 - d2 / 0.14)
      + (fbm(x * 14 + 5, z * 14 + 9) - 0.5) * 0.045;
  };
  // Explanadas: bajo el faro y la casa el terreno es plano, para que apoyen de verdad en el suelo.
  const LH = { x: 0.13, z: -0.09, r0: 0.054, r1: 0.088 }, HS = { x: -0.1, z: 0.03, r0: 0.074, r1: 0.108 };
  LH.y = rawHeight(LH.x, LH.z) * 0.92;
  HS.y = rawHeight(HS.x, HS.z) * 0.86;
  const height = (x, z) => {
    let h = rawHeight(x, z);
    for (const p of [LH, HS]) {
      const k = smooth((p.r1 - Math.hypot(x - p.x, z - p.z)) / (p.r1 - p.r0));
      h += (p.y - h) * k;
    }
    return h;
  };
  const slopeAt = (x, z) => Math.hypot(height(x + 0.008, z) - height(x - 0.008, z), height(x, z + 0.008) - height(x, z - 0.008)) / 0.016;
  const surfaceY = (x, z) => Math.max(height(x, z), 0);

  const K = 22, S = 64;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const r = R * Math.pow(k / K, 0.9);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = (s + (k % 2) * 0.5) / S * Math.PI * 2;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = k === K ? -0.05 : height(x, z);
      row.push({ v: new THREE.Vector3(x, Math.max(h, 0) + (h < 0 ? (fbm(x * 30, z * 30) - 0.5) * 0.004 : 0), z), h });
    }
    ringPts.push(row);
  }
  // el borde exterior debe quedar plano para cerrar con la falda
  for (const p of ringPts[K]) p.v.y = 0;

  const nrm = new THREE.Vector3();
  function terrainColor(a, b, c) {
    const h = (a.h + b.h + c.h) / 3;
    if (h < 0) {
      const t = smooth(1 + h / 0.05);
      tmpColor.setHex(0x1b6a8c).lerp(new THREE.Color(0x63cfd0), t * t);
      if (h > -0.006) tmpColor.lerp(new THREE.Color(0xe9fbff), 0.55); // espuma
      const k = 1 + (rng() - 0.5) * 0.08;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);
    if (h < 0.012) return jitter(0xe8d6a6, 0.05);
    if (slope > 0.42 || h > 0.125) return jitter(rng() < 0.5 ? 0x8d8a86 : 0x7a7773, 0.07);
    return jitter(h > 0.07 ? 0x5f9e55 : (rng() < 0.5 ? 0x79b25e : 0x86bd66), 0.07);
  }
  for (let k = 0; k < K; k++) {
    const A = ringPts[k], B = ringPts[k + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      if (k === 0) {
        addTri(A[0].v, B[s].v, B[s1].v, terrainColor(A[0], B[s], B[s1]), UP);
        continue;
      }
      // rejilla escalonada: filas pares/impares desplazadas media celda
      if (k % 2 === 0) {
        addTri(A[s].v, B[s].v, A[s1].v, terrainColor(A[s], B[s], A[s1]), UP);
        addTri(B[s].v, B[s1].v, A[s1].v, terrainColor(B[s], B[s1], A[s1]), UP);
      } else {
        addTri(A[s].v, B[s1].v, A[s1].v, terrainColor(A[s], B[s1], A[s1]), UP);
        addTri(A[s].v, B[s].v, B[s1].v, terrainColor(A[s], B[s], B[s1]), UP);
      }
    }
  }
  // falda y fondo
  const rim = ringPts[K].map((p) => p.v);
  const centerBottom = new THREE.Vector3(0, FLOOR, 0);
  const radial = new THREE.Vector3();
  for (let s = 0; s < S; s++) {
    const a = rim[s], b = rim[(s + 1) % S];
    const a2 = new THREE.Vector3(a.x * 0.96, FLOOR, a.z * 0.96), b2 = new THREE.Vector3(b.x * 0.96, FLOOR, b.z * 0.96);
    radial.set(a.x + b.x, 0, a.z + b.z);
    addTri(a, b, a2, jitter(0x175a78, 0.05), radial);
    addTri(b, b2, a2, jitter(0x154f6b, 0.05), radial);
    addTri(a2, b2, centerBottom, jitter(0x7a6450, 0.04), DOWN);
  }

  // --- faro ---
  {
    const lx = LH.x, lz = LH.z;
    // basamento de piedra hundido en el terreno
    addGeo(new THREE.CylinderGeometry(0.041, 0.046, 0.024, 12), 0x8f8b86, { p: [lx, LH.y - 0.004, lz], amt: 0.08 });
    let y = LH.y + 0.006;
    const bands = 5, bh = 0.04, r0 = 0.034, r1 = 0.021;
    for (let i = 0; i < bands; i++) {
      const ra = r0 + (r1 - r0) * (i / bands), rb = r0 + (r1 - r0) * ((i + 1) / bands);
      addGeo(new THREE.CylinderGeometry(rb, ra, bh, 12, 1, true), i % 2 ? 0xc8443a : 0xf4f1ea, { p: [lx, y + bh / 2, lz], amt: 0.03 });
      y += bh;
    }
    addGeo(new THREE.BoxGeometry(0.014, 0.024, 0.006), 0x5b3a26, { p: [lx - 0.02, LH.y + 0.018, lz + 0.026], r: [0, -0.65, 0] });
    addGeo(new THREE.CylinderGeometry(0.031, 0.029, 0.007, 12), 0x3b3f46, { p: [lx, y + 0.0035, lz] });
    y += 0.007;
    addGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 8, 1, true), 0xffe28a, { p: [lx, y + 0.014, lz], amt: 0.1 });
    features.push({ type: 'beam', pos: [lx, y + 0.014, lz], size: 0.02 });
    y += 0.028;
    addGeo(new THREE.ConeGeometry(0.025, 0.03, 8), 0xb8382f, { p: [lx, y + 0.015, lz] });
    addGeo(new THREE.SphereGeometry(0.005, 6, 4), 0x3b3f46, { p: [lx, y + 0.033, lz] });
  }

  // --- casa ---
  {
    const hx = HS.x, hz = HS.z, rot = 0.45;
    const y = HS.y + 0.005;
    const W = 0.09, H = 0.05, D = 0.062;
    const local = (x, yy, z) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      return [hx + x * c + z * s, y + yy, hz - x * s + z * c];
    };
    // cimientos de piedra hundidos en el terreno y un escalón en la puerta
    addGeo(new THREE.BoxGeometry(W + 0.012, 0.026, D + 0.012), 0x8f8b86, { p: local(0, -0.012, 0), r: [0, rot, 0], amt: 0.08 });
    addGeo(new THREE.BoxGeometry(0.022, 0.006, 0.012), 0x9a968f, { p: local(-0.012, 0.002, D / 2 + 0.01), r: [0, rot, 0] });
    addGeo(new THREE.BoxGeometry(W, H, D), 0xf1e3c4, { p: local(0, H / 2, 0), r: [0, rot, 0], amt: 0.03 });
    // tejado a dos aguas: prisma triangular
    const roof = new THREE.CylinderGeometry(1, 1, 1, 3);
    roof.rotateY(Math.PI);          // un vértice hacia -Z
    roof.rotateX(Math.PI / 2);      // eje a lo largo de Z, vértice hacia +Y
    roof.rotateY(Math.PI / 2);      // eje a lo largo de X
    addGeo(roof, 0xc0603a, { p: local(0, H + 0.0125, 0), r: [0, rot, 0], s: [W + 0.012, 0.025, (D + 0.014) / Math.sqrt(3)], amt: 0.06 });
    addGeo(new THREE.BoxGeometry(0.012, 0.03, 0.012), 0x9a8f86, { p: local(0.025, H + 0.02, -0.012), r: [0, rot, 0] });
    features.push({ type: 'smoke', pos: local(0.025, H + 0.038, -0.012), size: 0.008 });
    features.push({ type: 'window', pos: local(0.02, 0.03, D / 2 + 0.0026), yaw: rot, w: 0.014, h: 0.012 });
    features.push({ type: 'window', pos: local(W / 2 + 0.0026, 0.03, 0), yaw: rot + Math.PI / 2, w: 0.014, h: 0.012 });
    features.push({ type: 'window', pos: local(-W / 2 - 0.0026, 0.03, 0.008), yaw: rot - Math.PI / 2, w: 0.014, h: 0.012 });
    addGeo(new THREE.BoxGeometry(0.014, 0.026, 0.004), 0x6b4428, { p: local(-0.012, 0.021, D / 2), r: [0, rot, 0] });
    addGeo(new THREE.BoxGeometry(0.016, 0.014, 0.004), 0x6fb6d9, { p: local(0.02, 0.03, D / 2), r: [0, rot, 0] });
    addGeo(new THREE.BoxGeometry(0.004, 0.014, 0.016), 0x6fb6d9, { p: local(W / 2, 0.03, 0), r: [0, rot, 0] });
    addGeo(new THREE.BoxGeometry(0.004, 0.014, 0.016), 0x6fb6d9, { p: local(-W / 2, 0.03, 0.008), r: [0, rot, 0] });
  }

  // --- árboles ---
  {
    const placed = [];
    const avoid = [[LH.x, LH.z, 0.062], [HS.x, HS.z, 0.088]];
    let tries = 0;
    while (placed.length < 10 && tries++ < 600) {
      const x = (rng() - 0.5) * 0.44 - 0.03, z = (rng() - 0.5) * 0.44 + 0.01;
      const h = height(x, z);
      if (h < 0.03 || h > 0.13 || slopeAt(x, z) > 0.75) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.05)) continue;
      placed.push([x, z]);
      features.push({ type: 'firefly', pos: [x + (rng() - 0.5) * 0.03, h + 0.02 + rng() * 0.04, z + (rng() - 0.5) * 0.03], size: 0.02 });
      features.push({ type: 'firefly', pos: [x + (rng() - 0.5) * 0.04, h + 0.015 + rng() * 0.05, z + (rng() - 0.5) * 0.04], size: 0.02 });
      const sc = 0.8 + rng() * 0.55;
      const y = h - 0.004;
      addGeo(new THREE.CylinderGeometry(0.004 * sc, 0.005 * sc, 0.024 * sc, 5), 0x6e4a2c, { p: [x, y + 0.012 * sc, z] });
      if (rng() < 0.65) {
        for (let i = 0; i < 3; i++) {
          addGeo(new THREE.ConeGeometry((0.024 - i * 0.006) * sc, 0.032 * sc, 7), i % 2 ? 0x3f8a4b : 0x357a43,
            { p: [x, y + (0.034 + i * 0.019) * sc, z], r: [0, rng() * 3, 0], amt: 0.09 });
        }
      } else {
        addGeo(new THREE.IcosahedronGeometry(0.024 * sc, 0), 0x6dae4a, { p: [x, y + 0.04 * sc, z], r: [rng() * 3, rng() * 3, 0], s: [1, 0.9, 1], amt: 0.1 });
        addGeo(new THREE.IcosahedronGeometry(0.016 * sc, 0), 0x7dbb52, { p: [x + 0.012 * sc, y + 0.055 * sc, z + 0.006 * sc], r: [rng() * 3, rng() * 3, 0], amt: 0.1 });
      }
    }
  }

  // --- muelle y bote ---
  {
    // busca la orilla avanzando hacia +Z desde el centro de la isla
    const dx = -0.03; let z0 = 0.02;
    while (height(dx, z0) > 0.006 && z0 < 0.3) z0 += 0.004;
    const len = 0.105, zc = z0 - 0.012 + len / 2;
    for (let i = 0; i < 7; i++) {
      addGeo(new THREE.BoxGeometry(0.026, 0.004, len / 7 - 0.0015), i % 2 ? 0x9c7448 : 0x8a633c, { p: [dx, 0.013, z0 - 0.012 + (i + 0.5) * len / 7] });
    }
    for (const sx of [-0.011, 0.011]) for (const t of [0.12, 0.5, 0.95]) {
      addGeo(new THREE.CylinderGeometry(0.0028, 0.0028, 0.04, 5), 0x5e4027, { p: [dx + sx, 0.0, z0 - 0.012 + t * len] });
    }
    // bote
    const bx = dx + 0.05, bz = zc + 0.035, br = 0.5;
    addGeo(new THREE.CylinderGeometry(0.013, 0.008, 0.013, 8), 0xf4f1ea, { p: [bx, 0.004, bz], r: [0, br, 0], s: [1, 1, 2.3], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0138, 0.0138, 0.003, 8), 0xc8443a, { p: [bx, 0.011, bz], r: [0, br, 0], s: [1, 1, 2.3] });
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0012, 0.06, 4), 0x5e4027, { p: [bx, 0.04, bz] });
    const sail = new THREE.ConeGeometry(0.02, 0.046, 3);
    addGeo(sail, 0xfff6df, { p: [bx + Math.sin(br) * 0.009, 0.045, bz + Math.cos(br) * 0.009], r: [0, br, 0], s: [0.12, 1, 1], amt: 0.02 });
  }

  // --- rocas ---
  {
    let n = 0, tries = 0;
    while (n < 7 && tries++ < 500) {
      const ang = rng() * Math.PI * 2, r = 0.12 + rng() * 0.2;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = height(x, z);
      if (h > -0.012 || h < -0.049) continue;
      if (Math.hypot(x + 0.0, z - 0.25) < 0.09) continue; // zona del muelle
      const s = 0.011 + rng() * 0.016;
      addGeo(new THREE.IcosahedronGeometry(s, 0), rng() < 0.5 ? 0x86837f : 0x74716d,
        { p: [x, 0.002, z], r: [rng() * 3, rng() * 3, rng() * 3], s: [1, 0.65, 1.2], amt: 0.1 });
      n++;
    }
    for (let i = 0; i < 3; i++) {
      const x = -0.04 + (rng() - 0.5) * 0.2, z = 0.02 + (rng() - 0.5) * 0.2;
      const h = height(x, z);
      if (h < 0.02 || Math.hypot(x - HS.x, z - HS.z) < 0.09 || Math.hypot(x - LH.x, z - LH.z) < 0.06) continue;
      addGeo(new THREE.IcosahedronGeometry(0.012, 0), 0x8d8a86, { p: [x, h + 0.002, z], r: [rng() * 3, rng() * 3, 0], s: [1.2, 0.7, 1], amt: 0.1 });
    }
  }

  // destellos sobre el agua y gaviotas
  for (let i = 0, tries = 0; i < 90 && tries < 2000; tries++) {
    const ang = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.94;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (height(x, z) > -0.012) continue;
    features.push({ type: 'sparkle', pos: [x, 0.004, z], size: 0.01 });
    i++;
  }
  features.push({ type: 'gulls', pos: [-0.02, 0.27, 0.0], size: 0.13 });

  return finish('El Faro');
}

// ============================================================ El Mundo en Globo
// Un globo aerostático cuya vela es el planeta Tierra.

// Tierra firme por franjas de 5° de latitud (de 90°N a 90°S): tramos [lonInicio, lonFin].
const LAND = [
  [],                                                                              // 90–85 N
  [[-85, -22]],
  [[-120, -75], [-70, -18], [12, 28], [55, 68], [90, 110]],
  [[-125, -70], [-56, -20], [20, 30], [52, 60], [66, 160]],
  [[-180, -170], [-168, -62], [-54, -22], [12, 180]],                              // 70–65 N
  [[-180, -172], [-166, -95], [-78, -64], [-50, -42], [-23, -14], [5, 180]],
  [[-165, -153], [-136, -95], [-78, -60], [-7, -2], [8, 18], [21, 138], [156, 163]],
  [[-130, -56], [-10, 1], [4, 141], [156, 159]],
  [[-125, -60], [-2, 137], [141, 144]],                                            // 50–45 N
  [[-124, -70], [-9, 3], [8, 28], [40, 50], [54, 131], [140, 145]],
  [[-123, -76], [-9, 0], [13, 17], [20, 24], [27, 122], [126, 129], [136, 141]],
  [[-120, -78], [-10, 19], [35, 122], [130, 132]],
  [[-115, -97], [-83, -80], [-14, 48], [52, 121]],                                 // 30–25 N
  [[-110, -97], [-84, -75], [-17, 37], [39, 59], [68, 116], [120, 121]],
  [[-105, -87], [-74, -69], [-17, 38], [42, 55], [73, 86], [94, 109], [120, 122]],
  [[-92, -83], [-75, -62], [-17, 44], [74, 80], [98, 109], [121, 125]],
  [[-84, -52], [-13, 49], [77, 78], [80, 81], [98, 103], [116, 118], [122, 126]],  // 10–5 N
  [[-79, -50], [9, 46], [96, 104], [109, 118], [120, 128]],
  [[-81, -36], [9, 41], [100, 105], [110, 117], [119, 123], [131, 146]],           // 0–5 S
  [[-81, -35], [12, 40], [105, 115], [138, 150]],
  [[-77, -37], [13, 41], [48, 50], [130, 137], [142, 145]],
  [[-74, -39], [12, 40], [44, 50], [122, 146]],
  [[-70, -41], [14, 35], [43, 48], [114, 150]],                                    // 20–25 S
  [[-71, -48], [15, 33], [114, 153]],
  [[-72, -52], [18, 30], [115, 126], [133, 152]],
  [[-73, -57], [140, 150], [173, 178]],
  [[-74, -63], [145, 148], [168, 174]],                                            // 40–45 S
  [[-75, -66], [167, 170]],
  [[-74, -66]],
  [], [],                                                                          // 55–65 S
  [[-66, -60], [30, 160]],
  [[-150, -62], [-20, 165]],
  [[-180, 180]], [[-180, 180]], [[-180, 180]],                                     // 75–90 S
];
const CITIES = [
  [40.7, -74], [34, -118], [41.9, -87.6], [19.4, -99.1], [43.7, -79.4], [49.3, -123], [25.8, -80.2], [23.1, -82.4],
  [4.7, -74], [-12, -77], [-33.4, -70.7], [-34.6, -58.4], [-23.5, -46.6], [-22.9, -43.2], [10.5, -66.9], [-15.8, -47.9],
  [51.5, -0.1], [48.9, 2.3], [40.4, -3.7], [41.9, 12.5], [52.5, 13.4], [55.8, 37.6], [41, 29], [59.3, 18],
  [30, 31.2], [6.5, 3.4], [-1.3, 36.8], [-26.2, 28], [-4.3, 15.3], [14.7, -17.4], [9, 38.7], [33.6, -7.6],
  [35.7, 51.4], [25.2, 55.3], [24.9, 67], [28.6, 77.2], [19.1, 72.9], [13, 77.6], [23.8, 90.4], [13.8, 100.5],
  [1.3, 103.8], [-6.2, 106.8], [22.3, 114.2], [31.2, 121.5], [39.9, 116.4], [37.6, 127], [35.7, 139.7], [14.6, 121],
  [-33.9, 151.2], [-37.8, 145], [-32, 115.9], [-36.8, 174.8], [61.2, -149.9], [64.1, -21.9], [55, 82.9], [43.2, 76.9],
];

export function buildGlobo(seed = 11) {
  const { rng, fbm, features, rgbOf, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);
  const R = 0.2, YC = 0.418, TILT = 0.2, LON0 = -45; // LON0: meridiano que mira al frente
  const DEG = Math.PI / 180;
  const ct = Math.cos(TILT), st = Math.sin(TILT);

  // dirección (en el modelo) -> latitud y longitud terrestres, y viceversa
  const toGeo = (x, y, z) => {
    const ex = x * ct + y * st, ey = -x * st + y * ct; // deshace la inclinación del eje
    return [Math.asin(Math.max(-1, Math.min(1, ey))) / DEG, ((Math.atan2(ex, z) / DEG + LON0 + 540) % 360) - 180];
  };
  const toDir = (lat, lon) => {
    const cl = Math.cos(lat * DEG), a = (lon - LON0) * DEG;
    const ex = cl * Math.sin(a), ey = Math.sin(lat * DEG), ez = cl * Math.cos(a);
    return [ex * ct - ey * st, ex * st + ey * ct, ez];
  };
  const inTable = (lat, lon) => {
    const row = LAND[Math.max(0, Math.min(35, Math.floor((90 - lat) / 5)))];
    for (const [a, b] of row) if (lon >= a && lon <= b) return true;
    return false;
  };
  // costas menos cuadradas: se consulta la tabla con un pequeño desvío de ruido
  const isLand = (lat, lon) => {
    const u = (lon + 180) / 9, v = (lat + 90) / 9;
    const la = lat + (fbm(u + 3.1, v + 7.7) - 0.5) * 5, lo = lon + (fbm(u + 11.3, v + 1.9) - 0.5) * 6;
    return inTable(Math.max(-89.9, Math.min(89.9, la)), ((lo + 540) % 360) - 180);
  };
  const mountain = (lat, lon) => Math.max(0, fbm((lon + 180) / 14 + 40, (lat + 90) / 14 + 20) - 0.52) * 2;
  const elevation = (lat, lon) => (isLand(lat, lon) ? 0.018 + 0.07 * mountain(lat, lon) : 0);
  const surface = (lat, lon, extra = 0) => {
    const d = toDir(lat, lon), r = R * (1 + elevation(lat, lon)) + extra;
    return [d[0] * r, YC + d[1] * r, d[2] * r];
  };

  const isDesert = (lat, lon) =>
    (lat > 15 && lat < 33 && lon > -17 && lon < 60) || (lat > 36 && lat < 46 && lon > 55 && lon < 105) ||
    (lat > 23 && lat < 36 && lon > -118 && lon < -102) || (lat < -19 && lat > -31 && lon > 115 && lon < 142) ||
    (lat < -17 && lat > -29 && lon > 12 && lon < 24) || (lat < -17 && lat > -28 && lon > -72 && lon < -67);
  const landColor = (lat, lon) => {
    const m = mountain(lat, lon);
    if (lat < -60 || lat > 77 || (lat > 60 && lon > -60 && lon < -18)) return jitter(0xf3f7fa, 0.03);   // hielo
    if (lat > 62) return jitter(rng() < 0.3 ? 0xe9eef0 : 0x9aa68c, 0.05);                                // tundra
    if (m > 0.34) return jitter(m > 0.55 && Math.abs(lat) > 28 ? 0xe6e6e2 : 0x9a8c7c, 0.06);                                   // montaña
    if (isDesert(lat, lon)) return jitter(rng() < 0.5 ? 0xdcc38c : 0xd2b47a, 0.05);
    if (Math.abs(lat) < 12) return jitter(rng() < 0.5 ? 0x2f8f4a : 0x379a50, 0.07);                      // selva
    if (lat > 46) return jitter(0x3f8558, 0.07);                                                         // bosque boreal
    return jitter(rng() < 0.5 ? 0x5aa75c : 0x6cb565, 0.07);
  };

  // --- el planeta ---
  const CUT = Math.cos(31 * DEG); // por debajo, el casquete queda oculto dentro de la boca del globo
  {
    const ico = new THREE.IcosahedronGeometry(1, 17);
    const a = ico.attributes.position.array;
    const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (let i = 0; i < a.length; i += 9) {
      let nLand = 0, hidden = true;
      for (let v = 0; v < 3; v++) {
        const x = a[i + v * 3], y = a[i + v * 3 + 1], z = a[i + v * 3 + 2];
        const [lat, lon] = toGeo(x, y, z);
        const e = elevation(lat, lon);
        if (e > 0) nLand++;
        if (y > -CUT) hidden = false;
        const r = R * (1 + e);
        P[v].set(x * r, YC + y * r, z * r);
      }
      const cx = (a[i] + a[i + 3] + a[i + 6]) / 3, cy = (a[i + 1] + a[i + 4] + a[i + 7]) / 3, cz = (a[i + 2] + a[i + 5] + a[i + 8]) / 3;
      const cl = Math.hypot(cx, cy, cz);
      const [lat, lon] = toGeo(cx / cl, cy / cl, cz / cl);
      let rgb;
      if (hidden) rgb = jitter(0xb5562f, 0.05);                              // interior de la vela
      else if (nLand >= 2) rgb = landColor(lat, lon);
      else if (lat > 80) rgb = jitter(0xeaf3f9, 0.03);                       // banquisa ártica
      else if (nLand === 1) rgb = jitter(0x4fb6cc, 0.05);                    // aguas someras
      else {
        const deep = fbm((lon + 180) / 20 + 9, (lat + 90) / 20 + 4);
        rgb = jitter(deep > 0.5 ? 0x1f62a6 : 0x2a78bd, 0.045);
      }
      addTri(P[0], P[1], P[2], rgb);
    }
    ico.dispose();
  }

  // --- boca del globo, aro y cuerdas ---
  const yTop = YC - R * CUT, rTop = R * Math.sin(31 * DEG) + 0.003;   // donde la falda toca el planeta
  const yMouth = 0.158, rMouth = 0.046;
  {
    const hSkirt = yTop - yMouth, N = 16;
    addGeo(new THREE.CylinderGeometry(rTop, rMouth, hSkirt, N, 2, true), 0, {
      p: [0, yMouth + hSkirt / 2, 0],
      colorFn: (va, vb, vc) => {
        const ang = Math.atan2(va.z + vb.z + vc.z, va.x + vb.x + vc.x);
        const k = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * N + 1e-6) % 2;
        return jitter(k ? 0xd9482f : 0xf6ecd8, 0.035);
      },
    });
    const torus = (r, tube, y, hex) => addGeo(new THREE.TorusGeometry(r, tube, 6, 28), hex, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], amt: 0.05 });
    torus(rTop + 0.002, 0.0045, yTop, 0xc79a3a);       // aro dorado
    torus(rMouth, 0.004, yMouth, 0x4a3b33);            // boca
  }

  // --- canasta ---
  const yRim = 0.072, rRim = 0.043;
  {
    const N = 14, HS = 4;
    addGeo(new THREE.CylinderGeometry(rRim, 0.036, yRim, N, HS, false), 0, {
      p: [0, yRim / 2, 0],
      colorFn: (va, vb, vc) => {
        const cx = (va.x + vb.x + vc.x) / 3, cy = (va.y + vb.y + vc.y) / 3, cz = (va.z + vb.z + vc.z) / 3;
        if (Math.hypot(cx, cz) < 0.03) return jitter(0x6b4a2c, 0.05);       // fondo y tapa
        const a = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (2 * Math.PI)) * N + 1e-6);
        const b = Math.floor((cy / yRim) * HS + 1e-6);
        return jitter((a + b) % 2 ? 0xb98a4e : 0x9c6f3a, 0.05);             // trenzado de mimbre
      },
    });
    addGeo(new THREE.TorusGeometry(rRim + 0.001, 0.005, 6, 24), 0x6b4226, { p: [0, yRim, 0], r: [Math.PI / 2, 0, 0], amt: 0.05 });
    // quemador sobre dos travesaños
    const yB = 0.118;
    addGeo(new THREE.BoxGeometry(0.086, 0.004, 0.006), 0x3b3f46, { p: [0, yB - 0.012, 0], r: [0, Math.PI / 4, 0] });
    addGeo(new THREE.BoxGeometry(0.086, 0.004, 0.006), 0x3b3f46, { p: [0, yB - 0.012, 0], r: [0, -Math.PI / 4, 0] });
    addGeo(new THREE.CylinderGeometry(0.011, 0.014, 0.022, 8), 0x8d949c, { p: [0, yB, 0], amt: 0.06 });
    addGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 6), 0x2c2f35, { p: [0, yB + 0.014, 0] });
    features.push({ type: 'flame', pos: [0, yB + 0.018, 0], size: 0.012 });
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      addRod([c * rRim, yRim, s * rRim], [c * rMouth, yMouth, s * rMouth], 0.0016, 0xd8c9a8);
      if (i % 2 === 0) {
        // sacos de arena colgando por fuera
        addRod([c * (rRim + 0.004), yRim, s * (rRim + 0.004)], [c * (rRim + 0.006), yRim - 0.022, s * (rRim + 0.006)], 0.001, 0xd8c9a8, 4);
        addGeo(new THREE.IcosahedronGeometry(0.008, 0), 0xcdb58a, { p: [c * (rRim + 0.007), yRim - 0.03, s * (rRim + 0.007)], s: [1, 1.25, 1], r: [rng() * 3, rng() * 3, 0], amt: 0.08 });
      }
    }
    // banderines entre la boca y el aro dorado
    const flags = [0xf2c14e, 0x4fa3c7, 0x79b25e, 0xd2553f];
    for (let i = 0; i < 16; i++) {
      const a = (i + 0.5) / 16 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), rr = rTop + 0.007;
      addGeo(new THREE.ConeGeometry(0.008, 0.02, 3), flags[i % 4], { p: [c * rr, yTop - 0.016, s * rr], r: [Math.PI, -a, 0], s: [1, 1, 0.25], amt: 0.04 });
    }
  }

  // --- vida ---
  for (const [lat, lon] of CITIES) {
    const d = toDir(lat, lon);
    if (d[1] < -CUT + 0.03) continue;
    features.push({ type: 'city', pos: surface(lat, lon, 0.003), size: 0.007 });
  }
  for (let i = 0, tries = 0; i < 9 && tries < 400; tries++) {
    const lat = -40 + rng() * 105, lon = -180 + rng() * 360;
    const d = toDir(lat, lon);
    if (d[1] < -0.55) continue;
    const r = R * 1.13 + rng() * 0.012;
    features.push({ type: 'cloud', pos: [d[0] * r, YC + d[1] * r, d[2] * r], center: [0, YC, 0], size: 0.018 + rng() * 0.012 });
    i++;
  }
  for (let i = 0, tries = 0; i < 70 && tries < 3000; tries++) {
    const lat = -60 + rng() * 135, lon = -180 + rng() * 360;
    if (elevation(lat, lon) > 0 || toDir(lat, lon)[1] < -CUT + 0.05) continue;
    features.push({ type: 'sparkle', pos: surface(lat, lon, 0.002), size: 0.01 });
    i++;
  }
  features.push({ type: 'gulls', pos: [0, 0.13, 0], size: 0.15 });

  return finish('El Mundo en Globo');
}

// Dioramas incluidos en el juego.
export const DIORAMAS = [
  { id: 'faro', name: 'El Faro', build: buildFaro },
  { id: 'globo', name: 'El Mundo en Globo', build: buildGlobo },
];
