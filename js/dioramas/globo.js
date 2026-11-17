// Diorama "El Mundo en Globo" — Maqueta aerostática de alta fidelidad (~240k triángulos)
// Planeta Tierra con geografía refinada, cordilleras, cuencas, batimetría oceánica,
// garganta interior cálida iluminada por el quemador, 9 hitos arquitectónicos del mundo,
// 6 faros costeros, flota de 14 galeones, ballenas, icebergs, atolones, bosques por bioma,
// corona ártica con astrolabio, red de meridianos y banda ecuatorial de bronce,
// faldón plisado de 32 gajos, barquilla de mimbre tejida en 3D con equipamiento de
// expedición, hélices laterales y quemador doble de latón con serpentines de cobre.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

// Tierra firme por franjas de 5° de latitud (90°N a 90°S): tramos [lonInicio, lonFin].
const LAND = [
  [],                                                                                      // 90–85 N
  [[-85, -22]],                                                                            // 85–80 N
  [[-120, -75], [-70, -18], [12, 28], [55, 68], [90, 110]],                                // 80–75 N
  [[-125, -70], [-56, -20], [20, 30], [52, 60], [66, 160]],                                // 75–70 N
  [[-180, -170], [-168, -62], [-54, -22], [12, 180]],                                      // 70–65 N
  [[-180, -172], [-166, -95], [-78, -64], [-50, -42], [-23, -14], [5, 180]],               // 65–60 N
  [[-165, -153], [-136, -95], [-78, -60], [-7, -2], [8, 18], [21, 138], [156, 163]],       // 60–55 N
  [[-130, -56], [-10, 1], [4, 141], [156, 161]],                                           // 55–50 N
  [[-125, -53], [-4, 137], [141, 145]],                                                    // 50–45 N
  [[-124, -70], [-9, 3], [8, 28], [40, 50], [54, 131], [140, 145]],                        // 45–40 N
  [[-123, -74], [-9, -1], [12, 16], [21, 24], [27, 122], [126, 129], [136, 141]],           // 40–35 N
  [[-120, -78], [-8, 10], [34, 122], [130, 136]],                                          // 35–30 N
  [[-115, -97], [-83, -80], [-14, 48], [52, 121]],                                         // 30–25 N
  [[-110, -97], [-92, -87], [-84, -75], [-17, 37], [39, 59], [68, 116], [120, 122]],       // 25–20 N
  [[-105, -87], [-74, -69], [-17, 38], [42, 55], [73, 86], [94, 109], [120, 122]],         // 20–15 N
  [[-92, -83], [-75, -62], [-17, 44], [74, 80], [98, 109], [121, 125]],                    // 15–10 N
  [[-84, -52], [-13, 49], [77, 81], [98, 104], [116, 118], [122, 126]],                    // 10–5 N
  [[-79, -50], [9, 46], [96, 104], [109, 118], [120, 128]],                                // 5–0 N
  [[-81, -36], [9, 41], [100, 105], [110, 117], [119, 123], [131, 146]],                   // 0–5 S
  [[-81, -35], [12, 40], [105, 115], [138, 150]],                                          // 5–10 S
  [[-77, -37], [13, 41], [47, 50], [130, 137], [142, 145]],                                // 10–15 S
  [[-74, -39], [12, 40], [44, 50], [122, 146]],                                            // 15–20 S
  [[-70, -41], [14, 35], [43, 48], [114, 150]],                                            // 20–25 S
  [[-71, -48], [15, 33], [114, 153]],                                                      // 25–30 S
  [[-72, -52], [18, 30], [115, 126], [133, 152]],                                          // 30–35 S
  [[-73, -57], [140, 150], [173, 178]],                                                    // 35–40 S
  [[-74, -63], [145, 148], [168, 174]],                                                    // 40–45 S
  [[-75, -66], [167, 170]],                                                                // 45–50 S
  [[-74, -66]],                                                                            // 50–55 S
  [], [],                                                                                  // 55–65 S
  [[-66, -60], [30, 160]],                                                                 // 65–70 S
  [[-150, -62], [-20, 165]],                                                               // 70–75 S
  [[-180, 180]], [[-180, 180]], [[-180, 180]],                                             // 75–90 S
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

// Cordilleras reales en [lat, lon] y anchura angular aproximada
const MOUNTAIN_RANGES = [
  { w: 0.11, h: 0.056, pts: [[-52, -72], [-36, -70], [-20, -68], [-8, -76], [6, -74]] },                  // Andes
  { w: 0.13, h: 0.050, pts: [[63, -150], [54, -124], [43, -110], [34, -106], [22, -102], [15, -92]] },    // Rocosas + Sierra Madre
  { w: 0.10, h: 0.036, pts: [[43, -1], [46, 9], [47, 16], [45, 25], [42, 44]] },                          // Pirineos, Alpes, Cárpatos, Cáucaso
  { w: 0.15, h: 0.068, pts: [[36, 72], [32, 81], [28, 88], [29, 98], [36, 101], [42, 82]] },              // Himalaya + Meseta del Tíbet
  { w: 0.09, h: 0.028, pts: [[67, 62], [58, 59], [52, 58]] },                                             // Urales
  { w: 0.11, h: 0.038, pts: [[11, 39], [2, 36], [-8, 34], [-18, 32]] },                                   // Rift Africano + Etiopía
  { w: 0.10, h: 0.028, pts: [[34, -5], [36, 4]] },                                                        // Atlas
  { w: 0.09, h: 0.026, pts: [[-18, 146], [-28, 151], [-36, 148]] },                                       // Gran Cordillera Divisoria
  { w: 0.13, h: 0.036, pts: [[-74, 164], [-82, 160], [-84, -40]] },                                       // Montes Transantárticos
];

const RIVERS = [
  { w: 0.055, pts: [[-4, -75], [-3, -63], [-1, -50]] },      // Amazonas
  { w: 0.045, pts: [[-1, 32], [15, 32], [30, 31]] },         // Nilo
  { w: 0.045, pts: [[45, -93], [36, -90], [29, -90]] },      // Misisipi
  { w: 0.045, pts: [[31, 98], [30, 111], [31, 121]] },       // Yangtsé
  { w: 0.048, pts: [[-3, 25], [0, 19], [-5, 13]] },          // Congo
];

const REEFS = [
  { w: 0.08, pts: [[-12, 143], [-21, 151]] },                // Gran Barrera de Coral
  { w: 0.10, pts: [[22, -80], [18, -71], [14, -62]] },       // Caribe
  { w: 0.11, pts: [[6, 102], [0, 114], [-6, 124], [8, 124]] }, // Triángulo de Coral
];

const TRENCHES = [
  { w: 0.09, pts: [[44, 150], [28, 144], [12, 145]] },       // Fosa de las Marianas / Japón
  { w: 0.08, pts: [[-12, -79], [-28, -73], [-42, -76]] },    // Fosa de Atacama
];

const RIDGES = [
  { w: 0.12, pts: [[62, -26], [35, -38], [8, -32], [-15, -14], [-42, -16]] }, // Dorsal Mesoatlántica
];

export function buildGlobo(seed = 11) {
  const { rng, fbm, features, tmpColor, rgbOf, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);

  const R = 0.2, YC = 0.418, TILT = 0.2, LON0 = -45;
  const DEG = Math.PI / 180;
  const CUT = Math.cos(31 * DEG);
  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);

  // =====================================================================
  // CAPA 1: MARCO ESFÉRICO Y GEOGRAFÍA DE ALTA DEFINICIÓN
  // =====================================================================
  // Vector unitario en coordenadas terrestres sin inclinación
  const earthDir = (lat, lon) => {
    const cl = Math.cos(lat * DEG), a = (lon - LON0) * DEG;
    return [cl * Math.sin(a), Math.sin(lat * DEG), cl * Math.cos(a)];
  };
  const tiltVec = (ex, ey, ez) => [ex * ct - ey * st, ex * st + ey * ct, ez];
  const untiltVec = (x, y, z) => [x * ct + y * st, -x * st + y * ct, z];

  const toGeo = (x, y, z) => {
    const [ex, ey, ez] = untiltVec(x, y, z);
    return [Math.asin(Math.max(-1, Math.min(1, ey))) / DEG, ((Math.atan2(ex, ez) / DEG + LON0 + 540) % 360) - 180];
  };
  const toDir = (lat, lon) => {
    const [ex, ey, ez] = earthDir(lat, lon);
    return tiltVec(ex, ey, ez);
  };

  // Precalcular segmentos 3D unitarios para cordilleras, ríos, arrecifes, dorsales y fosas
  const compileCurves = (list) => list.map((item) => ({
    w: item.w,
    h: item.h || 0,
    segs: item.pts.slice(0, -1).map((p, i) => ({
      a: earthDir(p[0], p[1]),
      b: earthDir(item.pts[i + 1][0], item.pts[i + 1][1]),
    })),
  }));
  const C_RANGES = compileCurves(MOUNTAIN_RANGES);
  const C_RIVERS = compileCurves(RIVERS);
  const C_REEFS = compileCurves(REEFS);
  const C_TRENCHES = compileCurves(TRENCHES);
  const C_RIDGES = compileCurves(RIDGES);

  const distSeg3 = (px, py, pz, a, b) => {
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const len2 = abx * abx + aby * aby + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((px - a[0]) * abx + (py - a[1]) * aby + (pz - a[2]) * abz) / len2));
    return Math.hypot(px - (a[0] + abx * t), py - (a[1] + aby * t), pz - (a[2] + abz * t));
  };
  const curveInfluence = (ex, ey, ez, compiled) => {
    let best = 0;
    for (const c of compiled) {
      let md = Infinity;
      for (const s of c.segs) {
        const d = distSeg3(ex, ey, ez, s.a, s.b);
        if (d < md) md = d;
      }
      if (md < c.w) {
        const v = smooth(1 - md / c.w);
        best = Math.max(best, v * (c.h || 1));
      }
    }
    return best;
  };

  // Hitos garantizados sobre tierra firme (se asegura su plataforma continental)
  const LANDMARK_ANCHORS = [
    [29.9, 31.1, 0.045],   // Guiza
    [48.8, 2.3, 0.045],    // París (Torre Eiffel)
    [41.9, 12.5, 0.042],   // Roma (Coliseo)
    [27.2, 78.0, 0.045],   // Agra (Taj Mahal)
    [40.4, 116.5, 0.050],  // Pekín / Gran Muralla
    [35.6, 139.2, 0.046],  // Japón (Pagoda)
    [40.7, -74.5, 0.044],  // Nueva York
    [20.2, -88.8, 0.045],  // Chichén Itzá
    [-13.2, -72.5, 0.048], // Machu Picchu
    [-22.9, -43.8, 0.044], // Río de Janeiro
    [-33.8, 150.8, 0.046], // Sídney
  ];
  const LANDMARK_DIRS = LANDMARK_ANCHORS.map(([la, lo, r]) => [...earthDir(la, lo), r]);

  const inTable = (lat, lon) => {
    const l = ((lon + 540) % 360) - 180;
    const row = LAND[Math.max(0, Math.min(35, Math.floor((90 - lat) / 5)))];
    for (const [a, b] of row) if (l >= a && l <= b) return 1;
    return 0;
  };

  // Máscara continental continua (suavizada sobre 5° + ruido costero multi-octava)
  const landMask = (lat, lon) => {
    const u = (lon + 180) / 10, v = (lat + 90) / 10;
    const n1 = (fbm(u + 3.1, v + 7.7) - 0.5) * 4.2 + (fbm(u * 2.7 + 14.1, v * 2.7 + 2.3) - 0.5) * 2.0;
    const n2 = (fbm(u + 11.3, v + 1.9) - 0.5) * 5.0 + (fbm(u * 2.7 + 5.7, v * 2.7 + 19.3) - 0.5) * 2.4;
    const la = Math.max(-89.9, Math.min(89.9, lat + n1));
    const lo = lon + n2;
    const c = inTable(la, lo) * 0.40
      + (inTable(Math.min(89.9, la + 2.3), lo) + inTable(Math.max(-89.9, la - 2.3), lo)
      + inTable(la, lo + 2.6) + inTable(la, lo - 2.6)) * 0.15;
    // Asegurar sustento continental en los hitos arquitectónicos costeros
    const [ex, ey, ez] = earthDir(lat, lon);
    let boost = 0;
    for (const a of LANDMARK_DIRS) {
      const d = Math.hypot(ex - a[0], ey - a[1], ez - a[2]);
      if (d < a[3]) boost = Math.max(boost, smooth(1 - d / a[3]));
    }
    return Math.min(1, Math.max(c, boost * 0.92));
  };
  const isLand = (lat, lon) => landMask(lat, lon) > 0.46;

  const mountainRaw = (lat, lon) => {
    const [ex, ey, ez] = earthDir(lat, lon);
    const ridge = curveInfluence(ex, ey, ez, C_RANGES);
    const f1 = Math.max(0, fbm((lon + 180) / 13 + 40, (lat + 90) / 13 + 20) - 0.50) * 1.85;
    const f2 = Math.max(0, fbm((lon + 180) / 5.5 + 12, (lat + 90) / 5.5 + 8) - 0.54) * 1.1;
    // Domo de hielo de Groenlandia y Antártida interior
    const greenland = (lat > 62 && lat < 81 && lon > -55 && lon < -22) ? 0.28 : 0;
    const ant = lat < -76 ? 0.30 : 0;
    return Math.min(1.15, ridge * (0.65 + 0.55 * fbm(ex * 8 + 4, ez * 8 + 9)) + f1 * 0.55 + f2 * 0.25 + greenland + ant);
  };

  const riverVal = (lat, lon) => {
    const [ex, ey, ez] = earthDir(lat, lon);
    return curveInfluence(ex, ey, ez, C_RIVERS);
  };

  const elevation = (lat, lon) => {
    const lm = landMask(lat, lon);
    if (lm <= 0.46) return 0;
    const coast = smooth((lm - 0.46) / 0.24);
    const m = mountainRaw(lat, lon);
    const rv = riverVal(lat, lon);
    // Dunas en desiertos y rugosidad continental sutil
    const micro = (fbm((lon + 180) / 4.2 + 7, (lat + 90) / 4.2 + 13) - 0.5) * 0.005;
    return Math.max(0.006, 0.009 + 0.013 * coast + 0.068 * m * coast - 0.007 * rv * coast + micro * coast);
  };

  const surface = (lat, lon, extra = 0) => {
    const d = toDir(lat, lon);
    const r = R * (1 + elevation(lat, lon)) + extra;
    return [d[0] * r, YC + d[1] * r, d[2] * r];
  };

  // Marco tangente local (X = este, Y = normal saliente, Z = sur -> det = +1)
  const geoFrame = (lat, lon, extra = 0) => {
    const d = toDir(lat, lon);
    const r = R * (1 + elevation(lat, lon)) + extra;
    const p = [d[0] * r, YC + d[1] * r, d[2] * r];
    const upVec = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    const a = (lon - LON0) * DEG;
    const eTilt = tiltVec(Math.cos(a), 0, -Math.sin(a));
    const eastVec = new THREE.Vector3(eTilt[0], eTilt[1], eTilt[2]).normalize();
    const southVec = new THREE.Vector3().crossVectors(eastVec, upVec).normalize();
    const basis = new THREE.Matrix4().makeBasis(eastVec, upVec, southVec);
    const qBase = new THREE.Quaternion().setFromRotationMatrix(basis);
    const local = (lx, ly, lz) => [
      p[0] + eastVec.x * lx + upVec.x * ly + southVec.x * lz,
      p[1] + eastVec.y * lx + upVec.y * ly + southVec.y * lz,
      p[2] + eastVec.z * lx + upVec.z * ly + southVec.z * lz,
    ];
    const q = (yawLocal = 0) => {
      if (!yawLocal) return qBase.clone();
      return qBase.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, yawLocal));
    };
    return { p, up: upVec, east: eastVec, south: southVec, local, q };
  };

  const isDesert = (lat, lon) =>
    (lat > 14 && lat < 33 && lon > -17 && lon < 60) ||
    (lat > 36 && lat < 46 && lon > 54 && lon < 104) ||
    (lat > 22 && lat < 36 && lon > -118 && lon < -102) ||
    (lat < -19 && lat > -31 && lon > 115 && lon < 142) ||
    (lat < -17 && lat > -29 && lon > 12 && lon < 24) ||
    (lat < -17 && lat > -29 && lon > -72 && lon < -66);

  const isSavanna = (lat, lon) =>
    (lat > 6 && lat < 16 && lon > -16 && lon < 46) ||
    (lat < -4 && lat > -20 && lon > 16 && lon < 40) ||
    (lat < -6 && lat > -22 && lon > -54 && lon < -38) ||
    (lat < -13 && lat > -21 && lon > 124 && lon < 145);

  const landColor = (lat, lon, lm) => {
    const m = mountainRaw(lat, lon);
    const rv = riverVal(lat, lon);
    // Hielo polar y Groenlandia
    if (lat < -62 || lat > 76 || (lat > 61 && lon > -58 && lon < -20)) return jitter(rng() < 0.35 ? 0xe7f1f8 : 0xf6fafd, 0.028);
    // Cumbres nevadas y alta montaña
    if (m > 0.56 && (Math.abs(lat) > 22 || m > 0.72)) return jitter(0xf0f2f4, 0.035);
    if (m > 0.35) return jitter(rng() < 0.5 ? 0x8d8070 : 0x776b5d, 0.055);
    // Ríos grandes en los valles
    if (rv > 0.62) return jitter(0x2d89b5, 0.04);
    if (rv > 0.35) return jitter(0x479e55, 0.06);
    // Playas y costas bajas
    if (lm < 0.54 && Math.abs(lat) < 55) return jitter(0xe0cfa0, 0.045);
    // Tundra ártica
    if (lat > 62) return jitter(rng() < 0.32 ? 0xe4ecee : 0x8f9d80, 0.05);
    // Desiertos con bandas de dunas
    if (isDesert(lat, lon)) {
      const dune = fbm((lon + 180) * 0.45 + lat * 0.15, (lat + 90) * 0.45);
      return jitter(dune > 0.52 ? 0xe2ca90 : 0xd0ae72, 0.045);
    }
    // Selva tropical
    if (Math.abs(lat) < 12) return jitter(rng() < 0.5 ? 0x267e41 : 0x318f4b, 0.065);
    // Sabana cálida
    if (isSavanna(lat, lon)) return jitter(rng() < 0.5 ? 0xa3ab52 : 0x889948, 0.06);
    // Bosque boreal / taiga
    if (lat > 47) return jitter(rng() < 0.5 ? 0x37784d : 0x438557, 0.06);
    // Praderas y bosques templados
    return jitter(rng() < 0.5 ? 0x56a357 : 0x67b261, 0.06);
  };

  const oceanColor = (lat, lon, lm) => {
    if (lat > 79 || (lat < -64 && fbm((lon + 180) / 12, (lat + 90) / 12) > 0.42)) {
      return jitter(0xe3f1f8, 0.03); // banquisa polar
    }
    const [ex, ey, ez] = earthDir(lat, lon);
    const reef = curveInfluence(ex, ey, ez, C_REEFS);
    const trench = curveInfluence(ex, ey, ez, C_TRENCHES);
    const ridge = curveInfluence(ex, ey, ez, C_RIDGES);
    if (lm > 0.30 || (reef > 0.32 && fbm(ex * 18, ez * 18) > 0.44)) {
      return jitter(lm > 0.38 ? 0x57c7d4 : 0x3aa3c2, 0.045); // aguas someras / arrecifes
    }
    if (trench > 0.35) return jitter(0x113f73, 0.04); // fosas abisales
    const wave = fbm((lon + 180) / 16 + 9, (lat + 90) / 16 + 4);
    const ripple = fbm((lon + 180) / 3.5 + 2, (lat + 90) / 5.5 + 6);
    if (ridge > 0.35 || wave > 0.55) return jitter(ripple > 0.53 ? 0x2c7ec4 : 0x2572b8, 0.045);
    return jitter(ripple > 0.52 ? 0x1d5fa3 : 0x185291, 0.045);
  };

  // =====================================================================
  // CAPA 2: EL PLANETA TIERRA Y GARGANTA CÓNCAVA INTERIOR (~124.820 tris)
  // =====================================================================
  {
    const ico = new THREE.IcosahedronGeometry(1, 78); // 20 * 79^2 = 124.820 triángulos
    const a = ico.attributes.position.array;
    const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

    for (let i = 0; i < a.length; i += 9) {
      let nLand = 0, hiddenCount = 0, avgDepth = 0;
      for (let v = 0; v < 3; v++) {
        const x = a[i + v * 3], y = a[i + v * 3 + 1], z = a[i + v * 3 + 2];
        const [lat, lon] = toGeo(x, y, z);
        const e = elevation(lat, lon);
        if (e > 0) nLand++;

        if (y <= -CUT) {
          hiddenCount++;
          const depth = Math.min(1, (-CUT - y) / (1 - CUT));
          avgDepth += depth / 3;
          // Curva hacia arriba formando la garganta cóncava interior iluminada por el quemador
          const rHoriz = 1 - 0.035 * smooth(depth * 4.5);
          const yDome = -CUT + 0.36 * Math.sin(depth * Math.PI * 0.5);
          P[v].set(x * R * rHoriz, YC + yDome * R, z * R * rHoriz);
        } else {
          const seamFade = smooth((y + CUT) / 0.045);
          // Pequeña ola oceánica en el mar para textura visual
          const oceanWave = e === 0 ? (fbm((lon + 180) / 3.8, (lat + 90) / 3.8) - 0.5) * 0.0025 : 0;
          const r = R * (1 + (e + oceanWave) * seamFade);
          P[v].set(x * r, YC + y * r, z * r);
        }
      }

      const cx = (a[i] + a[i + 3] + a[i + 6]) / 3;
      const cy = (a[i + 1] + a[i + 4] + a[i + 7]) / 3;
      const cz = (a[i + 2] + a[i + 5] + a[i + 8]) / 3;
      const cl = Math.hypot(cx, cy, cz) || 1;
      const [lat, lon] = toGeo(cx / cl, cy / cl, cz / cl);
      const lm = landMask(lat, lon);

      let rgb;
      if (hiddenCount >= 2) {
        // Gradiente cálido dentro de la vela (terracota en la boca -> ámbar cálido arriba)
        tmpColor.setHex(0x8e381e).lerp(new THREE.Color(0xf49d46), smooth(avgDepth));
        const k = 1 + (rng() - 0.5) * 0.06;
        rgb = [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
      } else if (nLand >= 2 || lm > 0.50) {
        rgb = landColor(lat, lon, lm);
      } else {
        rgb = oceanColor(lat, lon, nLand >= 1 ? Math.max(lm, 0.36) : lm);
      }
      addTri(P[0], P[1], P[2], rgb);
    }
    ico.dispose();
  }

  // =====================================================================
  // CAPA 3: RELIEVE ESCULTURAL EN CONTINENTES Y OCÉANOS
  // =====================================================================
  // Registro de exclusión en direcciones unitarias terrestres [ex, ey, ez, rChord]
  const occupied = [];
  const reserve = (lat, lon, rChord) => {
    const [ex, ey, ez] = earthDir(lat, lon);
    occupied.push([ex, ey, ez, rChord]);
  };
  const isBlocked = (lat, lon, rExtra = 0) => {
    const [ex, ey, ez] = earthDir(lat, lon);
    const [, by] = tiltVec(ex, ey, ez);
    if (by < -CUT + 0.16) return true; // despejar cuello / aro dorado
    if (by > 0.955) return true;       // despejar corona ártica
    for (const o of occupied) {
      if (Math.hypot(ex - o[0], ey - o[1], ez - o[2]) < o[3] + rExtra) return true;
    }
    return false;
  };
  // Reservar corona polar ártica
  reserve(90 - TILT / DEG, -45, 0.23);

  // --- A. Hitos arquitectónicos mundiales (9 conjuntos + 6 faros costeros) ---
  // Cada hito lleva una base/plinto hundida -0.008 en la corteza para no flotar nunca
  const addPlinth = (F, rx, rz, hex = 0x9b907d, segs = 12) => {
    addGeo(new THREE.CylinderGeometry(rx, rx * 1.15, 0.011, segs), hex, {
      p: F.local(0, -0.0045, 0), q: F.q(0), amt: 0.05,
    });
  };

  // 1. Pirámides de Guiza (29.9°N, 31.1°E)
  {
    const F = geoFrame(29.9, 31.1, 0);
    reserve(29.9, 31.1, 0.12);
    addGeo(new THREE.CylinderGeometry(0.022, 0.025, 0.010, 8), 0xd4b678, { p: F.local(0, -0.004, 0), q: F.q(0) });
    for (const [lx, lz, bw, bh] of [[-0.006, -0.004, 0.013, 0.018], [0.006, 0.003, 0.011, 0.015], [0.001, 0.011, 0.007, 0.009]]) {
      addGeo(new THREE.ConeGeometry(bw, bh, 4, 4), 0xe6cb8c, {
        p: F.local(lx, bh * 0.45, lz), q: F.q(Math.PI / 4), amt: 0.04,
      });
      addGeo(new THREE.ConeGeometry(bw * 0.24, bh * 0.22, 4), 0xf4d06b, {
        p: F.local(lx, bh * 0.85, lz), q: F.q(Math.PI / 4),
      });
    }
    // Esfinge
    addGeo(new THREE.BoxGeometry(0.0045, 0.0045, 0.010), 0xd8bd82, { p: F.local(-0.012, 0.0025, 0.008), q: F.q(0.4) });
    addGeo(new THREE.SphereGeometry(0.0025, 6, 5), 0xd8bd82, { p: F.local(-0.011, 0.006, 0.011) });
    features.push({ type: 'sparkle', pos: F.local(-0.006, 0.020, -0.004), size: 0.009 });
  }

  // 2. Torre Eiffel (48.8°N, 2.3°E)
  {
    const F = geoFrame(48.8, 2.3, 0);
    reserve(48.8, 2.3, 0.10);
    addPlinth(F, 0.015, 0.015, 0x738562, 8);
    // 4 patas arqueadas hasta 1er y 2do nivel
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      addRod(F.local(sx * 0.008, -0.001, sz * 0.008), F.local(sx * 0.0035, 0.015, sz * 0.0035), 0.0016, 0x5c4f44, 5);
      addRod(F.local(sx * 0.0035, 0.015, sz * 0.0035), F.local(sx * 0.0015, 0.028, sz * 0.0015), 0.0014, 0x5c4f44, 5);
    }
    addGeo(new THREE.BoxGeometry(0.010, 0.002, 0.010), 0x6b5c4f, { p: F.local(0, 0.012, 0), q: F.q(0) });
    addGeo(new THREE.BoxGeometry(0.0065, 0.0018, 0.0065), 0x6b5c4f, { p: F.local(0, 0.024, 0), q: F.q(0) });
    addGeo(new THREE.ConeGeometry(0.0034, 0.024, 4, 4), 0x5c4f44, { p: F.local(0, 0.038, 0), q: F.q(Math.PI / 4) });
    addGeo(new THREE.CylinderGeometry(0.0008, 0.0012, 0.008, 5), 0xe8c458, { p: F.local(0, 0.052, 0), q: F.q(0) });
    features.push({ type: 'city', pos: F.local(0, 0.048, 0), size: 0.008 });
  }

  // 3. Coliseo Romano en miniatura (41.9°N, 12.5°E)
  {
    const F = geoFrame(41.9, 12.5, 0);
    reserve(41.9, 12.5, 0.10);
    addPlinth(F, 0.016, 0.014, 0xbdb199, 16);
    addGeo(new THREE.CylinderGeometry(0.013, 0.014, 0.009, 20, 3, true), 0xe6d7bc, {
      p: F.local(0, 0.0045, 0), q: F.q(0.2), s: [1.15, 1, 0.9], amt: 0.04,
    });
    addGeo(new THREE.CylinderGeometry(0.010, 0.010, 0.008, 16, 2, false), 0xd4c3a4, {
      p: F.local(0, 0.0035, 0), q: F.q(0.2), s: [1.15, 1, 0.9],
    });
    addGeo(new THREE.TorusGeometry(0.012, 0.0016, 6, 20), 0xefe3ce, {
      p: F.local(0, 0.009, 0), q: F.q(0.2).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), s: [1.15, 0.9, 1],
    });
    // Pilares alrededor del anillo
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addGeo(new THREE.BoxGeometry(0.0018, 0.009, 0.0022), 0xd4c2a3, {
        p: F.local(Math.cos(a) * 0.014, 0.0045, Math.sin(a) * 0.011), q: F.q(-a),
      });
    }
  }

  // 4. Taj Mahal (27.2°N, 78.0°E)
  {
    const F = geoFrame(27.2, 78.0, 0);
    reserve(27.2, 78.0, 0.11);
    addPlinth(F, 0.020, 0.020, 0xdfd7c8, 12);
    addGeo(new THREE.BoxGeometry(0.026, 0.005, 0.026), 0xede6da, { p: F.local(0, 0.002, 0), q: F.q(0) });
    // Espejo de agua delante
    addGeo(new THREE.BoxGeometry(0.006, 0.0018, 0.016), 0x4aa8c2, { p: F.local(0, 0.0042, 0.014), q: F.q(0) });
    // Cuerpo principal y cúpula bulbosa
    addGeo(new THREE.BoxGeometry(0.016, 0.012, 0.016), 0xf7f4ee, { p: F.local(0, 0.010, -0.002), q: F.q(0), amt: 0.02 });
    const domePts = [[0, 0], [0.0062, 0], [0.0072, 0.003], [0.0065, 0.007], [0.0032, 0.011], [0.001, 0.0135], [0, 0.016]];
    addGeo(new THREE.LatheGeometry(domePts.map(([r, y]) => new THREE.Vector2(r, y)), 16), 0xffffff, {
      p: F.local(0, 0.016, -0.002), q: F.q(0), amt: 0.02,
    });
    // 4 minaretes
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      addGeo(new THREE.CylinderGeometry(0.0014, 0.0020, 0.018, 8), 0xf5f1ea, { p: F.local(sx * 0.011, 0.013, -0.002 + sz * 0.011), q: F.q(0) });
      addGeo(new THREE.ConeGeometry(0.0018, 0.004, 8), 0xebce67, { p: F.local(sx * 0.011, 0.023, -0.002 + sz * 0.011), q: F.q(0) });
    }
    features.push({ type: 'sparkle', pos: F.local(0, 0.032, -0.002), size: 0.009 });
  }

  // 5. Gran Muralla China (40.4°N, 116.5°E) y Pagoda Imperial en Japón (35.6°N, 139.2°E)
  {
    const wallPts = [[40.0, 111.5], [40.8, 114.8], [40.4, 118.2], [39.6, 121.2]];
    reserve(40.4, 116.5, 0.14);
    for (let i = 0; i < wallPts.length; i++) {
      const F = geoFrame(wallPts[i][0], wallPts[i][1], 0);
      // Torreón cuadrado de vigilancia
      addGeo(new THREE.BoxGeometry(0.009, 0.017, 0.009), 0x8f8578, { p: F.local(0, 0.004, 0), q: F.q(0.2), amt: 0.05 });
      addGeo(new THREE.BoxGeometry(0.0105, 0.0025, 0.0105), 0x6b6358, { p: F.local(0, 0.0125, 0), q: F.q(0.2) });
      if (i < wallPts.length - 1) {
        const Fn = geoFrame(wallPts[i + 1][0], wallPts[i + 1][1], 0);
        const a = F.local(0, 0.003, 0), b = Fn.local(0, 0.003, 0);
        addRod(a, b, 0.0034, 0x9c9284, 6);
        // Almenas intermedias sobre el tramo
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          const Fm = geoFrame(wallPts[i][0] + (wallPts[i + 1][0] - wallPts[i][0]) * t, wallPts[i][1] + (wallPts[i + 1][1] - wallPts[i][1]) * t, 0);
          addGeo(new THREE.BoxGeometry(0.0055, 0.012, 0.0055), 0x8d8375, { p: Fm.local(0, 0.002, 0), q: Fm.q(0) });
        }
      }
    }
    // Pagoda Imperial Japonesa + Monte Fuji
    const Fp = geoFrame(35.6, 139.2, 0);
    reserve(35.6, 139.2, 0.10);
    addPlinth(Fp, 0.014, 0.014, 0x627358, 10);
    for (let t = 0; t < 4; t++) {
      const s = 1 - t * 0.17;
      addGeo(new THREE.BoxGeometry(0.010 * s, 0.006, 0.010 * s), 0xc43b2b, { p: Fp.local(0, 0.003 + t * 0.0075, 0), q: Fp.q(0) });
      addGeo(new THREE.ConeGeometry(0.0115 * s, 0.005, 4, 2), 0x262d38, { p: Fp.local(0, 0.0075 + t * 0.0075, 0), q: Fp.q(Math.PI / 4) });
    }
    addGeo(new THREE.CylinderGeometry(0.0007, 0.001, 0.007, 5), 0xe6be4c, { p: Fp.local(0, 0.036, 0), q: Fp.q(0) });
    features.push({ type: 'city', pos: Fp.local(0, 0.016, 0), size: 0.008 });
  }

  // 6. Nueva York: Estatua de la Libertad y Rascacielos Art Déco (40.7°N, -74.5°W)
  {
    const F = geoFrame(40.7, -74.5, 0);
    reserve(40.7, -74.5, 0.11);
    addPlinth(F, 0.017, 0.017, 0x6c7c66, 10);
    // Torres Art Déco escalonadas en piedra caliza clara con agujas doradas
    for (const [lx, lz, w, h, hex] of [[-0.005, -0.004, 0.0068, 0.027, 0xded9ce], [0.003, -0.005, 0.0062, 0.021, 0xc7c2b8], [-0.001, 0.004, 0.0058, 0.018, 0xd4cfc4]]) {
      addGeo(new THREE.BoxGeometry(w, h, w), hex, { p: F.local(lx, h * 0.45, lz), q: F.q(0.15), amt: 0.04 });
      addGeo(new THREE.ConeGeometry(w * 0.46, 0.010, 4), 0xe6c85e, { p: F.local(lx, h * 0.9 + 0.004, lz), q: F.q(Math.PI / 4 + 0.15) });
    }
    // Estatua verde cobre en la bahía
    addGeo(new THREE.BoxGeometry(0.0075, 0.0095, 0.0075), 0xd4c8b4, { p: F.local(0.009, 0.004, 0.008), q: F.q(0) });
    addGeo(new THREE.CylinderGeometry(0.0019, 0.0030, 0.013, 7), 0x4fb898, { p: F.local(0.009, 0.014, 0.008), q: F.q(0) });
    addGeo(new THREE.SphereGeometry(0.0018, 6, 5), 0x4fb898, { p: F.local(0.009, 0.022, 0.008) });
    addRod(F.local(0.010, 0.019, 0.008), F.local(0.012, 0.028, 0.009), 0.0010, 0x4fb898, 5);
    addGeo(new THREE.SphereGeometry(0.0015, 6, 5), 0xf8cf50, { p: F.local(0.012, 0.029, 0.009) });
    features.push({ type: 'city', pos: F.local(0.012, 0.030, 0.009), size: 0.008 });
  }

  // 7. Chichén Itzá (20.2°N, -88.8°W), Machu Picchu (-13.2°S, -72.5°W) y Cristo Redentor (-22.9°S, -43.8°W)
  {
    // El Castillo de Chichén Itzá con plinto cilíndrico bien apoyado
    const Fc = geoFrame(20.2, -88.8, 0);
    reserve(20.2, -88.8, 0.10);
    addGeo(new THREE.CylinderGeometry(0.014, 0.017, 0.014, 12), 0x4c7840, { p: Fc.local(0, -0.0055, 0), q: Fc.q(0) });
    for (let st = 0; st < 4; st++) {
      const bw = 0.019 - st * 0.0038;
      addGeo(new THREE.BoxGeometry(bw, 0.004, bw), 0xd8cab0, { p: Fc.local(0, 0.002 + st * 0.0038, 0), q: Fc.q(0.2) });
    }
    addGeo(new THREE.BoxGeometry(0.006, 0.0045, 0.006), 0xc7b898, { p: Fc.local(0, 0.018, 0), q: Fc.q(0.2) });

    // Machu Picchu (terrazas escalonadas y templo sobre cresta andina)
    const Fm = geoFrame(-13.2, -72.5, 0);
    reserve(-13.2, -72.5, 0.10);
    addGeo(new THREE.CylinderGeometry(0.015, 0.018, 0.014, 12), 0x497343, { p: Fm.local(0, -0.0055, 0), q: Fm.q(0) });
    for (let t = 0; t < 3; t++) {
      addGeo(new THREE.BoxGeometry(0.019 - t * 0.0038, 0.0045, 0.013 - t * 0.0028), 0x8f8a7d, { p: Fm.local(0, 0.002 + t * 0.004, 0), q: Fm.q(0.4) });
    }
    addGeo(new THREE.BoxGeometry(0.007, 0.006, 0.006), 0xa8a192, { p: Fm.local(-0.002, 0.015, 0), q: Fm.q(0.4) });
    addGeo(new THREE.ConeGeometry(0.006, 0.005, 4), 0x9b7e53, { p: Fm.local(-0.002, 0.020, 0), q: Fm.q(Math.PI / 4 + 0.4) });

    // Cristo Redentor en el Corcovado
    const Fr = geoFrame(-22.9, -43.8, 0);
    reserve(-22.9, -43.8, 0.10);
    addGeo(new THREE.ConeGeometry(0.013, 0.020, 7, 2), 0x5d645a, { p: Fr.local(0, 0.004, 0), q: Fr.q(0), amt: 0.07 });
    addGeo(new THREE.BoxGeometry(0.0055, 0.005, 0.0055), 0xdfd9cf, { p: Fr.local(0, 0.015, 0), q: Fr.q(0) });
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0026, 0.014, 8), 0xf4f0e8, { p: Fr.local(0, 0.023, 0), q: Fr.q(0) });
    addGeo(new THREE.BoxGeometry(0.017, 0.0022, 0.0024), 0xf4f0e8, { p: Fr.local(0, 0.027, 0), q: Fr.q(0) });
    addGeo(new THREE.SphereGeometry(0.0018, 6, 5), 0xf4f0e8, { p: Fr.local(0, 0.031, 0) });
    features.push({ type: 'city', pos: Fr.local(0, 0.030, 0), size: 0.008 });
  }

  // 8. Ópera de Sídney (-33.8°S, 150.8°E)
  {
    const F = geoFrame(-33.8, 150.8, 0);
    reserve(-33.8, 150.8, 0.10);
    addPlinth(F, 0.018, 0.015, 0x8f897e, 10);
    addGeo(new THREE.BoxGeometry(0.022, 0.004, 0.016), 0xcfc5b4, { p: F.local(0, 0.002, 0), q: F.q(-0.3) });
    for (const [lx, lz, sc] of [[-0.005, -0.002, 1.0], [0.001, -0.002, 1.15], [0.007, -0.001, 0.85], [-0.003, 0.004, 0.9], [0.004, 0.004, 0.95]]) {
      addGeo(new THREE.SphereGeometry(0.0052 * sc, 10, 6, 0, Math.PI, 0, Math.PI / 2), 0xfaf7f2, {
        p: F.local(lx, 0.0035, lz), q: F.q(-0.3), s: [0.65, 1.5, 1.0], amt: 0.02,
      });
    }
    features.push({ type: 'city', pos: F.local(0, 0.012, 0), size: 0.008 });
  }

  // 9. 6 Faros costeros con linterna nocturna (todos bien por encima del aro dorado)
  const LIGHTHOUSES = [
    [-46.2, -67.2], // Patagonia / Cabo Blanco
    [-33.5, 18.4],  // Cabo de Buena Esperanza
    [43.0, -8.8],   // Cabo Finisterre
    [47.5, -53.5],  // Terranova
    [54.2, 159.5],  // Kamchatka
    [-38.5, 144.5], // Cabo Otway / Sudeste Australiano
  ];
  for (const [lat, lon] of LIGHTHOUSES) {
    if (toDir(lat, lon)[1] < -CUT + 0.18) continue;
    const F = geoFrame(lat, lon, 0);
    reserve(lat, lon, 0.085);
    // Peñón de piedra hundido bajo la torre para evitar cualquier hueco en la costa
    addGeo(new THREE.CylinderGeometry(0.0085, 0.0115, 0.014, 9), 0x6f6c66, { p: F.local(0, -0.004, 0), q: F.q(0), amt: 0.07 });
    for (let b = 0; b < 4; b++) {
      const r0 = 0.0044 - b * 0.0005, r1 = 0.0044 - (b + 1) * 0.0005;
      addGeo(new THREE.CylinderGeometry(r1, r0, 0.0045, 10), b % 2 ? 0xc8443a : 0xf4f1ea, {
        p: F.local(0, 0.0045 + b * 0.0045, 0), q: F.q(0),
      });
    }
    addGeo(new THREE.CylinderGeometry(0.0032, 0.0030, 0.0018, 10), 0x3b3f46, { p: F.local(0, 0.021, 0), q: F.q(0) });
    addGeo(new THREE.CylinderGeometry(0.0020, 0.0020, 0.0042, 8), 0xffe48c, { p: F.local(0, 0.024, 0), q: F.q(0) });
    addGeo(new THREE.ConeGeometry(0.0028, 0.0045, 8), 0xb8382f, { p: F.local(0, 0.028, 0), q: F.q(0) });
    features.push({ type: 'city', pos: F.local(0, 0.024, 0), size: 0.008 });
  }

  // --- B. Cumbres rocosas y volcanes (~48 picos en grandes cordilleras) ---
  {
    const peakList = [];
    for (let tries = 0; peakList.length < 48 && tries < 3200; tries++) {
      const lat = -82 + rng() * 160, lon = -180 + rng() * 360;
      if (isBlocked(lat, lon, 0.03)) continue;
      if (!isLand(lat, lon)) continue;
      const m = mountainRaw(lat, lon);
      if (m < 0.36) continue;
      const [ex, ey, ez] = earthDir(lat, lon);
      if (peakList.some((q) => Math.hypot(ex - q[0], ey - q[1], ez - q[2]) < 0.085)) continue;
      peakList.push([ex, ey, ez]);
      reserve(lat, lon, 0.045);

      const F = geoFrame(lat, lon, 0);
      const sc = 0.75 + rng() * 0.55;
      const isVolcano = Math.abs(lat) < 42 && peakList.length % 10 === 0;
      const h = (0.016 + m * 0.012) * sc, rad = 0.0105 * sc;
      // Base rocosa hundida -0.006 en el terreno
      addGeo(new THREE.CylinderGeometry(rad * 0.38, rad * 1.15, h * 0.72, 8, 2), isVolcano ? 0x4d4743 : 0x6f665a, {
        p: F.local(0, h * 0.18, 0), q: F.q(rng() * 3), amt: 0.08,
      });
      if (isVolcano) {
        addGeo(new THREE.CylinderGeometry(rad * 0.25, rad * 0.40, h * 0.36, 8), 0x443d39, {
          p: F.local(0, h * 0.65, 0), q: F.q(0), amt: 0.06,
        });
        addGeo(new THREE.CylinderGeometry(rad * 0.18, rad * 0.18, 0.0025, 8), 0xe85a1c, {
          p: F.local(0, h * 0.83, 0), q: F.q(0),
        });
        features.push({ type: 'city', pos: F.local(0, h * 0.85, 0), size: 0.008 });
      } else {
        addGeo(new THREE.ConeGeometry(rad * 0.42, h * 0.48, 8, 2), (Math.abs(lat) > 25 || m > 0.55) ? 0xf2f6f8 : 0x7a7064, {
          p: F.local(0, h * 0.72, 0), q: F.q(rng() * 3), amt: 0.04,
        });
      }
      // 2 peñascos laterales
      for (let c = 0; c < 2; c++) {
        const a = rng() * Math.PI * 2;
        addGeo(new THREE.IcosahedronGeometry(rad * 0.42, 1), 0x685f54, {
          p: F.local(Math.cos(a) * rad * 0.58, 0.001, Math.sin(a) * rad * 0.58), q: F.q(a), s: [1.1, 0.7, 0.9], amt: 0.08,
        });
      }
    }
  }

  // --- C. Bosques en miniatura (~200 árboles por bioma) ---
  {
    const trees = [];
    for (let tries = 0; trees.length < 200 && tries < 6500; tries++) {
      const lat = -54 + rng() * 124, lon = -180 + rng() * 360;
      if (isBlocked(lat, lon, 0.02)) continue;
      if (!isLand(lat, lon)) continue;
      if (isDesert(lat, lon) || mountainRaw(lat, lon) > 0.44) continue;
      const [ex, ey, ez] = earthDir(lat, lon);
      if (trees.some((q) => Math.hypot(ex - q[0], ey - q[1], ez - q[2]) < 0.048)) continue;
      trees.push([ex, ey, ez]);
      reserve(lat, lon, 0.024);

      const F = geoFrame(lat, lon, 0);
      const sc = 0.75 + rng() * 0.48;
      // Tronco hundido -0.004 en el suelo
      addGeo(new THREE.CylinderGeometry(0.0012 * sc, 0.0017 * sc, 0.008 * sc, 6), 0x5c3c22, {
        p: F.local(0, 0.001 * sc, 0), q: F.q(0),
      });
      if (lat > 44 || lat < -38) {
        // Conífera boreal/austral de 4 pisos
        for (let k = 0; k < 4; k++) {
          addGeo(new THREE.ConeGeometry((0.0062 - k * 0.0012) * sc, 0.007 * sc, 8, 2), k % 2 ? 0x265c36 : 0x1e4c2c, {
            p: F.local(0, (0.0055 + k * 0.0038) * sc, 0), q: F.q(rng() * 3), amt: 0.07,
          });
        }
      } else if (isSavanna(lat, lon)) {
        // Acacia africana de copa ancha y plana
        addGeo(new THREE.CylinderGeometry(0.0078 * sc, 0.0024 * sc, 0.0036 * sc, 9, 1), 0x6b8c3e, {
          p: F.local(0, 0.0065 * sc, 0), q: F.q(rng() * 3), amt: 0.07,
        });
        addGeo(new THREE.CylinderGeometry(0.0055 * sc, 0.0030 * sc, 0.0024 * sc, 8, 1), 0x7b9e47, {
          p: F.local(0.002 * sc, 0.0085 * sc, 0), q: F.q(rng() * 3), amt: 0.07,
        });
      } else {
        // Árbol frondoso tropical o templado (2 o 3 copas facetadas)
        const hex1 = Math.abs(lat) < 14 ? 0x227839 : 0x459449;
        const hex2 = Math.abs(lat) < 14 ? 0x2d8d44 : 0x56a858;
        addGeo(new THREE.IcosahedronGeometry(0.0054 * sc, 1), hex1, {
          p: F.local(0, 0.0078 * sc, 0), q: F.q(rng() * 3), s: [1.1, 0.85, 1.1], amt: 0.08,
        });
        addGeo(new THREE.IcosahedronGeometry(0.0038 * sc, 1), hex2, {
          p: F.local(0.002 * sc, 0.0112 * sc, 0.0015 * sc), q: F.q(rng() * 3), amt: 0.08,
        });
      }
    }
  }

  // --- D. Flota oceánica: 16 Galeones / Veleros en todos los océanos ---
  {
    const SHIPS = [
      [33, -42, 0.6], [16, -54, 1.2], [-18, -26, -0.4], [-38, -42, 0.3], [26, -26, -0.9], // Atlántico
      [35, 162, 1.9], [14, -142, 2.3], [-12, -118, 1.7], [-32, 174, -0.8], [5, -104, 1.1], // Pacífico
      [-14, 74, -1.2], [-26, 94, 0.9], [10, 62, 2.1],                                      // Índico
      [52, -22, 0.4], [-46, -56, -0.7], [-46, 128, 1.5],                                   // Rutas boreales y australes
    ];
    for (const [lat, lon, yaw] of SHIPS) {
      if (isLand(lat, lon) || isBlocked(lat, lon, 0.04)) continue;
      const F = geoFrame(lat, lon, 0);
      reserve(lat, lon, 0.08);
      // Estela blanca en V hundida en el océano + espuma de proa
      for (const side of [-1, 1]) {
        addGeo(new THREE.BoxGeometry(0.0020, 0.0020, 0.022, 1, 1, 4), 0xdcf4fc, {
          p: F.local(side * 0.0042, -0.0004, -0.013), q: F.q(yaw + side * 0.25), amt: 0.03,
        });
      }
      // Casco de madera bien asentado bajo la línea de flotación
      addGeo(new THREE.CylinderGeometry(0.0040, 0.0026, 0.020, 8, 2).rotateX(Math.PI / 2), 0x6b4126, {
        p: F.local(0, -0.0005, 0), q: F.q(yaw), s: [0.85, 0.85, 1], amt: 0.05,
      });
      // Castillo de popa y proa
      addGeo(new THREE.BoxGeometry(0.0054, 0.0040, 0.0062), 0x8a5836, { p: F.local(0, 0.0032, -0.0055), q: F.q(yaw) });
      addGeo(new THREE.ConeGeometry(0.0026, 0.007, 6).rotateX(Math.PI / 2), 0x5c361f, { p: F.local(0, 0.0018, 0.012), q: F.q(yaw) });
      // Bauprés y 2 mástiles con velas cuadras infladas
      addRod(F.local(0, 0.002, 0.009), F.local(0, 0.0065, 0.017), 0.0009, 0x4b2f1c, 5);
      for (const [mz, mh, sw, sh] of [[0.002, 0.022, 0.012, 0.011], [-0.005, 0.018, 0.0095, 0.0085]]) {
        const c = Math.cos(yaw), s = Math.sin(yaw);
        const lx = mz * s, lz = mz * c;
        addRod(F.local(lx, 0.001, lz), F.local(lx, mh, lz), 0.0009, 0x4b2f1c, 5);
        addGeo(new THREE.CylinderGeometry(sw * 0.5, sw * 0.5, sh, 8, 2, true, -0.9, 1.8), 0xf8f0dc, {
          p: F.local(lx, mh * 0.54, lz), q: F.q(yaw), s: [1, 1, 0.45], amt: 0.03,
        });
        addGeo(new THREE.CylinderGeometry(sw * 0.36, sw * 0.36, sh * 0.58, 7, 1, true, -0.9, 1.8), 0xf2e6cc, {
          p: F.local(lx, mh * 0.84, lz), q: F.q(yaw), s: [1, 1, 0.4], amt: 0.03,
        });
      }
      // Banderín en la cima y farol de popa
      addGeo(new THREE.ConeGeometry(0.0022, 0.006, 3).rotateX(-Math.PI / 2), 0xd43d2c, { p: F.local(0, 0.022, 0.001), q: F.q(yaw) });
      addGeo(new THREE.BoxGeometry(0.0024, 0.0028, 0.0024), 0xffdd78, { p: F.local(0, 0.0065, -0.0085), q: F.q(yaw) });
      features.push({ type: 'city', pos: F.local(0, 0.0075, -0.0085), size: 0.008 });
    }
  }

  // --- E. Ballenas emergiendo (6) + Icebergs y Atolones (28) ---
  {
    const WHALES = [[44, -36], [-24, -10], [22, -162], [-34, -135], [-40, 62], [58, -165]];
    for (const [lat, lon] of WHALES) {
      if (isLand(lat, lon) || isBlocked(lat, lon, 0.03)) continue;
      const F = geoFrame(lat, lon, 0);
      reserve(lat, lon, 0.06);
      const yaw = rng() * Math.PI * 2;
      // Lomo arqueado emergiendo del mar, cabeza, aleta dorsal y doble lóbulo caudal
      addGeo(new THREE.SphereGeometry(0.0056, 10, 7), 0x2c4257, { p: F.local(0, 0.0012, 0.002), q: F.q(yaw), s: [0.75, 0.72, 1.9], amt: 0.04 });
      addGeo(new THREE.ConeGeometry(0.0018, 0.005, 5), 0x223647, { p: F.local(0, 0.0046, -0.001), q: F.q(yaw), s: [0.6, 1, 1.2] });
      addGeo(new THREE.CylinderGeometry(0.0018, 0.0028, 0.009, 7).rotateX(Math.PI / 2 - 0.35), 0x2b3f52, { p: F.local(0, 0.0018, -0.009), q: F.q(yaw) });
      for (const side of [-1, 1]) {
        addGeo(new THREE.ConeGeometry(0.0032, 0.0075, 4), 0x223647, {
          p: F.local(side * 0.0035, 0.0042, -0.013), q: F.q(yaw).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0, side * -1.15))),
          s: [0.9, 1, 0.3],
        });
      }
      // Espuma ceñida al contorno del cuerpo y del chapoteo caudal
      for (const [fx, fy, fz, fr] of [[0, 0.0002, 0.007, 0.0032], [0.0035, 0, 0.002, 0.0026], [-0.0035, 0, 0.002, 0.0026], [0, 0.0002, -0.012, 0.0036]]) {
        addGeo(new THREE.IcosahedronGeometry(fr, 0), 0xe6f7fc, { p: F.local(fx, fy, fz), q: F.q(yaw), s: [1.2, 0.4, 1.2] });
      }
    }

    // Icebergs tabulares polares y atolones tropicales
    let nIce = 0, nAtoll = 0;
    for (let tries = 0; (nIce < 14 || nAtoll < 14) && tries < 3500; tries++) {
      const isPolar = nIce < 14 && (nAtoll >= 14 || tries % 2 === 0);
      const lat = isPolar ? (rng() < 0.5 ? 64 + rng() * 16 : -62 + rng() * 12) : (-22 + rng() * 44);
      const lon = -180 + rng() * 360;
      if (isLand(lat, lon) || isBlocked(lat, lon, 0.04)) continue;
      const F = geoFrame(lat, lon, 0);
      reserve(lat, lon, 0.055);
      if (isPolar) {
        nIce++;
        const s = 0.7 + rng() * 0.6;
        addGeo(new THREE.CylinderGeometry(0.007 * s, 0.010 * s, 0.009 * s, 7, 2), 0xeaf6fc, {
          p: F.local(0, 0.001, 0), q: F.q(rng() * 3), s: [1.2, 1, 0.85], amt: 0.04,
        });
        addGeo(new THREE.IcosahedronGeometry(0.0055 * s, 0), 0xc7e6f5, {
          p: F.local(0.003 * s, 0.004 * s, 0), q: F.q(rng() * 3), s: [1, 0.75, 1], amt: 0.04,
        });
      } else {
        nAtoll++;
        const rad = 0.008 + rng() * 0.005;
        addGeo(new THREE.CylinderGeometry(rad, rad * 1.15, 0.004, 14), 0x45c4cf, { p: F.local(0, -0.0005, 0), q: F.q(0) });
        addGeo(new THREE.TorusGeometry(rad * 0.78, 0.0022, 6, 14, Math.PI * 1.55), 0xe6d49c, {
          p: F.local(0, 0.0012, 0), q: F.q(rng() * 6).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))),
        });
        addGeo(new THREE.IcosahedronGeometry(0.0032, 1), 0x3b9146, { p: F.local(rad * 0.7, 0.0028, 0), q: F.q(0), s: [1.2, 0.7, 1.2] });
      }
    }
  }

  // =====================================================================
  // CAPA 4: CORONA ÁRTICA, RED AEROSTÁTICA, BANDA ECUATORIAL Y FALDÓN PLISADO
  // =====================================================================
  const qTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, TILT));
  const balloonPt = (latB, lonB, r) => {
    const cl = Math.cos(latB * DEG), a = lonB * DEG;
    const vx = cl * Math.sin(a) * r, vy = Math.sin(latB * DEG) * r, vz = cl * Math.cos(a) * r;
    const [tx, ty, tz] = tiltVec(vx, vy, vz);
    return [tx, YC + ty, tz];
  };

  // --- Corona Polar Norte (Válvula de Paracaídas con Esmalte Azul + Astrolabio) ---
  {
    const poleDir = tiltVec(0, 1, 0);
    const crownP = [poleDir[0] * (R + 0.010), YC + poleDir[1] * (R + 0.010), poleDir[2] * (R + 0.010)];
    const qCrown = qTilt.clone();
    // Base moldeada de bronce + disco interior esmaltado en azul marino con anillo graduado
    addGeo(new THREE.CylinderGeometry(0.044, 0.048, 0.012, 32), 0xb88b32, { p: crownP, q: qCrown, amt: 0.04 });
    addGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.0126, 32), 0x1b3452, { p: crownP, q: qCrown, amt: 0.03 });
    addGeo(new THREE.TorusGeometry(0.043, 0.0042, 10, 36), 0xdba93e, {
      p: [poleDir[0] * (R + 0.015), YC + poleDir[1] * (R + 0.015), poleDir[2] * (R + 0.015)],
      q: qCrown.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))),
      amt: 0.04,
    });
    addGeo(new THREE.TorusGeometry(0.025, 0.0018, 6, 32), 0xc79a3a, {
      p: [poleDir[0] * (R + 0.0162), YC + poleDir[1] * (R + 0.0162), poleDir[2] * (R + 0.0162)],
      q: qCrown.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))),
    });
    // Rosa de los vientos de 8 puntas en oro
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = i % 2 === 0 ? 0.038 : 0.026;
      addGeo(new THREE.ConeGeometry(0.0046, len, 4), i % 2 === 0 ? 0xf2c85b : 0xb3842c, {
        p: [crownP[0] + poleDir[0] * 0.0072, crownP[1] + poleDir[1] * 0.0072, crownP[2] + poleDir[2] * 0.0072],
        q: qCrown.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, a, 0, 'YXZ'))),
      });
    }
    // Esfera armilar / astrolabio de latón en el centro
    const armP = [poleDir[0] * (R + 0.032), YC + poleDir[1] * (R + 0.032), poleDir[2] * (R + 0.032)];
    addGeo(new THREE.CylinderGeometry(0.003, 0.005, 0.018, 10), 0xc79a3a, {
      p: [poleDir[0] * (R + 0.020), YC + poleDir[1] * (R + 0.020), poleDir[2] * (R + 0.020)], q: qCrown,
    });
    for (let r = 0; r < 3; r++) {
      addGeo(new THREE.TorusGeometry(0.014, 0.0014, 8, 28), 0xdfb148, {
        p: armP, q: qCrown.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(r * 0.9, r * 1.1, 0))),
      });
    }
    addGeo(new THREE.SphereGeometry(0.0045, 10, 8), 0xf6cf62, { p: armP });
    features.push({ type: 'sparkle', pos: armP, size: 0.01 });
  }

  // --- 16 Costuras Meridianas + Red Aerostática de Cordaje + Banda Ecuatorial de Bronce ---
  {
    const N_MER = 16;
    const LAT_START = 77, LAT_END = -59;
    const STEPS_MER = 24;
    const surfRAt = (latB, lonB) => {
      const p0 = balloonPt(latB, lonB, 1);
      const [gLat, gLon] = toGeo(p0[0], p0[1] - YC, p0[2]);
      return R * (1 + elevation(gLat, gLon));
    };

    for (let m = 0; m < N_MER; m++) {
      const lonB = (m / N_MER) * 360;
      for (let s = 0; s < STEPS_MER; s++) {
        const l0 = LAT_START + (LAT_END - LAT_START) * (s / STEPS_MER);
        const l1 = LAT_START + (LAT_END - LAT_START) * ((s + 1) / STEPS_MER);
        const r0 = surfRAt(l0, lonB) + 0.0012;
        const r1 = surfRAt(l1, lonB) + 0.0012;
        addRod(balloonPt(l0, lonB, r0), balloonPt(l1, lonB, r1), 0.0016, m % 2 ? 0xc29b59 : 0xab8444, 6);
      }
    }

    // Red en rombo envolviendo el hemisferio inferior (latitud globo -2° a -59°)
    const NET_STEPS = 10, NET_L0 = -2, NET_L1 = -59;
    for (let m = 0; m < N_MER; m++) {
      const baseLon = (m / N_MER) * 360;
      for (const dirSign of [-1, 1]) {
        for (let s = 0; s < NET_STEPS; s++) {
          const t0 = s / NET_STEPS, t1 = (s + 1) / NET_STEPS;
          const l0 = NET_L0 + (NET_L1 - NET_L0) * t0;
          const l1 = NET_L0 + (NET_L1 - NET_L0) * t1;
          const lo0 = baseLon + dirSign * t0 * (360 / N_MER);
          const lo1 = baseLon + dirSign * t1 * (360 / N_MER);
          const r0 = surfRAt(l0, lo0) + 0.0018;
          const r1 = surfRAt(l1, lo1) + 0.0018;
          addRod(balloonPt(l0, lo0, r0), balloonPt(l1, lo1, r1), 0.0015, 0xd4be92, 6);
          if (s % 2 === 1 && dirSign === 1) {
            addGeo(new THREE.SphereGeometry(0.0024, 6, 4), 0xb88b32, { p: balloonPt(l0, lo0, r0 + 0.0005) });
          }
        }
      }
    }

    // Banda ecuatorial de bronce sobre los tramos oceánicos del ecuador terrestre (se hunde en las costas)
    const EQ_SEGS = 96;
    for (let i = 0; i < EQ_SEGS; i++) {
      const lon0 = -180 + (i / EQ_SEGS) * 360;
      const lon1 = -180 + ((i + 1) / EQ_SEGS) * 360;
      const lonMid = (lon0 + lon1) * 0.5;
      const e0 = elevation(0, lon0), e1 = elevation(0, lon1), em = elevation(0, lonMid);
      if (e0 > 0.002 && e1 > 0.002 && em > 0.002) continue;
      const d0 = toDir(0, lon0), d1 = toDir(0, lon1);
      const rEq = R + 0.0012;
      const pA = [d0[0] * rEq, YC + d0[1] * rEq, d0[2] * rEq];
      const pB = [d1[0] * rEq, YC + d1[1] * rEq, d1[2] * rEq];
      addRod(pA, pB, 0.0020, i % 2 ? 0xc89a3c : 0xb3842c, 6);
      if (i % 3 === 0 && em <= 0.002) {
        const dm = toDir(0, lonMid);
        addGeo(new THREE.SphereGeometry(0.0026, 6, 5), 0xe6be56, { p: [dm[0] * (rEq + 0.0006), YC + dm[1] * (rEq + 0.0006), dm[2] * (rEq + 0.0006)] });
      }
    }
  }

  // --- Faldón Plisado de 32 Gajos, Anillo Dorado, 24 Banderines y Boca ---
  const yTop = YC - R * CUT;
  const rTop = R * Math.sin(31 * DEG) + 0.003;
  const yMouth = 0.158, rMouth = 0.046;
  {
    const GORES = 32, ANG_STEPS = 256, V_STEPS = 14;
    const hSkirt = yTop - yMouth;
    const gorePal = [0xc93524, 0xf5ebd6, 0x22466e, 0xdca038];
    const radialVec = new THREE.Vector3();

    const skirtPt = (u, v, wallOff = 0) => {
      const ang = u * Math.PI * 2;
      const goreT = (u * GORES) % 1;
      const billow = Math.sin(goreT * Math.PI) * 0.0042 * Math.sin(v * Math.PI);
      const rBase = rMouth + (rTop - rMouth) * v + billow + wallOff;
      const y = yMouth + hSkirt * v;
      return new THREE.Vector3(Math.cos(ang) * rBase, y, Math.sin(ang) * rBase);
    };

    for (let j = 0; j < V_STEPS; j++) {
      const v0 = j / V_STEPS, v1 = (j + 1) / V_STEPS;
      for (let i = 0; i < ANG_STEPS; i++) {
        const u0 = i / ANG_STEPS, u1 = (i + 1) / ANG_STEPS;
        const gIdx = Math.floor(((u0 + u1) * 0.5) * GORES) % 4;
        const hexOut = j === 0 ? 0xc79a3a : gorePal[gIdx];
        const hexIn = j === 0 ? 0x9e7426 : 0xb34b28;

        const aO = skirtPt(u0, v0, 0), bO = skirtPt(u1, v0, 0), cO = skirtPt(u1, v1, 0), dO = skirtPt(u0, v1, 0);
        const aI = skirtPt(u0, v0, -0.0024), bI = skirtPt(u1, v0, -0.0024), cI = skirtPt(u1, v1, -0.0024), dI = skirtPt(u0, v1, -0.0024);
        radialVec.set((aO.x + bO.x) * 0.5, 0, (aO.z + bO.z) * 0.5);
        addTri(aO, bO, cO, jitter(hexOut, 0.035), radialVec);
        addTri(aO, cO, dO, jitter(hexOut, 0.035), radialVec);
        radialVec.negate();
        addTri(aI, cI, bI, jitter(hexIn, 0.04), radialVec);
        addTri(aI, dI, cI, jitter(hexIn, 0.04), radialVec);
      }
    }

    // 32 costuras verticales en relieve sobre los pliegues del faldón
    for (let g = 0; g < GORES; g++) {
      const ang = (g / GORES) * Math.PI * 2;
      const c = Math.cos(ang), s = Math.sin(ang);
      addRod([c * (rMouth + 0.0005), yMouth, s * (rMouth + 0.0005)], [c * (rTop + 0.0005), yTop, s * (rTop + 0.0005)], 0.0015, 0xb88b32, 5);
    }

    // Aro dorado doble superior con remaches + aro de carga inferior en cuero y bronce
    const torusAt = (r, tube, y, hex, segs = 40) =>
      addGeo(new THREE.TorusGeometry(r, tube, 10, segs), hex, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], amt: 0.04 });
    torusAt(rTop + 0.002, 0.0046, yTop, 0xc79a3a, 44);
    torusAt(rTop + 0.004, 0.0024, yTop - 0.005, 0xa87c28, 44);
    torusAt(rMouth, 0.0044, yMouth, 0x453226, 36);
    torusAt(rMouth + 0.001, 0.0022, yMouth + 0.004, 0xb88b32, 36);

    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      addGeo(new THREE.SphereGeometry(0.0024, 6, 5), 0xf0c95c, {
        p: [Math.cos(a) * (rTop + 0.0055), yTop, Math.sin(a) * (rTop + 0.0055)],
      });
    }

    // 24 banderines festivos tridimensionales con borlas doradas
    const flags = [0xf2c14e, 0x4fa3c7, 0x79b25e, 0xd2553f];
    for (let i = 0; i < 24; i++) {
      const a = ((i + 0.5) / 24) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), rr = rTop + 0.0075;
      addGeo(new THREE.ConeGeometry(0.0068, 0.021, 4), flags[i % 4], {
        p: [c * rr, yTop - 0.016, s * rr], r: [Math.PI, -a, 0], s: [1, 1, 0.3], amt: 0.04,
      });
      addGeo(new THREE.SphereGeometry(0.0020, 6, 4), 0xe6be56, { p: [c * rr, yTop - 0.027, s * rr] });
    }
  }

  // =====================================================================
  // CAPA 5: BARQUILLA TEJIDA EN 3D, EQUIPAMIENTO Y QUEMADOR DOBLE
  // =====================================================================
  const yRim = 0.074, rRim = 0.045, rBot = 0.036;
  {
    // Cuerpo interior sólido + fondo cerrado con patines de caoba
    const N = 24, HS = 8;
    addGeo(new THREE.CylinderGeometry(rRim - 0.001, rBot - 0.001, yRim, N, HS, false), 0, {
      p: [0, yRim / 2 + 0.002, 0],
      colorFn: (va, vb, vc) => {
        const cx = (va.x + vb.x + vc.x) / 3, cy = (va.y + vb.y + vc.y) / 3, cz = (va.z + vb.z + vc.z) / 3;
        if (cy < 0.006) return jitter(0x52351e, 0.05);
        const a = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (2 * Math.PI)) * N + 1e-6);
        const b = Math.floor((cy / yRim) * HS + 1e-6);
        return jitter((a + b) % 2 ? 0xa37540 : 0x8a5f30, 0.05);
      },
    });
    // Piso interior entablonado
    for (let k = -3; k <= 3; k++) {
      addGeo(new THREE.BoxGeometry(0.054, 0.004, 0.007), k % 2 ? 0x734a28 : 0x613c20, { p: [0, 0.007, k * 0.0085] });
    }
    // Patines de aterrizaje bajo la base
    for (const sz of [-0.016, 0.016]) {
      addGeo(new THREE.BoxGeometry(0.068, 0.005, 0.007), 0x452b17, { p: [0, -0.001, sz] });
    }

    // Tejido 3D real: 13 anillos tóricos horizontales de mimbre + 24 montantes verticales + esquineros de cuero
    for (let r = 0; r < 13; r++) {
      const t = (r + 0.5) / 13;
      const ry = 0.005 + t * (yRim - 0.007);
      const rr = rBot + (rRim - rBot) * t + 0.0005;
      addGeo(new THREE.TorusGeometry(rr, 0.0025, 8, 32), r % 2 ? 0xc29356 : 0xad7e43, {
        p: [0, ry, 0], r: [Math.PI / 2, 0, 0], amt: 0.04,
      });
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      addRod([c * (rBot + 0.001), 0.004, s * (rBot + 0.001)], [c * (rRim + 0.001), yRim, s * (rRim + 0.001)], 0.0018, 0x875c2e, 6);
    }
    // 4 refuerzos de cuero en los cuadrantes con tachuelas doradas
    for (let i = 0; i < 4; i++) {
      const a = (i + 0.5) / 4 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const rm = (rBot + rRim) * 0.5 + 0.0025;
      addGeo(new THREE.BoxGeometry(0.011, yRim * 0.86, 0.0035), 0x452b19, {
        p: [c * rm, yRim * 0.5, s * rm], r: [0, -a + Math.PI / 2, 0],
      });
      for (const hy of [0.018, 0.038, 0.058]) {
        const rh = rBot + (rRim - rBot) * (hy / yRim) + 0.0042;
        addGeo(new THREE.SphereGeometry(0.0018, 5, 4), 0xdcb046, { p: [c * rh, hy, s * rh] });
      }
    }

    // Borda superior acolchada en cuero marrón con costuras
    addGeo(new THREE.TorusGeometry(rRim + 0.001, 0.0056, 12, 44), 0x5c361e, { p: [0, yRim, 0], r: [Math.PI / 2, 0, 0], amt: 0.04 });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      addGeo(new THREE.TorusGeometry(0.0058, 0.0012, 5, 10), 0xc79a3a, {
        p: [Math.cos(a) * (rRim + 0.001), yRim, Math.sin(a) * (rRim + 0.001)], r: [0, -a, 0],
      });
    }

    // 4 Tanques de gas en latón y cobre dentro de la barquilla + válvulas
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4, rr = 0.022;
      const tx = Math.cos(a) * rr, tz = Math.sin(a) * rr;
      addGeo(new THREE.CylinderGeometry(0.0085, 0.0085, 0.050, 12), 0xb88635, { p: [tx, 0.034, tz], amt: 0.04 });
      addGeo(new THREE.SphereGeometry(0.0085, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xc89a3c, { p: [tx, 0.059, tz] });
      addGeo(new THREE.CylinderGeometry(0.0022, 0.0022, 0.007, 6), 0x3b3f46, { p: [tx, 0.068, tz] });
      addGeo(new THREE.TorusGeometry(0.0034, 0.0009, 5, 10), 0xc93524, { p: [tx, 0.072, tz], r: [Math.PI / 2, 0, 0] });
    }

    // 8 Cabos principales de suspensión + tensores + cáncamos en la boca
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      addRod([c * rRim, yRim, s * rRim], [c * rMouth, yMouth, s * rMouth], 0.0020, 0xd8c9a8, 6);
      addGeo(new THREE.TorusGeometry(0.0032, 0.0012, 6, 10), 0xb88b32, {
        p: [c * rMouth, yMouth - 0.003, s * rMouth], r: [0, -a, 0],
      });
      // Sacos de lastre detallados colgando por fuera de la borda
      const bx = c * (rRim + 0.008), bz = s * (rRim + 0.008);
      addRod([c * (rRim + 0.004), yRim, s * (rRim + 0.004)], [bx, yRim - 0.022, bz], 0.0015, 0xd8c9a8, 5);
      addGeo(new THREE.IcosahedronGeometry(0.0082, 1), 0xcdb58a, {
        p: [bx, yRim - 0.030, bz], s: [0.95, 1.3, 0.95], r: [rng() * 3, rng() * 3, 0], amt: 0.07,
      });
      addGeo(new THREE.TorusGeometry(0.0046, 0.0015, 5, 10), 0x735230, {
        p: [bx, yRim - 0.021, bz], r: [Math.PI / 2, 0, 0],
      });
    }

    // Equipamiento de expedición en la borda: telescopio, brújula, ancla, salvavidas, rollos y 2 faroles
    // Telescopio de latón en el frente-derecha (+X, +Z)
    {
      const tx = 0.028, tz = 0.036;
      addRod([tx, yRim, tz], [tx + 0.004, yRim + 0.016, tz + 0.004], 0.0020, 0x3b3f46, 6);
      addGeo(new THREE.CylinderGeometry(0.0035, 0.0022, 0.026, 10), 0xd4a438, {
        p: [tx + 0.007, yRim + 0.018, tz + 0.008], r: [Math.PI / 3, -0.5, 0],
      });
      addGeo(new THREE.CylinderGeometry(0.0042, 0.0038, 0.004, 10), 0x6cb8d4, {
        p: [tx + 0.012, yRim + 0.022, tz + 0.015], r: [Math.PI / 3, -0.5, 0],
      });
    }
    // Bitácora con brújula en el frente-izquierda
    addGeo(new THREE.CylinderGeometry(0.0055, 0.0065, 0.016, 10), 0x5c361e, { p: [-0.028, yRim + 0.006, 0.036] });
    addGeo(new THREE.SphereGeometry(0.0052, 10, 6), 0xd4a438, { p: [-0.028, yRim + 0.015, 0.036] });
    // Salvavidas anular colgado en el costado derecho
    addGeo(new THREE.TorusGeometry(0.011, 0.0035, 8, 18), 0xd44632, { p: [rRim + 0.005, yRim * 0.65, 0], r: [0, Math.PI / 2, 0] });
    addGeo(new THREE.TorusGeometry(0.0112, 0.0038, 6, 8, 0.5), 0xf4f0e6, { p: [rRim + 0.005, yRim * 0.65, 0], r: [0, Math.PI / 2, 0] });
    // Ancla sujeta al costado izquierdo
    {
      const ax = -(rRim + 0.005), ay = yRim * 0.55;
      addRod([ax, ay - 0.014, 0], [ax, ay + 0.014, 0], 0.0018, 0x3b3f46, 6);
      addRod([ax, ay + 0.010, -0.009], [ax, ay + 0.010, 0.009], 0.0016, 0x3b3f46, 6);
      addGeo(new THREE.TorusGeometry(0.010, 0.0018, 6, 12, Math.PI), 0x3b3f46, { p: [ax, ay - 0.006, 0], r: [Math.PI, Math.PI / 2, 0] });
    }
    // 2 faroles de bronce en el frente de la barquilla
    for (const sx of [-1, 1]) {
      const lx = sx * 0.038, ly = yRim + 0.018, lz = 0.028;
      addRod([sx * 0.032, yRim, 0.024], [lx, ly + 0.006, lz], 0.0016, 0x3b3f46, 5);
      addGeo(new THREE.CylinderGeometry(0.0042, 0.0032, 0.009, 6), 0xffdd78, { p: [lx, ly, lz] });
      addGeo(new THREE.ConeGeometry(0.0054, 0.005, 6), 0x8f6b24, { p: [lx, ly + 0.0065, lz] });
      features.push({ type: 'city', pos: [lx, ly, lz], size: 0.008 });
    }

    // 2 Hélices laterales de bronce (ejes Z con palas radiales en X-Y) y timones con marco de caoba
    for (const side of [-1, 1]) {
      const px = side * (rRim + 0.018), py = yRim * 0.72, pz = -0.004;
      addRod([side * (rRim - 0.003), py, pz], [px, py, pz], 0.0026, 0x735230, 6);
      addGeo(new THREE.CylinderGeometry(0.0055, 0.0045, 0.018, 10).rotateX(Math.PI / 2), 0xb88635, { p: [px, py, pz] });
      addGeo(new THREE.ConeGeometry(0.0046, 0.007, 10).rotateX(Math.PI / 2), 0xdfb148, { p: [px, py, pz + 0.012] });
      for (let b = 0; b < 4; b++) {
        const ba = b * (Math.PI / 2) + 0.35;
        const bx = px + Math.cos(ba) * 0.010, by = py + Math.sin(ba) * 0.010;
        addGeo(new THREE.BoxGeometry(0.0038, 0.015, 0.0014), 0x9c6838, {
          p: [bx, by, pz + 0.0085], r: [0.35, 0.25, ba - Math.PI / 2],
        });
      }
      // Timón trapezoidal de lona con bordes de madera tras la góndola
      const rudShape = new THREE.Shape();
      rudShape.moveTo(0, -0.008); rudShape.lineTo(0.022, -0.014); rudShape.lineTo(0.020, 0.014); rudShape.lineTo(0, 0.008);
      rudShape.closePath();
      const rudGeo = new THREE.ExtrudeGeometry(rudShape, { depth: 0.0022, bevelEnabled: false });
      rudGeo.rotateY(Math.PI / 2);
      addGeo(rudGeo, 0xe8d9bc, { p: [px - 0.0011, py, pz - 0.006], amt: 0.03 });
      addRod([px, py + 0.008, pz - 0.006], [px, py + 0.014, pz - 0.026], 0.0015, 0x6b4426, 5);
      addRod([px, py - 0.008, pz - 0.006], [px, py - 0.014, pz - 0.028], 0.0015, 0x6b4426, 5);
      addRod([px, py - 0.014, pz - 0.028], [px, py + 0.014, pz - 0.026], 0.0015, 0x6b4426, 5);
    }

    // Quemador Doble de Latón con Serpentines de Cobre (más bajo para lucir las llamas en la boca)
    const yB = 0.110;
    addGeo(new THREE.BoxGeometry(0.088, 0.0045, 0.0065), 0x3b3f46, { p: [0, yB - 0.012, 0], r: [0, Math.PI / 4, 0] });
    addGeo(new THREE.BoxGeometry(0.088, 0.0045, 0.0065), 0x3b3f46, { p: [0, yB - 0.012, 0], r: [0, -Math.PI / 4, 0] });
    addGeo(new THREE.CylinderGeometry(0.015, 0.017, 0.005, 12), 0x525861, { p: [0, yB - 0.009, 0] });
    for (const sx of [-0.010, 0.010]) {
      addGeo(new THREE.CylinderGeometry(0.0085, 0.0095, 0.016, 12, 2), 0xc79a3a, { p: [sx, yB + 0.002, 0], amt: 0.05 });
      addGeo(new THREE.CylinderGeometry(0.0052, 0.0052, 0.006, 8), 0x2c2f35, { p: [sx, yB + 0.012, 0] });
      for (const cy of [yB - 0.002, yB + 0.005]) {
        addGeo(new THREE.TorusGeometry(0.0092, 0.0018, 7, 20), 0xb85e32, { p: [sx, cy, 0], r: [Math.PI / 2, 0, 0] });
      }
      addRod([sx, yB - 0.011, 0], [sx * 1.6, 0.068, 0.014], 0.0018, 0xb85e32, 6);
      features.push({ type: 'flame', pos: [sx, yB + 0.015, 0], size: 0.0125 });
    }
    // Luz cálida adicional en la boca del globo para iluminar el cuello por la noche
    features.push({ type: 'city', pos: [0, yMouth - 0.004, 0], size: 0.008 });
  }

  // =====================================================================
  // CAPA 6: EFECTOS VIVOS
  // =====================================================================
  for (const [lat, lon] of CITIES) {
    const d = toDir(lat, lon);
    if (d[1] < -CUT + 0.04) continue;
    features.push({ type: 'city', pos: surface(lat, lon, 0.0035), size: 0.008 });
  }
  for (let i = 0, tries = 0; i < 13 && tries < 600; tries++) {
    const lat = -42 + rng() * 110, lon = -180 + rng() * 360;
    const d = toDir(lat, lon);
    if (d[1] < -0.52) continue;
    const r = R * 1.135 + rng() * 0.014;
    features.push({ type: 'cloud', pos: [d[0] * r, YC + d[1] * r, d[2] * r], center: [0, YC, 0], size: 0.015 + rng() * 0.011 });
    i++;
  }
  for (let i = 0, tries = 0; i < 85 && tries < 3500; tries++) {
    const lat = -60 + rng() * 140, lon = -180 + rng() * 360;
    if (elevation(lat, lon) > 0 || toDir(lat, lon)[1] < -CUT + 0.06) continue;
    features.push({ type: 'sparkle', pos: surface(lat, lon, 0.002), size: 0.0095 });
    i++;
  }
  // Luciérnagas nocturnas sobre las selvas tropicales (Amazonas, Congo, Borneo)
  const JUNGLES = [[-4, -62], [-2, -55], [-6, -68], [0, 22], [-2, 18], [1, 114], [-1, 102], [4, -72]];
  for (const [jLat, jLon] of JUNGLES) {
    for (let k = 0; k < 2; k++) {
      const la = jLat + (rng() - 0.5) * 8, lo = jLon + (rng() - 0.5) * 10;
      if (toDir(la, lo)[1] < -CUT + 0.06) continue;
      features.push({ type: 'firefly', pos: surface(la, lo, 0.012), size: 0.022 });
    }
  }
  features.push({ type: 'gulls', pos: [0, 0.132, 0], size: 0.155 });

  return finish('El Mundo en Globo');
}
