// Diorama "El Coliseo Romano" — Anfiteatro Flavio en su máximo esplendor imperial (c. 80–100 d.C.)
// Estructura completa en 4 niveles con arquerías abiertas, estatuas en las arcadas,
// escudos de bronce (clipea), velarium retráctil con mástiles, 4 pórticos axiales con cuadrigas,
// cavea escalonada de mármol, Pulvinar imperial, arena con fosa abierta del hypogeum,
// y entorno del Valle del Coliseo: Coloso de Sol, Meta Sudans, Arco de Tito, Vía Sacra y jardines romanos.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder } from './builder.js';

export function buildColiseo(seed = 53) {
  const { rng, fbm, features, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);

  // =====================================================================
  // PALETA IMPERIAL ROMANA Y SILLERÍA PROCEDIMENTAL
  // =====================================================================
  const travertineColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 190 * scale);
    const col = Math.floor((cx + cz) * 130 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0xe6d9c0, 0xdcccb0, 0xeee2cb, 0xd4c2a4];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.008 && ((row + col) & 1)) hex = 0xcbb898;
    return jitter(hex, 0.025);
  };

  const marbleColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 210);
    const col = Math.floor((cx - cz) * 140 + (row & 1) * 0.5);
    const h = ((row * 31) ^ (col * 17)) & 3;
    const pal = [0xf5f0e7, 0xebe4d7, 0xf9f6f0, 0xe2d9ca];
    return jitter(pal[h], 0.024);
  };

  const brickColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 240);
    const col = Math.floor((cx + cz) * 160);
    const h = ((row * 43) ^ (col * 29)) & 3;
    const pal = [0x994a30, 0x863e27, 0xa85539, 0x793622];
    return jitter(pal[h], 0.04);
  };

  const porphyryColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 190) & 1;
    return jitter(k ? 0x732329 : 0x5f1a20, 0.038);
  };

  const bronzeColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 220) & 1;
    return jitter(k ? 0xdda93a : 0xc89428, 0.04);
  };

  const sandColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 42 + 3, cz * 42 + 7);
    return jitter(n > 0.52 ? 0xe5c88c : 0xd9b97a, 0.035);
  };

  const qYXZ = (rx, ry, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));

  // =====================================================================
  // 1. BASE Y EXPLANADA DEL VALLE DEL COLISEO (ZÓCALO CLÁSICO ESCALONADO)
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.325, AZ = 0.255, FLOOR = -0.048, Y_PLAZA = 0.016;
  const COL_X = 0.052, COL_Z = -0.010;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 3.8) + Math.pow(Math.abs(s) / AZ, 3.8), 1 / 3.8);
  };

  // Distancia a la calzada de la Vía Sacra (ramal hacia Pórtico Oeste y ramal hacia Pórtico Sur)
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
  const viaSacraDist = (x, z) => Math.min(
    segDist(x, z, [[-0.315, 0.154], [-0.258, 0.138], [-0.200, 0.118], [-0.158, 0.060], [-0.145, -0.010]]),
    segDist(x, z, [[-0.200, 0.118], [-0.110, 0.154], [0.052, 0.172]])
  );

  const K = 64, S = 180;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.96);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      row.push({ v: new THREE.Vector3(x, Y_PLAZA, z), x, z });
    }
    ringPts.push(row);
  }

  function groundColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    const vd = viaSacraDist(cx, cz);
    if (vd < 0.020) {
      const ix = Math.floor(cx * 165), iz = Math.floor(cz * 165);
      const h = ((ix * 73856093) ^ (iz * 19349663)) & 3;
      return jitter([0x4d4943, 0x403d38, 0x57524b, 0x36332f][h], 0.045);
    }
    if (vd < 0.0245) return jitter(0xd9ccb2, 0.025); // bordillo de travertino de la Vía Sacra
    // Anillo pavimentado radial alrededor del Coliseo
    const dCol = Math.hypot((cx - COL_X) / 0.202, (cz - COL_Z) / 0.164);
    if (dCol < 1.24 && dCol > 1.01) {
      const ang = Math.atan2(cz - COL_Z, cx - COL_X);
      const ring = Math.floor(dCol * 30), seg = Math.floor((ang + Math.PI) * 22);
      return jitter((ring + seg) & 1 ? 0xddd0b7 : 0xe6dac3, 0.024);
    }
    // Plaza circular bajo el Coloso y bajo la Meta Sudans
    if (Math.hypot(cx + 0.222, cz + 0.098) < 0.044 || Math.hypot(cx + 0.210, cz - 0.024) < 0.038) {
      return jitter(0xe7dcc6, 0.022);
    }
    const ix = Math.floor(cx * 115), iz = Math.floor(cz * 115);
    const h = ((ix * 31) ^ (iz * 17)) & 3;
    return jitter([0xded1b8, 0xe4d8c0, 0xd6c8ae, 0xe9dec8][h], 0.025);
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

  // Zócalo arquitectónico romano estilizado y hermético (moldura travertino, toba cálida y base cerrada)
  const rim = ringPts[K];
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  const radial = new THREE.Vector3();
  const Y_BAND1 = 0.002, Y_BAND2 = -0.034;
  for (let s = 0; s < S; s++) {
    const a = rim[s].v, b = rim[(s + 1) % S].v;
    const ax0 = CX + (a.x - CX) * 1.008, az0 = CZ + (a.z - CZ) * 1.008;
    const bx0 = CX + (b.x - CX) * 1.008, bz0 = CZ + (b.z - CZ) * 1.008;
    const ax1 = CX + (a.x - CX) * 0.986, az1 = CZ + (a.z - CZ) * 0.986;
    const bx1 = CX + (b.x - CX) * 0.986, bz1 = CZ + (b.z - CZ) * 0.986;
    const ax2 = CX + (a.x - CX) * 0.962, az2 = CZ + (a.z - CZ) * 0.962;
    const bx2 = CX + (b.x - CX) * 0.962, bz2 = CZ + (b.z - CZ) * 0.962;

    const aTop = new THREE.Vector3(ax0, Y_PLAZA, az0), bTop = new THREE.Vector3(bx0, Y_PLAZA, bz0);
    const aM1  = new THREE.Vector3(ax0, Y_BAND1, az0), bM1  = new THREE.Vector3(bx0, Y_BAND1, bz0);
    const aM2  = new THREE.Vector3(ax1, Y_BAND2, az1), bM2  = new THREE.Vector3(bx1, Y_BAND2, bz1);
    const aBot = new THREE.Vector3(ax2, FLOOR, az2),   bBot = new THREE.Vector3(bx2, FLOOR, bz2);

    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    addTri(a, b, aTop, jitter(0xdfd2b9, 0.025), UP);
    addTri(b, bTop, aTop, jitter(0xdfd2b9, 0.025), UP);
    addTri(aTop, bTop, aM1, jitter(0xcab796, 0.03), radial);
    addTri(bTop, bM1, aM1, jitter(0xcab796, 0.03), radial);
    addTri(aM1, bM1, aM2, jitter(s % 2 ? 0x76644f : 0x826f58, 0.035), radial);
    addTri(bM1, bM2, aM2, jitter(s % 2 ? 0x76644f : 0x826f58, 0.035), radial);
    addTri(aM2, bM2, aBot, jitter(0x5b4d3d, 0.035), radial);
    addTri(bM2, bBot, aBot, jitter(0x5b4d3d, 0.035), radial);
    addTri(aBot, bBot, centerBottom, jitter(0x635545, 0.03), DOWN);
  }

  // =====================================================================
  // HELPERS ELÍPTICOS Y ARQUITECTÓNICOS PARA EL COLISEO
  // =====================================================================
  const RX = 0.192, RZ = 0.154;
  const N_BAYS = 56; // múltiplo de 4 => 0 (Este), 14 (Sur), 28 (Oeste), 42 (Norte)

  const bayTheta = [];
  const baySeamTheta = [];
  {
    const STEPS = 1024;
    const qCum = new Float64Array(STEPS + 1);
    for (let i = 1; i <= STEPS; i++) {
      const t0 = ((i - 1) / STEPS) * (Math.PI / 2);
      const t1 = (i / STEPS) * (Math.PI / 2);
      const tm = 0.5 * (t0 + t1);
      const ds = Math.hypot(-RX * Math.sin(tm), RZ * Math.cos(tm)) * (t1 - t0);
      qCum[i] = qCum[i - 1] + ds;
    }
    const qTotal = qCum[STEPS];
    const quadAngle = (frac) => {
      const target = frac * qTotal;
      let lo = 0, hi = STEPS;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (qCum[mid] < target) lo = mid + 1; else hi = mid;
      }
      const a0 = qCum[Math.max(0, lo - 1)], a1 = qCum[lo];
      const f = a1 > a0 ? (target - a0) / (a1 - a0) : 0;
      return ((Math.max(0, lo - 1) + f) / STEPS) * (Math.PI / 2);
    };
    const perQuad = N_BAYS / 4;
    const arcAt = (idx) => {
      const wrapped = ((idx % N_BAYS) + N_BAYS) % N_BAYS;
      const q = Math.floor(wrapped / perQuad);
      const r = (wrapped - q * perQuad) / perQuad;
      return q * (Math.PI / 2) + quadAngle(r);
    };
    for (let b = 0; b < N_BAYS; b++) {
      bayTheta.push(arcAt(b));
      baySeamTheta.push(arcAt(b + 0.5));
    }
  }

  const ellipseFrame = (theta, rx, rz) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    const x = COL_X + rx * c, z = COL_Z + rz * s;
    const nx0 = rz * c, nz0 = rx * s;
    const nl = Math.hypot(nx0, nz0) || 1;
    const nx = nx0 / nl, nz = nz0 / nl;
    const yaw = Math.atan2(nx, nz);
    return { x, z, nx, nz, tx: -nz, tz: nx, yaw };
  };

  const addEllipticRing = (rxIn, rzIn, rxOut, rzOut, yBot, yTop, segs, hex, colorFn = null, amt = 0.03) => {
    const inBot = [], inTop = [], outBot = [], outTop = [];
    for (let s = 0; s < segs; s++) {
      const th = (s / segs) * Math.PI * 2;
      const c = Math.cos(th), sn = Math.sin(th);
      inBot.push(new THREE.Vector3(COL_X + rxIn * c, yBot, COL_Z + rzIn * sn));
      inTop.push(new THREE.Vector3(COL_X + rxIn * c, yTop, COL_Z + rzIn * sn));
      outBot.push(new THREE.Vector3(COL_X + rxOut * c, yBot, COL_Z + rzOut * sn));
      outTop.push(new THREE.Vector3(COL_X + rxOut * c, yTop, COL_Z + rzOut * sn));
    }
    const radOut = new THREE.Vector3(), radIn = new THREE.Vector3();
    const pick = (a, b, c) => colorFn ? colorFn(a, b, c) : jitter(hex, amt);
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      radOut.set(outBot[s].x + outBot[s1].x - 2 * COL_X, 0, outBot[s].z + outBot[s1].z - 2 * COL_Z);
      radIn.set(-radOut.x, 0, -radOut.z);
      addTri(inTop[s], outTop[s], outTop[s1], pick(inTop[s], outTop[s], outTop[s1]), UP);
      addTri(inTop[s], outTop[s1], inTop[s1], pick(inTop[s], outTop[s1], inTop[s1]), UP);
      addTri(inBot[s], outBot[s1], outBot[s], pick(inBot[s], outBot[s1], outBot[s]), DOWN);
      addTri(inBot[s], inBot[s1], outBot[s1], pick(inBot[s], inBot[s1], outBot[s1]), DOWN);
      addTri(outBot[s], outTop[s], outTop[s1], pick(outBot[s], outTop[s], outTop[s1]), radOut);
      addTri(outBot[s], outTop[s1], outBot[s1], pick(outBot[s], outTop[s1], outBot[s1]), radOut);
      addTri(inBot[s], inTop[s1], inTop[s], pick(inBot[s], inTop[s1], inTop[s]), radIn);
      addTri(inBot[s], inBot[s1], inTop[s1], pick(inBot[s], inBot[s1], inTop[s1]), radIn);
    }
  };

  const makeArchBayGeo = (wTotal, hTotal, wOpen, hSpring, depth, arcSegs = 6) => {
    const rArch = wOpen * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-wTotal * 0.5, 0);
    shape.lineTo(-wOpen * 0.5, 0);
    shape.lineTo(-wOpen * 0.5, hSpring);
    for (let i = 1; i <= arcSegs; i++) {
      const a = Math.PI - (i / arcSegs) * Math.PI;
      shape.lineTo(Math.cos(a) * rArch, hSpring + Math.sin(a) * rArch);
    }
    shape.lineTo(wOpen * 0.5, 0);
    shape.lineTo(wTotal * 0.5, 0);
    shape.lineTo(wTotal * 0.5, hTotal);
    shape.lineTo(-wTotal * 0.5, hTotal);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: arcSegs });
    g.translate(0, 0, -depth * 0.5);
    return g;
  };

  const addStatue = (p, yaw, hScale = 1, isBronze = false) => {
    const fn = isBronze ? bronzeColor : marbleColor;
    const baseHex = isBronze ? 0xd4a238 : 0xf4efe6;
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    addGeo(new THREE.BoxGeometry(0.0046, 0.0026 * hScale, 0.0046), 0xd4c4a8, { p: [p[0], p[1] + 0.0013 * hScale, p[2]], r: [0, yaw, 0], amt: 0.025 });
    addGeo(new THREE.CylinderGeometry(0.0016, 0.0021, 0.0095 * hScale, 7), baseHex, { p: [p[0], p[1] + 0.0073 * hScale, p[2]], colorFn: fn });
    addGeo(new THREE.CylinderGeometry(0.0020, 0.0015, 0.0045 * hScale, 7), baseHex, { p: [p[0], p[1] + 0.0135 * hScale, p[2]], colorFn: fn });
    addGeo(new THREE.SphereGeometry(0.0014, 7, 5), baseHex, { p: [p[0], p[1] + 0.0172 * hScale, p[2]], colorFn: fn });
    addGeo(new THREE.BoxGeometry(0.0011, 0.0042 * hScale, 0.0011), baseHex, {
      p: [p[0] + nx * 0.0015, p[1] + 0.0148 * hScale, p[2] + nz * 0.0015], q: qYXZ(0.45, yaw, 0), colorFn: fn,
    });
  };

  const addQuadriga = (p, yaw, sc = 1) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const L = (lx, ly, lz) => [p[0] + lx * c + lz * s, p[1] + ly, p[2] - lx * s + lz * c];
    addGeo(new THREE.BoxGeometry(0.019 * sc, 0.0032 * sc, 0.014 * sc), 0xede5d7, { p: L(0, 0.0016 * sc, 0), r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.007 * sc, 0.0055 * sc, 0.0065 * sc), 0xd8a63a, { p: L(0, 0.006 * sc, -0.003 * sc), r: [0, yaw, 0], colorFn: bronzeColor });
    for (const side of [-1, 1]) {
      addGeo(new THREE.CylinderGeometry(0.003 * sc, 0.003 * sc, 0.0012 * sc, 8), 0xc49228, {
        p: L(side * 0.0042 * sc, 0.0045 * sc, -0.003 * sc), r: [0, yaw, Math.PI / 2],
      });
    }
    addGeo(new THREE.CylinderGeometry(0.0014 * sc, 0.0018 * sc, 0.0075 * sc, 6), 0xe5b84b, { p: L(0, 0.0115 * sc, -0.003 * sc), colorFn: bronzeColor });
    addGeo(new THREE.SphereGeometry(0.0013 * sc, 6, 5), 0xe5b84b, { p: L(0, 0.0162 * sc, -0.003 * sc), colorFn: bronzeColor });
    for (const hx of [-0.0068, -0.0023, 0.0023, 0.0068]) {
      const px = hx * sc, lift = (Math.abs(hx) < 0.004 ? 0.0008 : 0) * sc;
      addGeo(new THREE.BoxGeometry(0.0022 * sc, 0.0030 * sc, 0.0068 * sc), 0xd9a738, { p: L(px, 0.0072 * sc + lift, 0.0038 * sc), r: [0, yaw, 0], colorFn: bronzeColor });
      addGeo(new THREE.BoxGeometry(0.0017 * sc, 0.0046 * sc, 0.0020 * sc), 0xd9a738, { p: L(px, 0.0106 * sc + lift, 0.0068 * sc), q: qYXZ(-0.35, yaw, 0), colorFn: bronzeColor });
      addGeo(new THREE.BoxGeometry(0.0015 * sc, 0.0018 * sc, 0.0030 * sc), 0xe5b84b, { p: L(px, 0.0128 * sc + lift, 0.0080 * sc), q: qYXZ(0.3, yaw, 0), colorFn: bronzeColor });
      for (const leg of [-0.0022, 0.0022]) {
        addGeo(new THREE.CylinderGeometry(0.0006 * sc, 0.0005 * sc, 0.0042 * sc, 5), 0xc49228, { p: L(px, 0.0044 * sc, (0.0038 + leg) * sc) });
      }
    }
  };

  // Brasero romano con halo sutil de llama (size contenido para que no sature)
  const addBrazier = (p, sc = 1, hasFlame = true) => {
    addGeo(new THREE.CylinderGeometry(0.0024 * sc, 0.0034 * sc, 0.0042 * sc, 6), 0x8f6b24, { p: [p[0], p[1] + 0.0021 * sc, p[2]] });
    addGeo(new THREE.CylinderGeometry(0.0038 * sc, 0.0020 * sc, 0.0032 * sc, 8), 0xc49228, { p: [p[0], p[1] + 0.0054 * sc, p[2]], colorFn: bronzeColor });
    addGeo(new THREE.SphereGeometry(0.0022 * sc, 6, 5), 0xd8551a, { p: [p[0], p[1] + 0.0066 * sc, p[2]] });
    if (hasFlame) features.push({ type: 'flame', pos: [p[0], p[1] + 0.0070 * sc, p[2]], size: 0.0030 * sc });
  };

  // Parterre ajardinado romano con bordillo elevado hermético y árboles mediterráneos
  const addPine = (x, y, z, sc) => {
    addGeo(new THREE.CylinderGeometry(0.0024 * sc, 0.0038 * sc, 0.042 * sc, 7), 0x5d4129, {
      p: [x, y + 0.018 * sc, z], r: [(rng() - 0.5) * 0.06, rng() * 3, (rng() - 0.5) * 0.06], amt: 0.06,
    });
    addGeo(new THREE.IcosahedronGeometry(0.019 * sc, 0), 0x355c2e, {
      p: [x, y + 0.041 * sc, z], s: [1.35, 0.42, 1.35], r: [0, rng() * 3, 0], amt: 0.08,
    });
    addGeo(new THREE.IcosahedronGeometry(0.014 * sc, 0), 0x456f38, {
      p: [x + (rng() - 0.5) * 0.005, y + 0.047 * sc, z + (rng() - 0.5) * 0.005], s: [1.25, 0.40, 1.25], r: [0, rng() * 3, 0], amt: 0.08,
    });
  };
  const addCypress = (x, y, z, sc) => {
    addGeo(new THREE.CylinderGeometry(0.0018 * sc, 0.0026 * sc, 0.014 * sc, 6), 0x4c3623, { p: [x, y + 0.005 * sc, z] });
    addGeo(new THREE.ConeGeometry(0.0072 * sc, 0.046 * sc, 8, 3), 0x264726, { p: [x, y + 0.029 * sc, z], amt: 0.07 });
    addGeo(new THREE.ConeGeometry(0.0052 * sc, 0.030 * sc, 7, 2), 0x2f542d, { p: [x, y + 0.043 * sc, z], amt: 0.07 });
  };
  const addGardenBed = (cx, cz, rx, rz, rot = 0, treeCount = 6) => {
    const yBed = Y_PLAZA + 0.004;
    addGeo(new THREE.CylinderGeometry(1, 1.03, 0.008, 18), 0xd9cbb1, {
      p: [cx, Y_PLAZA + 0.001, cz], r: [0, rot, 0], s: [rx, 1, rz], amt: 0.03,
    });
    addGeo(new THREE.CylinderGeometry(0.92, 0.96, 0.005, 18), 0x4d7337, {
      p: [cx, Y_PLAZA + 0.004, cz], r: [0, rot, 0], s: [rx, 1, rz], amt: 0.06,
    });
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const rad = 0.25 + rng() * 0.52;
      const lx = Math.cos(ang) * rx * rad, lz = Math.sin(ang) * rz * rad;
      const wx = cx + lx * c + lz * s, wz = cz - lx * s + lz * c;
      const sc = 0.78 + rng() * 0.40;
      if (i % 2 === 0) addPine(wx, yBed, wz, sc); else addCypress(wx, yBed, wz, sc);
      if (i % 3 === 0) features.push({ type: 'firefly', pos: [wx, yBed + 0.024, wz], size: 0.026 });
    }
    for (let j = 0; j < 4; j++) {
      const ang = rng() * Math.PI * 2, rad = 0.35 + rng() * 0.48;
      const lx = Math.cos(ang) * rx * rad, lz = Math.sin(ang) * rz * rad;
      const wx = cx + lx * c + lz * s, wz = cz - lx * s + lz * c;
      addGeo(new THREE.IcosahedronGeometry(0.0058 + rng() * 0.0025, 0), j % 2 ? 0x3b6332 : 0x4b773c, {
        p: [wx, yBed + 0.003, wz], s: [1.1, 0.72, 1.1], r: [0, rng() * 3, 0], amt: 0.08,
      });
    }
  };

  // =====================================================================
  // 2. EL COLISEO: ESTILÓBATO, FACHADA DE 4 PISOS, CORNISAS Y GALERÍAS
  // =====================================================================
  const Y0 = 0.030;
  addEllipticRing(0.082, 0.052, RX + 0.019, RZ + 0.019, 0.006, 0.021, 112, 0xd9cbb1, travertineColor(0.006));
  addEllipticRing(0.154, 0.116, RX + 0.013, RZ + 0.013, 0.018, 0.026, 112, 0xe2d4ba, travertineColor(0.018));
  addEllipticRing(0.158, 0.120, RX + 0.007, RZ + 0.007, 0.024, Y0, 112, 0xe8dcc4, travertineColor(0.024));

  const TIER_H = [0.041, 0.039, 0.037, 0.038];
  const TIER_Y = [Y0, Y0 + 0.043, Y0 + 0.084, Y0 + 0.123]; // 0.030, 0.073, 0.114, 0.153
  const Y_CROWN = TIER_Y[3] + TIER_H[3]; // 0.191

  for (let i = 0; i < 4; i++) {
    const yc = TIER_Y[i] + TIER_H[i];
    const proj = i === 3 ? 0.007 : 0.0046;
    const thick = i === 3 ? 0.0075 : 0.0046;
    addEllipticRing(RX - 0.017, RZ - 0.017, RX + proj, RZ + proj, yc - 0.001, yc + thick, 112, 0xeadec8, travertineColor(yc));
    if (i === 3) {
      addEllipticRing(RX - 0.014, RZ - 0.014, RX + 0.009, RZ + 0.009, yc + 0.005, yc + 0.011, 112, 0xf2e7d3, travertineColor(yc));
    }
  }

  // Galerías internas de ladrillo romano (opus latericium) y forjados entre niveles
  const RX_AMB = RX - 0.021, RZ_AMB = RZ - 0.021;
  addEllipticRing(RX_AMB - 0.008, RZ_AMB - 0.008, RX_AMB, RZ_AMB, Y0 - 0.002, Y_CROWN + 0.002, 112, 0x994a30, brickColor);
  for (let i = 1; i <= 3; i++) {
    addEllipticRing(RX_AMB - 0.005, RZ_AMB - 0.005, RX - 0.004, RZ - 0.004, TIER_Y[i] - 0.002, TIER_Y[i] + 0.0015, 96, 0x863e27, brickColor);
  }

  for (let b = 0; b < N_BAYS; b++) {
    const thPrev = baySeamTheta[(b - 1 + N_BAYS) % N_BAYS];
    const thNext = baySeamTheta[b];
    const fA = ellipseFrame(thPrev, RX, RZ);
    const fB = ellipseFrame(thNext, RX, RZ);
    const wBay = Math.hypot(fB.x - fA.x, fB.z - fA.z) + 0.0018;
    const fMid = ellipseFrame(bayTheta[b], RX - 0.0065, RZ - 0.0065);
    const fCol = ellipseFrame(thNext, RX + 0.0012, RZ + 0.0012);

    // Pisos 1, 2 y 3: arquerías romanas nítidas + semicolumnas + estatuas en niveles 2 y 3
    for (let tier = 0; tier < 3; tier++) {
      const yBase = TIER_Y[tier];
      const hT = TIER_H[tier];
      const wOpen = wBay * 0.56;
      const hSpring = hT * 0.52;
      const gArch = makeArchBayGeo(wBay, hT, wOpen, hSpring, 0.013, 6);
      addGeo(gArch, 0xe6d9c0, { p: [fMid.x, yBase, fMid.z], r: [0, fMid.yaw, 0], colorFn: travertineColor(yBase) });

      addGeo(new THREE.BoxGeometry(0.0028, 0.0038, 0.0148), 0xf0e4cf, {
        p: [fMid.x + fMid.nx * 0.0005, yBase + hSpring + wOpen * 0.5 + 0.0018, fMid.z + fMid.nz * 0.0005],
        r: [0, fMid.yaw, 0], amt: 0.025,
      });

      if (tier >= 1) {
        addGeo(new THREE.BoxGeometry(wOpen + 0.0012, 0.0052, 0.0046), 0xdfd1b8, {
          p: [fMid.x + fMid.nx * 0.0032, yBase + 0.0026, fMid.z + fMid.nz * 0.0032],
          r: [0, fMid.yaw, 0], amt: 0.025,
        });
        const stY = yBase + 0.0052;
        addStatue([fMid.x + fMid.nx * 0.0012, stY, fMid.z + fMid.nz * 0.0012], fMid.yaw, tier === 1 ? 1.06 : 1.0, (b + tier) % 3 === 0);
      }

      addGeo(new THREE.BoxGeometry(0.0044, 0.0028, 0.0044), 0xdcccb0, { p: [fCol.x, yBase + 0.0014, fCol.z], r: [0, fCol.yaw, 0] });
      addGeo(new THREE.CylinderGeometry(0.0015, 0.0018, hT - 0.0054, 7, 1, true), 0xe8dbc3, {
        p: [fCol.x, yBase + hT * 0.5, fCol.z], colorFn: travertineColor(yBase),
      });
      const capW = tier === 0 ? 0.0042 : tier === 1 ? 0.0048 : 0.0046;
      const capH = tier === 2 ? 0.0040 : 0.0030;
      addGeo(new THREE.BoxGeometry(capW, capH, 0.0044), 0xf0e4cf, { p: [fCol.x, yBase + hT - capH * 0.5, fCol.z], r: [0, fCol.yaw, 0] });

      // Luz nocturna cálida visible dentro de las arcadas en los 3 niveles
      if (b % 2 === tier % 2) {
        features.push({
          type: 'city',
          pos: [fMid.x - fMid.nx * 0.001, yBase + hT * 0.44, fMid.z - fMid.nz * 0.001],
          size: 0.015,
        });
      }
    }

    const fWallIn = ellipseFrame(thNext, RX - 0.016, RZ - 0.016);
    addGeo(new THREE.BoxGeometry(0.0036, Y_CROWN - Y0, 0.016, 1, 4, 1), 0x994a30, {
      p: [fWallIn.x, (Y0 + Y_CROWN) * 0.5, fWallIn.z], r: [0, fWallIn.yaw, 0], colorFn: brickColor,
    });

    // Piso 4 (Ático Corintio): muro sólido, pilastras, Clipeum dorado / Ventana iluminada
    const y4 = TIER_Y[3], h4 = TIER_H[3];
    const fAtt = ellipseFrame(bayTheta[b], RX - 0.0065, RZ - 0.0065);
    addGeo(new THREE.BoxGeometry(wBay, h4, 0.0125, 2, 3, 1), 0xe6d9c0, {
      p: [fAtt.x, y4 + h4 * 0.5, fAtt.z], r: [0, fAtt.yaw, 0], colorFn: travertineColor(y4),
    });
    addGeo(new THREE.BoxGeometry(0.0034, h4, 0.0034), 0xefe2ca, {
      p: [fCol.x, y4 + h4 * 0.5, fCol.z], r: [0, fCol.yaw, 0], amt: 0.025,
    });
    if (b % 2 === 0) {
      const sx = fAtt.x + fAtt.nx * 0.0068, sz = fAtt.z + fAtt.nz * 0.0068;
      addGeo(new THREE.CylinderGeometry(0.0048, 0.0048, 0.0018, 10).rotateX(Math.PI / 2), 0xd8a63a, {
        p: [sx, y4 + h4 * 0.54, sz], r: [0, fAtt.yaw, 0], colorFn: bronzeColor,
      });
      addGeo(new THREE.SphereGeometry(0.0020, 6, 5), 0xf0c75e, { p: [sx + fAtt.nx * 0.001, y4 + h4 * 0.54, sz + fAtt.nz * 0.001] });
      if (b % 4 === 0) features.push({ type: 'sparkle', pos: [sx + fAtt.nx * 0.003, y4 + h4 * 0.56, sz + fAtt.nz * 0.003], size: 0.008 });
    } else {
      const wx = fAtt.x + fAtt.nx * 0.0066, wy = y4 + h4 * 0.48, wz = fAtt.z + fAtt.nz * 0.0066;
      addGeo(new THREE.BoxGeometry(0.0080, 0.0095, 0.0022), 0xd2c1a2, { p: [wx, wy, wz], r: [0, fAtt.yaw, 0] });
      addGeo(new THREE.BoxGeometry(0.0058, 0.0072, 0.0026), 0x202630, { p: [wx + fAtt.nx * 0.0004, wy, wz + fAtt.nz * 0.0004], r: [0, fAtt.yaw, 0] });
      features.push({ type: 'window', pos: [wx + fAtt.nx * 0.0022, wy, wz + fAtt.nz * 0.0022], yaw: fAtt.yaw, w: 0.0054, h: 0.0068 });
    }

    // Ménsula + Mástil estilizado del Velarium con remate dorado
    const fMast = ellipseFrame(bayTheta[b], RX + 0.0054, RZ + 0.0054);
    addGeo(new THREE.BoxGeometry(0.0034, 0.0055, 0.0058), 0xd7c7aa, { p: [fMast.x, Y_CROWN - 0.002, fMast.z], r: [0, fMast.yaw, 0] });
    addGeo(new THREE.CylinderGeometry(0.0013, 0.0016, 0.042, 6), 0x6b4728, { p: [fMast.x, Y_CROWN + 0.022, fMast.z] });
    addGeo(new THREE.SphereGeometry(0.0018, 6, 5), 0xd8a63a, { p: [fMast.x, Y_CROWN + 0.044, fMast.z] });
  }

  // =====================================================================
  // 3. 4 PÓRTICOS MONUMENTALES AXIALES + CUADRIGAS + EL VELARIUM IMPERIAL
  // =====================================================================
  const AXIAL_BAYS = [0, N_BAYS / 4, N_BAYS / 2, (3 * N_BAYS) / 4];
  for (const b of AXIAL_BAYS) {
    const f = ellipseFrame(bayTheta[b], RX + 0.009, RZ + 0.009);
    const px = f.x, pz = f.z, nx = f.nx, nz = f.nz, tx = f.tx, tz = f.tz, yaw = f.yaw;
    addGeo(new THREE.BoxGeometry(0.044, 0.022, 0.028), 0xdcccb0, { p: [px, Y_PLAZA + 0.004, pz], r: [0, yaw, 0], colorFn: travertineColor(Y_PLAZA) });
    for (const off of [-0.016, -0.0055, 0.0055, 0.016]) {
      const cx = px + nx * 0.007 + tx * off, cz = pz + nz * 0.007 + tz * off;
      addGeo(new THREE.BoxGeometry(0.0048, 0.0032, 0.0048), 0xede5d7, { p: [cx, Y0 + 0.0016, cz], r: [0, yaw, 0] });
      addGeo(new THREE.CylinderGeometry(0.0019, 0.0022, 0.036, 8), 0x732329, { p: [cx, Y0 + 0.020, cz], colorFn: porphyryColor });
      addGeo(new THREE.BoxGeometry(0.0046, 0.0034, 0.0046), 0xf5f0e7, { p: [cx, Y0 + 0.039, cz], r: [0, yaw, 0] });
    }
    addGeo(new THREE.BoxGeometry(0.042, 0.006, 0.024), 0xebe0cb, { p: [px, Y0 + 0.044, pz], r: [0, yaw, 0], colorFn: marbleColor });
    {
      const pedShape = new THREE.Shape();
      pedShape.moveTo(-0.021, 0); pedShape.lineTo(0.021, 0); pedShape.lineTo(0, 0.0095); pedShape.closePath();
      const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: 0.022, bevelEnabled: false });
      pedGeo.translate(0, 0, -0.011);
      addGeo(pedGeo, 0x8f1d22, { p: [px, Y0 + 0.047, pz], r: [0, yaw, 0], amt: 0.03 });
    }
    addQuadriga([px + nx * 0.002, Y0 + 0.0565, pz + nz * 0.002], yaw, 1.05);
    const fTop = ellipseFrame(bayTheta[b], RX - 0.003, RZ - 0.003);
    addGeo(new THREE.BoxGeometry(0.032, 0.009, 0.018), 0xede3d2, { p: [fTop.x, Y_CROWN + 0.013, fTop.z], r: [0, yaw, 0], colorFn: marbleColor });
    addQuadriga([fTop.x, Y_CROWN + 0.0175, fTop.z], yaw, 0.98);
    for (const side of [-1, 1]) {
      addBrazier([px + nx * 0.013 + tx * side * 0.021, Y0, pz + nz * 0.013 + tz * side * 0.021], 1.1, true);
    }
  }

  // VELARIUM IMPERIAL (56 gajos radiales sólidos + varas radiales y cabos discretos)
  {
    const Y_OUT = Y_CROWN + 0.011, Y_IN = Y_CROWN - 0.002;
    const RX_OUT = RX - 0.006, RZ_OUT = RZ - 0.006;
    const RX_OCU = 0.115, RZ_OCU = 0.081;
    const T_SAIL = 0.0028;

    for (let b = 0; b < N_BAYS; b++) {
      const t0 = baySeamTheta[(b - 1 + N_BAYS) % N_BAYS];
      const t1 = baySeamTheta[b];
      const tm = bayTheta[b];
      const isCrimson = b % 4 === 0 || b % 4 === 2;
      const sailHex = b % 4 === 0 ? 0x8f1d22 : b % 4 === 2 ? 0xa33229 : 0xf1e7d2;

      const fracs = [0, 0.5, 1];
      for (let f = 0; f < 2; f++) {
        const u0 = fracs[f], u1 = fracs[f + 1];
        const rx0 = RX_OUT + (RX_OCU - RX_OUT) * u0, rz0 = RZ_OUT + (RZ_OCU - RZ_OUT) * u0;
        const rx1 = RX_OUT + (RX_OCU - RX_OUT) * u1, rz1 = RZ_OUT + (RZ_OCU - RZ_OUT) * u1;
        const sag0 = u0 === 0.5 ? -0.0035 : 0;
        const sag1 = u1 === 0.5 ? -0.0035 : 0;
        const y0 = Y_OUT + (Y_IN - Y_OUT) * u0 + sag0;
        const y1 = Y_OUT + (Y_IN - Y_OUT) * u1 + sag1;

        const aT = new THREE.Vector3(COL_X + rx0 * Math.cos(t0), y0, COL_Z + rz0 * Math.sin(t0));
        const bT = new THREE.Vector3(COL_X + rx0 * Math.cos(t1), y0, COL_Z + rz0 * Math.sin(t1));
        const cT = new THREE.Vector3(COL_X + rx1 * Math.cos(t1), y1, COL_Z + rz1 * Math.sin(t1));
        const dT = new THREE.Vector3(COL_X + rx1 * Math.cos(t0), y1, COL_Z + rz1 * Math.sin(t0));

        const aB = new THREE.Vector3(aT.x, y0 - T_SAIL, aT.z);
        const bB = new THREE.Vector3(bT.x, y0 - T_SAIL, bT.z);
        const cB = new THREE.Vector3(cT.x, y1 - T_SAIL, cT.z);
        const dB = new THREE.Vector3(dT.x, y1 - T_SAIL, dT.z);

        addTri(aT, bT, cT, jitter(sailHex, 0.03), UP);
        addTri(aT, cT, dT, jitter(sailHex, 0.03), UP);
        addTri(aB, cB, bB, jitter(isCrimson ? 0x6f161a : 0xd8cdb8, 0.03), DOWN);
        addTri(aB, dB, cB, jitter(isCrimson ? 0x6f161a : 0xd8cdb8, 0.03), DOWN);
        if (f === 1) {
          const dirIn = new THREE.Vector3(COL_X - cT.x, 0, COL_Z - cT.z);
          addTri(dT, cT, cB, jitter(0xd4a438, 0.035), dirIn);
          addTri(dT, cB, dB, jitter(0xd4a438, 0.035), dirIn);
        }
      }

      if (b % 4 === 0) {
        const fMast = ellipseFrame(tm, RX + 0.0054, RZ + 0.0054);
        const ox = COL_X + RX_OCU * Math.cos(tm), oz = COL_Z + RZ_OCU * Math.sin(tm);
        addRod([fMast.x, Y_CROWN + 0.034, fMast.z], [ox, Y_IN, oz], 0.0021, 0xb89c6a, 5);
      }
    }
    addEllipticRing(RX_OCU - 0.003, RZ_OCU - 0.003, RX_OCU + 0.003, RZ_OCU + 0.003, Y_IN - 0.003, Y_IN + 0.002, 84, 0xc89a3c, bronzeColor);
  }

  // =====================================================================
  // 4. INTERIOR: PORTICUS IN SUMMA CAVEA, CAVEA, PULVINAR, ARENA E HYPOGEUM
  // =====================================================================
  {
    const RX_COL = 0.155, RZ_COL = 0.118;
    const Y_PORT = 0.155, H_PORT = 0.029;
    addEllipticRing(RX_COL - 0.005, RZ_COL - 0.005, 0.171, 0.134, Y_PORT - 0.004, Y_PORT, 96, 0xe8dfd0, marbleColor);
    addEllipticRing(RX_COL - 0.006, RZ_COL - 0.006, 0.172, 0.135, Y_PORT + H_PORT, Y_PORT + H_PORT + 0.005, 96, 0xddd2be, travertineColor(Y_PORT + H_PORT));
    for (let b = 0; b < N_BAYS; b++) {
      const f = ellipseFrame(bayTheta[b], RX_COL, RZ_COL);
      addGeo(new THREE.CylinderGeometry(0.0017, 0.0020, H_PORT, 7, 1, true), 0xf4efe6, {
        p: [f.x, Y_PORT + H_PORT * 0.5, f.z], colorFn: marbleColor,
      });
    }
  }

  {
    const steps = 15;
    const rxStart = 0.086, rzStart = 0.056, yStart = 0.052;
    const rxEnd = 0.154, rzEnd = 0.117, yEnd = 0.155;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1.15) / steps;
      const rx0 = rxStart + (rxEnd - rxStart) * t0;
      const rz0 = rzStart + (rzEnd - rzStart) * t0;
      const rx1 = Math.min(rxEnd + 0.005, rxStart + (rxEnd - rxStart) * t1);
      const rz1 = Math.min(rzEnd + 0.005, rzStart + (rzEnd - rzStart) * t1);
      const yStep = yStart + (yEnd - yStart) * ((i + 1) / steps);
      addEllipticRing(rx0, rz0, rx1, rz1, Y_PLAZA, yStep, 96, 0xf4efe6, marbleColor);
      if (i === 4 || i === 9) {
        addEllipticRing(rx0 - 0.002, rz0 - 0.002, rx0 + 0.002, rz0 + 0.002, yStep - 0.003, yStep + 0.0045, 96, 0x732329, porphyryColor);
      }
    }

    addEllipticRing(0.082, 0.052, 0.089, 0.059, Y_PLAZA, 0.054, 96, 0xe8ded0, marbleColor);
    addEllipticRing(0.0825, 0.0525, 0.0875, 0.0575, 0.054, 0.0565, 96, 0xd8a63a, bronzeColor);

    for (let v = 0; v < 14; v++) {
      const th = (v / 14) * Math.PI * 2 + 0.11;
      for (const frac of [0.34, 0.68]) {
        const rx = rxStart + (rxEnd - rxStart) * frac;
        const rz = rzStart + (rzEnd - rzStart) * frac;
        const yV = yStart + (yEnd - yStart) * frac;
        const fv = ellipseFrame(th, rx, rz);
        addGeo(new THREE.BoxGeometry(0.0075, 0.0065, 0.005), 0x261d19, { p: [fv.x, yV + 0.002, fv.z], r: [0, fv.yaw, 0] });
        addGeo(new THREE.BoxGeometry(0.0095, 0.0022, 0.006), 0xebe3d5, { p: [fv.x, yV + 0.0058, fv.z], r: [0, fv.yaw, 0] });
      }
    }
  }

  for (const side of [-1, 1]) {
    const px = COL_X, pz = COL_Z + side * 0.072, py = 0.054;
    const yaw = side > 0 ? Math.PI : 0;
    addGeo(new THREE.BoxGeometry(0.032, 0.022, 0.024), 0xf0e8da, { p: [px, py - 0.002, pz], colorFn: marbleColor });
    for (const cx of [-0.012, -0.004, 0.004, 0.012]) {
      addGeo(new THREE.CylinderGeometry(0.0014, 0.0016, 0.018, 7), 0x732329, { p: [px + cx, py + 0.017, pz], colorFn: porphyryColor });
    }
    addGeo(new THREE.BoxGeometry(0.033, 0.0038, 0.023), 0x8f1d22, { p: [px, py + 0.027, pz], r: [0, yaw, 0] });
    addGeo(new THREE.BoxGeometry(0.035, 0.0018, 0.025), 0xd8a63a, { p: [px, py + 0.0295, pz], r: [0, yaw, 0], colorFn: bronzeColor });
    addBrazier([px - 0.018, py + 0.008, pz], 0.85, true);
    addBrazier([px + 0.018, py + 0.008, pz], 0.85, true);
  }

  {
    const Y_ARENA = 0.034, Y_HYPO = 0.018;
    addEllipticRing(0.045, 0.023, 0.084, 0.054, Y_PLAZA - 0.002, Y_ARENA, 84, 0xdfc184, sandColor);
    addEllipticRing(0.001, 0.001, 0.048, 0.026, Y_PLAZA - 0.004, Y_HYPO, 48, 0x7d3822, brickColor);
    for (const wz of [-0.015, -0.007, 0.001, 0.009, 0.016]) {
      const len = 0.070 * Math.sqrt(Math.max(0.15, 1 - (wz / 0.025) * (wz / 0.025)));
      addGeo(new THREE.BoxGeometry(len, Y_ARENA - Y_HYPO - 0.002, 0.0026, 6, 2, 1), 0x994a30, {
        p: [COL_X, (Y_ARENA + Y_HYPO) * 0.5 - 0.001, COL_Z + wz], colorFn: brickColor,
      });
    }
    addGeo(new THREE.BoxGeometry(0.023, 0.0032, 0.054), 0x8c5e35, { p: [COL_X - 0.019, Y_ARENA - 0.0012, COL_Z], amt: 0.05 });
    addGeo(new THREE.BoxGeometry(0.019, 0.0032, 0.050), 0x7e522d, { p: [COL_X + 0.021, Y_ARENA - 0.0012, COL_Z], amt: 0.05 });
    const fighters = [
      [-0.055, 0.017, 0x8f1d22], [-0.047, 0.013, 0x2a4f7a],
      [0.053, -0.015, 0xd4a438], [0.045, -0.011, 0x8f1d22],
      [-0.017, -0.035, 0x385e3c], [0.013, 0.035, 0xb84a18],
    ];
    for (const [fx, fz, shieldHex] of fighters) {
      const px = COL_X + fx, pz = COL_Z + fz;
      addGeo(new THREE.CylinderGeometry(0.0016, 0.0018, 0.008, 6), 0xd8a87e, { p: [px, Y_ARENA + 0.004, pz] });
      addGeo(new THREE.SphereGeometry(0.0014, 6, 5), 0xd9a738, { p: [px, Y_ARENA + 0.009, pz] });
      addGeo(new THREE.BoxGeometry(0.0012, 0.0045, 0.0036), shieldHex, { p: [px + 0.0018, Y_ARENA + 0.0045, pz], r: [0, rng() * 3, 0] });
    }
    addQuadriga([COL_X - 0.019, Y_ARENA, COL_Z + 0.034], Math.PI * 0.48, 0.72);
    addQuadriga([COL_X + 0.022, Y_ARENA, COL_Z - 0.034], -Math.PI * 0.52, 0.72);
    addBrazier([COL_X - 0.076, Y_ARENA, COL_Z - 0.009], 0.75, true);
    addBrazier([COL_X + 0.076, Y_ARENA, COL_Z + 0.009], 0.75, true);
  }

  // =====================================================================
  // 5. MONUMENTOS DEL VALLE DEL COLISEO: COLOSO, META SUDANS Y ARCO DE TITO
  // =====================================================================
  // A. EL COLOSO DE SOL (Colossus Neronis / Solis) en (-0.222, -0.098)
  {
    const sx = -0.222, sz = -0.098, y0 = Y_PLAZA;
    addGeo(new THREE.BoxGeometry(0.044, 0.014, 0.044), 0xdcccb0, { p: [sx, y0 + 0.002, sz], colorFn: travertineColor(y0) });
    addGeo(new THREE.BoxGeometry(0.034, 0.032, 0.034), 0xf4efe6, { p: [sx, y0 + 0.024, sz], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.030, 0.018, 0.030), 0x732329, { p: [sx, y0 + 0.024, sz], colorFn: porphyryColor });
    addGeo(new THREE.BoxGeometry(0.038, 0.006, 0.038), 0xede5d7, { p: [sx, y0 + 0.042, sz], colorFn: marbleColor });
    const yb = y0 + 0.045;
    addGeo(new THREE.CylinderGeometry(0.0075, 0.0105, 0.034, 10), 0xdda93a, { p: [sx, yb + 0.017, sz], colorFn: bronzeColor });
    addGeo(new THREE.CylinderGeometry(0.0095, 0.0078, 0.024, 10), 0xe5b84b, { p: [sx, yb + 0.044, sz], colorFn: bronzeColor });
    addGeo(new THREE.BoxGeometry(0.021, 0.008, 0.011), 0xdda93a, { p: [sx, yb + 0.053, sz], r: [0, 0.35, 0], colorFn: bronzeColor });
    addGeo(new THREE.SphereGeometry(0.0068, 10, 8), 0xebb944, { p: [sx, yb + 0.064, sz], colorFn: bronzeColor });
    for (let r = 0; r < 7; r++) {
      const ang = (r / 7) * Math.PI * 2;
      const dirRay = new THREE.Vector3(Math.cos(ang) * 0.65, 0.76, Math.sin(ang) * 0.65).normalize();
      addGeo(new THREE.ConeGeometry(0.0016, 0.013, 4), 0xf5cb5c, {
        p: [sx + dirRay.x * 0.010, yb + 0.065 + dirRay.y * 0.010, sz + dirRay.z * 0.010],
        q: new THREE.Quaternion().setFromUnitVectors(UP, dirRay),
      });
    }
    addRod([sx + 0.009, yb + 0.052, sz + 0.002], [sx + 0.018, yb + 0.074, sz + 0.010], 0.0026, 0xd9a738, 6);
    addGeo(new THREE.SphereGeometry(0.0042, 8, 6), 0xf6cf60, { p: [sx + 0.019, yb + 0.078, sz + 0.011] });
    addRod([sx - 0.009, yb + 0.052, sz - 0.002], [sx - 0.016, yb + 0.036, sz + 0.004], 0.0025, 0xc49228, 6);
    features.push({ type: 'flame', pos: [sx + 0.019, yb + 0.082, sz + 0.011], size: 0.0038 });
    features.push({ type: 'sparkle', pos: [sx, yb + 0.076, sz], size: 0.011 });
    addBrazier([sx + 0.024, y0, sz + 0.022], 1.05, true);
    addBrazier([sx - 0.024, y0, sz + 0.022], 1.05, true);
    features.push({ type: 'smoke', pos: [sx + 0.024, y0 + 0.010, sz + 0.022], size: 0.0052 });
  }

  // B. LA META SUDANS (Fuente Imperial Cónica) en (-0.210, +0.024)
  {
    const mx = -0.210, mz = 0.024, y0 = Y_PLAZA;
    addGeo(new THREE.CylinderGeometry(0.027, 0.029, 0.012, 24), 0xdfd4bf, { p: [mx, y0 + 0.002, mz], colorFn: marbleColor });
    addGeo(new THREE.CylinderGeometry(0.0235, 0.0235, 0.006, 24), 0x2c8396, { p: [mx, y0 + 0.006, mz], amt: 0.05 });
    addGeo(new THREE.CylinderGeometry(0.0105, 0.0125, 0.016, 16), 0xebe2d2, { p: [mx, y0 + 0.014, mz], colorFn: marbleColor });
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0092, 0.044, 16), 0x994a30, { p: [mx, y0 + 0.042, mz], colorFn: brickColor });
    addGeo(new THREE.SphereGeometry(0.0040, 8, 6), 0xdda93a, { p: [mx, y0 + 0.066, mz], colorFn: bronzeColor });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      features.push({ type: 'sparkle', pos: [mx + Math.cos(a) * 0.016, y0 + 0.011, mz + Math.sin(a) * 0.016], size: 0.009 });
    }
    features.push({ type: 'sparkle', pos: [mx, y0 + 0.070, mz], size: 0.0095 });
  }

  // C. EL ARCO TRIUNFAL DE TITO sobre la Vía Sacra en (-0.220, +0.125)
  {
    const ax = -0.220, az = 0.125, y0 = Y_PLAZA;
    const yaw = Math.atan2(0.058, -0.020);
    const archGeo = makeArchBayGeo(0.048, 0.052, 0.020, 0.024, 0.022, 8);
    addGeo(archGeo, 0xf4efe6, { p: [ax, y0 - 0.003, az], r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.054, 0.0055, 0.026), 0xe6ddd0, { p: [ax, y0 + 0.051, az], r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.048, 0.015, 0.022), 0xf5f0e7, { p: [ax, y0 + 0.061, az], r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.052, 0.0045, 0.025), 0xe6ddd0, { p: [ax, y0 + 0.070, az], r: [0, yaw, 0], colorFn: marbleColor });
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const sideZ of [-1, 1]) {
      for (const colX of [-0.020, -0.013, 0.013, 0.020]) {
        const cx = ax + colX * c + sideZ * 0.0115 * s;
        const cz = az - colX * s + sideZ * 0.0115 * c;
        addGeo(new THREE.CylinderGeometry(0.0016, 0.0019, 0.048, 7), 0xf9f6f0, { p: [cx, y0 + 0.024, cz], colorFn: marbleColor });
      }
      const tx = ax + sideZ * 0.0115 * s, tz = az + sideZ * 0.0115 * c;
      addGeo(new THREE.BoxGeometry(0.030, 0.009, 0.002), 0xd8a63a, { p: [tx, y0 + 0.061, tz], r: [0, yaw, 0], colorFn: bronzeColor });
    }
    addQuadriga([ax, y0 + 0.0725, az], yaw, 1.15);
    addBrazier([ax - 0.028 * c, y0, az + 0.028 * s], 0.95, true);
    addBrazier([ax + 0.028 * c, y0, az - 0.028 * s], 0.95, true);
    features.push({ type: 'smoke', pos: [ax - 0.028 * c, y0 + 0.010, az + 0.028 * s], size: 0.005 });
  }

  // D. COLUMNAS HONORÍFICAS, BOLARDOS (CIPPI) Y EXEDRA ORIENTAL
  {
    for (const [cx, cz] of [[-0.145, -0.095], [-0.152, 0.065]]) {
      addGeo(new THREE.BoxGeometry(0.015, 0.014, 0.015), 0xe6ddd0, { p: [cx, Y_PLAZA + 0.002, cz], colorFn: marbleColor });
      addGeo(new THREE.CylinderGeometry(0.0036, 0.0044, 0.056, 10), 0xf4efe6, { p: [cx, Y_PLAZA + 0.036, cz], colorFn: marbleColor });
      addGeo(new THREE.BoxGeometry(0.011, 0.004, 0.011), 0xebe3d5, { p: [cx, Y_PLAZA + 0.066, cz] });
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0028, 0.014, 7), 0xdda93a, { p: [cx, Y_PLAZA + 0.075, cz], colorFn: bronzeColor });
      addGeo(new THREE.SphereGeometry(0.0022, 6, 5), 0xe5b84b, { p: [cx, Y_PLAZA + 0.083, cz] });
    }
    for (let i = 0; i < 28; i++) {
      const th = (i / 28) * Math.PI * 2 + 0.08;
      if (Math.min(Math.abs(Math.sin(th)), Math.abs(Math.cos(th))) < 0.14) continue;
      const fx = COL_X + 0.222 * Math.cos(th), fz = COL_Z + 0.184 * Math.sin(th);
      if (Math.hypot(fx / AX, fz / AZ) > 0.94) continue;
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0026, 0.012, 6), 0xdfd2ba, { p: [fx, Y_PLAZA + 0.003, fz], amt: 0.03 });
    }
  }

  // =====================================================================
  // 6. PARTERRES AJARDINADOS ROMANOS (PINOS PIÑONEROS Y CIPRESES)
  // =====================================================================
  addGardenBed(0.060, -0.212, 0.115, 0.026, 0.0, 8);   // Norte
  addGardenBed(0.268, -0.132, 0.036, 0.068, -0.25, 6); // Noreste
  addGardenBed(0.265,  0.125, 0.038, 0.068,  0.25, 6); // Sureste
  addGardenBed(-0.075, 0.212, 0.082, 0.026,  0.05, 6); // Sur
  addGardenBed(0.145,  0.205, 0.072, 0.026, -0.08, 6); // Sur-este
  addGardenBed(-0.225, -0.195, 0.052, 0.028, 0.15, 5); // Noroeste detrás del Coloso
  addGardenBed(-0.215,  0.200, 0.056, 0.025, -0.12, 5); // Suroeste junto a Vía Sacra

  // =====================================================================
  // 7. EFECTOS VIVOS EN EL CIELO SOBRE EL COLISEO
  // =====================================================================
  const cloudRing = [
    [-0.22, 0.30, -0.13, 0.017],
    [0.23,  0.32, -0.09, 0.018],
    [0.04,  0.35, -0.18, 0.016],
    [0.24,  0.28,  0.13, 0.016],
    [-0.21, 0.27,  0.15, 0.015],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [COL_X, cy, COL_Z], size: cs });
  }
  features.push({ type: 'gulls', pos: [COL_X, 0.250, COL_Z], size: 0.12 });

  return finish('El Coliseo Romano');
}
