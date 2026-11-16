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

export function buildDiorama(seed = 7) {
  const rng = mulberry32(seed);
  const fbm = makeNoise(seed);
  const pos = [];
  const col = [];
  const tmpColor = new THREE.Color();
  // puntos donde el diorama "cobra vida" (luces, humo, destellos…); los usa js/life.js
  const features = [];

  const jitter = (hex, amt = 0.06) => {
    tmpColor.setHex(hex);
    const k = 1 + (rng() - 0.5) * 2 * amt;
    return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
  };

  // --- utilidades de construcción ---
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
  function addGeo(geo, hex, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], amt = 0.05, colorFn = null } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    Q.setFromEuler(EUL.set(r[0], r[1], r[2]));
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

  // --- terreno + mar (disco polar) ---
  const R = 0.36, FLOOR = -0.06;
  const height = (x, z) => {
    const d1 = Math.hypot(x + 0.04, z - 0.02);
    const d2 = Math.hypot(x - 0.13, z + 0.09);
    return -0.05 + 0.19 * smooth(1 - d1 / 0.27) + 0.12 * smooth(1 - d2 / 0.14)
      + (fbm(x * 14 + 5, z * 14 + 9) - 0.5) * 0.045;
  };
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
    const lx = 0.13, lz = -0.09;
    let y = height(lx, lz) - 0.006;
    const bands = 5, bh = 0.04, r0 = 0.034, r1 = 0.021;
    for (let i = 0; i < bands; i++) {
      const ra = r0 + (r1 - r0) * (i / bands), rb = r0 + (r1 - r0) * ((i + 1) / bands);
      addGeo(new THREE.CylinderGeometry(rb, ra, bh, 12, 1, true), i % 2 ? 0xc8443a : 0xf4f1ea, { p: [lx, y + bh / 2, lz], amt: 0.03 });
      y += bh;
    }
    addGeo(new THREE.BoxGeometry(0.014, 0.024, 0.006), 0x5b3a26, { p: [lx - 0.02, height(lx, lz) + 0.008, lz + 0.026], r: [0, -0.65, 0] });
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
    const hx = -0.1, hz = 0.03, rot = 0.45;
    const y = height(hx, hz) - 0.008;
    const W = 0.09, H = 0.05, D = 0.062;
    const local = (x, yy, z) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      return [hx + x * c + z * s, y + yy, hz - x * s + z * c];
    };
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
    const avoid = [[0.13, -0.09, 0.06], [-0.1, 0.03, 0.075]];
    let tries = 0;
    while (placed.length < 10 && tries++ < 600) {
      const x = (rng() - 0.5) * 0.44 - 0.03, z = (rng() - 0.5) * 0.44 + 0.01;
      const h = height(x, z);
      if (h < 0.03 || h > 0.13) continue;
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
      if (h < 0.02 || Math.hypot(x + 0.1, z - 0.03) < 0.07) continue;
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

  return { name: 'El Faro', positions: new Float32Array(pos), colors: new Float32Array(col), features };
}
