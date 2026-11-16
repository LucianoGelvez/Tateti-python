// Diorama "El Mundo en Globo": un globo aerostático cuya vela es el planeta Tierra.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder } from './builder.js';

// Tierra firme por franjas de 5° de latitud (de 90°N a 90°S): tramos [lonInicio, lonFin].
const LAND = [
  [],                                                                              // 90–85 N
  [[-85, -22]],
  [[-120, -75], [-70, -18], [12, 28], [55, 68], [90, 110]],
  [[-125, -70], [-56, -20], [20, 30], [52, 60], [66, 160]],
  [[-180, -170], [-168, -62], [-54, -22], [12, 180]],                              // 70–65 N
  [[-180, -172], [-166, -95], [-78, -64], [-50, -42], [-23, -14], [5, 180]],
  [[-165, -153], [-136, -95], [-78, -60], [-7, -2], [8, 18], [21, 138], [156, 163]],
  [[-130, -56], [-10, 1], [4, 141], [156, 159]],
  [[-125, -60], [-2, 137], [141, 144]],                                            // 50–45 N
  [[-124, -70], [-9, 3], [8, 28], [40, 50], [54, 131], [140, 145]],
  [[-123, -76], [-9, 0], [13, 17], [20, 24], [27, 122], [126, 129], [136, 141]],
  [[-120, -78], [-10, 19], [35, 122], [130, 132]],
  [[-115, -97], [-83, -80], [-14, 48], [52, 121]],                                 // 30–25 N
  [[-110, -97], [-84, -75], [-17, 37], [39, 59], [68, 116], [120, 121]],
  [[-105, -87], [-74, -69], [-17, 38], [42, 55], [73, 86], [94, 109], [120, 122]],
  [[-92, -83], [-75, -62], [-17, 44], [74, 80], [98, 109], [121, 125]],
  [[-84, -52], [-13, 49], [77, 78], [80, 81], [98, 103], [116, 118], [122, 126]],  // 10–5 N
  [[-79, -50], [9, 46], [96, 104], [109, 118], [120, 128]],
  [[-81, -36], [9, 41], [100, 105], [110, 117], [119, 123], [131, 146]],           // 0–5 S
  [[-81, -35], [12, 40], [105, 115], [138, 150]],
  [[-77, -37], [13, 41], [48, 50], [130, 137], [142, 145]],
  [[-74, -39], [12, 40], [44, 50], [122, 146]],
  [[-70, -41], [14, 35], [43, 48], [114, 150]],                                    // 20–25 S
  [[-71, -48], [15, 33], [114, 153]],
  [[-72, -52], [18, 30], [115, 126], [133, 152]],
  [[-73, -57], [140, 150], [173, 178]],
  [[-74, -63], [145, 148], [168, 174]],                                            // 40–45 S
  [[-75, -66], [167, 170]],
  [[-74, -66]],
  [], [],                                                                          // 55–65 S
  [[-66, -60], [30, 160]],
  [[-150, -62], [-20, 165]],
  [[-180, 180]], [[-180, 180]], [[-180, 180]],                                     // 75–90 S
];
const CITIES = [
  [40.7, -74], [34, -118], [41.9, -87.6], [19.4, -99.1], [43.7, -79.4], [49.3, -123], [25.8, -80.2], [23.1, -82.4],
  [4.7, -74], [-12, -77], [-33.4, -70.7], [-34.6, -58.4], [-23.5, -46.6], [-22.9, -43.2], [10.5, -66.9], [-15.8, -47.9],
  [51.5, -0.1], [48.9, 2.3], [40.4, -3.7], [41.9, 12.5], [52.5, 13.4], [55.8, 37.6], [41, 29], [59.3, 18],
  [30, 31.2], [6.5, 3.4], [-1.3, 36.8], [-26.2, 28], [-4.3, 15.3], [14.7, -17.4], [9, 38.7], [33.6, -7.6],
  [35.7, 51.4], [25.2, 55.3], [24.9, 67], [28.6, 77.2], [19.1, 72.9], [13, 77.6], [23.8, 90.4], [13.8, 100.5],
  [1.3, 103.8], [-6.2, 106.8], [22.3, 114.2], [31.2, 121.5], [39.9, 116.4], [37.6, 127], [35.7, 139.7], [14.6, 121],
  [-33.9, 151.2], [-37.8, 145], [-32, 115.9], [-36.8, 174.8], [61.2, -149.9], [64.1, -21.9], [55, 82.9], [43.2, 76.9],
];

