// Corta una sopa de triángulos en piezas 3D usando celdas de Voronoi.
// El modelo trae posiciones (9 por triángulo) y un color por triángulo; opcionalmente
// normales (9), coordenadas de textura (6) y un índice de material por triángulo.
// Cada triángulo se recorta contra los planos bisectores de las semillas,
// así los cortes quedan limpios y las piezas encajan exactamente.
import { mulberry32 } from './dioramas/builder.js';

export function slice(model, count, seed) {
  const rng = mulberry32(seed);
  const P = model.positions, C = model.colors;
  const UV = model.uvs || null, NR = model.normals || null, MT = model.mats || null;
  const nTri = P.length / 9;
  const ST = 8; // por vértice: x y z | u v | nx ny nz

  // --- semillas: muestreo ponderado por área + "farthest point sampling" ---
  const areas = new Float64Array(nTri);
  let total = 0;
  for (let t = 0; t < nTri; t++) {
    const i = t * 9;
    const ux = P[i + 3] - P[i], uy = P[i + 4] - P[i + 1], uz = P[i + 5] - P[i + 2];
    const vx = P[i + 6] - P[i], vy = P[i + 7] - P[i + 1], vz = P[i + 8] - P[i + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    areas[t] = 0.5 * Math.hypot(cx, cy, cz);
    total += areas[t];
  }
  const NC = 5000;
  const cand = new Float32Array(NC * 3);
  {
    // muestreo estratificado sobre el área acumulada
    let t = 0, acc = areas[0];
    for (let k = 0; k < NC; k++) {
      const target = (k + rng()) / NC * total;
      while (acc < target && t < nTri - 1) { t++; acc += areas[t]; }
      let a = rng(), b = rng();
      if (a + b > 1) { a = 1 - a; b = 1 - b; }
      const i = t * 9;
      for (let d = 0; d < 3; d++) {
        cand[k * 3 + d] = P[i + d] + a * (P[i + 3 + d] - P[i + d]) + b * (P[i + 6 + d] - P[i + d]);
      }
    }
  }
  const seeds = new Float32Array(count * 3);
  {
    const minD = new Float32Array(NC).fill(Infinity);
    let pick = Math.floor(rng() * NC);
    for (let s = 0; s < count; s++) {
      const sx = cand[pick * 3], sy = cand[pick * 3 + 1], sz = cand[pick * 3 + 2];
      seeds[s * 3] = sx; seeds[s * 3 + 1] = sy; seeds[s * 3 + 2] = sz;
      let best = -1, bestD = -1;
      for (let k = 0; k < NC; k++) {
        const dx = cand[k * 3] - sx, dy = cand[k * 3 + 1] - sy, dz = cand[k * 3 + 2] - sz;
        // la altura pesa menos: piezas algo más "columnares" y variadas
        const d = dx * dx + dy * dy * 0.8 + dz * dz;
        if (d < minD[k]) minD[k] = d;
        // un poco de azar para que las piezas no sean todas iguales
        const score = minD[k] * (0.75 + 0.5 * rng());
        if (score > bestD) { bestD = score; best = k; }
      }
      pick = best;
    }
  }

  // --- recorte ---
  const out = Array.from({ length: count }, () => new Map()); // material -> {pos, col, nrm, uv}
  const bucket = (cell, mat) => {
    let b = out[cell].get(mat);
    if (!b) { b = { pos: [], col: [], nrm: [], uv: [] }; out[cell].set(mat, b); }
    return b;
  };
  const distC = new Float64Array(count);
  let poly = new Float64Array(512 * ST), poly2 = new Float64Array(512 * ST);
  const tri = new Float64Array(3 * ST);

  for (let t = 0; t < nTri; t++) {
    const i = t * 9;
    const cx = (P[i] + P[i + 3] + P[i + 6]) / 3, cy = (P[i + 1] + P[i + 4] + P[i + 7]) / 3, cz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
    let rad = 0;
    for (let v = 0; v < 3; v++) {
      rad = Math.max(rad, Math.hypot(P[i + v * 3] - cx, P[i + v * 3 + 1] - cy, P[i + v * 3 + 2] - cz));
    }
    let dmin = Infinity;
    for (let s = 0; s < count; s++) {
      distC[s] = Math.hypot(seeds[s * 3] - cx, seeds[s * 3 + 1] - cy, seeds[s * 3 + 2] - cz);
      if (distC[s] < dmin) dmin = distC[s];
    }
    const lim = dmin + 2 * rad + 1e-9;
    const cands = [];
    for (let s = 0; s < count; s++) if (distC[s] <= lim) cands.push(s);

    // normal de la cara
    const ux = P[i + 3] - P[i], uy = P[i + 4] - P[i + 1], uz = P[i + 5] - P[i + 2];
    const vx = P[i + 6] - P[i], vy = P[i + 7] - P[i + 1], vz = P[i + 8] - P[i + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    const r = C[t * 3], g = C[t * 3 + 1], b = C[t * 3 + 2];
    const mat = MT ? MT[t] : 0;
    for (let v = 0; v < 3; v++) {
      const o = v * ST;
      tri[o] = P[i + v * 3]; tri[o + 1] = P[i + v * 3 + 1]; tri[o + 2] = P[i + v * 3 + 2];
      if (UV) { tri[o + 3] = UV[t * 6 + v * 2]; tri[o + 4] = UV[t * 6 + v * 2 + 1]; }
      if (NR) { tri[o + 5] = NR[i + v * 3]; tri[o + 6] = NR[i + v * 3 + 1]; tri[o + 7] = NR[i + v * 3 + 2]; }
      else { tri[o + 5] = nx; tri[o + 6] = ny; tri[o + 7] = nz; }
    }

    for (const a of cands) {
      let n = 3;
      poly.set(tri);
      const ax = seeds[a * 3], ay = seeds[a * 3 + 1], az = seeds[a * 3 + 2];
      for (const o of cands) {
        if (o === a || n === 0) continue;
        // semiespacio más cercano a "a" que a "o"
        const px = seeds[o * 3] - ax, py = seeds[o * 3 + 1] - ay, pz = seeds[o * 3 + 2] - az;
        const off = px * (ax + px / 2) + py * (ay + py / 2) + pz * (az + pz / 2);
        let m = 0;
        let jb = (n - 1) * ST;
        let dj = px * poly[jb] + py * poly[jb + 1] + pz * poly[jb + 2] - off;
        for (let k = 0; k < n; k++) {
          const kb = k * ST;
          const dk = px * poly[kb] + py * poly[kb + 1] + pz * poly[kb + 2] - off;
          if ((dj <= 0) !== (dk <= 0)) {
            const f = dj / (dj - dk), mb = m * ST;
            for (let c = 0; c < ST; c++) poly2[mb + c] = poly[jb + c] + (poly[kb + c] - poly[jb + c]) * f;
            m++;
          }
          if (dk <= 0) { const mb = m * ST; for (let c = 0; c < ST; c++) poly2[mb + c] = poly[kb + c]; m++; }
          jb = kb; dj = dk;
        }
        const tmp = poly; poly = poly2; poly2 = tmp;
        n = m;
      }
      if (n < 3) continue;
      const O = bucket(a, mat);
      for (let k = 1; k < n - 1; k++) {
        const b1 = k * ST, b2 = (k + 1) * ST;
        const e1x = poly[b1] - poly[0], e1y = poly[b1 + 1] - poly[1], e1z = poly[b1 + 2] - poly[2];
        const e2x = poly[b2] - poly[0], e2y = poly[b2 + 1] - poly[1], e2z = poly[b2 + 2] - poly[2];
        const ar = Math.hypot(e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x);
        if (ar < 1e-10) continue;
        for (const base of [0, b1, b2]) {
          O.pos.push(poly[base], poly[base + 1], poly[base + 2]);
          O.uv.push(poly[base + 3], poly[base + 4]);
          O.nrm.push(poly[base + 5], poly[base + 6], poly[base + 7]);
          O.col.push(r, g, b);
        }
      }
    }
  }

  // --- descartar celdas vacías y reindexar ---
  const keep = [];
  for (let s = 0; s < count; s++) if (out[s].size) keep.push(s);
  const pieces = keep.map((s, id) => {
    // se concatenan los materiales de la celda, anotando el tramo de cada uno
    const mats = [...out[s].keys()].sort((x, y) => x - y);
    let nVerts = 0;
    for (const m of mats) nVerts += out[s].get(m).pos.length / 3;
    const pos = new Float32Array(nVerts * 3), col = new Float32Array(nVerts * 3), nrm = new Float32Array(nVerts * 3);
    const uv = UV ? new Float32Array(nVerts * 2) : null;
    const groups = [];
    let at = 0;
    for (const m of mats) {
      const b = out[s].get(m), n = b.pos.length / 3;
      pos.set(b.pos, at * 3); col.set(b.col, at * 3); nrm.set(b.nrm, at * 3);
      if (uv) uv.set(b.uv, at * 2);
      groups.push({ mat: m, start: at, count: n });
      at += n;
    }
    out[s] = null;
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < pos.length; k += 3) { cx += pos[k]; cy += pos[k + 1]; cz += pos[k + 2]; }
    const nv = pos.length / 3;
    cx /= nv; cy /= nv; cz /= nv;
    let rad = 0;
    for (let k = 0; k < pos.length; k += 3) rad = Math.max(rad, Math.hypot(pos[k] - cx, pos[k + 1] - cy, pos[k + 2] - cz));
    return { id, seed: s, seedPos: [seeds[s * 3], seeds[s * 3 + 1], seeds[s * 3 + 2]], positions: pos, colors: col, normals: nrm, uvs: uv, groups, centroid: [cx, cy, cz], radius: rad, neighbors: new Map() };
  });

  // --- adyacencia: vértices que caen sobre el plano bisector entre dos celdas ---
  const acc = new Map(); // "i|j" (i<j) -> {ci, cj, x, y, z}
  for (const A of pieces) {
    const a = A.seed;
    const ax = seeds[a * 3], ay = seeds[a * 3 + 1], az = seeds[a * 3 + 2];
    for (const B of pieces) {
      if (B === A) continue;
      const o = B.seed;
      let px = seeds[o * 3] - ax, py = seeds[o * 3 + 1] - ay, pz = seeds[o * 3 + 2] - az;
      const L = Math.hypot(px, py, pz);
      if (L > 4 * A.radius + 1e-6) continue;
      px /= L; py /= L; pz /= L;
      const off = px * ax + py * ay + pz * az + L / 2;
      const pos = A.positions;
      let n = 0, sx = 0, sy = 0, sz = 0;
      for (let k = 0; k < pos.length; k += 3) {
        if (Math.abs(px * pos[k] + py * pos[k + 1] + pz * pos[k + 2] - off) < 2e-5) { n++; sx += pos[k]; sy += pos[k + 1]; sz += pos[k + 2]; }
      }
      if (n < 2) continue;
      const key = A.id < B.id ? A.id + '|' + B.id : B.id + '|' + A.id;
      let e = acc.get(key);
      if (!e) { e = { i: Math.min(A.id, B.id), j: Math.max(A.id, B.id), sides: 0, n: 0, x: 0, y: 0, z: 0 }; acc.set(key, e); }
      e.sides++; e.n += n; e.x += sx; e.y += sy; e.z += sz;
    }
  }
  for (const e of acc.values()) {
    if (e.sides < 2) continue;
    const anchor = [e.x / e.n, e.y / e.n, e.z / e.n];
    pieces[e.i].neighbors.set(e.j, anchor);
    pieces[e.j].neighbors.set(e.i, anchor);
  }

  // --- garantizar que el grafo sea conexo (ninguna pieza queda huérfana) ---
  const comp = new Int32Array(pieces.length).fill(-1);
  const label = () => {
    comp.fill(-1);
    let c = 0;
    for (const p of pieces) {
      if (comp[p.id] !== -1) continue;
      const stack = [p.id]; comp[p.id] = c;
      while (stack.length) {
        const q = pieces[stack.pop()];
        for (const j of q.neighbors.keys()) if (comp[j] === -1) { comp[j] = c; stack.push(j); }
      }
      c++;
    }
    return c;
  };
  let guard = 0;
  while (label() > 1 && guard++ < pieces.length) {
    let best = null, bd = Infinity;
    for (const A of pieces) for (const B of pieces) {
      if (comp[A.id] !== 0 || comp[B.id] === 0) continue;
      const d = Math.hypot(A.centroid[0] - B.centroid[0], A.centroid[1] - B.centroid[1], A.centroid[2] - B.centroid[2]);
      if (d < bd) { bd = d; best = [A, B]; }
    }
    const [A, B] = best;
    const anchor = [0, 1, 2].map((k) => (A.centroid[k] + B.centroid[k]) / 2);
    A.neighbors.set(B.id, anchor); B.neighbors.set(A.id, anchor);
  }

  return pieces;
}
