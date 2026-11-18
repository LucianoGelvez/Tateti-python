// Diorama "Las Pirámides de Egipto" — Necrópolis de Guiza y Ribera del Nilo (~180k triángulos)
// Meseta caliza estratificada, dunas doradas del Sahara, canal del Nilo y zócalo faraónico hermético:
//   Gran Pirámide de Keops (48 hiladas escalonadas, entrada norte con cabrios, brecha y Barca Solar),
//   Pirámide de Kefrén (base en granito de Asuán, cuerpo escalonado, capuchón blanco de Tura y piramidión de oro),
//   Pirámide de Micerino (tercio inferior en granito rosa, brecha histórica norte),
//   6 Pirámides de las Reinas (3 junto a Keops y 3 al sur de Micerino),
//   Gran Esfinge de Guiza en su foso excavado (cuerpo leonino, garras, Nemes azul/oro, Uraeus y Estela del Sueño),
//   Templo del Valle, Templo de la Esfinge, Templos Funerarios, Calzada Procesional,
//   Necrópolis de 24 Mastabas (Cementerio Occidental y Oriental),
//   Muelle Real del Nilo, Pilono monumental, 2 Obeliscos de granito rosa, Avenida de Esfinges,
//   Oasis de 36 palmeras datileras, papiros, 2 falúas reales, caravana de 5 camellos y campamento de canteros.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildPiramides(seed = 173) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  // =====================================================================
  // 1. PALETA EGIPCIA Y SILLERÍA / MATERIALES PROCEDIMENTALES
  // =====================================================================
  const limestoneCourseColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vc.z + vc.z) / 3;
    const row = Math.floor(cy * 260 * scale);
    const col = Math.floor((cx + cz) * 180 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0xdfc184, 0xd4b270, 0xe8cd95, 0xc7a260];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.0055 && ((row + col) & 1)) hex = 0xb99352;
    return jitter(hex, 0.032);
  };

  const turaCasingColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 240);
    const col = Math.floor((cx - cz) * 165 + (row & 1) * 0.5);
    const h = ((row * 31) ^ (col * 17)) & 3;
    const pal = [0xf6efe0, 0xede4d0, 0xfaf5eb, 0xe4d9c2];
    return jitter(pal[h], 0.02);
  };

  const aswanGraniteColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 230);
    const col = Math.floor((cx + cz) * 160 + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0x9f5646, 0x8c4738, 0xae6352, 0x7b3b2d];
    return jitter(pal[h], 0.035);
  };

  const electrumGoldColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 320) & 1;
    return jitter(k ? 0xf2c84b : 0xd9a528, 0.03);
  };

  const sphinxRockColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const strata = Math.floor(cy * 195 + fbm(cx * 32, cz * 32) * 2.2) & 3;
    const pal = [0xd6b472, 0xc7a15d, 0xdfc184, 0xb88f4c];
    return jitter(pal[strata], 0.036);
  };

  const nemesStripeColor = (yRef) => (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const band = Math.floor((cy - yRef) * 460 + (cx + cz) * 110) & 1;
    return jitter(band ? 0x1c4575 : 0xe0b242, 0.03);
  };

  const woodColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 260) & 1;
    return jitter(k ? 0x6b4528 : 0x56351c, 0.045);
  };

  const displaceGeo = (geo, amp = 0.0004) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const qx = Math.round(x * 2000), qy = Math.round(y * 2000), qz = Math.round(z * 2000);
      let h = (qx * 374761393 + qy * 668265263 + qz * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const n1 = ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
      h = Math.imul(h ^ (h >>> 11), 668265263);
      const n2 = ((h ^ (h >>> 15)) >>> 0) / 4294967296 - 0.5;
      pos.setXYZ(i, x + n1 * amp, y + n2 * amp * 0.65, z + n1 * amp);
    }
    return geo;
  };

  // =====================================================================
  // 2. HELPERS GEOMÉTRICOS DE ALTA DENSIDAD
  // =====================================================================
  const pickRGB = (colorOrFn, va, vb, vc, amt = 0.03) =>
    typeof colorOrFn === 'function' ? colorOrFn(va, vb, vc)
      : Array.isArray(colorOrFn) ? colorOrFn : jitter(colorOrFn, amt);

  const addQuad = (a, b, c, d, colorOrFn, want, amt = 0.03) => {
    addTri(a, b, c, pickRGB(colorOrFn, a, b, c, amt), want);
    addTri(a, c, d, pickRGB(colorOrFn, a, c, d, amt), want);
  };

  const _pc = new THREE.Vector3(), _fc = new THREE.Vector3(), _wn = new THREE.Vector3();
  const addPrism = (bot, top, colorOrFn, caps = true, amt = 0.03) => {
    const n = bot.length;
    _pc.set(0, 0, 0);
    for (let i = 0; i < n; i++) { _pc.add(bot[i]); _pc.add(top[i]); }
    _pc.multiplyScalar(0.5 / n);
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      _fc.copy(bot[i]).add(bot[i1]).add(top[i1]).add(top[i]).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(bot[i], bot[i1], top[i1], top[i], colorOrFn, _wn, amt);
    }
    if (caps && n >= 3) {
      _fc.set(0, 0, 0);
      for (let i = 0; i < n; i++) _fc.add(bot[i]);
      _fc.multiplyScalar(1 / n);
      _wn.subVectors(_fc, _pc);
      for (let i = 1; i < n - 1; i++) {
        addTri(bot[0], bot[i + 1], bot[i], pickRGB(colorOrFn, bot[0], bot[i + 1], bot[i], amt), _wn);
      }
      _fc.set(0, 0, 0);
      for (let i = 0; i < n; i++) _fc.add(top[i]);
      _fc.multiplyScalar(1 / n);
      _wn.subVectors(_fc, _pc);
      for (let i = 1; i < n - 1; i++) {
        addTri(top[0], top[i], top[i + 1], pickRGB(colorOrFn, top[0], top[i], top[i + 1], amt), _wn);
      }
    }
  };

  // Bloque prismático directo sin crear objetos BoxGeometry por cada sillar
  const _bx = new Array(8).fill(null).map(() => new THREE.Vector3());
  const addBoxDirect = (cx, cy, cz, w, h, d, colorOrFn, amt = 0.035, jitterV = 0) => {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const jv = () => (jitterV ? (rng() - 0.5) * jitterV : 0);
    _bx[0].set(cx - hw + jv(), cy - hh, cz - hd + jv());
    _bx[1].set(cx + hw + jv(), cy - hh, cz - hd + jv());
    _bx[2].set(cx + hw + jv(), cy - hh, cz + hd + jv());
    _bx[3].set(cx - hw + jv(), cy - hh, cz + hd + jv());
    _bx[4].set(cx - hw + jv(), cy + hh, cz - hd + jv());
    _bx[5].set(cx + hw + jv(), cy + hh, cz - hd + jv());
    _bx[6].set(cx + hw + jv(), cy + hh, cz + hd + jv());
    _bx[7].set(cx - hw + jv(), cy + hh, cz + hd + jv());
    _pc.set(cx, cy, cz);
    // 4 caras laterales + tapa superior + tapa inferior
    const faces = [
      [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
      [4, 5, 6, 7], [3, 2, 1, 0],
    ];
    for (const [i0, i1, i2, i3] of faces) {
      const a = _bx[i0], b = _bx[i1], c = _bx[i2], e = _bx[i3];
      _fc.copy(a).add(b).add(c).add(e).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(a, b, c, e, colorOrFn, _wn, amt);
    }
  };

  const addSubBox = (w, h, d, sx, sy, sz, p, rot = 0, fn = null, amp = 0.00028) => {
    const g = displaceGeo(new THREE.BoxGeometry(w, h, d, sx, sy, sz), amp);
    addGeo(g, 0xdfc184, { p, r: [0, rot, 0], colorFn: fn || limestoneCourseColor() });
  };

  // Viga prismática orientada entre dos puntos
  const _ba = new THREE.Vector3(), _bb = new THREE.Vector3(), _bd = new THREE.Vector3();
  const _bu = new THREE.Vector3(), _bv = new THREE.Vector3(), _br = new THREE.Vector3();
  const addBeam = (ax, ay, az, bx, by, bz, w, d, colorOrFn, refDir = null, pad = 0) => {
    _ba.set(ax, ay, az);
    _bb.set(bx, by, bz);
    _bd.subVectors(_bb, _ba);
    const len = _bd.length();
    if (len < 1e-6) return;
    _bd.divideScalar(len);
    if (pad > 0) {
      _ba.addScaledVector(_bd, -pad);
      _bb.addScaledVector(_bd, pad);
    }
    if (refDir) {
      _br.copy(refDir).normalize();
      if (Math.abs(_bd.dot(_br)) > 0.96) _br.copy(Math.abs(_bd.y) < 0.9 ? UP : AXIS_Z);
    } else {
      _br.copy(Math.abs(_bd.y) < 0.9 ? UP : AXIS_Z);
    }
    _bu.crossVectors(_bd, _br).normalize();
    _bv.crossVectors(_bu, _bd).normalize();
    const hw = w * 0.5, hd = d * 0.5;
    const mk = (base, sx, sz) => new THREE.Vector3(
      base.x + _bu.x * sx * hw + _bv.x * sz * hd,
      base.y + _bu.y * sx * hw + _bv.y * sz * hd,
      base.z + _bu.z * sx * hw + _bv.z * sz * hd,
    );
    const bot = [mk(_ba, -1, -1), mk(_ba, 1, -1), mk(_ba, 1, 1), mk(_ba, -1, 1)];
    const top = [mk(_bb, -1, -1), mk(_bb, 1, -1), mk(_bb, 1, 1), mk(_bb, -1, 1)];
    addPrism(bot, top, colorOrFn, true, 0.025);
  };

  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };

  // =====================================================================
  // 3. TOPOGRAFÍA DE GUIZA, DUNAS DEL SAHARA, CANAL DEL NILO Y ZÓCALO
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.355, AZ = 0.288, FLOOR = -0.078;
  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 4.2) + Math.pow(Math.abs(s) / AZ, 4.2), 1 / 4.2);
  };

  // Curva del Río Nilo en el borde sureste
  const NILE_PTS = [[0.34, -0.055], [0.295, 0.055], [0.255, 0.148], [0.165, 0.248]];
  const segDist = (x, z, pts) => {
    let md = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      md = Math.min(md, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
    }
    return md;
  };
  const nileDist = (x, z) => segDist(x, z, NILE_PTS);
  const NILE_W = 0.044;

  // Coordenadas centrales de las tres grandes pirámides
  const KX = 0.094, KZ = -0.118, K_HALF = 0.090, K_Y = 0.052, K_H = 0.165;
  const FX = -0.084, FZ = 0.030, F_HALF = 0.078, F_Y = 0.054, F_H = 0.144;
  const MX = -0.218, MZ = 0.140, M_HALF = 0.045, M_Y = 0.038, M_H = 0.082;

  const EXPLANADAS = [
    { x: KX, z: KZ, hw: 0.098, hd: 0.098, rot: 0, y: K_Y, r0: 0.008, r1: 0.038 },               // Gran Pirámide de Keops
    { x: 0.225, z: -0.118, hw: 0.028, hd: 0.068, rot: 0, y: K_Y - 0.002, r0: 0.006, r1: 0.034 }, // Reinas de Keops + Templo Funerario
    { x: 0.268, z: -0.105, hw: 0.026, hd: 0.058, rot: 0, y: 0.044, r0: 0.006, r1: 0.030 },       // Cementerio Oriental
    { x: -0.135, z: -0.142, hw: 0.120, hd: 0.068, rot: 0, y: 0.048, r0: 0.008, r1: 0.038 },      // Cementerio Occidental de Mastabas
    { x: FX, z: FZ, hw: 0.086, hd: 0.086, rot: 0, y: F_Y, r0: 0.008, r1: 0.042 },               // Pirámide de Kefrén
    { x: MX, z: MZ, hw: 0.048, hd: 0.048, rot: 0, y: M_Y, r0: 0.006, r1: 0.052 },               // Pirámide de Micerino
    { x: -0.214, z: 0.205, hw: 0.048, hd: 0.016, rot: 0, y: M_Y - 0.003, r0: 0.005, r1: 0.044 }, // Reinas de Micerino
    { x: 0.110, z: 0.046, hw: 0.048, hd: 0.024, rot: -0.18, y: 0.018, r0: 0.006, r1: 0.018 },    // Foso excavado de la Esfinge
    { x: 0.172, z: 0.084, hw: 0.028, hd: 0.044, rot: -0.22, y: 0.018, r0: 0.006, r1: 0.022 },    // Templo de la Esfinge y Templo del Valle
    { x: 0.015, z: 0.175, hw: 0.036, hd: 0.024, rot: 0, y: 0.022, r0: 0.008, r1: 0.052 },        // Campamento de canteros
  ];

  const rectDist = (x, z, p) => {
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  const rawHeight = (x, z) => {
    // Meseta caliza elevada en el norte y oeste, descendiendo hacia la llanura del Nilo al sureste
    const plateau = 0.046 * smooth(1.15 - (x * 0.9 + z * 1.15) * 1.85);
    const westRidge = 0.012 * smooth(1 - Math.hypot((x + 0.12) * 0.85, (z + 0.02) * 0.9) / 0.26);
    const dunes = Math.sin(x * 38 + z * 24 + fbm(x * 16, z * 16) * 2.5) * 0.0055 * smooth((z - 0.06) * 7.5);
    let h = 0.014 + plateau + westRidge + dunes + (fbm(x * 20 + 5, z * 20 + 11) - 0.5) * 0.010;
    // Cauce excavado del Nilo
    const nd = nileDist(x, z);
    const riverCut = smooth(1 - nd / (NILE_W * 1.48));
    h -= 0.056 * riverCut;
    return h;
  };

  const height = (x, z) => {
    let h = rawHeight(x, z);
    for (const p of EXPLANADAS) {
      const k = smooth((p.r1 - rectDist(x, z, p)) / (p.r1 - p.r0));
      h += (p.y - h) * k;
    }
    return h;
  };

  // Malla polar de alta resolución (K = 120, S = 320 -> ~76.800 triángulos)
  const K = 120, S = 320;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = height(x, z);
      const y = Math.max(h, 0) + (h < 0 ? (fbm(x * 48, z * 48) - 0.5) * 0.0014 : 0);
      row.push({ v: new THREE.Vector3(x, y, z), h });
    }
    ringPts.push(row);
  }
  for (const p of ringPts[K]) if (p.h < 0) p.v.y = 0;

  const nrm = new THREE.Vector3();
  const plateauPaved = (x, z) => {
    for (let i = 0; i < 7; i++) if (rectDist(x, z, EXPLANADAS[i]) < 0.008) return true;
    return rectDist(x, z, EXPLANADAS[8]) < 0.006;
  };

  function terrainColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);
    const nd = nileDist(cx, cz);

    // Agua del Nilo con espuma en la orilla
    if (h < 0 && hMax < 0.004 && slope < 0.25) {
      const t = smooth(1 + h / 0.042);
      tmpColor.setHex(0x0b3b54).lerp(new THREE.Color(0x1b6d85), t);
      if (h > -0.004) tmpColor.lerp(new THREE.Color(0x9bd0d8), 0.52);
      const k = 1 + (rng() - 0.5) * 0.05;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }
    // Ribera fértil verde esmeralda del Nilo
    if (nd < NILE_W + 0.044 && h >= 0 && h < 0.025 && slope < 0.35) {
      const lush = smooth(1 - (nd - NILE_W) / 0.044);
      if (lush > 0.25) {
        const pal = [0x4c7c32, 0x5c8f3b, 0x3e6b29, 0x6f9943];
        return jitter(pal[Math.floor(fbm(cx * 36, cz * 36) * 4) & 3], 0.055);
      }
    }
    // Escarpes rocosos de caliza en las laderas de la meseta y foso de la Esfinge
    if (slope > 0.28) {
      const strata = Math.floor(((a.v.y + b.v.y + c.v.y) / 3) * 140 + fbm(cx * 28, cz * 28) * 1.8) & 3;
      const pal = [0xc9a566, 0xb89254, 0xd4b274, 0xa88248];
      return jitter(pal[strata], 0.045);
    }
    // Pavimento de losas alrededor de las pirámides y templos
    if (plateauPaved(cx, cz)) {
      const ix = Math.floor(cx * 165), iz = Math.floor(cz * 165);
      const tile = ((ix * 31) ^ (iz * 17)) & 3;
      const pal = [0xdfd0ae, 0xd6c49d, 0xe6d8b8, 0xccba92];
      return jitter(pal[tile], 0.025);
    }
    // Dunas doradas y arena cálida del desierto del Sahara
    const ripple = Math.sin(cx * 110 + cz * 70 + fbm(cx * 18, cz * 18) * 3);
    const sandHex = ripple > 0.2 ? 0xe7c682 : ripple < -0.25 ? 0xd4ad65 : 0xdeba73;
    return jitter(sandHex, 0.042);
  }

  for (let k = 0; k < K; k++) {
    const A = ringPts[k], B = ringPts[k + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      if (k === 0) {
        addTri(A[0].v, B[s].v, B[s1].v, terrainColor(A[0], B[s], B[s1]), UP);
        continue;
      }
      if (k % 2 === 0) {
        addTri(A[s].v, B[s].v, A[s1].v, terrainColor(A[s], B[s], A[s1]), UP);
        addTri(B[s].v, B[s1].v, A[s1].v, terrainColor(B[s], B[s1], A[s1]), UP);
      } else {
        addTri(A[s].v, B[s1].v, A[s1].v, terrainColor(A[s], B[s1], A[s1]), UP);
        addTri(A[s].v, B[s].v, B[s1].v, terrainColor(A[s], B[s], B[s1]), UP);
      }
    }
  }

  // Zócalo estratificado hermético con corte de agua del Nilo, moldura de arenisca y base cerrada
  const rim = ringPts[K];
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  const radial = new THREE.Vector3();
  const Y_STRATA = -0.014, Y_PLINTH = -0.054;
  for (let s = 0; s < S; s++) {
    const ra = rim[s], rb = rim[(s + 1) % S];
    const a = ra.v, b = rb.v;
    const isWater = (ra.h + rb.h) * 0.5 < -0.002;
    const a1 = new THREE.Vector3(CX + (a.x - CX) * 1.004, Y_STRATA, CZ + (a.z - CZ) * 1.004);
    const b1 = new THREE.Vector3(CX + (b.x - CX) * 1.004, Y_STRATA, CZ + (b.z - CZ) * 1.004);
    const a2 = new THREE.Vector3(CX + (a.x - CX) * 0.992, Y_PLINTH, CZ + (a.z - CZ) * 0.992);
    const b2 = new THREE.Vector3(CX + (b.x - CX) * 0.992, Y_PLINTH, CZ + (b.z - CZ) * 0.992);
    const a3 = new THREE.Vector3(CX + (a.x - CX) * 0.974, FLOOR, CZ + (a.z - CZ) * 0.974);
    const b3 = new THREE.Vector3(CX + (b.x - CX) * 0.974, FLOOR, CZ + (b.z - CZ) * 0.974);
    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    const topCol = isWater ? (s % 2 ? 0x0d435c : 0x114f6b) : (s % 2 ? 0xd2ae6e : 0xc39c5d);
    const midCol = isWater ? 0x0a3247 : (s % 2 ? 0x9b6b3e : 0x8d5f35);
    addQuad(a, b, b1, a1, topCol, radial, 0.035);
    addQuad(a1, b1, b2, a2, midCol, radial, 0.03);
    addQuad(a2, b2, b3, a3, 0x5c4430, radial, 0.03);
    addTri(a3, b3, centerBottom, jitter(0x4c3726, 0.025), DOWN);
  }

  // =====================================================================
  // 4. CONSTRUCTOR DE PIRÁMIDES ESCALONADAS DE ALTA FIDELIDAD
  // =====================================================================
  function buildSteppedPyramid({
    cx, yBase, cz, halfBase, height, courses,
    gridRes = 24,
    graniteCourses = 0,
    capStartCourse = courses + 1, // por encima de courses => sin capuchón liso de Tura
    truncateTop = false,
    pyramidion = false,
    northChevronEntrance = false,
    northDemolitionScar = false,
    steppedMajesty = 0, // >0: pirámide escalonada de gradas anchas (ej. Reinas G3-b/c)
  }) {
    const baseY = yBase - 0.008;
    const apexY = yBase + height;
    const totalH = apexY - baseY;

    // 4.1 Núcleo sólido continuo subdividido (para que las piezas Voronoi jamás queden huecas)
    const coreTopH = truncateTop ? totalH * 0.962 : totalH;
    const coreTopHalf = truncateTop ? halfBase * 0.96 * 0.038 : 0.0005;
    const coreBaseHalf = halfBase * 0.978;
    const coreFN = (va, vb, vc) => {
      const cy = (va.y + vb.y + vc.y) / 3;
      const frac = (cy - yBase) / height;
      if (graniteCourses > 0 && frac < graniteCourses / courses) return aswanGraniteColor(va, vb, vc);
      if (frac >= capStartCourse / courses) return turaCasingColor(va, vb, vc);
      return limestoneCourseColor(yBase, 1.1)(va, vb, vc);
    };

    const cornersB = [
      new THREE.Vector3(cx - coreBaseHalf, baseY, cz - coreBaseHalf),
      new THREE.Vector3(cx + coreBaseHalf, baseY, cz - coreBaseHalf),
      new THREE.Vector3(cx + coreBaseHalf, baseY, cz + coreBaseHalf),
      new THREE.Vector3(cx - coreBaseHalf, baseY, cz + coreBaseHalf),
    ];
    const cornersT = [
      new THREE.Vector3(cx - coreTopHalf, baseY + coreTopH, cz - coreTopHalf),
      new THREE.Vector3(cx + coreTopHalf, baseY + coreTopH, cz - coreTopHalf),
      new THREE.Vector3(cx + coreTopHalf, baseY + coreTopH, cz + coreTopHalf),
      new THREE.Vector3(cx - coreTopHalf, baseY + coreTopH, cz + coreTopHalf),
    ];
    const centerBase = new THREE.Vector3(cx, baseY, cz);
    const centerTop = new THREE.Vector3(cx, baseY + coreTopH, cz);

    for (let side = 0; side < 4; side++) {
      const s1 = (side + 1) % 4;
      const bl = cornersB[side], br = cornersB[s1];
      const tl = cornersT[side], tr = cornersT[s1];
      const outN = new THREE.Vector3(
        (bl.x + br.x) * 0.5 - cx, totalH * 0.25, (bl.z + br.z) * 0.5 - cz,
      ).normalize();
      for (let r = 0; r < gridRes; r++) {
        const v0 = r / gridRes, v1 = (r + 1) / gridRes;
        const row0L = new THREE.Vector3().lerpVectors(bl, tl, v0);
        const row0R = new THREE.Vector3().lerpVectors(br, tr, v0);
        const row1L = new THREE.Vector3().lerpVectors(bl, tl, v1);
        const row1R = new THREE.Vector3().lerpVectors(br, tr, v1);
        const cols = Math.max(1, Math.round(gridRes * (1 - v0 * 0.85)));
        for (let c = 0; c < cols; c++) {
          const u0 = c / cols, u1 = (c + 1) / cols;
          const p00 = new THREE.Vector3().lerpVectors(row0L, row0R, u0);
          const p10 = new THREE.Vector3().lerpVectors(row0L, row0R, u1);
          const p01 = new THREE.Vector3().lerpVectors(row1L, row1R, u0);
          const p11 = new THREE.Vector3().lerpVectors(row1L, row1R, u1);
          addQuad(p00, p10, p11, p01, coreFN, outN, 0.03);
        }
      }
      addTri(bl, br, centerBase, jitter(0x8c734b, 0.03), DOWN);
      if (truncateTop) addTri(tl, tr, centerTop, limestoneCourseColor(yBase)(tl, tr, centerTop), UP);
    }

    // 4.2 Hiladas escalonadas en 3D (bloques individuales o gradas monumentales)
    if (steppedMajesty > 0) {
      const nTiers = steppedMajesty;
      for (let t = 0; t < nTiers; t++) {
        const f0 = t / nTiers;
        const tierHalf = halfBase * (1 - f0 * 0.82);
        const tierH = (height / nTiers) * 1.15;
        const y0 = yBase + f0 * height * 0.92;
        addSubBox(tierHalf * 2, tierH, tierHalf * 2, 4, 2, 4, [cx, y0 + tierH * 0.42, cz], 0, limestoneCourseColor(yBase));
      }
      return;
    }

    const maxVisibleCourse = Math.min(courses, capStartCourse);
    const dh = height / courses;
    for (let c = 0; c < maxVisibleCourse; c++) {
      const f = c / courses;
      const yMid = yBase + (c + 0.42) * dh;
      const ch = dh * 1.16; // ligero solape vertical para que nunca queden rendijas
      const rOuter = halfBase * (1 - f);
      if (truncateTop && c >= courses - 2) continue;
      if (rOuter < 0.0035) continue;

      const isGranite = c < graniteCourses;
      const cFn = isGranite ? aswanGraniteColor : limestoneCourseColor(yBase, 1.15);
      const blockDepth = Math.min(rOuter * 0.48, Math.max(0.0045, halfBase * 0.085));
      const nPerSide = Math.max(2, Math.round((rOuter * 2) / Math.max(0.0055, halfBase * 0.095)));

      for (let side = 0; side < 4; side++) {
        for (let b = 0; b < nPerSide; b++) {
          const u0 = -1 + (2 * b) / nPerSide;
          const u1 = -1 + (2 * (b + 1)) / nPerSide;
          const uMid = 0.5 * (u0 + u1);

          // Brecha vertical en la cara norte (-Z, side === 0) de Micerino
          if (northDemolitionScar && side === 0 && c > 2 && c < courses - 4 && Math.abs(uMid) < 0.19) {
            continue;
          }

          const span = (rOuter * 2) / nPerSide;
          const jitterOut = (rng() - 0.5) * 0.00055;
          const jitterH = (rng() - 0.5) * ch * 0.16;
          const offset = rOuter - blockDepth * 0.42 + jitterOut;

          let bx = cx, bz = cz, bw = span * 1.03, bd = blockDepth;
          if (side === 0) { bx = cx + uMid * (rOuter - blockDepth * 0.25); bz = cz - offset; }
          else if (side === 1) { bx = cx + offset; bz = cz + uMid * (rOuter - blockDepth * 0.25); bw = blockDepth; bd = span * 1.03; }
          else if (side === 2) { bx = cx + uMid * (rOuter - blockDepth * 0.25); bz = cz + offset; }
          else { bx = cx - offset; bz = cz + uMid * (rOuter - blockDepth * 0.25); bw = blockDepth; bd = span * 1.03; }

          addBoxDirect(bx, yMid + jitterH, bz, bw, ch, bd, cFn, 0.04, 0.00022);
        }
      }
    }

    // 4.3 Capuchón superior de revestimiento liso de caliza blanca de Tura (Kefrén)
    if (capStartCourse < courses) {
      const fCap = capStartCourse / courses;
      const yCapStart = yBase + fCap * height;
      const hCap = apexY - yCapStart;
      const capHalf = halfBase * (1 - fCap) + 0.0018;
      const capRes = 18;
      const cB = [
        new THREE.Vector3(cx - capHalf, yCapStart, cz - capHalf),
        new THREE.Vector3(cx + capHalf, yCapStart, cz - capHalf),
        new THREE.Vector3(cx + capHalf, yCapStart, cz + capHalf),
        new THREE.Vector3(cx - capHalf, yCapStart, cz + capHalf),
      ];
      const cT = new THREE.Vector3(cx, apexY, cz);
      for (let side = 0; side < 4; side++) {
        const bl = cB[side], br = cB[(side + 1) % 4];
        const outN = new THREE.Vector3(
          (bl.x + br.x) * 0.5 - cx, hCap * 0.35, (bl.z + br.z) * 0.5 - cz,
        ).normalize();
        for (let r = 0; r < capRes; r++) {
          const v0 = r / capRes, v1 = (r + 1) / capRes;
          const pL0 = new THREE.Vector3().lerpVectors(bl, cT, v0);
          const pR0 = new THREE.Vector3().lerpVectors(br, cT, v0);
          const pL1 = new THREE.Vector3().lerpVectors(bl, cT, v1);
          const pR1 = new THREE.Vector3().lerpVectors(br, cT, v1);
          const cols = Math.max(1, capRes - r);
          for (let col = 0; col < cols; col++) {
            const u0 = col / cols, u1 = (col + 1) / cols;
            const a = new THREE.Vector3().lerpVectors(pL0, pR0, u0);
            const b = new THREE.Vector3().lerpVectors(pL0, pR0, u1);
            const e = new THREE.Vector3().lerpVectors(pL1, pR1, u0);
            const d = new THREE.Vector3().lerpVectors(pL1, pR1, u1);
            // Borde inferior irregular del revestimiento sobreviviente
            if (r === 0) {
              a.y += Math.sin(col * 1.9 + side) * 0.0018;
              b.y += Math.sin((col + 1) * 1.9 + side) * 0.0018;
            }
            addQuad(a, b, d, e, turaCasingColor, outN, 0.02);
          }
        }
        // Solapa inferior inclinada para cerrar el escalón del revestimiento sobre el núcleo
        const inL = new THREE.Vector3().lerpVectors(bl, new THREE.Vector3(cx, yCapStart, cz), 0.16);
        const inR = new THREE.Vector3().lerpVectors(br, new THREE.Vector3(cx, yCapStart, cz), 0.16);
        addQuad(bl, br, inR, inL, turaCasingColor, DOWN, 0.02);
      }
    }

    // 4.4 Cúspide truncada de Keops (plataforma de sillares expuestos)
    if (truncateTop) {
      const yTopPlat = yBase + height * 0.955;
      const topW = halfBase * 0.11;
      addSubBox(topW, 0.0055, topW, 3, 1, 3, [cx, yTopPlat, cz], 0, limestoneCourseColor(yBase));
      addBoxDirect(cx - topW * 0.18, yTopPlat + 0.0036, cz + topW * 0.12, topW * 0.42, 0.0035, topW * 0.38, limestoneCourseColor(yBase));
      addBoxDirect(cx + topW * 0.16, yTopPlat + 0.0032, cz - topW * 0.16, topW * 0.36, 0.0028, topW * 0.34, limestoneCourseColor(yBase));
    }

    // 4.5 Piramidión de oro / electro en la punta
    if (pyramidion) {
      const pyH = height * 0.068;
      const pyR = halfBase * 0.095;
      addGeo(new THREE.ConeGeometry(pyR, pyH, 4, 2), 0xf2c84b, {
        p: [cx, apexY - pyH * 0.35, cz], r: [0, Math.PI / 4, 0], colorFn: electrumGoldColor,
      });
      features.push({ type: 'sparkle', pos: [cx, apexY + 0.003, cz], size: 0.012 });
    }

    // 4.6 Entrada Norte de Keops (4 cabrios en V invertida + brecha oscura + dintel)
    if (northChevronEntrance) {
      const entY = yBase + height * 0.175;
      const entZ = cz - halfBase * 0.815;
      addSubBox(0.018, 0.014, 0.014, 3, 3, 2, [cx, entY - 0.002, entZ + 0.004], 0, () => jitter(0x281e15, 0.03));
      for (let pair = 0; pair < 4; pair++) {
        const py = entY + 0.0065 + pair * 0.0030;
        const pz = entZ + pair * 0.0018;
        addBeam(cx - 0.010, py - 0.002, pz, cx, py + 0.0055, pz, 0.0042, 0.008, limestoneCourseColor(yBase), UP);
        addBeam(cx + 0.010, py - 0.002, pz, cx, py + 0.0055, pz, 0.0042, 0.008, limestoneCourseColor(yBase), UP);
      }
      // Brecha de Al-Ma'mun ligeramente por debajo y al oeste
      addSubBox(0.011, 0.011, 0.012, 2, 2, 2, [cx - 0.013, yBase + height * 0.09, cz - halfBase * 0.90], 0, () => jitter(0x221912, 0.03));
    }

    // 4.7 Cicatriz vertical norte de Micerino (demolición medieval de Al-Aziz Uthman)
    if (northDemolitionScar) {
      for (let s = 0; s < 10; s++) {
        const f = 0.08 + s * 0.072;
        const sy = yBase + f * height;
        const sz = cz - halfBase * (1 - f) * 0.95;
        addSubBox(halfBase * 0.34 * (1 - f * 0.65), height * 0.075, 0.010, 2, 2, 2, [cx, sy, sz + 0.003], 0, () => jitter(0x3b2c1e, 0.04));
      }
    }
  }

  // Construir las 3 Grandes Pirámides
  buildSteppedPyramid({
    cx: KX, yBase: K_Y, cz: KZ, halfBase: K_HALF, height: K_H,
    courses: 48, gridRes: 32, truncateTop: true, northChevronEntrance: true,
  });
  buildSteppedPyramid({
    cx: FX, yBase: F_Y, cz: FZ, halfBase: F_HALF, height: F_H,
    courses: 38, gridRes: 28, graniteCourses: 4, capStartCourse: 27, pyramidion: true,
  });
  buildSteppedPyramid({
    cx: MX, yBase: M_Y, cz: MZ, halfBase: M_HALF, height: M_H,
    courses: 28, gridRes: 22, graniteCourses: 10, northDemolitionScar: true,
  });

  // 3 Pirámides de las Reinas de Keops (G1-a, G1-b, G1-c) al este de Keops
  for (let i = 0; i < 3; i++) {
    const qz = KZ - 0.044 + i * 0.044;
    buildSteppedPyramid({
      cx: 0.225, yBase: K_Y - 0.002, cz: qz, halfBase: 0.0155, height: 0.025,
      courses: 13, gridRes: 8, truncateTop: i === 1,
    });
    // Capilla oriental de la reina
    addSubBox(0.007, 0.007, 0.010, 2, 2, 2, [0.242, K_Y + 0.001, qz], 0, limestoneCourseColor(K_Y));
  }

  // 3 Pirámides de las Reinas de Micerino (G3-a, G3-b, G3-c) al sur de Micerino
  for (let i = 0; i < 3; i++) {
    const qx = -0.244 + i * 0.030;
    buildSteppedPyramid({
      cx: qx, yBase: M_Y - 0.002, cz: 0.205, halfBase: 0.0115, height: 0.020,
      courses: 10, gridRes: 7, steppedMajesty: i > 0 ? 4 : 0,
    });
  }

  // =====================================================================
  // 5. BARCA SOLAR DE KEOPS Y SU FOSA SUR
  // =====================================================================
  {
    const bx = KX, bz = KZ + K_HALF + 0.015, by = K_Y;
    // Muros calizos de la fosa de la barca
    addSubBox(0.068, 0.006, 0.019, 8, 1, 3, [bx, by + 0.001, bz], 0, limestoneCourseColor(by));
    addSubBox(0.060, 0.004, 0.012, 6, 1, 2, [bx, by + 0.0025, bz], 0, () => jitter(0x3a2b1d, 0.03));
    // Casco curvo de madera de cedro con proa y popa alzadas en papiro
    for (let s = -7; s <= 7; s++) {
      const t = s / 7;
      const sx = bx + t * 0.027;
      const sy = by + 0.0065 + t * t * 0.0055;
      const sw = 0.0055 * (1 - t * t * 0.72);
      addGeo(new THREE.BoxGeometry(0.0045, 0.0038, sw * 2, 1, 1, 1), 0x6b4528, {
        p: [sx, sy, bz], r: [0, 0, t * 0.38], colorFn: woodColor,
      });
    }
    // Remates papiroformes de proa y popa
    for (const dir of [-1, 1]) {
      addBeam(bx + dir * 0.027, by + 0.012, bz, bx + dir * 0.033, by + 0.0185, bz, 0.0024, 0.0024, woodColor);
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0012, 0.003, 6), 0x7c5332, {
        p: [bx + dir * 0.033, by + 0.019, bz], r: [0, 0, -dir * 0.4], colorFn: woodColor,
      });
    }
    // Camarote de madera de cedro y remos laterales
    addSubBox(0.016, 0.005, 0.006, 3, 2, 2, [bx, by + 0.0095, bz], 0, woodColor);
    for (const side of [-1, 1]) {
      for (let o = -2; o <= 2; o++) {
        addRod([bx + o * 0.006, by + 0.007, bz + side * 0.0045], [bx + o * 0.006 - 0.003, by + 0.003, bz + side * 0.011], 0.0008, 0x875c38, 4);
      }
    }
  }

  // =====================================================================
  // 6. LA GRAN ESFINGE DE GUIZA EN SU RECINTO EXCAVADO
  // =====================================================================
  {
    const SX = 0.105, SY = 0.018, SZ = 0.046, S_YAW = -0.18;
    const S = makeLocal(SX, SY, SZ, S_YAW);

    // Muros del foso excavado en la roca caliza alrededor de la Esfinge (N, O, S)
    addSubBox(0.096, 0.026, 0.009, 14, 5, 2, S(-0.004, 0.005, -0.022), S_YAW, sphinxRockColor);
    addSubBox(0.096, 0.026, 0.009, 14, 5, 2, S(-0.004, 0.005, 0.022), S_YAW, sphinxRockColor);
    addSubBox(0.010, 0.026, 0.052, 2, 5, 8, S(-0.048, 0.005, 0), S_YAW, sphinxRockColor);
    // Plataforma/zócalo tallado en el suelo bajo la Esfinge
    addSubBox(0.088, 0.008, 0.032, 12, 2, 4, S(0.004, -0.001, 0), S_YAW, sphinxRockColor);

    // Cuerpo leonino recostado con estratos de caliza (grupa, lomo, costillas y pecho)
    const torso = displaceGeo(new THREE.SphereGeometry(1, 20, 14), 0.025);
    addGeo(torso, 0xd6b472, {
      p: S(-0.004, 0.013, 0), r: [0, S_YAW, 0], s: [0.029, 0.0135, 0.0125], colorFn: sphinxRockColor,
    });
    // Grupa trasera y hombros delanteros
    addGeo(displaceGeo(new THREE.SphereGeometry(1, 14, 10), 0.022), 0xd6b472, {
      p: S(-0.024, 0.011, 0), r: [0, S_YAW, 0], s: [0.014, 0.012, 0.0135], colorFn: sphinxRockColor,
    });
    addGeo(displaceGeo(new THREE.SphereGeometry(1, 14, 10), 0.02), 0xd6b472, {
      p: S(0.016, 0.016, 0), r: [0, S_YAW, 0], s: [0.014, 0.0155, 0.0138], colorFn: sphinxRockColor,
    });
    // Muslos traseros flexionados a ambos lados
    for (const side of [-1, 1]) {
      addGeo(displaceGeo(new THREE.SphereGeometry(1, 12, 8), 0.02), 0xc7a15d, {
        p: S(-0.021, 0.007, side * 0.0115), r: [0, S_YAW + side * 0.2, 0], s: [0.015, 0.0085, 0.0062], colorFn: sphinxRockColor,
      });
      addSubBox(0.022, 0.006, 0.0075, 4, 2, 2, S(-0.016, 0.003, side * 0.0135), S_YAW + side * 0.12, sphinxRockColor);
    }
    // Cola enroscada sobre el flanco derecho
    for (let t = 0; t < 6; t++) {
      const a = t * 0.45;
      addGeo(new THREE.SphereGeometry(0.0026 - t * 0.0002, 7, 5), 0xc7a15d, {
        p: S(-0.036 + Math.sin(a) * 0.008, 0.0055 + t * 0.0005, 0.005 + t * 0.0022), colorFn: sphinxRockColor,
      });
    }
    // Grandes patas delanteras extendidas hacia el Este (+X local) con garras esculpidas
    for (const side of [-1, 1]) {
      addSubBox(0.036, 0.0075, 0.009, 8, 3, 3, S(0.033, 0.0035, side * 0.0105), S_YAW, sphinxRockColor);
      addGeo(displaceGeo(new THREE.SphereGeometry(1, 10, 7), 0.025), 0xd6b472, {
        p: S(0.049, 0.0042, side * 0.0105), r: [0, S_YAW, 0], s: [0.0075, 0.0052, 0.0058], colorFn: sphinxRockColor,
      });
      for (let c = -1; c <= 1; c++) {
        addGeo(new THREE.BoxGeometry(0.0042, 0.0035, 0.0022, 1, 1, 1), 0xc29c59, {
          p: S(0.055, 0.0028, side * 0.0105 + c * 0.0026), r: [0, S_YAW, 0], colorFn: sphinxRockColor,
        });
      }
    }

    // Estela del Sueño de Tutmosis IV (granito rosa) y altar con fuego sagrado entre las patas
    addSubBox(0.0035, 0.013, 0.0095, 2, 4, 3, S(0.029, 0.006, 0), S_YAW, aswanGraniteColor);
    addGeo(new THREE.CylinderGeometry(0.0025, 0.0035, 0.0055, 8), 0x9f5646, {
      p: S(0.041, 0.0025, 0), colorFn: aswanGraniteColor,
    });
    features.push({ type: 'flame', pos: S(0.041, 0.0055, 0), size: 0.0025 });
    features.push({ type: 'smoke', pos: S(0.041, 0.009, 0), size: 0.0055, color: 0xe6ddd0 });

    // Cuello, cabeza faraónica y tocado Nemes real con franjas azul/oro
    addGeo(new THREE.CylinderGeometry(0.0082, 0.0095, 0.014, 12, 3), 0xd6b472, {
      p: S(0.017, 0.029, 0), r: [0, S_YAW, 0], colorFn: sphinxRockColor,
    });
    // Cabeza y rostro
    addGeo(displaceGeo(new THREE.SphereGeometry(0.0092, 16, 12), 0.00025), 0xdfc184, {
      p: S(0.0185, 0.039, 0), r: [0, S_YAW, 0], s: [1.05, 1.15, 0.92], colorFn: sphinxRockColor,
    });
    // Pómulos, cejas, ojos, puente nasal erosionado, labios y mentón
    addGeo(new THREE.BoxGeometry(0.005, 0.0042, 0.0085, 2, 2, 2), 0xd6b472, {
      p: S(0.0245, 0.0375, 0), r: [0, S_YAW, 0], colorFn: sphinxRockColor,
    });
    addGeo(new THREE.BoxGeometry(0.0042, 0.0048, 0.0026), 0xc7a15d, {
      p: S(0.0268, 0.038, 0), r: [0, S_YAW, 0], colorFn: sphinxRockColor,
    });
    addGeo(new THREE.BoxGeometry(0.0036, 0.0022, 0.0036), 0xc7a15d, {
      p: S(0.0256, 0.0325, 0), r: [0, S_YAW, 0], colorFn: sphinxRockColor,
    });
    for (const side of [-1, 1]) {
      addGeo(new THREE.SphereGeometry(0.0014, 6, 5), 0x3b2c1d, { p: S(0.0265, 0.0402, side * 0.0032) });
      addGeo(new THREE.BoxGeometry(0.0028, 0.0012, 0.0042), 0xb88f4c, {
        p: S(0.0262, 0.0420, side * 0.0032), r: [0, S_YAW, 0],
      });
    }
    // Tocado Nemes: corona trapezoidal, caídas laterales plisadas sobre los hombros y coleta trasera
    const nemesFn = nemesStripeColor(SY + 0.020);
    addGeo(new THREE.CylinderGeometry(0.0095, 0.0155, 0.016, 12, 4), 0x1c4575, {
      p: S(0.0145, 0.0415, 0), r: [0, S_YAW, 0.22], s: [0.95, 1.0, 1.18], colorFn: nemesFn,
    });
    for (const side of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.011, 0.017, 0.0055, 3, 4, 2), 0x1c4575, {
        p: S(0.0195, 0.0305, side * 0.0112), r: [side * 0.18, S_YAW, -0.14], colorFn: nemesFn,
      });
      addGeo(new THREE.BoxGeometry(0.0085, 0.007, 0.006, 2, 2, 2), 0xe0b242, {
        p: S(0.0225, 0.0215, side * 0.0118), r: [0, S_YAW, 0], colorFn: nemesFn,
      });
    }
    // Coleta trasera del Nemes y cobra real Uraeus en la frente
    addBeam(...S(0.005, 0.036, 0), ...S(0.000, 0.022, 0), 0.0045, 0.0045, nemesFn);
    addGeo(new THREE.CylinderGeometry(0.0011, 0.0014, 0.0065, 6), 0xf2c84b, {
      p: S(0.0245, 0.0468, 0), r: [0, S_YAW, -0.25], colorFn: electrumGoldColor,
    });
    addGeo(new THREE.SphereGeometry(0.0018, 7, 5), 0xf2c84b, {
      p: S(0.0258, 0.0492, 0), s: [0.9, 1.3, 1.2], colorFn: electrumGoldColor,
    });
  }

  // =====================================================================
  // 7. TEMPLOS, CALZADA PROCESIONAL, NECROPOLIS DE MASTABAS Y PUERTO DEL NILO
  // =====================================================================
  const addPylonTower = (cx, yBase, cz, w, h, d, yaw, wallFn = limestoneCourseColor(yBase)) => {
    const hw = w * 0.5, hd = d * 0.5, topK = 0.78;
    const bot = [
      new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3(hw, 0, -hd),
      new THREE.Vector3(hw, 0, hd), new THREE.Vector3(-hw, 0, hd),
    ];
    const top = [
      new THREE.Vector3(-hw * topK, h, -hd * topK), new THREE.Vector3(hw * topK, h, -hd * topK),
      new THREE.Vector3(hw * topK, h, hd * topK), new THREE.Vector3(-hw * topK, h, hd * topK),
    ];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    for (const v of bot) v.applyQuaternion(q).add(new THREE.Vector3(cx, yBase - 0.005, cz));
    for (const v of top) v.applyQuaternion(q).add(new THREE.Vector3(cx, yBase, cz));
    addPrism(bot, top, wallFn, true, 0.03);
    // Cornisa egipcia de gola (cavetto)
    addSubBox(w * topK * 1.12, h * 0.12, d * topK * 1.12, 3, 1, 2, [cx, yBase + h + h * 0.05, cz], yaw, turaCasingColor);
  };

  // 7.1 Templo de la Esfinge y Templo del Valle de Kefrén (granito rojo de Asuán)
  {
    const VX = 0.172, VY = 0.018, VZ = 0.084, V_YAW = -0.22;
    const V = makeLocal(VX, VY, VZ, V_YAW);
    // Basamento hundido común
    addSubBox(0.052, 0.012, 0.084, 8, 2, 12, V(0, -0.004, 0), V_YAW, turaCasingColor);
    // Templo de la Esfinge (al norte del conjunto)
    addSubBox(0.042, 0.016, 0.032, 6, 3, 5, V(0, 0.008, -0.024), V_YAW, limestoneCourseColor(VY));
    for (const px of [-0.012, 0, 0.012]) {
      for (const pz of [-0.031, -0.017]) {
        addSubBox(0.0042, 0.018, 0.0042, 1, 2, 1, V(px, 0.011, pz), V_YAW, aswanGraniteColor);
      }
    }
    // Templo del Valle de Kefrén (al sur del conjunto, granito rojo)
    addSubBox(0.044, 0.019, 0.038, 7, 3, 6, V(0, 0.0095, 0.018), V_YAW, aswanGraniteColor);
    addSubBox(0.047, 0.0032, 0.041, 6, 1, 5, V(0, 0.020, 0.018), V_YAW, turaCasingColor);
    // Portales monumentales orientales con luces nocturnas y braseros
    for (const pz of [0.008, 0.028]) {
      addGeo(new THREE.BoxGeometry(0.003, 0.012, 0.006), 0x1b1510, { p: V(0.0225, 0.008, pz), r: [0, V_YAW, 0] });
      features.push({ type: 'window', pos: V(0.0242, 0.008, pz), yaw: V_YAW + Math.PI / 2, w: 0.0055, h: 0.010 });
      features.push({ type: 'flame', pos: V(0.025, 0.004, pz + (pz > 0.018 ? 0.006 : -0.006)), size: 0.0022 });
    }
    features.push({ type: 'window', pos: V(0.0215, 0.008, -0.024), yaw: V_YAW + Math.PI / 2, w: 0.006, h: 0.009 });
  }

  // 7.2 Templos Funerarios de Keops, Kefrén y Micerino
  const addMortuaryTemple = (tx, ty, tz, w, d, yaw = 0, wallFn = limestoneCourseColor(ty)) => {
    const T = makeLocal(tx, ty, tz, yaw);
    addSubBox(w, 0.014, d, 5, 3, 6, T(0, 0.004, 0), yaw, wallFn);
    addSubBox(w * 0.72, 0.018, d * 0.56, 4, 3, 4, T(-w * 0.1, 0.009, 0), yaw, aswanGraniteColor);
    for (let i = -1; i <= 1; i++) {
      addSubBox(0.0035, 0.017, 0.0035, 1, 2, 1, T(w * 0.35, 0.0085, i * d * 0.28), yaw, aswanGraniteColor);
    }
    addGeo(new THREE.BoxGeometry(0.003, 0.010, 0.007), 0x1e1712, { p: T(w * 0.505, 0.006, 0), r: [0, yaw, 0] });
    features.push({ type: 'window', pos: T(w * 0.525, 0.006, 0), yaw: yaw + Math.PI / 2, w: 0.006, h: 0.009 });
    features.push({ type: 'flame', pos: T(w * 0.58, 0.004, d * 0.26), size: 0.002 });
    features.push({ type: 'flame', pos: T(w * 0.58, 0.004, -d * 0.26), size: 0.002 });
  };
  addMortuaryTemple(KX + K_HALF + 0.014, K_Y, KZ, 0.026, 0.044, 0);
  addMortuaryTemple(FX + F_HALF + 0.015, F_Y, FZ, 0.028, 0.042, 0);
  addMortuaryTemple(MX + M_HALF + 0.011, M_Y, MZ, 0.020, 0.028, 0, aswanGraniteColor);

  // 7.3 Calzada Procesional de Kefrén (desciende sobre terraplén sólido hasta el Templo del Valle)
  {
    const x0 = FX + F_HALF + 0.026, z0 = FZ + 0.014, y0 = F_Y;
    const x1 = 0.156, z1 = 0.100, y1 = 0.018;
    const N_SEG = 14;
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < N_SEG; i++) {
      const t = (i + 0.5) / N_SEG;
      const sx = x0 + (x1 - x0) * t, sz = z0 + (z1 - z0) * t;
      const sy = y0 + (y1 - y0) * t;
      const len = Math.hypot(x1 - x0, z1 - z0) / N_SEG * 1.18;
      // Terraplén profundo para que jamás flote en la pendiente de la meseta
      addSubBox(0.012, sy + 0.015, len, 2, 3, 2, [sx, sy * 0.5 - 0.002, sz], yaw, limestoneCourseColor());
      // Parapetos y cubierta parcial de la calzada procesional
      for (const side of [-1, 1]) {
        const px = sx + Math.cos(yaw) * side * 0.0046;
        const pz = sz - Math.sin(yaw) * side * 0.0046;
        addSubBox(0.0026, 0.0085, len, 1, 2, 1, [px, sy + 0.007, pz], yaw, turaCasingColor);
      }
      if (i % 2 === 0) {
        addSubBox(0.0125, 0.0024, len * 0.85, 2, 1, 2, [sx, sy + 0.0115, sz], yaw, turaCasingColor);
      }
      if (i % 3 === 1) {
        features.push({ type: 'city', pos: [sx, sy + 0.0135, sz], size: 0.008 });
      }
    }
  }

  // 7.4 Necrópolis de Mastabas: Cementerio Occidental (16) y Cementerio Oriental (8)
  const addMastaba = (cx, yBase, cz, w, h, d, yaw = 0, fn = limestoneCourseColor(yBase)) => {
    const hw = w * 0.5, hd = d * 0.5, k = 0.84;
    const bot = [
      new THREE.Vector3(-hw, -0.005, -hd), new THREE.Vector3(hw, -0.005, -hd),
      new THREE.Vector3(hw, -0.005, hd), new THREE.Vector3(-hw, -0.005, hd),
    ];
    const top = [
      new THREE.Vector3(-hw * k, h, -hd * k), new THREE.Vector3(hw * k, h, -hd * k),
      new THREE.Vector3(hw * k, h, hd * k), new THREE.Vector3(-hw * k, h, hd * k),
    ];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    for (const v of bot) v.applyQuaternion(q).add(new THREE.Vector3(cx, yBase, cz));
    for (const v of top) v.applyQuaternion(q).add(new THREE.Vector3(cx, yBase, cz));
    addPrism(bot, top, fn, true, 0.032);
    // "Puerta falsa" / nicho de ofrendas en la cara oriental y pozo vertical oscuro en la azotea
    const M = makeLocal(cx, yBase, cz, yaw);
    addSubBox(0.0022, h * 0.68, d * 0.34, 1, 2, 2, M(hw * 0.88, h * 0.38, 0), yaw, () => jitter(0x4a3826, 0.03));
    addSubBox(w * 0.24, 0.0025, d * 0.24, 1, 1, 1, M(0, h + 0.0004, 0), yaw, () => jitter(0x2a2016, 0.03));
  };

  // Cementerio Occidental (4 filas x 4 columnas = 16 mastabas)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const mx = -0.228 + col * 0.056 + (rng() - 0.5) * 0.004;
      const mz = -0.194 + row * 0.033 + (rng() - 0.5) * 0.003;
      const mw = 0.036 + rng() * 0.008;
      const md = 0.018 + rng() * 0.005;
      const mh = 0.009 + rng() * 0.0045;
      addMastaba(mx, height(mx, mz), mz, mw, mh, md, (rng() - 0.5) * 0.06);
    }
  }
  // Cementerio Oriental (2 columnas x 4 filas = 8 mastabas nobles)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const mx = 0.258 + col * 0.025;
      const mz = -0.152 + row * 0.031;
      addMastaba(mx, height(mx, mz), mz, 0.017, 0.0095 + rng() * 0.003, 0.022, 0);
    }
  }

  // 7.5 Muelle Real del Nilo, Pilono Egipcio, 2 Obeliscos de Granito Rosa y Dromos de Esfinges
  {
    const QX = 0.222, QZ = 0.112, Q_YAW = -0.35;
    const Q = makeLocal(QX, 0.014, QZ, Q_YAW);
    // Plataforma y malecón del puerto real hundido hasta el lecho del río
    addSubBox(0.044, 0.042, 0.038, 6, 4, 6, Q(0.012, -0.017, 0), Q_YAW, limestoneCourseColor(0.014));
    // Escalinata descendiendo hacia el agua del Nilo
    for (let st = 0; st < 5; st++) {
      addSubBox(0.006, 0.004, 0.022, 1, 1, 3, Q(0.033 + st * 0.004, 0.002 - st * 0.0032, 0), Q_YAW, limestoneCourseColor());
    }
    // Pilono monumental de dos torres trapezoidales + dintel con disco solar alado
    addPylonTower(...Q(-0.005, 0, -0.012), 0.014, 0.032, 0.016, Q_YAW, limestoneCourseColor(0.014));
    addPylonTower(...Q(-0.005, 0, 0.012), 0.014, 0.032, 0.016, Q_YAW, limestoneCourseColor(0.014));
    addSubBox(0.010, 0.007, 0.014, 2, 2, 2, Q(-0.005, 0.020, 0), Q_YAW, turaCasingColor);
    addGeo(new THREE.SphereGeometry(0.003, 8, 6), 0xf2c84b, { p: Q(0.001, 0.020, 0), colorFn: electrumGoldColor });
    // Mástiles rojos de cedro con estandartes del pilono
    for (const sz of [-0.014, -0.009, 0.009, 0.014]) {
      addRod(Q(0.002, 0.002, sz), Q(0.002, 0.038, sz), 0.0012, 0x7c3e26, 5);
      addGeo(new THREE.BoxGeometry(0.002, 0.008, 0.0045), sz < 0 ? 0xb53428 : 0x1e5388, {
        p: Q(0.004, 0.033, sz), r: [0, Q_YAW, 0],
      });
    }
    // Dos Obeliscos de Granito Rosa con piramidión de electro
    for (const sz of [-0.020, 0.020]) {
      const obP = Q(0.009, 0, sz);
      addSubBox(0.009, 0.006, 0.009, 2, 1, 2, [obP[0], obP[1] + 0.002, obP[2]], Q_YAW, aswanGraniteColor);
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0036, 0.042, 4, 6), 0x9f5646, {
        p: [obP[0], obP[1] + 0.025, obP[2]], r: [0, Q_YAW + Math.PI / 4, 0], colorFn: aswanGraniteColor,
      });
      addGeo(new THREE.ConeGeometry(0.0026, 0.0075, 4), 0xf2c84b, {
        p: [obP[0], obP[1] + 0.049, obP[2]], r: [0, Q_YAW + Math.PI / 4, 0], colorFn: electrumGoldColor,
      });
      features.push({ type: 'sparkle', pos: [obP[0], obP[1] + 0.053, obP[2]], size: 0.010 });
      features.push({ type: 'flame', pos: Q(0.016, 0.005, sz * 0.72), size: 0.0022 });
    }
    // 4 pequeñas esfinges guardianas del dromos entre el Templo del Valle y el Muelle
    for (const side of [-1, 1]) {
      for (const sx of [-0.019, -0.032]) {
        const sp = Q(sx, 0.002, side * 0.011);
        addSubBox(0.009, 0.004, 0.005, 2, 1, 1, sp, Q_YAW, limestoneCourseColor());
        addSubBox(0.007, 0.005, 0.0036, 2, 1, 1, [sp[0], sp[1] + 0.004, sp[2]], Q_YAW, sphinxRockColor);
        addGeo(new THREE.SphereGeometry(0.0024, 7, 5), 0xdfc184, { p: [sp[0] + 0.0025, sp[1] + 0.0075, sp[2]], colorFn: sphinxRockColor });
      }
    }
  }

  // =====================================================================
  // 8. OASIS DE PALMERAS, FALÚAS DEL NILO, CAMELLOS Y CAMPAMENTO REAL
  // =====================================================================
  const addDatePalm = (x, z, sc = 1) => {
    const y = height(x, z) - 0.003;
    const tiltX = (rng() - 0.5) * 0.25, tiltZ = (rng() - 0.5) * 0.25;
    let px = x, py = y, pz = z;
    const segs = 6;
    const segH = 0.0055 * sc;
    for (let s = 0; s < segs; s++) {
      const r0 = (0.0024 - s * 0.00018) * sc;
      const r1 = (0.0021 - s * 0.00018) * sc;
      const dx = tiltX * 0.0025 * (s + 1) * sc;
      const dz = tiltZ * 0.0025 * (s + 1) * sc;
      addGeo(new THREE.CylinderGeometry(r1, r0, segH * 1.15, 6), s % 2 ? 0x6f4f32 : 0x5d4026, {
        p: [px + dx * 0.5, py + segH * 0.5, pz + dz * 0.5],
        r: [tiltZ * 0.14 * s, rng() * 0.5, -tiltX * 0.14 * s],
        amt: 0.05,
      });
      px += dx; py += segH * 0.92; pz += dz;
    }
    // Racimos de dátiles dorados bajo la corona
    addGeo(new THREE.SphereGeometry(0.0028 * sc, 6, 4), 0xc88d2c, { p: [px, py - 0.0015 * sc, pz] });
    // Corona de 9 frondas arqueadas de palma
    const nFronds = 9;
    for (let f = 0; f < nFronds; f++) {
      const a = (f / nFronds) * Math.PI * 2 + rng() * 0.3;
      const len = (0.015 + rng() * 0.005) * sc;
      const droop = 0.35 + (f % 2) * 0.25;
      const hx = px + Math.cos(a) * len * 0.55;
      const hy = py + 0.0035 * sc;
      const hz = pz + Math.sin(a) * len * 0.55;
      const frondHex = f % 3 === 0 ? 0x3b7229 : f % 3 === 1 ? 0x4b8733 : 0x5c963d;
      addGeo(new THREE.ConeGeometry(0.0028 * sc, len, 4, 2), frondHex, {
        p: [hx, hy, hz],
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, -Math.PI / 2 - droop, 'YXZ')),
        s: [1, 1, 0.32],
        amt: 0.055,
      });
    }
  };

  // Plantar 36 palmeras datileras y juncos de papiro a lo largo de la ribera fértil del Nilo
  let palms = 0;
  for (let tries = 0; palms < 36 && tries < 4000; tries++) {
    const x = 0.04 + rng() * 0.29;
    const z = -0.02 + rng() * 0.28;
    const r = Math.hypot(x - CX, z - CZ);
    const ang = Math.atan2(z - CZ, x - CX);
    if (r > rimRadius(ang) * 0.90) continue;
    const nd = nileDist(x, z);
    if (nd < NILE_W + 0.006 || nd > NILE_W + 0.042) continue;
    if (Math.hypot(x - 0.222, z - 0.112) < 0.038) continue; // despejar el Muelle Real
    if (Math.hypot(x - 0.172, z - 0.084) < 0.045) continue; // despejar el Templo del Valle
    const h = height(x, z);
    if (h < 0.003 || h > 0.028) continue;
    addDatePalm(x, z, 0.85 + rng() * 0.45);
    if (palms % 2 === 0) features.push({ type: 'firefly', pos: [x, h + 0.015, z], size: 0.018 });
    // Matas de papiro junto a la orilla
    if (nd < NILE_W + 0.016) {
      for (let j = 0; j < 4; j++) {
        const jx = x + (rng() - 0.5) * 0.012, jz = z + (rng() - 0.5) * 0.012;
        addRod([jx, h - 0.002, jz], [jx + (rng() - 0.5) * 0.004, h + 0.011, jz + (rng() - 0.5) * 0.004], 0.0008, 0x3b6c29, 4);
      }
    }
    palms++;
  }

  // 8.2 Dos Barcas Reales / Falúas Egipcias navegando en el Nilo
  const addFelucca = (fx, fz, yaw, sc = 1) => {
    const F = makeLocal(fx, 0.0, fz, yaw);
    for (let s = -5; s <= 5; s++) {
      const t = s / 5;
      const hullW = 0.0065 * sc * (1 - t * t * 0.78);
      addGeo(new THREE.BoxGeometry(hullW * 2, 0.0045 * sc, 0.0045 * sc), s % 2 ? 0x70492a : 0x5c3a1f, {
        p: F(0, 0.001 + t * t * 0.0035 * sc, t * 0.020 * sc),
        r: [t * 0.35, yaw, 0],
        colorFn: woodColor,
      });
    }
    // Proa y popa alzadas con flor de loto dorada
    for (const dir of [-1, 1]) {
      addBeam(...F(0, 0.004 * sc, dir * 0.020 * sc), ...F(0, 0.011 * sc, dir * 0.026 * sc), 0.002 * sc, 0.002 * sc, woodColor);
      addGeo(new THREE.SphereGeometry(0.0018 * sc, 6, 4), 0xe8b948, { p: F(0, 0.0115 * sc, dir * 0.026 * sc) });
    }
    // Camarote/toldo real iluminado y mástil con vela cuadrada de lino
    addSubBox(0.007 * sc, 0.0055 * sc, 0.009 * sc, 2, 2, 2, F(0, 0.0055 * sc, -0.005 * sc), yaw, () => jitter(0xc93b2b, 0.04));
    addRod(F(0, 0.002 * sc, 0.003 * sc), F(0, 0.029 * sc, 0.003 * sc), 0.001 * sc, 0x5c3a1f, 5);
    addRod(F(-0.011 * sc, 0.024 * sc, 0.004 * sc), F(0.011 * sc, 0.024 * sc, 0.004 * sc), 0.0009 * sc, 0x5c3a1f, 4);
    addGeo(new THREE.BoxGeometry(0.020 * sc, 0.015 * sc, 0.0024 * sc, 3, 3, 1), 0xf4ebd6, {
      p: F(0, 0.017 * sc, 0.005 * sc), r: [0.10, yaw, 0], colorFn: turaCasingColor,
    });
    features.push({ type: 'window', pos: F(0, 0.006 * sc, -0.0102 * sc), yaw: yaw + Math.PI, w: 0.0045 * sc, h: 0.0035 * sc });
    features.push({ type: 'sparkle', pos: F(0, 0.001, 0.024 * sc), size: 0.009 });
  };
  addFelucca(0.285, 0.072, -0.45, 1.0);
  addFelucca(0.232, 0.172, -0.82, 0.92);

  // 8.3 Destellos adicionales sobre la superficie del agua del Nilo
  for (let i = 0; i < 42; i++) {
    const t = i / 41;
    const seg = Math.min(NILE_PTS.length - 2, Math.floor(t * (NILE_PTS.length - 1)));
    const lt = t * (NILE_PTS.length - 1) - seg;
    const px = NILE_PTS[seg][0] + (NILE_PTS[seg + 1][0] - NILE_PTS[seg][0]) * lt + (rng() - 0.5) * 0.032;
    const pz = NILE_PTS[seg][1] + (NILE_PTS[seg + 1][1] - NILE_PTS[seg][1]) * lt + (rng() - 0.5) * 0.032;
    if (Math.hypot(px - CX, pz - CZ) < rimRadius(Math.atan2(pz - CZ, px - CX)) * 0.93 && height(px, pz) < -0.001) {
      features.push({ type: 'sparkle', pos: [px, 0.002, pz], size: 0.009 });
    }
  }

  // 8.4 Caravana de 5 Camellos cruzando las dunas del sur
  const addCamel = (cx, cz, yaw, sc = 1) => {
    const cy = height(cx, cz);
    const C = makeLocal(cx, cy, cz, yaw);
    // 4 patas hundidas levemente en la arena
    for (const lx of [-0.0024, 0.0024]) {
      for (const lz of [-0.0038, 0.0038]) {
        addRod(C(lx * sc, -0.002 * sc, lz * sc), C(lx * sc, 0.0072 * sc, lz * sc), 0.0009 * sc, 0xb88f54, 5);
      }
    }
    // Cuerpo, joroba, alforjas de colores y cuello curvo + cabeza
    addGeo(new THREE.SphereGeometry(0.0044 * sc, 8, 6), 0xc59a5c, {
      p: C(0, 0.0085 * sc, 0), r: [0, yaw, 0], s: [0.78, 0.85, 1.35], amt: 0.05,
    });
    addGeo(new THREE.SphereGeometry(0.0032 * sc, 7, 5), 0xb88c4e, {
      p: C(0, 0.0122 * sc, -0.0008 * sc), r: [0, yaw, 0], s: [0.85, 1.05, 0.95], amt: 0.05,
    });
    for (const sx of [-0.0036, 0.0036]) {
      addGeo(new THREE.BoxGeometry(0.0022 * sc, 0.0032 * sc, 0.0042 * sc), sx < 0 ? 0xa63a2b : 0x2a5c8a, {
        p: C(sx * sc, 0.0095 * sc, -0.0005 * sc), r: [0, yaw, 0],
      });
    }
    addBeam(...C(0, 0.0095 * sc, 0.0048 * sc), ...C(0, 0.0145 * sc, 0.0095 * sc), 0.0022 * sc, 0.0022 * sc, 0xc59a5c);
    addGeo(new THREE.SphereGeometry(0.0021 * sc, 7, 5), 0xb88c4e, {
      p: C(0, 0.0155 * sc, 0.0108 * sc), r: [0, yaw, 0], s: [0.85, 0.78, 1.25], amt: 0.05,
    });
  };
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const cx = -0.102 + t * 0.072 + Math.sin(i * 1.4) * 0.005;
    const cz = 0.205 - t * 0.038;
    addCamel(cx, cz, 1.08 + (rng() - 0.5) * 0.16, 0.92 + rng() * 0.16);
  }

  // 8.5 Campamento de Constructores / Expedición Real en la explanada sur
  {
    const EX = 0.015, EY = 0.022, EZ = 0.175;
    // Dos tiendas de campaña con toldo rayado y postes
    for (const [tx, tz, yaw, colA, colB] of [
      [EX - 0.018, EZ - 0.005, 0.25, 0xe8d9bc, 0x9c3428],
      [EX + 0.018, EZ + 0.004, -0.45, 0xe8d9bc, 0x24517a],
    ]) {
      const T = makeLocal(tx, EY, tz, yaw);
      addSubBox(0.018, 0.008, 0.018, 3, 2, 3, T(0, 0.003, 0), yaw, (va) => jitter(((Math.floor(va.x * 400) + Math.floor(va.z * 400)) & 1) ? colA : colB, 0.04));
      addGeo(new THREE.ConeGeometry(0.014, 0.010, 4, 2), colB, {
        p: T(0, 0.0115, 0), r: [0, yaw + Math.PI / 4, 0],
        colorFn: (va, vb, vc) => jitter(((Math.floor((va.x + va.z) * 500)) & 1) ? colA : colB, 0.04),
      });
      features.push({ type: 'city', pos: T(0, 0.006, 0.0105), size: 0.009 });
    }
    // Hoguera central del campamento con llama y humo
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      addRod([EX + Math.cos(a) * 0.005, EY, EZ + Math.sin(a) * 0.005], [EX - Math.cos(a) * 0.005, EY + 0.002, EZ - Math.sin(a) * 0.005], 0.0009, 0x5c3a1f, 4);
    }
    features.push({ type: 'flame', pos: [EX, EY + 0.0025, EZ], size: 0.0036 });
    features.push({ type: 'smoke', pos: [EX, EY + 0.007, EZ], size: 0.006, color: 0xddd6cc });

    // Trineos de madera transportando bloques de caliza tallados + ánforas
    for (const [sx, sz, yaw] of [[EX + 0.006, EZ - 0.017, 0.85], [EX - 0.022, EZ + 0.014, 0.5]]) {
      const S = makeLocal(sx, EY, sz, yaw);
      addSubBox(0.012, 0.002, 0.007, 2, 1, 1, S(0, 0.001, 0), yaw, woodColor);
      addSubBox(0.0085, 0.006, 0.0055, 2, 2, 2, S(0, 0.0045, 0), yaw, limestoneCourseColor(EY));
    }
    for (let a = 0; a < 5; a++) {
      const ax = EX - 0.006 + rng() * 0.014, az = EZ + 0.012 + rng() * 0.008;
      addGeo(new THREE.CylinderGeometry(0.0016, 0.0022, 0.0048, 7), 0xa8583b, { p: [ax, EY + 0.002, az] });
    }
  }

  // 8.6 Braseros ceremoniales de bronce con llamas nocturnas alrededor de las pirámides y necrópolis
  const addBrazier = (bx, bz, flameSize = 0.0030) => {
    const by = height(bx, bz);
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0030, 0.0065, 7), 0x8c4738, { p: [bx, by + 0.002, bz], colorFn: aswanGraniteColor });
    addGeo(new THREE.CylinderGeometry(0.0038, 0.0018, 0.0032, 8), 0x3b2c1d, { p: [bx, by + 0.0055, bz] });
    addGeo(new THREE.SphereGeometry(0.0024, 7, 5), 0xe6681c, { p: [bx, by + 0.0068, bz], s: [1, 0.5, 1] });
    features.push({ type: 'flame', pos: [bx, by + 0.0072, bz], size: flameSize });
  };
  for (const [bx, bz] of [
    [KX - 0.025, KZ - K_HALF - 0.010], [KX + 0.025, KZ - K_HALF - 0.010], // Entrada Norte de Keops
    [KX - 0.044, KZ + K_HALF + 0.015], [KX + 0.044, KZ + K_HALF + 0.015], // Barca Solar de Keops
    [FX - 0.055, FZ + F_HALF + 0.012], [FX + 0.055, FZ + F_HALF + 0.012], // Frente Sur de Kefrén
    [FX - F_HALF - 0.012, FZ - 0.032], [FX - F_HALF - 0.012, FZ + 0.032], // Lado Oeste de Kefrén
    [MX - 0.024, MZ - M_HALF - 0.010], [MX + 0.024, MZ - M_HALF - 0.010], // Entrada Norte de Micerino
    [MX + M_HALF + 0.012, MZ + 0.032],                                    // Sur-Este de Micerino
    [-0.195, -0.072], [-0.140, -0.072], [-0.085, -0.072],                 // Avenida del Cementerio Occidental
    [-0.195, -0.132], [-0.085, -0.132],                                   // Interior Cementerio Occidental
  ]) {
    addBrazier(bx, bz, 0.0032);
  }
  // Faroles de paso nocturno junto a la caravana de camellos
  for (const [lx, lz] of [[-0.105, 0.215], [-0.055, 0.190], [-0.018, 0.165]]) {
    features.push({ type: 'city', pos: [lx, height(lx, lz) + 0.008, lz], size: 0.010 });
  }

  // 8.6 Afloramientos rocosos de caliza en los escarpes del desierto
  for (let i = 0, tries = 0; i < 45 && tries < 1200; tries++) {
    const x = (rng() - 0.5) * 0.62, z = (rng() - 0.5) * 0.50;
    const r = Math.hypot(x - CX, z - CZ);
    const ang = Math.atan2(z - CZ, x - CX);
    if (r > rimRadius(ang) * 0.88) continue;
    if (nileDist(x, z) < NILE_W + 0.015) continue;
    if (EXPLANADAS.some((p) => rectDist(x, z, p) < 0.016)) continue;
    if (Math.hypot(x - 0.095, z - 0.068) < 0.065) continue;
    const h = height(x, z);
    if (h < 0.010) continue;
    const sc = 0.0045 + rng() * 0.0055;
    addGeo(displaceGeo(new THREE.IcosahedronGeometry(sc, 0), sc * 0.15), rng() < 0.5 ? 0xc29e61 : 0xb38e52, {
      p: [x, h - sc * 0.25, z],
      r: [rng() * 0.4, rng() * 6.28, rng() * 0.4],
      s: [1.3, 0.65, 1.1],
      amt: 0.065,
    });
    i++;
  }

  // =====================================================================
  // 9. EFECTOS VIVOS EN EL CIELO DE GUIZA
  // =====================================================================
  const cloudRing = [
    [-0.22, 0.22, -0.14, 0.016],
    [0.21, 0.24, -0.12, 0.017],
    [0.01, 0.27, -0.21, 0.015],
    [0.20, 0.21, 0.14, 0.016],
    [-0.19, 0.23, 0.15, 0.015],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0, cy, 0], size: cs });
  }
  features.push({ type: 'gulls', pos: [0.02, 0.21, -0.02], size: 0.12 });

  void stats;
  return finish('Las Pirámides de Egipto');
}
