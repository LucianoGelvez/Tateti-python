// Diorama "Londres — Támesis" (~120k triángulos)
// La ciudad C partida por el Támesis, que cruza la maqueta de oeste a este con una curva suave
// y escolleras de piedra. En la orilla norte: el Parlamento con la Torre del Reloj (Big Ben),
// la Torre Victoria, la Abadía de Westminster, la plaza de Trafalgar con la columna de Nelson,
// St Paul's con su cúpula, la Torre de Londres y un grupo de torres de la City. En la orilla
// sur, de frente (+Z): el London Eye (rueda de verdad, gira como efecto), County Hall, la
// orilla con el mercado de libros, una central de ladrillo con humo, un teatro isabelino
// redondo y el mercado de fila con braseros. Buckingham con su memorial y St James's Park
// la cierran por el oeste. Buses rojos y taxi negro por los puentes y los muelles.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildLondres(seed = 77) {
  const { rng, fbm, features, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);

  // =====================================================================
  // 0. UTILIDADES
  // =====================================================================
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const range = (a, b) => a + (b - a) * rng();
  const pick = (arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  const qYXZ = (rx, ry, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  // local → mundo, girado `yaw` alrededor de Y (el +Z local mira hacia (sin yaw, cos yaw))
  const loc = (cx, cz, yaw) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return (lx, y, lz) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
  };
  const _e1 = V(), _e2 = V();
  function tri(a, b, c, rgb, want) {
    _e1.subVectors(b, a); _e2.subVectors(c, a);
    if (_e1.cross(_e2).lengthSq() < 1e-14) return;
    addTri(a, b, c, rgb, want);
  }
  const centroid = (a, b, c) => [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3];

  // Paletas
  const ASPH = [0x4a4c50, 0x44464a];
  const PAVE = [0x8f8b82, 0x87837a, 0x99958c];
  const QUAYC = [0xb0a99a, 0xa59e8f];
  const GRASS = [0x5d7c44, 0x567241];
  const MUD = [0x5c4f3d, 0x6e5f49, 0x4f4435];
  const BRICK = [0x8f5439, 0x9b5f42, 0x7d4b34, 0xd8d0c2, 0xcfbfa8];
  const SLATE = [0x4d525e, 0x555b66, 0x5d5340, 0x6b5a44, 0x7d4b34];
  const HONEY = [0xc2a374, 0xb99a6b, 0xcbb083];      // piedra de Westminster
  const PORTL = [0xcfc9ba, 0xc6c0b1];                // piedra Portland
  const TB = [0x2c5586, 0x27487a];                   // acero azul de Tower Bridge
  const GLASS = [0x6f93a8, 0x87a9ba, 0x5f7f93];
  const RED = 0xc22c22;                              // autobús y cabina
  const GOLD = 0xc9a24b;

  // =====================================================================
  // 1. TRAZADO: RÍO, ESCOLLERAS, CALLES, PARQUES
  // =====================================================================
  const X0 = -0.33, X1 = 0.33, Z0 = -0.21, Z1 = 0.21;
  const WATER = -0.006, BANK = 0.006, BED = -0.027, BASE = -0.038, PLINTH = -0.052;
  const zr = (x) => -0.010 + 0.020 * Math.sin((x + 0.05) * 3.6) + 0.004 * Math.sin(x * 10 + 1);
  const wr = (x) => 0.025 + 0.003 * Math.sin(x * 6.5 + 0.8);
  const embS = (x) => zr(x) + wr(x);                 // escollera sur (frente)
  const embN = (x) => zr(x) - wr(x);                 // escollera norte

  const BRIDGES = [
    { x: -0.020, w: 0.0095 },                        // Westminster
    { x: 0.215, w: 0.0105 },                         // Tower
  ];
  function onApproach(x, z) {
    for (const b of BRIDGES) {
      if (Math.abs(x - b.x) < b.w + 0.001 && Math.abs(z - zr(b.x)) < wr(x) + 0.022) return true;
    }
    return false;
  }
  function onRoad(x, z) {
    const a = Math.abs(z - zr(x));
    if (a < wr(x) + 0.016 && a > wr(x) + 0.006) return true;                  // terraplenes
    if (z > -0.162 && z < -0.150 && x > -0.318 && x < 0.02) return true;      // The Mall
    if (z > 0.098 && z < 0.108 && x > -0.31 && x < 0.30) return true;         // calle sur
    if (z > -0.148 && z < -0.138 && x > 0.02 && x < 0.30) return true;        // calle norte alta
    return onApproach(x, z);
  }
  function park(x, z) {                                             // St James's Park
    return x > -0.245 && x < -0.118 && z > -0.126 && z < -0.072;
  }
  // Recintos de hitos: nada disperso dentro
  const RECTS = [
    [-0.148, -0.038, -0.070, -0.038],   // Parlamento
    [-0.210, -0.158, -0.108, -0.080],   // Abadía
    [-0.034, 0.020, -0.116, -0.058],    // Trafalgar
    [0.054, 0.128, -0.114, -0.084],     // St Paul's
    [0.220, 0.270, -0.080, -0.026],     // Torre de Londres
    [0.242, 0.322, -0.164, -0.084],     // City
    [-0.306, -0.236, -0.160, -0.082],   // Buckingham
    [-0.132, -0.038, 0.034, 0.098],     // London Eye
    [-0.180, -0.114, 0.052, 0.096],     // County Hall
    [0.082, 0.130, 0.040, 0.088],       // central de ladrillo
    [0.148, 0.186, 0.040, 0.080],       // teatro
    [0.192, 0.234, 0.048, 0.088],       // mercado
  ];
  const blocked = (x0, x1, z0, z1) => RECTS.some((r) => x1 > r[0] && x0 < r[1] && z1 > r[2] && z0 < r[3]);
  const inRect = (x, z, r) => x > r[0] && x < r[1] && z > r[2] && z < r[3];
  const TRAF = RECTS[2], BUCK = RECTS[6], PARKR = RECTS[7];

  // Plaza de Trafalgar: losa clara con dibujo simple
  const inTraf = (x, z) => inRect(x, z, TRAF);
  const inBuck = (x, z) => inRect(x, z, BUCK);

  function heightAt(x, z) {
    const dz = z - zr(x), a = Math.abs(dz), W = wr(x);
    let h;
    if (a >= W) {
      h = BANK;
      const u = smooth((a - W - 0.007) / 0.06);
      h += 0.0030 * u * (fbm(x * 16 + 3, z * 16 + 9) - 0.5);
      if (park(x, z)) h += 0.0012 * (fbm(x * 22 + 5, z * 22 + 2) - 0.5); // ondulación leve del parque
    } else {
      const t = a / W;
      h = BED + (BANK - BED) * smooth((t - 0.52) / 0.48);
      h -= 0.0014 * (1 - t) * (fbm(x * 40 + 20, z * 40 + 11));
    }
    return h;
  }

  function terrainColor(x, y, z, ny) {
    const a = Math.abs(z - zr(x)), W = wr(x);
    if (a < W) {
      // cauce: fango por profundidad
      if (y < BANK - 0.006) return jitter(MUD[Math.min(2, Math.floor((BANK - y) * 110))], 0.05);
      return jitter(MUD[0], 0.05);
    }
    if (park(x, z)) {
      if (fbm(x * 26 + 40, z * 26 + 9) > 0.62) return jitter(0x6b8a4c, 0.06);
      return jitter(pick(GRASS), 0.06);
    }
    if (inRect(x, z, TRAF)) {
      const k = (Math.floor(x * 300) + Math.floor(z * 300)) & 1;
      return jitter(k ? 0xb9b1a1 : 0xaca478, 0.03);
    }
    if (inRect(x, z, BUCK)) return jitter(0xb6ad9c, 0.03);   // patio de honor
    if (onRoad(x, z)) return jitter(pick(ASPH), 0.04);
    // franja de escollera: losa de Portland con juntas
    if (a < W + 0.006) {
      const seam = ((Math.floor(x * 260) + Math.floor(z * 260)) % 5) === 0;
      return jitter(seam ? 0x9d968a : pick(QUAYC), 0.03);
    }
    // acera urbana con parches de suciedad
    if (fbm(x * 9 + 17, z * 9 + 4) > 0.63) return jitter(0x7d7970, 0.05);
    return jitter(pick(PAVE), 0.04);
  }

  // Rejilla del terreno (se omiten las celdas hondas: las tapa el río)
  const NX = 260, NZ = 164;
  const dx = (X1 - X0) / NX, dz = (Z1 - Z0) / NZ;
  const gx = (i) => X0 + i * dx, gz = (j) => Z0 + j * dz;
  const H = new Float32Array((NX + 1) * (NZ + 1));
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) H[j * (NX + 1) + i] = heightAt(gx(i), gz(j));
  const hv = (i, j) => H[j * (NX + 1) + i];
  const pa = V(), pb = V(), pc = V(), nrm = V();
  function landTri(a, b, c) {
    pa.set(a[0], a[1], a[2]); pb.set(b[0], b[1], b[2]); pc.set(c[0], c[1], c[2]);
    _e1.subVectors(pb, pa); _e2.subVectors(pc, pa); nrm.crossVectors(_e1, _e2);
    const len = nrm.length(); if (len < 1e-14) return;
    const ny = Math.abs(nrm.y) / len;
    addTri(pa, pb, pc, terrainColor((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3, ny), UP);
  }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const h00 = hv(i, j), h10 = hv(i + 1, j), h11 = hv(i + 1, j + 1), h01 = hv(i, j + 1);
    if (Math.max(h00, h10, h11, h01) < WATER - 0.004) continue;
    const A = [gx(i), h00, gz(j)], B = [gx(i + 1), h10, gz(j)], C = [gx(i + 1), h11, gz(j + 1)], D = [gx(i), h01, gz(j + 1)];
    if ((i + j) & 1) { landTri(A, B, C); landTri(A, C, D); } else { landTri(A, B, D); landTri(B, C, D); }
  }

  // =====================================================================
  // 2. RÍO (superficie)
  // =====================================================================
  const SNX = 106, SNZ = 52, sdx = (X1 - X0) / SNX, sdz = (Z1 - Z0) / SNZ;
  const seaV = [], seaH = [];
  for (let j = 0; j <= SNZ; j++) for (let i = 0; i <= SNX; i++) {
    const x = X0 + i * sdx, z = Z0 + j * sdz;
    const edge = i === 0 || j === 0 || i === SNX || j === SNZ;
    seaV.push(V(x, edge ? WATER : WATER + 0.0006 * (fbm(i * 0.9 + 40, j * 0.9 + 7) - 0.5), z));
    seaH.push(heightAt(x, z));
  }
  function seaColor(x, z, depth) {
    if (depth < 0.0025) return jitter(0x8f9a86, 0.03);
    if (depth < 0.008) return jitter(pick([0x6d7c60, 0x77866a]), 0.03);
    return jitter(pick([0x54614a, 0x4c5844]), 0.03);
  }
  for (let j = 0; j < SNZ; j++) for (let i = 0; i < SNX; i++) {
    const k00 = j * (SNX + 1) + i, k10 = k00 + 1, k01 = k00 + SNX + 1, k11 = k01 + 1;
    if (Math.min(seaH[k00], seaH[k10], seaH[k01], seaH[k11]) > WATER + 0.001) continue;
    const a = seaV[k00], b = seaV[k10], c = seaV[k11], d = seaV[k01];
    for (const [p, q, r] of ((i + j) & 1) ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]) {
      const [cx, , cz] = centroid(p, q, r);
      tri(p, q, r, seaColor(cx, cz, WATER - heightAt(cx, cz)), UP);
    }
  }

  // =====================================================================
  // 3. COSTADOS Y ZÓCALO
  // =====================================================================
  const SIDE_LEVELS = [BASE, WATER + 0.004, BANK, 0.016, 0.4];
  function sideHex(y, x) {
    if (y < BANK - 0.004) return pick([0x5c5040, 0x665846]);
    if (y < 0.016) return pick(MUD);
    return pick([0x77726a, 0x6e6962]);
  }
  function side(pts, out) {
    for (let k = 0; k < pts.length - 1; k++) {
      const A = pts[k], B = pts[k + 1];
      for (let l = 0; l < SIDE_LEVELS.length - 1; l++) {
        const lo = SIDE_LEVELS[l], hi = SIDE_LEVELS[l + 1];
        let ta = Math.min(A[1], hi), tb = Math.min(B[1], hi);
        if (ta <= lo && tb <= lo) break;
        ta = Math.max(ta, lo); tb = Math.max(tb, lo);
        const col = jitter(sideHex((lo + Math.min(hi, Math.max(A[1], B[1]))) / 2, A[0]), 0.05);
        tri(V(A[0], lo, A[2]), V(B[0], lo, B[2]), V(B[0], tb, B[2]), col, out);
        tri(V(A[0], lo, A[2]), V(B[0], tb, B[2]), V(A[0], ta, A[2]), col, out);
      }
      // franja de agua bajo el nivel de la orilla
      if (A[1] < WATER + 0.004 || B[1] < WATER + 0.004) {
        const c = jitter(0x43503e, 0.03);
        tri(V(A[0], BASE + 0.001, A[2]), V(B[0], BASE + 0.001, B[2]), V(B[0], WATER - 0.001, B[2]), c, out);
        tri(V(A[0], BASE + 0.001, A[2]), V(B[0], WATER - 0.001, B[2]), V(A[0], WATER - 0.001, A[2]), c, out);
      }
    }
  }
  {
    const S = [], N = [], W = [], E = [];
    for (let i = 0; i <= NX; i++) { S.push([gx(i), hv(i, NZ), Z1]); N.push([gx(i), hv(i, 0), Z0]); }
    for (let j = 0; j <= NZ; j++) { W.push([X0, hv(0, j), gz(j)]); E.push([X1, hv(NX, j), gz(j)]); }
    side(S, V(0, 0, 1)); side(N, V(0, 0, -1)); side(W, V(-1, 0, 0)); side(E, V(1, 0, 0));
    addGeo(new THREE.BoxGeometry(X1 - X0 + 0.012, BASE - PLINTH, Z1 - Z0 + 0.012, 4, 1, 3), 0x3b2b20,
      { p: [0, (BASE + PLINTH) / 2, 0], amt: 0.03 });
    addGeo(new THREE.BoxGeometry(X1 - X0 + 0.0136, 0.0028, Z1 - Z0 + 0.0136), GOLD,
      { p: [0, BASE - 0.0048, 0], amt: 0.03 });
  }

  // =====================================================================
  // 4. OCUPACIÓN, LÍMITES DE EFECTOS Y UTILIDADES DE APOYO
  // =====================================================================
  const occ = [];
  const free = (x0, x1, z0, z1) => occ.every((r) => x1 <= r[0] || x0 >= r[1] || z1 <= r[2] || z0 >= r[3]);
  const reserve = (x, z, hw, hd) => occ.push([x - hw, x + hw, z - hd, z + hd]);
  const footprint = (L, w, dp) => {
    let hmin = Infinity, hmax = -Infinity;
    for (const [lx, lz] of [[-w / 2, -dp / 2], [w / 2, -dp / 2], [w / 2, dp / 2], [-w / 2, dp / 2], [0, 0]]) {
      const p = L(lx, 0, lz); const h = heightAt(p[0], p[2]);
      if (h < hmin) hmin = h; if (h > hmax) hmax = h;
    }
    return [hmin, hmax];
  };
  let nCity = 0, nWin = 0, nSpark = 0;
  const city = (p, size = 0.0075) => { if (nCity < 95) { features.push({ type: 'city', pos: p, size }); nCity++; } };
  const roadY = (x, z) => BANK + 0.0004 * (fbm(x * 60, z * 60) - 0.5);

  // farol victoriano: poste delgado + farol cuadrado cálido
  function lamppost(x, z, h = 0.011) {
    const y = roadY(x, z);
    addRod([x, y, z], [x, y + h, z], 0.0011, 0x2d3036, 4);
    addGeo(new THREE.BoxGeometry(0.0024, 0.0026, 0.0024), 0xf6e6b8, { p: [x, y + h + 0.0013, z], amt: 0.02 });
    city([x, y + h + 0.0028, z], 0.0078);
  }

  // =====================================================================
  // 5. ESCOLLERAS: MURALLA, PARAPETOS, ESCALERAS, BOLARDOS
  // =====================================================================
  function quay() {
    const SEG = 8;
    for (const s of [-1, 1]) {
      let px = X0 + 0.004, pz0 = zr(px) + s * wr(px);
      while (px < X1 - 0.004) {
        const x2 = Math.min(px + 0.042, X1 - 0.004);
        const pz1 = zr(x2) + s * wr(x2);
        if (onApproach(px + 0.02, pz0)) { px = x2; pz0 = pz1; continue; }  // corte en los puentes
        // muro de contención (caja fina siguiendo la escollera)
        addGeo(new THREE.BoxGeometry(Math.hypot(x2 - px, pz1 - pz0) * 0.92 + 0.004, 0.020, 0.0035),
          pick(QUAYC), {
          p: [(px + x2) / 2, BANK - 0.004, (pz0 + pz1) / 2],
          r: [0, Math.atan2(pz1 - pz0, x2 - px), 0], amt: 0.03,
        });
        px = x2; pz0 = pz1;
      }
      // parapeto y faroles cada tanto
      for (let x = X0 + 0.018; x < X1 - 0.01; x += 0.030) {
        if (onApproach(x, zr(x) + s * wr(x))) continue;
        const z = zr(x) + s * (wr(x) + 0.0035);
        addGeo(new THREE.BoxGeometry(0.014, 0.0022, 0.0020), pick(QUAYC), { p: [x, BANK + 0.0028, z], amt: 0.03 });
        if (((x / 0.030) | 0) % 2 === 0) lamppost(x, zr(x) + s * (wr(x) + 0.008), 0.012);
      }
      // bolardos
      for (let x = X0 + 0.012; x < X1 - 0.01; x += 0.016) {
        if (onApproach(x, zr(x) + s * wr(x))) continue;
        addGeo(new THREE.CylinderGeometry(0.0013, 0.0016, 0.0028, 6), 0x3a3a3a,
          { p: [x, BANK + 0.0014, zr(x) + s * (wr(x) - 0.0035)], amt: 0.03 });
      }
      // escaleras al agua cada tanto
      for (let x = X0 + 0.05; x < X1 - 0.03; x += 0.115) {
        if (onApproach(x, zr(x) + s * wr(x))) continue;
        for (let k = 0; k < 4; k++) {
          addGeo(new THREE.BoxGeometry(0.0055, 0.0045, 0.0032), pick(QUAYC),
            { p: [x + 0.012, BANK - 0.0035 * k, zr(x) + s * (wr(x) - 0.0035 - k * 0.0028)], amt: 0.03 });
        }
      }
    }
  }
  quay();

  // =====================================================================
  // 6. PUENTES
  // =====================================================================
  function deck(xb, w, z0, z1, y, colFn) {
    addGeo(new THREE.BoxGeometry(w * 2, 0.0035, z1 - z0, 1, 1, 10), 0xafaaa0, {
      p: [xb, y, (z0 + z1) / 2], colorFn: colFn, amt: 0.02,
    });
  }
  function lampsOnBridge(xb, y, count) {
    for (let k = 0; k < count; k++) {
      const z = zr(xb) - wr(xb) + 0.004 + (k / (count - 1)) * (wr(xb) * 2 - 0.008);
      for (const s of [-1, 1]) {
        addRod([xb + s * (0.0085), y, z], [xb + s * 0.0085, y + 0.0085, z], 0.0009, 0x2d3036, 4);
        addGeo(new THREE.BoxGeometry(0.002, 0.0022, 0.002), 0xf6e6b8, { p: [xb + s * 0.0085, y + 0.0098, z], amt: 0.02 });
        city([xb + s * 0.0085, y + 0.011, z], 0.007);
      }
    }
  }
  function westminsterBridge() {
    const xb = BRIDGES[0].x, w = 0.0095, y = 0.0195;
    const z0 = zr(xb) - wr(xb) - 0.016, z1 = zr(xb) + wr(xb) + 0.016;
    // arcos: medio cilindro con eje a lo largo de X (se ven curvados desde el río), con pilas
    const NA = 5, span = zr(xb) + wr(xb) - 0.006 - (zr(xb) - wr(xb) + 0.006), ar = (span / (NA * 2 - 1)) * 1.9;
    for (let k = 0; k < NA; k++) {
      const ac = zr(xb) - wr(xb) + 0.006 + (k + 0.5) * (span / NA);
      addGeo(new THREE.CylinderGeometry(ar, ar, w * 2 + 0.001, 9, 1, false, 0, Math.PI), 0xa39d90,
        { p: [xb, BED - 0.0035, ac], r: [0, 0, Math.PI / 2], amt: 0.03 });
      addGeo(new THREE.BoxGeometry(w * 2 + 0.001, 0.026, span / NA - ar * 2), 0x9e998d,
        { p: [xb, BED + 0.006, ac - span / (NA * 2) - ar * 0.001], amt: 0.03 });
    }
    deck(xb, w, z0, z1, y, (a, b, c) => jitter(((Math.floor(centroid(a, b, c)[2] * 200)) & 3) === 2 ? 0x8e8a80 : 0xb4afa4, 0.02));
    // parapetos verdes (losúrgicos Westminster)
    for (const s of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.0018, 0.0045, z1 - z0, 1, 1, 10), 0x3f6f52,
        { p: [xb + s * (w - 0.0009), y + 0.004, (z0 + z1) / 2], amt: 0.03 });
    }
    lampsOnBridge(xb, y, 8);
    // tráfico
    bus(xb + 0.0038, y, zr(xb) - 0.012, 0, 'bus');
    bus(xb - 0.0038, y, zr(xb) + 0.006, Math.PI, 'cab');
  }
  function towerBridge() {
    const xb = BRIDGES[1].x, w = 0.0105, y = 0.0185;
    const z0 = zr(xb) - wr(xb) - 0.018, z1 = zr(xb) + wr(xb) + 0.018;
    deck(xb, w, z0, z1, y, (a, b, c) => jitter(((Math.floor(centroid(a, b, c)[2] * 160)) & 3) === 2 ? 0x7f8daa : 0xb2ada2, 0.02));
    // pilas y estribos
    for (const s of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(w * 2 + 0.004, 0.012, 0.007), 0x9e998d, { p: [xb, y - 0.0055, zr(xb) + s * (wr(xb) + 0.0035)], amt: 0.03 });
    }
    // torres: piedra clara con estructura azul
    for (const s of [-1, 1]) {
      const tz = zr(xb) + s * 0.0245;
      for (const sx of [-1, 1]) {
        addGeo(new THREE.BoxGeometry(0.0072, 0.028, 0.0072, 2, 4, 2), 0xc6c0b1, {
          p: [xb + sx * 0.0128, y + 0.017, tz], colorFn: (a, b, c) => {
            const [cx, cy] = centroid(a, b, c);
            return (Math.abs(cx - (xb + sx * 0.0128)) > 0.0028 || Math.floor(cy * 340) % 5 === 4) ? jitter(TB[Math.floor(rng() * 2)], 0.03) : jitter(0xc6c0b1, 0.025);
          },
        });
        // chapitel azul con remate dorado
        addGeo(new THREE.ConeGeometry(0.0048, 0.011, 4), TB[0], { p: [xb + sx * 0.0128, y + 0.0365, tz], r: [0, Math.PI / 4, 0], amt: 0.03 });
        addGeo(new THREE.CylinderGeometry(0.0008, 0.0008, 0.0022, 5), GOLD, { p: [xb + sx * 0.0128, y + 0.0431, tz], amt: 0.04 });
      }
      // paso alto entre torres
      addGeo(new THREE.BoxGeometry(0.0262, 0.0035, 0.005), TB[0], { p: [xb, y + 0.030, tz], amt: 0.03 });
      // cadenas: barandillas colgantes hacia las orillas
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 5; k++) {
          const t0 = k / 5, t1 = (k + 1) / 5;
          const zz = (q) => tz - s * (wr(xb) + 0.014) * q;
          const yy = (q) => y + 0.010 - 0.008 * Math.sin(q * Math.PI / 2);
          addRod([xb + sx * (w + 0.0008), yy(t0), zz(t0)], [xb + sx * (w + 0.0008), yy(t1), zz(t1)], 0.0009, TB[0], 4);
        }
      }
    }
    // barandillas azules del tablero
    for (const s of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.0018, 0.0035, z1 - z0, 1, 1, 10), TB[0],
        { p: [xb + s * (w - 0.0009), y + 0.0035, (z0 + z1) / 2], amt: 0.03 });
    }
    lampsOnBridge(xb, y, 6);
    bus(xb + 0.004, y, zr(xb) + 0.014, 0, 'bus');
    bus(xb - 0.004, y, zr(xb) - 0.006, Math.PI, 'bus');
  }
  westminsterBridge();
  towerBridge();

  // =====================================================================
  // 7. EL PARLAMENTO Y BIG BEN
  // =====================================================================
  function parliament() {
    const x0 = -0.135, x1 = -0.048, zc = -0.052, dp = 0.016, wall = 0.034;
    // cuerpo largo con hileras de ventanas ojivales (franjas por colorFn)
    addGeo(new THREE.BoxGeometry(x1 - x0, wall, dp, 8, 2, 1), HONEY[0], {
      p: [(x0 + x1) / 2, BANK + wall / 2, zc],
      colorFn: (a, b, c) => {
        const [cx, cy, cz] = centroid(a, b, c);
        const row = cy - BANK;
        const col = Math.abs(cz - zc) > dp / 2 - 0.0006;
        if (col && row > 0.006 && row < 0.012 && (Math.floor(cx * 210) % 2 === 0)) return jitter(0x2b2f3a, 0.04);
        if (col && row > 0.018 && row < 0.023 && (Math.floor(cx * 210) % 2 === 1)) return jitter(0x2b2f3a, 0.04);
        return jitter(pick(HONEY), 0.03);
      },
    });
    // basamento
    addGeo(new THREE.BoxGeometry(x1 - x0 + 0.002, 0.005, dp + 0.002), HONEY[1],
      { p: [(x0 + x1) / 2, BANK + 0.0025, zc], amt: 0.02 });
    // cornisa + agujas pequeñas cada tanto
    addGeo(new THREE.BoxGeometry(x1 - x0 + 0.004, 0.0018, dp + 0.004), HONEY[2], { p: [(x0 + x1) / 2, BANK + wall + 0.0009, zc], amt: 0.02 });
    // techumbre oscura a dos aguas que rompe la silueta
    addGeo(new THREE.CylinderGeometry(dp * 0.70, dp * 0.70, x1 - x0 - 0.006, 3, 1), 0x5a5348,
      { p: [(x0 + x1) / 2, BANK + wall + (dp * 0.70 * 0.75) / 2, zc], r: [0, 0, Math.PI / 2], s: [1, 0.75, 1], amt: 0.04 });
    for (let x = x0 + 0.006; x < x1; x += 0.010) {
      addGeo(new THREE.ConeGeometry(0.0022, 0.006, 4), HONEY[1], { p: [x, BANK + wall + 0.0048, zc], r: [0, Math.PI / 4, 0], amt: 0.03 });
      // pináculos laterales en las fachadas
      for (const s of [-1, 1]) addGeo(new THREE.ConeGeometry(0.0014, 0.0042, 4), HONEY[1],
        { p: [x + 0.005, BANK + wall + 0.0039, zc + s * (dp / 2 - 0.0012)], r: [0, Math.PI / 4, 0], amt: 0.03 });
    }
    // relleno interior (nada flota): la cornisa se apoya en el cuerpo
    // Torre Victoria (extremo Oeste): la más corpulenta
    const vx = x0 + 0.008;
    addGeo(new THREE.BoxGeometry(0.018, 0.048, 0.018, 2, 4, 2), HONEY[1], { p: [vx, BANK + 0.020, zc], colorFn: (a, b, c) => jitter(0xb99a6b, 0.03) });
    addGeo(new THREE.BoxGeometry(0.019, 0.0012, 0.019), HONEY[2], { p: [vx, BANK + 0.0435, zc], amt: 0.02 });
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      addGeo(new THREE.CylinderGeometry(0.0026, 0.0026, 0.008, 6), HONEY[2],
        { p: [vx + ox * 0.0082, BANK + 0.0482, zc + oz * 0.0082], amt: 0.02 });
      addGeo(new THREE.ConeGeometry(0.0027, 0.0048, 6), 0x9a7c4e, { p: [vx + ox * 0.0082, BANK + 0.0546, zc + oz * 0.0082], amt: 0.03 });
    }
    addGeo(new THREE.BoxGeometry(0.006, 0.0035, 0.006), HONEY[2], { p: [vx, BANK + 0.046, zc], amt: 0.02 });
    // Torre Central (cruz del edificio)
    const mx = (x0 + x1) / 2 + 0.002;
    addGeo(new THREE.BoxGeometry(0.009, 0.008, 0.009), HONEY[1], { p: [mx, BANK + wall + 0.0035, zc], amt: 0.02 });
    addGeo(new THREE.ConeGeometry(0.0048, 0.0085, 6), HONEY[0], { p: [mx, BANK + wall + 0.0118, zc], amt: 0.03 });
    addGeo(new THREE.SphereGeometry(0.0017, 6, 5), GOLD, { p: [mx, BANK + wall + 0.0166, zc], amt: 0.03 });
    // Torre del Reloj (Big Ben), extremo Este junto al puente
    bigBen(x1 - 0.007, zc + 0.001);
    // luz del reloj visible de noche: se pone en bigBen
  }
  function bigBen(x, z) {
    const sB = 0.0135, st = 0.0155, yB = BANK, shaft = 0.056;
    // fuste
    addGeo(new THREE.BoxGeometry(sB, shaft, sB, 2, 4, 2), HONEY[0], {
      p: [x, yB + shaft / 2, z],
      colorFn: (a, b, c) => {
        const cy = centroid(a, b, c)[1] - yB;
        return jitter(HONEY[(Math.floor(cy * 55) + 1) % 3], 0.03);
      },
    });
    // franja baja decorativa
    addGeo(new THREE.BoxGeometry(sB + 0.0016, 0.0022, sB + 0.0016), HONEY[1], { p: [x, yB + 0.0105, z], amt: 0.02 });
    // cuerpo del reloj (algo más ancho)
    const cy0 = yB + shaft, ch = 0.011;
    addGeo(new THREE.BoxGeometry(st, ch, st), HONEY[1], { p: [x, cy0 + ch / 2, z], amt: 0.02 });
    // esferas: discos con marco oscuro, una por cara + manecillas + luz
    let nLead = 0;
    for (const yaw of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
      const dxo = Math.sin(yaw), dzo = Math.cos(yaw);
      const cx = x + dxo * (st / 2 + 0.0008), cz = z + dzo * (st / 2 + 0.0008), cyy = cy0 + ch * 0.55;
      addGeo(new THREE.CylinderGeometry(0.0048, 0.0048, 0.0016, 12), 0x3a3128,
        { p: [cx, cyy, cz], q: yawQ(yaw), amt: 0.02 });
      addGeo(new THREE.CylinderGeometry(0.0041, 0.0041, 0.0018, 12), 0xe8dcb8,
        { p: [cx + dxo * 0.0004, cyy, cz + dzo * 0.0004], q: yawQ(yaw), amt: 0.02 });
      // manecillas (frontal y sur nada más, las que más se ven)
      if (nLead < 2) {
        addGeo(new THREE.BoxGeometry(0.0005, 0.0030, 0.0006), 0x2b2620,
          { p: [cx + dxo * 0.0013, cyy + 0.0008, cz + dzo * 0.0013], r: [0, yaw, 0], amt: 0.05 });
        addGeo(new THREE.BoxGeometry(0.0022, 0.0005, 0.0006), 0x2b2620,
          { p: [cx + dxo * 0.0013 + dzo * 0.0007, cyy, cz + dzo * 0.0013 - dxo * 0.0007], amt: 0.05 });
      }
      city([cx + dxo * 0.0024, cyy, cz + dzo * 0.0024], 0.0055);
      nLead++;
    }
    // cubierta dorada del reloj
    addGeo(new THREE.BoxGeometry(st + 0.002, 0.0016, st + 0.002), GOLD, { p: [x, cy0 + ch + 0.0008, z], amt: 0.04 });
    // aguja: cuatro pináculos en esquina + pirámide central
    const sp0 = cy0 + ch + 0.0016;
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      addGeo(new THREE.CylinderGeometry(0.0016, 0.0022, 0.010, 5), HONEY[2],
        { p: [x + (st / 2 - 0.0012) * ox, sp0 + 0.0042, z + (st / 2 - 0.0012) * oz], amt: 0.03 });
      addGeo(new THREE.ConeGeometry(0.0017, 0.0046, 5), GOLD, { p: [x + (st / 2 - 0.0012) * ox, sp0 + 0.0116, z + (st / 2 - 0.0012) * oz], amt: 0.04 });
      addRod([x + (st / 2 - 0.0012) * ox, sp0 + 0.002, z + (st / 2 - 0.0012) * oz], [x, sp0 + 0.006, z], 0.0008, HONEY[1], 4);
    }
    addGeo(new THREE.ConeGeometry(0.0062, 0.018, 4), HONEY[1], {
      p: [x, sp0 + 0.0105, z], r: [0, Math.PI / 4, 0],
      colorFn: (a, b, c) => (Math.floor(centroid(a, b, c)[1] * 130) & 1) ? jitter(GOLD, 0.05) : jitter(0x9a7c4e, 0.04),
    });
    addGeo(new THREE.CylinderGeometry(0.0006, 0.0012, 0.0032, 5), GOLD, { p: [x, sp0 + 0.021, z], amt: 0.04 });
  }
  function yawQ(a) { return qYXZ(Math.PI / 2, a); }
  parliament();

  // =====================================================================
  // 8. ABADÍA DE WESTMINSTER
  // =====================================================================
  function abbey() {
    const xc = -0.184, zc = -0.094, xn = 0.020, dp = 0.014, hN = 0.022;
    const L = loc(xc, zc, 0);
    // nave + basamento
    addGeo(new THREE.BoxGeometry(xn, hN, dp, 3, 2, 1), PORTL[0], {
      p: [xc, BANK + hN / 2, zc],
      colorFn: (a, b, c) => {
        const [cx, cy, cz] = centroid(a, b, c);
        if (Math.abs(cz - zc) > dp / 2 - 0.0006 && cy - BANK > 0.007 && (Math.floor(cx * 240) % 2)) return jitter(0x2b2f3a, 0.04);
        return jitter(pick(PORTL), 0.03);
      },
    });
    // tejado a dos aguas
    addGeo(new THREE.CylinderGeometry(dp * 0.58, dp * 0.58, xn, 3, 1), 0x4a4f5c,
      { p: [xc, BANK + hN + 0.0033, zc], r: [0, 0, Math.PI / 2], s: [1, 0.75, 1], amt: 0.04 });
    // rosetón en la fachada sur (la que mira al río)
    addGeo(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0015, 10), 0x2a3140,
      { p: [xc, BANK + hN * 0.62, zc + dp / 2 + 0.0007], q: yawQ(0), amt: 0.03 });
    // torres occidentales (a la izquierda para el jugador)
    for (const ox of [-1, 1]) {
      const tx = xc - xn / 2 + 0.0015, tw = 0.0058;
      addGeo(new THREE.BoxGeometry(tw, 0.034, tw, 1, 4, 1), PORTL[0],
        { p: [tx, BANK + 0.015, zc + ox * (dp / 2 - tw / 2)], amt: 0.03 });
      addGeo(new THREE.CylinderGeometry(tw * 0.46, tw * 0.60, 0.0085, 8), PORTL[0],
        { p: [tx, BANK + 0.0362, zc + ox * (dp / 2 - tw / 2)], amt: 0.03 });
      addGeo(new THREE.ConeGeometry(tw * 0.40, 0.0072, 8), PORTL[1],
        { p: [tx, BANK + 0.0441, zc + ox * (dp / 2 - tw / 2)], amt: 0.03 });
    }
    // capilla de Enrique VII en la punta Este
    addGeo(new THREE.BoxGeometry(0.009, 0.012, dp + 0.004), 0xd9d3c4,
      { p: [xc + xn / 2 + 0.0035, BANK + 0.0050, zc], amt: 0.03 });
    for (let k = 0; k < 3; k++) {
      addGeo(new THREE.ConeGeometry(0.0018, 0.0042, 4), PORTL[1],
        { p: [xc + xn / 2 + 0.0035, BANK + 0.0131, zc - 0.0036 + k * 0.0036], r: [0, Math.PI / 4, 0], amt: 0.03 });
    }
  }
  abbey();

  // =====================================================================
  // 9. TRAFALGAR: COLUMNA DE NELSON, FUENTES, MUSEO
  // =====================================================================
  function trafalgar() {
    const cx = -0.007, cz = -0.086;
    // base escalonada + fuste + capital + estatua
    addGeo(new THREE.BoxGeometry(0.0095, 0.003, 0.0095), 0xc9c2b2, { p: [cx, BANK + 0.0015, cz], amt: 0.02 });
    addGeo(new THREE.BoxGeometry(0.0038, 0.021, 0.0038, 1, 3, 1), 0xbfb8a8,
      { p: [cx, BANK + 0.0135, cz], colorFn: (a, b, c) => jitter(((Math.floor(centroid(a, b, c)[1] * 220)) & 1) ? 0xbfb8a8 : 0xb2ab9b, 0.02) });
    addGeo(new THREE.BoxGeometry(0.0048, 0.0022, 0.0048), 0xc9c2b2, { p: [cx, BANK + 0.0249, cz], amt: 0.02 });
    addGeo(new THREE.CylinderGeometry(0.0011, 0.0015, 0.005, 6), 0x4a4e42, { p: [cx, BANK + 0.0284, cz], amt: 0.04 });
    // leones
    for (const [ox, oz] of [[-0.009, -0.009], [0.009, -0.009], [-0.009, 0.009], [0.009, 0.009]]) {
      addGeo(new THREE.IcosahedronGeometry(0.0026, 0), 0x4a4e42,
        { p: [cx + ox, BANK + 0.0026, cz + oz], s: [1.35, 0.7, 0.95], r: [0, rng() * 3, 0], amt: 0.05 });
    }
    // fuentes con destellos
    for (const oz of [-0.014, 0.014]) {
      addGeo(new THREE.CylinderGeometry(0.0034, 0.0038, 0.0022, 8), 0xcfc9ba, { p: [cx, BANK + 0.0011, cz + oz], amt: 0.02 });
      addGeo(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0010, 8), 0x3d7fa6, { p: [cx, BANK + 0.0024, cz + oz], amt: 0.02 });
      if (nSpark < 40) { features.push({ type: 'sparkle', pos: [cx, BANK + 0.004, cz + oz], size: 0.006 }); nSpark++; }
    }
    // estandartes/polos de los cuatro cornevos
    for (const [ox, oz] of [[-0.009, -0.019], [0.009, -0.019], [-0.009, 0.019], [0.009, 0.019]]) {
      lamppost(cx + ox, cz + oz, 0.0075);
    }
    // galería al fondo (norte): bloque con cúpula
    addGeo(new THREE.BoxGeometry(0.046, 0.020, 0.014, 4, 2, 1), PORTL[0], {
      p: [cx + 0.001, BANK + 0.010, -0.122],
      colorFn: (a, b, c) => {
        const [cx2, cy2, cz2] = centroid(a, b, c);
        if (Math.abs(cz2 + 0.122) > 0.007 && cy2 - BANK > 0.010 && (Math.floor(cx2 * 200) % 2)) return jitter(0x2b2f3a, 0.04);
        return jitter(pick(PORTL), 0.03);
      },
    });
    addGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.0045, 12), PORTL[0], { p: [cx + 0.001, BANK + 0.0223, -0.122], amt: 0.02 });
    addGeo(new THREE.SphereGeometry(0.0060, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x9db2b2, { p: [cx + 0.001, BANK + 0.0245, -0.122], amt: 0.03 });
    addGeo(new THREE.BoxGeometry(0.050, 0.0032, 0.016), PORTL[1], { p: [cx + 0.001, BANK + 0.0022, -0.1125], amt: 0.02 });
  }
  trafalgar();

  // =====================================================================
  // 10. ST PAUL'S
  // =====================================================================
  function stPauls() {
    const xc = 0.090, zc = -0.097, xn = 0.052, dp = 0.020, hN = 0.023;
    // cuerpo del templo
    addGeo(new THREE.BoxGeometry(xn, hN, dp, 5, 2, 1), PORTL[0], {
      p: [xc, BANK + hN / 2, zc],
      colorFn: (a, b, c) => {
        const [cx, cy, cz] = centroid(a, b, c);
        if (Math.abs(cz - zc) > dp / 2 - 0.0007 && cy - BANK > 0.0075 && (Math.floor(cx * 210) % 2)) return jitter(0x2b2f3a, 0.04);
        return jitter(pick(PORTL), 0.03);
      },
    });
    // balaustrada superior
    addGeo(new THREE.BoxGeometry(xn, 0.0022, dp + 0.002), PORTL[1], { p: [xc, BANK + hN + 0.0011, zc], amt: 0.02 });
    // fachada Occidental: dos torres gemelas
    for (const oz of [-1, 1]) {
      const tx = xc - xn / 2 + 0.002, tw = 0.0062;
      addGeo(new THREE.BoxGeometry(tw, 0.030, tw, 1, 3, 1), PORTL[0],
        { p: [tx, BANK + 0.0135, zc + oz * (dp / 2 - tw / 2)], amt: 0.03 });
      addGeo(new THREE.CylinderGeometry(tw * 0.48, tw * 0.62, 0.0055, 8), PORTL[1],
        { p: [tx, BANK + 0.0312, zc + oz * (dp / 2 - tw / 2)], amt: 0.03 });
      addGeo(new THREE.ConeGeometry(tw * 0.40, 0.0046, 8), PORTL[1],
        { p: [tx, BANK + 0.0362, zc + oz * (dp / 2 - tw / 2)], amt: 0.03 });
    }
    // tambor y cúpula con costillas
    const dx = xc + 0.006, R = 0.0155, drumH = 0.0105;
    addGeo(new THREE.CylinderGeometry(R, R, drumH, 14), PORTL[0], { p: [dx, BANK + hN + 0.0011 + drumH / 2, zc], amt: 0.02 });
    // banda de arcos del tambor
    addGeo(new THREE.CylinderGeometry(R + 0.0004, R + 0.0004, 0.0035, 14, 1, true), 0x2b3140, { p: [dx, BANK + hN + 0.0052, zc], amt: 0.02 });
    const domeY = BANK + hN + 0.0011 + drumH;
    addGeo(new THREE.SphereGeometry(R * 1.05, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), PORTL[0], {
      p: [dx, domeY, zc],
      colorFn: (a, b, c) => {
        const [cx2, , cz2] = centroid(a, b, c);
        const ang = Math.atan2(cz2 - zc, cx2 - dx);
        return jitter(PORTL[(Math.floor((ang + Math.PI) / (Math.PI)) & 1)], 0.03);
      },
    });
    // linterna dorada y cruz
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0028, 0.006, 8), GOLD, { p: [dx, domeY + R * 1.05 + 0.0022, zc], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(0.0022, 0.0034, 8), GOLD, { p: [dx, domeY + R * 1.05 + 0.0069, zc], amt: 0.04 });
    addGeo(new THREE.BoxGeometry(0.0008, 0.0032, 0.0008), GOLD, { p: [dx, domeY + R * 1.05 + 0.0098, zc], amt: 0.03 });
    addGeo(new THREE.BoxGeometry(0.0022, 0.0008, 0.0008), GOLD, { p: [dx, domeY + R * 1.05 + 0.0106, zc], amt: 0.03 });
    // pórtico occidental
    addGeo(new THREE.BoxGeometry(0.007, 0.009, 0.024), PORTL[1], { p: [xc - xn / 2 - 0.002, BANK + 0.0045, zc], amt: 0.02 });
  }
  stPauls();

  // =====================================================================
  // 11. BUCKINGHAM PALACE Y MEMORIAL
  // =====================================================================
  function buckingham() {
    const xc = -0.270, zc = -0.122, w = 0.056, dp = 0.018, h = 0.020;
    addGeo(new THREE.BoxGeometry(w, h, dp, 6, 1, 1), PORTL[0], {
      p: [xc, BANK + h / 2, zc],
      colorFn: (a, b, c) => {
        const [cx, cy] = centroid(a, b, c);
        if ((cy - BANK) > 0.009 && (cy - BANK) < 0.0145 && (Math.floor(cx * 170) % 2)) return jitter(0x2b2f3a, 0.04);
        return jitter(pick(PORTL), 0.03);
      },
    });
    // pabellón central más alto + coronamiento
    addGeo(new THREE.BoxGeometry(0.014, 0.005, dp + 0.002), PORTL[1], { p: [xc, BANK + h + 0.0025, zc], amt: 0.02 });
    addGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.003, 10), PORTL[0], { p: [xc, BANK + h + 0.0065, zc], amt: 0.02 });
    addGeo(new THREE.SphereGeometry(0.005, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0x9db2b2, { p: [xc, BANK + h + 0.008, zc], amt: 0.03 });
    // estandarte real en lo alto
    addRod([xc, BANK + h + 0.012, zc], [xc, BANK + h + 0.020, zc], 0.0008, 0x3a3a3a, 4);
    addGeo(new THREE.BoxGeometry(0.0004, 0.0035, 0.0045), 0xa42f38, { p: [xc + 0.0023, BANK + h + 0.0182, zc], amt: 0.04 });
    // alas bajas hacia el frente
    for (const ox of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.016, 0.014, 0.014), PORTL[0], { p: [xc + ox * (w / 2 - 0.006), BANK + 0.007, zc + dp / 2 + 0.006], amt: 0.03 });
    }
    // verja con postes dorados hacia el patio
    for (let ox = -0.030; ox <= 0.030; ox += 0.006) {
      addRod([xc + ox, BANK + 0.001, -0.092], [xc + ox, BANK + 0.0072, -0.092], 0.0006, 0x2d3036, 4);
    }
    addGeo(new THREE.BoxGeometry(w + 0.007, 0.0009, 0.0009), 0x2d3036, { p: [xc, BANK + 0.0062, -0.092], amt: 0.02 });
    // postes con farol
    for (const ox of [-0.033, 0.033]) {
      addGeo(new THREE.CylinderGeometry(0.0016, 0.0020, 0.010, 6), 0xb0a58e, { p: [xc + ox, BANK + 0.005, -0.092], amt: 0.03 });
      city([xc + ox, BANK + 0.0115, -0.092], 0.0068);
    }
    // memorial de Victoria: pedestal + ángel dorado
    const mmx = xc + 0.001, mmz = zc + dp / 2 + 0.024;
    addGeo(new THREE.BoxGeometry(0.010, 0.0028, 0.010), 0xbfb8a8, { p: [mmx, BANK + 0.0014, mmz], amt: 0.02 });
    addGeo(new THREE.BoxGeometry(0.0055, 0.010, 0.0055, 1, 3, 1), 0xcfc9ba, { p: [mmx, BANK + 0.0078, mmz], amt: 0.02 });
    addGeo(new THREE.SphereGeometry(0.0026, 8, 6), GOLD, { p: [mmx, BANK + 0.0152, mmz], s: [1, 1.5, 0.7], amt: 0.06 });
    addRod([mmx, BANK + 0.0175, mmz], [mmx, BANK + 0.0205, mmz], 0.0009, GOLD, 4);
    addGeo(new THREE.BoxGeometry(0.0048, 0.0006, 0.0048), GOLD, { p: [mmx, BANK + 0.0030, mmz], amt: 0.03 });
  }
  buckingham();

  // =====================================================================
  // 12. LA TORRE DE LONDRES
  // =====================================================================
  function whiteTower() {
    const cx = 0.245, cz = -0.052, hw = 0.021, wallH = 0.013;
    // muralla con almenas por colorFn (franja alterna arriba)
    const wallTop = BANK + wallH;
    for (const s of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(hw * 2 + 0.006, wallH, 0.0032, 8, 2, 1), 0xa89a80, {
        p: [cx, BANK + wallH / 2, cz + s * hw],
        colorFn: (a, b, c) => {
          const [cx2, cy2, cz2] = centroid(a, b, c);
          if (cy2 > wallTop - 0.0022 && (Math.floor(cx2 * 190) & 1) === 0) return jitter(0xb5a790, 0.03);
          return jitter(0xa89a80, 0.03);
        },
      });
      addGeo(new THREE.BoxGeometry(0.0032, wallH, hw * 2 + 0.006, 1, 2, 8), 0xa89a80, {
        p: [cx + s * hw, BANK + wallH / 2, cz],
        colorFn: (a, b, c) => {
          const [cx2, cy2, cz2] = centroid(a, b, c);
          if (cy2 > wallTop - 0.0022 && (Math.floor(cz2 * 190) & 1) === 0) return jitter(0xb5a790, 0.03);
          return jitter(0xa89a80, 0.03);
        },
      });
    }
    // cuatro torrecillas en los ángulos
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const tx = cx + ox * hw, tz = cz + oz * hw;
      addGeo(new THREE.CylinderGeometry(0.0031, 0.0034, 0.015, 8), 0xb3a58e, { p: [tx, BANK + 0.0075, tz], amt: 0.03 });
      addGeo(new THREE.ConeGeometry(0.0033, 0.0052, 8), 0x4a5f6e, { p: [tx, BANK + 0.0176, tz], amt: 0.03 });
      city([tx, BANK + 0.004, tz + 0.0034], 0.0055);
    }
    // White Tower: torre del Homenaje blanca
    addGeo(new THREE.BoxGeometry(0.017, 0.024, 0.013, 2, 4, 2), 0xdfd8ca, {
      p: [cx, BANK + 0.011, cz],
      colorFn: (a, b, c) => {
        const [cx2, cy2, cz2] = centroid(a, b, c);
        if ((cy2 - BANK) > 0.010 && (Math.floor(cx2 * 260) % 2)) return jitter(0x2b2f3a, 0.04);
        return jitter(0xdfd8ca, 0.025);
      },
    });
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      addGeo(new THREE.CylinderGeometry(0.0018, 0.0021, 0.007, 6), 0xdfd8ca,
        { p: [cx + ox * 0.0083, BANK + 0.0265, cz + oz * 0.0063], amt: 0.02 });
      addGeo(new THREE.ConeGeometry(0.0020, 0.0036, 6), 0x4a5f6e,
        { p: [cx + ox * 0.0083, BANK + 0.0318, cz + oz * 0.0063], amt: 0.03 });
    }
    // más verde del foso seco alrededor (van en el terreno)
  }
  whiteTower();

  // =====================================================================
  // 13. LA CITY: TORRES DE VIDRIO
  // =====================================================================
  function cityTower(x, z, w, h, r1) {
    const L = loc(x, z, rng() * 6), q = qYXZ(0, rng() * 2);
    const [hmin] = footprint(L, w + 0.004, w + 0.004);
    const ybot = hmin - 0.006;
    addGeo(new THREE.BoxGeometry(w, h, w, 2, Math.round(h * 120), 2), GLASS[0], {
      p: [x, ybot + h / 2, z],
      colorFn: (a, b, c) => {
        const [cx, cy] = centroid(a, b, c);
        const band = Math.floor((cy - ybot) * 170);
        return jitter(GLASS[band % 2 === 0 ? 1 : 2], 0.05);
      },
    });
    if (r1) {  // remate esférico (tipo universal, no copia)
      addGeo(new THREE.SphereGeometry(w * 0.52, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), GLASS[1],
        { p: [x, ybot + h, z], amt: 0.04 });
    } else {
      addGeo(new THREE.BoxGeometry(w * 0.8, 0.004, w * 0.8), 0x3a3f46, { p: [x, ybot + h + 0.002, z], amt: 0.03 });
    }
  }
  cityTower(0.262, -0.128, 0.014, 0.068, false);
  cityTower(0.292, -0.108, 0.011, 0.052, true);
  cityTower(0.306, -0.144, 0.013, 0.058, false);
  cityTower(0.274, -0.096, 0.009, 0.034, true);

  // =====================================================================
  // 14. ORILLA SUR: EYE, COUNTY HALL, MERCADO, FÁBRICA, TEATRO
  // =====================================================================
  function londresEye() {}                   // (la rueda va en 14; este nombre no se usa)
  const EX = -0.085, EZ = 0.062, ER = 0.040, HUB = 0.008 + ER;
  function eyeBase() {
    // plataforma de embarque y A de apoyo, la rueda entera es el efecto 'wheel'
    addGeo(new THREE.BoxGeometry(0.030, 0.003, 0.014), 0xc9c2b2, { p: [EX, BANK + 0.0015, EZ + 0.013], amt: 0.02 });
    addGeo(new THREE.BoxGeometry(0.034, 0.0016, 0.018), 0xb2ab9c, { p: [EX, BANK + 0.0038, EZ + 0.013], amt: 0.02 });
    // patas A (en el plano de la rueda, normal en Z)
    const leg = (oz) => [EX, HUB, EZ + oz];
    addRod([EX, BANK, EZ], leg(-0.011), 0.0022, 0xbdc2c8, 6);
    addRod([EX, BANK, EZ], leg(0.011), 0.0022, 0xbdc2c8, 6);
    addRod([EX, BANK, EZ - 0.008], [EX, BANK, EZ + 0.008], 0.0016, 0xb0b5bb, 5);   // base cruzada
    for (const oz of [-0.006, 0.006]) {
      addRod([EX, BANK + 0.001, EZ + oz], [EX, HUB * 0.52, EZ + oz * 1.6], 0.0012, 0xb0b5bb, 4);
    }
    // buje
    addGeo(new THREE.CylinderGeometry(0.0035, 0.0035, 0.010, 8), 0x9aa1a8,
      { p: [EX, HUB, EZ], r: [Math.PI / 2, 0, 0], amt: 0.04 });
    // boletos y una caseta
    addGeo(new THREE.BoxGeometry(0.006, 0.005, 0.005), 0x8d9298, { p: [EX + 0.017, BANK + 0.0055, EZ + 0.010], amt: 0.03 });
    addGeo(new THREE.BoxGeometry(0.0068, 0.0014, 0.0058), 0x5b7f9e, { p: [EX + 0.017, BANK + 0.0087, EZ + 0.010], amt: 0.03 });
    features.push({ type: 'wheel', pos: [EX, HUB, EZ], size: ER, speed: 0.16 });
  }
  eyeBase();
  function countyHall() {
    const xc = -0.150, zc = 0.072, w = 0.058, dp = 0.020, h = 0.016;
    addGeo(new THREE.BoxGeometry(w, h, dp, 5, 1, 1), PORTL[0], {
      p: [xc, BANK + h / 2, zc],
      colorFn: (a, b, c) => {
        const [cx, cy] = centroid(a, b, c);
        if ((cy - BANK) > 0.008 && (cy - BANK) < 0.0125 && (Math.floor(cx * 160) % 2)) return jitter(0x2b2f3a, 0.04);
        return jitter(pick(PORTL), 0.03);
      },
    });
    // torre central pequeña con corona
    addGeo(new THREE.BoxGeometry(0.008, 0.020, 0.008), PORTL[1], { p: [xc + 0.000, BANK + 0.010, zc + 0.002], amt: 0.03 });
    addGeo(new THREE.ConeGeometry(0.0048, 0.006, 4), PORTL[0], { p: [xc, BANK + 0.0232, zc + 0.002], r: [0, Math.PI / 4, 0], amt: 0.03 });
  }
  countyHall();
  function brickPower() {   // central de ladrillo (orilla sur este), con chimenea y humo
    const xc = 0.106, zc = 0.062;
    addGeo(new THREE.BoxGeometry(0.036, 0.014, 0.016, 3, 1, 1), 0xa75f40, {
      p: [xc, BANK + 0.007, zc],
      colorFn: (a, b, c) => {
        const [cx, cy] = centroid(a, b, c);
        if ((Math.floor(cx * 150) + Math.floor(cy * 200)) % 3 === 0) return jitter(0x964f36, 0.04);
        return jitter(0xa75f40, 0.04);
      },
    });
    addGeo(new THREE.BoxGeometry(0.038, 0.0016, 0.018), SLATE[1], { p: [xc, BANK + 0.0148, zc], amt: 0.03 });
    const chx = xc - 0.011;
    addGeo(new THREE.CylinderGeometry(0.0028, 0.0034, 0.030, 8), 0xb58a68, { p: [chx, BANK + 0.0295, zc - 0.004], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0033, 0.0033, 0.0016, 8), 0x8a6a4d, { p: [chx, BANK + 0.0458, zc - 0.004], amt: 0.03 });
    features.push({ type: 'smoke', pos: [chx, BANK + 0.048, zc - 0.004], size: 0.0085 });
    // ventanas al río
    for (const wx of [-0.011, 0, 0.011]) {
      addGeo(new THREE.BoxGeometry(0.0034, 0.0040, 0.0022), 0x26384a, { p: [xc + wx, BANK + 0.007, zc + 0.008], amt: 0.03 });
    }
  }
  brickPower();
  function globe() {        // teatro isabelino redondo: entramado de madera y techo de paja
    const xc = 0.167, zc = 0.058, r0 = 0.0095, h = 0.009;
    addGeo(new THREE.CylinderGeometry(r0, r0, h, 12), 0x6e4f33, {
      p: [xc, BANK + h / 2, zc],
      colorFn: (a, b, c) => {
        const [cx2, cy2, cz2] = centroid(a, b, c);
        const ang = Math.atan2(cz2 - zc, cx2 - xc);
        if (ang > -0.9 && ang < 0.9 && cy2 - BANK > h * 0.45) return jitter(0xcabf9e, 0.03);  // galería abierta clara
        return jitter(0x6e4f33, 0.05);
      },
    });
    addGeo(new THREE.ConeGeometry(r0 * 1.14, 0.0075, 12), 0x8a7146, {
      p: [xc, BANK + h + 0.0028, zc],
      colorFn: (a, b, c) => jitter((Math.floor(centroid(a, b, c)[1] * 260) & 1) ? 0x8a7146 : 0x7d6440, 0.04),
    });
    // bandera de teatro (de día ondea no, es decorado: solo mástil)
    addRod([xc, BANK + h + 0.0065, zc], [xc, BANK + h + 0.012, zc], 0.0007, 0x3a3a3a, 4);
    addGeo(new THREE.BoxGeometry(0.0004, 0.0022, 0.003), 0xbd2e24, { p: [xc + 0.0016, BANK + h + 0.0110, zc], amt: 0.05 });
  }
  globe();
  function bookMarket() {   // puestos del rastro de libros en la escollera
    for (let k = 0; k < 4; k++) {
      const x = 0.002 + k * 0.016, z = embS(x) + 0.0035;
      addGeo(new THREE.BoxGeometry(0.010, 0.0016, 0.0042), 0x5d4a34, { p: [x, BANK + 0.0034, z], amt: 0.04 });
      for (const ox of [-0.0046, 0.0046]) {
        addRod([x + ox, BANK + 0.0002, z - 0.0018], [x + ox, BANK + 0.0062, z - 0.0018], 0.0007, 0x3a2e22, 4);
        addRod([x + ox, BANK + 0.0002, z + 0.0018], [x + ox, BANK + 0.0062, z + 0.0018], 0.0007, 0x3a2e22, 4);
      }
      addGeo(new THREE.BoxGeometry(0.011, 0.0010, 0.0062), pick([0x3f7a5f, 0xb0503c, 0x3f6fa8, 0xc9a24b]),
        { p: [x, BANK + 0.0068, z], amt: 0.04 });
      for (let b = 0; b < 3; b++) {
        addGeo(new THREE.BoxGeometry(0.0028, 0.0012, 0.0022), pick([0xd8d2c4, 0xc23b2e, 0x2f6fb3]),
          { p: [x + (rng() - 0.5) * 0.006, BANK + 0.0048, z + (rng() - 0.5) * 0.001], r: [0, rng() * 3, 0], amt: 0.05 });
      }
    }
  }
  bookMarket();
  function boroughMarket() {  // puesto de comida con paraguas y braseros
    for (let k = 0; k < 3; k++) {
      const x = 0.200 + k * 0.011, z = 0.062 + (k % 2) * 0.006;
      addGeo(new THREE.BoxGeometry(0.008, 0.0018, 0.005), 0x5d4a34, { p: [x, BANK + 0.0034, z], amt: 0.04 });
      addRod([x, BANK + 0.0002, z], [x, BANK + 0.0078, z], 0.0008, 0x3a3a3a, 4);
      addGeo(new THREE.ConeGeometry(0.0052, 0.0026, 8), pick([0xb0503c, 0x3f7a5f, 0x3f6fa8]),
        { p: [x, BANK + 0.0088, z], amt: 0.05 });
      city([x, BANK + 0.0075, z], 0.006);
    }
    // braseros con llama (vivos de día y de noche)
    for (const [ox, oz] of [[-0.006, -0.005], [0.018, 0.004]]) {
      const x = 0.204 + ox, z = 0.062 + oz;
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0028, 0.0025, 7), 0x3a3a3a, { p: [x, BANK + 0.0012, z], amt: 0.04 });
      features.push({ type: 'flame', pos: [x, BANK + 0.004, z], size: 0.0016 });
    }
  }
  boroughMarket();

  // =====================================================================
  // 15. VEHÍCULOS (buses, taxi) Y CABINAS DE TELÉFONO
  // =====================================================================
  function bus(x, y, z, yaw, kind) {
    const L = loc(x, z, yaw), q = qYXZ(0, yaw);
    if (kind === 'bus') {
      const w = 0.0062, h = 0.0105, l = 0.014;
      addGeo(new THREE.BoxGeometry(w, h, l, 1, 3, 2), RED, {
        p: [x, y + 0.0045, z], q,
        colorFn: (a, b, c) => {
          const [cx, cy, cz] = centroid(a, b, c);
          const lw = (localW(cx, cz, x, z, yaw, l, w));
          if (cy - y > 0.0082) return jitter(0xe6e2d8, 0.03);           // techo claro
          if (cy - y > 0.0042 && (lw.z > l * 0.12)) return jitter(0x263844, 0.04);  // bandas de ventanas
          return jitter(RED, 0.03);
        },
      });
      // parabrisas delantero
      addGeo(new THREE.BoxGeometry(w * 0.84, 0.0026, 0.0012), 0x263844, { p: L(0, y + 0.0062, l / 2 + 0.0006), q, amt: 0.03 });
    } else {  // taxi negro
      const w = 0.0046, h = 0.0038, l = 0.0085;
      addGeo(new THREE.BoxGeometry(w, h, l, 1, 2, 2), 0x23262b, {
        p: [x, y + 0.0021, z], q,
        colorFn: (a, b, c) => {
          const [cx, cy, cz] = centroid(a, b, c);
          return (cy - y) > 0.0034 ? jitter(0x2c3038, 0.03) : jitter(0x23262b, 0.03);
        },
      });
      city(L(0, y + 0.0026, l / 2 + 0.0012), 0.0048);   // faros encendidos de noche
    }
  }
  function localW(cx, cz, x0, z0, yaw, l, w) {
    const s = Math.sin(yaw), c = Math.cos(yaw);
    const dz = cz - z0, dx = cx - x0;
    return { z: dx * s + dz * c, x: dx * c - dz * s };   // aprox (omite signo de s)
  }
  function phoneBox(x, z) {
    const y = roadY(x, z);
    addGeo(new THREE.BoxGeometry(0.0038, 0.0078, 0.0038), RED, { p: [x, y + 0.0043, z], amt: 0.03 });
    addGeo(new THREE.BoxGeometry(0.0042, 0.0022, 0.0042), RED, { p: [x, y + 0.0090, z], amt: 0.02 });
    addGeo(new THREE.BoxGeometry(0.0030, 0.0040, 0.0030), 0x263844, { p: [x, y + 0.0043, z], amt: 0.03 });
    city([x, y + 0.0055, z + 0.0022], 0.005);
  }
  // cabinas y poste rojo (buzón) cerca del Parlamento y del Eye
  phoneBox(-0.148, -0.030); phoneBox(-0.041, -0.028); phoneBox(-0.062, 0.048);
  {
    const bx = -0.096, bz = -0.028, by = roadY(bx, bz);
    addGeo(new THREE.CylinderGeometry(0.0016, 0.0018, 0.0052, 6), RED, { p: [bx, by + 0.0026, bz], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0019, 0.0019, 0.0012, 6), 0x2d3036, { p: [bx, by + 0.0056, bz], amt: 0.03 });
  }

  // =====================================================================
  // 16. TRANSPORTE EN LOS EMBARCADEROS: MARCO + BARCOS
  // =====================================================================
  function hullGeo(len, wd, hh, bow = 0.35) {
    const s = new THREE.Shape();
    s.moveTo(-wd / 2, -len / 2); s.lineTo(wd / 2, -len / 2); s.lineTo(wd / 2, len / 2 - len * bow);
    s.quadraticCurveTo(wd / 2, len / 2 - len * bow * 0.2, 0, len / 2);
    s.quadraticCurveTo(-wd / 2, len / 2 - len * bow * 0.2, -wd / 2, len / 2 - len * bow);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: hh, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    return g;
  }
  function boat(x, z, heading, spec) {
    const yaw = heading, q = qYXZ(0, yaw), L = loc(x, z, yaw);
    const y0 = WATER - 0.0012;
    addGeo(hullGeo(spec.len, spec.wd, spec.hh), spec.hi, {
      p: [x, y0, z], q,
      colorFn: (a, b, c) => { const cy = centroid(a, b, c)[1] - y0; return jitter(cy < spec.hh * 0.5 ? spec.lo : spec.hi, 0.03); },
    });
    const deck = y0 + spec.hh;
    if (spec.kind === 'clipper') {   // lancha de pasajeros del río
      addGeo(new THREE.BoxGeometry(spec.wd * 0.72, 0.0038, spec.len * 0.62), 0x3f6fa8,
        { p: L(0, deck + 0.0019, 0.002), q, amt: 0.03 });
      addGeo(new THREE.CircleGeometry(spec.wd * 0.30, 10), GOLD,
        { p: L(0, deck + 0.0042, 0.012), q: qYXZ(-Math.PI / 2 + 0.3, yaw), amt: 0.03 });
      city(L(0, deck + 0.005, -spec.len * 0.28), 0.005);
    } else if (spec.kind === 'tug') {  // remolcador del puerto
      addGeo(new THREE.BoxGeometry(spec.wd * 0.8, 0.0045, spec.len * 0.4), 0xd8d3c6,
        { p: L(0, deck + 0.0022, 0.001), q, amt: 0.03 });
      addGeo(new THREE.CylinderGeometry(0.0011, 0.0013, 0.005, 6), 0x6b6f75,
        { p: L(0, deck + 0.0068, 0.002), amt: 0.03 });
      city(L(0, deck + 0.0045, 0.001), 0.0052);
    } else {  // bote del servidor público
      addGeo(new THREE.BoxGeometry(spec.wd * 0.62, 0.0026, spec.len * 0.45), 0xe8e4da,
        { p: L(0, deck + 0.0013, 0.0), q, amt: 0.03 });
      city(L(0, deck + 0.003, 0.0), 0.0046);
    }
  }
  function pontoon(x) {
    const z = embS(x);
    addGeo(new THREE.BoxGeometry(0.026, 0.0022, 0.012), 0x7b5a3a, { p: [x, WATER + 0.0016, z + 0.008], amt: 0.04 });
    for (const oz of [-0.0045, 0.0045]) addGeo(new THREE.BoxGeometry(0.026, 0.0018, 0.0022), 0x5d442e,
      { p: [x, WATER + 0.0030, z + 0.008 + oz], amt: 0.04 });
    for (let k = 0; k < 3; k++) addGeo(new THREE.BoxGeometry(0.0055, 0.0048, 0.0032), pick(QUAYC),
      { p: [x - 0.007 + k * 0.007, BANK - 0.0009 * k, z + 0.0035 + k * 0.0032], amt: 0.03 });
  }
  pontoon(-0.240); pontoon(0.150);
  boat(-0.238, embS(-0.238) + 0.010, -1.35, { kind: 'clipper', len: 0.026, wd: 0.009, hh: 0.005, lo: 0x1f2f4f, hi: 0xf4f1ea });
  boat(-0.100, zr(0.02) - 0.002, 2.2, { kind: 'tug', len: 0.017, wd: 0.008, hh: 0.0042, lo: 0x86462e, hi: 0xe8e4da });
  boat(0.075, zr(-0.02) + 0.001, -0.5, { kind: 'small', len: 0.012, wd: 0.006, hh: 0.0028, lo: 0x2f4f7e, hi: 0xf4f1ea });
  boat(0.270, zr(0.27) + 0.001, 0.7, { kind: 'small', len: 0.010, wd: 0.005, hh: 0.0024, lo: 0x7d4b34, hi: 0xe8e4da });

  // =====================================================================
  // 17. ADORNOS: ÁRBOLES, BANJOS, PARADAS
  // =====================================================================
  function tree(x, z, big = true) {
    const h = heightAt(x, z), th = big ? range(0.008, 0.012) : range(0.005, 0.008);
    addRod([x, h - 0.003, z], [x, h + th, z], 0.0016, 0x6b5238, 5);
    addGeo(new THREE.IcosahedronGeometry(big ? 0.0068 : 0.0044, 1), pick([0x4f7a3a, 0x5d8a42, 0x476d34]),
      { p: [x, h + th + (big ? 0.0055 : 0.0035), z], s: [1, 0.85, 1], r: [0, rng() * 3, 0], amt: 0.09 });
    if (big && rng() < 0.5) addGeo(new THREE.IcosahedronGeometry(0.0042, 0), pick(GRASS),
      { p: [x + range(-0.005, 0.005), h + th + 0.008, z + range(-0.005, 0.005)], s: [1, 0.8, 1], r: [0, rng() * 3, 0], amt: 0.09 });
  }
  function bench(x, z, yaw) {
    const L = loc(x, z, yaw);
    addGeo(new THREE.BoxGeometry(0.006, 0.0009, 0.0030), 0x6e5236, { p: L(0, BANK + 0.0022, 0), q: qYXZ(0, yaw), amt: 0.04 });
    addGeo(new THREE.BoxGeometry(0.006, 0.0022, 0.0009), 0x6e5236, { p: L(0, BANK + 0.0038, -0.0016), q: qYXZ(0, yaw), amt: 0.04 });
  }
  // árboles del St James's y jardines de Buckingham
  for (let k = 0, tries = 0; k < 26 && tries < 260; tries++) {
    const x = range(-0.315, -0.120), z = range(-0.122, -0.074);
    if (onRoad(x, z)) continue;
    if (inBuck(x, z) || inRect(x, z, [-0.306, -0.236, -0.108, -0.082])) continue;
    if (!free(x - 0.005, x + 0.005, z - 0.005, z + 0.005)) continue;
    if (blocked(x, x, z, z) && !inRect(x, z, BUCK)) continue;
    tree(x, z); reserve(x, z, 0.005, 0.005); k++;
  }
  // árboles sueltos junto a la calzada sur y el foso seco de la Torre
  for (let k = 0, tries = 0; k < 14 && tries < 200; tries++) {
    const x = range(0.03, 0.30), z = range(0.078, 0.096);
    if (onRoad(x, z) || blocked(x - 0.006, x + 0.006, z - 0.006, z + 0.006)) continue;
    if (!free(x - 0.005, x + 0.005, z - 0.005, z + 0.005)) continue;
    tree(x, z, false); reserve(x, z, 0.005, 0.005); k++;
  }
  for (let k = 0, tries = 0; k < 8 && tries < 160; tries++) {
    const x = range(0.268, 0.318), z = range(-0.020, 0.000);
    if (blocked(x - 0.006, x + 0.006, z - 0.006, z + 0.006)) continue;
    if (!free(x - 0.005, x + 0.005, z - 0.005, z + 0.005)) continue;
    tree(x, z, false); reserve(x, z, 0.005, 0.005); k++;
  }
  // bancos del parque y de la orilla sur
  bench(-0.205, -0.096, -0.3); bench(-0.165, -0.106, 0.2); bench(-0.140, -0.092, -0.1);
  bench(-0.230, -0.088, 0.4); bench(-0.190, -0.116, -0.5); bench(-0.122, -0.112, 0.1);
  bench(-0.062, 0.036, 0); bench(0.032, 0.034, 0.1); bench(0.118, 0.033, 0);

  // =====================================================================
  // 18. CASAS DE LADRILLO (hileras sobre retículas libres)
  // =====================================================================
  function brickHouse(x, zc, w, dp, hgt, yaw, opt = {}) {
    const L = loc(x, zc, yaw), q = qYXZ(0, yaw);
    const [hmin, hmax] = footprint(L, w, dp);
    const floorY = hmax, ybot = Math.min(hmin, floorY) - 0.006;
    const wall = opt.wall || (rng() < 0.62 ? pick(BRICK) : rng() < 0.5 ? 0xe6e0d4 : pick(PAVE));
    const roofHex = pick(SLATE), roofHex2 = pick(SLATE);
    addGeo(new THREE.BoxGeometry(w, hgt, dp), wall, { p: [x, floorY + hgt / 2, zc], q, amt: 0.03 });
    // ventanas blancas en dos hileras (fachada delantera)
    const winY1 = floorY + hgt * 0.30, winY2 = floorY + hgt * 0.74;
    for (const wy of hgt > 0.011 ? [winY1, winY2] : [winY1]) {
      for (const wx of [-w * 0.24, w * 0.24]) {
        addGeo(new THREE.BoxGeometry(0.0034, 0.0038, 0.0018), 0x53554c, {
          p: L(wx, wy, dp / 2 - 0.0002),
          colorFn: (a, b, c) => { const cy = centroid(a, b, c)[1]; return jitter(cy > wy + 0.0004 ? 0xf2efe6 : 0x53554c, 0.02); },
        });
        // dintel blanco
        addGeo(new THREE.BoxGeometry(0.0038, 0.0008, 0.0020), 0xe9e6df, { p: L(wx, wy + 0.0023, dp / 2), q, amt: 0.02 });
        if (opt.windows && nWin < 40 && rng() < 0.28) {
          features.push({ type: 'window', pos: L(wx, wy, dp / 2 + 0.0012), yaw, w: 0.0030, h: 0.0034 }); nWin++;
        }
      }
    }
    // puerta
    addGeo(new THREE.BoxGeometry(0.0034, 0.0062, 0.0018), pick([0x2c3d54, 0x1f2c40, 0x31412e, 0x6b3a2a]),
      { p: L(w * 0.05, floorY + 0.0031, dp / 2), q, amt: 0.03 });
    // techo pizarra a dos aguas
    addGeo(new THREE.CylinderGeometry(dp * 0.62, dp * 0.62, w * 1.02, 3, 1), roofHex, {
      p: [x, floorY + hgt + (dp * 0.62 * 0.75) / 2, zc], r: [0, 0, Math.PI / 2], s: [1, 0.75, 1], amt: 0.04,
      colorFn: (a, b, c) => jitter((Math.floor(centroid(a, b, c)[2] * 300) & 1) ? roofHex : roofHex2, 0.03),
    });
    // chimenea
    if (rng() < 0.5) {
      const cp = L((rng() < 0.5 ? -1 : 1) * w * 0.28, floorY + hgt + dp * 0.30, -dp * 0.18);
      addGeo(new THREE.BoxGeometry(0.0026, 0.005, 0.0026), pick(BRICK), { p: [cp[0], cp[1] + 0.0025, cp[2]], q, amt: 0.03 });
    }
  }
  // hileras: franjas de la ciudad que quedaron libres
  const STRIPS = [
    { z0: -0.138, z1: -0.118, x0: -0.02, x1: 0.235, rows: 1, side: -1 },   // norte, detrás de traFalgar
    { z0: -0.190, z1: -0.162, x0: -0.02, x1: 0.235, rows: 1, side: -1 },   // norte, fondo
    { z0: -0.092, z1: -0.076, x0: 0.130, x1: 0.222, rows: 1, side: -1 },   // entre St Paul's y la Torre
    { z0: 0.116, z1: 0.134, x0: -0.30, x1: 0.30, rows: 1, side: 1 },       // sur, detrás de la calle
    { z0: 0.146, z1: 0.168, x0: -0.30, x1: 0.235, rows: 1, side: 1 },      // sur, fondo
    { z0: 0.180, z1: 0.202, x0: -0.30, x1: 0.235, rows: 1, side: 1 },      // sur, borde
  ];
  let houses = 0;
  for (const st of STRIPS) {
    for (let r = 0; r < st.rows; r++) {
      const zc = st.z0 + (st.z1 - st.z0) * (r + 0.5) / st.rows;
      let x = st.x0 + range(0.003, 0.008);
      while (x < st.x1 - 0.012 && houses < 96) {
        const w = range(0.011, 0.018), dp = range(0.010, 0.0135);
        if (x + w > st.x1) break;
        const ok = !blocked(x - w / 2 - 0.002, x + w / 2 + 0.002, zc - dp / 2 - 0.002, zc + dp / 2 + 0.002)
          && !onApproach(x, zc) && free(x - w / 2 - 0.001, x + w / 2 + 0.001, zc - dp / 2 - 0.001, zc + dp / 2 + 0.001);
        // no tapar edificios frente a la encolla: franja alrededor de la Abadía y de la catedral
        if (ok && rng() < 0.66) {
          const hgt = rng() < 0.14 ? range(0.014, 0.018) : range(0.009, 0.013);
          const yaw = Math.PI * (st.side < 0 ? 0 : 1) + range(-0.03, 0.03);
          brickHouse(x + w / 2, zc, w, dp, hgt, yaw, { windows: true });
          reserve(x + w / 2, zc, w / 2 + 0.001, dp / 2 + 0.001);
          houses++;
        }
        x += w + range(0.002, 0.006);
      }
    }
  }
  // bloques comerciales en el borde este sur
  function shop(x, zc, w, dp, hgt, yaw, hex) {
    const L = loc(x, zc, yaw), q = qYXZ(0, yaw);
    const [hmin, hmax] = footprint(L, w, dp);
    addGeo(new THREE.BoxGeometry(w, hgt, dp), hex, { p: [x, hmax + hgt / 2, zc], q, amt: 0.03 });
    addGeo(new THREE.BoxGeometry(w * 0.9, 0.0016, 0.0016), 0xf2e9d8, { p: L(0, hmax + 0.004, dp / 2), q, amt: 0.04 });
    addGeo(new THREE.CylinderGeometry(dp * 0.6, dp * 0.6, w, 3, 1), pick(SLATE),
      { p: [x, hmax + hgt + dp * 0.22, zc], r: [0, 0, Math.PI / 2], s: [1, 0.75, 1], amt: 0.04 });
  }
  shop(0.262, 0.155, 0.026, 0.013, 0.011, 0, 0x8f5439);
  shop(0.297, 0.130, 0.018, 0.012, 0.009, 0.2, 0x9b5f42);
  shop(-0.305, 0.185, 0.020, 0.013, 0.010, 0, 0x7d4b34);

  // =====================================================================
  // 19. EFECTOS VIVOS
  // =====================================================================
  // destellos en el río
  for (let n = 0, tries = 0; n < 34 && tries < 600; tries++) {
    const x = range(X0 + 0.01, X1 - 0.01);
    const z = zr(x) + range(-wr(x) * 0.8, wr(x) * 0.8);
    if (Math.abs(z - zr(x)) > wr(x)) continue;
    if (heightAt(x, z) > WATER - 0.004) continue;
    features.push({ type: 'sparkle', pos: [x, WATER + 0.002, z], size: 0.009 }); n++;
  }
  // gaviotas, nubes (londinense: bajas y seguidas), gaviotas costeras
  features.push({ type: 'gulls', pos: [0.02, 0.10, 0.0], size: 0.085 });
  features.push({ type: 'gulls', pos: [0.20, 0.065, 0.09], size: 0.05 });
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 1.2, r = 0.235 + rng() * 0.05, cy = 0.225 + rng() * 0.05;
    features.push({ type: 'cloud', pos: [Math.cos(a) * r, cy, Math.sin(a) * r * 0.72], center: [0, cy, 0], size: 0.026 + rng() * 0.011 });
  }
  // humo de alguna chimenea doméstica del borde sur
  features.push({ type: 'smoke', pos: [-0.18, 0.148, 0.132], size: 0.006 });
  features.push({ type: 'smoke', pos: [0.12, 0.126, 0.148], size: 0.006 });

  // =====================================================================
  // 20. VEHÍCULOS EN LOS EMBARCADEROS
  // =====================================================================
  // bus doble en el terraplén norte
  bus(-0.185, BANK, zr(-0.185) - wr(-0.185) - 0.013, 0, 'bus');
  bus(-0.075, BANK, zr(-0.075) + wr(-0.075) + 0.013, Math.PI, 'bus');
  // taxi en el sur este
  bus(0.105, BANK, 0.1045, 0, 'cab');

  // =====================================================================
  // 21. CIERRE
  // =====================================================================
  return finish('Londres — Támesis');
}
