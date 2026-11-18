#!/usr/bin/env node
// Exporta los dioramas hechos por código a archivos .glb estándar (más un .json con sus efectos),
// para poder llevarlos a otro motor (Unity, Godot, Unreal, Blender…) si algún día migramos.
//
//   node tools/exportar-modelos.mjs            -> todos, en la carpeta exportados/
//   node tools/exportar-modelos.mjs faro globo -> solo esos
//
// El .glb trae la geometría con el color de cada triángulo (colores por vértice, sin texturas),
// centrada en el origen y al tamaño del juego (50 cm de ancho, en metros). Las normales no se
// guardan: los visores calculan normales planas, que es justo el aspecto low-poly del juego.
// El .json trae nombre, tema musical y la lista de efectos vivos (tipo, posición y medidas).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { DIORAMAS } = await import(join(ROOT, 'js/dioramas/index.js'));
const OUT = join(ROOT, 'exportados');
const TARGET_W = 0.5, MAX_H = 0.62; // igual que normalizeModel() en js/loader.js

// Centra y escala como el juego, para que el .glb mida lo mismo que en el visor.
function normalize(m) {
  const P = m.positions, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i + k]); max[k] = Math.max(max[k], P[i + k]); }
  const ext = [0, 1, 2].map((k) => max[k] - min[k]);
  const s = Math.min(TARGET_W / Math.max(ext[0], ext[2], 1e-9), MAX_H / Math.max(ext[1], 1e-9));
  const c = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
  const pos = new Float32Array(P.length);
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = (P[i + k] - c[k]) * s;
  const features = (m.features || []).map((f) => {
    const g = { ...f, pos: f.pos.map((v, k) => (v - c[k]) * s) };
    if (f.center) g.center = f.center.map((v, k) => (v - c[k]) * s);
    for (const key of ['size', 'w', 'h']) if (typeof f[key] === 'number') g[key] = f[key] * s;
    return g;
  });
  return { pos, size: ext.map((e) => e * s), features };
}

function glb(pos, triColors) {
  const nV = pos.length / 3;
  const col = new Uint16Array(nV * 4); // RGBA normalizado de 16 bits: sin bandas en los tonos oscuros
  for (let v = 0; v < nV; v++) {
    const t = Math.floor(v / 3);
    for (let k = 0; k < 3; k++) col[v * 4 + k] = Math.round(Math.min(1, Math.max(0, triColors[t * 3 + k])) * 65535);
    col[v * 4 + 3] = 65535;
  }
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pos[i + k]); max[k] = Math.max(max[k], pos[i + k]); }
  const bin = Buffer.concat([Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength), Buffer.from(col.buffer)]);
  const json = {
    asset: { version: '2.0', generator: 'Tiny Worlds VR — tools/exportar-modelos.mjs' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'diorama' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 }, material: 0 }] }],
    materials: [{ name: 'colores', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength, byteLength: col.byteLength, target: 34962 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: nV, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5123, normalized: true, count: nV, type: 'VEC4' },
    ],
  };
  let js = Buffer.from(JSON.stringify(json));
  if (js.length % 4) js = Buffer.concat([js, Buffer.alloc(4 - (js.length % 4), 0x20)]);
  const pad = (4 - (bin.length % 4)) % 4, b = Buffer.concat([bin, Buffer.alloc(pad)]);
  const header = Buffer.alloc(12); header.write('glTF', 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + js.length + 8 + b.length, 8);
  const ch = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.write(type, 4); return h; };
  return Buffer.concat([header, ch(js.length, 'JSON'), js, ch(b.length, 'BIN\0'), b]);
}

const wanted = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
for (const d of DIORAMAS) {
  if (wanted.length && !wanted.includes(d.id)) continue;
  const m = d.build();
  const n = normalize(m);
  const file = join(OUT, `${d.id}.glb`);
  writeFileSync(file, glb(n.pos, m.colors));
  writeFileSync(join(OUT, `${d.id}.json`), JSON.stringify({
    id: d.id, name: d.name, music: d.music || null, triangles: n.pos.length / 9,
    sizeMeters: n.size.map((x) => +x.toFixed(4)), units: 'metros, centrado en el origen, Y hacia arriba, frente hacia +Z',
    features: n.features,
  }, null, 1));
  console.log(`${d.id}: ${n.pos.length / 9} triángulos, ${n.features.length} efectos -> exportados/${d.id}.glb`);
}
