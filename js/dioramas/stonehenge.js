// Diorama "Stonehenge" — El Santuario Megalítico de la Llanura de Salisbury (~182k triángulos)
// Topografía neolítica de Wiltshire sobre zócalo geológico de creta blanca y vetas de sílex:
//   Terraplén interior (Inner Bank), Foso anular excavado (Ditch) y Contratrinchera (Counterscarp),
//   Círculo Exterior de Sarsen (30 estaciones: 22 ortostatos en pie, 8 caídos/inclinados y 16 dinteles curvos con caja y espiga),
//   Herradura Interior de los 5 Grandes Trilitones escalonados hacia el Gran Trilitón Central (Y = 0.212),
//   Círculo Exterior de 38 Piedras Azules de Preseli + Herradura Interior de 19 Piedras Azules + Piedra del Altar,
//   56 Pozos de Aubrey, 4 Piedras de las Estaciones (2 monolitos + North/South Barrows), Piedra del Sacrificio y Piedras del Portal,
//   Avenida Procesional del Solsticio, Piedra Talón (Heel Stone) con su foso, Pórtico Solar de Madera y Meandro del Río Avon,
//   Santuario de Woodhenge (3 anillos de roble), Trineo y Cabria Neolítica, Aldea de Durrington (5 cabañas circulares),
//   6 Túmulos Reales de la Edad del Bronce (Round Barrows), muelle con 2 canoas, rebaño de 12 ovejas y bosque de robles y tejos.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildStonehenge(seed = 211) {
  const { rng, fbm, features, tmpColor, jitter, addTri, addGeo, addRod, finish, e1, e2, stats } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  // =====================================================================
  // 1. PALETA MEGALÍTICA DE WILTSHIRE Y MATERIALES PROCEDIMENTALES
  // =====================================================================
  // Arenisca silícea sarsen de Marlborough Downs con pátina de líquenes dorados/oliva y base húmeda
  const sarsenStoneColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 38 + 2.1, cz * 38 + 5.7);
    const strata = Math.floor((cy * 190 * scale) + n * 2.6) & 3;
    const pal = [0x9e9788, 0x8d8678, 0xaca596, 0x7e786b];
    let hex = pal[strata];
    // Líquenes verde-oliva y oro pálido en caras expuestas altas
    const lichen = fbm(cx * 62 + cy * 30, cz * 62 - cy * 25);
    if (lichen > 0.66 && (yFloor < -0.5 || cy > yFloor + 0.014)) {
      hex = lichen > 0.75 ? 0xb5a664 : 0x7c865b;
    }
    // Humedad y musgo en el zócalo inferior
    if (yFloor > -0.5 && cy - yFloor < 0.009) {
      hex = ((Math.floor(cx * 220) + Math.floor(cz * 220)) & 1) ? 0x626956 : 0x6e6a5d;
    }
    return jitter(hex, 0.036);
  };

  // Dolerita moteada azul-pizarra de las colinas de Preseli (Gales) con motas de cuarzo blanco
  const preseliBluestoneColor = (yFloor = -1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const q = ((Math.floor(cx * 310) * 73856093) ^ (Math.floor(cy * 310) * 19349663) ^ (Math.floor(cz * 310) * 83492791)) & 15;
    if (q === 0) return jitter(0xb8c0c4, 0.03); // mota mineral de cuarzo/plagioclasa
    const pal = [0x4c5d6b, 0x3e4d59, 0x5c6d7a, 0x35434e];
    let hex = pal[q & 3];
    if (yFloor > -0.5 && cy - yFloor < 0.006 && (q & 1)) hex = 0x3a483c;
    return jitter(hex, 0.035);
  };

  // Arenisca micácea verde-grisácea para la Piedra del Altar
  const altarSandstoneColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const band = Math.floor((cx * 140 + cz * 140 + cy * 90)) & 3;
    const pal = [0x606b60, 0x525d52, 0x6f796c, 0x485249];
    return jitter(pal[band], 0.032);
  };

  // Creta blanca de Wiltshire con vetas oscuras de sílex en el foso y zócalo
  const chalkStrataColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const flintBand = Math.floor(cy * 120 + fbm(cx * 34, cz * 34) * 1.4) & 7;
    if (flintBand === 3) return jitter(0x4b4e4c, 0.04);
    const pal = [0xf2efe6, 0xe6e1d3, 0xd8d2c1, 0xebe7da];
    return jitter(pal[flintBand & 3], 0.025);
  };

  // Paja dorada-ocre en capas para techos neolíticos
  const thatchRoofColor = (yRef = 0) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const layer = Math.floor((cy - yRef) * 340 + fbm(cx * 58, cz * 58) * 1.5) & 3;
    const pal = [0xc29e54, 0xaf8b43, 0xd0ae64, 0x997636];
    return jitter(pal[layer], 0.045);
  };

  // Madera de roble antiguo para Woodhenge, cabria y trineo
  const oakTimberColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const ring = Math.floor((cy * 260 + (cx + cz) * 90)) & 3;
    const pal = [0x6d4b2d, 0x5c3e24, 0x7c5837, 0x4d331c];
    return jitter(pal[ring], 0.042);
  };

  const turfColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const n = fbm(cx * 38 + 4, cz * 38 + 7);
    const pal = [0x4c7e35, 0x5c903e, 0x406e2d, 0x679947];
    return jitter(pal[Math.floor(n * 4) & 3], 0.048);
  };

  // Desplazamiento orgánico con coordenadas cuantizadas para mantener costuras selladas
  const displaceGeo = (geo, amp = 0.00042, yScale = 0.55) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const qx = Math.round(x * 2000), qy = Math.round(y * 2000), qz = Math.round(z * 2000);
      let h = (qx * 374761393 + qy * 668265263 + qz * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const n1 = ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
      h = Math.imul(h ^ (h >>> 11), 668265263);
      const n2 = ((h ^ (h >>> 15)) >>> 0) / 4294967296 - 0.5;
      h = Math.imul(h ^ (h >>> 9), 1597334677);
      const n3 = ((h ^ (h >>> 14)) >>> 0) / 4294967296 - 0.5;
      p.setXYZ(i, x + n1 * amp, y + n2 * amp * yScale, z + n3 * amp);
    }
    return geo;
  };

  // =====================================================================
  // 2. HELPERS GEOMÉTRICOS DE ALTA DENSIDAD
  // =====================================================================
  const pickRGB = (colorOrFn, va, vb, vc, amt = 0.03) =>
    typeof colorOrFn === 'function' ? colorOrFn(va, vb, vc)
      : Array.isArray(colorOrFn) ? colorOrFn : jitter(colorOrFn, amt);

  const addQuad = (a, b, c, d, colorOrFn, want, amt = 0.03) => {
    addTri(a, b, c, pickRGB(colorOrFn, a, b, c, amt), want);
    addTri(a, c, d, pickRGB(colorOrFn, a, c, d, amt), want);
  };

  const _pc = new THREE.Vector3(), _fc = new THREE.Vector3(), _wn = new THREE.Vector3();
  const addPrism = (bot, top, colorOrFn, caps = true, amt = 0.03) => {
    const n = bot.length;
    _pc.set(0, 0, 0);
    for (let i = 0; i < n; i++) { _pc.add(bot[i]); _pc.add(top[i]); }
    _pc.multiplyScalar(0.5 / n);
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      _fc.copy(bot[i]).add(bot[i1]).add(top[i1]).add(top[i]).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(bot[i], bot[i1], top[i1], top[i], colorOrFn, _wn, amt);
    }
    if (caps && n >= 3) {
      _fc.set(0, 0, 0);
      for (let i = 0; i < n; i++) _fc.add(bot[i]);
      _fc.multiplyScalar(1 / n);
      _wn.subVectors(_fc, _pc);
      for (let i = 1; i < n - 1; i++) {
        addTri(bot[0], bot[i + 1], bot[i], pickRGB(colorOrFn, bot[0], bot[i + 1], bot[i], amt), _wn);
      }
      _fc.set(0, 0, 0);
      for (let i = 0; i < n; i++) _fc.add(top[i]);
      _fc.multiplyScalar(1 / n);
      _wn.subVectors(_fc, _pc);
      for (let i = 1; i < n - 1; i++) {
        addTri(top[0], top[i], top[i + 1], pickRGB(colorOrFn, top[0], top[i], top[i + 1], amt), _wn);
      }
    }
  };

  const _bx = new Array(8).fill(null).map(() => new THREE.Vector3());
  const addBoxDirect = (cx, cy, cz, w, h, d, colorOrFn, amt = 0.032, jitterV = 0, rotY = 0) => {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const jv = () => (jitterV ? (rng() - 0.5) * jitterV : 0);
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const setV = (idx, lx, ly, lz) => {
      const px = lx + jv(), pz = lz + jv();
      _bx[idx].set(cx + px * c + pz * s, cy + ly, cz - px * s + pz * c);
    };
    setV(0, -hw, -hh, -hd); setV(1, hw, -hh, -hd);
    setV(2, hw, -hh, hd); setV(3, -hw, -hh, hd);
    setV(4, -hw, hh, -hd); setV(5, hw, hh, -hd);
    setV(6, hw, hh, hd); setV(7, -hw, hh, hd);
    _pc.set(cx, cy, cz);
    const faces = [
      [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
      [4, 5, 6, 7], [3, 2, 1, 0],
    ];
    for (const [i0, i1, i2, i3] of faces) {
      const a = _bx[i0], b = _bx[i1], k = _bx[i2], e = _bx[i3];
      _fc.copy(a).add(b).add(k).add(e).multiplyScalar(0.25);
      _wn.subVectors(_fc, _pc);
      addQuad(a, b, k, e, colorOrFn, _wn, amt);
    }
  };

  const addSubBox = (w, h, d, sx, sy, sz, p, r = [0, 0, 0], fn = null, amp = 0.00042, taper = 0) => {
    const g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
    if (taper !== 0) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const f = 1 - taper * ((y + h * 0.5) / h);
        pos.setX(i, pos.getX(i) * f);
        pos.setZ(i, pos.getZ(i) * (0.94 + 0.06 * f));
      }
    }
    displaceGeo(g, amp);
    addGeo(g, 0x9b9485, { p, r, colorFn: fn || sarsenStoneColor() });
  };

  const _ba = new THREE.Vector3(), _bb = new THREE.Vector3(), _bd = new THREE.Vector3();
  const _bu = new THREE.Vector3(), _bv = new THREE.Vector3(), _br = new THREE.Vector3();
  const addBeam = (ax, ay, az, bx, by, bz, w, d, colorOrFn, refDir = null, pad = 0) => {
    _ba.set(ax, ay, az);
    _bb.set(bx, by, bz);
    _bd.subVectors(_bb, _ba);
    const len = _bd.length();
    if (len < 1e-6) return;
    _bd.divideScalar(len);
    if (pad > 0) {
      _ba.addScaledVector(_bd, -pad);
      _bb.addScaledVector(_bd, pad);
    }
    if (refDir) {
      _br.copy(refDir).normalize();
      if (Math.abs(_bd.dot(_br)) > 0.96) _br.copy(Math.abs(_bd.y) < 0.9 ? UP : AXIS_Z);
    } else {
      _br.copy(Math.abs(_bd.y) < 0.9 ? UP : AXIS_Z);
    }
    _bu.crossVectors(_bd, _br).normalize();
    _bv.crossVectors(_bu, _bd).normalize();
    const hw = w * 0.5, hd = d * 0.5;
    const mk = (base, sx, sz) => new THREE.Vector3(
      base.x + _bu.x * sx * hw + _bv.x * sz * hd,
      base.y + _bu.y * sx * hw + _bv.y * sz * hd,
      base.z + _bu.z * sx * hw + _bv.z * sz * hd,
    );
    const bot = [mk(_ba, -1, -1), mk(_ba, 1, -1), mk(_ba, 1, 1), mk(_ba, -1, 1)];
    const top = [mk(_bb, -1, -1), mk(_bb, 1, -1), mk(_bb, 1, 1), mk(_bb, -1, 1)];
    addPrism(bot, top, colorOrFn, true, 0.028);
  };

  const makeLocal = (cx, yBase, cz, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, yy, z) => [cx + x * c + z * s, yBase + yy, cz - x * s + z * c];
  };

  // =====================================================================
  // 3. TOPOGRAFÍA DE SALISBURY, HENGE, AVENIDA PROCESIONAL Y RÍO AVON
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.330, AZ = 0.330, FLOOR = -0.084;
  const HX = -0.015, HZ = -0.008, Y_HENGE = 0.078;
  const Y_RIVER = 0.005;
  const ANG_AXIS = -0.62; // Eje Noreste del Solsticio de Verano (+X, -Z)

  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 4.0) + Math.pow(Math.abs(s) / AZ, 4.0), 1 / 4.0);
  };

  const angleDiff = (a, b) => {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  const segDist = (x, z, pts) => {
    let md = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      md = Math.min(md, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
    }
    return md;
  };

  // Meandro del Río Avon en el borde oriental/suroriental
  const AVON_PTS = [[0.295, -0.235], [0.268, -0.105], [0.245, 0.035], [0.262, 0.165], [0.235, 0.295]];
  const AVON_W = 0.032;
  const avonDist = (x, z) => segDist(x, z, AVON_PTS);

  // Avenida Procesional desde la Entrada Noreste hacia la Piedra Talón y el Río Avon
  const AVE_START_X = HX + Math.cos(ANG_AXIS) * 0.150;
  const AVE_START_Z = HZ + Math.sin(ANG_AXIS) * 0.150;
  const HEEL_R = 0.215;
  const HEEL_X = HX + Math.cos(ANG_AXIS) * HEEL_R;
  const HEEL_Z = HZ + Math.sin(ANG_AXIS) * HEEL_R;
  const AVE_PTS = [
    [AVE_START_X, AVE_START_Z],
    [HEEL_X, HEEL_Z],
    [0.205, -0.150],
    [0.238, -0.115],
  ];
  const aveDist = (x, z) => segDist(x, z, AVE_PTS);

  // Túmulos Reales de Normanton Down y Cursus
  const BARROWS = [
    { x: -0.228, z: -0.155, r: 0.025, h: 0.015, yBase: 0.040, yaw: 0.45 },
    { x: -0.135, z: -0.238, r: 0.023, h: 0.014, yBase: 0.038, yaw: 1.15 },
    { x: -0.252, z: -0.020, r: 0.024, h: 0.014, yBase: 0.038, yaw: -0.35 },
    { x: -0.095, z: 0.238,  r: 0.024, h: 0.015, yBase: 0.038, yaw: 2.25 },
    { x: 0.038,  z: 0.248,  r: 0.023, h: 0.014, yBase: 0.036, yaw: 0.85 },
    { x: 0.025,  z: -0.248, r: 0.024, h: 0.014, yBase: 0.038, yaw: -1.10 },
  ];

  const WOODHENGE_POS = { x: 0.182, z: 0.158, y: 0.040 };
  const SLEDGE_POS = { x: 0.185, z: -0.035, y: 0.044 };
  const VILLAGE_POS = { x: -0.202, z: 0.145, y: 0.040 };

  const EXPLANADAS = [
    { x: HX, z: HZ, hw: 0.0, hd: 0.0, circle: true, r0: 0.142, r1: 0.154, y: Y_HENGE }, // Explanada interior del Henge
    { x: WOODHENGE_POS.x, z: WOODHENGE_POS.z, hw: 0.034, hd: 0.034, rot: 0.1, y: WOODHENGE_POS.y, r0: 0.010, r1: 0.030 },
    { x: SLEDGE_POS.x, z: SLEDGE_POS.z, hw: 0.024, hd: 0.020, rot: -0.3, y: SLEDGE_POS.y, r0: 0.008, r1: 0.024 },
    { x: VILLAGE_POS.x, z: VILLAGE_POS.z, hw: 0.050, hd: 0.042, rot: 0.22, y: VILLAGE_POS.y, r0: 0.010, r1: 0.036 },
    ...BARROWS.map((b) => ({ x: b.x, z: b.z, hw: 0.0, hd: 0.0, circle: true, r0: b.r * 1.15, r1: b.r * 1.55, y: b.yBase })),
  ];

  const rectDist = (x, z, p) => {
    if (p.circle) return Math.hypot(x - p.x, z - p.z);
    const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(lz) - p.hd));
  };

  // Relieve del terraplén y foso del Henge (sin tocar el centro nivelado r < 0.142)
  const hengeEarthworkOffset = (x, z) => {
    const dx = x - HX, dz = z - HZ;
    const r = Math.hypot(dx, dz);
    if (r < 0.144 || r > 0.196) return 0;
    const ang = Math.atan2(dz, dx);
    // Entradas Noreste (Solsticio) y Sur que interrumpen el foso y terraplén
    const gapNE = smooth(Math.abs(angleDiff(ang, ANG_AXIS)) / 0.16);
    const gapS = smooth(Math.abs(angleDiff(ang, 1.65)) / 0.12);
    const gateMask = gapNE * gapS;
    const innerBank = 0.0095 * Math.exp(-Math.pow((r - 0.154) / 0.0065, 2));
    const ditch = -0.0120 * Math.exp(-Math.pow((r - 0.168) / 0.0072, 2));
    const counterscarp = 0.0052 * Math.exp(-Math.pow((r - 0.181) / 0.0055, 2));
    return (innerBank + ditch + counterscarp) * gateMask;
  };

  const rawHeight = (x, z) => {
    // Loma suave de Salisbury: perímetro exterior bajo ascendiendo hacia el Henge
    const rCenter = Math.hypot((x - HX) / 0.30, (z - HZ) / 0.30);
    const mound = 0.056 * Math.pow(smooth(1.08 - rCenter), 1.05);
    const westDown = 0.014 * smooth(1 - Math.hypot((x + 0.18) / 0.18, (z + 0.05) / 0.22));
    let h = 0.015 + mound + westDown;
    h += (fbm(x * 16 + 3.2, z * 16 + 7.4) - 0.5) * 0.008;
    h += (fbm(x * 38 + 9.1, z * 38 + 2.5) - 0.5) * 0.003;

    // Cauce excavado del Río Avon al Este
    const ad = avonDist(x, z);
    const riverCut = smooth(1 - ad / (AVON_W * 1.48));
    h = h * (1 - riverCut * 0.85) + (Y_RIVER - 0.024) * smooth(1 - ad / (AVON_W * 0.95));

    // Terraplenes paralelos de la Avenida Procesional (fuera del círculo interior)
    const rH = Math.hypot(x - HX, z - HZ);
    if (rH > 0.148 && ad > AVON_W * 1.25) {
      const avd = aveDist(x, z);
      const aveBank = 0.0052 * Math.exp(-Math.pow((avd - 0.020) / 0.005, 2));
      const avePath = -0.0018 * Math.exp(-Math.pow(avd / 0.012, 2));
      h += (aveBank + avePath) * smooth((rH - 0.148) / 0.018);
    }
    return h;
  };

  const height = (x, z) => {
    let h = rawHeight(x, z);
    for (const p of EXPLANADAS) {
      const d = rectDist(x, z, p);
      const k = smooth((p.r1 - d) / (p.r1 - p.r0));
      h += (p.y - h) * k;
    }
    h += hengeEarthworkOffset(x, z);
    return h;
  };

  const slopeAt = (x, z) =>
    Math.hypot(height(x + 0.005, z) - height(x - 0.005, z), height(x, z + 0.005) - height(x, z - 0.005)) / 0.010;

  // Malla polar de alta resolución (K = 122, S = 320 -> ~77.760 triángulos en superficie)
  const K = 122, S = 320;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
      const h = height(x, z);
      const y = h < Y_RIVER ? Y_RIVER + (fbm(x * 54, z * 54) - 0.5) * 0.0012 : h;
      row.push({ v: new THREE.Vector3(x, y, z), h });
    }
    ringPts.push(row);
  }
  for (const p of ringPts[K]) if (p.h < Y_RIVER) p.v.y = Y_RIVER;

  const nrm = new THREE.Vector3();
  function terrainColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cy = (a.v.y + b.v.y + c.v.y) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;
    const h = (a.h + b.h + c.h) / 3;
    const hMax = Math.max(a.h, b.h, c.h);
    e1.subVectors(b.v, a.v); e2.subVectors(c.v, a.v); nrm.crossVectors(e1, e2).normalize();
    const slope = 1 - Math.abs(nrm.y);

    // 1. Aguas verde-turquesa del Río Avon con espuma en las orillas
    if (h < Y_RIVER && hMax < Y_RIVER + 0.0032 && slope < 0.25) {
      const depth = smooth((Y_RIVER - h) / 0.020);
      if (h > Y_RIVER - 0.0028) return jitter(0xa8d8d4, 0.04);
      const ripple = fbm(cx * 52, cz * 52);
      if (ripple > 0.69) return jitter(0xcbeae7, 0.035);
      tmpColor.setHex(0x2a7b79).lerp(new THREE.Color(0x13444b), depth);
      const k = 1 + (rng() - 0.5) * 0.045;
      return [tmpColor.r * k, tmpColor.g * k, tmpColor.b * k];
    }

    // 2. Orilla de cantos de creta del Río Avon
    const ad = avonDist(cx, cz);
    if (ad < AVON_W + 0.008 && h >= Y_RIVER && h < 0.018) {
      return jitter(((Math.floor(cx * 210) + Math.floor(cz * 210)) & 1) ? 0xc8c3b4 : 0xafa99a, 0.04);
    }

    // 3. Creta blanca expuesta en las paredes y fondo del Foso anular y talud interior
    const rH = Math.hypot(cx - HX, cz - HZ);
    if (rH > 0.156 && rH < 0.180) {
      const ang = Math.atan2(cz - HZ, cx - HX);
      const inGate = Math.abs(angleDiff(ang, ANG_AXIS)) < 0.13 || Math.abs(angleDiff(ang, 1.65)) < 0.10;
      if (!inGate && (slope > 0.14 || h < Y_HENGE - 0.004)) {
        const pal = [0xebe7da, 0xddd7c6, 0xf2efe6, 0x9aa27c];
        const idx = slope > 0.20 ? ((Math.floor(cx * 180) ^ Math.floor(cz * 180)) & 2) : 3;
        return jitter(pal[idx], 0.032);
      }
    }

    // 4. Calzada ceremonial pisoteada de la Avenida Procesional y senderos hacia el Henge
    const avd = aveDist(cx, cz);
    if (rH > 0.140 && avd < 0.014 && ad > AVON_W * 1.1) {
      const pal = [0x8e866a, 0x7d7a5e, 0x9c9577, 0x6f7455];
      return jitter(pal[(Math.floor(cx * 160) ^ Math.floor(cz * 160)) & 3], 0.038);
    }

    // 5. Césped ceremonial cuidado en el interior del Santuario y senderos internos
    if (rH < 0.143) {
      const pathT = Math.abs((cx - HX) * Math.sin(ANG_AXIS) - (cz - HZ) * Math.cos(ANG_AXIS));
      const along = (cx - HX) * Math.cos(ANG_AXIS) + (cz - HZ) * Math.sin(ANG_AXIS);
      if (along > -0.02 && pathT < 0.011) {
        return jitter(fbm(cx * 48, cz * 48) > 0.5 ? 0x658a44 : 0x567c39, 0.04);
      }
      const n = fbm(cx * 42 + 2, cz * 42 + 6);
      const pal = [0x508338, 0x5c9040, 0x477631, 0x639846];
      return jitter(pal[Math.floor(n * 4) & 3], 0.042);
    }

    // 6. Pradera ondulada de Salisbury y surcos del terreno
    const n = fbm(cx * 26 + 3, cz * 26 + 8);
    const wave = Math.sin(cx * 45 - cz * 32 + n * 3.0);
    if (slope > 0.28) return jitter(0x8a8974, 0.045);
    const pal = [0x457431, 0x53843a, 0x3a6428, 0x628f44];
    return jitter(pal[(Math.floor((n * 3 + (wave > 0.35 ? 1 : 0))) & 3)], 0.055);
  }

  for (let k = 0; k < K; k++) {
    const A = ringPts[k], B = ringPts[k + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      if (k === 0) {
        addTri(A[0].v, B[s].v, B[s1].v, terrainColor(A[0], B[s], B[s1]), UP);
        continue;
      }
      if (k % 2 === 0) {
        addTri(A[s].v, B[s].v, A[s1].v, terrainColor(A[s], B[s], A[s1]), UP);
        addTri(B[s].v, B[s1].v, A[s1].v, terrainColor(B[s], B[s1], A[s1]), UP);
      } else {
        addTri(A[s].v, B[s1].v, A[s1].v, terrainColor(A[s], B[s1], A[s1]), UP);
        addTri(A[s].v, B[s].v, B[s1].v, terrainColor(A[s], B[s], B[s1]), UP);
      }
    }
  }

  // Zócalo geológico estratificado de creta blanca de Wiltshire con veta de sílex (~8.600 triángulos)
  const rim = ringPts[K];
  const radial = new THREE.Vector3();
  const Y_SOIL = 0.000, Y_CHALK1 = -0.028, Y_FLINT = -0.040, Y_CHALK2 = -0.062;
  const botRings = 10;
  const botRingPts = [];
  for (let br = 0; br <= botRings; br++) {
    const t = br / botRings;
    const row = [];
    for (let s = 0; s < S; s++) {
      const a = rim[s].v;
      row.push(new THREE.Vector3(CX + (a.x - CX) * 0.976 * t, FLOOR, CZ + (a.z - CZ) * 0.976 * t));
    }
    botRingPts.push(row);
  }
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  for (let s = 0; s < S; s++) {
    const ra = rim[s], rb = rim[(s + 1) % S];
    const a = ra.v, b = rb.v;
    const isWater = (ra.h + rb.h) * 0.5 < Y_RIVER;
    const a1 = new THREE.Vector3(CX + (a.x - CX) * 1.003, Y_SOIL, CZ + (a.z - CZ) * 1.003);
    const b1 = new THREE.Vector3(CX + (b.x - CX) * 1.003, Y_SOIL, CZ + (b.z - CZ) * 1.003);
    const a2 = new THREE.Vector3(CX + (a.x - CX) * 0.999, Y_CHALK1, CZ + (a.z - CZ) * 0.999);
    const b2 = new THREE.Vector3(CX + (b.x - CX) * 0.999, Y_CHALK1, CZ + (b.z - CZ) * 0.999);
    const a3 = new THREE.Vector3(CX + (a.x - CX) * 0.995, Y_FLINT, CZ + (a.z - CZ) * 0.995);
    const b3 = new THREE.Vector3(CX + (b.x - CX) * 0.995, Y_FLINT, CZ + (b.z - CZ) * 0.995);
    const a4 = new THREE.Vector3(CX + (a.x - CX) * 0.989, Y_CHALK2, CZ + (a.z - CZ) * 0.989);
    const b4 = new THREE.Vector3(CX + (b.x - CX) * 0.989, Y_CHALK2, CZ + (b.z - CZ) * 0.989);
    const a5 = botRingPts[botRings][s];
    const b5 = botRingPts[botRings][(s + 1) % S];
    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    const soilPal = [0x584b38, 0x524634, 0x5f513d, 0x4b402f];
    const chalkPal1 = [0xede9dc, 0xe4dfd0, 0xf2efe4, 0xdcd6c6];
    const chalkPal2 = [0xd8d2c1, 0xcfc8b6, 0xe0dacb, 0xc6bfa9];
    const flintPal = [0x5b5d5a, 0x505350, 0x646662, 0x474946];
    const nCol = Math.floor(fbm(a.x * 22 + 3, a.z * 22 + 7) * 4) & 3;
    const topCol = isWater ? 0x1e6b6d : soilPal[nCol];
    const c1Col = isWater ? 0x18555c : chalkPal1[nCol];
    const flCol = isWater ? 0x13454d : flintPal[(nCol + 1) & 3];
    const c2Col = isWater ? 0x103c45 : chalkPal2[nCol];
    const botCol = 0x414442;
    addQuad(a, b, b1, a1, topCol, radial, 0.024);
    addQuad(a1, b1, b2, a2, c1Col, radial, 0.022);
    addQuad(a2, b2, b3, a3, flCol, radial, 0.022);
    addQuad(a3, b3, b4, a4, c2Col, radial, 0.022);
    addQuad(a4, b4, b5, a5, botCol, radial, 0.020);
  }
  for (let br = 0; br < botRings; br++) {
    const A = botRingPts[br], B = botRingPts[br + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      const botHex = (br + (s >> 3)) & 1 ? 0x484b49 : 0x3d403e;
      if (br === 0) addTri(centerBottom, B[s], B[s1], jitter(botHex, 0.025), DOWN);
      else addQuad(A[s], A[s1], B[s1], B[s], jitter(botHex, 0.025), DOWN, 0.025);
    }
  }

  // =====================================================================
  // 4. CONSTRUCTORES DE MEGALITOS Y DINTELES CURVOS (CAJA Y ESPIGA)
  // =====================================================================
  const addTenon = (x, y, z, r = 0.0020, h = 0.0024, fn = sarsenStoneColor(y)) => {
    addGeo(displaceGeo(new THREE.SphereGeometry(r, 8, 5), 0.00012), 0x9b9485, {
      p: [x, y + h * 0.4, z], s: [1, h / r, 1], colorFn: fn,
    });
  };

  // Ortostato en pie o ligeramente inclinado desde su base enterrada (NUNCA despega la base)
  const placeAnchoredStone = (x, z, yGround, w, h, d, yaw, {
    tiltR = 0, tiltT = 0, sink = 0.018, sx = 6, sy = 14, sz = 5,
    amp = 0.00048, taper = 0.09, fn = null, grooves = true,
  } = {}) => {
    const colorFn = fn || sarsenStoneColor(yGround);
    const totalH = h + sink;
    const g = new THREE.BoxGeometry(w, totalH, d, sx, sy, sz);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const ly = pos.getY(i) + totalH * 0.5 - sink; // 0 en la superficie del suelo
      const t = Math.max(0, ly / h);
      const f = 1 - taper * t * t;
      pos.setX(i, pos.getX(i) * f);
      pos.setZ(i, pos.getZ(i) * (1 - taper * 0.5 * t));
    }
    displaceGeo(g, amp);
    // Anclar el pivote en el fondo enterrado (y = yGround - sink) para que la inclinación no despegue la base
    const pivotY = yGround - sink;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltR, yaw, tiltT, 'YXZ'));
    const centerLocal = new THREE.Vector3(0, totalH * 0.5, 0).applyQuaternion(q);
    addGeo(g, 0x9b9485, {
      p: [x + centerLocal.x, pivotY + centerLocal.y, z + centerLocal.z],
      q,
      colorFn,
    });

    // Cuello de tierra / piedras calzadoras en la base para encastre perfecto
    addGeo(displaceGeo(new THREE.CylinderGeometry(w * 0.58, w * 0.72, 0.0055, 8), 0.0004), 0x76795f, {
      p: [x, yGround - 0.001, z], r: [0, yaw, 0], s: [1, 1, (d * 1.2) / w], colorFn: turfColor,
    });

    if (grooves) {
      // Escamas y relieves de talla en las caras principales (al ras, sin invadir los huecos laterales)
      for (let gIdx = 0; gIdx < 3; gIdx++) {
        const gy = yGround + h * (0.24 + gIdx * 0.26);
        const side = gIdx % 2 === 0 ? 1 : -1;
        const off = new THREE.Vector3((rng() - 0.5) * w * 0.22, gy - pivotY, side * d * 0.48).applyQuaternion(q);
        addBoxDirect(
          x + off.x, pivotY + off.y, z + off.z,
          w * (0.28 + rng() * 0.16), h * 0.12, 0.0012,
          colorFn, 0.038, 0.00018, yaw
        );
      }
    }
  };

  // Piedra caída o fracturada apoyada sólidamente sobre la hierba (sin huecos por debajo)
  const placeFallenStone = (x, z, w, len, thick, yaw, {
    sx = 5, sy = 10, sz = 4, amp = 0.00048, fn = null, mortises = false,
  } = {}) => {
    const yg = height(x, z);
    const colorFn = fn || sarsenStoneColor(yg);
    // La cara inferior queda hundida ~32 % del espesor en la pradera
    const cy = yg + thick * 0.18;
    const pitch = (rng() - 0.5) * 0.035;
    const roll = (rng() - 0.5) * 0.04;
    const g = displaceGeo(new THREE.BoxGeometry(w, thick, len, sx, sz, sy), amp);
    addGeo(g, 0x9b9485, { p: [x, cy, z], r: [pitch, yaw, roll], colorFn });
    // Lecho de hierba/tierra alrededor del monolito caído
    addGeo(displaceGeo(new THREE.BoxGeometry(w * 1.18, 0.004, len * 1.04, 3, 1, 5), 0.0005), 0x5c7c39, {
      p: [x, yg - 0.001, z], r: [0, yaw, 0], colorFn: turfColor,
    });
    if (mortises) {
      for (const sgn of [-1, 1]) {
        const mx = x + Math.sin(yaw) * len * 0.28 * sgn;
        const mz = z + Math.cos(yaw) * len * 0.28 * sgn;
        addGeo(new THREE.TorusGeometry(0.0020, 0.0006, 5, 10), 0x625d52, {
          p: [mx, cy + thick * 0.50, mz], r: [Math.PI * 0.5, 0, 0], colorFn,
        });
      }
    }
  };

  // Dintel curvo subdividido entre dos ángulos del círculo de Sarsen (con juntas machihembradas)
  const buildCurvedLintel = (rMid, ang0, ang1, yBot, thick, widthRad, fn, {
    segsU = 12, segsV = 4, segsH = 3,
  } = {}) => {
    const span = angleDiff(ang1, ang0);
    const angPad = 0.014; // solapa ligeramente sobre los centros de ambos ortostatos
    const aStart = ang0 - Math.sign(span) * angPad;
    const aEnd = ang1 + Math.sign(span) * angPad;
    const rings = [];
    // Perfil cerrado de 2*(segsV + segsH) vértices por sección transversal para cara superior/inferior/lados subdivididos
    const buildProfile = (uFrac) => {
      const a = aStart + (aEnd - aStart) * uFrac;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pts = [];
      const hw = widthRad * 0.5;
      // Arriba (izquierda -> derecha)
      for (let i = 0; i <= segsV; i++) {
        const f = -1 + (2 * i) / segsV;
        const r = rMid + f * hw;
        const bevel = Math.abs(f) > 0.85 ? -0.0008 : 0;
        const jitterR = (fbm(a * 14 + i * 2.1, uFrac * 8) - 0.5) * 0.0009;
        pts.push(new THREE.Vector3(HX + ca * (r + jitterR), yBot + thick + bevel + jitterR * 0.5, HZ + sa * (r + jitterR)));
      }
      // Lado exterior (arriba -> abajo)
      for (let j = 1; j <= segsH; j++) {
        const f = 1 - j / segsH;
        const r = rMid + hw;
        const jitterR = (fbm(a * 14 + j * 3.1, uFrac * 8 + 4) - 0.5) * 0.0008;
        pts.push(new THREE.Vector3(HX + ca * (r + jitterR), yBot + thick * f, HZ + sa * (r + jitterR)));
      }
      // Abajo (derecha -> izquierda)
      for (let i = 1; i <= segsV; i++) {
        const f = 1 - (2 * i) / segsV;
        const r = rMid + f * hw;
        const bevel = Math.abs(f) > 0.85 ? 0.0005 : 0;
        pts.push(new THREE.Vector3(HX + ca * r, yBot + bevel, HZ + sa * r));
      }
      // Lado interior (abajo -> arriba)
      for (let j = 1; j < segsH; j++) {
        const f = j / segsH;
        const r = rMid - hw;
        const jitterR = (fbm(a * 14 - j * 2.7, uFrac * 8 + 9) - 0.5) * 0.0008;
        pts.push(new THREE.Vector3(HX + ca * (r + jitterR), yBot + thick * f, HZ + sa * (r + jitterR)));
      }
      return pts;
    };

    for (let u = 0; u <= segsU; u++) rings.push(buildProfile(u / segsU));
    const nP = rings[0].length;
    const center = new THREE.Vector3();
    for (let u = 0; u < segsU; u++) {
      const A = rings[u], B = rings[u + 1];
      center.set(0, 0, 0);
      for (let p = 0; p < nP; p++) { center.add(A[p]); center.add(B[p]); }
      center.multiplyScalar(0.5 / nP);
      for (let p = 0; p < nP; p++) {
        const p1 = (p + 1) % nP;
        _fc.copy(A[p]).add(A[p1]).add(B[p1]).add(B[p]).multiplyScalar(0.25);
        _wn.subVectors(_fc, center);
        addQuad(A[p], A[p1], B[p1], B[p], fn, _wn, 0.032);
      }
    }
    // Tapas extremas con biselado y junta machihembrada
    for (const [ring, angEnd, sgn] of [[rings[0], aStart, -1], [rings[segsU], aEnd, 1]]) {
      const tx = -Math.sin(angEnd) * sgn, tz = Math.cos(angEnd) * sgn;
      const outDir = new THREE.Vector3(tx, 0, tz);
      const mid = new THREE.Vector3();
      for (const v of ring) mid.add(v);
      mid.multiplyScalar(1 / nP);
      mid.x += tx * 0.0012; mid.z += tz * 0.0012;
      for (let p = 0; p < nP; p++) {
        const p1 = (p + 1) % nP;
        addTri(mid, ring[p], ring[p1], pickRGB(fn, mid, ring[p], ring[p1], 0.03), outDir);
      }
    }
  };

  // =====================================================================
  // 5. CÍRCULO EXTERIOR DE SARSEN (30 ESTACIONES + 12 DINTELES CURVOS)
  // =====================================================================
  const R_SARSEN = 0.114;
  const H_SARSEN = 0.052;
  const LINTEL_Y_BOT = Y_HENGE + H_SARSEN - 0.0015; // solape de 1.5 mm para contacto sólido
  const LINTEL_H = 0.010;
  const angStation = (i) => ANG_AXIS + (i - 0.5) * ((Math.PI * 2) / 30);

  // 18 en pie (4 arcos abiertos + 3 ortostatos solitarios) + 12 caídos/inclinados/tocones = 11 dinteles curvos y amplias vistas interiores
  const STANDING_SET = new Set([29, 0, 1, 2, 3, 4, 5, 9, 10, 11, 14, 17, 20, 21, 22, 24, 26, 27]);
  const LEANING_SET = new Set([6, 13, 23]);
  const STUMP_SET = new Set([8, 16, 25]);

  for (let i = 0; i < 30; i++) {
    const ang = angStation(i);
    const x = HX + Math.cos(ang) * R_SARSEN;
    const z = HZ + Math.sin(ang) * R_SARSEN;
    const yaw = -ang + Math.PI * 0.5;
    const yg = Y_HENGE;
    const w = 0.0106 + (rng() - 0.5) * 0.0009;
    const d = 0.0084 + (rng() - 0.5) * 0.0008;

    if (STANDING_SET.has(i)) {
      const hasLintelLeft = STANDING_SET.has((i + 29) % 30);
      const hasLintelRight = STANDING_SET.has((i + 1) % 30);
      const tiltR = (hasLintelLeft || hasLintelRight) ? (rng() - 0.5) * 0.020 : (rng() - 0.5) * 0.045;
      const tiltT = (hasLintelLeft || hasLintelRight) ? (rng() - 0.5) * 0.016 : (rng() - 0.5) * 0.035;
      placeAnchoredStone(x, z, yg, w, H_SARSEN, d, yaw, {
        tiltR, tiltT, sink: 0.018, sx: 6, sy: 15, sz: 5,
        amp: 0.00044, taper: 0.08, fn: sarsenStoneColor(yg),
      });
      // Espigas semiesféricas visibles en pilares sin dintel o en los extremos de arco
      if (!hasLintelLeft && !hasLintelRight) {
        addTenon(x - Math.sin(ang) * 0.0026, yg + H_SARSEN, z + Math.cos(ang) * 0.0026, 0.0017, 0.0022);
        addTenon(x + Math.sin(ang) * 0.0026, yg + H_SARSEN, z - Math.cos(ang) * 0.0026, 0.0017, 0.0022);
      } else if (!hasLintelLeft || !hasLintelRight) {
        const sgn = hasLintelLeft ? 1 : -1;
        addTenon(x + Math.sin(ang) * 0.0024 * sgn, yg + H_SARSEN, z - Math.cos(ang) * 0.0024 * sgn, 0.0016, 0.0020);
      }
    } else if (LEANING_SET.has(i)) {
      placeAnchoredStone(x, z, yg, w, H_SARSEN * 0.94, d, yaw, {
        tiltR: 0.24 + rng() * 0.08, tiltT: (rng() - 0.5) * 0.14, sink: 0.018,
        sx: 6, sy: 15, sz: 5, amp: 0.00048, taper: 0.08, fn: sarsenStoneColor(yg),
      });
    } else if (STUMP_SET.has(i)) {
      placeAnchoredStone(x, z, yg, w, 0.020, d, yaw, {
        tiltR: 0.08, tiltT: -0.06, sink: 0.016,
        sx: 5, sy: 6, sz: 4, amp: 0.00050, taper: 0.12, fn: sarsenStoneColor(yg), grooves: false,
      });
    } else {
      // Piedra caída tumbada radialmente hacia afuera/adentro sobre la hierba
      const outR = i % 2 === 0 ? 0.016 : -0.014;
      const fx = x + Math.cos(ang) * outR;
      const fz = z + Math.sin(ang) * outR;
      placeFallenStone(fx, fz, w, H_SARSEN * 0.88, d, -ang + (rng() - 0.5) * 0.25, {
        sx: 5, sy: 11, sz: 4, amp: 0.00048, fn: sarsenStoneColor(yg),
      });
    }

    // Dintel curvo sobre cada par consecutivo en pie
    const iNext = (i + 1) % 30;
    if (STANDING_SET.has(i) && STANDING_SET.has(iNext)) {
      const angNext = angStation(iNext);
      buildCurvedLintel(R_SARSEN, ang, angNext, LINTEL_Y_BOT, LINTEL_H, 0.0100, sarsenStoneColor(LINTEL_Y_BOT), {
        segsU: 14, segsV: 4, segsH: 3,
      });
    }
  }

  // Tres dinteles caídos apoyados en la hierba junto a los huecos del círculo exterior (con cajas mortise visibles)
  for (const gapAng of [angStation(7), angStation(15), angStation(19)]) {
    const gx = HX + Math.cos(gapAng) * (R_SARSEN + 0.017);
    const gz = HZ + Math.sin(gapAng) * (R_SARSEN + 0.017);
    placeFallenStone(gx, gz, 0.0100, 0.024, 0.0086, -gapAng + Math.PI * 0.5 + 0.22, {
      sx: 4, sy: 8, sz: 3, amp: 0.00042, fn: sarsenStoneColor(Y_HENGE), mortises: true,
    });
  }

  // =====================================================================
  // 6. HERRADURA INTERIOR DE LOS 5 GRANDES TRILITONES (~22.000 triángulos)
  // =====================================================================
  const R_TRILITHON = 0.066;
  const ANG_SW = ANG_AXIS + Math.PI; // Suroeste, frente a la abertura Noreste
  const TRILITHONS = [
    { offAng: -1.58, h: 0.068, lh: 0.012, w: 0.0122, d: 0.0098, central: false }, // T1 (flanco SE)
    { offAng: -0.80, h: 0.086, lh: 0.013, w: 0.0132, d: 0.0108, central: false }, // T2 (intermedio S)
    { offAng: 0.00,  h: 0.106, lh: 0.014, w: 0.0145, d: 0.0120, central: true },  // T3 (Gran Trilitón Central -> cima Y = 0.198)
    { offAng: 0.80,  h: 0.086, lh: 0.013, w: 0.0132, d: 0.0108, central: false }, // T4 (intermedio W)
    { offAng: 1.58,  h: 0.068, lh: 0.012, w: 0.0122, d: 0.0098, central: false }, // T5 (flanco NW)
  ];

  for (const tr of TRILITHONS) {
    const aC = ANG_SW + tr.offAng;
    const span = tr.central ? 0.235 : 0.215;
    const aA = aC - span, aB = aC + span;
    const yawC = -aC + Math.PI * 0.5;
    const xA = HX + Math.cos(aA) * R_TRILITHON, zA = HZ + Math.sin(aA) * R_TRILITHON;
    const xB = HX + Math.cos(aB) * R_TRILITHON, zB = HZ + Math.sin(aB) * R_TRILITHON;
    const xC = HX + Math.cos(aC) * R_TRILITHON, zC = HZ + Math.sin(aC) * R_TRILITHON;

    // Dos pilares monolíticos gemelos de alta densidad (7 x 16 x 6)
    placeAnchoredStone(xA, zA, Y_HENGE, tr.w, tr.h, tr.d, -aA + Math.PI * 0.5, {
      tiltR: (rng() - 0.5) * 0.018, tiltT: (rng() - 0.5) * 0.015, sink: 0.022,
      sx: 7, sy: 16, sz: 6, amp: 0.00050, taper: 0.10, fn: sarsenStoneColor(Y_HENGE, 1.15),
    });
    placeAnchoredStone(xB, zB, Y_HENGE, tr.w, tr.h, tr.d, -aB + Math.PI * 0.5, {
      tiltR: (rng() - 0.5) * 0.018, tiltT: (rng() - 0.5) * 0.015, sink: 0.022,
      sx: 7, sy: 16, sz: 6, amp: 0.00050, taper: 0.10, fn: sarsenStoneColor(Y_HENGE, 1.15),
    });

    // Grabados prehistóricos de hachas y dagas de la Edad del Bronce en la cara interior de Trilitón 3 y 4
    if (tr.central || Math.abs(tr.offAng - 0.80) < 0.1) {
      const inX = -Math.cos(aA), inZ = -Math.sin(aA);
      for (let c = 0; c < 4; c++) {
        const cy = Y_HENGE + 0.028 + c * 0.011;
        addBoxDirect(
          xA + inX * (tr.d * 0.52), cy, zA + inZ * (tr.d * 0.52),
          0.0040, 0.0052, 0.0012, sarsenStoneColor(Y_HENGE), 0.03, 0.0001, -aA + Math.PI * 0.5
        );
      }
    }

    // Dintel monolítico superior de alta densidad (14 x 12 x 6) apoyado con solape firme sobre ambos pilares
    const lWidth = Math.hypot(xB - xA, zB - zA) + tr.w * 1.18;
    const lBot = Y_HENGE + tr.h - 0.0020;
    const gLintel = new THREE.BoxGeometry(lWidth, tr.lh + 0.0020, tr.d * 1.24, 14, 6, 12);
    // Perfil ligeramente ensanchado hacia arriba y bordes redondeados
    const posL = gLintel.attributes.position;
    for (let i = 0; i < posL.count; i++) {
      const lx = posL.getX(i), ly = posL.getY(i), lz = posL.getZ(i);
      const flare = 1 + 0.06 * (ly / (tr.lh * 0.5));
      posL.setZ(i, lz * flare);
      if (Math.abs(lx) > lWidth * 0.44 && ly < 0) posL.setY(i, ly + 0.0012);
    }
    displaceGeo(gLintel, 0.00046);
    addGeo(gLintel, 0x9b9485, {
      p: [xC, lBot + (tr.lh + 0.0020) * 0.5, zC],
      r: [0, yawC, 0],
      colorFn: sarsenStoneColor(lBot),
    });

    // Espiga central coronando el Gran Trilitón Central y cajas laterales
    if (tr.central) {
      addTenon(xC, lBot + tr.lh + 0.0012, zC, 0.0024, 0.0026, sarsenStoneColor(lBot));
      // Ortostato gemelo y dintel fracturado históricos apoyados a ras del suelo frente al Gran Trilitón junto al Altar
      const fx = HX + Math.cos(ANG_SW + 0.14) * 0.032;
      const fz = HZ + Math.sin(ANG_SW + 0.14) * 0.032;
      placeFallenStone(fx, fz, 0.0145, 0.036, 0.0092, -ANG_SW + 0.35, {
        sx: 5, sy: 10, sz: 4, amp: 0.00050, fn: sarsenStoneColor(Y_HENGE), mortises: true,
      });
      placeFallenStone(fx - 0.018, fz - 0.012, 0.0135, 0.028, 0.0088, -ANG_SW - 0.55, {
        sx: 4, sy: 8, sz: 3, amp: 0.00048, fn: sarsenStoneColor(Y_HENGE), mortises: true,
      });
    }
  }

  // =====================================================================
  // 7. CÍRCULO EXTERIOR (38) Y HERRADURA INTERIOR (19) DE PIEDRAS AZULES + ALTAR
  // =====================================================================
  // 7.1 Círculo Exterior de 38 Piedras Azules de Preseli (R = 0.090)
  const R_BLUE_OUT = 0.090;
  for (let i = 0; i < 38; i++) {
    const ang = ANG_AXIS + (i + 0.5) * ((Math.PI * 2) / 38);
    // Dejar libre la estrecha brecha ceremonial del Solsticio Noreste
    if (Math.abs(angleDiff(ang, ANG_AXIS)) < 0.10) continue;
    const x = HX + Math.cos(ang) * R_BLUE_OUT;
    const z = HZ + Math.sin(ang) * R_BLUE_OUT;
    const yaw = -ang + Math.PI * 0.5 + (rng() - 0.5) * 0.25;
    const mode = i % 5;
    if (mode === 4) {
      // Piedra azul caída o tocón hundido
      placeFallenStone(x, z, 0.0068, 0.022, 0.0056, yaw + 0.7, {
        sx: 3, sy: 6, sz: 3, amp: 0.00035, fn: preseliBluestoneColor(Y_HENGE),
      });
    } else {
      const bh = 0.026 + rng() * 0.010;
      const tilt = mode === 2 ? (rng() - 0.5) * 0.18 : (rng() - 0.5) * 0.06;
      placeAnchoredStone(x, z, Y_HENGE, 0.0074, bh, 0.0060, yaw, {
        tiltR: tilt, tiltT: (rng() - 0.5) * 0.06, sink: 0.014,
        sx: 4, sy: 7, sz: 3, amp: 0.00036, taper: 0.16, fn: preseliBluestoneColor(Y_HENGE), grooves: false,
      });
    }
  }

  // 7.2 Herradura Interior de 19 Piedras Azules de Preseli (R = 0.044)
  const R_BLUE_IN = 0.044;
  for (let i = 0; i < 19; i++) {
    const frac = (i / 18) * 2 - 1; // -1 .. +1
    const ang = ANG_SW + frac * 1.92;
    const x = HX + Math.cos(ang) * R_BLUE_IN;
    const z = HZ + Math.sin(ang) * R_BLUE_IN;
    const yaw = -ang + Math.PI * 0.5;
    const bh = 0.032 + (1 - Math.abs(frac)) * 0.012 + (rng() - 0.5) * 0.004;
    placeAnchoredStone(x, z, Y_HENGE, 0.0072, bh, 0.0058, yaw, {
      tiltR: (rng() - 0.5) * 0.07, tiltT: (rng() - 0.5) * 0.05, sink: 0.015,
      sx: 4, sy: 8, sz: 3, amp: 0.00034, taper: 0.14, fn: preseliBluestoneColor(Y_HENGE), grooves: false,
    });
    if (i % 5 === 2) features.push({ type: 'sparkle', pos: [x, Y_HENGE + bh + 0.002, z], size: 0.009 });
  }

  // 7.3 La Piedra del Altar (Altar Stone) de arenisca micácea verde + Fuego Sagrado del Solsticio
  const ALTAR_X = HX - Math.cos(ANG_AXIS) * 0.015;
  const ALTAR_Z = HZ - Math.sin(ANG_AXIS) * 0.015;
  addGeo(displaceGeo(new THREE.BoxGeometry(0.032, 0.008, 0.012, 6, 2, 4), 0.00038), 0x5c685c, {
    p: [ALTAR_X, Y_HENGE + 0.0018, ALTAR_Z],
    r: [0.02, -ANG_AXIS + Math.PI * 0.5, -0.02],
    colorFn: altarSandstoneColor,
  });
  // Anillo de piedras ceremoniales y brasero central sobre el Altar
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    addGeo(new THREE.IcosahedronGeometry(0.0024, 0), 0x7e786b, {
      p: [ALTAR_X + Math.cos(a) * 0.0068, Y_HENGE + 0.0062, ALTAR_Z + Math.sin(a) * 0.0068],
      r: [rng() * 3, rng() * 3, rng() * 3],
      colorFn: sarsenStoneColor(Y_HENGE),
    });
  }
  features.push({ type: 'flame', pos: [ALTAR_X, Y_HENGE + 0.0075, ALTAR_Z], size: 0.0046 });
  // Braseros rituales discretos junto a las jambas de la herradura interior para dar brillo nocturno
  for (const angB of [ANG_SW - 0.55, ANG_SW + 0.55, ANG_AXIS + 0.28, ANG_AXIS - 0.28]) {
    features.push({ type: 'city', pos: [HX + Math.cos(angB) * 0.055, Y_HENGE + 0.006, HZ + Math.sin(angB) * 0.055], size: 0.009 });
  }

  // =====================================================================
  // 8. 56 POZOS DE AUBREY, ESTACIONES, PORTAL, PIEDRA TALÓN Y AVENIDA
  // =====================================================================
  // 8.1 Anillo completo de 56 Pozos de Aubrey (Aubrey Holes) en R = 0.138
  const R_AUBREY = 0.138;
  for (let i = 0; i < 56; i++) {
    const ang = (i / 56) * Math.PI * 2;
    const ax = HX + Math.cos(ang) * R_AUBREY;
    const az = HZ + Math.sin(ang) * R_AUBREY;
    const ay = height(ax, az);
    // Brocal sutil de creta erosionada hundido en la hierba + mojón blanco
    addGeo(new THREE.TorusGeometry(0.0024, 0.00065, 5, 10), 0xdad4c3, {
      p: [ax, ay + 0.0003, az], r: [Math.PI * 0.5, 0, 0], colorFn: chalkStrataColor,
    });
    addGeo(new THREE.CylinderGeometry(0.0018, 0.0020, 0.0020, 8), 0xcbc4b2, {
      p: [ax, ay - 0.0005, az], colorFn: chalkStrataColor,
    });
    if (i % 7 === 0) features.push({ type: 'city', pos: [ax, ay + 0.0035, az], size: 0.009 });
  }

  // 8.2 Cuatro Piedras de las Estaciones (Rectángulo Astronómico en R = 0.145)
  // Dos monolitos en pie (91 y 93) y dos túmulos anulares (North Barrow 94 y South Barrow 92)
  const STATION_ANGLES = [ANG_AXIS + 1.04, ANG_AXIS + Math.PI - 1.04, ANG_AXIS + Math.PI + 1.04, ANG_AXIS - 1.04];
  STATION_ANGLES.forEach((ang, idx) => {
    const sx = HX + Math.cos(ang) * 0.145;
    const sz = HZ + Math.sin(ang) * 0.145;
    const sy = height(sx, sz);
    if (idx === 0 || idx === 2) {
      placeAnchoredStone(sx, sz, sy, 0.009, 0.030, 0.0065, -ang, {
        tiltR: 0.05, sink: 0.012, sx: 4, sy: 7, sz: 3, amp: 0.00038, taper: 0.14, fn: sarsenStoneColor(sy), grooves: false,
      });
    } else {
      addGeo(new THREE.TorusGeometry(0.0085, 0.0018, 6, 16), 0xebe7da, {
        p: [sx, sy + 0.0005, sz], r: [Math.PI * 0.5, 0, 0], colorFn: chalkStrataColor,
      });
      addGeo(new THREE.CylinderGeometry(0.0050, 0.0068, 0.0040, 10), 0x5c8e3e, {
        p: [sx, sy + 0.0012, sz], colorFn: turfColor,
      });
    }
  });

  // 8.3 Piedra del Sacrificio (Slaughter Stone) y Piedras del Portal en la Entrada Noreste + Pórtico Solar de Madera
  const slX = HX + Math.cos(ANG_AXIS + 0.06) * 0.160;
  const slZ = HZ + Math.sin(ANG_AXIS + 0.06) * 0.160;
  placeFallenStone(slX, slZ, 0.0110, 0.028, 0.0060, -ANG_AXIS + 0.2, {
    sx: 5, sy: 8, sz: 3, amp: 0.00042, fn: sarsenStoneColor(height(slX, slZ)),
  });
  for (const sgn of [-1, 1]) {
    const pa = ANG_AXIS + sgn * 0.105;
    const px = HX + Math.cos(pa) * 0.150, pz = HZ + Math.sin(pa) * 0.150;
    const py = height(px, pz);
    placeAnchoredStone(px, pz, py, 0.0082, 0.030, 0.0062, -pa + Math.PI * 0.5, {
      sink: 0.012, sx: 4, sy: 7, sz: 3, amp: 0.00036, fn: sarsenStoneColor(py), grooves: false,
    });
    // Pórtico Solar de Madera de roble y antorcha flanqueando la Entrada Noreste
    const tx = HX + Math.cos(pa) * 0.170, tz = HZ + Math.sin(pa) * 0.170;
    const ty = height(tx, tz);
    addBeam(tx, ty - 0.008, tz, tx, ty + 0.020, tz, 0.0032, 0.0032, oakTimberColor);
    features.push({ type: 'flame', pos: [tx, ty + 0.022, tz], size: 0.0025 });
  }
  // Dintel de madera del Pórtico Solar sobre la Entrada Noreste
  {
    const aL = ANG_AXIS - 0.105, aR = ANG_AXIS + 0.105;
    const xL = HX + Math.cos(aL) * 0.170, zL = HZ + Math.sin(aL) * 0.170;
    const xR = HX + Math.cos(aR) * 0.170, zR = HZ + Math.sin(aR) * 0.170;
    const yTop = Math.max(height(xL, zL), height(xR, zR)) + 0.019;
    addBeam(xL, yTop, zL, xR, yTop, zR, 0.0038, 0.0038, oakTimberColor, UP, 0.003);
  }

  // 8.4 La Piedra Talón (Heel Stone / Friar's Heel) en la Avenida del Solsticio + Foso circular blanco + Antorchas
  const heelY = height(HEEL_X, HEEL_Z);
  addGeo(new THREE.TorusGeometry(0.015, 0.0028, 6, 20), 0xebe7da, {
    p: [HEEL_X, heelY + 0.0005, HEEL_Z], r: [Math.PI * 0.5, 0, 0], colorFn: chalkStrataColor,
  });
  placeAnchoredStone(HEEL_X, HEEL_Z, heelY, 0.0145, 0.056, 0.0102, -ANG_AXIS + Math.PI * 0.5, {
    tiltR: 0.22, tiltT: 0.05, sink: 0.018, sx: 6, sy: 12, sz: 5,
    amp: 0.00050, taper: 0.18, fn: sarsenStoneColor(heelY, 1.1),
  });
  // Antorchas rituales flanqueando la Piedra Talón y la Avenida Procesional
  for (let i = 0; i < 10; i++) {
    const f = i / 9;
    const segIdx = Math.min(AVE_PTS.length - 2, Math.floor(f * (AVE_PTS.length - 1)));
    const lt = f * (AVE_PTS.length - 1) - segIdx;
    const [ax, az] = AVE_PTS[segIdx], [bx, bz] = AVE_PTS[segIdx + 1];
    const px = ax + (bx - ax) * lt, pz = az + (bz - az) * lt;
    const dirLen = Math.hypot(bx - ax, bz - az) || 1;
    const nx = -(bz - az) / dirLen, nz = (bx - ax) / dirLen;
    for (const sgn of [-1, 1]) {
      const mx = px + nx * 0.017 * sgn, mz = pz + nz * 0.017 * sgn;
      const my = height(mx, mz);
      addBeam(mx, my - 0.006, mz, mx, my + 0.0085, mz, 0.0024, 0.0024, oakTimberColor);
      if (i % 2 === 0) features.push({ type: 'city', pos: [mx, my + 0.010, mz], size: 0.009 });
    }
  }
  features.push({ type: 'flame', pos: [HEEL_X - 0.010, heelY + 0.014, HEEL_Z + 0.008], size: 0.0028 });
  features.push({ type: 'flame', pos: [HEEL_X + 0.010, heelY + 0.014, HEEL_Z - 0.008], size: 0.0028 });

  // =====================================================================
  // 9. ENTORNO DE SALISBURY: WOODHENGE, TRINEO, ALDEA, TÚMULOS, AVON, OVEJAS Y ROBLES
  // =====================================================================
  // 9.1 Santuario de Madera (Woodhenge / Southern Circle) en el sector Sureste
  {
    const { x: wx, z: wz, y: wy } = WOODHENGE_POS;
    const rings = [
      { r: 0.026, n: 18, h: 0.022, rad: 0.0018, lintel: true },
      { r: 0.018, n: 12, h: 0.026, rad: 0.0020, lintel: true },
      { r: 0.010, n: 6,  h: 0.030, rad: 0.0021, lintel: false },
    ];
    for (const rg of rings) {
      const pts = [];
      for (let i = 0; i < rg.n; i++) {
        const a = (i / rg.n) * Math.PI * 2;
        const px = wx + Math.cos(a) * rg.r, pz = wz + Math.sin(a) * rg.r;
        const py = height(px, pz);
        addBeam(px, py - 0.008, pz, px, py + rg.h, pz, rg.rad * 2, rg.rad * 2, oakTimberColor);
        pts.push([px, py + rg.h - 0.0015, pz, a]);
      }
      if (rg.lintel) {
        for (let i = 0; i < rg.n; i++) {
          const i1 = (i + 1) % rg.n;
          if (i === 0) continue; // entrada abierta hacia el Este
          addBeam(pts[i][0], pts[i][1], pts[i][2], pts[i1][0], pts[i1][1], pts[i1][2], 0.0028, 0.0028, oakTimberColor, UP, 0.0015);
        }
      }
    }
    // Foso anular y altar central de Woodhenge
    addGeo(new THREE.TorusGeometry(0.031, 0.0020, 5, 24), 0xebe7da, {
      p: [wx, wy + 0.0005, wz], r: [Math.PI * 0.5, 0, 0], colorFn: chalkStrataColor,
    });
    addBoxDirect(wx, wy + 0.0022, wz, 0.010, 0.005, 0.008, sarsenStoneColor(wy), 0.03);
    features.push({ type: 'flame', pos: [wx, wy + 0.0055, wz], size: 0.0028 });
  }

  // 9.2 Trineo de Rodillos y Cabria Neolítica (Stone-Hauling Sledge) junto a la Avenida
  {
    const { x: sx, z: sz, y: sy } = SLEDGE_POS;
    const L = makeLocal(sx, sy, sz, -0.35);
    // 5 rodillos de tronco apoyados firmemente en el suelo
    for (let i = -2; i <= 2; i++) {
      const pA = L(-0.014, 0.0012, i * 0.008);
      const pB = L(0.014, 0.0012, i * 0.008);
      addRod(pA, pB, 0.0018, 0x5c3e24, 7);
    }
    // Patines longitudinales y traviesas del trineo de roble
    for (const side of [-0.008, 0.008]) {
      addBeam(...L(side, 0.0038, -0.020), ...L(side, 0.0038, 0.020), 0.0032, 0.0028, oakTimberColor);
    }
    for (let t = -2; t <= 2; t++) {
      addBeam(...L(-0.010, 0.0055, t * 0.008), ...L(0.010, 0.0055, t * 0.008), 0.0024, 0.0022, oakTimberColor);
    }
    // Bloque sarsen tallado sobre el trineo
    addGeo(displaceGeo(new THREE.BoxGeometry(0.013, 0.009, 0.032, 4, 3, 7), 0.00038), 0x9b9485, {
      p: L(0, 0.0110, 0), r: [0, -0.35, 0], colorFn: sarsenStoneColor(sy),
    });
    // Cabria neolítica en A (shear legs) y cuerdas tensadas
    const apex = L(0, 0.036, 0.016);
    addRod(L(-0.017, -0.004, 0.014), apex, 0.0018, 0x6d4b2d, 6);
    addRod(L(0.017, -0.004, 0.014), apex, 0.0018, 0x6d4b2d, 6);
    addRod(L(0, -0.004, -0.012), apex, 0.0015, 0x6d4b2d, 6);
    addRod(apex, L(0, 0.014, 0.010), 0.0015, 0xc29e54, 5);
    addRod(L(0, 0.005, 0.020), L(0, 0.002, 0.036), 0.0015, 0xc29e54, 5);
  }

  // 9.3 Aldea Neolítica de Durrington (5 Cabañas Circulares + Hoguera Comunitaria)
  {
    const { x: vx, z: vz, y: vy } = VILLAGE_POS;
    const HUTS = [
      { dx: -0.026, dz: -0.022, r: 0.0145, h: 0.012, doorYaw: 0.6 },
      { dx: 0.024,  dz: -0.024, r: 0.0135, h: 0.011, doorYaw: -0.7 },
      { dx: -0.030, dz: 0.018,  r: 0.0140, h: 0.011, doorYaw: 1.4 },
      { dx: 0.026,  dz: 0.018,  r: 0.0150, h: 0.012, doorYaw: -1.8 },
      { dx: 0.002,  dz: 0.032,  r: 0.0130, h: 0.011, doorYaw: 3.1 },
    ];
    for (let hi = 0; hi < HUTS.length; hi++) {
      const hu = HUTS[hi];
      const hx = vx + hu.dx, hz = vz + hu.dz;
      const hy = height(hx, hz);
      // Muro circular de piedra seca y barro hundido en la explanada
      addGeo(displaceGeo(new THREE.CylinderGeometry(hu.r, hu.r * 1.05, hu.h + 0.008, 12, 2), 0.0003), 0x8e8676, {
        p: [hx, hy + (hu.h - 0.008) * 0.5, hz], colorFn: sarsenStoneColor(hy),
      });
      // Postes perimetrales de madera
      for (let p = 0; p < 8; p++) {
        const pa = (p / 8) * Math.PI * 2;
        addBeam(
          hx + Math.cos(pa) * hu.r * 1.01, hy - 0.004, hz + Math.sin(pa) * hu.r * 1.01,
          hx + Math.cos(pa) * hu.r * 1.01, hy + hu.h, hz + Math.sin(pa) * hu.r * 1.01,
          0.0018, 0.0018, oakTimberColor
        );
      }
      // Techo cónico de paja en capas escalonadas
      addGeo(displaceGeo(new THREE.ConeGeometry(hu.r * 1.24, hu.h * 1.35, 14, 3), 0.00035), 0xc29e54, {
        p: [hx, hy + hu.h + hu.h * 0.62, hz], colorFn: thatchRoofColor(hy + hu.h),
      });
      // Puerta con marco saliente y luz cálida interior
      const df = makeLocal(hx, hy, hz, hu.doorYaw);
      addBoxDirect(...df(0, 0.0045, hu.r * 0.98), 0.0052, 0.0085, 0.0030, oakTimberColor, 0.03, 0, hu.doorYaw);
      addBoxDirect(...df(0, 0.0042, hu.r * 1.01), 0.0036, 0.0068, 0.0020, 0x1a1510, 0.02, 0, hu.doorYaw);
      features.push({ type: 'window', pos: df(0, 0.0042, hu.r * 1.06), yaw: hu.doorYaw, w: 0.0034, h: 0.0060 });
      if (hi < 2) {
        features.push({ type: 'smoke', pos: [hx, hy + hu.h * 2.24, hz], size: 0.0036, color: 0xe6e4df });
      }
    }
    // Hoguera comunitaria central de la aldea neolítica
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      addGeo(new THREE.IcosahedronGeometry(0.0022, 0), 0x8d8678, {
        p: [vx + Math.cos(a) * 0.0065, vy + 0.001, vz + Math.sin(a) * 0.0065],
        colorFn: sarsenStoneColor(vy),
      });
    }
    features.push({ type: 'flame', pos: [vx, vy + 0.0025, vz], size: 0.0038 });
  }

  // 9.4 Los 6 Túmulos Funerarios de la Edad del Bronce (Round Barrows de Normanton Down)
  for (let bi = 0; bi < BARROWS.length; bi++) {
    const b = BARROWS[bi];
    // Zanja circular sutil de creta erosionada + túmulo estratificado + corona de bordillos (kerbstones)
    addGeo(new THREE.TorusGeometry(b.r * 1.08, 0.0014, 5, 20), 0xd4cfc0, {
      p: [b.x, b.yBase + 0.0003, b.z], r: [Math.PI * 0.5, 0, 0], amt: 0.035,
    });
    addGeo(displaceGeo(new THREE.SphereGeometry(b.r, 16, 7, 0, Math.PI * 2, 0, Math.PI * 0.52), 0.0004), 0x528238, {
      p: [b.x, b.yBase - 0.002, b.z], s: [1, (b.h * 0.85) / b.r, 1], colorFn: turfColor,
    });
    const nk = 16;
    for (let k = 0; k < nk; k++) {
      const a = (k / nk) * Math.PI * 2;
      if (Math.abs(angleDiff(a, b.yaw)) < 0.35) continue;
      addBoxDirect(
        b.x + Math.cos(a) * b.r * 0.94, b.yBase + 0.0015, b.z + Math.sin(a) * b.r * 0.94,
        0.0046, 0.0050, 0.0034, sarsenStoneColor(b.yBase), 0.035, 0.0002, -a
      );
    }
    // Portal megalítico de entrada a la cámara funeraria (con luz nocturna en el primer túmulo)
    const L = makeLocal(b.x, b.yBase, b.z, b.yaw);
    addBoxDirect(...L(-0.0036, 0.004, b.r * 0.94), 0.0030, 0.009, 0.0055, sarsenStoneColor(b.yBase), 0.03, 0, b.yaw);
    addBoxDirect(...L(0.0036, 0.004, b.r * 0.94), 0.0030, 0.009, 0.0055, sarsenStoneColor(b.yBase), 0.03, 0, b.yaw);
    addBoxDirect(...L(0, 0.0095, b.r * 0.94), 0.0110, 0.0035, 0.0065, sarsenStoneColor(b.yBase), 0.03, 0, b.yaw);
    addBoxDirect(...L(0, 0.0040, b.r * 0.92), 0.0044, 0.0072, 0.0020, 0x161412, 0.02, 0, b.yaw);
    if (bi === 0) {
      features.push({ type: 'window', pos: L(0, 0.0040, b.r * 0.97), yaw: b.yaw, w: 0.0036, h: 0.0062 });
    }
    if (bi % 2 === 1) features.push({ type: 'firefly', pos: [b.x, b.yBase + b.h + 0.008, b.z], size: 0.017 });
  }

  // 9.5 Embarcadero Neolítico en el Río Avon y 2 Canoas Monóxilas
  {
    const dx = 0.242, dz = -0.105, dy = Y_RIVER + 0.0045;
    for (const pz of [-0.006, 0.006]) {
      addBeam(dx - 0.016, dy - 0.014, dz + pz, dx - 0.016, dy + 0.004, dz + pz, 0.0024, 0.0024, oakTimberColor);
      addBeam(dx + 0.006, dy - 0.014, dz + pz, dx + 0.006, dy + 0.004, dz + pz, 0.0024, 0.0024, oakTimberColor);
    }
    for (let t = 0; t < 7; t++) {
      addBoxDirect(dx - 0.018 + t * 0.0044, dy + 0.003, dz, 0.0034, 0.0018, 0.015, oakTimberColor, 0.035);
    }
    features.push({ type: 'city', pos: [dx + 0.006, dy + 0.007, dz + 0.006], size: 0.009 });

    const addCanoe = (cx, cz, yaw) => {
      const L = makeLocal(cx, Y_RIVER + 0.0005, cz, yaw);
      addGeo(new THREE.CylinderGeometry(0.0036, 0.0026, 0.028, 7, 3), 0x624227, {
        p: L(0, 0.0008, 0), r: [Math.PI * 0.5, yaw, 0], s: [1, 1, 0.55], colorFn: oakTimberColor,
      });
      addBeam(...L(-0.003, 0.0035, -0.005), ...L(0.008, 0.0020, 0.009), 0.0014, 0.0010, oakTimberColor);
    };
    addCanoe(0.244, -0.080, 0.25);
    addCanoe(0.250, 0.055, -0.18);
  }

  // 9.6 Rebaño de 12 Ovejas pastando en la Llanura de Salisbury
  const addSheep = (sx, sz, yaw, sc = 1.0) => {
    const sy = height(sx, sz);
    const L = makeLocal(sx, sy, sz, yaw);
    for (const px of [-0.0018, 0.0018]) {
      for (const pz of [-0.0026, 0.0026]) {
        addRod(L(px * sc, -0.002 * sc, pz * sc), L(px * sc, 0.0032 * sc, pz * sc), 0.00065 * sc, 0x3b352f, 5);
      }
    }
    addGeo(new THREE.IcosahedronGeometry(0.0038 * sc, 1), 0xf0eadb, {
      p: L(0, 0.0046 * sc, 0), r: [0, yaw, 0], s: [0.85, 0.85, 1.25], amt: 0.045,
    });
    addGeo(new THREE.SphereGeometry(0.0017 * sc, 7, 5), 0x3a342e, {
      p: L(0, 0.0054 * sc, 0.0048 * sc), r: [0, yaw, 0], s: [0.85, 0.85, 1.25], amt: 0.03,
    });
    for (const ex of [-0.0014, 0.0014]) {
      addGeo(new THREE.BoxGeometry(0.0014 * sc, 0.0008 * sc, 0.0010 * sc), 0x3a342e, {
        p: L(ex * sc, 0.0062 * sc, 0.0042 * sc), r: [0, yaw, ex * 200],
      });
    }
  };
  const SHEEP_SPOTS = [
    [0.088, 0.190, 0.4, 1.08], [0.105, 0.205, -0.9, 0.96], [0.078, 0.222, 2.1, 1.04],
    [0.122, 0.185, 1.4, 0.92], [-0.048, 0.208, -0.3, 1.05], [-0.025, 0.225, 2.5, 0.98],
    [-0.185, -0.105, 0.7, 1.02], [-0.195, -0.085, -1.5, 0.95], [-0.170, -0.125, 1.9, 1.06],
    [0.085, -0.215, -0.6, 1.02], [0.112, -0.202, 0.8, 0.96], [0.098, -0.232, 2.4, 1.04],
  ];
  for (const [sx, sz, yaw, sc] of SHEEP_SPOTS) addSheep(sx, sz, yaw, sc);

  // 9.7 Bosque de ~52 Robles y Tejos Centenarios (en bordes exteriores, despejando el Henge y la Avenida)
  const addEnglishTree = (tx, tz, sc = 1) => {
    const ty = height(tx, tz) - 0.004;
    const tiltX = (rng() - 0.5) * 0.16, tiltZ = (rng() - 0.5) * 0.16;
    const hTrunk = (0.011 + rng() * 0.006) * sc;
    addRod([tx, ty, tz], [tx + tiltX * 0.006, ty + hTrunk, tz + tiltZ * 0.006], 0.0020 * sc, 0x563c26, 5);
    const foliageHex = rng() < 0.35 ? 0x2f5f29 : rng() < 0.72 ? 0x3b7130 : 0x4c833a;
    const cx = tx + tiltX * 0.006, cy = ty + hTrunk + 0.003 * sc, cz = tz + tiltZ * 0.006;
    addGeo(new THREE.IcosahedronGeometry(0.0085 * sc, 0), foliageHex, {
      p: [cx, cy, cz], r: [rng() * 3, rng() * 3, rng() * 3], s: [1.18, 0.78, 1.18], amt: 0.07,
    });
    addGeo(new THREE.IcosahedronGeometry(0.0060 * sc, 0), foliageHex, {
      p: [cx + (rng() - 0.5) * 0.0055 * sc, cy + 0.0038 * sc, cz + (rng() - 0.5) * 0.0055 * sc],
      r: [rng() * 3, rng() * 3, rng() * 3], s: [1.05, 0.76, 1.05], amt: 0.07,
    });
  };

  let trees = 0;
  for (let tries = 0; trees < 52 && tries < 5000; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = 0.195 + rng() * (rimRadius(ang) - 0.215);
    const x = CX + Math.cos(ang) * r, z = CZ + Math.sin(ang) * r;
    if (Math.hypot(x - HX, z - HZ) < 0.200) continue; // Despejar todo el Henge y foso
    if (aveDist(x, z) < 0.036) continue; // Despejar la Avenida y la Piedra Talón
    if (avonDist(x, z) < AVON_W + 0.012) continue; // Despejar el Río Avon
    if (EXPLANADAS.some((p, idx) => idx > 0 && rectDist(x, z, p) < 0.022)) continue;
    const h = height(x, z), sl = slopeAt(x, z);
    if (h < 0.016 || sl > 0.45) continue;
    addEnglishTree(x, z, 0.88 + rng() * 0.42);
    if (trees % 2 === 0) features.push({ type: 'firefly', pos: [x, h + 0.012, z], size: 0.017 });
    trees++;
  }

  // =====================================================================
  // 10. EFECTOS VIVOS EN EL RÍO AVON, MEGALITOS Y CIELO DE SALISBURY
  // =====================================================================
  // Destellos diurnos sobre las aguas del Río Avon
  for (let i = 0; i < 36; i++) {
    const t = i / 35;
    const seg = Math.min(AVON_PTS.length - 2, Math.floor(t * (AVON_PTS.length - 1)));
    const lt = t * (AVON_PTS.length - 1) - seg;
    const px = AVON_PTS[seg][0] + (AVON_PTS[seg + 1][0] - AVON_PTS[seg][0]) * lt + (rng() - 0.5) * 0.022;
    const pz = AVON_PTS[seg][1] + (AVON_PTS[seg + 1][1] - AVON_PTS[seg][1]) * lt + (rng() - 0.5) * 0.022;
    if (Math.hypot(px - CX, pz - CZ) < rimRadius(Math.atan2(pz - CZ, px - CX)) * 0.92 && height(px, pz) < Y_RIVER) {
      features.push({ type: 'sparkle', pos: [px, Y_RIVER + 0.003, pz], size: 0.009 });
    }
  }

  // Fuegos fatuos nocturnos danzando entre los trilitones y el círculo de Sarsen
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const rr = 0.076 + (i % 2) * 0.044;
    features.push({ type: 'firefly', pos: [HX + Math.cos(a) * rr, Y_HENGE + 0.032 + (i % 3) * 0.012, HZ + Math.sin(a) * rr], size: 0.017 });
  }

  // Nubes inglesas altas derivando alrededor del perímetro exterior sin tapar los megalitos
  const cloudRing = [
    [-0.240, 0.232, -0.220, 0.012],
    [0.235, 0.238, -0.210, 0.012],
    [-0.250, 0.225, 0.195, 0.011],
    [0.240, 0.228, 0.185, 0.012],
    [-0.085, 0.258, -0.270, 0.012],
    [0.105, 0.252, 0.260, 0.011],
    [-0.175, 0.245, 0.235, 0.011],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [0, cy, 0], size: cs });
  }
  features.push({ type: 'gulls', pos: [0.02, 0.235, -0.02], size: 0.125 });

  void stats;
  return finish('Stonehenge');
}
