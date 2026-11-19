// Diorama "Oia — Santorini" (~130k triángulos)
// El pueblo blanco de Oia colgado del borde de la caldera: casas cúbicas y bóvedas encaladas
// que caen en cascada por el acantilado, iglesias de cúpula azul con campanarios de espadaña,
// molinos de viento, las ruinas del castillo en la punta oeste y, abajo, la bahía de Ammoudi
// con su muelle, tabernas, barcas y el islote de la capilla. El acantilado muestra las capas
// volcánicas (pómez crema, rojos, grises y negros); la ladera norte baja suave entre viñedos.
// El frente (+Z) es la caldera, con un velero, un barco de paseo y un crucero pequeño.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildOia(seed = 1119) {
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
  const WHITE = [0xf7f4ee, 0xf2eee6, 0xfbfaf6, 0xefeae0];
  const PASTEL = [0xe9b04e, 0xdc7b4b, 0xefc5b5, 0xf3dc95, 0xc9603f, 0xb3d0dc, 0xe39d6b];
  const DOORS = [0x2c6db4, 0x3a8bd0, 0x2c6db4, 0x2a9e9b, 0x8a3c29, 0x3a8bd0, 0x557f45, 0x2c6db4];
  const BOUG = [0xc2187a, 0xd63d8f, 0xb3126b, 0xe0559d];
  const VINE = [0x5d7a36, 0x6d8a3e, 0x4f6a30];
  const DOME = [0x1e5fae, 0x2a6fc2];
  const BASEWALL = 0xe6e0d4;

  // =====================================================================
  // 1. RELIEVE: CRESTA, ACANTILADO DE LA CALDERA, PUNTA OESTE, MUELLE E ISLOTE
  // =====================================================================
  const X0 = -0.32, X1 = 0.32, Z0 = -0.22, Z1 = 0.22;
  const SEA = 0, FLOOR = -0.040, BASE = -0.052, PLINTH = -0.068;
  const cliffTop = (x) => 0.028 + 0.010 * Math.sin(x * 11 + 1.2) + 0.005 * Math.sin(x * 23 + 0.4);
  const cliffSlope = (x) => 0.11 * Math.cos(x * 11 + 1.2) + 0.115 * Math.cos(x * 23 + 0.4);
  const crestH = (x) => 0.134 + 0.016 * Math.exp(-(((x - 0.06) / 0.17) ** 2)) - 0.020 * smooth((-0.07 - x) / 0.14);
  const westX = (z) => -0.205 + 0.009 * Math.sin(z * 17 + 0.5) + 0.005 * Math.sin(z * 41);
  const QUAY = { x0: -0.283, x1: -0.215, z0: 0.020, z1: 0.135, y: 0.0068 };
  const ISLET = { x: -0.270, z: 0.182, r: 0.021, h: 0.027 };
  const inQuay = (x, z) => x > QUAY.x0 && x < QUAY.x1 && z > QUAY.z0 && z < QUAY.z1;
  const inStreet = (x, z) => { const d = z - cliffTop(x); return d > -0.054 && d < -0.034 && x > westX(z) + 0.012; };

  function heightAt(x, z) {
    const Hc = crestH(x);
    const d = z - cliffTop(x);
    let h, steep = 0, west = false;
    if (d < -0.06) {
      const u = (-0.06 - d) / 0.155;
      if (u < 1) {
        h = Hc * Math.pow(1 - u, 0.9);
        // bancales suaves de la ladera norte
        const st = 0.0085, q = Math.round(h / st) * st;
        h += (q - h) * 0.45 * smooth((u - 0.12) / 0.1) * smooth((0.97 - u) / 0.08);
      } else h = -(u - 1) * 0.5;
    } else if (d < 0) h = Hc - 0.010 * Math.pow((d + 0.06) / 0.06, 1.6);
    else if (d < 0.045) { h = Hc - 0.010 - 0.046 * (d / 0.045); steep = 0.4; }
    else if (d < 0.092) { const t = (d - 0.045) / 0.047, y0 = Hc - 0.056; h = y0 + (0.003 - y0) * Math.pow(t, 0.85); steep = 1; }
    else if (d < 0.108) { h = 0.003 + (FLOOR - 0.003) * ((d - 0.092) / 0.016); steep = 1; }
    else h = FLOOR;
    const dW = x - westX(z);
    if (dW < 0.03) {
      let w; const top = Hc - 0.012;
      if (dW >= 0) w = Hc - 0.012 * Math.pow(1 - dW / 0.03, 1.5);
      else if (dW > -0.045) w = top + (0.003 - top) * Math.pow(-dW / 0.045, 0.9);
      else if (dW > -0.06) w = 0.003 + (FLOOR - 0.003) * ((-dW - 0.045) / 0.015);
      else w = FLOOR;
      if (w < h) { h = w; if (dW < 0) { steep = 1; west = true; } }
    }
    if (h > FLOOR + 0.001) {
      h += 0.003 * (fbm(x * 32 + 11, z * 32 + 5) - 0.5) + 0.0012 * (fbm(x * 95 + 3, z * 95 + 17) - 0.5);
      // cárcavas verticales en los acantilados
      if (steep) h += steep * 0.008 * (west ? fbm(x * 9 + 5, z * 70 + 1) - 0.5 : fbm(x * 70 + 1, z * 9 + 2) - 0.5);
    }
    h = Math.max(h, FLOOR + 0.004 * (fbm(x * 20, z * 20) - 0.5));
    // muelle de Ammoudi
    if (x > QUAY.x0 - 0.01 && x < QUAY.x1 && z > QUAY.z0 - 0.01 && z < QUAY.z1 + 0.01) {
      const e = Math.min(x - QUAY.x0, z - QUAY.z0, QUAY.z1 - z);
      h = Math.max(h, e >= 0 ? QUAY.y + 0.0004 * (fbm(x * 80, z * 80) - 0.5) : QUAY.y + e * 3);
    }
    // islote de la capilla
    const ri = Math.hypot(x - ISLET.x, z - ISLET.z);
    if (ri < ISLET.r * 1.6) h = Math.max(h, ISLET.h * (1 - (ri / ISLET.r) ** 2) + 0.003 * (fbm(x * 60, z * 60) - 0.5));
    return h;
  }

  // Capas volcánicas del acantilado (de arriba abajo)
  const STRATA = [
    [0.116, [0xded2b8, 0xd2c4a6]], [0.103, [0xbfae8d, 0xb3a07c]], [0.091, [0x9e4b2f, 0x8f4229]],
    [0.079, [0x4f4743, 0x5a514c]], [0.066, [0xb88d58, 0xa97f4d]], [0.050, [0x713728, 0x803f2d]],
    [0.034, [0x3b3431, 0x463e3a]], [0.019, [0x80604a, 0x735440]], [-9, [0x352e2c, 0x2d2725]],
  ];
  const RED = [0x9b3f2a, 0x7e3322, 0x4a3a35, 0xa8553a, 0x8a3a26];
  function strataHex(x, y, z) {
    const w = y + 0.009 * (fbm(x * 12 + 4, z * 12 + 9) - 0.5) + 0.003 * Math.sin(x * 37 + z * 11);
    if (x < -0.195) return RED[((Math.floor(w * 95) % 5) + 5) % 5]; // acantilados rojos de Ammoudi
    for (const [lim, pal] of STRATA) if (w >= lim) return pal[rng() < 0.5 ? 0 : 1];
    return 0x352e2c;
  }

  function terrainColor(x, y, z, ny) {
    if (inQuay(x, z) && y < 0.012 && ny > 0.8) {
      const k = (Math.floor(x * 260) + Math.floor(z * 180)) & 1;
      return jitter(k ? 0xd8cfbf : 0xc9bfae, 0.04);
    }
    if (y < 0.0045) return jitter(pick([0x4d4a48, 0x5e5955, 0x3f3c3a]), 0.06); // guijarros negros
    if (ny < 0.6) return jitter(strataHex(x, y, z), 0.05);
    const d = z - cliffTop(x);
    const village = d > -0.165 && d < 0.07 && x > westX(z) - 0.002;
    if (village) {
      if (inStreet(x, z)) {
        const seam = ((Math.floor(x * 320) + Math.floor(z * 320)) % 4) === 0;
        return jitter(seam ? 0xbfb6a6 : 0xf1ece2, 0.025);
      }
      return jitter(pick([0xeae4d8, 0xdcd4c4, 0xe4dccb]), 0.03);
    }
    if (ny < 0.75) return jitter(pick([0xab8d64, 0x9c7f58]), 0.06);
    const v = (z + 0.004 * Math.sin(x * 30)) * 110;
    const f = v - Math.floor(v);
    if (f < 0.16) return jitter(0xa48c6c, 0.05);                     // muretes de piedra seca
    if (fbm(x * 18 + 2, z * 18 + 8) > 0.6) return jitter(pick([0x8d9352, 0x7b8549]), 0.06); // matorral
    return jitter((Math.floor(v) & 1) ? 0xc9ab7a : 0xbd9c6c, 0.05);
  }

  // Rejilla del terreno (se omiten las celdas hondas: las tapa el mar)
  const NX = 290, NZ = 200;
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
    if (Math.max(h00, h10, h11, h01) < SEA - 0.006) continue;
    const A = [gx(i), h00, gz(j)], B = [gx(i + 1), h10, gz(j)], C = [gx(i + 1), h11, gz(j + 1)], D = [gx(i), h01, gz(j + 1)];
    if ((i + j) & 1) { landTri(A, B, C); landTri(A, C, D); } else { landTri(A, B, D); landTri(B, C, D); }
  }

  // =====================================================================
  // 2. MAR DE LA CALDERA
  // =====================================================================
  const SNX = 108, SNZ = 74, sdx = (X1 - X0) / SNX, sdz = (Z1 - Z0) / SNZ;
  const seaVert = [], seaH = [];
  for (let j = 0; j <= SNZ; j++) for (let i = 0; i <= SNX; i++) {
    const x = X0 + i * sdx, z = Z0 + j * sdz;
    const edge = i === 0 || j === 0 || i === SNX || j === SNZ;
    seaVert.push(V(x, edge ? SEA : SEA + 0.0007 * (fbm(i * 0.9 + 40, j * 0.9 + 7) - 0.5), z));
    seaH.push(heightAt(x, z));
  }
  function seaColor(x, z, depth) {
    if (depth < 0.002) return jitter(0xbfe6e6, 0.04);
    if (depth < 0.008) return jitter(pick([0x58c2c6, 0x4db7c0]), 0.04);
    if (depth < 0.022) return jitter(pick([0x2f95ba, 0x2a88b1]), 0.04);
    if (Math.sin(x * 70 + z * 22 + fbm(x * 9, z * 9) * 6) > 0.9) return jitter(0x3b86b8, 0.03);
    return jitter(fbm(x * 12 + 50, z * 12) > 0.55 ? 0x1d5d93 : 0x1a5388, 0.035);
  }
  for (let j = 0; j < SNZ; j++) for (let i = 0; i < SNX; i++) {
    const k00 = j * (SNX + 1) + i, k10 = k00 + 1, k01 = k00 + SNX + 1, k11 = k01 + 1;
    if (Math.min(seaH[k00], seaH[k10], seaH[k01], seaH[k11]) > SEA + 0.0015) continue;
    const a = seaVert[k00], b = seaVert[k10], c = seaVert[k11], d = seaVert[k01];
    for (const [p, q, r] of ((i + j) & 1) ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]) {
      const [cx, , cz] = centroid(p, q, r);
      tri(p, q, r, seaColor(cx, cz, SEA - heightAt(cx, cz)), UP);
    }
  }

  // =====================================================================
  // 3. COSTADOS (CORTE GEOLÓGICO Y AGUA) Y ZÓCALO
  // =====================================================================
  const SIDE_LEVELS = [BASE, -0.025, SEA, 0.019, 0.034, 0.050, 0.066, 0.079, 0.091, 0.103, 0.116, 0.4];
  function sideHex(y, x) {
    if (y < SEA) return pick([0x3a3431, 0x332d2b]);
    if (x < -0.195) return pick(RED);
    for (const [lim, pal] of STRATA) if (y >= lim) return pal[rng() < 0.5 ? 0 : 1];
    return 0x352e2c;
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
        const a0 = V(A[0], lo, A[2]), b0 = V(B[0], lo, B[2]), b1 = V(B[0], tb, B[2]), a1 = V(A[0], ta, A[2]);
        tri(a0, b0, b1, col, out); tri(a0, b1, a1, col, out);
      }
      if (A[1] < SEA || B[1] < SEA) {
        const wa = Math.min(A[1], SEA), wb = Math.min(B[1], SEA), mid = -0.016;
        const ua = Math.max(wa, mid), ub = Math.max(wb, mid);
        let c = jitter(0x3d8fc0, 0.03);
        tri(V(A[0], ua, A[2]), V(B[0], ub, B[2]), V(B[0], SEA, B[2]), c, out);
        tri(V(A[0], ua, A[2]), V(B[0], SEA, B[2]), V(A[0], SEA, A[2]), c, out);
        if (wa < mid || wb < mid) {
          c = jitter(0x26679a, 0.03);
          tri(V(A[0], wa, A[2]), V(B[0], wb, B[2]), V(B[0], ub, B[2]), c, out);
          tri(V(A[0], wa, A[2]), V(B[0], ub, B[2]), V(A[0], ua, A[2]), c, out);
        }
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
    addGeo(new THREE.BoxGeometry(X1 - X0 + 0.0136, 0.0028, Z1 - Z0 + 0.0136), 0xa98a55,
      { p: [0, BASE - 0.0048, 0], amt: 0.03 });
  }

  // =====================================================================
  // 4. OCUPACIÓN DEL SUELO
  // =====================================================================
  const occ = [];
  const free = (x0, x1, z0, z1) => occ.every((r) => x1 <= r[0] || x0 >= r[1] || z1 <= r[2] || z0 >= r[3]);
  const reserve = (x, z, hw, hd) => occ.push([x - hw, x + hw, z - hd, z + hd]);
  const footprint = (L, w, dp) => {
    let hmin = Infinity, hmax = -Infinity;
    for (const [lx, lz] of [[-w / 2, -dp / 2], [w / 2, -dp / 2], [w / 2, dp / 2], [-w / 2, dp / 2], [0, 0], [0, dp / 2], [0, -dp / 2], [-w / 2, 0], [w / 2, 0]]) {
      const p = L(lx, 0, lz); const h = heightAt(p[0], p[2]);
      if (h < hmin) hmin = h; if (h > hmax) hmax = h;
    }
    return [hmin, hmax];
  };
  const facingYaw = (x) => Math.max(-0.35, Math.min(0.35, Math.atan2(-cliffSlope(x), 1)));

  // Límites de efectos
  let nCity = 0, nWin = 0, nPoolSpark = 0;
  const city = (p, size = 0.0078) => { if (nCity < 95) { features.push({ type: 'city', pos: p, size }); nCity++; } };

  // =====================================================================
  // 5. CASAS CICLÁDICAS
  // =====================================================================
  function house(x, zc, w, dp, hgt, yaw, opt = {}) {
    const L = loc(x, zc, yaw), q = qYXZ(0, yaw);
    const [hmin, hmax] = footprint(L, w, dp);
    if (opt.floor === undefined && hmin < 0.006) return null;
    const floorY = opt.floor !== undefined ? opt.floor : hmax + 0.001;
    const ybot = Math.min(hmin, floorY) - 0.009, ytop = floorY + hgt;
    const wall = opt.wall !== undefined ? opt.wall : (rng() < 0.72 ? pick(WHITE) : pick(PASTEL));
    // muro de contención encalado + volumen habitable
    if (floorY - ybot > 0.001) addGeo(new THREE.BoxGeometry(w, floorY - ybot, dp), BASEWALL,
      { p: [x, (floorY + ybot) / 2, zc], q, amt: 0.025 });
    addGeo(new THREE.BoxGeometry(w, hgt, dp), wall, { p: [x, floorY + hgt / 2, zc], q, amt: 0.025 });
    // techo: bóveda de cañón o azotea con pretil
    const roof = opt.roof || (rng() < 0.38 ? 'vault' : 'flat');
    if (roof === 'vault') {
      const R = Math.min(dp, w) * 0.46;
      addGeo(new THREE.CylinderGeometry(R, R, w * 0.97, 9, 1, false, 0, Math.PI), pick(WHITE),
        { p: [x, ytop, zc], q: qYXZ(0, yaw, Math.PI / 2), s: [0.62, 1, 1], amt: 0.025 });
    } else {
      addGeo(new THREE.BoxGeometry(w + 0.0018, 0.0022, dp + 0.0018), pick(WHITE), { p: [x, ytop + 0.0006, zc], q, amt: 0.02 });
      // pretil blanco o pérgola de madera en la terraza
      if (opt.pergola !== false && rng() < 0.24) {
        for (const sx of [-w * 0.36, w * 0.36]) for (const sz of [-dp * 0.3, dp * 0.3]) {
          addRod(L(sx, ytop + 0.001, sz), L(sx, ytop + 0.0068, sz), 0.0011, 0x6b4c30, 4);
        }
        for (let b = -1; b <= 1; b++) {
          addGeo(new THREE.BoxGeometry(w * 0.82, 0.0009, 0.0012), 0x7c5938, { p: L(0, ytop + 0.0068, b * dp * 0.26), q, amt: 0.04 });
        }
      } else if (rng() < 0.35) {
        addGeo(new THREE.BoxGeometry(w + 0.0014, 0.0016, 0.0014), pick(WHITE), { p: L(0, ytop + 0.0018, dp / 2), q, amt: 0.02 });
      }
    }
    // puerta (en arco si es casa-cueva con bóveda) y ventanas al frente
    const doorHex = opt.door || pick(DOORS);
    const doorX = (rng() - 0.5) * Math.max(0, w - 0.009) * 0.7;
    addGeo(new THREE.BoxGeometry(0.0046, 0.0082, 0.0024), doorHex, { p: L(doorX, floorY + 0.0043, dp / 2), q, amt: 0.03 });
    if (roof === 'vault') addGeo(new THREE.CylinderGeometry(0.0023, 0.0023, 0.0024, 6, 1, false, Math.PI / 2, Math.PI), doorHex,
      { p: L(doorX, floorY + 0.0084, dp / 2), q: qYXZ(Math.PI / 2, yaw), amt: 0.03 });
    const wins = w > 0.019 ? [doorX - 0.0078, doorX + 0.0078] : [doorX > 0 ? doorX - 0.0078 : doorX + 0.0078];
    const winY = floorY + hgt * 0.56 + 0.0008;
    let lit = false;
    for (const wx of wins) {
      if (Math.abs(wx) > w / 2 - 0.0028) continue;
      const shut = rng() < 0.5;
      addGeo(new THREE.BoxGeometry(0.0040, 0.0044, 0.0022), shut ? doorHex : 0x26384a, { p: L(wx, winY, dp / 2), q, amt: 0.03 });
      if (!shut && !lit && opt.windows && nWin < 26 && rng() < 0.65) {
        features.push({ type: 'window', pos: L(wx, winY, dp / 2 + 0.0017), yaw, w: 0.0046, h: 0.0052 }); nWin++; lit = true;
      }
    }
    if (opt.back) addGeo(new THREE.BoxGeometry(0.0040, 0.0044, 0.0022), rng() < 0.5 ? doorHex : 0x26384a,
      { p: L((rng() - 0.5) * (w - 0.008), winY, -dp / 2), q, amt: 0.03 });
    // chimenea cicládica
    if (roof === 'flat' && rng() < 0.14) {
      const cp = L((rng() < 0.5 ? -1 : 1) * w * 0.28, ytop + 0.0035, -dp * 0.22);
      addGeo(new THREE.BoxGeometry(0.0032, 0.0062, 0.0032), 0xf4f1ea, { p: cp, q, amt: 0.02 });
      addGeo(new THREE.BoxGeometry(0.0046, 0.0012, 0.0046), 0xf4f1ea, { p: [cp[0], cp[1] + 0.0034, cp[2]], q, amt: 0.02 });
    }
    // buganvilla junto a la puerta
    if (opt.flowers !== false && rng() < 0.22) {
      const side = doorX > 0 ? -1 : 1;
      addGeo(new THREE.IcosahedronGeometry(0.0038, 0), pick(BOUG),
        { p: L(side * (w / 2 - 0.001), floorY + 0.006, dp / 2 + 0.0015), r: [rng() * 3, rng() * 3, 0], s: [1, 1.3, 0.8], amt: 0.1 });
    }
    if (opt.light && rng() < opt.light) city(L(doorX + 0.0042, floorY + 0.0102, dp / 2 + 0.003));
    return { floorY, ytop, L, q };
  }

  function poolTerrace(x, zc, w, dp, yaw) {
    const L = loc(x, zc, yaw), q = qYXZ(0, yaw);
    const [hmin, hmax] = footprint(L, w, dp);
    if (hmin < 0.006) return;
    const top = hmax + 0.004, ybot = hmin - 0.009;
    addGeo(new THREE.BoxGeometry(w, top - ybot, dp), BASEWALL, { p: [x, (top + ybot) / 2, zc], q, amt: 0.025 });
    addGeo(new THREE.BoxGeometry(w - 0.004, 0.0014, dp - 0.0045), pick([0x3fc4d4, 0x52d0dc]), { p: [x, top + 0.0003, zc], q, amt: 0.03 });
    // tumbonas
    for (const s of [-1, 1]) addGeo(new THREE.BoxGeometry(0.0028, 0.0014, 0.0055), 0xf5f2ea,
      { p: L(s * (w / 2 - 0.0018), top + 0.0007, 0), q, amt: 0.02 });
    if (nPoolSpark < 10) { features.push({ type: 'sparkle', pos: [x, top + 0.003, zc], size: 0.008 }); nPoolSpark++; }
  }

  // =====================================================================
  // 6. IGLESIAS DE CÚPULA AZUL Y CAMPANARIOS DE ESPADAÑA
  // =====================================================================
  function crossAt(p, k, q) {
    addGeo(new THREE.BoxGeometry(0.0019, 0.0078 * k, 0.0019), 0xece8e0, { p, q, amt: 0.02 });
    addGeo(new THREE.BoxGeometry(0.0056 * k, 0.0019, 0.0019), 0xece8e0, { p: [p[0], p[1] + 0.0012 * k, p[2]], q, amt: 0.02 });
  }
  function belfry(x, zc, yaw, k, floorY, ybot) {
    const L = loc(x, zc, yaw), q = qYXZ(0, yaw), qa = qYXZ(Math.PI / 2, yaw);
    const cw = 0.014 * k, ch = 0.030 * k, cd = 0.0055 * k;
    addGeo(new THREE.BoxGeometry(cw, ch + floorY - ybot, cd), 0xf6f3ec, { p: L(0, (ybot + floorY + ch) / 2, 0), q, amt: 0.02 });
    addGeo(new THREE.CylinderGeometry(cw / 2, cw / 2, cd, 10, 1, false, Math.PI / 2, Math.PI), 0xf6f3ec, { p: L(0, floorY + ch, 0), q: qa, amt: 0.02 });
    const ow = 0.0042 * k, oh = 0.0055 * k;
    const hole = (lx, ly, hh) => {
      addGeo(new THREE.BoxGeometry(ow, hh, cd + 0.0012), 0x2b3140, { p: L(lx, ly, 0), q, amt: 0.03 });
      addGeo(new THREE.CylinderGeometry(ow / 2, ow / 2, cd + 0.0012, 6, 1, false, Math.PI / 2, Math.PI), 0x2b3140, { p: L(lx, ly + hh / 2, 0), q: qa, amt: 0.03 });
      addGeo(new THREE.CylinderGeometry(ow * 0.2, ow * 0.36, hh * 0.5, 8), 0xa5823e, { p: L(lx, ly + hh * 0.1, cd / 2 + 0.0013), q, amt: 0.05 });
    };
    hole(-cw * 0.24, floorY + ch * 0.48, oh); hole(cw * 0.24, floorY + ch * 0.48, oh); hole(0, floorY + ch * 0.79, oh * 0.9);
    crossAt(L(0, floorY + ch + cw / 2 + 0.004 * k, 0), k, q);
    city(L(0, floorY + ch * 0.62, cd / 2 + 0.004), 0.0065);
  }
  function church(x, zc, yaw, k = 1, opt = {}) {
    const L = loc(x, zc, yaw), q = qYXZ(0, yaw);
    const W = 0.024 * k, D = 0.016 * k, Hn = 0.015 * k;
    const [hmin, hmax] = footprint(L, W + 0.006, D + 0.004);
    const floorY = hmax + 0.001, ybot = hmin - 0.009;
    const wallHex = opt.wall || 0xf8f6f0;
    addGeo(new THREE.BoxGeometry(W, floorY - ybot, D), BASEWALL, { p: [x, (floorY + ybot) / 2, zc], q, amt: 0.02 });
    addGeo(new THREE.BoxGeometry(W, Hn, D), wallHex, { p: L(0, floorY + Hn / 2, 0), q, amt: 0.02 });
    addGeo(new THREE.CylinderGeometry(D * 0.47, D * 0.47, W * 0.98, 10, 1, false, 0, Math.PI), wallHex,
      { p: L(0, floorY + Hn, 0), q: qYXZ(0, yaw, Math.PI / 2), s: [0.5, 1, 1], amt: 0.02 });
    // ábside
    addGeo(new THREE.CylinderGeometry(D * 0.32, D * 0.32, Hn * 0.8, 8, 1, false, Math.PI, Math.PI), wallHex,
      { p: L(-W / 2, floorY + Hn * 0.4, 0), q, amt: 0.02 });
    // tambor y cúpula azul con nervios
    const dxD = W * 0.2, R = D * 0.42, drumH = 0.006 * k;
    const dc = L(dxD, 0, 0);
    addGeo(new THREE.CylinderGeometry(R, R, drumH, 14), wallHex, { p: L(dxD, floorY + Hn + drumH / 2, 0), q, amt: 0.02 });
    for (let a = 0; a < 4; a++) { // ventanitas del tambor
      const ang = a * Math.PI / 2 + Math.PI / 4;
      addGeo(new THREE.BoxGeometry(0.0022 * k, 0.003 * k, 0.0015), 0x26384a,
        { p: [dc[0] + Math.sin(ang + yaw) * R, floorY + Hn + drumH * 0.5, dc[2] + Math.cos(ang + yaw) * R], r: [0, ang + yaw, 0], amt: 0.02 });
    }
    const domeY = floorY + Hn + drumH;
    addGeo(new THREE.SphereGeometry(R * 1.07, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), DOME[0], {
      p: [dc[0], domeY, dc[2]],
      colorFn: (a, b, c) => { const [cx, , cz] = centroid(a, b, c); const ang = Math.atan2(cz - dc[2], cx - dc[0]); return jitter(DOME[(Math.floor((ang + Math.PI) / (2 * Math.PI) * 14) & 1)], 0.03); },
    });
    addGeo(new THREE.CylinderGeometry(R * 0.2, R * 0.2, 0.0035 * k, 6), DOME[0], { p: [dc[0], domeY + R * 1.07 + 0.0012, dc[2]], amt: 0.03 });
    crossAt([dc[0], domeY + R * 1.07 + 0.0062 * k, dc[2]], k, q);
    // puerta en arco y ventanas
    const dX = -W * 0.18;
    addGeo(new THREE.BoxGeometry(0.0052 * k, 0.0085 * k, 0.0024), 0x2c6db4, { p: L(dX, floorY + 0.00425 * k, D / 2), q, amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(0.0026 * k, 0.0026 * k, 0.0024, 6, 1, false, Math.PI / 2, Math.PI), 0x2c6db4,
      { p: L(dX, floorY + 0.0085 * k, D / 2), q: qYXZ(Math.PI / 2, yaw), amt: 0.03 });
    for (const wx of [W * 0.12, W * 0.34]) addGeo(new THREE.BoxGeometry(0.0028 * k, 0.0045 * k, 0.0022), 0x26384a,
      { p: L(wx, floorY + Hn * 0.6, D / 2), q, amt: 0.03 });
    features.push({ type: 'window', pos: L(W * 0.12, floorY + Hn * 0.6, D / 2 + 0.0017), yaw, w: 0.0026 * k, h: 0.004 * k });
    if (opt.belfry !== false) belfry(L(W / 2 + 0.0075 * k, 0, D / 2 - 0.0028 * k)[0], L(W / 2 + 0.0075 * k, 0, D / 2 - 0.0028 * k)[2], yaw, k, floorY, ybot);
  }

  // =====================================================================
  // 7. MOLINOS DE VIENTO
  // =====================================================================
  function windmill(x, zc, yaw) {
    const L = loc(x, zc, yaw), q = qYXZ(0, yaw);
    const rb = 0.0105, rt = 0.0088;
    const [hmin, hmax] = footprint(L, rb * 2, rb * 2);
    const base = hmin - 0.009, top = hmax + 0.030;
    addGeo(new THREE.CylinderGeometry(rt, rb, top - base, 12), 0xf6f3ec, { p: [x, (top + base) / 2, zc], amt: 0.03 });
    addGeo(new THREE.CylinderGeometry(rt + 0.0008, rt + 0.0008, 0.0022, 12), 0xc9bba0, { p: [x, top - 0.0011, zc], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(rt * 1.12, 0.013, 12), 0x7d5b3b, {
      p: [x, top + 0.0065, zc],
      colorFn: (a, b, c) => jitter(Math.floor(centroid(a, b, c)[1] * 600) & 1 ? 0x7d5b3b : 0x6a4b30, 0.06),
    });
    addGeo(new THREE.BoxGeometry(0.0050, 0.0085, 0.0030), 0x2c6db4, { p: L(0, hmax + 0.0042, rb * 0.95), q, amt: 0.03 });
    addGeo(new THREE.BoxGeometry(0.0036, 0.0040, 0.0026), 0x26384a, { p: L(0, hmax + 0.019, rt * 1.03), q, amt: 0.03 });
    const hub = L(0, top + 0.004, rt + 0.011);
    addRod(L(0, top + 0.004, 0), hub, 0.0018, 0x5a3e28, 5);
    addGeo(new THREE.CylinderGeometry(0.0028, 0.0028, 0.004, 8), 0x5a3e28, { p: hub, q: qYXZ(Math.PI / 2, yaw), amt: 0.04 });
    const tx = Math.cos(yaw), tz = -Math.sin(yaw), Ls = 0.023;
    for (let i = 0; i < 8; i++) {
      const th = i * Math.PI / 4 + 0.2;
      addRod(hub, [hub[0] + tx * Math.cos(th) * Ls, hub[1] + Math.sin(th) * Ls, hub[2] + tz * Math.cos(th) * Ls], 0.0016, 0x5a3e28, 4);
      const s = new THREE.Shape();
      s.moveTo(Math.cos(th) * 0.004, Math.sin(th) * 0.004);
      s.lineTo(Math.cos(th) * Ls, Math.sin(th) * Ls);
      s.lineTo(Math.cos(th + 0.34) * Ls * 0.9, Math.sin(th + 0.34) * Ls * 0.9);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.0012, bevelEnabled: false });
      g.translate(0, 0, 0.0012);
      addGeo(g, 0xf3eee2, { p: hub, q, amt: 0.03 });
    }
  }

  // =====================================================================
  // 8. RUINAS DEL CASTILLO (PUNTA OESTE, MIRADOR DEL ATARDECER)
  // =====================================================================
  const stoneFn = (a, b, c) => {
    const [cx, cy, cz] = centroid(a, b, c);
    const row = Math.floor(cy * 380), col = Math.floor((cx + cz) * 260 + (row & 1) * 0.5);
    return jitter([0xb39b7a, 0xa38a68, 0xc2ab88, 0x8f7a5c][((row * 73856093) ^ (col * 19349663)) & 3], 0.04);
  };
  function castle(cx, cz) {
    const R = 0.017, n = 11;
    const hCenter = heightAt(cx, cz);
    // plataforma/bastión de piedra asentado en el risco
    addGeo(new THREE.CylinderGeometry(R * 0.96, R * 1.05, 0.024, 12), 0xa38a68,
      { p: [cx, hCenter - 0.011, cz], colorFn: stoneFn });
    for (let i = 0; i < n; i++) {
      if (i === 2 || i === 7) continue; // brechas
      const a = (i + 0.5) / n * Math.PI * 2;
      const px = cx + Math.cos(a) * R, pz = cz + Math.sin(a) * R;
      const yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
      const len = 2 * Math.PI * R / n * 1.08, ht = range(0.006, 0.016);
      const L = loc(px, pz, yaw);
      const [hmin, hmax] = footprint(L, len, 0.0045);
      const base = hmin - 0.010, top = Math.max(hmax, hCenter) + ht;
      addGeo(new THREE.BoxGeometry(len, top - base, 0.0045, 2, 3, 1), 0xb39b7a, { p: [px, (top + base) / 2, pz], q: qYXZ(0, yaw), colorFn: stoneFn });
      if (ht > 0.011) for (const s of [-0.3, 0.3]) addGeo(new THREE.BoxGeometry(len * 0.25, 0.003, 0.0048), 0xb39b7a,
        { p: L(s * len, top + 0.0015, 0), q: qYXZ(0, yaw), colorFn: stoneFn });
    }
    // torreón desmochado
    const tx = cx + 0.004, tz = cz - 0.004, L = loc(tx, tz, 0.3);
    const [hmin, hmax] = footprint(L, 0.011, 0.011);
    const tTop = Math.max(hmax, hCenter) + 0.021;
    addGeo(new THREE.BoxGeometry(0.011, tTop - hmin + 0.010, 0.011, 2, 4, 2), 0xb39b7a,
      { p: [tx, (tTop + hmin - 0.010) / 2, tz], r: [0, 0.3, 0], colorFn: stoneFn });
    addGeo(new THREE.BoxGeometry(0.004, 0.006, 0.0024), 0x2b2620, { p: L(0, tTop - 0.009, 0.0055), q: qYXZ(0, 0.3), amt: 0.03 });
    city([cx - 0.006, hCenter + 0.007, cz + R + 0.003], 0.0082);
    city([cx + 0.009, hCenter + 0.007, cz - R * 0.6], 0.0075);
    reserve(cx, cz, R + 0.006, R + 0.006);
  }

  // =====================================================================
  // 9. BARCOS
  // =====================================================================
  function hullGeo(len, wd, hh, bow = 0.35) {
    const s = new THREE.Shape();
    s.moveTo(-wd / 2, -len / 2); s.lineTo(wd / 2, -len / 2); s.lineTo(wd / 2, len / 2 - len * bow);
    s.quadraticCurveTo(wd / 2, len / 2 - len * bow * 0.2, 0, len / 2);
    s.quadraticCurveTo(-wd / 2, len / 2 - len * bow * 0.2, -wd / 2, len / 2 - len * bow);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: hh, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2); // proa hacia -Z local, casco hacia +Y
    return g;
  }
  // heading: hacia dónde apunta la proa (ángulo en el plano XZ, 0 = -Z)
  function boat(x, z, heading, kind, wake = false) {
    const yaw = heading, q = qYXZ(0, yaw), L = loc(x, z, yaw);
    const spec = {
      caique: { len: 0.024, wd: 0.0085, hh: 0.0055, lo: pick([0x2f6fb3, 0xc23b2e, 0x2a9e9b, 0x3a8bd0]), hi: 0xf4f1ea },
      yacht: { len: 0.044, wd: 0.012, hh: 0.0062, lo: 0x1f2f4f, hi: 0xf7f7f4 },
      tour: { len: 0.052, wd: 0.0145, hh: 0.0080, lo: 0x6f4426, hi: 0xf2ede2 },
      ship: { len: 0.092, wd: 0.018, hh: 0.0115, lo: 0x1d2c4a, hi: 0xf8f8f6 },
    }[kind];
    const y0 = SEA - 0.0018;
    addGeo(hullGeo(spec.len, spec.wd, spec.hh), spec.hi, {
      p: [x, y0, z], q,
      colorFn: (a, b, c) => { const cy = centroid(a, b, c)[1] - y0; return jitter(cy < spec.hh * 0.45 ? spec.lo : spec.hi, 0.03); },
    });
    const deck = y0 + spec.hh;
    if (kind === 'caique') {
      addGeo(new THREE.BoxGeometry(0.0055, 0.004, 0.0065), 0xf4f1ea, { p: L(0, deck + 0.002, 0.003), q, amt: 0.03 });
      addGeo(new THREE.BoxGeometry(0.0057, 0.0012, 0.0067), 0x2f6fb3, { p: L(0, deck + 0.0045, 0.003), q, amt: 0.03 });
    } else if (kind === 'yacht') {
      addGeo(new THREE.BoxGeometry(0.0075, 0.0045, 0.014), 0xf7f7f4, { p: L(0, deck + 0.0022, 0.006), q, amt: 0.02 });
      addGeo(new THREE.BoxGeometry(0.0077, 0.0016, 0.0142), 0x26384a, { p: L(0, deck + 0.0032, 0.006), q, amt: 0.02 });
      const mast = L(0, deck, -0.002);
      addRod(mast, [mast[0], deck + 0.062, mast[2]], 0.0016, 0xd8d8d2, 5);
      const main = new THREE.Shape(); main.moveTo(0, 0.004); main.lineTo(0, 0.058); main.lineTo(0.019, 0.004); main.closePath();
      const g1 = new THREE.ExtrudeGeometry(main, { depth: 0.0012, bevelEnabled: false }); g1.translate(0, 0, -0.0006);
      addGeo(g1, 0xfbfaf4, { p: [mast[0], deck, mast[2]], q: qYXZ(0, yaw + Math.PI / 2 + 0.25), amt: 0.02 });
      const jib = new THREE.Shape(); jib.moveTo(0, 0.004); jib.lineTo(0, 0.050); jib.lineTo(-0.017, 0.002); jib.closePath();
      const g2 = new THREE.ExtrudeGeometry(jib, { depth: 0.0012, bevelEnabled: false }); g2.translate(0, 0, -0.0006);
      addGeo(g2, 0xf1efe6, { p: [mast[0], deck, mast[2]], q: qYXZ(0, yaw + Math.PI / 2 - 0.15), amt: 0.02 });
      city([mast[0], deck + 0.063, mast[2]], 0.005);
    } else if (kind === 'tour') {
      addGeo(new THREE.BoxGeometry(0.0105, 0.0055, 0.022), 0x2c6db4, { p: L(0, deck + 0.0027, 0.004), q, amt: 0.03 });
      addGeo(new THREE.BoxGeometry(0.0125, 0.0014, 0.025), 0xf2ede2, { p: L(0, deck + 0.0062, 0.004), q, amt: 0.03 });
      for (const mz of [-0.013, 0.016]) { const m = L(0, deck, mz); addRod(m, [m[0], deck + 0.042, m[2]], 0.0017, 0x5a3e28, 5); }
      addRod(L(0, deck + 0.004, -0.026), L(0, deck + 0.036, -0.013), 0.0015, 0x5a3e28, 4);
      city(L(0, deck + 0.0075, 0.012), 0.005); city(L(0, deck + 0.0075, -0.004), 0.005);
    } else if (kind === 'ship') {
      const decks = [[0.0150, 0.0065, 0.064, 0.006], [0.0135, 0.0058, 0.050, 0.010], [0.0115, 0.0050, 0.032, 0.014]];
      let y = deck;
      for (const [w, h, l, off] of decks) {
        addGeo(new THREE.BoxGeometry(w, h, l, 1, 2, 6), 0xf8f8f6, {
          p: L(0, y + h / 2, off), q,
          colorFn: (a, b, c) => { const cy = centroid(a, b, c)[1]; return jitter(((cy - y) / h) > 0.45 && ((cy - y) / h) < 0.75 ? 0x2b3a52 : 0xf8f8f6, 0.02); },
        });
        y += h;
      }
      addGeo(new THREE.CylinderGeometry(0.0034, 0.0042, 0.009, 8), 0x2f6fb3, { p: L(0, y + 0.0045, 0.022), q, amt: 0.03 });
      addGeo(new THREE.CylinderGeometry(0.0036, 0.0036, 0.0016, 8), 0x1d2c4a, { p: L(0, y + 0.0097, 0.022), q, amt: 0.03 });
      for (let i = 0; i < 5; i++) city(L(0.0080, deck + 0.004, -0.024 + i * 0.013), 0.005);
      city(L(0, y + 0.002, -0.006), 0.005);
    }
    if (wake) {
      const st = L(0, SEA + 0.0004, spec.len / 2);
      for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.0026, 0.0009, spec.len * 0.9);
        const ang = yaw + s * 0.22;
        addGeo(g, 0xe6f3f4, { p: [st[0] + Math.sin(ang) * spec.len * 0.45, SEA + 0.0003, st[2] + Math.cos(ang) * spec.len * 0.45], r: [0, ang, 0], amt: 0.03 });
      }
      const bw = L(0, SEA + 0.0003, -spec.len / 2 + 0.002);
      addGeo(new THREE.BoxGeometry(spec.wd * 1.3, 0.0009, 0.004), 0xe6f3f4, { p: bw, q, amt: 0.03 });
    }
  }

  // =====================================================================
  // 10. MONUMENTOS: CASTILLO, IGLESIAS, MOLINOS, PLAZA
  // =====================================================================
  const CASTLE = { x: -0.187, z: cliffTop(-0.187) - 0.017 };
  castle(CASTLE.x, CASTLE.z);

  const CH = [
    { x: -0.078, d: 0.003, k: 1.0 },
    { x: -0.047, d: 0.031, k: 0.95 },
    { x: 0.162, d: 0.012, k: 1.0 },
  ];
  for (const c of CH) {
    const z = cliffTop(c.x) + c.d;
    church(c.x, z, facingYaw(c.x), c.k);
    reserve(c.x + 0.004, z, 0.024 * c.k, 0.013 * c.k);
  }
  // iglesia mayor en la plaza, detrás de la calle principal
  const PLAZA = { x: 0.035, z: cliffTop(0.035) - 0.082 };
  church(PLAZA.x, PLAZA.z, facingYaw(PLAZA.x), 1.35, { wall: 0xf3e6cf });
  reserve(PLAZA.x + 0.005, PLAZA.z + 0.004, 0.032, 0.022);
  // árboles de sombra en la plaza
  for (const [ox, oz] of [[-0.03, 0.006], [0.04, 0.004]]) {
    const tx = PLAZA.x + ox, tz = PLAZA.z + oz, th = heightAt(tx, tz);
    addRod([tx, th - 0.004, tz], [tx, th + 0.009, tz], 0.0019, 0x6b5238, 5);
    addGeo(new THREE.IcosahedronGeometry(0.0075, 1), 0x4f7a3a, { p: [tx, th + 0.0135, tz], s: [1, 0.8, 1], r: [0, rng() * 3, 0], amt: 0.09 });
    reserve(tx, tz, 0.008, 0.008);
  }

  const MILLS = [[-0.150, -0.072], [-0.112, -0.118], [0.268, -0.108]];
  for (const [mx, md] of MILLS) {
    const z = cliffTop(mx) + md;
    windmill(mx, z, -0.5 + range(-0.2, 0.2));
    reserve(mx, z, 0.016, 0.016);
  }

  // calle principal y escalinatas transversales: sin casas
  for (let x = -0.17; x < 0.315; x += 0.01) reserve(x, cliffTop(x) - 0.044, 0.006, 0.010);
  // faroles cálidos a lo largo de la calle principal de mármol
  for (let x = -0.15; x <= 0.29; x += 0.055) {
    const z = cliffTop(x) - 0.044, h = heightAt(x, z);
    addRod([x, h, z], [x, h + 0.011, z], 0.0012, 0x2d3036, 5);
    addGeo(new THREE.BoxGeometry(0.0024, 0.0026, 0.0024), 0xf6e6b8, { p: [x, h + 0.012, z], amt: 0.02 });
    city([x, h + 0.013, z], 0.0085);
  }
  const LANES = [-0.115, -0.004, 0.106, 0.214];
  for (const lx of LANES) {
    for (let d = -0.03; d < 0.062; d += 0.004) {
      const z = cliffTop(lx) + d;
      reserve(lx, z, 0.0042, 0.0022);
      const h = heightAt(lx, z);
      addGeo(new THREE.BoxGeometry(0.0068, 0.0024, 0.0042), d * 1000 % 8 < 4 ? 0xece6da : 0xdcd4c4,
        { p: [lx, h + 0.0004, z], r: [0, facingYaw(lx), 0], amt: 0.03 });
    }
  }
  // escalinata en zigzag desde la bahía de Ammoudi hasta el castillo
  const ZIG = [
    [-0.222, 0.024], [-0.214, 0.006], [-0.220, -0.012],
    [-0.205, -0.024], [-0.200, -0.005], [-0.188, 0.005],
  ];
  for (let s = 0; s < ZIG.length - 1; s++) {
    const [ax, az] = ZIG[s], [bx, bz] = ZIG[s + 1];
    const steps = 7;
    for (let k = 0; k < steps; k++) {
      const t = (k + 0.5) / steps;
      const sx = ax + (bx - ax) * t, sz = az + (bz - az) * t;
      const sh = Math.max(QUAY.y, heightAt(sx, sz));
      const yaw = Math.atan2(bx - ax, bz - az);
      addGeo(new THREE.BoxGeometry(0.0062, 0.008, 0.0042), (k & 1) ? 0xf2eee6 : 0xded6c6,
        { p: [sx, sh - 0.0025, sz], r: [0, yaw, 0], amt: 0.03 });
      // murete lateral blanco
      addGeo(new THREE.BoxGeometry(0.0014, 0.0032, 0.0042), 0xf6f3ec,
        { p: [sx - Math.cos(yaw) * 0.0030, sh + 0.0020, sz + Math.sin(yaw) * 0.0030], r: [0, yaw, 0], amt: 0.02 });
    }
    if (s % 2 === 1) city([bx, Math.max(QUAY.y, heightAt(bx, bz)) + 0.006, bz], 0.0075);
  }

  // =====================================================================
  // 11. EL PUEBLO EN CASCADA
  // =====================================================================
  const ROWS = [
    { d: -0.066, p: 0.92, light: 0.45, back: false, win: true },
    { d: -0.085, p: 0.86, light: 0.25, back: false, win: true },
    { d: -0.104, p: 0.78, light: 0.15, back: false, win: false },
    { d: -0.123, p: 0.62, light: 0.1, back: true, win: false },
    { d: -0.143, p: 0.45, light: 0.08, back: true, win: false },
    { d: -0.022, p: 0.92, light: 0.35, back: false, win: true, cascade: true },
    { d: -0.005, p: 0.88, light: 0.3, back: false, win: true, cascade: true },
    { d: 0.012, p: 0.84, light: 0.3, back: false, win: true, cascade: true },
    { d: 0.029, p: 0.74, light: 0.25, back: false, win: true, cascade: true },
    { d: 0.046, p: 0.40, light: 0.2, back: false, win: false, cascade: true },
  ];
  for (const row of ROWS) {
    let x = -0.172 + rng() * 0.01;
    while (x < 0.31) {
      const w = range(0.014, 0.025), dp = range(0.0125, 0.0165);
      if (x + w > 0.314) break;
      const cx = x + w / 2, zc = cliffTop(cx) + row.d + range(-0.003, 0.003);
      const ok = cx > westX(zc) + 0.016 && free(cx - w / 2, cx + w / 2, zc - dp / 2, zc + dp / 2);
      if (ok && rng() < row.p) {
        const hgt = rng() < 0.12 ? range(0.019, 0.023) : range(0.011, 0.016);
        const yaw = facingYaw(cx) + range(-0.06, 0.06);
        if (house(cx, zc, w, dp, hgt, yaw, { light: row.light, back: row.back, windows: row.win })) reserve(cx, zc, w / 2 + 0.0008, dp / 2 + 0.0008);
      } else if (ok && row.cascade && rng() < 0.45) {
        poolTerrace(cx, zc, w, dp, facingYaw(cx));
        reserve(cx, zc, w / 2 + 0.0008, dp / 2 + 0.0008);
      }
      x += w + range(0.0015, 0.0045);
    }
  }
  // caseríos dispersos en la ladera norte
  for (let n = 0, tries = 0; n < 34 && tries < 400; tries++) {
    const px = range(-0.17, 0.30), d = range(-0.205, -0.16), pz = cliffTop(px) + d;
    const w = range(0.013, 0.02), dp = range(0.012, 0.015);
    if (px < westX(pz) + 0.02 || pz < Z0 + 0.012 || heightAt(px, pz) < 0.014) continue;
    if (!free(px - w / 2 - 0.002, px + w / 2 + 0.002, pz - dp / 2 - 0.002, pz + dp / 2 + 0.002)) continue;
    if (house(px, pz, w, dp, range(0.010, 0.014), range(-0.25, 0.25), { back: true, light: 0.3 })) { reserve(px, pz, w / 2 + 0.002, dp / 2 + 0.002); n++; }
  }
  // viñedos en "kouloura" (cepas enroscadas a ras del suelo)
  for (let x = X0 + 0.012; x < X1 - 0.008; x += 0.0105) for (let z = Z0 + 0.012; z < 0.0; z += 0.0105) {
    const px = x + range(-0.003, 0.003), pz = z + range(-0.003, 0.003);
    if (pz - cliffTop(px) > -0.152 || px < westX(pz) + 0.012) continue;
    const h = heightAt(px, pz);
    if (h < 0.011 || rng() > 0.62) continue;
    if (!free(px - 0.004, px + 0.004, pz - 0.004, pz + 0.004)) continue;
    addGeo(new THREE.IcosahedronGeometry(0.0034, 0), pick(VINE), { p: [px, h + 0.0006, pz], s: [1, 0.55, 1], r: [0, rng() * 3, 0], amt: 0.09 });
  }
  // higueras chumberas sueltas en los bordes
  for (let n = 0, tries = 0; n < 14 && tries < 200; tries++) {
    const px = range(-0.18, 0.31), pz = cliffTop(px) + range(-0.2, -0.06), h = heightAt(px, pz);
    if (h < 0.015 || !free(px - 0.005, px + 0.005, pz - 0.005, pz + 0.005)) continue;
    for (let k = 0; k < 3; k++) addGeo(new THREE.IcosahedronGeometry(0.0032, 0), 0x6f8f4a,
      { p: [px + range(-0.003, 0.003), h + 0.003 + k * 0.0025, pz + range(-0.003, 0.003)], s: [1, 1.2, 0.45], r: [0, rng() * 3, 0], amt: 0.08 });
    reserve(px, pz, 0.005, 0.005); n++;
  }

  // =====================================================================
  // 12. BAHÍA DE AMMOUDI: TABERNAS, MESAS, BARCAS E ISLOTE
  // =====================================================================
  const TAV = [0.034, 0.058, 0.082, 0.106];
  TAV.forEach((tz, i) => {
    const tx = -0.250 + range(-0.002, 0.002);
    const r = house(tx, tz, 0.019, 0.012, 0.012, -Math.PI / 2, { floor: QUAY.y, wall: pick(WHITE), roof: 'flat', door: pick([0x2c6db4, 0x3a8bd0]), flowers: false });
    const L = loc(tx, tz, -Math.PI / 2), q = qYXZ(0, -Math.PI / 2);
    addGeo(new THREE.BoxGeometry(0.018, 0.0012, 0.009), i & 1 ? 0x2c6db4 : 0xf2efe8, { p: L(0, QUAY.y + 0.0105, 0.0105), q, amt: 0.03 });
    for (const s of [-1, 1]) addRod(L(s * 0.0082, QUAY.y, 0.0145), L(s * 0.0082, QUAY.y + 0.0102, 0.0145), 0.0012, 0x5a3e28, 4);
    for (const s of [-0.006, 0.0, 0.006]) {
      const tp = L(s, QUAY.y + 0.0016, 0.018 + range(-0.001, 0.001));
      addGeo(new THREE.BoxGeometry(0.0034, 0.0032, 0.0034), pick([0x3a7fc4, 0xf0ede6]), { p: tp, q, amt: 0.03 });
    }
    city(L(0, QUAY.y + 0.0095, 0.012), 0.0075);
    if (i === 1 && r) {
      const cp = L(0.006, r.ytop + 0.004, -0.002);
      addGeo(new THREE.BoxGeometry(0.0032, 0.007, 0.0032), 0xf4f1ea, { p: cp, q, amt: 0.02 });
      features.push({ type: 'smoke', pos: [cp[0], cp[1] + 0.005, cp[2]], size: 0.0062 });
    }
  });
  // bolardos del muelle
  for (let z = 0.028; z < 0.13; z += 0.016) addGeo(new THREE.CylinderGeometry(0.0016, 0.0019, 0.0035, 6), 0x3a3a3a,
    { p: [QUAY.x0 + 0.003, QUAY.y + 0.0017, z], amt: 0.03 });
  // barcas amarradas
  for (const bz of [0.036, 0.062, 0.088, 0.114]) boat(QUAY.x0 - 0.007, bz + range(-0.003, 0.003), -Math.PI / 2 + range(-0.15, 0.15), 'caique');
  boat(-0.243, 0.158, 0.9, 'caique');
  boat(-0.200, 0.180, -1.2, 'caique', true);
  // capilla del islote
  church(ISLET.x + 0.002, ISLET.z - 0.002, 0.4, 0.55, { belfry: false });

  // rocas volcánicas en la orilla y alrededor del islote
  for (const [rx, rz, rr] of [
    [-0.295, 0.165, 0.0065], [-0.288, 0.198, 0.0052], [-0.245, 0.195, 0.0048],
    [-0.175, 0.125, 0.0062], [-0.085, 0.132, 0.0055], [0.065, 0.128, 0.0058], [0.245, 0.132, 0.0060],
  ]) {
    addGeo(new THREE.IcosahedronGeometry(rr, 0), pick([0x4a3a35, 0x3b3431, 0x6b3224]),
      { p: [rx, SEA + rr * 0.15, rz], s: [1.3, 0.65, 1.1], r: [rng() * 2, rng() * 3, 0], amt: 0.08 });
  }

  // barcos de la caldera
  boat(0.045, 0.186, 0.55, 'yacht', true);
  boat(-0.110, 0.192, -2.05, 'tour', true);
  boat(0.235, 0.184, 1.35, 'ship');
  boat(0.135, 0.150, -0.4, 'caique', true);

  // =====================================================================
  // 13. EFECTOS VIVOS
  // =====================================================================
  for (let n = 0, tries = 0; n < 46 && tries < 600; tries++) {
    const x = range(X0 + 0.01, X1 - 0.01), z = range(Z0 + 0.01, Z1 - 0.01);
    if (heightAt(x, z) > -0.012) continue;
    features.push({ type: 'sparkle', pos: [x, SEA + 0.002, z], size: 0.0095 }); n++;
  }
  features.push({ type: 'gulls', pos: [-0.04, 0.215, 0.12], size: 0.10 });
  features.push({ type: 'gulls', pos: [-0.25, 0.08, 0.10], size: 0.05 });
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.6, r = 0.24 + rng() * 0.05, cy = 0.27 + rng() * 0.04;
    features.push({ type: 'cloud', pos: [Math.cos(a) * r, cy, Math.sin(a) * r * 0.7], center: [0, cy, 0], size: 0.026 + rng() * 0.01 });
  }

  return finish('Oia — Santorini');
}
