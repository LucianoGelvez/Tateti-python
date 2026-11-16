// Plantilla de diorama: copiar a js/dioramas/<id>.js, renombrar buildPlantilla y adaptar.
// Muestra el esqueleto mínimo: una base, un edificio bien apoyado, vegetación y efectos vivos.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildPlantilla(seed = 21) {
  const { rng, fbm, features, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);

  // --- base: un peñón redondo, más ancho arriba, con la cima casi plana ---
  // Toda la escena se apoya sobre una base: le da cuerpo a las piezas y evita partes en el aire.
  const R = 0.3;                                   // radio de la base (el juego reescala todo después)
  const top = (x, z) => {                          // altura del suelo en cada punto
    const d = Math.hypot(x, z) / R;
    return 0.02 * smooth(1.6 - d * 1.6) + (fbm(x * 12, z * 12) - 0.5) * 0.02 * smooth(d * 3 - 1.2);
  };
  {
    const K = 10, S = 40, UP = new THREE.Vector3(0, 1, 0);
    const P = (k, s) => {
      const r = R * k / K, a = (s + (k % 2) * 0.5) / S * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      return new THREE.Vector3(x, top(x, z), z);
    };
    for (let k = 0; k < K; k++) for (let s = 0; s < S; s++) {
      const a = P(k, s), b = P(k + 1, s), c = P(k + 1, s + 1), d = P(k, s + 1);
      const green = () => jitter(rng() < 0.5 ? 0x79b25e : 0x86bd66, 0.07);
      if (k > 0) addTri(a, b, d, green(), UP);
      addTri(b, c, d, green(), UP);
    }
    // costado de roca: un tronco de cono cerrado por abajo, hundido 1 cm bajo el borde del césped
    addGeo(new THREE.CylinderGeometry(R, R * 0.55, 0.16, S, 2, false), 0x8d8a86, { p: [0, -0.09, 0], amt: 0.09 });
  }

  // --- torre: los cimientos se hunden en el suelo para que nunca quede flotando ---
  const tx = 0.05, tz = -0.03, ty = top(tx, tz);
  addGeo(new THREE.CylinderGeometry(0.062, 0.066, 0.03, 10), 0x8f8b86, { p: [tx, ty - 0.004, tz], amt: 0.08 });
  addGeo(new THREE.CylinderGeometry(0.05, 0.056, 0.2, 10, 1, true), 0xe9dfcc, { p: [tx, ty + 0.11, tz], amt: 0.04 });
  addGeo(new THREE.ConeGeometry(0.066, 0.09, 10), 0xb8442f, { p: [tx, ty + 0.255, tz], amt: 0.06 });
  // puerta y ventana: cajas que sobresalen 2 mm; un plano suelto no se vería bien al cortar
  addGeo(new THREE.BoxGeometry(0.026, 0.045, 0.006), 0x6b4428, { p: [tx, ty + 0.033, tz + 0.054] });
  addGeo(new THREE.BoxGeometry(0.022, 0.026, 0.006), 0x6fb6d9, { p: [tx, ty + 0.14, tz + 0.051] });
  features.push({ type: 'window', pos: [tx, ty + 0.14, tz + 0.0545], yaw: 0, w: 0.02, h: 0.024 });
  // chimenea con humo
  addGeo(new THREE.BoxGeometry(0.016, 0.05, 0.016), 0x9a8f86, { p: [tx + 0.03, ty + 0.25, tz - 0.01] });
  features.push({ type: 'smoke', pos: [tx + 0.03, ty + 0.28, tz - 0.01], size: 0.009 });

  // --- árboles: tronco hundido en el suelo y copa en conos apilados ---
  for (let i = 0, tries = 0; i < 6 && tries < 200; tries++) {
    const a = rng() * Math.PI * 2, r = (0.35 + rng() * 0.5) * R;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - tx, z - tz) < 0.1) continue;       // no pisar la torre
    const y = top(x, z) - 0.004, sc = 0.8 + rng() * 0.5;
    addGeo(new THREE.CylinderGeometry(0.005 * sc, 0.006 * sc, 0.03 * sc, 5), 0x6e4a2c, { p: [x, y + 0.015 * sc, z] });
    for (let j = 0; j < 3; j++) {
      addGeo(new THREE.ConeGeometry((0.028 - j * 0.007) * sc, 0.038 * sc, 7), j % 2 ? 0x3f8a4b : 0x357a43,
        { p: [x, y + (0.042 + j * 0.022) * sc, z], r: [0, rng() * 3, 0], amt: 0.09 });
    }
    features.push({ type: 'firefly', pos: [x + 0.02, y + 0.04, z + 0.01], size: 0.02 });
    i++;
  }

  // --- un farol: poste fino con addRod (varilla entre dos puntos) ---
  const fx = -0.12, fz = 0.1, fy = top(fx, fz);
  addRod([fx, fy - 0.005, fz], [fx, fy + 0.07, fz], 0.003, 0x3b3f46);
  addGeo(new THREE.BoxGeometry(0.014, 0.016, 0.014), 0xffe28a, { p: [fx, fy + 0.078, fz] });
  features.push({ type: 'city', pos: [fx, fy + 0.078, fz + 0.008], size: 0.009 }); // punto de luz fijo de noche

  features.push({ type: 'gulls', pos: [0, 0.36, 0], size: 0.12 });
  return finish('Plantilla');
}
