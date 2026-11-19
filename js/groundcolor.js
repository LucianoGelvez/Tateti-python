// Color del suelo para cada maqueta: el tono que más superficie ocupa entre las caras que miran
// hacia arriba (el terreno: arena, pasto, adoquines, agua…). Se usa para teñir el suelo del
// entorno sencillo, así la maqueta parece apoyada sobre "su" tierra.
// Devuelve [r, g, b] lineales (0..1) o null si no hay un color claro (p. ej. modelos con textura).
export function groundColor(model) {
  const P = model.positions, Cc = model.colors, n = P.length / 9;
  const bins = new Map();
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    const ux = P[i + 3] - P[i], uy = P[i + 4] - P[i + 1], uz = P[i + 5] - P[i + 2];
    const vx = P[i + 6] - P[i], vy = P[i + 7] - P[i + 1], vz = P[i + 8] - P[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12 || ny / len < 0.8) continue; // solo caras casi horizontales hacia arriba
    const area = len / 2, r = Cc[t * 3], g = Cc[t * 3 + 1], b = Cc[t * 3 + 2];
    // agrupado grueso por tono (en raíz cuadrada, más parecido a como lo percibe el ojo)
    const key = (Math.min(7, Math.floor(Math.sqrt(r) * 8)) << 6) | (Math.min(7, Math.floor(Math.sqrt(g) * 8)) << 3) | Math.min(7, Math.floor(Math.sqrt(b) * 8));
    let e = bins.get(key);
    if (!e) { e = { a: 0, r: 0, g: 0, b: 0 }; bins.set(key, e); }
    e.a += area; e.r += r * area; e.g += g * area; e.b += b * area;
  }
  let best = null;
  for (const e of bins.values()) if (!best || e.a > best.a) best = e;
  if (!best) return null;
  const c = [best.r / best.a, best.g / best.a, best.b / best.a];
  if (Math.min(...c) > 0.85) return null; // casi blanco: probablemente un modelo con textura
  return c;
}
