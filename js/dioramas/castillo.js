// Diorama "El Castillo del Lago": fortaleza mágica sobre un peñón junto al lago,
// con Gran Comedor, Torreón con torrecillas, Torre de Astronomía, Torre del Reloj,
// Viaducto con arcos, Invernaderos, Lechucería, Embarcadero con botes, Cabaña y Bosque.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildCastillo(seed = 19) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  // --- ayudas de color por bandas / damero ---
  const bandColor = (step, hexA, hexB, amt = 0.04) => (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy / step + 1e-4) % 2;
    return jitter(k ? hexA : hexB, amt);
  };

  // --- terreno + Lago Negro (disco polar R = 0.38) ---
  const R = 0.38, FLOOR = -0.065;
  const EXPLANADAS = [
    { x: -0.02,  z: -0.085, hw: 0.075, hd: 0.056, rot: 0,     y: 0.145, r0: 0.012, r1: 0.044 }, // Torreón + Astronomía
    { x: -0.12,  z: 0.045,  hw: 0.044, hd: 0.074, rot: 0.12,  y: 0.112, r0: 0.012, r1: 0.044 }, // Gran Comedor + Patio
    { x: -0.015, z: 0.035,  hw: 0.025, hd: 0.025, rot: 0,     y: 0.112, r0: 0.010, r1: 0.034 }, // Torre del Reloj
    { x: 0.20,   z: -0.025, hw: 0.044, hd: 0.064, rot: -0.15, y: 0.078, r0: 0.012, r1: 0.044 }, // Colina Este / Invernaderos
    { x: 0.14,   z: -0.16,  hw: 0.024, hd: 0.024, rot: 0,     y: 0.105, r0: 0.010, r1: 0.036 }, // Risco Lechucería
    { x: -0.215, z: -0.07,  hw: 0.035, hd: 0.034, rot: 0.35,  y: 0.052, r0: 0.012, r1: 0.038 }, // Cabaña Guardabosques
  ];

  const rectDist = (x, z, p) => {
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  const rawHeight = (x, z) => {
    const hillKeep = 0.195 * smooth(1 - Math.hypot(x + 0.02, z + 0.085) / 0.22);
    const hillHall = 0.165 * smooth(1 - Math.hypot(x + 0.12, z - 0.045) / 0.16);
    const hillOwl  = 0.145 * smooth(1 - Math.hypot(x - 0.14, z + 0.16) / 0.13);
    const hillEast = 0.128 * smooth(1 - Math.hypot(x - 0.20, z + 0.025) / 0.15);
    const hillWest = 0.105 * smooth(1 - Math.hypot(x + 0.215, z + 0.07) / 0.165);
    const hillBack = 0.095 * smooth(1 - Math.hypot(x + 0.09, z + 0.22) / 0.15);
    let h = -0.05 + Math.max(hillKeep, hillHall, hillOwl, hillEast, hillWest, hillBack);
    // Garganta / canal bajo el viaducto y bahía amplia del Lago Negro al frente
    const gorge = smooth(1 - Math.hypot((x - 0.082) * 1.45, (z - 0.04) * 0.95) / 0.105);
    const bay = smooth(1 - Math.hypot((x - 0.02) * 0.85, (z - 0.23) * 1.1) / 0.21);
    h -= 0.115 * gorge + 0.09 * bay;
    h += (fbm(x * 13 + 4, z * 13 + 7) - 0.5) * 0.036;
    // Borde exterior desciende hacia el agua para cerrar limpio en todo el perímetro
    const edge = smooth((Math.hypot(x, z) - R * 0.82) / (R * 0.16));
    h += (-0.05 - h) * edge;
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
    Math.hypot(height(x + 0.008, z) - height(x - 0.008, z), height(x, z + 0.008) - height(x, z - 0.008)) / 0.016;

  const K = 24, S = 68;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const r = R * Math.pow(k / K, 0.92);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = k === K ? -0.05 : height(x, z);
      const y = k === K ? 0 : Math.max(h, 0) + (h < 0 ? (fbm(x * 28, z * 28) - 0.5) * 0.0035 : 0);
      row.push({ v: new THREE.Vector3(x, y, z), h });
    }
    ringPts.push(row);
  }

  const nrm = new THREE.Vector3();
  function terrainColor(a, b, c) {
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);
    // Solo el espejo de agua casi plano (sin triángulos inclinados del acantilado) se pinta como agua/espuma
    if (h < 0 && hMax < 0.008 && slope < 0.22) {
      const t = smooth(1 + h / 0.05);
      tmpColor.setHex(0x11415c).lerp(new THREE.Color(0x3a8ea6), t * t);
      if (h > -0.0065) tmpColor.lerp(new THREE.Color(0xdcf3f8), 0.52); // espuma en la orilla
      const k = 1 + (rng() - 0.5) * 0.07;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }
    if (slope > 0.32 || h > 0.112) return jitter(rng() < 0.5 ? 0x74706b : 0x625e59, 0.08); // acantilado granito
    if (h < 0.011) return jitter(rng() < 0.5 ? 0x8d8476 : 0x7b7367, 0.06); // ribera pedregosa
    return jitter(h > 0.065 ? 0x4c7c44 : (rng() < 0.5 ? 0x5c8f4d : 0x3f6c39), 0.08); // brezal escocés
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
  // falda y fondo de la base
  const rim = ringPts[K].map((p) => p.v);
  const centerBottom = new THREE.Vector3(0, FLOOR, 0);
  const radial = new THREE.Vector3();
  for (let s = 0; s < S; s++) {
    const a = rim[s], b = rim[(s + 1) % S];
    const a2 = new THREE.Vector3(a.x * 0.96, FLOOR, a.z * 0.96), b2 = new THREE.Vector3(b.x * 0.96, FLOOR, b.z * 0.96);
    radial.set(a.x + b.x, 0, a.z + b.z);
    addTri(a, b, a2, jitter(0x103c54, 0.05), radial);
    addTri(b, b2, a2, jitter(0x0d3347, 0.05), radial);
    addTri(a2, b2, centerBottom, jitter(0x52483f, 0.04), DOWN);
  }

  // Ayuda local para girar un grupo de edificios respecto a (cx, yBase, cz) y ángulo rot
  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };
  // Ayuda para agregar ventana de piedra + vidrio + efecto nocturno 'window'
  const addWin = (p, yaw, w, h, frame = true) => {
    if (frame) addGeo(new THREE.BoxGeometry(w + 0.004, h + 0.004, 0.004), 0x6d655b, { p, r: [0, yaw, 0], amt: 0.04 });
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    addGeo(new THREE.BoxGeometry(w, h, 0.0045), 0x334760, { p: [p[0] + nx * 0.001, p[1], p[2] + nz * 0.001], r: [0, yaw, 0], amt: 0.04 });
    features.push({ type: 'window', pos: [p[0] + nx * 0.0038, p[1], p[2] + nz * 0.0038], yaw, w: w * 0.92, h: h * 0.92 });
  };
  // Ayuda para tejado a dos aguas con eje a lo largo de Z
  const addGableZ = (p, rot, w, h, d, hexA, hexB) => {
    const roof = new THREE.CylinderGeometry(1, 1, 1, 3);
    roof.rotateY(Math.PI);
    roof.rotateX(Math.PI / 2);
    roof.rotateY(Math.PI / 2);
    addGeo(roof, hexA, { p, r: [0, rot, 0], s: [d, h, w / Math.sqrt(3)], colorFn: bandColor(0.011, hexA, hexB, 0.045) });
  };
  // Ayuda para tejado a dos aguas con eje a lo largo de X
  const addGableX = (p, rot, w, h, d, hexA, hexB) => {
    addGableZ(p, rot + Math.PI / 2, d, h, w, hexA, hexB);
  };

  // =====================================================================
  // 1. EL GRAN COMEDOR Y EL PATIO DE ENTRADA (x = -0.12, z = 0.045, rot = 0.12)
  // =====================================================================
  {
    const rot = 0.12, y0 = 0.112;
    const L = makeLocal(-0.12, y0, 0.045, rot);
    const stoneFn = bandColor(0.014, 0xc3b49a, 0xb1a287, 0.04);

    // Zócalo hundido 3.5 cm bajo toda la nave y el patio para anclaje sólido en el acantilado
    addGeo(new THREE.BoxGeometry(0.068, 0.048, 0.106), 0x767068, { p: L(0, -0.020, -0.034), r: [0, rot, 0], amt: 0.07 });
    addGeo(new THREE.BoxGeometry(0.080, 0.048, 0.066), 0x767068, { p: L(0, -0.022, 0.046), r: [0, rot, 0], amt: 0.07 });

    // Nave del Gran Comedor (z_local = -0.034, W = 0.06, H = 0.064, D = 0.098)
    const W = 0.060, H = 0.064, D = 0.098, zHall = -0.034;
    addGeo(new THREE.BoxGeometry(W, H, D), 0xb8a98e, { p: L(0, H / 2, zHall), r: [0, rot, 0], colorFn: stoneFn });
    // Tejado empinado de pizarra
    addGableZ(L(0, H + 0.022, zHall), rot + Math.PI / 2, D + 0.010, 0.044, W + 0.012, 0x35475e, 0x415670);
    // Frontón de piedra en fachada +Z del comedor
    const gableFront = new THREE.CylinderGeometry(1, 1, 0.008, 3);
    gableFront.rotateY(Math.PI); gableFront.rotateX(Math.PI / 2); gableFront.rotateY(Math.PI / 2);
    addGeo(gableFront, 0xbba98e, { p: L(0, H + 0.019, zHall + D / 2 + 0.001), r: [0, rot + Math.PI / 2, 0], s: [0.008, 0.040, W / Math.sqrt(3)], amt: 0.04 });

    // Aguja central icónica sobre el techo del Gran Comedor
    addGeo(new THREE.BoxGeometry(0.016, 0.026, 0.016), 0xb3a388, { p: L(0, H + 0.042, zHall + 0.004), r: [0, rot, 0], amt: 0.04 });
    addGeo(new THREE.CylinderGeometry(0.008, 0.009, 0.018, 6), 0x4b4640, { p: L(0, H + 0.062, zHall + 0.004), r: [0, rot, 0], amt: 0.05 });
    addGeo(new THREE.ConeGeometry(0.011, 0.050, 6, 2), 0x2f3e52, { p: L(0, H + 0.095, zHall + 0.004), r: [0, rot, 0], amt: 0.05 });
    addGeo(new THREE.SphereGeometry(0.0035, 6, 4), 0xd4a846, { p: L(0, H + 0.121, zHall + 0.004) });

    // Ábside trasero (-Z) con tejado cónico y chimenea de cocinas
    addGeo(new THREE.CylinderGeometry(0.026, 0.028, H * 0.92, 6, 2), 0xb1a287, { p: L(0, H * 0.46, zHall - D / 2 - 0.008), r: [0, rot, 0], colorFn: stoneFn });
    addGeo(new THREE.ConeGeometry(0.031, 0.042, 6, 2), 0x35475e, { p: L(0, H * 0.92 + 0.021, zHall - D / 2 - 0.008), r: [0, rot, 0], colorFn: bandColor(0.010, 0x35475e, 0x415670) });
    addWin(L(0, H * 0.56, zHall - D / 2 - 0.034), rot + Math.PI, 0.011, 0.024, true);
    // Chimenea junto al ábside
    addGeo(new THREE.BoxGeometry(0.013, 0.038, 0.013), 0x867e74, { p: L(-0.024, H + 0.012, zHall - 0.028), r: [0, rot, 0], amt: 0.05 });
    features.push({ type: 'smoke', pos: L(-0.024, H + 0.034, zHall - 0.028), size: 0.0075 });

    // Contrafuertes laterales + ventanales altos (4 por lado)
    for (const side of [-1, 1]) {
      const yaw = rot + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      for (let i = 0; i < 4; i++) {
        const bz = zHall - 0.036 + i * 0.024;
        addGeo(new THREE.BoxGeometry(0.008, H * 0.88, 0.008), 0x9b8e7a, { p: L(side * (W / 2 + 0.003), H * 0.44, bz), r: [0, rot, 0], amt: 0.04 });
        addGeo(new THREE.ConeGeometry(0.0055, 0.014, 4), 0x8b7e6b, { p: L(side * (W / 2 + 0.003), H * 0.88 + 0.007, bz), r: [0, rot + Math.PI / 4, 0], amt: 0.05 });
        if (i < 3) {
          addWin(L(side * (W / 2 + 0.001), H * 0.55, bz + 0.012), yaw, 0.010, 0.028, true);
        }
      }
    }
    // Ventanal frontal alto sobre la puerta del Gran Comedor
    addWin(L(0, H * 0.62, zHall + D / 2 + 0.001), rot, 0.022, 0.028, true);
    // Portón doble de madera
    addGeo(new THREE.BoxGeometry(0.020, 0.025, 0.005), 0x5c3c24, { p: L(0, 0.0125, zHall + D / 2 + 0.001), r: [0, rot, 0], amt: 0.05 });

    // Patio de Entrada (z_local = +0.046) con suelo en damero sutil
    const PW = 0.074, PD = 0.056, zPat = 0.046;
    for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 3; iz++) {
      const px = -PW / 2 + (ix + 0.5) * (PW / 4);
      const pz = zPat - PD / 2 + (iz + 0.5) * (PD / 3);
      addGeo(new THREE.BoxGeometry(PW / 4 - 0.0005, 0.004, PD / 3 - 0.0005), (ix + iz) % 2 ? 0x9b9284 : 0x867d70,
        { p: L(px, 0.002, pz), r: [0, rot, 0], amt: 0.04 });
    }
    // Muros almenados del patio (oeste, este y portada sur)
    addGeo(new THREE.BoxGeometry(0.010, 0.028, PD), 0xa79982, { p: L(-PW / 2, 0.014, zPat), r: [0, rot, 0], amt: 0.05 });
    for (const mx of [-PW / 2 + 0.013, PW / 2 - 0.013]) {
      addGeo(new THREE.BoxGeometry(0.024, 0.028, 0.010), 0xa79982, { p: L(mx, 0.014, zPat + PD / 2), r: [0, rot, 0], amt: 0.05 });
    }
    // 2 torrecillas de entrada con chapitel y braseros encendidos
    for (const side of [-1, 1]) {
      const tx = side * (PW / 2 - 0.002), tz = zPat + PD / 2;
      addGeo(new THREE.CylinderGeometry(0.010, 0.011, 0.048, 8), 0x9b8e78, { p: L(tx, 0.024, tz), amt: 0.05 });
      addGeo(new THREE.ConeGeometry(0.013, 0.026, 8), 0x35475e, { p: L(tx, 0.061, tz), amt: 0.05 });
      // braseros frente a las torrecillas
      const bx = side * 0.016, bz = zPat + PD / 2 + 0.008;
      addGeo(new THREE.CylinderGeometry(0.0045, 0.0035, 0.014, 6), 0x3a3e44, { p: L(bx, 0.007, bz), amt: 0.05 });
      features.push({ type: 'flame', pos: L(bx, 0.015, bz), size: 0.0055 });
    }

    // 4 Estandartes volumétricos de las casas en el patio y fachada
    const houseColors = [0xb03028, 0x287846, 0x28528e, 0xd6a02c];
    for (let i = 0; i < 4; i++) {
      const bx = -0.021 + i * 0.014;
      addGeo(new THREE.BoxGeometry(0.0075, 0.020, 0.003), houseColors[i], { p: L(bx, 0.022, zHall + D / 2 + 0.002), r: [0, rot, 0], amt: 0.04 });
    }
  }

  // =====================================================================
  // 2. LA TORRE DEL RELOJ Y ALA CONECTORA (x = -0.015, z = 0.035, y0 = 0.112)
  // =====================================================================
  {
    const y0 = 0.112;
    // Ala baja de unión con el Gran Comedor y el Patio
    addGeo(new THREE.BoxGeometry(0.065, 0.045, 0.036), 0xb4a58b, { p: [-0.052, y0 + 0.014, 0.022], amt: 0.04 });
    addGableX([-0.052, y0 + 0.046, 0.022], 0, 0.066, 0.020, 0.040, 0x35475e, 0x415670);
    addWin([-0.052, y0 + 0.022, 0.041], 0, 0.012, 0.016, true);

    // Torre del Reloj
    const cx = -0.015, cz = 0.035, tw = 0.044, th = 0.132;
    addGeo(new THREE.BoxGeometry(tw + 0.010, 0.042, tw + 0.010), 0x767068, { p: [cx, y0 - 0.014, cz], amt: 0.07 });
    addGeo(new THREE.BoxGeometry(tw, th, tw), 0xbaa98e, { p: [cx, y0 + th / 2, cz], colorFn: bandColor(0.015, 0xbaa98e, 0xa8997e, 0.04) });
    // Galería saliente almenada
    addGeo(new THREE.BoxGeometry(tw + 0.008, 0.012, tw + 0.008), 0x998b74, { p: [cx, y0 + th + 0.004, cz], amt: 0.05 });
    // Chapitel piramidal a 4 aguas + aguja
    addGeo(new THREE.ConeGeometry(tw * 0.78, 0.068, 4, 2), 0x35475e, { p: [cx, y0 + th + 0.044, cz], r: [0, Math.PI / 4, 0], colorFn: bandColor(0.011, 0x35475e, 0x415670) });
    addGeo(new THREE.ConeGeometry(0.005, 0.022, 4), 0xc79a3a, { p: [cx, y0 + th + 0.088, cz], r: [0, Math.PI / 4, 0] });

    // Esfera de reloj en caras +Z y -Z (aro dorado + esfera crema + manecillas)
    for (const sgn of [1, -1]) {
      const fz = cz + sgn * (tw / 2 + 0.0018), fy = y0 + th - 0.026;
      addGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.004, 12), 0xc29842, { p: [cx, fy, fz], r: [Math.PI / 2, 0, 0], amt: 0.04 });
      addGeo(new THREE.CylinderGeometry(0.010, 0.010, 0.005, 12), 0xf0e6c8, { p: [cx, fy, fz + sgn * 0.001], r: [Math.PI / 2, 0, 0], amt: 0.02 });
      addGeo(new THREE.BoxGeometry(0.0022, 0.008, 0.002), 0x26262a, { p: [cx - 0.002, fy + 0.002, fz + sgn * 0.0038], r: [0, 0, 0.5] });
      addGeo(new THREE.BoxGeometry(0.0022, 0.006, 0.002), 0x26262a, { p: [cx + 0.002, fy + 0.001, fz + sgn * 0.0038], r: [0, 0, -0.9] });
    }
    addWin([cx, y0 + 0.056, cz + tw / 2 + 0.001], 0, 0.012, 0.022, true);
    addWin([cx - tw / 2 - 0.001, y0 + 0.072, cz], -Math.PI / 2, 0.011, 0.020, true);
  }

  // =====================================================================
  // 3. LA GRAN TORRE DE LA ESCALERA (MAIN KEEP) (x = -0.055, z = -0.075, y0 = 0.145)
  // =====================================================================
  {
    const kx = -0.055, kz = -0.075, y0 = 0.145;
    // Cimientos anchos hundidos 4 cm en la roca
    addGeo(new THREE.CylinderGeometry(0.056, 0.062, 0.050, 12), 0x767068, { p: [kx, y0 - 0.015, kz], amt: 0.07 });
    // Ala de enlace maciza entre Gran Comedor y Torreón
    addGeo(new THREE.BoxGeometry(0.054, 0.072, 0.062), 0xb1a288, { p: [-0.088, y0 - 0.008, -0.028], r: [0, 0.35, 0], colorFn: bandColor(0.015, 0xb1a288, 0xa09178) });
    addGableZ([-0.088, y0 + 0.042, -0.028], 0.35, 0.056, 0.028, 0.062, 0x35475e, 0x415670);

    // Cuerpo cilíndrico principal del Gran Torreón
    const kh = 0.155, kr = 0.047;
    addGeo(new THREE.CylinderGeometry(kr * 0.94, kr, kh, 12, 3), 0xbaa98e,
      { p: [kx, y0 + kh / 2, kz], colorFn: bandColor(0.016, 0xbaa98e, 0xa8987e, 0.04) });
    // Anillo cornisa superior
    addGeo(new THREE.CylinderGeometry(kr * 1.03, kr * 0.95, 0.014, 12), 0x8f8575, { p: [kx, y0 + kh + 0.005, kz], amt: 0.05 });
    // Gran chapitel cónico de pizarra
    addGeo(new THREE.ConeGeometry(kr * 1.14, 0.115, 12, 3), 0x33445a,
      { p: [kx, y0 + kh + 0.068, kz], colorFn: bandColor(0.012, 0x33445a, 0x3f536d, 0.045) });
    addGeo(new THREE.ConeGeometry(0.005, 0.026, 6), 0xc79a3a, { p: [kx, y0 + kh + 0.135, kz] });

    // 4 torrecillas colgantes (bartizans) alrededor del cuerpo superior
    const bartizans = [
      { ang: 0.45, dy: 0.105, r: 0.013, h: 0.046, ch: 0.044 },
      { ang: 1.95, dy: 0.120, r: 0.014, h: 0.052, ch: 0.048 },
      { ang: 3.55, dy: 0.098, r: 0.013, h: 0.044, ch: 0.042 },
      { ang: 5.10, dy: 0.115, r: 0.012, h: 0.042, ch: 0.040 },
    ];
    for (const b of bartizans) {
      const dist = kr * 0.88;
      const bx = kx + Math.sin(b.ang) * dist, bz = kz + Math.cos(b.ang) * dist;
      const by = y0 + b.dy;
      addGeo(new THREE.ConeGeometry(b.r, 0.022, 8), 0x8f8575, { p: [bx, by - 0.011, bz], r: [Math.PI, 0, 0], amt: 0.05 });
      addGeo(new THREE.CylinderGeometry(b.r, b.r * 0.96, b.h, 8), 0xbaa98e, { p: [bx, by + b.h / 2, bz], amt: 0.04 });
      addGeo(new THREE.ConeGeometry(b.r * 1.24, b.ch, 8, 2), 0x35475e, { p: [bx, by + b.h + b.ch / 2, bz], colorFn: bandColor(0.010, 0x35475e, 0x415670) });
      addWin([bx + Math.sin(b.ang) * b.r, by + b.h * 0.55, bz + Math.cos(b.ang) * b.r], b.ang, 0.006, 0.014, false);
    }

    // Ventanas alrededor del Gran Torreón (orientadas en 4 direcciones)
    for (const ang of [0.1, 1.65, 3.1, 4.7]) {
      const wx = kx + Math.sin(ang) * (kr - 0.001), wz = kz + Math.cos(ang) * (kr - 0.001);
      addWin([wx, y0 + 0.068, wz], ang, 0.010, 0.022, true);
      addWin([wx, y0 + 0.112, wz], ang, 0.009, 0.018, true);
    }
  }

  // =====================================================================
  // 4. TORRE DE ASTRONOMÍA Y ALA NORTE (x = 0.038, z = -0.105, y0 = 0.145)
  // =====================================================================
  {
    const ax = 0.038, az = -0.105, y0 = 0.145;
    // Ala conectora elevada + contrafuerte central apoyado en la roca
    addGeo(new THREE.BoxGeometry(0.072, 0.088, 0.034), 0xa8997e, { p: [-0.008, y0 + 0.022, -0.092], r: [0, 0.28, 0], colorFn: bandColor(0.014, 0xa8997e, 0x998a71) });
    addGableX([-0.008, y0 + 0.078, -0.092], 0.28, 0.072, 0.024, 0.038, 0x35475e, 0x415670);

    // Torre de Astronomía: la aguja más alta de la silueta
    addGeo(new THREE.CylinderGeometry(0.034, 0.040, 0.055, 8), 0x767068, { p: [ax, y0 - 0.016, az], amt: 0.07 });
    const ah = 0.185, ar = 0.026;
    addGeo(new THREE.CylinderGeometry(ar * 0.92, ar, ah, 8, 3), 0xb7a78c,
      { p: [ax, y0 + ah / 2, az], colorFn: bandColor(0.015, 0xb7a78c, 0xa3947b, 0.04) });
    // Mirador observatorio superior
    addGeo(new THREE.CylinderGeometry(0.033, 0.027, 0.016, 8), 0x8e8372, { p: [ax, y0 + ah + 0.006, az], amt: 0.05 });
    for (let i = 0; i < 4; i++) {
      const pa = (i * Math.PI) / 2 + 0.4;
      const px = ax + Math.cos(pa) * 0.027, pz = az + Math.sin(pa) * 0.027;
      addGeo(new THREE.CylinderGeometry(0.0045, 0.005, 0.022, 6), 0x9e907a, { p: [px, y0 + ah + 0.020, pz] });
      addGeo(new THREE.ConeGeometry(0.006, 0.016, 6), 0x2f3e52, { p: [px, y0 + ah + 0.039, pz] });
    }
    // Chapitel altísimo
    addGeo(new THREE.ConeGeometry(0.028, 0.118, 8, 3), 0x2d3c50,
      { p: [ax, y0 + ah + 0.072, az], colorFn: bandColor(0.012, 0x2d3c50, 0x3b4e68, 0.045) });
    addGeo(new THREE.SphereGeometry(0.0045, 6, 4), 0xd9ad46, { p: [ax, y0 + ah + 0.133, az] });
    features.push({ type: 'flame', pos: [ax, y0 + ah + 0.018, az + 0.028], size: 0.006 });

    for (const ang of [0.2, 1.8, 3.4, 4.9]) {
      addWin([ax + Math.sin(ang) * ar, y0 + 0.088, az + Math.cos(ang) * ar], ang, 0.008, 0.020, true);
      addWin([ax + Math.sin(ang) * ar * 0.94, y0 + 0.145, az + Math.cos(ang) * ar * 0.94], ang, 0.008, 0.018, true);
    }

    // Ala Trasera / Torre de Gryffindor (-0.02, -0.155) para enriquecer la vista trasera
    const gx = -0.025, gz = -0.155;
    addGeo(new THREE.BoxGeometry(0.068, 0.064, 0.042), 0xab9c82, { p: [gx - 0.022, y0 + 0.015, gz + 0.015], r: [0, -0.2, 0], colorFn: bandColor(0.014, 0xab9c82, 0x998a71) });
    addGableX([gx - 0.022, y0 + 0.056, gz + 0.015], -0.2, 0.070, 0.022, 0.046, 0x35475e, 0x415670);
    addGeo(new THREE.CylinderGeometry(0.020, 0.024, 0.115, 8, 2), 0xb7a78c, { p: [gx + 0.016, y0 + 0.044, gz - 0.010], colorFn: bandColor(0.014, 0xb7a78c, 0xa3947b) });
    addGeo(new THREE.ConeGeometry(0.025, 0.056, 8, 2), 0x35475e, { p: [gx + 0.016, y0 + 0.128, gz - 0.010], colorFn: bandColor(0.010, 0x35475e, 0x415670) });
    addWin([gx + 0.016, y0 + 0.076, gz - 0.032], Math.PI, 0.009, 0.020, true);
    addWin([gx - 0.026, y0 + 0.028, gz - 0.006], Math.PI - 0.2, 0.011, 0.018, true);
  }

  // =====================================================================
  // 5. EL VIADUCTO DE PIEDRA CON ARCOS (x = 0.006 .. 0.168, z = 0.035)
  // =====================================================================
  {
    const vx0 = 0.006, vx1 = 0.166, vz = 0.035, vyDeck = 0.110;
    const spans = 4, spanLen = (vx1 - vx0) / spans;
    const deckColor = bandColor(0.012, 0x9d917e, 0x8c806e, 0.04);

    // Pilares macizos que llegan hasta y = -0.035 (hundidos bajo el agua/barranco)
    for (let i = 0; i <= spans; i++) {
      const px = vx0 + i * spanLen;
      const pw = i === 0 || i === spans ? 0.016 : 0.013;
      const pBot = -0.035, ph = vyDeck - pBot;
      addGeo(new THREE.BoxGeometry(pw, ph, 0.030), 0x8c8171, { p: [px, pBot + ph / 2, vz], colorFn: deckColor });
      // Tajamar / contrafuerte en la base del pilar
      addGeo(new THREE.BoxGeometry(pw + 0.005, 0.055, 0.036), 0x766e64, { p: [px, 0.015, vz], amt: 0.06 });
    }
    // Enjutas / bloques superiores entre pilares formando arcos visibles desde frente y atrás
    for (let i = 0; i < spans; i++) {
      const cx = vx0 + (i + 0.5) * spanLen;
      const clearW = spanLen - 0.013;
      // Dintel superior sólido bajo la calzada
      addGeo(new THREE.BoxGeometry(spanLen, 0.016, 0.026), 0x9b8f7c, { p: [cx, vyDeck - 0.008, vz], amt: 0.04 });
      // Dovelas laterales que cierran las esquinas del arco dejando el hueco central abierto
      for (const side of [-1, 1]) {
        addGeo(new THREE.BoxGeometry(clearW * 0.28, 0.020, 0.024), 0x918573,
          { p: [cx + side * clearW * 0.36, vyDeck - 0.022, vz], r: [0, 0, side * 0.45], amt: 0.04 });
      }
      // Linternas cálidas en los pretiles del viaducto
      if (i % 2 === 0) {
        for (const zs of [-0.013, 0.013]) {
          addGeo(new THREE.BoxGeometry(0.005, 0.012, 0.005), 0x3b3f46, { p: [cx, vyDeck + 0.014, vz + zs] });
          addGeo(new THREE.BoxGeometry(0.007, 0.007, 0.007), 0xffdc7e, { p: [cx, vyDeck + 0.022, vz + zs] });
          features.push({ type: 'city', pos: [cx, vyDeck + 0.023, vz + zs], size: 0.0065 });
        }
      }
    }
    // Calzada, cornisa y pretiles continuos
    addGeo(new THREE.BoxGeometry(vx1 - vx0 + 0.012, 0.004, 0.035), 0xaba08d, { p: [(vx0 + vx1) / 2, vyDeck - 0.001, vz], amt: 0.04 });
    addGeo(new THREE.BoxGeometry(vx1 - vx0 + 0.012, 0.006, 0.032), 0x7b7265, { p: [(vx0 + vx1) / 2, vyDeck + 0.003, vz], amt: 0.04 });
    for (const zs of [-0.0135, 0.0135]) {
      addGeo(new THREE.BoxGeometry(vx1 - vx0 + 0.010, 0.010, 0.005), 0x9b8f7c, { p: [(vx0 + vx1) / 2, vyDeck + 0.010, vz + zs], amt: 0.05 });
    }
  }

  // =====================================================================
  // 6. COLINA ESTE: PABELLÓN, INVERNADEROS Y LECHUCERÍA
  // =====================================================================
  {
    const rot = -0.15, y0 = 0.078;
    const LE = makeLocal(0.20, y0, -0.025, rot);

    // Pabellón de recepción del Viaducto (conecta con vx1 = 0.166, vz = 0.035)
    addGeo(new THREE.BoxGeometry(0.040, 0.078, 0.044), 0xb0a188, { p: [0.172, y0 + 0.011, 0.035], r: [0, rot, 0], colorFn: bandColor(0.014, 0xb0a188, 0x9e8f77) });
    addGeo(new THREE.ConeGeometry(0.030, 0.036, 4, 2), 0x35475e, { p: [0.172, y0 + 0.068, 0.035], r: [0, rot + Math.PI / 4, 0], amt: 0.05 });
    addWin([0.172, y0 + 0.028, 0.058], rot, 0.012, 0.018, true);
    addWin([0.193, y0 + 0.032, 0.035], rot + Math.PI / 2, 0.010, 0.016, true);

    // Dos Invernaderos de Herbología con techos facetados de cristal turquesa y costillas metálicas
    const glassFn = (va, vb, vc) => {
      const cx = (va.x + vb.x + vc.x) / 3, cz = (va.z + vb.z + vc.z) / 3;
      const grid = (Math.floor(cx * 95) + Math.floor(cz * 95)) % 2;
      return jitter(grid ? 0x7fd1dc : 0x9ce2ea, 0.04);
    };
    for (const [gx, gz, gw, gd] of [[0.008, -0.002, 0.044, 0.060], [0.010, -0.062, 0.052, 0.036]]) {
      // Cimiento de piedra hundido
      addGeo(new THREE.BoxGeometry(gw + 0.008, 0.034, gd + 0.008), 0x767068, { p: LE(gx, -0.006, gz), r: [0, rot, 0], amt: 0.07 });
      // Murete bajo de piedra
      addGeo(new THREE.BoxGeometry(gw, 0.012, gd), 0x9b8e78, { p: LE(gx, 0.014, gz), r: [0, rot, 0], amt: 0.04 });
      // Cuerpo de cristal + techo a dos aguas de cristal
      addGeo(new THREE.BoxGeometry(gw - 0.004, 0.022, gd - 0.004), 0x86d5df, { p: LE(gx, 0.031, gz), r: [0, rot, 0], colorFn: glassFn });
      const gh = 0.022;
      const gRoof = new THREE.CylinderGeometry(1, 1, 1, 3);
      gRoof.rotateY(Math.PI); gRoof.rotateX(Math.PI / 2); gRoof.rotateY(Math.PI / 2);
      const alongZ = gd > gw;
      const axisRot = alongZ ? rot + Math.PI / 2 : rot;
      const rLen = alongZ ? gd : gw, rSpan = alongZ ? gw : gd;
      addGeo(gRoof, 0x9be3eb, { p: LE(gx, 0.042 + gh / 2, gz), r: [0, axisRot, 0], s: [rLen + 0.002, gh, rSpan / Math.sqrt(3)], colorFn: glassFn });
      // Cumbrera y costillas de hierro oscuro
      addGeo(new THREE.BoxGeometry(alongZ ? 0.004 : gw, 0.004, alongZ ? gd : 0.004), 0x3b444c,
        { p: LE(gx, 0.042 + gh, gz), r: [0, rot, 0] });
      for (const t of [-0.3, 0, 0.3]) {
        const rx = alongZ ? gx : gx + t * gw, rz = alongZ ? gz + t * gd : gz;
        addGeo(new THREE.BoxGeometry(alongZ ? gw - 0.002 : 0.003, 0.024, alongZ ? 0.003 : gd - 0.002), 0x3b444c,
          { p: LE(rx, 0.031, rz), r: [0, rot, 0] });
      }
      // Ventanas cálidas en los costados del cristal para que resplandezcan de noche
      addWin(LE(gx + (gw / 2 - 0.001), 0.031, gz), rot + Math.PI / 2, 0.018, 0.014, false);
      addWin(LE(gx - (gw / 2 - 0.001), 0.031, gz), rot - Math.PI / 2, 0.018, 0.014, false);
      features.push({ type: 'sparkle', pos: LE(gx, 0.056, gz), size: 0.009 });
      features.push({ type: 'city', pos: LE(gx, 0.032, gz), size: 0.009 });
      features.push({ type: 'firefly', pos: LE(gx + 0.01, 0.035, gz + 0.01), size: 0.026 });
    }
  }

  // La Lechucería (Owlery) en el risco noreste (x = 0.14, z = -0.16, y0 = 0.105)
  {
    const ox = 0.14, oz = -0.16, y0 = 0.105;
    addGeo(new THREE.CylinderGeometry(0.026, 0.032, 0.040, 8), 0x767068, { p: [ox, y0 - 0.012, oz], amt: 0.08 });
    addGeo(new THREE.CylinderGeometry(0.021, 0.024, 0.072, 8, 2), 0xa89a82, { p: [ox, y0 + 0.036, oz], colorFn: bandColor(0.014, 0xa89a82, 0x958770) });
    // Galería abierta arriba con columnitas
    addGeo(new THREE.CylinderGeometry(0.023, 0.023, 0.006, 8), 0x8d8170, { p: [ox, y0 + 0.074, oz] });
    addGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.020, 8), 0x2c2824, { p: [ox, y0 + 0.086, oz] }); // núcleo interior oscuro
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = ox + Math.cos(a) * 0.020, pz = oz + Math.sin(a) * 0.020;
      addRod([px, y0 + 0.074, pz], [px, y0 + 0.097, pz], 0.0022, 0x9e907a, 5);
    }
    addGeo(new THREE.ConeGeometry(0.027, 0.042, 8, 2), 0x35475e, { p: [ox, y0 + 0.118, oz], colorFn: bandColor(0.010, 0x35475e, 0x415670) });
    addWin([ox + 0.018, y0 + 0.044, oz + 0.010], 1.1, 0.008, 0.018, true);
    addWin([ox, y0 + 0.044, oz - 0.022], Math.PI, 0.008, 0.018, true);
    // Bandada de aves/lechuzas sobrevolando la Lechucería y el torreón
    features.push({ type: 'gulls', pos: [ox - 0.02, y0 + 0.16, oz + 0.02], size: 0.14 });
  }

  // =====================================================================
  // 7. EMBARCADERO, ESCALINATA AL PATIO Y 4 BOTES EN EL LAGO
  // =====================================================================
  {
    // Embarcadero al pie del acantilado sobre el Lago Negro (x = -0.045, z = 0.175)
    const bx = -0.045, bz = 0.172;
    // Cimientos de piedra hundidos hasta el fondo del lago (-0.045)
    addGeo(new THREE.BoxGeometry(0.056, 0.054, 0.058), 0x6f685f, { p: [bx, -0.016, bz], amt: 0.07 });
    addGeo(new THREE.BoxGeometry(0.048, 0.036, 0.050), 0xa89982, { p: [bx, 0.026, bz], colorFn: bandColor(0.012, 0xa89982, 0x968872) });
    // Pórtico oscuro en el frente (+Z) para entrada de los botes
    addGeo(new THREE.BoxGeometry(0.024, 0.024, 0.008), 0x25201c, { p: [bx, 0.020, bz + 0.023] });
    addGableZ([bx, 0.054, bz], Math.PI / 2, 0.056, 0.022, 0.056, 0x35475e, 0x415670);
    // Torreta esquinera del embarcadero
    addGeo(new THREE.CylinderGeometry(0.011, 0.013, 0.068, 8), 0xa89982, { p: [bx + 0.024, 0.028, bz - 0.016], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(0.015, 0.028, 8), 0x35475e, { p: [bx + 0.024, 0.076, bz - 0.016], amt: 0.05 });
    // Linternas cálidas en el pórtico del embarcadero
    features.push({ type: 'flame', pos: [bx - 0.016, 0.028, bz + 0.028], size: 0.005 });
    features.push({ type: 'flame', pos: [bx + 0.016, 0.028, bz + 0.028], size: 0.005 });
    addWin([bx + 0.025, 0.028, bz + 0.008], Math.PI / 2, 0.008, 0.014, true);

    // Muelle de tablas saliendo hacia el lago
    for (let i = 0; i < 4; i++) {
      addGeo(new THREE.BoxGeometry(0.028, 0.004, 0.009), i % 2 ? 0x7d5836 : 0x6b4a2c, { p: [bx, 0.010, bz + 0.032 + i * 0.0105] });
    }
    for (const sx of [-0.012, 0.012]) {
      addGeo(new THREE.CylinderGeometry(0.0025, 0.0025, 0.034, 5), 0x523721, { p: [bx + sx, -0.004, bz + 0.064] });
    }

    // Escalinata sólida de piedra subiendo por el acantilado hacia el Patio de Entrada
    const sx0 = bx - 0.005, sy0 = 0.024, sz0 = bz - 0.018;
    const sx1 = -0.105, sy1 = 0.112, sz1 = 0.125;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const px = sx0 + (sx1 - sx0) * t, py = sy0 + (sy1 - sy0) * t, pz = sz0 + (sz1 - sz0) * t;
      // Cada peldaño tiene cuerpo hundido hacia abajo en la ladera para no flotar nunca
      addGeo(new THREE.BoxGeometry(0.026, 0.040, 0.022), i % 2 ? 0x8f8576 : 0x81776a,
        { p: [px, py - 0.018, pz], r: [0, 0.65, 0], amt: 0.05 });
    }

    // 4 Botes de madera navegando hacia el castillo sobre el Lago Negro
    const boats = [
      [0.015, 0.255, -0.35],
      [0.095, 0.228, -0.58],
      [0.165, 0.165, -0.78],
      [-0.145, 0.238, 0.28],
    ];
    for (const [x, z, rot] of boats) {
      if (height(x, z) > -0.008) continue;
      // Quilla hundida hasta -0.008 para intersectar la superficie del agua (y=0) y asegurar vecindad
      addGeo(new THREE.CylinderGeometry(0.013, 0.007, 0.016, 7), 0x5c3d24, { p: [x, 0.000, z], r: [0, rot, 0], s: [0.9, 1, 2.0], amt: 0.05 });
      addGeo(new THREE.BoxGeometry(0.015, 0.003, 0.0045), 0x7c5636, { p: [x, 0.0085, z], r: [0, rot, 0] });
      // Farol en la proa apuntando hacia el embarcadero
      const lx = x + Math.sin(rot) * 0.018, lz = z + Math.cos(rot) * 0.018;
      addRod([lx, 0.007, lz], [lx, 0.024, lz], 0.0020, 0x33373d, 5);
      addGeo(new THREE.BoxGeometry(0.0065, 0.0075, 0.0065), 0xffe288, { p: [lx, 0.026, lz], r: [0, rot, 0] });
      features.push({ type: 'city', pos: [lx, 0.027, lz], size: 0.008 });
    }

    // Islote rocoso con baliza de piedra en el cuadrante frontal-derecho del lago
    const ix = 0.235, iz = 0.185;
    addGeo(new THREE.IcosahedronGeometry(0.024, 0), 0x6c6863, { p: [ix, -0.002, iz], s: [1.3, 0.75, 1.1], r: [0, 0.8, 0], amt: 0.09 });
    addGeo(new THREE.IcosahedronGeometry(0.016, 0), 0x7d7973, { p: [ix - 0.014, -0.004, iz + 0.008], s: [1.1, 0.65, 1.0], r: [0, 2.1, 0], amt: 0.09 });
    addGeo(new THREE.CylinderGeometry(0.008, 0.011, 0.026, 6), 0x8f8678, { p: [ix, 0.018, iz], amt: 0.05 });
    addGeo(new THREE.ConeGeometry(0.010, 0.014, 6), 0x35475e, { p: [ix, 0.044, iz] });
    addGeo(new THREE.BoxGeometry(0.008, 0.009, 0.008), 0xffe07d, { p: [ix, 0.034, iz] });
    features.push({ type: 'city', pos: [ix, 0.034, iz], size: 0.009 });
  }

  // =====================================================================
  // 8. CABAÑA DEL GUARDABOSQUES, CALABAZAS, SAUCE BOXEADOR Y BOSQUE PROHIBIDO
  // =====================================================================
  {
    const hx = -0.215, hz = -0.070, y0 = 0.052, rot = 0.35;
    const LH = makeLocal(hx, y0, hz, rot);

    // Cuerpo principal octogonal + cuerpo anexo más pequeño hundidos en la explanada
    addGeo(new THREE.CylinderGeometry(0.028, 0.032, 0.026, 8), 0x6f685f, { p: LH(0, -0.008, 0), amt: 0.07 });
    addGeo(new THREE.CylinderGeometry(0.026, 0.028, 0.032, 8), 0x8e8375, { p: LH(0, 0.016, 0), r: [0, rot, 0], amt: 0.06 });
    addGeo(new THREE.ConeGeometry(0.032, 0.034, 8), 0x3b444e, { p: LH(0, 0.049, 0), r: [0, rot, 0], amt: 0.06 });

    addGeo(new THREE.CylinderGeometry(0.019, 0.021, 0.026, 7), 0x867b6d, { p: LH(0.024, 0.006, 0.012), amt: 0.06 });
    addGeo(new THREE.ConeGeometry(0.023, 0.026, 7), 0x3b444e, { p: LH(0.024, 0.032, 0.012), amt: 0.06 });

    // Chimenea con humo vivo
    addGeo(new THREE.BoxGeometry(0.010, 0.034, 0.010), 0x736b62, { p: LH(-0.012, 0.044, -0.012), r: [0, rot, 0], amt: 0.06 });
    features.push({ type: 'smoke', pos: LH(-0.012, 0.064, -0.012), size: 0.0075 });

    // Puerta y ventanas cálidas en las caras visibles
    addGeo(new THREE.BoxGeometry(0.011, 0.019, 0.004), 0x5c3c24, { p: LH(0, 0.010, 0.026), r: [0, rot, 0] });
    addWin(LH(-0.024, 0.018, 0.008), rot - Math.PI / 2, 0.009, 0.010, true);
    addWin(LH(0, 0.018, -0.024), rot + Math.PI, 0.009, 0.010, true);
    addWin(LH(0.024, 0.015, 0.031), rot, 0.008, 0.009, true);

    // Huerto de calabazas junto a la cabaña
    for (const [px, pz, pr] of [[-0.032, 0.028, 0.006], [-0.022, 0.036, 0.0052], [-0.038, 0.015, 0.0055], [-0.016, 0.025, 0.0048]]) {
      const [wx, , wz] = LH(px, 0, pz);
      const wy = height(wx, wz);
      addGeo(new THREE.IcosahedronGeometry(pr, 0), 0xe07420, { p: [wx, wy + pr * 0.55, wz], s: [1.15, 0.78, 1.15], r: [0, rng() * 3, 0], amt: 0.07 });
      addGeo(new THREE.BoxGeometry(0.0022, 0.004, 0.0022), 0x3f6e33, { p: [wx, wy + pr * 1.15, wz] });
    }
  }

  // Círculo de piedras (Stone Circle) en la ladera oeste entre la cabaña y el patio
  {
    const sx = -0.22, sz = 0.038;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const mx = sx + Math.cos(a) * 0.022, mz = sz + Math.sin(a) * 0.022;
      const my = height(mx, mz);
      if (my < 0.012) continue;
      const mh = 0.020 + (i % 2) * 0.006;
      addGeo(new THREE.BoxGeometry(0.007, mh, 0.005), 0x7b7771, { p: [mx, my + mh * 0.35, mz], r: [0, -a, (i % 2 ? 0.06 : -0.06)], amt: 0.08 });
    }
    const cy = height(sx, sz);
    features.push({ type: 'firefly', pos: [sx, cy + 0.022, sz], size: 0.028 });
    features.push({ type: 'firefly', pos: [sx + 0.01, cy + 0.028, sz - 0.01], size: 0.028 });
  }

  // Sauce Boxeador (x = -0.155, z = -0.195)
  {
    const wx = -0.155, wz = -0.195, wy = height(wx, wz);
    addRod([wx, wy - 0.008, wz], [wx - 0.005, wy + 0.028, wz + 0.004], 0.0065, 0x563b26, 6);
    const limbs = [
      [[wx - 0.005, wy + 0.026, wz + 0.004], [wx - 0.024, wy + 0.048, wz + 0.018]],
      [[wx - 0.005, wy + 0.026, wz + 0.004], [wx + 0.018, wy + 0.046, wz + 0.012]],
      [[wx - 0.005, wy + 0.026, wz + 0.004], [wx - 0.012, wy + 0.052, wz - 0.020]],
      [[wx - 0.005, wy + 0.026, wz + 0.004], [wx + 0.014, wy + 0.042, wz - 0.018]],
    ];
    for (const [a, b] of limbs) {
      addRod(a, b, 0.0032, 0x5c402a, 5);
      addGeo(new THREE.IcosahedronGeometry(0.015, 0), rng() < 0.5 ? 0x4c7840 : 0x5c894a,
        { p: b, s: [1.1, 0.85, 1.1], r: [rng() * 3, rng() * 3, 0], amt: 0.1 });
    }
    addGeo(new THREE.IcosahedronGeometry(0.018, 0), 0x4b763f, { p: [wx - 0.003, wy + 0.042, wz + 0.002], s: [1.2, 0.75, 1.2], amt: 0.09 });
    features.push({ type: 'firefly', pos: [wx, wy + 0.042, wz], size: 0.028 });
    features.push({ type: 'firefly', pos: [wx - 0.015, wy + 0.048, wz + 0.012], size: 0.028 });
  }

  // Bosque Prohibido y arbolado (costados oeste, norte y noreste)
  {
    const placed = [];
    const avoid = [
      [-0.055, -0.075, 0.085], // Torreón
      [0.038, -0.105, 0.068],  // Astronomía
      [-0.12, 0.045, 0.092],   // Gran Comedor + Patio
      [-0.015, 0.035, 0.055],  // Reloj
      [0.20, -0.025, 0.076],   // Invernaderos
      [0.14, -0.16, 0.052],    // Lechucería
      [-0.215, -0.07, 0.064],  // Cabaña
      [-0.22, 0.038, 0.048],   // Círculo de piedras
      [-0.155, -0.195, 0.048], // Sauce Boxeador
      [0.085, 0.035, 0.088],   // Viaducto
      [-0.075, 0.145, 0.056],  // Escalinata y Embarcadero
    ];
    let tries = 0;
    while (placed.length < 22 && tries++ < 1200) {
      const ang = rng() * Math.PI * 2, r = 0.08 + rng() * 0.25;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = height(x, z);
      if (h < 0.016 || h > 0.138 || slopeAt(x, z) > 0.9) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.034)) continue;
      placed.push([x, z]);
      const sc = 0.7 + rng() * 0.55;
      const y = h - 0.005;
      addGeo(new THREE.CylinderGeometry(0.0038 * sc, 0.0048 * sc, 0.020 * sc, 5), 0x5b3c25, { p: [x, y + 0.010 * sc, z] });
      for (let j = 0; j < 3; j++) {
        addGeo(new THREE.ConeGeometry((0.021 - j * 0.005) * sc, 0.028 * sc, 6), j % 2 ? 0x264e36 : 0x316142,
          { p: [x, y + (0.028 + j * 0.016) * sc, z], r: [0, rng() * 3, 0], amt: 0.09 });
      }
      if (placed.length % 2 === 0) {
        features.push({ type: 'firefly', pos: [x + (rng() - 0.5) * 0.025, h + 0.025 + rng() * 0.03, z + (rng() - 0.5) * 0.025], size: 0.028 });
      }
    }
  }

  // Rocas y escollos en la ribera del Lago Negro
  {
    let n = 0, tries = 0;
    while (n < 12 && tries++ < 600) {
      const ang = rng() * Math.PI * 2, r = 0.14 + rng() * 0.21;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = height(x, z);
      if (h > -0.008 || h < -0.044) continue;
      if (Math.hypot(x + 0.045, z - 0.19) < 0.065) continue; // despejar Embarcadero
      if (Math.hypot(x - 0.085, z - 0.035) < 0.075) continue; // despejar Viaducto
      const s = 0.010 + rng() * 0.014;
      addGeo(new THREE.IcosahedronGeometry(s, 0), rng() < 0.5 ? 0x6e6a65 : 0x5c5853,
        { p: [x, -0.001, z], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.1, 0.65, 1.2], amt: 0.1 });
      n++;
    }
  }

  // --- destellos sobre el Lago Negro y nubes bajas alrededor de las torres ---
  for (let i = 0, tries = 0; i < 80 && tries < 2200; tries++) {
    const ang = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.94;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (height(x, z) > -0.010) continue;
    features.push({ type: 'sparkle', pos: [x, 0.0035, z], size: 0.009 });
    i++;
  }
  const cloudRing = [
    [-0.19, 0.34, -0.15, 0.018],
    [0.16,  0.37, -0.07, 0.019],
    [-0.08, 0.42, -0.22, 0.016],
    [0.21,  0.29,  0.14, 0.017],
    [-0.23, 0.28,  0.12, 0.016],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [-0.02, cy, -0.06], size: cs });
  }

  return finish('El Castillo del Lago');
}
