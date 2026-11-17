// Diorama "El Cristo Redentor" — Maqueta monumental de Río de Janeiro (~290k+ triángulos)
// Foco escultórico de altísima densidad (~180k triángulos solo en la estatua Art Déco):
//   Cristo Redentor de Paul Landowski y Gheorghe Leonida en mosaico de pedra-sabão:
//   plinto octogonal y sandalias con dedos esculpidos, túnica columnar con acanaladuras Art Déco,
//   manto cruzado diagonalmente sobre pecho y espalda con paños laterales en cascada y cuello en V,
//   Sagrado Corazón de Jesús en altorrelieve con corona de espinas, flama y cruz,
//   brazos horizontales en cruz con mangas colgantes trapezoidales plisadas y bocamanga sombreada,
//   manos anatómicas completas (muñeca, palma, dorso, estigmas y 5 dedos articulados con uñas),
//   rostro inclinado de rasgos Art Déco (barba partida, bigote, labios, nariz recta, cejas,
//   ojos entornados y cabellera larga partida al medio con mechones tallados).
// Entorno completo del Morro do Corcovado sobre zócalo hermético:
//   pedestal octogonal Art Déco con 4 contrafuertes escalonados, reflectores y Capilla de Nossa Senhora Aparecida,
//   mirador principal y terraza intermedia en calçada portuguesa, escalinatas, pasarela y torre de ascensores,
//   viaducto de piedra y Trem do Corcovado rojo subiendo la ladera entre la selva de Tijuca
//   (árboles tropicales, ipês amarillos y rosados, quaresmeiras violetas y palmeras imperiales),
//   ensenada de la Bahía de Guanabara con Calçadão, veleros y el Pão de Açúcar con su Bondinho.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildCristo(seed = 137) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, stats } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  // =====================================================================
  // 1. PALETA CARIOCA Y FUNCIONES DE COLOR PROCEDIMENTALES
  // =====================================================================
  // Mosaico de esteatita (pedra-sabão) con teselas triangulares sutiles y oclusión en pliegues
  const pedraSabaoColor = (shade = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const qx = Math.floor((cx + 1) * 430);
    const qy = Math.floor((cy + 1) * 430);
    const qz = Math.floor((cz + 1) * 430);
    const h = ((qx * 73856093) ^ (qy * 19349663) ^ (qz * 83492791)) & 3;
    const pal = [0xf2efe7, 0xe7e2d7, 0xf7f4ec, 0xd8d2c5];
    tmpColor.setHex(pal[h]);
    const k = shade * (1 + (rng() - 0.5) * 0.042);
    return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
  };

  const soapColorFn = pedraSabaoColor(1.0);

  const pedestalGraniteColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 220 * scale);
    const col = Math.floor((cx + cz) * 150 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0xa8a399, 0x9b968c, 0xb3aea4, 0x8e8980];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.005 && ((row + col) & 1)) hex = 0x7a766d;
    return jitter(hex, 0.024);
  };

  const calcadaPortuguesaColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const wave = Math.sin(cx * 270 + Math.sin(cz * 200) * 1.6);
    if (wave > 0.25) return jitter(0x2a2b30, 0.028);
    return jitter(0xeee9df, 0.022);
  };

  const bronzeColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 260) & 1;
    return jitter(k ? 0x6e5a38 : 0x56462b, 0.04);
  };

  const corcovadoRockColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const streak = fbm(cx * 34 + 2, cz * 34 + 7);
    const band = Math.floor(cy * 110 + streak * 4) & 3;
    const pal = [0x4f5256, 0x414448, 0x5e6267, 0x34373b];
    return jitter(pal[band], 0.055);
  };

  const displaceGeo = (geo, amp = 0.0005) => {
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
  const pickRGB = (colorOrFn, va, vb, vc, amt = 0.025) =>
    typeof colorOrFn === 'function' ? colorOrFn(va, vb, vc) : jitter(colorOrFn, amt);

  const addQuad = (a, b, c, d, colorOrFn, want, amt = 0.025) => {
    addTri(a, b, c, pickRGB(colorOrFn, a, b, c, amt), want);
    addTri(a, c, d, pickRGB(colorOrFn, a, c, d, amt), want);
  };

  const _pc = new THREE.Vector3(), _fc = new THREE.Vector3(), _wn = new THREE.Vector3();
  const addPrism = (bot, top, colorOrFn, caps = true, amt = 0.025) => {
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
    addPrism(bot, top, colorOrFn, true, 0.022);
  };

  const _want = new THREE.Vector3(), _center = new THREE.Vector3();
  const addLoftedMesh = (rings, ringCenters, colorAt, { capStart = true, capEnd = true, startWant = null, endWant = null } = {}) => {
    const nR = rings.length;
    const nS = rings[0].length;
    for (let k = 0; k < nR - 1; k++) {
      const R0 = rings[k], R1 = rings[k + 1];
      const c0 = ringCenters[k], c1 = ringCenters[k + 1];
      for (let s = 0; s < nS; s++) {
        const s1 = (s + 1) % nS;
        const p00 = R0[s], p10 = R0[s1], p11 = R1[s1], p01 = R1[s];
        _center.copy(c0).add(c1).multiplyScalar(0.5);
        _want.copy(p00).add(p10).add(p11).multiplyScalar(1 / 3).sub(_center);
        addTri(p00, p10, p11, colorAt(k, s, p00, p10, p11), _want);
        _want.copy(p00).add(p11).add(p01).multiplyScalar(1 / 3).sub(_center);
        addTri(p00, p11, p01, colorAt(k, s, p00, p11, p01), _want);
      }
    }
    if (capStart) {
      const cStart = ringCenters[0];
      const wDir = startWant || new THREE.Vector3().subVectors(ringCenters[0], ringCenters[1]).normalize();
      for (let s = 0; s < nS; s++) {
        const s1 = (s + 1) % nS;
        addTri(cStart, rings[0][s1], rings[0][s], colorAt(0, s, cStart, rings[0][s1], rings[0][s]), wDir);
      }
    }
    if (capEnd) {
      const cEnd = ringCenters[nR - 1];
      const wDir = endWant || new THREE.Vector3().subVectors(ringCenters[nR - 1], ringCenters[nR - 2]).normalize();
      for (let s = 0; s < nS; s++) {
        const s1 = (s + 1) % nS;
        addTri(cEnd, rings[nR - 1][s], rings[nR - 1][s1], colorAt(nR - 1, s, cEnd, rings[nR - 1][s], rings[nR - 1][s1]), wDir);
      }
    }
  };

  // =====================================================================
  // 3. TOPOGRAFÍA DEL MORRO DO CORCOVADO Y BAHÍA DE GUANABARA (~64k tris)
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.265, AZ = 0.275, FLOOR = -0.055;
  const SX = 0.0, SZ = -0.028; // centro de la cumbre y la estatua
  const Y_SUMMIT = 0.148;
  const Y_MID = 0.118;
  const Y_STATION = 0.088;
  const Y_BAY = 0.004;

  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const base = 1 / Math.pow(Math.pow(Math.abs(c) / AX, 3.8) + Math.pow(Math.abs(s) / AZ, 3.8), 1 / 3.8);
    const lobeBay = 0.022 * Math.exp(-Math.pow((ang - 0.92) / 0.55, 2));
    return base + lobeBay;
  };

  const EXPLANADAS = [
    { x: SX, z: SZ + 0.004, hw: 0.046, hd: 0.050, rot: 0, y: Y_SUMMIT, r0: 0.014, r1: 0.036 },
    { x: 0.022, z: 0.045, hw: 0.032, hd: 0.022, rot: -0.25, y: Y_MID, r0: 0.010, r1: 0.028 },
    { x: -0.084, z: 0.072, hw: 0.028, hd: 0.022, rot: 0.35, y: Y_STATION, r0: 0.010, r1: 0.026 },
  ];

  const rectDist = (x, z, p) => {
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  const bayShoreZ = (x) => 0.165 - 0.038 * smooth((x + 0.02) / 0.18);

  const rawHeight = (x, z) => {
    const dx = x - SX, dz = z - SZ;
    const dist = Math.hypot(dx, dz);
    // Transición suave C1 entre la cara escarpada (+Z) y la ladera trasera (-Z), sin escalón discontinuo
    const frontFactor = 0.90 + 0.28 * smooth((z - SZ + 0.04) / 0.08);
    const peak = 0.146 * Math.pow(smooth(1 - dist * frontFactor / 0.255), 0.78);
    const westRidge = 0.095 * smooth(1 - Math.hypot((x + 0.095) * 0.9, (z - 0.045) * 1.1) / 0.145);
    const nwShoulder = 0.082 * smooth(1 - Math.hypot((x + 0.115) * 1.0, (z + 0.085) * 1.0) / 0.145);
    let h = 0.012 + Math.max(peak, westRidge, nwShoulder);

    // Depresión de la Bahía de Guanabara en la zona frontal-este (+Z)
    const zb = bayShoreZ(x);
    if (z > zb - 0.028 && x > -0.14) {
      const tBay = smooth((z - (zb - 0.028)) / 0.042) * smooth((x + 0.14) / 0.08);
      h = h * (1 - tBay) + (-0.008) * tBay;
    }

    // Morro da Urca y Pão de Açúcar: domos monolíticos redondeados y suaves
    const dUrca = Math.hypot((x - 0.112) / 0.035, (z - 0.190) / 0.031);
    if (dUrca < 1) h = Math.max(h, 0.004 + 0.034 * Math.pow(smooth(1 - dUrca * dUrca), 0.72));
    const dPao = Math.hypot((x - 0.168) / 0.033, (z - 0.196) / 0.029);
    if (dPao < 1) h = Math.max(h, 0.004 + 0.060 * Math.pow(smooth(1 - dPao * dPao), 0.62));

    // Micro-relieve rocoso (suavizado en los morros monolíticos de la bahía)
    const rockNoiseAmp = (dUrca < 1 || dPao < 1) ? 0.25 : 1.0;
    h += (fbm(x * 18 + 3, z * 18 + 9) - 0.5) * 0.018 * rockNoiseAmp;
    h += (fbm(x * 46 + 11, z * 46 + 5) - 0.5) * 0.0045 * rockNoiseAmp;
    return h;
  };

  const heightAt = (x, z) => {
    let h = rawHeight(x, z);
    for (const p of EXPLANADAS) {
      const k = smooth((p.r1 - rectDist(x, z, p)) / (p.r1 - p.r0));
      h += (p.y - h) * k;
    }
    return h;
  };

  const slopeAt = (x, z) =>
    Math.hypot(heightAt(x + 0.005, z) - heightAt(x - 0.005, z), heightAt(x, z + 0.005) - heightAt(x, z - 0.005)) / 0.010;

  const K = 114, S = 276;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = heightAt(x, z);
      const y = h < Y_BAY ? Y_BAY + (fbm(x * 44, z * 44) - 0.5) * 0.0012 : h;
      row.push({ v: new THREE.Vector3(x, y, z), h });
    }
    ringPts.push(row);
  }
  for (const p of ringPts[K]) if (p.h < Y_BAY) p.v.y = Y_BAY;

  const _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _nrm = new THREE.Vector3();
  function terrainColor(a, b, c) {
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    _e1.subVectors(b.v, a.v); _e2.subVectors(c.v, a.v); _nrm.crossVectors(_e1, _e2).normalize();
    const slope = 1 - Math.abs(_nrm.y);

    if (h < Y_BAY && hMax < Y_BAY + 0.0035 && slope < 0.22) {
      const depth = smooth((Y_BAY - h) / 0.014);
      if (h > Y_BAY - 0.0022) return jitter(0x74b8c8, 0.04);
      tmpColor.setHex(0x1f6e8c).lerp(new THREE.Color(0x0c3d59), depth);
      const k = 1 + (rng() - 0.5) * 0.06;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }

    const zb = bayShoreZ(cx);
    if (cz > zb - 0.025 && cz < zb + 0.015 && cx > -0.14 && h < 0.018 && slope < 0.30) {
      if (cz < zb - 0.010) {
        const wave = Math.sin(cx * 210 + Math.sin(cz * 160) * 1.3);
        return jitter(wave > 0.3 ? 0xc2bdb2 : 0xebe5d9, 0.028);
      }
      return jitter(0xe3d1a8, 0.045);
    }

    if (rectDist(cx, cz, EXPLANADAS[0]) < 0.004 || rectDist(cx, cz, EXPLANADAS[1]) < 0.003) {
      return calcadaPortuguesaColor({ x: cx, y: h, z: cz }, { x: cx, y: h, z: cz }, { x: cx, y: h, z: cz });
    }
    if (rectDist(cx, cz, EXPLANADAS[2]) < 0.004) {
      return jitter(0xb5a895, 0.03);
    }

    // Domos de granito del Pão de Açúcar (tono granito cálido/gris monolítico)
    const nearPao = Math.hypot(cx - 0.168, cz - 0.196) < 0.034 || Math.hypot(cx - 0.112, cz - 0.190) < 0.034;
    if (nearPao && h > 0.008) {
      if (slope < 0.26 && h < 0.032) return jitter(0x2c5c2a, 0.06);
      const gr = Math.floor(h * 140 + fbm(cx * 25, cz * 25) * 2) & 1;
      return jitter(gr ? 0x626569 : 0x52555a, 0.045);
    }

    if (slope > 0.32) {
      const band = Math.floor(h * 120 + fbm(cx * 30, cz * 30) * 3) & 3;
      const pal = [0x4c4f53, 0x3d4044, 0x5c5f63, 0x313438];
      return jitter(pal[band], 0.065);
    }

    const n = fbm(cx * 26 + 5, cz * 26 + 8);
    if (h > 0.09) return jitter(n > 0.5 ? 0x2d5e2b : 0x244c23, 0.07);
    return jitter(n > 0.52 ? 0x336b2f : (n > 0.35 ? 0x295627 : 0x3f7836), 0.07);
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

  // Zócalo vertical hermético + fondo plano
  const rim = ringPts[K];
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  const radial = new THREE.Vector3();
  for (let s = 0; s < S; s++) {
    const ra = rim[s], rb = rim[(s + 1) % S];
    const a = ra.v, b = rb.v;
    const isWater = (ra.h + rb.h) * 0.5 < Y_BAY;
    const a2 = new THREE.Vector3(CX + (a.x - CX) * 0.975, FLOOR, CZ + (a.z - CZ) * 0.975);
    const b2 = new THREE.Vector3(CX + (b.x - CX) * 0.975, FLOOR, CZ + (b.z - CZ) * 0.975);
    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    const wallHex = isWater ? 0x0e3d56 : ((s & 1) ? 0x2c2f34 : 0x24272b);
    addTri(a, b, a2, jitter(wallHex, 0.04), radial);
    addTri(b, b2, a2, jitter(isWater ? 0x0a2c3f : 0x202226, 0.04), radial);
    const rBot = Math.hypot(a2.x - CX, a2.z - CZ);
    const botRingHex = (Math.floor(rBot * 45) + (s >> 3)) & 1 ? 0x2e2c29 : 0x242220;
    addTri(a2, b2, centerBottom, jitter(botRingHex, 0.04), DOWN);
  }

  // Escarpes y espolones de granito del Corcovado incrustados en las laderas rocosas
  for (let i = 0, tries = 0; i < 125 && tries < 5000; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = 0.055 + rng() * rimRadius(ang) * 0.78;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (rectDist(x, z, EXPLANADAS[0]) < 0.015) continue;
    if (rectDist(x, z, EXPLANADAS[1]) < 0.015) continue;
    if (rectDist(x, z, EXPLANADAS[2]) < 0.018) continue;
    if (Math.hypot(x - 0.168, z - 0.196) < 0.040 || Math.hypot(x - 0.112, z - 0.190) < 0.036) continue;
    const h = heightAt(x, z), sl = slopeAt(x, z);
    if (sl < 0.40 || h < 0.018 || h > 0.135) continue;
    const rad = 0.006 + rng() * 0.008, bh = 0.018 + rng() * 0.024;
    addGeo(new THREE.CylinderGeometry(rad * 0.55, rad * 1.15, bh, 7, 4), 0x484b4f, {
      p: [x, Math.max(FLOOR + bh * 0.55, h - 0.006), z],
      r: [(rng() - 0.5) * 0.30, rng() * Math.PI * 2, (rng() - 0.5) * 0.30],
      s: [1.1 + rng() * 0.35, 1, 0.85 + rng() * 0.4],
      colorFn: corcovadoRockColor,
    });
    i++;
  }

  // =====================================================================
  // 4. PEDESTAL OCTOGONAL ART DÉCO Y CAPILLA DE NOSSA SENHORA APARECIDA
  // =====================================================================
  const Y_PED_BASE = Y_SUMMIT;
  const Y_PED_TOP = 0.214;
  {
    const rotOct = Math.PI / 8;
    addGeo(new THREE.CylinderGeometry(0.039, 0.042, 0.016, 8, 2), 0x9b968c, {
      p: [SX, Y_PED_BASE - 0.002, SZ], r: [0, rotOct, 0], colorFn: pedestalGraniteColor(Y_PED_BASE),
    });
    addGeo(new THREE.CylinderGeometry(0.0345, 0.037, 0.006, 8, 1), 0xa8a399, {
      p: [SX, Y_PED_BASE + 0.008, SZ], r: [0, rotOct, 0], colorFn: pedestalGraniteColor(Y_PED_BASE),
    });
    addGeo(new THREE.CylinderGeometry(0.0305, 0.0325, 0.005, 8, 1), 0xb3aea4, {
      p: [SX, Y_PED_BASE + 0.0125, SZ], r: [0, rotOct, 0], colorFn: pedestalGraniteColor(Y_PED_BASE),
    });

    // Fuste principal del pedestal octogonal ataludado con hiladas de granito
    addGeo(new THREE.CylinderGeometry(0.0255, 0.0295, 0.046, 8, 10), 0xa8a399, {
      p: [SX, 0.185, SZ], r: [0, rotOct, 0], colorFn: pedestalGraniteColor(Y_PED_BASE, 1.3),
    });

    for (const [my, mr, mh] of [[0.174, 0.0292, 0.0026], [0.194, 0.0276, 0.0024], [0.206, 0.0288, 0.0036], [0.210, 0.0302, 0.0042]]) {
      addGeo(new THREE.CylinderGeometry(mr, mr * 0.98, mh, 8, 2), 0xb8b3a8, {
        p: [SX, my, SZ], r: [0, rotOct, 0], colorFn: pedestalGraniteColor(Y_PED_BASE, 1.4),
      });
    }
    addGeo(new THREE.CylinderGeometry(0.0265, 0.0285, 0.0045, 8, 2), 0xc2bdb2, {
      p: [SX, 0.2122, SZ], r: [0, rotOct, 0], colorFn: pedestalGraniteColor(Y_PED_BASE, 1.5),
    });

    // 4 machones/contrafuertes cardinales Art Déco + placas de bronce + 8 reflectores apoyados en cornisa/base
    for (let d = 0; d < 4; d++) {
      const ang = (d / 4) * Math.PI * 2;
      const nx = Math.sin(ang), nz = Math.cos(ang);
      addGeo(new THREE.BoxGeometry(0.011, 0.044, 0.0075, 3, 6, 2), 0x9b968c, {
        p: [SX + nx * 0.0275, 0.184, SZ + nz * 0.0275], r: [0, ang, 0], colorFn: pedestalGraniteColor(Y_PED_BASE),
      });
      addGeo(new THREE.BoxGeometry(0.0078, 0.032, 0.0095, 2, 5, 2), 0xb3aea4, {
        p: [SX + nx * 0.0295, 0.178, SZ + nz * 0.0295], r: [0, ang, 0], colorFn: pedestalGraniteColor(Y_PED_BASE),
      });
      if (d !== 2) {
        addGeo(new THREE.BoxGeometry(0.010, 0.0078, 0.0018, 2, 2, 1), 0x6e5a38, {
          p: [SX + nx * 0.0338, 0.178, SZ + nz * 0.0338], r: [0, ang, 0], colorFn: bronzeColor,
        });
      }
      // Reflector en la base y foco en la cornisa superior del pedestal apuntando a la estatua
      const cAng = ang + Math.PI / 4;
      const lx = SX + Math.sin(cAng) * 0.0355, lz = SZ + Math.cos(cAng) * 0.0355;
      addGeo(new THREE.BoxGeometry(0.0038, 0.005, 0.0038), 0x45484c, { p: [lx, Y_PED_BASE + 0.006, lz] });
      addGeo(new THREE.SphereGeometry(0.0022, 6, 5), 0xfff0b8, { p: [lx, Y_PED_BASE + 0.0092, lz] });
      features.push({ type: 'city', pos: [lx, Y_PED_BASE + 0.0105, lz], size: 0.017 });

      const ux = SX + Math.sin(cAng) * 0.027, uz = SZ + Math.cos(cAng) * 0.027;
      addGeo(new THREE.BoxGeometry(0.0028, 0.0032, 0.0028), 0x3b3d40, { p: [ux, Y_PED_TOP + 0.001, uz] });
      addGeo(new THREE.SphereGeometry(0.0017, 6, 5), 0xfff3c8, { p: [ux, Y_PED_TOP + 0.0030, uz] });
      features.push({ type: 'city', pos: [ux, Y_PED_TOP + 0.0038, uz], size: 0.015 });
    }
    for (let m = 0; m < 16; m++) {
      const ang = (m / 16) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0025, 0.0035, 0.0038), 0x8e8980, {
        p: [SX + Math.sin(ang) * 0.0288, 0.205, SZ + Math.cos(ang) * 0.0288], r: [0, ang, 0],
      });
    }

    // Capilla de Nossa Senhora Aparecida integrada en la cara trasera (-Z) del pedestal
    const czCap = SZ - 0.0305;
    addGeo(new THREE.BoxGeometry(0.025, 0.024, 0.013, 4, 4, 2), 0xa8a399, {
      p: [SX, Y_PED_BASE + 0.011, czCap], colorFn: pedestalGraniteColor(Y_PED_BASE),
    });
    addGeo(new THREE.BoxGeometry(0.017, 0.016, 0.015, 3, 3, 1), 0x8e8980, {
      p: [SX, Y_PED_BASE + 0.010, czCap - 0.001], colorFn: pedestalGraniteColor(Y_PED_BASE),
    });
    addGeo(new THREE.BoxGeometry(0.010, 0.013, 0.0028, 2, 3, 1), 0x56462b, {
      p: [SX, Y_PED_BASE + 0.0085, czCap - 0.0078], colorFn: bronzeColor,
    });
    addGeo(new THREE.BoxGeometry(0.0016, 0.008, 0.0014), 0xd8b45c, {
      p: [SX, Y_PED_BASE + 0.009, czCap - 0.0092],
    });
    addGeo(new THREE.BoxGeometry(0.0052, 0.0015, 0.0014), 0xd8b45c, {
      p: [SX, Y_PED_BASE + 0.0105, czCap - 0.0092],
    });
    for (const side of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.0032, 0.009, 0.0022), 0xffd278, {
        p: [SX + side * 0.0082, Y_PED_BASE + 0.011, czCap - 0.0070],
      });
      features.push({ type: 'window', pos: [SX + side * 0.0082, Y_PED_BASE + 0.011, czCap - 0.0086], yaw: Math.PI, w: 0.0030, h: 0.0084 });
    }
  }

  // =====================================================================
  // 5. LA ESTATUA DEL CRISTO REDENTOR (~182.000 TRIÁNGULOS DE DETALLE)
  // Proporciones fieles a Paul Landowski: ~0.264 altura x ~0.262 envergadura
  // =====================================================================
  const Y_STATUE_BASE = 0.213; // empotrado 1 mm dentro de Y_PED_TOP = 0.214

  // --- 5.1: Plinto Escultórico de Esteatita y Sandalias con 5 Dedos ---
  {
    addGeo(new THREE.CylinderGeometry(0.025, 0.0265, 0.008, 24, 3), 0xedeae2, {
      p: [SX, Y_STATUE_BASE + 0.0035, SZ], colorFn: soapColorFn,
    });
    addGeo(new THREE.CylinderGeometry(0.023, 0.025, 0.0045, 24, 2), 0xe4e0d6, {
      p: [SX, Y_STATUE_BASE + 0.0085, SZ], colorFn: soapColorFn,
    });

    for (const side of [-1, 1]) {
      const fx = SX + side * 0.0102;
      const fz = SZ + 0.0195;
      const fy = Y_STATUE_BASE + 0.0095;
      addGeo(new THREE.BoxGeometry(0.0084, 0.0022, 0.012, 2, 1, 3), 0xd8d3c8, {
        p: [fx, fy + 0.0008, fz], r: [0, side * 0.08, 0], colorFn: soapColorFn,
      });
      addGeo(new THREE.SphereGeometry(0.0042, 12, 8), 0xedeae2, {
        p: [fx, fy + 0.0028, fz - 0.001], s: [0.95, 0.72, 1.35], colorFn: soapColorFn,
      });
      addRod([fx - 0.0030, fy + 0.0035, fz - 0.002], [fx, fy + 0.0044, fz + 0.0038], 0.00075, 0xd8d3c8, 6);
      addRod([fx + 0.0030, fy + 0.0035, fz - 0.002], [fx, fy + 0.0044, fz + 0.0038], 0.00075, 0xd8d3c8, 6);
      for (let toe = 0; toe < 5; toe++) {
        const tx = fx + side * ((2 - toe) * 0.00155);
        const tz = fz + 0.0052 - toe * 0.00038;
        const tr = 0.00090 - toe * 0.00009;
        addGeo(new THREE.SphereGeometry(tr, 8, 6), 0xf2efe7, {
          p: [tx, fy + 0.0022, tz], s: [0.85, 0.75, 1.3], colorFn: soapColorFn,
        });
      }
    }
  }

  // --- 5.2: Túnica Columnar, Torso Anatómico, Manto Drapeado y Cuello en V (~92.160 tris) ---
  const Y_TUNIC_BOT = Y_STATUE_BASE + 0.008; // 0.221
  const Y_TUNIC_TOP = 0.431;                 // línea de hombros y escote en V
  {
    const NU = 240; // anillos verticales
    const NS = 192; // segmentos angulares -> 240 * 192 * 2 = 92.160 triángulos + tapas
    const rings = [];
    const centers = [];
    const ringShade = [];

    for (let k = 0; k <= NU; k++) {
      const u = k / NU;
      const y = Y_TUNIC_BOT + (Y_TUNIC_TOP - Y_TUNIC_BOT) * u;
      const zShift = SZ + 0.0020 * smooth((u - 0.45) / 0.55);

      // Perfil base monumental (más cuerpo y anchura de hombros que antes: estilo Landowski)
      let rx = 0.0238 - 0.0022 * u;
      let rz = 0.0192 - 0.0024 * u;

      if (u < 0.08) {
        const flare = smooth(1 - u / 0.08);
        rx += 0.0026 * flare;
        rz += 0.0028 * flare;
      }
      // Ligero entalle columnar en cintura y fuerte expansión torácica hacia hombros (rx ~ 0.0365)
      const waist = Math.exp(-Math.pow((u - 0.46) / 0.22, 2));
      rx -= 0.0018 * waist;
      rz -= 0.0012 * waist;

      const chestExpand = smooth((u - 0.54) / 0.36) * (1 - 0.24 * smooth((u - 0.93) / 0.07));
      rx += 0.0155 * chestExpand;
      rz += 0.0034 * chestExpand;

      if (u > 0.93) {
        const neckTaper = smooth((u - 0.93) / 0.07);
        rx *= (1 - 0.66 * neckTaper);
        rz *= (1 - 0.52 * neckTaper);
      }

      const ring = [];
      const shades = [];
      for (let s = 0; s < NS; s++) {
        const th = (s / NS) * Math.PI * 2;
        const ct = Math.cos(th); // +1 en +X (izquierda estatua), -1 en -X (derecha estatua)
        const st = Math.sin(th); // +1 en +Z (frente), -1 en -Z (espalda)

        let rLocal = (rx * rz) / Math.hypot(rz * ct, rx * st);

        // 1) Escote en V doble esculpido del cuello (u > 0.83, st > 0)
        if (u > 0.82 && st > 0) {
          const vEdge = Math.abs(ct) / (0.34 * smooth((u - 0.82) / 0.16) + 0.04);
          const vInner = Math.max(0, 1 - vEdge) * st;
          const vCollar = Math.exp(-Math.pow((vEdge - 1.0) / 0.22, 2)) * st * smooth((u - 0.83) / 0.08);
          rLocal -= 0.0022 * vInner;
          rLocal += 0.0012 * vCollar;
        }

        // 2) Acanaladuras verticales Art Déco biseladas (14 pliegues principales + microestrías)
        const foldPhase = th * 14 + 0.14 * Math.sin(u * 4.2 + th * 2);
        const foldAmp = (0.00145 * (1 - 0.42 * u) + 0.0005 * chestExpand) * (0.75 + 0.25 * Math.abs(st));
        const foldWave = Math.cos(foldPhase);
        const sharpFold = Math.sign(foldWave) * Math.pow(Math.abs(foldWave), 0.72);
        rLocal += foldAmp * sharpFold;

        // 3) Paños laterales en cascada bajo los brazos (u = 0.22..0.90, |ct| > 0.62)
        const underArmMask = smooth((u - 0.16) / 0.24) * (1 - smooth((u - 0.88) / 0.12));
        const sideMask = Math.pow(Math.abs(ct), 2.8);
        const cascadePleats = Math.cos(th * 26);
        rLocal += (0.0046 + 0.0016 * (0.5 + 0.5 * cascadePleats)) * underArmMask * sideMask;

        // 4) El Manto Escultórico Diagonal (sobre hombro izquierdo +X cruzando pecho y espalda hacia costado derecho)
        const uMantleCenter = st >= 0
          ? (0.68 + 0.20 * ct - 0.05 * (1 - ct * ct))
          : (0.63 + 0.24 * ct - 0.06 * (1 - ct * ct));
        const dMantle = u - uMantleCenter;
        const mantleBand = Math.exp(-Math.pow(dMantle / 0.15, 2));
        const mantleRim = Math.exp(-Math.pow((dMantle + 0.10) / 0.028, 2));
        const diagFolds = Math.cos((u - 0.24 * ct) * 74);
        const cloakRelief = 0.0028 * mantleBand + 0.0018 * mantleRim + 0.00095 * mantleBand * diagFolds;
        const shoulderDrape = smooth((u - 0.72) / 0.20) * smooth((ct + 0.25) / 0.65) * 0.0020;
        const backDrape = smooth((-st - 0.1) / 0.7) * smooth((u - 0.20) / 0.58) * (0.0020 + 0.00085 * Math.cos(th * 18));
        rLocal += cloakRelief + shoulderDrape + backDrape;

        // 5) Relieve pectoral anatómico sutil
        if (st > 0.35 && u > 0.68 && u < 0.90) {
          const pec = Math.sin(((u - 0.68) / 0.22) * Math.PI) * smooth((st - 0.35) / 0.55);
          rLocal += 0.0020 * pec;
        }

        // 6) Orla inferior del dobladillo
        if (u < 0.028) {
          rLocal += 0.0011 * Math.sin((u / 0.028) * Math.PI);
        }

        // Oclusión ambiental en el fondo de las acanaladuras y bajo el borde del manto
        const valleyShadow = Math.exp(-Math.pow((dMantle + 0.125) / 0.018, 2)) * 0.065;
        const grooveShade = 0.935 + 0.075 * (sharpFold * 0.5 + 0.5) + 0.025 * mantleRim - valleyShadow;

        ring.push(new THREE.Vector3(SX + rLocal * ct, y, zShift + rLocal * st));
        shades.push(grooveShade);
      }
      rings.push(ring);
      centers.push(new THREE.Vector3(SX, y, zShift));
      ringShade.push(shades);
    }

    addLoftedMesh(rings, centers, (k, s, va, vb, vc) => {
      return pedraSabaoColor(ringShade[k][s])(va, vb, vc);
    }, { capStart: true, capEnd: true, startWant: DOWN, endWant: UP });

    // Sagrado Corazón de Jesús en altorrelieve nítido en el pecho (+Z)
    const hx = SX, hy = 0.386, hz = SZ + 0.0235;
    // Surco ovalado de sombra en torno al corazón
    addGeo(new THREE.TorusGeometry(0.0084, 0.0012, 8, 24), 0xcbc5b7, {
      p: [hx, hy, hz - 0.0008], s: [0.95, 1.15, 0.6], colorFn: pedraSabaoColor(0.88),
    });
    addGeo(new THREE.SphereGeometry(0.0080, 26, 22), 0xf4f1e9, {
      p: [hx, hy, hz], s: [0.92, 1.16, 0.56], colorFn: pedraSabaoColor(1.04),
    });
    addGeo(new THREE.ConeGeometry(0.0066, 0.0108, 18, 4), 0xedeae2, {
      p: [hx, hy - 0.0060, hz - 0.0002], r: [Math.PI, 0, 0], s: [0.92, 1, 0.54], colorFn: pedraSabaoColor(1.02),
    });
    // Corona horizontal de espinas trenzada
    addGeo(new THREE.TorusGeometry(0.0064, 0.0013, 8, 24), 0xcac3b4, {
      p: [hx, hy + 0.0018, hz + 0.0007], r: [Math.PI / 2 - 0.12, 0, 0], s: [1.06, 1, 0.72], colorFn: pedraSabaoColor(0.90),
    });
    // Flama esculpida y cruz Art Déco superior
    addGeo(new THREE.ConeGeometry(0.0026, 0.0060, 10), 0xf7f4ec, {
      p: [hx, hy + 0.0100, hz + 0.0005], colorFn: pedraSabaoColor(1.05),
    });
    addGeo(new THREE.BoxGeometry(0.0016, 0.0076, 0.0018), 0xf7f4ec, {
      p: [hx, hy + 0.0148, hz + 0.0005], colorFn: pedraSabaoColor(1.05),
    });
    addGeo(new THREE.BoxGeometry(0.0052, 0.0015, 0.0018), 0xf7f4ec, {
      p: [hx, hy + 0.0162, hz + 0.0005], colorFn: pedraSabaoColor(1.05),
    });
    features.push({ type: 'sparkle', pos: [hx, hy + 0.004, hz + 0.0048], size: 0.010 });
  }

  // --- 5.3: Brazos Extendidos y Mangas Trapezoidales Art Déco (~42.240 tris) ---
  // Envergadura total con manos: hasta ±0.132 (~0.264 de ancho, igual que la altura ~0.264!)
  const Y_ARM_AXIS = 0.415;
  const Z_ARM_AXIS = SZ + 0.0015;
  const X_WRIST = 0.109;
  for (const side of [-1, 1]) {
    const NX = 110; // 2 * 110 * 96 * 2 = 42.240 triángulos
    const NS = 96;
    const rings = [];
    const centers = [];
    const ringShade = [];
    const xStart = side * 0.025;
    const xEnd = side * X_WRIST;

    for (let k = 0; k <= NX; k++) {
      const t = k / NX;
      const x = xStart + (xEnd - xStart) * t;
      const yTop = Y_ARM_AXIS + 0.0092 * (1 - 0.40 * smooth(t)) + 0.0010 * Math.sin(t * Math.PI);
      // Corte trapezoidal recto característico de Landowski en la parte inferior de la manga
      const drapeProfile = Math.pow(1 - t, 0.65) * (1 + 0.14 * Math.sin(t * Math.PI * 1.15));
      const yBot = Y_ARM_AXIS - 0.011 - 0.048 * drapeProfile;
      const cuffTuck = t > 0.94 ? smooth((t - 0.94) / 0.06) * 0.0045 : 0;
      const yCenter = 0.5 * (yTop + (yBot + cuffTuck));
      const halfH = Math.max(0.0072, 0.5 * (yTop - (yBot + cuffTuck)));
      const halfZ = 0.0138 * (1 - 0.46 * t) + 0.0024 * Math.sin(t * Math.PI);

      const ring = [];
      const shades = [];
      for (let s = 0; s < NS; s++) {
        const th = (s / NS) * Math.PI * 2;
        const ct = Math.cos(th); // +1 arriba (+Y), -1 abajo (-Y)
        const st = Math.sin(th); // +1 frente (+Z), -1 espalda (-Z)

        const yOff = halfH * ct;
        const zPinch = ct >= 0 ? (0.86 + 0.14 * Math.sqrt(1 - ct * ct)) : (0.56 + 0.44 * (1 + ct));
        let zOff = halfZ * zPinch * st;

        // 18 pliegues verticales acanalados cayendo desde el brazo por la manga trapezoidal
        const nPleats = 18;
        const pleatPhase = t * nPleats * Math.PI * 2 + 0.35 * ct;
        const pleatMask = smooth((0.35 - ct) / 1.15) * (1 - 0.38 * smooth((t - 0.86) / 0.14));
        const pleatWave = Math.cos(pleatPhase);
        const sharpPleat = Math.sign(pleatWave) * Math.pow(Math.abs(pleatWave), 0.78);
        zOff += st * 0.0028 * pleatMask * sharpPleat;

        // Reborde biselado de la bocamanga
        const cuffBead = t > 0.92 ? Math.sin(((t - 0.92) / 0.08) * Math.PI) * 0.0016 : 0;
        ring.push(new THREE.Vector3(x, yCenter + yOff + ct * cuffBead, Z_ARM_AXIS + zOff + st * cuffBead));
        shades.push(0.93 + 0.075 * (sharpPleat * 0.5 + 0.5) * pleatMask);
      }
      rings.push(ring);
      centers.push(new THREE.Vector3(x, yCenter, Z_ARM_AXIS));
      ringShade.push(shades);
    }

    addLoftedMesh(rings, centers, (k, s, va, vb, vc) => {
      return pedraSabaoColor(ringShade[k][s])(va, vb, vc);
    }, { capStart: true, capEnd: true, startWant: new THREE.Vector3(-side, 0, 0), endWant: new THREE.Vector3(side, 0, 0) });

    // Anillo sombreado en el interior del puño para dar profundidad a la salida de la muñeca
    addGeo(new THREE.CylinderGeometry(0.0074, 0.0074, 0.0036, 18), 0x8f8a7f, {
      p: [xEnd - side * 0.001, Y_ARM_AXIS - 0.0015, Z_ARM_AXIS],
      r: [0, 0, side * -Math.PI / 2],
      s: [1.15, 1, 0.88],
      colorFn: pedraSabaoColor(0.76),
    });
  }

  // --- 5.4: Manos Anatómicas Expresivas (Muñeca, Palma, Estigma y 5 Dedos con Uñas) (~10.500 tris) ---
  const addSculptedFinger = (basePos, dirVec, palmNormal, length, radiusBase, segU, segS, has3Phalanges = true) => {
    const ax = dirVec.clone().normalize();
    const pn = palmNormal.clone().normalize();
    const lat = new THREE.Vector3().crossVectors(ax, pn).normalize();
    const rings = [];
    const centers = [];

    const pCurr = basePos.clone();
    const stepLen = length / segU;
    for (let k = 0; k <= segU; k++) {
      const t = k / segU;
      const curl = 0.24 * t * t;
      const dLocal = ax.clone().multiplyScalar(Math.cos(curl)).addScaledVector(pn, Math.sin(curl)).normalize();
      if (k > 0) pCurr.addScaledVector(dLocal, stepLen);

      const joints = has3Phalanges
        ? 0.10 * Math.exp(-Math.pow((t - 0.36) / 0.07, 2)) + 0.09 * Math.exp(-Math.pow((t - 0.68) / 0.07, 2))
        : 0.11 * Math.exp(-Math.pow((t - 0.48) / 0.09, 2));
      const tipTaper = t > 0.82 ? Math.sqrt(Math.max(0.08, 1 - Math.pow((t - 0.82) / 0.18, 2))) : 1.0;
      const r = radiusBase * (1 - 0.22 * t + joints) * tipTaper;

      const ring = [];
      for (let s = 0; s < segS; s++) {
        const th = (s / segS) * Math.PI * 2;
        const ct = Math.cos(th);
        const st = Math.sin(th);
        let rLat = r * 0.94;
        let rPal = r * 0.86;
        if (t > 0.77 && t < 0.96 && st < -0.25) {
          rPal += 0.00030 * Math.sin(((t - 0.77) / 0.19) * Math.PI);
        }
        ring.push(pCurr.clone().addScaledVector(lat, rLat * ct).addScaledVector(pn, rPal * st));
      }
      rings.push(ring);
      centers.push(pCurr.clone());
    }
    const endTip = pCurr.clone().addScaledVector(ax, radiusBase * 0.25);
    addLoftedMesh(rings, centers, (k, s, va, vb, vc) => pedraSabaoColor(1.01)(va, vb, vc), {
      capStart: true, capEnd: true, startWant: ax.clone().negate(), endWant: endTip.sub(pCurr).normalize(),
    });
  };

  for (const side of [-1, 1]) {
    const xWrist0 = side * (X_WRIST - 0.0045);
    const xWrist1 = side * (X_WRIST + 0.0045);
    const yWrist = Y_ARM_AXIS - 0.0015;
    const zWrist = Z_ARM_AXIS;

    addGeo(new THREE.CylinderGeometry(0.0056, 0.0066, 0.011, 16, 4), 0xedeae2, {
      p: [(xWrist0 + xWrist1) * 0.5, yWrist, zWrist],
      r: [0, 0, side * -Math.PI / 2],
      s: [1, 1, 0.76],
      colorFn: soapColorFn,
    });

    const NU_P = 28, NS_P = 28;
    const pRings = [], pCenters = [];
    const palmLen = 0.0128;
    for (let k = 0; k <= NU_P; k++) {
      const t = k / NU_P;
      const px = xWrist1 + side * (palmLen * t);
      const halfY = 0.0058 + 0.0028 * smooth(t / 0.85) - 0.0009 * smooth((t - 0.85) / 0.15);
      const halfZ = 0.0038 * (1 - 0.20 * t);
      const yC = yWrist + 0.0004 * t;
      const zC = zWrist + 0.0005 * Math.sin(t * Math.PI);

      const ring = [];
      for (let s = 0; s < NS_P; s++) {
        const th = (s / NS_P) * Math.PI * 2;
        const ct = Math.cos(th);
        const st = Math.sin(th);
        let py = yC + halfY * ct;
        let pz = zC + halfZ * st;
        if (st > 0) {
          const thenar = Math.exp(-Math.pow((t - 0.35) / 0.28, 2)) * smooth((ct - 0.05) / 0.7);
          pz += 0.0016 * thenar * st;
          const hollow = Math.exp(-Math.pow((t - 0.52) / 0.26, 2)) * Math.exp(-Math.pow(ct / 0.45, 2));
          pz -= 0.00095 * hollow * st;
        }
        if (st < 0) {
          pz -= 0.00035 * Math.cos(ct * Math.PI * 3.5) * Math.sin(t * Math.PI);
        }
        ring.push(new THREE.Vector3(px, py, pz));
      }
      pRings.push(ring);
      pCenters.push(new THREE.Vector3(px, yC, zC));
    }
    addLoftedMesh(pRings, pCenters, (k, s, va, vb, vc) => pedraSabaoColor(1.0)(va, vb, vc), {
      capStart: true, capEnd: true, startWant: new THREE.Vector3(-side, 0, 0), endWant: new THREE.Vector3(side, 0, 0),
    });

    // Estigma esculpido en la palma
    addGeo(new THREE.SphereGeometry(0.0013, 8, 6), 0xc2bcb0, {
      p: [xWrist1 + side * palmLen * 0.52, yWrist, zWrist + 0.0032],
      s: [1.1, 0.9, 0.45],
      colorFn: pedraSabaoColor(0.86),
    });

    const palmNrm = new THREE.Vector3(0, 0, 1);
    const xKnuckle = xWrist1 + side * (palmLen - 0.0014);
    const fingersSpec = [
      { dy: +0.0058, dz: +0.0002, angY: +0.13, len: 0.0110, r: 0.00158 },
      { dy: +0.0020, dz: +0.0004, angY: +0.03, len: 0.0124, r: 0.00166 },
      { dy: -0.0019, dz: +0.0002, angY: -0.04, len: 0.0112, r: 0.00155 },
      { dy: -0.0054, dz: -0.0001, angY: -0.14, len: 0.0090, r: 0.00136 },
    ];
    for (const f of fingersSpec) {
      const fBase = new THREE.Vector3(xKnuckle, yWrist + f.dy, zWrist + f.dz);
      const fDir = new THREE.Vector3(side * Math.cos(f.angY), Math.sin(f.angY), 0.14).normalize();
      addSculptedFinger(fBase, fDir, palmNrm, f.len, f.r, 22, 16, true);
    }
    const thumbBase = new THREE.Vector3(xWrist1 + side * 0.0040, yWrist + 0.0054, zWrist + 0.0015);
    const thumbDir = new THREE.Vector3(side * 0.62, 0.72, 0.32).normalize();
    addSculptedFinger(thumbBase, thumbDir, palmNrm, 0.0098, 0.00182, 20, 16, false);
  }

  // --- 5.5: Cuello, Cabeza Proporcionada (1/6 estatua), Rostro de Gheorghe Leonida y Cabellera (~28.800 tris) ---
  {
    const Y_NECK_BASE = 0.422; // empotrado 9 mm dentro del escote en V
    const Z_NECK_BASE = SZ + 0.0020;
    const HEAD_H = 0.054;      // altura total cuello+cabeza => cima cabeza en ~0.476 (proporción ~1/6 monumental)
    const headPitch = 0.22;    // inclinación serena hacia +Z
    const cp = Math.cos(headPitch), sp = Math.sin(headPitch);
    const toWorldHead = (lx, ly, lz) => new THREE.Vector3(
      SX + lx,
      Y_NECK_BASE + ly * cp - lz * sp,
      Z_NECK_BASE + ly * sp + lz * cp,
    );

    const NU_H = 120; // 120 * 120 * 2 = 28.800 triángulos en cabeza y rostro!
    const NS_H = 120;
    const hRings = [];
    const hCenters = [];
    const hShades = [];

    for (let k = 0; k <= NU_H; k++) {
      const u = k / NU_H; // 0 = base cuello, 0.25 = mentón, 0.56 = ojos, 0.80 = frente alta, 1.0 = coronilla
      const ly = u * HEAD_H;

      let rxBase, rzBase, zCenterShift = 0;
      if (u < 0.23) {
        const t = u / 0.23;
        rxBase = 0.0080 - 0.0005 * Math.sin(t * Math.PI);
        rzBase = 0.0084 - 0.0004 * Math.sin(t * Math.PI);
      } else if (u < 0.78) {
        const t = (u - 0.23) / 0.55;
        const bulge = Math.sin(t * Math.PI * 0.88);
        rxBase = 0.0080 + 0.0044 * bulge;
        rzBase = 0.0084 + 0.0056 * bulge;
        zCenterShift = 0.0020 * Math.sin(t * Math.PI);
      } else {
        // Cúpula craneal redondeada y estilizada hasta la coronilla
        const t = (u - 0.78) / 0.22;
        const cap = Math.sqrt(Math.max(0.012, 1 - t * t));
        rxBase = 0.0114 * cap;
        rzBase = 0.0128 * cap;
        zCenterShift = 0.0010 * (1 - t);
      }

      const ring = [];
      const shades = [];
      for (let s = 0; s < NS_H; s++) {
        const th = (s / NS_H) * Math.PI * 2;
        const ct = Math.cos(th); // +1 izq (+X), -1 der (-X)
        const st = Math.sin(th); // +1 cara (+Z), -1 nuca (-Z)

        let r = (rxBase * rzBase) / Math.hypot(rzBase * ct, rxBase * st);
        let shade = 1.0;

        const isFaceFront = st > 0.25 && u >= 0.22 && u <= 0.85;

        // 1) Tendones del cuello
        if (u < 0.25 && st > 0) {
          const tendon = Math.exp(-Math.pow((Math.abs(ct) - 0.42 * (1 - u * 1.4)) / 0.15, 2));
          r += 0.00050 * tendon * (1 - u / 0.25);
        }

        // 2) Rostro Art Déco de Gheorghe Leonida
        if (isFaceFront) {
          const faceMask = smooth((st - 0.25) / 0.55);
          const absX = Math.abs(ct);

          // Mentón afilado y barba partida Art Déco (u = 0.22 .. 0.37)
          if (u >= 0.21 && u <= 0.38 && absX < 0.50) {
            const beardMask = Math.sin(((u - 0.21) / 0.17) * Math.PI) * smooth((0.50 - absX) / 0.20);
            const splitGroove = Math.exp(-Math.pow(absX / 0.070, 2));
            const beardRibs = Math.cos(ct * 44);
            r += (0.0030 - 0.0014 * splitGroove + 0.00048 * beardRibs) * beardMask * faceMask;
            shade -= 0.06 * splitGroove * beardMask + 0.025 * (0.5 - 0.5 * beardRibs) * beardMask;
          }

          // Labios y bigote en relieve (u = 0.36 .. 0.45)
          if (u >= 0.36 && u <= 0.45 && absX < 0.40) {
            const mouthH = Math.exp(-Math.pow((u - 0.405) / 0.020, 2));
            const mouthW = smooth((0.34 - absX) / 0.13);
            const lipLine = Math.exp(-Math.pow((u - 0.405) / 0.006, 2));
            r += (0.0012 * mouthH - 0.00095 * lipLine) * mouthW * faceMask;
            shade -= 0.055 * lipLine * mouthW * faceMask;
            const mustU = 0.428 - 0.055 * absX;
            const mustMask = Math.exp(-Math.pow((u - mustU) / 0.016, 2)) * smooth((absX - 0.04) / 0.11) * smooth((0.38 - absX) / 0.11);
            r += 0.00095 * mustMask * faceMask;
          }

          // Pómulos altos Art Déco
          const cheekMask = Math.exp(-Math.pow((u - 0.50) / 0.07, 2)) * Math.exp(-Math.pow((absX - 0.42) / 0.15, 2));
          r += 0.0011 * cheekMask * faceMask;

          // Nariz prismática recta y estilizada (u = 0.43 .. 0.62)
          if (u >= 0.43 && u <= 0.63 && absX < 0.20) {
            const uN = (u - 0.44) / 0.18;
            const noseProfile = Math.sin(Math.min(1, Math.max(0, uN)) * Math.PI * 0.72) * (1 - 0.42 * Math.pow(uN, 2));
            const bridge = smooth((0.13 - absX) / 0.08);
            const tip = Math.exp(-Math.pow((u - 0.46) / 0.026, 2)) * smooth((0.16 - absX) / 0.07);
            r += (0.0032 * noseProfile * bridge + 0.00085 * tip) * faceMask;
            shade += 0.03 * bridge * faceMask;
          }

          // Cuencas oculares sombreadas, ojos entornados y arcos superciliares (u = 0.52 .. 0.67)
          const eyeXDist = Math.abs(absX - 0.27);
          if (u >= 0.52 && u <= 0.68 && eyeXDist < 0.16) {
            const eyeWidthMask = smooth((0.15 - eyeXDist) / 0.065);
            const socket = Math.exp(-Math.pow((u - 0.585) / 0.040, 2)) * eyeWidthMask;
            r -= 0.0013 * socket * faceMask;
            shade -= 0.095 * socket * faceMask;
            const eyeball = Math.exp(-Math.pow((u - 0.582) / 0.016, 2)) * smooth((0.095 - eyeXDist) / 0.045);
            r += 0.0010 * eyeball * faceMask;
            shade += 0.035 * eyeball * faceMask;
            const brow = Math.exp(-Math.pow((u - 0.628 + 0.04 * eyeXDist) / 0.017, 2)) * eyeWidthMask;
            r += 0.0014 * brow * faceMask;
          }

          // Frente despejada y noble
          if (u >= 0.65 && u <= 0.78 && absX < 0.50) {
            const foreMask = Math.sin(((u - 0.65) / 0.13) * Math.PI) * smooth((0.50 - absX) / 0.18);
            r += 0.0008 * foreMask * faceMask;
          }
        }

        // 3) Cabellera larga Art Déco partida al medio con mechones tallados (suave en frente, volumétrica en sienes y nuca)
        const hairLineFront = 0.77 + 0.045 * Math.cos(ct * Math.PI * 1.15);
        const inCrown = smooth((u - hairLineFront) / 0.13);
        const inSidesAndBack = smooth((0.46 - st) / 0.36) * smooth((u - 0.04) / 0.14);
        const hairMask = Math.max(inCrown, inSidesAndBack);
        if (hairMask > 0.01) {
          const centerPart = Math.exp(-Math.pow(ct / 0.08, 2)) * smooth((u - 0.74) / 0.15);
          const locks = Math.cos(th * 22 + Math.sin(u * 14) * 0.85);
          const sharpLocks = Math.sign(locks) * Math.pow(Math.abs(locks), 0.8);
          // Menos espesor en la frente/coronilla alta (u > 0.78), más caída volumétrica detrás de las sienes y nuca
          const backVol = 0.45 + 0.65 * smooth((0.35 - st) / 0.75);
          r += (0.0011 + 0.00075 * sharpLocks - 0.0008 * centerPart) * hairMask * backVol;
          shade -= 0.055 * (0.5 - 0.5 * sharpLocks) * hairMask + 0.035 * centerPart;
        }

        ring.push(toWorldHead(r * ct, ly, zCenterShift + r * st));
        shades.push(shade);
      }
      hRings.push(ring);
      hCenters.push(toWorldHead(0, ly, zCenterShift));
      hShades.push(shades);
    }

    const headUpDir = toWorldHead(0, HEAD_H + 0.01, 0).sub(toWorldHead(0, HEAD_H, 0)).normalize();
    const headDownDir = headUpDir.clone().negate();
    addLoftedMesh(hRings, hCenters, (k, s, va, vb, vc) => {
      return pedraSabaoColor(hShades[k][s])(va, vb, vc);
    }, { capStart: true, capEnd: true, startWant: headDownDir, endWant: headUpDir });
  }

  // =====================================================================
  // 6. MIRADOR PRINCIPAL, TERRAZA INTERMEDIA, ESCALINATAS Y ASCENSORES
  // =====================================================================
  {
    const nArc = 26;
    const rx = 0.046, rz = 0.048;
    let prevPt = null;
    for (let i = 0; i <= nArc; i++) {
      const ang = (i / nArc) * Math.PI * 2;
      const px = SX + Math.cos(ang) * rx;
      const pz = SZ + 0.004 + Math.sin(ang) * rz;
      const isGap = ang > 0.52 && ang < 1.02;
      if (prevPt && !isGap) {
        addBeam(prevPt[0], Y_SUMMIT + 0.0022, prevPt[2], px, Y_SUMMIT + 0.0022, pz, 0.0036, 0.0068, pedestalGraniteColor(Y_SUMMIT), UP, 0.0003);
        addBeam(prevPt[0], Y_SUMMIT + 0.0062, prevPt[2], px, Y_SUMMIT + 0.0062, pz, 0.0042, 0.0016, 0xd4cfc5, UP, 0.0003);
      }
      if (!isGap && i % 2 === 0 && i < nArc) {
        addGeo(new THREE.BoxGeometry(0.0044, 0.011, 0.0044), 0xb3aea4, {
          p: [px, Y_SUMMIT + 0.003, pz], colorFn: pedestalGraniteColor(Y_SUMMIT),
        });
        if (i % 4 === 0) {
          addGeo(new THREE.CylinderGeometry(0.0008, 0.0011, 0.009, 6), 0x3b3d40, { p: [px, Y_SUMMIT + 0.012, pz] });
          addGeo(new THREE.SphereGeometry(0.0016, 6, 5), 0xffe49c, { p: [px, Y_SUMMIT + 0.017, pz] });
          features.push({ type: 'city', pos: [px, Y_SUMMIT + 0.0175, pz], size: 0.0135 });
        }
      }
      prevPt = isGap ? null : [px, Y_SUMMIT, pz];
    }

    addGeo(new THREE.CylinderGeometry(0.0465, 0.050, 0.024, 26, 3), 0x8e8980, {
      p: [SX, Y_SUMMIT - 0.012, SZ + 0.004], s: [1, 1, 1.04], colorFn: pedestalGraniteColor(Y_SUMMIT - 0.02),
    });

    for (const bx of [-0.018, 0.016]) {
      const bz = SZ + 0.044;
      addGeo(new THREE.CylinderGeometry(0.0009, 0.0013, 0.010, 6), 0x3e444a, { p: [SX + bx, Y_SUMMIT + 0.004, bz] });
      addGeo(new THREE.BoxGeometry(0.0032, 0.0020, 0.0044), 0x525b63, { p: [SX + bx, Y_SUMMIT + 0.0095, bz + 0.0008], r: [0.22, 0, 0] });
    }
  }

  {
    const pTop = [0.026, Y_SUMMIT, 0.008];
    const pBot = [0.026, Y_MID, 0.036];
    const nSteps = 12;
    for (let i = 0; i < nSteps; i++) {
      const t = (i + 0.5) / nSteps;
      const sx = pTop[0] + (pBot[0] - pTop[0]) * t;
      const sy = pTop[1] + (pBot[1] - pTop[1]) * t;
      const sz = pTop[2] + (pBot[2] - pTop[2]) * t;
      addGeo(new THREE.BoxGeometry(0.014, 0.010, 0.0055), 0xb8b3a8, {
        p: [sx, sy - 0.003, sz], colorFn: pedestalGraniteColor(Y_MID),
      });
    }
    addGeo(new THREE.BoxGeometry(0.066, 0.026, 0.044, 6, 3, 4), 0x9b968c, {
      p: [0.022, Y_MID - 0.013, 0.045], r: [0, -0.25, 0], colorFn: pedestalGraniteColor(Y_MID - 0.02),
    });
    addGeo(new THREE.BoxGeometry(0.064, 0.0025, 0.042, 6, 1, 4), 0xeee9df, {
      p: [0.022, Y_MID + 0.0002, 0.045], r: [0, -0.25, 0], colorFn: calcadaPortuguesaColor,
    });

    const tx = 0.056, tz = 0.038;
    addGeo(new THREE.BoxGeometry(0.015, 0.058, 0.015, 3, 8, 3), 0x4b535c, {
      p: [tx, 0.093, tz], r: [0, -0.25, 0], amt: 0.04,
    });
    addGeo(new THREE.BoxGeometry(0.012, 0.044, 0.0165), 0x7cb8d0, {
      p: [tx, 0.096, tz], r: [0, -0.25, 0], amt: 0.03,
    });
    addGeo(new THREE.BoxGeometry(0.017, 0.0035, 0.017), 0xb3aea4, {
      p: [tx, Y_MID + 0.003, tz], r: [0, -0.25, 0],
    });
    features.push({ type: 'window', pos: [tx + 0.002, 0.102, tz + 0.009], yaw: -0.25, w: 0.009, h: 0.028 });

    // Pasarela peatonal con pilares hundidos hasta la roca entre la Estación y la Terraza Intermedia
    const nWalk = 14;
    for (let i = 0; i <= nWalk; i++) {
      const t = i / nWalk;
      const wx = -0.062 + (0.002 - (-0.062)) * t;
      const wz = 0.068 + (0.052 - 0.068) * t;
      const wy = Y_STATION + (Y_MID - Y_STATION) * t;
      const gH = Math.max(0.012, wy - heightAt(wx, wz) + 0.012);
      addGeo(new THREE.BoxGeometry(0.010, gH, 0.010), 0xa8a399, {
        p: [wx, wy - gH * 0.5, wz], r: [0, 0.25, 0], colorFn: pedestalGraniteColor(wy - gH),
      });
    }
  }

  // =====================================================================
  // 7. VIADUCTO DE PIEDRA, ESTACIÓN Y TREM DO CORCOVADO
  // =====================================================================
  {
    const stX = -0.084, stZ = 0.072, stY = Y_STATION;
    addGeo(new THREE.BoxGeometry(0.046, 0.016, 0.034, 4, 2, 3), 0x9b968c, {
      p: [stX, stY - 0.005, stZ], r: [0, 0.35, 0], colorFn: pedestalGraniteColor(stY),
    });
    addGeo(new THREE.BoxGeometry(0.032, 0.014, 0.020, 4, 3, 2), 0xf0e6d2, {
      p: [stX + 0.003, stY + 0.008, stZ - 0.004], r: [0, 0.35, 0], amt: 0.03,
    });
    addGeo(new THREE.ConeGeometry(0.024, 0.009, 4), 0x9e4332, {
      p: [stX + 0.003, stY + 0.019, stZ - 0.004], r: [0, 0.35 + Math.PI / 4, 0], s: [1.15, 1, 0.85], amt: 0.04,
    });
    const stDir = Math.sin(0.35), stCos = Math.cos(0.35);
    features.push({ type: 'window', pos: [stX + 0.003 + stDir * 0.011, stY + 0.009, stZ - 0.004 + stCos * 0.011], yaw: 0.35, w: 0.014, h: 0.005 });

    const trackPt = (t) => {
      const ang = 0.35 + t * 0.55;
      const x = stX - 0.018 - Math.cos(ang) * 0.135 * t;
      const z = stZ + 0.010 + Math.sin(ang) * 0.125 * t;
      const y = stY + 0.003 - 0.056 * t;
      return [x, y, z];
    };
    const N_TRACK = 26;
    let prevT = trackPt(0);
    for (let i = 1; i <= N_TRACK; i++) {
      const t = i / N_TRACK;
      const curT = trackPt(t);
      const mx = (prevT[0] + curT[0]) * 0.5;
      const my = (prevT[1] + curT[1]) * 0.5;
      const mz = (prevT[2] + curT[2]) * 0.5;
      const yaw = Math.atan2(curT[0] - prevT[0], curT[2] - prevT[2]);

      if (i % 3 === 1) {
        const gH = Math.max(0.014, my - heightAt(mx, mz) + 0.014);
        addGeo(new THREE.BoxGeometry(0.0085, gH, 0.0095, 2, 3, 2), 0x8e8980, {
          p: [mx, my - gH * 0.5, mz], r: [0, yaw, 0], colorFn: pedestalGraniteColor(my - gH),
        });
      }
      addBeam(prevT[0], prevT[1] - 0.0015, prevT[2], curT[0], curT[1] - 0.0015, curT[2], 0.011, 0.004, 0x6e6a62, UP, 0.0004);
      addBeam(prevT[0], prevT[1] + 0.0005, prevT[2], curT[0], curT[1] + 0.0005, curT[2], 0.0018, 0.0015, 0x3b3d40, UP, 0.0002);
      const nx = Math.cos(yaw) * 0.0032, nz = -Math.sin(yaw) * 0.0032;
      addBeam(prevT[0] + nx, prevT[1] + 0.001, prevT[2] + nz, curT[0] + nx, curT[1] + 0.001, curT[2] + nz, 0.0012, 0.0012, 0x9aa0a6, UP, 0.0002);
      addBeam(prevT[0] - nx, prevT[1] + 0.001, prevT[2] - nz, curT[0] - nx, curT[1] + 0.001, curT[2] - nz, 0.0012, 0.0012, 0x9aa0a6, UP, 0.0002);
      prevT = curT;
    }

    for (const tc of [0.34, 0.49]) {
      const pA = trackPt(tc - 0.055), pB = trackPt(tc + 0.055);
      const cx = (pA[0] + pB[0]) * 0.5, cy = (pA[1] + pB[1]) * 0.5 + 0.0065, cz = (pA[2] + pB[2]) * 0.5;
      const dx = pA[0] - pB[0], dy = pA[1] - pB[1], dz = pA[2] - pB[2];
      const yaw = Math.atan2(dx, dz);
      const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
      const qTrain = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

      addGeo(new THREE.BoxGeometry(0.0092, 0.0028, 0.022), 0x26282b, { p: [cx, cy - 0.0032, cz], q: qTrain });
      addGeo(new THREE.BoxGeometry(0.0098, 0.0078, 0.021, 2, 2, 4), 0xc82626, { p: [cx, cy + 0.0015, cz], q: qTrain, amt: 0.03 });
      addGeo(new THREE.BoxGeometry(0.0102, 0.0032, 0.020), 0xffe49c, { p: [cx, cy + 0.0022, cz], q: qTrain });
      addGeo(new THREE.BoxGeometry(0.0100, 0.0022, 0.0215), 0xf4f1ea, { p: [cx, cy + 0.0062, cz], q: qTrain, amt: 0.02 });
      features.push({ type: 'city', pos: [cx, cy + 0.0022, cz], size: 0.0135 });
    }
  }

  // =====================================================================
  // 8. SELVA DE TIJUCA: ÁRBOLES TROPICALES, IPÊS EN FLOR Y PALMERAS IMPERIALES
  // =====================================================================
  const addTropicalTree = (x, y, z, sc = 1, blossomHex = null) => {
    addGeo(new THREE.CylinderGeometry(0.0018 * sc, 0.0030 * sc, 0.016 * sc, 6), 0x523b28, {
      p: [x, y + 0.004 * sc, z], r: [(rng() - 0.5) * 0.10, rng() * 3, (rng() - 0.5) * 0.10], amt: 0.05,
    });
    const greens = blossomHex
      ? [blossomHex, blossomHex, 0x3b6e33, blossomHex]
      : [0x265624, 0x32692e, 0x3d7a36, 0x1e471c];
    const blobs = [
      [0, 0.014, 0, 0.0095, 0.78],
      [0.0045, 0.013, 0.0032, 0.0072, 0.76],
      [-0.0042, 0.013, -0.0028, 0.0074, 0.76],
      [0.001, 0.019, -0.0015, 0.0068, 0.82],
    ];
    for (let i = 0; i < blobs.length; i++) {
      const [ox, oy, oz, rad, sy] = blobs[i];
      const g = displaceGeo(new THREE.IcosahedronGeometry(rad * sc, 1), 0.0012 * sc);
      addGeo(g, greens[(i + Math.floor(rng() * 4)) & 3], {
        p: [x + ox * sc, y + oy * sc, z + oz * sc],
        s: [1.1, sy, 1.1],
        r: [rng() * 0.3, rng() * 6.28, rng() * 0.3],
        amt: 0.06,
      });
    }
  };

  const addImperialPalm = (x, y, z, sc = 1) => {
    const hTrunk = 0.028 * sc;
    const tiltX = (rng() - 0.5) * 0.16;
    const tiltZ = (rng() - 0.5) * 0.16;
    addGeo(new THREE.CylinderGeometry(0.0012 * sc, 0.0022 * sc, hTrunk + 0.008, 6), 0x827668, {
      p: [x, y + hTrunk * 0.42, z], r: [tiltX, rng() * 3, tiltZ], amt: 0.04,
    });
    const topX = x + Math.sin(tiltZ) * hTrunk * 0.4;
    const topY = y + hTrunk * 0.85;
    const topZ = z + Math.sin(tiltX) * hTrunk * 0.4;
    addGeo(new THREE.CylinderGeometry(0.0016 * sc, 0.0015 * sc, 0.0045 * sc, 6), 0x457a34, {
      p: [topX, topY, topZ],
    });
    for (let f = 0; f < 7; f++) {
      const ang = (f / 7) * Math.PI * 2 + rng() * 0.3;
      const frondLen = 0.011 * sc;
      const fx = topX + Math.cos(ang) * frondLen * 0.5;
      const fz = topZ + Math.sin(ang) * frondLen * 0.5;
      addGeo(new THREE.ConeGeometry(0.0024 * sc, frondLen, 4), (f & 1) ? 0x3b782e : 0x4a8c38, {
        p: [fx, topY + 0.001 * sc, fz],
        r: [0.95 * Math.sin(ang), -ang, -0.95 * Math.cos(ang)],
        s: [1, 1, 0.45],
        amt: 0.05,
      });
    }
  };

  const treeSpots = [];
  for (let i = 0, tries = 0; i < 115 && tries < 6000; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = 0.060 + rng() * rimRadius(ang) * 0.84;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (rectDist(x, z, EXPLANADAS[0]) < 0.012) continue;
    if (rectDist(x, z, EXPLANADAS[1]) < 0.012) continue;
    if (rectDist(x, z, EXPLANADAS[2]) < 0.020) continue;
    if (Math.hypot(x - 0.056, z - 0.038) < 0.020) continue;
    if (Math.hypot(x - 0.168, z - 0.196) < 0.036) continue;
    if (Math.hypot(x - 0.112, z - 0.190) < 0.028) continue;
    if (z > bayShoreZ(x) - 0.024 && x > -0.14) continue;
    if (x < -0.06 && z > 0.06 && Math.hypot(x + 0.13, z - 0.13) < 0.07) continue;
    const h = heightAt(x, z), sl = slopeAt(x, z);
    if (h < Y_BAY + 0.010 || sl > 0.52) continue;
    if (treeSpots.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 0.019)) continue;
    treeSpots.push([x, z]);

    if (i % 6 === 0 && h < 0.095) {
      addImperialPalm(x, h, z, 0.88 + rng() * 0.35);
    } else {
      let blossom = null;
      if (i % 9 === 1) blossom = 0xe8b830;
      else if (i % 9 === 4) blossom = 0xd85c8a;
      else if (i % 13 === 7) blossom = 0x7a489c;
      addTropicalTree(x, h, z, 0.82 + rng() * 0.36, blossom);
      if (i % 5 === 0) {
        features.push({ type: 'firefly', pos: [x, h + 0.018, z], size: 0.020 });
      }
    }
    i++;
  }

  // =====================================================================
  // 9. BAHÍA DE GUANABARA, PÃO DE AÇÚCAR, BONDINHO Y VELEROS
  // =====================================================================
  {
    const urcaPos = [0.112, heightAt(0.112, 0.190), 0.190];
    const paoPos = [0.168, heightAt(0.168, 0.196), 0.196];
    addGeo(new THREE.BoxGeometry(0.0075, 0.0055, 0.0070), 0xebe6db, { p: [urcaPos[0], urcaPos[1] + 0.0005, urcaPos[2]] });
    addGeo(new THREE.BoxGeometry(0.0080, 0.0055, 0.0070), 0xebe6db, { p: [paoPos[0], paoPos[1] + 0.0005, paoPos[2]] });
    const cStart = [urcaPos[0], urcaPos[1] + 0.0025, urcaPos[2]];
    const cEnd = [paoPos[0], paoPos[1] + 0.0025, paoPos[2]];
    addRod(cStart, cEnd, 0.0014, 0x3b3d40, 5);
    const cab = [(cStart[0] + cEnd[0]) * 0.5, (cStart[1] + cEnd[1]) * 0.5 - 0.0025, (cStart[2] + cEnd[2]) * 0.5];
    addGeo(new THREE.BoxGeometry(0.0058, 0.0046, 0.0042), 0xd83232, { p: cab });
    addGeo(new THREE.BoxGeometry(0.0060, 0.0020, 0.0044), 0xffe49c, { p: [cab[0], cab[1] + 0.0012, cab[2]] });
    features.push({ type: 'city', pos: [cab[0], cab[1] + 0.0015, cab[2]], size: 0.013 });

    for (const px of [-0.045, -0.010, 0.025, 0.058]) {
      const pz = bayShoreZ(px) - 0.016;
      const py = heightAt(px, pz);
      if (py >= Y_BAY + 0.002) addImperialPalm(px, py, pz, 0.85);
    }

    for (const [bx, bz, yaw] of [[-0.022, 0.212, 0.45], [0.024, 0.228, -0.30], [0.068, 0.215, 0.20]]) {
      if (heightAt(bx, bz) <= Y_BAY + 0.001) {
        addGeo(new THREE.BoxGeometry(0.0055, 0.0032, 0.014), 0xf4f0e8, { p: [bx, Y_BAY + 0.0005, bz], r: [0, yaw, 0] });
        addGeo(new THREE.CylinderGeometry(0.0008, 0.0008, 0.014, 5), 0x5c422c, { p: [bx, Y_BAY + 0.008, bz] });
        addGeo(new THREE.ConeGeometry(0.0042, 0.012, 4), 0xffffff, {
          p: [bx, Y_BAY + 0.009, bz], r: [0, yaw, 0], s: [0.35, 1, 1.15],
        });
        features.push({ type: 'sparkle', pos: [bx + 0.008, Y_BAY + 0.002, bz + 0.006], size: 0.009 });
      }
    }

    for (let i = 0; i < 18; i++) {
      const sx = -0.06 + rng() * 0.16;
      const sz = 0.175 + rng() * 0.065;
      if (heightAt(sx, sz) <= Y_BAY + 0.001) {
        features.push({ type: 'sparkle', pos: [sx, Y_BAY + 0.002, sz], size: 0.009 });
      }
    }
  }

  // =====================================================================
  // 10. EFECTOS VIVOS EN EL CIELO DE RÍO DE JANEIRO
  // =====================================================================
  const cloudRing = [
    [-0.21, 0.34, -0.15, 0.016],
    [0.22,  0.39, -0.10, 0.017],
    [0.01,  0.43, -0.20, 0.015],
    [0.21,  0.32,  0.14, 0.016],
    [-0.20, 0.36,  0.15, 0.015],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [SX, cy, SZ], size: cs });
  }
  features.push({ type: 'gulls', pos: [SX, 0.315, SZ + 0.08], size: 0.115 });

  void stats;
  return finish('El Cristo Redentor');
}
