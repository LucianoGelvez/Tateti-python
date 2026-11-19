// Simplificación por agrupamiento de vértices ("vertex clustering").
// Se divide el espacio en cubitos de lado `cell`; todos los vértices que caen en el mismo cubito se
// funden en uno (su promedio). Los triángulos que quedan sin área desaparecen y los repetidos se
// quitan. No abre agujeros en terrenos ni superficies (a diferencia de borrar triángulos chicos) y
// cada triángulo conserva su color. Sirve para la miniatura de referencia y para bajar el detalle.
//
// model: { positions (9 por triángulo), colors (3 por triángulo), mats?, normals?, uvs? }
// Devuelve un modelo con el mismo formato (y los mismos campos extra: materials, features, size…).
export function clusterSimplify(model, cell) {
  const P = model.positions, nT = P.length / 9, inv = 1 / cell;
  const ids = new Int32Array(nT * 3);
  const map = new Map();
  let sum = new Float64Array(3 * 4096), cnt = new Uint32Array(4096), nC = 0;
  for (let v = 0; v < nT * 3; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    // clave numérica (13 bits por eje alcanzan para modelos de hasta ~8000 celdas de lado)
    const key = ((Math.floor(x * inv) + 4096) * 8192 + (Math.floor(y * inv) + 4096)) * 8192 + (Math.floor(z * inv) + 4096);
    let id = map.get(key);
    if (id === undefined) {
      id = nC++; map.set(key, id);
      if (nC > cnt.length) {
        const s2 = new Float64Array(sum.length * 2); s2.set(sum); sum = s2;
        const c2 = new Uint32Array(cnt.length * 2); c2.set(cnt); cnt = c2;
      }
    }
    sum[id * 3] += x; sum[id * 3 + 1] += y; sum[id * 3 + 2] += z; cnt[id]++;
    ids[v] = id;
  }
  const keep = [], seen = new Set();
  for (let t = 0; t < nT; t++) {
    const a = ids[t * 3], b = ids[t * 3 + 1], c = ids[t * 3 + 2];
    if (a === b || b === c || a === c) continue;
    // mismo triángulo con la misma orientación: se queda uno (las dos caras de una pared fina se conservan)
    const k = a < b && a < c ? `${a},${b},${c}` : b < c ? `${b},${c},${a}` : `${c},${a},${b}`;
    if (seen.has(k)) continue;
    seen.add(k);
    keep.push(t);
  }
  const n = keep.length;
  const pos = new Float32Array(n * 9), col = new Float32Array(n * 3);
  const mats = model.mats ? new Uint16Array(n) : null;
  const nrm = model.normals ? new Float32Array(n * 9) : null;
  const uvs = model.uvs ? new Float32Array(n * 6) : null;
  keep.forEach((t, j) => {
    for (let v = 0; v < 3; v++) {
      const id = ids[t * 3 + v], c = cnt[id];
      pos[j * 9 + v * 3] = sum[id * 3] / c; pos[j * 9 + v * 3 + 1] = sum[id * 3 + 1] / c; pos[j * 9 + v * 3 + 2] = sum[id * 3 + 2] / c;
      if (nrm) for (let k = 0; k < 3; k++) nrm[j * 9 + v * 3 + k] = model.normals[t * 9 + v * 3 + k];
      if (uvs) { uvs[j * 6 + v * 2] = model.uvs[t * 6 + v * 2]; uvs[j * 6 + v * 2 + 1] = model.uvs[t * 6 + v * 2 + 1]; }
    }
    col[j * 3] = model.colors[t * 3]; col[j * 3 + 1] = model.colors[t * 3 + 1]; col[j * 3 + 2] = model.colors[t * 3 + 2];
    if (mats) mats[j] = model.mats[t];
  });
  return { ...model, positions: pos, colors: col, mats, normals: nrm, uvs };
}
