// Diorama "El Castillo de Hogwarts": versión de alta densidad (~65k-80k triángulos)
// y estética gótica oscura: acantilados de basalto, Lago Negro abisal, sillería
// envejecida, Gran Comedor, Patio con claustro, Embarcadero y Escalinata, Gran Torreón
// con 7 bartizans, Claustro Central (The Quad), Torre de Astronomía con esfera armilar,
// Torres de las Campanas, Torre del Reloj, Puente Cubierto de Madera, Gran Viaducto
// con dovelas, 3 Invernaderos, Lechucería, Círculo de Piedras, Cabaña, Sauce y Bosque.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildCastillo(seed = 29) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  // =====================================================================
  // PALETA OSCURA Y FUNCIONES DE TEXTURA PROCEDIMENTAL (SILLARES Y TEJAS)
  // =====================================================================
  // Sillería gótica envejecida: alterna bloques de piedra por fila y columna + humedad abajo
  const stoneColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 115 * scale);
    const col = Math.floor((cx + cz) * 85 * scale + (row % 2) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0x6e675b, 0x625b50, 0x787063, 0x575046];
    let hex = pal[h];
    // Verdín y humedad en las primeras hiladas cerca del suelo/roca
    if (yFloor > -0.5 && cy - yFloor < 0.018 && rng() < 0.45) hex = 0x484d41;
    return jitter(hex, 0.045);
  };

  // Tejado de pizarra oscura azul-carbón en hileras de losas
  const slateColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 140);
    const col = Math.floor((cx - cz) * 110 + (row % 2) * 0.5);
    const h = ((row * 31) ^ (col * 17)) & 3;
    const pal = [0x1a2330, 0x222d3d, 0x151c26, 0x263242];
    return jitter(pal[h], 0.05);
  };

  const woodColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 180) & 1;
    return jitter(k ? 0x3b281a : 0x4a3322, 0.05);
  };

  // =====================================================================
  // 1. TERRENO DE ALTA RESOLUCIÓN + ACANTILADOS DE BASALTO + LAGO NEGRO
  // =====================================================================
  const R = 0.40, FLOOR = -0.072;
  const EXPLANADAS = [
    { x: 0.015,  z: -0.095, hw: 0.112, hd: 0.078, rot: 0,     y: 0.148, r0: 0.014, r1: 0.046 }, // Núcleo (Torreón, Quad, Astronomía, Campanas)
    { x: -0.105, z: 0.042,  hw: 0.062, hd: 0.088, rot: 0.12,  y: 0.115, r0: 0.014, r1: 0.042 }, // Gran Comedor + Patio de Entrada
    { x: -0.015, z: 0.022,  hw: 0.026, hd: 0.026, rot: 0,     y: 0.115, r0: 0.010, r1: 0.030 }, // Edificio Recepción Viaducto
    { x: -0.175, z: -0.052, hw: 0.026, hd: 0.028, rot: 0.25,  y: 0.110, r0: 0.010, r1: 0.026 }, // Torre del Reloj
    { x: 0.215,  z: -0.035, hw: 0.056, hd: 0.072, rot: -0.15, y: 0.095, r0: 0.014, r1: 0.042 }, // Colina Este / Invernaderos
    { x: 0.145,  z: -0.195, hw: 0.026, hd: 0.026, rot: 0,     y: 0.112, r0: 0.010, r1: 0.034 }, // Risco de la Lechucería
    { x: -0.285, z: -0.100, hw: 0.028, hd: 0.028, rot: 0,     y: 0.068, r0: 0.010, r1: 0.026 }, // Loma Círculo de Piedras
    { x: -0.245, z: 0.058,  hw: 0.036, hd: 0.034, rot: 0.40,  y: 0.052, r0: 0.012, r1: 0.034 }, // Cabaña de Hagrid
  ];

  const rectDist = (x, z, p) => {
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  const rawHeight = (x, z) => {
    const hCore  = 0.205 * smooth(1 - Math.hypot(x - 0.015, z + 0.095) / 0.24);
    const hHall  = 0.170 * smooth(1 - Math.hypot(x + 0.105, z - 0.042) / 0.165);
    const hClock = 0.155 * smooth(1 - Math.hypot(x + 0.175, z + 0.052) / 0.115);
    const hOwl   = 0.155 * smooth(1 - Math.hypot(x - 0.145, z + 0.195) / 0.13);
    const hEast  = 0.145 * smooth(1 - Math.hypot(x - 0.215, z + 0.035) / 0.155);
    const hCirc  = 0.115 * smooth(1 - Math.hypot(x + 0.285, z + 0.100) / 0.13);
    const hHag   = 0.100 * smooth(1 - Math.hypot(x + 0.245, z - 0.058) / 0.15);
    const hBack  = 0.105 * smooth(1 - Math.hypot(x + 0.08,  z + 0.24)  / 0.16);
    let h = -0.055 + Math.max(hCore, hHall, hClock, hOwl, hEast, hCirc, hHag, hBack);

    // Garganta profunda bajo el Viaducto y barranco occidental bajo el Puente de Madera
    const gorgeEast = smooth(1 - Math.hypot((x - 0.095) * 1.45, (z - 0.022) * 0.95) / 0.108);
    const gorgeWest = smooth(1 - Math.hypot((x + 0.232) * 1.65, (z + 0.076) * 1.25) / 0.075);
    const bayLake   = smooth(1 - Math.hypot((x - 0.025) * 0.85, (z - 0.245) * 1.05) / 0.22);
    h -= 0.130 * gorgeEast + 0.075 * gorgeWest + 0.105 * bayLake;

    // Microrelieve rocoso estratificado
    h += (fbm(x * 15 + 3, z * 15 + 8) - 0.5) * 0.042;
    h += (fbm(x * 38 + 11, z * 38 + 2) - 0.5) * 0.010;
    const edge = smooth((Math.hypot(x, z) - R * 0.84) / (R * 0.15));
    h += (-0.055 - h) * edge;
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
    Math.hypot(height(x + 0.006, z) - height(x - 0.006, z), height(x, z + 0.006) - height(x, z - 0.006)) / 0.012;

  const K = 62, S = 176;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const r = R * Math.pow(k / K, 0.93);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = k === K ? -0.055 : height(x, z);
      const y = k === K ? 0 : Math.max(h, 0) + (h < 0 ? (fbm(x * 34, z * 34) - 0.5) * 0.0025 : 0);
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
    // Lago Negro abisal (solo espejo de agua plano, nunca laderas verticales de roca)
    if (h < 0 && hMax < 0.006 && slope < 0.20) {
      const t = smooth(1 + h / 0.055);
      tmpColor.setHex(0x071824).lerp(new THREE.Color(0x16394c), t * t);
      if (h > -0.0055) tmpColor.lerp(new THREE.Color(0x6e8fa1), 0.45); // espuma grisácea fría
      const k = 1 + (rng() - 0.5) * 0.06;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }
    if (slope > 0.28 || h > 0.114) {
      const band = Math.floor(((a.v.y + b.v.y + c.v.y) / 3) * 85) & 1;
      return jitter(band ? 0x26292e : (rng() < 0.5 ? 0x32353b : 0x1e2024), 0.075); // basalto oscuro
    }
    if (h < 0.010) return jitter(rng() < 0.5 ? 0x45423d : 0x383530, 0.06); // ribera de pizarra oscura
    return jitter(h > 0.070 ? 0x243825 : (rng() < 0.5 ? 0x2d432c : 0x1e2e1f), 0.075); // brezal escocés oscuro
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
  const rim = ringPts[K].map((p) => p.v);
  const centerBottom = new THREE.Vector3(0, FLOOR, 0);
  const radial = new THREE.Vector3();
  for (let s = 0; s < S; s++) {
    const a = rim[s], b = rim[(s + 1) % S];
    const a2 = new THREE.Vector3(a.x * 0.96, FLOOR, a.z * 0.96), b2 = new THREE.Vector3(b.x * 0.96, FLOOR, b.z * 0.96);
    radial.set(a.x + b.x, 0, a.z + b.z);
    addTri(a, b, a2, jitter(0x061520, 0.05), radial);
    addTri(b, b2, a2, jitter(0x05111a, 0.05), radial);
    addTri(a2, b2, centerBottom, jitter(0x282420, 0.04), DOWN);
  }

  // Salientes prismáticos angulosos de basalto incrustados en los acantilados (sin esferas lisas)
  for (let i = 0, tries = 0; i < 68 && tries < 2600; tries++) {
    const ang = rng() * Math.PI * 2, r = 0.06 + rng() * 0.29;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    // Despejar la escalinata frontal, el Embarcadero y el Puente de Madera
    if (Math.hypot(x + 0.065, z - 0.165) < 0.055) continue;
    if (Math.hypot(x + 0.232, z + 0.076) < 0.042) continue;
    const h = height(x, z), sl = slopeAt(x, z);
    if (sl < 0.42 || h < -0.015 || h > 0.132) continue;
    const rad = 0.008 + rng() * 0.013, bh = 0.024 + rng() * 0.036;
    addGeo(new THREE.CylinderGeometry(rad * 0.65, rad * 1.15, bh, 5 + Math.floor(rng() * 3), 2),
      rng() < 0.5 ? 0x24272c : 0x2f3339, {
        p: [x, h - 0.004, z],
        r: [(rng() - 0.5) * 0.35, rng() * Math.PI * 2, (rng() - 0.5) * 0.35],
        s: [1.1 + rng() * 0.4, 1, 0.9 + rng() * 0.5], amt: 0.08,
      });
    i++;
  }

  // =====================================================================
  // HELPERS ARQUITECTÓNICOS DE ALTA DETALLACIÓN
  // =====================================================================
  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };

  // Caja subdividida con textura de sillares o tejas
  const addSubBox = (w, h, d, sx, sy, sz, p, rot = 0, yFloor = -1, fn = null) => {
    addGeo(new THREE.BoxGeometry(w, h, d, sx, sy, sz), 0x6a6357, {
      p, r: [0, rot, 0], colorFn: fn || stoneColor(yFloor),
    });
  };

  // Ventanal gótico detallado: marco de piedra, parteluz vertical, travesaño, vidrio y luz nocturna
  const addDetailWin = (p, yaw, w, h, mullions = true) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    // Marco exterior en relieve
    addGeo(new THREE.BoxGeometry(w + 0.004, h + 0.005, 0.0045), 0x4b453d, { p, r: [0, yaw, 0], amt: 0.04 });
    // Vidrio oscuro emplomado
    addGeo(new THREE.BoxGeometry(w, h, 0.0052), 0x1d2938, {
      p: [p[0] + nx * 0.001, p[1], p[2] + nz * 0.001], r: [0, yaw, 0], amt: 0.03,
    });
    if (mullions) {
      addGeo(new THREE.BoxGeometry(0.0016, h, 0.0058), 0x3b3630, {
        p: [p[0] + nx * 0.0014, p[1], p[2] + nz * 0.0014], r: [0, yaw, 0],
      });
      if (h > 0.016) {
        addGeo(new THREE.BoxGeometry(w, 0.0015, 0.0058), 0x3b3630, {
          p: [p[0] + nx * 0.0014, p[1] + h * 0.14, p[2] + nz * 0.0014], r: [0, yaw, 0],
        });
      }
    }
    features.push({ type: 'window', pos: [p[0] + nx * 0.0045, p[1], p[2] + nz * 0.0045], yaw, w: w * 0.88, h: h * 0.88 });
  };

  // Tejado a dos aguas subdividido en faldones para sillería de pizarra + hastiales exactos + cumbrera
  const addGableZ = (p, rot, w, h, d, fn = slateColor, coreFn = stoneColor()) => {
    const slopeLen = Math.hypot(w / 2, h);
    const ang = Math.atan2(h, w / 2);
    const c = Math.cos(rot), s = Math.sin(rot);
    const loc = (lx, ly, lz) => [p[0] + lx * c + lz * s, p[1] + ly, p[2] - lx * s + lz * c];
    for (const side of [-1, 1]) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, side * -ang, 'YXZ'));
      addGeo(new THREE.BoxGeometry(slopeLen, 0.0045, d, 3, 1, Math.max(4, Math.round(d * 85))), 0x1e2736, {
        p: loc(side * (w / 4), h / 2, 0), q, colorFn: fn,
      });
    }
    // Núcleo y hastiales triangulares exactos dentro de los faldones (sin sobresalir)
    const shape = new THREE.Shape();
    shape.moveTo(-w * 0.47, 0.0005);
    shape.lineTo(w * 0.47, 0.0005);
    shape.lineTo(0, h - 0.002);
    shape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.004, d - 0.004), bevelEnabled: false });
    gableGeo.translate(0, 0, -Math.max(0.004, d - 0.004) / 2);
    addGeo(gableGeo, 0x5c554b, { p, r: [0, rot, 0], colorFn: coreFn });
    // Cumbrera moldurada
    addGeo(new THREE.BoxGeometry(0.004, 0.0045, d + 0.002), 0x3b424d, { p: loc(0, h, 0), r: [0, rot, 0] });
  };
  const addGableX = (p, rot, w, h, d, fn = slateColor, coreFn = stoneColor()) => addGableZ(p, rot + Math.PI / 2, d, h, w, fn, coreFn);

  // Contrafuerte gótico escalonado en 3 tramos + pináculo
  const addButtress = (p, rot, hTotal, depth = 0.009, width = 0.0075) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const off = (d) => [p[0] + d * s, p[1], p[2] + d * c];
    addGeo(new THREE.BoxGeometry(width, hTotal * 0.45, depth), 0x5d564b, { p: [p[0], p[1] + hTotal * 0.225, p[2]], r: [0, rot, 0], amt: 0.04 });
    addGeo(new THREE.BoxGeometry(width * 0.85, hTotal * 0.42, depth * 0.78), 0x686055, { p: [p[0], p[1] + hTotal * 0.65, p[2]], r: [0, rot, 0], amt: 0.04 });
    addGeo(new THREE.BoxGeometry(width * 0.70, hTotal * 0.16, depth * 0.62), 0x736b5e, { p: [p[0], p[1] + hTotal * 0.92, p[2]], r: [0, rot, 0], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(width * 0.48, 0.014, 4), 0x4f4940, { p: [p[0], p[1] + hTotal + 0.007, p[2]], r: [0, rot + Math.PI / 4, 0], amt: 0.05 });
    void off;
  };

  // Almenas individuales sobre un tramo recto de muro
  const addCrenels = (p0, p1, yTop, step = 0.0095, w = 0.0055, h = 0.0055, d = 0.0055) => {
    const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dz);
    const n = Math.max(2, Math.floor(len / step));
    const yaw = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      addGeo(new THREE.BoxGeometry(w, h, d), 0x625b50, {
        p: [p0[0] + dx * t, yTop + h * 0.35, p0[2] + dz * t], r: [0, yaw, 0], amt: 0.04,
      });
    }
  };

  // Buhardilla (lucarna) en tejado inclinado (vidrio oscuro de día, cálido de noche)
  const addDormer = (p, yaw, w = 0.009, h = 0.012, d = 0.011) => {
    addGeo(new THREE.BoxGeometry(w, h, d), 0x696256, { p, r: [0, yaw, 0], amt: 0.04 });
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    addGeo(new THREE.ConeGeometry(w * 0.74, 0.012, 4, 2), 0x1e2736, { p: [p[0], p[1] + h / 2 + 0.0055, p[2]], r: [0, yaw + Math.PI / 4, 0], colorFn: slateColor });
    addGeo(new THREE.BoxGeometry(w * 0.56, h * 0.56, 0.003), 0x1d2938, { p: [p[0] + nx * (d / 2), p[1], p[2] + nz * (d / 2)], r: [0, yaw, 0] });
    features.push({ type: 'window', pos: [p[0] + nx * (d / 2 + 0.002), p[1], p[2] + nz * (d / 2 + 0.002)], yaw, w: w * 0.5, h: h * 0.5 });
  };

  // =====================================================================
  // 2. GRAN COMEDOR, PATIO DE ENTRADA, ARCADAS DE ACANTILADO Y EMBARCADERO
  // =====================================================================
  {
    const rot = 0.12, y0 = 0.115;
    const L = makeLocal(-0.105, y0, 0.042, rot);

    // Enorme basamento / muro de acantilado hundido hasta y = 0.01 con arcos ciegos y contrafuertes
    addSubBox(0.072, 0.108, 0.124, 6, 8, 10, L(0, -0.050, -0.036), rot, 0.01);
    addSubBox(0.088, 0.108, 0.074, 7, 8, 6, L(0, -0.052, 0.056), rot, 0.01);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const bz = -0.085 + i * 0.025;
        addGeo(new THREE.BoxGeometry(0.009, 0.085, 0.009), 0x4b453d, { p: L(side * 0.038, -0.042, bz), r: [0, rot, 0], amt: 0.05 });
        if (i < 5) {
          addGeo(new THREE.BoxGeometry(0.005, 0.012, 0.016), 0x453f38, { p: L(side * 0.037, -0.006, bz + 0.0125), r: [0, rot, 0] });
        }
      }
    }

    // Nave del Gran Comedor (W=0.058, H=0.072, D=0.118)
    const W = 0.058, H = 0.072, D = 0.118, zHall = -0.034;
    addSubBox(W, H, D, 5, 8, 12, L(0, H / 2, zHall), rot, y0);
    addGableZ(L(0, H, zHall), rot, W + 0.010, 0.048, D + 0.010, slateColor);

    // Parapeto almenado en ambos costados del Gran Comedor
    for (const side of [-1, 1]) {
      addCrenels(L(side * (W / 2 - 0.001), H, zHall - D / 2 + 0.005), L(side * (W / 2 - 0.001), H, zHall + D / 2 - 0.005), y0 + H, 0.011, 0.0045, 0.005, 0.0045);
    }

    // 7 contrafuertes escalonados + 6 grandes ventanales góticos + 4 buhardillas por costado
    for (const side of [-1, 1]) {
      const yaw = rot + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      for (let i = 0; i < 7; i++) {
        const bz = zHall - D / 2 + 0.006 + i * ((D - 0.012) / 6);
        addButtress(L(side * (W / 2 + 0.002), 0, bz), yaw, H * 0.94, 0.009, 0.0075);
        if (i < 6) {
          addDetailWin(L(side * (W / 2 + 0.001), H * 0.56, bz + ((D - 0.012) / 12)), yaw, 0.0095, 0.032, true);
        }
      }
      for (let i = 0; i < 4; i++) {
        const dz = zHall - 0.036 + i * 0.024;
        addDormer(L(side * (W * 0.34), H + 0.022, dz), yaw, 0.0085, 0.011, 0.010);
      }
    }

    // Gran Rosetón Gótico frontal sobre el portón del Gran Comedor
    const fz = zHall + D / 2 + 0.0015;
    addGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 16), 0x4b453d, { p: L(0, H * 0.68, fz), r: [Math.PI / 2, rot, 0], amt: 0.04 });
    addGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.005, 16), 0x1d2938, { p: L(0, H * 0.68, fz + 0.0005), r: [Math.PI / 2, rot, 0] });
    for (let r = 0; r < 4; r++) {
      addGeo(new THREE.BoxGeometry(0.021, 0.0016, 0.0055), 0x554e45, { p: L(0, H * 0.68, fz + 0.0008), r: [0, rot, r * Math.PI / 4] });
    }
    features.push({ type: 'window', pos: L(0, H * 0.68, fz + 0.004), yaw: rot, w: 0.018, h: 0.018 });
    // Portón doble de roble y marco de piedra
    addGeo(new THREE.BoxGeometry(0.024, 0.030, 0.006), 0x4b453d, { p: L(0, 0.015, fz), r: [0, rot, 0] });
    addGeo(new THREE.BoxGeometry(0.018, 0.026, 0.007), 0x362417, { p: L(0, 0.013, fz + 0.0005), r: [0, rot, 0] });

    // 4 estandartes de las casas colgados en la fachada
    const houses = [0x8a221c, 0x1c5934, 0x1d3c6e, 0xb58624];
    for (let i = 0; i < 4; i++) {
      addGeo(new THREE.BoxGeometry(0.0075, 0.022, 0.003), houses[i], { p: L(-0.021 + i * 0.014, 0.024, fz + 0.002), r: [0, rot, 0], amt: 0.04 });
    }

    // Aguja / Linterna central del Gran Comedor (alta y detallada)
    const sz = zHall + 0.004;
    addSubBox(0.017, 0.028, 0.017, 2, 3, 2, L(0, H + 0.044, sz), rot);
    addGeo(new THREE.CylinderGeometry(0.011, 0.012, 0.004, 8), 0x4b453d, { p: L(0, H + 0.059, sz) });
    addGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.020, 8), 0x1c1a18, { p: L(0, H + 0.069, sz) });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addRod(L(Math.cos(a) * 0.0095, H + 0.060, sz + Math.sin(a) * 0.0095), L(Math.cos(a) * 0.0095, H + 0.080, sz + Math.sin(a) * 0.0095), 0.0014, 0x625b50, 5);
    }
    addGeo(new THREE.ConeGeometry(0.012, 0.056, 8, 4), 0x18212e, { p: L(0, H + 0.108, sz), colorFn: slateColor });
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0012, 0.014, 6), 0x9c7b38, { p: L(0, H + 0.141, sz) });
    addGeo(new THREE.SphereGeometry(0.003, 6, 4), 0x9c7b38, { p: L(0, H + 0.145, sz) });

    // Ábside poligonal norte (-Z) + chimenea alta de cocinas
    addGeo(new THREE.CylinderGeometry(0.025, 0.027, H * 0.90, 8, 5), 0x625b50, { p: L(0, H * 0.45, zHall - D / 2 - 0.008), colorFn: stoneColor(y0) });
    addGeo(new THREE.ConeGeometry(0.030, 0.044, 8, 3), 0x1a2330, { p: L(0, H * 0.90 + 0.022, zHall - D / 2 - 0.008), colorFn: slateColor });
    addDetailWin(L(0, H * 0.56, zHall - D / 2 - 0.033), rot + Math.PI, 0.011, 0.026, true);
    addSubBox(0.012, 0.042, 0.012, 2, 4, 2, L(-0.025, H + 0.014, zHall - 0.030), rot);
    features.push({ type: 'smoke', pos: L(-0.025, H + 0.038, zHall - 0.030), size: 0.007 });

    // Patio de Entrada con claustro perimetral porticado y Torres Gemelas de Puerta
    const PW = 0.080, PD = 0.062, zPat = 0.056;
    addSubBox(PW, 0.006, PD, 8, 1, 6, L(0, 0.003, zPat), rot, y0, (va, vb, vc) => {
      const ix = Math.floor((va.x + vb.x + vc.x) * 40), iz = Math.floor((va.z + vb.z + vc.z) * 40);
      return jitter((ix + iz) % 2 ? 0x4e4941 : 0x3e3a34, 0.04);
    });
    // Galería porticada lado oeste del patio con arcadas reales y columnas
    addSubBox(0.012, 0.008, PD, 2, 1, 6, L(-PW / 2, 0.024, zPat), rot);
    addSubBox(0.012, 0.005, PD, 2, 1, 6, L(-PW / 2, 0.0025, zPat), rot);
    for (let i = 0; i < 6; i++) {
      const pz = zPat - PD / 2 + 0.005 + i * ((PD - 0.010) / 5);
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0025, 0.020, 8), 0x6b6458, { p: L(-PW / 2 + 0.003, 0.013, pz) });
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0025, 0.020, 8), 0x6b6458, { p: L(-PW / 2 - 0.003, 0.013, pz) });
    }
    addCrenels(L(-PW / 2, 0.028, zPat - PD / 2), L(-PW / 2, 0.028, zPat + PD / 2), y0 + 0.028, 0.009);
    // Muros frontales del patio con arco de acceso y 2 torres gemelas
    for (const side of [-1, 1]) {
      addSubBox(0.024, 0.028, 0.011, 3, 2, 2, L(side * (PW / 2 - 0.012), 0.014, zPat + PD / 2), rot);
      addCrenels(L(side * (PW / 2 - 0.022), 0.028, zPat + PD / 2), L(side * (PW / 2), 0.028, zPat + PD / 2), y0 + 0.028, 0.008);
      const tx = side * (PW / 2 - 0.001), tz = zPat + PD / 2;
      addGeo(new THREE.CylinderGeometry(0.010, 0.0115, 0.056, 16, 4), 0x625b50, { p: L(tx, 0.028, tz), colorFn: stoneColor(y0) });
      addGeo(new THREE.ConeGeometry(0.0135, 0.032, 16, 3), 0x1a2330, { p: L(tx, 0.072, tz), colorFn: slateColor });
      addDetailWin(L(tx, 0.036, tz + 0.0105), rot, 0.005, 0.010, false);
      const bx = side * 0.016, bz = zPat + PD / 2 + 0.009;
      addGeo(new THREE.CylinderGeometry(0.0045, 0.0035, 0.015, 8), 0x26292e, { p: L(bx, 0.0075, bz) });
      features.push({ type: 'flame', pos: L(bx, 0.016, bz), size: 0.0055 });
    }
  }

  // =====================================================================
  // 3. EMBARCADERO GÓTICO, ESCALINATA ALMENADA Y 6 BOTES EN EL LAGO NEGRO
  // =====================================================================
  {
    const bx = -0.040, bz = 0.205;
    // Cimientos profundos hundidos hasta -0.05
    addSubBox(0.062, 0.060, 0.064, 4, 4, 4, [bx, -0.020, bz], 0, -0.05);
    addSubBox(0.054, 0.038, 0.056, 4, 3, 4, [bx, 0.026, bz], 0, 0.006);
    addGableZ([bx, 0.045, bz], 0, 0.060, 0.026, 0.062, slateColor);
    // Nave transversal cruzada
    addSubBox(0.064, 0.030, 0.030, 4, 2, 2, [bx, 0.022, bz - 0.008], 0, 0.006);
    addGableX([bx, 0.037, bz - 0.008], 0, 0.066, 0.022, 0.034, slateColor);
    // Pórtico de entrada oscuro para los botes
    addGeo(new THREE.BoxGeometry(0.026, 0.026, 0.009), 0x141210, { p: [bx, 0.018, bz + 0.025] });
    // Torreta lateral del embarcadero
    addGeo(new THREE.CylinderGeometry(0.011, 0.013, 0.072, 12, 3), 0x625b50, { p: [bx + 0.026, 0.032, bz - 0.014], colorFn: stoneColor(0) });
    addGeo(new THREE.ConeGeometry(0.015, 0.032, 12, 2), 0x1a2330, { p: [bx + 0.026, 0.084, bz - 0.014], colorFn: slateColor });
    addDetailWin([bx + 0.026, 0.042, bz - 0.002], 0.3, 0.006, 0.012, false);
    addDetailWin([bx - 0.028, 0.028, bz], -Math.PI / 2, 0.010, 0.014, true);
    features.push({ type: 'flame', pos: [bx - 0.017, 0.028, bz + 0.031], size: 0.005 });
    features.push({ type: 'flame', pos: [bx + 0.017, 0.028, bz + 0.031], size: 0.005 });

    // Muelle de madera oscura
    for (let i = 0; i < 6; i++) {
      addGeo(new THREE.BoxGeometry(0.030, 0.004, 0.007), 0x3b281a, { p: [bx, 0.009, bz + 0.033 + i * 0.0085], colorFn: woodColor });
    }
    for (const sx of [-0.013, 0.013]) for (const dz of [0.045, 0.074]) {
      addGeo(new THREE.CylinderGeometry(0.0025, 0.0025, 0.038, 6), 0x2c1d12, { p: [bx + sx, -0.006, bz + dz] });
    }

    // Escalinata de 20 peldaños con pretiles almenados subiendo desde el Embarcadero al Patio
    const sx0 = bx - 0.005, sy0 = 0.026, sz0 = bz - 0.022;
    const sx1 = -0.095, sy1 = 0.115, sz1 = 0.128;
    const steps = 18;
    const sAng = Math.atan2(sx1 - sx0, sz1 - sz0);
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const px = sx0 + (sx1 - sx0) * t, py = sy0 + (sy1 - sy0) * t, pz = sz0 + (sz1 - sz0) * t;
      addGeo(new THREE.BoxGeometry(0.026, 0.045, 0.014), 0x5c554b, { p: [px, py - 0.020, pz], r: [0, sAng, 0], amt: 0.05 });
      if (i % 3 === 0) {
        for (const sw of [-0.013, 0.013]) {
          addGeo(new THREE.BoxGeometry(0.004, 0.012, 0.012), 0x676054, {
            p: [px + Math.cos(sAng) * sw, py + 0.008, pz - Math.sin(sAng) * sw], r: [0, sAng, 0],
          });
        }
      }
    }

    // 6 Botes detallados navegando en fila por el Lago Negro
    const boats = [
      [0.010, 0.295, -0.25],
      [0.075, 0.275, -0.42],
      [0.140, 0.235, -0.62],
      [0.195, 0.175, -0.82],
      [-0.115, 0.285, 0.24],
      [-0.185, 0.255, 0.42],
    ];
    for (const [x, z, r] of boats) {
      if (height(x, z) > -0.008) continue;
      addGeo(new THREE.CylinderGeometry(0.012, 0.006, 0.015, 10), 0x3b2618, { p: [x, -0.001, z], r: [0, r, 0], s: [0.85, 1, 2.1], colorFn: woodColor });
      for (const offZ of [-0.006, 0.005]) {
        addGeo(new THREE.BoxGeometry(0.013, 0.0022, 0.0035), 0x4d3321, { p: [x + Math.sin(r) * offZ, 0.007, z + Math.cos(r) * offZ], r: [0, r, 0] });
      }
      const lx = x + Math.sin(r) * 0.018, lz = z + Math.cos(r) * 0.018;
      addRod([lx, 0.006, lz], [lx, 0.023, lz], 0.0019, 0x22252a, 6);
      addGeo(new THREE.BoxGeometry(0.006, 0.007, 0.006), 0xffdd78, { p: [lx, 0.025, lz], r: [0, r, 0] });
      features.push({ type: 'city', pos: [lx, 0.026, lz], size: 0.008 });
    }
  }

  // =====================================================================
  // 4. NÚCLEO CENTRAL: EDIFICIO RECEPCIÓN, GRAN TORREÓN, CLAUSTRO (QUAD),
  //    TORRE DE ASTRONOMÍA Y TORRES GEMELAS DE LAS CAMPANAS
  // =====================================================================
  {
    const y0 = 0.148;

    // Edificio de Recepción del Viaducto (y = 0.115) conectando Patio con Viaducto
    {
      const rx = -0.015, rz = 0.022, ry = 0.115;
      addSubBox(0.052, 0.085, 0.050, 4, 5, 4, [rx, ry + 0.004, rz], 0, ry - 0.04);
      addGableX([rx, ry + 0.046, rz], 0, 0.054, 0.028, 0.054, slateColor);
      // Dos torretas frontales flanqueando la llegada del Viaducto
      for (const sz of [-0.022, 0.022]) {
        addGeo(new THREE.CylinderGeometry(0.010, 0.011, 0.088, 12, 3), 0x635c51, { p: [rx + 0.024, ry + 0.032, rz + sz], colorFn: stoneColor(ry) });
        addGeo(new THREE.ConeGeometry(0.013, 0.034, 12, 2), 0x1a2330, { p: [rx + 0.024, ry + 0.093, rz + sz], colorFn: slateColor });
      }
      addDetailWin([rx, ry + 0.026, rz + 0.026], 0, 0.012, 0.022, true);
      addDetailWin([rx - 0.022, ry + 0.026, rz + 0.026], 0, 0.010, 0.018, true);
    }

    // LA GRAN TORRE DE LA ESCALERA (Grand Staircase Keep) en (-0.055, -0.085)
    {
      const kx = -0.055, kz = -0.085;
      // Basamento macizo hundido en la roca
      addGeo(new THREE.CylinderGeometry(0.058, 0.066, 0.068, 28, 4), 0x3b3834, { p: [kx, y0 - 0.020, kz], colorFn: stoneColor(y0 - 0.05) });
      // Cuerpo cilíndrico de 28 lados con bandas de cornisas molduradas
      const kh = 0.172, kr = 0.049;
      addGeo(new THREE.CylinderGeometry(kr * 0.94, kr, kh, 28, 12), 0x6a6357, { p: [kx, y0 + kh / 2, kz], colorFn: stoneColor(y0) });
      for (const ry of [0.035, 0.075, 0.118, 0.155]) {
        const rr = kr * (1 - (ry / kh) * 0.06) + 0.0025;
        addGeo(new THREE.CylinderGeometry(rr, rr, 0.005, 28), 0x4f4940, { p: [kx, y0 + ry, kz] });
      }
      // Cornisa superior y gran chapitel cónico con 8 lucarnas
      addGeo(new THREE.CylinderGeometry(kr * 1.03, kr * 0.95, 0.014, 28), 0x4f4940, { p: [kx, y0 + kh + 0.005, kz] });
      addGeo(new THREE.ConeGeometry(kr * 1.14, 0.125, 28, 8), 0x18212e, { p: [kx, y0 + kh + 0.072, kz], colorFn: slateColor });
      addGeo(new THREE.CylinderGeometry(0.0014, 0.0022, 0.026, 8), 0x9c7b38, { p: [kx, y0 + kh + 0.145, kz] });
      addGeo(new THREE.SphereGeometry(0.0038, 8, 5), 0x9c7b38, { p: [kx, y0 + kh + 0.155, kz] });

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const dr = kr * 0.72;
        addDormer([kx + Math.sin(a) * dr, y0 + kh + 0.042, kz + Math.cos(a) * dr], a, 0.008, 0.011, 0.010);
      }

      // Ventanas en espiral siguiendo la Gran Escalera
      for (let i = 0; i < 12; i++) {
        const a = i * 0.85;
        const wy = y0 + 0.028 + i * 0.0115;
        const wr = kr * (1 - ((wy - y0) / kh) * 0.06) - 0.0005;
        addDetailWin([kx + Math.sin(a) * wr, wy, kz + Math.cos(a) * wr], a, 0.0075, 0.016, true);
      }

      // 7 torrecillas colgantes (bartizans) escalonadas con ménsulas de 3 anillos
      const bartizans = [
        { ang: 0.35, dy: 0.112, r: 0.013, h: 0.052, ch: 0.048 },
        { ang: 1.25, dy: 0.135, r: 0.011, h: 0.042, ch: 0.040 },
        { ang: 2.15, dy: 0.118, r: 0.014, h: 0.056, ch: 0.052 },
        { ang: 3.05, dy: 0.095, r: 0.012, h: 0.044, ch: 0.042 },
        { ang: 3.95, dy: 0.128, r: 0.013, h: 0.048, ch: 0.046 },
        { ang: 4.85, dy: 0.105, r: 0.011, h: 0.040, ch: 0.038 },
        { ang: 5.65, dy: 0.140, r: 0.012, h: 0.046, ch: 0.044 },
      ];
      for (const b of bartizans) {
        const dist = kr * 0.88;
        const bx = kx + Math.sin(b.ang) * dist, bz = kz + Math.cos(b.ang) * dist;
        const by = y0 + b.dy;
        addGeo(new THREE.ConeGeometry(b.r, 0.026, 12), 0x4f4940, { p: [bx, by - 0.013, bz], r: [Math.PI, 0, 0], amt: 0.04 });
        addGeo(new THREE.CylinderGeometry(b.r, b.r * 0.96, b.h, 12, 3), 0x6b6458, { p: [bx, by + b.h / 2, bz], colorFn: stoneColor(by) });
        addGeo(new THREE.ConeGeometry(b.r * 1.25, b.ch, 12, 3), 0x1a2330, { p: [bx, by + b.h + b.ch / 2, bz], colorFn: slateColor });
        addDetailWin([bx + Math.sin(b.ang) * b.r, by + b.h * 0.55, bz + Math.cos(b.ang) * b.r], b.ang, 0.0055, 0.013, false);
      }
    }

    // Ala maciza uniendo Gran Comedor con Torreón y Claustro
    addSubBox(0.068, 0.088, 0.064, 5, 5, 5, [-0.082, y0 + 0.012, -0.028], 0.32, y0 - 0.03);
    addGableZ([-0.082, y0 + 0.056, -0.028], 0.32, 0.070, 0.032, 0.066, slateColor);

    // EL GRAN CLAUSTRO CENTRAL (THE QUAD) en (0.045, -0.085) — 4 alas alrededor de patio interior
    {
      const qx = 0.045, qz = -0.085, qW = 0.112, qD = 0.096, wingW = 0.030, wingH = 0.076;
      // Suelo del patio interior del Claustro
      addSubBox(qW, 0.035, qD, 6, 2, 6, [qx, y0 - 0.014, qz], 0, y0 - 0.03);
      // Ala Norte y Ala Sur (ejes a lo largo de X) con contrafuertes y arcadas en el claustro
      for (const sz of [-qD / 2 + wingW / 2, qD / 2 - wingW / 2]) {
        const wz = qz + sz;
        addSubBox(qW, wingH, wingW, 10, 6, 3, [qx, y0 + wingH / 2, wz], 0, y0);
        addGableX([qx, y0 + wingH, wz], 0, qW + 0.006, 0.028, wingW + 0.006, slateColor);
        const outYaw = sz > 0 ? 0 : Math.PI;
        for (let i = 0; i < 5; i++) {
          const bx = qx - 0.044 + i * 0.022;
          addButtress([bx, y0, wz + Math.sign(sz) * (wingW / 2 + 0.001)], outYaw, wingH * 0.90, 0.007, 0.006);
          if (i < 4) {
            const wx = bx + 0.011;
            addDetailWin([wx, y0 + 0.048, wz + Math.sign(sz) * (wingW / 2 + 0.001)], outYaw, 0.0085, 0.020, true);
            addDetailWin([wx, y0 + 0.020, wz + Math.sign(sz) * (wingW / 2 + 0.001)], outYaw, 0.0075, 0.015, true);
            addDormer([wx, y0 + wingH + 0.014, wz + Math.sign(sz) * (wingW * 0.28)], outYaw, 0.0075, 0.010, 0.009);
          }
        }
      }
      // Ala Oeste y Ala Este (ejes a lo largo de Z) con contrafuertes y ventanales
      for (const sx of [-qW / 2 + wingW / 2, qW / 2 - wingW / 2]) {
        const wx = qx + sx;
        addSubBox(wingW, wingH, qD - wingW * 1.4, 3, 6, 8, [wx, y0 + wingH / 2, qz], 0, y0);
        addGableZ([wx, y0 + wingH, qz], 0, wingW + 0.006, 0.028, qD - wingW * 1.2, slateColor);
        const outYaw = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
        for (let i = 0; i < 4; i++) {
          const bz = qz - 0.030 + i * 0.020;
          addButtress([wx + Math.sign(sx) * (wingW / 2 + 0.001), y0, bz], outYaw, wingH * 0.90, 0.007, 0.006);
          if (i < 3) {
            const wz = bz + 0.010;
            addDetailWin([wx + Math.sign(sx) * (wingW / 2 + 0.001), y0 + 0.048, wz], outYaw, 0.0085, 0.020, true);
            addDetailWin([wx + Math.sign(sx) * (wingW / 2 + 0.001), y0 + 0.020, wz], outYaw, 0.0075, 0.015, true);
            addDormer([wx + Math.sign(sx) * (wingW * 0.28), y0 + wingH + 0.014, wz], outYaw, 0.0075, 0.010, 0.009);
          }
        }
      }
      // 4 chimeneas góticas agrupadas en las alas del Claustro
      for (const [cx, cz] of [[qx - 0.025, qz - 0.036], [qx + 0.030, qz - 0.036], [qx - 0.020, qz + 0.036]]) {
        addSubBox(0.011, 0.032, 0.011, 1, 3, 1, [cx, y0 + wingH + 0.022, cz], 0);
        addGeo(new THREE.CylinderGeometry(0.0022, 0.0025, 0.010, 6), 0x3b3630, { p: [cx - 0.0025, y0 + wingH + 0.042, cz] });
        addGeo(new THREE.CylinderGeometry(0.0022, 0.0025, 0.010, 6), 0x3b3630, { p: [cx + 0.0025, y0 + wingH + 0.042, cz] });
      }
    }

    // LA TORRE DE ASTRONOMÍA en (0.032, -0.140) — aguja más alta con esfera armilar
    {
      const ax = 0.032, az = -0.140, ah = 0.198, ar = 0.026;
      addGeo(new THREE.CylinderGeometry(0.033, 0.038, 0.056, 16, 2), 0x45413c, { p: [ax, y0 - 0.016, az], colorFn: stoneColor(y0 - 0.04) });
      addGeo(new THREE.CylinderGeometry(ar * 0.92, ar, ah, 16, 8), 0x6d665a, { p: [ax, y0 + ah / 2, az], colorFn: stoneColor(y0) });
      // Contrafuertes altos en la base de la torre
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.4;
        addButtress([ax + Math.sin(a) * ar, y0, az + Math.cos(a) * ar], a, 0.095, 0.008, 0.007);
      }
      // Galería observatorio de 12 columnas y arcos
      const gy = y0 + ah;
      addGeo(new THREE.CylinderGeometry(0.035, 0.028, 0.014, 16), 0x524c43, { p: [ax, gy + 0.005, az] });
      addGeo(new THREE.CylinderGeometry(0.021, 0.021, 0.024, 12), 0x1a1918, { p: [ax, gy + 0.022, az] });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        addRod([ax + Math.cos(a) * 0.031, gy + 0.010, az + Math.sin(a) * 0.031], [ax + Math.cos(a) * 0.031, gy + 0.034, az + Math.sin(a) * 0.031], 0.0018, 0x6b6458, 6);
      }
      addGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.005, 16), 0x524c43, { p: [ax, gy + 0.035, az] });
      // 4 torrecillas de esquina en la galería
      for (let i = 0; i < 4; i++) {
        const pa = (i * Math.PI) / 2 + Math.PI / 4;
        const px = ax + Math.cos(pa) * 0.029, pz = az + Math.sin(pa) * 0.029;
        addGeo(new THREE.CylinderGeometry(0.005, 0.0055, 0.028, 8), 0x6a6357, { p: [px, gy + 0.044, pz] });
        addGeo(new THREE.ConeGeometry(0.0068, 0.022, 8, 2), 0x1a2330, { p: [px, gy + 0.068, pz], colorFn: slateColor });
      }
      // Gran chapitel agudo + esfera armilar de latón en la cúspide
      addGeo(new THREE.ConeGeometry(0.030, 0.128, 16, 6), 0x161f2b, { p: [ax, gy + 0.098, az], colorFn: slateColor });
      const sy = gy + 0.172;
      addGeo(new THREE.CylinderGeometry(0.0016, 0.0022, 0.020, 6), 0x9c7b38, { p: [ax, sy - 0.008, az] });
      addGeo(new THREE.TorusGeometry(0.0075, 0.0014, 6, 16), 0x9c7b38, { p: [ax, sy + 0.003, az], r: [0.5, 0.2, 0] });
      addGeo(new THREE.TorusGeometry(0.0075, 0.0014, 6, 16), 0x9c7b38, { p: [ax, sy + 0.003, az], r: [-0.5, 1.3, 0] });
      addGeo(new THREE.SphereGeometry(0.003, 6, 4), 0xb89344, { p: [ax, sy + 0.003, az] });
      features.push({ type: 'flame', pos: [ax, gy + 0.026, az + 0.032], size: 0.006 });

      for (const ang of [0.1, 1.65, 3.2, 4.75]) {
        addDetailWin([ax + Math.sin(ang) * ar, y0 + 0.068, az + Math.cos(ang) * ar], ang, 0.008, 0.022, true);
        addDetailWin([ax + Math.sin(ang) * ar * 0.96, y0 + 0.118, az + Math.cos(ang) * ar * 0.96], ang, 0.008, 0.020, true);
        addDetailWin([ax + Math.sin(ang) * ar * 0.93, y0 + 0.165, az + Math.cos(ang) * ar * 0.93], ang, 0.007, 0.016, true);
      }
    }

    // Ala de la Enfermería (Hospital Wing) uniendo Torreón con Torre del Reloj (-0.125, -0.092)
    {
      const hx = -0.122, hz = -0.092, hrot = -0.35, hy = 0.132;
      addSubBox(0.068, 0.088, 0.032, 6, 6, 3, [hx, hy - 0.005, hz], hrot, 0.02);
      addGableX([hx, hy + 0.039, hz], hrot, 0.070, 0.024, 0.036, slateColor);
      const LHosp = makeLocal(hx, hy, hz, hrot);
      for (let i = 0; i < 4; i++) {
        const wx = -0.024 + i * 0.016;
        addDetailWin(LHosp(wx, 0.020, -0.017), hrot + Math.PI, 0.0085, 0.022, true);
        addDetailWin(LHosp(wx, 0.020, 0.017), hrot, 0.0085, 0.022, true);
        addDormer(LHosp(wx, 0.048, -0.010), hrot + Math.PI, 0.007, 0.009, 0.009);
      }
      // Torre Oscura (Dark Tower) en el flanco norte del Claustro (0.078, -0.155)
      const dx = 0.078, dz = -0.155, dy = 0.148;
      addGeo(new THREE.CylinderGeometry(0.020, 0.024, 0.046, 16, 3), 0x3b3834, { p: [dx, dy - 0.012, dz], colorFn: stoneColor(dy - 0.04) });
      addGeo(new THREE.CylinderGeometry(0.017, 0.019, 0.135, 16, 7), 0x645d52, { p: [dx, dy + 0.068, dz], colorFn: stoneColor(dy) });
      addGeo(new THREE.ConeGeometry(0.022, 0.068, 16, 4), 0x161f2b, { p: [dx, dy + 0.168, dz], colorFn: slateColor });
      addDetailWin([dx, dy + 0.088, dz - 0.019], Math.PI, 0.0075, 0.018, true);
      addDetailWin([dx + 0.019, dy + 0.062, dz], Math.PI / 2, 0.0075, 0.018, true);
    }

    // LAS TORRES GEMELAS DE LAS CAMPANAS (Bell Towers) en el borde este del Claustro
    for (const tz of [-0.062, -0.108]) {
      const tx = 0.102, tw = 0.026, th = 0.128;
      addSubBox(tw, th, tw, 3, 7, 3, [tx, y0 + th / 2, tz], 0, y0);
      addGeo(new THREE.BoxGeometry(tw + 0.006, 0.008, tw + 0.006), 0x4f4940, { p: [tx, y0 + th + 0.003, tz] });
      addGeo(new THREE.ConeGeometry(tw * 0.78, 0.048, 4, 3), 0x1a2330, { p: [tx, y0 + th + 0.030, tz], r: [0, Math.PI / 4, 0], colorFn: slateColor });
      for (let i = 0; i < 4; i++) {
        const ca = (i * Math.PI) / 2 + Math.PI / 4;
        addGeo(new THREE.ConeGeometry(0.0035, 0.014, 4), 0x5c554b, { p: [tx + Math.cos(ca) * 0.013, y0 + th + 0.013, tz + Math.sin(ca) * 0.013], r: [0, Math.PI / 4, 0] });
      }
      addDetailWin([tx + tw / 2 + 0.001, y0 + th - 0.022, tz], Math.PI / 2, 0.009, 0.024, true);
      addDetailWin([tx, y0 + th - 0.022, tz + (tz > -0.085 ? tw / 2 + 0.001 : -tw / 2 - 0.001)], tz > -0.085 ? 0 : Math.PI, 0.009, 0.024, true);
    }
  }

  // =====================================================================
  // 5. TORRE DEL RELOJ, PUENTE CUBIERTO DE MADERA Y GRAN VIADUCTO
  // =====================================================================
  {
    // TORRE DEL RELOJ en el flanco suroeste (-0.175, -0.052, y = 0.110)
    const cx = -0.175, cz = -0.052, y0 = 0.110, rot = 0.25;
    const L = makeLocal(cx, y0, cz, rot);
    const tw = 0.042, th = 0.128;
    addSubBox(tw + 0.012, 0.075, tw + 0.012, 4, 5, 4, L(0, -0.028, 0), rot, y0 - 0.05);
    addSubBox(tw, th, tw, 4, 8, 4, L(0, th / 2, 0), rot, y0);
    // Galería saliente y chapitel piramidal con 4 pináculos
    addGeo(new THREE.BoxGeometry(tw + 0.008, 0.010, tw + 0.008), 0x4f4940, { p: L(0, th + 0.004, 0), r: [0, rot, 0] });
    addGeo(new THREE.ConeGeometry(tw * 0.78, 0.068, 4, 4), 0x18212e, { p: L(0, th + 0.042, 0), r: [0, rot + Math.PI / 4, 0], colorFn: slateColor });
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0018, 0.018, 6), 0x9c7b38, { p: L(0, th + 0.084, 0) });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      addGeo(new THREE.ConeGeometry(0.004, 0.016, 4), 0x5c554b, { p: L(sx * tw * 0.52, th + 0.016, sz * tw * 0.52), r: [0, rot + Math.PI / 4, 0] });
    }
    // Reloj Monumental 3D en cara -X/+Z (mirando hacia el barranco y frente) y cara opuesta
    for (const [sgn, yawFace] of [[1, rot], [-1, rot + Math.PI]]) {
      const fz = sgn * (tw / 2 + 0.0018), fy = th - 0.028;
      addGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 16), 0x4f4940, { p: L(0, fy, fz), r: [Math.PI / 2, yawFace, 0] });
      addGeo(new THREE.CylinderGeometry(0.0115, 0.0115, 0.0048, 16), 0x9c7b38, { p: L(0, fy, fz + sgn * 0.0006), r: [Math.PI / 2, yawFace, 0] });
      addGeo(new THREE.CylinderGeometry(0.0098, 0.0098, 0.0054, 16), 0xd8ceb2, { p: L(0, fy, fz + sgn * 0.0012), r: [Math.PI / 2, yawFace, 0] });
      // 12 marcas horarias
      for (let m = 0; m < 12; m++) {
        const ma = (m / 12) * Math.PI * 2;
        addGeo(new THREE.BoxGeometry(0.001, 0.0022, 0.0015), 0x1e2024, {
          p: L(Math.sin(ma) * 0.008, fy + Math.cos(ma) * 0.008, fz + sgn * 0.0038), r: [0, yawFace, -ma],
        });
      }
      addGeo(new THREE.BoxGeometry(0.0016, 0.0075, 0.0018), 0x16181c, { p: L(-0.0015, fy + 0.002, fz + sgn * 0.0044), r: [0, yawFace, 0.55] });
      addGeo(new THREE.BoxGeometry(0.0016, 0.0055, 0.0018), 0x16181c, { p: L(0.0018, fy + 0.001, fz + sgn * 0.0044), r: [0, yawFace, -0.95] });
      // Óculo del péndulo debajo
      addDetailWin(L(0, fy - 0.026, fz), yawFace, 0.010, 0.018, true);
    }
    addDetailWin(L(-tw / 2 - 0.001, 0.068, 0), rot - Math.PI / 2, 0.011, 0.024, true);
    // Muro conector entre Torre del Reloj y Gran Comedor
    addSubBox(0.050, 0.048, 0.028, 3, 3, 2, [-0.145, 0.112 + 0.018, -0.042], 0.2, 0.110);
    addGableX([-0.145, 0.112 + 0.042, -0.042], 0.2, 0.052, 0.018, 0.032, slateColor);

    // EL PUENTE CUBIERTO DE MADERA (Wooden Bridge) desde (-0.192, -0.060, y=0.108) hasta (-0.278, -0.098, y=0.068)
    {
      const bx0 = -0.190, by0 = 0.110, bz0 = -0.058;
      const bx1 = -0.276, by1 = 0.069, bz1 = -0.097;
      const dx = bx1 - bx0, dy = by1 - by0, dz = bz1 - bz0;
      const lenXZ = Math.hypot(dx, dz), fullLen = Math.hypot(dx, dy, dz);
      const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, lenXZ);
      const qBridge = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      const mid = [(bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2];

      // Tablero, paredes entramadas con cerchas en X y techo a dos aguas del puente
      addGeo(new THREE.BoxGeometry(0.019, 0.005, fullLen + 0.008, 2, 1, 8), 0x3b281a, { p: mid, q: qBridge, colorFn: woodColor });
      addGeo(new THREE.BoxGeometry(0.021, 0.005, fullLen + 0.008, 2, 1, 8), 0x1d2530, { p: [mid[0], mid[1] + 0.023, mid[2]], q: qBridge, colorFn: slateColor });
      for (const side of [-0.0078, 0.0078]) {
        const ox = Math.cos(yaw) * side, oz = -Math.sin(yaw) * side;
        addGeo(new THREE.BoxGeometry(0.0025, 0.006, fullLen + 0.006, 1, 1, 6), 0x452f1f, { p: [mid[0] + ox, mid[1] + 0.004, mid[2] + oz], q: qBridge });
        addGeo(new THREE.BoxGeometry(0.0022, 0.0025, fullLen + 0.006, 1, 1, 6), 0x452f1f, { p: [mid[0] + ox, mid[1] + 0.019, mid[2] + oz], q: qBridge });
      }
      // 7 pares de caballetes de madera bajando hasta el lecho del barranco + cerchas en X
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const px = bx0 + dx * t, py = by0 + dy * t, pz = bz0 + dz * t;
        const groundY = height(px, pz) - 0.014;
        for (const side of [-0.0078, 0.0078]) {
          const ox = Math.cos(yaw) * side, oz = -Math.sin(yaw) * side;
          addRod([px + ox, groundY, pz + oz], [px + ox, py + 0.022, pz + oz], 0.0018, 0x362417, 6);
          if (i < 6) {
            const tn = (i + 1) / 6;
            const nx = bx0 + dx * tn, ny = by0 + dy * tn, nz = bz0 + dz * tn;
            addRod([px + ox, py + 0.004, pz + oz], [nx + ox, ny + 0.020, nz + oz], 0.0013, 0x473020, 4);
            addRod([px + ox, py + 0.020, pz + oz], [nx + ox, ny + 0.004, nz + oz], 0.0013, 0x473020, 4);
          }
        }
        if (i >= 1 && i <= 5) {
          addRod([px - Math.cos(yaw) * 0.0078, groundY + 0.005, pz + Math.sin(yaw) * 0.0078],
                 [px + Math.cos(yaw) * 0.0078, py - 0.002, pz - Math.sin(yaw) * 0.0078], 0.0015, 0x2e1f14, 5);
        }
      }
    }

    // EL GRAN VIADUCTO DE PIEDRA (5 arcos de dovelas y 6 pilares con balconcillos)
    {
      const vx0 = 0.010, vx1 = 0.180, vz = 0.018, vyDeck = 0.114;
      const spans = 5, spanLen = (vx1 - vx0) / spans;
      for (let i = 0; i <= spans; i++) {
        const px = vx0 + i * spanLen;
        const pw = (i === 0 || i === spans) ? 0.015 : 0.011;
        const pBot = -0.040, ph = vyDeck - pBot;
        addSubBox(pw, ph, 0.032, 2, 7, 3, [px, pBot + ph / 2, vz], 0, -0.04);
        // Tajamar reforzado y balconcillo en el pretil sobre cada pilar
        addSubBox(pw + 0.005, 0.068, 0.038, 2, 4, 2, [px, 0.016, vz], 0, -0.02);
        for (const zs of [-0.017, 0.017]) {
          addGeo(new THREE.BoxGeometry(0.010, 0.016, 0.006), 0x686054, { p: [px, vyDeck + 0.008, vz + zs] });
        }
      }
      // Arcos reales formados por 7 dovelas cada uno + enjutas
      for (let i = 0; i < spans; i++) {
        const ax = vx0 + (i + 0.5) * spanLen;
        const clearR = (spanLen - 0.011) / 2;
        const archY = vyDeck - 0.025;
        addSubBox(spanLen, 0.012, 0.028, 3, 2, 2, [ax, vyDeck - 0.006, vz], 0);
        for (let d = 0; d < 7; d++) {
          const ang = -Math.PI * 0.42 + (d / 6) * Math.PI * 0.84;
          const dx = Math.sin(ang) * clearR, dy = Math.cos(ang) * clearR * 0.82;
          addGeo(new THREE.BoxGeometry(0.007, 0.010, 0.026), d % 2 ? 0x6c6559 : 0x5d564b, {
            p: [ax + dx, archY + dy, vz], r: [0, 0, -ang], amt: 0.04,
          });
        }
        // Faroles en los pretiles del Viaducto
        for (const zs of [-0.0145, 0.0145]) {
          addGeo(new THREE.BoxGeometry(0.004, 0.012, 0.004), 0x22252a, { p: [ax, vyDeck + 0.014, vz + zs] });
          addGeo(new THREE.BoxGeometry(0.006, 0.0065, 0.006), 0xffdb78, { p: [ax, vyDeck + 0.022, vz + zs] });
          if (i % 2 === 0) features.push({ type: 'city', pos: [ax, vyDeck + 0.023, vz + zs], size: 0.0065 });
        }
      }
      // Calzada, cornisa de canecillos y pretiles almenados
      addSubBox(vx1 - vx0 + 0.012, 0.005, 0.036, 14, 1, 3, [(vx0 + vx1) / 2, vyDeck + 0.001, vz], 0);
      for (const zs of [-0.015, 0.015]) {
        addSubBox(vx1 - vx0 + 0.010, 0.009, 0.0045, 14, 1, 1, [(vx0 + vx1) / 2, vyDeck + 0.008, vz + zs], 0);
        addCrenels([vx0, vyDeck + 0.0125, vz + zs], [vx1, vyDeck + 0.0125, vz + zs], vyDeck + 0.0125, 0.012, 0.0045, 0.0045, 0.0045);
      }
    }
  }

  // =====================================================================
  // 6. ALA ESTE (PABELLÓN + 3 INVERNADEROS) Y LECHUCERÍA NORTE
  // =====================================================================
  {
    const rot = -0.15, y0 = 0.095;
    const LE = makeLocal(0.215, y0, -0.035, rot);

    // Pabellón de recepción del Viaducto en la Colina Este
    addSubBox(0.044, 0.095, 0.046, 4, 6, 4, [0.180, y0 + 0.002, 0.018], rot, y0 - 0.05);
    addGeo(new THREE.ConeGeometry(0.033, 0.040, 4, 3), 0x1a2330, { p: [0.180, y0 + 0.068, 0.018], r: [0, rot + Math.PI / 4, 0], colorFn: slateColor });
    addDetailWin([0.180, y0 + 0.028, 0.042], rot, 0.012, 0.020, true);
    addDetailWin([0.203, y0 + 0.028, 0.018], rot + Math.PI / 2, 0.011, 0.018, true);

    // 3 Invernaderos de Herbología con armazón de hierro forjado negro y cúpula central
    const glassFn = (va, vb, vc) => {
      const cx = (va.x + vb.x + vc.x) / 3, cz = (va.z + vb.z + vc.z) / 3;
      const grid = (Math.floor(cx * 110) + Math.floor(cz * 110)) & 1;
      return jitter(grid ? 0x356d77 : 0x458691, 0.04);
    };
    const greenhouses = [
      [0.010, -0.004, 0.046, 0.062, true],  // Invernadero principal con cúpula
      [0.014, -0.066, 0.052, 0.036, false], // Nave norte
      [0.042, 0.032,  0.032, 0.044, false], // Nave sureste
    ];
    for (const [gx, gz, gw, gd, hasDome] of greenhouses) {
      addSubBox(gw + 0.008, 0.048, gd + 0.008, 3, 3, 3, LE(gx, -0.014, gz), rot, y0 - 0.04);
      addSubBox(gw, 0.012, gd, 3, 1, 3, LE(gx, 0.012, gz), rot, y0);
      addGeo(new THREE.BoxGeometry(gw - 0.004, 0.022, gd - 0.004, 4, 2, 4), 0x3d7a85, { p: LE(gx, 0.029, gz), r: [0, rot, 0], colorFn: glassFn });
      const alongZ = gd > gw;
      const rLen = alongZ ? gd : gw, rSpan = alongZ ? gw : gd;
      addGableZ(LE(gx, 0.040, gz), alongZ ? rot : rot + Math.PI / 2, rSpan, 0.022, rLen, glassFn, glassFn);
      // Costillas de hierro forjado negro
      for (const t of [-0.36, -0.12, 0.12, 0.36]) {
        const rx = alongZ ? gx : gx + t * gw, rz = alongZ ? gz + t * gd : gz;
        addGeo(new THREE.BoxGeometry(alongZ ? gw : 0.0025, 0.026, alongZ ? 0.0025 : gd), 0x1c2026, { p: LE(rx, 0.029, rz), r: [0, rot, 0] });
      }
      if (hasDome) {
        addGeo(new THREE.CylinderGeometry(0.016, 0.018, 0.016, 12, 2), 0x458691, { p: LE(gx, 0.056, gz), colorFn: glassFn });
        addGeo(new THREE.SphereGeometry(0.016, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x458691, { p: LE(gx, 0.064, gz), colorFn: glassFn });
        addGeo(new THREE.ConeGeometry(0.003, 0.012, 6), 0x1c2026, { p: LE(gx, 0.085, gz) });
        for (let r = 0; r < 4; r++) {
          addGeo(new THREE.TorusGeometry(0.0162, 0.001, 4, 12, Math.PI), 0x1c2026, { p: LE(gx, 0.064, gz), r: [0, rot + r * Math.PI / 4, 0] });
        }
      }
      addDetailWin(LE(gx + (gw / 2 - 0.001), 0.029, gz), rot + Math.PI / 2, 0.018, 0.014, false);
      addDetailWin(LE(gx - (gw / 2 - 0.001), 0.029, gz), rot - Math.PI / 2, 0.018, 0.014, false);
      features.push({ type: 'sparkle', pos: LE(gx, 0.064, gz), size: 0.009 });
      features.push({ type: 'city', pos: LE(gx, 0.030, gz), size: 0.009 });
      features.push({ type: 'firefly', pos: LE(gx + 0.008, 0.032, gz + 0.008), size: 0.028 });
    }
  }

  // LA LECHUCERÍA (OWLERY) en el risco norte (0.145, -0.195, y = 0.112)
  {
    const ox = 0.145, oz = -0.195, y0 = 0.112;
    addGeo(new THREE.CylinderGeometry(0.027, 0.034, 0.050, 14, 3), 0x3b3834, { p: [ox, y0 - 0.015, oz], colorFn: stoneColor(y0 - 0.04) });
    addGeo(new THREE.CylinderGeometry(0.021, 0.024, 0.076, 16, 5), 0x6a6357, { p: [ox, y0 + 0.038, oz], colorFn: stoneColor(y0) });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.5;
      addButtress([ox + Math.sin(a) * 0.023, y0, oz + Math.cos(a) * 0.023], a, 0.065, 0.007, 0.006);
    }
    // Galería superior de 12 arcos/columnitas
    addGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 16), 0x4f4940, { p: [ox, y0 + 0.078, oz] });
    addGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.022, 12), 0x1a1816, { p: [ox, y0 + 0.090, oz] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addRod([ox + Math.cos(a) * 0.0205, y0 + 0.078, oz + Math.sin(a) * 0.0205], [ox + Math.cos(a) * 0.0205, y0 + 0.102, oz + Math.sin(a) * 0.0205], 0.0018, 0x625b50, 5);
    }
    addGeo(new THREE.ConeGeometry(0.028, 0.046, 16, 3), 0x1a2330, { p: [ox, y0 + 0.125, oz], colorFn: slateColor });
    addDetailWin([ox + 0.021, y0 + 0.046, oz + 0.008], 1.2, 0.008, 0.018, true);
    addDetailWin([ox, y0 + 0.046, oz - 0.023], Math.PI, 0.008, 0.018, true);
    features.push({ type: 'gulls', pos: [ox - 0.02, y0 + 0.16, oz + 0.02], size: 0.14 });
  }

  // =====================================================================
  // 7. CÍRCULO DE PIEDRAS, CABAÑA DE HAGRID, SAUCE BOXEADOR Y BOSQUE PROHIBIDO
  // =====================================================================
  // Círculo de Piedras (Stone Circle) al final del Puente Cubierto de Madera
  {
    const sx = -0.285, sz = -0.100, sy = 0.068;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.25;
      const mx = sx + Math.cos(a) * 0.022, mz = sz + Math.sin(a) * 0.022;
      const mh = 0.022 + (i % 2) * 0.005;
      addGeo(new THREE.BoxGeometry(0.0075, mh, 0.0055, 1, 2, 1), 0x4b4844, {
        p: [mx, sy + mh * 0.35, mz], r: [0, -a, (i % 2 ? 0.08 : -0.06)], amt: 0.08,
      });
      if (i % 2 === 0) {
        // Dintel megalítico uniendo pares de piedras
        const a2 = ((i + 1) / 6) * Math.PI * 2 + 0.25;
        const lx = sx + (Math.cos(a) + Math.cos(a2)) * 0.011, lz = sz + (Math.sin(a) + Math.sin(a2)) * 0.011;
        addGeo(new THREE.BoxGeometry(0.022, 0.0055, 0.007), 0x54514c, { p: [lx, sy + 0.021, lz], r: [0, -(a + a2) / 2 + Math.PI / 2, 0], amt: 0.07 });
      }
    }
    features.push({ type: 'firefly', pos: [sx, sy + 0.022, sz], size: 0.030 });
    features.push({ type: 'firefly', pos: [sx + 0.012, sy + 0.028, sz - 0.012], size: 0.030 });
  }

  // Cabaña de Hagrid y huerto de calabazas en (-0.245, 0.058, y = 0.052)
  {
    const hx = -0.245, hz = 0.058, y0 = 0.052, rot = 0.40;
    const LH = makeLocal(hx, y0, hz, rot);
    addGeo(new THREE.CylinderGeometry(0.029, 0.033, 0.036, 8, 2), 0x3b3834, { p: LH(0, -0.012, 0), colorFn: stoneColor(y0 - 0.03) });
    addGeo(new THREE.CylinderGeometry(0.026, 0.028, 0.032, 8, 3), 0x5c554b, { p: LH(0, 0.016, 0), r: [0, rot, 0], colorFn: stoneColor(y0) });
    addGeo(new THREE.ConeGeometry(0.033, 0.036, 8, 3), 0x1a2330, { p: LH(0, 0.050, 0), r: [0, rot, 0], colorFn: slateColor });
    addGeo(new THREE.CylinderGeometry(0.018, 0.020, 0.026, 8, 2), 0x575046, { p: LH(0.024, 0.008, 0.012), colorFn: stoneColor(y0) });
    addGeo(new THREE.ConeGeometry(0.023, 0.028, 8, 2), 0x1a2330, { p: LH(0.024, 0.035, 0.012), colorFn: slateColor });
    // Chimenea con humo
    addSubBox(0.010, 0.038, 0.010, 1, 3, 1, LH(-0.012, 0.044, -0.012), rot);
    features.push({ type: 'smoke', pos: LH(-0.012, 0.066, -0.012), size: 0.0075 });
    // Puerta, ventanas y calabazas detalladas
    addGeo(new THREE.BoxGeometry(0.011, 0.019, 0.0045), 0x362417, { p: LH(0, 0.010, 0.026), r: [0, rot, 0] });
    addDetailWin(LH(-0.024, 0.018, 0.008), rot - Math.PI / 2, 0.009, 0.010, true);
    addDetailWin(LH(0, 0.018, -0.024), rot + Math.PI, 0.009, 0.010, true);
    addDetailWin(LH(0.024, 0.015, 0.030), rot, 0.008, 0.009, true);
    for (const [px, pz, pr] of [[-0.030, 0.028, 0.0065], [-0.020, 0.035, 0.0052], [-0.036, 0.015, 0.0055], [-0.014, 0.024, 0.0048]]) {
      const [wx, , wz] = LH(px, 0, pz);
      const wy = height(wx, wz);
      addGeo(new THREE.IcosahedronGeometry(pr, 0), 0xc95d18, { p: [wx, wy + pr * 0.55, wz], s: [1.15, 0.78, 1.15], r: [0, rng() * 3, 0], amt: 0.07 });
      addGeo(new THREE.BoxGeometry(0.0022, 0.004, 0.0022), 0x2c4d24, { p: [wx, wy + pr * 1.15, wz] });
    }
  }

  // Sauce Boxeador (Whomping Willow) en (-0.185, -0.195) con follaje facetado y ramas caídas
  {
    const wx = -0.185, wz = -0.195, wy = height(wx, wz);
    addRod([wx, wy - 0.010, wz], [wx - 0.006, wy + 0.030, wz + 0.004], 0.0075, 0x382618, 8);
    const limbs = [
      [[wx - 0.006, wy + 0.028, wz + 0.004], [wx - 0.026, wy + 0.050, wz + 0.020]],
      [[wx - 0.006, wy + 0.028, wz + 0.004], [wx + 0.020, wy + 0.048, wz + 0.014]],
      [[wx - 0.006, wy + 0.028, wz + 0.004], [wx - 0.014, wy + 0.054, wz - 0.022]],
      [[wx - 0.006, wy + 0.028, wz + 0.004], [wx + 0.016, wy + 0.044, wz - 0.020]],
      [[wx - 0.006, wy + 0.028, wz + 0.004], [wx - 0.002, wy + 0.058, wz + 0.006]],
    ];
    for (const [a, b] of limbs) {
      addRod(a, b, 0.0034, 0x3d2a1b, 6);
      addGeo(new THREE.IcosahedronGeometry(0.014, 0), rng() < 0.5 ? 0x2b4728 : 0x355730,
        { p: b, s: [1.15, 0.85, 1.15], r: [rng() * 3, rng() * 3, 0], amt: 0.09 });
      // Cortinas colgantes de sauce
      for (let w = 0; w < 2; w++) {
        const dx = (rng() - 0.5) * 0.012, dz = (rng() - 0.5) * 0.012;
        addGeo(new THREE.ConeGeometry(0.0045, 0.022, 5), 0x243e22, {
          p: [b[0] + dx, b[1] - 0.014, b[2] + dz], r: [Math.PI, 0, 0], amt: 0.08,
        });
      }
    }
    features.push({ type: 'firefly', pos: [wx, wy + 0.046, wz], size: 0.030 });
    features.push({ type: 'firefly', pos: [wx - 0.016, wy + 0.050, wz + 0.012], size: 0.030 });
  }

  // Bosque Prohibido: ~54 pinos oscuros detallados (5 niveles de ramas, 10 lados) + rocas musgosas
  {
    const placed = [];
    const avoid = [
      [0.015, -0.095, 0.145],  // Núcleo central + Torre Oscura
      [-0.122, -0.092, 0.065], // Ala de Enfermería
      [-0.105, 0.042, 0.115],  // Gran Comedor + Patio
      [-0.175, -0.052, 0.062], // Torre del Reloj
      [0.215, -0.035, 0.095],  // Invernaderos
      [0.145, -0.195, 0.056],  // Lechucería
      [-0.285, -0.100, 0.054], // Círculo de Piedras
      [-0.245, 0.058, 0.064],  // Cabaña Hagrid
      [-0.185, -0.195, 0.052], // Sauce Boxeador
      [-0.230, -0.076, 0.048], // Puente Madera
      [0.095, 0.018, 0.092],   // Viaducto
      [-0.070, 0.165, 0.062],  // Escalinata y Embarcadero
    ];
    let tries = 0;
    while (placed.length < 54 && tries++ < 3000) {
      const ang = rng() * Math.PI * 2, r = 0.08 + rng() * 0.27;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = height(x, z);
      if (h < 0.014 || h > 0.138 || slopeAt(x, z) > 0.92) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.025)) continue;
      placed.push([x, z]);
      const sc = 0.65 + rng() * 0.60;
      const y = h - 0.005;
      addGeo(new THREE.CylinderGeometry(0.0032 * sc, 0.0044 * sc, 0.020 * sc, 6), 0x382416, { p: [x, y + 0.010 * sc, z] });
      for (let j = 0; j < 5; j++) {
        addGeo(new THREE.ConeGeometry((0.021 - j * 0.0035) * sc, 0.022 * sc, 10, 2), j % 2 ? 0x1b3624 : 0x24452e,
          { p: [x, y + (0.022 + j * 0.011) * sc, z], r: [0, rng() * 3, 0], amt: 0.08 });
      }
      if (placed.length % 3 === 0) {
        features.push({ type: 'firefly', pos: [x + (rng() - 0.5) * 0.025, h + 0.025 + rng() * 0.03, z + (rng() - 0.5) * 0.025], size: 0.030 });
      }
    }
  }

  // Rocas y escollos oscuros facetados en la ribera del Lago Negro + islote con baliza
  {
    const ix = 0.255, iz = 0.185;
    addGeo(new THREE.IcosahedronGeometry(0.024, 0), 0x2b2e33, { p: [ix, -0.002, iz], s: [1.3, 0.72, 1.1], r: [0, 0.8, 0], amt: 0.08 });
    addGeo(new THREE.CylinderGeometry(0.007, 0.010, 0.026, 8), 0x5c554b, { p: [ix, 0.018, iz], colorFn: stoneColor(0) });
    addGeo(new THREE.ConeGeometry(0.010, 0.014, 8), 0x1a2330, { p: [ix, 0.044, iz] });
    addGeo(new THREE.BoxGeometry(0.007, 0.008, 0.007), 0xffdd78, { p: [ix, 0.034, iz] });
    features.push({ type: 'city', pos: [ix, 0.034, iz], size: 0.009 });

    let n = 0, tries = 0;
    while (n < 18 && tries++ < 800) {
      const ang = rng() * Math.PI * 2, r = 0.15 + rng() * 0.22;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = height(x, z);
      if (h > -0.008 || h < -0.048) continue;
      if (Math.hypot(x + 0.04, z - 0.22) < 0.075) continue;
      if (Math.hypot(x - 0.095, z - 0.018) < 0.075) continue;
      const s = 0.009 + rng() * 0.014;
      addGeo(new THREE.IcosahedronGeometry(s, 0), rng() < 0.5 ? 0x26292e : 0x1e2024,
        { p: [x, -0.001, z], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.1, 0.65, 1.2], amt: 0.09 });
      n++;
    }
  }

  // Destellos sobre el Lago Negro y nubes atmosféricas alrededor de las agujas
  for (let i = 0, tries = 0; i < 88 && tries < 2400; tries++) {
    const ang = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.94;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (height(x, z) > -0.010) continue;
    features.push({ type: 'sparkle', pos: [x, 0.0035, z], size: 0.009 });
    i++;
  }
  const cloudRing = [
    [-0.21, 0.36, -0.16, 0.018],
    [0.18,  0.39, -0.08, 0.019],
    [-0.08, 0.44, -0.24, 0.016],
    [0.23,  0.31,  0.15, 0.017],
    [-0.24, 0.30,  0.13, 0.016],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0, cy, -0.07], size: cs });
  }

  return finish('El Castillo de Hogwarts');
}
