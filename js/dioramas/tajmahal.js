// Diorama "El Taj Mahal" — Complejo imperial mogol de Agra (~150k–190k triángulos)
// Mausoleo (Rauza-i-Munawwara) sobre gran plinto de mármol blanco (Takhtgah):
//   cuerpo octogonal chaflanado con 4 pishtaqs monumentales con bóveda apuntada y muqarnas,
//   16 nichos laterales y 8 en chaflanes en dos niveles, celosías jali e incrustaciones de pietra dura,
//   24 agujas florales (guldastas), gran cúpula bulbosa (Amrud) con corona de loto y kalash dorado,
//   4 chhatris octogonales en azotea y 4 minaretes de 3 balcones ligeramente inclinados hacia afuera.
// Conjunto completo sobre zócalo hermético:
//   Mezquita (Masjid) al oeste y Jawab al este con 3 cúpulas bulbosas cada uno sobre la terraza roja,
//   2 torreones fluviales (Burj), muro del río Yamuna con 2 barcazas mogoles (bajras),
//   jardines Charbagh con espejo de agua, estanque central del loto (Hauz-i-Kausar), surtidores,
//   cipreses, árboles frutales, 2 pabellones laterales (Naqqar Khana) y la Gran Puerta Sur (Darwaza-i-Rauza).
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildTajMahal(seed = 107) {
  const { rng, fbm, features, jitter, addTri, addGeo, addRod, finish, stats } = makeBuilder(seed);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  // =====================================================================
  // 1. PALETA MOGOL Y COLORES PROCEDIMENTALES
  // =====================================================================
  const makranaMarbleColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 210 * scale);
    const col = Math.floor((cx + cz) * 145 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0xfbf8f2, 0xf4efe4, 0xfdfbf7, 0xede5d7];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.0055 && ((row + col) & 1)) hex = 0xe3d8c6;
    return jitter(hex, 0.018);
  };

  const marbleTrimColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const k = (Math.floor(cy * 260) + Math.floor((cx + cz) * 180)) & 1;
    return jitter(k ? 0xf5efe2 : 0xe8decb, 0.02);
  };

  const pietraDuraColor = (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const qx = Math.floor((cx + 1) * 340);
    const qy = Math.floor((cy + 1) * 340);
    const qz = Math.floor((cz + 1) * 340);
    const h = ((qx * 73856093) ^ (qy * 19349663) ^ (qz * 83492791)) % 13;
    const idx = h < 0 ? h + 13 : h;
    if (idx === 0) return jitter(0xc46b54, 0.025); // cornalina suave
    if (idx === 1) return jitter(0xd9ae52, 0.025); // dorado sutil
    if (idx === 2) return jitter(0x4b745d, 0.025); // jade apagado
    if (idx === 3) return jitter(0x526b88, 0.025); // lapislázuli suave
    return jitter(0xf7f2e7, 0.016);                // mármol cremoso predominante
  };

  const redSandstoneColor = (yFloor = -1, scale = 1) => (va, vb, vc) => {
    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const row = Math.floor(cy * 195 * scale);
    const col = Math.floor((cx - cz) * 135 * scale + (row & 1) * 0.5);
    const h = ((row * 73856093) ^ (col * 19349663)) & 3;
    const pal = [0x9e4332, 0x8c3828, 0xad4d3b, 0x7d3022];
    let hex = pal[h];
    if (yFloor > -0.5 && cy - yFloor < 0.006 && ((row + col) & 1)) hex = 0x6f281c;
    return jitter(hex, 0.028);
  };

  const goldKalashColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 260) & 1;
    return jitter(k ? 0xe8b948 : 0xd19f2e, 0.03);
  };

  const nicheShadowColor = (va, vb, vc) => {
    const cy = (va.y + vb.y + vc.y) / 3;
    const k = Math.floor(cy * 240) & 1;
    return jitter(k ? 0x3b2d29 : 0x493832, 0.03);
  };

  const displaceGeo = (geo, amp = 0.00045) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const qx = Math.round(x * 2000), qy = Math.round(y * 2000), qz = Math.round(z * 2000);
      let h = (qx * 374761393 + qy * 668265263 + qz * 1442695041) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const n1 = ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
      h = Math.imul(h ^ (h >>> 11), 668265263);
      const n2 = ((h ^ (h >>> 15)) >>> 0) / 4294967296 - 0.5;
      pos.setXYZ(i, x + n1 * amp, y + n2 * amp * 0.65, z + n1 * amp);
    }
    return geo;
  };

  // =====================================================================
  // 2. HELPERS GEOMÉTRICOS DE PRECISIÓN Y ARCOS MOGOLES 3D
  // =====================================================================
  const pickRGB = (colorOrFn, va, vb, vc, amt = 0.025) =>
    typeof colorOrFn === 'function' ? colorOrFn(va, vb, vc) : jitter(colorOrFn, amt);

  const addQuad = (a, b, c, d, colorOrFn, want, amt = 0.025) => {
    addTri(a, b, c, pickRGB(colorOrFn, a, b, c, amt), want);
    addTri(a, c, d, pickRGB(colorOrFn, a, c, d, amt), want);
  };

  const _pc = new THREE.Vector3(), _fc = new THREE.Vector3(), _wn = new THREE.Vector3();
  const addPrism = (bot, top, colorOrFn, caps = true, amt = 0.025) => {
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
    addPrism(bot, top, colorOrFn, true, 0.022);
  };

  // Perfil de cúpula bulbosa mogol (LatheGeometry desde abajo hacia el ápice)
  const buildBulbousDomeProfile = (rBase, rBelly, hDome, rings = 24) => {
    const pts = [[0, 0], [rBase, 0]];
    for (let i = 1; i <= rings; i++) {
      const t = i / rings;
      let r, y;
      if (t < 0.34) {
        // Ligero estrechamiento en la garganta que se ensancha hacia la panza
        const u = t / 0.34;
        const pinch = Math.sin(u * Math.PI) * 0.04;
        r = rBase + (rBelly - rBase) * smooth(u) - rBase * pinch * 0.25;
        y = hDome * 0.38 * u;
      } else {
        // Curva ojival bulbosa hacia el ápice
        const u = (t - 0.34) / 0.66;
        const k = 1 - u;
        r = rBelly * Math.pow(Math.cos(u * Math.PI * 0.5), 0.72) * (1 - 0.14 * u * u);
        y = hDome * (0.38 + 0.62 * Math.sin(u * Math.PI * 0.5) * (0.94 + 0.06 * k));
      }
      pts.push([Math.max(0.0001, r), y]);
    }
    pts.push([0, hDome * 1.03]);
    return pts.map(([r, y]) => new THREE.Vector2(r, y));
  };

  // Remate Kalash dorado mogol (base de loto, esferas graduadas, disco lunar y punta)
  const addKalash = (x, yBase, z, sc = 1, addLotus = true, segs = 12) => {
    if (addLotus) {
      const nPetals = segs >= 14 ? 16 : 10;
      for (let i = 0; i < nPetals; i++) {
        const th = (i / nPetals) * Math.PI * 2;
        addGeo(new THREE.ConeGeometry(0.0022 * sc, 0.0055 * sc, 4), 0xf6f1e6, {
          p: [x + Math.cos(th) * 0.0038 * sc, yBase + 0.0012 * sc, z + Math.sin(th) * 0.0038 * sc],
          r: [0.55 * Math.sin(th), -th, -0.55 * Math.cos(th)],
          colorFn: marbleTrimColor,
        });
      }
    }
    addGeo(new THREE.CylinderGeometry(0.0016 * sc, 0.0044 * sc, 0.006 * sc, segs), 0xe8b948, {
      p: [x, yBase + 0.004 * sc, z], colorFn: goldKalashColor,
    });
    addGeo(new THREE.CylinderGeometry(0.00075 * sc, 0.00095 * sc, 0.026 * sc, Math.max(6, segs - 4)), 0xd19f2e, {
      p: [x, yBase + 0.019 * sc, z], colorFn: goldKalashColor,
    });
    addGeo(new THREE.SphereGeometry(0.0034 * sc, segs, Math.max(6, Math.floor(segs * 0.6))), 0xe8b948, {
      p: [x, yBase + 0.0115 * sc, z], s: [1, 0.85, 1], colorFn: goldKalashColor,
    });
    addGeo(new THREE.SphereGeometry(0.0024 * sc, segs, 6), 0xe8b948, {
      p: [x, yBase + 0.0185 * sc, z], s: [1, 0.9, 1], colorFn: goldKalashColor,
    });
    addGeo(new THREE.SphereGeometry(0.0016 * sc, Math.max(8, segs - 2), 5), 0xe8b948, {
      p: [x, yBase + 0.0245 * sc, z], colorFn: goldKalashColor,
    });
    // Media luna mogol (cuernos hacia arriba)
    addGeo(new THREE.TorusGeometry(0.0024 * sc, 0.00055 * sc, 5, 10, Math.PI * 1.15), 0xf0c756, {
      p: [x, yBase + 0.0295 * sc, z], r: [0, 0, Math.PI * 0.92], colorFn: goldKalashColor,
    });
    addGeo(new THREE.ConeGeometry(0.0008 * sc, 0.0055 * sc, 6), 0xf0c756, {
      p: [x, yBase + 0.0325 * sc, z], colorFn: goldKalashColor,
    });
  };

  // Chhatri octogonal mogol completo (base, 8 columnas, arquillos, alero, tambor, cúpula y kalash)
  const addChhatri = (cx, yBase, cz, rad, colH, {
    colColor = makranaMarbleColor(yBase),
    domeColor = makranaMarbleColor(yBase + colH),
    eaveColor = redSandstoneColor(yBase + colH),
    hasEave = true,
    hasPinnacles = false,
    domeSegs = 24,
    kalashScale = 0.42,
    lightNight = false,
  } = {}) => {
    const N_SIDES = 8;
    // Zócalo octogonal hundido en el techo
    addGeo(new THREE.CylinderGeometry(rad * 1.06, rad * 1.10, 0.0036, N_SIDES), 0xf4efe4, {
      p: [cx, yBase + 0.0004, cz], r: [0, Math.PI / 8, 0], colorFn: colColor,
    });
    // 8 columnas con basa, fuste y capitel + arquillos entre columnas
    const pts = [];
    for (let i = 0; i < N_SIDES; i++) {
      const th = (i / N_SIDES) * Math.PI * 2 + Math.PI / 8;
      pts.push([cx + Math.cos(th) * rad * 0.86, cz + Math.sin(th) * rad * 0.86, th]);
    }
    for (let i = 0; i < N_SIDES; i++) {
      const [px, pz] = pts[i];
      const [qx, qz] = pts[(i + 1) % N_SIDES];
      addGeo(new THREE.BoxGeometry(rad * 0.24, 0.0022, rad * 0.24), 0xf4efe4, {
        p: [px, yBase + 0.0028, pz], colorFn: colColor,
      });
      addGeo(new THREE.CylinderGeometry(rad * 0.085, rad * 0.105, colH, 6), 0xfbf8f2, {
        p: [px, yBase + 0.002 + colH * 0.5, pz], colorFn: colColor,
      });
      addGeo(new THREE.CylinderGeometry(rad * 0.145, rad * 0.09, 0.0026, 6), 0xede5d7, {
        p: [px, yBase + 0.002 + colH, pz], colorFn: colColor,
      });
      // Arco superior entre columnas contiguas
      const mx = (px + qx) * 0.5, mz = (pz + qz) * 0.5;
      const yTop = yBase + 0.002 + colH;
      addBeam(px, yTop - 0.0025, pz, mx, yTop + 0.0008, mz, rad * 0.11, rad * 0.12, colColor, UP, 0.0003);
      addBeam(mx, yTop + 0.0008, mz, qx, yTop - 0.0025, qz, rad * 0.11, rad * 0.12, colColor, UP, 0.0003);
      if (hasPinnacles) {
        addGeo(new THREE.ConeGeometry(rad * 0.075, rad * 0.34, 5), 0xfbf8f2, {
          p: [px, yTop + 0.0045 + rad * 0.15, pz], colorFn: colColor,
        });
      }
    }
    const yCornice = yBase + 0.0028 + colH;
    // Alero inclinado (chhajja)
    if (hasEave) {
      addGeo(new THREE.CylinderGeometry(rad * 0.96, rad * 1.24, 0.0028, N_SIDES), 0x9e4332, {
        p: [cx, yCornice, cz], r: [0, Math.PI / 8, 0], colorFn: eaveColor,
      });
    }
    // Friso y tambor octogonal bajo la cúpula
    addGeo(new THREE.CylinderGeometry(rad * 0.90, rad * 0.94, 0.0038, N_SIDES), 0xf4efe4, {
      p: [cx, yCornice + 0.0026, cz], r: [0, Math.PI / 8, 0], colorFn: colColor,
    });
    const domeProfile = buildBulbousDomeProfile(rad * 0.84, rad * 0.95, rad * 1.38, Math.max(12, Math.floor(domeSegs * 0.6)));
    addGeo(new THREE.LatheGeometry(domeProfile, domeSegs), 0xfbf8f2, {
      p: [cx, yCornice + 0.0042, cz], colorFn: domeColor,
    });
    addKalash(cx, yCornice + 0.0042 + rad * 1.35, cz, kalashScale, false, 8);
    if (lightNight) {
      features.push({ type: 'city', pos: [cx, yBase + colH * 0.65, cz], size: 0.0135 });
    }
  };

  // Vano arqueado mogol en 3D (arco apuntado de 2 centros, intradós, spandrels, marco pietra dura, muqarnas y celosía jali)
  const addMughalArchBay = (cx, yBase, cz, yaw, width, height, depth, {
    wallFn,
    trimFn = pietraDuraColor,
    archSteps = 12,
    archRatio = 0.64,
    springRatio = 0.48,
    crownRatio = 0.84,
    openThrough = false,
    muqarnas = false,
    jali = true,
    windowGlow = false,
    protrudeTop = 0,
  }) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const outDir = new THREE.Vector3(s, 0, c);
    const backDir = new THREE.Vector3(-s, 0, -c);
    const P = (lx, ly, lz) => new THREE.Vector3(
      cx + lx * c + lz * s,
      yBase + ly,
      cz - lx * s + lz * c,
    );
    const PArr = (lx, ly, lz) => [
      cx + lx * c + lz * s,
      yBase + ly,
      cz - lx * s + lz * c,
    ];

    const hw = width * 0.5;
    const ha = width * archRatio * 0.5;
    const pierW = hw - ha;
    const ySpring = height * springRatio;
    const yCrown = height * crownRatio;
    const totalH = height + protrudeTop;

    // 1. Pilares izquierdo y derecho (cajas macizas con fondo = depth)
    for (const side of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(pierW, totalH, depth), 0xfbf8f2, {
        p: PArr(side * (ha + pierW * 0.5), totalH * 0.5, -depth * 0.5),
        r: [0, yaw, 0],
        colorFn: wallFn,
      });
    }

    // 2. Curva apuntada mogol de dos centros (pendiente pronunciada en la clave)
    const aShift = 0.22;
    const norm0 = Math.sqrt(1 - Math.pow(aShift / (1 + aShift), 2));
    const archY = (x) => {
      const q = Math.min(1, Math.abs(x) / ha);
      const v = Math.sqrt(Math.max(0, 1 - Math.pow((q + aShift) / (1 + aShift), 2))) / norm0;
      return ySpring + (yCrown - ySpring) * v;
    };

    const archCenterWorld = P(0, ySpring * 0.45, -depth * 0.5);
    const inwardDown = new THREE.Vector3();

    for (let i = 0; i < archSteps; i++) {
      const x0 = -ha + (i / archSteps) * (2 * ha);
      const x1 = -ha + ((i + 1) / archSteps) * (2 * ha);
      const y0 = archY(x0);
      const y1 = archY(x1);

      const f0 = P(x0, y0, 0), f1 = P(x1, y1, 0);
      const t0 = P(x0, totalH, 0), t1 = P(x1, totalH, 0);
      const b0 = P(x0, y0, -depth), b1 = P(x1, y1, -depth);
      const bt0 = P(x0, totalH, -depth), bt1 = P(x1, totalH, -depth);

      // Enjuta frontal (spandrel con incrustaciones pietra dura cerca del arco)
      addQuad(f0, f1, t1, t0, i % 3 === 1 ? trimFn : wallFn, outDir);
      // Tapa superior
      addQuad(t0, t1, bt1, bt0, wallFn, UP);
      // Enjuta trasera (visible en arcos pasantes como la Puerta Sur)
      addQuad(b0, b1, bt1, bt0, wallFn, backDir);

      // Intradós de la bóveda apuntada
      inwardDown.set((f0.x + f1.x + b0.x + b1.x) * 0.25, (f0.y + f1.y + b0.y + b1.y) * 0.25, (f0.z + f1.z + b0.z + b1.z) * 0.25);
      inwardDown.subVectors(archCenterWorld, inwardDown);
      addQuad(f0, b0, b1, f1, wallFn, inwardDown);

      // Moldura saliente del arco en la cara frontal
      const r0 = P(x0, y0, 0.0007), r1 = P(x1, y1, 0.0007);
      addBeam(r0.x, r0.y, r0.z, r1.x, r1.y, r1.z, Math.max(0.0009, width * 0.032), 0.0014, trimFn, outDir, 0.0002);
    }

    // 3. Marco rectangular saliente (alfiz) alrededor del pishtaq / nicho
    const frameT = Math.max(0.0012, width * 0.055);
    const frameFn = wallFn;
    addGeo(new THREE.BoxGeometry(width + frameT * 0.4, frameT, 0.0016), 0xfbf8f2, {
      p: PArr(0, totalH - frameT * 0.5, 0.0007), r: [0, yaw, 0], colorFn: frameFn,
    });
    for (const side of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(frameT, totalH, 0.0016), 0xfbf8f2, {
        p: PArr(side * (hw - frameT * 0.5), totalH * 0.5, 0.0007), r: [0, yaw, 0], colorFn: frameFn,
      });
    }

    // 4. Bóveda de mocárabes (muqarnas) escalonadas en el interior del gran pishtaq
    if (muqarnas) {
      for (let tier = 1; tier <= 3; tier++) {
        const zT = -depth * (0.22 * tier);
        const shrink = 1 - tier * 0.13;
        const nM = 10;
        for (let i = 0; i < nM; i++) {
          const mx0 = -ha * shrink + (i / nM) * (2 * ha * shrink);
          const mx1 = -ha * shrink + ((i + 1) / nM) * (2 * ha * shrink);
          const my0 = ySpring + (archY(mx0 / shrink) - ySpring) * shrink;
          const my1 = ySpring + (archY(mx1 / shrink) - ySpring) * shrink;
          const a = P(mx0, my0, zT), b = P(mx1, my1, zT);
          addBeam(a.x, a.y, a.z, b.x, b.y, b.z, 0.0018, 0.0022, wallFn, outDir, 0.00025);
        }
      }
    }

    // 5. Fondo del nicho, celosía jali en 2 pisos y ventana iluminada (cuando no es paso abierto)
    if (!openThrough) {
      addGeo(new THREE.BoxGeometry(ha * 2.04, totalH * 0.96, 0.0025), 0x3b2d29, {
        p: PArr(0, totalH * 0.48, -depth + 0.0012), r: [0, yaw, 0], colorFn: nicheShadowColor,
      });
      // Entrepaño horizontal separando los dos niveles de la hornacina
      const midH = ySpring * 0.62;
      addGeo(new THREE.BoxGeometry(ha * 1.95, Math.max(0.0014, height * 0.045), depth * 0.45), 0xfbf8f2, {
        p: PArr(0, midH, -depth * 0.72), r: [0, yaw, 0], colorFn: wallFn,
      });
      if (jali) {
        // Celosía geométrica superior e inferior en relieve
        const jW = ha * 1.15, jH = midH * 0.62;
        addGeo(new THREE.BoxGeometry(jW, jH, 0.0014), windowGlow ? 0xffcf78 : 0x56443d, {
          p: PArr(0, midH * 0.44, -depth + 0.0028), r: [0, yaw, 0], amt: 0.03,
        });
        addGeo(new THREE.BoxGeometry(jW * 0.92, jH * 0.85, 0.0014), windowGlow ? 0xffcf78 : 0x56443d, {
          p: PArr(0, midH + (yCrown - midH) * 0.44, -depth + 0.0028), r: [0, yaw, 0], amt: 0.03,
        });
        // Parteluz central y traviesa de mármol/arenisca sobre la celosía
        addGeo(new THREE.BoxGeometry(0.0013, ySpring * 0.9, 0.0018), 0xfbf8f2, {
          p: PArr(0, ySpring * 0.45, -depth + 0.0036), r: [0, yaw, 0], colorFn: wallFn,
        });
      }
      if (windowGlow) {
        features.push({
          type: 'window',
          pos: PArr(0, midH * 0.44, -depth + 0.0042),
          yaw,
          w: ha * 1.02,
          h: midH * 0.56,
        });
        features.push({
          type: 'window',
          pos: PArr(0, midH + (yCrown - midH) * 0.44, -depth + 0.0042),
          yaw,
          w: ha * 0.92,
          h: midH * 0.48,
        });
      }
    }
  };

  // =====================================================================
  // 3. ZÓCALO IMPERIAL HERMÉTICO, RÍO YAMUNA (-Z), TERRAZA ROJA Y CHARBAGH (+Z)
  // =====================================================================
  const CX = 0.0, CZ = 0.0, AX = 0.285, AZ = 0.295, FLOOR = -0.046;
  const Y_RIVER = 0.006, Y_PLAZA = 0.018, Y_WATER = 0.0145, Y_TERRACE_RED = 0.030;
  const TX = 0.0, TZ = -0.114;
  const Z_RIVER_BANK = -0.214;
  const Z_TERRACE_FRONT = -0.014;

  const rimRadius = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.pow(Math.pow(Math.abs(c) / AX, 4.2) + Math.pow(Math.abs(s) / AZ, 4.2), 1 / 4.2);
  };

  const heightAt = (x, z) => {
    // 1. Río Yamuna al norte (z < -0.214)
    if (z < Z_RIVER_BANK) {
      const k = smooth((Z_RIVER_BANK - z) / 0.006);
      return Y_TERRACE_RED + (Y_RIVER - Y_TERRACE_RED) * k;
    }
    // 2. Gran Terraza Norte de Arenisca Roja (z ∈ [-0.214, -0.014])
    if (z <= Z_TERRACE_FRONT) {
      return Y_TERRACE_RED;
    }
    // 3. Transición suave entre Terraza Roja y Jardines Charbagh
    if (z < Z_TERRACE_FRONT + 0.008) {
      const k = smooth((z - Z_TERRACE_FRONT) / 0.008);
      let h = Y_TERRACE_RED + (Y_PLAZA - Y_TERRACE_RED) * k;
      if (Math.abs(x) < 0.017) h = Math.min(h, Y_WATER + (Y_TERRACE_RED - Y_WATER) * (1 - k));
      return h;
    }
    // 4. Canales reflectantes del Charbagh en cruz
    const inNSCanal = Math.abs(x) < 0.017 && z >= -0.005 && z <= 0.218;
    const inEWCanal = Math.abs(z - 0.102) < 0.013 && Math.abs(x) < 0.232;
    if (inNSCanal || inEWCanal) {
      const dEdge = Math.min(
        inNSCanal ? Math.min(0.017 - Math.abs(x), Math.min(z + 0.005, 0.218 - z)) : 9,
        inEWCanal ? Math.min(0.013 - Math.abs(z - 0.102), 0.232 - Math.abs(x)) : 9,
      );
      return Y_PLAZA + (Y_WATER - Y_PLAZA) * smooth(dEdge / 0.0035);
    }
    return Y_PLAZA;
  };

  const K = 76, S = 192;
  const ringPts = [];
  for (let k = 0; k <= K; k++) {
    const t = Math.pow(k / K, 0.94);
    const row = [];
    for (let s = 0; s < S; s++) {
      const ang = ((s + (k % 2) * 0.5) / S) * Math.PI * 2;
      const r = rimRadius(ang) * t;
      const x = CX + Math.cos(ang) * r;
      const z = CZ + Math.sin(ang) * r;
      row.push({ v: new THREE.Vector3(x, heightAt(x, z), z), x, z });
    }
    ringPts.push(row);
  }

  function groundColor(a, b, c) {
    const cx = (a.v.x + b.v.x + c.v.x) / 3;
    const cy = (a.v.y + b.v.y + c.v.y) / 3;
    const cz = (a.v.z + b.v.z + c.v.z) / 3;

    // 1. Río Yamuna al norte
    if (cz < Z_RIVER_BANK - 0.002 && cy < Y_TERRACE_RED - 0.005) {
      const n = fbm(cx * 38 + 3, cz * 52 + 9);
      const dBank = Z_RIVER_BANK - cz;
      if (dBank < 0.0065) return jitter(0x4b8799, 0.035);
      return jitter(n > 0.51 ? 0x1d5469 : 0x174457, 0.04);
    }

    // 2. Terraza Norte de Arenisca Roja con cuadrícula geométrica de mármol
    if (cz <= Z_TERRACE_FRONT + 0.003) {
      const ix = Math.floor(cx * 110), iz = Math.floor(cz * 110);
      const h = ((ix * 73856093) ^ (iz * 19349663)) & 3;
      // Cuadrícula sutil en la terraza frente al mausoleo y entre Mezquita/Jawab
      if (Math.abs(cz - TZ) < 0.012 || Math.abs(Math.abs(cx) - 0.132) < 0.006) {
        return jitter(0xf1e8d8, 0.02);
      }
      return jitter([0x9e4332, 0x913b2b, 0xa84a38, 0x863425][h], 0.028);
    }

    // 3. Canales de agua del Charbagh
    const inNS = Math.abs(cx) < 0.0165 && cz >= -0.005 && cz <= 0.218;
    const inEW = Math.abs(cz - 0.102) < 0.0125 && Math.abs(cx) < 0.232;
    if ((inNS || inEW) && cy < Y_PLAZA - 0.0012) {
      const n = fbm(cx * 48 + 7, cz * 48 + 2);
      return jitter(n > 0.52 ? 0x26798f : 0x1e667a, 0.035);
    }

    // 4. Bordillos de mármol y senderos de arenisca roja en cruz
    if (Math.abs(cx) < 0.036 && cz < 0.224) {
      if (Math.abs(cx) < 0.020) return jitter(0xf6f0e4, 0.02);
      const ix = Math.floor(cx * 145), iz = Math.floor(cz * 145);
      return jitter(((ix + iz) & 1) ? 0xa34736 : 0x923c2c, 0.025);
    }
    if (Math.abs(cz - 0.102) < 0.030 && Math.abs(cx) < 0.244) {
      if (Math.abs(cz - 0.102) < 0.0165) return jitter(0xf6f0e4, 0.02);
      const ix = Math.floor(cx * 145), iz = Math.floor(cz * 145);
      return jitter(((ix ^ iz) & 1) ? 0xa34736 : 0x923c2c, 0.025);
    }

    // 5. Eje sur de la Gran Puerta y explanada exterior
    if (cz > 0.220) {
      const ix = Math.floor(cx * 125), iz = Math.floor(cz * 125);
      if (Math.abs(cx) < 0.022) return jitter(((ix + iz) & 1) ? 0xf2eadc : 0xe4d9c6, 0.022);
      return jitter(((ix * 31) ^ (iz * 17)) & 1 ? 0x9c4232 : 0x8e3929, 0.028);
    }

    // 6. 4 Grandes Cuadrantes de Jardín Charbagh con subdivisiones en cruz
    const qx = Math.abs(cx) - 0.142;
    const qz = cz - 0.102;
    if (Math.abs(cx) > 0.036 && Math.abs(cx) < 0.254 && cz > -0.004 && cz < 0.220) {
      if (Math.abs(qx) < 0.0045 || Math.abs(Math.abs(qz) - 0.056) < 0.0045) {
        return jitter(0xa8523f, 0.025); // senderos secundarios de arenisca roja
      }
      const n = fbm(cx * 30 + 5, cz * 30 + 11);
      return jitter(n > 0.5 ? 0x457338 : 0x39632e, 0.042);
    }

    return jitter(0x963f2f, 0.028);
  }

  for (let k = 0; k < K; k++) {
    const A = ringPts[k], B = ringPts[k + 1];
    for (let s = 0; s < S; s++) {
      const s1 = (s + 1) % S;
      if (k === 0) {
        addTri(A[0].v, B[s].v, B[s1].v, groundColor(A[0], B[s], B[s1]), UP);
        continue;
      }
      if (k % 2 === 0) {
        addTri(A[s].v, B[s].v, A[s1].v, groundColor(A[s], B[s], A[s1]), UP);
        addTri(B[s].v, B[s1].v, A[s1].v, groundColor(B[s], B[s1], A[s1]), UP);
      } else {
        addTri(A[s].v, B[s1].v, A[s1].v, groundColor(A[s], B[s1], A[s1]), UP);
        addTri(A[s].v, B[s].v, B[s1].v, groundColor(A[s], B[s], B[s1]), UP);
      }
    }
  }

  // Zócalo imperial hermético con bandas de arenisca roja, zócalo oscuro y tapa inferior
  const rim = ringPts[K];
  const centerBottom = new THREE.Vector3(CX, FLOOR, CZ);
  const radial = new THREE.Vector3();
  const Y_BAND1 = 0.002, Y_BAND2 = -0.032;
  for (let s = 0; s < S; s++) {
    const a = rim[s].v, b = rim[(s + 1) % S].v;
    const ax0 = CX + (a.x - CX) * 1.008, az0 = CZ + (a.z - CZ) * 1.008;
    const bx0 = CX + (b.x - CX) * 1.008, bz0 = CZ + (b.z - CZ) * 1.008;
    const ax1 = CX + (a.x - CX) * 0.988, az1 = CZ + (a.z - CZ) * 0.988;
    const bx1 = CX + (b.x - CX) * 0.988, bz1 = CZ + (b.z - CZ) * 0.988;
    const ax2 = CX + (a.x - CX) * 0.964, az2 = CZ + (a.z - CZ) * 0.964;
    const bx2 = CX + (b.x - CX) * 0.964, bz2 = CZ + (b.z - CZ) * 0.964;

    const aTop = new THREE.Vector3(ax0, a.y, az0), bTop = new THREE.Vector3(bx0, b.y, bz0);
    const aM1 = new THREE.Vector3(ax0, Y_BAND1, az0), bM1 = new THREE.Vector3(bx0, Y_BAND1, bz0);
    const aM2 = new THREE.Vector3(ax1, Y_BAND2, az1), bM2 = new THREE.Vector3(bx1, Y_BAND2, bz1);
    const aBot = new THREE.Vector3(ax2, FLOOR, az2), bBot = new THREE.Vector3(bx2, FLOOR, bz2);

    const isRiverEdge = a.y < Y_PLAZA - 0.004 && b.y < Y_PLAZA - 0.004;
    const topBandHex = isRiverEdge ? 0x174457 : 0xa34736;

    radial.set(a.x + b.x - 2 * CX, 0, a.z + b.z - 2 * CZ);
    addTri(a, b, aTop, jitter(isRiverEdge ? 0x1d5469 : 0x9c4232, 0.025), UP);
    addTri(b, bTop, aTop, jitter(isRiverEdge ? 0x1d5469 : 0x9c4232, 0.025), UP);
    addTri(aTop, bTop, aM1, jitter(topBandHex, 0.03), radial);
    addTri(bTop, bM1, aM1, jitter(topBandHex, 0.03), radial);
    addTri(aM1, bM1, aM2, jitter(s % 2 ? 0x57261f : 0x642c24, 0.03), radial);
    addTri(bM1, bM2, aM2, jitter(s % 2 ? 0x57261f : 0x642c24, 0.03), radial);
    addTri(aM2, bM2, aBot, jitter(0x3a241f, 0.03), radial);
    addTri(bM2, bBot, aBot, jitter(0x3a241f, 0.03), radial);
    addTri(aBot, bBot, centerBottom, jitter(0x412924, 0.025), DOWN);
  }

  // Muro fluvial del Yamuna (z = -0.214) cubriendo por completo el talud de la ribera
  {
    const wallW = 0.522;
    addGeo(new THREE.BoxGeometry(wallW, 0.032, 0.015), 0x8c3828, {
      p: [0, Y_RIVER + 0.010, Z_RIVER_BANK - 0.003], colorFn: redSandstoneColor(Y_RIVER),
    });
    addGeo(new THREE.BoxGeometry(wallW, 0.0036, 0.016), 0xf4efe4, {
      p: [0, Y_TERRACE_RED + 0.0012, Z_RIVER_BANK - 0.002], colorFn: marbleTrimColor,
    });
    for (let i = -10; i <= 10; i++) {
      const bx = i * 0.025;
      addGeo(new THREE.BoxGeometry(0.0048, 0.032, 0.007), 0x7d3022, {
        p: [bx, Y_RIVER + 0.010, Z_RIVER_BANK - 0.011], colorFn: redSandstoneColor(Y_RIVER),
      });
      if (i % 3 === 0) {
        addGeo(new THREE.BoxGeometry(0.0044, 0.006, 0.0044), 0xfbf8f2, {
          p: [bx, Y_TERRACE_RED + 0.004, Z_RIVER_BANK - 0.002], colorFn: marbleTrimColor,
        });
      }
    }
    // Escalinata entre la Terraza Roja y el Jardín Charbagh
    addGeo(new THREE.BoxGeometry(0.54, 0.014, 0.010), 0x9e4332, {
      p: [0, Y_PLAZA + 0.006, Z_TERRACE_FRONT + 0.002], colorFn: redSandstoneColor(Y_PLAZA),
    });
    for (const sx of [-1, 1]) {
      for (let st = 0; st < 4; st++) {
        addGeo(new THREE.BoxGeometry(0.022, 0.004, 0.005), 0xf1e8d8, {
          p: [sx * 0.028, Y_TERRACE_RED - st * 0.003, Z_TERRACE_FRONT + 0.004 + st * 0.0035],
          colorFn: marbleTrimColor,
        });
      }
    }
  }

  // Destellos en el Río Yamuna y 2 Barcazas Mogoles (Bajras)
  for (let i = 0; i < 16; i++) {
    const sx = -0.22 + (i / 15) * 0.44;
    const sz = -0.236 - (i % 3) * 0.015;
    features.push({ type: 'sparkle', pos: [sx, Y_RIVER + 0.001, sz], size: 0.009 });
  }
  const addMughalBoat = (bx, bz, dirX) => {
    const yaw = dirX > 0 ? 0.08 : Math.PI - 0.08;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly, lz) => [bx + lx * c + lz * s, Y_RIVER + ly, bz - lx * s + lz * c];
    addGeo(new THREE.BoxGeometry(0.044, 0.0065, 0.012), 0x6b3e24, { p: P(0, 0.001, 0), r: [0, yaw, 0], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(0.0068, 0.013, 4), 0x7c492a, { p: P(0.027, 0.0018, 0), r: [0, yaw, -Math.PI / 2], amt: 0.04 });
    addGeo(new THREE.ConeGeometry(0.0062, 0.011, 4), 0x7c492a, { p: P(-0.026, 0.0018, 0), r: [0, yaw, Math.PI / 2], amt: 0.04 });
    // Pabellón imperial con columnas doradas y dosel rojo mogol
    addGeo(new THREE.BoxGeometry(0.020, 0.0025, 0.0095), 0xe6d6bc, { p: P(-0.002, 0.0052, 0), r: [0, yaw, 0] });
    for (const lx of [-0.009, 0.005]) {
      for (const lz of [-0.0038, 0.0038]) {
        addGeo(new THREE.CylinderGeometry(0.0006, 0.0007, 0.0075, 5), 0xe8b948, { p: P(lx, 0.0098, lz) });
      }
    }
    addGeo(new THREE.BoxGeometry(0.021, 0.0028, 0.0105), 0x9e3028, { p: P(-0.002, 0.014, 0), r: [0, yaw, 0], amt: 0.03 });
    addGeo(new THREE.ConeGeometry(0.0055, 0.0045, 4), 0xe8b948, { p: P(-0.002, 0.017, 0), r: [0, yaw + Math.PI / 4, 0] });
    features.push({ type: 'city', pos: P(0.012, 0.009, 0), size: 0.013 });
    features.push({ type: 'sparkle', pos: P(-0.034, 0.002, 0), size: 0.009 });
  };
  addMughalBoat(-0.115, -0.256, +1);
  addMughalBoat(+0.115, -0.248, -1);

  // =====================================================================
  // 4. EL GRAN MAUSOLEO (RAUZA-I-MUNAWWARA) EN (TX = 0, TZ = -0.114)
  // =====================================================================
  const Y_PLINTH = 0.056;
  const PLINTH_W = 0.184;
  const hPlinth = PLINTH_W * 0.5;
  const Y_ROOF = 0.144;

  // --- 4.1: Gran Plinto de Mármol Blanco (Takhtgah) ---
  {
    const plinthH = Y_PLINTH - 0.026; // se hunde 4 mm dentro de Y_TERRACE_RED = 0.030
    addGeo(new THREE.BoxGeometry(PLINTH_W, plinthH, PLINTH_W), 0xfbf8f2, {
      p: [TX, 0.026 + plinthH * 0.5, TZ], colorFn: makranaMarbleColor(0.030),
    });
    // Cornisa superior y zócalo inferior del plinto
    addGeo(new THREE.BoxGeometry(PLINTH_W + 0.004, 0.0032, PLINTH_W + 0.004), 0xf4efe4, {
      p: [TX, Y_PLINTH - 0.0012, TZ], colorFn: marbleTrimColor,
    });
    addGeo(new THREE.BoxGeometry(PLINTH_W + 0.005, 0.0045, PLINTH_W + 0.005), 0xede5d7, {
      p: [TX, 0.031, TZ], colorFn: makranaMarbleColor(0.030),
    });
    // 18 paneles en relieve de mármol tallado y balaustrada en las 4 caras del plinto
    for (let dir = 0; dir < 4; dir++) {
      const yaw = dir * (Math.PI / 2);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const tx = Math.cos(yaw), tz = -Math.sin(yaw);
      const sidePt = (al, y, outOff) => [TX + tx * al + nx * outOff, y, TZ + tz * al + nz * outOff];
      for (let k = -8; k <= 8; k++) {
        const al = k * 0.0102;
        if (dir === 0 && Math.abs(al) < 0.015) continue; // hueco de entrada ceremonial sur
        addGeo(new THREE.BoxGeometry(0.0074, 0.017, 0.0018), 0xf4efe4, {
          p: sidePt(al, 0.043, hPlinth + 0.0008), r: [0, yaw, 0], colorFn: makranaMarbleColor(0.030),
        });
        addGeo(new THREE.BoxGeometry(0.0050, 0.012, 0.0014), 0xfbf8f2, {
          p: sidePt(al, 0.043, hPlinth + 0.0015), r: [0, yaw, 0], colorFn: marbleTrimColor,
        });
      }
      // Balaustrada perimetral del plinto
      for (let b = -13; b <= 13; b++) {
        const al = b * 0.0066;
        if (dir === 0 && Math.abs(al) < 0.013) continue;
        addGeo(new THREE.BoxGeometry(0.0012, 0.0038, 0.0012), 0xfbf8f2, {
          p: sidePt(al, Y_PLINTH + 0.0022, hPlinth - 0.0015), r: [0, yaw, 0], colorFn: marbleTrimColor,
        });
      }
      addGeo(new THREE.BoxGeometry(PLINTH_W - 0.004, 0.0013, 0.0016), 0xf4efe4, {
        p: sidePt(0, Y_PLINTH + 0.0042, hPlinth - 0.0015), r: [0, yaw, 0], colorFn: marbleTrimColor,
      });
    }
    // Portal ceremonial sur empotrado en el plinto con doble escalinata
    addMughalArchBay(TX, 0.028, TZ + hPlinth + 0.0015, 0, 0.026, 0.028, 0.010, {
      wallFn: makranaMarbleColor(0.030), archSteps: 10, jali: false, windowGlow: false,
    });
    for (let st = 0; st < 6; st++) {
      const f = st / 5;
      addGeo(new THREE.BoxGeometry(0.024, 0.004, 0.0045), 0xfbf8f2, {
        p: [TX, 0.031 + f * 0.023, TZ + hPlinth + 0.011 - st * 0.0022], colorFn: marbleTrimColor,
      });
    }
    // Iluminación nocturna suave en los cuatro ángulos del gran plinto de mármol
    for (const sx of [-1, 1]) {
      features.push({ type: 'city', pos: [TX + sx * 0.042, Y_PLINTH + 0.005, TZ + hPlinth - 0.008], size: 0.014 });
      features.push({ type: 'city', pos: [TX + sx * 0.042, Y_PLINTH + 0.005, TZ - hPlinth + 0.008], size: 0.014 });
    }
  }

  // --- 4.2: Cuerpo Octogonal Chaflanado del Mausoleo (y = 0.054 .. 0.144) ---
  const BODY_HW = 0.058;
  const CHAMFER = 0.0195;
  const FLAT_HALF = BODY_HW - CHAMFER; // 0.0385
  const BODY_H = Y_ROOF - (Y_PLINTH - 0.002);

  {
    // Núcleo octogonal macizo de mármol blanco (sin huecos internos)
    const octShape = new THREE.Shape();
    octShape.moveTo(-FLAT_HALF, -BODY_HW);
    octShape.lineTo(FLAT_HALF, -BODY_HW);
    octShape.lineTo(BODY_HW, -FLAT_HALF);
    octShape.lineTo(BODY_HW, FLAT_HALF);
    octShape.lineTo(FLAT_HALF, BODY_HW);
    octShape.lineTo(-FLAT_HALF, BODY_HW);
    octShape.lineTo(-BODY_HW, FLAT_HALF);
    octShape.lineTo(-BODY_HW, -FLAT_HALF);
    octShape.closePath();

    const coreGeo = new THREE.ExtrudeGeometry(octShape, { depth: BODY_H, bevelEnabled: false });
    coreGeo.rotateX(-Math.PI / 2);
    addGeo(coreGeo, 0xfbf8f2, { p: [TX, Y_PLINTH - 0.002, TZ], colorFn: makranaMarbleColor(Y_PLINTH) });

    // Cornisa superior y friso moldurado recorriendo el octógono
    const friezeGeo = new THREE.ExtrudeGeometry(octShape, { depth: 0.005, bevelEnabled: false });
    friezeGeo.rotateX(-Math.PI / 2);
    addGeo(friezeGeo, 0xf4efe4, {
      p: [TX, Y_ROOF - 0.0022, TZ], s: [1.03, 1, 1.03], colorFn: marbleTrimColor,
    });

    // 4 Caras Axiales: Gran Pishtaq central + 4 nichos laterales en 2 pisos (16 en total)
    const pishtaqW = 0.040;
    const nicheW = 0.0185;
    const nicheOffsetX = 0.0298;
    const wallY0 = Y_PLINTH - 0.001;
    const wallH = Y_ROOF - wallY0;

    for (let dir = 0; dir < 4; dir++) {
      const yaw = dir * (Math.PI / 2);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const tx = Math.cos(yaw), tz = -Math.sin(yaw);
      const facePt = (al, y, out) => [TX + tx * al + nx * out, y, TZ + tz * al + nz * out];

      // Gran Pishtaq axial con bóveda apuntada profunda, muqarnas, pietra dura y celosías jali
      addMughalArchBay(TX + nx * (BODY_HW + 0.0055), wallY0, TZ + nz * (BODY_HW + 0.0055), yaw, pishtaqW, wallH, 0.011, {
        wallFn: makranaMarbleColor(Y_PLINTH),
        trimFn: pietraDuraColor,
        archSteps: 18,
        archRatio: 0.72,
        springRatio: 0.44,
        crownRatio: 0.87,
        muqarnas: true,
        jali: true,
        windowGlow: true,
        protrudeTop: 0.016,
      });

      // 2 flancos × 2 pisos = 4 nichos arqueados por cara (16 nichos laterales)
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 2; tier++) {
          const ny = wallY0 + tier * (wallH * 0.49);
          const nh = wallH * 0.47;
          const np = facePt(side * nicheOffsetX, ny, BODY_HW + 0.0032);
          addMughalArchBay(np[0], np[1], np[2], yaw, nicheW, nh, 0.0055, {
            wallFn: makranaMarbleColor(Y_PLINTH),
            trimFn: pietraDuraColor,
            archSteps: 10,
            archRatio: 0.66,
            springRatio: 0.46,
            crownRatio: 0.85,
            jali: true,
            windowGlow: tier === 0 && dir === 0,
          });
        }
      }

      // 2 Columnas Guldasta flanqueando el Pishtaq + 2 en esquinas del chaflán = 16 en caras + 8 en chaflanes = 24
      for (const gAl of [-pishtaqW * 0.505, pishtaqW * 0.505, -FLAT_HALF, FLAT_HALF]) {
        const gp = facePt(gAl, wallY0, BODY_HW + 0.0055);
        addGeo(new THREE.CylinderGeometry(0.0015, 0.0018, wallH + 0.022, 8), 0xfbf8f2, {
          p: [gp[0], wallY0 + (wallH + 0.022) * 0.5, gp[2]], colorFn: marbleTrimColor,
        });
        addGeo(new THREE.ConeGeometry(0.0020, 0.0055, 8), 0xe8b948, {
          p: [gp[0], wallY0 + wallH + 0.0245, gp[2]], colorFn: goldKalashColor,
        });
      }

      // Parapeto de merlones mogoles (kangura) en la cornisa
      for (let m = -4; m <= 4; m++) {
        const al = m * 0.0066;
        if (Math.abs(al) < pishtaqW * 0.52) continue;
        const mp = facePt(al, Y_ROOF + 0.0032, BODY_HW - 0.001);
        addGeo(new THREE.BoxGeometry(0.0036, 0.0042, 0.0022), 0xfbf8f2, {
          p: mp, r: [0, yaw, 0], colorFn: marbleTrimColor,
        });
      }
    }

    // 4 Chaflanes de esquina: 2 niveles de nichos arqueados cada uno (8 nichos en chaflán) + guldastas de esquina
    const diagDist = (BODY_HW + FLAT_HALF) * 0.5 / Math.SQRT2 * 2 * 0.7071; // distancia perpendicular exacta del chaflán: (BODY_HW+FLAT_HALF)/sqrt(2)
    const chDepthDist = (BODY_HW + FLAT_HALF) / Math.SQRT2;
    const chWidth = CHAMFER * Math.SQRT2;
    for (let cIdx = 0; cIdx < 4; cIdx++) {
      const yaw = Math.PI / 4 + cIdx * (Math.PI / 2);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      for (let tier = 0; tier < 2; tier++) {
        const ny = wallY0 + tier * (wallH * 0.49);
        const nh = wallH * 0.47;
        addMughalArchBay(TX + nx * (chDepthDist + 0.0028), ny, TZ + nz * (chDepthDist + 0.0028), yaw, chWidth * 0.94, nh, 0.005, {
          wallFn: makranaMarbleColor(Y_PLINTH),
          trimFn: pietraDuraColor,
          archSteps: 10,
          archRatio: 0.68,
          springRatio: 0.46,
          crownRatio: 0.85,
          jali: true,
          windowGlow: false,
        });
      }
      // Guldasta central superior sobre cada chaflán
      const gx = TX + nx * (chDepthDist + 0.0025), gz = TZ + nz * (chDepthDist + 0.0025);
      addGeo(new THREE.CylinderGeometry(0.0014, 0.0017, wallH + 0.017, 8), 0xfbf8f2, {
        p: [gx, wallY0 + (wallH + 0.017) * 0.5, gz], colorFn: marbleTrimColor,
      });
      addGeo(new THREE.ConeGeometry(0.0019, 0.0048, 8), 0xe8b948, {
        p: [gx, wallY0 + wallH + 0.0195, gz], colorFn: goldKalashColor,
      });
    }
    void diagDist;
  }

  // --- 4.3: Gran Tambor Alto, Cúpula Bulbosa (Amrud), Corona de Loto y Kalash ---
  {
    const Y_DRUM = Y_ROOF - 0.002;
    const R_DRUM = 0.0345;
    const H_DRUM = 0.030;

    // Zócalo del tambor + fuste cilíndrico alto de 36 lados
    addGeo(new THREE.CylinderGeometry(R_DRUM + 0.0024, R_DRUM + 0.0034, 0.006, 36), 0xf4efe4, {
      p: [TX, Y_DRUM + 0.003, TZ], colorFn: makranaMarbleColor(Y_ROOF),
    });
    addGeo(new THREE.CylinderGeometry(R_DRUM, R_DRUM, H_DRUM, 36), 0xfbf8f2, {
      p: [TX, Y_DRUM + H_DRUM * 0.5, TZ], colorFn: makranaMarbleColor(Y_ROOF),
    });
    // 16 pilastras decorativas en el tambor
    for (let i = 0; i < 16; i++) {
      const th = (i / 16) * Math.PI * 2;
      const px = TX + Math.sin(th) * (R_DRUM + 0.0005);
      const pz = TZ + Math.cos(th) * (R_DRUM + 0.0005);
      addGeo(new THREE.BoxGeometry(0.0024, H_DRUM * 0.78, 0.0016), 0xf4efe4, {
        p: [px, Y_DRUM + H_DRUM * 0.48, pz], r: [0, th, 0], colorFn: marbleTrimColor,
      });
    }
    // Anillo moldurado y cornisa bajo el nacimiento bulboso de la cúpula
    addGeo(new THREE.CylinderGeometry(R_DRUM + 0.0018, R_DRUM + 0.0014, 0.0042, 36), 0xf4efe4, {
      p: [TX, Y_DRUM + H_DRUM, TZ], colorFn: marbleTrimColor,
    });

    // Gran Cúpula Bulbosa (48 segmentos radiales × 32 anillos)
    const Y_DOME = Y_DRUM + H_DRUM + 0.0015;
    const domePts = buildBulbousDomeProfile(0.0348, 0.0398, 0.066, 32);
    addGeo(new THREE.LatheGeometry(domePts, 48), 0xfbf8f2, {
      p: [TX, Y_DOME, TZ], colorFn: makranaMarbleColor(Y_DOME),
    });

    // Remate de pétalos de loto invertido + gran Kalash dorado imperial
    addKalash(TX, Y_DOME + 0.0655, TZ, 1.08, true, 16);
    features.push({ type: 'sparkle', pos: [TX, Y_DOME + 0.098, TZ], size: 0.010 });
    features.push({ type: 'city', pos: [TX, Y_DOME + 0.094, TZ], size: 0.014 });
    // Iluminación nocturna en la corona del tambor
    for (let i = 0; i < 4; i++) {
      const th = i * (Math.PI / 2) + Math.PI / 4;
      features.push({ type: 'city', pos: [TX + Math.cos(th) * (R_DRUM + 0.002), Y_DRUM + 0.008, TZ + Math.sin(th) * (R_DRUM + 0.002)], size: 0.0135 });
    }
  }

  // --- 4.4: 4 Chhatris Octogonales en las Esquinas de la Azotea ---
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addChhatri(TX + sx * 0.0365, Y_ROOF - 0.001, TZ + sz * 0.0365, 0.0145, 0.0175, {
        colColor: makranaMarbleColor(Y_ROOF),
        domeColor: makranaMarbleColor(Y_ROOF + 0.02),
        eaveColor: marbleTrimColor,
        hasEave: true,
        hasPinnacles: true,
        domeSegs: 24,
        kalashScale: 0.44,
        lightNight: true,
      });
    }
  }

  // =====================================================================
  // 5. LOS 4 MINARETES DE MÁRMOL BLANCO (TX ± 0.082, TZ ± 0.082)
  // =====================================================================
  const addMinaret = (mx, mz) => {
    // Leve inclinación hacia afuera del mausoleo (rasgo arquitectónico real contra terremotos)
    const dirX = Math.sign(mx - TX), dirZ = Math.sign(mz - TZ);
    const tiltAngle = 0.014;
    const tiltAxis = new THREE.Vector3(-dirZ, 0, dirX).normalize();
    const tiltQ = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAngle);

    // Pedestal octogonal hundido en el plinto
    addGeo(new THREE.CylinderGeometry(0.0108, 0.0118, 0.014, 8), 0xf4efe4, {
      p: [mx, Y_PLINTH + 0.005, mz], r: [0, Math.PI / 8, 0], colorFn: makranaMarbleColor(Y_PLINTH),
    });
    addGeo(new THREE.CylinderGeometry(0.0098, 0.0108, 0.0032, 8), 0xede5d7, {
      p: [mx, Y_PLINTH + 0.013, mz], r: [0, Math.PI / 8, 0], colorFn: marbleTrimColor,
    });

    // 3 tramos troncocónicos + 3 balcones circulares en voladizo con ménsulas y barandilla jali
    const tiers = [
      { y0: 0.013, h: 0.044, r0: 0.0086, r1: 0.0074 },
      { y0: 0.057, h: 0.041, r0: 0.0073, r1: 0.0063 },
      { y0: 0.098, h: 0.038, r0: 0.0062, r1: 0.0053 },
    ];
    const localToWorld = (ly) => {
      const v = new THREE.Vector3(0, ly, 0).applyQuaternion(tiltQ);
      return [mx + v.x, Y_PLINTH + v.y, mz + v.z];
    };

    for (const tr of tiers) {
      const midP = localToWorld(tr.y0 + tr.h * 0.5);
      addGeo(new THREE.CylinderGeometry(tr.r1, tr.r0, tr.h, 24, 3), 0xfbf8f2, {
        p: midP, q: tiltQ, colorFn: makranaMarbleColor(Y_PLINTH),
      });
      // Balcón proyectado con anillo de piedra tallada, ménsulas y barandilla calada
      const balP = localToWorld(tr.y0 + tr.h);
      const rBal = tr.r1 + 0.0034;
      addGeo(new THREE.CylinderGeometry(rBal, tr.r1 + 0.0005, 0.0034, 24), 0xf4efe4, {
        p: balP, q: tiltQ, colorFn: marbleTrimColor,
      });
      addGeo(new THREE.CylinderGeometry(rBal + 0.0004, rBal + 0.0004, 0.0014, 24), 0xfbf8f2, {
        p: localToWorld(tr.y0 + tr.h + 0.0022), q: tiltQ, colorFn: marbleTrimColor,
      });
      const nPosts = 14;
      for (let k = 0; k < nPosts; k++) {
        const th = (k / nPosts) * Math.PI * 2;
        const off = new THREE.Vector3(Math.cos(th) * (rBal - 0.0008), tr.y0 + tr.h + 0.0048, Math.sin(th) * (rBal - 0.0008)).applyQuaternion(tiltQ);
        addGeo(new THREE.BoxGeometry(0.0009, 0.0036, 0.0009), 0xfbf8f2, {
          p: [mx + off.x, Y_PLINTH + off.y, mz + off.z], q: tiltQ, colorFn: marbleTrimColor,
        });
        const corb = new THREE.Vector3(Math.cos(th) * (tr.r1 + 0.0015), tr.y0 + tr.h - 0.0022, Math.sin(th) * (tr.r1 + 0.0015)).applyQuaternion(tiltQ);
        const corbQ = tiltQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -th, 0)));
        addGeo(new THREE.BoxGeometry(0.0011, 0.0028, 0.0022), 0xeae1d1, {
          p: [mx + corb.x, Y_PLINTH + corb.y, mz + corb.z], q: corbQ, colorFn: marbleTrimColor,
        });
      }
      const railQ = tiltQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
      addGeo(new THREE.TorusGeometry(rBal - 0.0008, 0.00065, 5, 20), 0xf4efe4, {
        p: localToWorld(tr.y0 + tr.h + 0.0066), q: railQ, colorFn: marbleTrimColor,
      });
    }

    // Chhatri coronando el minarete
    const topC = localToWorld(0.136);
    addChhatri(topC[0], topC[1], topC[2], 0.0068, 0.0115, {
      colColor: makranaMarbleColor(Y_PLINTH),
      domeColor: makranaMarbleColor(topC[1]),
      eaveColor: marbleTrimColor,
      hasEave: true,
      hasPinnacles: false,
      domeSegs: 20,
      kalashScale: 0.34,
      lightNight: true,
    });
  };
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMinaret(TX + sx * 0.082, TZ + sz * 0.082);
    }
  }

  // =====================================================================
  // 6. LA MEZQUITA (OESTE) Y EL JAWAB (ESTE) SOBRE LA TERRAZA ROJA
  // =====================================================================
  const buildFlankingSanctuary = (cx, cz, facingSignX) => {
    // facingSignX = +1 para Mezquita (mira al Mausoleo +X); -1 para Jawab (mira al Mausoleo -X)
    const yawFront = facingSignX > 0 ? Math.PI / 2 : -Math.PI / 2;
    const yawBack = yawFront + Math.PI;
    const Y0 = Y_TERRACE_RED;
    const plinthH = 0.009;
    const Y_FLOOR = Y0 + plinthH - 0.002;
    const bodyDepth = 0.044;  // a lo largo de X
    const bodyLen = 0.124;    // a lo largo de Z
    const bodyH = 0.048;

    // 1. Zócalo de arenisca roja hundido en la terraza
    addGeo(new THREE.BoxGeometry(bodyDepth + 0.012, plinthH, bodyLen + 0.012), 0x8c3828, {
      p: [cx, Y0 + plinthH * 0.5 - 0.0025, cz], colorFn: redSandstoneColor(Y0),
    });
    // Cuerpo macizo interior de arenisca roja
    addGeo(new THREE.BoxGeometry(bodyDepth - 0.004, bodyH, bodyLen - 0.006), 0x9e4332, {
      p: [cx, Y_FLOOR + bodyH * 0.5, cz], colorFn: redSandstoneColor(Y_FLOOR),
    });
    // Cornisa blanca de mármol y friso superior
    addGeo(new THREE.BoxGeometry(bodyDepth + 0.004, 0.0038, bodyLen + 0.004), 0xf4efe4, {
      p: [cx, Y_FLOOR + bodyH, cz], colorFn: marbleTrimColor,
    });

    // 2. Fachada principal hacia el Taj Mahal y fachada trasera (sin espalda vacía)
    const xFront = cx + facingSignX * (bodyDepth * 0.5);
    const xBack = cx - facingSignX * (bodyDepth * 0.5);
    const bayPositions = [-0.038, 0, 0.038];
    for (let i = 0; i < 3; i++) {
      const bz = cz + bayPositions[i];
      const isCenter = i === 1;
      const w = isCenter ? 0.042 : 0.034;
      const h = isCenter ? bodyH * 1.06 : bodyH * 0.94;
      addMughalArchBay(xFront, Y_FLOOR, bz, yawFront, w, h, 0.0075, {
        wallFn: redSandstoneColor(Y_FLOOR),
        trimFn: marbleTrimColor,
        archSteps: isCenter ? 14 : 10,
        archRatio: 0.68,
        muqarnas: isCenter,
        jali: true,
        windowGlow: true,
        protrudeTop: isCenter ? 0.009 : 0,
      });
      // Fachada trasera con arcos ciegos en piedra roja y mármol blanco
      addMughalArchBay(xBack, Y_FLOOR, bz, yawBack, w * 0.92, bodyH * 0.90, 0.005, {
        wallFn: redSandstoneColor(Y_FLOOR),
        trimFn: marbleTrimColor,
        archSteps: 10,
        archRatio: 0.64,
        jali: true,
        windowGlow: isCenter,
      });
    }

    // 3. Fachadas laterales Norte y Sur (con nichos arqueados de dos niveles)
    for (const sz of [-1, 1]) {
      const sideYaw = sz > 0 ? 0 : Math.PI;
      const sideZ = cz + sz * (bodyLen * 0.5);
      for (let tier = 0; tier < 2; tier++) {
        addMughalArchBay(cx, Y_FLOOR + tier * (bodyH * 0.48), sideZ, sideYaw, bodyDepth * 0.72, bodyH * 0.45, 0.0045, {
          wallFn: redSandstoneColor(Y_FLOOR),
          trimFn: marbleTrimColor,
          archSteps: 8,
          jali: true,
        });
      }
      // Torre octogonal adosada en las esquinas exteriores Norte y Sur
      const tx = cx - facingSignX * (bodyDepth * 0.42);
      const tz = cz + sz * (bodyLen * 0.50);
      addGeo(new THREE.CylinderGeometry(0.0075, 0.0085, bodyH + 0.004, 8), 0x9e4332, {
        p: [tx, Y_FLOOR + bodyH * 0.5, tz], r: [0, Math.PI / 8, 0], colorFn: redSandstoneColor(Y_FLOOR),
      });
      addChhatri(tx, Y_FLOOR + bodyH + 0.001, tz, 0.0082, 0.011, {
        colColor: redSandstoneColor(Y_FLOOR + bodyH),
        domeColor: makranaMarbleColor(Y_FLOOR + bodyH),
        eaveColor: marbleTrimColor,
        domeSegs: 16,
        kalashScale: 0.28,
      });
    }

    // 4. Tres Cúpulas Bulbosa de Mármol Blanco sobre el techo (central mayor + 2 laterales)
    const Y_ROOF_S = Y_FLOOR + bodyH + 0.0015;
    for (let i = 0; i < 3; i++) {
      const dz = bayPositions[i];
      const isCenter = i === 1;
      const rDrum = isCenter ? 0.0165 : 0.0115;
      const hDrum = isCenter ? 0.012 : 0.0085;
      const hDome = isCenter ? 0.032 : 0.023;
      const segs = isCenter ? 28 : 22;

      addGeo(new THREE.CylinderGeometry(rDrum + 0.0012, rDrum + 0.0018, hDrum, segs), 0xf4efe4, {
        p: [cx, Y_ROOF_S + hDrum * 0.5, cz + dz], colorFn: makranaMarbleColor(Y_ROOF_S),
      });
      const prof = buildBulbousDomeProfile(rDrum, rDrum * 1.13, hDome, isCenter ? 18 : 14);
      addGeo(new THREE.LatheGeometry(prof, segs), 0xfbf8f2, {
        p: [cx, Y_ROOF_S + hDrum - 0.0005, cz + dz], colorFn: makranaMarbleColor(Y_ROOF_S + hDrum),
      });
      addKalash(cx, Y_ROOF_S + hDrum + hDome - 0.001, cz + dz, isCenter ? 0.48 : 0.34, false, 8);
    }

    // 5. Chhatris de esquina delantera en la azotea + patio frontal con estanque de abluciones (hauz)
    for (const sz of [-1, 1]) {
      addChhatri(cx + facingSignX * (bodyDepth * 0.32), Y_ROOF_S, cz + sz * (bodyLen * 0.42), 0.0072, 0.010, {
        colColor: makranaMarbleColor(Y_ROOF_S),
        domeColor: makranaMarbleColor(Y_ROOF_S + 0.01),
        eaveColor: redSandstoneColor(Y_ROOF_S),
        domeSegs: 16,
        kalashScale: 0.25,
        lightNight: true,
      });
    }

    // Alfombra de losas de oración (musallas) en la terraza frontal y estanque de abluciones
    const courtX = cx + facingSignX * 0.056;
    addGeo(new THREE.BoxGeometry(0.044, 0.0024, 0.092), 0xf4efe4, {
      p: [courtX, Y0 + 0.001, cz], colorFn: redSandstoneColor(Y0),
    });
    for (let r = -2; r <= 2; r++) {
      addGeo(new THREE.BoxGeometry(0.016, 0.0028, 0.012), 0xfbf8f2, {
        p: [cx + facingSignX * 0.042, Y0 + 0.0014, cz + r * 0.017], colorFn: marbleTrimColor,
      });
    }
    const tankX = cx + facingSignX * 0.068;
    addGeo(new THREE.BoxGeometry(0.022, 0.004, 0.028), 0xf4efe4, { p: [tankX, Y0 + 0.002, cz], colorFn: marbleTrimColor });
    addGeo(new THREE.BoxGeometry(0.017, 0.0045, 0.023), 0x26798f, { p: [tankX, Y0 + 0.0022, cz], amt: 0.03 });
    features.push({ type: 'sparkle', pos: [tankX, Y0 + 0.0055, cz], size: 0.009 });
  };

  buildFlankingSanctuary(-0.210, TZ, +1); // Mezquita (Oeste)
  buildFlankingSanctuary(+0.210, TZ, -1); // Jawab (Este)

  // =====================================================================
  // 7. GRAN PUERTA SUR (DARWAZA-I-RAUZA), PABELLONES LATERALES, TORREONES Y MUROS
  // =====================================================================
  // --- 7.1: Darwaza-i-Rauza en (0, +0.244) ---
  {
    const GX = 0.0, GZ = 0.244, Y0 = Y_PLAZA;
    const GW = 0.088, GD = 0.042, GH = 0.046;

    // Zócalo de arenisca roja hundido en el suelo
    addGeo(new THREE.BoxGeometry(GW + 0.012, 0.009, GD + 0.012), 0x8c3828, {
      p: [GX, Y0 + 0.0015, GZ], colorFn: redSandstoneColor(Y0),
    });
    const Y_GF = Y0 + 0.0055;

    // Dos alas macizas flanqueando el gran pasadizo abovedado central (x ∈ [-0.016, +0.016] abierto!)
    for (const sx of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.028, GH, GD), 0x9e4332, {
        p: [GX + sx * 0.030, Y_GF + GH * 0.5, GZ], colorFn: redSandstoneColor(Y_GF),
      });
    }
    // Bóveda superior sobre el pasadizo central
    addGeo(new THREE.BoxGeometry(0.032, GH - 0.025, GD), 0x9e4332, {
      p: [GX, Y_GF + 0.025 + (GH - 0.025) * 0.5, GZ], colorFn: redSandstoneColor(Y_GF),
    });

    // Pishtaqs abiertos de entrada (Sur +Z y Norte -Z hacia el jardín) + nichos laterales de 2 pisos
    for (const sz of [-1, 1]) {
      const yaw = sz > 0 ? 0 : Math.PI;
      const fz = GZ + sz * (GD * 0.5 + 0.001);
      addMughalArchBay(GX, Y_GF, fz, yaw, 0.034, GH, 0.0085, {
        wallFn: redSandstoneColor(Y_GF),
        trimFn: marbleTrimColor,
        archSteps: 14,
        archRatio: 0.78,
        springRatio: 0.44,
        crownRatio: 0.88,
        openThrough: true,
        muqarnas: true,
        protrudeTop: 0.009,
      });
      for (const sx of [-1, 1]) {
        for (let tier = 0; tier < 2; tier++) {
          addMughalArchBay(GX + sx * 0.030, Y_GF + tier * (GH * 0.48), fz, yaw, 0.016, GH * 0.44, 0.0045, {
            wallFn: redSandstoneColor(Y_GF),
            trimFn: marbleTrimColor,
            archSteps: 8,
            jali: true,
            windowGlow: tier === 0,
          });
        }
      }
      // La célebre galería de 11 cupulillas de mármol blanco sobre las fachadas Norte y Sur de la Puerta
      const Y_GAL = Y_GF + GH;
      addGeo(new THREE.BoxGeometry(0.056, 0.0055, 0.0045), 0xfbf8f2, {
        p: [GX, Y_GAL + 0.0025, GZ + sz * (GD * 0.42)], colorFn: marbleTrimColor,
      });
      for (let d = -5; d <= 5; d++) {
        const dx = d * 0.0048;
        addGeo(new THREE.CylinderGeometry(0.0018, 0.0020, 0.0045, 8), 0xfbf8f2, {
          p: [GX + dx, Y_GAL + 0.007, GZ + sz * (GD * 0.42)], colorFn: marbleTrimColor,
        });
        addGeo(new THREE.SphereGeometry(0.0021, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.65), 0xfbf8f2, {
          p: [GX + dx, Y_GAL + 0.0092, GZ + sz * (GD * 0.42)], colorFn: makranaMarbleColor(Y_GAL),
        });
        addGeo(new THREE.ConeGeometry(0.0005, 0.0026, 5), 0xe8b948, {
          p: [GX + dx, Y_GAL + 0.0118, GZ + sz * (GD * 0.42)],
        });
      }
    }

    // 4 Torreones octogonales en las esquinas de la Gran Puerta + chhatris blancos
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tx = GX + sx * (GW * 0.5 + 0.002), tz = GZ + sz * (GD * 0.5 + 0.001);
        addGeo(new THREE.CylinderGeometry(0.0068, 0.0076, GH + 0.005, 8), 0x9e4332, {
          p: [tx, Y_GF + (GH + 0.005) * 0.5, tz], r: [0, Math.PI / 8, 0], colorFn: redSandstoneColor(Y_GF),
        });
        addChhatri(tx, Y_GF + GH + 0.003, tz, 0.0072, 0.0095, {
          colColor: makranaMarbleColor(Y_GF + GH),
          domeColor: makranaMarbleColor(Y_GF + GH + 0.01),
          eaveColor: redSandstoneColor(Y_GF + GH),
          domeSegs: 16,
          kalashScale: 0.24,
          lightNight: true,
        });
      }
    }
    // Escalinata exterior sur y farol central bajo el arco
    for (let st = 0; st < 3; st++) {
      addGeo(new THREE.BoxGeometry(0.038 + st * 0.006, 0.0026, 0.006), 0xf4efe4, {
        p: [GX, Y0 + 0.0038 - st * 0.0015, GZ + GD * 0.5 + 0.008 + st * 0.0045], colorFn: marbleTrimColor,
      });
    }
    features.push({ type: 'city', pos: [GX, Y_GF + 0.025, GZ], size: 0.014 });
  }

  // --- 7.2: 2 Pabellones Laterales (Naqqar Khana) en los extremos del canal transversal (±0.246, +0.102) ---
  for (const sx of [-1, 1]) {
    const px = sx * 0.246, pz = 0.102, Y0 = Y_PLAZA;
    const yawIn = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    const yawOut = yawIn + Math.PI;
    addGeo(new THREE.BoxGeometry(0.036, 0.008, 0.056), 0x8c3828, {
      p: [px, Y0 + 0.0015, pz], colorFn: redSandstoneColor(Y0),
    });
    const YF = Y0 + 0.0045;
    addGeo(new THREE.BoxGeometry(0.026, 0.032, 0.044), 0x9e4332, {
      p: [px, YF + 0.016, pz], colorFn: redSandstoneColor(YF),
    });
    addMughalArchBay(px + (sx < 0 ? 0.014 : -0.014), YF, pz, yawIn, 0.032, 0.032, 0.006, {
      wallFn: redSandstoneColor(YF), trimFn: marbleTrimColor, archSteps: 10, jali: true, windowGlow: true,
    });
    addMughalArchBay(px - (sx < 0 ? 0.014 : -0.014), YF, pz, yawOut, 0.030, 0.030, 0.005, {
      wallFn: redSandstoneColor(YF), trimFn: marbleTrimColor, archSteps: 8, jali: true,
    });
    const prof = buildBulbousDomeProfile(0.011, 0.0125, 0.020, 14);
    addGeo(new THREE.CylinderGeometry(0.012, 0.0125, 0.006, 20), 0xf4efe4, {
      p: [px, YF + 0.034, pz], colorFn: marbleTrimColor,
    });
    addGeo(new THREE.LatheGeometry(prof, 22), 0xfbf8f2, {
      p: [px, YF + 0.0365, pz], colorFn: makranaMarbleColor(YF + 0.035),
    });
    addKalash(px, YF + 0.056, pz, 0.30, false, 6);
  }

  // --- 7.3: 4 Torreones Octogonales de Esquina (2 en la ribera Norte del Yamuna + 2 al Sur del Charbagh) ---
  const cornerBurj = [
    [-0.246, -0.204, Y_TERRACE_RED, 0.016, 0.036],
    [+0.246, -0.204, Y_TERRACE_RED, 0.016, 0.036],
    [-0.236, +0.238, Y_PLAZA, 0.014, 0.032],
    [+0.236, +0.238, Y_PLAZA, 0.014, 0.032],
  ];
  for (const [bx, bz, yb, rad, bh] of cornerBurj) {
    addGeo(new THREE.CylinderGeometry(rad, rad * 1.12, bh + 0.006, 8), 0x9e4332, {
      p: [bx, yb + bh * 0.5 - 0.002, bz], r: [0, Math.PI / 8, 0], colorFn: redSandstoneColor(yb),
    });
    addGeo(new THREE.CylinderGeometry(rad * 1.12, rad * 1.05, 0.0032, 8), 0xf4efe4, {
      p: [bx, yb + bh, bz], r: [0, Math.PI / 8, 0], colorFn: marbleTrimColor,
    });
    addChhatri(bx, yb + bh + 0.001, bz, rad * 0.88, bh * 0.45, {
      colColor: makranaMarbleColor(yb + bh),
      domeColor: makranaMarbleColor(yb + bh + 0.01),
      eaveColor: redSandstoneColor(yb + bh),
      domeSegs: 20,
      kalashScale: 0.30,
      lightNight: true,
    });
  }

  // --- 7.4: Muros Perimetrales de Cerramiento (Dalans) con almenas ---
  const addEnclosureWall = (x0, z0, x1, z1, y0, h) => {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
    addGeo(new THREE.BoxGeometry(0.009, h + 0.004, len), 0x8c3828, {
      p: [mx, y0 + h * 0.5 - 0.001, mz], r: [0, yaw, 0], colorFn: redSandstoneColor(y0),
    });
    addGeo(new THREE.BoxGeometry(0.011, 0.0022, len), 0xf4efe4, {
      p: [mx, y0 + h - 0.0005, mz], r: [0, yaw, 0], colorFn: marbleTrimColor,
    });
    const steps = Math.max(3, Math.floor(len / 0.022));
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const px = x0 + dx * f, pz = z0 + dz * f;
      addGeo(new THREE.BoxGeometry(0.0115, h + 0.006, 0.0055), 0x9e4332, {
        p: [px, y0 + h * 0.5 + 0.001, pz], r: [0, yaw, 0], colorFn: redSandstoneColor(y0),
      });
    }
  };
  for (const sx of [-1, 1]) {
    addEnclosureWall(sx * 0.260, -0.194, sx * 0.260, +0.070, Y_PLAZA, 0.018);
    addEnclosureWall(sx * 0.260, +0.134, sx * 0.240, +0.234, Y_PLAZA, 0.018);
    addEnclosureWall(sx * 0.230, +0.244, sx * 0.048, +0.244, Y_PLAZA, 0.018);
  }

  // =====================================================================
  // 8. ESTANQUE CENTRAL DE LOTO (HAUZ-I-KAUSAR), SURTIDORES Y JARDINES CHARBAGH
  // =====================================================================
  // --- 8.1: Estanque Central de Mármol (0, +0.102) ---
  {
    const LX = 0.0, LZ = 0.102, Y0 = Y_PLAZA;
    addGeo(new THREE.BoxGeometry(0.052, 0.0065, 0.052), 0xfbf8f2, {
      p: [LX, Y0 + 0.0015, LZ], colorFn: makranaMarbleColor(Y0),
    });
    // Bordillo perimetral de mármol blanco formando el espejo de agua interior
    for (const sz of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.052, 0.0035, 0.005), 0xf4efe4, {
        p: [LX, Y0 + 0.0055, LZ + sz * 0.0235], colorFn: marbleTrimColor,
      });
    }
    for (const sx of [-1, 1]) {
      addGeo(new THREE.BoxGeometry(0.005, 0.0035, 0.042), 0xf4efe4, {
        p: [LX + sx * 0.0235, Y0 + 0.0055, LZ], colorFn: marbleTrimColor,
      });
    }
    addGeo(new THREE.BoxGeometry(0.042, 0.0032, 0.042), 0x26798f, {
      p: [LX, Y0 + 0.0046, LZ], amt: 0.03,
    });
    // 4 Bancos de mármol en las esquinas + el célebre banco central mirando al Taj Mahal (-Z)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addGeo(new THREE.BoxGeometry(0.008, 0.0032, 0.004), 0xfbf8f2, {
          p: [LX + sx * 0.016, Y0 + 0.0085, LZ + sz * 0.016], r: [0, (sx * sz) * Math.PI / 4, 0],
        });
      }
    }
    addGeo(new THREE.BoxGeometry(0.012, 0.0035, 0.005), 0xfbf8f2, {
      p: [LX, Y0 + 0.0088, LZ + 0.0235], colorFn: marbleTrimColor,
    });
    // Pedestal central de loto + 5 chorros de fuente
    addGeo(new THREE.CylinderGeometry(0.0045, 0.006, 0.0055, 10), 0xfbf8f2, {
      p: [LX, Y0 + 0.007, LZ], colorFn: marbleTrimColor,
    });
    for (const [fx, fz, fh] of [[0, 0, 0.013], [-0.010, 0, 0.009], [0.010, 0, 0.009], [0, -0.010, 0.009], [0, 0.010, 0.009]]) {
      addGeo(new THREE.ConeGeometry(0.0014, fh, 6), 0xdcf2f8, { p: [LX + fx, Y0 + 0.008 + fh * 0.5, LZ + fz], amt: 0.03 });
      features.push({ type: 'sparkle', pos: [LX + fx, Y0 + 0.008 + fh, LZ + fz], size: 0.009 });
    }
  }

  // --- 8.2: 14 Surtidores a lo largo del espejo de agua central y canales transversales ---
  for (const fz of [0.004, 0.022, 0.040, 0.058, 0.145, 0.164, 0.183, 0.202]) {
    addGeo(new THREE.CylinderGeometry(0.0022, 0.0028, 0.0035, 7), 0xfbf8f2, {
      p: [0, Y_WATER + 0.0015, fz], colorFn: marbleTrimColor,
    });
    addGeo(new THREE.ConeGeometry(0.0011, 0.0085, 5), 0xdcf2f8, {
      p: [0, Y_WATER + 0.007, fz], amt: 0.03,
    });
    features.push({ type: 'sparkle', pos: [0, Y_WATER + 0.011, fz], size: 0.0085 });
  }
  for (const fx of [-0.178, -0.132, -0.078, 0.078, 0.132, 0.178]) {
    addGeo(new THREE.CylinderGeometry(0.0020, 0.0025, 0.0032, 7), 0xfbf8f2, {
      p: [fx, Y_WATER + 0.0014, 0.102], colorFn: marbleTrimColor,
    });
    addGeo(new THREE.ConeGeometry(0.0010, 0.0075, 5), 0xdcf2f8, {
      p: [fx, Y_WATER + 0.0065, 0.102], amt: 0.03,
    });
    features.push({ type: 'sparkle', pos: [fx, Y_WATER + 0.010, 0.102], size: 0.0085 });
  }

  // --- 8.3: Cipreses Mogoles en doble avenida + Árboles Frutales y Florales del Charbagh ---
  const addCypress = (x, y, z, sc = 1) => {
    addGeo(new THREE.CylinderGeometry(0.0014 * sc, 0.0022 * sc, 0.010 * sc, 6), 0x4f3826, {
      p: [x, y + 0.003 * sc, z], amt: 0.04,
    });
    const layers = [
      [0.011, 0.0065, 0.015, 0x264d24],
      [0.019, 0.0055, 0.014, 0x2f5c2b],
      [0.026, 0.0044, 0.013, 0x2b5428],
      [0.032, 0.0030, 0.010, 0x376932],
    ];
    for (const [oy, rad, h, hex] of layers) {
      const g = displaceGeo(new THREE.ConeGeometry(rad * sc, h * sc, 7, 2), 0.00045 * sc);
      addGeo(g, hex, {
        p: [x, y + oy * sc, z], r: [(rng() - 0.5) * 0.06, rng() * 6.28, (rng() - 0.5) * 0.06], amt: 0.05,
      });
    }
  };

  const addGardenTree = (x, y, z, sc = 1, blossom = false) => {
    addGeo(new THREE.CylinderGeometry(0.0016 * sc, 0.0028 * sc, 0.016 * sc, 6), 0x543c29, {
      p: [x, y + 0.005 * sc, z], r: [(rng() - 0.5) * 0.08, rng() * 3, (rng() - 0.5) * 0.08], amt: 0.05,
    });
    const greens = blossom ? [0x3d6d33, 0xd86c7a, 0xe8b848, 0x4b7f3d] : [0x325b2a, 0x3f6e34, 0x4a7c3d, 0x2a4e23];
    const blobs = [
      [0, 0.017, 0, 0.0092, 0.85],
      [0.004, 0.015, 0.0028, 0.0070, 0.82],
      [-0.0038, 0.016, -0.0026, 0.0072, 0.82],
      [0.001, 0.023, -0.0012, 0.0064, 0.88],
    ];
    for (let i = 0; i < blobs.length; i++) {
      const [ox, oy, oz, rad, sy] = blobs[i];
      const g = displaceGeo(new THREE.IcosahedronGeometry(rad * sc, 1), 0.0011 * sc);
      addGeo(g, greens[(i + Math.floor(rng() * 4)) & 3], {
        p: [x + ox * sc, y + oy * sc, z + oz * sc],
        s: [1.05, sy, 1.05],
        r: [rng() * 0.3, rng() * 6.28, rng() * 0.3],
        amt: 0.055,
      });
    }
  };

  // Doble avenida de cipreses flanqueando el espejo de agua central Norte-Sur (32 cipreses)
  for (const sx of [-1, 1]) {
    for (const cz of [0.008, 0.028, 0.048, 0.068, 0.136, 0.157, 0.178, 0.199]) {
      addCypress(sx * 0.041, Y_PLAZA, cz, 0.90 + rng() * 0.22);
    }
    for (const cx of [0.068, 0.116, 0.164, 0.206]) {
      for (const sz of [-1, 1]) {
        addCypress(sx * cx, Y_PLAZA, 0.102 + sz * 0.034, 0.82 + rng() * 0.2);
      }
    }
  }

  // Árboles frutales, florales y parterres en los 4 cuadrantes del Charbagh (24 árboles + parterres + faroles)
  const treeSpots = [
    [-0.088, 0.024], [-0.168, 0.024], [-0.218, 0.022],
    [-0.088, 0.172], [-0.168, 0.172], [-0.218, 0.174],
    [+0.088, 0.024], [+0.168, 0.024], [+0.218, 0.022],
    [+0.088, 0.172], [+0.168, 0.172], [+0.218, 0.174],
    [-0.128, 0.002], [-0.195, 0.002], [+0.128, 0.002], [+0.195, 0.002],
    [-0.128, 0.204], [-0.195, 0.204], [+0.128, 0.204], [+0.195, 0.204],
    [-0.242, 0.046], [+0.242, 0.046], [-0.238, 0.158], [+0.238, 0.158],
  ];
  for (let i = 0; i < treeSpots.length; i++) {
    const [tx, tz] = treeSpots[i];
    const ty = tz <= Z_TERRACE_FRONT ? Y_TERRACE_RED : Y_PLAZA;
    addGardenTree(tx, ty, tz, 0.85 + rng() * 0.25, i % 3 === 1);
    if (i % 2 === 0) {
      features.push({ type: 'firefly', pos: [tx, ty + 0.018, tz], size: 0.021 });
    }
  }

  // Faroles mogoles de jardín y parterres florales de arenisca y rosas
  for (const sx of [-1, 1]) {
    for (const fz of [0.010, 0.060, 0.144, 0.198]) {
      const lx = sx * 0.026;
      addGeo(new THREE.CylinderGeometry(0.0012, 0.0018, 0.015, 6), 0x9e4332, { p: [lx, Y_PLAZA + 0.006, fz] });
      addGeo(new THREE.SphereGeometry(0.0018, 6, 5), 0xffe4a0, { p: [lx, Y_PLAZA + 0.015, fz] });
      features.push({ type: 'city', pos: [lx, Y_PLAZA + 0.015, fz], size: 0.013 });
    }
    for (const pz of [0.044, 0.160]) {
      for (const px of [0.088, 0.168]) {
        const fx = sx * px;
        addGeo(new THREE.CylinderGeometry(0.014, 0.016, 0.0032, 8), 0x9e4332, {
          p: [fx, Y_PLAZA + 0.001, pz], colorFn: redSandstoneColor(Y_PLAZA),
        });
        addGeo(new THREE.CylinderGeometry(0.012, 0.013, 0.0038, 8), 0x3b6930, {
          p: [fx, Y_PLAZA + 0.0022, pz], amt: 0.05,
        });
        for (let f = 0; f < 4; f++) {
          const th = (f / 4) * Math.PI * 2 + rng() * 0.6;
          addGeo(new THREE.IcosahedronGeometry(0.0028, 0), f % 2 ? 0xc73e4c : 0xe8b948, {
            p: [fx + Math.cos(th) * 0.006, Y_PLAZA + 0.0046, pz + Math.sin(th) * 0.006], s: [1.1, 0.7, 1.1],
          });
        }
      }
    }
  }

  // =====================================================================
  // 9. EFECTOS VIVOS EN EL CIELO DE AGRA
  // =====================================================================
  const cloudRing = [
    [-0.22, 0.25, -0.15, 0.016],
    [0.23,  0.29, -0.11, 0.017],
    [0.02,  0.33, -0.21, 0.015],
    [0.22,  0.24,  0.15, 0.016],
    [-0.21, 0.27,  0.16, 0.015],
  ];
  for (const [cx, cy, cz, cs] of cloudRing) {
    features.push({ type: 'cloud', pos: [cx, cy, cz], center: [TX, cy, TZ], size: cs });
  }
  features.push({ type: 'gulls', pos: [TX, 0.235, TZ + 0.04], size: 0.125 });

  void stats;
  return finish('El Taj Mahal');
}
