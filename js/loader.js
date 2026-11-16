// Carga un modelo glTF / GLB y lo convierte en la "sopa de triángulos" que usa el cortador:
// posiciones, normales, coordenadas de textura, un color y un material por triángulo.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from './vendor/addons/libs/meshopt_decoder.module.js';

export const MAX_TRIS = 700000;   // por encima de esto el visor no da abasto
export const TARGET_SIZE = 0.5;   // ancho del diorama en metros
const MAX_HEIGHT = 0.62;

let gltfLoader = null;
function getLoader() {
  if (gltfLoader) return gltfLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath(new URL('./vendor/addons/libs/draco/', import.meta.url).href);
  gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  return gltfLoader;
}

// Centra el modelo en el origen y lo escala al tamaño de juego.
export function normalizeModel(model) {
  const P = model.positions;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
    if (P[i + k] < min[k]) min[k] = P[i + k];
    if (P[i + k] > max[k]) max[k] = P[i + k];
  }
  const ext = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const s = Math.min(TARGET_SIZE / Math.max(ext[0], ext[2], 1e-9), MAX_HEIGHT / Math.max(ext[1], 1e-9));
  const c = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) P[i + k] = (P[i + k] - c[k]) * s;
  model.size = ext.map((e) => e * s);
  // los puntos con efectos se mueven junto con el modelo
  for (const f of model.features || []) {
    f.pos = f.pos.map((v, k) => (v - c[k]) * s);
    if (f.center) f.center = f.center.map((v, k) => (v - c[k]) * s);
    for (const key of ['size', 'w', 'h']) if (f[key]) f[key] *= s;
  }
  return model;
}

// Las texturas enormes se reducen: en el visor la memoria de vídeo es limitada.
function shrinkTexture(tex, maxSize) {
  const img = tex.image;
  if (!img || !img.width || Math.max(img.width, img.height) <= maxSize) return;
  const k = maxSize / Math.max(img.width, img.height);
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * k));
  cv.height = Math.max(1, Math.round(img.height * k));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  if (img.close) img.close();
  tex.image = cv;
  tex.needsUpdate = true;
}

