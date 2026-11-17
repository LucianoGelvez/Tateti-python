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
  // Piedra jabón (pedra-sabão) marfil-crema cálida y limpia con sombreado continuo de pliegues
  const pedraSabaoColor = (shade = 1) => (va, vb, vc) => {
    void va; void vb; void vc;
    tmpColor.setHex(0xe8e0cc);
    const k = shade * (1 + (rng() - 0.5) * 0.016);
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
  // 5. LA ESTATUA DEL CRISTO REDENTOR (~200.000 TRIÁNGULOS DE DETALLE FIEL)
  // Fiel a la escultura Art Déco de Paul Landowski y Gheorghe Leonida:
  //   - Túnica inferior estriada con 24 acanaladuras verticales rectas
  //   - Manto en capas superpuestas con escalón real y borde diagonal nítido
  //   - Pecho liso con costura central y Sagrado Corazón en bajorrelieve
  //   - Brazos horizontales, mangas con corte oblicuo y bocamanga hueca oscura
  //   - Manos rectas con 4 dedos paralelos juntos y pulgar suave
  //   - Cuello liso, cráneo ovalado limpio, rostro Leonida y pelo lateral/trasero
  // =====================================================================
  const Y_STATUE_BASE = 0.213; // empotrado 1 mm dentro de Y_PED_TOP = 0.214

  // --- 5.1: Plinto Escultórico de Esteatita y Sandalias con 5 Dedos ---
  {
    addGeo(new THREE.CylinderGeometry(0.025, 0.0265, 0.008, 24, 3), 0xe8e0cc, {
      p: [SX, Y_STATUE_BASE + 0.0035, SZ], colorFn: soapColorFn,
    });
    addGeo(new THREE.CylinderGeometry(0.023, 0.025, 0.0045, 24, 2), 0xe3dac5, {
      p: [SX, Y_STATUE_BASE + 0.0085, SZ], colorFn: soapColorFn,
    });

    for (const side of [-1, 1]) {
      const fx = SX + side * 0.0098;
      const fz = SZ + 0.0185;
      const fy = Y_STATUE_BASE + 0.0095;
      addGeo(new THREE.BoxGeometry(0.0082, 0.0022, 0.0115, 2, 1, 3), 0xd8cfba, {
        p: [fx, fy + 0.0008, fz], r: [0, side * 0.06, 0], colorFn: pedraSabaoColor(0.95),
      });
      addGeo(new THREE.SphereGeometry(0.0040, 12, 8), 0xe8e0cc, {
        p: [fx, fy + 0.0028, fz - 0.001], s: [0.95, 0.72, 1.35], colorFn: soapColorFn,
      });
      addRod([fx - 0.0028, fy + 0.0035, fz - 0.002], [fx, fy + 0.0044, fz + 0.0036], 0.00072, 0xd8cfba, 6);
      addRod([fx + 0.0028, fy + 0.0035, fz - 0.002], [fx, fy + 0.0044, fz + 0.0036], 0.00072, 0xd8cfba, 6);
      for (let toe = 0; toe < 5; toe++) {
        const tx = fx + side * ((2 - toe) * 0.00148);
        const tz = fz + 0.0050 - toe * 0.00036;
        const tr = 0.00085 - toe * 0.00008;
        addGeo(new THREE.SphereGeometry(tr, 8, 6), 0xe8e0cc, {
          p: [tx, fy + 0.0022, tz], s: [0.85, 0.75, 1.3], colorFn: soapColorFn,
        });
      }
    }
  }

  // --- 5.2: Túnica Estriada, Torso Liso y Manto en Capas Superpuestas (~104.000 tris) ---
  const Y_TUNIC_BOT = Y_STATUE_BASE + 0.008; // 0.221
  const Y_TUNIC_TOP = 0.427;                 // base plana del cuello en los hombros
  {
    const NU = 260; // anillos verticales
    const NS = 200; // segmentos angulares -> 260 * 200 * 2 = 104.000 triángulos + tapas
    const rings = [];
    const centers = [];
    const ringShade = [];
    let heartSurfaceZ = SZ + 0.019;

    for (let k = 0; k <= NU; k++) {
      const u = k / NU;
      const y = Y_TUNIC_BOT + (Y_TUNIC_TOP - Y_TUNIC_BOT) * u;
      const zShift = SZ + 0.0008 * smooth((u - 0.5) / 0.5);

      let rx = 0.0218 + 0.0024 * smooth((u - 0.15) / 0.62);
      let rz = 0.0174 + 0.0012 * smooth((u - 0.15) / 0.62);

      if (u < 0.06) {
        const flare = smooth(1 - u / 0.06);
        rx += 0.0018 * flare;
        rz += 0.0018 * flare;
      }

      // Expansión gradual de hombros anchos hasta u = 0.93 para alojar por completo el nacimiento de los brazos
      const shoulderExpand = smooth((u - 0.70) / 0.21) * (1 - smooth((u - 0.935) / 0.065));
      rx += 0.0082 * shoulderExpand;
      rz += 0.0006 * shoulderExpand;

      if (u > 0.925) {
        const neckT = smooth((u - 0.925) / 0.075);
        rx = rx * (1 - neckT) + 0.0074 * neckT;
        rz = rz * (1 - neckT) + 0.0076 * neckT;
      }

      const ring = [];
      const shades = [];
      for (let s = 0; s < NS; s++) {
        const th = (s / NS) * Math.PI * 2;
        const ct = Math.cos(th); // -1 = izquierda foto (-X), +1 = derecha foto (+X)
        const st = Math.sin(th); // +1 = frente (+Z), -1 = espalda (-Z)

        let rLocal = (rx * rz) / Math.hypot(rz * ct, rx * st);
        let shade = 1.0;

        // 1) Columna inferior de túnica con 24 acanaladuras verticales rectas (solo en la parte baja u < 0.62)
        const fluteFadeTop = 1 - smooth((u - 0.44) / 0.18);
        const fluteSin = Math.sin(th * 12);
        const fluteDepth = -0.00145 * Math.pow(Math.abs(fluteSin), 0.75) * fluteFadeTop;
        const fluteShade = 0.88 + 0.13 * (1 - Math.abs(fluteSin));

        // 2) Bordes y capas del Manto Escultórico
        let mantleRelief = 0;
        let mantleMask = 0;
        let stepShadow = 0;

        if (st >= -0.20) {
          const frontWeight = smooth((st + 0.20) / 0.45);

          // Borde diagonal principal del paño frontal del manto (izquierda alta u=0.39 -> derecha baja u=0.14)
          const uDiagHem = 0.280 - 0.135 * Math.max(-0.55, Math.min(0.75, ct));
          const inCentralAndRight = smooth((ct + 0.58) / 0.16);
          const mainMantle = smooth((u - uDiagHem) / 0.018) * inCentralAndRight * (1 - smooth((u - 0.78) / 0.05));

          const distDiag = u - uDiagHem;
          if (distDiag > -0.022 && distDiag < 0.006) {
            stepShadow = Math.max(stepShadow, inCentralAndRight * Math.exp(-Math.pow((distDiag + 0.008) / 0.009, 2)) * 0.22);
          }

          // Faldón izquierdo vertical (ct entre -0.92 y -0.45) con doblez limpio y transición suave
          const flapSideMask = smooth((ct + 0.96) / 0.12) * smooth((-0.38 - ct) / 0.16);
          const uFlapHem = 0.445 + 0.022 * Math.sin((ct + 0.68) * 6.5);
          const leftFlap = smooth((u - uFlapHem) / 0.022) * flapSideMask * (1 - smooth((u - 0.80) / 0.10));
          const distFlap = u - uFlapHem;
          if (distFlap > -0.022 && distFlap < 0.006) {
            stepShadow = Math.max(stepShadow, flapSideMask * Math.exp(-Math.pow((distFlap + 0.008) / 0.009, 2)) * 0.22);
          }

          // Paño vertical exterior derecho (ct > 0.42) con segundo escalón en u ~ 0.255
          const rightPanelMask = smooth((ct - 0.36) / 0.16) * smooth((0.96 - ct) / 0.14);
          const rightPanel = smooth((u - 0.255) / 0.018) * rightPanelMask * (1 - smooth((u - 0.82) / 0.10));

          // Banda transversal en U que cruza bajo el pecho desde brazo derecho (ct=-0.8) hasta costado izquierdo (ct=+0.45)
          const uChestBand = 0.755 - 0.028 * Math.cos(ct * 2.1);
          const bandMask = smooth((0.55 - ct) / 0.18) * smooth((ct + 0.95) / 0.12);
          const chestBand = Math.exp(-Math.pow((u - uChestBand) / 0.042, 2)) * bandMask;
          const chestBandShadow = Math.exp(-Math.pow((u - (uChestBand - 0.046)) / 0.016, 2)) * bandMask * 0.17;
          stepShadow = Math.max(stepShadow, chestBandShadow);

          // 3 grandes pliegues catenarios diagonales en el paño central (bajan de izq a der)
          const centralArea = smooth((ct + 0.45) / 0.15) * smooth((0.44 - ct) / 0.12) * smooth((u - uDiagHem) / 0.03) * smooth((0.72 - u) / 0.05);
          const foldCoord = (u - 0.56 + 0.28 * ct) * 18.0;
          const catenaryFolds = centralArea * (
            Math.exp(-Math.pow(foldCoord - 0.0, 2) * 3.8)
            + 0.85 * Math.exp(-Math.pow(foldCoord + 2.2, 2) * 3.8)
            + 0.70 * Math.exp(-Math.pow(foldCoord - 2.2, 2) * 3.8)
          );

          // 3 pliegues finos diagonales bajo la banda del pecho (zona derecha ct in [0.02, 0.45], u in [0.64, 0.74])
          const subChestArea = smooth((ct - 0.0) / 0.10) * smooth((0.46 - ct) / 0.10) * smooth((u - 0.61) / 0.03) * smooth((0.74 - u) / 0.02);
          const subFolds = subChestArea * (0.5 + 0.5 * Math.cos((u + 0.18 * ct) * 145));

          // Pecho superior y trapecio completamente lisos
          const upperChest = smooth((u - 0.78) / 0.06) * (1 - smooth((u - 0.92) / 0.08));
          const seamLine = upperChest * smooth((0.26 - Math.abs(ct)) / 0.10) * Math.exp(-Math.pow(ct / 0.035, 2)) * 0.00025;

          const vertCreaseL = flapSideMask * smooth((u - uFlapHem) / 0.03) * (1 - smooth((u - 0.80) / 0.08)) * Math.exp(-Math.pow((ct + 0.58) / 0.06, 2)) * 0.0017;
          const vertCreaseR = rightPanelMask * smooth((u - 0.255) / 0.03) * (1 - smooth((u - 0.80) / 0.08)) * Math.exp(-Math.pow((ct - 0.54) / 0.06, 2)) * 0.0018;

          mantleMask = Math.max(mainMantle, leftFlap, rightPanel, upperChest) * frontWeight;
          mantleRelief = frontWeight * (
            0.0028 * mainMantle
            + 0.0036 * leftFlap
            + 0.0032 * rightPanel
            + 0.0024 * chestBand
            + 0.0016 * catenaryFolds
            + 0.0008 * subFolds
            + seamLine
            + vertCreaseL
            + vertCreaseR
          );

          const foldShade = 1.0 - 0.08 * centralArea * (1 - Math.min(1, catenaryFolds / Math.max(0.01, centralArea)))
            - 0.06 * subChestArea * (1 - subFolds / Math.max(0.01, subChestArea));
          shade *= foldShade;
        }

        // Espalda (st < 0.05)
        if (st < 0.05) {
          const backWeight = smooth((0.05 - st) / 0.35);
          const uBackHem = 0.36 - 0.12 * ct;
          const backMantle = smooth((u - uBackHem) / 0.025) * (1 - smooth((u - 0.92) / 0.06));
          const backFolds = backMantle * (0.5 + 0.5 * Math.cos((u - 0.16 * ct) * 44)) * 0.0010;
          const backShadow = Math.exp(-Math.pow((u - (uBackHem - 0.014)) / 0.012, 2)) * 0.15;
          mantleMask = Math.max(mantleMask, backMantle * backWeight);
          mantleRelief += backWeight * (0.0026 * backMantle + backFolds);
          stepShadow = Math.max(stepShadow, backShadow * backWeight);
        }

        const fluteVis = fluteDepth * (1 - mantleMask);
        rLocal += fluteVis + mantleRelief;
        const baseShade = fluteShade * (1 - Math.max(mantleMask, 1 - fluteFadeTop)) + 1.0 * Math.max(mantleMask, 1 - fluteFadeTop);
        shade *= baseShade * (1 - stepShadow);

        const vx = SX + rLocal * ct;
        const vz = zShift + rLocal * st;
        if (s === NS / 4 && Math.abs(y - 0.402) < 0.0012) {
          heartSurfaceZ = vz;
        }
        ring.push(new THREE.Vector3(vx, y, vz));
        shades.push(shade);
      }
      rings.push(ring);
      centers.push(new THREE.Vector3(SX, y, zShift));
      ringShade.push(shades);
    }

    addLoftedMesh(rings, centers, (k, s, va, vb, vc) => {
      return pedraSabaoColor(ringShade[k][s])(va, vb, vc);
    }, { capStart: true, capEnd: true, startWant: DOWN, endWant: UP });

    // Sagrado Corazón de Jesús en bajorrelieve discreto y plano sobre el pecho (igual a la foto real)
    const hx = SX, hy = 0.402, hz = heartSurfaceZ + 0.0002;
    addGeo(new THREE.SphereGeometry(0.0034, 18, 14), 0xe8e0cc, {
      p: [hx, hy, hz], s: [0.90, 1.12, 0.22], colorFn: pedraSabaoColor(1.03),
    });
    addGeo(new THREE.ConeGeometry(0.0028, 0.0044, 14, 2), 0xe8e0cc, {
      p: [hx, hy - 0.0024, hz - 0.0001], r: [Math.PI, 0, 0], s: [0.90, 1, 0.22], colorFn: pedraSabaoColor(1.01),
    });
    addGeo(new THREE.BoxGeometry(0.0007, 0.0032, 0.0006), 0xe8e0cc, {
      p: [hx, hy + 0.0052, hz + 0.0001], colorFn: pedraSabaoColor(1.04),
    });
    addGeo(new THREE.BoxGeometry(0.0022, 0.0007, 0.0006), 0xe8e0cc, {
      p: [hx, hy + 0.0058, hz + 0.0001], colorFn: pedraSabaoColor(1.04),
    });
  }

  // --- 5.3: Brazos Horizontales, Mangas Lisas con Corte Oblicuo y Bocamanga Hueca (~43.000 tris) ---
  const Y_ARM_TOP = 0.422;
  const Z_ARM_AXIS = SZ + 0.0010;
  const X_CUFF_TOP = 0.114;
  const X_CUFF_BOT = 0.097;
  for (const side of [-1, 1]) {
    const NX = 110; // 2 * 110 * 96 * 2 = 42.240 triángulos
    const NS = 96;
    const rings = [];
    const centers = [];
    const ringShade = [];
    const xStart = side * 0.011;

    for (let k = 0; k <= NX; k++) {
      const t = k / NX;

      // El nacimiento del brazo (t < 0.18) se hunde suavemente dentro del hombro del torso para cero escalón visible
      const shoulderIn = smooth(t / 0.18);
      const yTop = (0.414 + (Y_ARM_TOP - 0.414) * shoulderIn) - 0.0030 * t;
      const yBot = 0.382 + 0.0035 * t - 0.0032 * Math.sin(t * Math.PI);
      const yCenter = 0.5 * (yTop + yBot);
      const halfH = 0.5 * (yTop - yBot);
      const halfZ = 0.0130 * (1 - 0.38 * t);

      const ring = [];
      const shades = [];
      for (let s = 0; s < NS; s++) {
        const th = (s / NS) * Math.PI * 2;
        const ct = Math.cos(th); // +1 arriba (+Y), -1 abajo (-Y)
        const st = Math.sin(th); // +1 frente (+Z), -1 espalda (-Z)

        // El borde exterior de la bocamanga tiene un corte diagonal hacia abajo-adentro (X_CUFF_BOT -> X_CUFF_TOP)
        const xCuffEdge = 0.5 * (X_CUFF_TOP + X_CUFF_BOT) + 0.5 * (X_CUFF_TOP - X_CUFF_BOT) * ct;
        const x = xStart + (side * xCuffEdge - xStart) * t;

        const yOff = halfH * ct;
        const zPinch = ct >= 0 ? (0.86 + 0.14 * Math.sqrt(1 - ct * ct)) : (0.58 + 0.42 * (1 + ct));
        let zOff = halfZ * zPinch * st;

        // 3 pliegues diagonales suaves de la tela desde el hombro/axila hacia la bocamanga (sin ondas verticales)
        const diagPhase = t * 2.2 - ct * 0.85;
        const creaseMask = smooth((0.45 - ct) / 1.1) * (1 - 0.3 * smooth((t - 0.85) / 0.15));
        const fold1 = Math.exp(-Math.pow((diagPhase - 0.55) / 0.24, 2));
        const fold2 = Math.exp(-Math.pow((diagPhase - 1.35) / 0.24, 2));
        const fold3 = Math.exp(-Math.pow((diagPhase - 2.15) / 0.24, 2));
        const diagCreases = creaseMask * (fold1 + 0.9 * fold2 + 0.75 * fold3);
        zOff += st * 0.0017 * diagCreases;

        // Sutil doblez del borde del puño en t > 0.95
        const cuffLip = t > 0.94 ? Math.sin(((t - 0.94) / 0.06) * Math.PI) * 0.0009 : 0;
        ring.push(new THREE.Vector3(x, yCenter + yOff + ct * cuffLip, Z_ARM_AXIS + zOff + st * cuffLip));
        shades.push(0.95 + 0.05 * diagCreases - 0.04 * (1 - Math.abs(st)) * creaseMask);
      }
      rings.push(ring);
      const xCenterRing = xStart + (side * 0.5 * (X_CUFF_TOP + X_CUFF_BOT) - xStart) * t;
      centers.push(new THREE.Vector3(xCenterRing, yCenter, Z_ARM_AXIS));
      ringShade.push(shades);
    }

    addLoftedMesh(rings, centers, (k, s, va, vb, vc) => {
      return pedraSabaoColor(ringShade[k][s])(va, vb, vc);
    }, { capStart: true, capEnd: false, startWant: new THREE.Vector3(-side, 0, 0) });

    // Bocamanga hueca oscura: extruimos el anillo final hacia el interior del brazo con sombra profunda
    const rimOuter = rings[NX];
    const rimInner = [];
    const innerRings = [rimOuter, rimInner];
    const cuffCenterOut = new THREE.Vector3(side * 0.5 * (X_CUFF_TOP + X_CUFF_BOT), 0.5 * (Y_ARM_TOP - 0.0055 + 0.3855), Z_ARM_AXIS);
    const cuffCenterIn = cuffCenterOut.clone().add(new THREE.Vector3(-side * 0.0085, 0, 0));
    for (let s = 0; s < NS; s++) {
      const p = rimOuter[s];
      rimInner.push(new THREE.Vector3(
        p.x - side * 0.0085,
        cuffCenterIn.y + (p.y - cuffCenterOut.y) * 0.62,
        cuffCenterIn.z + (p.z - cuffCenterOut.z) * 0.55,
      ));
    }
    addLoftedMesh(innerRings, [cuffCenterOut, cuffCenterIn], () => pedraSabaoColor(0.50)(rimOuter[0], rimOuter[1], rimInner[0]), {
      capStart: false, capEnd: true, endWant: new THREE.Vector3(side, 0, 0),
    });
  }

  // --- 5.4: Manos Rectas con 4 Dedos Juntos y Paralelos + Pulgar Suave (~11.500 tris) ---
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
      const curl = 0.12 * t * t;
      const dLocal = ax.clone().multiplyScalar(Math.cos(curl)).addScaledVector(pn, Math.sin(curl)).normalize();
      if (k > 0) pCurr.addScaledVector(dLocal, stepLen);

      const joints = has3Phalanges
        ? 0.07 * Math.exp(-Math.pow((t - 0.36) / 0.08, 2)) + 0.06 * Math.exp(-Math.pow((t - 0.68) / 0.08, 2))
        : 0.08 * Math.exp(-Math.pow((t - 0.48) / 0.09, 2));
      const tipTaper = t > 0.84 ? Math.sqrt(Math.max(0.10, 1 - Math.pow((t - 0.84) / 0.16, 2))) : 1.0;
      const r = radiusBase * (1 - 0.18 * t + joints) * tipTaper;

      const ring = [];
      for (let s = 0; s < segS; s++) {
        const th = (s / segS) * Math.PI * 2;
        const ct = Math.cos(th);
        const st = Math.sin(th);
        let rLat = r * 0.92;
        let rPal = r * 0.86;
        if (t > 0.78 && t < 0.96 && st < -0.25) {
          rPal += 0.00024 * Math.sin(((t - 0.78) / 0.18) * Math.PI);
        }
        ring.push(pCurr.clone().addScaledVector(lat, rLat * ct).addScaledVector(pn, rPal * st));
      }
      rings.push(ring);
      centers.push(pCurr.clone());
    }
    const endTip = pCurr.clone().addScaledVector(ax, radiusBase * 0.22);
    addLoftedMesh(rings, centers, () => pedraSabaoColor(1.0)(pCurr, pCurr, endTip), {
      capStart: true, capEnd: true, startWant: ax.clone().negate(), endWant: endTip.sub(pCurr).normalize(),
    });
  };

  for (const side of [-1, 1]) {
    // La muñeca emerge de la parte alta de la bocamanga oblicua
    const xWrist0 = side * 0.103;
    const xWrist1 = side * 0.115;
    const yWrist = 0.415;
    const zWrist = Z_ARM_AXIS;

    addGeo(new THREE.CylinderGeometry(0.0046, 0.0054, 0.013, 16, 4), 0xe8e0cc, {
      p: [(xWrist0 + xWrist1) * 0.5, yWrist, zWrist],
      r: [0, 0, side * -Math.PI / 2],
      s: [0.85, 1, 0.78],
      colorFn: soapColorFn,
    });

    const NU_P = 28, NS_P = 28;
    const pRings = [], pCenters = [];
    const palmLen = 0.0124;
    for (let k = 0; k <= NU_P; k++) {
      const t = k / NU_P;
      const px = xWrist1 + side * (palmLen * t);
      const halfY = 0.0048 + 0.0014 * smooth(t / 0.82) - 0.0004 * smooth((t - 0.82) / 0.18);
      const halfZ = 0.0033 * (1 - 0.22 * t);
      const yC = yWrist + 0.0002 * t;
      const zC = zWrist + 0.0004 * Math.sin(t * Math.PI);

      const ring = [];
      for (let s = 0; s < NS_P; s++) {
        const th = (s / NS_P) * Math.PI * 2;
        const ct = Math.cos(th);
        const st = Math.sin(th);
        let py = yC + halfY * ct;
        let pz = zC + halfZ * st;
        if (st > 0) {
          const thenar = Math.exp(-Math.pow((t - 0.35) / 0.28, 2)) * smooth((ct - 0.05) / 0.7);
          pz += 0.0012 * thenar * st;
          const hollow = Math.exp(-Math.pow((t - 0.52) / 0.26, 2)) * Math.exp(-Math.pow(ct / 0.45, 2));
          pz -= 0.0007 * hollow * st;
        }
        ring.push(new THREE.Vector3(px, py, pz));
      }
      pRings.push(ring);
      pCenters.push(new THREE.Vector3(px, yC, zC));
    }
    addLoftedMesh(pRings, pCenters, () => pedraSabaoColor(1.0)(pCenters[0], pCenters[1], pCenters[2]), {
      capStart: true, capEnd: true, startWant: new THREE.Vector3(-side, 0, 0), endWant: new THREE.Vector3(side, 0, 0),
    });

    // Estigma sutil en el centro de la palma
    addGeo(new THREE.SphereGeometry(0.0010, 8, 6), 0xd4cbb4, {
      p: [xWrist1 + side * palmLen * 0.52, yWrist, zWrist + 0.0028],
      s: [1.0, 0.9, 0.45],
      colorFn: pedraSabaoColor(0.88),
    });

    const palmNrm = new THREE.Vector3(0, 0, 1);
    const xKnuckle = xWrist1 + side * (palmLen - 0.0012);
    // 4 dedos rectos, paralelos y juntos como en la foto real
    const fingersSpec = [
      { dy: +0.0042, dz: +0.0001, angY: +0.015, len: 0.0112, r: 0.00138 },
      { dy: +0.0014, dz: +0.0002, angY: 0.000,  len: 0.0124, r: 0.00142 },
      { dy: -0.0014, dz: +0.0001, angY: -0.010, len: 0.0114, r: 0.00136 },
      { dy: -0.0040, dz: 0.0000,  angY: -0.025, len: 0.0092, r: 0.00122 },
    ];
    for (const f of fingersSpec) {
      const fBase = new THREE.Vector3(xKnuckle, yWrist + f.dy, zWrist + f.dz);
      const fDir = new THREE.Vector3(side * Math.cos(f.angY), Math.sin(f.angY), 0.08).normalize();
      addSculptedFinger(fBase, fDir, palmNrm, f.len, f.r, 22, 16, true);
    }
    // Pulgar separado suavemente hacia arriba (~25 grados)
    const thumbBase = new THREE.Vector3(xWrist1 + side * 0.0045, yWrist + 0.0052, zWrist + 0.0010);
    const thumbDir = new THREE.Vector3(side * 0.88, 0.42, 0.20).normalize();
    addSculptedFinger(thumbBase, thumbDir, palmNrm, 0.0092, 0.00158, 20, 16, false);
  }

  // --- 5.5: Cuello Liso, Cabeza Proporcionada (1.42:1), Rostro de Leonida y Cabellera (~45.000 tris) ---
  {
    const Y_NECK_BASE = 0.422;
    const Z_NECK_BASE = SZ + 0.0010;
    const HEAD_H = 0.045; // cuello (0..0.011) + cabeza mentón-coronilla (0.034) => proporción humana fiel ~1.45:1
    const headPitch = 0.13;
    const cp = Math.cos(headPitch), sp = Math.sin(headPitch);
    const toWorldHead = (lx, ly, lz) => new THREE.Vector3(
      SX + lx,
      Y_NECK_BASE + ly * cp - lz * sp,
      Z_NECK_BASE + ly * sp + lz * cp,
    );

    const NU_H = 150;
    const NS_H = 150;
    const hRings = [];
    const hCenters = [];
    const hShades = [];

    for (let k = 0; k <= NU_H; k++) {
      const u = k / NU_H; // 0 = base cuello, 0.24 = mentón, 0.62 = ojos, 0.80 = frente alta, 1.0 = coronilla
      const ly = u * HEAD_H;

      let rxBase, rzBase, zCenterShift = 0;
      if (u < 0.24) {
        const t = u / 0.24;
        rxBase = 0.0070 - 0.0003 * Math.sin(t * Math.PI);
        rzBase = 0.0072 - 0.0002 * Math.sin(t * Math.PI);
      } else {
        // Perfil ovalado humano continuo: más ancho en sienes/pómulos (t ~ 0.60) y bóveda redondeada arriba
        const t = (u - 0.24) / 0.76; // 0..1
        const rxMax = 0.0110, rzMax = 0.0122;
        if (t < 0.60) {
          const s = smooth(t / 0.60);
          rxBase = 0.0070 + (rxMax - 0.0070) * s;
          rzBase = 0.0072 + (rzMax - 0.0072) * s;
          zCenterShift = 0.0016 * Math.sin((t / 0.60) * Math.PI * 0.5);
        } else {
          const s = (t - 0.60) / 0.40;
          const cap = Math.sqrt(Math.max(0.008, 1 - s * s));
          rxBase = rxMax * cap;
          rzBase = rzMax * cap;
          zCenterShift = 0.0016 * (1 - s);
        }
      }

      const ring = [];
      const shades = [];
      for (let s = 0; s < NS_H; s++) {
        const th = (s / NS_H) * Math.PI * 2;
        const ct = Math.cos(th);
        const st = Math.sin(th);

        let r = (rxBase * rzBase) / Math.hypot(rzBase * ct, rxBase * st);
        let shade = 1.0;
        const absX = Math.abs(ct);

        // 1) Cuello despejado y liso con tendones en V y sombra nítida bajo la barba
        if (u < 0.26 && st > 0) {
          const tendon = Math.exp(-Math.pow((absX - 0.36 * (1 - u * 1.1)) / 0.14, 2));
          r += 0.00035 * tendon * (1 - u / 0.26);
          if (u > 0.16) {
            shade -= 0.18 * smooth((u - 0.16) / 0.09) * smooth((st - 0.05) / 0.45);
          }
        }

        // 2) Rostro Art Déco nítido de Gheorghe Leonida (frente st > 0.20)
        if (st > 0.20 && u >= 0.22 && u <= 0.88) {
          const faceMask = smooth((st - 0.20) / 0.48);

          // Barba geométrica compacta con proyección firme sobre la garganta (u = 0.24 .. 0.40)
          if (u >= 0.23 && u <= 0.41 && absX < 0.46) {
            const beardMask = Math.sin(((u - 0.23) / 0.18) * Math.PI) * smooth((0.46 - absX) / 0.18);
            const splitGroove = Math.exp(-Math.pow(absX / 0.065, 2));
            r += (0.0032 - 0.0007 * splitGroove) * beardMask * faceMask;
            shade -= 0.04 * splitGroove * beardMask;
          }

          // Labios y bigote en V invertida suave (u = 0.39 .. 0.48)
          if (u >= 0.38 && u <= 0.48 && absX < 0.38) {
            const mouthH = Math.exp(-Math.pow((u - 0.425) / 0.017, 2));
            const mouthW = smooth((0.32 - absX) / 0.12);
            const lipLine = Math.exp(-Math.pow((u - 0.425) / 0.0055, 2));
            r += (0.0010 * mouthH - 0.00085 * lipLine) * mouthW * faceMask;
            shade -= 0.12 * lipLine * mouthW * faceMask;
            const chinShadow = Math.exp(-Math.pow((u - 0.402) / 0.010, 2)) * mouthW;
            shade -= 0.09 * chinShadow * faceMask;
            const mustU = 0.448 - 0.052 * absX;
            const mustMask = Math.exp(-Math.pow((u - mustU) / 0.015, 2)) * smooth((absX - 0.03) / 0.09) * smooth((0.36 - absX) / 0.10);
            r += 0.00095 * mustMask * faceMask;
          }

          // Pómulos planos Art Déco
          const cheekMask = Math.exp(-Math.pow((u - 0.53) / 0.07, 2)) * Math.exp(-Math.pow((absX - 0.46) / 0.15, 2));
          r += 0.0009 * cheekMask * faceMask;

          // Nariz prismática recta y elegante (u = 0.46 .. 0.68)
          if (u >= 0.45 && u <= 0.69 && absX < 0.18) {
            const uN = (u - 0.46) / 0.22;
            const noseProfile = Math.sin(Math.min(1, Math.max(0, uN)) * Math.PI * 0.72) * (1 - 0.34 * Math.pow(uN, 2));
            const bridge = smooth((0.115 - absX) / 0.065);
            const tip = Math.exp(-Math.pow((u - 0.485) / 0.024, 2)) * smooth((0.14 - absX) / 0.06);
            r += (0.0033 * noseProfile * bridge + 0.00085 * tip) * faceMask;
            shade += 0.03 * bridge * faceMask;
          }

          // Cejas amplias y cuencas oculares sombreadas con párpados almendrados (u = 0.55 .. 0.72)
          const eyeXDist = Math.abs(absX - 0.31);
          if (u >= 0.54 && u <= 0.72 && eyeXDist < 0.21) {
            const eyeWidthMask = smooth((0.20 - eyeXDist) / 0.075);
            const socket = Math.exp(-Math.pow((u - 0.615) / 0.038, 2)) * eyeWidthMask;
            r -= 0.0014 * socket * faceMask;
            shade -= 0.18 * socket * faceMask;
            const eyeball = Math.exp(-Math.pow((u - 0.612) / 0.013, 2)) * smooth((0.12 - eyeXDist) / 0.05);
            r += 0.00095 * eyeball * faceMask;
            shade += 0.04 * eyeball * faceMask;
            // Línea oscura del ojo entornado mirando hacia abajo
            const eyeSlit = Math.exp(-Math.pow((u - 0.606) / 0.005, 2)) * smooth((0.11 - eyeXDist) / 0.04);
            shade -= 0.14 * eyeSlit * faceMask;
            const browArch = 0.05 * eyeXDist + 0.10 * eyeXDist * eyeXDist;
            const brow = Math.exp(-Math.pow((u - 0.662 + browArch) / 0.015, 2)) * eyeWidthMask;
            r += 0.0015 * brow * faceMask;
          }
        }

        // 3) Cabellera lisa enmarcando la frente/sienes con arco ovalado suave y cayendo detrás de las orejas
        const hairArchFront = 0.84 - 0.14 * absX * absX;
        const inCrownTop = smooth((u - hairArchFront) / 0.08);
        if (inCrownTop > 0.01 && st > -0.15) {
          const partGroove = Math.exp(-Math.pow(absX / 0.055, 2));
          r += (0.00045 - 0.00032 * partGroove) * inCrownTop;
          shade -= 0.04 * inCrownTop + 0.025 * partGroove * inCrownTop;
        }
        const behindEars = smooth((0.24 - st) / 0.28) * smooth((u - 0.01) / 0.12) * (1 - smooth((u - 0.84) / 0.12));
        if (behindEars > 0.01) {
          const sideTresses = smooth((absX - 0.56) / 0.36);
          const neckFlare = smooth((0.35 - u) / 0.35);
          const smoothGrooves = Math.cos(th * 12) * 0.00025;
          r += (0.0012 + (0.0014 + 0.0014 * neckFlare) * sideTresses + smoothGrooves) * behindEars;
          shade -= 0.08 * behindEars * (0.4 + 0.6 * sideTresses);
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
