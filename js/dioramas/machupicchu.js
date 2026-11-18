// Diorama "Machu Picchu" — La Ciudadela Inca y Huayna Picchu (~175k+ triángulos)
// Topografía andina completa sobre zócalo granítico hermético y meandro en herradura del Río Urubamba:
//   Pico afilado de Huayna Picchu (con escalinata en zigzag, andenes colgados empotrados y Templo de la Luna) + Huchuy Picchu,
//   Sector Agrícola Sur (andenes escalonados continuos desde la Casa del Guardián hasta la ciudadela, con sarunas),
//   Casa del Guardián con techo de paja ichu, Roca Funeraria tallada y Puerta Principal del Camino Inca,
//   Sector Sagrado Occidental: Templo del Sol (Torreón semicircular almohadillado), Tumba Real, Escalinata de las 16 Fuentes,
//   Plaza Sagrada (Templo Principal de 7 hornacinas + Templo de las Tres Ventanas + Casa del Sacerdote),
//   Pirámide escalonada de sillería fina y monolito del Intihuatana,
//   Plaza Principal y Roca Sagrada con dos huayranas techadas en ichu,
//   Sector Urbano Oriental (Tres Portadas, Acllahuasi, Grupo de los Morteros, Qolqas y Templo del Cóndor),
//   Puente Colgante Inca sobre el Urubamba occidental, rebaño de 10 llamas/alpacas y bosque de ceja de selva.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildMachupicchu(seed = 191) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  // =====================================================================
  // 1. PALETA ANDINA Y SILLERÍA INCA PROCEDIMENTAL
  // =====================================================================
  // Granito gris-blanco imperial del Cusco (almohadillado y sillería fina)
  const incaGraniteColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 265 * scale);
    const col = Math.floor((cx * 1.15 - cz * 0.95) * 195 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0xd4d7d0, 0xc3c7bf, 0xe0e3dc, 0xb2b7ae];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.0045 && ((row + col) & 1)) hex = 0x8f9888;
    return jitter(hex, 0.028);
  };

  // Mampostería rústica de piedra canteada para los muros de andenes
  const rusticAndenStoneColor = (yFloor = -1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 240);
    const col = Math.floor((cx + cz) * 205 + (row & 1) * 0.4);
    const h = ((row * 31) ^ (col * 17)) & 3;
    const pal = [0xa1a59b, 0x8f948a, 0xb0b4aa, 0x7e837a];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.0035 && ((row + col) & 1)) hex = 0x627358;
    return jitter(hex, 0.036);
  };

  // Acantilados verticales de granito gris andino con vetas de líquenes y musgo
  const huaynaCliffColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const streak = fbm(cx * 36 + 3, cz * 36 + 9);
    if (streak > 0.62 && cy < 0.22) return jitter(0x3f683a, 0.06);
    const strata = Math.floor(cy * 145 + streak * 3.5) & 3;
    const pal = [0x60665f, 0x717870, 0x4d534d, 0x7f857d];
    return jitter(pal[strata], 0.048);
  };

  // Techo andino de paja brava (ichu) dorada-ocre en capas
  const ichuThatchColor = (yRef = 0) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const layer = Math.floor((cy - yRef) * 340 + fbm(cx * 60, cz * 60) * 1.4) & 3;
    const pal = [0xc9a356, 0xb68f45, 0xd7b368, 0x9e7a38];
    return jitter(pal[layer], 0.045);
  };

  const woodQuenuaColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 290) & 1;
    return jitter(k ? 0x5e3e24 : 0x4b301b, 0.045);
  };

  const turfColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 42 + 4, cz * 42 + 7);
    const pal = [0x4c8234, 0x5d943f, 0x3e6e2b, 0x6ba049];
    return jitter(pal[Math.floor(n * 4) & 3], 0.05);
  };

  const displaceGeo = (geo, amp = 0.00038) => {
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

  const addSubBox = (w, h, d, sx, sy, sz, p, rot = 0, fn = null, amp = 0.00024) => {
    const g = displaceGeo(new THREE.BoxGeometry(w, h, d, sx, sy, sz), amp);
    addGeo(g, 0xcfd2cb, { p, r: [0, rot, 0], colorFn: fn || incaGraniteColor() });
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
    addPrism(bot, top, colorOrFn, true, 0.025);
  };

  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };

  // =====================================================================
  // 3. TOPOGRAFÍA DE LA LLAQTA, HUAYNA PICCHU Y CAÑÓN DEL URUBAMBA
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.325, AZ = 0.350, FLOOR = -0.044;
  const Y_RIVER = 0.002;
  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 4.0) + Math.pow(Math.abs(s) / AZ, 4.0), 1 / 4.0);
  };

  // Meandro en herradura del Río Urubamba rodeando la montaña (Oeste -> Norte -> Este)
  const RIVER_PTS = [
    [-0.285, 0.300],
    [-0.262, 0.145],
    [-0.246, -0.040],
    [-0.172, -0.220],
    [0.008, -0.292],
    [0.180, -0.215],
    [0.242, -0.045],
    [0.252, 0.140],
    [0.280, 0.300],
  ];
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
  const riverDist = (x, z) => segDist(x, z, RIVER_PTS);
  const RIVER_W = 0.034;

  // Centros clave del complejo inca
  const HX = -0.006, HZ = -0.208;             // Cumbre afilada de Huayna Picchu
  const HPX = 0.106, HPZ = -0.174;            // Cumbre menor de Huchuy Picchu
  const GX = -0.068, GZ = 0.160, GY = 0.130;  // Casa del Guardián sobre el sector agrícola sur
  const IX = -0.072, IZ = -0.056, IY = 0.118; // Cima de la Pirámide del Intihuatana
  const SX = -0.070, SZ = -0.004, SY = 0.094; // Plaza Sagrada
  const TX = -0.056, TZ = 0.052, TY = 0.092;  // Templo del Sol (Torreón)
  const RX = -0.014, RZ = -0.108, RY = 0.085; // Roca Sagrada

  const EXPLANADAS = [
    { x: GX, z: GZ, hw: 0.032, hd: 0.022, rot: -0.16, y: GY, r0: 0.008, r1: 0.032 },              // Casa del Guardián y Roca Funeraria
    { x: -0.002, z: -0.014, hw: 0.036, hd: 0.076, rot: 0.02, y: 0.082, r0: 0.010, r1: 0.034 },     // Plaza Principal (Gran Pampa)
    { x: TX, z: TZ, hw: 0.026, hd: 0.028, rot: 0.04, y: TY, r0: 0.008, r1: 0.028 },               // Templo del Sol y Palacio Real
    { x: SX, z: SZ, hw: 0.027, hd: 0.027, rot: 0, y: SY, r0: 0.008, r1: 0.026 },                  // Plaza Sagrada
    { x: IX, z: IZ, hw: 0.018, hd: 0.018, rot: 0, y: IY, r0: 0.006, r1: 0.036 },                  // Plataforma del Intihuatana
    { x: RX, z: RZ, hw: 0.034, hd: 0.018, rot: 0.04, y: RY, r0: 0.008, r1: 0.026 },               // Roca Sagrada y Huayranas
    { x: 0.064, z: 0.002, hw: 0.028, hd: 0.078, rot: -0.03, y: 0.086, r0: 0.008, r1: 0.030 },     // Sector Urbano Oriental Superior
    { x: 0.105, z: -0.004, hw: 0.018, hd: 0.068, rot: -0.03, y: 0.074, r0: 0.007, r1: 0.026 },    // Sector Urbano Oriental Inferior (Qolqas)
    { x: 0.058, z: 0.070, hw: 0.022, hd: 0.018, rot: 0.08, y: 0.088, r0: 0.006, r1: 0.022 },      // Templo del Cóndor
  ];

  const rectDist = (x, z, p) => {
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  const rawHeight = (x, z) => {
    // 1. Cresta central de la ciudadela de Machu Picchu (montura elevada N-S)
    const ridgeX = (x - 0.002) / 0.172;
    const ridgeZ = (z - 0.015) / 0.215;
    const llaqtaBase = 0.092 * Math.pow(smooth(1 - Math.hypot(ridgeX, ridgeZ * 0.88)), 0.72);
    // Elevación sur progresiva desde el frente hacia la Casa del Guardián y Sector Agrícola
    const southRise = 0.052 * smooth(1 - Math.hypot((x + 0.030) / 0.165, (z - 0.165) / 0.115));

    // 2. Pico afilado cónico-piramidal de Huayna Picchu (silueta andina icónica, nunca chata)
    const hdx = (x - HX) / 0.098;
    const hdz = (z - HZ) / 0.088;
    const hDist = Math.hypot(hdx, hdz);
    const hRib = 1 + 0.11 * Math.sin(Math.atan2(z - HZ, x - HX) * 5 + 0.5) * smooth(hDist * 1.4);
    const huaynaT = Math.max(0, 1 - (hDist * hRib) / 1.05);
    const huayna = 0.268 * Math.pow(huaynaT, 1.38);

    // 3. Pico menor de Huchuy Picchu (noreste de Huayna Picchu)
    const hpDist = Math.hypot((x - HPX) / 0.068, (z - HPZ) / 0.062);
    const huchuy = 0.148 * Math.pow(Math.max(0, 1 - hpDist), 1.35);

    // 4. Laderas exteriores suaves al otro lado del cañón (no tapan las vistas laterales/ras del suelo)
    const westFlank = 0.032 * smooth((-x - 0.275) / 0.055) * smooth(1 - Math.abs(z) / 0.36);
    const eastFlank = 0.030 * smooth((x - 0.272) / 0.055) * smooth(1 - Math.abs(z) / 0.36);

    // 5. Istmo / silla entre la Roca Sagrada y Huayna Picchu
    const saddle = 0.076 * smooth(1 - Math.hypot(x / 0.075, (z + 0.138) / 0.044));

    let h = 0.014 + Math.max(llaqtaBase + southRise * 0.78, huayna, huchuy, saddle, westFlank, eastFlank);

    // Ruido natural de roca andina (tenue sobre la zona urbana)
    const urbanMask = 1 - 0.72 * smooth(1 - Math.hypot(x / 0.15, (z - 0.01) / 0.15));
    h += (fbm(x * 20 + 4, z * 20 + 8) - 0.5) * 0.013 * urbanMask;
    h += (fbm(x * 50 + 11, z * 50 + 3) - 0.5) * 0.004 * urbanMask;

    // 6. Garganta profunda excavada del Río Urubamba
    const rd = riverDist(x, z);
    const gorgeCut = smooth(1 - rd / (RIVER_W * 1.52));
    h = h * (1 - gorgeCut * 0.92) + (Y_RIVER - 0.030) * smooth(1 - rd / (RIVER_W * 0.92));
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
    Math.hypot(height(x + 0.005, z) - height(x - 0.005, z), height(x, z + 0.005) - height(x, z - 0.005)) / 0.010;

  // Malla polar de alta resolución (K = 122, S = 320 -> ~78.080 triángulos en superficie)
  const K = 122, S = 320;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = height(x, z);
      const y = h < Y_RIVER ? Y_RIVER + (fbm(x * 52, z * 52) - 0.5) * 0.0014 : h;
      row.push({ v: new THREE.Vector3(x, y, z), h });
    }
    ringPts.push(row);
  }
  for (const p of ringPts[K]) if (p.h < Y_RIVER) p.v.y = Y_RIVER;

  const nrm = new THREE.Vector3();
  const isPlazaGrass = (x, z) => rectDist(x, z, EXPLANADAS[1]) < 0.003;
  const isSacredFloor = (x, z) =>
    rectDist(x, z, EXPLANADAS[2]) < 0.002 ||
    rectDist(x, z, EXPLANADAS[3]) < 0.002 ||
    rectDist(x, z, EXPLANADAS[5]) < 0.002 ||
    rectDist(x, z, EXPLANADAS[6]) < 0.002 ||
    rectDist(x, z, EXPLANADAS[7]) < 0.002 ||
    rectDist(x, z, EXPLANADAS[8]) < 0.002;

  function terrainColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cy = (a.v.y + b.v.y + c.v.y) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);

    // 1. Aguas turquesas y rápidos espumosos del Río Urubamba
    if (h < Y_RIVER && hMax < Y_RIVER + 0.0035 && slope < 0.25) {
      const depth = smooth((Y_RIVER - h) / 0.022);
      if (h > Y_RIVER - 0.0035) return jitter(0xa8dce0, 0.045);
      const foam = fbm(cx * 55, cz * 55);
      if (foam > 0.67) return jitter(0xcbeff2, 0.04);
      tmpColor.setHex(0x28848e).lerp(new THREE.Color(0x0f495c), depth);
      const k = 1 + (rng() - 0.5) * 0.05;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }

    // 2. Orilla de cantos rodados blancos del Urubamba
    if (riverDist(cx, cz) < RIVER_W + 0.007 && h >= Y_RIVER && h < 0.016) {
      return jitter((Math.floor(cx * 220) + Math.floor(cz * 220)) & 1 ? 0xb4b8b0 : 0x9aa097, 0.04);
    }

    // 3. Plaza Principal verde césped andino
    if (isPlazaGrass(cx, cz)) {
      const n = fbm(cx * 36, cz * 36);
      return jitter(n > 0.5 ? 0x568d3c : 0x477932, 0.045);
    }

    // 4. Pavimento de tierra apisonada y lajas de granito en sectores sagrado y urbano
    if (isSacredFloor(cx, cz)) {
      const tile = (Math.floor(cx * 180) ^ Math.floor(cz * 180)) & 3;
      const pal = [0x9e9a8d, 0x8f8b7e, 0xa8a496, 0x7e8376];
      return jitter(pal[tile], 0.032);
    }

    // 5. Escarpes rocosos de granito de Huayna Picchu y el cañón
    if (slope > 0.34 || cy > 0.175) {
      const strata = Math.floor(cy * 130 + fbm(cx * 30, cz * 30) * 3.0) & 3;
      const pal = [0x636962, 0x515751, 0x747a72, 0x424842];
      if (slope < 0.44 && fbm(cx * 26, cz * 26) > 0.52 && cy < 0.235) return jitter(0x3f6b38, 0.06);
      return jitter(pal[strata], 0.052);
    }

    // 6. Ceja de selva nubosa y praderas andinas verde intenso
    const n = fbm(cx * 28 + 3, cz * 28 + 9);
    if (h > 0.09) return jitter(n > 0.5 ? 0x457b33 : 0x39682a, 0.06);
    return jitter(n > 0.52 ? 0x2f5f28 : (n > 0.35 ? 0x244e20 : 0x3b6e2f), 0.065);
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

  // Zócalo geológico andino estratificado hermético + corte del Río Urubamba + base subdividida
  const rim = ringPts[K];
  const radial = new THREE.Vector3();
  const Y_STRATA = -0.010, Y_PLINTH = -0.030;
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
    const ra = rim[s], rb = rim[(s + 1) % S];
    const a = ra.v, b = rb.v;
    const isWater = (ra.h + rb.h) * 0.5 < Y_RIVER;
    const a1 = new THREE.Vector3(CX + (a.x - CX) * 1.003, Y_STRATA, CZ + (a.z - CZ) * 1.003);
    const b1 = new THREE.Vector3(CX + (b.x - CX) * 1.003, Y_STRATA, CZ + (b.z - CZ) * 1.003);
    const a2 = new THREE.Vector3(CX + (a.x - CX) * 0.992, Y_PLINTH, CZ + (a.z - CZ) * 0.992);
    const b2 = new THREE.Vector3(CX + (b.x - CX) * 0.992, Y_PLINTH, CZ + (b.z - CZ) * 0.992);
    const a3 = botRingPts[botRings][s];
    const b3 = botRingPts[botRings][(s + 1) % S];
    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    const topCol = isWater ? (s % 2 ? 0x1a6875 : 0x207784) : (s % 2 ? 0x7e837a : 0x71766d);
    const midCol = isWater ? 0x114957 : (s % 2 ? 0x5c6058 : 0x50544d);
    addQuad(a, b, b1, a1, topCol, radial, 0.032);
    addQuad(a1, b1, b2, a2, midCol, radial, 0.03);
    addQuad(a2, b2, b3, a3, 0x3b3e39, radial, 0.025);
  }
  for (let br = 0; br < botRings; br++) {
    const A = botRingPts[br], B = botRingPts[br + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      const botHex = (br + (s >> 3)) & 1 ? 0x343732 : 0x2c2f2b;
      if (br === 0) addTri(centerBottom, B[s], B[s1], jitter(botHex, 0.025), DOWN);
      else addQuad(A[s], A[s1], B[s1], B[s], jitter(botHex, 0.025), DOWN, 0.025);
    }
  }

  // =====================================================================
  // 4. CONSTRUCTORES ARQUITECTÓNICOS INCA (SILLERÍA, MUROS EN TALUD Y TECHOS ICHU)
  // =====================================================================
  function buildStoneWall(x0, z0, x1, z1, yBase, wallH, thickBot, {
    batter = 0.84,
    courses = 4,
    fn = incaGraniteColor(yBase),
    sink = 0.010,
    blockSize = 0.0065,
  } = {}) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.002) return;
    const yaw = Math.atan2(dx, dz) + Math.PI * 0.5;
    const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
    const hw = len * 0.5, hd = thickBot * 0.5, topD = hd * batter;

    const bot = [
      new THREE.Vector3(-hw, -sink, -hd), new THREE.Vector3(hw, -sink, -hd),
      new THREE.Vector3(hw, -sink, hd), new THREE.Vector3(-hw, -sink, hd),
    ];
    const top = [
      new THREE.Vector3(-hw, wallH, -topD), new THREE.Vector3(hw, wallH, -topD),
      new THREE.Vector3(hw, wallH, topD), new THREE.Vector3(-hw, wallH, topD),
    ];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    const offset = new THREE.Vector3(mx, yBase, mz);
    for (const v of bot) v.applyQuaternion(q).add(offset);
    for (const v of top) v.applyQuaternion(q).add(offset);
    addPrism(bot, top, fn, true, 0.028);

    const nCols = Math.max(2, Math.round(len / blockSize));
    const bLen = (len / nCols) * 0.96;
    const ch = (wallH / courses) * 0.95;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const tx = cosY, tz = -sinY;
    for (let c = 0; c < courses; c++) {
      const f = (c + 0.5) / courses;
      const cy = yBase + f * wallH;
      const halfThick = hd * (1 - f * (1 - batter));
      const stagger = (c & 1) * 0.45 / nCols;
      for (let i = 0; i < nCols; i++) {
        const u = ((i + 0.5) / nCols + stagger);
        if (u > 0.98) continue;
        const along = (u - 0.5) * len;
        const jOut = (rng() - 0.5) * 0.0005;
        const jThick = halfThick * 2 + 0.0011 + jOut;
        addBoxDirect(mx + tx * along, cy, mz + tz * along, bLen, ch, jThick, fn, 0.032, 0.00018, yaw);
      }
    }
  }

  function buildIncaBuilding({
    cx, yBase, cz, w, d, wallH = 0.018, yaw = 0,
    thick = 0.0038,
    openFront = false,
    doorsFront = 1,
    windowsFront = 0,
    windowsBack = 0,
    nichesInside = 3,
    hasThatch = false,
    gableWalls = true,
    wallFn = incaGraniteColor(yBase),
    lightDoors = false,
  }) {
    const L = makeLocal(cx, yBase, cz, yaw);
    const hw = w * 0.5, hd = d * 0.5;
    const sink = 0.009;

    addSubBox(w + 0.002, sink + 0.002, d + 0.002, 2, 1, 2, L(0, -sink * 0.5 + 0.0005, 0), yaw, wallFn);

    const pBackL = L(-hw, 0, -hd + thick * 0.5);
    const pBackR = L(hw, 0, -hd + thick * 0.5);
    buildStoneWall(pBackL[0], pBackL[2], pBackR[0], pBackR[2], yBase, wallH, thick, {
      courses: 4, fn: wallFn, blockSize: 0.0055,
    });

    const pLeftB = L(-hw + thick * 0.5, 0, -hd);
    const pLeftF = L(-hw + thick * 0.5, 0, hd);
    buildStoneWall(pLeftB[0], pLeftB[2], pLeftF[0], pLeftF[2], yBase, wallH, thick, {
      courses: 4, fn: wallFn, blockSize: 0.0055,
    });
    const pRightB = L(hw - thick * 0.5, 0, -hd);
    const pRightF = L(hw - thick * 0.5, 0, hd);
    buildStoneWall(pRightB[0], pRightB[2], pRightF[0], pRightF[2], yBase, wallH, thick, {
      courses: 4, fn: wallFn, blockSize: 0.0055,
    });

    if (!openFront) {
      if (doorsFront <= 0) {
        const pFL = L(-hw, 0, hd - thick * 0.5);
        const pFR = L(hw, 0, hd - thick * 0.5);
        buildStoneWall(pFL[0], pFL[2], pFR[0], pFR[2], yBase, wallH, thick, {
          courses: 4, fn: wallFn, blockSize: 0.0055,
        });
      } else {
        const doorW = Math.min(0.0068, w / (doorsFront * 2.4));
        const doorH = wallH * 0.72;
        const spans = [];
        let cursor = -hw;
        for (let di = 0; di < doorsFront; di++) {
          const dCenter = -hw + ((di + 0.5) / doorsFront) * w;
          const left = dCenter - doorW * 0.5;
          const right = dCenter + doorW * 0.5;
          if (left - cursor > 0.002) spans.push([cursor, left]);
          addSubBox(doorW + 0.003, wallH - doorH + 0.001, thick * 0.92, 2, 1, 1, L(dCenter, doorH + (wallH - doorH) * 0.5, hd - thick * 0.5), yaw, wallFn);
          addGeo(new THREE.BoxGeometry(doorW * 0.85, doorH, thick * 0.55), 0x1b1915, {
            p: L(dCenter, doorH * 0.5, hd - thick * 0.55), r: [0, yaw, 0],
          });
          if (lightDoors) {
            features.push({ type: 'window', pos: L(dCenter, doorH * 0.48, hd + 0.0005), yaw, w: doorW * 0.72, h: doorH * 0.75 });
          }
          cursor = right;
        }
        if (hw - cursor > 0.002) spans.push([cursor, hw]);
        for (const [sa, sb] of spans) {
          const pa = L(sa, 0, hd - thick * 0.5);
          const pb = L(sb, 0, hd - thick * 0.5);
          buildStoneWall(pa[0], pa[2], pb[0], pb[2], yBase, wallH, thick, {
            courses: 4, fn: wallFn, blockSize: 0.0055,
          });
        }
      }
    }

    const placeWindows = (count, zLocal, winYaw) => {
      for (let wi = 0; wi < count; wi++) {
        const wx = -hw * 0.65 + (count === 1 ? hw * 0.65 : (wi / (count - 1)) * hw * 1.3);
        const wy = wallH * 0.58;
        const ww = 0.0038, wh = 0.0052;
        addGeo(new THREE.BoxGeometry(ww, wh, thick * 1.15), 0x1a1814, {
          p: L(wx, wy, zLocal), r: [0, yaw, 0],
        });
        addGeo(new THREE.BoxGeometry(ww + 0.0016, 0.0014, thick * 1.25), 0xcfd2cb, {
          p: L(wx, wy + wh * 0.55, zLocal), r: [0, yaw, 0], colorFn: wallFn,
        });
        features.push({ type: 'window', pos: L(wx, wy, zLocal + (zLocal > 0 ? thick * 0.65 : -thick * 0.65)), yaw: winYaw, w: ww * 0.85, h: wh * 0.85 });
      }
    };
    if (windowsFront > 0 && !openFront) placeWindows(windowsFront, hd - thick * 0.5, yaw);
    if (windowsBack > 0) placeWindows(windowsBack, -hd + thick * 0.5, yaw + Math.PI);

    for (let ni = 0; ni < nichesInside; ni++) {
      const nx = -hw * 0.68 + (nichesInside === 1 ? hw * 0.68 : (ni / (nichesInside - 1)) * hw * 1.36);
      addGeo(new THREE.BoxGeometry(0.0034, 0.0050, 0.0018), 0x262420, {
        p: L(nx, wallH * 0.58, -hd + thick * 0.92), r: [0, yaw, 0],
      });
    }

    const gableH = hasThatch ? Math.min(0.015, d * 0.45) : Math.min(0.011, d * 0.32);
    if (gableWalls) {
      for (const sx of [-hw + thick * 0.5, hw - thick * 0.5]) {
        const steps = 4;
        for (let st = 0; st < steps; st++) {
          const f = st / steps;
          const sw = (d - thick * 0.4) * (1 - f * 0.82);
          const sh = (gableH / steps) * 1.15;
          addSubBox(thick * 0.84, sh, sw, 1, 1, 2, L(sx, wallH + (st + 0.45) * (gableH / steps), 0), yaw, wallFn);
        }
      }
    }

    if (hasThatch) {
      const roofOver = 0.0032;
      const rw = w + roofOver * 2;
      const ridgeY = wallH + gableH + 0.0015;
      const eaveY = wallH - 0.001;
      const halfSpan = hd + roofOver;
      const slopeLen = Math.hypot(halfSpan, ridgeY - eaveY);
      const slopeAng = Math.atan2(ridgeY - eaveY, halfSpan);
      addRod(L(-rw * 0.5, ridgeY + 0.001, 0), L(rw * 0.5, ridgeY + 0.001, 0), 0.0016, 0x9e7a38, 6);
      const ichuFn = ichuThatchColor(yBase + wallH);
      for (const side of [-1, 1]) {
        const midZ = side * halfSpan * 0.5;
        const midY = (ridgeY + eaveY) * 0.5;
        addGeo(new THREE.BoxGeometry(rw, 0.0034, slopeLen, 6, 1, 4), 0xc9a356, {
          p: L(0, midY, midZ), r: [side * slopeAng, yaw, 0], colorFn: ichuFn,
        });
        for (let lay = 0; lay < 3; lay++) {
          const t = (lay + 0.45) / 3;
          const lz = side * halfSpan * t;
          const ly = ridgeY - (ridgeY - eaveY) * t + 0.0016;
          addGeo(new THREE.BoxGeometry(rw * 1.01, 0.0024, slopeLen * 0.38, 6, 1, 2), 0xd7b368, {
            p: L(0, ly, lz), r: [side * (slopeAng - 0.08), yaw, 0], colorFn: ichuFn,
          });
        }
        for (let bi = -2; bi <= 2; bi++) {
          const bx = (bi / 2) * (hw * 0.82);
          addRod(L(bx, ridgeY - 0.001, 0), L(bx, eaveY - 0.001, side * halfSpan * 0.92), 0.0009, 0x5e3e24, 4);
        }
      }
    }
  }

  // =====================================================================
  // 5. SISTEMA DE ANDENES AGRÍCOLAS ESCALONADOS (SUR, OESTE, ESTE Y CUELLO)
  // =====================================================================
  function buildTerraceArc({
    cx, cz, rStart, rStep, nTiers, yTop, yDropPerTier,
    ang0, ang1, depthBack = 0.022, thick = 0.005, segs = 14,
  }) {
    for (let t = 0; t < nTiers; t++) {
      const r = rStart + t * rStep;
      const yPlat = yTop - t * yDropPerTier;
      const wallH = yDropPerTier * 1.35;
      for (let i = 0; i < segs; i++) {
        const a0 = ang0 + (i / segs) * (ang1 - ang0);
        const a1 = ang0 + ((i + 1) / segs) * (ang1 - ang0);
        const x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r;
        const x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
        buildStoneWall(x0, z0, x1, z1, yPlat - wallH, wallH, thick, {
          batter: 0.80, courses: 3, fn: rusticAndenStoneColor(yPlat - wallH), sink: 0.012, blockSize: 0.0062,
        });
        const am = 0.5 * (a0 + a1);
        const rIn = Math.max(0.005, r - depthBack * 0.45);
        const segLen = Math.hypot(x1 - x0, z1 - z0) * 1.08;
        const xm = cx + Math.cos(am) * rIn, zm = cz + Math.sin(am) * rIn;
        const yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI * 0.5;
        addBoxDirect(xm, yPlat - 0.0022, zm, segLen, 0.0048, depthBack, turfColor, 0.045, 0, yaw);
      }
      if (t % 2 === 0) {
        const am = ang0 + 0.35 * (ang1 - ang0);
        const sx = cx + Math.cos(am) * (r + 0.0028);
        const sz = cz + Math.sin(am) * (r + 0.0028);
        for (let st = 0; st < 3; st++) {
          addBoxDirect(sx, yPlat - (st + 0.4) * (yDropPerTier * 0.38), sz, 0.0045, 0.0018, 0.006, incaGraniteColor(yPlat), 0.03, 0, -am + Math.PI * 0.5);
        }
      }
    }
  }

  // 5.1 Gran Sector Agrícola Sur descendiendo en escalones desde la Casa del Guardián hacia el centro-este
  buildTerraceArc({
    cx: -0.020, cz: 0.045, rStart: 0.072, rStep: 0.0135, nTiers: 9,
    yTop: 0.122, yDropPerTier: 0.0088,
    ang0: 0.26, ang1: 2.30, depthBack: 0.020, segs: 18,
  });

  // 5.2 Andenes frontales bajo la Casa del Guardián (escalonan suavemente el frente izquierdo sin cruzarse con 5.1)
  for (let t = 0; t < 5; t++) {
    const zLine = 0.155 + t * 0.013;
    const yPlat = 0.118 - t * 0.010;
    const xL = -0.108 - t * 0.004;
    const xR = -0.058 + t * 0.003;
    buildStoneWall(xL, zLine, xR, zLine - 0.005, yPlat - 0.012, 0.012, 0.0048, {
      batter: 0.80, courses: 3, fn: rusticAndenStoneColor(yPlat - 0.012), sink: 0.014, blockSize: 0.006,
    });
    addBoxDirect((xL + xR) * 0.5, yPlat - 0.002, zLine - 0.010, Math.hypot(xR - xL, 0.005), 0.005, 0.015, turfColor, 0.045, 0, -0.08);
  }

  // 5.3 Andenes occidentales escalonados bajo el Sector Sagrado hacia el Urubamba oeste
  buildTerraceArc({
    cx: -0.042, cz: 0.005, rStart: 0.068, rStep: 0.0135, nTiers: 6,
    yTop: 0.092, yDropPerTier: 0.0095,
    ang0: 2.25, ang1: 3.92, depthBack: 0.019, segs: 12,
  });

  // 5.4 Andenes orientales bajo el Sector Urbano hacia el Urubamba este
  buildTerraceArc({
    cx: 0.052, cz: -0.005, rStart: 0.066, rStep: 0.0135, nTiers: 6,
    yTop: 0.078, yDropPerTier: 0.0095,
    ang0: -0.78, ang1: 0.85, depthBack: 0.019, segs: 12,
  });

  // 5.5 Terrazas del istmo norte y laderas bajas de Huayna Picchu
  for (let t = 0; t < 4; t++) {
    const tz = -0.118 - t * 0.013;
    const ty = 0.082 - t * 0.0055;
    buildStoneWall(-0.048, tz, 0.036, tz, ty - 0.009, 0.009, 0.0045, {
      courses: 2, fn: rusticAndenStoneColor(ty - 0.009), sink: 0.010, blockSize: 0.0055,
    });
    addBoxDirect(-0.006, ty - 0.002, tz - 0.006, 0.082, 0.0042, 0.014, turfColor, 0.045);
  }

  // =====================================================================
  // 6. SECTOR SAGRADO OCCIDENTAL (INTIHUATANA, PLAZA SAGRADA, TORREÓN, 16 FUENTES)
  // =====================================================================
  // 6.1 Pirámide Escalonada y Monolito del Intihuatana
  {
    const levels = 5;
    const baseR = 0.036, topR = 0.015, totalH = 0.032;
    const yBottom = IY - totalH;
    for (let lv = 0; lv < levels; lv++) {
      const f = lv / levels;
      const r = baseR + (topR - baseR) * f;
      const yLv = yBottom + (lv / levels) * totalH;
      const lh = totalH / levels;
      const sides = 6;
      for (let s = 0; s < sides; s++) {
        const a0 = (s / sides) * Math.PI * 2 + 0.15;
        const a1 = ((s + 1) / sides) * Math.PI * 2 + 0.15;
        buildStoneWall(
          IX + Math.cos(a0) * r, IZ + Math.sin(a0) * r,
          IX + Math.cos(a1) * r, IZ + Math.sin(a1) * r,
          yLv, lh * 1.15, 0.0045,
          { batter: 0.85, courses: 2, fn: incaGraniteColor(yLv), sink: 0.009, blockSize: 0.0052 },
        );
      }
      addGeo(new THREE.CylinderGeometry(r * 0.96, r * 0.98, lh + 0.008, 6, 1), 0xbec2ba, {
        p: [IX, yLv + lh * 0.45, IZ], r: [0, 0.15, 0], colorFn: turfColor,
      });
    }
    for (let st = 0; st < 9; st++) {
      const t = st / 8;
      const sy = yBottom + 0.002 + t * totalH;
      const sz = IZ + baseR * (1 - t * 0.56) + 0.003;
      addBoxDirect(IX, sy, sz, 0.0095, 0.004, 0.0055, incaGraniteColor(sy), 0.03);
      for (const side of [-1, 1]) {
        addBoxDirect(IX + side * 0.0058, sy + 0.002, sz, 0.0024, 0.006, 0.006, incaGraniteColor(sy), 0.03);
      }
    }
    addGeo(new THREE.CylinderGeometry(0.0155, 0.0165, 0.005, 10, 1), 0xcfd2cb, {
      p: [IX, IY - 0.001, IZ], colorFn: incaGraniteColor(IY),
    });
    for (let s = 0; s < 5; s++) {
      const a0 = -Math.PI * 0.8 + s * 0.55;
      const a1 = a0 + 0.55;
      buildStoneWall(
        IX + Math.cos(a0) * 0.014, IZ + Math.sin(a0) * 0.014,
        IX + Math.cos(a1) * 0.014, IZ + Math.sin(a1) * 0.014,
        IY, 0.0085, 0.0028, { courses: 2, fn: incaGraniteColor(IY), sink: 0.003, blockSize: 0.004 },
      );
    }
    addSubBox(0.011, 0.0045, 0.009, 3, 2, 3, [IX, IY + 0.0025, IZ], 0.2, incaGraniteColor(IY), 0.0003);
    addSubBox(0.007, 0.0035, 0.006, 2, 1, 2, [IX + 0.001, IY + 0.0055, IZ - 0.0005], 0.2, incaGraniteColor(IY));
    addBeam(IX, IY + 0.006, IZ, IX - 0.0012, IY + 0.0135, IZ - 0.0008, 0.0034, 0.0030, incaGraniteColor(IY));
    features.push({ type: 'sparkle', pos: [IX - 0.0012, IY + 0.0155, IZ - 0.0008], size: 0.011 });
    features.push({ type: 'flame', pos: [IX + 0.009, IY + 0.0025, IZ + 0.006], size: 0.0022 });
  }

  // 6.2 Plaza Sagrada: Templo Principal, Templo de las Tres Ventanas y Casa del Sacerdote
  {
    addSubBox(0.056, 0.014, 0.056, 4, 2, 4, [SX, SY - 0.0065, SZ], 0, incaGraniteColor(SY));
    buildIncaBuilding({
      cx: SX - 0.003, yBase: SY, cz: SZ - 0.017, w: 0.036, d: 0.019, wallH: 0.022, yaw: 0,
      thick: 0.0046, openFront: true, nichesInside: 7, hasThatch: false, gableWalls: true,
      wallFn: incaGraniteColor(SY, 0.85),
    });
    addSubBox(0.012, 0.0045, 0.0055, 2, 1, 2, [SX - 0.003, SY + 0.0022, SZ - 0.020], 0, incaGraniteColor(SY));

    buildIncaBuilding({
      cx: SX + 0.020, yBase: SY, cz: SZ + 0.002, w: 0.028, d: 0.015, wallH: 0.021, yaw: -Math.PI * 0.5,
      thick: 0.0044, openFront: true, windowsBack: 3, nichesInside: 2, hasThatch: false, gableWalls: true,
      wallFn: incaGraniteColor(SY, 0.85),
    });
    for (let wi = -1; wi <= 1; wi++) {
      const wz = SZ + 0.002 + wi * 0.0075;
      addGeo(new THREE.BoxGeometry(0.0052, 0.0065, 0.0044), 0x171512, { p: [SX + 0.0252, SY + 0.011, wz] });
      features.push({ type: 'window', pos: [SX + 0.0282, SY + 0.011, wz], yaw: Math.PI * 0.5, w: 0.0040, h: 0.0058 });
    }
    addSubBox(0.0032, 0.012, 0.0032, 1, 2, 1, [SX + 0.016, SY + 0.006, SZ + 0.002], 0, incaGraniteColor(SY));

    buildIncaBuilding({
      cx: SX - 0.005, yBase: SY, cz: SZ + 0.018, w: 0.026, d: 0.014, wallH: 0.017, yaw: Math.PI,
      thick: 0.0036, doorsFront: 2, nichesInside: 3, hasThatch: true, lightDoors: true,
    });
    addGeo(new THREE.CylinderGeometry(0.0025, 0.0034, 0.0045, 7), 0x8a8e85, { p: [SX - 0.002, SY + 0.002, SZ] });
    features.push({ type: 'flame', pos: [SX - 0.002, SY + 0.0045, SZ], size: 0.0026 });
    features.push({ type: 'smoke', pos: [SX - 0.002, SY + 0.008, SZ], size: 0.0055, color: 0xe6e4de });
  }

  // 6.3 Templo del Sol (El Torreón Semicircular Almohadillado), Tumba Real y Escalinata de las 16 Fuentes
  {
    const torR = 0.020;
    const torH = 0.024;
    const nArc = 16;
    addGeo(displaceGeo(new THREE.CylinderGeometry(torR * 1.08, torR * 1.32, 0.022, 12, 3), 0.0008), 0x626862, {
      p: [TX, TY - 0.002, TZ], colorFn: huaynaCliffColor,
    });
    addSubBox(0.014, 0.010, 0.014, 3, 2, 3, [TX + 0.010, TY + 0.001, TZ + 0.004], 0.2, () => jitter(0x1e1c18, 0.03));
    for (let step = 0; step < 3; step++) {
      addSubBox(0.007 - step * 0.0015, 0.0028, 0.006, 2, 1, 1, [TX + 0.015, TY + step * 0.0025, TZ + 0.004], 0.2, incaGraniteColor(TY));
    }
    features.push({ type: 'flame', pos: [TX + 0.017, TY + 0.0015, TZ + 0.004], size: 0.0022 });

    const yTorBase = TY + 0.006;
    for (let c = 0; c < 8; c++) {
      const f = c / 8;
      const cy = yTorBase + (c + 0.5) * (torH / 8);
      const rCourse = torR * (1 - f * 0.08);
      for (let i = 0; i < nArc; i++) {
        if ((c === 4 || c === 5) && (i === 4 || i === 11)) {
          const ang = -Math.PI * 0.62 + ((i + 0.5) / nArc) * Math.PI * 1.48;
          const wx = TX + Math.cos(ang) * rCourse, wz = TZ + Math.sin(ang) * rCourse;
          if (c === 4) {
            addGeo(new THREE.BoxGeometry(0.0038, 0.0052, 0.0040), 0x1a1814, { p: [wx, cy + 0.0012, wz], r: [0, -ang + Math.PI * 0.5, 0] });
            features.push({ type: 'window', pos: [wx + Math.cos(ang) * 0.0025, cy + 0.0012, wz + Math.sin(ang) * 0.0025], yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), w: 0.0034, h: 0.0048 });
          }
          continue;
        }
        const a0 = -Math.PI * 0.62 + (i / nArc) * Math.PI * 1.48;
        const a1 = -Math.PI * 0.62 + ((i + 1) / nArc) * Math.PI * 1.48;
        const am = 0.5 * (a0 + a1);
        const xm = TX + Math.cos(am) * rCourse, zm = TZ + Math.sin(am) * rCourse;
        const segLen = 2 * rCourse * Math.sin((a1 - a0) * 0.5) * 1.06;
        addBoxDirect(xm, cy, zm, segLen, (torH / 8) * 1.04, 0.0044, incaGraniteColor(yTorBase, 1.3), 0.025, 0.00014, -am + Math.PI * 0.5);
      }
    }
    const pA = [TX + Math.cos(-Math.PI * 0.62) * torR, TZ + Math.sin(-Math.PI * 0.62) * torR];
    const pB = [TX + Math.cos(Math.PI * 0.86) * torR, TZ + Math.sin(Math.PI * 0.86) * torR];
    buildStoneWall(pA[0], pA[1], pB[0], pB[1], yTorBase, torH, 0.004, { courses: 6, fn: incaGraniteColor(yTorBase), sink: 0.004 });
    addSubBox(0.011, 0.010, 0.009, 3, 2, 3, [TX, yTorBase + 0.005, TZ], 0.3, incaGraniteColor(yTorBase), 0.0004);

    // Escalinata y Canal de las 16 Fuentes Litúrgicas bajando hacia la Plaza Principal
    const fx0 = TX + 0.020, fz0 = TZ + 0.018, fy0 = TY + 0.002;
    const fx1 = 0.020, fz1 = 0.044, fy1 = 0.082;
    const nFountains = 10;
    const fYaw = Math.atan2(fx1 - fx0, fz1 - fz0);
    for (let i = 0; i < nFountains; i++) {
      const t = i / (nFountains - 1);
      const px = fx0 + (fx1 - fx0) * t;
      const pz = fz0 + (fz1 - fz0) * t;
      const py = fy0 + (fy1 - fy0) * t;
      addBoxDirect(px, py - 0.003, pz, 0.011, 0.009, 0.0085, incaGraniteColor(py), 0.028, 0, fYaw);
      addBoxDirect(px, py + 0.0018, pz, 0.006, 0.0016, 0.0065, 0x4ca6b5, 0.04, 0, fYaw);
      if (i % 2 === 0) features.push({ type: 'sparkle', pos: [px, py + 0.0038, pz], size: 0.009 });
    }
  }

  // =====================================================================
  // 7. CASA DEL GUARDIÁN, ROCA FUNERARIA Y PUERTA PRINCIPAL DEL CAMINO INCA
  // =====================================================================
  {
    addSubBox(0.056, 0.016, 0.038, 6, 2, 4, [GX, GY - 0.007, GZ], -0.16, rusticAndenStoneColor(GY));
    buildIncaBuilding({
      cx: GX - 0.004, yBase: GY, cz: GZ - 0.002, w: 0.032, d: 0.017, wallH: 0.018, yaw: -0.16 + Math.PI,
      thick: 0.0038, doorsFront: 2, windowsFront: 1, windowsBack: 2, nichesInside: 4, hasThatch: true, lightDoors: true,
    });
    addSubBox(0.014, 0.010, 0.012, 3, 2, 3, [GX + 0.023, GY + 0.003, GZ - 0.004], -0.16, huaynaCliffColor, 0.0005);
    addSubBox(0.009, 0.004, 0.008, 2, 1, 2, [GX + 0.023, GY + 0.0085, GZ - 0.004], -0.16, incaGraniteColor(GY));
    features.push({ type: 'flame', pos: [GX + 0.018, GY + 0.004, GZ + 0.008], size: 0.0025 });
    features.push({ type: 'smoke', pos: [GX + 0.018, GY + 0.008, GZ + 0.008], size: 0.005, color: 0xebe8e2 });

    // Camino escalonado y Puerta Principal de la Ciudadela
    const px = -0.024, pz = 0.095, py = height(px, pz);
    buildStoneWall(px - 0.045, pz + 0.006, px - 0.007, pz, py, 0.018, 0.0048, { courses: 4, fn: incaGraniteColor(py), sink: 0.012 });
    buildStoneWall(px + 0.007, pz, px + 0.048, pz - 0.005, py, 0.018, 0.0048, { courses: 4, fn: incaGraniteColor(py), sink: 0.012 });
    addSubBox(0.018, 0.005, 0.006, 3, 1, 1, [px, py + 0.0165, pz], 0.1, incaGraniteColor(py));
    addGeo(new THREE.BoxGeometry(0.009, 0.014, 0.003), 0x1a1714, { p: [px, py + 0.007, pz], r: [0, 0.1, 0] });
    features.push({ type: 'city', pos: [px - 0.009, py + 0.014, pz + 0.004], size: 0.009 });
    features.push({ type: 'city', pos: [px + 0.009, py + 0.014, pz + 0.004], size: 0.009 });

    // Antorchas en el camino de la Casa del Guardián hacia la Puerta Principal
    for (let i = 1; i <= 3; i++) {
      const u = i / 4;
      const ax = GX + (px - GX) * u + 0.015, az = GZ + (pz - GZ) * u;
      features.push({ type: 'city', pos: [ax, height(ax, az) + 0.007, az], size: 0.009 });
    }
  }

  // =====================================================================
  // 8. ROCA SAGRADA Y HUAYRANAS DEL EXTREMO NORTE
  // =====================================================================
  {
    addSubBox(0.062, 0.014, 0.032, 5, 2, 3, [RX, RY - 0.006, RZ], 0.04, incaGraniteColor(RY));
    const rPts = [
      [-0.014, 0.008], [-0.009, 0.014], [-0.002, 0.020], [0.005, 0.017], [0.012, 0.010],
    ];
    for (let i = 0; i < rPts.length; i++) {
      const [ox, oh] = rPts[i];
      addSubBox(0.008, oh, 0.0065, 2, 3, 2, [RX + ox, RY + oh * 0.5 - 0.001, RZ], 0.04, incaGraniteColor(RY), 0.00035);
    }
    addSubBox(0.034, 0.004, 0.012, 4, 1, 2, [RX, RY + 0.001, RZ + 0.004], 0.04, incaGraniteColor(RY));
    buildIncaBuilding({
      cx: RX - 0.024, yBase: RY, cz: RZ + 0.005, w: 0.016, d: 0.013, wallH: 0.015, yaw: Math.PI * 0.5,
      openFront: true, nichesInside: 3, hasThatch: true,
    });
    buildIncaBuilding({
      cx: RX + 0.024, yBase: RY, cz: RZ + 0.005, w: 0.016, d: 0.013, wallH: 0.015, yaw: -Math.PI * 0.5,
      openFront: true, nichesInside: 3, hasThatch: true,
    });
    features.push({ type: 'flame', pos: [RX, RY + 0.0045, RZ + 0.009], size: 0.0022 });
  }

  // =====================================================================
  // 9. SECTOR URBANO ORIENTAL (TRES PORTADAS, ACLLAHUASI, QOLQAS Y CÓNDOR)
  // =====================================================================
  {
    const KANCHAS = [
      { x: 0.056, z: -0.056, y: 0.086, w: 0.024, d: 0.015, yaw: -Math.PI * 0.5, doors: 3, thatch: false, light: true },
      { x: 0.058, z: -0.024, y: 0.086, w: 0.025, d: 0.015, yaw: -Math.PI * 0.5, doors: 3, thatch: true, light: true },
      { x: 0.058, z: 0.008, y: 0.086, w: 0.024, d: 0.015, yaw: -Math.PI * 0.5, doors: 2, thatch: false, light: false },
      { x: 0.058, z: 0.038, y: 0.086, w: 0.024, d: 0.016, yaw: -Math.PI * 0.5, doors: 2, thatch: true, light: true },
      { x: 0.080, z: -0.058, y: 0.084, w: 0.018, d: 0.022, yaw: 0, doors: 2, thatch: true, light: true },
      { x: 0.082, z: -0.026, y: 0.084, w: 0.019, d: 0.021, yaw: 0, doors: 2, thatch: false, light: false },
      { x: 0.082, z: 0.006, y: 0.084, w: 0.019, d: 0.022, yaw: 0, doors: 1, thatch: true, light: true },
      { x: 0.080, z: 0.038, y: 0.084, w: 0.018, d: 0.020, yaw: Math.PI, doors: 2, thatch: false, light: false },
      { x: 0.105, z: -0.054, y: 0.074, w: 0.016, d: 0.018, yaw: -Math.PI * 0.5, doors: 2, thatch: true, light: true },
      { x: 0.106, z: -0.026, y: 0.074, w: 0.016, d: 0.018, yaw: -Math.PI * 0.5, doors: 2, thatch: false, light: false },
      { x: 0.106, z: 0.002, y: 0.074, w: 0.016, d: 0.018, yaw: -Math.PI * 0.5, doors: 2, thatch: true, light: true },
      { x: 0.105, z: 0.030, y: 0.074, w: 0.016, d: 0.018, yaw: -Math.PI * 0.5, doors: 1, thatch: true, light: false },
      { x: 0.103, z: 0.058, y: 0.074, w: 0.015, d: 0.017, yaw: -Math.PI * 0.5, doors: 1, thatch: false, light: false },
    ];
    for (const k of KANCHAS) {
      buildIncaBuilding({
        cx: k.x, yBase: k.y, cz: k.z, w: k.w, d: k.d, wallH: 0.0155, yaw: k.yaw,
        thick: 0.0032, doorsFront: k.doors, nichesInside: 3, hasThatch: k.thatch, lightDoors: k.light,
        wallFn: incaGraniteColor(k.y, 1.1),
      });
    }
    buildStoneWall(0.094, -0.072, 0.094, 0.068, 0.074, 0.014, 0.0045, {
      courses: 3, fn: incaGraniteColor(0.074), sink: 0.009, blockSize: 0.006,
    });

    const CX_C = 0.058, CY_C = 0.088, CZ_C = 0.070;
    addSubBox(0.036, 0.010, 0.030, 4, 2, 4, [CX_C, CY_C - 0.004, CZ_C], 0.08, incaGraniteColor(CY_C));
    addGeo(displaceGeo(new THREE.BoxGeometry(0.012, 0.019, 0.018, 3, 4, 4), 0.0008), 0x626862, {
      p: [CX_C - 0.009, CY_C + 0.009, CZ_C - 0.002], r: [0.1, 0.28, 0.34], colorFn: huaynaCliffColor,
    });
    addGeo(displaceGeo(new THREE.BoxGeometry(0.012, 0.021, 0.018, 3, 4, 4), 0.0008), 0x717870, {
      p: [CX_C + 0.009, CY_C + 0.010, CZ_C + 0.001], r: [-0.08, -0.24, -0.32], colorFn: huaynaCliffColor,
    });
    addSubBox(0.0065, 0.0032, 0.0085, 2, 1, 2, [CX_C, CY_C + 0.002, CZ_C + 0.006], 0.08, incaGraniteColor(CY_C));
    addGeo(new THREE.CylinderGeometry(0.0036, 0.0042, 0.0022, 8), 0xdcddda, { p: [CX_C, CY_C + 0.0036, CZ_C + 0.004] });
    features.push({ type: 'flame', pos: [CX_C, CY_C + 0.005, CZ_C + 0.012], size: 0.0022 });

    for (let i = 0; i < 18; i++) {
      const sz = -0.075 + i * 0.0085;
      addBoxDirect(0.036, 0.084, sz, 0.009, 0.0045, 0.007, incaGraniteColor(0.082), 0.025);
      if (i % 4 === 0) features.push({ type: 'city', pos: [0.036, 0.090, sz], size: 0.009 });
    }
  }

  // =====================================================================
  // 10. HUAYNA PICCHU: CUMBRE AFILADA, ESCALINATA EN ZIGZAG, ANDENES EMPOTRADOS Y TEMPLO DE LA LUNA
  // =====================================================================
  {
    // Agujas graníticas en la cumbre afilada de Huayna Picchu y Huchuy Picchu (sin visera saliente)
    const rockSpots = [
      [HX, HZ, 0.284, 0.0085, 0.024],
      [HX - 0.005, HZ + 0.004, 0.270, 0.0075, 0.018],
      [HX + 0.006, HZ - 0.004, 0.272, 0.0075, 0.020],
      [HPX, HPZ, 0.162, 0.0085, 0.020],
    ];
    for (const [rx, rz, ry, rw, rh] of rockSpots) {
      addGeo(displaceGeo(new THREE.CylinderGeometry(rw * 0.16, rw * 1.05, rh, 7, 4), 0.0005), 0x626862, {
        p: [rx, ry - rh * 0.55, rz], r: [(rng() - 0.5) * 0.12, rng() * 3.1, (rng() - 0.5) * 0.12], colorFn: huaynaCliffColor,
      });
    }

    // 3 andenes colgados en la ladera sur de Huayna Picchu (adaptados exactamente al perfil de altura real para CERO salientes en el aire)
    for (let t = 0; t < 3; t++) {
      const tz = HZ + 0.032 + t * 0.013;
      const hw = 0.014 + t * 0.0045;
      const ty = Math.min(height(HX - hw, tz), height(HX + hw, tz), height(HX, tz)) + 0.003;
      buildStoneWall(HX - hw, tz, HX + hw, tz, ty - 0.011, 0.011, 0.0040, {
        courses: 2, fn: incaGraniteColor(ty), sink: 0.018, blockSize: 0.0048,
      });
      addBoxDirect(HX, ty - 0.0018, tz - 0.010, hw * 1.92, 0.0040, 0.020, turfColor, 0.04);
    }

    // Escalinata en zigzag tallada subiendo desde el istmo norte hasta la cumbre de Huayna Picchu
    const pathPts = [
      [-0.014, -0.118], [0.004, -0.136], [-0.018, -0.155], [0.008, -0.174], [-0.006, -0.194],
    ];
    for (let p = 0; p < pathPts.length - 1; p++) {
      const [ax, az] = pathPts[p], [bx, bz] = pathPts[p + 1];
      const steps = 7;
      for (let st = 0; st < steps; st++) {
        const u = st / steps;
        const sx = ax + (bx - ax) * u;
        const sz = az + (bz - az) * u;
        const sy = height(sx, sz);
        addBoxDirect(sx, sy + 0.0005, sz, 0.0048, 0.0042, 0.0048, incaGraniteColor(sy), 0.03);
      }
      if (p % 2 === 1) features.push({ type: 'city', pos: [bx, height(bx, bz) + 0.006, bz], size: 0.009 });
    }

    // Templo de la Luna en la gruta norte de Huayna Picchu (integrado dentro de la pared rocosa)
    const lx = -0.030, lz = -0.233, ly = height(lx, lz);
    addGeo(displaceGeo(new THREE.CylinderGeometry(0.014, 0.017, 0.018, 8, 3), 0.0007), 0x555b55, {
      p: [lx, ly + 0.010, lz + 0.010], colorFn: huaynaCliffColor,
    });
    buildStoneWall(lx - 0.013, lz, lx + 0.013, lz, ly - 0.002, 0.013, 0.0040, {
      courses: 3, fn: incaGraniteColor(ly), sink: 0.010, blockSize: 0.0048,
    });
    addGeo(new THREE.BoxGeometry(0.005, 0.008, 0.0035), 0x1a1714, { p: [lx, ly + 0.0045, lz - 0.0005] });
    features.push({ type: 'window', pos: [lx, ly + 0.0045, lz - 0.0035], yaw: Math.PI, w: 0.0042, h: 0.007 });
    features.push({ type: 'flame', pos: [lx + 0.008, ly + 0.002, lz - 0.004], size: 0.0022 });

    // Espolones rocosos en las laderas del Cañón del Urubamba y faldas de Huayna Picchu
    for (let i = 0, tries = 0; i < 82 && tries < 4000; tries++) {
      const ang = rng() * Math.PI * 2;
      const r = 0.075 + rng() * rimRadius(ang) * 0.76;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      if (riverDist(x, z) < RIVER_W + 0.011) continue;
      if (EXPLANADAS.some((p) => rectDist(x, z, p) < 0.016)) continue;
      const h = height(x, z), sl = slopeAt(x, z);
      if (sl < 0.42 || h < 0.024) continue;
      const rad = 0.005 + rng() * 0.007, bh = 0.014 + rng() * 0.022;
      addGeo(new THREE.CylinderGeometry(rad * 0.44, rad * 1.15, bh, 6, 3), 0x5c625c, {
        p: [x, Math.max(FLOOR + bh * 0.55, h - 0.005), z],
        r: [(rng() - 0.5) * 0.25, rng() * 6.28, (rng() - 0.5) * 0.25],
        s: [1.1, 1, 0.85],
        colorFn: huaynaCliffColor,
      });
      i++;
    }
  }

  // =====================================================================
  // 11. PUENTE COLGANTE INCA, REBAÑO DE LLAMAS Y BOSQUE DE CEJA DE SELVA
  // =====================================================================
  // 11.1 Puente Colgante Inca cruzando el cañón del Urubamba occidental (-X)
  {
    const px0 = -0.188, pz0 = 0.028, py0 = Math.max(0.032, height(px0, pz0) + 0.006);
    const px1 = -0.275, pz1 = 0.028, py1 = Math.max(0.032, height(px1, pz1) + 0.006);
    addSubBox(0.016, 0.036, 0.016, 2, 3, 2, [px0 + 0.006, py0 - 0.014, pz0], 0, incaGraniteColor(py0));
    addSubBox(0.016, 0.036, 0.016, 2, 3, 2, [px1 - 0.006, py1 - 0.014, pz1], 0, incaGraniteColor(py1));
    for (const sz of [-0.0045, 0.0045]) {
      addRod([px0, py0 - 0.002, pz0 + sz], [px0, py0 + 0.009, pz0 + sz], 0.0014, 0x5e3e24, 5);
      addRod([px1, py1 - 0.002, pz1 + sz], [px1, py1 + 0.009, pz1 + sz], 0.0014, 0x5e3e24, 5);
    }
    const segs = 11;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const sag0 = 4 * t0 * (1 - t0) * 0.008;
      const sag1 = 4 * t1 * (1 - t1) * 0.008;
      const xA = px0 + (px1 - px0) * t0, yA = py0 + (py1 - py0) * t0 - sag0;
      const xB = px0 + (px1 - px0) * t1, yB = py0 + (py1 - py0) * t1 - sag1;
      for (const sz of [-0.0042, 0.0042]) {
        addRod([xA, yA, pz0 + sz], [xB, yB, pz0 + sz], 0.0009, 0x9e7a38, 4);
        addRod([xA, yA + 0.007, pz0 + sz], [xB, yB + 0.007, pz0 + sz], 0.0008, 0x9e7a38, 4);
      }
      addBoxDirect(0.5 * (xA + xB), 0.5 * (yA + yB), pz0, 0.0052, 0.0018, 0.0085, woodQuenuaColor, 0.04);
    }
    features.push({ type: 'city', pos: [px0, py0 + 0.010, pz0], size: 0.009 });
    features.push({ type: 'city', pos: [px1, py1 + 0.010, pz1], size: 0.009 });
  }

  // 11.2 Rebaño de 10 Llamas y Alpacas pastando en la Plaza Principal y Andenes
  const addLlama = (lx, lz, yaw, woolHex, sc = 1.25) => {
    const ly = height(lx, lz);
    const L = makeLocal(lx, ly, lz, yaw);
    for (const px of [-0.0016, 0.0016]) {
      for (const pz of [-0.0026, 0.0026]) {
        addRod(L(px * sc, -0.002 * sc, pz * sc), L(px * sc, 0.0046 * sc, pz * sc), 0.0007 * sc, woolHex, 5);
      }
    }
    addGeo(new THREE.SphereGeometry(0.0032 * sc, 8, 6), woolHex, {
      p: L(0, 0.0054 * sc, 0), r: [0, yaw, 0], s: [0.76, 0.85, 1.32], amt: 0.045,
    });
    addBeam(...L(0, 0.0056 * sc, 0.0032 * sc), ...L(0, 0.0108 * sc, 0.0042 * sc), 0.0018 * sc, 0.0018 * sc, woolHex);
    addGeo(new THREE.SphereGeometry(0.0017 * sc, 7, 5), woolHex, {
      p: L(0, 0.0114 * sc, 0.0048 * sc), r: [0, yaw, 0], s: [0.85, 0.85, 1.25], amt: 0.045,
    });
    for (const ex of [-0.0009, 0.0009]) {
      addGeo(new THREE.ConeGeometry(0.0005 * sc, 0.0018 * sc, 4), woolHex, {
        p: L(ex * sc, 0.0128 * sc, 0.0040 * sc), r: [-0.2, yaw, -ex * 120],
      });
    }
  };
  const LLAMA_SPOTS = [
    [-0.016, -0.042, 0.6, 0xf2ede0, 1.28],
    [-0.006, -0.032, -1.1, 0xc78d56, 1.18],
    [0.014, -0.025, 2.2, 0xede6d5, 1.25],
    [0.004, -0.005, 0.3, 0x8d5b3a, 1.16],
    [-0.018, 0.015, -0.5, 0xf4f0e6, 1.24],
    [0.012, 0.022, 1.8, 0xd8b17e, 1.15],
    [-0.008, 0.042, 0.9, 0x5c3c26, 1.25],
    [-0.042, 0.132, -0.4, 0xf2ede0, 1.20],
    [-0.018, 0.125, 1.2, 0xc78d56, 1.18],
    [0.012, 0.134, -2.0, 0xede6d5, 1.22],
  ];
  for (const [lx, lz, yaw, col, sc] of LLAMA_SPOTS) addLlama(lx, lz, yaw, col, sc);

  // 11.3 Bosque de Ceja de Selva (árboles de queñua/aliso y helechos arbóreos)
  const addAndeanTree = (tx, tz, sc = 1) => {
    const ty = height(tx, tz) - 0.0035;
    const tiltX = (rng() - 0.5) * 0.25, tiltZ = (rng() - 0.5) * 0.25;
    const hTrunk = (0.010 + rng() * 0.006) * sc;
    addRod([tx, ty, tz], [tx + tiltX * 0.008, ty + hTrunk, tz + tiltZ * 0.008], 0.0017 * sc, 0x573b24, 5);
    const foliageHex = rng() < 0.35 ? 0x2f6028 : rng() < 0.7 ? 0x3b7231 : 0x4c8539;
    const cx = tx + tiltX * 0.008, cy = ty + hTrunk + 0.003 * sc, cz = tz + tiltZ * 0.008;
    addGeo(new THREE.IcosahedronGeometry(0.0072 * sc, 0), foliageHex, {
      p: [cx, cy, cz], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.15, 0.72, 1.15], amt: 0.07,
    });
    addGeo(new THREE.IcosahedronGeometry(0.0050 * sc, 0), foliageHex, {
      p: [cx + (rng() - 0.5) * 0.005 * sc, cy + 0.0032 * sc, cz + (rng() - 0.5) * 0.005 * sc],
      r: [rng() * 3, rng() * 3, rng() * 3], s: [1.0, 0.75, 1.0], amt: 0.07,
    });
  };
  let trees = 0;
  for (let tries = 0; trees < 64 && tries < 5000; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = 0.095 + rng() * rimRadius(ang) * 0.76;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (riverDist(x, z) < RIVER_W + 0.011) continue;
    if (EXPLANADAS.some((p) => rectDist(x, z, p) < 0.022)) continue;
    if (Math.hypot(x - 0.005, z - 0.135) < 0.092) continue;
    if (Math.hypot(x - HX, z - HZ) < 0.074 && height(x, z) > 0.11) continue;
    const h = height(x, z), sl = slopeAt(x, z);
    if (h < 0.016 || h > 0.145 || sl > 0.65) continue;
    addAndeanTree(x, z, 0.85 + rng() * 0.45);
    if (trees % 3 === 0) features.push({ type: 'firefly', pos: [x, h + 0.012, z], size: 0.017 });
    trees++;
  }

  // =====================================================================
  // 12. EFECTOS VIVOS EN EL RÍO URUBAMBA Y EN LAS CUMBRES ANDINAS
  // =====================================================================
  for (let i = 0; i < 42; i++) {
    const t = i / 41;
    const seg = Math.min(RIVER_PTS.length - 2, Math.floor(t * (RIVER_PTS.length - 1)));
    const lt = t * (RIVER_PTS.length - 1) - seg;
    const px = RIVER_PTS[seg][0] + (RIVER_PTS[seg + 1][0] - RIVER_PTS[seg][0]) * lt + (rng() - 0.5) * 0.024;
    const pz = RIVER_PTS[seg][1] + (RIVER_PTS[seg + 1][1] - RIVER_PTS[seg][1]) * lt + (rng() - 0.5) * 0.024;
    if (Math.hypot(px - CX, pz - CZ) < rimRadius(Math.atan2(pz - CZ, px - CX)) * 0.92 && height(px, pz) < Y_RIVER) {
      features.push({ type: 'sparkle', pos: [px, Y_RIVER + 0.003, pz], size: 0.009 });
    }
  }

  // Nubes despejadas de las construcciones, flotando sobre el cañón y alrededor de Huayna Picchu
  const cloudRing = [
    [-0.195, 0.165, -0.175, 0.014],
    [0.185, 0.175, -0.165, 0.015],
    [-0.205, 0.130, 0.125, 0.013],
    [0.205, 0.135, 0.115, 0.014],
    [-0.095, 0.265, -0.235, 0.014],
    [0.105, 0.255, -0.225, 0.013],
    [0.015, 0.295, -0.125, 0.013],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0, cy, 0], size: cs });
  }
  features.push({ type: 'gulls', pos: [0.01, 0.252, -0.145], size: 0.115 });

  void stats;
  return finish('Machu Picchu');
}