export async function loadGLB(url, name, { maxTexture = 2048 } = {}) {
  const gltf = await getLoader().loadAsync(url);
  const root = gltf.scene || gltf.scenes[0];
  root.updateMatrixWorld(true);

  const meshes = [];
  let nTri = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || o.visible === false) return;
    const g = o.geometry;
    nTri += (g.index ? g.index.count : g.attributes.position.count) / 3;
    meshes.push(o);
  });
  nTri = Math.floor(nTri);
  if (!nTri) throw new Error('El archivo no contiene mallas.');
  if (nTri > MAX_TRIS) {
    throw new Error(`El modelo tiene ${Math.round(nTri / 1000)} mil triángulos; el máximo es ${MAX_TRIS / 1000} mil. Descarga una versión más liviana o simplifícalo.`);
  }

  // Sketchfab antiguo: materiales "specular-glossiness", que three.js ya no interpreta.
  const json = gltf.parser.json;
  const legacyDiffuse = async (mat) => {
    const assoc = gltf.parser.associations.get(mat);
    const def = assoc && json.materials && json.materials[assoc.materials];
    const sg = def && def.extensions && def.extensions.KHR_materials_pbrSpecularGlossiness;
    if (!sg) return;
    if (sg.diffuseFactor) mat.color.setRGB(sg.diffuseFactor[0], sg.diffuseFactor[1], sg.diffuseFactor[2]);
    if (sg.diffuseTexture) {
      const tex = await gltf.parser.getDependency('texture', sg.diffuseTexture.index);
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
    }
  };

  const matIndex = new Map();
  const materials = [];
  const srcMats = [];
  const indexOf = (mat) => {
    let i = matIndex.get(mat);
    if (i === undefined) { i = materials.length; matIndex.set(mat, i); materials.push(null); srcMats.push(mat); }
    return i;
  };

  const positions = new Float32Array(nTri * 9), normals = new Float32Array(nTri * 9);
  const uvs = new Float32Array(nTri * 6), colors = new Float32Array(nTri * 3), mats = new Uint16Array(nTri);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let t = 0, anyUV = false;

  for (const mesh of meshes) for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) indexOf(m);
  for (const m of srcMats) if (!m.map) await legacyDiffuse(m);

  for (const mesh of meshes) {
    let g = mesh.geometry;
    if (!g.attributes.normal) { g = g.clone(); g.computeVertexNormals(); }
    const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, idx = g.index;
    const count = Math.floor((idx ? idx.count : pos.count) / 3);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const groups = Array.isArray(mesh.material) && g.groups.length ? g.groups : [{ start: 0, count: count * 3, materialIndex: 0 }];
    nm.getNormalMatrix(mesh.matrixWorld);
    const flip = mesh.matrixWorld.determinant() < 0; // escala negativa: invertir el sentido del triángulo
    for (const grp of groups) {
      const mat = list[grp.materialIndex] || list[0];
      const mi = indexOf(mat);
      const uvAttr = g.attributes[mat.map && mat.map.channel ? 'uv' + mat.map.channel : 'uv'] || g.attributes.uv;
      if (uvAttr) anyUV = true;
      const end = Math.min(grp.start + grp.count, count * 3);
      for (let k = grp.start; k + 2 < end; k += 3) {
        let cr = 0, cg = 0, cb = 0;
        for (let c = 0; c < 3; c++) {
          const src = idx ? idx.getX(k + (flip ? 2 - c : c)) : k + (flip ? 2 - c : c);
          v.fromBufferAttribute(pos, src).applyMatrix4(mesh.matrixWorld);
          n.fromBufferAttribute(nor, src).applyMatrix3(nm).normalize();
          positions[t * 9 + c * 3] = v.x; positions[t * 9 + c * 3 + 1] = v.y; positions[t * 9 + c * 3 + 2] = v.z;
          normals[t * 9 + c * 3] = n.x; normals[t * 9 + c * 3 + 1] = n.y; normals[t * 9 + c * 3 + 2] = n.z;
          if (uvAttr) { uvs[t * 6 + c * 2] = uvAttr.getX(src); uvs[t * 6 + c * 2 + 1] = uvAttr.getY(src); }
          if (col) { cr += col.getX(src) / 3; cg += col.getY(src) / 3; cb += col.getZ(src) / 3; }
        }
        const base = mat.color || { r: 1, g: 1, b: 1 };
        if (!col || !mat.vertexColors) { cr = cg = cb = 1; }
        colors[t * 3] = cr * base.r; colors[t * 3 + 1] = cg * base.g; colors[t * 3 + 2] = cb * base.b;
        mats[t] = mi;
        t++;
      }
    }
  }

  for (let i = 0; i < srcMats.length; i++) {
    const m = srcMats[i];
    if (m.map) {
      m.map.channel = 0;
      shrinkTexture(m.map, maxTexture);
    }
    materials[i] = {
      map: m.map || null,
      doubleSided: m.side === THREE.DoubleSide,
      alphaTest: m.alphaTest > 0 ? m.alphaTest : (m.transparent && m.map ? 0.5 : 0),
    };
  }

  const model = {
    name,
    positions: t === nTri ? positions : positions.slice(0, t * 9),
    normals: t === nTri ? normals : normals.slice(0, t * 9),
    uvs: anyUV ? (t === nTri ? uvs : uvs.slice(0, t * 6)) : null,
    colors: t === nTri ? colors : colors.slice(0, t * 3),
    mats: t === nTri ? mats : mats.slice(0, t),
    materials,
    triangles: t,
    dispose() { for (const m of materials) if (m && m.map) m.map.dispose(); },
  };
  return normalizeModel(model);
}