export function buildGlobo(seed = 11) {
  const { rng, fbm, features, rgbOf, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);
  const R = 0.2, YC = 0.418, TILT = 0.2, LON0 = -45; // LON0: meridiano que mira al frente
  const DEG = Math.PI / 180;
  const ct = Math.cos(TILT), st = Math.sin(TILT);

  // dirección (en el modelo) -> latitud y longitud terrestres, y viceversa
  const toGeo = (x, y, z) => {
    const ex = x * ct + y * st, ey = -x * st + y * ct; // deshace la inclinación del eje
    return [Math.asin(Math.max(-1, Math.min(1, ey))) / DEG, ((Math.atan2(ex, z) / DEG + LON0 + 540) % 360) - 180];
  };
  const toDir = (lat, lon) => {
    const cl = Math.cos(lat * DEG), a = (lon - LON0) * DEG;
    const ex = cl * Math.sin(a), ey = Math.sin(lat * DEG), ez = cl * Math.cos(a);
    return [ex * ct - ey * st, ex * st + ey * ct, ez];
  };
  const inTable = (lat, lon) => {
    const row = LAND[Math.max(0, Math.min(35, Math.floor((90 - lat) / 5)))];
    for (const [a, b] of row) if (lon >= a && lon <= b) return true;
    return false;
  };
  // costas menos cuadradas: se consulta la tabla con un pequeño desvío de ruido
  const isLand = (lat, lon) => {
    const u = (lon + 180) / 9, v = (lat + 90) / 9;
    const la = lat + (fbm(u + 3.1, v + 7.7) - 0.5) * 5, lo = lon + (fbm(u + 11.3, v + 1.9) - 0.5) * 6;
    return inTable(Math.max(-89.9, Math.min(89.9, la)), ((lo + 540) % 360) - 180);
  };
  const mountain = (lat, lon) => Math.max(0, fbm((lon + 180) / 14 + 40, (lat + 90) / 14 + 20) - 0.52) * 2;
  const elevation = (lat, lon) => (isLand(lat, lon) ? 0.018 + 0.07 * mountain(lat, lon) : 0);
  const surface = (lat, lon, extra = 0) => {
    const d = toDir(lat, lon), r = R * (1 + elevation(lat, lon)) + extra;
    return [d[0] * r, YC + d[1] * r, d[2] * r];
  };

  const isDesert = (lat, lon) =>
    (lat > 15 && lat < 33 && lon > -17 && lon < 60) || (lat > 36 && lat < 46 && lon > 55 && lon < 105) ||
    (lat > 23 && lat < 36 && lon > -118 && lon < -102) || (lat < -19 && lat > -31 && lon > 115 && lon < 142) ||
    (lat < -17 && lat > -29 && lon > 12 && lon < 24) || (lat < -17 && lat > -28 && lon > -72 && lon < -67);
  const landColor = (lat, lon) => {
    const m = mountain(lat, lon);
    if (lat < -60 || lat > 77 || (lat > 60 && lon > -60 && lon < -18)) return jitter(0xf3f7fa, 0.03);   // hielo
    if (lat > 62) return jitter(rng() < 0.3 ? 0xe9eef0 : 0x9aa68c, 0.05);                                // tundra
    if (m > 0.34) return jitter(m > 0.55 && Math.abs(lat) > 28 ? 0xe6e6e2 : 0x9a8c7c, 0.06);                                   // montaña
    if (isDesert(lat, lon)) return jitter(rng() < 0.5 ? 0xdcc38c : 0xd2b47a, 0.05);
    if (Math.abs(lat) < 12) return jitter(rng() < 0.5 ? 0x2f8f4a : 0x379a50, 0.07);                      // selva
    if (lat > 46) return jitter(0x3f8558, 0.07);                                                         // bosque boreal
    return jitter(rng() < 0.5 ? 0x5aa75c : 0x6cb565, 0.07);
  };

  // --- el planeta ---
  const CUT = Math.cos(31 * DEG); // por debajo, el casquete queda oculto dentro de la boca del globo
  {
    const ico = new THREE.IcosahedronGeometry(1, 17);
    const a = ico.attributes.position.array;
    const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (let i = 0; i < a.length; i += 9) {
      let nLand = 0, hidden = true;
      for (let v = 0; v < 3; v++) {
        const x = a[i + v * 3], y = a[i + v * 3 + 1], z = a[i + v * 3 + 2];
        const [lat, lon] = toGeo(x, y, z);
        const e = elevation(lat, lon);
        if (e > 0) nLand++;
        if (y > -CUT) hidden = false;
        const r = R * (1 + e);
        P[v].set(x * r, YC + y * r, z * r);
      }
      const cx = (a[i] + a[i + 3] + a[i + 6]) / 3, cy = (a[i + 1] + a[i + 4] + a[i + 7]) / 3, cz = (a[i + 2] + a[i + 5] + a[i + 8]) / 3;
      const cl = Math.hypot(cx, cy, cz);
      const [lat, lon] = toGeo(cx / cl, cy / cl, cz / cl);
      let rgb;
      if (hidden) rgb = jitter(0xb5562f, 0.05);                              // interior de la vela
      else if (nLand >= 2) rgb = landColor(lat, lon);
      else if (lat > 80) rgb = jitter(0xeaf3f9, 0.03);                       // banquisa ártica
      else if (nLand === 1) rgb = jitter(0x4fb6cc, 0.05);                    // aguas someras
      else {
        const deep = fbm((lon + 180) / 20 + 9, (lat + 90) / 20 + 4);
        rgb = jitter(deep > 0.5 ? 0x1f62a6 : 0x2a78bd, 0.045);
      }
      addTri(P[0], P[1], P[2], rgb);
    }
    ico.dispose();
  }

  // --- boca del globo, aro y cuerdas ---
  const yTop = YC - R * CUT, rTop = R * Math.sin(31 * DEG) + 0.003;   // donde la falda toca el planeta
  const yMouth = 0.158, rMouth = 0.046;
  {
    const hSkirt = yTop - yMouth, N = 16;
    addGeo(new THREE.CylinderGeometry(rTop, rMouth, hSkirt, N, 2, true), 0, {
      p: [0, yMouth + hSkirt / 2, 0],
      colorFn: (va, vb, vc) => {
        const ang = Math.atan2(va.z + vb.z + vc.z, va.x + vb.x + vc.x);
        const k = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * N + 1e-6) % 2;
        return jitter(k ? 0xd9482f : 0xf6ecd8, 0.035);
      },
    });
    const torus = (r, tube, y, hex) => addGeo(new THREE.TorusGeometry(r, tube, 6, 28), hex, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], amt: 0.05 });
    torus(rTop + 0.002, 0.0045, yTop, 0xc79a3a);       // aro dorado
    torus(rMouth, 0.004, yMouth, 0x4a3b33);            // boca
  }

  // --- canasta ---
  const yRim = 0.072, rRim = 0.043;
  {
    const N = 14, HS = 4;
    addGeo(new THREE.CylinderGeometry(rRim, 0.036, yRim, N, HS, false), 0, {
      p: [0, yRim / 2, 0],
      colorFn: (va, vb, vc) => {
        const cx = (va.x + vb.x + vc.x) / 3, cy = (va.y + vb.y + vc.y) / 3, cz = (va.z + vb.z + vc.z) / 3;
        if (Math.hypot(cx, cz) < 0.03) return jitter(0x6b4a2c, 0.05);       // fondo y tapa
        const a = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (2 * Math.PI)) * N + 1e-6);
        const b = Math.floor((cy / yRim) * HS + 1e-6);
        return jitter((a + b) % 2 ? 0xb98a4e : 0x9c6f3a, 0.05);             // trenzado de mimbre
      },
    });
    addGeo(new THREE.TorusGeometry(rRim + 0.001, 0.005, 6, 24), 0x6b4226, { p: [0, yRim, 0], r: [Math.PI / 2, 0, 0], amt: 0.05 });
    // quemador sobre dos travesaños
    const yB = 0.118;
    addGeo(new THREE.BoxGeometry(0.086, 0.004, 0.006), 0x3b3f46, { p: [0, yB - 0.012, 0], r: [0, Math.PI / 4, 0] });
    addGeo(new THREE.BoxGeometry(0.086, 0.004, 0.006), 0x3b3f46, { p: [0, yB - 0.012, 0], r: [0, -Math.PI / 4, 0] });
    addGeo(new THREE.CylinderGeometry(0.011, 0.014, 0.022, 8), 0x8d949c, { p: [0, yB, 0], amt: 0.06 });
    addGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 6), 0x2c2f35, { p: [0, yB + 0.014, 0] });
    features.push({ type: 'flame', pos: [0, yB + 0.018, 0], size: 0.012 });
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      addRod([c * rRim, yRim, s * rRim], [c * rMouth, yMouth, s * rMouth], 0.0016, 0xd8c9a8);
      if (i % 2 === 0) {
        // sacos de arena colgando por fuera
        addRod([c * (rRim + 0.004), yRim, s * (rRim + 0.004)], [c * (rRim + 0.006), yRim - 0.022, s * (rRim + 0.006)], 0.001, 0xd8c9a8, 4);
        addGeo(new THREE.IcosahedronGeometry(0.008, 0), 0xcdb58a, { p: [c * (rRim + 0.007), yRim - 0.03, s * (rRim + 0.007)], s: [1, 1.25, 1], r: [rng() * 3, rng() * 3, 0], amt: 0.08 });
      }
    }
    // banderines entre la boca y el aro dorado
    const flags = [0xf2c14e, 0x4fa3c7, 0x79b25e, 0xd2553f];
    for (let i = 0; i < 16; i++) {
      const a = (i + 0.5) / 16 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), rr = rTop + 0.007;
      addGeo(new THREE.ConeGeometry(0.008, 0.02, 3), flags[i % 4], { p: [c * rr, yTop - 0.016, s * rr], r: [Math.PI, -a, 0], s: [1, 1, 0.25], amt: 0.04 });
    }
  }

  // --- vida ---
  for (const [lat, lon] of CITIES) {
    const d = toDir(lat, lon);
    if (d[1] < -CUT + 0.03) continue;
    features.push({ type: 'city', pos: surface(lat, lon, 0.003), size: 0.007 });
  }
  for (let i = 0, tries = 0; i < 9 && tries < 400; tries++) {
    const lat = -40 + rng() * 105, lon = -180 + rng() * 360;
    const d = toDir(lat, lon);
    if (d[1] < -0.55) continue;
    const r = R * 1.13 + rng() * 0.012;
    features.push({ type: 'cloud', pos: [d[0] * r, YC + d[1] * r, d[2] * r], center: [0, YC, 0], size: 0.018 + rng() * 0.012 });
    i++;
  }
  for (let i = 0, tries = 0; i < 70 && tries < 3000; tries++) {
    const lat = -60 + rng() * 135, lon = -180 + rng() * 360;
    if (elevation(lat, lon) > 0 || toDir(lat, lon)[1] < -CUT + 0.05) continue;
    features.push({ type: 'sparkle', pos: surface(lat, lon, 0.002), size: 0.01 });
    i++;
  }
  features.push({ type: 'gulls', pos: [0, 0.13, 0], size: 0.15 });

  return finish('El Mundo en Globo');
}
