// Diorama "El Coliseo Romano" — Anfiteatro Flavio en su máximo esplendor imperial (c. 80–100 d.C.)
// Medidas y proporciones históricas abiertas (~0.28 altura/ancho, cavea a ~33°, velarium calado sobre el pórtico superior),
// doble galería anular travertina de 64 vanos con arquivoltas, órdenes diferenciados, barandillas, 128 estatuas,
// 32 clipea grabados, 32 ventanas con celosía, 4 pórticos con cuadrigas, Pulvinar, arena con fosa abierta del hypogeum,
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
    const row = Math.floor(cy * 210 * scale);
    const col = Math.floor((cx + cz) * 140 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0xe8dbc3, 0xdeceb2, 0xf0e4ce, 0xd5c4a6];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.006 && ((row + col) & 1)) hex = 0xcbb898;
    return jitter(hex, 0.022);
  };

  const marbleColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 230);
    const col = Math.floor((cx - cz) * 150 + (row & 1) * 0.5);
    const h = ((row * 31) ^ (col * 17)) & 3;
    const pal = [0xf6f1e8, 0xede6d9, 0xfaf7f2, 0xe4dbcc];
    return jitter(pal[h], 0.022);
  };

  const brickColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 260);
    const col = Math.floor((cx + cz) * 175);
    const h = ((row * 43) ^ (col * 29)) & 3;
    const pal = [0xa15137, 0x8e442c, 0xb05d40, 0x7e3a25];
    return jitter(pal[h], 0.038);
  };

  const porphyryColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 200) & 1;
    return jitter(k ? 0x76242b : 0x621b21, 0.035);
  };

  const bronzeColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 240) & 1;
    return jitter(k ? 0xdfa93b : 0xca9428, 0.038);
  };

  const sandColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 45 + 3, cz * 45 + 7);
    return jitter(n > 0.52 ? 0xe7ca8e : 0xdbbb7d, 0.032);
  };

  const qYXZ = (rx, ry, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));

  // =====================================================================
  // 1. BASE Y EXPLANADA DEL VALLE DEL COLISEO (ZÓCALO ESBELTO ESCALONADO)
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.335, AZ = 0.265, FLOOR = -0.028, Y_PLAZA = 0.012;
  const COL_X = 0.068, COL_Z = -0.006;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 3.8) + Math.pow(Math.abs(s) / AZ, 3.8), 1 / 3.8);
  };

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
    segDist(x, z, [[-0.325, 0.162], [-0.268, 0.145], [-0.205, 0.122], [-0.164, 0.065], [-0.148, -0.006]]),
    segDist(x, z, [[-0.205, 0.122], [-0.105, 0.158], [0.068, 0.175]])
  );

  const K = 68, S = 180;
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
      const ix = Math.floor(cx * 175), iz = Math.floor(cz * 175);
      const h = ((ix * 73856093) ^ (iz * 19349663)) & 3;
      return jitter([0x4e4a44, 0x413e39, 0x59544d, 0x373430][h], 0.045);
    }
    if (vd < 0.0245) return jitter(0xdccfba, 0.022);
    const dCol = Math.hypot((cx - COL_X) / 0.220, (cz - COL_Z) / 0.182);
    if (dCol < 1.20 && dCol > 1.00) {
      const ang = Math.atan2(cz - COL_Z, cx - COL_X);
      const ring = Math.floor(dCol * 34), seg = Math.floor((ang + Math.PI) * 26);
      return jitter((ring + seg) & 1 ? 0xdfd3ba : 0xe8ddc6, 0.022);
    }
    if (Math.hypot(cx + 0.238, cz + 0.102) < 0.044 || Math.hypot(cx + 0.224, cz - 0.022) < 0.038) {
      return jitter(0xe8dec8, 0.022);
    }
    const ix = Math.floor(cx * 125), iz = Math.floor(cz * 125);
    const h = ((ix * 31) ^ (iz * 17)) & 3;
    return jitter([0xe0d3ba, 0xe6dac2, 0xd8cab0, 0xebe0ca][h], 0.022);
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

  // Zócalo arquitectónico esbelto con moldura doble de travertino y base de toba cerrada
  const rim = ringPts[K];
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  const radial = new THREE.Vector3();
  const Y_BAND1 = 0.002, Y_BAND2 = -0.019;
  for (let s = 0; s < S; s++) {
    const a = rim[s].v, b = rim[(s + 1) % S].v;
    const ax0 = CX + (a.x - CX) * 1.008, az0 = CZ + (a.z - CZ) * 1.008;
    const bx0 = CX + (b.x - CX) * 1.008, bz0 = CZ + (b.z - CZ) * 1.008;
    const ax1 = CX + (a.x - CX) * 0.990, az1 = CZ + (a.z - CZ) * 0.990;
    const bx1 = CX + (b.x - CX) * 0.990, bz1 = CZ + (b.z - CZ) * 0.990;
    const ax2 = CX + (a.x - CX) * 0.970, az2 = CZ + (a.z - CZ) * 0.970;
    const bx2 = CX + (b.x - CX) * 0.970, bz2 = CZ + (b.z - CZ) * 0.970;

    const aTop = new THREE.Vector3(ax0, Y_PLAZA, az0), bTop = new THREE.Vector3(bx0, Y_PLAZA, bz0);
    const aM1  = new THREE.Vector3(ax0, Y_BAND1, az0), bM1  = new THREE.Vector3(bx0, Y_BAND1, bz0);
    const aM2  = new THREE.Vector3(ax1, Y_BAND2, az1), bM2  = new THREE.Vector3(bx1, Y_BAND2, bz1);
    const aBot = new THREE.Vector3(ax2, FLOOR, az2),   bBot = new THREE.Vector3(bx2, FLOOR, bz2);

    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    addTri(a, b, aTop, jitter(0xe1d5bd, 0.022), UP);
    addTri(b, bTop, aTop, jitter(0xe1d5bd, 0.022), UP);
    addTri(aTop, bTop, aM1, jitter(0xcbb897, 0.025), radial);
    addTri(bTop, bM1, aM1, jitter(0xcbb897, 0.025), radial);
    addTri(aM1, bM1, aM2, jitter(s % 2 ? 0x76644f : 0x826f58, 0.03), radial);
    addTri(bM1, bM2, aM2, jitter(s % 2 ? 0x76644f : 0x826f58, 0.03), radial);
    addTri(aM2, bM2, aBot, jitter(0x5b4d3d, 0.03), radial);
    addTri(bM2, bBot, aBot, jitter(0x5b4d3d, 0.03), radial);
    addTri(aBot, bBot, centerBottom, jitter(0x635545, 0.025), DOWN);
  }

  // =====================================================================
  // HELPERS ELÍPTICOS Y ARQUITECTÓNICOS PARA EL COLISEO (64 VANOS)
  // =====================================================================
  const RX = 0.212, RZ = 0.174; // relación 1.218:1 fiel al Coliseo real (189x156 m)
  const N_BAYS = 64; // múltiplo de 4 => 0 (Este), 16 (Sur), 32 (Oeste), 48 (Norte)

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

  const addEllipticRing = (rxIn, rzIn, rxOut, rzOut, yBot, yTop, segs, hex, colorFn = null, amt = 0.025) => {
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

  const makeArchBayGeo = (wTotal, hTotal, wOpen, hSpring, depth, arcSegs = 10) => {
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

  // Arquivolta semicircular en relieve siguiendo el arco romano
  const makeArchivoltGeo = (rIn, rOut, depth, segs = 8) => {
    const shape = new THREE.Shape();
    shape.moveTo(rIn, 0);
    for (let i = 1; i <= segs; i++) {
      const a = (i / segs) * Math.PI;
      shape.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
    }
    for (let i = segs; i >= 0; i--) {
      const a = (i / segs) * Math.PI;
      shape.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: segs });
    g.translate(0, 0, -depth * 0.5);
    return g;
  };

  // Estatua clásica detallada (pedestal moldurado, piernas/túnica, toga drapeada, cabeza y cetro/escudo)
  const addStatue = (p, yaw, hScale = 0.78, isBronze = false) => {
    const fn = isBronze ? bronzeColor : marbleColor;
    const baseHex = isBronze ? 0xd4a238 : 0xf6f1e8;
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    const tx = Math.cos(yaw), tz = -Math.sin(yaw);
    addGeo(new THREE.BoxGeometry(0.0044, 0.0018 * hScale, 0.0044), 0xd4c4a8, { p: [p[0], p[1] + 0.0009 * hScale, p[2]], r: [0, yaw, 0], amt: 0.02 });
    addGeo(new THREE.BoxGeometry(0.0036, 0.0012 * hScale, 0.0036), 0xebe3d5, { p: [p[0], p[1] + 0.0024 * hScale, p[2]], r: [0, yaw, 0] });
    const yb = p[1] + 0.0030 * hScale;
    addGeo(new THREE.CylinderGeometry(0.0015, 0.0020, 0.0068 * hScale, 8), baseHex, { p: [p[0], yb + 0.0034 * hScale, p[2]], colorFn: fn });
    addGeo(new THREE.CylinderGeometry(0.0019, 0.0015, 0.0048 * hScale, 8), baseHex, { p: [p[0], yb + 0.0086 * hScale, p[2]], colorFn: fn });
    // Manto cruzado sobre el pecho
    addGeo(new THREE.BoxGeometry(0.0032, 0.0046 * hScale, 0.0020), baseHex, {
      p: [p[0] + nx * 0.0004, yb + 0.0086 * hScale, p[2] + nz * 0.0004], q: qYXZ(0, yaw, 0.35), colorFn: fn,
    });
    addGeo(new THREE.SphereGeometry(0.0014, 6, 4), baseHex, { p: [p[0], yb + 0.0124 * hScale, p[2]], colorFn: fn });
    // Brazo alzado + lanza/cetro o escudo
    addGeo(new THREE.BoxGeometry(0.0010, 0.0038 * hScale, 0.0010), baseHex, {
      p: [p[0] + tx * 0.0018 + nx * 0.0008, yb + 0.0102 * hScale, p[2] + tz * 0.0018 + nz * 0.0008], q: qYXZ(0.55, yaw, -0.25), colorFn: fn,
    });
    addGeo(new THREE.CylinderGeometry(0.00035, 0.00035, 0.013 * hScale, 5), 0xd8a63a, {
      p: [p[0] - tx * 0.0018 + nx * 0.0006, yb + 0.0075 * hScale, p[2] - tz * 0.0018 + nz * 0.0006],
    });
  };

  // Cuadriga triunfal detallada (plinto, carro moldurado, ruedas con buje, auriga y 4 corceles)
  const addQuadriga = (p, yaw, sc = 1) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const L = (lx, ly, lz) => [p[0] + lx * c + lz * s, p[1] + ly, p[2] - lx * s + lz * c];
    addGeo(new THREE.BoxGeometry(0.020 * sc, 0.0028 * sc, 0.014 * sc), 0xede5d7, { p: L(0, 0.0014 * sc, 0), r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.0074 * sc, 0.0052 * sc, 0.0066 * sc), 0xd8a63a, { p: L(0, 0.0056 * sc, -0.0032 * sc), r: [0, yaw, 0], colorFn: bronzeColor });
    addGeo(new THREE.BoxGeometry(0.0080 * sc, 0.0012 * sc, 0.0070 * sc), 0xf0c75e, { p: L(0, 0.0082 * sc, -0.0032 * sc), r: [0, yaw, 0] });
    for (const side of [-1, 1]) {
      addGeo(new THREE.CylinderGeometry(0.0030 * sc, 0.0030 * sc, 0.0011 * sc, 10), 0xc49228, {
        p: L(side * 0.0044 * sc, 0.0042 * sc, -0.0032 * sc), r: [0, yaw, Math.PI / 2],
      });
      addGeo(new THREE.SphereGeometry(0.0011 * sc, 5, 4), 0xf5cb5c, { p: L(side * 0.0050 * sc, 0.0042 * sc, -0.0032 * sc) });
    }
    // Auriga con corona y estandarte
    addGeo(new THREE.CylinderGeometry(0.0014 * sc, 0.0018 * sc, 0.0072 * sc, 7), 0xe5b84b, { p: L(0, 0.0108 * sc, -0.0032 * sc), colorFn: bronzeColor });
    addGeo(new THREE.SphereGeometry(0.0013 * sc, 6, 5), 0xe5b84b, { p: L(0, 0.0154 * sc, -0.0032 * sc), colorFn: bronzeColor });
    addGeo(new THREE.BoxGeometry(0.0010 * sc, 0.0042 * sc, 0.0010 * sc), 0xe5b84b, { p: L(0.0015 * sc, 0.0138 * sc, -0.0016 * sc), q: qYXZ(0.4, yaw, 0) });
    // 4 caballos articulados (cuerpo, cuello arqueado, cabeza, crin, cola y patas)
    for (const hx of [-0.0068, -0.0023, 0.0023, 0.0068]) {
      const px = hx * sc, lift = (Math.abs(hx) < 0.004 ? 0.0008 : 0) * sc;
      addGeo(new THREE.BoxGeometry(0.0022 * sc, 0.0028 * sc, 0.0068 * sc), 0xd9a738, { p: L(px, 0.0068 * sc + lift, 0.0036 * sc), r: [0, yaw, 0], colorFn: bronzeColor });
      addGeo(new THREE.BoxGeometry(0.0016 * sc, 0.0046 * sc, 0.0020 * sc), 0xd9a738, { p: L(px, 0.0102 * sc + lift, 0.0066 * sc), q: qYXZ(-0.35, yaw, 0), colorFn: bronzeColor });
      addGeo(new THREE.BoxGeometry(0.0014 * sc, 0.0017 * sc, 0.0030 * sc), 0xe5b84b, { p: L(px, 0.0124 * sc + lift, 0.0078 * sc), q: qYXZ(0.3, yaw, 0), colorFn: bronzeColor });
      addGeo(new THREE.BoxGeometry(0.0008 * sc, 0.0024 * sc, 0.0014 * sc), 0xc49228, { p: L(px, 0.0072 * sc + lift, -0.0002 * sc), q: qYXZ(0.5, yaw, 0) });
      for (const leg of [-0.0022, 0.0022]) {
        addGeo(new THREE.CylinderGeometry(0.00055 * sc, 0.00045 * sc, 0.0040 * sc, 5), 0xc49228, { p: L(px, 0.0042 * sc, (0.0036 + leg) * sc) });
      }
    }
  };

  const addBrazier = (p, sc = 1, hasFlame = true) => {
    addGeo(new THREE.CylinderGeometry(0.0022 * sc, 0.0032 * sc, 0.0038 * sc, 6), 0x8f6b24, { p: [p[0], p[1] + 0.0019 * sc, p[2]] });
    addGeo(new THREE.CylinderGeometry(0.0036 * sc, 0.0019 * sc, 0.0028 * sc, 8), 0xc49228, { p: [p[0], p[1] + 0.0048 * sc, p[2]], colorFn: bronzeColor });
    addGeo(new THREE.SphereGeometry(0.0020 * sc, 6, 5), 0xd8551a, { p: [p[0], p[1] + 0.0060 * sc, p[2]] });
    if (hasFlame) features.push({ type: 'flame', pos: [p[0], p[1] + 0.0064 * sc, p[2]], size: 0.0026 * sc });
  };

  // Parterres ajardinados con doble bordillo, pinos piñoneros ramificados y cipreses
  const addPine = (x, y, z, sc) => {
    addGeo(new THREE.CylinderGeometry(0.0022 * sc, 0.0036 * sc, 0.036 * sc, 8), 0x5d4129, {
      p: [x, y + 0.015 * sc, z], r: [(rng() - 0.5) * 0.05, rng() * 3, (rng() - 0.5) * 0.05], amt: 0.06,
    });
    // Ramas abiertas bajo la copa
    for (let r = 0; r < 3; r++) {
      const a = (r / 3) * Math.PI * 2 + rng();
      addRod([x, y + 0.026 * sc, z], [x + Math.cos(a) * 0.009 * sc, y + 0.035 * sc, z + Math.sin(a) * 0.009 * sc], 0.0014 * sc, 0x5d4129, 5);
    }
    addGeo(new THREE.IcosahedronGeometry(0.017 * sc, 1), 0x355c2e, {
      p: [x, y + 0.036 * sc, z], s: [1.38, 0.36, 1.38], r: [0, rng() * 3, 0], amt: 0.075,
    });
    addGeo(new THREE.IcosahedronGeometry(0.013 * sc, 0), 0x456f38, {
      p: [x + (rng() - 0.5) * 0.004, y + 0.041 * sc, z + (rng() - 0.5) * 0.004], s: [1.25, 0.34, 1.25], r: [0, rng() * 3, 0], amt: 0.075,
    });
  };
  const addCypress = (x, y, z, sc) => {
    addGeo(new THREE.CylinderGeometry(0.0017 * sc, 0.0025 * sc, 0.012 * sc, 6), 0x4c3623, { p: [x, y + 0.004 * sc, z] });
    for (let k = 0; k < 4; k++) {
      addGeo(new THREE.ConeGeometry((0.0068 - k * 0.0011) * sc, 0.024 * sc, 8, 2), k % 2 ? 0x2f542d : 0x264726, {
        p: [x, y + (0.018 + k * 0.0085) * sc, z], amt: 0.065,
      });
    }
  };
  const addGardenBed = (cx, cz, rx, rz, rot = 0, treeCount = 6) => {
    const yBed = Y_PLAZA + 0.004;
    addGeo(new THREE.CylinderGeometry(1.01, 1.04, 0.006, 24), 0xd4c4a8, {
      p: [cx, Y_PLAZA + 0.0005, cz], r: [0, rot, 0], s: [rx, 1, rz], amt: 0.025,
    });
    addGeo(new THREE.CylinderGeometry(0.95, 0.98, 0.007, 24), 0xe6dac3, {
      p: [cx, Y_PLAZA + 0.002, cz], r: [0, rot, 0], s: [rx, 1, rz], amt: 0.025,
    });
    addGeo(new THREE.CylinderGeometry(0.89, 0.92, 0.005, 24), 0x4d7337, {
      p: [cx, Y_PLAZA + 0.0042, cz], r: [0, rot, 0], s: [rx, 1, rz], amt: 0.06,
    });
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const rad = 0.24 + rng() * 0.50;
      const lx = Math.cos(ang) * rx * rad, lz = Math.sin(ang) * rz * rad;
      const wx = cx + lx * c + lz * s, wz = cz - lx * s + lz * c;
      const sc = 0.72 + rng() * 0.36;
      if (i % 2 === 0) addPine(wx, yBed, wz, sc); else addCypress(wx, yBed, wz, sc);
      if (i % 3 === 0) features.push({ type: 'firefly', pos: [wx, yBed + 0.022, wz], size: 0.024 });
    }
    for (let j = 0; j < 5; j++) {
      const ang = rng() * Math.PI * 2, rad = 0.32 + rng() * 0.46;
      const lx = Math.cos(ang) * rx * rad, lz = Math.sin(ang) * rz * rad;
      const wx = cx + lx * c + lz * s, wz = cz - lx * s + lz * c;
      addGeo(new THREE.IcosahedronGeometry(0.0050 + rng() * 0.0022, 0), j % 2 ? 0x3b6332 : 0x4b773c, {
        p: [wx, yBed + 0.0028, wz], s: [1.1, 0.70, 1.1], r: [0, rng() * 3, 0], amt: 0.07,
      });
    }
  };

  // =====================================================================
  // 2. EL COLISEO: ESTILÓBATO DE 4 GRADAS, DOBLE GALERÍA ABIERTA Y 4 PISOS
  // =====================================================================
  const Y0 = 0.020; // estilóbato arranca en Y_PLAZA = 0.012
  addEllipticRing(0.094, 0.060, RX + 0.019, RZ + 0.019, 0.006, 0.014, 112, 0xd8cab0, travertineColor(0.006));
  addEllipticRing(0.168, 0.130, RX + 0.014, RZ + 0.014, 0.012, 0.016, 112, 0xdfd1b8, travertineColor(0.012));
  addEllipticRing(0.172, 0.134, RX + 0.009, RZ + 0.009, 0.015, 0.018, 112, 0xe6d9c0, travertineColor(0.015));
  addEllipticRing(0.176, 0.138, RX + 0.004, RZ + 0.004, 0.017, Y0,    112, 0xede1ca, travertineColor(0.017));

  // Alturas auténticas: ~0.125 totales sobre estilóbato (~0.295 de relación alto/largo)
  const TIER_H = [0.029, 0.027, 0.025, 0.027];
  const TIER_Y = [Y0, Y0 + 0.033, Y0 + 0.064, Y0 + 0.093]; // 0.020, 0.053, 0.084, 0.113 -> techo ático 0.140
  const Y_CROWN = TIER_Y[3] + TIER_H[3]; // 0.140

  // 4 Entablamentos / cornisas elípticas molduradas
  for (let i = 0; i < 4; i++) {
    const yc = TIER_Y[i] + TIER_H[i];
    const proj = i === 3 ? 0.0062 : 0.0038;
    const thick = i === 3 ? 0.0050 : 0.0038;
    addEllipticRing(RX - 0.015, RZ - 0.015, RX + proj, RZ + proj, yc - 0.0005, yc + thick, 112, 0xebe0ca, travertineColor(yc));
    if (i === 3) {
      addEllipticRing(RX - 0.014, RZ - 0.014, RX + 0.0080, RZ + 0.0080, yc + 0.0032, yc + 0.0068, 112, 0xf3e8d4, travertineColor(yc));
    }
  }

  // Muro de respaldo de la cavea (solo hasta y=0.088 para dejar las galerías superiores luminosas) y forjados de travertino
  const RX_INNER_WALL = RX - 0.030, RZ_INNER_WALL = RZ - 0.030; // 0.182, 0.144
  addEllipticRing(RX_INNER_WALL - 0.004, RZ_INNER_WALL - 0.004, RX_INNER_WALL, RZ_INNER_WALL, Y_PLAZA, 0.088, 112, 0xcab89b, travertineColor(Y_PLAZA));
  for (let i = 1; i <= 3; i++) {
    addEllipticRing(RX_INNER_WALL - 0.002, RZ_INNER_WALL - 0.002, RX - 0.003, RZ - 0.003, TIER_Y[i] - 0.0015, TIER_Y[i] + 0.0012, 96, 0xd8c8ac, travertineColor(TIER_Y[i]));
  }

  for (let b = 0; b < N_BAYS; b++) {
    const thPrev = baySeamTheta[(b - 1 + N_BAYS) % N_BAYS];
    const thNext = baySeamTheta[b];
    const fA = ellipseFrame(thPrev, RX, RZ);
    const fB = ellipseFrame(thNext, RX, RZ);
    const wBay = Math.hypot(fB.x - fA.x, fB.z - fA.z) + 0.0015;
    const fMid = ellipseFrame(bayTheta[b], RX - 0.0045, RZ - 0.0045);
    const fCol = ellipseFrame(thNext, RX + 0.0010, RZ + 0.0010);

    // Segunda arquería anular concéntrica en travertino claro (da profundidad real a través de los arcos)
    const fInA = ellipseFrame(thPrev, RX - 0.017, RZ - 0.017);
    const fInB = ellipseFrame(thNext, RX - 0.017, RZ - 0.017);
    const wInBay = Math.hypot(fInB.x - fInA.x, fInB.z - fInA.z) + 0.0015;
    const fInMid = ellipseFrame(bayTheta[b], RX - 0.019, RZ - 0.019);

    for (let tier = 0; tier < 3; tier++) {
      const yBase = TIER_Y[tier];
      const hT = TIER_H[tier];
      const wOpen = wBay * 0.64; // vanos amplios y aireados
      const hSpring = hT * 0.54;

      // Arco exterior de travertino (10 segmentos curvos por arco)
      const gArch = makeArchBayGeo(wBay, hT, wOpen, hSpring, 0.009, 10);
      addGeo(gArch, 0xe8dbc3, { p: [fMid.x, yBase, fMid.z], r: [0, fMid.yaw, 0], colorFn: travertineColor(yBase) });

      // Arquivolta en relieve rodeando el semicírculo + impostas + clave trapezoidal
      const rArch = wOpen * 0.5;
      addGeo(makeArchivoltGeo(rArch, rArch + 0.0015, 0.0020, 8), 0xf2e6d1, {
        p: [fMid.x + fMid.nx * 0.0042, yBase + hSpring, fMid.z + fMid.nz * 0.0042], r: [0, fMid.yaw, 0], amt: 0.02,
      });
      addGeo(new THREE.BoxGeometry(0.0024, 0.0030, 0.0110), 0xf4e9d6, {
        p: [fMid.x + fMid.nx * 0.0006, yBase + hSpring + rArch + 0.0012, fMid.z + fMid.nz * 0.0006], r: [0, fMid.yaw, 0],
      });
      for (const side of [-1, 1]) {
        addGeo(new THREE.BoxGeometry(0.0032, 0.0018, 0.0108), 0xefe3ce, {
          p: [fMid.x + fMid.tx * side * (rArch + 0.0012) + fMid.nx * 0.0004, yBase + hSpring, fMid.z + fMid.tz * side * (rArch + 0.0012) + fMid.nz * 0.0004],
          r: [0, fMid.yaw, 0],
        });
      }

      // Segunda arquería interior concéntrica (deja ver galerías abiertas en vez de negro sólido)
      const gInArch = makeArchBayGeo(wInBay, hT, wInBay * 0.62, hSpring, 0.0065, 6);
      addGeo(gInArch, 0xd8c8ac, { p: [fInMid.x, yBase, fInMid.z], r: [0, fInMid.yaw, 0], colorFn: travertineColor(yBase) });

      // Barandilla calada (transenna) y estatua clásica en los arcos de pisos 2 y 3
      if (tier >= 1) {
        const py = yBase;
        addGeo(new THREE.BoxGeometry(wOpen + 0.0010, 0.0014, 0.0024), 0xdfd1b8, {
          p: [fMid.x + fMid.nx * 0.0024, py + 0.0007, fMid.z + fMid.nz * 0.0024], r: [0, fMid.yaw, 0],
        });
        addGeo(new THREE.BoxGeometry(wOpen + 0.0010, 0.0011, 0.0026), 0xefe3ce, {
          p: [fMid.x + fMid.nx * 0.0024, py + 0.0036, fMid.z + fMid.nz * 0.0024], r: [0, fMid.yaw, 0],
        });
        for (const bx of [-0.0034, 0, 0.0034]) {
          addGeo(new THREE.BoxGeometry(0.0011, 0.0024, 0.0020), 0xd8c8ab, {
            p: [fMid.x + fMid.tx * bx + fMid.nx * 0.0024, py + 0.0022, fMid.z + fMid.tz * bx + fMid.nz * 0.0024], r: [0, fMid.yaw, 0],
          });
        }
        addStatue([fMid.x + fMid.nx * 0.0002, yBase + 0.0040, fMid.z + fMid.nz * 0.0002], fMid.yaw, tier === 1 ? 0.78 : 0.72, (b + tier) % 3 === 0);
      }

      // Semicolumna adosada con plinto, basa ática, fuste de 10 lados, collar y capitel diferenciado
      addGeo(new THREE.BoxGeometry(0.0038, 0.0020, 0.0038), 0xdac9ac, { p: [fCol.x, yBase + 0.0010, fCol.z], r: [0, fCol.yaw, 0] });
      addGeo(new THREE.CylinderGeometry(0.0016, 0.0019, 0.0014, 8), 0xede1ca, { p: [fCol.x, yBase + 0.0026, fCol.z] });
      addGeo(new THREE.CylinderGeometry(0.0013, 0.00155, hT - 0.0068, 10, 1, true), 0xeadec6, {
        p: [fCol.x, yBase + hT * 0.5, fCol.z], colorFn: travertineColor(yBase),
      });
      // Capitel diferenciado: Toscano (0), Jónico con volutas (1), Corintio acampanado (2)
      if (tier === 0) {
        addGeo(new THREE.CylinderGeometry(0.0019, 0.0014, 0.0016, 8), 0xefe3ce, { p: [fCol.x, yBase + hT - 0.0024, fCol.z] });
        addGeo(new THREE.BoxGeometry(0.0038, 0.0014, 0.0038), 0xf3e8d4, { p: [fCol.x, yBase + hT - 0.0008, fCol.z], r: [0, fCol.yaw, 0] });
      } else if (tier === 1) {
        addGeo(new THREE.BoxGeometry(0.0046, 0.0018, 0.0032), 0xf3e8d4, { p: [fCol.x, yBase + hT - 0.0018, fCol.z], r: [0, fCol.yaw, 0] });
        for (const vs of [-1, 1]) {
          addGeo(new THREE.CylinderGeometry(0.0008, 0.0008, 0.0028, 6).rotateX(Math.PI / 2), 0xe6d9c0, {
            p: [fCol.x + fCol.tx * vs * 0.0019, yBase + hT - 0.0019, fCol.z + fCol.tz * vs * 0.0019], r: [0, fCol.yaw, 0],
          });
        }
      } else {
        addGeo(new THREE.CylinderGeometry(0.0021, 0.0013, 0.0028, 8), 0xf0e4cf, { p: [fCol.x, yBase + hT - 0.0022, fCol.z] });
        addGeo(new THREE.BoxGeometry(0.0042, 0.0012, 0.0042), 0xf5ebd8, { p: [fCol.x, yBase + hT - 0.0006, fCol.z], r: [0, fCol.yaw, 0] });
      }

      if (b % 2 === tier % 2) {
        features.push({
          type: 'city',
          pos: [fMid.x - fMid.nx * 0.008, yBase + hT * 0.48, fMid.z - fMid.nz * 0.008],
          size: 0.015,
        });
      }
    }

    // Muros radiales travertinos conectando ambas arquerías con el soporte de la cavea
    const fRadPier = ellipseFrame(thNext, RX - 0.017, RZ - 0.017);
    addGeo(new THREE.BoxGeometry(0.0032, 0.092, 0.025, 1, 3, 1), 0xd4c3a6, {
      p: [fRadPier.x, Y0 + 0.044, fRadPier.z], r: [0, fRadPier.yaw, 0], colorFn: travertineColor(Y0),
    });

    // Piso 4 (Ático Corintio): muro travertino, pilastras, 2 ménsulas por vano, Clipeum / Ventana con celosía
    const y4 = TIER_Y[3], h4 = TIER_H[3];
    const fAtt = ellipseFrame(bayTheta[b], RX - 0.0045, RZ - 0.0045);
    addGeo(new THREE.BoxGeometry(wBay, h4, 0.009, 2, 2, 1), 0xe8dbc3, {
      p: [fAtt.x, y4 + h4 * 0.5, fAtt.z], r: [0, fAtt.yaw, 0], colorFn: travertineColor(y4),
    });
    // Pilastra corintia con basa y capitel
    addGeo(new THREE.BoxGeometry(0.0030, h4 - 0.003, 0.0026), 0xf0e4ce, {
      p: [fCol.x, y4 + h4 * 0.5, fCol.z], r: [0, fCol.yaw, 0], amt: 0.02,
    });
    addGeo(new THREE.BoxGeometry(0.0038, 0.0026, 0.0034), 0xf5ebd8, {
      p: [fCol.x, y4 + h4 - 0.0013, fCol.z], r: [0, fCol.yaw, 0],
    });

    if (b % 2 === 0) {
      // Escudo Clipeum de bronce dorado con aro exterior, cuerpo cóncavo y umbo central
      const sx = fAtt.x + fAtt.nx * 0.0050, sz = fAtt.z + fAtt.nz * 0.0050;
      addGeo(new THREE.CylinderGeometry(0.0048, 0.0048, 0.0012, 14).rotateX(Math.PI / 2), 0xb88622, {
        p: [sx, y4 + h4 * 0.52, sz], r: [0, fAtt.yaw, 0], colorFn: bronzeColor,
      });
      addGeo(new THREE.CylinderGeometry(0.0036, 0.0040, 0.0016, 12).rotateX(Math.PI / 2), 0xe5b84b, {
        p: [sx + fAtt.nx * 0.0004, y4 + h4 * 0.52, sz + fAtt.nz * 0.0004], r: [0, fAtt.yaw, 0], colorFn: bronzeColor,
      });
      addGeo(new THREE.SphereGeometry(0.0017, 7, 5), 0xf5cf62, {
        p: [sx + fAtt.nx * 0.0010, y4 + h4 * 0.52, sz + fAtt.nz * 0.0010],
      });
      if (b % 4 === 0) features.push({ type: 'sparkle', pos: [sx + fAtt.nx * 0.0026, y4 + h4 * 0.54, sz + fAtt.nz * 0.0026], size: 0.0075 });
    } else {
      // Ventana rectangular con marco moldurado, dintel saliente y celosía en cruz
      const wx = fAtt.x + fAtt.nx * 0.0049, wy = y4 + h4 * 0.48, wz = fAtt.z + fAtt.nz * 0.0049;
      addGeo(new THREE.BoxGeometry(0.0076, 0.0084, 0.0018), 0xd4c2a4, { p: [wx, wy, wz], r: [0, fAtt.yaw, 0] });
      addGeo(new THREE.BoxGeometry(0.0088, 0.0014, 0.0026), 0xf3e8d4, { p: [wx + fAtt.nx * 0.0003, wy + 0.0044, wz + fAtt.nz * 0.0003], r: [0, fAtt.yaw, 0] });
      addGeo(new THREE.BoxGeometry(0.0054, 0.0064, 0.0022), 0x1e242e, { p: [wx + fAtt.nx * 0.0003, wy, wz + fAtt.nz * 0.0003], r: [0, fAtt.yaw, 0] });
      addGeo(new THREE.BoxGeometry(0.0008, 0.0064, 0.0025), 0xe6d8c0, { p: [wx + fAtt.nx * 0.0005, wy, wz + fAtt.nz * 0.0005], r: [0, fAtt.yaw, 0] });
      addGeo(new THREE.BoxGeometry(0.0054, 0.0008, 0.0025), 0xe6d8c0, { p: [wx + fAtt.nx * 0.0005, wy, wz + fAtt.nz * 0.0005], r: [0, fAtt.yaw, 0] });
      features.push({ type: 'window', pos: [wx + fAtt.nx * 0.0020, wy, wz + fAtt.nz * 0.0020], yaw: fAtt.yaw, w: 0.0048, h: 0.0058 });
    }

    // Ménsulas talladas y mástil fino del Velarium (sobresale solo 1.6 cm sobre la cornisa)
    const fMast = ellipseFrame(bayTheta[b], RX + 0.0048, RZ + 0.0048);
    addGeo(new THREE.BoxGeometry(0.0028, 0.0044, 0.0048), 0xdac8aa, { p: [fMast.x, Y_CROWN - 0.004, fMast.z], r: [0, fMast.yaw, 0] });
    addGeo(new THREE.CylinderGeometry(0.0010, 0.0013, 0.025, 6), 0x734d2d, { p: [fMast.x, Y_CROWN + 0.0085, fMast.z] });
    addGeo(new THREE.SphereGeometry(0.0015, 6, 5), 0xdca83b, { p: [fMast.x, Y_CROWN + 0.0215, fMast.z] });
  }

  // =====================================================================
  // 3. 4 PÓRTICOS MONUMENTALES AXIALES + VELARIUM CORTO Y CALADO
  // =====================================================================
  const AXIAL_BAYS = [0, N_BAYS / 4, N_BAYS / 2, (3 * N_BAYS) / 4];
  for (const b of AXIAL_BAYS) {
    const f = ellipseFrame(bayTheta[b], RX + 0.008, RZ + 0.008);
    const px = f.x, pz = f.z, nx = f.nx, nz = f.nz, tx = f.tx, tz = f.tz, yaw = f.yaw;
    // Escalinata y podio adelantado del pórtico
    addGeo(new THREE.BoxGeometry(0.044, 0.012, 0.024), 0xdfd1b8, { p: [px, Y_PLAZA + 0.004, pz], r: [0, yaw, 0], colorFn: travertineColor(Y_PLAZA) });
    addGeo(new THREE.BoxGeometry(0.036, 0.005, 0.008), 0xe8dbc3, { p: [px + nx * 0.013, Y_PLAZA + 0.0015, pz + nz * 0.013], r: [0, yaw, 0] });
    // 4 columnas tetrástilas de pórfido rojo con basa ática y capitel corintio de mármol
    for (const off of [-0.0155, -0.0052, 0.0052, 0.0155]) {
      const cx = px + nx * 0.0065 + tx * off, cz = pz + nz * 0.0065 + tz * off;
      addGeo(new THREE.BoxGeometry(0.0044, 0.0022, 0.0044), 0xf0e8da, { p: [cx, Y0 + 0.0011, cz], r: [0, yaw, 0] });
      addGeo(new THREE.CylinderGeometry(0.0017, 0.0020, 0.026, 9), 0x76242b, { p: [cx, Y0 + 0.015, cz], colorFn: porphyryColor });
      addGeo(new THREE.CylinderGeometry(0.0024, 0.0016, 0.0030, 8), 0xf6f1e8, { p: [cx, Y0 + 0.029, cz] });
      addGeo(new THREE.BoxGeometry(0.0044, 0.0012, 0.0044), 0xfaf7f2, { p: [cx, Y0 + 0.031, cz], r: [0, yaw, 0] });
    }
    // Arquitrabe, cornisa y frontón triangular con relieve dorado
    addGeo(new THREE.BoxGeometry(0.042, 0.0045, 0.022), 0xede2cd, { p: [px, Y0 + 0.034, pz], r: [0, yaw, 0], colorFn: marbleColor });
    {
      const pedShape = new THREE.Shape();
      pedShape.moveTo(-0.021, 0); pedShape.lineTo(0.021, 0); pedShape.lineTo(0, 0.0085); pedShape.closePath();
      const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: 0.020, bevelEnabled: false });
      pedGeo.translate(0, 0, -0.010);
      addGeo(pedGeo, 0x8f1d22, { p: [px, Y0 + 0.0362, pz], r: [0, yaw, 0], amt: 0.025 });
      addGeo(new THREE.SphereGeometry(0.0024, 6, 5), 0xe5b84b, { p: [px + nx * 0.010, Y0 + 0.0398, pz + nz * 0.010] });
    }
    addQuadriga([px + nx * 0.0015, Y0 + 0.045, pz + nz * 0.0015], yaw, 0.92);
    // Cuadriga imperial en el pedestal de la corona del ático
    const fTop = ellipseFrame(bayTheta[b], RX - 0.003, RZ - 0.003);
    addGeo(new THREE.BoxGeometry(0.030, 0.006, 0.016), 0xede3d2, { p: [fTop.x, Y_CROWN + 0.009, fTop.z], r: [0, yaw, 0], colorFn: marbleColor });
    addQuadriga([fTop.x, Y_CROWN + 0.012, fTop.z], yaw, 0.88);
    for (const side of [-1, 1]) {
      addBrazier([px + nx * 0.012 + tx * side * 0.020, Y0, pz + nz * 0.012 + tz * side * 0.020], 0.95, true);
    }
  }

  // VELARIUM CORTO Y CALADO (cubre solo sobre la galería superior, dejando el interior bien abierto y visible)
  {
    const Y_OUT = Y_CROWN + 0.007, Y_IN = Y_CROWN - 0.001;
    const RX_OUT = RX - 0.005, RZ_OUT = RZ - 0.005;
    const RX_OCU = 0.168, RZ_OCU = 0.130; // óculo amplio de 0.336 × 0.260 para ver toda la cavea y arena
    const T_SAIL = 0.0022;

    for (let b = 0; b < N_BAYS; b++) {
      const thA = baySeamTheta[(b - 1 + N_BAYS) % N_BAYS];
      const thB = baySeamTheta[b];
      const tm = bayTheta[b];
      // Dejar una ranura de luz del 18% entre paños del velarium
      const dTh = ((thB - thA + Math.PI * 2) % (Math.PI * 2)) * 0.09;
      const t0 = thA + dTh, t1 = thB - dTh;
      const isCrimson = b % 4 === 0 || b % 4 === 2;
      const sailHex = b % 4 === 0 ? 0x8f1d22 : b % 4 === 2 ? 0xa33229 : 0xf2e8d4;

      const fracs = [0, 0.33, 0.67, 1];
      for (let f = 0; f < 3; f++) {
        const u0 = fracs[f], u1 = fracs[f + 1];
        const rx0 = RX_OUT + (RX_OCU - RX_OUT) * u0, rz0 = RZ_OUT + (RZ_OCU - RZ_OUT) * u0;
        const rx1 = RX_OUT + (RX_OCU - RX_OUT) * u1, rz1 = RZ_OUT + (RZ_OCU - RZ_OUT) * u1;
        const sag0 = -0.0028 * Math.sin(Math.PI * u0);
        const sag1 = -0.0028 * Math.sin(Math.PI * u1);
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

        addTri(aT, bT, cT, jitter(sailHex, 0.028), UP);
        addTri(aT, cT, dT, jitter(sailHex, 0.028), UP);
        addTri(aB, cB, bB, jitter(isCrimson ? 0x6f161a : 0xd9ceb9, 0.028), DOWN);
        addTri(aB, dB, cB, jitter(isCrimson ? 0x6f161a : 0xd9ceb9, 0.028), DOWN);
        if (f === 2) {
          const dirIn = new THREE.Vector3(COL_X - cT.x, 0, COL_Z - cT.z);
          addTri(dT, cT, cB, jitter(0xd8a63a, 0.03), dirIn);
          addTri(dT, cB, dB, jitter(0xd8a63a, 0.03), dirIn);
        }
      }

      // Antena / verga radial de madera y cabo tensor corto cada 2 mástiles
      if (b % 2 === 0) {
        const fMast = ellipseFrame(tm, RX + 0.0048, RZ + 0.0048);
        const ox = COL_X + RX_OCU * Math.cos(tm), oz = COL_Z + RZ_OCU * Math.sin(tm);
        addRod([fMast.x, Y_CROWN + 0.017, fMast.z], [ox, Y_IN, oz], 0.0017, 0x8f6b43, 5);
      }
    }
    addEllipticRing(RX_OCU - 0.0025, RZ_OCU - 0.0025, RX_OCU + 0.0025, RZ_OCU + 0.0025, Y_IN - 0.0025, Y_IN + 0.0015, 96, 0xc89a3c, bronzeColor);
  }

  // =====================================================================
  // 4. INTERIOR ABIERTO: PORTICUS, 22 GRADAS (~33°), SCALARIA, PULVINAR, ARENA E HYPOGEUM
  // =====================================================================
  {
    // Porticus in summa cavea (galería superior columnada de mármol)
    const RX_COL = 0.178, RZ_COL = 0.140;
    const Y_PORT = 0.090, H_PORT = 0.026;
    addEllipticRing(RX_COL - 0.004, RZ_COL - 0.004, RX - 0.006, RZ - 0.006, Y_PORT - 0.003, Y_PORT, 96, 0xebe3d5, marbleColor);
    addEllipticRing(RX_COL - 0.004, RZ_COL - 0.004, RX - 0.006, RZ - 0.006, Y_PORT + H_PORT, Y_PORT + H_PORT + 0.004, 96, 0xdfd4bf, travertineColor(Y_PORT + H_PORT));
    for (let b = 0; b < N_BAYS; b++) {
      const f = ellipseFrame(bayTheta[b], RX_COL, RZ_COL);
      addGeo(new THREE.BoxGeometry(0.0034, 0.0016, 0.0034), 0xede5d7, { p: [f.x, Y_PORT + 0.0008, f.z], r: [0, f.yaw, 0] });
      addGeo(new THREE.CylinderGeometry(0.0014, 0.0017, H_PORT - 0.0032, 8, 1, true), 0xf6f1e8, {
        p: [f.x, Y_PORT + H_PORT * 0.5, f.z], colorFn: marbleColor,
      });
      addGeo(new THREE.BoxGeometry(0.0036, 0.0018, 0.0036), 0xfaf7f2, { p: [f.x, Y_PORT + H_PORT - 0.0009, f.z], r: [0, f.yaw, 0] });
    }
  }

  // Cavea de 22 gradas con pendiente real (~34°) en Ima, Media y Summa Cavea
  {
    const steps = 22;
    const rxStart = 0.104, rzStart = 0.070, yStart = 0.036;
    const rxEnd = 0.178, rzEnd = 0.140, yEnd = 0.090;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1.15) / steps;
      const rx0 = rxStart + (rxEnd - rxStart) * t0;
      const rz0 = rzStart + (rzEnd - rzStart) * t0;
      const rx1 = Math.min(rxEnd + 0.004, rxStart + (rxEnd - rxStart) * t1);
      const rz1 = Math.min(rzEnd + 0.004, rzStart + (rzEnd - rzStart) * t1);
      const yStep = yStart + (yEnd - yStart) * ((i + 1) / steps);
      addEllipticRing(rx0, rz0, rx1, rz1, Y_PLAZA, yStep, 96, 0xf5f0e7, marbleColor);
      if (i === 6 || i === 13) {
        addEllipticRing(rx0 - 0.0015, rz0 - 0.0015, rx0 + 0.0015, rz0 + 0.0015, yStep - 0.002, yStep + 0.0035, 96, 0x76242b, porphyryColor);
      }
    }

    // 16 Escalinatas radiales (scalaria) y 16 Vomitoria abovedados sobre la cavea
    for (let v = 0; v < 16; v++) {
      const th = (v / 16) * Math.PI * 2 + 0.10;
      if (Math.min(Math.abs(Math.sin(th)), Math.abs(Math.cos(th))) < 0.08) continue;
      for (let i = 1; i < steps - 1; i++) {
        const t = (i + 0.35) / steps;
        const rx = rxStart + (rxEnd - rxStart) * t;
        const rz = rzStart + (rzEnd - rzStart) * t;
        const yS = yStart + (yEnd - yStart) * ((i + 0.8) / steps);
        const fs = ellipseFrame(th, rx, rz);
        addGeo(new THREE.BoxGeometry(0.0046, 0.0018, 0.0038), 0xdad0be, { p: [fs.x, yS + 0.0008, fs.z], r: [0, fs.yaw, 0] });
      }
      for (const frac of [0.32, 0.64]) {
        const rx = rxStart + (rxEnd - rxStart) * frac;
        const rz = rzStart + (rzEnd - rzStart) * frac;
        const yV = yStart + (yEnd - yStart) * frac;
        const fv = ellipseFrame(th, rx, rz);
        addGeo(new THREE.BoxGeometry(0.0074, 0.0052, 0.0044), 0x261d19, { p: [fv.x, yV + 0.0022, fv.z], r: [0, fv.yaw, 0] });
        addGeo(new THREE.BoxGeometry(0.0094, 0.0018, 0.0054), 0xf0e8da, { p: [fv.x, yV + 0.0052, fv.z], r: [0, fv.yaw, 0] });
      }
    }

    // Muro del Podium + baranda de bronce con protección de red/marfil
    addEllipticRing(0.098, 0.064, 0.105, 0.071, Y_PLAZA, 0.038, 96, 0xe8ded0, marbleColor);
    addEllipticRing(0.0985, 0.0645, 0.1035, 0.0695, 0.038, 0.0405, 96, 0xdfa93b, bronzeColor);
    for (let i = 0; i < 32; i++) {
      const th = (i / 32) * Math.PI * 2;
      const fp = ellipseFrame(th, 0.100, 0.066);
      addGeo(new THREE.CylinderGeometry(0.0009, 0.0009, 0.0034, 5), 0xd8a63a, { p: [fp.x, 0.0415, fp.z] });
    }
  }

  // Pulvinar Imperial (Norte y Sur) con 6 columnas de pórfido, trono, dosel y águilas
  for (const side of [-1, 1]) {
    const px = COL_X, pz = COL_Z + side * 0.076, py = 0.038;
    const yaw = side > 0 ? Math.PI : 0;
    addGeo(new THREE.BoxGeometry(0.036, 0.016, 0.022), 0xf2eadd, { p: [px, py - 0.002, pz], colorFn: marbleColor });
    for (const cx of [-0.014, -0.007, 0.007, 0.014]) {
      addGeo(new THREE.CylinderGeometry(0.0012, 0.0015, 0.016, 7), 0x76242b, { p: [px + cx, py + 0.014, pz], colorFn: porphyryColor });
    }
    addGeo(new THREE.BoxGeometry(0.008, 0.006, 0.007), 0x8f1d22, { p: [px, py + 0.009, pz] });
    addGeo(new THREE.BoxGeometry(0.036, 0.0032, 0.021), 0x8f1d22, { p: [px, py + 0.023, pz], r: [0, yaw, 0] });
    addGeo(new THREE.BoxGeometry(0.038, 0.0016, 0.023), 0xdfa93b, { p: [px, py + 0.0252, pz], r: [0, yaw, 0], colorFn: bronzeColor });
    addGeo(new THREE.SphereGeometry(0.0022, 6, 5), 0xf5cb5c, { p: [px, py + 0.0274, pz] });
    addBrazier([px - 0.020, py + 0.005, pz], 0.78, true);
    addBrazier([px + 0.020, py + 0.005, pz], 0.78, true);
  }

  // ARENA AMPLIA E HYPOGEUM ABIERTO (7 muros subterráneos con arcos, cabrestantes, pasarelas, 2 cuadrigas, 8 gladiadores)
  {
    const Y_ARENA = 0.026, Y_HYPO = 0.014;
    addEllipticRing(0.056, 0.030, 0.098, 0.064, Y_PLAZA - 0.001, Y_ARENA, 96, 0xdfc184, sandColor);
    addEllipticRing(0.001, 0.001, 0.059, 0.033, Y_PLAZA - 0.002, Y_HYPO, 64, 0x803923, brickColor);
    for (const wz of [-0.021, -0.014, -0.007, 0.000, 0.007, 0.014, 0.021]) {
      const len = 0.088 * Math.sqrt(Math.max(0.18, 1 - (wz / 0.030) * (wz / 0.030)));
      addGeo(new THREE.BoxGeometry(len, Y_ARENA - Y_HYPO - 0.0015, 0.0022, 8, 2, 1), 0xa15137, {
        p: [COL_X, (Y_ARENA + Y_HYPO) * 0.5 - 0.0008, COL_Z + wz], colorFn: brickColor,
      });
    }
    // Pasarelas de madera entablada y jaulas/cabrestantes en el hypogeum
    for (const tx of [-0.028, -0.018, 0.020, 0.030]) {
      addGeo(new THREE.BoxGeometry(0.0085, 0.0024, 0.062), 0x8c5e35, { p: [COL_X + tx, Y_ARENA - 0.001, COL_Z], amt: 0.05 });
    }
    for (const [cx, cz] of [[-0.008, -0.010], [0.008, -0.010], [-0.008, 0.010], [0.008, 0.010]]) {
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0026, 0.0075, 6), 0x6b4728, { p: [COL_X + cx, Y_HYPO + 0.004, COL_Z + cz] });
      addGeo(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0015, 6), 0xc89428, { p: [COL_X + cx, Y_HYPO + 0.008, COL_Z + cz] });
    }
    // Puertas Triunfales Este y Oeste hacia la arena
    for (const side of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.008, 0.016, 0.020), 0xede5d7, { p: [COL_X + side * 0.097, Y_ARENA + 0.005, COL_Z], colorFn: marbleColor });
      addGeo(new THREE.BoxGeometry(0.009, 0.011, 0.012), 0x261d19, { p: [COL_X + side * 0.096, Y_ARENA + 0.004, COL_Z] });
      addBrazier([COL_X + side * 0.090, Y_ARENA, COL_Z - 0.012], 0.70, true);
      addBrazier([COL_X + side * 0.090, Y_ARENA, COL_Z + 0.012], 0.70, true);
    }
    // 4 parejas de gladiadores detallados y 2 cuadrigas en la arena
    const fighters = [
      [-0.068, 0.019, 0x8f1d22], [-0.061, 0.016, 0x2a4f7a],
      [0.068, -0.018, 0xd4a438], [0.061, -0.015, 0x8f1d22],
      [-0.024, -0.044, 0x385e3c], [-0.017, -0.042, 0x8f1d22],
      [0.022, 0.044, 0xb84a18], [0.029, 0.042, 0x2a4f7a],
    ];
    for (const [fx, fz, shieldHex] of fighters) {
      const px = COL_X + fx, pz = COL_Z + fz;
      addGeo(new THREE.CylinderGeometry(0.0014, 0.0017, 0.0072, 6), 0xd8a87e, { p: [px, Y_ARENA + 0.0036, pz] });
      addGeo(new THREE.SphereGeometry(0.0013, 6, 5), 0xdfa93b, { p: [px, Y_ARENA + 0.0082, pz] });
      addGeo(new THREE.BoxGeometry(0.0010, 0.0042, 0.0032), shieldHex, { p: [px + 0.0016, Y_ARENA + 0.0042, pz], r: [0, rng() * 3, 0] });
    }
    addQuadriga([COL_X - 0.022, Y_ARENA, COL_Z + 0.042], Math.PI * 0.48, 0.68);
    addQuadriga([COL_X + 0.022, Y_ARENA, COL_Z - 0.042], -Math.PI * 0.52, 0.68);
  }

  // =====================================================================
  // 5. MONUMENTOS DEL VALLE DEL COLISEO: COLOSO, META SUDANS Y ARCO DE TITO
  // =====================================================================
  // A. EL COLOSO DE SOL (Colossus Neronis / Solis) en (-0.238, -0.102)
  {
    const sx = -0.238, sz = -0.102, y0 = Y_PLAZA;
    addGeo(new THREE.BoxGeometry(0.046, 0.008, 0.046), 0xdcccb0, { p: [sx, y0 + 0.001, sz], colorFn: travertineColor(y0) });
    addGeo(new THREE.BoxGeometry(0.040, 0.006, 0.040), 0xe8dec9, { p: [sx, y0 + 0.007, sz], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.032, 0.030, 0.032), 0xf6f1e8, { p: [sx, y0 + 0.023, sz], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.034, 0.017, 0.026), 0x76242b, { p: [sx, y0 + 0.023, sz], colorFn: porphyryColor });
    addGeo(new THREE.BoxGeometry(0.026, 0.017, 0.034), 0x76242b, { p: [sx, y0 + 0.023, sz], colorFn: porphyryColor });
    addGeo(new THREE.BoxGeometry(0.038, 0.005, 0.038), 0xefe7d9, { p: [sx, y0 + 0.040, sz], colorFn: marbleColor });
    // 4 águilas doradas en las esquinas del pedestal
    for (const ex of [-0.015, 0.015]) for (const ez of [-0.015, 0.015]) {
      addGeo(new THREE.ConeGeometry(0.0022, 0.005, 5), 0xdfa93b, { p: [sx + ex, y0 + 0.045, sz + ez] });
    }
    // Estatua colosal en contrapposto con clámide drapeada, timón/orbe y 7 rayos solares
    const yb = y0 + 0.042;
    addGeo(new THREE.CylinderGeometry(0.0038, 0.0044, 0.026, 8), 0xca9428, { p: [sx - 0.004, yb + 0.013, sz], colorFn: bronzeColor });
    addGeo(new THREE.CylinderGeometry(0.0038, 0.0044, 0.026, 8), 0xdfa93b, { p: [sx + 0.004, yb + 0.013, sz + 0.002], colorFn: bronzeColor });
    addGeo(new THREE.CylinderGeometry(0.0085, 0.0072, 0.025, 10), 0xe5b84b, { p: [sx, yb + 0.034, sz], colorFn: bronzeColor });
    addGeo(new THREE.BoxGeometry(0.0050, 0.032, 0.009), 0xc89428, { p: [sx - 0.008, yb + 0.029, sz - 0.002], q: qYXZ(0.15, 0.2, 0.12), colorFn: bronzeColor });
    addGeo(new THREE.BoxGeometry(0.020, 0.0075, 0.010), 0xdfa93b, { p: [sx, yb + 0.046, sz], r: [0, 0.35, 0], colorFn: bronzeColor });
    addGeo(new THREE.SphereGeometry(0.0064, 10, 8), 0xebb944, { p: [sx, yb + 0.056, sz], colorFn: bronzeColor });
    for (let r = 0; r < 7; r++) {
      const ang = (r / 7) * Math.PI * 2;
      const dirRay = new THREE.Vector3(Math.cos(ang) * 0.65, 0.76, Math.sin(ang) * 0.65).normalize();
      addGeo(new THREE.ConeGeometry(0.0015, 0.012, 4), 0xf5cb5c, {
        p: [sx + dirRay.x * 0.0095, yb + 0.057 + dirRay.y * 0.0095, sz + dirRay.z * 0.0095],
        q: new THREE.Quaternion().setFromUnitVectors(UP, dirRay),
      });
    }
    addRod([sx + 0.009, yb + 0.045, sz + 0.002], [sx + 0.018, yb + 0.068, sz + 0.010], 0.0024, 0xd9a738, 6);
    addGeo(new THREE.SphereGeometry(0.0038, 8, 6), 0xf6cf60, { p: [sx + 0.019, yb + 0.071, sz + 0.011] });
    addRod([sx - 0.009, yb + 0.045, sz - 0.002], [sx - 0.015, yb + 0.028, sz + 0.005], 0.0023, 0xc49228, 6);
    addGeo(new THREE.SphereGeometry(0.0044, 8, 6), 0xd9a738, { p: [sx - 0.016, yb + 0.024, sz + 0.006] });
    features.push({ type: 'flame', pos: [sx + 0.019, yb + 0.075, sz + 0.011], size: 0.0032 });
    features.push({ type: 'sparkle', pos: [sx, yb + 0.068, sz], size: 0.010 });
    addBrazier([sx + 0.024, y0, sz + 0.022], 0.95, true);
    addBrazier([sx - 0.024, y0, sz + 0.022], 0.95, true);
    features.push({ type: 'smoke', pos: [sx + 0.024, y0 + 0.009, sz + 0.022], size: 0.0048 });
  }

  // B. LA META SUDANS (Estanque con pilastras, base con 8 nichos, cono de ladrillo y surtidor) en (-0.224, +0.022)
  {
    const mx = -0.224, mz = 0.022, y0 = Y_PLAZA;
    addGeo(new THREE.CylinderGeometry(0.028, 0.030, 0.006, 28), 0xdcccb0, { p: [mx, y0 + 0.001, mz], colorFn: marbleColor });
    addGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.009, 28), 0xe8ded0, { p: [mx, y0 + 0.006, mz], colorFn: marbleColor });
    addGeo(new THREE.CylinderGeometry(0.023, 0.023, 0.006, 28), 0x2c8396, { p: [mx, y0 + 0.0075, mz], amt: 0.05 });
    // 12 pilastras alrededor del parapeto del estanque
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0024, 0.0055, 0.0028), 0xf4efe6, { p: [mx + Math.cos(a) * 0.0248, y0 + 0.0095, mz + Math.sin(a) * 0.0248], r: [0, -a, 0] });
    }
    // Base cilíndrica con 8 hornacinas + cornisa + cono escalonado
    addGeo(new THREE.CylinderGeometry(0.0110, 0.0128, 0.016, 20), 0xebe2d2, { p: [mx, y0 + 0.014, mz], colorFn: marbleColor });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0036, 0.009, 0.0022), 0x3b312b, { p: [mx + Math.cos(a) * 0.0112, y0 + 0.014, mz + Math.sin(a) * 0.0112], r: [0, -a + Math.PI / 2, 0] });
    }
    addGeo(new THREE.CylinderGeometry(0.0124, 0.0124, 0.0026, 20), 0xf5f0e7, { p: [mx, y0 + 0.023, mz] });
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0095, 0.042, 20), 0xa15137, { p: [mx, y0 + 0.044, mz], colorFn: brickColor });
    for (const ry of [0.032, 0.045, 0.056]) {
      const rr = 0.0095 - (ry - 0.023) * 0.17;
      addGeo(new THREE.CylinderGeometry(rr + 0.0006, rr + 0.0006, 0.0018, 16), 0xede5d7, { p: [mx, y0 + ry, mz] });
    }
    addGeo(new THREE.SphereGeometry(0.0036, 8, 6), 0xdfa93b, { p: [mx, y0 + 0.067, mz], colorFn: bronzeColor });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      features.push({ type: 'sparkle', pos: [mx + Math.cos(a) * 0.016, y0 + 0.012, mz + Math.sin(a) * 0.016], size: 0.0085 });
    }
    features.push({ type: 'sparkle', pos: [mx, y0 + 0.071, mz], size: 0.009 });
  }

  // C. EL ARCO TRIUNFAL DE TITO (pilonos, 8 columnas, clave esculpida, ático inscrito, cuadriga) en (-0.232, +0.132)
  {
    const ax = -0.232, az = 0.132, y0 = Y_PLAZA;
    const yaw = Math.atan2(0.062, -0.022);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const archGeo = makeArchBayGeo(0.048, 0.048, 0.020, 0.022, 0.022, 10);
    addGeo(archGeo, 0xf5f0e7, { p: [ax, y0 - 0.002, az], r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(makeArchivoltGeo(0.010, 0.0122, 0.0235, 8), 0xebe3d5, { p: [ax, y0 + 0.020, az], r: [0, yaw, 0] });
    addGeo(new THREE.BoxGeometry(0.056, 0.0050, 0.027), 0xe6ddd0, { p: [ax, y0 + 0.048, az], r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.048, 0.014, 0.022), 0xf6f1e8, { p: [ax, y0 + 0.057, az], r: [0, yaw, 0], colorFn: marbleColor });
    addGeo(new THREE.BoxGeometry(0.052, 0.0042, 0.025), 0xe6ddd0, { p: [ax, y0 + 0.066, az], r: [0, yaw, 0], colorFn: marbleColor });
    for (const sideZ of [-1, 1]) {
      for (const colX of [-0.020, -0.013, 0.013, 0.020]) {
        const cx = ax + colX * c + sideZ * 0.0115 * s;
        const cz = az - colX * s + sideZ * 0.0115 * c;
        addGeo(new THREE.BoxGeometry(0.0040, 0.006, 0.0040), 0xebe3d5, { p: [cx, y0 + 0.002, cz], r: [0, yaw, 0] });
        addGeo(new THREE.CylinderGeometry(0.0015, 0.0018, 0.038, 8), 0xfaf7f2, { p: [cx, y0 + 0.024, cz], colorFn: marbleColor });
        addGeo(new THREE.BoxGeometry(0.0040, 0.0030, 0.0040), 0xf2eadd, { p: [cx, y0 + 0.044, cz], r: [0, yaw, 0] });
      }
      const tx = ax + sideZ * 0.0115 * s, tz = az + sideZ * 0.0115 * c;
      addGeo(new THREE.BoxGeometry(0.030, 0.0085, 0.002), 0xd8a63a, { p: [tx, y0 + 0.057, tz], r: [0, yaw, 0], colorFn: bronzeColor });
    }
    addQuadriga([ax, y0 + 0.068, az], yaw, 1.05);
    addBrazier([ax - 0.028 * c, y0, az + 0.028 * s], 0.90, true);
    addBrazier([ax + 0.028 * c, y0, az - 0.028 * s], 0.90, true);
    features.push({ type: 'smoke', pos: [ax - 0.028 * c, y0 + 0.009, az + 0.028 * s], size: 0.0045 });
  }

  // D. COLUMNAS HONORÍFICAS Y BOLARDOS (CIPPI)
  {
    for (const [cx, cz] of [[-0.162, -0.105], [-0.170, 0.068]]) {
      addGeo(new THREE.BoxGeometry(0.015, 0.012, 0.015), 0xe6ddd0, { p: [cx, Y_PLAZA + 0.002, cz], colorFn: marbleColor });
      addGeo(new THREE.CylinderGeometry(0.0034, 0.0042, 0.050, 12), 0xf5f0e7, { p: [cx, Y_PLAZA + 0.032, cz], colorFn: marbleColor });
      addGeo(new THREE.BoxGeometry(0.010, 0.0035, 0.010), 0xebe3d5, { p: [cx, Y_PLAZA + 0.058, cz] });
      addGeo(new THREE.CylinderGeometry(0.0020, 0.0026, 0.013, 8), 0xdfa93b, { p: [cx, Y_PLAZA + 0.066, cz], colorFn: bronzeColor });
      addGeo(new THREE.SphereGeometry(0.0020, 6, 5), 0xe5b84b, { p: [cx, Y_PLAZA + 0.074, cz] });
    }
    for (let i = 0; i < 32; i++) {
      const th = (i / 32) * Math.PI * 2 + 0.07;
      if (Math.min(Math.abs(Math.sin(th)), Math.abs(Math.cos(th))) < 0.13) continue;
      const fx = COL_X + 0.240 * Math.cos(th), fz = COL_Z + 0.200 * Math.sin(th);
      if (Math.hypot(fx / AX, fz / AZ) > 0.94) continue;
      addGeo(new THREE.CylinderGeometry(0.0020, 0.0024, 0.010, 6), 0xdfd2ba, { p: [fx, Y_PLAZA + 0.0025, fz], amt: 0.025 });
    }
  }

  // =====================================================================
  // 6. PARTERRES AJARDINADOS ROMANOS (PINOS PIÑONEROS Y CIPRESES)
  // =====================================================================
  addGardenBed(0.072, -0.218, 0.115, 0.026, 0.0, 8);    // Norte
  addGardenBed(0.284, -0.140, 0.034, 0.064, -0.25, 6);  // Noreste
  addGardenBed(0.282,  0.138, 0.034, 0.064,  0.25, 6);  // Sureste
  addGardenBed(-0.072, 0.220, 0.082, 0.025,  0.05, 6);  // Sur
  addGardenBed(0.160,  0.215, 0.072, 0.025, -0.08, 6);  // Sur-este
  addGardenBed(-0.232, -0.202, 0.050, 0.026, 0.15, 5);  // Noroeste detrás del Coloso
  addGardenBed(-0.224,  0.206, 0.054, 0.024, -0.12, 5); // Suroeste junto a Vía Sacra

  // =====================================================================
  // 7. EFECTOS VIVOS EN EL CIELO SOBRE EL COLISEO
  // =====================================================================
  const cloudRing = [
    [-0.22, 0.23, -0.13, 0.016],
    [0.24,  0.25, -0.09, 0.017],
    [0.06,  0.27, -0.18, 0.015],
    [0.25,  0.21,  0.13, 0.015],
    [-0.21, 0.20,  0.15, 0.014],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [COL_X, cy, COL_Z], size: cs });
  }
  features.push({ type: 'gulls', pos: [COL_X, 0.195, COL_Z], size: 0.12 });

  return finish('El Coliseo Romano');
}
