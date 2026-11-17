// Diorama "El Faro" — Maqueta marítima costera de alta fidelidad (~250k triángulos)
// Isla costera con promontorio de granito, meseta central, risco de la capilla, cala de arena
// e islote oriental. Incluye faro monumental con lente de Fresnel y doble galería, casa del
// guardafaros con invernadero y huerto amurallado, capilla de los navegantes con espadaña y
// semáforo marítimo, puerto pesquero con espigón curvo, caseta de botes, muelle y grúa,
// velero clásico, pesquero costero, botes, restos de naufragio, boya y vegetación marítima.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildFaro(seed = 7) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  // =====================================================================
  // 1. HELPERS PROCEDIMENTALES DE MATERIALES Y MICRO-RELIEVE
  // =====================================================================
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const qYXZ = (rx, ry, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));

  // Desplazamiento determinista por coordenada cuantizada para facetado low-poly sin grietas
  const displaceGeo = (geo, amp = 0.00035) => {
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

  const graniteColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 165 * scale);
    const col = Math.floor((cx + cz) * 125 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0x827e78, 0x948f88, 0x706c66, 0x8b867f];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.014 && ((row + col) % 3 === 0)) hex = 0x4b5d43;
    return jitter(hex, 0.042);
  };

  const lighthouseStripeColor = (yBase, bandH) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const band = Math.max(0, Math.floor((cy - yBase) / bandH));
    const isRed = band % 2 === 1;
    const row = Math.floor(cy * 185);
    const ang = Math.atan2(cz + 0.095, cx - 0.125);
    const col = Math.floor((ang + Math.PI) * 12 + (row & 1) * 0.5);
    const h = ((row * 31) ^ (col * 17)) & 3;
    const pal = isRed
      ? [0xc83e34, 0xb5342b, 0xd4493e, 0xbd3930]
      : [0xf4f1ea, 0xe8e3d8, 0xfaf8f2, 0xede8de];
    return jitter(pal[h], 0.03);
  };

  const cottageWallColor = (yFloor = -1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    if (yFloor > -0.5 && cy - yFloor < 0.011) {
      const h = (Math.floor(cx * 140) ^ Math.floor(cz * 140)) & 1;
      return jitter(h ? 0x7d7972 : 0x6f6b64, 0.04);
    }
    const row = Math.floor(cy * 150);
    const col = Math.floor((cx - cz) * 120);
    const h = ((row * 29) ^ (col * 13)) % 3;
    const pal = [0xf2e5c8, 0xe6d7b8, 0xf7ebd2];
    return jitter(pal[Math.abs(h)], 0.025);
  };

  const tileRoofColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 220);
    const col = Math.floor((cx + cz) * 180 + (row & 1) * 0.5);
    const h = ((row * 43) ^ (col * 19)) & 3;
    const pal = [0xc45b36, 0xb04e2b, 0xd16843, 0x9e4324];
    return jitter(pal[h], 0.04);
  };

  const slateRoofColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 210);
    const col = Math.floor((cx - cz) * 170 + (row & 1) * 0.5);
    const h = ((row * 37) ^ (col * 23)) % 3;
    const pal = [0x2b3a42, 0x344650, 0x233038];
    return jitter(pal[Math.abs(h)], 0.042);
  };

  const woodColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const k = (Math.floor((cx + cz) * 160) + Math.floor(cy * 190)) % 3;
    const pal = [0x7d5837, 0x6b492c, 0x8c6440];
    return jitter(pal[Math.abs(k)], 0.045);
  };

  const copperColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const cx = (va.x + vb.x + vc.x) / 3;
    const k = (Math.floor(cy * 190) + Math.floor(cx * 150)) % 3;
    const pal = [0x2f756a, 0x3b8a7e, 0x266158];
    return jitter(pal[Math.abs(k)], 0.04);
  };

  const glassColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const grid = (Math.floor((cx + cz) * 130) + Math.floor(cy * 130)) & 1;
    return jitter(grid ? 0x5c9da6 : 0x73b6bf, 0.035);
  };

  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };

  const addSubBox = (w, h, d, sx, sy, sz, p, rot = 0, yFloor = -1, fn = null, hex = 0x827e78) => {
    const g = displaceGeo(new THREE.BoxGeometry(w, h, d, Math.ceil(sx * 1.5), Math.ceil(sy * 1.5), Math.ceil(sz * 1.5)), 0.00028);
    addGeo(g, hex, { p, r: [0, rot, 0], colorFn: fn || graniteColor(yFloor) });
  };

  const addDetailWin = (p, yaw, w, h, shutterHex = null, addLight = true, frameHex = 0x58534c) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    const tx = Math.cos(yaw), tz = -Math.sin(yaw);
    // Marco exterior + alféizar saliente + dintel
    addGeo(new THREE.BoxGeometry(w + 0.0042, h + 0.0042, 0.0038, 3, 3, 1), frameHex, { p, r: [0, yaw, 0], amt: 0.035 });
    addGeo(new THREE.BoxGeometry(w + 0.0056, 0.0020, 0.0054, 2, 1, 1), frameHex, {
      p: [p[0] + nx * 0.0010, p[1] - h * 0.5 - 0.0011, p[2] + nz * 0.0010], r: [0, yaw, 0], amt: 0.035,
    });
    addGeo(new THREE.BoxGeometry(w + 0.0052, 0.0022, 0.0050, 2, 1, 1), frameHex, {
      p: [p[0] + nx * 0.0008, p[1] + h * 0.5 + 0.0012, p[2] + nz * 0.0008], r: [0, yaw, 0], amt: 0.035,
    });
    // Vidrio oscuro
    addGeo(new THREE.BoxGeometry(w, h, 0.0046, 2, 3, 1), 0x1d3347, {
      p: [p[0] + nx * 0.0008, p[1], p[2] + nz * 0.0008], r: [0, yaw, 0], amt: 0.025,
    });
    // Parteluz y travesaño en cruz
    addGeo(new THREE.BoxGeometry(0.0013, h, 0.0052, 1, 2, 1), 0xf0ebe1, {
      p: [p[0] + nx * 0.0011, p[1], p[2] + nz * 0.0011], r: [0, yaw, 0], amt: 0.02,
    });
    addGeo(new THREE.BoxGeometry(w, 0.0013, 0.0052, 2, 1, 1), 0xf0ebe1, {
      p: [p[0] + nx * 0.0011, p[1], p[2] + nz * 0.0011], r: [0, yaw, 0], amt: 0.02,
    });
    // Contraventanas opcionales
    if (shutterHex !== null) {
      const sw = w * 0.45, sh = h * 0.98;
      for (const side of [-1, 1]) {
        const off = side * (w * 0.5 + 0.0022 + sw * 0.5);
        addGeo(new THREE.BoxGeometry(sw, sh, 0.0028, 2, 4, 1), shutterHex, {
          p: [p[0] + tx * off + nx * 0.0008, p[1], p[2] + tz * off + nz * 0.0008], r: [0, yaw, 0], amt: 0.04,
        });
      }
    }
    if (addLight) {
      features.push({ type: 'window', pos: [p[0] + nx * 0.0040, p[1], p[2] + nz * 0.0040], yaw, w: w * 0.88, h: h * 0.88 });
    }
  };

  const addGableZ = (p, rot, w, h, d, roofFn = tileRoofColor, wallFn = cottageWallColor()) => {
    const slopeLen = Math.hypot(w / 2, h);
    const ang = Math.atan2(h, w / 2);
    const c = Math.cos(rot), s = Math.sin(rot);
    const loc = (lx, ly, lz) => [p[0] + lx * c + lz * s, p[1] + ly, p[2] - lx * s + lz * c];
    const segZ = Math.max(12, Math.round(d * 270));
    const segX = Math.max(10, Math.round(slopeLen * 250));
    for (const side of [-1, 1]) {
      const q = qYXZ(0, rot, side * -ang);
      addGeo(displaceGeo(new THREE.BoxGeometry(slopeLen, 0.0040, d, segX, 1, segZ), 0.00022), 0xc45b36, {
        p: loc(side * (w / 4), h / 2, 0), q, colorFn: roofFn,
      });
    }
    const shape = new THREE.Shape();
    shape.moveTo(-w * 0.46, 0.0005);
    shape.lineTo(w * 0.46, 0.0005);
    shape.lineTo(0, h - 0.0018);
    shape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.004, d - 0.004), bevelEnabled: false });
    gableGeo.translate(0, 0, -Math.max(0.004, d - 0.004) / 2);
    addGeo(gableGeo, 0xf2e5c8, { p, r: [0, rot, 0], colorFn: wallFn });
    // Cumbrera
    addGeo(new THREE.BoxGeometry(0.0042, 0.0044, d + 0.0025, 1, 1, segZ), 0x8f4329, {
      p: loc(0, h, 0), r: [0, rot, 0], colorFn: roofFn,
    });
  };
  const addGableX = (p, rot, w, h, d, roofFn = tileRoofColor, wallFn = cottageWallColor()) =>
    addGableZ(p, rot + Math.PI / 2, d, h, w, roofFn, wallFn);

  const addDormer = (p, yaw, w = 0.010, h = 0.012, d = 0.012, roofFn = tileRoofColor) => {
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    addGeo(new THREE.BoxGeometry(w, h, d, 2, 2, 2), 0xf0e2c3, { p, r: [0, yaw, 0], colorFn: cottageWallColor() });
    addGableZ([p[0], p[1] + h / 2, p[2]], yaw, w + 0.003, 0.007, d + 0.003, roofFn);
    addDetailWin([p[0] + nx * (d / 2), p[1], p[2] + nz * (d / 2)], yaw, w * 0.62, h * 0.62, null, true, 0x5c3e28);
  };

  // =====================================================================
  // 2. TERRENO INSULAR, BATIMETRÍA MARINA, SENDEROS Y ZÓCALO (~105k tris)
  // =====================================================================
  const R = 0.365, FLOOR = -0.062;
  const LH = { x: 0.125, z: -0.095, r0: 0.056, r1: 0.092, y: 0.130 }; // Promontorio del Faro
  const HS = { x: -0.102, z: 0.022, r0: 0.072, r1: 0.110, y: 0.084 }; // Meseta Casa del Guardafaros
  const CH = { x: -0.068, z: -0.155, r0: 0.042, r1: 0.074, y: 0.104 }; // Risco Noroeste (Capilla y Semáforo)
  const IS = { x: 0.215, z: 0.095, r0: 0.026, r1: 0.055, y: 0.028 };  // Islote / Arrecife Este

  // Polilíneas de senderos empedrados
  const segDist = (x, z, pts) => {
    let md = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      md = Math.min(md, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
    }
    return md;
  };
  const PATH_DOCK_HOUSE = [[-0.018, 0.155], [-0.036, 0.122], [-0.065, 0.090], [-0.092, 0.058]];
  const PATH_HOUSE_LH   = [[-0.062, 0.010], [-0.010, -0.018], [0.045, -0.045], [0.082, -0.068]];
  const PATH_HOUSE_CH   = [[-0.102, -0.022], [-0.092, -0.072], [-0.078, -0.118]];
  const pathDist = (x, z) => Math.min(
    segDist(x, z, PATH_DOCK_HOUSE),
    segDist(x, z, PATH_HOUSE_LH),
    segDist(x, z, PATH_HOUSE_CH)
  );

  const rawHeight = (x, z) => {
    const dMain  = Math.hypot((x + 0.025) * 0.96, (z + 0.015) * 0.94);
    const dLH    = Math.hypot(x - LH.x, z - LH.z);
    const dHS    = Math.hypot(x - HS.x, z - HS.z);
    const dCH    = Math.hypot(x - CH.x, z - CH.z);
    const dIS    = Math.hypot(x - IS.x, z - IS.z);
    const dCove  = Math.hypot((x + 0.012) * 1.15, (z - 0.145) * 1.10);

    let h = -0.048
      + 0.135 * smooth(1 - dMain / 0.275)
      + 0.145 * smooth(1 - dLH / 0.148)
      + 0.072 * smooth(1 - dHS / 0.145)
      + 0.096 * smooth(1 - dCH / 0.122)
      + 0.078 * smooth(1 - dIS / 0.075);

    // Cala y playa sur
    h -= 0.075 * smooth(1 - dCove / 0.115);
    // Vaguada suave entre la casa y el promontorio del faro (cruzada por el puentecillo)
    const dGap = Math.hypot((x - 0.015) * 1.35, (z + 0.028) * 1.15);
    h -= 0.024 * smooth(1 - dGap / 0.075);

    // Relieve rocoso costero multifrecuencia
    h += (fbm(x * 15 + 5, z * 15 + 9) - 0.5) * 0.036;
    h += (fbm(x * 42 + 17, z * 42 + 3) - 0.5) * 0.008;
    return h;
  };

  const EXPLANADAS = [LH, HS, CH, IS];
  const height = (x, z) => {
    let h = rawHeight(x, z);
    for (const p of EXPLANADAS) {
      const k = smooth((p.r1 - Math.hypot(x - p.x, z - p.z)) / (p.r1 - p.r0));
      h += (p.y - h) * k;
    }
    return h;
  };
  const slopeAt = (x, z) =>
    Math.hypot(height(x + 0.006, z) - height(x - 0.006, z), height(x, z + 0.006) - height(x, z - 0.006)) / 0.012;

  const K = 172, S = 420;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const r = R * Math.pow(k / K, 0.92);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const h = k === K ? -0.050 : height(x, z);
      let y = Math.max(h, 0);
      if (h < 0) {
        const wave = Math.sin(r * 135 - Math.atan2(z, x) * 2) * 0.0012
          + (fbm(x * 32 + 4, z * 32 + 11) - 0.5) * 0.0024;
        y = wave;
      }
      row.push({ v: new THREE.Vector3(x, y, z), h });
    }
    ringPts.push(row);
  }
  for (const p of ringPts[K]) p.v.y = 0;

  const nrm = new THREE.Vector3();
  const cDeep = new THREE.Color(0x114b69);
  const cMid  = new THREE.Color(0x1e7496);
  const cShal = new THREE.Color(0x5cc8cc);
  const cFoam = new THREE.Color(0xeafcff);

  function terrainColor(a, b, c) {
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    if (h < 0 && hMax < 0.004) {
      const t = smooth(1 + h / 0.05);
      tmpColor.copy(cDeep).lerp(cMid, smooth(t * 1.4)).lerp(cShal, t * t);
      if (h > -0.0065) {
        const foam = smooth((h + 0.0065) / 0.0065);
        tmpColor.lerp(cFoam, 0.35 + 0.45 * foam);
      }
      const k = 1 + (rng() - 0.5) * 0.06;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);
    const cx = (a.v.x + b.v.x + c.v.x) / 3, cz = (a.v.z + b.v.z + c.v.z) / 3;
    if (h < 0.013) {
      return jitter(h < 0.004 ? 0xd9c28e : 0xe9d7a7, 0.045); // arena húmeda y seca
    }
    if (pathDist(cx, cz) < 0.013 && slope < 0.48) {
      const ix = Math.floor(cx * 170), iz = Math.floor(cz * 170);
      const cob = ((ix * 31) ^ (iz * 17)) & 3;
      return jitter([0xb2aa9d, 0x9f978b, 0xc0b8ab, 0x928a7e][cob], 0.04);
    }
    if (slope > 0.36 || h > 0.118) {
      const band = Math.floor(((a.v.y + b.v.y + c.v.y) / 3) * 95) & 1;
      return jitter(band ? 0x88847f : (rng() < 0.5 ? 0x76726d : 0x67635f), 0.065);
    }
    const heather = fbm(cx * 28 + 9, cz * 28 + 2);
    if (heather > 0.67 && h > 0.055) return jitter(rng() < 0.6 ? 0x779e54 : 0x94799c, 0.065); // brezo costero
    return jitter(h > 0.075 ? 0x5c9b52 : (rng() < 0.5 ? 0x76b05c : 0x84bc64), 0.065);
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

  // Zócalo marino escalonado hermético y fondo cerrado
  const rim = ringPts[K].map((p) => p.v);
  const centerBottom = new THREE.Vector3(0, FLOOR, 0);
  const radial = new THREE.Vector3();
  const Y_LIP = -0.005, Y_MID = -0.042;
  for (let s = 0; s < S; s++) {
    const a = rim[s], b = rim[(s + 1) % S];
    const a0 = new THREE.Vector3(a.x * 1.004, 0, a.z * 1.004);
    const b0 = new THREE.Vector3(b.x * 1.004, 0, b.z * 1.004);
    const a1 = new THREE.Vector3(a.x * 1.004, Y_LIP, a.z * 1.004);
    const b1 = new THREE.Vector3(b.x * 1.004, Y_LIP, b.z * 1.004);
    const a2 = new THREE.Vector3(a.x * 0.985, Y_MID, a.z * 0.985);
    const b2 = new THREE.Vector3(b.x * 0.985, Y_MID, b.z * 0.985);
    const a3 = new THREE.Vector3(a.x * 0.958, FLOOR, a.z * 0.958);
    const b3 = new THREE.Vector3(b.x * 0.958, FLOOR, b.z * 0.958);
    radial.set(a.x + b.x, 0, a.z + b.z);
    addTri(a, b, a0, jitter(0x1c698a, 0.04), UP);
    addTri(b, b0, a0, jitter(0x1c698a, 0.04), UP);
    addTri(a0, b0, a1, jitter(0x195e7d, 0.04), radial);
    addTri(b0, b1, a1, jitter(0x195e7d, 0.04), radial);
    addTri(a1, b1, a2, jitter(s % 2 ? 0x154d69 : 0x12445d, 0.04), radial);
    addTri(b1, b2, a2, jitter(s % 2 ? 0x154d69 : 0x12445d, 0.04), radial);
    addTri(a2, b2, a3, jitter(0x2d3a42, 0.04), radial);
    addTri(b2, b3, a3, jitter(0x2d3a42, 0.04), radial);
    addTri(a3, b3, centerBottom, jitter(0x6b5847, 0.04), DOWN);
  }

  // =====================================================================
  // 3. EL FARO MONUMENTAL, BASAMENTO ABALUARTADO Y SALA DE MÁQUINAS
  // =====================================================================
  {
    const lx = LH.x, lz = LH.z, y0 = LH.y;

    // Fortín / basamento de granito con talud hundido en el promontorio
    addGeo(displaceGeo(new THREE.CylinderGeometry(0.049, 0.057, 0.040, 72, 14), 0.00045), 0x827e78, {
      p: [lx, y0 - 0.006, lz], colorFn: graniteColor(y0 - 0.025),
    });
    // Cornisa moldurada y parapeto almenado sobre el basamento
    addGeo(new THREE.CylinderGeometry(0.052, 0.049, 0.006, 48, 2), 0x9a958d, {
      p: [lx, y0 + 0.015, lz], colorFn: graniteColor(),
    });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.15;
      // Dejar hueco en el acceso frontal suroeste (ang ~ -2.35 rad respecto a +X)
      const px = lx + Math.cos(a) * 0.047, pz = lz + Math.sin(a) * 0.047;
      if (Math.hypot(px - (lx - 0.032), pz - (lz + 0.032)) < 0.016) continue;
      addGeo(new THREE.BoxGeometry(0.009, 0.006, 0.005, 2, 2, 1), 0x827e78, {
        p: [px, y0 + 0.021, pz], r: [0, -a + Math.PI / 2, 0], colorFn: graniteColor(),
      });
    }
    // 8 contrafuertes radiales alrededor del basamento
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.35;
      const bx = lx + Math.cos(a) * 0.050, bz = lz + Math.sin(a) * 0.050;
      if (Math.hypot(bx - (lx - 0.035), bz - (lz + 0.035)) < 0.018) continue;
      addGeo(displaceGeo(new THREE.BoxGeometry(0.008, 0.032, 0.012, 2, 5, 2), 0.0003), 0x76726b, {
        p: [bx, y0 - 0.002, bz], r: [0, -a + Math.PI / 2, 0], colorFn: graniteColor(y0 - 0.02),
      });
    }

    // Pórtico de entrada abovedado y escalinata de piedra hacia el sendero suroeste
    {
      const yawDoor = -Math.PI * 0.25; // mira hacia (-X, +Z) -> espera: Math.sin(yaw) = x, Math.cos(yaw) = z
      const nx = Math.sin(yawDoor), nz = Math.cos(yawDoor);
      const tx = Math.cos(yawDoor), tz = -Math.sin(yawDoor);
      const px = lx + nx * 0.037, pz = lz + nz * 0.037;
      addSubBox(0.022, 0.034, 0.018, 4, 6, 4, [px, y0 + 0.020, pz], yawDoor, y0, graniteColor(y0));
      addGableZ([px, y0 + 0.037, pz], yawDoor, 0.024, 0.012, 0.020, slateRoofColor, graniteColor());
      // Puerta arqueada de roble con herrajes
      const dx = px + nx * 0.008, dz = pz + nz * 0.008;
      addGeo(new THREE.BoxGeometry(0.012, 0.022, 0.004, 2, 4, 1), 0x5c3a23, { p: [dx, y0 + 0.014, dz], r: [0, yawDoor, 0], colorFn: woodColor });
      addGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 12), 0x5c3a23, {
        p: [dx, y0 + 0.025, dz], r: [Math.PI / 2, yawDoor, 0], colorFn: woodColor,
      });
      // Escalinata de 6 peldaños y muretes laterales (hundidos en LH.y)
      for (let st = 0; st < 6; st++) {
        const dist = 0.010 + st * 0.0042;
        const sy = y0 + 0.002 + (5 - st) * 0.0032;
        addGeo(new THREE.BoxGeometry(0.018, 0.012, 0.005, 3, 2, 1), 0x8e8981, {
          p: [dx + nx * dist, sy - 0.0055, dz + nz * dist], r: [0, yawDoor, 0], colorFn: graniteColor(),
        });
      }
      // Dos faroles de bronce flanqueando la puerta
      for (const side of [-1, 1]) {
        const fx = dx + nx * 0.004 + tx * side * 0.010;
        const fz = dz + nz * 0.004 + tz * side * 0.010;
        addGeo(new THREE.CylinderGeometry(0.0014, 0.0016, 0.008, 8), 0x26292e, { p: [fx, y0 + 0.024, fz] });
        addGeo(new THREE.BoxGeometry(0.0038, 0.0050, 0.0038), 0xffdb78, { p: [fx, y0 + 0.029, fz] });
        addGeo(new THREE.ConeGeometry(0.0032, 0.0035, 6), 0x26292e, { p: [fx, y0 + 0.033, fz] });
        features.push({ type: 'city', pos: [fx, y0 + 0.029, fz], size: 0.0065 });
      }
    }

    // Caseta de máquinas / almacén de aceite adosada al noroeste del basamento
    {
      const yawM = -2.25;
      const mx = lx + Math.sin(yawM) * 0.038, mz = lz + Math.cos(yawM) * 0.038;
      const LM = makeLocal(mx, y0 + 0.002, mz, yawM);
      addSubBox(0.034, 0.032, 0.028, 6, 6, 5, LM(0, 0.012, 0), yawM, y0 - 0.01, graniteColor(y0 - 0.01));
      addGableZ(LM(0, 0.028, 0), yawM, 0.038, 0.015, 0.032, slateRoofColor, graniteColor());
      addDetailWin(LM(0, 0.016, 0.0145), yawM, 0.011, 0.012, 0x2f5d78, true);
      // Chimenea de ladrillo de la sala de máquinas
      addSubBox(0.0085, 0.030, 0.0085, 2, 5, 2, LM(-0.009, 0.036, -0.006), yawM, -1, tileRoofColor);
      features.push({ type: 'smoke', pos: LM(-0.009, 0.053, -0.006), size: 0.007 });
      // Dos barriles / tanques de combustible con aros de hierro
      for (const bx of [-0.010, 0.002]) {
        addGeo(new THREE.CylinderGeometry(0.0045, 0.0045, 0.011, 12, 2), 0x6b492c, {
          p: LM(bx, 0.018, -0.017), colorFn: woodColor,
        });
        addGeo(new THREE.TorusGeometry(0.0046, 0.0005, 5, 12), 0x26292e, { p: LM(bx, 0.021, -0.017), r: [Math.PI / 2, 0, 0] });
        addGeo(new THREE.TorusGeometry(0.0046, 0.0005, 5, 12), 0x26292e, { p: LM(bx, 0.015, -0.017), r: [Math.PI / 2, 0, 0] });
      }
    }

    // Fuste troncocónico del Faro (96 lados x 54 segmentos, 6 bandas blancas/rojas)
    const shaftY0 = y0 + 0.016;
    const shaftH = 0.210, rBot = 0.037, rTop = 0.023, bandH = shaftH / 6;
    addGeo(displaceGeo(new THREE.CylinderGeometry(rTop, rBot, shaftH, 96, 54), 0.00030), 0xf4f1ea, {
      p: [lx, shaftY0 + shaftH / 2, lz], colorFn: lighthouseStripeColor(shaftY0, bandH),
    });

    // Anillos de imposta de piedra separando las franjas del fuste
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const ri = rBot + (rTop - rBot) * t + 0.0014;
      addGeo(new THREE.CylinderGeometry(ri, ri + 0.0005, 0.0032, 48, 1), 0xd8d2c6, {
        p: [lx, shaftY0 + i * bandH, lz], amt: 0.03,
      });
    }

    // 5 ventanas / ojos de buey en espiral ascendente en el fuste
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.7) / 5.7;
      const wy = shaftY0 + t * shaftH;
      const wr = rBot + (rTop - rBot) * t - 0.0005;
      const ang = -0.35 + i * 1.15;
      addDetailWin([lx + Math.sin(ang) * wr, wy, lz + Math.cos(ang) * wr], ang, 0.0075, 0.012, null, true, 0x3b4048);
    }

    // Doble galería superior con 24 ménsulas, piso y barandillas con balaustres
    let gy = shaftY0 + shaftH;
    // Corona acampanada y 24 ménsulas radiales talladas
    addGeo(new THREE.CylinderGeometry(0.035, rTop, 0.012, 48, 3), 0x8c877f, { p: [lx, gy + 0.005, lz], colorFn: graniteColor() });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0028, 0.008, 0.009, 1, 2, 1), 0x706c66, {
        p: [lx + Math.sin(a) * 0.027, gy - 0.001, lz + Math.cos(a) * 0.027], r: [0, a, 0],
      });
    }
    gy += 0.011;
    // Primera balconada (plataforma principal)
    addGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 48), 0x363b42, { p: [lx, gy + 0.002, lz] });
    // Barandilla de 36 balaustres + doble pasamanos toroidal
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const px = lx + Math.cos(a) * 0.034, pz = lz + Math.sin(a) * 0.034;
      addGeo(new THREE.CylinderGeometry(0.0008, 0.0009, 0.013, 6), 0x26292e, { p: [px, gy + 0.009, pz] });
    }
    addGeo(new THREE.TorusGeometry(0.034, 0.0011, 6, 40), 0x26292e, { p: [lx, gy + 0.0155, lz], r: [Math.PI / 2, 0, 0] });
    addGeo(new THREE.TorusGeometry(0.034, 0.0008, 5, 40), 0x26292e, { p: [lx, gy + 0.0095, lz], r: [Math.PI / 2, 0, 0] });

    // Sala de servicio bajo la linterna + segunda balconada superior
    addGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.014, 32, 3), 0xf0ece2, { p: [lx, gy + 0.011, lz], amt: 0.03 });
    gy += 0.018;
    addGeo(new THREE.CylinderGeometry(0.027, 0.027, 0.0035, 36), 0x363b42, { p: [lx, gy + 0.0018, lz] });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      addGeo(new THREE.CylinderGeometry(0.0007, 0.0008, 0.010, 5), 0x26292e, {
        p: [lx + Math.cos(a) * 0.0255, gy + 0.007, lz + Math.sin(a) * 0.0255],
      });
    }
    addGeo(new THREE.TorusGeometry(0.0255, 0.0010, 6, 32), 0x26292e, { p: [lx, gy + 0.012, lz], r: [Math.PI / 2, 0, 0] });

    // Linterna acristalada + Lente de Fresnel 3D + Jaula metálica
    const lH = 0.030, lR = 0.0185;
    addGeo(new THREE.CylinderGeometry(lR, lR, lH, 32, 6, true), 0xffe28a, { p: [lx, gy + lH * 0.5 + 0.002, lz], amt: 0.08 });
    // Lente de Fresnel interior (núcleo brillante + 5 anillos de cristal y latón)
    addGeo(new THREE.SphereGeometry(0.0065, 12, 8), 0xfff3b8, { p: [lx, gy + lH * 0.52, lz] });
    for (let r = -2; r <= 2; r++) {
      const rr = 0.0115 - Math.abs(r) * 0.0016;
      addGeo(new THREE.TorusGeometry(rr, 0.0011, 6, 18), 0xd4a642, {
        p: [lx, gy + lH * 0.52 + r * 0.0034, lz], r: [Math.PI / 2, 0, 0],
      });
    }
    // Jaula de 16 montantes de bronce y 3 aros
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      addRod([lx + Math.cos(a) * lR, gy + 0.002, lz + Math.sin(a) * lR],
        [lx + Math.cos(a + 0.25) * lR, gy + lH + 0.002, lz + Math.sin(a + 0.25) * lR], 0.0011, 0x2b3036, 5);
    }
    for (const ry of [0.008, 0.018, 0.029]) {
      addGeo(new THREE.TorusGeometry(lR + 0.0006, 0.0009, 5, 24), 0x2b3036, { p: [lx, gy + ry, lz], r: [Math.PI / 2, 0, 0] });
    }
    features.push({ type: 'beam', pos: [lx, gy + lH * 0.52, lz], size: 0.022 });

    // Cúpula nervada, bola de ventilación y veleta marinera
    const domeY = gy + lH + 0.002;
    addGeo(new THREE.CylinderGeometry(0.025, 0.022, 0.004, 32), 0x2b3036, { p: [lx, domeY, lz] });
    addGeo(new THREE.SphereGeometry(0.024, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0xb8382f, {
      p: [lx, domeY + 0.001, lz], amt: 0.04,
    });
    for (let i = 0; i < 12; i++) {
      addGeo(new THREE.TorusGeometry(0.0244, 0.0008, 5, 18, Math.PI), 0x8f2821, {
        p: [lx, domeY + 0.001, lz], r: [0, (i / 12) * Math.PI, 0],
      });
    }
    // Bola de ventilación y pararrayos con veleta
    addGeo(new THREE.CylinderGeometry(0.0045, 0.0065, 0.008, 12), 0x2b3036, { p: [lx, domeY + 0.026, lz] });
    addGeo(new THREE.SphereGeometry(0.0052, 12, 8), 0xd4a642, { p: [lx, domeY + 0.033, lz] });
    addGeo(new THREE.CylinderGeometry(0.0009, 0.0014, 0.018, 6), 0x2b3036, { p: [lx, domeY + 0.044, lz] });
    addGeo(new THREE.BoxGeometry(0.016, 0.0025, 0.0015), 0xd4a642, { p: [lx, domeY + 0.048, lz], r: [0, 0.5, 0] });
    addGeo(new THREE.BoxGeometry(0.0015, 0.0025, 0.016), 0xd4a642, { p: [lx, domeY + 0.048, lz], r: [0, 0.5, 0] });
  }

  // =====================================================================
  // 4. CASA DEL GUARDAFAROS, INVERNADERO COSTERO Y HUERTO AMURALLADO
  // =====================================================================
  {
    const hx = HS.x, hz = HS.z, rot = 0.42, y0 = HS.y;
    const L = makeLocal(hx, y0, hz, rot);
    const W = 0.086, H = 0.054, D = 0.060;

    // Cimiento de granito hundido en la meseta
    addSubBox(W + 0.014, 0.028, D + 0.014, 10, 4, 8, L(0, -0.010, 0), rot, y0 - 0.02, graniteColor(y0 - 0.02));
    // Cuerpo principal de dos plantas
    addSubBox(W, H, D, 14, 10, 10, L(0, H * 0.5, 0), rot, y0, cottageWallColor(y0));
    // Cornisa de piedra entre plantas y alero
    addGeo(new THREE.BoxGeometry(W + 0.004, 0.003, D + 0.004, 8, 1, 6), 0xa09a90, { p: L(0, H * 0.52, 0), r: [0, rot, 0], colorFn: graniteColor() });
    // Sillares esquineros (quoins) en las 4 esquinas
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (let q = 0; q < 6; q++) {
        const qw = q % 2 ? 0.008 : 0.0055, qd = q % 2 ? 0.0055 : 0.008;
        addGeo(new THREE.BoxGeometry(qw, 0.007, qd), 0x8e8981, {
          p: L(sx * (W * 0.5 - 0.0015), 0.006 + q * 0.008, sz * (D * 0.5 - 0.0015)), r: [0, rot, 0], colorFn: graniteColor(),
        });
      }
    }

    // Tejado a dos aguas de teja cerámica + 3 buhardillas + chimenea doble
    addGableZ(L(0, H, 0), rot, W + 0.012, 0.032, D + 0.012, tileRoofColor, cottageWallColor());
    addDormer(L(-0.022, H + 0.013, D * 0.28), rot, 0.011, 0.012, 0.012, tileRoofColor);
    addDormer(L(0.020, H + 0.013, D * 0.28), rot, 0.011, 0.012, 0.012, tileRoofColor);
    addDormer(L(0.0, H + 0.013, -D * 0.28), rot + Math.PI, 0.011, 0.012, 0.012, tileRoofColor);

    // Chimenea de piedra y ladrillo con doble remate
    addSubBox(0.013, 0.042, 0.013, 3, 7, 3, L(0.026, H + 0.020, -0.012), rot, y0, graniteColor());
    for (const cx of [-0.003, 0.003]) {
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0026, 0.009, 8), 0x9e4324, { p: L(0.026 + cx, H + 0.045, -0.012) });
    }
    features.push({ type: 'smoke', pos: L(0.026, H + 0.052, -0.012), size: 0.0085 });

    // Porche delantero cubierto + puerta + salvavidas + farol + banco
    const pxP = -0.014, pzP = D * 0.5 + 0.008;
    addGeo(new THREE.BoxGeometry(0.030, 0.006, 0.018, 4, 1, 2), 0x8e8981, { p: L(pxP, 0.003, pzP), r: [0, rot, 0], colorFn: graniteColor() });
    addGeo(new THREE.BoxGeometry(0.026, 0.004, 0.012, 3, 1, 1), 0x8e8981, { p: L(pxP, 0.001, pzP + 0.011), r: [0, rot, 0], colorFn: graniteColor() });
    for (const cx of [-0.012, 0.012]) {
      addGeo(new THREE.CylinderGeometry(0.0016, 0.0018, 0.028, 7), 0x5c3a23, { p: L(pxP + cx, 0.018, pzP + 0.006) });
    }
    addGeo(new THREE.BoxGeometry(0.032, 0.004, 0.020, 4, 1, 3), 0xb04e2b, {
      p: L(pxP, 0.033, pzP), q: qYXZ(0.28, rot, 0), colorFn: tileRoofColor,
    });
    // Puerta principal con marco, ventana superior y salvavidas rojo-blanco en la fachada
    addGeo(new THREE.BoxGeometry(0.015, 0.027, 0.004, 2, 4, 1), 0x4c2f1c, { p: L(pxP, 0.018, D * 0.5), r: [0, rot, 0], colorFn: woodColor });
    addGeo(new THREE.BoxGeometry(0.008, 0.007, 0.0048), 0x1d3347, { p: L(pxP, 0.024, D * 0.5 + 0.0005), r: [0, rot, 0] });
    addGeo(new THREE.TorusGeometry(0.0055, 0.0018, 8, 16), 0xc83e34, {
      p: L(pxP + 0.019, 0.022, D * 0.5 + 0.0018), r: [0, rot, 0],
      colorFn: (va, vb) => jitter(((Math.atan2(va.y - (y0 + 0.022), vb.x - va.x) > 0) ^ (Math.floor(va.x * 160) & 1)) ? 0xc83e34 : 0xf4f1ea, 0.03),
    });
    features.push({ type: 'city', pos: L(pxP + 0.011, 0.028, pzP + 0.008), size: 0.0065 });

    // Ventanas con contraventanas azul marino y jardineras con flores
    const wins = [
      [0.022, 0.019, D * 0.5, rot, 0.014, 0.014, true],
      [0.022, 0.040, D * 0.5, rot, 0.012, 0.012, false],
      [-0.014, 0.040, D * 0.5, rot, 0.012, 0.012, false],
      [W * 0.5, 0.022, 0.012, rot + Math.PI / 2, 0.014, 0.014, true],
      [W * 0.5, 0.040, -0.012, rot + Math.PI / 2, 0.012, 0.012, false],
      [-0.018, 0.022, -D * 0.5, rot + Math.PI, 0.014, 0.014, true],
      [0.018, 0.022, -D * 0.5, rot + Math.PI, 0.014, 0.014, true],
    ];
    for (const [wx, wy, wz, wyaw, ww, wh, hasBox] of wins) {
      addDetailWin(L(wx, wy, wz), wyaw, ww, wh, 0x2f5d78, true, 0x5c3e28);
      if (hasBox) {
        const nx = Math.sin(wyaw), nz = Math.cos(wyaw);
        const [bx, by, bz] = L(wx, wy - wh * 0.5 - 0.002, wz);
        addGeo(new THREE.BoxGeometry(ww + 0.002, 0.0035, 0.0045), 0x5c3e28, {
          p: [bx + nx * 0.0025, by, bz + nz * 0.0025], r: [0, wyaw, 0],
        });
        for (let f = -1; f <= 1; f++) {
          const tx = Math.cos(wyaw) * f * 0.0035, tz = -Math.sin(wyaw) * f * 0.0035;
          addGeo(new THREE.IcosahedronGeometry(0.0022, 0), f === 0 ? 0xe0483e : 0xf2c94c, {
            p: [bx + nx * 0.0025 + tx, by + 0.0025, bz + nz * 0.0025 + tz],
          });
        }
      }
    }

    // Ala lateral oeste (cocina + invernadero acristalado)
    addSubBox(0.032, 0.034, 0.038, 5, 6, 6, L(-W * 0.5 - 0.014, 0.017, -0.006), rot, y0, cottageWallColor(y0));
    addGableX(L(-W * 0.5 - 0.014, 0.034, -0.006), rot, 0.036, 0.018, 0.042, tileRoofColor, cottageWallColor());
    // Invernadero adosado al sur del ala oeste
    const gx = -W * 0.5 - 0.012, gz = 0.022;
    addSubBox(0.028, 0.008, 0.024, 4, 2, 4, L(gx, 0.004, gz), rot, y0, graniteColor(y0));
    addGeo(new THREE.BoxGeometry(0.026, 0.016, 0.022, 4, 3, 4), 0x62a4ad, { p: L(gx, 0.016, gz), r: [0, rot, 0], colorFn: glassColor });
    addGableZ(L(gx, 0.024, gz), rot, 0.028, 0.013, 0.024, glassColor, glassColor);
    for (const rx of [-0.010, 0, 0.010]) {
      addGeo(new THREE.BoxGeometry(0.0014, 0.018, 0.023), 0x26292e, { p: L(gx + rx, 0.016, gz), r: [0, rot, 0] });
    }
    features.push({ type: 'city', pos: L(gx, 0.018, gz), size: 0.007 });

    // Pozo de piedra y leñera junto a la casa
    const wx = 0.056, wz = -0.010;
    addGeo(new THREE.CylinderGeometry(0.009, 0.010, 0.011, 16, 2), 0x827e78, { p: L(wx, 0.005, wz), colorFn: graniteColor() });
    addGeo(new THREE.CylinderGeometry(0.0065, 0.0065, 0.002, 12), 0x1b4c63, { p: L(wx, 0.0095, wz) });
    for (const px of [-0.007, 0.007]) {
      addGeo(new THREE.CylinderGeometry(0.0012, 0.0012, 0.016, 6), 0x5c3a23, { p: L(wx + px, 0.016, wz) });
    }
    addGableX(L(wx, 0.023, wz), rot, 0.020, 0.009, 0.018, tileRoofColor, woodColor);
    // Leñera con troncos apilados
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4 - (row % 2); col++) {
        addGeo(new THREE.CylinderGeometry(0.0018, 0.0018, 0.014, 6), 0x6b492c, {
          p: L(0.054 + (col - 1.3 + (row % 2) * 0.5) * 0.0038, 0.003 + row * 0.0032, 0.016), r: [Math.PI / 2, rot, 0], colorFn: woodColor,
        });
      }
    }

    // Huerto cercado con murete de piedra seca y bancales (al oeste/suroeste de la casa)
    const gw = 0.044, gd = 0.036, gcx = -0.018, gcz = -0.046;
    const walls = [
      [gcx, gcz - gd * 0.5, gw, 0.005],
      [gcx - gw * 0.5, gcz, 0.005, gd],
      [gcx + gw * 0.5, gcz, 0.005, gd],
    ];
    for (const [mx, mz, mw, md] of walls) {
      addSubBox(mw, 0.013, md, Math.max(2, Math.round(mw * 150)), 3, Math.max(2, Math.round(md * 150)), L(mx, 0.004, mz), rot, y0, graniteColor(y0));
    }
    for (const bz of [-0.009, 0.006]) {
      addGeo(new THREE.BoxGeometry(0.030, 0.004, 0.009, 6, 1, 2), 0x4b3523, { p: L(gcx, 0.002, gcz + bz), r: [0, rot, 0], amt: 0.07 });
      for (let v = -3; v <= 3; v++) {
        const isPumpkin = Math.abs(v) === 2 && bz > 0;
        addGeo(new THREE.IcosahedronGeometry(isPumpkin ? 0.0032 : 0.0026, 0), isPumpkin ? 0xd86f24 : 0x4f9446, {
          p: L(gcx + v * 0.0042, 0.0052, gcz + bz), s: [1.1, 0.85, 1.1], amt: 0.08,
        });
      }
    }
  }

  // =====================================================================
  // 5. CAPILLA DE LOS NAVEGANTES / ATALAYA NOROESTE Y SEMÁFORO MARÍTIMO
  // =====================================================================
  {
    const cx = CH.x, cz = CH.z, y0 = CH.y, rot = -0.35;
    const L = makeLocal(cx, y0, cz, rot);
    const W = 0.046, H = 0.044, D = 0.058;

    addSubBox(W + 0.010, 0.030, D + 0.010, 8, 5, 10, L(0, -0.012, 0), rot, y0 - 0.02, graniteColor(y0 - 0.02));
    addSubBox(W, H, D, 8, 8, 12, L(0, H * 0.5, 0), rot, y0, graniteColor(y0));
    addGableZ(L(0, H, 0), rot, W + 0.008, 0.028, D + 0.008, slateRoofColor, graniteColor());

    // Contrafuertes laterales y ventanales arqueados
    for (const side of [-1, 1]) {
      const yawS = rot + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      for (const bz of [-0.020, 0, 0.020]) {
        addGeo(new THREE.BoxGeometry(0.0055, H * 0.88, 0.007, 1, 4, 1), 0x706c66, {
          p: L(side * (W * 0.5 + 0.002), H * 0.44, bz), r: [0, rot, 0], colorFn: graniteColor(),
        });
      }
      addDetailWin(L(side * (W * 0.5 + 0.0005), H * 0.56, -0.010), yawS, 0.008, 0.018, null, true);
      addDetailWin(L(side * (W * 0.5 + 0.0005), H * 0.56, 0.010), yawS, 0.008, 0.018, null, true);
    }

    // Rosetón circular y puerta en la fachada hacia la casa (+Z local)
    addGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 16), 0x5c5852, { p: L(0, H * 0.72, D * 0.5 + 0.001), r: [Math.PI / 2, rot, 0] });
    addGeo(new THREE.CylinderGeometry(0.0068, 0.0068, 0.0048, 16), 0x1d3347, { p: L(0, H * 0.72, D * 0.5 + 0.0014), r: [Math.PI / 2, rot, 0] });
    features.push({ type: 'window', pos: L(0, H * 0.72, D * 0.5 + 0.004), yaw: rot, w: 0.011, h: 0.011 });
    addGeo(new THREE.BoxGeometry(0.014, 0.022, 0.004), 0x5c3a23, { p: L(0, 0.011, D * 0.5 + 0.0008), r: [0, rot, 0], colorFn: woodColor });

    // Espadaña de piedra sobre el hastial frontal con campana de bronce
    addSubBox(0.018, 0.024, 0.007, 3, 4, 1, L(0, H + 0.032, D * 0.42), rot, -1, graniteColor());
    addGeo(new THREE.BoxGeometry(0.009, 0.011, 0.008), 0x26292e, { p: L(0, H + 0.031, D * 0.42), r: [0, rot, 0] });
    addGeo(new THREE.ConeGeometry(0.0032, 0.006, 10), 0xd4a642, { p: L(0, H + 0.032, D * 0.42) });
    addGeo(new THREE.ConeGeometry(0.012, 0.014, 4), 0x2b3a42, { p: L(0, H + 0.050, D * 0.42), r: [0, rot + Math.PI / 4, 0], colorFn: slateRoofColor });

    // Mirador empedrado, brasero de señales y mástil de semáforo marítimo junto al acantilado norte
    const mx = cx - 0.048, mz = cz - 0.010;
    const my = height(mx, mz);
    addGeo(new THREE.CylinderGeometry(0.026, 0.030, 0.024, 24, 3), 0x827e78, { p: [mx, my - 0.008, mz], colorFn: graniteColor() });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.009, 0.007, 0.004), 0x76726b, {
        p: [mx + Math.cos(a) * 0.023, my + 0.006, mz + Math.sin(a) * 0.023], r: [0, -a + Math.PI / 2, 0],
      });
    }
    // Brasero de señales con fuego vivo
    addGeo(new THREE.CylinderGeometry(0.004, 0.0055, 0.010, 8), 0x26292e, { p: [mx - 0.009, my + 0.008, mz + 0.005] });
    addGeo(new THREE.CylinderGeometry(0.007, 0.004, 0.006, 10), 0x363b42, { p: [mx - 0.009, my + 0.014, mz + 0.005] });
    features.push({ type: 'flame', pos: [mx - 0.009, my + 0.017, mz + 0.005], size: 0.0032 });

    // Mástil de semáforo marítimo con cruceta, jarcia y banderas de señales
    const sx = mx + 0.009, sz = mz - 0.005;
    addGeo(new THREE.CylinderGeometry(0.0018, 0.0028, 0.088, 10), 0x5c3a23, { p: [sx, my + 0.044, sz], colorFn: woodColor });
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0012, 0.036, 8), 0x5c3a23, { p: [sx, my + 0.064, sz], r: [0, 0.4, Math.PI / 2], colorFn: woodColor });
    addRod([sx, my + 0.084, sz], [sx - 0.017, my + 0.005, sz + 0.010], 0.0016, 0x423326, 5);
    addRod([sx, my + 0.084, sz], [sx + 0.015, my + 0.005, sz - 0.010], 0.0016, 0x423326, 5);
    for (const [fy, fcol, fw] of [[0.072, 0xc83e34, 0.016], [0.056, 0xf2c94c, 0.013], [0.044, 0x2f5d78, 0.011]]) {
      addGeo(new THREE.BoxGeometry(fw, 0.0065, 0.0025, 3, 1, 1), fcol, {
        p: [sx + fw * 0.52, my + fy, sz + 0.002], r: [0.1, 0.35, -0.1], amt: 0.04,
      });
    }
  }

  // =====================================================================
  // 6. PUERTO PESQUERO: ESPIGÓN CURVO, CASETA DE BOTES, MUELLE Y GRÚA
  // =====================================================================
  {
    // A. Espigón curvo de piedra (rompeolas) protegiendo la cala desde el sureste
    const pierPts = [
      [0.095, 0.145], [0.112, 0.185], [0.105, 0.228], [0.075, 0.260], [0.035, 0.275],
    ];
    for (let i = 0; i < pierPts.length - 1; i++) {
      const [ax, az] = pierPts[i], [bx, bz] = pierPts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5;
      addSubBox(0.024, 0.068, len + 0.008, 4, 8, 8, [mx, -0.020, mz], yaw, -0.05, graniteColor(-0.04));
      // Parapeto exterior de defensa y norays (bolardos)
      const ox = Math.cos(yaw) * 0.009, oz = -Math.sin(yaw) * 0.009;
      addSubBox(0.006, 0.009, len + 0.004, 1, 2, 6, [mx + ox, 0.018, mz + oz], yaw, -1, graniteColor());
      addGeo(new THREE.CylinderGeometry(0.0020, 0.0024, 0.007, 8), 0x26292e, { p: [bx - ox * 0.6, 0.017, bz - oz * 0.6] });
    }
    // Morra circular al extremo del espigón con baliza portuaria verde y bronce
    const [ex, ez] = pierPts[pierPts.length - 1];
    addGeo(displaceGeo(new THREE.CylinderGeometry(0.018, 0.022, 0.068, 24, 6), 0.0003), 0x827e78, { p: [ex, -0.020, ez], colorFn: graniteColor() });
    addGeo(new THREE.CylinderGeometry(0.008, 0.011, 0.030, 16, 4), 0x2f756a, { p: [ex, 0.028, ez], colorFn: copperColor });
    addGeo(new THREE.CylinderGeometry(0.0065, 0.0065, 0.010, 12), 0xffe28a, { p: [ex, 0.047, ez] });
    addGeo(new THREE.ConeGeometry(0.009, 0.010, 12), 0x26292e, { p: [ex, 0.056, ez] });
    features.push({ type: 'city', pos: [ex, 0.048, ez], size: 0.0075 });
    // Escollera de grandes bloques exteriores en el rompeolas
    for (let i = 0; i < 24; i++) {
      const seg = Math.min(pierPts.length - 2, Math.floor((i / 24) * (pierPts.length - 1)));
      const t = rng();
      const bx = pierPts[seg][0] + (pierPts[seg + 1][0] - pierPts[seg][0]) * t + 0.014 + rng() * 0.014;
      const bz = pierPts[seg][1] + (pierPts[seg + 1][1] - pierPts[seg][1]) * t + 0.008 + rng() * 0.012;
      if (Math.hypot(bx, bz) > R * 0.91) continue;
      addGeo(new THREE.IcosahedronGeometry(0.007 + rng() * 0.007, 1), rng() < 0.5 ? 0x76726b : 0x615d57, {
        p: [bx, -0.002, bz], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.1, 0.72, 1.0], amt: 0.09,
      });
    }

    // B. Caseta de botes (Varadero) en el arranque del muelle (-0.018, 0.145)
    const bx = -0.024, bz = 0.148, by = 0.012, brot = -0.15;
    const LB = makeLocal(bx, by, bz, brot);
    addSubBox(0.046, 0.042, 0.052, 6, 4, 6, LB(0, -0.020, 0), brot, -0.03, graniteColor(-0.03));
    addSubBox(0.042, 0.028, 0.046, 8, 6, 8, LB(0, 0.014, 0), brot, -1,
      (va, vb, vc) => jitter((Math.floor(((va.y + vb.y + vc.y) / 3) * 260) & 1) ? 0x9e382e : 0x8a2e25, 0.035));
    addGableZ(LB(0, 0.028, 0), brot, 0.048, 0.022, 0.052, slateRoofColor, woodColor);
    // Portón doble hacia el mar + rampa de tablones
    addGeo(new THREE.BoxGeometry(0.022, 0.022, 0.004), 0x4c2f1c, { p: LB(0, 0.011, 0.0235), r: [0, brot, 0], colorFn: woodColor });
    addGeo(new THREE.BoxGeometry(0.024, 0.004, 0.026, 4, 1, 6), 0x7d5837, {
      p: LB(0, -0.002, 0.036), q: qYXZ(0.24, brot, 0), colorFn: woodColor,
    });
    addDetailWin(LB(-0.021, 0.016, 0), brot - Math.PI / 2, 0.010, 0.010, 0xf4f1ea, true);
    features.push({ type: 'city', pos: LB(0.014, 0.022, 0.026), size: 0.0065 });

    // C. Muelle principal de madera sobre pilotes + grúa portuaria + carga
    const dx = -0.018, zStart = 0.174, len = 0.095, nPlanks = 22;
    for (let i = 0; i < nPlanks; i++) {
      const pz = zStart + (i + 0.5) * (len / nPlanks);
      addGeo(new THREE.BoxGeometry(0.030, 0.0038, len / nPlanks - 0.0009, 4, 1, 1), 0x8a633c, {
        p: [dx, 0.014, pz], colorFn: woodColor,
      });
    }
    // Vigas largueras y 12 pilotes con refuerzos diagonales hundidos en el mar
    for (const sx of [-0.012, 0.012]) {
      addGeo(new THREE.BoxGeometry(0.0035, 0.0045, len, 1, 1, 10), 0x5c3a23, { p: [dx + sx, 0.0105, zStart + len * 0.5] });
      for (let p = 0; p < 6; p++) {
        const pz = zStart + 0.008 + p * ((len - 0.014) / 5);
        addGeo(new THREE.CylinderGeometry(0.0026, 0.0028, 0.068, 8), 0x4c301c, { p: [dx + sx, -0.016, pz] });
        addGeo(new THREE.CylinderGeometry(0.0020, 0.0020, 0.006, 6), 0x5c3a23, { p: [dx + sx, 0.018, pz] });
        if (p < 5) {
          addRod([dx + sx, -0.005, pz], [dx - sx, 0.010, pz + 0.015], 0.0015, 0x4c301c, 5);
        }
      }
    }
    // Barriles, cajas de pescado y grúa pescante en el extremo del muelle
    for (const [bx2, bz2] of [[dx - 0.008, zStart + 0.025], [dx - 0.007, zStart + 0.032], [dx + 0.008, zStart + 0.055]]) {
      addGeo(new THREE.CylinderGeometry(0.0032, 0.0032, 0.0075, 10), 0x7d5837, { p: [bx2, 0.0195, bz2], colorFn: woodColor });
    }
    addGeo(new THREE.BoxGeometry(0.007, 0.005, 0.006), 0x9c7448, { p: [dx + 0.007, 0.0185, zStart + 0.028], r: [0, 0.3, 0] });
    // Grúa de puerto
    const gx = dx - 0.006, gz = zStart + len - 0.012;
    addGeo(new THREE.CylinderGeometry(0.0024, 0.0032, 0.036, 8), 0x26292e, { p: [gx, 0.033, gz] });
    addRod([gx, 0.025, gz], [gx + 0.022, 0.052, gz + 0.010], 0.0018, 0x5c3a23, 6);
    addRod([gx, 0.048, gz], [gx + 0.022, 0.052, gz + 0.010], 0.0015, 0x26292e, 5);
    addRod([gx + 0.022, 0.052, gz + 0.010], [gx + 0.022, 0.032, gz + 0.010], 0.0015, 0x26292e, 5);
    addGeo(new THREE.BoxGeometry(0.007, 0.007, 0.007), 0x8c6440, { p: [gx + 0.022, 0.028, gz + 0.010] });
    features.push({ type: 'city', pos: [dx + 0.012, 0.024, zStart + len - 0.004], size: 0.0065 });
  }

  // =====================================================================
  // 7. EMBARCACIONES, ARRECIFE ESTE Y BOYA MARÍTIMA
  // =====================================================================
  // A. Velero clásico (Balandro) fondeado junto al muelle (0.042, 0.232)
  {
    const vx = 0.038, vz = 0.228, vr = 0.55;
    const LV = makeLocal(vx, 0.002, vz, vr);
    // Casco en dos franjas (obra viva roja y obra muerta blanca) + cubierta de teca
    addGeo(new THREE.CylinderGeometry(0.014, 0.007, 0.010, 16, 2), 0xb5342b, {
      p: LV(0, -0.001, 0), r: [0, vr, 0], s: [0.9, 1, 2.4], amt: 0.03,
    });
    addGeo(new THREE.CylinderGeometry(0.015, 0.014, 0.006, 16, 1), 0xf4f1ea, {
      p: LV(0, 0.007, 0), r: [0, vr, 0], s: [0.9, 1, 2.4], amt: 0.025,
    });
    addGeo(new THREE.CylinderGeometry(0.0135, 0.0135, 0.002, 16), 0x8c6440, {
      p: LV(0, 0.0095, 0), r: [0, vr, 0], s: [0.85, 1, 2.25], colorFn: woodColor,
    });
    // Caseta de cabina con ojos de buey y bauprés
    addGeo(new THREE.BoxGeometry(0.012, 0.007, 0.022, 3, 2, 4), 0x5c3a23, { p: LV(0, 0.013, -0.004), r: [0, vr, 0], colorFn: woodColor });
    addRod(LV(0, 0.010, 0.026), LV(0, 0.013, 0.044), 0.0015, 0x5c3a23, 6);
    // Mástil, botavara, pico y velas con curvatura en volumen
    addGeo(new THREE.CylinderGeometry(0.0015, 0.0022, 0.072, 10), 0x5c3a23, { p: LV(0, 0.045, 0.004) });
    addRod(LV(0, 0.022, 0.004), LV(0, 0.024, -0.030), 0.0015, 0x5c3a23, 6);
    addRod(LV(0, 0.068, 0.004), LV(0, 0.078, -0.020), 0.0015, 0x5c3a23, 6);
    // Vela mayor y foque con grosor de caja fina (sin planos sueltos)
    addGeo(new THREE.BoxGeometry(0.0022, 0.048, 0.032, 1, 8, 6), 0xfff5dc, {
      p: LV(0.003, 0.047, -0.012), r: [0, vr + 0.14, 0], amt: 0.02,
    });
    const jib = new THREE.ConeGeometry(0.017, 0.056, 3, 4);
    addGeo(jib, 0xfff8e6, {
      p: LV(0.002, 0.041, 0.021), r: [0.35, vr + 0.12, 0], s: [0.16, 1, 1], amt: 0.02,
    });
    features.push({ type: 'city', pos: LV(0, 0.016, 0.002), size: 0.006 });
  }

  // B. Barco pesquero tradicional en el mar oeste (-0.245, 0.115)
  {
    const fx = -0.245, fz = 0.115, fr = -0.65;
    const LF = makeLocal(fx, 0.001, fz, fr);
    addGeo(new THREE.CylinderGeometry(0.015, 0.009, 0.011, 16, 2), 0x8f2e24, {
      p: LF(0, -0.001, 0), r: [0, fr, 0], s: [0.95, 1, 2.3], amt: 0.03,
    });
    addGeo(new THREE.CylinderGeometry(0.016, 0.015, 0.007, 16, 1), 0x203b54, {
      p: LF(0, 0.008, 0), r: [0, fr, 0], s: [0.95, 1, 2.3], amt: 0.03,
    });
    addGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.002, 16), 0x7d5837, {
      p: LF(0, 0.011, 0), r: [0, fr, 0], s: [0.9, 1, 2.1], colorFn: woodColor,
    });
    // Puente de mando, chimenea y pluma de redes
    addSubBox(0.018, 0.016, 0.018, 3, 3, 3, LF(0, 0.019, -0.008), fr, -1, cottageWallColor());
    addGeo(new THREE.BoxGeometry(0.020, 0.003, 0.020), 0x26292e, { p: LF(0, 0.028, -0.008), r: [0, fr, 0] });
    addGeo(new THREE.BoxGeometry(0.014, 0.006, 0.019), 0x1d3347, { p: LF(0, 0.021, -0.008), r: [0, fr, 0] });
    addGeo(new THREE.CylinderGeometry(0.0028, 0.0032, 0.018, 10), 0x26292e, { p: LF(0, 0.035, -0.012) });
    addGeo(new THREE.CylinderGeometry(0.0030, 0.0030, 0.004, 10), 0xc83e34, { p: LF(0, 0.040, -0.012) });
    addGeo(new THREE.CylinderGeometry(0.0016, 0.0020, 0.040, 8), 0x5c3a23, { p: LF(0, 0.030, 0.012) });
    addRod(LF(0, 0.022, 0.012), LF(0.006, 0.046, -0.005), 0.0015, 0x5c3a23, 5);
    features.push({ type: 'city', pos: LF(0, 0.022, 0.003), size: 0.0065 });
    features.push({ type: 'smoke', pos: LF(0, 0.046, -0.012), size: 0.0055 });
  }

  // C. Botes de remos (uno junto al muelle y otro varado en la playa con fogata)
  {
    const rowBoats = [
      [-0.048, 0.218, 0.002, 0.85, false],
      [-0.078, 0.145, 0.006, -0.55, true],
    ];
    for (const [rx, rz, ry, rr, beached] of rowBoats) {
      const LR = makeLocal(rx, ry, rz, rr);
      addGeo(new THREE.CylinderGeometry(0.008, 0.005, 0.007, 12), beached ? 0x2f5d78 : 0x7d5837, {
        p: LR(0, 0, 0), r: [0, rr, beached ? 0.18 : 0], s: [0.85, 1, 2.2], amt: 0.04,
      });
      addGeo(new THREE.BoxGeometry(0.011, 0.002, 0.003), 0x5c3a23, { p: LR(0, 0.003, 0), r: [0, rr, 0] });
      addRod(LR(-0.006, 0.004, 0), LR(-0.014, 0.001, -0.010), 0.0015, 0x8c6440, 5);
      addRod(LR(0.006, 0.004, 0), LR(0.014, 0.001, -0.010), 0.0015, 0x8c6440, 5);
    }
    // Fogata en la playa cerca del bote varado
    const fx = -0.058, fz = 0.128, fy = Math.max(0.004, height(fx, fz));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      addGeo(new THREE.IcosahedronGeometry(0.0025, 0), 0x706c66, { p: [fx + Math.cos(a) * 0.0055, fy + 0.001, fz + Math.sin(a) * 0.0055] });
    }
    addGeo(new THREE.CylinderGeometry(0.0012, 0.0014, 0.008, 5), 0x4c301c, { p: [fx, fy + 0.003, fz], r: [0.9, 0.4, 0.4] });
    features.push({ type: 'flame', pos: [fx, fy + 0.005, fz], size: 0.0028 });
  }

  // D. Islote / Arrecife Este (IS) con naufragio de madera y boya de campana
  {
    const ix = IS.x, iz = IS.z, iy = IS.y;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.4;
      const rad = 0.012 + rng() * 0.010;
      addGeo(new THREE.CylinderGeometry(rad * 0.6, rad * 1.1, 0.032 + rng() * 0.022, 8, 3), 0x6f6b64, {
        p: [ix + Math.cos(a) * 0.016, iy - 0.006, iz + Math.sin(a) * 0.016],
        r: [(rng() - 0.5) * 0.35, rng() * 3, (rng() - 0.5) * 0.35], colorFn: graniteColor(),
      });
    }
    // Costillaje de viejo casco de madera encallado
    const LSh = makeLocal(ix - 0.006, iy - 0.002, iz + 0.006, -0.6);
    addRod(LSh(0, 0.002, -0.018), LSh(0, 0.006, 0.020), 0.0020, 0x4c301c, 6);
    for (let r = -2; r <= 2; r++) {
      const rz = r * 0.007;
      addRod(LSh(0, 0.003, rz), LSh(-0.009, 0.012, rz), 0.0015, 0x5c3a23, 5);
      addRod(LSh(0, 0.003, rz), LSh(0.009, 0.011, rz), 0.0015, 0x5c3a23, 5);
    }
    // Boya marítima roja en el canal sureste-este (0.275, 0.015)
    const bx = 0.268, bz = -0.018;
    addGeo(new THREE.CylinderGeometry(0.011, 0.013, 0.010, 14), 0xc83e34, { p: [bx, 0.001, bz], amt: 0.04 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      addRod([bx + Math.cos(a) * 0.008, 0.005, bz + Math.sin(a) * 0.008], [bx, 0.026, bz], 0.0015, 0xc83e34, 5);
    }
    addGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 10), 0xffe28a, { p: [bx, 0.028, bz] });
    features.push({ type: 'city', pos: [bx, 0.029, bz], size: 0.007 });
  }

  // =====================================================================
  // 8. ACANTILADOS 3D, ESCALONES, PUENTE, FAROLES, PINOS Y EFECTOS VIVOS
  // =====================================================================
  // Puentecillo arqueado de madera sobre la vaguada entre la Casa y el Faro
  {
    const bx = 0.016, bz = -0.032, brot = -0.45;
    const by = Math.max(height(bx, bz), 0.072) + 0.014;
    const LBr = makeLocal(bx, by, bz, brot);
    for (let i = -4; i <= 4; i++) {
      const arch = (1 - (i / 4.5) * (i / 4.5)) * 0.005;
      addGeo(new THREE.BoxGeometry(0.0045, 0.003, 0.018, 1, 1, 2), 0x7d5837, {
        p: LBr(i * 0.0052, arch, 0), r: [0, brot, -i * 0.05], colorFn: woodColor,
      });
    }
    for (const sz of [-0.008, 0.008]) {
      addRod(LBr(-0.022, 0.008, sz), LBr(0.022, 0.008, sz), 0.0015, 0x5c3a23, 5);
      for (const px of [-0.020, 0, 0.020]) {
        addGeo(new THREE.CylinderGeometry(0.0014, 0.0016, 0.018, 6), 0x5c3a23, { p: LBr(px, 0.002, sz) });
      }
    }
  }

  // Faroles de hierro forjado a lo largo de los senderos empedrados
  {
    const lanternPts = [
      [-0.045, 0.108], [-0.072, 0.074], [-0.052, 0.012], [0.002, -0.022],
      [0.055, -0.050], [-0.095, -0.045], [-0.082, -0.102],
    ];
    for (const [lx, lz] of lanternPts) {
      const ly = height(lx, lz);
      if (ly < 0.012) continue;
      addGeo(new THREE.CylinderGeometry(0.0012, 0.0018, 0.022, 8), 0x26292e, { p: [lx, ly + 0.010, lz] });
      addGeo(new THREE.BoxGeometry(0.0038, 0.0048, 0.0038), 0xffe07d, { p: [lx, ly + 0.023, lz] });
      addGeo(new THREE.ConeGeometry(0.0035, 0.0035, 6), 0x26292e, { p: [lx, ly + 0.027, lz] });
      features.push({ type: 'city', pos: [lx, ly + 0.023, lz], size: 0.0065 });
    }
  }

  // Losas 3D de adoquines y bordillos de piedra a lo largo de los senderos
  {
    const paths = [PATH_DOCK_HOUSE, PATH_HOUSE_LH, PATH_HOUSE_CH];
    for (const pts of paths) {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const segLen = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(bx - ax, bz - az);
        const nx = Math.cos(yaw), nz = -Math.sin(yaw);
        const steps = Math.max(3, Math.round(segLen / 0.0085));
        for (let s = 0; s < steps; s++) {
          const t = (s + 0.5) / steps;
          const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
          const py = height(px, pz);
          if (py < 0.008) continue;
          if (Math.hypot(px - 0.016, pz + 0.032) < 0.022) continue; // puente
          // Losa central de piedra
          addGeo(new THREE.BoxGeometry(0.013, 0.0036, 0.0065, 2, 1, 1), (s & 1) ? 0xb5ada0 : 0xa39b8e, {
            p: [px, py - 0.0005, pz], r: [0, yaw, 0], amt: 0.04,
          });
          // Bordillos laterales en los tramos principales
          if (s % 2 === 0) {
            for (const side of [-1, 1]) {
              const cx = px + nx * side * 0.010, cz = pz + nz * side * 0.010;
              const cy = height(cx, cz);
              if (cy < 0.008) continue;
              addGeo(new THREE.BoxGeometry(0.0042, 0.0055, 0.0095, 1, 2, 1), 0x827e78, {
                p: [cx, cy + 0.0008, cz], r: [0, yaw, 0], colorFn: graniteColor(),
              });
            }
          }
        }
      }
    }
  }

  // Columnas prismáticas y estratos de granito incrustados en los acantilados (~235 bloques)
  for (let i = 0, tries = 0; i < 235 && tries < 9500; tries++) {
    const ang = rng() * Math.PI * 2, r = 0.04 + rng() * (R * 0.78);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const h = height(x, z), sl = slopeAt(x, z);
    if (sl < 0.36 || h < 0.008 || h > 0.118) continue;
    if (pathDist(x, z) < 0.020) continue;
    if (EXPLANADAS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r0 + 0.008)) continue;
    const rad = 0.006 + rng() * 0.009, bh = 0.018 + rng() * 0.028;
    addGeo(new THREE.CylinderGeometry(rad * 0.65, rad * 1.15, bh, 10, 6),
      rng() < 0.5 ? 0x76726b : 0x8a857e, {
        p: [x, Math.max(0.004, h - 0.004), z],
        r: [(rng() - 0.5) * 0.28, rng() * Math.PI * 2, (rng() - 0.5) * 0.28],
        s: [1.1 + rng() * 0.4, 1, 0.9 + rng() * 0.4], amt: 0.08,
      });
    i++;
  }

  // Escollos y farallones marinos en el agua alrededor de la isla
  for (let n = 0, tries = 0; n < 24 && tries++ < 1500;) {
    const ang = rng() * Math.PI * 2, r = 0.14 + rng() * (R - 0.17);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const h = height(x, z);
    if (h > -0.010 || h < -0.048) continue;
    if (Math.hypot(x - 0.03, z - 0.22) < 0.085) continue; // despejar dársena y muelle
    if (Math.hypot(x + 0.245, z - 0.115) < 0.055) continue; // despejar barco pesquero
    const s = 0.008 + rng() * 0.014;
    addGeo(new THREE.IcosahedronGeometry(s, 1), rng() < 0.5 ? 0x76726b : 0x615d57, {
      p: [x, 0.001, z], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.1, 0.62, 1.2], amt: 0.09,
    });
    n++;
  }

  // Pinos marítimos detallados, árboles frondosos y arbustos costeros
  {
    const placed = [];
    const avoid = [
      [LH.x, LH.z, 0.072],
      [HS.x, HS.z, 0.095],
      [CH.x, CH.z, 0.058],
      [CH.x - 0.048, CH.z - 0.010, 0.038],
      [-0.024, 0.148, 0.045],
      [IS.x, IS.z, 0.040],
    ];
    let tries = 0;
    while (placed.length < 40 && tries++ < 3500) {
      const x = (rng() - 0.5) * 0.44, z = (rng() - 0.5) * 0.44;
      const h = height(x, z);
      if (h < 0.022 || h > 0.120 || slopeAt(x, z) > 0.78) continue;
      if (pathDist(x, z) < 0.022) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 0.026)) continue;
      placed.push([x, z]);
      const sc = 0.72 + rng() * 0.55;
      const y = h - 0.005;
      addGeo(new THREE.CylinderGeometry(0.0032 * sc, 0.0046 * sc, 0.022 * sc, 8, 2), 0x5c3e28, { p: [x, y + 0.011 * sc, z] });
      if (rng() < 0.72) {
        for (let j = 0; j < 5; j++) {
          addGeo(new THREE.ConeGeometry((0.021 - j * 0.0032) * sc, 0.021 * sc, 14, 3), j % 2 ? 0x3b8447 : 0x2f703d, {
            p: [x, y + (0.022 + j * 0.0105) * sc, z], r: [0, rng() * 3, 0], amt: 0.08,
          });
        }
      } else {
        addGeo(new THREE.IcosahedronGeometry(0.019 * sc, 1), 0x62a445, {
          p: [x, y + 0.034 * sc, z], r: [rng() * 3, rng() * 3, 0], s: [1.1, 0.85, 1.05], amt: 0.09,
        });
        addGeo(new THREE.IcosahedronGeometry(0.013 * sc, 1), 0x73b650, {
          p: [x + 0.009 * sc, y + 0.044 * sc, z + 0.005 * sc], r: [rng() * 3, rng() * 3, 0], amt: 0.09,
        });
      }
      if (placed.length % 2 === 0 && features.filter((f) => f.type === 'firefly').length < 22) {
        features.push({
          type: 'firefly',
          pos: [x + (rng() - 0.5) * 0.022, h + 0.022 + rng() * 0.025, z + (rng() - 0.5) * 0.022],
          size: 0.022,
        });
      }
    }

    // 55 arbustos costeros y matas de sotobosque
    for (let b = 0, bt = 0; b < 55 && bt++ < 2500;) {
      const x = (rng() - 0.5) * 0.45, z = (rng() - 0.5) * 0.45;
      const h = height(x, z);
      if (h < 0.016 || h > 0.118 || slopeAt(x, z) > 0.82) continue;
      if (pathDist(x, z) < 0.017) continue;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar * 0.88)) continue;
      const sr = 0.005 + rng() * 0.0055;
      addGeo(new THREE.IcosahedronGeometry(sr, 1), rng() < 0.5 ? 0x4c8a47 : 0x5c9c4f, {
        p: [x, h + sr * 0.4, z], s: [1.2, 0.72, 1.1], r: [rng() * 3, rng() * 3, 0], amt: 0.09,
      });
      b++;
    }
  }

  // Destellos sobre el agua, nubes altas y bandadas de gaviotas
  for (let i = 0, tries = 0; i < 95 && tries < 3000; tries++) {
    const ang = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.93;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (height(x, z) > -0.010) continue;
    features.push({ type: 'sparkle', pos: [x, 0.0035, z], size: 0.009 });
    i++;
  }
  const cloudRing = [
    [-0.22, 0.34, -0.14, 0.016],
    [0.24,  0.37, -0.12, 0.017],
    [0.02,  0.40, -0.22, 0.015],
    [0.22,  0.29,  0.14, 0.015],
    [-0.20, 0.30,  0.16, 0.014],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0.02, cy, -0.04], size: cs });
  }
  features.push({ type: 'gulls', pos: [0.06, 0.32, -0.06], size: 0.13 });
  features.push({ type: 'gulls', pos: [-0.05, 0.16, 0.18], size: 0.09 });

  return finish('El Faro');
}
