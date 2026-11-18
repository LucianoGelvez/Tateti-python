// Diorama "Central Park — Nueva York" (~165k+ triángulos)
// Maqueta arquitectónica y paisajística completa de Central Park en otoño, enmarcada por el skyline de Manhattan:
//   - Topografía fiel sobre zócalo hermético de esquisto de Manhattan (Manhattan Schist) con dos galerías
//     subterráneas del NYC Subway (vías, columnas, andén mosaico y trenes iluminados),
//   - Cuatro cuerpos de agua excavados: The Lake (con Bow Bridge y Loeb Boathouse + 10 botes),
//     Jacqueline Kennedy Onassis Reservoir (pista perimetral y casetas), Turtle Pond y The Pond (Gapstow Bridge),
//   - Bethesda Terrace, Arcada triple, Gran Escalinata doble y Fuente del Ángel de las Aguas,
//   - Belvedere Castle sobre Vista Rock, Aguja de Cleopatra (Obelisco) y afloramientos glaciares (Umpire/Rat Rock),
//   - Great Lawn (4 diamantes de béisbol), Sheep Meadow, The Mall & Literary Walk (estatuas, bancos y olmos),
//   - Naumburg Bandshell, Friedsam Carousel, Tavern on the Green, The Dairy, Conservatory Water y Wollman Rink,
//   - Strawberry Fields (mosaico Imagine), Transverse Road hundido con puentes de piedra y muro perimetral con portales,
//   - Corona del skyline (The Plaza, torres Art Déco escalonadas, San Remo / El Dorado, Museo Neoclásico, water towers)
//     y tráfico de taxis amarillos (NYC Yellow Cabs) y carruajes en las avenidas perimetrales.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildCentralPark(seed = 212) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);

  // =====================================================================
  // 1. PALETA NEOYORQUINA Y FUNCIONES PROCEDIMENTALES DE MATERIAL
  // =====================================================================
  const schistColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const band = fbm(cx * 34 + 2, cz * 34 + 7);
    const strata = Math.floor(cy * 190 + band * 3.8) & 3;
    const pal = [0x767b82, 0x858a92, 0x646970, 0x91969d];
    return jitter(pal[strata], 0.042);
  };

  const limestoneColor = (pal = [0xe8decb, 0xdcd0b9, 0xf1e8d6, 0xcfc2aa]) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 260);
    const col = Math.floor((cx + cz) * 190 + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    return jitter(pal[h], 0.025);
  };

  const brickColor = (pal = [0xa84b38, 0x943d2d, 0xb85a44, 0x823526]) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 320);
    const col = Math.floor((cx - cz) * 240 + (row & 1) * 0.5);
    const h = ((row * 31) ^ (col * 17)) & 3;
    return jitter(pal[h], 0.032);
  };

  const copperPatinaColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 55 + 4, cz * 55 + 9);
    const pal = [0x4c967e, 0x3d826b, 0x5ca78d, 0x346f5c];
    return jitter(pal[Math.floor(n * 4) & 3], 0.035);
  };

  const woodColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const cx = (va.x + vb.x + vc.x) / 3;
    const k = (Math.floor(cy * 260) + Math.floor(cx * 200)) & 1;
    return jitter(k ? 0x6e4a2b : 0x57381f, 0.04);
  };

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
  const addBoxDirect = (cx, cy, cz, w, h, d, colorOrFn, amt = 0.03, rotY = 0) => {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const setV = (idx, lx, ly, lz) => _bx[idx].set(cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c);
    setV(0, -hw, -hh, -hd); setV(1, hw, -hh, -hd);
    setV(2, hw, -hh, hd); setV(3, -hw, -hh, hd);
    setV(4, -hw, hh, -hd); setV(5, hw, hh, -hd);
    setV(6, hw, hh, hd); setV(7, -hw, hh, hd);
    _pc.set(cx, cy, cz);
    const faces = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7], [3, 2, 1, 0]];
    for (const [i0, i1, i2, i3] of faces) {
      const a = _bx[i0], b = _bx[i1], k = _bx[i2], e = _bx[i3];
      _fc.copy(a).add(b).add(k).add(e).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(a, b, k, e, colorOrFn, _wn, amt);
    }
  };

  const displaceGeo = (geo, amp = 0.0005) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const qx = Math.round(x * 1800), qy = Math.round(y * 1800), qz = Math.round(z * 1800);
      let h = (qx * 374761393 + qy * 668265263 + qz * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const n1 = ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
      h = Math.imul(h ^ (h >>> 11), 668265263);
      const n2 = ((h ^ (h >>> 15)) >>> 0) / 4294967296 - 0.5;
      p.setXYZ(i, x + n1 * amp, y + n2 * amp * 0.7, z + n1 * amp);
    }
    return geo;
  };

  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };

  // Helper de techo hipped/mansarda trapezoidal hermético (sin picos en rombo)
  const addMansardRoof = (cx, yBot, cz, wBot, dBot, wTop, dTop, h, colorOrFn, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const pt = (lx, ly, lz) => new THREE.Vector3(cx + lx * c + lz * s, yBot + ly, cz - lx * s + lz * c);
    const hw0 = wBot * 0.5, hd0 = dBot * 0.5;
    const hw1 = wTop * 0.5, hd1 = dTop * 0.5;
    const bot = [pt(-hw0, 0, -hd0), pt(hw0, 0, -hd0), pt(hw0, 0, hd0), pt(-hw0, 0, hd0)];
    const top = [pt(-hw1, h, -hd1), pt(hw1, h, -hd1), pt(hw1, h, hd1), pt(-hw1, h, hd1)];
    addPrism(bot, top, colorOrFn, true, 0.032);
  };

  // =====================================================================
  // 2. GEOGRAFÍA DE CENTRAL PARK, CUERPOS DE AGUA, PRADERAS Y AVENIDAS
  // =====================================================================
  const CX = 0.0, CZ = 0.0;
  const AX = 0.340, AZ = 0.375;
  const FLOOR = -0.048;
  const Y_WATER = 0.006;

  // Superelipse n=5: rectángulo redondeado estilo manzana de Manhattan
  const boxNorm = (x, z) => Math.pow(Math.pow(Math.abs(x) / AX, 5.0) + Math.pow(Math.abs(z) / AZ, 5.0), 0.2);
  const rimRadius = (ang) => {
    const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
    return 1 / Math.pow(Math.pow(c / AX, 5.0) + Math.pow(s / AZ, 5.0), 0.2);
  };

  const segDist = (x, z, pts) => {
    let md = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      md = Math.min(md, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
    }
    return md;
  };

  const widthSegDist = (x, z, pts) => {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az, ar] = pts[i], [bx, bz, br] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      const r = ar + (br - ar) * t;
      best = Math.min(best, d - r);
    }
    return best;
  };

  // --- Cuerpos de agua ---
  const RES_CX = 0.008, RES_CZ = -0.178, RES_RX = 0.112, RES_RZ = 0.044;
  const reservoirNorm = (x, z) => {
    const dx = (x - RES_CX) / RES_RX;
    const dz = (z - RES_CZ) / RES_RZ;
    const bulge = 1 + 0.06 * Math.sin(Math.atan2(dz, dx) * 2 + 0.5);
    return Math.hypot(dx, dz) / bulge;
  };

  const TP_CX = -0.024, TP_CZ = -0.049, TP_RX = 0.039, TP_RZ = 0.013;
  const turtleNorm = (x, z) => Math.hypot((x - TP_CX) / TP_RX, (z - TP_CZ) / TP_RZ);

  const LAKE_PTS = [
    [-0.128, 0.022, 0.014],
    [-0.098, 0.035, 0.019],
    [-0.072, 0.041, 0.014],
    [-0.048, 0.036, 0.0065], // Estrecho de Bow Bridge
    [-0.020, 0.036, 0.015],
    [0.012, 0.043, 0.016],  // Bahía frente a Bethesda Terrace
    [0.046, 0.039, 0.015],
    [0.070, 0.030, 0.013],  // Bahía del Loeb Boathouse
  ];
  const lakeSigned = (x, z) => widthSegDist(x, z, LAKE_PTS);

  const CW_CX = 0.148, CW_CZ = 0.036, CW_RX = 0.026, CW_RZ = 0.016;
  const conservNorm = (x, z) => Math.hypot((x - CW_CX) / CW_RX, (z - CW_CZ) / CW_RZ);

  const POND_PTS = [
    [0.076, 0.186, 0.014],
    [0.100, 0.204, 0.015],
    [0.122, 0.212, 0.008], // Estrecho de Gapstow Bridge
    [0.146, 0.214, 0.015],
    [0.174, 0.200, 0.014],
  ];
  const pondSigned = (x, z) => widthSegDist(x, z, POND_PTS);

  const isWaterPoint = (x, z) =>
    reservoirNorm(x, z) < 1.0 ||
    turtleNorm(x, z) < 1.0 ||
    lakeSigned(x, z) < 0 ||
    conservNorm(x, z) < 1.0 ||
    pondSigned(x, z) < 0;

  // --- Red de senderos de Olmsted & Vaux ---
  const WEST_DRIVE = [
    [-0.175, 0.252], [-0.188, 0.190], [-0.195, 0.110], [-0.192, 0.030],
    [-0.184, -0.055], [-0.178, -0.145], [-0.155, -0.215], [-0.085, -0.242], [0.008, -0.246],
  ];
  const EAST_DRIVE = [
    [0.185, 0.248], [0.198, 0.175], [0.198, 0.095], [0.194, 0.015],
    [0.186, -0.068], [0.178, -0.148], [0.154, -0.216], [0.092, -0.242], [0.008, -0.246],
  ];
  const CENTER_DRIVE = [
    [-0.015, 0.255], [0.036, 0.205], [0.032, 0.184], [0.022, 0.116],
    [0.012, 0.086], [-0.056, 0.072], [-0.135, 0.064], [-0.192, 0.042],
  ];
  const RAMBLE_PATHS = [
    [-0.060, 0.020], [-0.048, 0.036], [-0.040, 0.010], [-0.005, -0.004], [0.036, 0.012], [0.082, 0.034],
  ];
  const MALL_AX = 0.027;
  const isMallWalk = (x, z) => z > 0.112 && z < 0.186 && Math.abs(x - (MALL_AX - (z - 0.15) * 0.12)) < 0.012;

  const TRANS_Z = -0.124;
  const transverseDepth = (x, z) => {
    if (Math.abs(x) > 0.248) return 0;
    return smooth(1 - Math.abs(z - TRANS_Z) / 0.013);
  };

  const GREAT_LAWN = { x: 0.016, z: -0.086, rx: 0.064, rz: 0.025 };
  const SHEEP_MEADOW = { x: -0.106, z: 0.112, rx: 0.062, rz: 0.044 };
  const inEllipse = (x, z, e) => Math.hypot((x - e.x) / e.rx, (z - e.z) / e.rz);

  const EXPLANADAS = [
    { x: 0.016, z: -0.086, hw: 0.060, hd: 0.022, rot: 0, y: 0.017, r0: 0.004, r1: 0.018 },       // Great Lawn
    { x: -0.036, z: -0.023, hw: 0.016, hd: 0.012, rot: 0, y: 0.044, r0: 0.003, r1: 0.016 },      // Vista Rock (Belvedere Castle)
    { x: 0.124, z: -0.082, hw: 0.016, hd: 0.016, rot: 0, y: 0.022, r0: 0.004, r1: 0.014 },       // Obelisco Cleopatra's Needle
    { x: 0.012, z: 0.066, hw: 0.026, hd: 0.011, rot: 0, y: 0.010, r0: 0.002, r1: 0.009 },        // Bethesda Lower Plaza
    { x: 0.012, z: 0.087, hw: 0.030, hd: 0.009, rot: 0, y: 0.026, r0: 0.003, r1: 0.012 },        // Bethesda Upper Drive
    { x: 0.086, z: 0.033, hw: 0.015, hd: 0.014, rot: 0.15, y: 0.012, r0: 0.003, r1: 0.010 },     // Loeb Boathouse pad
    { x: -0.165, z: 0.034, hw: 0.017, hd: 0.017, rot: 0, y: 0.018, r0: 0.004, r1: 0.014 },       // Strawberry Fields
    { x: 0.008, z: 0.104, hw: 0.016, hd: 0.013, rot: 0, y: 0.021, r0: 0.003, r1: 0.012 },        // Naumburg Bandshell
    { x: 0.027, z: 0.150, hw: 0.015, hd: 0.036, rot: -0.12, y: 0.019, r0: 0.004, r1: 0.014 },    // The Mall & Literary Walk
    { x: -0.174, z: 0.162, hw: 0.024, hd: 0.020, rot: 0, y: 0.017, r0: 0.004, r1: 0.014 },       // Tavern on the Green
    { x: -0.042, z: 0.175, hw: 0.017, hd: 0.017, rot: 0, y: 0.019, r0: 0.004, r1: 0.014 },       // Friedsam Carousel
    { x: 0.070, z: 0.164, hw: 0.014, hd: 0.013, rot: 0, y: 0.020, r0: 0.003, r1: 0.012 },        // The Dairy
    { x: -0.014, z: 0.220, hw: 0.042, hd: 0.022, rot: 0, y: 0.010, r0: 0.003, r1: 0.012 },       // Wollman Rink
  ];

  const rectDist = (x, z, p) => {
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  const rawHeight = (x, z) => {
    const bn = boxNorm(x, z);
    const parkMask = 1 - smooth((bn - 0.69) / 0.05);

    let parkH = 0.016 + 0.007 * fbm(x * 16 + 3, z * 16 + 5) + 0.003 * fbm(x * 38 + 9, z * 38 + 2);
    parkH += 0.014 * smooth(1 - Math.hypot((x - 0.0) / 0.20, (z + 0.255) / 0.045));
    parkH += 0.010 * smooth(1 - Math.hypot((x + 0.005) / 0.085, (z + 0.005) / 0.032));
    // Promontorio escalonado de Vista Rock (Belvedere Castle)
    const vDist = Math.hypot((x + 0.036) / 0.036, (z + 0.023) / 0.028);
    parkH += 0.030 * Math.pow(smooth(1 - vDist), 1.35);

    const rn = reservoirNorm(x, z);
    if (rn >= 0.94 && rn <= 1.24) {
      const bank = smooth(1 - Math.abs(rn - 1.07) / 0.16);
      parkH += 0.008 * bank;
    }

    const cityH = bn < 0.74 ? 0.014 : (bn < 0.82 ? 0.009 : 0.014);
    let h = cityH + (parkH - cityH) * parkMask;

    const td = transverseDepth(x, z);
    if (td > 0 && bn < 0.74) h = h * (1 - td) + 0.0095 * td;

    if (rn < 1.04) h -= 0.022 * smooth((1.04 - rn) / 0.14);
    const tn = turtleNorm(x, z);
    if (tn < 1.12) h -= 0.020 * smooth((1.12 - tn) / 0.22);
    const ld = lakeSigned(x, z);
    if (ld < 0.004) h -= 0.022 * smooth((0.004 - ld) / 0.009);
    const cn = conservNorm(x, z);
    if (cn < 1.12) h -= 0.018 * smooth((1.12 - cn) / 0.20);
    const pd = pondSigned(x, z);
    if (pd < 0.004) h -= 0.020 * smooth((0.004 - pd) / 0.009);

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

  const slopeAt = (x, z) =>
    Math.hypot(height(x + 0.004, z) - height(x - 0.004, z), height(x, z + 0.004) - height(x, z - 0.004)) / 0.008;

  // =====================================================================
  // 3. MALLA TOPOGRÁFICA DE ALTA DENSIDAD (~80.320 TRIÁNGULOS) + ZÓCALO + SUBWAY
  // =====================================================================
  const K = 126, S = 320;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.96);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = height(x, z);
      const y = h < Y_WATER ? Y_WATER + (fbm(x * 58, z * 58) - 0.5) * 0.0012 : h;
      row.push({ v: new THREE.Vector3(x, y, z), h, ang });
    }
    ringPts.push(row);
  }
  for (const p of ringPts[K]) if (p.h < Y_WATER) p.v.y = Y_WATER;

  const nrm = new THREE.Vector3();
  function terrainColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cy = (a.v.y + b.v.y + c.v.y) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);
    const bn = boxNorm(cx, cz);

    if (h < Y_WATER && hMax < Y_WATER + 0.003 && slope < 0.25) {
      const depth = smooth((Y_WATER - h) / 0.018);
      if (h > Y_WATER - 0.0025) return jitter(0x88cbd4, 0.04);
      const ripple = fbm(cx * 60, cz * 60);
      if (ripple > 0.72) return jitter(0xaadce2, 0.035);
      tmpColor.setHex(0x287b8c).lerp(new THREE.Color(0x16495c), depth);
      const k = 1 + (rng() - 0.5) * 0.045;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }

    if (bn >= 0.82) {
      const tile = (Math.floor(cx * 180) ^ Math.floor(cz * 180)) & 3;
      const pal = [0xbdb9ae, 0xb0aca2, 0xc6c2b7, 0xa3a096];
      return jitter(pal[tile], 0.025);
    }
    if (bn >= 0.742) {
      const midLane = Math.abs(bn - 0.781) < 0.0025;
      const crosswalk = (Math.abs(cx) < 0.020 || Math.abs(cz) < 0.020) &&
        ((Math.floor(cx * 210) + Math.floor(cz * 210)) & 1) === 0;
      if (crosswalk && Math.abs(bn - 0.76) < 0.012) return jitter(0xe4e2da, 0.025);
      if (midLane) return jitter(0xe3b330, 0.03);
      return jitter(0x363a40, 0.03);
    }
    if (bn >= 0.720) return jitter(0xc2bdb0, 0.025);

    if (Math.abs(cz - TRANS_Z) < 0.009 && bn < 0.72) {
      if (Math.abs(cz - TRANS_Z) < 0.0014) return jitter(0xe0b234, 0.03);
      return jitter(0x3a3e44, 0.03);
    }

    const rn = reservoirNorm(cx, cz);
    if (rn >= 0.99 && rn < 1.07) return jitter(0x9a978c, 0.035);
    if (rn >= 1.07 && rn < 1.19) return jitter(0xb56947, 0.045);

    if (slope > 0.30 || cy > 0.034) {
      const sBand = Math.floor(cy * 170 + fbm(cx * 42, cz * 42) * 3) & 3;
      const pal = [0x747980, 0x838890, 0x62676e, 0x8f949b];
      return jitter(pal[sBand], 0.045);
    }

    if (rectDist(cx, cz, EXPLANADAS[3]) < 0.002 || rectDist(cx, cz, EXPLANADAS[4]) < 0.002) {
      const herring = (Math.floor(cx * 260) + Math.floor(cz * 260)) & 1;
      return jitter(herring ? 0xc29e70 : 0xa67a56, 0.035);
    }
    if (conservNorm(cx, cz) < 1.18 && conservNorm(cx, cz) >= 0.98) return jitter(0xb5b1a6, 0.03);

    if (Math.hypot((cx + 0.014) / 0.038, (cz - 0.220) / 0.018) < 1.0) {
      const skate = fbm(cx * 80, cz * 80);
      return jitter(skate > 0.56 ? 0xe7f5fa : 0xbde2f0, 0.025);
    }

    const gl = inEllipse(cx, cz, GREAT_LAWN);
    if (gl < 1.0) {
      const diamonds = [
        [-0.020, -0.096], [0.052, -0.096], [-0.020, -0.075], [0.052, -0.075],
      ];
      for (const [dx, dz] of diamonds) {
        const d1 = Math.abs(cx - dx) + Math.abs(cz - dz);
        if (d1 < 0.0085) return jitter(d1 < 0.0025 ? 0x6ba645 : 0xc68a52, 0.035);
      }
      const stripe = Math.floor(cx * 240) & 1;
      return jitter(stripe ? 0x5ea140 : 0x4f9035, 0.035);
    }

    if (inEllipse(cx, cz, SHEEP_MEADOW) < 1.0) {
      const n = fbm(cx * 36, cz * 36);
      return jitter(n > 0.52 ? 0x67a642 : 0x559238, 0.045);
    }

    if (isMallWalk(cx, cz)) {
      const paver = (Math.floor(cx * 280) ^ Math.floor(cz * 280)) & 1;
      return jitter(paver ? 0xaea99c : 0x9b968a, 0.03);
    }
    const dPath = Math.min(
      segDist(cx, cz, WEST_DRIVE),
      segDist(cx, cz, EAST_DRIVE),
      segDist(cx, cz, CENTER_DRIVE),
    );
    if (dPath < 0.0075) return jitter(0x52565c, 0.03);
    if (segDist(cx, cz, RAMBLE_PATHS) < 0.0045) return jitter(0xb59c76, 0.035);

    const n = fbm(cx * 30 + 3, cz * 30 + 8);
    const leaf = fbm(cx * 70 + 11, cz * 70 + 4);
    if (leaf > 0.72 && n < 0.56) return jitter(0xb87636, 0.055);
    if (n > 0.56) return jitter(0x528836, 0.05);
    return jitter(n > 0.36 ? 0x41742c : 0x5e8f3b, 0.055);
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

  // Zócalo geológico de Manhattan Schist con dos nichos laterales para el NYC Subway + base subdividida
  const rim = ringPts[K];
  const radial = new THREE.Vector3();
  const Y_STRATA = -0.008, Y_PLINTH = -0.030;
  const subwayRecess = (ang) => smooth((0.18 - Math.abs(Math.sin(ang))) / 0.07);

  const botRings = 10;
  const botRingPts = [];
  for (let br = 0; br <= botRings; br++) {
    const t = br / botRings;
    const row = [];
    for (let s = 0; s < S; s++) {
      const a = rim[s].v;
      row.push(new THREE.Vector3(CX + (a.x - CX) * 0.985 * t, FLOOR, CZ + (a.z - CZ) * 0.985 * t));
    }
    botRingPts.push(row);
  }
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  for (let s = 0; s < S; s++) {
    const ra = rim[s], rb = rim[(s + 1) % S];
    const a = ra.v, b = rb.v;
    const recA = 1 - 0.068 * subwayRecess(ra.ang);
    const recB = 1 - 0.068 * subwayRecess(rb.ang);
    const a1 = new THREE.Vector3(CX + (a.x - CX) * 1.002 * recA, Y_STRATA, CZ + (a.z - CZ) * 1.002 * recA);
    const b1 = new THREE.Vector3(CX + (b.x - CX) * 1.002 * recB, Y_STRATA, CZ + (b.z - CZ) * 1.002 * recB);
    const a2 = new THREE.Vector3(CX + (a.x - CX) * 0.994 * recA, Y_PLINTH, CZ + (a.z - CZ) * 0.994 * recA);
    const b2 = new THREE.Vector3(CX + (b.x - CX) * 0.994 * recB, Y_PLINTH, CZ + (b.z - CZ) * 0.994 * recB);
    const a3 = botRingPts[botRings][s];
    const b3 = botRingPts[botRings][(s + 1) % S];
    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    const inSub = 0.5 * (subwayRecess(ra.ang) + subwayRecess(rb.ang)) > 0.45;
    const topCol = s % 2 ? 0x676b72 : 0x575b62;
    const midCol = inSub ? (s % 2 ? 0x1b2430 : 0x222d3a) : (s % 2 ? 0x454950 : 0x3b3e45);
    addQuad(a, b, b1, a1, topCol, radial, 0.028);
    addQuad(a1, b1, b2, a2, midCol, radial, 0.025);
    addQuad(a2, b2, b3, a3, 0x2a2d33, radial, 0.022);
  }
  for (let br = 0; br < botRings; br++) {
    const A = botRingPts[br], B = botRingPts[br + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      const botHex = (br + (s >> 3)) & 1 ? 0x26292e : 0x202227;
      if (br === 0) addTri(centerBottom, B[s], B[s1], jitter(botHex, 0.02), DOWN);
      else addQuad(A[s], A[s1], B[s1], B[s], jitter(botHex, 0.02), DOWN, 0.02);
    }
  }

  // Galerías del NYC Subway incrustadas en los nichos laterales (-X y +X)
  const buildSubwayBay = (sideSign) => {
    const sx = sideSign * 0.326;
    addBoxDirect(sx, Y_PLINTH + 0.001, 0, 0.026, 0.004, 0.120, 0x3f434a, 0.03);
    addBoxDirect(sx + sideSign * 0.009, Y_STRATA - 0.0015, 0, 0.008, 0.003, 0.118, 0x4f555e, 0.025);
    addBoxDirect(sx - sideSign * 0.008, Y_PLINTH + 0.011, 0, 0.004, 0.003, 0.112, 0xe8e4d8, 0.02);
    addBoxDirect(sx - sideSign * 0.007, Y_PLINTH + 0.011, 0, 0.004, 0.0014, 0.112, sideSign > 0 ? 0x1e7e46 : 0x2058a8, 0.02);
    for (let z = -0.052; z <= 0.052; z += 0.0065) {
      addBoxDirect(sx + sideSign * 0.002, Y_PLINTH + 0.0034, z, 0.012, 0.0016, 0.0024, 0x5c422c, 0.03);
    }
    for (const rx of [-0.003, 0.003]) {
      addBoxDirect(sx + sideSign * 0.002 + rx, Y_PLINTH + 0.0044, 0, 0.0014, 0.0018, 0.112, 0x8e959e, 0.03);
    }
    for (let z = -0.054; z <= 0.054; z += 0.027) {
      addBoxDirect(sx + sideSign * 0.009, (Y_STRATA + Y_PLINTH) * 0.5, z, 0.0028, Y_STRATA - Y_PLINTH + 0.003, 0.0028, 0x3b5944, 0.03);
    }
    for (const cz of [-0.032, 0, 0.032]) {
      const cy = Y_PLINTH + 0.010;
      addBoxDirect(sx + sideSign * 0.002, cy, cz, 0.0095, 0.0095, 0.028, 0xc9cfd6, 0.025);
      addBoxDirect(sx + sideSign * 0.002, cy + 0.0052, cz, 0.0085, 0.002, 0.027, 0x8e959c, 0.025);
      addBoxDirect(sx + sideSign * 0.002 + sideSign * 0.0048, cy + 0.001, cz, 0.0012, 0.0035, 0.025, 0x262d38, 0.02);
      addBoxDirect(sx + sideSign * 0.002 + sideSign * 0.0049, cy - 0.002, cz, 0.0012, 0.0015, 0.026, 0x1e5ca8, 0.02);
      features.push({ type: 'city', pos: [sx + sideSign * 0.008, cy + 0.001, cz], size: 0.007 });
    }
  };
  buildSubwayBay(-1);
  buildSubwayBay(1);

  // =====================================================================
  // 4. BETHESDA TERRACE, ARCADA TRIPLE, ESCALINATAS Y FUENTE DEL ÁNGEL
  // =====================================================================
  {
    const bx = 0.012, by = 0.010;
    for (let i = -5; i <= 5; i++) {
      const px = bx + i * 0.0055, pz = 0.056 + Math.abs(i) * 0.0005;
      addBoxDirect(px, by + 0.003, pz, 0.0024, 0.008, 0.0024, 0xd8c39b, 0.03);
    }
    addBoxDirect(bx, by + 0.005, 0.057, 0.058, 0.0022, 0.0028, 0xe0cda6, 0.03);

    const fx = bx, fz = 0.066;
    addGeo(new THREE.CylinderGeometry(0.0135, 0.0145, 0.0055, 14), 0xc9b48d, { p: [fx, by + 0.001, fz], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0115, 0.0115, 0.004, 14), 0x5ab1c4, { p: [fx, by + 0.0024, fz], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0042, 0.0052, 0.0075, 10), 0xbfa982, { p: [fx, by + 0.0055, fz], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0075, 0.0035, 0.003, 12), 0xd4c09a, { p: [fx, by + 0.0095, fz], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0032, 0.006, 8), 0xc4ae85, { p: [fx, by + 0.013, fz], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0044, 0.002, 0.0022, 10), 0xd8c59e, { p: [fx, by + 0.016, fz], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0018, 0.0065, 7), 0x597d70, { p: [fx, by + 0.0195, fz], amt: 0.04 });
    addGeo(new THREE.SphereGeometry(0.0013, 6, 5), 0x597d70, { p: [fx, by + 0.0232, fz], amt: 0.04 });
    for (const wx of [-1, 1]) {
      addBoxDirect(fx + wx * 0.0026, by + 0.0215, fz + 0.0008, 0.0045, 0.0022, 0.0012, 0x628a7b, 0.04, wx * 0.38);
    }
    features.push({ type: 'sparkle', pos: [fx, by + 0.018, fz], size: 0.010 });
    features.push({ type: 'sparkle', pos: [fx + 0.005, by + 0.011, fz], size: 0.009 });
    features.push({ type: 'sparkle', pos: [fx - 0.005, by + 0.011, fz], size: 0.009 });

    const wallZ = 0.079;
    addBoxDirect(bx, 0.017, wallZ, 0.056, 0.018, 0.010, limestoneColor([0xd8c39b, 0xccb58c, 0xe0cea8, 0xc1a980]), 0.03);
    for (const ax of [bx - 0.009, bx, bx + 0.009]) {
      addBoxDirect(ax, 0.0155, wallZ - 0.0048, 0.0065, 0.009, 0.0028, 0x3b2d22, 0.03);
      addGeo(new THREE.CylinderGeometry(0.0033, 0.0033, 0.003, 10), 0x453528, {
        p: [ax, 0.0195, wallZ - 0.0045], r: [Math.PI / 2, 0, 0], amt: 0.03,
      });
      features.push({ type: 'city', pos: [ax, 0.020, wallZ - 0.0068], size: 0.008 });
    }
    addBoxDirect(bx, 0.027, wallZ - 0.002, 0.058, 0.0035, 0.0035, 0xdfcba2, 0.03);

    for (const sx of [-1, 1]) {
      const steps = 8;
      for (let st = 0; st < steps; st++) {
        const f = st / (steps - 1);
        const stepX = bx + sx * (0.016 + f * 0.016);
        const stepY = 0.011 + f * 0.015;
        addBoxDirect(stepX, stepY * 0.5 + 0.003, wallZ - 0.0055, 0.0045, stepY, 0.008, 0xd4be95, 0.03);
      }
      const lx = bx + sx * 0.015;
      addBoxDirect(lx, 0.015, wallZ - 0.010, 0.0042, 0.012, 0.0042, 0xcab287, 0.03);
      addGeo(new THREE.SphereGeometry(0.0018, 7, 5), 0xffe4a0, { p: [lx, 0.023, wallZ - 0.010] });
      features.push({ type: 'city', pos: [lx, 0.0235, wallZ - 0.010], size: 0.009 });
    }
  }

  // =====================================================================
  // 5. VISTA ROCK, BELVEDERE CASTLE, OBELISCO Y AFLORAMIENTOS DE ESQUISTO
  // =====================================================================
  {
    const vx = -0.036, vz = -0.023, vy = 0.044;
    // Peñón glaciar escalonado de esquisto alrededor de Vista Rock (proporciones fieles)
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const rx = vx + Math.cos(ang) * (0.014 + rng() * 0.009);
      const rz = vz + Math.sin(ang) * (0.009 + rng() * 0.007);
      const rh = 0.012 + rng() * 0.014;
      const gy = height(rx, rz);
      addGeo(displaceGeo(new THREE.IcosahedronGeometry(1, 1), 0.06), 0x767b82, {
        p: [rx, gy - 0.002 + rh * 0.2, rz],
        r: [(rng() - 0.5) * 0.2, rng() * 6.28, (rng() - 0.5) * 0.2],
        s: [0.009, rh * 0.55, 0.008],
        colorFn: schistColor,
      });
    }

    const L = makeLocal(vx, vy, vz, 0.08);
    addBoxDirect(...L(0, -0.004, 0), 0.032, 0.016, 0.022, schistColor, 0.035, 0.08);
    for (let i = -3; i <= 3; i++) {
      addBoxDirect(...L(i * 0.0044, 0.006, -0.010), 0.0024, 0.004, 0.0024, schistColor, 0.035, 0.08);
    }
    addBoxDirect(...L(0.004, 0.011, 0.001), 0.020, 0.016, 0.014, limestoneColor([0x8a8f96, 0x7a7f86, 0x989da4, 0x6c7178]), 0.035, 0.08);
    addGeo(new THREE.ConeGeometry(0.0125, 0.010, 4), 0x3b424d, {
      p: L(0.004, 0.024, 0.001), r: [0, 0.08 + Math.PI / 4, 0], s: [1.25, 1.0, 0.92], amt: 0.04,
    });
    addGeo(new THREE.CylinderGeometry(0.0064, 0.0070, 0.036, 8), 0x80858c, {
      p: L(-0.008, 0.019, -0.002), colorFn: schistColor,
    });
    for (let m = 0; m < 8; m++) {
      const a = (m / 8) * Math.PI * 2;
      addBoxDirect(...L(-0.008 + Math.cos(a) * 0.0054, 0.0385, -0.002 + Math.sin(a) * 0.0054),
        0.0024, 0.0032, 0.0024, 0x8e939a, 0.03, 0.08);
    }
    addGeo(new THREE.CylinderGeometry(0.0032, 0.0036, 0.015, 8), 0x8e939a, {
      p: L(-0.008, 0.043, -0.002), amt: 0.035,
    });
    addGeo(new THREE.ConeGeometry(0.0044, 0.011, 8), 0x3f6e62, {
      p: L(-0.008, 0.055, -0.002), amt: 0.04,
    });
    for (const [wx, wy, wz, yaw] of [
      [-0.008, 0.022, -0.0085, Math.PI],
      [0.004, 0.012, -0.0062, Math.PI],
      [0.004, 0.012, 0.0082, 0],
    ]) {
      addBoxDirect(...L(wx, wy, wz), 0.0028, 0.0046, 0.0014, 0x262930, 0.02, 0.08);
      features.push({ type: 'window', pos: L(wx, wy, wz + (yaw ? -0.001 : 0.001)), yaw: yaw + 0.08, w: 0.0026, h: 0.0040 });
    }
    features.push({ type: 'smoke', pos: L(0.011, 0.027, 0.004), size: 0.0065 });
  }

  // Cleopatra's Needle (Obelisco egipcio de granito rosado junto al Met)
  {
    const ox = 0.124, oz = -0.082, oy = height(ox, oz);
    addGeo(new THREE.CylinderGeometry(0.010, 0.012, 0.007, 4), 0x9b958b, { p: [ox, oy, oz], r: [0, Math.PI / 4, 0], amt: 0.03 });
    addBoxDirect(ox, oy + 0.006, oz, 0.009, 0.007, 0.009, 0x8a847a, 0.03);
    addGeo(new THREE.CylinderGeometry(0.0020, 0.0034, 0.034, 4), 0xc78f7c, {
      p: [ox, oy + 0.026, oz], r: [0, Math.PI / 4, 0], amt: 0.03,
    });
    addGeo(new THREE.ConeGeometry(0.0021, 0.0048, 4), 0xdeb66a, {
      p: [ox, oy + 0.0452, oz], r: [0, Math.PI / 4, 0], amt: 0.03,
    });
  }

  const addRockOutcrop = (rx, rz, rw, rh, rd, rot = 0) => {
    const ry = height(rx, rz);
    const L = makeLocal(rx, ry, rz, rot);
    for (let i = 0; i < 5; i++) {
      const lx = (i - 2) * rw * 0.22;
      const lh = rh * (1 - Math.abs(i - 2) * 0.18);
      addGeo(displaceGeo(new THREE.IcosahedronGeometry(1, 1), 0.08), 0x767b82, {
        p: L(lx, lh * 0.12, (rng() - 0.5) * rd * 0.25),
        r: [(rng() - 0.5) * 0.25, rot + rng() * 0.5, (rng() - 0.5) * 0.2],
        s: [rw * 0.42, lh * 0.65, rd * 0.55],
        colorFn: schistColor,
      });
    }
  };
  addRockOutcrop(-0.138, 0.194, 0.028, 0.014, 0.018, 0.4);   // Umpire Rock
  addRockOutcrop(-0.120, 0.146, 0.020, 0.010, 0.014, -0.3);  // Rat Rock
  addRockOutcrop(-0.004, -0.004, 0.022, 0.011, 0.015, 0.2);  // Ramble Ridge A
  addRockOutcrop(0.038, 0.008, 0.020, 0.010, 0.014, -0.5);   // Ramble Ridge B
  addRockOutcrop(-0.080, -0.242, 0.026, 0.014, 0.016, 0.1);  // North Woods Outcrop

  // =====================================================================
  // 6. PUENTES HISTÓRICOS, LOEB BOATHOUSE, BOTES, VELEROS Y WOLLMAN RINK
  // =====================================================================
  const buildArchBridge = (cx, cz, span, width, yaw, archRise, deckCol, railCol, stoneCol) => {
    const segs = 12;
    const baseH = Y_WATER;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const toW = (lx, ly, lz) => [cx + lx * c + lz * s, baseH + ly, cz - lx * s + lz * c];

    for (const endSign of [-1, 1]) {
      addBoxDirect(...toW(endSign * (span * 0.5 + 0.004), -0.003, 0), 0.010, 0.014, width + 0.004, stoneCol, 0.035, yaw);
      for (const side of [-1, 1]) {
        const upP = toW(endSign * (span * 0.5 + 0.002), 0.006, side * (width * 0.52));
        addBoxDirect(...upP, 0.0032, 0.006, 0.0032, stoneCol, 0.03, yaw);
        addGeo(new THREE.SphereGeometry(0.0018, 6, 5), railCol, { p: [upP[0], upP[1] + 0.0038, upP[2]] });
      }
    }

    for (let i = 0; i < segs; i++) {
      const t0 = i / segs - 0.5, t1 = (i + 1) / segs - 0.5, tm = 0.5 * (t0 + t1);
      const y0 = 0.003 + (1 - 4 * t0 * t0) * archRise;
      const y1 = 0.003 + (1 - 4 * t1 * t1) * archRise;
      const ym = 0.5 * (y0 + y1);
      const slopeAng = Math.atan2(y1 - y0, span / segs);
      const pDeck = toW(tm * span, ym, 0);
      addGeo(new THREE.BoxGeometry(span / segs * 1.08, 0.0022, width), deckCol, {
        p: pDeck, r: [0, yaw, slopeAng], amt: 0.03,
      });
      addGeo(new THREE.BoxGeometry(span / segs * 1.08, 0.0020, width * 0.92), railCol, {
        p: toW(tm * span, ym - 0.0018, 0), r: [0, yaw, slopeAng], amt: 0.03,
      });
      for (const side of [-1, 1]) {
        const zOff = side * (width * 0.48);
        addRod(toW(t0 * span, y0, zOff), toW(t0 * span, y0 + 0.0045, zOff), 0.0009, railCol, 4);
        addRod(toW(t0 * span, y0 + 0.0045, zOff), toW(t1 * span, y1 + 0.0045, zOff), 0.0010, railCol, 4);
      }
    }
  };

  buildArchBridge(-0.048, 0.036, 0.028, 0.0075, Math.PI * 0.45, 0.0075, 0x8b674b, 0xefe3c8, 0x9b7a5e);
  features.push({ type: 'city', pos: [-0.048, Y_WATER + 0.017, 0.036], size: 0.008 });

  buildArchBridge(0.122, 0.212, 0.028, 0.0082, Math.PI * 0.52, 0.0085, 0x7b756d, 0x62676e, schistColor);
  features.push({ type: 'city', pos: [0.122, Y_WATER + 0.017, 0.212], size: 0.008 });

  for (const bx of [-0.068, 0.068]) {
    addBoxDirect(bx, 0.0185, TRANS_Z, 0.024, 0.0045, 0.026, schistColor, 0.035);
    for (const side of [-1, 1]) {
      addBoxDirect(bx + side * 0.0125, 0.012, TRANS_Z, 0.006, 0.018, 0.028, schistColor, 0.035);
      addBoxDirect(bx + side * 0.011, 0.0225, TRANS_Z, 0.0025, 0.004, 0.026, 0x7e7970, 0.03);
    }
  }

  for (const [gx, gz] of [[RES_CX, RES_CZ - RES_RZ - 0.002], [RES_CX, RES_CZ + RES_RZ + 0.002]]) {
    const gy = height(gx, gz);
    addBoxDirect(gx, gy + 0.003, gz, 0.016, 0.014, 0.011, limestoneColor([0x9c968b, 0x8a8479, 0xa8a298, 0x7a746a]), 0.035);
    addGeo(new THREE.ConeGeometry(0.010, 0.008, 4), 0x454e54, { p: [gx, gy + 0.013, gz], r: [0, Math.PI / 4, 0], s: [1.15, 1, 0.85] });
    features.push({ type: 'city', pos: [gx, gy + 0.011, gz], size: 0.008 });
  }

  {
    const bx = 0.086, bz = 0.033, by = 0.012;
    const L = makeLocal(bx, by, bz, -0.2);
    addBoxDirect(...L(0, 0.004, 0), 0.020, 0.014, 0.026, brickColor(), 0.03, -0.2);
    addBoxDirect(...L(-0.008, 0.004, 0), 0.007, 0.010, 0.024, 0xf2ece0, 0.025, -0.2);
    addMansardRoof(bx, by + 0.011, bz, 0.022, 0.028, 0.006, 0.014, 0.008, 0x3b6e55, -0.2);
    addBoxDirect(...L(-0.015, -0.003, 0), 0.014, 0.005, 0.018, woodColor, 0.035, -0.2);
    features.push({ type: 'window', pos: L(-0.012, 0.005, 0), yaw: -Math.PI / 2 - 0.2, w: 0.007, h: 0.0038 });
    features.push({ type: 'city', pos: L(-0.018, 0.002, -0.006), size: 0.008 });
    features.push({ type: 'city', pos: L(-0.018, 0.002, 0.006), size: 0.008 });
  }

  const ROWBOATS = [
    [-0.105, 0.030, 0.4, 0x2e6b4e], [-0.088, 0.038, -0.5, 0xc84a32], [-0.070, 0.036, 1.1, 0x2f5a8c],
    [-0.030, 0.034, 0.2, 0xd49635], [-0.012, 0.041, -0.8, 0x357458], [0.006, 0.045, 0.7, 0x9b3a2e],
    [0.024, 0.042, -0.3, 0x2d5885], [0.042, 0.040, 0.9, 0xc97b2c], [0.056, 0.034, -0.4, 0x457d5e],
    [0.064, 0.026, 0.2, 0xb84030],
  ];
  for (const [rx, rz, yaw, hex] of ROWBOATS) {
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0014, 0.0026, 6), hex, {
      p: [rx, Y_WATER + 0.0005, rz], r: [0, yaw, 0], s: [0.85, 1, 1.85], amt: 0.035,
    });
    addBoxDirect(rx, Y_WATER + 0.0020, rz, 0.0022, 0.0010, 0.0020, 0x8d6239, 0.03, yaw);
  }

  {
    const segs = 28;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const mx = CW_CX + Math.cos((a0 + a1) * 0.5) * CW_RX;
      const mz = CW_CZ + Math.sin((a0 + a1) * 0.5) * CW_RZ;
      addBoxDirect(mx, Y_WATER + 0.002, mz, 0.0055, 0.005, 0.0032, 0xb5b0a4, 0.03, -(a0 + a1) * 0.5);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const sx = CW_CX + Math.cos(a) * CW_RX * 0.52;
      const sz = CW_CZ + Math.sin(a) * CW_RZ * 0.52;
      addGeo(new THREE.CylinderGeometry(0.0018, 0.0010, 0.0020, 6), i % 2 ? 0x264d7a : 0xa33a2c, {
        p: [sx, Y_WATER + 0.0005, sz], r: [0, a + 1.2, 0], s: [0.7, 1, 1.8],
      });
      addGeo(new THREE.ConeGeometry(0.0022, 0.0075, 4), 0xf6f3ea, {
        p: [sx, Y_WATER + 0.0045, sz], r: [0, a + 1.2, 0], s: [0.35, 1, 1.1],
      });
    }
  }

  {
    const wx = -0.014, wz = 0.220, wy = 0.010;
    const segs = 32;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const rx = wx + Math.cos(a) * 0.039, rz = wz + Math.sin(a) * 0.019;
      addBoxDirect(rx, wy + 0.0018, rz, 0.0075, 0.0045, 0.0026, 0xede9df, 0.025, -a);
    }
    addBoxDirect(wx - 0.044, wy + 0.004, wz, 0.012, 0.011, 0.022, brickColor(), 0.03);
    addMansardRoof(wx - 0.044, wy + 0.0095, wz, 0.013, 0.023, 0.003, 0.011, 0.007, 0x454e57);
    const skaterColors = [0xd94b38, 0x2e6da4, 0xe2a82e, 0x3b8c59, 0x8f469e, 0xe87038];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      const rad = 0.35 + (i % 3) * 0.24;
      const sx = wx + Math.cos(a) * 0.033 * rad, sz = wz + Math.sin(a) * 0.015 * rad;
      addGeo(new THREE.CylinderGeometry(0.0010, 0.0013, 0.0045, 5), skaterColors[i % skaterColors.length], {
        p: [sx, wy + 0.002, sz],
      });
      addGeo(new THREE.SphereGeometry(0.0010, 5, 4), 0xf2ccb0, { p: [sx, wy + 0.0048, sz] });
    }
    features.push({ type: 'sparkle', pos: [wx - 0.012, wy + 0.003, wz - 0.004], size: 0.009 });
    features.push({ type: 'sparkle', pos: [wx + 0.015, wy + 0.003, wz + 0.005], size: 0.009 });
    features.push({ type: 'city', pos: [wx - 0.042, wy + 0.009, wz], size: 0.008 });
  }

  // =====================================================================
  // 7. THE MALL, NAUMBURG BANDSHELL, CARRUSEL, TAVERN ON THE GREEN, THE DAIRY, STRAWBERRY FIELDS
  // =====================================================================
  {
    const nx = 0.008, nz = 0.104, ny = 0.021;
    addBoxDirect(nx, ny, nz, 0.022, 0.006, 0.016, 0xd8cdb6, 0.03);
    addGeo(new THREE.SphereGeometry(0.010, 12, 8, 0, Math.PI, 0, Math.PI * 0.55), 0xe6dcc6, {
      p: [nx, ny + 0.003, nz - 0.002], r: [0, 0, 0], s: [1.0, 1.15, 0.85], amt: 0.025,
    });
    addGeo(new THREE.TorusGeometry(0.010, 0.0016, 6, 14, Math.PI), 0xc9bc9f, {
      p: [nx, ny + 0.003, nz + 0.004], amt: 0.03,
    });
    features.push({ type: 'city', pos: [nx, ny + 0.007, nz + 0.002], size: 0.009 });
  }

  {
    for (let i = 0; i < 8; i++) {
      const f = i / 7;
      const mz = 0.118 + f * 0.064;
      const mx = MALL_AX - (mz - 0.15) * 0.12;
      const my = height(mx, mz);
      for (const side of [-1, 1]) {
        const bx = mx + side * 0.0105;
        addBoxDirect(bx, my + 0.0018, mz, 0.0024, 0.0022, 0.0052, woodColor, 0.03, -0.12);
        if (i % 2 === 0) {
          addRod([bx + side * 0.0015, my - 0.001, mz - 0.003], [bx + side * 0.0015, my + 0.0105, mz - 0.003], 0.0010, 0x262a2e, 5);
          addGeo(new THREE.SphereGeometry(0.0016, 6, 5), 0xffe4a0, { p: [bx + side * 0.0015, my + 0.0112, mz - 0.003] });
          features.push({ type: 'city', pos: [bx + side * 0.0015, my + 0.0115, mz - 0.003], size: 0.008 });
        }
        if (i >= 4 && i % 2 === 1) {
          const sx = mx + side * 0.0132;
          addBoxDirect(sx, my + 0.0025, mz, 0.0035, 0.006, 0.0035, 0x9c968b, 0.03);
          addGeo(new THREE.CylinderGeometry(0.0011, 0.0014, 0.0045, 6), 0x4b6356, { p: [sx, my + 0.0072, mz] });
          addGeo(new THREE.SphereGeometry(0.0010, 5, 4), 0x4b6356, { p: [sx, my + 0.0102, mz] });
        }
      }
    }
  }

  {
    const cx = -0.042, cz = 0.175, cy = 0.019;
    addGeo(new THREE.CylinderGeometry(0.014, 0.0145, 0.008, 8), 0xa84836, { p: [cx, cy + 0.002, cz], colorFn: brickColor() });
    for (let h = 0; h < 8; h++) {
      const a = (h / 8) * Math.PI * 2;
      addBoxDirect(cx + Math.cos(a) * 0.0115, cy + 0.006, cz + Math.sin(a) * 0.0115,
        0.0022, 0.0032, 0.0022, h % 2 ? 0xf6eedb : 0xd88c4a, 0.03, -a);
    }
    addGeo(new THREE.ConeGeometry(0.0155, 0.011, 12), 0xc43a2e, {
      p: [cx, cy + 0.0115, cz],
      colorFn: (va, vb, vc) => {
        const mx = (va.x + vb.x + vc.x) / 3 - cx, mz = (va.z + vb.z + vc.z) / 3 - cz;
        const idx = Math.floor((Math.atan2(mz, mx) + Math.PI) / (Math.PI / 6));
        return jitter(idx & 1 ? 0xf4ecd8 : 0xc63a2c, 0.03);
      },
    });
    addGeo(new THREE.SphereGeometry(0.0026, 7, 5), 0xe6be54, { p: [cx, cy + 0.018, cz] });
    features.push({ type: 'city', pos: [cx, cy + 0.018, cz], size: 0.009 });
  }

  {
    const tx = -0.174, tz = 0.162, ty = 0.017;
    addBoxDirect(tx, ty + 0.004, tz, 0.024, 0.012, 0.016, brickColor([0xb2543e, 0xa04632, 0xc0624a, 0x8f3c2a]), 0.03);
    addBoxDirect(tx + 0.014, ty + 0.0035, tz - 0.006, 0.012, 0.010, 0.012, 0xf2ead6, 0.025);
    addMansardRoof(tx, ty + 0.010, tz, 0.025, 0.017, 0.011, 0.005, 0.007, 0x3f474e);
    addMansardRoof(tx + 0.014, ty + 0.0085, tz - 0.006, 0.013, 0.013, 0.004, 0.004, 0.006, 0x456e5c);
    features.push({ type: 'window', pos: [tx + 0.014, ty + 0.005, tz + 0.001], yaw: 0, w: 0.005, h: 0.0032 });
    features.push({ type: 'smoke', pos: [tx - 0.006, ty + 0.018, tz - 0.002], size: 0.0065 });
    for (let l = 0; l < 4; l++) {
      features.push({ type: 'city', pos: [tx + 0.008 + l * 0.005, ty + 0.010, tz + 0.011], size: 0.0075 });
    }
  }

  {
    const dx = 0.070, dz = 0.164, dy = 0.020;
    addBoxDirect(dx, dy + 0.004, dz, 0.016, 0.012, 0.012, 0x9b7856, 0.035);
    addMansardRoof(dx, dy + 0.010, dz, 0.017, 0.013, 0.006, 0.003, 0.007, 0x3b444c);
    addGeo(new THREE.ConeGeometry(0.0026, 0.008, 6), 0x5c4734, { p: [dx, dy + 0.020, dz] });
  }

  {
    const sx = -0.165, sz = 0.034, sy = 0.018;
    addGeo(new THREE.CylinderGeometry(0.013, 0.0135, 0.0025, 16), 0xe6e2d8, {
      p: [sx, sy + 0.0005, sz],
      colorFn: (va, vb, vc) => {
        const mx = (va.x + vb.x + vc.x) / 3 - sx, mz = (va.z + vb.z + vc.z) / 3 - sz;
        const r = Math.hypot(mx, mz);
        const a = Math.atan2(mz, mx);
        if (r < 0.0035) return jitter(0x222428, 0.02);
        const sector = Math.floor((a + Math.PI) / (Math.PI / 4));
        return jitter((sector & 1) ? 0x26282c : 0xece8de, 0.025);
      },
    });
  }

  // =====================================================================
  // 8. MURO PERIMETRAL, PORTALES Y SKYLINE DE MANHATTAN + TAXIS AMARILLOS
  // =====================================================================
  {
    const segs = 120;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const am = (a0 + a1) * 0.5;
      const r = rimRadius(am) * 0.722;
      const wx = Math.cos(am) * r, wz = Math.sin(am) * r;
      const isGate = Math.abs(wx) < 0.022 || Math.abs(wz) < 0.022 ||
        (Math.abs(Math.abs(wx) - 0.22) < 0.025 && Math.abs(Math.abs(wz) - 0.24) < 0.025);
      if (isGate) {
        addBoxDirect(wx, 0.018, wz, 0.0055, 0.011, 0.0055, 0xb8ad97, 0.03);
        continue;
      }
      const dx = Math.cos(a1) * rimRadius(a1) - Math.cos(a0) * rimRadius(a0);
      const dz = Math.sin(a1) * rimRadius(a1) - Math.sin(a0) * rimRadius(a0);
      const yaw = Math.atan2(dx, dz) + Math.PI * 0.5;
      const segLen = Math.hypot(dx, dz) * 0.722 * 1.06;
      addBoxDirect(wx, 0.016, wz, segLen, 0.0085, 0.0036, 0xb5ab96, 0.03, yaw);
    }
  }

  // Constructor arquitectónico detallado en las 4 caras (pilastras, paños vidriados oscuros y ventanas puntuales)
  const CITY_Y = 0.014;
  const dressFacadeAllSides = (cx, y0, cz, tw, h, td, trimHex, rot = 0, addLit = true) => {
    const L = makeLocal(cx, y0, cz, rot);
    // Pilastras verticales y paños de cristal oscuro en las 4 caras
    for (const sz of [-1, 1]) {
      for (const px of [-0.34, -0.11, 0.11, 0.34]) {
        addBoxDirect(...L(px * tw, h * 0.5, sz * (td * 0.5 + 0.0005)), tw * 0.075, h, 0.0014, trimHex, 0.025, rot);
      }
      for (const px of [-0.225, 0, 0.225]) {
        addBoxDirect(...L(px * tw, h * 0.5, sz * (td * 0.5 + 0.0002)), tw * 0.11, h * 0.84, 0.0010, 0x26313d, 0.02, rot);
        if (addLit && rng() < 0.42) {
          const wy = h * (0.28 + rng() * 0.48);
          features.push({
            type: 'window',
            pos: L(px * tw, wy, sz * (td * 0.5 + 0.0014)),
            yaw: (sz > 0 ? 0 : Math.PI) + rot,
            w: Math.min(0.0042, tw * 0.10),
            h: Math.min(0.0052, h * 0.16),
          });
        }
      }
    }
    for (const sx of [-1, 1]) {
      for (const pz of [-0.34, -0.11, 0.11, 0.34]) {
        addBoxDirect(...L(sx * (tw * 0.5 + 0.0005), h * 0.5, pz * td), 0.0014, h, td * 0.075, trimHex, 0.025, rot);
      }
      for (const pz of [-0.225, 0, 0.225]) {
        addBoxDirect(...L(sx * (tw * 0.5 + 0.0002), h * 0.5, pz * td), 0.0010, h * 0.84, td * 0.11, 0x26313d, 0.02, rot);
        if (addLit && rng() < 0.42) {
          const wy = h * (0.28 + rng() * 0.48);
          features.push({
            type: 'window',
            pos: L(sx * (tw * 0.5 + 0.0014), wy, pz * td),
            yaw: (sx > 0 ? Math.PI / 2 : -Math.PI / 2) + rot,
            w: Math.min(0.0042, td * 0.10),
            h: Math.min(0.0052, h * 0.16),
          });
        }
      }
    }
    // Bandas horizontales de antepecho
    const bands = Math.max(1, Math.floor(h / 0.028));
    for (let b = 1; b < bands; b++) {
      addBoxDirect(...L(0, (b / bands) * h, 0), tw * 1.018, 0.0018, td * 1.018, trimHex, 0.02, rot);
    }
  };

  const addArtDecoTower = (cx, cz, w, d, tiers, baseHex, trimHex, spireH = 0, rot = 0, yStart = CITY_Y) => {
    const L = makeLocal(cx, yStart, cz, rot);
    const pal = [baseHex, Math.max(0, baseHex - 0x0a0a0a), baseHex + 0x080808, trimHex];
    let curY = 0;
    for (let t = 0; t < tiers.length; t++) {
      const [fw, fd, h] = tiers[t];
      const tw = w * fw, td = d * fd;
      addBoxDirect(...L(0, curY + h * 0.5 - 0.003, 0), tw, h + 0.006, td, limestoneColor(pal), 0.03, rot);
      dressFacadeAllSides(cx, yStart + curY, cz, tw, h, td, trimHex, rot, t < 2);
      addBoxDirect(...L(0, curY + h, 0), tw * 1.045, 0.0030, td * 1.045, trimHex, 0.025, rot);
      curY += h;
    }
    if (spireH > 0) {
      const cw = Math.min(w, d) * tiers[tiers.length - 1][0] * 0.42;
      addGeo(new THREE.ConeGeometry(cw, spireH * 0.36, 4), 0xd8c38a, {
        p: L(0, curY + spireH * 0.16, 0), r: [0, rot + Math.PI / 4, 0], amt: 0.03,
      });
      addGeo(new THREE.CylinderGeometry(0.0018, 0.0028, spireH * 0.72, 6), 0xcacfd6, {
        p: L(0, curY + spireH * 0.58, 0), amt: 0.03,
      });
      features.push({ type: 'city', pos: L(0, curY + spireH * 0.94, 0), size: 0.009 });
    }
  };

  const addWaterTower = (wx, wy, wz) => {
    for (const dx of [-0.0022, 0.0022]) {
      for (const dz of [-0.0022, 0.0022]) {
        addRod([wx + dx, wy - 0.002, wz + dz], [wx + dx * 0.7, wy + 0.0045, wz + dz * 0.7], 0.0008, 0x3b3d42, 4);
      }
    }
    addGeo(new THREE.CylinderGeometry(0.0038, 0.0038, 0.0068, 8), 0x805737, { p: [wx, wy + 0.0072, wz], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(0.0043, 0.0036, 8), 0x563922, { p: [wx, wy + 0.0122, wz], amt: 0.04 });
  };

  // --- Grupo Sureste (+X, +Z): The Plaza Hotel + Torre Art Déco 59th/5th + Grand Army Plaza ---
  {
    const px = 0.186, pz = 0.320, pw = 0.070, ph = 0.088, pd = 0.038;
    addBoxDirect(px, CITY_Y + ph * 0.5 - 0.003, pz, pw, ph + 0.006, pd, limestoneColor([0xf2ece0, 0xe7dfd0, 0xf8f3ea, 0xd9cfbd]), 0.025);
    dressFacadeAllSides(px, CITY_Y, pz, pw, ph, pd, 0xd8ceb8, 0, true);
    addBoxDirect(px, CITY_Y + ph, pz, pw + 0.005, 0.004, pd + 0.005, 0xd8ceb8, 0.025);
    // Tejado mansarda trapezoidal Beaux-Arts en cobre verde patinado + torretas
    addMansardRoof(px, CITY_Y + ph + 0.002, pz, pw + 0.002, pd + 0.002, pw * 0.62, pd * 0.52, 0.022, copperPatinaColor);
    for (const tx of [-0.026, 0.026]) {
      addGeo(new THREE.CylinderGeometry(0.0070, 0.0075, 0.024, 8), 0xf0eadc, { p: [px + tx, CITY_Y + ph + 0.008, pz - 0.011] });
      addGeo(new THREE.ConeGeometry(0.0082, 0.014, 8), 0x458b74, { p: [px + tx, CITY_Y + ph + 0.026, pz - 0.011], colorFn: copperPatinaColor });
    }
    features.push({ type: 'city', pos: [px - 0.016, CITY_Y + 0.010, pz - 0.021], size: 0.009 });
    features.push({ type: 'city', pos: [px + 0.016, CITY_Y + 0.010, pz - 0.021], size: 0.009 });

    // Torre Art Déco SE (hasta Y ≈ 0.305)
    addArtDecoTower(0.256, 0.278, 0.048, 0.048,
      [[1.0, 1.0, 0.100], [0.80, 0.80, 0.075], [0.58, 0.58, 0.048], [0.38, 0.38, 0.026]],
      0xe5d8c2, 0xcab89c, 0.046, 0.12);

    // Grand Army Plaza (Fuente Pulitzer & Estatua Dorada Sherman en esquina SE del parque)
    const gx = 0.222, gz = 0.252;
    addGeo(new THREE.CylinderGeometry(0.012, 0.014, 0.0045, 10), 0xd8cfbe, { p: [gx, CITY_Y - 0.001, gz] });
    addGeo(new THREE.CylinderGeometry(0.0095, 0.0095, 0.003, 10), 0x5ab1c4, { p: [gx, CITY_Y + 0.0012, gz] });
    addBoxDirect(gx, CITY_Y + 0.006, gz, 0.0045, 0.011, 0.0045, 0xd8cfbe, 0.03);
    addGeo(new THREE.SphereGeometry(0.0022, 6, 5), 0xe6be54, { p: [gx, CITY_Y + 0.013, gz] });
    features.push({ type: 'city', pos: [gx, CITY_Y + 0.015, gz], size: 0.008 });
  }

  // --- Grupo Suroeste (-X, +Z): Columbus Circle & Central Park South (dejando el centro abierto) ---
  {
    addArtDecoTower(-0.252, 0.278, 0.048, 0.048,
      [[1.0, 1.0, 0.095], [0.80, 0.80, 0.072], [0.58, 0.58, 0.046], [0.36, 0.36, 0.024]],
      0x586b7d, 0x95a8b8, 0.044, -0.10);
    addArtDecoTower(-0.184, 0.320, 0.046, 0.038,
      [[1.0, 1.0, 0.088], [0.78, 0.78, 0.062], [0.54, 0.54, 0.038]],
      0xdfd3be, 0xc4b59c, 0.024);

    const ccx = -0.224, ccz = 0.252;
    addGeo(new THREE.CylinderGeometry(0.011, 0.014, 0.005, 10), 0xaba599, { p: [ccx, CITY_Y - 0.001, ccz] });
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0028, 0.030, 8), 0xd8d0c0, { p: [ccx, CITY_Y + 0.015, ccz] });
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0016, 0.006, 6), 0x526b5e, { p: [ccx, CITY_Y + 0.033, ccz] });
    features.push({ type: 'city', pos: [ccx, CITY_Y + 0.036, ccz], size: 0.008 });
  }

  // --- Flanco Oeste (-X, Central Park West): San Remo (Torres Gemelas) & El Dorado / Dakota ---
  {
    const sx = -0.292, sz = -0.115, sw = 0.042, sh = 0.116, sd = 0.072;
    addBoxDirect(sx, CITY_Y + sh * 0.5 - 0.003, sz, sw, sh + 0.006, sd, limestoneColor([0xdfd1b8, 0xd2c2a7, 0xe8dcc4, 0xc2b093]), 0.03);
    dressFacadeAllSides(sx, CITY_Y, sz, sw, sh, sd, 0xc8b79b, 0, true);
    addBoxDirect(sx, CITY_Y + sh, sz, sw + 0.003, 0.003, sd + 0.003, 0xc8b79b, 0.025);
    for (const dz of [-0.020, 0.020]) {
      addArtDecoTower(sx, sz + dz, 0.023, 0.023,
        [[1.0, 1.0, 0.044], [0.74, 0.74, 0.036]],
        0xe6d9c2, 0xcbb99b, 0.026, 0, CITY_Y + sh);
    }
    addWaterTower(sx - 0.006, CITY_Y + sh, sz);

    const ex = -0.292, ez = 0.118, ew = 0.042, eh = 0.104, ed = 0.068;
    addBoxDirect(ex, CITY_Y + eh * 0.5 - 0.003, ez, ew, eh + 0.006, ed, brickColor([0xc7895c, 0xb8784c, 0xd49669, 0xa86940]), 0.03);
    dressFacadeAllSides(ex, CITY_Y, ez, ew, eh, ed, 0xd8c6a8, 0, true);
    addBoxDirect(ex, CITY_Y + eh, ez, ew + 0.003, 0.003, ed + 0.003, 0xd8c6a8, 0.025);
    for (const dz of [-0.018, 0.018]) {
      addArtDecoTower(ex, ez + dz, 0.021, 0.021,
        [[1.0, 1.0, 0.042], [0.74, 0.74, 0.030]],
        0xd69a6b, 0x458b74, 0.022, 0, CITY_Y + eh);
    }
    addWaterTower(ex - 0.006, CITY_Y + eh, ez);
  }

  // --- Flanco Este (+X, Fifth Avenue / Museum Mile): Gran Museo Neoclásico (Met) + Co-op Beaux-Arts ---
  {
    const mx = 0.288, mz = -0.112, mw = 0.046, mh = 0.052, md = 0.098;
    for (let st = 0; st < 4; st++) {
      addBoxDirect(mx - 0.024 - (3 - st) * 0.0024, CITY_Y + st * 0.0018, mz, 0.006, 0.0036, 0.050, 0xd8d0c0, 0.025);
    }
    addBoxDirect(mx, CITY_Y + 0.024, mz, mw, mh, md, limestoneColor([0xeae2d0, 0xddd4c0, 0xf2ebdc, 0xcfc4af]), 0.025);
    // Columnatas y ventanales arqueados en las fachadas Oeste, Este, Norte y Sur del museo
    for (const az of [-0.028, 0, 0.028]) {
      for (const sx of [-1, 1]) {
        addBoxDirect(mx + sx * 0.0226, CITY_Y + 0.022, mz + az, 0.0036, 0.026, 0.015, 0x3b3630, 0.02);
        features.push({ type: 'window', pos: [mx + sx * 0.025, CITY_Y + 0.022, mz + az], yaw: sx > 0 ? Math.PI / 2 : -Math.PI / 2, w: 0.008, h: 0.012 });
      }
    }
    for (const sz of [-1, 1]) {
      for (const px of [-0.012, 0.012]) {
        addBoxDirect(mx + px, CITY_Y + 0.024, mz + sz * (md * 0.5 + 0.0005), 0.008, 0.024, 0.002, 0x3b3630, 0.02);
      }
    }
    for (let col = 0; col < 8; col++) {
      const cz = mz - 0.040 + col * (0.080 / 7);
      addGeo(new THREE.CylinderGeometry(0.0019, 0.0022, 0.036, 8), 0xf0e9da, { p: [mx - 0.0245, CITY_Y + 0.024, cz] });
      addGeo(new THREE.CylinderGeometry(0.0019, 0.0022, 0.036, 8), 0xf0e9da, { p: [mx + 0.0242, CITY_Y + 0.024, cz] });
    }
    addBoxDirect(mx, CITY_Y + 0.052, mz, mw + 0.004, 0.005, md + 0.004, 0xd8ceb8, 0.025);
    for (const dz of [-0.026, 0, 0.026]) {
      addGeo(new THREE.SphereGeometry(0.012, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), 0x8fb5c4, {
        p: [mx, CITY_Y + 0.054, mz + dz], s: [1, 0.6, 1], amt: 0.03,
      });
    }

    addArtDecoTower(0.292, 0.120, 0.044, 0.062,
      [[1.0, 1.0, 0.106], [0.80, 0.80, 0.046]],
      0xe8dcc8, 0xcabca5, 0);
    addMansardRoof(0.292, CITY_Y + 0.152, 0.120, 0.036, 0.050, 0.020, 0.032, 0.014, 0x454e57);
    addWaterTower(0.298, CITY_Y + 0.152, 0.138);
  }

  // --- Esquinas Noroeste y Noreste (-Z, 110th St) ---
  {
    addArtDecoTower(-0.236, -0.278, 0.046, 0.046,
      [[1.0, 1.0, 0.098], [0.76, 0.76, 0.064], [0.54, 0.54, 0.036]],
      0xb4563f, 0xd8c6a8, 0.018, 0.08);
    addWaterTower(-0.236, CITY_Y + 0.198, -0.278);

    addArtDecoTower(0.236, -0.278, 0.046, 0.046,
      [[1.0, 1.0, 0.102], [0.76, 0.76, 0.068], [0.54, 0.54, 0.038]],
      0xdccbb0, 0xb8a68a, 0.022, -0.08);
  }

  // Taxis Amarillos de NYC (22) y Carruajes de Caballos (3)
  const addYellowCab = (x, z, yaw, yBase = 0.009) => {
    const L = makeLocal(x, yBase, z, yaw);
    addBoxDirect(...L(0, 0.0022, 0), 0.0052, 0.0032, 0.0110, 0xf2b718, 0.03, yaw);
    addBoxDirect(...L(0, 0.0046, -0.0005), 0.0046, 0.0026, 0.0058, 0xf6c428, 0.03, yaw);
    addBoxDirect(...L(0, 0.0064, -0.0002), 0.0020, 0.0012, 0.0014, 0xfff0a0, 0.02, yaw);
    for (const wx of [-0.0024, 0.0024]) {
      for (const wz of [-0.0034, 0.0034]) {
        addGeo(new THREE.CylinderGeometry(0.0012, 0.0012, 0.0012, 6), 0x22252a, {
          p: L(wx, 0.0006, wz), r: [0, yaw, Math.PI / 2],
        });
      }
    }
    features.push({ type: 'city', pos: L(0, 0.0070, 0.0048), size: 0.007 });
  };

  for (let i = 0; i < 6; i++) addYellowCab(-0.10 + i * 0.04, 0.278 + (i % 2) * 0.012, Math.PI / 2);
  for (let i = 0; i < 5; i++) addYellowCab(-0.12 + i * 0.06, -0.282 - (i % 2) * 0.010, -Math.PI / 2);
  for (let i = 0; i < 5; i++) addYellowCab(0.256 + (i % 2) * 0.010, -0.18 + i * 0.09, 0);
  for (let i = 0; i < 4; i++) addYellowCab(-0.256 - (i % 2) * 0.010, -0.15 + i * 0.10, Math.PI);
  addYellowCab(-0.025, TRANS_Z + 0.002, Math.PI / 2, 0.0095);
  addYellowCab(0.042, TRANS_Z - 0.002, -Math.PI / 2, 0.0095);

  for (const cx of [-0.055, 0.015, 0.068]) {
    const cy = 0.0095, cz = 0.264;
    addBoxDirect(cx, cy + 0.003, cz, 0.0055, 0.0042, 0.0075, 0x24332a, 0.03, Math.PI / 2);
    addBoxDirect(cx + 0.0075, cy + 0.0032, cz, 0.0055, 0.0032, 0.0024, 0x5c3e26, 0.04);
    addGeo(new THREE.SphereGeometry(0.0014, 5, 4), 0x5c3e26, { p: [cx + 0.0105, cy + 0.0052, cz] });
  }

  // =====================================================================
  // 9. BOSQUE OTOÑAL Y PERENNE DE CENTRAL PARK + ARBOLADO DE AVENIDAS
  // =====================================================================
  const AUTUMN_PAL = [
    0xd64126, // Arce carmesí
    0xe26f24, // Roble naranja quemado
    0xe6ab2c, // Olmo dorado ámbar
    0xc48b28, // Haya ocre
    0x8d9a32, // Sauce verde oliva
    0x467b32, // Verde parque clásico
    0x568e3b, // Verde fresco
  ];

  const addParkTree = (tx, tz, kind = 0, sc = 1.0) => {
    const ty = height(tx, tz) - 0.0035;
    const hT = (0.010 + rng() * 0.007) * sc;
    const tiltX = (rng() - 0.5) * 0.004, tiltZ = (rng() - 0.5) * 0.004;
    addRod([tx, ty, tz], [tx + tiltX, ty + hT, tz + tiltZ], 0.0018 * sc, 0x563922, 5);
    const cx = tx + tiltX, cy = ty + hT + 0.003 * sc, cz = tz + tiltZ;

    if (kind === 1) {
      const cHex = rng() < 0.5 ? 0x264e27 : 0x305e2e;
      for (let k = 0; k < 3; k++) {
        addGeo(new THREE.ConeGeometry((0.0078 - k * 0.0018) * sc, (0.010 - k * 0.0015) * sc, 7), cHex, {
          p: [cx, cy + k * 0.0045 * sc, cz], r: [0, rng() * 3, 0], amt: 0.06,
        });
      }
      return;
    }

    const hex = kind === 2 ? 0xe4ab2b : AUTUMN_PAL[Math.floor(rng() * AUTUMN_PAL.length)];
    addGeo(new THREE.IcosahedronGeometry(0.0076 * sc, 0), hex, {
      p: [cx, cy, cz], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.15, 0.78, 1.15], amt: 0.075,
    });
    addGeo(new THREE.IcosahedronGeometry(0.0056 * sc, 0), hex, {
      p: [cx + (rng() - 0.5) * 0.006 * sc, cy + 0.0035 * sc, cz + (rng() - 0.5) * 0.006 * sc],
      r: [rng() * 3, rng() * 3, rng() * 3], s: [1.05, 0.76, 1.05], amt: 0.075,
    });
    if (sc > 0.95) {
      addGeo(new THREE.IcosahedronGeometry(0.0045 * sc, 0), hex, {
        p: [cx + (rng() - 0.5) * 0.007 * sc, cy + 0.0015 * sc, cz + (rng() - 0.5) * 0.007 * sc],
        r: [rng() * 3, rng() * 3, rng() * 3], s: [1.0, 0.8, 1.0], amt: 0.075,
      });
    }
  };

  for (let i = 0; i < 15; i++) {
    const mz = 0.118 + (i / 14) * 0.066;
    const mx = MALL_AX - (mz - 0.15) * 0.12;
    for (const side of [-1, 1]) addParkTree(mx + side * 0.0155, mz, 2, 1.18);
  }

  // Arbolado urbano otoñal en las aceras de 59th St y 110th St (dejando el parque despejado)
  for (const sx of [-0.12, -0.06, 0.06, 0.12]) {
    addParkTree(sx, 0.296, 0, 0.72);
    addParkTree(sx, -0.308, 0, 0.72);
  }
  for (const sz of [-0.03, 0.03]) {
    addParkTree(0.280, sz, 0, 0.72);
    addParkTree(-0.280, sz, 0, 0.72);
  }

  let planted = 0;
  for (let tries = 0; planted < 365 && tries < 14000; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = 0.015 + Math.sqrt(rng()) * rimRadius(ang) * 0.70;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (boxNorm(x, z) > 0.705) continue;
    if (isWaterPoint(x, z)) continue;
    if (reservoirNorm(x, z) < 1.21 || turtleNorm(x, z) < 1.18 || conservNorm(x, z) < 1.24) continue;
    if (lakeSigned(x, z) < 0.006 || pondSigned(x, z) < 0.006) continue;
    if (inEllipse(x, z, GREAT_LAWN) < 1.05 || inEllipse(x, z, SHEEP_MEADOW) < 0.96) continue;
    if (Math.hypot((x + 0.014) / 0.048, (z - 0.220) / 0.028) < 1.05) continue;
    if (Math.abs(z - TRANS_Z) < 0.015) continue;
    if (EXPLANADAS.some((p, idx) => idx !== 0 && rectDist(x, z, p) < 0.010)) continue;
    if (Math.min(segDist(x, z, WEST_DRIVE), segDist(x, z, EAST_DRIVE), segDist(x, z, CENTER_DRIVE)) < 0.010) continue;
    const h = height(x, z), sl = slopeAt(x, z);
    if (h < Y_WATER + 0.004 || sl > 0.55) continue;

    const kind = (z < -0.225 || (Math.abs(x + 0.02) < 0.06 && Math.abs(z + 0.01) < 0.03)) && rng() < 0.45 ? 1 : 0;
    addParkTree(x, z, kind, 0.80 + rng() * 0.48);
    if (planted % 16 === 0) features.push({ type: 'firefly', pos: [x, h + 0.012, z], size: 0.016 });
    planted++;
  }

  let shrubs = 0;
  for (let tries = 0; shrubs < 115 && tries < 3000; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = 0.02 + rng() * rimRadius(ang) * 0.69;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (boxNorm(x, z) > 0.70 || isWaterPoint(x, z) || Math.abs(z - TRANS_Z) < 0.013) continue;
    if (inEllipse(x, z, GREAT_LAWN) < 1.0 || inEllipse(x, z, SHEEP_MEADOW) < 0.92) continue;
    if (Math.hypot((x + 0.014) / 0.045, (z - 0.220) / 0.026) < 1.0) continue;
    const h = height(x, z);
    if (h < Y_WATER + 0.003 || slopeAt(x, z) > 0.6) continue;
    const sHex = rng() < 0.35 ? 0xd96828 : (rng() < 0.7 ? 0x457d32 : 0xdfb136);
    addGeo(new THREE.IcosahedronGeometry(0.0036 + rng() * 0.0022, 0), sHex, {
      p: [x, h + 0.001, z], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.3, 0.7, 1.3], amt: 0.07,
    });
    shrubs++;
  }

  // =====================================================================
  // 10. EFECTOS VIVOS EN AGUA, CIUDAD Y CIELO DE MANHATTAN
  // =====================================================================
  for (let i = 0; i < 65; i++) {
    const x = (rng() - 0.5) * 0.38, z = (rng() - 0.5) * 0.46;
    if (isWaterPoint(x, z) && height(x, z) < Y_WATER) {
      features.push({ type: 'sparkle', pos: [x, Y_WATER + 0.003, z], size: 0.009 });
    }
  }

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const lx = RES_CX + Math.cos(a) * RES_RX * 1.12;
    const lz = RES_CZ + Math.sin(a) * RES_RZ * 1.12;
    features.push({ type: 'city', pos: [lx, height(lx, lz) + 0.008, lz], size: 0.008 });
  }
  // Faroles en avenidas perimetrales (59th St y 110th St)
  for (const ax of [-0.11, -0.04, 0.04, 0.11]) {
    features.push({ type: 'city', pos: [ax, 0.022, 0.268], size: 0.008 });
    features.push({ type: 'city', pos: [ax, 0.022, -0.272], size: 0.008 });
  }

  // Nubes altas por encima de todas las agujas de Manhattan
  const clouds = [
    [-0.19, 0.335, -0.18, 0.014], [0.20, 0.342, -0.16, 0.014],
    [-0.21, 0.332, 0.15, 0.013], [0.21, 0.340, 0.16, 0.014],
    [0.01, 0.352, -0.22, 0.014], [0.02, 0.348, 0.20, 0.013],
  ];
  for (const [cx, cy, cz, cs] of clouds) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0, cy, 0], size: cs });
  }

  features.push({ type: 'gulls', pos: [RES_CX, 0.125, RES_CZ], size: 0.095 });
  features.push({ type: 'gulls', pos: [-0.015, 0.105, 0.035], size: 0.075 });

  void stats;
  return finish('Central Park — Nueva York');
}
