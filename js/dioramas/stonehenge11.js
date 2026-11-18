// Diorama "Stonehenge 1:1" — Levantamiento Arqueológico a Escala Real 1:1 (~182k triángulos)
// Escala métrica uniforme en los tres ejes (M = 0.0040 unidades = 1,00 metro real; plato de 165 m × 165 m):
//   Recinto de tierra exacto: Terraplén interior (Ø 99 m, +1,8 m), Foso anular excavado (Ø 109 m, -1,8 m) y Contratrinchera (Ø 117 m),
//   Anillo de 56 Pozos de Aubrey (Ø 86,6 m), anillos Y & Z Holes (Ø 41 m y 50 m),
//   4 Piedras de las Estaciones (Stones 91, 93 y túmulos North/South Barrow 92, 94), Piedra del Sacrificio (Stone 95),
//   Avenida Procesional del Solsticio y Piedra Talón (Heel Stone 96 a 77,4 m del centro, 4,7 m de alto),
//   Círculo Exterior de Sarsen (Ø 30,0 m, pilares 4,1 m + dinteles 0,8 m = 4,9 m reales; estado piedra a piedra 1–30 con 6 dinteles in situ),
//   Herradura de los 5 Grandes Trilitones (Ø 14,5 m; 51–52 a 6,0 m, 53–54 y 57–58 a 6,6 m, Stone 56 a 6,5 m con 55 y L156 caídos sobre el Altar),
//   Círculo Exterior (Ø 23,5 m) y Herradura Interior (Ø 11,2 m) de Piedras Azules de Preseli + Piedra del Altar (Stone 80).
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildStonehenge11(seed = 213) {
  const { rng, fbm, features, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  // =====================================================================
  // 1. ESCALA MÉTRICA REAL 1:1 Y PALETA GEOLÓGICA DE WILTSHIRE
  // =====================================================================
  const M = 0.0040; // 1,00 m real = 0,0040 unidades en X, Y y Z

  const sarsenStoneColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 42 + 1.7, cz * 42 + 6.3);
    const strata = Math.floor((cy * 360 * scale) + n * 2.4) & 3;
    const pal = [0x9f9889, 0x8e8779, 0xada697, 0x7f796c];
    let hex = pal[strata];
    const lichen = fbm(cx * 75 + cy * 35, cz * 75 - cy * 30);
    if (lichen > 0.67 && (yFloor < -0.5 || cy > yFloor + 1.1 * M)) {
      hex = lichen > 0.76 ? 0xb5a664 : 0x7c865b;
    }
    if (yFloor > -0.5 && cy - yFloor < 0.7 * M) {
      hex = ((Math.floor(cx * 260) + Math.floor(cz * 260)) & 1) ? 0x626956 : 0x6e6a5d;
    }
    return jitter(hex, 0.036);
  };

  const preseliBluestoneColor = (yFloor = -1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const q = ((Math.floor(cx * 420) * 73856093) ^ (Math.floor(cy * 420) * 19349663) ^ (Math.floor(cz * 420) * 83492791)) & 15;
    if (q === 0) return jitter(0xb8c0c4, 0.03);
    const pal = [0x4c5d6b, 0x3e4d59, 0x5c6d7a, 0x35434e];
    let hex = pal[q & 3];
    if (yFloor > -0.5 && cy - yFloor < 0.45 * M && (q & 1)) hex = 0x3a483c;
    return jitter(hex, 0.035);
  };

  const altarSandstoneColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const band = Math.floor((cx * 180 + cz * 180 + cy * 120)) & 3;
    const pal = [0x606b60, 0x525d52, 0x6f796c, 0x485249];
    return jitter(pal[band], 0.032);
  };

  const chalkStrataColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const flintBand = Math.floor(cy * 170 + fbm(cx * 38, cz * 38) * 1.4) & 7;
    if (flintBand === 3) return jitter(0x4b4e4c, 0.04);
    const pal = [0xf2efe6, 0xe6e1d3, 0xd8d2c1, 0xebe7da];
    return jitter(pal[flintBand & 3], 0.025);
  };

  const turfColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 36 + 4, cz * 36 + 7);
    const pal = [0x4c7e35, 0x5c903e, 0x406e2d, 0x679947];
    return jitter(pal[Math.floor(n * 4) & 3], 0.048);
  };

  const displaceGeo = (geo, amp = 0.00024, yScale = 0.55) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const qx = Math.round(x * 3000), qy = Math.round(y * 3000), qz = Math.round(z * 3000);
      let h = (qx * 374761393 + qy * 668265263 + qz * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const n1 = ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
      h = Math.imul(h ^ (h >>> 11), 668265263);
      const n2 = ((h ^ (h >>> 15)) >>> 0) / 4294967296 - 0.5;
      h = Math.imul(h ^ (h >>> 9), 1597334677);
      const n3 = ((h ^ (h >>> 14)) >>> 0) / 4294967296 - 0.5;
      p.setXYZ(i, x + n1 * amp, y + n2 * amp * yScale, z + n3 * amp);
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

  const _bx = new Array(8).fill(null).map(() => new THREE.Vector3());
  const addBoxDirect = (cx, cy, cz, w, h, d, colorOrFn, amt = 0.032, jitterV = 0, rotY = 0) => {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const jv = () => (jitterV ? (rng() - 0.5) * jitterV : 0);
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const setV = (idx, lx, ly, lz) => {
      const px = lx + jv(), pz = lz + jv();
      _bx[idx].set(cx + px * c + pz * s, cy + ly, cz - px * s + pz * c);
    };
    setV(0, -hw, -hh, -hd); setV(1, hw, -hh, -hd);
    setV(2, hw, -hh, hd); setV(3, -hw, -hh, hd);
    setV(4, -hw, hh, -hd); setV(5, hw, hh, -hd);
    setV(6, hw, hh, hd); setV(7, -hw, hh, hd);
    _pc.set(cx, cy, cz);
    const faces = [
      [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
      [4, 5, 6, 7], [3, 2, 1, 0],
    ];
    for (const [i0, i1, i2, i3] of faces) {
      const a = _bx[i0], b = _bx[i1], k = _bx[i2], e = _bx[i3];
      _fc.copy(a).add(b).add(k).add(e).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(a, b, k, e, colorOrFn, _wn, amt);
    }
  };

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
    addPrism(bot, top, colorOrFn, true, 0.028);
  };

  // =====================================================================
  // 3. TOPOGRAFÍA REAL 1:1 DE SALISBURY (165 m × 165 m) Y RECINTO HENGE
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.330, AZ = 0.330; // 165 m × 165 m reales
  const FLOOR = -12.0 * M; // -0.048 (-12 m de corte geológico de creta y sílex)
  const HX = -9.0 * M;     // -0.036
  const HZ = 6.25 * M;     // +0.025
  const Y_HENGE = 8.0 * M; // +0.032
  const ANG_AXIS = -0.62;  // Eje Noreste del Solsticio de Verano (+X, -Z)

  // Radios arqueológicos reales (en metros * M)
  const R_SARSEN = 15.0 * M;     // 0.0600 (Ø 30,0 m)
  const R_BLUE_OUT = 11.75 * M;  // 0.0470 (Ø 23,5 m)
  const R_TRILITHON = 7.25 * M;  // 0.0290 (Ø 14,5 m)
  const R_BLUE_IN = 5.60 * M;    // 0.0224 (Ø 11,2 m)
  const R_YHOLES = 20.5 * M;     // 0.0820 (Ø 41,0 m)
  const R_ZHOLES = 25.0 * M;     // 0.1000 (Ø 50,0 m)
  const R_AUBREY = 43.3 * M;     // 0.1732 (Ø 86,6 m)
  const R_STATION = 44.2 * M;    // 0.1768 (Ø 88,4 m)
  const R_BANK = 49.5 * M;       // 0.1980 (Ø 99,0 m)
  const R_DITCH = 54.5 * M;      // 0.2180 (Ø 109,0 m)
  const R_COUNTER = 58.5 * M;    // 0.2340 (Ø 117,0 m)
  const HEEL_R = 77.4 * M;       // 0.3096 (Piedra Talón a 77,4 m reales)

  const HEEL_X = HX + Math.cos(ANG_AXIS) * HEEL_R;
  const HEEL_Z = HZ + Math.sin(ANG_AXIS) * HEEL_R;

  // Coordenadas de los 4 vértices del Rectángulo de las Estaciones (91–94)
  const STATION_ANGLES = [
    ANG_AXIS + 1.04,             // Stone 91 (ESE)
    ANG_AXIS + Math.PI - 1.04,   // South Barrow 92 (SSE)
    ANG_AXIS + Math.PI + 1.04,   // Stone 93 (ONO)
    ANG_AXIS - 1.04,             // North Barrow 94 (NNO)
  ];
  const SOUTH_BARROW_X = HX + Math.cos(STATION_ANGLES[1]) * R_STATION;
  const SOUTH_BARROW_Z = HZ + Math.sin(STATION_ANGLES[1]) * R_STATION;
  const NORTH_BARROW_X = HX + Math.cos(STATION_ANGLES[3]) * R_STATION;
  const NORTH_BARROW_Z = HZ + Math.sin(STATION_ANGLES[3]) * R_STATION;

  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 4.0) + Math.pow(Math.abs(s) / AZ, 4.0), 1 / 4.0);
  };

  const angleDiff = (a, b) => {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  // Distancia perpendicular y longitudinal al eje recto de la Avenida Procesional
  const aveFrame = (x, z) => {
    const dx = x - HX, dz = z - HZ;
    const ca = Math.cos(ANG_AXIS), sa = Math.sin(ANG_AXIS);
    return { along: dx * ca + dz * sa, perp: Math.abs(-dx * sa + dz * ca) };
  };

  // Relieve del terraplén interior, foso anular excavado, contratrinchera, fosos de barrows/Heel y Avenida
  const hengeEarthworkOffset = (x, z) => {
    const dx = x - HX, dz = z - HZ;
    const r = Math.hypot(dx, dz);
    let off = 0;

    if (r >= 44.5 * M && r <= 65.0 * M) {
      const ang = Math.atan2(dz, dx);
      // Entradas Noreste (11,0 m => ±0.16 rad) y Sur (4,5 m => ±0.08 rad)
      const gapNE = smooth(Math.abs(angleDiff(ang, ANG_AXIS)) / 0.16);
      const gapS = smooth(Math.abs(angleDiff(ang, 1.65)) / 0.08);
      const gateMask = gapNE * gapS;

      const innerBank = (1.8 * M) * Math.exp(-Math.pow((r - R_BANK) / (3.0 * M), 2));
      const ditch = -(1.8 * M) * Math.exp(-Math.pow((r - R_DITCH) / (3.0 * M), 2));
      const counterscarp = (0.8 * M) * Math.exp(-Math.pow((r - R_COUNTER) / (2.6 * M), 2));
      off += (innerBank + ditch + counterscarp) * gateMask;
    }

    // Fosos anulares de North Barrow (94) y South Barrow (92) de Ø 11,0 m (R = 5,5 m)
    for (const [bx, bz] of [[SOUTH_BARROW_X, SOUTH_BARROW_Z], [NORTH_BARROW_X, NORTH_BARROW_Z]]) {
      const db = Math.hypot(x - bx, z - bz);
      if (db < 8.5 * M) {
        const mound = (0.55 * M) * Math.exp(-Math.pow(db / (3.4 * M), 2));
        const bDitch = -(0.65 * M) * Math.exp(-Math.pow((db - 5.5 * M) / (1.2 * M), 2));
        off += mound + bDitch;
      }
    }

    // Foso circular de la Piedra Talón (R = 4,8 m reales)
    const dh = Math.hypot(x - HEEL_X, z - HEEL_Z);
    if (dh < 7.5 * M) {
      off -= (0.65 * M) * Math.exp(-Math.pow((dh - 4.8 * M) / (1.1 * M), 2));
    }

    // La Avenida Procesional recta desde R = 52 m hacia el borde Noreste
    const { along, perp } = aveFrame(x, z);
    if (along >= 50.0 * M && perp < 16.0 * M) {
      const fade = smooth((along - 50.0 * M) / (4.0 * M));
      // Terraplenes internos a ±7,25 m (separación 14,5 m) y fosos externos a ±10,75 m (separación 21,5 m)
      const aveBank = (0.65 * M) * Math.exp(-Math.pow((perp - 7.25 * M) / (1.35 * M), 2));
      const aveDitch = -(0.55 * M) * Math.exp(-Math.pow((perp - 10.75 * M) / (1.25 * M), 2));
      off += (aveBank + aveDitch) * fade;
    }

    return off;
  };

  const rawHeight = (x, z) => {
    // Suave domo calcáreo de la Llanura de Salisbury descendiendo suavemente desde el Henge
    const rNorm = Math.hypot((x - HX) / (75.0 * M), (z - HZ) / (75.0 * M));
    const dome = (3.4 * M) * Math.pow(smooth(1.15 - rNorm * 0.72), 1.05);
    const undulation = (fbm(x * 13 + 3.1, z * 13 + 8.4) - 0.5) * (1.5 * M) +
                       (fbm(x * 32 + 9.2, z * 32 + 1.9) - 0.5) * (0.45 * M);
    return (4.6 * M) + dome + undulation;
  };

  const height = (x, z) => {
    let h = rawHeight(x, z);
    // Explanada interior nivelada suavemente dentro de R = 44,5 m
    const dH = Math.hypot(x - HX, z - HZ);
    const k = smooth((47.5 * M - dH) / (4.5 * M));
    h += (Y_HENGE - h) * k;
    h += hengeEarthworkOffset(x, z);
    return h;
  };

  const slopeAt = (x, z) =>
    Math.hypot(height(x + 0.004, z) - height(x - 0.004, z), height(x, z + 0.004) - height(x, z - 0.004)) / 0.008;

  // Malla polar de alta resolución (K = 126, S = 328 -> ~82.328 triángulos en superficie)
  const K = 126, S = 328;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = height(x, z);
      row.push({ v: new THREE.Vector3(x, h, z), h });
    }
    ringPts.push(row);
  }

  const nrm = new THREE.Vector3();
  function terrainColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    const h = (a.h + b.h + c.h) / 3;
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);

    const rH = Math.hypot(cx - HX, cz - HZ);
    const ang = Math.atan2(cz - HZ, cx - HX);

    // 1. Creta blanca expuesta en las escarpas del Foso anular, Barrows y foso de la Piedra Talón
    if (rH > R_BANK + 2.2 * M && rH < R_COUNTER - 1.0 * M) {
      const inGate = Math.abs(angleDiff(ang, ANG_AXIS)) < 0.14 || Math.abs(angleDiff(ang, 1.65)) < 0.07;
      if (!inGate && (slope > 0.09 || h < Y_HENGE - 0.8 * M)) {
        const pal = [0xebe7da, 0xddd7c6, 0xf2efe6, 0xa2aa84];
        const idx = slope > 0.14 ? ((Math.floor(cx * 210) ^ Math.floor(cz * 210)) & 2) : 3;
        return jitter(pal[idx], 0.030);
      }
    }
    const dh = Math.hypot(cx - HEEL_X, cz - HEEL_Z);
    if (dh > 3.6 * M && dh < 6.0 * M && (slope > 0.08 || h < height(HEEL_X, HEEL_Z) - 0.25 * M)) {
      return jitter(0xe3ded0, 0.032);
    }

    // 2. Calzada ceremonial de la Avenida Procesional y sus fosos calcáreos
    const { along, perp } = aveFrame(cx, cz);
    if (along >= 51.0 * M && perp < 12.2 * M) {
      if (perp > 9.6 * M && perp < 11.8 * M && slope > 0.07) {
        return jitter(0xded9c9, 0.034);
      }
      if (perp < 5.2 * M) {
        const pal = [0x6f8b42, 0x7e944e, 0x627f3b, 0x869a55];
        return jitter(pal[(Math.floor(cx * 180) ^ Math.floor(cz * 180)) & 3], 0.042);
      }
    }

    // 3. Huellas arqueológicas sutiles del césped en Y Holes, Z Holes y sendero del Solsticio
    if (rH < 45.0 * M) {
      if (along > -4.0 * M && along < 52.0 * M && perp < 2.2 * M) {
        return jitter(fbm(cx * 55, cz * 55) > 0.5 ? 0x6c8d45 : 0x5d803c, 0.038);
      }
      if (Math.abs(rH - R_YHOLES) < 1.1 * M || Math.abs(rH - R_ZHOLES) < 1.1 * M) {
        const ringTone = fbm(cx * 65, cz * 65);
        if (ringTone > 0.54) return jitter(0x638f43, 0.042);
      }
      const n = fbm(cx * 44 + 2.5, cz * 44 + 7.1);
      const pal = [0x4f8137, 0x5c8f3f, 0x457530, 0x669748];
      return jitter(pal[Math.floor(n * 4) & 3], 0.044);
    }

    // 4. Pradera ondulada exterior de Salisbury (con bandas sutiles de hierba y trébol)
    const n = fbm(cx * 28 + 3, cz * 28 + 8);
    const wave = Math.sin(cx * 46 - cz * 34 + n * 3.0);
    if (slope > 0.16) return jitter(0x888b6d, 0.045);
    const pal = [0x467632, 0x53843a, 0x3b6529, 0x629044];
    return jitter(pal[Math.floor(n * 3 + (wave > 0.35 ? 1 : 0)) & 3], 0.052);
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

  // Zócalo geológico estratificado de creta blanca de Wiltshire y veta de sílex (~8.856 triángulos)
  const rim = ringPts[K];
  const radial = new THREE.Vector3();
  const Y_SOIL = 2.0 * M;    // +0.008
  const Y_CHALK1 = -3.0 * M; // -0.012
  const Y_FLINT = -5.0 * M;  // -0.020
  const Y_CHALK2 = -8.8 * M; // -0.0352
  const botRings = 10;
  const botRingPts = [];
  for (let br = 0; br <= botRings; br++) {
    const t = br / botRings;
    const row = [];
    for (let s = 0; s < S; s++) {
      const a = rim[s].v;
      row.push(new THREE.Vector3(CX + (a.x - CX) * 0.976 * t, FLOOR, CZ + (a.z - CZ) * 0.976 * t));
    }
    botRingPts.push(row);
  }
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  for (let s = 0; s < S; s++) {
    const a = rim[s].v, b = rim[(s + 1) % S].v;
    const a1 = new THREE.Vector3(CX + (a.x - CX) * 1.003, Y_SOIL, CZ + (a.z - CZ) * 1.003);
    const b1 = new THREE.Vector3(CX + (b.x - CX) * 1.003, Y_SOIL, CZ + (b.z - CZ) * 1.003);
    const a2 = new THREE.Vector3(CX + (a.x - CX) * 0.999, Y_CHALK1, CZ + (a.z - CZ) * 0.999);
    const b2 = new THREE.Vector3(CX + (b.x - CX) * 0.999, Y_CHALK1, CZ + (b.z - CZ) * 0.999);
    const a3 = new THREE.Vector3(CX + (a.x - CX) * 0.995, Y_FLINT, CZ + (a.z - CZ) * 0.995);
    const b3 = new THREE.Vector3(CX + (b.x - CX) * 0.995, Y_FLINT, CZ + (b.z - CZ) * 0.995);
    const a4 = new THREE.Vector3(CX + (a.x - CX) * 0.989, Y_CHALK2, CZ + (a.z - CZ) * 0.989);
    const b4 = new THREE.Vector3(CX + (b.x - CX) * 0.989, Y_CHALK2, CZ + (b.z - CZ) * 0.989);
    const a5 = botRingPts[botRings][s];
    const b5 = botRingPts[botRings][(s + 1) % S];
    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    const soilPal = [0x584b38, 0x524634, 0x5f513d, 0x4b402f];
    const chalkPal1 = [0xede9dc, 0xe4dfd0, 0xf2efe4, 0xdcd6c6];
    const chalkPal2 = [0xd8d2c1, 0xcfc8b6, 0xe0dacb, 0xc6bfa9];
    const flintPal = [0x5b5d5a, 0x505350, 0x646662, 0x474946];
    const nCol = Math.floor(fbm(a.x * 22 + 3, a.z * 22 + 7) * 4) & 3;
    addQuad(a, b, b1, a1, soilPal[nCol], radial, 0.024);
    addQuad(a1, b1, b2, a2, chalkPal1[nCol], radial, 0.022);
    addQuad(a2, b2, b3, a3, flintPal[(nCol + 1) & 3], radial, 0.022);
    addQuad(a3, b3, b4, a4, chalkPal2[nCol], radial, 0.022);
    addQuad(a4, b4, b5, a5, 0x414442, radial, 0.020);
  }
  for (let br = 0; br < botRings; br++) {
    const A = botRingPts[br], B = botRingPts[br + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      const botHex = (br + (s >> 3)) & 1 ? 0x484b49 : 0x3d403e;
      if (br === 0) addTri(centerBottom, B[s], B[s1], jitter(botHex, 0.025), DOWN);
      else addQuad(A[s], A[s1], B[s1], B[s], jitter(botHex, 0.025), DOWN, 0.025);
    }
  }

  // =====================================================================
  // 4. CONSTRUCTORES MEGALÍTICOS A ESCALA REAL 1:1
  // =====================================================================
  const addTenon = (x, y, z, r = 0.25 * M, h = 0.35 * M, fn = sarsenStoneColor(y)) => {
    addGeo(displaceGeo(new THREE.SphereGeometry(r, 8, 5), 0.00006), 0x9b9485, {
      p: [x, y + h * 0.4, z], s: [1, h / r, 1], colorFn: fn,
    });
  };

  // Ortostato anclado desde su base enterrada para que cualquier inclinación sea sólida
  const placeAnchoredStone = (x, z, yGround, w, h, d, yaw, {
    tiltR = 0, tiltT = 0, sink = 1.8 * M, sx = 8, sy = 18, sz = 6,
    amp = 0.00024, taper = 0.08, fn = null, grooves = true,
  } = {}) => {
    const colorFn = fn || sarsenStoneColor(yGround);
    const totalH = h + sink;
    const g = new THREE.BoxGeometry(w, totalH, d, sx, sy, sz);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const ly = pos.getY(i) + totalH * 0.5 - sink;
      const t = Math.max(0, ly / Math.max(h, 1e-6));
      const f = 1 - taper * t * t;
      pos.setX(i, pos.getX(i) * f);
      pos.setZ(i, pos.getZ(i) * (1 - taper * 0.45 * t));
    }
    displaceGeo(g, amp);
    const pivotY = yGround - sink;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltR, yaw, tiltT, 'YXZ'));
    const centerLocal = new THREE.Vector3(0, totalH * 0.5, 0).applyQuaternion(q);
    addGeo(g, 0x9b9485, {
      p: [x + centerLocal.x, pivotY + centerLocal.y, z + centerLocal.z],
      q,
      colorFn,
    });

    // Cuello de encastre en el suelo
    addGeo(displaceGeo(new THREE.CylinderGeometry(w * 0.58, w * 0.72, 0.4 * M, 8), 0.00018), 0x626b4b, {
      p: [x, yGround - 0.08 * M, z], r: [0, yaw, 0], s: [1, 1, (d * 1.25) / w], colorFn: turfColor,
    });

    if (grooves) {
      for (let gIdx = 0; gIdx < 3; gIdx++) {
        const gy = yGround + h * (0.24 + gIdx * 0.26);
        const side = gIdx % 2 === 0 ? 1 : -1;
        const off = new THREE.Vector3((rng() - 0.5) * w * 0.22, gy - pivotY, side * d * 0.48).applyQuaternion(q);
        addBoxDirect(
          x + off.x, pivotY + off.y, z + off.z,
          w * (0.28 + rng() * 0.16), h * 0.12, 0.14 * M,
          colorFn, 0.038, 0.0001, yaw
        );
      }
    }
  };

  // Piedra caída apoyada firmemente sobre el césped (sin huecos por debajo)
  const placeFallenStone = (x, z, w, len, thick, yaw, {
    sx = 6, sy = 12, sz = 4, amp = 0.00024, fn = null, mortises = false, yOffset = 0,
  } = {}) => {
    const yg = height(x, z) + yOffset;
    const colorFn = fn || sarsenStoneColor(yg);
    const cy = yg + thick * 0.18;
    const pitch = (rng() - 0.5) * 0.03;
    const roll = (rng() - 0.5) * 0.035;
    const g = displaceGeo(new THREE.BoxGeometry(w, thick, len, sx, sz, sy), amp);
    addGeo(g, 0x9b9485, { p: [x, cy, z], r: [pitch, yaw, roll], colorFn });
    if (yOffset === 0) {
      addGeo(displaceGeo(new THREE.BoxGeometry(w * 1.18, 0.35 * M, len * 1.04, 3, 1, 5), 0.0002), 0x5c7c39, {
        p: [x, yg - 0.08 * M, z], r: [0, yaw, 0], colorFn: turfColor,
      });
    }
    if (mortises) {
      for (const sgn of [-1, 1]) {
        const mx = x + Math.sin(yaw) * len * 0.28 * sgn;
        const mz = z + Math.cos(yaw) * len * 0.28 * sgn;
        addGeo(new THREE.TorusGeometry(0.28 * M, 0.09 * M, 5, 10), 0x625d52, {
          p: [mx, cy + thick * 0.50, mz], r: [Math.PI * 0.5, 0, 0], colorFn,
        });
      }
    }
  };

  // Dintel curvo subdividido del Círculo Exterior de Sarsen
  const buildCurvedLintel = (rMid, ang0, ang1, yBot, thick, widthRad, fn, {
    segsU = 16, segsV = 5, segsH = 4,
  } = {}) => {
    const span = angleDiff(ang1, ang0);
    const angPad = 0.012;
    const aStart = ang0 - Math.sign(span) * angPad;
    const aEnd = ang1 + Math.sign(span) * angPad;
    const rings = [];
    const buildProfile = (uFrac) => {
      const a = aStart + (aEnd - aStart) * uFrac;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pts = [];
      const hw = widthRad * 0.5;
      for (let i = 0; i <= segsV; i++) {
        const f = -1 + (2 * i) / segsV;
        const r = rMid + f * hw;
        const bevel = Math.abs(f) > 0.85 ? -0.09 * M : 0;
        const jr = (fbm(a * 16 + i * 2.1, uFrac * 8) - 0.5) * 0.10 * M;
        pts.push(new THREE.Vector3(HX + ca * (r + jr), yBot + thick + bevel + jr * 0.4, HZ + sa * (r + jr)));
      }
      for (let j = 1; j <= segsH; j++) {
        const f = 1 - j / segsH;
        const r = rMid + hw;
        const jr = (fbm(a * 16 + j * 3.1, uFrac * 8 + 4) - 0.5) * 0.09 * M;
        pts.push(new THREE.Vector3(HX + ca * (r + jr), yBot + thick * f, HZ + sa * (r + jr)));
      }
      for (let i = 1; i <= segsV; i++) {
        const f = 1 - (2 * i) / segsV;
        const r = rMid + f * hw;
        const bevel = Math.abs(f) > 0.85 ? 0.06 * M : 0;
        pts.push(new THREE.Vector3(HX + ca * r, yBot + bevel, HZ + sa * r));
      }
      for (let j = 1; j < segsH; j++) {
        const f = j / segsH;
        const r = rMid - hw;
        const jr = (fbm(a * 16 - j * 2.7, uFrac * 8 + 9) - 0.5) * 0.09 * M;
        pts.push(new THREE.Vector3(HX + ca * (r + jr), yBot + thick * f, HZ + sa * (r + jr)));
      }
      return pts;
    };

    for (let u = 0; u <= segsU; u++) rings.push(buildProfile(u / segsU));
    const nP = rings[0].length;
    const center = new THREE.Vector3();
    for (let u = 0; u < segsU; u++) {
      const A = rings[u], B = rings[u + 1];
      center.set(0, 0, 0);
      for (let p = 0; p < nP; p++) { center.add(A[p]); center.add(B[p]); }
      center.multiplyScalar(0.5 / nP);
      for (let p = 0; p < nP; p++) {
        const p1 = (p + 1) % nP;
        _fc.copy(A[p]).add(A[p1]).add(B[p1]).add(B[p]).multiplyScalar(0.25);
        _wn.subVectors(_fc, center);
        addQuad(A[p], A[p1], B[p1], B[p], fn, _wn, 0.032);
      }
    }
    for (const [ring, angEnd, sgn] of [[rings[0], aStart, -1], [rings[segsU], aEnd, 1]]) {
      const tx = -Math.sin(angEnd) * sgn, tz = Math.cos(angEnd) * sgn;
      const outDir = new THREE.Vector3(tx, 0, tz);
      const mid = new THREE.Vector3();
      for (const v of ring) mid.add(v);
      mid.multiplyScalar(1 / nP);
      mid.x += tx * 0.14 * M; mid.z += tz * 0.14 * M;
      for (let p = 0; p < nP; p++) {
        const p1 = (p + 1) % nP;
        addTri(mid, ring[p], ring[p1], pickRGB(fn, mid, ring[p], ring[p1], 0.03), outDir);
      }
    }
  };

  // =====================================================================
  // 5. CÍRCULO EXTERIOR DE SARSEN (Ø 30,0 m, ALT. 4,9 m — ESTADO REAL 1–30)
  // =====================================================================
  const H_SARSEN = 4.10 * M; // 0.0164 (4,10 m sobre el suelo)
  const LINTEL_H = 0.80 * M; // 0.0032 (0,80 m -> total coronado 4,90 m = 0.0196)
  const LINTEL_Y_BOT = Y_HENGE + H_SARSEN - 0.15 * M;
  // Numeración arqueológica 1..30 en sentido horario desde el eje Noreste (entre Stone 30 y Stone 1)
  const angStone = (stoneNum) => ANG_AXIS + (stoneNum - 0.5) * ((Math.PI * 2) / 30);

  const STANDING_SARSEN = new Set([1, 2, 3, 4, 5, 6, 7, 10, 11, 16, 21, 22, 23, 27, 28, 29, 30]);
  const LINTEL_START = new Set([29, 30, 1, 2, 4, 21]); // 6 dinteles in situ reales
  const FALLEN_SARSEN = new Set([8, 9, 12, 13, 14, 15, 19, 25, 26]);
  const MISSING_SOCKET = new Set([18, 20, 24]);

  for (let n = 1; n <= 30; n++) {
    const ang = angStone(n);
    const x = HX + Math.cos(ang) * R_SARSEN;
    const z = HZ + Math.sin(ang) * R_SARSEN;
    const yaw = -ang + Math.PI * 0.5;
    const yg = Y_HENGE;
    const w = (2.10 + (rng() - 0.5) * 0.16) * M; // 2,10 m real (67 % del paso)
    const d = (1.10 + (rng() - 0.5) * 0.12) * M; // 1,10 m real

    if (STANDING_SARSEN.has(n)) {
      const hReal = n === 11 ? 2.60 * M : H_SARSEN; // Stone 11 tiene media altura real (~2,6 m)
      const prevN = n === 1 ? 30 : n - 1;
      const hasLintelLeft = LINTEL_START.has(prevN);
      const hasLintelRight = LINTEL_START.has(n);
      const tiltR = n === 23 ? 0.10 : (hasLintelLeft || hasLintelRight) ? (rng() - 0.5) * 0.018 : (rng() - 0.5) * 0.04;
      const tiltT = (hasLintelLeft || hasLintelRight) ? (rng() - 0.5) * 0.015 : (rng() - 0.5) * 0.035;
      placeAnchoredStone(x, z, yg, w, hReal, d, yaw, {
        tiltR, tiltT, sink: 1.8 * M, sx: 8, sy: 18, sz: 6,
        amp: 0.00022, taper: 0.07, fn: sarsenStoneColor(yg),
      });
      if (!hasLintelLeft && !hasLintelRight) {
        addTenon(x - Math.sin(ang) * 0.55 * M, yg + hReal, z + Math.cos(ang) * 0.55 * M, 0.22 * M, 0.30 * M);
        addTenon(x + Math.sin(ang) * 0.55 * M, yg + hReal, z - Math.cos(ang) * 0.55 * M, 0.22 * M, 0.30 * M);
      } else if (!hasLintelLeft || !hasLintelRight) {
        const sgn = hasLintelLeft ? 1 : -1;
        addTenon(x + Math.sin(ang) * 0.52 * M * sgn, yg + hReal, z - Math.cos(ang) * 0.52 * M * sgn, 0.21 * M, 0.28 * M);
      }
    } else if (n === 17) {
      // Tocón / bloque bajo residual
      placeAnchoredStone(x, z, yg, w, 1.35 * M, d, yaw, {
        tiltR: 0.12, tiltT: -0.05, sink: 1.5 * M, sx: 6, sy: 8, sz: 4,
        amp: 0.00024, taper: 0.10, fn: sarsenStoneColor(yg), grooves: false,
      });
    } else if (FALLEN_SARSEN.has(n)) {
      const outR = (n % 2 === 0 ? 1.9 : -1.6) * M;
      const fx = x + Math.cos(ang) * outR;
      const fz = z + Math.sin(ang) * outR;
      const lenFall = (n === 12 || n === 15) ? 3.1 * M : 3.8 * M;
      placeFallenStone(fx, fz, w, lenFall, d, -ang + (rng() - 0.5) * 0.35, {
        sx: 8, sy: 14, sz: 5, amp: 0.00024, fn: sarsenStoneColor(yg),
      });
    } else if (MISSING_SOCKET.has(n)) {
      // Huella arqueológica de zócalo desaparecido en el césped
      addGeo(new THREE.TorusGeometry(0.95 * M, 0.20 * M, 5, 10), 0x8b946a, {
        p: [x, yg + 0.04 * M, z], r: [Math.PI * 0.5, 0, 0], colorFn: turfColor,
      });
    }

    if (LINTEL_START.has(n)) {
      const nNext = (n % 30) + 1;
      buildCurvedLintel(R_SARSEN, angStone(n), angStone(nNext), LINTEL_Y_BOT, LINTEL_H, 1.08 * M, sarsenStoneColor(LINTEL_Y_BOT), {
        segsU: 16, segsV: 5, segsH: 4,
      });
    }
  }

  // Cinco dinteles caídos reales apoyados sobre el césped junto a los huecos del círculo exterior (con cajas mortise)
  for (const stN of [7.5, 12.5, 14.5, 23.5, 27.5]) {
    const ga = angStone(stN);
    const gx = HX + Math.cos(ga) * (R_SARSEN + 2.3 * M);
    const gz = HZ + Math.sin(ga) * (R_SARSEN + 2.3 * M);
    placeFallenStone(gx, gz, 1.08 * M, 3.1 * M, 0.82 * M, -ga + Math.PI * 0.5 + (rng() - 0.5) * 0.4, {
      sx: 6, sy: 12, sz: 4, amp: 0.00022, fn: sarsenStoneColor(Y_HENGE), mortises: true,
    });
  }

  // =====================================================================
  // 6. HERRADURA DE LOS 5 GRANDES TRILITONES (51–60 A ESCALA REAL 1:1)
  // =====================================================================
  const ANG_SW = ANG_AXIS + Math.PI;
  const TRILI_W = 2.25 * M;
  const TRILI_D = 1.30 * M;
  const TRILI_SPAN = Math.asin((2.70 * M * 0.5) / R_TRILITHON); // 2,70 m entre centros => ranura real de 0,45 m

  const TRILITHONS = [
    { id: 1, offAng: -1.58, hPillar: 5.10 * M, hLintel: 0.90 * M, state: 'complete' }, // 51–52 (6,0 m)
    { id: 2, offAng: -0.80, hPillar: 5.65 * M, hLintel: 0.95 * M, state: 'complete' }, // 53–54 (6,6 m)
    { id: 3, offAng: 0.00,  hPillar: 6.50 * M, hLintel: 0.95 * M, state: 'central' },  // 55–56 (Gran Trilitón 7,3 m: 56 en pie, 55 y L156 caídos)
    { id: 4, offAng: 0.80,  hPillar: 5.65 * M, hLintel: 0.95 * M, state: 'complete' }, // 57–58 (6,6 m)
    { id: 5, offAng: 1.58,  hPillar: 5.10 * M, hLintel: 0.90 * M, state: 't5' },       // 59–60 (6,0 m: 60 en pie, 59 y L160 caídos)
  ];

  // Piedra del Altar (Stone 80): 4,9 m × 1,0 m × 0,5 m semienterrada frente al Gran Trilitón
  const ALTAR_X = HX - Math.cos(ANG_AXIS) * (1.8 * M);
  const ALTAR_Z = HZ - Math.sin(ANG_AXIS) * (1.8 * M);
  addGeo(displaceGeo(new THREE.BoxGeometry(4.9 * M, 0.55 * M, 1.0 * M, 8, 3, 5), 0.00022), 0x5c685c, {
    p: [ALTAR_X, Y_HENGE + 0.14 * M, ALTAR_Z],
    r: [0.015, -ANG_AXIS + Math.PI * 0.5, -0.015],
    colorFn: altarSandstoneColor,
  });

  for (const tr of TRILITHONS) {
    const aC = ANG_SW + tr.offAng;
    const aA = aC - TRILI_SPAN; // primer pilar en sentido horario (51, 53, 55, 57, 59)
    const aB = aC + TRILI_SPAN; // segundo pilar (52, 54, 56, 58, 60)
    const yawC = -aC + Math.PI * 0.5;
    const xA = HX + Math.cos(aA) * R_TRILITHON, zA = HZ + Math.sin(aA) * R_TRILITHON;
    const xB = HX + Math.cos(aB) * R_TRILITHON, zB = HZ + Math.sin(aB) * R_TRILITHON;
    const xC = HX + Math.cos(aC) * R_TRILITHON, zC = HZ + Math.sin(aC) * R_TRILITHON;

    if (tr.state === 'complete') {
      placeAnchoredStone(xA, zA, Y_HENGE, TRILI_W, tr.hPillar, TRILI_D, -aA + Math.PI * 0.5, {
        tiltR: (rng() - 0.5) * 0.015, tiltT: (rng() - 0.5) * 0.012, sink: 2.0 * M,
        sx: 8, sy: 20, sz: 7, amp: 0.00026, taper: 0.09, fn: sarsenStoneColor(Y_HENGE, 1.15),
      });
      placeAnchoredStone(xB, zB, Y_HENGE, TRILI_W, tr.hPillar, TRILI_D, -aB + Math.PI * 0.5, {
        tiltR: (rng() - 0.5) * 0.015, tiltT: (rng() - 0.5) * 0.012, sink: 2.0 * M,
        sx: 8, sy: 20, sz: 7, amp: 0.00026, taper: 0.09, fn: sarsenStoneColor(Y_HENGE, 1.15),
      });

      // Grabados de hachas y dagas de la Edad del Bronce en Stone 53 (T2)
      if (tr.id === 2) {
        const inX = -Math.cos(aA), inZ = -Math.sin(aA);
        for (let c = 0; c < 4; c++) {
          const cy = Y_HENGE + (1.6 + c * 0.65) * M;
          addBoxDirect(
            xA + inX * (TRILI_D * 0.52), cy, zA + inZ * (TRILI_D * 0.52),
            0.50 * M, 0.55 * M, 0.12 * M, sarsenStoneColor(Y_HENGE), 0.03, 0.00005, -aA + Math.PI * 0.5
          );
        }
      }

      const lLen = 4.9 * M;
      const lBot = Y_HENGE + tr.hPillar - 0.15 * M;
      const gL = new THREE.BoxGeometry(lLen, tr.hLintel + 0.15 * M, 1.35 * M, 16, 7, 8);
      const posL = gL.attributes.position;
      for (let i = 0; i < posL.count; i++) {
        const lx = posL.getX(i), ly = posL.getY(i), lz = posL.getZ(i);
        posL.setZ(i, lz * (1 + 0.06 * (ly / (tr.hLintel * 0.5))));
        if (Math.abs(lx) > lLen * 0.44 && ly < 0) posL.setY(i, ly + 0.08 * M);
      }
      displaceGeo(gL, 0.00024);
      addGeo(gL, 0x9b9485, {
        p: [xC, lBot + (tr.hLintel + 0.15 * M) * 0.5, zC],
        r: [0, yawC, 0],
        colorFn: sarsenStoneColor(lBot),
      });
    } else if (tr.state === 'central') {
      // Stone 56 (6,5 m + espiga visible en pie)
      placeAnchoredStone(xB, zB, Y_HENGE, TRILI_W, tr.hPillar, TRILI_D, -aB + Math.PI * 0.5, {
        tiltR: -0.02, tiltT: 0.01, sink: 2.4 * M,
        sx: 8, sy: 20, sz: 7, amp: 0.00026, taper: 0.10, fn: sarsenStoneColor(Y_HENGE, 1.15),
      });
      addTenon(xB, Y_HENGE + tr.hPillar, zB, 0.28 * M, 0.38 * M, sarsenStoneColor(Y_HENGE));

      // Stone 55 partido en dos tramos (55a y 55b) y gran dintel L156 caídos junto/sobre la Piedra del Altar
      const inDirX = -Math.cos(aA), inDirZ = -Math.sin(aA);
      placeFallenStone(xA + inDirX * 1.6 * M, zA + inDirZ * 1.6 * M, TRILI_W, 3.2 * M, TRILI_D, -aA + 0.15, {
        sx: 8, sy: 16, sz: 6, amp: 0.00025, fn: sarsenStoneColor(Y_HENGE),
      });
      placeFallenStone(xA + inDirX * 4.9 * M, zA + inDirZ * 4.9 * M, TRILI_W * 0.92, 2.9 * M, TRILI_D * 0.95, -aA - 0.12, {
        sx: 8, sy: 14, sz: 6, amp: 0.00025, fn: sarsenStoneColor(Y_HENGE),
      });
      // Gran dintel L156 caído junto al Altar Stone con sus 2 cajas mortise visibles
      placeFallenStone(ALTAR_X + inDirX * 1.1 * M, ALTAR_Z + inDirZ * 1.1 * M, 1.35 * M, 4.9 * M, tr.hLintel, yawC + 0.25, {
        sx: 7, sy: 16, sz: 8, amp: 0.00024, fn: sarsenStoneColor(Y_HENGE), mortises: true,
      });
    } else if (tr.state === 't5') {
      // Stone 60 en pie con su espiga superior; Stone 59 y dintel L160 fragmentados en el suelo
      placeAnchoredStone(xB, zB, Y_HENGE, TRILI_W, tr.hPillar, TRILI_D, -aB + Math.PI * 0.5, {
        tiltR: 0.03, sink: 2.0 * M, sx: 8, sy: 20, sz: 7, amp: 0.00026, taper: 0.09, fn: sarsenStoneColor(Y_HENGE),
      });
      addTenon(xB, Y_HENGE + tr.hPillar, zB, 0.25 * M, 0.34 * M, sarsenStoneColor(Y_HENGE));

      const outX = Math.cos(aA), outZ = Math.sin(aA);
      placeFallenStone(xA + outX * 1.6 * M, zA + outZ * 1.6 * M, TRILI_W, 2.8 * M, TRILI_D, -aA + 0.25, {
        sx: 8, sy: 14, sz: 6, amp: 0.00024, fn: sarsenStoneColor(Y_HENGE),
      });
      placeFallenStone(xC - outX * 1.1 * M, zC - outZ * 1.1 * M, 1.30 * M, 4.5 * M, tr.hLintel, yawC - 0.18, {
        sx: 7, sy: 16, sz: 8, amp: 0.00024, fn: sarsenStoneColor(Y_HENGE), mortises: true,
      });
    }
  }

  // Brasero ceremonial discreto junto a la Piedra del Altar y el Gran Trilitón
  features.push({ type: 'flame', pos: [ALTAR_X, Y_HENGE + 0.55 * M, ALTAR_Z], size: 0.0020 });
  for (const angB of [ANG_SW - 0.55, ANG_SW + 0.55, ANG_AXIS + 0.32, ANG_AXIS - 0.32]) {
    features.push({ type: 'city', pos: [HX + Math.cos(angB) * (7.8 * M), Y_HENGE + 0.6 * M, HZ + Math.sin(angB) * (7.8 * M)], size: 0.006 });
  }

  // =====================================================================
  // 7. CÍRCULO EXTERIOR (29) Y HERRADURA INTERIOR (19) DE PIEDRAS AZULES
  // =====================================================================
  // 7.1 Círculo Exterior de 29 Piedras Azules de Preseli (Ø 23,5 m, alt. 1,8–2,0 m)
  for (let i = 0; i < 29; i++) {
    const ang = ANG_AXIS + (i + 0.6) * ((Math.PI * 2) / 29);
    if (Math.abs(angleDiff(ang, ANG_AXIS)) < 0.08) continue;
    const x = HX + Math.cos(ang) * R_BLUE_OUT;
    const z = HZ + Math.sin(ang) * R_BLUE_OUT;
    const yaw = -ang + Math.PI * 0.5 + (rng() - 0.5) * 0.25;
    const mode = i % 4;
    if (mode === 3) {
      placeFallenStone(x, z, 0.72 * M, 1.85 * M, 0.55 * M, yaw + 0.8, {
        sx: 5, sy: 9, sz: 4, amp: 0.00020, fn: preseliBluestoneColor(Y_HENGE),
      });
    } else {
      const bh = (mode === 2 ? 1.15 : 1.80 + rng() * 0.22) * M;
      const tilt = mode === 1 ? (rng() - 0.5) * 0.18 : (rng() - 0.5) * 0.06;
      placeAnchoredStone(x, z, Y_HENGE, 0.85 * M, bh, 0.65 * M, yaw, {
        tiltR: tilt, tiltT: (rng() - 0.5) * 0.06, sink: 0.9 * M,
        sx: 5, sy: 9, sz: 4, amp: 0.00020, taper: 0.14, fn: preseliBluestoneColor(Y_HENGE), grooves: false,
      });
    }
  }

  // 7.2 Herradura Interior de 19 Piedras Azules de Preseli (Ø 11,2 m, gradación 1,8 m -> 2,45 m en el SO)
  for (let i = 0; i < 19; i++) {
    const frac = (i / 18) * 2 - 1;
    const ang = ANG_SW + frac * 1.92;
    const x = HX + Math.cos(ang) * R_BLUE_IN;
    const z = HZ + Math.sin(ang) * R_BLUE_IN;
    const yaw = -ang + Math.PI * 0.5;
    const bh = (1.80 + (1 - Math.abs(frac)) * 0.65 + (rng() - 0.5) * 0.12) * M;
    placeAnchoredStone(x, z, Y_HENGE, 0.82 * M, bh, 0.62 * M, yaw, {
      tiltR: (rng() - 0.5) * 0.07, tiltT: (rng() - 0.5) * 0.05, sink: 1.0 * M,
      sx: 5, sy: 9, sz: 4, amp: 0.00018, taper: 0.12, fn: preseliBluestoneColor(Y_HENGE), grooves: false,
    });
    if (i % 4 === 2) features.push({ type: 'sparkle', pos: [x, Y_HENGE + bh + 0.3 * M, z], size: 0.006 });
  }

  // =====================================================================
  // 8. 56 POZOS DE AUBREY, ANILLOS Y & Z, ESTACIONES, SACRIFICIO Y PIEDRA TALÓN
  // =====================================================================
  // 8.1 Anillo completo de 56 Pozos de Aubrey (Ø 86,6 m; cada pozo Ø 1,1 m)
  for (let i = 0; i < 56; i++) {
    const ang = (i / 56) * Math.PI * 2;
    const ax = HX + Math.cos(ang) * R_AUBREY;
    const az = HZ + Math.sin(ang) * R_AUBREY;
    const ay = height(ax, az);
    addGeo(new THREE.TorusGeometry(0.55 * M, 0.15 * M, 5, 10), 0xe6e1d3, {
      p: [ax, ay + 0.06 * M, az], r: [Math.PI * 0.5, 0, 0], colorFn: chalkStrataColor,
    });
    addGeo(new THREE.CylinderGeometry(0.45 * M, 0.48 * M, 0.25 * M, 8), 0xf0ece0, {
      p: [ax, ay - 0.02 * M, az], colorFn: chalkStrataColor,
    });
    if (i % 8 === 0) features.push({ type: 'city', pos: [ax, ay + 0.4 * M, az], size: 0.006 });
  }

  // 8.2 Anillos de Pozos Y (30) y Z (29) alrededor del Círculo de Sarsen (R = 20,5 m y 25,0 m)
  for (const [countH, radH] of [[30, R_YHOLES], [29, R_ZHOLES]]) {
    for (let i = 0; i < countH; i++) {
      const ang = (i / countH) * Math.PI * 2;
      const hx = HX + Math.cos(ang) * radH;
      const hz = HZ + Math.sin(ang) * radH;
      const hy = height(hx, hz);
      addGeo(new THREE.CylinderGeometry(0.48 * M, 0.55 * M, 0.16 * M, 7), 0x768b52, {
        p: [hx, hy - 0.02 * M, hz], colorFn: turfColor,
      });
    }
  }

  // 8.3 Cuatro Piedras de las Estaciones (91–94) en R = 44,2 m
  STATION_ANGLES.forEach((ang, idx) => {
    const sx = HX + Math.cos(ang) * R_STATION;
    const sz = HZ + Math.sin(ang) * R_STATION;
    const sy = height(sx, sz);
    if (idx === 0) {
      // Stone 91 (ESE, 2,7 m caída/inclinada junto al terraplén)
      placeFallenStone(sx, sz, 1.3 * M, 2.7 * M, 0.7 * M, -ang + 0.4, {
        sx: 5, sy: 8, sz: 3, amp: 0.00022, fn: sarsenStoneColor(sy),
      });
    } else if (idx === 2) {
      // Stone 93 (ONO, 1,4 m en pie)
      placeAnchoredStone(sx, sz, sy, 1.1 * M, 1.4 * M, 0.65 * M, -ang, {
        tiltR: 0.06, sink: 0.8 * M, sx: 5, sy: 8, sz: 4, amp: 0.00020, taper: 0.12, fn: sarsenStoneColor(sy), grooves: false,
      });
    } else {
      // North Barrow (94) & South Barrow (92): corona calcárea sutil sobre su foso
      addGeo(new THREE.TorusGeometry(4.8 * M, 0.35 * M, 5, 18), 0xdbd5c5, {
        p: [sx, sy + 0.05 * M, sz], r: [Math.PI * 0.5, 0, 0], colorFn: chalkStrataColor,
      });
    }
  });

  // 8.4 Piedra del Sacrificio (Slaughter Stone 95: 6,4 m × 2,1 m × 0,9 m) en R = 43,5 m (Entrada Noreste)
  const slX = HX + Math.cos(ANG_AXIS + 0.05) * (43.5 * M);
  const slZ = HZ + Math.sin(ANG_AXIS + 0.05) * (43.5 * M);
  placeFallenStone(slX, slZ, 2.1 * M, 6.4 * M, 0.9 * M, -ANG_AXIS + 0.18, {
    sx: 6, sy: 12, sz: 4, amp: 0.00024, fn: sarsenStoneColor(height(slX, slZ)),
  });

  // 8.5 La Piedra Talón (Heel Stone 96) a 77,4 m reales (altura 4,7 m, inclinada 24°) + Foso + Antorchas rituales
  const heelY = height(HEEL_X, HEEL_Z);
  addGeo(new THREE.TorusGeometry(4.8 * M, 0.38 * M, 5, 22), 0xdbd5c5, {
    p: [HEEL_X, heelY + 0.05 * M, HEEL_Z], r: [Math.PI * 0.5, 0, 0], colorFn: chalkStrataColor,
  });
  placeAnchoredStone(HEEL_X, HEEL_Z, heelY, 2.4 * M, 4.7 * M, 2.0 * M, -ANG_AXIS + Math.PI * 0.5, {
    tiltR: 0.42, tiltT: 0.04, sink: 1.8 * M, sx: 8, sy: 16, sz: 6,
    amp: 0.00028, taper: 0.16, fn: sarsenStoneColor(heelY, 1.1),
  });
  features.push({ type: 'flame', pos: [HEEL_X - 1.6 * M, heelY + 0.9 * M, HEEL_Z + 1.4 * M], size: 0.0017 });
  features.push({ type: 'flame', pos: [HEEL_X + 1.6 * M, heelY + 0.9 * M, HEEL_Z - 1.4 * M], size: 0.0017 });

  // Balizas nocturnas a lo largo de la Avenida Procesional del Solsticio
  for (let i = 0; i < 6; i++) {
    const distA = (53.0 + i * 7.5) * M;
    const ca = Math.cos(ANG_AXIS), sa = Math.sin(ANG_AXIS);
    for (const sgn of [-1, 1]) {
      const px = HX + ca * distA - sa * (7.25 * M) * sgn;
      const pz = HZ + sa * distA + ca * (7.25 * M) * sgn;
      if (Math.hypot(px, pz) > rimRadius(Math.atan2(pz, px)) * 0.92) continue;
      const py = height(px, pz);
      addBeam(px, py - 0.3 * M, pz, px, py + 1.1 * M, pz, 0.28 * M, 0.28 * M, 0x5c3e24);
      features.push({ type: 'city', pos: [px, py + 1.2 * M, pz], size: 0.006 });
    }
  }

  // =====================================================================
  // 9. VEGETACIÓN AUTÓCTONA DE SALISBURY (ESPINOS SILVESTRES Y MARCADORES)
  // =====================================================================
  // Arbustos bajos de espino y nódulos de creta/sílex fuera del recinto (manteniendo abierta la pradera de Salisbury)
  const addHawthorn = (tx, tz, sc = 1) => {
    const ty = height(tx, tz) - 0.25 * M;
    const hT = (1.1 + rng() * 0.7) * M * sc;
    addRod([tx, ty, tz], [tx + (rng() - 0.5) * 0.3 * M, ty + hT, tz + (rng() - 0.5) * 0.3 * M], 0.22 * M * sc, 0x563c26, 5);
    const col = rng() < 0.4 ? 0x32622a : rng() < 0.75 ? 0x3e7432 : 0x4d843c;
    addGeo(new THREE.IcosahedronGeometry(0.95 * M * sc, 1), col, {
      p: [tx, ty + hT + 0.3 * M * sc, tz], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.2, 0.78, 1.2], amt: 0.07,
    });
  };
  let shrubs = 0;
  for (let tries = 0; shrubs < 42 && tries < 4000; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = 61.5 * M + rng() * (rimRadius(ang) - 65.0 * M);
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (Math.hypot(x - HX, z - HZ) < 62.0 * M) continue;
    const { along, perp } = aveFrame(x, z);
    if (along > 45.0 * M && perp < 14.0 * M) continue;
    if (Math.hypot(x - HEEL_X, z - HEEL_Z) < 8.5 * M) continue;
    const h = height(x, z), sl = slopeAt(x, z);
    if (sl > 0.30) continue;
    addHawthorn(x, z, 0.85 + rng() * 0.45);
    if (shrubs % 2 === 0) features.push({ type: 'firefly', pos: [x, h + 1.4 * M, z], size: 0.012 });
    shrubs++;
  }

  // Nódulos naturales de sílex y creta aflorando en el borde de la pradera
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2 + rng() * 0.1;
    const r = (59.5 + rng() * 14.0) * M;
    const x = HX + Math.cos(ang) * r, z = HZ + Math.sin(ang) * r;
    if (Math.hypot(x, z) > rimRadius(Math.atan2(z, x)) * 0.90) continue;
    const hy = height(x, z);
    addGeo(new THREE.IcosahedronGeometry((0.45 + rng() * 0.35) * M, 1), 0xdad4c3, {
      p: [x, hy - 0.1 * M, z], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.3, 0.55, 1.1], colorFn: chalkStrataColor,
    });
  }

  // =====================================================================
  // 10. EFECTOS VIVOS A ESCALA 1:1
  // =====================================================================
  // Destellos de rocío mineral en la gran pradera y megalitos
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.15;
    const rr = (18.0 + (i % 3) * 9.0) * M;
    const px = HX + Math.cos(a) * rr, pz = HZ + Math.sin(a) * rr;
    features.push({ type: 'sparkle', pos: [px, height(px, pz) + 0.35 * M, pz], size: 0.006 });
  }
  // Fuegos fatuos nocturnos entre los trilitones, Aubrey Holes y el foso
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const rr = (9.5 + (i % 3) * 14.0) * M;
    features.push({ type: 'firefly', pos: [HX + Math.cos(a) * rr, Y_HENGE + (2.0 + (i % 3) * 1.4) * M, HZ + Math.sin(a) * rr], size: 0.012 });
  }

  // Nubes inglesas sobre el cielo de la Llanura de Salisbury
  const cloudRing = [
    [-0.230, 0.155, -0.210, 0.011],
    [0.225, 0.162, -0.200, 0.011],
    [-0.240, 0.150, 0.195, 0.010],
    [0.230, 0.158, 0.190, 0.011],
    [-0.085, 0.178, -0.255, 0.011],
    [0.095, 0.175, 0.245, 0.010],
    [-0.160, 0.168, 0.225, 0.010],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0, cy, 0], size: cs });
  }
  features.push({ type: 'gulls', pos: [0.01, 0.165, -0.01], size: 0.115 });

  void stats;
  return finish('Stonehenge 1:1');
}
