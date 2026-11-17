// Diorama "La Torre Eiffel" — Maqueta parisina de alta fidelidad (~145k–170k triángulos)
// Torre Eiffel completa en hierro pudelado Brun Tour Eiffel con celosía 3D abierta y continua:
//   4 cimientos de sillería, 4 pilares curvos inferiores con cabinas de ascensor oblicuo y escaleras,
//   4 grandes arcos ornamentales con péndolas y rosetones, 1.ª plataforma con patio central,
//   los 72 nombres de científicos en relieve dorado y 4 pabellones con mansarda parisina,
//   4 pilares medios, 2.ª plataforma con doble galería y restaurante Le Jules Verne,
//   fuste superior de 22 tramos con balcón intermedio, 3.ª plataforma, gabinete de Eiffel,
//   campanile nervado dorado, faro giratorio y aguja de telecomunicaciones.
// Entorno de París sobre zócalo haussmanniano hermético:
//   Río Sena con muelles (quais), escalinatas y bouquinistes, Pont d'Iéna con 3 arcos dovelados,
//   águilas doradas, grupos ecuestres y farolas triples, 2 Bateaux-Mouches,
//   terraza del Trocadéro con Fuente de Varsovia de chorros parabólicos y alas porticadas,
//   jardines del Champ de Mars, arboledas, Carrousel Belle Époque, quiosco-café y columnas Morris.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildEiffel(seed = 89) {
  const { rng, fbm, features, jitter, addTri, addGeo, finish } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  // =====================================================================
  // 1. PALETA PARISINA Y FUNCIONES DE COLOR PROCEDIMENTALES
  // =====================================================================
  const eiffelIronColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const t = Math.max(0, Math.min(1, (cy - 0.025) / 0.48));
    const qx = Math.floor((cx + 1) * 420), qy = Math.floor((cy + 1) * 420), qz = Math.floor((cz + 1) * 420);
    const h = ((qx * 73856093) ^ (qy * 19349663) ^ (qz * 83492791)) & 3;
    let pal;
    if (t < 0.34) {
      pal = [0x5e4733, 0x543f2d, 0x684f39, 0x4c3928];
    } else if (t < 0.68) {
      pal = [0x71563e, 0x674e38, 0x7b5e44, 0x5f4833];
    } else {
      pal = [0x85684d, 0x7a5f46, 0x907255, 0x715740];
    }
    return jitter(pal[h], 0.032);
  };

  const darkCoreIronColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 260) & 1;
    return jitter(k ? 0x2c2118 : 0x35281d, 0.035);
  };

  const limestoneColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 210 * scale);
    const col = Math.floor((cx + cz) * 140 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0xe8dec9, 0xdfd2b8, 0xeee5d3, 0xd4c5a8];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.006 && ((row + col) & 1)) hex = 0xc9b99b;
    return jitter(hex, 0.024);
  };

  const goldBronzeColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 260) & 1;
    return jitter(k ? 0xe5b746 : 0xcf9d2e, 0.035);
  };

  const slateRoofColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const h = ((Math.floor(cy * 220) * 31) ^ (Math.floor((cx - cz) * 170) * 17)) & 3;
    return jitter([0x364452, 0x2d3a46, 0x40505f, 0x27323d][h], 0.035);
  };

  const copperPatinaColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 220) & 1;
    return jitter(k ? 0x4c806f : 0x3e6e5f, 0.04);
  };

  const displaceGeo = (geo, amp = 0.00045) => {
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
  // 2. HELPERS GEOMÉTRICOS DE ALTA PRECISIÓN
  // =====================================================================
  const pickRGB = (colorOrFn, va, vb, vc, amt = 0.03) =>
    typeof colorOrFn === 'function' ? colorOrFn(va, vb, vc) : jitter(colorOrFn, amt);

  const addQuad = (a, b, c, d, colorOrFn, want, amt = 0.03) => {
    addTri(a, b, c, pickRGB(colorOrFn, a, b, c, amt), want);
    addTri(a, c, d, pickRGB(colorOrFn, a, c, d, amt), want);
  };

  const _pc = new THREE.Vector3(), _fc = new THREE.Vector3(), _wn = new THREE.Vector3();
  const addPrism = (bot, top, colorOrFn, caps = true, amt = 0.03) => {
    _pc.set(0, 0, 0);
    for (let i = 0; i < 4; i++) { _pc.add(bot[i]); _pc.add(top[i]); }
    _pc.multiplyScalar(0.125);
    for (let i = 0; i < 4; i++) {
      const i1 = (i + 1) & 3;
      _fc.copy(bot[i]).add(bot[i1]).add(top[i1]).add(top[i]).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(bot[i], bot[i1], top[i1], top[i], colorOrFn, _wn, amt);
    }
    if (caps) {
      _fc.copy(bot[0]).add(bot[1]).add(bot[2]).add(bot[3]).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(bot[0], bot[3], bot[2], bot[1], colorOrFn, _wn, amt);
      _fc.copy(top[0]).add(top[1]).add(top[2]).add(top[3]).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(top[0], top[1], top[2], top[3], colorOrFn, _wn, amt);
    }
  };

  // Cordón continuo de esquina entre dos niveles horizontales (cero escalones)
  const addCornerChord = (p0, p1, halfThick0, halfThick1, colorOrFn) => {
    const mkRing = (p, ht) => [
      new THREE.Vector3(p.x - ht, p.y, p.z - ht),
      new THREE.Vector3(p.x + ht, p.y, p.z - ht),
      new THREE.Vector3(p.x + ht, p.y, p.z + ht),
      new THREE.Vector3(p.x - ht, p.y, p.z + ht),
    ];
    addPrism(mkRing(p0, halfThick0), mkRing(p1, halfThick1), colorOrFn, true, 0.025);
  };

  // Viga prismática rectangular entre A y B alineada con refDir
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

  // Celosía de una cara cuadrangular (c00, c10, c11, c01): X principal + rombo/cruz fina
  const addFaceLattice = (c00, c10, c11, c01, faceOut, colorOrFn, {
    wMain = 0.00145, wSub = 0.00095, subDiamond = true, midPost = true, midGirt = true,
  } = {}) => {
    const mBot = new THREE.Vector3().lerpVectors(c00, c10, 0.5);
    const mTop = new THREE.Vector3().lerpVectors(c01, c11, 0.5);
    const mLeft = new THREE.Vector3().lerpVectors(c00, c01, 0.5);
    const mRight = new THREE.Vector3().lerpVectors(c10, c11, 0.5);
    const dMain = wMain * 0.85, dSub = wSub * 0.85;
    addBeam(c00.x, c00.y, c00.z, c11.x, c11.y, c11.z, wMain, dMain, colorOrFn, faceOut, 0);
    addBeam(c10.x, c10.y, c10.z, c01.x, c01.y, c01.z, wMain, dMain, colorOrFn, faceOut, 0);
    if (midPost) addBeam(mBot.x, mBot.y, mBot.z, mTop.x, mTop.y, mTop.z, wSub, dSub, colorOrFn, faceOut, 0);
    if (midGirt) addBeam(mLeft.x, mLeft.y, mLeft.z, mRight.x, mRight.y, mRight.z, wSub, dSub, colorOrFn, faceOut, 0);
    if (subDiamond) {
      addBeam(mBot.x, mBot.y, mBot.z, mLeft.x, mLeft.y, mLeft.z, wSub, dSub, colorOrFn, faceOut, 0);
      addBeam(mLeft.x, mLeft.y, mLeft.z, mTop.x, mTop.y, mTop.z, wSub, dSub, colorOrFn, faceOut, 0);
      addBeam(mTop.x, mTop.y, mTop.z, mRight.x, mRight.y, mRight.z, wSub, dSub, colorOrFn, faceOut, 0);
      addBeam(mRight.x, mRight.y, mRight.z, mBot.x, mBot.y, mBot.z, wSub, dSub, colorOrFn, faceOut, 0);
    }
  };

  // =====================================================================
  // 3. BASE HAUSSMANNIANA, RÍO SENA, CHAMP DE MARS Y TROCADÉRO
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.270, AZ = 0.270, FLOOR = -0.046;
  const Y_WATER = 0.008, Y_PLAZA = 0.020, Y_TROC = 0.030;
  const TX = 0.0, TZ = -0.036;

  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 4.2) + Math.pow(Math.abs(s) / AZ, 4.2), 1 / 4.2);
  };

  const seineCenterZ = (x) => 0.142 - 0.014 * Math.pow(x / AX, 2);
  const RIVER_HW = 0.038;
  const zSouthBank = (x) => seineCenterZ(x) - RIVER_HW;
  const zNorthBank = (x) => seineCenterZ(x) + RIVER_HW;

  const heightAt = (x, z) => {
    const zs = zSouthBank(x), zn = zNorthBank(x);
    if (z >= zs - 0.002 && z <= zn + 0.002) {
      const dBank = Math.min(z - (zs - 0.002), (zn + 0.002) - z);
      return Y_PLAZA + (Y_WATER - Y_PLAZA) * smooth(dBank / 0.006);
    }
    if (z > zn + 0.002) {
      return Y_PLAZA + (Y_TROC - Y_PLAZA) * smooth((z - (zn + 0.018)) / 0.010);
    }
    const dCenter = Math.hypot(x - TX, z - TZ);
    if (dCenter < 0.046) {
      return Y_PLAZA - 0.0035 * smooth((0.046 - dCenter) / 0.007);
    }
    return Y_PLAZA;
  };

  const K = 72, S = 180;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r;
      const z = CZ + Math.sin(ang) * r;
      row.push({ v: new THREE.Vector3(x, heightAt(x, z), z), x, z });
    }
    ringPts.push(row);
  }

  function groundColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cy = (a.v.y + b.v.y + c.v.y) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    const zs = zSouthBank(cx), zn = zNorthBank(cx);

    if (cz >= zs - 0.001 && cz <= zn + 0.001 && cy < Y_PLAZA - 0.004) {
      const dBank = Math.min(cz - zs, zn - cz);
      const dBridge = Math.abs(cx);
      const n = fbm(cx * 36 + 5, cz * 55 + 2);
      if (dBank < 0.0045 || (dBridge < 0.025 && Math.abs(Math.abs(cz - seineCenterZ(cx)) - 0.015) < 0.003)) {
        return jitter(0x4b8799, 0.04);
      }
      return jitter(n > 0.52 ? 0x225a70 : 0x1b4b60, 0.045);
    }

    const dTower = Math.hypot(cx - TX, cz - TZ);
    if (dTower < 0.045 && cy < Y_PLAZA - 0.001) {
      return jitter(dTower > 0.039 ? 0x5c9aa8 : 0x2a6b80, 0.04);
    }

    if (cz > zn + 0.001) {
      const ix = Math.floor(cx * 135), iz = Math.floor(cz * 135);
      if (Math.abs(cx) < 0.052) return jitter(((ix + iz) & 1) ? 0xe7decb : 0xddd1b9, 0.022);
      return jitter(((ix * 31) ^ (iz * 17)) & 1 ? 0xdfd3bc : 0xd5c7ad, 0.024);
    }

    if (Math.abs(cx) < 0.024) {
      const ix = Math.floor(cx * 160), iz = Math.floor(cz * 160);
      return jitter(((ix ^ iz) & 1) ? 0xd9cbb0 : 0xcfbe9e, 0.028);
    }
    if (Math.max(Math.abs(cx - TX), Math.abs(cz - TZ)) < 0.116 && Math.abs(cx - TX) + Math.abs(cz - TZ) < 0.195) {
      const ring = Math.floor(dTower * 90), seg = Math.floor((Math.atan2(cz - TZ, cx - TX) + Math.PI) * 14);
      return jitter((ring + seg) & 1 ? 0xdcd0b8 : 0xd0c2a7, 0.025);
    }
    if (Math.abs(cz - TZ) < 0.018 || Math.abs(cz - (zs - 0.012)) < 0.012) {
      return jitter(0xd6c7aa, 0.028);
    }
    if (Math.abs(cx) > 0.042 && cz < zs - 0.024) {
      const n = fbm(cx * 28 + 11, cz * 28 + 4);
      return jitter(n > 0.5 ? 0x4b773c : 0x3f6933, 0.045);
    }
    return jitter(0xd8cab0, 0.025);
  }

  for (let k = 0; k < K; k++) {
    const A = ringPts[k], B = ringPts[k + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      if (k === 0) {
        addTri(A[0].v, B[s].v, B[s1].v, groundColor(A[0], B[s], B[s1]), UP);
        continue;
      }
      if (k % 2 === 0) {
        addTri(A[s].v, B[s].v, A[s1].v, groundColor(A[s], B[s], A[s1]), UP);
        addTri(B[s].v, B[s1].v, A[s1].v, groundColor(B[s], B[s1], A[s1]), UP);
      } else {
        addTri(A[s].v, B[s1].v, A[s1].v, groundColor(A[s], B[s1], A[s1]), UP);
        addTri(A[s].v, B[s].v, B[s1].v, groundColor(A[s], B[s], B[s1]), UP);
      }
    }
  }

  // Zócalo arquitectónico hermético con corte limpio del río en los bordes laterales
  const rim = ringPts[K];
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  const radial = new THREE.Vector3();
  const Y_BAND1 = 0.002, Y_BAND2 = -0.032;
  for (let s = 0; s < S; s++) {
    const a = rim[s].v, b = rim[(s + 1) % S].v;
    const ax0 = CX + (a.x - CX) * 1.008, az0 = CZ + (a.z - CZ) * 1.008;
    const bx0 = CX + (b.x - CX) * 1.008, bz0 = CZ + (b.z - CZ) * 1.008;
    const ax1 = CX + (a.x - CX) * 0.988, az1 = CZ + (a.z - CZ) * 0.988;
    const bx1 = CX + (b.x - CX) * 0.988, bz1 = CZ + (b.z - CZ) * 0.988;
    const ax2 = CX + (a.x - CX) * 0.964, az2 = CZ + (a.z - CZ) * 0.964;
    const bx2 = CX + (b.x - CX) * 0.964, bz2 = CZ + (b.z - CZ) * 0.964;

    const aTop = new THREE.Vector3(ax0, a.y, az0), bTop = new THREE.Vector3(bx0, b.y, bz0);
    const aM1 = new THREE.Vector3(ax0, Y_BAND1, az0), bM1 = new THREE.Vector3(bx0, Y_BAND1, bz0);
    const aM2 = new THREE.Vector3(ax1, Y_BAND2, az1), bM2 = new THREE.Vector3(bx1, Y_BAND2, bz1);
    const aBot = new THREE.Vector3(ax2, FLOOR, az2), bBot = new THREE.Vector3(bx2, FLOOR, bz2);

    const isRiverEdge = a.y < Y_PLAZA - 0.004 && b.y < Y_PLAZA - 0.004;
    const topBandHex = isRiverEdge ? 0x1b4b60 : 0xcab999;

    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    addTri(a, b, aTop, jitter(isRiverEdge ? 0x1f556d : 0xdfd3bc, 0.025), UP);
    addTri(b, bTop, aTop, jitter(isRiverEdge ? 0x1f556d : 0xdfd3bc, 0.025), UP);
    addTri(aTop, bTop, aM1, jitter(topBandHex, 0.03), radial);
    addTri(bTop, bM1, aM1, jitter(topBandHex, 0.03), radial);
    addTri(aM1, bM1, aM2, jitter(s % 2 ? 0x4a4540 : 0x56504a, 0.03), radial);
    addTri(bM1, bM2, aM2, jitter(s % 2 ? 0x4a4540 : 0x56504a, 0.03), radial);
    addTri(aM2, bM2, aBot, jitter(0x3a3632, 0.03), radial);
    addTri(bM2, bBot, aBot, jitter(0x3a3632, 0.03), radial);
    addTri(aBot, bBot, centerBottom, jitter(0x413c37, 0.025), DOWN);
  }

  // Borde octogonal del espejo de agua bajo la Torre
  for (let i = 0; i < 16; i++) {
    const th0 = (i / 16) * Math.PI * 2, th1 = ((i + 1) / 16) * Math.PI * 2;
    const r0 = 0.044, r1 = 0.049;
    const bx = TX + Math.cos((th0 + th1) * 0.5) * 0.0465, bz = TZ + Math.sin((th0 + th1) * 0.5) * 0.0465;
    const len = 2 * 0.0465 * Math.sin(Math.PI / 16) + 0.002;
    addGeo(new THREE.BoxGeometry(len, 0.008, r1 - r0), 0xe6dac4, {
      p: [bx, Y_PLAZA - 0.001, bz], r: [0, -(th0 + th1) * 0.5 + Math.PI / 2, 0], colorFn: limestoneColor(Y_PLAZA),
    });
  }
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * Math.PI * 2;
    features.push({ type: 'sparkle', pos: [TX + Math.cos(th) * 0.026, Y_PLAZA - 0.001, TZ + Math.sin(th) * 0.026], size: 0.009 });
  }

  // =====================================================================
  // 4. MUELLES DEL SENA (QUAIS), BOUQUINISTES Y TERRAZA DEL TROCADÉRO
  // =====================================================================
  const addParisLamp = (x, y, z, scale = 1, isTriple = false) => {
    const h = 0.024 * scale;
    addGeo(new THREE.CylinderGeometry(0.0015 * scale, 0.0022 * scale, 0.005 * scale, 6), 0x26352e, { p: [x, y + 0.0015 * scale, z] });
    addGeo(new THREE.CylinderGeometry(0.0008 * scale, 0.0013 * scale, h, 6), 0x2d3f36, { p: [x, y + 0.003 * scale + h * 0.5, z] });
    if (isTriple) {
      addGeo(new THREE.BoxGeometry(0.0075 * scale, 0.0012 * scale, 0.0014 * scale), 0x2d3f36, { p: [x, y + h + 0.0015 * scale, z] });
      for (const ox of [-0.0032, 0, 0.0032]) {
        const ly = y + h + (ox === 0 ? 0.0052 : 0.0032) * scale;
        addGeo(new THREE.SphereGeometry(0.0016 * scale, 6, 5), 0xfff0c4, { p: [x + ox * scale, ly, z] });
      }
      features.push({ type: 'city', pos: [x, y + h + 0.0052 * scale, z], size: 0.0135 });
    } else {
      addGeo(new THREE.SphereGeometry(0.0018 * scale, 6, 5), 0xfff0c4, { p: [x, y + h + 0.004 * scale, z] });
      addGeo(new THREE.ConeGeometry(0.0020 * scale, 0.0016 * scale, 6), 0x26352e, { p: [x, y + h + 0.0058 * scale, z] });
      features.push({ type: 'city', pos: [x, y + h + 0.004 * scale, z], size: 0.0125 });
    }
  };

  const N_QUAI = 46;
  for (let i = 0; i < N_QUAI; i++) {
    const x0 = -AX + (i / N_QUAI) * (2 * AX);
    const x1 = -AX + ((i + 1) / N_QUAI) * (2 * AX);
    const xm = 0.5 * (x0 + x1);
    const rLim = rimRadius(Math.atan2(seineCenterZ(xm), xm));
    if (Math.hypot(xm, seineCenterZ(xm)) > rLim * 0.965) continue;
    const dx = x1 - x0;

    for (const side of [-1, 1]) {
      const z0 = side < 0 ? zSouthBank(x0) - 0.002 : zNorthBank(x0) + 0.002;
      const z1 = side < 0 ? zSouthBank(x1) - 0.002 : zNorthBank(x1) + 0.002;
      const zm = 0.5 * (z0 + z1);
      if (Math.hypot(xm, zm) > rimRadius(Math.atan2(zm, xm)) * 0.992) continue;
      const yaw = Math.atan2(z1 - z0, dx);
      const segLen = Math.hypot(dx, z1 - z0) + 0.0014;

      addGeo(new THREE.BoxGeometry(segLen, 0.024, 0.006), 0xd8cab0, {
        p: [xm, Y_WATER + 0.002, zm], r: [0, -yaw, 0], colorFn: limestoneColor(Y_WATER),
      });

      if (Math.abs(xm) > 0.017) {
        addGeo(new THREE.BoxGeometry(segLen, 0.0048, 0.0038), 0xe6dac4, {
          p: [xm, Y_PLAZA + 0.0022, zm], r: [0, -yaw, 0], colorFn: limestoneColor(Y_PLAZA),
        });
        addGeo(new THREE.BoxGeometry(segLen, 0.0014, 0.0048), 0xf0e7d4, {
          p: [xm, Y_PLAZA + 0.0048, zm], r: [0, -yaw, 0],
        });

        if (side < 0 && i % 2 === 0 && Math.abs(xm) > 0.032 && Math.abs(xm) < 0.22) {
          addGeo(new THREE.BoxGeometry(0.0085, 0.0042, 0.0045), 0x204731, {
            p: [xm, Y_PLAZA + 0.0072, zm - 0.0008], r: [0, -yaw, 0], amt: 0.04,
          });
          addGeo(new THREE.BoxGeometry(0.0088, 0.0014, 0.0050), 0x183825, {
            p: [xm, Y_PLAZA + 0.0096, zm - 0.0005], r: [0.35, -yaw, 0], amt: 0.04,
          });
        }
      }

      if (i % 6 === 2 && Math.abs(xm) > 0.028 && Math.abs(xm) < 0.23) {
        addParisLamp(xm, Y_PLAZA + 0.002, zm + side * 0.0035, 0.92, false);
      }
    }

    // Muro continuo de la terraza alta del Trocadéro hasta el borde del zócalo
    const zT0 = zNorthBank(x0) + 0.022, zT1 = zNorthBank(x1) + 0.022;
    const zTm = 0.5 * (zT0 + zT1);
    if (Math.hypot(xm, zTm) < rimRadius(Math.atan2(zTm, xm)) * 0.985 && Math.abs(xm) > 0.020) {
      const yawT = Math.atan2(zT1 - zT0, dx);
      const lenT = Math.hypot(dx, zT1 - zT0) + 0.0016;
      addGeo(new THREE.BoxGeometry(lenT, 0.020, 0.0065), 0xdfd2b8, {
        p: [xm, Y_PLAZA + 0.002, zTm], r: [0, -yawT, 0], colorFn: limestoneColor(Y_PLAZA),
      });
      if (Math.abs(xm) > 0.052) {
        addGeo(new THREE.BoxGeometry(lenT, 0.0042, 0.0035), 0xeae0cc, {
          p: [xm, Y_TROC + 0.0018, zTm], r: [0, -yawT, 0], colorFn: limestoneColor(Y_TROC),
        });
      }
    }
  }

  // Terraza del Trocadéro: Escalinata, Fuente de Varsovia parabólica y Alas del Palais de Chaillot
  {
    const zPool = 0.228;
    for (let st = 0; st < 5; st++) {
      const f = st / 5;
      addGeo(new THREE.BoxGeometry(0.044, 0.005, 0.008), 0xe6dac4, {
        p: [0, Y_TROC - f * 0.0085, 0.198 - st * 0.0035], colorFn: limestoneColor(Y_PLAZA),
      });
    }
    addGeo(new THREE.BoxGeometry(0.118, 0.012, 0.048), 0xdfd2b8, { p: [0, Y_TROC - 0.002, zPool], colorFn: limestoneColor(Y_TROC) });
    addGeo(new THREE.BoxGeometry(0.106, 0.005, 0.038), 0x2a6e82, { p: [0, Y_TROC + 0.0025, zPool], amt: 0.04 });

    // 10 Chorros parabólicos de agua en 3 tramos curvos + espuma en el estanque
    for (const sideX of [-1, 1]) {
      for (let j = 0; j < 5; j++) {
        const jz = zPool - 0.013 + j * 0.0065;
        const jx = sideX * 0.048;
        let px0 = jx, py0 = Y_TROC + 0.004;
        for (let seg = 1; seg <= 3; seg++) {
          const t = seg / 3;
          const px1 = jx - sideX * 0.024 * t;
          const py1 = Y_TROC + 0.004 + 0.013 * Math.sin(t * Math.PI * 0.85);
          addBeam(px0, py0, jz, px1, py1, jz, 0.0018 * (1.2 - 0.3 * t), 0.0018 * (1.2 - 0.3 * t), 0xdcf2f8, UP, 0.0002);
          px0 = px1; py0 = py1;
        }
        addGeo(new THREE.CylinderGeometry(0.0024, 0.0028, 0.0014, 7), 0xe8f6fa, { p: [px0, Y_TROC + 0.005, jz] });
        features.push({ type: 'sparkle', pos: [px0, Y_TROC + 0.009, jz], size: 0.0085 });
      }
    }

    // 4 Estatuas doradas sobre pedestales flanqueando el estanque
    for (const sx of [-1, 1]) {
      for (const pz of [0.206, 0.248]) {
        const px = sx * 0.068;
        addGeo(new THREE.BoxGeometry(0.011, 0.014, 0.011), 0xe8dec9, { p: [px, Y_TROC + 0.004, pz], colorFn: limestoneColor(Y_TROC) });
        addGeo(new THREE.CylinderGeometry(0.0022, 0.0028, 0.011, 7), 0xdfb143, { p: [px, Y_TROC + 0.016, pz], colorFn: goldBronzeColor });
        addGeo(new THREE.SphereGeometry(0.0020, 6, 5), 0xe8be54, { p: [px, Y_TROC + 0.023, pz], colorFn: goldBronzeColor });
      }
    }

    // 2 Pabellones Beaux-Arts del Palais de Chaillot (con columnata correcta, zócalo, mansarda y ventanas)
    for (const sx of [-1, 1]) {
      const px = sx * 0.145, pz = 0.228;
      const yaw = -sx * 0.22; // -0.22 en +X, +0.22 en -X
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const localP = (lx, ly, lz) => [px + lx * c + lz * s, Y_TROC + ly, pz - lx * s + lz * c];

      addGeo(new THREE.BoxGeometry(0.090, 0.010, 0.028), 0xdfd2b8, { p: localP(0, 0.001, 0), r: [0, yaw, 0], colorFn: limestoneColor(Y_TROC) });
      addGeo(new THREE.BoxGeometry(0.084, 0.020, 0.020), 0xe8dec9, { p: localP(0, 0.014, -0.002), r: [0, yaw, 0], colorFn: limestoneColor(Y_TROC) });
      // Cornisa saliente y cubierta mansarda de pizarra parisina
      addGeo(new THREE.BoxGeometry(0.090, 0.0036, 0.026), 0xd4c5a8, { p: localP(0, 0.025, 0), r: [0, yaw, 0] });
      addGeo(new THREE.BoxGeometry(0.082, 0.006, 0.018), 0x364452, { p: localP(0, 0.0295, -0.001), r: [0, yaw, 0], colorFn: slateRoofColor });
      // Columnata hacia el Sena (-Z local)
      for (let col = -3; col <= 3; col++) {
        const lx = col * 0.012;
        addGeo(new THREE.CylinderGeometry(0.0015, 0.0018, 0.019, 7), 0xf3ebda, { p: localP(lx, 0.014, -0.011), colorFn: limestoneColor(Y_TROC) });
        if (col > -3) {
          const wPos = localP(lx - 0.006, 0.014, -0.0122);
          addGeo(new THREE.BoxGeometry(0.0052, 0.009, 0.0012), 0x262e38, { p: wPos, r: [0, yaw, 0] });
          if ((col & 1) === 0) {
            features.push({ type: 'window', pos: localP(lx - 0.006, 0.014, -0.0132), yaw: yaw + Math.PI, w: 0.0046, h: 0.0082 });
          }
        }
      }
      addParisLamp(sx * 0.062, Y_TROC + 0.001, 0.198, 1.05, true);
    }
  }

  // =====================================================================
  // 5. PONT D'IÉNA (3 ARCOS DOVELADOS, TAJAMARES, ÁGUILAS Y ECUESTRES)
  // =====================================================================
  {
    const BW = 0.030, Z0 = 0.094, Z1 = 0.192, B_LEN = Z1 - Z0, Z_MID = (Z0 + Z1) * 0.5;
    const Y_DECK = Y_PLAZA + 0.0095;

    const archShape = new THREE.Shape();
    const halfL = B_LEN * 0.5;
    archShape.moveTo(-halfL, -0.012);
    const spans = [[-0.036, -0.014], [-0.010, 0.010], [0.014, 0.036]];
    for (const [a0, a1] of spans) {
      archShape.lineTo(a0, -0.012);
      archShape.lineTo(a0, 0.004);
      const mid = (a0 + a1) * 0.5, rx = (a1 - a0) * 0.5, ry = 0.011;
      for (let s = 1; s <= 12; s++) {
        const th = Math.PI - (s / 12) * Math.PI;
        archShape.lineTo(mid + Math.cos(th) * rx, 0.004 + Math.sin(th) * ry);
      }
      archShape.lineTo(a1, -0.012);
    }
    archShape.lineTo(halfL, -0.012);
    archShape.lineTo(halfL, 0.022);
    archShape.lineTo(-halfL, 0.022);
    archShape.closePath();

    const bridgeGeo = new THREE.ExtrudeGeometry(archShape, { depth: BW, bevelEnabled: false, curveSegments: 12 });
    bridgeGeo.translate(0, 0, -BW * 0.5);
    addGeo(bridgeGeo, 0xe4d9c3, { p: [0, Y_WATER - 0.001, Z_MID], r: [0, Math.PI / 2, 0], colorFn: limestoneColor(Y_WATER) });

    // Dovelas de piedra clara enmarcando los 3 arcos en ambas caras
    for (const [a0, a1] of spans) {
      const mid = (a0 + a1) * 0.5, rx = (a1 - a0) * 0.5 + 0.0015, ry = 0.0125;
      for (let s = 0; s < 9; s++) {
        const th = Math.PI - ((s + 0.5) / 9) * Math.PI;
        const vz = Z_MID - (mid + Math.cos(th) * rx); // rotation +PI/2 maps +X shape -> -Z world
        const vy = Y_WATER + 0.003 + Math.sin(th) * ry;
        for (const sx of [-1, 1]) {
          addGeo(new THREE.BoxGeometry(0.0024, 0.0028, 0.0032), 0xf3ebda, {
            p: [sx * (BW * 0.5 + 0.0006), vy, vz], r: [-(th - Math.PI * 0.5), 0, 0],
          });
        }
      }
    }

    addGeo(new THREE.BoxGeometry(BW + 0.003, 0.0028, B_LEN + 0.002), 0xd8cab0, { p: [0, Y_DECK - 0.001, Z_MID], colorFn: limestoneColor(Y_DECK) });
    addGeo(new THREE.BoxGeometry(BW * 0.62, 0.0022, B_LEN + 0.004), 0x454340, { p: [0, Y_DECK + 0.0008, Z_MID], amt: 0.04 });

    for (const pzRel of [-0.012, 0.012]) {
      const pz = Z_MID + pzRel;
      addGeo(new THREE.CylinderGeometry(0.0042, 0.0052, 0.024, 8), 0xd9ccb2, { p: [-(BW * 0.5 + 0.002), Y_WATER + 0.006, pz], colorFn: limestoneColor(Y_WATER) });
      addGeo(new THREE.CylinderGeometry(0.0042, 0.0052, 0.024, 8), 0xd9ccb2, { p: [+(BW * 0.5 + 0.002), Y_WATER + 0.006, pz], colorFn: limestoneColor(Y_WATER) });
      for (const sx of [-1, 1]) {
        addGeo(new THREE.BoxGeometry(0.0022, 0.0052, 0.0052), 0xe2b244, {
          p: [sx * (BW * 0.5 + 0.0012), Y_DECK - 0.0055, pz], colorFn: goldBronzeColor,
        });
      }
    }

    for (const sx of [-1, 1]) {
      const rx = sx * (BW * 0.5 - 0.0015);
      addGeo(new THREE.BoxGeometry(0.0022, 0.0016, B_LEN - 0.012), 0xede4d2, { p: [rx, Y_DECK + 0.0046, Z_MID] });
      for (let b = -10; b <= 10; b++) {
        const bz = Z_MID + b * 0.0038;
        addGeo(new THREE.CylinderGeometry(0.0007, 0.0009, 0.0038, 5), 0xe3d6be, { p: [rx, Y_DECK + 0.0024, bz] });
      }
      for (const lz of [-0.028, 0, 0.028]) {
        addParisLamp(rx, Y_DECK + 0.004, Z_MID + lz, 0.85, true);
      }
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = sx * (BW * 0.5 + 0.0025), pz = Z_MID + sz * (B_LEN * 0.5 - 0.005);
        addGeo(new THREE.BoxGeometry(0.0085, 0.018, 0.0095), 0xe8dec9, { p: [px, Y_PLAZA + 0.006, pz], colorFn: limestoneColor(Y_PLAZA) });
        addGeo(new THREE.BoxGeometry(0.0096, 0.0024, 0.0106), 0xf0e7d5, { p: [px, Y_PLAZA + 0.015, pz] });
        const hy = Y_PLAZA + 0.016;
        addGeo(new THREE.BoxGeometry(0.0028, 0.0036, 0.0068), 0xebe1ce, { p: [px, hy + 0.0042, pz], r: [0, sz > 0 ? 0 : Math.PI, 0] });
        addGeo(new THREE.BoxGeometry(0.0020, 0.0048, 0.0024), 0xebe1ce, { p: [px, hy + 0.0072, pz - sz * 0.0024], r: [sz * 0.4, 0, 0] });
        addGeo(new THREE.CylinderGeometry(0.0012, 0.0016, 0.0055, 6), 0xdfb143, { p: [px, hy + 0.0082, pz + sz * 0.0005], colorFn: goldBronzeColor });
        addGeo(new THREE.SphereGeometry(0.0011, 6, 5), 0xe8be54, { p: [px, hy + 0.0118, pz + sz * 0.0005] });
      }
    }
  }

  // =====================================================================
  // 6. 2 BATEAUX-MOUCHES EN EL SENA
  // =====================================================================
  const addBateauMouche = (cx, dirX) => {
    const cz = seineCenterZ(cx);
    const yaw = Math.atan2(seineCenterZ(cx + 0.02) - seineCenterZ(cx - 0.02), 0.04);
    const rotY = -yaw + (dirX < 0 ? Math.PI : 0);
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const P = (lx, ly, lz) => [cx + lx * c + lz * s, Y_WATER + ly, cz - lx * s + lz * c];

    addGeo(new THREE.BoxGeometry(0.056, 0.008, 0.015), 0xf4efe6, { p: P(0, 0.001, 0), r: [0, rotY, 0], amt: 0.02 });
    addGeo(new THREE.BoxGeometry(0.058, 0.0026, 0.016), 0x1b3b5c, { p: P(0, 0.0042, 0), r: [0, rotY, 0], amt: 0.02 });
    addGeo(new THREE.ConeGeometry(0.0082, 0.015, 4), 0xf4efe6, { p: P(0.034, 0.0015, 0), r: [0, rotY, -Math.PI / 2] });
    addGeo(new THREE.CylinderGeometry(0.0072, 0.0078, 0.006, 8), 0x1b3b5c, { p: P(-0.028, 0.0025, 0) });
    addGeo(new THREE.BoxGeometry(0.042, 0.0065, 0.0125), 0x22384a, { p: P(-0.002, 0.0082, 0), r: [0, rotY, 0], amt: 0.03 });
    for (let r = -4; r <= 4; r++) {
      addGeo(new THREE.BoxGeometry(0.0014, 0.0072, 0.0132), 0xf7f4ec, { p: P(-0.002 + r * 0.0048, 0.0084, 0), r: [0, rotY, 0] });
    }
    addGeo(new THREE.BoxGeometry(0.038, 0.0018, 0.0115), 0xebe6db, { p: P(-0.002, 0.0120, 0), r: [0, rotY, 0] });
    addGeo(new THREE.BoxGeometry(0.007, 0.0055, 0.0085), 0xf7f4ec, { p: P(0.017, 0.0138, 0), r: [0, rotY, 0] });
    for (const side of [-1, 1]) {
      for (const lx of [-0.014, -0.002, 0.010]) {
        const wPos = P(lx, 0.0082, side * 0.0066);
        const wYaw = rotY + (side > 0 ? 0 : Math.PI);
        features.push({ type: 'window', pos: wPos, yaw: wYaw, w: 0.0068, h: 0.0038 });
      }
    }
    for (let k = 1; k <= 3; k++) {
      addGeo(new THREE.BoxGeometry(0.009, 0.0012, 0.0032), 0xd8edf2, { p: P(-0.034 - k * 0.0065, 0.0005, k * 0.0022), r: [0, rotY + 0.25, 0] });
      addGeo(new THREE.BoxGeometry(0.009, 0.0012, 0.0032), 0xd8edf2, { p: P(-0.034 - k * 0.0065, 0.0005, -k * 0.0022), r: [0, rotY - 0.25, 0] });
    }
    features.push({ type: 'sparkle', pos: P(-0.042, 0.002, 0), size: 0.009 });
  };
  addBateauMouche(-0.118, +1);
  addBateauMouche(+0.118, -1);

  // =====================================================================
  // 7. JARDINES DEL CHAMP DE MARS, ÁRBOLES, CARRUSEL, CAFÉ Y COLUMNAS MORRIS
  // =====================================================================
  const addParisTree = (x, y, z, sc = 1) => {
    addGeo(new THREE.CylinderGeometry(0.0018 * sc, 0.0030 * sc, 0.018 * sc, 6), 0x523b28, {
      p: [x, y + 0.006 * sc, z], r: [(rng() - 0.5) * 0.08, rng() * 3, (rng() - 0.5) * 0.08], amt: 0.05,
    });
    const greens = [0x355c2e, 0x426e37, 0x4f7c40, 0x2d5027];
    const blobs = [
      [0, 0.019, 0, 0.0095, 0.85],
      [0.0042, 0.016, 0.0030, 0.0072, 0.82],
      [-0.0038, 0.017, -0.0028, 0.0074, 0.82],
      [0.001, 0.025, -0.0015, 0.0066, 0.88],
    ];
    for (let i = 0; i < blobs.length; i++) {
      const [ox, oy, oz, rad, sy] = blobs[i];
      const g = displaceGeo(new THREE.IcosahedronGeometry(rad * sc, 1), 0.0012 * sc);
      addGeo(g, greens[(i + Math.floor(rng() * 4)) & 3], {
        p: [x + ox * sc, y + oy * sc, z + oz * sc],
        s: [1.05, sy, 1.05],
        r: [rng() * 0.3, rng() * 6.28, rng() * 0.3],
        amt: 0.06,
      });
    }
  };

  // Parterres ajardinados simétricos en el Champ de Mars con cercas bajas de hierro forjado y bancos
  const addParterre = (cx, cz, w, d) => {
    addGeo(new THREE.BoxGeometry(w, 0.005, d), 0xdad0ba, { p: [cx, Y_PLAZA + 0.001, cz], colorFn: limestoneColor(Y_PLAZA) });
    addGeo(new THREE.BoxGeometry(w - 0.006, 0.006, d - 0.006), 0x416e34, { p: [cx, Y_PLAZA + 0.0025, cz], amt: 0.05 });
    // Postes de cerca parisina verde en las esquinas
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addGeo(new THREE.CylinderGeometry(0.0009, 0.0011, 0.0055, 5), 0x22382b, {
          p: [cx + sx * (w * 0.5 - 0.0015), Y_PLAZA + 0.005, cz + sz * (d * 0.5 - 0.0015)],
        });
      }
    }
    for (let j = 0; j < 4; j++) {
      const fx = cx + (rng() - 0.5) * (w - 0.014), fz = cz + (rng() - 0.5) * (d - 0.014);
      addGeo(new THREE.IcosahedronGeometry(0.0036 + rng() * 0.0016, 0), j % 2 ? 0xc24858 : 0xe4b848, {
        p: [fx, Y_PLAZA + 0.0055, fz], s: [1.2, 0.65, 1.2], amt: 0.06,
      });
    }
  };
  addParterre(-0.072, -0.205, 0.088, 0.052);
  addParterre(+0.072, -0.205, 0.088, 0.052);
  addParterre(-0.188, -0.105, 0.056, 0.095);
  addParterre(+0.188, -0.105, 0.056, 0.095);

  // Bancos parisinos Davioud a lo largo del eje central
  for (const sx of [-1, 1]) {
    for (const bz of [-0.175, -0.130, 0.066]) {
      addGeo(new THREE.BoxGeometry(0.0045, 0.0035, 0.012), 0x2a4f38, { p: [sx * 0.028, Y_PLAZA + 0.0018, bz] });
      addGeo(new THREE.BoxGeometry(0.0015, 0.0030, 0.012), 0x2a4f38, { p: [sx * 0.0295, Y_PLAZA + 0.0045, bz] });
    }
  }

  const treeSpots = [];
  for (let i = 0; i < 6; i++) {
    const tz = -0.215 + i * 0.056;
    for (const sx of [-1, 1]) {
      treeSpots.push([sx * 0.142, tz, 0.88 + rng() * 0.25]);
      if (i < 5) treeSpots.push([sx * 0.222, tz + 0.025, 0.85 + rng() * 0.28]);
    }
  }
  for (let i = 0; i < 7; i++) {
    const tx = -0.155 + i * 0.051;
    if (Math.abs(tx) < 0.032) continue;
    treeSpots.push([tx, -0.236, 0.90 + rng() * 0.22]);
  }
  for (const sx of [-1, 1]) {
    for (const tz of [0.198, 0.232]) {
      treeSpots.push([sx * 0.218, tz, 0.82 + rng() * 0.18]);
    }
  }
  for (const [tx, tz, tsc] of treeSpots) {
    const rLim = rimRadius(Math.atan2(tz, tx));
    if (Math.hypot(tx, tz) > rLim * 0.90) continue;
    const ty = tz > zNorthBank(tx) + 0.015 ? Y_TROC : Y_PLAZA;
    addParisTree(tx, ty, tz, tsc);
    if (rng() < 0.38) features.push({ type: 'firefly', pos: [tx, ty + 0.018, tz], size: 0.022 });
  }

  // Carrousel Belle Époque junto al Champ de Mars Oeste (-0.172, 0.034)
  {
    const cx = -0.172, cz = 0.034, y0 = Y_PLAZA;
    addGeo(new THREE.CylinderGeometry(0.024, 0.026, 0.006, 12), 0xdad0ba, { p: [cx, y0 + 0.001, cz], colorFn: limestoneColor(y0) });
    addGeo(new THREE.CylinderGeometry(0.022, 0.023, 0.004, 12), 0x8f2428, { p: [cx, y0 + 0.005, cz] });
    addGeo(new THREE.CylinderGeometry(0.0055, 0.007, 0.022, 8), 0xf3e8d2, { p: [cx, y0 + 0.017, cz] });
    for (let h = 0; h < 6; h++) {
      const th = (h / 6) * Math.PI * 2;
      const hx = cx + Math.cos(th) * 0.0155, hz = cz + Math.sin(th) * 0.0155;
      addGeo(new THREE.CylinderGeometry(0.0007, 0.0007, 0.020, 5), 0xe2b244, { p: [hx, y0 + 0.017, hz] });
      addGeo(new THREE.BoxGeometry(0.0028, 0.0032, 0.0052), h % 2 ? 0xf6f1e6 : 0xdcb045, { p: [hx, y0 + 0.013 + (h % 2) * 0.002, hz], r: [0, -th, 0] });
    }
    addGeo(new THREE.ConeGeometry(0.025, 0.014, 16, 1), 0x8f2428, {
      p: [cx, y0 + 0.033, cz],
      colorFn: (va, vb, vc) => {
        const ang = Math.atan2((va.z + vb.z + vc.z) / 3 - cz, (va.x + vb.x + vc.x) / 3 - cx);
        const idx = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 16);
        return jitter(idx & 1 ? 0x8f2428 : 0xf4ead4, 0.03);
      },
    });
    addGeo(new THREE.CylinderGeometry(0.0245, 0.0245, 0.0036, 16), 0xd4a438, { p: [cx, y0 + 0.026, cz], colorFn: goldBronzeColor });
    addGeo(new THREE.SphereGeometry(0.0024, 6, 5), 0xe5b746, { p: [cx, y0 + 0.041, cz] });
    features.push({ type: 'city', pos: [cx + 0.014, y0 + 0.022, cz + 0.014], size: 0.013 });
    features.push({ type: 'city', pos: [cx - 0.014, y0 + 0.022, cz - 0.014], size: 0.013 });
  }

  // Quiosco-Café Parisino junto al Champ de Mars Este (+0.172, 0.034)
  {
    const kx = 0.172, kz = 0.034, y0 = Y_PLAZA;
    addGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.006, 8), 0xdad0ba, { p: [kx, y0 + 0.001, kz], colorFn: limestoneColor(y0) });
    addGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.020, 8), 0x204731, { p: [kx, y0 + 0.013, kz], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(0.016, 0.012, 8), 0x4c806f, { p: [kx, y0 + 0.029, kz], colorFn: copperPatinaColor });
    addGeo(new THREE.CylinderGeometry(0.0015, 0.0015, 0.008, 6), 0x3b332d, { p: [kx + 0.005, y0 + 0.032, kz - 0.004] });
    features.push({ type: 'smoke', pos: [kx + 0.005, y0 + 0.036, kz - 0.004], size: 0.0045 });
    for (let i = 0; i < 4; i++) {
      const th = (i / 4) * Math.PI * 2 + 0.4;
      const wx = kx + Math.sin(th) * 0.0122, wz = kz + Math.cos(th) * 0.0122;
      addGeo(new THREE.BoxGeometry(0.0055, 0.008, 0.002), 0xf6e6b8, { p: [wx, y0 + 0.013, wz], r: [0, th, 0] });
      features.push({ type: 'window', pos: [wx + Math.sin(th) * 0.0015, y0 + 0.013, wz + Math.cos(th) * 0.0015], yaw: th, w: 0.005, h: 0.007 });
    }
    for (const [tx, tz] of [[-0.016, 0.006], [0.016, 0.008], [0.002, 0.017]]) {
      addGeo(new THREE.CylinderGeometry(0.0032, 0.0032, 0.001, 7), 0xf2ece1, { p: [kx + tx, y0 + 0.008, kz + tz] });
      addGeo(new THREE.CylinderGeometry(0.0007, 0.0009, 0.005, 5), 0x262626, { p: [kx + tx, y0 + 0.0055, kz + tz] });
    }
  }

  for (const [mx, mz] of [[-0.068, 0.062], [0.068, 0.062], [-0.098, -0.155], [0.098, -0.155]]) {
    addGeo(new THREE.CylinderGeometry(0.0036, 0.0042, 0.018, 8), 0x1e4430, { p: [mx, Y_PLAZA + 0.007, mz], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(0.0054, 0.007, 8), 0x4c806f, { p: [mx, Y_PLAZA + 0.019, mz], colorFn: copperPatinaColor });
    addGeo(new THREE.SphereGeometry(0.0012, 5, 4), 0xe2b244, { p: [mx, Y_PLAZA + 0.023, mz] });
  }
  for (const lz of [-0.215, -0.155, -0.105, 0.052, 0.082]) {
    for (const sx of [-1, 1]) {
      addParisLamp(sx * 0.032, Y_PLAZA, lz, 0.88, false);
    }
  }

  // =====================================================================
  // 8. LA TORRE EIFFEL — CELOSÍA CONTINUA DE ALTA FIDELIDAD
  // =====================================================================
  const leg1Center = (y) => {
    const t = Math.max(0, Math.min(1, (y - 0.028) / 0.120));
    return 0.088 - 0.038 * Math.pow(t, 0.86);
  };
  const leg1HalfW = (y) => {
    const t = Math.max(0, Math.min(1, (y - 0.028) / 0.120));
    return 0.0175 - 0.0050 * t;
  };
  const leg2Center = (y) => {
    const t = Math.max(0, Math.min(1, (y - 0.166) / 0.120));
    return 0.044 - 0.0245 * Math.pow(t, 0.90);
  };
  const leg2HalfW = (y) => {
    const t = Math.max(0, Math.min(1, (y - 0.166) / 0.120));
    return 0.0118 - 0.0038 * t;
  };
  const shaftHalfW = (y) => {
    const t = Math.max(0, Math.min(1, (y - 0.304) / 0.160));
    return 0.0255 * Math.pow(1 - t * 0.56, 1.08);
  };

  const cornerSigns = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const faceNormals = [
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(-1, 0, 0),
  ];

  // Construye un tramo con cordones maestros continuos (vértice a vértice, sin dientes) + celosía abierta
  const buildTowerSegment = (cx0, cz0, y0, y1, hw0, hw1, cx1, cz1, {
    wChord0, wChord1, wMain, wSub, subDiamond = true, coreFrac = 0.18, addElevatorTrack = false, sx = 0, sz = 0,
  }) => {
    const corners0 = cornerSigns.map(([ix, iz]) => new THREE.Vector3(cx0 + ix * hw0, y0, cz0 + iz * hw0));
    const corners1 = cornerSigns.map(([ix, iz]) => new THREE.Vector3(cx1 + ix * hw1, y1, cz1 + iz * hw1));

    // 1. Espina interior del ascensor/escalera (estrecha para que pase luz por los laterales de la celosía)
    const cCore0 = cornerSigns.map(([ix, iz]) => new THREE.Vector3(cx0 + ix * hw0 * coreFrac, y0 - 0.0005, cz0 + iz * hw0 * coreFrac));
    const cCore1 = cornerSigns.map(([ix, iz]) => new THREE.Vector3(cx1 + ix * hw1 * coreFrac, y1 + 0.0005, cz1 + iz * hw1 * coreFrac));
    addPrism(cCore0, cCore1, darkCoreIronColor, false, 0.03);

    if (addElevatorTrack) {
      const rx0 = cx0 - sx * hw0 * 0.10, rz0 = cz0 - sz * hw0 * 0.10;
      const rx1 = cx1 - sx * hw1 * 0.10, rz1 = cz1 - sz * hw1 * 0.10;
      addBeam(rx0, y0, rz0, rx1, y1, rz1, wSub * 1.3, wSub * 1.3, 0x7d3a24, null, 0);
    }

    // 2. Cuatro cordones maestros continuos (vértice a vértice con sección decreciente suave)
    const ht0 = wChord0 * 0.5, ht1 = wChord1 * 0.5;
    for (let k = 0; k < 4; k++) {
      addCornerChord(corners0[k], corners1[k], ht0, ht1, eiffelIronColor);
    }

    // 3. Travesaños horizontales y celosía abierta en las 4 caras
    for (let f = 0; f < 4; f++) {
      const f1 = (f + 1) & 3;
      const fn = faceNormals[f];
      addBeam(corners0[f].x, corners0[f].y, corners0[f].z, corners0[f1].x, corners0[f1].y, corners0[f1].z,
        wChord0 * 0.65, wChord0 * 0.65, eiffelIronColor, fn, 0);
      addFaceLattice(corners0[f], corners0[f1], corners1[f1], corners1[f], fn, eiffelIronColor, {
        wMain, wSub, subDiamond, midPost: true, midGirt: true,
      });
    }
  };

  // --- 8.1: 4 Cimientos de Sillería (Massifs) y Zapatas de Anclaje ---
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = TX + sx * 0.088, pz = TZ + sz * 0.088;
      addGeo(new THREE.BoxGeometry(0.044, 0.014, 0.044), 0xd8cab0, { p: [px, Y_PLAZA - 0.001, pz], r: [0, Math.PI / 4, 0], colorFn: limestoneColor(Y_PLAZA) });
      addGeo(new THREE.BoxGeometry(0.038, 0.010, 0.038), 0xe6dac4, { p: [px, Y_PLAZA + 0.007, pz], r: [0, Math.PI / 4, 0], colorFn: limestoneColor(Y_PLAZA) });
      const hw = leg1HalfW(0.028);
      for (const ix of [-1, 1]) {
        for (const iz of [-1, 1]) {
          addGeo(new THREE.BoxGeometry(0.0068, 0.0075, 0.0068), 0x453424, {
            p: [px + ix * hw, Y_PLAZA + 0.010, pz + iz * hw], colorFn: eiffelIronColor,
          });
        }
      }
      addGeo(new THREE.BoxGeometry(0.014, 0.011, 0.014), 0x56412e, { p: [px, Y_PLAZA + 0.013, pz], colorFn: darkCoreIronColor });
    }
  }

  // --- 8.2: 4 Pilares Inferiores (12 tramos por pilar + 2 cabinas de ascensor oblicuas) ---
  {
    const N_BAYS_1 = 12, yStart = 0.028, yEnd = 0.148;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let b = 0; b < N_BAYS_1; b++) {
          const ya = yStart + (yEnd - yStart) * (b / N_BAYS_1);
          const yb = yStart + (yEnd - yStart) * ((b + 1) / N_BAYS_1);
          const c0 = leg1Center(ya), c1 = leg1Center(yb);
          const t0 = b / N_BAYS_1, t1 = (b + 1) / N_BAYS_1;
          buildTowerSegment(
            TX + sx * c0, TZ + sz * c0, ya, yb,
            leg1HalfW(ya), leg1HalfW(yb),
            TX + sx * c1, TZ + sz * c1,
            {
              wChord0: 0.0033 - 0.0006 * t0,
              wChord1: 0.0033 - 0.0006 * t1,
              wMain: 0.00145 - 0.0002 * t0,
              wSub: 0.00095 - 0.00012 * t0,
              subDiamond: true,
              coreFrac: 0.18,
              addElevatorTrack: true,
              sx, sz,
            },
          );
          if (b % 3 === 1) {
            features.push({ type: 'city', pos: [TX + sx * (c0 + 0.015), (ya + yb) * 0.5, TZ + sz * (c0 + 0.015)], size: 0.015 });
          }
        }
      }
    }
    // 2 Cabinas históricas del ascensor oblicuo subiendo por pilares opuestos
    for (const [sx, sz, ye] of [[1, 1, 0.088], [-1, -1, 0.112]]) {
      const ce = leg1Center(ye);
      addGeo(new THREE.BoxGeometry(0.012, 0.009, 0.012), 0x8f2428, {
        p: [TX + sx * ce, ye, TZ + sz * ce], r: [0, Math.PI / 4, 0], amt: 0.04,
      });
      addGeo(new THREE.BoxGeometry(0.010, 0.005, 0.013), 0xffd578, {
        p: [TX + sx * ce, ye + 0.001, TZ + sz * ce], r: [0, Math.PI / 4, 0],
      });
      features.push({ type: 'city', pos: [TX + sx * (ce + 0.006), ye, TZ + sz * (ce + 0.006)], size: 0.015 });
    }
  }

  // --- 8.3: Los 4 Grandes Arcos Monumentales (Grands Arcs, y = 0.040 .. 0.148) ---
  {
    const N_ARC = 24;
    const ySpring = 0.040, yCrown = 0.135, archDepth = 0.0085;
    const archSides = [
      { axis: 'x', signZ: +1, out: new THREE.Vector3(0, 0, 1) },
      { axis: 'x', signZ: -1, out: new THREE.Vector3(0, 0, -1) },
      { axis: 'z', signX: +1, out: new THREE.Vector3(1, 0, 0) },
      { axis: 'z', signX: -1, out: new THREE.Vector3(-1, 0, 0) },
    ];

    for (const side of archSides) {
      const archPoint = (th, rOff) => {
        const yBase = ySpring + (yCrown - ySpring) * Math.sin(th);
        const y = yBase + rOff * Math.sin(th);
        const lc = leg1Center(Math.min(0.148, yBase));
        const span = lc - 0.004;
        const along = Math.cos(th) * (span - rOff * 0.65);
        const dFace = lc + 0.0015;
        if (side.axis === 'x') return new THREE.Vector3(TX + along, y, TZ + side.signZ * dFace);
        return new THREE.Vector3(TX + side.signX * dFace, y, TZ + along);
      };

      const n = side.out;
      const halfD = archDepth * 0.5;
      for (let i = 0; i < N_ARC; i++) {
        const th0 = Math.PI - (i / N_ARC) * Math.PI;
        const th1 = Math.PI - ((i + 1) / N_ARC) * Math.PI;
        const in0 = archPoint(th0, 0), in1 = archPoint(th1, 0);
        const ex0 = archPoint(th0, 0.010), ex1 = archPoint(th1, 0.010);

        for (const sgn of [-1, 1]) {
          const ox = n.x * sgn * halfD, oz = n.z * sgn * halfD;
          addBeam(in0.x + ox, in0.y, in0.z + oz, in1.x + ox, in1.y, in1.z + oz, 0.0022, 0.0020, eiffelIronColor, n, 0.0003);
          addBeam(ex0.x + ox, ex0.y, ex0.z + oz, ex1.x + ox, ex1.y, ex1.z + oz, 0.0022, 0.0020, eiffelIronColor, n, 0.0003);
          addBeam(in0.x + ox, in0.y, in0.z + oz, ex1.x + ox, ex1.y, ex1.z + oz, 0.0013, 0.0012, eiffelIronColor, n, 0);
          addBeam(ex0.x + ox, ex0.y, ex0.z + oz, in1.x + ox, in1.y, in1.z + oz, 0.0013, 0.0012, eiffelIronColor, n, 0);
        }
        addBeam(in0.x - n.x * halfD, in0.y, in0.z - n.z * halfD, in0.x + n.x * halfD, in0.y, in0.z + n.z * halfD, 0.0018, 0.0018, eiffelIronColor, UP, 0.0002);
        addBeam(ex0.x - n.x * halfD, ex0.y, ex0.z - n.z * halfD, ex0.x + n.x * halfD, ex0.y, ex0.z + n.z * halfD, 0.0018, 0.0018, eiffelIronColor, UP, 0.0002);

        const thMid = 0.5 * (th0 + th1);
        const pm = archPoint(thMid, 0.010);
        const alongCoord = side.axis === 'x' ? Math.abs(pm.x - TX) : Math.abs(pm.z - TZ);
        if (alongCoord < 0.064 && pm.y < 0.146) {
          const topX = side.axis === 'x' ? pm.x : TX + side.signX * 0.056;
          const topZ = side.axis === 'x' ? TZ + side.signZ * 0.056 : pm.z;
          addBeam(pm.x, pm.y - 0.001, pm.z, topX, 0.149, topZ, 0.0018, 0.0018, eiffelIronColor, n, 0.0002);
          if (i % 2 === 0) {
            addGeo(new THREE.CylinderGeometry(0.0020, 0.0020, 0.0015, 8).rotateX(Math.PI / 2), 0xd4a438, {
              p: [pm.x + n.x * (halfD + 0.001), pm.y + 0.0025, pm.z + n.z * (halfD + 0.001)],
              r: [0, side.axis === 'x' ? 0 : Math.PI / 2, 0],
              colorFn: goldBronzeColor,
            });
          }
        }
      }
      const crown = archPoint(Math.PI * 0.5, 0.006);
      features.push({ type: 'city', pos: [crown.x + n.x * 0.008, crown.y, crown.z + n.z * 0.008], size: 0.015 });
    }
  }

  // --- 8.4: Primera Plataforma (Premier Étage, y = 0.148 .. 0.168) ---
  {
    const Y_DECK1 = 0.148, OUT_W = 0.146, IN_W = 0.062;
    const hOut = OUT_W * 0.5, hIn = IN_W * 0.5;

    const ringSlabs = [
      [0, hIn + (hOut - hIn) * 0.5, OUT_W, hOut - hIn],
      [0, -(hIn + (hOut - hIn) * 0.5), OUT_W, hOut - hIn],
      [hIn + (hOut - hIn) * 0.5, 0, hOut - hIn, IN_W],
      [-(hIn + (hOut - hIn) * 0.5), 0, hOut - hIn, IN_W],
    ];
    for (const [ox, oz, w, d] of ringSlabs) {
      // Friso oscuro tras las 72 placas doradas para mayor contraste
      addGeo(new THREE.BoxGeometry(w, 0.0082, d), 0x382a1e, { p: [TX + ox, Y_DECK1 + 0.0042, TZ + oz], colorFn: darkCoreIronColor });
      addGeo(new THREE.BoxGeometry(w + 0.002, 0.0024, d + 0.002), 0x765a41, { p: [TX + ox, Y_DECK1 + 0.0094, TZ + oz], colorFn: eiffelIronColor });
    }

    for (let dir = 0; dir < 4; dir++) {
      const yaw = dir * (Math.PI / 2);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const tx = Math.cos(yaw), tz = -Math.sin(yaw);
      const sidePt = (along, y, outOff) => [TX + tx * along + nx * outOff, y, TZ + tz * along + nz * outOff];

      // 16 Ménsulas en voladizo
      for (let m = 0; m < 16; m++) {
        const al = -0.068 + (m / 15) * 0.136;
        const p0 = sidePt(al, Y_DECK1 - 0.006, hOut - 0.016);
        const p1 = sidePt(al, Y_DECK1 + 0.001, hOut);
        addBeam(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.0020, 0.0025, eiffelIronColor, new THREE.Vector3(tx, 0, tz), 0.0004);
      }

      // 72 Nombres de científicos en relieve dorado (18 por lado)
      for (let n = 0; n < 18; n++) {
        const al = -0.065 + (n / 17) * 0.130;
        const p = sidePt(al, Y_DECK1 + 0.0045, hOut + 0.0008);
        addGeo(new THREE.BoxGeometry(0.0048, 0.0028, 0.0014), 0xe2b244, { p, r: [0, yaw, 0], colorFn: goldBronzeColor });
      }

      // Barandillas perimetrales
      for (let b = 0; b <= 24; b++) {
        const al = -hOut + (b / 24) * OUT_W;
        addGeo(new THREE.BoxGeometry(0.0013, 0.0062, 0.0013), 0x4c3928, { p: sidePt(al, Y_DECK1 + 0.0132, hOut - 0.001), r: [0, yaw, 0] });
      }
      addGeo(new THREE.BoxGeometry(OUT_W, 0.0014, 0.0018), 0x6b523b, { p: sidePt(0, Y_DECK1 + 0.0165, hOut - 0.001), r: [0, yaw, 0] });
      for (let b = 0; b <= 10; b++) {
        const al = -hIn + (b / 10) * IN_W;
        addGeo(new THREE.BoxGeometry(0.0013, 0.0052, 0.0013), 0x4c3928, { p: sidePt(al, Y_DECK1 + 0.0128, hIn + 0.001), r: [0, yaw, 0] });
      }
      addGeo(new THREE.BoxGeometry(IN_W, 0.0014, 0.0016), 0x6b523b, { p: sidePt(0, Y_DECK1 + 0.0155, hIn + 0.001), r: [0, yaw, 0] });

      // Pabellón Belle Époque acristalado con cubierta mansarda de pizarra alineada y crestería
      const midOff = (hIn + hOut) * 0.5;
      addGeo(new THREE.BoxGeometry(0.048, 0.009, 0.022), 0x4e3b2b, { p: sidePt(0, Y_DECK1 + 0.014, midOff), r: [0, yaw, 0], colorFn: eiffelIronColor });
      addGeo(new THREE.BoxGeometry(0.052, 0.0022, 0.025), 0x6c523b, { p: sidePt(0, Y_DECK1 + 0.0192, midOff), r: [0, yaw, 0] });
      // Mansarda prismática perfectamente alineada con los muros del pabellón
      const mkRoofRing = (hw, hd, y) => [
        new THREE.Vector3(...sidePt(-hw, y, midOff - hd)),
        new THREE.Vector3(...sidePt(+hw, y, midOff - hd)),
        new THREE.Vector3(...sidePt(+hw, y, midOff + hd)),
        new THREE.Vector3(...sidePt(-hw, y, midOff + hd)),
      ];
      addPrism(mkRoofRing(0.025, 0.0115, Y_DECK1 + 0.020), mkRoofRing(0.018, 0.0055, Y_DECK1 + 0.0255), slateRoofColor, true, 0.03);
      addGeo(new THREE.BoxGeometry(0.034, 0.0016, 0.0016), 0xe2b244, {
        p: sidePt(0, Y_DECK1 + 0.0262, midOff), r: [0, yaw, 0], colorFn: goldBronzeColor,
      });
      for (const wxOff of [-0.014, 0, 0.014]) {
        const wp = sidePt(wxOff, Y_DECK1 + 0.0142, midOff + 0.0112);
        addGeo(new THREE.BoxGeometry(0.0085, 0.0058, 0.0014), 0xffcf70, { p: wp, r: [0, yaw, 0] });
        features.push({ type: 'window', pos: sidePt(wxOff, Y_DECK1 + 0.0142, midOff + 0.0124), yaw, w: 0.008, h: 0.0054 });
      }
      features.push({ type: 'city', pos: sidePt(hOut * 0.88, Y_DECK1 + 0.017, hOut * 0.88), size: 0.0155 });
      features.push({ type: 'city', pos: sidePt(0, Y_DECK1 + 0.006, hOut + 0.004), size: 0.0145 });
      features.push({ type: 'sparkle', pos: sidePt(0, Y_DECK1 + 0.022, hOut * 0.92), size: 0.0095 });
    }
  }

  // --- 8.5: 4 Pilares Medios (12 tramos por pilar = 48 celdas de celosía abierta) ---
  {
    const N_BAYS_2 = 12, yStart = 0.166, yEnd = 0.286;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let b = 0; b < N_BAYS_2; b++) {
          const ya = yStart + (yEnd - yStart) * (b / N_BAYS_2);
          const yb = yStart + (yEnd - yStart) * ((b + 1) / N_BAYS_2);
          const c0 = leg2Center(ya), c1 = leg2Center(yb);
          const t0 = b / N_BAYS_2, t1 = (b + 1) / N_BAYS_2;
          buildTowerSegment(
            TX + sx * c0, TZ + sz * c0, ya, yb,
            leg2HalfW(ya), leg2HalfW(yb),
            TX + sx * c1, TZ + sz * c1,
            {
              wChord0: 0.0026 - 0.0005 * t0,
              wChord1: 0.0026 - 0.0005 * t1,
              wMain: 0.00125 - 0.0002 * t0,
              wSub: 0.00085 - 0.00012 * t0,
              subDiamond: b < 8,
              coreFrac: 0.18,
              addElevatorTrack: true,
              sx, sz,
            },
          );
          if (b % 4 === 2) {
            features.push({ type: 'city', pos: [TX + sx * (c0 + 0.010), (ya + yb) * 0.5, TZ + sz * (c0 + 0.010)], size: 0.015 });
          }
        }
      }
    }
  }

  // --- 8.6: Segunda Plataforma (Deuxième Étage, y = 0.284 .. 0.308) ---
  {
    const Y_DECK2 = 0.284, W2 = 0.086, hW2 = W2 * 0.5;
    addGeo(new THREE.BoxGeometry(W2, 0.0085, W2), 0x5c4532, { p: [TX, Y_DECK2 + 0.0042, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.BoxGeometry(W2 - 0.008, 0.009, W2 - 0.008), 0x3b2d21, { p: [TX, Y_DECK2 + 0.013, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.BoxGeometry(W2 - 0.004, 0.0030, W2 - 0.004), 0x765a41, { p: [TX, Y_DECK2 + 0.0185, TZ], colorFn: eiffelIronColor });

    for (let dir = 0; dir < 4; dir++) {
      const yaw = dir * (Math.PI / 2);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const tx = Math.cos(yaw), tz = -Math.sin(yaw);
      const sidePt = (along, y, outOff) => [TX + tx * along + nx * outOff, y, TZ + tz * along + nz * outOff];

      for (let m = 0; m < 12; m++) {
        const al = -0.038 + (m / 11) * 0.076;
        const p0 = sidePt(al, Y_DECK2 - 0.005, hW2 - 0.012);
        const p1 = sidePt(al, Y_DECK2 + 0.001, hW2);
        addBeam(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.0018, 0.0021, eiffelIronColor, new THREE.Vector3(tx, 0, tz), 0.0004);
      }
      for (const wxOff of [-0.020, 0, 0.020]) {
        const wp = sidePt(wxOff, Y_DECK2 + 0.013, hW2 - 0.0035);
        addGeo(new THREE.BoxGeometry(0.011, 0.0055, 0.0016), 0xffd278, { p: wp, r: [0, yaw, 0] });
        features.push({ type: 'window', pos: sidePt(wxOff, Y_DECK2 + 0.013, hW2 - 0.0021), yaw, w: 0.010, h: 0.005 });
      }
      for (let b = 0; b <= 16; b++) {
        const al = -(hW2 - 0.003) + (b / 16) * (W2 - 0.006);
        addGeo(new THREE.BoxGeometry(0.0013, 0.0052, 0.0013), 0x4c3928, { p: sidePt(al, Y_DECK2 + 0.022, hW2 - 0.003), r: [0, yaw, 0] });
      }
      addGeo(new THREE.BoxGeometry(W2 - 0.006, 0.0014, 0.0016), 0x6b523b, { p: sidePt(0, Y_DECK2 + 0.0246, hW2 - 0.003), r: [0, yaw, 0] });
      features.push({ type: 'city', pos: sidePt(hW2 * 0.85, Y_DECK2 + 0.024, hW2 * 0.85), size: 0.0155 });
      features.push({ type: 'sparkle', pos: sidePt(0, Y_DECK2 + 0.022, hW2), size: 0.0095 });
    }
  }

  // --- 8.7: Fuste Superior (Fût Supérieur, 22 tramos, y = 0.304 .. 0.464) ---
  {
    const N_BAYS_3 = 22, yStart = 0.304, yEnd = 0.464;
    for (let b = 0; b < N_BAYS_3; b++) {
      const ya = yStart + (yEnd - yStart) * (b / N_BAYS_3);
      const yb = yStart + (yEnd - yStart) * ((b + 1) / N_BAYS_3);
      const t0 = b / N_BAYS_3, t1 = (b + 1) / N_BAYS_3;
      buildTowerSegment(
        TX, TZ, ya, yb,
        shaftHalfW(ya), shaftHalfW(yb),
        TX, TZ,
        {
          wChord0: 0.0024 - 0.0008 * t0,
          wChord1: 0.0024 - 0.0008 * t1,
          wMain: 0.0013 - 0.00035 * t0,
          wSub: 0.00090 - 0.0002 * t0,
          subDiamond: b < 14,
          coreFrac: 0.38,
          addElevatorTrack: false,
        },
      );
      if (b % 3 === 1) {
        const hw = shaftHalfW((ya + yb) * 0.5) + 0.003;
        const ang = (b * 1.35) % (Math.PI * 2);
        features.push({ type: 'city', pos: [TX + Math.cos(ang) * hw, (ya + yb) * 0.5, TZ + Math.sin(ang) * hw], size: 0.0145 });
        features.push({ type: 'city', pos: [TX - Math.cos(ang) * hw, (ya + yb) * 0.5, TZ - Math.sin(ang) * hw], size: 0.0145 });
        if (b % 6 === 1) {
          features.push({ type: 'sparkle', pos: [TX + Math.sin(ang) * hw, (ya + yb) * 0.5, TZ - Math.cos(ang) * hw], size: 0.009 });
        }
      }
    }

    const yMid = 0.382, wMid = shaftHalfW(yMid) * 2 + 0.010;
    addGeo(new THREE.BoxGeometry(wMid, 0.0038, wMid), 0x6c523b, { p: [TX, yMid, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.BoxGeometry(wMid + 0.002, 0.0024, wMid + 0.002), 0x4c3928, { p: [TX, yMid + 0.0032, TZ], colorFn: eiffelIronColor });
  }

  // --- 8.8: Tercera Plataforma, Gabinete de Eiffel, Campanile, Faro y Aguja (y = 0.464 .. 0.580) ---
  {
    const Y3 = 0.464, W3 = 0.044, hW3 = W3 * 0.5;
    addGeo(new THREE.BoxGeometry(W3 - 0.008, 0.006, W3 - 0.008), 0x5c4532, { p: [TX, Y3 + 0.002, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.BoxGeometry(W3, 0.004, W3), 0x765a41, { p: [TX, Y3 + 0.0065, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.BoxGeometry(W3 - 0.006, 0.010, W3 - 0.006), 0x3b2d21, { p: [TX, Y3 + 0.0125, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.BoxGeometry(W3 + 0.002, 0.0026, W3 + 0.002), 0x86694e, { p: [TX, Y3 + 0.018, TZ], colorFn: eiffelIronColor });

    for (let dir = 0; dir < 4; dir++) {
      const yaw = dir * (Math.PI / 2);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const tx = Math.cos(yaw), tz = -Math.sin(yaw);
      const wp = [TX + nx * (hW3 - 0.0026), Y3 + 0.0125, TZ + nz * (hW3 - 0.0026)];
      addGeo(new THREE.BoxGeometry(0.024, 0.0052, 0.0014), 0xffd578, { p: wp, r: [0, yaw, 0] });
      features.push({ type: 'window', pos: [TX + nx * (hW3 - 0.0013), Y3 + 0.0125, TZ + nz * (hW3 - 0.0013)], yaw, w: 0.022, h: 0.0046 });
      for (let b = -4; b <= 4; b++) {
        addGeo(new THREE.BoxGeometry(0.0012, 0.0048, 0.0012), 0x4c3928, {
          p: [TX + tx * b * 0.0046 + nx * hW3, Y3 + 0.0215, TZ + tz * b * 0.0046 + nz * hW3],
        });
      }
      features.push({ type: 'city', pos: [TX + nx * hW3, Y3 + 0.023, TZ + nz * hW3], size: 0.015 });
    }

    addGeo(new THREE.CylinderGeometry(0.0155, 0.0175, 0.015, 10), 0x745940, { p: [TX, 0.490, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.CylinderGeometry(0.0175, 0.0165, 0.003, 10), 0x886b4f, { p: [TX, 0.499, TZ], colorFn: eiffelIronColor });

    addGeo(new THREE.SphereGeometry(0.0145, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.52), 0xdfb143, {
      p: [TX, 0.500, TZ], s: [1, 1.35, 1], colorFn: goldBronzeColor,
    });
    for (let r = 0; r < 10; r++) {
      const th = (r / 10) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0016, 0.018, 0.0022), 0x6c523b, {
        p: [TX + Math.cos(th) * 0.0135, 0.508, TZ + Math.sin(th) * 0.0135], r: [0, -th, 0.35],
      });
    }
    features.push({ type: 'sparkle', pos: [TX + 0.012, 0.512, TZ + 0.010], size: 0.010 });
    features.push({ type: 'sparkle', pos: [TX - 0.012, 0.512, TZ - 0.010], size: 0.010 });

    addGeo(new THREE.CylinderGeometry(0.0078, 0.0085, 0.012, 10), 0xfff0b8, { p: [TX, 0.524, TZ], amt: 0.02 });
    for (let m = 0; m < 8; m++) {
      const th = (m / 8) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0014, 0.013, 0.0014), 0x5c4532, { p: [TX + Math.cos(th) * 0.0084, 0.524, TZ + Math.sin(th) * 0.0084] });
    }
    addGeo(new THREE.CylinderGeometry(0.006, 0.010, 0.005, 10), 0x7e6248, { p: [TX, 0.532, TZ], colorFn: eiffelIronColor });
    features.push({ type: 'beam', pos: [TX, 0.524, TZ], size: 0.0145 });

    addGeo(new THREE.CylinderGeometry(0.0032, 0.0055, 0.022, 8), 0x6c523b, { p: [TX, 0.545, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.CylinderGeometry(0.0020, 0.0032, 0.018, 8), 0x7e6248, { p: [TX, 0.564, TZ], colorFn: eiffelIronColor });
    addGeo(new THREE.CylinderGeometry(0.0014, 0.0020, 0.010, 6), 0x9c8268, { p: [TX, 0.576, TZ], amt: 0.02 });
    for (const [ry, rr] of [[0.541, 0.0068], [0.551, 0.0056], [0.561, 0.0044], [0.570, 0.0034]]) {
      addGeo(new THREE.CylinderGeometry(rr, rr, 0.0022, 10), 0x5c4532, { p: [TX, ry, TZ], colorFn: eiffelIronColor });
      for (let a = 0; a < 4; a++) {
        const th = (a / 4) * Math.PI * 2 + ry * 20;
        addGeo(new THREE.BoxGeometry(0.0018, 0.0026, 0.0016), 0xd8d0c4, {
          p: [TX + Math.cos(th) * (rr + 0.0008), ry, TZ + Math.sin(th) * (rr + 0.0008)], r: [0, -th, 0],
        });
      }
    }
    addGeo(new THREE.SphereGeometry(0.0024, 8, 6), 0xe83b28, { p: [TX, 0.581, TZ] });
    features.push({ type: 'flame', pos: [TX, 0.582, TZ], size: 0.0024 });
  }

  // =====================================================================
  // 9. EFECTOS VIVOS EN EL CIELO DE PARÍS
  // =====================================================================
  const cloudRing = [
    [-0.22, 0.36, -0.15, 0.016],
    [0.23,  0.41, -0.11, 0.017],
    [0.02,  0.46, -0.21, 0.015],
    [0.22,  0.34,  0.15, 0.016],
    [-0.21, 0.38,  0.16, 0.015],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [TX, cy, TZ], size: cs });
  }
  features.push({ type: 'gulls', pos: [TX, 0.275, TZ + 0.08], size: 0.115 });

  return finish('La Torre Eiffel');
}
