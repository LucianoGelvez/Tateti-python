// Diorama "El Castillo de Hogwarts" — Maqueta extendida de alta fidelidad (~320k+ triángulos)
// Base montañosa alargada (sin redondel circular ni agua rodeando todo el perímetro):
// Lago Negro solo en la bahía suroeste y garganta central; acantilados de basalto
// cerrando directamente en el zócalo en los demás costados.
// Distribución arquitectónica fiel a la maqueta completa:
//   Gran Comedor, Patio de Entrada, Escalinata en Zigzag y Embarcadero;
//   Gran Torre de la Escalera sobre pilares y Gran Claustro Cuadrangular;
//   Ala del Hospital, Torre del Reloj y Puente Cubierto de Madera con celosía;
//   Gran Viaducto de 8 pilares, Bastión Central, Torre de Astronomía y Pabellón;
//   Galería Larga, Claustro Este, Torres Gemelas de las Campanas, 4 Invernaderos y Rotonda;
//   Torreón Norte (DADA), Puente Trasero, Muralla Noreste, Lechucería, Hagrid, Sauce y Bosque.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildCastillo(seed = 41) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  // =====================================================================
  // PALETA OSCURA Y SILLERÍA / PIZARRA PROCEDIMENTAL
  // =====================================================================
  const stoneColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 150 * scale);
    const col = Math.floor((cx + cz) * 115 * scale + (row % 2) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0x6b6458, 0x5d564b, 0x766e61, 0x534c42];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.020 && rng() < 0.42) hex = 0x44493d; // musgo basal
    return jitter(hex, 0.045);
  };

  const slateColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 175);
    const col = Math.floor((cx - cz) * 140 + (row % 2) * 0.5);
    const h = ((row * 31) ^ (col * 17)) & 3;
    // Pizarra oscura con pátina fría verde-azulada como en la maqueta clásica
    const pal = [0x1c282e, 0x24333a, 0x162026, 0x2a3b42];
    return jitter(pal[h], 0.05);
  };

  const woodColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 210) & 1;
    return jitter(k ? 0x382518 : 0x473020, 0.05);
  };

  // Micro-relieve coherente por coordenada cuantizada (sin abrir grietas en las mallas)
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
      pos.setXYZ(i, x + n1 * amp, y + n2 * amp * 0.6, z + n1 * amp);
    }
    return geo;
  };

  // =====================================================================
  // 1. BASE EXTENDIDA NO CIRCULAR + TOPOGRAFÍA ESCOCESA + LAGO SUROESTE
  // =====================================================================
  const CX = -0.02, CZ = 0.015, AX = 0.45, AZ = 0.285, FLOOR = -0.068;
  // Contorno alargado este-oeste (superelipse p=4 + lóbulos para Bahía Embarcadero, Lechucería y Rotonda)
  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const base = 1 / Math.pow(Math.pow(Math.abs(c) / AX, 4) + Math.pow(Math.abs(s) / AZ, 4), 0.25);
    const lobeBoat = 0.075 * Math.exp(-Math.pow((ang - 2.18) / 0.50, 2));   // bahía Embarcadero suroeste
    const lobeOwl  = 0.065 * Math.exp(-Math.pow((ang + 2.55) / 0.42, 2));   // risco Lechucería noroeste
    const lobeEast = 0.032 * Math.exp(-Math.pow((ang - 0.15) / 0.55, 2));   // terraza Rotonda este
    return base + lobeBoat + lobeOwl + lobeEast;
  };

  const EXPLANADAS = [
    { x: -0.242, z: 0.068,  hw: 0.044, hd: 0.088, rot: 0.22,  y: 0.118, r0: 0.010, r1: 0.034 }, // Gran Comedor + Patio de Entrada
    { x: -0.152, z: -0.062, hw: 0.064, hd: 0.078, rot: 0.05,  y: 0.148, r0: 0.012, r1: 0.036 }, // Gran Torreón + Claustro Principal
    { x: -0.258, z: -0.068, hw: 0.028, hd: 0.028, rot: 0.42,  y: 0.125, r0: 0.008, r1: 0.024 }, // Torre del Reloj + Hospital
    { x: -0.412, z: -0.142, hw: 0.026, hd: 0.026, rot: 0,     y: 0.086, r0: 0.008, r1: 0.024 }, // Círculo de Piedras
    { x: -0.365, z: -0.215, hw: 0.024, hd: 0.024, rot: 0,     y: 0.106, r0: 0.008, r1: 0.024 }, // Peñón de la Lechucería
    { x: -0.375, z: 0.025,  hw: 0.034, hd: 0.032, rot: 0.35,  y: 0.056, r0: 0.010, r1: 0.028 }, // Cabaña de Hagrid
    { x: 0.145,  z: -0.025, hw: 0.135, hd: 0.066, rot: 0,     y: 0.125, r0: 0.012, r1: 0.038 }, // Bastión + Astronomía + Galería + Campanas
    { x: 0.245,  z: 0.075,  hw: 0.105, hd: 0.044, rot: 0,     y: 0.078, r0: 0.010, r1: 0.030 }, // Invernaderos + Rotonda Botánica
    { x: 0.155,  z: -0.165, hw: 0.054, hd: 0.038, rot: -0.10, y: 0.122, r0: 0.010, r1: 0.032 }, // Torreón Norte (DADA)
  ];

  const rectDist = (x, z, p) => {
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  const rawHeight = (x, z) => {
    const hWestCore = 0.185 * smooth(1 - Math.hypot(x + 0.155, z + 0.055) / 0.18);
    const hHall     = 0.155 * smooth(1 - Math.hypot(x + 0.242, z - 0.068) / 0.14);
    const hClock    = 0.152 * smooth(1 - Math.hypot(x + 0.258, z + 0.068) / 0.095);
    const hOwl      = 0.140 * smooth(1 - Math.hypot(x + 0.365, z + 0.215) / 0.105);
    const hCirc     = 0.118 * smooth(1 - Math.hypot(x + 0.412, z + 0.142) / 0.095);
    const hHag      = 0.092 * smooth(1 - Math.hypot(x + 0.375, z - 0.025) / 0.125);
    const hEastCore = 0.162 * smooth(1 - Math.hypot((x - 0.155) * 0.65, z + 0.025) / 0.165);
    const hGreen    = 0.118 * smooth(1 - Math.hypot((x - 0.245) * 0.72, z - 0.075) / 0.135);
    const hDada     = 0.155 * smooth(1 - Math.hypot(x - 0.155, z + 0.165) / 0.135);
    const hRidgeE   = 0.095 * smooth(1 - Math.hypot((x - 0.26) * 0.75, z + 0.14) / 0.18);
    let h = 0.028 + Math.max(hWestCore, hHall, hClock, hOwl, hCirc, hHag, hEastCore, hGreen, hDada, hRidgeE);

    // Lago Negro solo en la bahía frontal/suroeste y garganta del Viaducto; resto del macizo es tierra firme
    const gorgeViaduct = smooth(1 - Math.hypot((x + 0.055) * 1.45, (z - 0.025) * 0.85) / 0.095);
    const gorgeBridge  = smooth(1 - Math.hypot((x + 0.342) * 1.55, (z + 0.108) * 1.25) / 0.072);
    const lakeBay      = smooth(1 - Math.hypot((x + 0.145) * 0.72, (z - 0.255) * 1.12) / 0.225);
    h -= 0.135 * gorgeViaduct + 0.082 * gorgeBridge + 0.145 * lakeBay;

    // Relieve rocoso de alta frecuencia
    h += (fbm(x * 16 + 3, z * 16 + 9) - 0.5) * 0.036;
    h += (fbm(x * 42 + 11, z * 42 + 5) - 0.5) * 0.009;
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

  // Malla polar extendida (K = 148, S = 380 -> ~113.200 triángulos)
  const K = 148, S = 380;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = height(x, z);
      const y = Math.max(h, 0) + (h < 0 ? (fbm(x * 36, z * 36) - 0.5) * 0.0022 : 0);
      row.push({ v: new THREE.Vector3(x, y, z), h });
    }
    ringPts.push(row);
  }
  // Suavizar ligeramente los vértices del borde sumergido para nivelar el corte de agua
  for (const p of ringPts[K]) if (p.h < 0) p.v.y = 0;

  const nrm = new THREE.Vector3();
  function terrainColor(a, b, c) {
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);
    if (h < 0 && hMax < 0.005 && slope < 0.20) {
      const t = smooth(1 + h / 0.055);
      tmpColor.setHex(0x061520).lerp(new THREE.Color(0x143647), t * t);
      if (h > -0.0055) tmpColor.lerp(new THREE.Color(0x6b8c9e), 0.44);
      const k = 1 + (rng() - 0.5) * 0.06;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }
    if (slope > 0.27 || h > 0.112) {
      const band = Math.floor(((a.v.y + b.v.y + c.v.y) / 3) * 95) & 1;
      return jitter(band ? 0x26292e : (rng() < 0.5 ? 0x32353b : 0x1e2024), 0.075);
    }
    if (h < 0.010) return jitter(rng() < 0.5 ? 0x423f3a : 0x35322e, 0.06);
    return jitter(h > 0.070 ? 0x223624 : (rng() < 0.5 ? 0x2b402a : 0x1c2c1d), 0.075);
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
  // Plinto / zócalo vertical hermético: agua donde el borde es lago, roca donde es macizo
  const rim = ringPts[K];
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  const radial = new THREE.Vector3();
  for (let s = 0; s < S; s++) {
    const ra = rim[s], rb = rim[(s + 1) % S];
    const a = ra.v, b = rb.v;
    const isWater = (ra.h + rb.h) * 0.5 < -0.002;
    const a2 = new THREE.Vector3(CX + (a.x - CX) * 0.97, FLOOR, CZ + (a.z - CZ) * 0.97);
    const b2 = new THREE.Vector3(CX + (b.x - CX) * 0.97, FLOOR, CZ + (b.z - CZ) * 0.97);
    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    addTri(a, b, a2, jitter(isWater ? 0x061520 : 0x202226, 0.05), radial);
    addTri(b, b2, a2, jitter(isWater ? 0x05111a : 0x191b1f, 0.05), radial);
    addTri(a2, b2, centerBottom, jitter(0x221f1c, 0.04), DOWN);
  }

  // 240 columnas y estratos prismáticos de basalto incrustados en los acantilados (nunca fuera del borde)
  for (let i = 0, tries = 0; i < 240 && tries < 9500; tries++) {
    const ang = rng() * Math.PI * 2, r = 0.04 + rng() * rimRadius(ang) * 0.84;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (Math.hypot(x + 0.26, z - 0.18) < 0.068) continue; // despejar escalinata zigzag
    if (Math.hypot(x + 0.34, z + 0.11) < 0.055) continue; // despejar puente madera
    if (Math.hypot(x + 0.055, z - 0.025) < 0.065) continue; // despejar viaducto
    const h = height(x, z), sl = slopeAt(x, z);
    if (sl < 0.36 || h < 0.008 || h > 0.135) continue;
    const rad = 0.0065 + rng() * 0.010, bh = 0.022 + rng() * 0.032;
    addGeo(new THREE.CylinderGeometry(rad * 0.65, rad * 1.15, bh, 8, 5),
      rng() < 0.5 ? 0x24272c : 0x2f3339, {
        p: [x, Math.max(FLOOR + bh * 0.52, h - 0.005), z],
        r: [(rng() - 0.5) * 0.30, rng() * Math.PI * 2, (rng() - 0.5) * 0.30],
        s: [1.1 + rng() * 0.4, 1, 0.9 + rng() * 0.5], amt: 0.08,
      });
    i++;
  }

  // =====================================================================
  // HELPERS ARQUITECTÓNICOS DE ALTA SUBDIVISIÓN (~225k TRIÁNGULOS)
  // =====================================================================
  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };

  // Bloque de sillería subdividido densamente con micro-relieve en esquinas de piedra
  const addSubBox = (w, h, d, sx, sy, sz, p, rot = 0, yFloor = -1, fn = null) => {
    const g = displaceGeo(new THREE.BoxGeometry(w, h, d, Math.ceil(sx * 1.35), Math.ceil(sy * 1.35), Math.ceil(sz * 1.35)), 0.00035);
    addGeo(g, 0x6a6357, { p, r: [0, rot, 0], colorFn: fn || stoneColor(yFloor) });
  };

  // Ventanal gótico de alta fidelidad: marco, alféizar, arco superior apuntado, parteluz y travesaño
  const addDetailWin = (p, yaw, w, h, mullions = true) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    addGeo(new THREE.BoxGeometry(w + 0.0042, h + 0.0045, 0.0042, 3, 3, 1), 0x4b453d, { p, r: [0, yaw, 0], amt: 0.04 });
    // Arco ojival / frontón de piedra encima del marco
    addGeo(new THREE.ConeGeometry(w * 0.78, 0.006, 4, 1), 0x595248, {
      p: [p[0] + nx * 0.0006, p[1] + h / 2 + 0.003, p[2] + nz * 0.0006], r: [0, yaw + Math.PI / 4, 0], s: [1, 1, 0.45],
    });
    // Alféizar inferior saliente
    addGeo(new THREE.BoxGeometry(w + 0.0055, 0.0022, 0.0058, 2, 1, 1), 0x595248, { p: [p[0] + nx * 0.0008, p[1] - h / 2 - 0.0012, p[2] + nz * 0.0008], r: [0, yaw, 0] });
    // Vidrio oscuro emplomado
    addGeo(new THREE.BoxGeometry(w, h, 0.0050, 2, 4, 1), 0x1a2634, {
      p: [p[0] + nx * 0.001, p[1], p[2] + nz * 0.001], r: [0, yaw, 0], amt: 0.03,
    });
    if (mullions) {
      addGeo(new THREE.BoxGeometry(0.0014, h, 0.0056, 1, 3, 1), 0x3a352f, { p: [p[0] + nx * 0.0014, p[1], p[2] + nz * 0.0014], r: [0, yaw, 0] });
      if (h > 0.015) {
        addGeo(new THREE.BoxGeometry(w, 0.0014, 0.0056, 2, 1, 1), 0x3a352f, { p: [p[0] + nx * 0.0014, p[1] + h * 0.14, p[2] + nz * 0.0014], r: [0, yaw, 0] });
      }
    }
    features.push({ type: 'window', pos: [p[0] + nx * 0.0044, p[1], p[2] + nz * 0.0044], yaw, w: w * 0.88, h: h * 0.88 });
  };

  // Tejado a dos aguas de alta subdivisión con hastiales exactos, cumbrera y crestería
  const addGableZ = (p, rot, w, h, d, fn = slateColor, coreFn = stoneColor()) => {
    const slopeLen = Math.hypot(w / 2, h);
    const ang = Math.atan2(h, w / 2);
    const c = Math.cos(rot), s = Math.sin(rot);
    const loc = (lx, ly, lz) => [p[0] + lx * c + lz * s, p[1] + ly, p[2] - lx * s + lz * c];
    const segZ = Math.max(10, Math.round(d * 220));
    const segX = Math.max(8, Math.round(slopeLen * 200));
    for (const side of [-1, 1]) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, side * -ang, 'YXZ'));
      addGeo(displaceGeo(new THREE.BoxGeometry(slopeLen, 0.0042, d, segX, 1, segZ), 0.00025), 0x1e2830, {
        p: loc(side * (w / 4), h / 2, 0), q, colorFn: fn,
      });
    }
    const shape = new THREE.Shape();
    shape.moveTo(-w * 0.47, 0.0005);
    shape.lineTo(w * 0.47, 0.0005);
    shape.lineTo(0, h - 0.002);
    shape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.004, d - 0.004), bevelEnabled: false });
    gableGeo.translate(0, 0, -Math.max(0.004, d - 0.004) / 2);
    addGeo(gableGeo, 0x5c554b, { p, r: [0, rot, 0], colorFn: coreFn });
    addGeo(new THREE.BoxGeometry(0.0038, 0.0042, d + 0.002, 1, 1, segZ), 0x3b444a, { p: loc(0, h, 0), r: [0, rot, 0] });
    // Crestería gótica en la cumbrera para tejados de pizarra
    if (fn === slateColor && d > 0.03) {
      const nCrest = Math.floor(d / 0.011);
      for (let i = 0; i < nCrest; i++) {
        const lz = -d * 0.44 + (i + 0.5) * ((d * 0.88) / nCrest);
        addGeo(new THREE.ConeGeometry(0.0018, 0.0045, 4), 0x3b444a, { p: loc(0, h + 0.004, lz), r: [0, rot, 0] });
      }
    }
  };
  const addGableX = (p, rot, w, h, d, fn = slateColor, coreFn = stoneColor()) => addGableZ(p, rot + Math.PI / 2, d, h, w, fn, coreFn);

  // Contrafuerte gótico escalonado en 3 tramos + pináculo
  const addButtress = (p, rot, hTotal, depth = 0.0085, width = 0.007) => {
    addGeo(new THREE.BoxGeometry(width, hTotal * 0.45, depth, 2, 3, 2), 0x5a5348, { p: [p[0], p[1] + hTotal * 0.225, p[2]], r: [0, rot, 0], amt: 0.04 });
    addGeo(new THREE.BoxGeometry(width * 0.85, hTotal * 0.40, depth * 0.78, 2, 3, 2), 0x665e53, { p: [p[0], p[1] + hTotal * 0.64, p[2]], r: [0, rot, 0], amt: 0.04 });
    addGeo(new THREE.BoxGeometry(width * 0.70, hTotal * 0.16, depth * 0.62, 1, 2, 1), 0x71695c, { p: [p[0], p[1] + hTotal * 0.92, p[2]], r: [0, rot, 0], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(width * 0.48, 0.015, 4, 2), 0x4b453d, { p: [p[0], p[1] + hTotal + 0.0075, p[2]], r: [0, rot + Math.PI / 4, 0], amt: 0.05 });
  };

  // Almenas molduradas sobre un tramo de muralla
  const addCrenels = (p0, p1, yTop, step = 0.0085, w = 0.005, h = 0.0055, d = 0.005) => {
    const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dz);
    const n = Math.max(2, Math.floor(len / step));
    const yaw = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      addGeo(new THREE.BoxGeometry(w, h, d, 1, 2, 1), 0x5f584d, {
        p: [p0[0] + dx * t, yTop + h * 0.35, p0[2] + dz * t], r: [0, yaw, 0], amt: 0.04,
      });
      addGeo(new THREE.BoxGeometry(w + 0.0012, 0.0014, d + 0.0012), 0x4b453d, {
        p: [p0[0] + dx * t, yTop + h * 0.90, p0[2] + dz * t], r: [0, yaw, 0],
      });
    }
  };

  // Buhardilla gótica detallada (vidrio oscuro de día, luz nocturna)
  const addDormer = (p, yaw, w = 0.008, h = 0.011, d = 0.010) => {
    addGeo(new THREE.BoxGeometry(w, h, d, 2, 2, 2), 0x676054, { p, r: [0, yaw, 0], amt: 0.04 });
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    addGeo(new THREE.ConeGeometry(w * 0.75, 0.012, 4, 2), 0x1e2830, { p: [p[0], p[1] + h / 2 + 0.0055, p[2]], r: [0, yaw + Math.PI / 4, 0], colorFn: slateColor });
    addGeo(new THREE.BoxGeometry(w * 0.56, h * 0.56, 0.003), 0x1a2634, { p: [p[0] + nx * (d / 2), p[1], p[2] + nz * (d / 2)], r: [0, yaw, 0] });
    features.push({ type: 'window', pos: [p[0] + nx * (d / 2 + 0.002), p[1], p[2] + nz * (d / 2 + 0.002)], yaw, w: w * 0.48, h: h * 0.48 });
  };

  // =====================================================================
  // 2. EXTREMO SUROESTE: GRAN COMEDOR, PATIO DE ENTRADA, ESCALINATA ZIGZAG Y EMBARCADERO
  // =====================================================================
  {
    const rot = 0.22, y0 = 0.118;
    const L = makeLocal(-0.242, y0, 0.068, rot);

    // Basamento macizo de contención en el acantilado con contrafuertes profundos
    addSubBox(0.066, 0.115, 0.132, 10, 12, 16, L(0, -0.055, -0.032), rot, 0.005);
    addSubBox(0.080, 0.115, 0.072, 12, 12, 10, L(0, -0.056, 0.062), rot, 0.005);

    // Nave del Gran Comedor (W=0.054, H=0.072, D=0.124)
    const W = 0.054, H = 0.072, D = 0.124, zHall = -0.032;
    addSubBox(W, H, D, 10, 14, 24, L(0, H / 2, zHall), rot, y0);
    addGableZ(L(0, H, zHall), rot, W + 0.009, 0.048, D + 0.009, slateColor);

    for (const side of [-1, 1]) {
      const yaw = rot + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      addCrenels(L(side * (W / 2 - 0.001), H, zHall - D / 2 + 0.004), L(side * (W / 2 - 0.001), H, zHall + D / 2 - 0.004), y0 + H, 0.009);
      // 7 contrafuertes + 6 ventanales altos + 2 filas de buhardillas (como en la referencia!)
      for (let i = 0; i < 7; i++) {
        const bz = zHall - D / 2 + 0.006 + i * ((D - 0.012) / 6);
        addButtress(L(side * (W / 2 + 0.002), 0, bz), yaw, H * 0.94, 0.0085, 0.007);
        if (i < 6) {
          addDetailWin(L(side * (W / 2 + 0.001), H * 0.56, bz + ((D - 0.012) / 12)), yaw, 0.0095, 0.034, true);
          if (i < 5) {
            addDormer(L(side * (W * 0.34), H + 0.016, bz + 0.012), yaw, 0.0075, 0.010, 0.009);
            addDormer(L(side * (W * 0.18), H + 0.032, bz + 0.012), yaw, 0.0065, 0.008, 0.008);
          }
        }
      }
    }

    // Gran Rosetón frontal y torrecillas en las 4 esquinas del Gran Comedor
    const fz = zHall + D / 2 + 0.0015;
    addGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 20), 0x4b453d, { p: L(0, H * 0.68, fz), r: [Math.PI / 2, rot, 0] });
    addGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.005, 20), 0x1a2634, { p: L(0, H * 0.68, fz + 0.0005), r: [Math.PI / 2, rot, 0] });
    for (let r = 0; r < 4; r++) {
      addGeo(new THREE.BoxGeometry(0.021, 0.0016, 0.0055), 0x554e45, { p: L(0, H * 0.68, fz + 0.0008), r: [0, rot, r * Math.PI / 4] });
    }
    features.push({ type: 'window', pos: L(0, H * 0.68, fz + 0.004), yaw: rot, w: 0.018, h: 0.018 });
    addGeo(new THREE.BoxGeometry(0.022, 0.030, 0.006), 0x4b453d, { p: L(0, 0.015, fz), r: [0, rot, 0] });
    addGeo(new THREE.BoxGeometry(0.017, 0.026, 0.007), 0x362417, { p: L(0, 0.013, fz + 0.0005), r: [0, rot, 0] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      addGeo(new THREE.CylinderGeometry(0.0055, 0.006, H + 0.016, 12, 6), 0x625b50, { p: L(sx * W * 0.48, (H + 0.016) / 2, zHall + sz * D * 0.48), colorFn: stoneColor(y0) });
      addGeo(new THREE.ConeGeometry(0.0075, 0.024, 12, 3), 0x1c282e, { p: L(sx * W * 0.48, H + 0.028, zHall + sz * D * 0.48), colorFn: slateColor });
    }

    // Aguja central del Gran Comedor
    const sz = zHall + 0.005;
    addSubBox(0.016, 0.028, 0.016, 4, 4, 4, L(0, H + 0.044, sz), rot);
    addGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.020, 12), 0x1c1a18, { p: L(0, H + 0.068, sz) });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addRod(L(Math.cos(a) * 0.009, H + 0.058, sz + Math.sin(a) * 0.009), L(Math.cos(a) * 0.009, H + 0.079, sz + Math.sin(a) * 0.009), 0.0014, 0x625b50, 6);
    }
    addGeo(new THREE.ConeGeometry(0.012, 0.058, 12, 6), 0x1c282e, { p: L(0, H + 0.108, sz), colorFn: slateColor });
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0012, 0.014, 6), 0x9c7b38, { p: L(0, H + 0.142, sz) });

    // Patio de Entrada con galería porticada y torreta circular frontal-izquierda
    const PW = 0.074, PD = 0.058, zPat = 0.060;
    addSubBox(PW, 0.006, PD, 12, 1, 10, L(0, 0.003, zPat), rot, y0, (va, vb, vc) => {
      const ix = Math.floor((va.x + vb.x + vc.x) * 45), iz = Math.floor((va.z + vb.z + vc.z) * 45);
      return jitter((ix + iz) % 2 ? 0x4e4941 : 0x3e3a34, 0.04);
    });
    for (const side of [-1, 1]) {
      addSubBox(0.011, 0.028, PD, 3, 4, 10, L(side * PW / 2, 0.014, zPat), rot, y0);
      addCrenels(L(side * PW / 2, 0.028, zPat - PD / 2), L(side * PW / 2, 0.028, zPat + PD / 2), y0 + 0.028, 0.0085);
    }
    addSubBox(PW, 0.028, 0.010, 10, 4, 2, L(0, 0.014, zPat + PD / 2), rot, y0);
    addCrenels(L(-PW / 2, 0.028, zPat + PD / 2), L(PW / 2, 0.028, zPat + PD / 2), y0 + 0.028, 0.0085);
    // Torreta circular esquina suroeste del patio donde arranca la Escalinata en Zigzag
    const stStart = L(-PW / 2 - 0.004, 0, zPat + PD / 2);
    addGeo(new THREE.CylinderGeometry(0.011, 0.012, 0.058, 16, 4), 0x625b50, { p: [stStart[0], y0 + 0.024, stStart[2]], colorFn: stoneColor(y0) });
    addGeo(new THREE.ConeGeometry(0.014, 0.032, 16, 4), 0x1c282e, { p: [stStart[0], y0 + 0.068, stStart[2]], colorFn: slateColor });
    features.push({ type: 'flame', pos: L(-0.016, 0.032, zPat + PD / 2 + 0.006), size: 0.0055 });
    features.push({ type: 'flame', pos: L(0.016, 0.032, zPat + PD / 2 + 0.006), size: 0.0055 });

    // ESCALINATA EN ZIGZAG (Z-shape de 3 tramos largos contenida 100% dentro de la bahía y sobre FLOOR)
    const zigPts = [
      [stStart[0] - 0.005, y0 + 0.002, stStart[2] + 0.008],
      [-0.295, 0.074, 0.172],
      [-0.250, 0.038, 0.205],
      [-0.275, 0.012, 0.236],
    ];
    for (let leg = 0; leg < 3; leg++) {
      const A = zigPts[leg], B = zigPts[leg + 1];
      const steps = 12;
      const yaw = Math.atan2(B[0] - A[0], B[2] - A[2]);
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        const px = A[0] + (B[0] - A[0]) * t, py = A[1] + (B[1] - A[1]) * t, pz = A[2] + (B[2] - A[2]) * t;
        const gY = Math.max(FLOOR + 0.006, Math.min(height(px, pz), 0) - 0.012);
        const hCol = Math.max(0.016, py - gY);
        addSubBox(0.018, hCol, 0.012, 2, 4, 2, [px, py - hCol / 2, pz], yaw, gY);
        for (const sw of [-0.008, 0.008]) {
          addGeo(new THREE.BoxGeometry(0.003, 0.007, 0.011), 0x5c554b, {
            p: [px + Math.cos(yaw) * sw, py + 0.0035, pz - Math.sin(yaw) * sw], r: [0, yaw, 0],
          });
        }
      }
      const pierBot = FLOOR + 0.008;
      const pierH = Math.max(0.020, B[1] - pierBot);
      addSubBox(0.024, pierH, 0.024, 3, 5, 3, [B[0], pierBot + pierH / 2, B[2]], 0);
    }
  }

  // EMBARCADERO GÓTICO Y 5 BOTES DENTRO DE LA BAHÍA SUROESTE
  {
    const bx = -0.202, bz = 0.228;
    addSubBox(0.058, 0.055, 0.062, 6, 6, 6, [bx, -0.022, bz], 0, -0.05);
    addSubBox(0.052, 0.038, 0.056, 8, 6, 8, [bx, 0.026, bz], 0, 0.006);
    addGableZ([bx, 0.045, bz], 0, 0.058, 0.028, 0.060, slateColor);
    addSubBox(0.060, 0.028, 0.030, 8, 4, 4, [bx, 0.020, bz - 0.008], 0, 0.006);
    addGableX([bx, 0.034, bz - 0.008], 0, 0.062, 0.022, 0.032, slateColor);
    addGeo(new THREE.BoxGeometry(0.024, 0.026, 0.008), 0x141210, { p: [bx, 0.018, bz + 0.025] });
    addGeo(new THREE.CylinderGeometry(0.010, 0.012, 0.070, 16, 5), 0x625b50, { p: [bx + 0.024, 0.032, bz - 0.014], colorFn: stoneColor(0) });
    addGeo(new THREE.ConeGeometry(0.014, 0.030, 16, 4), 0x1c282e, { p: [bx + 0.024, 0.082, bz - 0.014], colorFn: slateColor });
    addDetailWin([bx - 0.026, 0.028, bz], -Math.PI / 2, 0.010, 0.014, true);
    features.push({ type: 'flame', pos: [bx - 0.016, 0.028, bz + 0.031], size: 0.005 });
    features.push({ type: 'flame', pos: [bx + 0.016, 0.028, bz + 0.031], size: 0.005 });

    for (let i = 0; i < 6; i++) {
      addGeo(new THREE.BoxGeometry(0.028, 0.004, 0.0065, 3, 1, 1), 0x3b281a, { p: [bx, 0.009, bz + 0.032 + i * 0.0075], colorFn: woodColor });
    }
    const boats = [
      [-0.145, 0.278, -0.35], [-0.088, 0.268, -0.52], [-0.035, 0.242, -0.68],
      [-0.225, 0.285, 0.18],  [-0.285, 0.258, 0.42],
    ];
    for (const [x, z, r] of boats) {
      const ang = Math.atan2(z - CZ, x - CX);
      if (Math.hypot(x - CX, z - CZ) > rimRadius(ang) * 0.86 || height(x, z) > -0.008) continue;
      addGeo(new THREE.CylinderGeometry(0.011, 0.0055, 0.014, 14, 2), 0x3b2618, { p: [x, -0.001, z], r: [0, r, 0], s: [0.85, 1, 2.1], colorFn: woodColor });
      const lx = x + Math.sin(r) * 0.017, lz = z + Math.cos(r) * 0.017;
      addRod([lx, 0.006, lz], [lx, 0.022, lz], 0.0018, 0x22252a, 6);
      addGeo(new THREE.BoxGeometry(0.0055, 0.0065, 0.0055), 0xffdd78, { p: [lx, 0.024, lz], r: [0, r, 0] });
      features.push({ type: 'city', pos: [lx, 0.025, lz], size: 0.0075 });
    }
  }

  // =====================================================================
  // 3. GRAN TORRE DE LA ESCALERA (CON PILARES ALTOS Y TORRECILLA LATERAL) + CLAUSTRO PRINCIPAL
  // =====================================================================
  {
    const y0 = 0.148;
    const kx = -0.155, kz = 0.012;
    // Altos pilares verticales bajando por el acantilado bajo el Torreón (vista 1 y 4 de referencia)
    for (let i = 0; i < 6; i++) {
      const a = -0.4 + i * 0.42;
      const px = kx + Math.sin(a) * 0.044, pz = kz + Math.cos(a) * 0.044;
      addSubBox(0.008, 0.155, 0.008, 2, 10, 2, [px, y0 - 0.076, pz], a, 0);
    }
    addGeo(new THREE.CylinderGeometry(0.052, 0.058, 0.060, 64, 8), 0x45413c, { p: [kx, y0 - 0.024, kz], colorFn: stoneColor(y0 - 0.05) });

    // Cuerpo cilíndrico monumental (64 lados x 28 segmentos)
    const kh = 0.178, kr = 0.046;
    addGeo(displaceGeo(new THREE.CylinderGeometry(kr * 0.96, kr, kh, 64, 28), 0.00035), 0x6a6357, {
      p: [kx, y0 + kh / 2, kz], colorFn: stoneColor(y0),
    });
    for (const ry of [0.035, 0.075, 0.118, 0.155, 0.172]) {
      const rr = kr * (1 - (ry / kh) * 0.04) + 0.0025;
      addGeo(new THREE.CylinderGeometry(rr, rr, 0.0048, 64), 0x4f4940, { p: [kx, y0 + ry, kz] });
    }
    // Corona acampanada superior con 24 ménsulas y 16 ventanitas cuadradas alrededor
    addGeo(new THREE.CylinderGeometry(kr * 1.05, kr * 0.96, 0.018, 64, 4), 0x5c554b, { p: [kx, y0 + kh + 0.009, kz], colorFn: stoneColor(y0 + kh) });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0032, 0.006, 0.0045), 0x4b453d, { p: [kx + Math.sin(a) * (kr * 0.97), y0 + kh - 0.002, kz + Math.cos(a) * (kr * 0.97)], r: [0, a, 0] });
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      addDetailWin([kx + Math.sin(a) * (kr * 1.01), y0 + kh + 0.009, kz + Math.cos(a) * (kr * 1.01)], a, 0.0055, 0.009, false);
    }
    // Altísimo chapitel cónico (H = 0.135) con 3 anillos de lucarnas (como en la referencia)
    addGeo(displaceGeo(new THREE.ConeGeometry(kr * 1.12, 0.135, 64, 24), 0.00025), 0x1c282e, {
      p: [kx, y0 + kh + 0.084, kz], colorFn: slateColor,
    });
    addGeo(new THREE.CylinderGeometry(0.0014, 0.0022, 0.024, 8), 0x9c7b38, { p: [kx, y0 + kh + 0.160, kz] });
    for (const [ry, n, wr] of [[0.034, 10, 0.80], [0.068, 8, 0.56], [0.100, 6, 0.34]]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ry * 4;
        addDormer([kx + Math.sin(a) * (kr * wr), y0 + kh + ry, kz + Math.cos(a) * (kr * wr)], a, 0.0068, 0.009, 0.0085);
      }
    }
    // Torrecilla lateral alta adosada al cono (característica icónica del Gran Torreón!)
    {
      const sa = 0.75, bx = kx + Math.sin(sa) * (kr * 0.72), bz = kz + Math.cos(sa) * (kr * 0.72);
      addGeo(new THREE.CylinderGeometry(0.009, 0.010, 0.072, 20, 6), 0x625b50, { p: [bx, y0 + kh + 0.042, bz], colorFn: stoneColor(y0 + kh) });
      addGeo(new THREE.ConeGeometry(0.012, 0.042, 20, 4), 0x1c282e, { p: [bx, y0 + kh + 0.098, bz], colorFn: slateColor });
    }
    // Ventanas en espiral en el cuerpo del Torreón
    for (let i = 0; i < 16; i++) {
      const a = i * 0.78;
      const wy = y0 + 0.025 + i * 0.0092;
      addDetailWin([kx + Math.sin(a) * (kr - 0.0005), wy, kz + Math.cos(a) * (kr - 0.0005)], a, 0.007, 0.016, true);
    }

    // EL GRAN CLAUSTRO CUADRANGULAR (Main Quad) en (-0.145, -0.095) detrás del Torreón
    {
      const qx = -0.145, qz = -0.095, qW = 0.118, qD = 0.104, wingW = 0.028, wingH = 0.082;
      addSubBox(qW, 0.048, qD, 12, 4, 10, [qx, y0 - 0.020, qz], 0, y0 - 0.04);
      // Ala Norte y Ala Sur
      for (const sz of [-qD / 2 + wingW / 2, qD / 2 - wingW / 2]) {
        const wz = qz + sz;
        addSubBox(qW, wingH, wingW, 18, 12, 4, [qx, y0 + wingH / 2, wz], 0, y0);
        addGableX([qx, y0 + wingH, wz], 0, qW + 0.006, 0.030, wingW + 0.006, slateColor);
        const outYaw = sz > 0 ? 0 : Math.PI;
        for (let i = 0; i < 6; i++) {
          const bx = qx - 0.048 + i * 0.019;
          addButtress([bx, y0, wz + Math.sign(sz) * (wingW / 2 + 0.001)], outYaw, wingH * 0.90, 0.007, 0.006);
          if (i < 5) {
            const wx = bx + 0.0095;
            addDetailWin([wx, y0 + 0.052, wz + Math.sign(sz) * (wingW / 2 + 0.001)], outYaw, 0.008, 0.020, true);
            addDetailWin([wx, y0 + 0.022, wz + Math.sign(sz) * (wingW / 2 + 0.001)], outYaw, 0.007, 0.014, true);
            addDormer([wx, y0 + wingH + 0.015, wz + Math.sign(sz) * (wingW * 0.28)], outYaw, 0.007, 0.009, 0.0085);
          }
        }
      }
      // Ala Oeste y Ala Este
      for (const sx of [-qW / 2 + wingW / 2, qW / 2 - wingW / 2]) {
        const wx = qx + sx;
        addSubBox(wingW, wingH, qD - wingW * 1.4, 4, 12, 14, [wx, y0 + wingH / 2, qz], 0, y0);
        addGableZ([wx, y0 + wingH, qz], 0, wingW + 0.006, 0.030, qD - wingW * 1.2, slateColor);
        const outYaw = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
        for (let i = 0; i < 4; i++) {
          const bz = qz - 0.028 + i * 0.0185;
          addButtress([wx + Math.sign(sx) * (wingW / 2 + 0.001), y0, bz], outYaw, wingH * 0.90, 0.007, 0.006);
          if (i < 3) {
            const wz = bz + 0.009;
            addDetailWin([wx + Math.sign(sx) * (wingW / 2 + 0.001), y0 + 0.052, wz], outYaw, 0.008, 0.020, true);
            addDetailWin([wx + Math.sign(sx) * (wingW / 2 + 0.001), y0 + 0.022, wz], outYaw, 0.007, 0.014, true);
            addDormer([wx + Math.sign(sx) * (wingW * 0.28), y0 + wingH + 0.015, wz], outYaw, 0.007, 0.009, 0.0085);
          }
        }
      }
      // Torres esquineras en el Claustro + conector al Gran Comedor
      for (const [tx, tz, th, cr] of [[qx - 0.058, qz + 0.048, 0.105, 0.013], [qx + 0.058, qz + 0.046, 0.115, 0.014], [qx + 0.056, qz - 0.048, 0.125, 0.015]]) {
        addGeo(new THREE.CylinderGeometry(cr, cr * 1.05, th, 20, 8), 0x625b50, { p: [tx, y0 + th / 2, tz], colorFn: stoneColor(y0) });
        addGeo(new THREE.ConeGeometry(cr * 1.25, 0.048, 20, 4), 0x1c282e, { p: [tx, y0 + th + 0.024, tz], colorFn: slateColor });
      }
      addSubBox(0.058, 0.072, 0.052, 8, 8, 8, [-0.195, y0 + 0.006, -0.022], 0.25, y0 - 0.03);
      addGableZ([-0.195, y0 + 0.042, -0.022], 0.25, 0.060, 0.028, 0.054, slateColor);
    }
  }

  // =====================================================================
  // 4. ALA OESTE: TORRE DEL RELOJ (FIEL A VISTA 4) Y PUENTE DE MADERA CON CELOSÍA
  // =====================================================================
  {
    const cx = -0.258, cz = -0.068, y0 = 0.125, rot = 0.42;
    const L = makeLocal(cx, y0, cz, rot);
    const tw = 0.046, td = 0.038, th = 0.120;
    addSubBox(tw + 0.010, 0.080, td + 0.010, 8, 10, 6, L(0, -0.035, 0), rot, y0 - 0.06);
    addSubBox(tw, th, td, 8, 16, 6, L(0, th / 2, 0), rot, y0);
    // Tejado muy empinado a dos aguas con doble fila de buhardillas y flèche central (como en vista 4!)
    addGableZ(L(0, th, 0), rot, tw + 0.008, 0.058, td + 0.008, slateColor);
    addGeo(new THREE.ConeGeometry(0.0055, 0.044, 8, 4), 0x1c282e, { p: L(0, th + 0.074, 0), colorFn: slateColor });
    for (const side of [-1, 1]) {
      const yaw = rot + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      addDormer(L(side * tw * 0.30, th + 0.018, -0.008), yaw, 0.007, 0.009, 0.008);
      addDormer(L(side * tw * 0.30, th + 0.018, 0.008), yaw, 0.007, 0.009, 0.008);
      addDormer(L(side * tw * 0.15, th + 0.036, 0), yaw, 0.006, 0.008, 0.007);
    }
    // Dos torretas cuadradas laterales adosadas a la Torre del Reloj (vista 4)
    for (const sx of [-1, 1]) {
      addSubBox(0.014, th + 0.012, 0.014, 3, 12, 3, L(sx * (tw / 2 + 0.004), (th + 0.012) / 2, 0), rot, y0);
      addGeo(new THREE.ConeGeometry(0.010, 0.036, 4, 3), 0x1c282e, { p: L(sx * (tw / 2 + 0.004), th + 0.030, 0), r: [0, rot + Math.PI / 4, 0], colorFn: slateColor });
    }
    // Gran arco gótico con el Reloj 3D y tracería en la cara oeste-noroeste (-X / -Z local)
    for (const [sgn, yawFace] of [[1, rot], [-1, rot + Math.PI]]) {
      const fz = sgn * (td / 2 + 0.0018), fy = th - 0.022;
      addGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.004, 20), 0x4f4940, { p: L(0, fy, fz), r: [Math.PI / 2, yawFace, 0] });
      addGeo(new THREE.CylinderGeometry(0.0105, 0.0105, 0.0048, 20), 0x9c7b38, { p: L(0, fy, fz + sgn * 0.0006), r: [Math.PI / 2, yawFace, 0] });
      addGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.0054, 20), 0xd8ceb2, { p: L(0, fy, fz + sgn * 0.0012), r: [Math.PI / 2, yawFace, 0] });
      for (let m = 0; m < 12; m++) {
        const ma = (m / 12) * Math.PI * 2;
        addGeo(new THREE.BoxGeometry(0.0009, 0.0020, 0.0015), 0x1e2024, {
          p: L(Math.sin(ma) * 0.0072, fy + Math.cos(ma) * 0.0072, fz + sgn * 0.0038), r: [0, yawFace, -ma],
        });
      }
      addGeo(new THREE.BoxGeometry(0.0014, 0.007, 0.0018), 0x16181c, { p: L(-0.0012, fy + 0.002, fz + sgn * 0.0044), r: [0, yawFace, 0.5] });
      addGeo(new THREE.BoxGeometry(0.0014, 0.005, 0.0018), 0x16181c, { p: L(0.0015, fy + 0.001, fz + sgn * 0.0044), r: [0, yawFace, -0.95] });
      addDetailWin(L(0, fy - 0.032, fz), yawFace, 0.014, 0.036, true);
    }
    // Muralla almenada uniendo Torre del Reloj con el Patio y el Gran Torreón
    addSubBox(0.068, 0.042, 0.014, 10, 5, 2, [-0.210, 0.115 + 0.016, -0.042], 0.25, 0.11);
    addCrenels([-0.242, 0.115 + 0.037, -0.035], [-0.178, 0.115 + 0.037, -0.050], 0.115 + 0.037, 0.0085);

    // PUENTE CUBIERTO DE MADERA (WOODEN BRIDGE) CON RETICULADO COMPLETO EN CELOSÍA (vista 4!)
    {
      const bx0 = -0.278, by0 = 0.126, bz0 = -0.078;
      const bx1 = -0.405, by1 = 0.088, bz1 = -0.138;
      const dx = bx1 - bx0, dy = by1 - by0, dz = bz1 - bz0;
      const lenXZ = Math.hypot(dx, dz), fullLen = Math.hypot(dx, dy, dz);
      const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, lenXZ);
      const qBridge = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      const mid = [(bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2];

      // Tablero, paredes entramadas y techo a dos aguas
      addGeo(new THREE.BoxGeometry(0.019, 0.0045, fullLen + 0.010, 4, 1, 20), 0x3b281a, { p: mid, q: qBridge, colorFn: woodColor });
      addGeo(new THREE.BoxGeometry(0.022, 0.005, fullLen + 0.010, 4, 1, 20), 0x1c282e, { p: [mid[0], mid[1] + 0.024, mid[2]], q: qBridge, colorFn: slateColor });
      // Casetas de entrada en piedra/madera en ambos extremos del puente
      for (const [ex, ey, ez] of [[bx0, by0, bz0], [bx1, by1, bz1]]) {
        addSubBox(0.026, 0.032, 0.022, 3, 4, 3, [ex, ey + 0.012, ez], yaw);
        addGableZ([ex, ey + 0.028, ez], yaw, 0.028, 0.018, 0.024, slateColor);
      }
      // 14 tramos de celosía de madera densa bajando hasta la garganta con arco central libre
      const bays = 14;
      for (let i = 0; i <= bays; i++) {
        const t = i / bays;
        const px = bx0 + dx * t, py = by0 + dy * t, pz = bz0 + dz * t;
        const groundY = height(px, pz) - 0.014;
        // En el tercio central, las patas dejan un arco inferior tal como en la vista 4!
        const archLift = (t > 0.30 && t < 0.70) ? Math.sin((t - 0.30) / 0.40 * Math.PI) * 0.028 : 0;
        const botY = Math.max(groundY, groundY + archLift);
        for (const side of [-0.008, 0.008]) {
          const ox = Math.cos(yaw) * side, oz = -Math.sin(yaw) * side;
          addRod([px + ox, botY, pz + oz], [px + ox, py + 0.023, pz + oz], 0.0014, 0x382518, 5);
          if (i < bays) {
            const tn = (i + 1) / bays;
            const nx = bx0 + dx * tn, ny = by0 + dy * tn, nz = bz0 + dz * tn;
            const archLiftN = (tn > 0.30 && tn < 0.70) ? Math.sin((tn - 0.30) / 0.40 * Math.PI) * 0.028 : 0;
            const botYN = Math.max(height(nx, nz) - 0.014, height(nx, nz) - 0.014 + archLiftN);
            // 3 niveles de cruces en X formando todo el reticulado visible en la vista 4
            for (let lv = 0; lv < 3; lv++) {
              const f0 = lv / 3, f1 = (lv + 1) / 3;
              const yA0 = botY + (py - botY) * f0, yA1 = botY + (py - botY) * f1;
              const yB0 = botYN + (ny - botYN) * f0, yB1 = botYN + (ny - botYN) * f1;
              addRod([px + ox, yA0, pz + oz], [nx + ox, yB1, nz + oz], 0.0010, 0x473020, 4);
              addRod([px + ox, yA1, pz + oz], [nx + ox, yB0, nz + oz], 0.0010, 0x473020, 4);
            }
            // Baranda superior en X
            addRod([px + ox, py + 0.003, pz + oz], [nx + ox, ny + 0.021, nz + oz], 0.0010, 0x473020, 4);
            addRod([px + ox, py + 0.021, pz + oz], [nx + ox, ny + 0.003, nz + oz], 0.0010, 0x473020, 4);
          }
        }
        // Travesaños transversales
        addRod([px - Math.cos(yaw) * 0.008, (botY + py) * 0.5, pz + Math.sin(yaw) * 0.008],
               [px + Math.cos(yaw) * 0.008, (botY + py) * 0.5, pz - Math.sin(yaw) * 0.008], 0.0012, 0x2e1f14, 4);
      }
    }
  }

  // =====================================================================
  // 5. EL GRAN VIADUCTO DE 8 PILARES ESBELTOS (VISTA 1 Y 2 DE REFERENCIA)
  // =====================================================================
  {
    const vx0 = -0.118, vx1 = 0.016, vz = 0.025, vyDeck = 0.122;
    const spans = 7, spanLen = (vx1 - vx0) / spans;
    for (let i = 0; i <= spans; i++) {
      const px = vx0 + i * spanLen;
      const pBot = -0.048, ph = vyDeck - pBot;
      // Pilares esbeltos dobles bajando por toda la garganta (como en las vistas 1 y 2)
      addSubBox(0.0068, ph, 0.024, 2, 14, 4, [px, pBot + ph / 2, vz], 0, -0.04);
      addGeo(new THREE.BoxGeometry(0.009, 0.032, 0.028), 0x4f4940, { p: [px, 0.005, vz], amt: 0.05 });
    }
    for (let i = 0; i < spans; i++) {
      const ax = vx0 + (i + 0.5) * spanLen;
      const clearR = (spanLen - 0.0068) / 2;
      addSubBox(spanLen, 0.011, 0.022, 4, 2, 3, [ax, vyDeck - 0.005, vz], 0);
      for (let d = 0; d < 7; d++) {
        const ang = -Math.PI * 0.42 + (d / 6) * Math.PI * 0.84;
        addGeo(new THREE.BoxGeometry(0.0045, 0.007, 0.020), d % 2 ? 0x676054 : 0x595248, {
          p: [ax + Math.sin(ang) * clearR, vyDeck - 0.018 + Math.cos(ang) * clearR * 0.85, vz], r: [0, 0, -ang],
        });
      }
      if (i % 2 === 0) {
        for (const zs of [-0.011, 0.011]) {
          addGeo(new THREE.BoxGeometry(0.0035, 0.010, 0.0035), 0x22252a, { p: [ax, vyDeck + 0.012, vz + zs] });
          addGeo(new THREE.BoxGeometry(0.005, 0.0055, 0.005), 0xffdb78, { p: [ax, vyDeck + 0.019, vz + zs] });
          features.push({ type: 'city', pos: [ax, vyDeck + 0.020, vz + zs], size: 0.006 });
        }
      }
    }
    addSubBox(vx1 - vx0 + 0.010, 0.005, 0.026, 16, 1, 3, [(vx0 + vx1) / 2, vyDeck + 0.001, vz], 0);
    for (const zs of [-0.011, 0.011]) {
      addSubBox(vx1 - vx0 + 0.008, 0.008, 0.0038, 16, 1, 1, [(vx0 + vx1) / 2, vyDeck + 0.007, vz + zs], 0);
      addCrenels([vx0, vyDeck + 0.011, vz + zs], [vx1, vyDeck + 0.011, vz + zs], vyDeck + 0.011, 0.0095, 0.0038, 0.004, 0.0038);
    }
  }

  // =====================================================================
  // 6. BASTIÓN CENTRAL, TORRE DE ASTRONOMÍA, PABELLÓN DE ENTRADA,
  //    GALERÍA LARGA, CLAUSTRO ESTE Y TORRES GEMELAS DE LAS CAMPANAS
  // =====================================================================
  {
    const y0 = 0.125;

    // TORRE BASTIÓN CIRCULAR en el extremo este del Viaducto (+0.016, +0.025)
    {
      const bx = 0.016, bz = 0.025;
      addGeo(new THREE.CylinderGeometry(0.024, 0.029, 0.145, 28, 10), 0x4b453d, { p: [bx, y0 - 0.068, bz], colorFn: stoneColor(-0.02) });
      addGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.092, 28, 10), 0x6a6357, { p: [bx, y0 + 0.046, bz], colorFn: stoneColor(y0) });
      addGeo(new THREE.CylinderGeometry(0.025, 0.022, 0.008, 28), 0x4f4940, { p: [bx, y0 + 0.095, bz] });
      addGeo(new THREE.ConeGeometry(0.026, 0.056, 28, 6), 0x1c282e, { p: [bx, y0 + 0.126, bz], colorFn: slateColor });
      for (const ang of [0, 1.5, 3.1, 4.7]) {
        addDetailWin([bx + Math.sin(ang) * 0.0225, y0 + 0.058, bz + Math.cos(ang) * 0.0225], ang, 0.007, 0.018, true);
      }
    }

    // LA TORRE DE ASTRONOMÍA (+0.048, -0.040) — aguja más alta del bloque oriental
    {
      const ax = 0.048, az = -0.040, ah = 0.205, ar = 0.026;
      addGeo(new THREE.CylinderGeometry(0.032, 0.036, 0.050, 48, 6), 0x45413c, { p: [ax, y0 - 0.018, az], colorFn: stoneColor(y0 - 0.04) });
      addGeo(displaceGeo(new THREE.CylinderGeometry(ar * 0.92, ar, ah, 48, 24), 0.0003), 0x6d665a, { p: [ax, y0 + ah / 2, az], colorFn: stoneColor(y0) });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.4;
        addButtress([ax + Math.sin(a) * ar, y0, az + Math.cos(a) * ar], a, 0.095, 0.008, 0.007);
      }
      const gy = y0 + ah;
      addGeo(new THREE.CylinderGeometry(0.035, 0.027, 0.014, 28), 0x524c43, { p: [ax, gy + 0.005, az] });
      addGeo(new THREE.CylinderGeometry(0.021, 0.021, 0.024, 16), 0x1a1918, { p: [ax, gy + 0.022, az] });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        addRod([ax + Math.cos(a) * 0.031, gy + 0.010, az + Math.sin(a) * 0.031], [ax + Math.cos(a) * 0.031, gy + 0.034, az + Math.sin(a) * 0.031], 0.0017, 0x6b6458, 6);
      }
      addGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.005, 28), 0x524c43, { p: [ax, gy + 0.035, az] });
      for (let i = 0; i < 4; i++) {
        const pa = (i * Math.PI) / 2 + Math.PI / 4;
        const px = ax + Math.cos(pa) * 0.029, pz = az + Math.sin(pa) * 0.029;
        addGeo(new THREE.CylinderGeometry(0.005, 0.0055, 0.028, 16, 4), 0x6a6357, { p: [px, gy + 0.044, pz] });
        addGeo(new THREE.ConeGeometry(0.007, 0.024, 16, 4), 0x1c282e, { p: [px, gy + 0.068, pz], colorFn: slateColor });
      }
      addGeo(displaceGeo(new THREE.ConeGeometry(0.030, 0.130, 48, 18), 0.00025), 0x1c282e, { p: [ax, gy + 0.098, az], colorFn: slateColor });
      const sy = gy + 0.174;
      addGeo(new THREE.CylinderGeometry(0.0015, 0.0022, 0.020, 8), 0x9c7b38, { p: [ax, sy - 0.008, az] });
      addGeo(new THREE.TorusGeometry(0.0075, 0.0014, 8, 20), 0x9c7b38, { p: [ax, sy + 0.003, az], r: [0.5, 0.2, 0] });
      addGeo(new THREE.TorusGeometry(0.0075, 0.0014, 8, 20), 0x9c7b38, { p: [ax, sy + 0.003, az], r: [-0.5, 1.3, 0] });
      addGeo(new THREE.SphereGeometry(0.003, 8, 6), 0xb89344, { p: [ax, sy + 0.003, az] });
      features.push({ type: 'flame', pos: [ax, gy + 0.026, az + 0.032], size: 0.006 });

      for (const ang of [0.1, 1.65, 3.2, 4.75]) {
        addDetailWin([ax + Math.sin(ang) * ar, y0 + 0.068, az + Math.cos(ang) * ar], ang, 0.008, 0.022, true);
        addDetailWin([ax + Math.sin(ang) * ar * 0.96, y0 + 0.120, az + Math.cos(ang) * ar * 0.96], ang, 0.008, 0.020, true);
        addDetailWin([ax + Math.sin(ang) * ar * 0.93, y0 + 0.168, az + Math.cos(ang) * ar * 0.93], ang, 0.007, 0.016, true);
      }
    }

    // PABELLÓN DE ENTRADA DEL VIADUCTO (+0.092, +0.012) con fachada hastial y gran arco apuntado
    {
      const px = 0.092, pz = 0.012, pw = 0.048, ph = 0.072, pd = 0.068;
      addSubBox(pw, ph, pd, 8, 12, 10, [px, y0 + ph / 2, pz], 0, y0);
      addGableZ([px, y0 + ph, pz], 0, pw + 0.008, 0.036, pd + 0.008, slateColor);
      addDetailWin([px, y0 + ph * 0.60, pz + pd / 2 + 0.001], 0, 0.020, 0.034, true);
      for (const sx of [-1, 1]) {
        addGeo(new THREE.CylinderGeometry(0.0055, 0.006, ph + 0.018, 12, 5), 0x625b50, { p: [px + sx * (pw / 2), y0 + (ph + 0.018) / 2, pz + pd / 2], colorFn: stoneColor(y0) });
        addGeo(new THREE.ConeGeometry(0.0075, 0.024, 12, 3), 0x1c282e, { p: [px + sx * (pw / 2), y0 + ph + 0.030, pz + pd / 2], colorFn: slateColor });
      }
    }

    // LA GALERÍA LARGA (LONG GALLERY) (+0.182, -0.005) Y CLAUSTRO ESTE (+0.182, -0.068)
    {
      const gx = 0.182, gz = -0.005, gw = 0.135, gh = 0.062, gd = 0.036;
      addSubBox(gw, gh, gd, 22, 10, 6, [gx, y0 + gh / 2, gz], 0, y0);
      addGableX([gx, y0 + gh, gz], 0, gw + 0.008, 0.028, gd + 0.008, slateColor);
      for (let i = 0; i < 7; i++) {
        const bx = gx - 0.057 + i * 0.019;
        addButtress([bx, y0, gz + gd / 2 + 0.001], 0, gh * 0.90, 0.007, 0.006);
        if (i < 6) {
          addDetailWin([bx + 0.0095, y0 + gh * 0.56, gz + gd / 2 + 0.001], 0, 0.0085, 0.024, true);
          addDormer([bx + 0.0095, y0 + gh + 0.014, gz + gd * 0.28], 0, 0.0068, 0.009, 0.008);
        }
      }
      // Claustro Este detrás de la Galería Larga
      const ex = 0.182, ez = -0.068, ew = 0.112, ed = 0.062;
      addSubBox(ew, gh, 0.024, 18, 10, 4, [ex, y0 + gh / 2, ez - ed / 2 + 0.012], 0, y0);
      addGableX([ex, y0 + gh, ez - ed / 2 + 0.012], 0, ew + 0.006, 0.026, 0.028, slateColor);
      addSubBox(0.024, gh, ed, 4, 10, 10, [ex - ew / 2 + 0.012, y0 + gh / 2, ez], 0, y0);
      addGableZ([ex - ew / 2 + 0.012, y0 + gh, ez], 0, 0.028, 0.026, ed + 0.006, slateColor);
      for (let i = 0; i < 5; i++) {
        addDetailWin([ex - 0.040 + i * 0.020, y0 + gh * 0.55, ez - ed / 2 - 0.001], Math.PI, 0.008, 0.020, true);
      }
    }

    // LAS TORRES GEMELAS DE LAS CAMPANAS (Vistas 1, 2 y 3 de la referencia: 4 pisos + pináculos!)
    for (const tz of [-0.042, 0.016]) {
      const tx = 0.264, tw = 0.036, th = 0.138;
      addSubBox(tw + 0.008, 0.060, tw + 0.008, 6, 6, 6, [tx, y0 - 0.028, tz], 0, y0 - 0.05);
      addSubBox(tw, th, tw, 8, 20, 8, [tx, y0 + th / 2, tz], 0, y0);
      // 4 cornisas horizontales de separación entre pisos + contrafuertes en las 4 esquinas
      for (const ry of [0.034, 0.068, 0.102, 0.134]) {
        addGeo(new THREE.BoxGeometry(tw + 0.005, 0.004, tw + 0.005), 0x4f4940, { p: [tx, y0 + ry, tz] });
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const cx = tx + sx * (tw / 2 + 0.001), cz = tz + sz * (tw / 2 + 0.001);
        addGeo(new THREE.BoxGeometry(0.005, th, 0.005, 1, 10, 1), 0x565046, { p: [cx, y0 + th / 2, cz] });
        addGeo(new THREE.ConeGeometry(0.0045, 0.022, 4, 2), 0x4f4940, { p: [cx, y0 + th + 0.011, cz], r: [0, Math.PI / 4, 0] });
      }
      // Alto chapitel octogonal (como en vista 3)
      addGeo(displaceGeo(new THREE.ConeGeometry(tw * 0.66, 0.072, 16, 8), 0.0002), 0x1c282e, {
        p: [tx, y0 + th + 0.036, tz], colorFn: slateColor,
      });
      // Ventanales geminados en los 3 pisos superiores en las caras exteriores
      for (const fy of [0.050, 0.085, 0.118]) {
        for (const off of [-0.007, 0.007]) {
          addDetailWin([tx + tw / 2 + 0.001, y0 + fy, tz + off], Math.PI / 2, 0.0075, 0.022, true);
          const frontZ = tz > -0.01 ? tz + tw / 2 + 0.001 : tz - tw / 2 - 0.001;
          addDetailWin([tx + off, y0 + fy, frontZ], tz > -0.01 ? 0 : Math.PI, 0.0075, 0.022, true);
        }
      }
    }
  }

  // =====================================================================
  // 7. TERRAZA ESTE: 4 INVERNADEROS PARALELOS Y ROTONDA BOTÁNICA CON CÚPULA
  // =====================================================================
  {
    const y0 = 0.078;
    const glassFn = (va, vb, vc) => {
      const cx = (va.x + vb.x + vc.x) / 3, cz = (va.z + vb.z + vc.z) / 3;
      const grid = (Math.floor(cx * 120) + Math.floor(cz * 120)) & 1;
      return jitter(grid ? 0x457d87 : 0x5996a1, 0.04);
    };

    // Muralla baja de contención alrededor de la terraza de los invernaderos
    addSubBox(0.220, 0.048, 0.095, 16, 6, 8, [0.245, y0 - 0.024, 0.075], 0, 0.02);
    addSubBox(0.224, 0.012, 0.006, 20, 2, 1, [0.245, y0 + 0.006, 0.120], 0);
    addCrenels([0.138, y0 + 0.012, 0.120], [0.352, y0 + 0.012, 0.120], y0 + 0.012, 0.011);

    // 4 Invernaderos largos paralelos (como en vista 2 de referencia!)
    for (let i = 0; i < 4; i++) {
      const gx = 0.155 + i * 0.036, gz = 0.078, gw = 0.024, gd = 0.062;
      addSubBox(gw, 0.009, gd, 3, 1, 6, [gx, y0 + 0.0045, gz], 0, y0);
      addGeo(new THREE.BoxGeometry(gw - 0.003, 0.016, gd - 0.003, 3, 2, 6), 0x4a8691, { p: [gx, y0 + 0.017, gz], colorFn: glassFn });
      addGableZ([gx, y0 + 0.025, gz], 0, gw, 0.015, gd, glassFn, glassFn);
      for (const rz of [-0.020, 0, 0.020]) {
        addGeo(new THREE.BoxGeometry(gw + 0.001, 0.018, 0.0022), 0x1c2026, { p: [gx, y0 + 0.017, gz + rz] });
      }
      features.push({ type: 'sparkle', pos: [gx, y0 + 0.042, gz], size: 0.0085 });
      features.push({ type: 'city', pos: [gx, y0 + 0.018, gz], size: 0.0075 });
    }

    // ROTONDA BOTÁNICA CON CÚPULA DE CRISTAL NERVADA en el extremo este (+0.332, +0.045, vistas 1 y 3!)
    {
      const rx = 0.332, rz = 0.045;
      addSubBox(0.056, 0.050, 0.056, 6, 5, 6, [rx, y0 - 0.018, rz], 0, 0.02);
      addGeo(new THREE.CylinderGeometry(0.020, 0.022, 0.024, 16, 3), 0x625b50, { p: [rx, y0 + 0.012, rz], colorFn: stoneColor(y0) });
      addGeo(new THREE.CylinderGeometry(0.019, 0.019, 0.018, 16, 2), 0x72a8b3, { p: [rx, y0 + 0.032, rz], colorFn: glassFn });
      addGeo(new THREE.SphereGeometry(0.0195, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0x89bdc7, { p: [rx, y0 + 0.041, rz], colorFn: glassFn });
      for (let r = 0; r < 6; r++) {
        addGeo(new THREE.TorusGeometry(0.0198, 0.001, 4, 16, Math.PI), 0x222830, { p: [rx, y0 + 0.041, rz], r: [0, r * Math.PI / 6, 0] });
      }
      addGeo(new THREE.CylinderGeometry(0.004, 0.005, 0.010, 8), 0x222830, { p: [rx, y0 + 0.064, rz] });
      features.push({ type: 'city', pos: [rx, y0 + 0.032, rz], size: 0.010 });
      features.push({ type: 'sparkle', pos: [rx, y0 + 0.062, rz], size: 0.009 });
    }
  }

  // =====================================================================
  // 8. TORREÓN NORTE (DADA KEEP), PUENTE TRASERO Y MURALLA NORESTE (VISTA 2 Y 3)
  // =====================================================================
  {
    const dx = 0.155, dz = -0.165, y0 = 0.122, drot = -0.10;
    const LD = makeLocal(dx, y0, dz, drot);
    const dw = 0.064, dh = 0.088, dd = 0.056;
    addSubBox(dw + 0.012, 0.072, dd + 0.012, 8, 8, 8, LD(0, -0.032, 0), drot, 0.03);
    addSubBox(dw, dh, dd, 12, 14, 10, LD(0, dh / 2, 0), drot, y0);
    addGableX(LD(0, dh, 0), drot, dw + 0.008, 0.052, dd + 0.008, slateColor);
    // 3 filas de buhardillas y aguja central en el Torreón Norte (vista 3 de referencia!)
    addGeo(new THREE.CylinderGeometry(0.007, 0.008, 0.022, 10), 0x5c554b, { p: LD(0, dh + 0.046, 0) });
    addGeo(new THREE.ConeGeometry(0.010, 0.042, 10, 4), 0x1c282e, { p: LD(0, dh + 0.078, 0), colorFn: slateColor });
    for (const side of [-1, 1]) {
      const yaw = drot + (side > 0 ? 0 : Math.PI);
      for (let i = 0; i < 4; i++) {
        const wx = -0.021 + i * 0.014;
        addDormer(LD(wx, dh + 0.015, side * dd * 0.34), yaw, 0.0068, 0.009, 0.008);
        addDormer(LD(wx, dh + 0.030, side * dd * 0.20), yaw, 0.0062, 0.008, 0.0075);
        addDetailWin(LD(wx, dh * 0.56, side * (dd / 2 + 0.001)), yaw, 0.0085, 0.022, true);
      }
    }
    // Dos grandes torres semicilíndricas en la fachada norte/este del Torreón DADA (vista 3!)
    for (const sz of [-0.016, 0.016]) {
      const tx = dw / 2 + 0.002;
      addGeo(new THREE.CylinderGeometry(0.012, 0.0135, dh + 0.068, 24, 12), 0x625b50, { p: LD(tx, (dh + 0.010) / 2, sz), colorFn: stoneColor(y0 - 0.03) });
      addGeo(new THREE.ConeGeometry(0.015, 0.040, 24, 4), 0x1c282e, { p: LD(tx, dh + 0.064, sz), colorFn: slateColor });
      addDetailWin(LD(tx + 0.012, dh * 0.65, sz), drot + Math.PI / 2, 0.007, 0.018, true);
    }

    // Puente de Piedra Trasero conectando Claustro / Astronomía con Torreón DADA
    const bx0 = -0.075, bx1 = 0.098, bz = -0.155, by = 0.145;
    addSubBox(bx1 - bx0, 0.014, 0.016, 16, 2, 2, [(bx0 + bx1) / 2, by, bz], 0);
    for (let i = 0; i < 6; i++) {
      const px = bx0 + 0.010 + i * ((bx1 - bx0 - 0.020) / 5);
      addSubBox(0.007, 0.075, 0.015, 2, 6, 2, [px, by - 0.042, bz], 0, 0.04);
    }
    addCrenels([bx0, by + 0.007, bz - 0.007], [bx1, by + 0.007, bz - 0.007], by + 0.007, 0.010, 0.0038, 0.004, 0.0038);

    // Muralla quebrada Noreste y Torre Octogonal de Guardia (vistas 2 y 3!)
    const wallPts = [[0.205, 0.120, -0.172], [0.285, 0.115, -0.155], [0.335, 0.105, -0.088], [0.295, 0.115, -0.015]];
    for (let i = 0; i < 3; i++) {
      const A = wallPts[i], B = wallPts[i + 1];
      const len = Math.hypot(B[0] - A[0], B[2] - A[2]);
      const yaw = Math.atan2(B[0] - A[0], B[2] - A[2]);
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, mz = (A[2] + B[2]) / 2;
      addSubBox(0.011, 0.075, len + 0.006, 2, 8, 10, [mx, my - 0.018, mz], yaw, 0.03);
      addCrenels([A[0], A[1] + 0.020, A[2]], [B[0], B[1] + 0.020, B[2]], (A[1] + B[1]) / 2 + 0.020, 0.010, 0.005, 0.005, 0.005);
      addGeo(new THREE.CylinderGeometry(0.012, 0.014, 0.088, 12, 6), 0x5c554b, { p: [B[0], B[1] - 0.010, B[2]], colorFn: stoneColor(0.04) });
      addGeo(new THREE.ConeGeometry(0.015, 0.028, 12, 3), 0x1c282e, { p: [B[0], B[1] + 0.048, B[2]], colorFn: slateColor });
    }
  }

  // =====================================================================
  // 9. LECHUCERÍA AISLADA NOROESTE, CÍRCULO DE PIEDRAS, HAGRID, SAUCE Y BOSQUE
  // =====================================================================
  // LA LECHUCERÍA sobre su peñón aislado al noroeste (-0.365, -0.215, vista 4!)
  {
    const ox = -0.365, oz = -0.215, y0 = 0.106;
    addGeo(new THREE.CylinderGeometry(0.026, 0.032, 0.056, 20, 4), 0x3b3834, { p: [ox, y0 - 0.020, oz], colorFn: stoneColor(y0 - 0.04) });
    addGeo(new THREE.CylinderGeometry(0.020, 0.023, 0.078, 24, 8), 0x6a6357, { p: [ox, y0 + 0.039, oz], colorFn: stoneColor(y0) });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.5;
      addButtress([ox + Math.sin(a) * 0.022, y0, oz + Math.cos(a) * 0.022], a, 0.068, 0.0065, 0.0055);
    }
    addGeo(new THREE.CylinderGeometry(0.023, 0.023, 0.006, 20), 0x4f4940, { p: [ox, y0 + 0.080, oz] });
    addGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.022, 16), 0x1a1816, { p: [ox, y0 + 0.092, oz] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addRod([ox + Math.cos(a) * 0.0195, y0 + 0.080, oz + Math.sin(a) * 0.0195], [ox + Math.cos(a) * 0.0195, y0 + 0.104, oz + Math.sin(a) * 0.0195], 0.0018, 0x625b50, 6);
    }
    addGeo(new THREE.ConeGeometry(0.027, 0.048, 24, 5), 0x1c282e, { p: [ox, y0 + 0.128, oz], colorFn: slateColor });
    addDetailWin([ox + 0.020, y0 + 0.048, oz + 0.008], 1.2, 0.0075, 0.018, true);
    addDetailWin([ox, y0 + 0.048, oz - 0.022], Math.PI, 0.0075, 0.018, true);
    features.push({ type: 'gulls', pos: [ox + 0.02, y0 + 0.155, oz + 0.02], size: 0.14 });
  }

  // Círculo de Piedras al salir del Puente Cubierto de Madera (-0.412, -0.142)
  {
    const sx = -0.412, sz = -0.142, sy = 0.086;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const mx = sx + Math.cos(a) * 0.020, mz = sz + Math.sin(a) * 0.020;
      const mh = 0.022 + (i % 2) * 0.005;
      addSubBox(0.0065, mh, 0.005, 1, 3, 1, [mx, sy + mh * 0.35, mz], -a);
      if (i % 2 === 0) {
        const a2 = ((i + 1) / 8) * Math.PI * 2 + 0.2;
        const lx = sx + (Math.cos(a) + Math.cos(a2)) * 0.010, lz = sz + (Math.sin(a) + Math.sin(a2)) * 0.010;
        addGeo(new THREE.BoxGeometry(0.019, 0.005, 0.0065), 0x54514c, { p: [lx, sy + 0.021, lz], r: [0, -(a + a2) / 2 + Math.PI / 2, 0], amt: 0.07 });
      }
    }
    features.push({ type: 'firefly', pos: [sx, sy + 0.024, sz], size: 0.030 });
  }

  // Cabaña de Hagrid y huerto de calabazas (-0.375, +0.025)
  {
    const hx = -0.375, hz = 0.025, y0 = 0.056, rot = 0.35;
    const LH = makeLocal(hx, y0, hz, rot);
    addGeo(new THREE.CylinderGeometry(0.028, 0.032, 0.038, 12, 3), 0x3b3834, { p: LH(0, -0.012, 0), colorFn: stoneColor(y0 - 0.03) });
    addGeo(new THREE.CylinderGeometry(0.025, 0.027, 0.032, 16, 4), 0x5c554b, { p: LH(0, 0.016, 0), r: [0, rot, 0], colorFn: stoneColor(y0) });
    addGeo(new THREE.ConeGeometry(0.032, 0.036, 16, 4), 0x1c282e, { p: LH(0, 0.050, 0), r: [0, rot, 0], colorFn: slateColor });
    addGeo(new THREE.CylinderGeometry(0.017, 0.019, 0.026, 12, 3), 0x575046, { p: LH(0.022, 0.008, 0.011), colorFn: stoneColor(y0) });
    addGeo(new THREE.ConeGeometry(0.022, 0.028, 12, 3), 0x1c282e, { p: LH(0.022, 0.035, 0.011), colorFn: slateColor });
    addSubBox(0.010, 0.038, 0.010, 2, 4, 2, LH(-0.011, 0.044, -0.011), rot);
    features.push({ type: 'smoke', pos: LH(-0.011, 0.066, -0.011), size: 0.0075 });
    features.push({ type: 'smoke', pos: [-0.265, 0.215, 0.012], size: 0.007 }); // humo cocina Gran Comedor
    addGeo(new THREE.BoxGeometry(0.010, 0.018, 0.0045), 0x362417, { p: LH(0, 0.010, 0.025), r: [0, rot, 0] });
    addDetailWin(LH(-0.023, 0.018, 0.008), rot - Math.PI / 2, 0.0085, 0.010, true);
    addDetailWin(LH(0, 0.018, -0.023), rot + Math.PI, 0.0085, 0.010, true);
    addDetailWin(LH(0.022, 0.015, 0.029), rot, 0.008, 0.009, true);
    for (const [px, pz, pr] of [[-0.028, 0.026, 0.006], [-0.019, 0.033, 0.005], [-0.034, 0.014, 0.0055], [-0.013, 0.023, 0.0048]]) {
      const [wx, , wz] = LH(px, 0, pz);
      const wy = height(wx, wz);
      addGeo(new THREE.IcosahedronGeometry(pr, 0), 0xc95d18, { p: [wx, wy + pr * 0.55, wz], s: [1.15, 0.78, 1.15], r: [0, rng() * 3, 0], amt: 0.07 });
    }
  }

  // Sauce Boxeador en (-0.015, -0.220) + Bosque Prohibido (85 pinos oscuros detallados)
  {
    const wx = -0.015, wz = -0.220, wy = height(wx, wz);
    addRod([wx, wy - 0.010, wz], [wx - 0.005, wy + 0.030, wz + 0.004], 0.0072, 0x382618, 8);
    const limbs = [
      [[wx - 0.005, wy + 0.028, wz + 0.004], [wx - 0.024, wy + 0.048, wz + 0.018]],
      [[wx - 0.005, wy + 0.028, wz + 0.004], [wx + 0.018, wy + 0.046, wz + 0.012]],
      [[wx - 0.005, wy + 0.028, wz + 0.004], [wx - 0.012, wy + 0.052, wz - 0.020]],
      [[wx - 0.005, wy + 0.028, wz + 0.004], [wx + 0.015, wy + 0.042, wz - 0.018]],
    ];
    for (const [a, b] of limbs) {
      addRod(a, b, 0.0032, 0x3d2a1b, 6);
      addGeo(new THREE.IcosahedronGeometry(0.013, 0), rng() < 0.5 ? 0x2b4728 : 0x355730,
        { p: b, s: [1.15, 0.85, 1.15], r: [rng() * 3, rng() * 3, 0], amt: 0.09 });
      for (let w = 0; w < 2; w++) {
        addGeo(new THREE.ConeGeometry(0.0042, 0.020, 6), 0x243e22, {
          p: [b[0] + (rng() - 0.5) * 0.010, b[1] - 0.013, b[2] + (rng() - 0.5) * 0.010], r: [Math.PI, 0, 0], amt: 0.08,
        });
      }
    }
    features.push({ type: 'firefly', pos: [wx, wy + 0.044, wz], size: 0.030 });
  }

  // 120 pinos oscuros de 6 pisos en las laderas periféricas del Bosque Prohibido + rocas del sotobosque
  {
    const placed = [];
    const avoid = [
      [-0.242, 0.068, 0.115], // Gran Comedor + Patio
      [-0.152, -0.062, 0.110], // Torreón + Claustro
      [-0.258, -0.068, 0.055], // Torre del Reloj
      [-0.412, -0.142, 0.045], // Círculo de Piedras
      [-0.365, -0.215, 0.045], // Lechucería
      [-0.375, 0.025, 0.058],  // Cabaña Hagrid
      [0.145, -0.025, 0.160],  // Astronomía + Galería + Campanas
      [0.245, 0.075, 0.125],   // Invernaderos + Rotonda
      [0.155, -0.165, 0.085],  // Torreón DADA
      [-0.055, 0.025, 0.085],  // Viaducto
      [-0.275, 0.205, 0.065],  // Escalinata zigzag + Embarcadero
      [-0.342, -0.108, 0.060], // Puente de Madera
      [-0.015, -0.220, 0.045], // Sauce Boxeador
    ];
    let tries = 0;
    while (placed.length < 120 && tries++ < 7000) {
      const ang = rng() * Math.PI * 2, r = 0.06 + rng() * rimRadius(ang) * 0.84;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = height(x, z);
      if (h < 0.014 || h > 0.128 || slopeAt(x, z) > 0.90) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.020)) continue;
      placed.push([x, z]);
      const sc = 0.62 + rng() * 0.58;
      const y = h - 0.005;
      addGeo(new THREE.CylinderGeometry(0.0030 * sc, 0.0042 * sc, 0.020 * sc, 10, 2), 0x382416, { p: [x, y + 0.010 * sc, z] });
      for (let j = 0; j < 6; j++) {
        addGeo(new THREE.ConeGeometry((0.020 - j * 0.0028) * sc, 0.020 * sc, 16, 3), j % 2 ? 0x1b3624 : 0x24452e,
          { p: [x, y + (0.020 + j * 0.0095) * sc, z], r: [0, rng() * 3, 0], amt: 0.08 });
      }
      if (placed.length % 8 === 0) {
        features.push({ type: 'firefly', pos: [x + (rng() - 0.5) * 0.022, h + 0.025, z + (rng() - 0.5) * 0.022], size: 0.030 });
      }
    }
    for (let r = 0, rt = 0; r < 45 && rt++ < 1500;) {
      const ang = rng() * Math.PI * 2, rr = 0.06 + rng() * rimRadius(ang) * 0.80;
      const x = CX + Math.cos(ang) * rr, z = CZ + Math.sin(ang) * rr;
      const h = height(x, z);
      if (h < 0.012 || h > 0.125 || slopeAt(x, z) > 0.8) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      addGeo(new THREE.IcosahedronGeometry(0.006 + rng() * 0.007, 0), rng() < 0.5 ? 0x2d3230 : 0x242826, {
        p: [x, h + 0.001, z], s: [1.2, 0.65, 1.1], r: [rng() * 3, rng() * 3, 0], amt: 0.08,
      });
      r++;
    }
  }

  // Rocas y escollos solo dentro de la bahía del Lago Negro y gargantas
  for (let n = 0, tries = 0; n < 14 && tries++ < 800;) {
    const ang = rng() * Math.PI * 2, r = rng() * rimRadius(ang) * 0.80;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    const h = height(x, z);
    if (h > -0.008 || h < -0.050) continue;
    if (Math.hypot(x + 0.22, z - 0.26) < 0.075) continue;
    addGeo(new THREE.IcosahedronGeometry(0.009 + rng() * 0.012, 0), rng() < 0.5 ? 0x26292e : 0x1e2024, {
      p: [x, -0.001, z], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.1, 0.65, 1.2], amt: 0.09,
    });
    n++;
  }

  // Destellos sobre el agua de la bahía suroeste y nubes altas rodeando las torres
  for (let i = 0, tries = 0; i < 65 && tries < 2500; tries++) {
    const ang = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rimRadius(ang) * 0.92;
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (height(x, z) > -0.010) continue;
    features.push({ type: 'sparkle', pos: [x, 0.0035, z], size: 0.0085 });
    i++;
  }
  const cloudRing = [
    [-0.30, 0.36, -0.14, 0.018],
    [0.24,  0.38, -0.08, 0.019],
    [-0.08, 0.44, -0.22, 0.016],
    [0.30,  0.30,  0.14, 0.017],
    [-0.28, 0.29,  0.18, 0.016],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0, cy, -0.04], size: cs });
  }

  return finish('El Castillo de Hogwarts');
}
