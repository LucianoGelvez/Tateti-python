// Machu Picchu: andenes y ciudadela en la divisoria al pie del Huayna Picchu.
import { Vector3 } from '../vendor/three.module.js';
import { makeBuilder } from './builder.js';

export function buildMachuPicchuV2(seed = 20261118) {
  const { rng, rgbOf, features, addTri, finish } = makeBuilder(seed);
  // El relieve usa unidades de maqueta de 60 de ancho y se convierte a metros al emitir.
  const scale = 0.011;
  const va = new Vector3(), vb = new Vector3(), vc = new Vector3();
  const edgeA = new Vector3(), edgeB = new Vector3();
  const up = new Vector3(0, 1, 0);
  function triangle(a, b, c, color, facing) {
    va.set(...a).multiplyScalar(scale);
    vb.set(...b).multiplyScalar(scale);
    vc.set(...c).multiplyScalar(scale);
    edgeA.subVectors(vb, va);
    edgeB.subVectors(vc, va);
    if (edgeA.cross(edgeB).lengthSq() > 1e-20) addTri(va, vb, vc, color, facing);
  }
  function quad(a, b, c, d, color, next = color) {
    triangle(a, b, c, color);
    triangle(a, c, d, next);
  }

  const range = (min, max) => min + (max - min) * rng();
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const rgb = rgbOf;
  const blend = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
  const tint = (a, t) => a.map((v) => clamp(v * t));
  const palette = {
    fern: rgb(0x4a673c), forest: rgb(0x334c37), grass: rgb(0x829746),
    fresh: rgb(0x9ea954), rock: rgb(0x777566), bare: rgb(0x524d40),
    granite: rgb(0xa59b82), path: rgb(0xa59972),
    soil: rgb(0x70624c), thatch: rgb(0x927649), wood: rgb(0x453525),
    plinth: rgb(0x242d28), bevel: rgb(0x364439), brass: rgb(0x9c8050)
  };



  const turn = 2 * Math.PI;
  function boundary(angle, scale = 1) {
    const x = Math.cos(angle), z = Math.sin(angle);
    const contour = 1 + 0.015 * Math.sin(3 * angle + 0.4) + 0.012 * Math.cos(5 * angle);
    return [scale * 28 * contour * Math.sign(x) * Math.abs(x) ** 0.66,
            scale * 22 * contour * Math.sign(z) * Math.abs(z) ** 0.66];
  }
  function texture(x, z) {
    return 0.52 * Math.sin(0.67 * x + 0.23 * z) * Math.cos(0.56 * z - 0.24 * x)
      + 0.30 * Math.sin(1.8 * x + 1.39 * z) + 0.14 * Math.cos(3.2 * x - 2.8 * z);
  }
  function footprint(t) {
    return [mix(-15.4, -11.8, t), mix(10.1, 7.0, t)];
  }
  const terraceCurve = (x) => -0.019 * (x + 3) ** 2 + 0.16 * Math.sin(0.33 * x);
  const frontStart = 3.9;
  const frontStep = 1.78;
  const terraceCount = 8;
  const stairways = [[-9.35, 0.72], [3.2, 1.03]];
  const rearTrail = [[9.8, -8.1], [7.2, -11.0], [7.1, -13.4], [4.8, -15.2],
    [7.8, -16.3], [5.1, -18.3], [1.6, -18.7], [-1.4, -19.3], [-6.2, -19.4], [-11.8, -18.8]];
  const terraceY = (row) => 10.15 - 0.83 * row;
  const plazaY = (x, z) => 10.68 - 0.066 * z - 0.072 * x;
  function peak(x, z, px, pz, wx, wz, h, angle) {
    const a = x - px, b = z - pz;
    const u = Math.cos(angle) * a - Math.sin(angle) * b;
    const v = Math.sin(angle) * a + Math.cos(angle) * b;
    return h * Math.exp(-(Math.hypot(u / wx, v / wz) ** 2));
  }
  function mountain(x, z) {
    const ridge = 10.8 * Math.exp(-(((x + 2 + 0.16 * z) / 16) ** 2)) * Math.exp(-(((z + 0.8) / 22) ** 2));
    const shoulder = peak(x, z, -20.1, -12.1, 6.7, 7.3, 15.6, -0.34);
    const main = (px, pz, wx, wz, h, power, angle) => {
      const dX = x - px, dZ = z - pz;
      const u = Math.cos(angle) * dX - Math.sin(angle) * dZ;
      const v = Math.sin(angle) * dX + Math.cos(angle) * dZ;
      const d = Math.hypot(u / wx, v / wz);
      return h * Math.exp(-Math.pow(d, power));
    };
    const huayna = main(-7.0, -14.5, 6.5, 5.2, 19.6, 1.71, 0.65)
      + main(-10.1, -12.3, 5.7, 6.1, 6.5, 2.15, -0.25);
    const right = peak(x, z, 17.7, -15.9, 7, 5.7, 12.2, 0.53);
    const east = peak(x, z, 14.0, -6.2, 7.3, 4.0, 2.9, -0.35);
    const front = peak(x, z, -17.0, 9.2, 4, 6.4, 3.0, 0.52);
    const folds = texture(x, z);
    return 0.6 + ridge + shoulder + huayna + right + east + front + folds * (0.95 + 0.105 * (shoulder + huayna + right));
  }
  function fieldGrade(x, z, ground) {
    const q = z - terraceCurve(x);
    const length = frontStep * terraceCount;
    const [left, right] = footprint(clamp((q - frontStart) / length));
    const inside = smooth(left - 1.7, left, x) * (1 - smooth(right, right + 1.7, x));
    const zone = smooth(frontStart - 1.2, frontStart + 0.1, q) *
      (1 - smooth(frontStart + length - 0.04, frontStart + length + 1.8, q));
    const fall = clamp((q - frontStart) / frontStep, 0, terraceCount);
    const grade = terraceY(fall) - 0.30 + 0.12 * texture(x * 1.4, z);
    return mix(ground, Math.min(ground, grade), inside * zone);
  }
  function ground(x, z) {
    let y = mountain(x, z);
    const city = smooth(-18.8, -15.0, x) * (1 - smooth(10.5, 15.5, x)) *
      smooth(-13.0, -9.35, z) * (1 - smooth(4.2, 6, z));
    y = mix(y, plazaY(x, z) - 0.02 + 0.22 * texture(x, z), city);
    y = fieldGrade(x, z, y);
    const eastX = x + 0.028 * (z - 1) ** 2;
    const eastZone = smooth(-8.8, -6.8, z) * (1 - smooth(6.1, 8.9, z)) *
      smooth(9.6, 10.35, eastX) * (1 - smooth(16.85, 18.4, eastX));
    const eastY = 9.1 - 1.16 * clamp((eastX - 10.3) / 1.32, 0, 5) - 0.22;
    y = mix(y, Math.min(y, eastY), eastZone);
    const radial = (Math.abs(x / 28) ** 3.03 + Math.abs(z / 22) ** 3.03) ** (1 / 3.03);
    y = mix(y, 1.6 + 0.27 * texture(x, z) + 0.26 * Math.sin(x * 0.54), smooth(0.75, 1.02, radial));
    return Math.max(0.85, y);
  }
  function terrainColor(x, y, z, steep) {
    const noise = texture(x * 0.59, z * 0.59);
    const city = smooth(-15, -12, x) * (1 - smooth(10, 13, x)) * smooth(-10, -7, z) * (1 - smooth(3.4, 5, z));
    const fern = blend(palette.forest, palette.fern, clamp(0.52 + noise * 0.45));
    const green = blend(fern, palette.grass, city * 0.72);
    const striation = Math.sin(y * 2.1 + z * 0.56 + 1.7 * noise);
    const stone = blend(palette.bare, palette.rock, clamp(0.48 + 0.29 * noise + 0.19 * striation));
    const cliff = smooth(0.28, 0.80, steep) * (0.87 - city * 0.68);
    let color = blend(green, stone, cliff);
    if (z < -7.5 && x > -12.7 && x < 10.7) {
      let distance = Infinity;
      for (let i = 1; i < rearTrail.length; i++) {
        const [ax, az] = rearTrail[i - 1], [bx, bz] = rearTrail[i];
        const dx = bx - ax, dz = bz - az;
        const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
        distance = Math.min(distance, Math.hypot(x - ax - t * dx, z - az - t * dz));
      }
      color = blend(color, palette.path, 0.78 * (1 - smooth(0.23, 0.61, distance)));
    }
    return tint(color, 0.90 + 0.16 * noise + range(-0.075, 0.075));
  }
  function landTriangle(a, b, c) {
    const x = (a[0] + b[0] + c[0]) / 3;
    const y = (a[1] + b[1] + c[1]) / 3;
    const z = (a[2] + b[2] + c[2]) / 3;
    const grade = Math.hypot(ground(x + 0.23, z) - ground(x - 0.23, z),
                             ground(x, z + 0.23) - ground(x, z - 0.23)) / 0.46;
    triangle(a, b, c, terrainColor(x, y, z, 1 - 1 / Math.sqrt(1 + grade * grade)), up);
  }
  const spokes = 176;
  const divisions = 69;
  const rings = Array.from({length: divisions}, (_, j) => Array.from({length: spokes}, (_, i) => {
    const s = (j + 1) / divisions;
    const [x, z] = boundary(i * turn / spokes, s);
    const jitter = (j + 1 === divisions ? 0 : Math.min(0.085, s * 0.21));
    const px = x + range(-jitter, jitter), pz = z + range(-jitter, jitter);
    return [px, ground(px, pz), pz];
  }));
  for (let i = 0; i < spokes; i++) {
    const n = (i + 1) % spokes;
    landTriangle([0, ground(0, 0), 0], rings[0][n], rings[0][i]);
    for (let j = 0; j < divisions - 1; j++) {
      const a = rings[j][i], b = rings[j][n], c = rings[j + 1][n], d = rings[j + 1][i];
      landTriangle(a, b, c);
      landTriangle(a, c, d);
    }
  }

  function crossSection() {
    const top = rings.at(-1);
    const layers = [top];
    const profiles = [
      [0.999, 0.78], [1.001, 0.55], [1.004, 0.26], [1.008, -0.04],
      [1.009, -0.38], [1.011, -0.63], [1.012, -0.89]
    ];
    for (const [scale, height] of profiles) {
      layers.push(top.map(([x, y, z]) => {
        const ripple = 0.18 * Math.sin(x * 0.79 + z * 0.58) + range(-0.10, 0.10);
        const level = height < 0 ? height : -0.8 + (y + 0.8) * height;
        return [x * scale, level + ripple * (height === -0.89 ? 0 : 1), z * scale];
      }));
    }
    for (let j = 0; j < layers.length - 1; j++) {
      for (let i = 0; i < spokes; i++) {
        const n = (i + 1) % spokes;
        const vein = [0.36, 0.65, 0.25, 0.51, 0.18, 0.44, 0.21][j];
        const color = tint(blend(palette.bare, palette.rock, vein), range(0.75, 1.22));
        quad(layers[j][i], layers[j][n], layers[j + 1][n], layers[j + 1][i], color);
      }
    }
  }
  crossSection();
  function plinth() {
    const profiles = [[1.005, -0.80], [1.036, -0.90], [1.043, -1.15],
      [1.043, -1.40], [1.043, -1.48], [1.043, -2.37], [1.029, -2.69], [1.009, -2.76]];
    const segments = spokes;
    const point = (i, j) => {
      const [x, z] = boundary(i * turn / segments, profiles[j][0]);
      return [x, profiles[j][1], z];
    };
    for (let j = 0; j < profiles.length - 1; j++) {
      const color = [palette.bevel, palette.bevel, palette.plinth, palette.brass,
        palette.plinth, palette.bevel, palette.plinth][j];
      for (let i = 0; i < segments; i++) {
        quad(point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1), color);
      }
    }
    for (let i = 0; i < segments; i++) {
      triangle([0, -0.8, 0], point(i + 1, 0), point(i, 0), palette.bevel);
      const bottom = (index, radius) => {
        const [x, , z] = point(index, 7);
        return [x * radius, -2.76, z * radius];
      };
      const grain = 0.46 + 0.25 * Math.sin(i * turn / segments * 5);
      const panel = blend(palette.plinth, palette.bevel, grain);
      triangle([0, -2.76, 0], bottom(i, 0.43), bottom(i + 1, 0.43), panel);
      quad(bottom(i, 0.43), bottom(i, 0.46), bottom(i + 1, 0.46), bottom(i + 1, 0.43), palette.bevel);
      quad(bottom(i, 0.46), bottom(i, 0.84), bottom(i + 1, 0.84), bottom(i + 1, 0.46), palette.plinth);
      quad(bottom(i, 0.84), bottom(i, 1), bottom(i + 1, 1), bottom(i + 1, 0.84), panel);
    }
  }
  plinth();

  function block(x, y, z, width, height, depth, angle, color, wear = 1) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const w = width / 2, d = depth / 2;
    const bevel = Math.min(width, height, depth) * range(0.10, 0.24) * wear;
    const corners = [
      [-w + bevel, -d], [w - bevel, -d], [w, -d + bevel], [w, d - bevel],
      [w - bevel, d], [-w + bevel, d], [-w, d - bevel], [-w, -d + bevel]
    ].map(([u, v]) => [u + range(-bevel, bevel) * 0.50, v + range(-bevel, bevel) * 0.5]);
    const ring = (dy, scale) => corners.map(([u, v]) =>
      [x + scale * (u * c - v * s), y + dy + range(-bevel * 0.48, bevel * 0.48), z + scale * (u * s + v * c)]);
    const lower = ring(0, 0.98), upper = ring(height - bevel, 1), top = ring(height, 0.87);
    for (let i = 0; i < corners.length; i++) {
      const n = (i + 1) % corners.length;
      quad(lower[i], upper[i], upper[n], lower[n], tint(color, range(0.82, 1.05)));
      quad(upper[i], top[i], top[n], upper[n], tint(color, range(0.93, 1.17)));
      if (i > 0 && n !== 0) {
        triangle(top[0], top[n], top[i], tint(color, range(0.94, 1.10)));
        triangle(lower[0], lower[i], lower[n], tint(color, 0.73));
      }
    }
  }
  function masonry(x1, z1, x2, z2, y, height, courses = 4, depth = 0.6, unit = 0.77) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(z2 - z1, x2 - x1);
    const rows = courses;
    const dy = height / rows;
    for (let row = 0; row < rows; row++) {
      let done = 0;
      while (done < len - 0.025) {
        let width = Math.min(range(unit * 0.70, unit * 1.33) * (done === 0 && row % 2 ? 0.66 : 1), len - done);
        if (len - done - width < unit * 0.37) width = len - done;
        const t = (done + width / 2) / len;
        const cx = mix(x1, x2, t), cz = mix(z1, z2, t);
        const floor = typeof y === 'function' ? y(cx, cz) : y;
        const color = tint(blend(palette.granite, palette.rock, range(0.09, 0.69)), range(0.73, 1.15));
        block(cx, floor + row * dy, cz, width * 0.989, dy * range(0.94, 1.045),
          depth * (1 - row * 0.033) * range(0.91, 1.11), angle, color);
        done += width;
      }
    }
  }
  function fieldStrip(left, right, start, finish, y, bend, side = false) {
    const point = (x, z) => {
      const v = z + bend(x);
      return side ? [v, y, x] : [x, y, v];
    };
    const length = Math.ceil((right - left) / 0.38);
    const across = Math.ceil((finish - start) / 0.33);
    for (let i = 0; i < length; i++) {
      const x = mix(left, right, i / length);
      const next = mix(left, right, (i + 1) / length);
      for (let j = 0; j < across; j++) {
        const z = mix(start, finish, j / across);
        const end = mix(start, finish, (j + 1) / across);
        const value = texture(x * 0.8, z + y);
        const color = tint(blend(palette.grass, palette.fresh, clamp(0.35 + value * 0.43)), range(0.87, 1.12));
        const a = point(x, z), b = point(x, end), c = point(next, end), d = point(next, z);
        if (side) quad(d, c, b, a, color);
        else quad(a, b, c, d, color, tint(color, range(0.96, 1.04)));
      }
    }
    const pieces = Math.ceil((right - left) / 4);
    for (let i = 0; i < pieces; i++) {
      const a = point(mix(left, right, i / pieces), finish);
      const b = point(mix(left, right, (i + 1) / pieces), finish);
      masonry(a[0], a[2], b[0], b[2], y - 1.01, 1.03, 3, 0.43, 0.68);
    }
  }
  for (let row = 0; row < terraceCount; row++) {
    const [left, right] = footprint(row / terraceCount);
    const start = frontStart + row * frontStep - 0.13;
    const finish = start + frontStep + 0.05;
    let edge = left;
    for (const [x, width] of stairways) {
      fieldStrip(edge, x - width / 2, start, finish, terraceY(row), terraceCurve);
      edge = x + width / 2;
    }
    fieldStrip(edge, right, start, finish, terraceY(row), terraceCurve);
  }
  for (let row = 0; row < 5; row++) {
    const start = 10.3 + 1.32 * row;
    const y = 9.1 - 1.16 * row;
    fieldStrip(-7.1 + 0.57 * row, 6.2 + 0.38 * row, start, start + 1.45, y,
      (z) => -0.028 * (z - 1) ** 2, true);
  }

  function building(x, z, w, d, angle, height, gable = false, covered = false, windowed = false) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const transform = (u, v, y) => [x + u * c - v * s, y, z + u * s + v * c];
    const corners = [[-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2]];
    const elevations = corners.map(([u, v]) => {
      const [cx, , cz] = transform(u, v, 0);
      return ground(cx, cz);
    });
    const floor = Math.max(...elevations, ground(x, z)) + 0.075;
    const foundation = Math.max(0.23, floor - Math.min(...elevations) + 0.06);
    block(x, floor - 0.24, z, w, 0.24, d, angle, tint(palette.soil, range(0.84, 1.15)), 0.42);
    const segment = (u1, v1, u2, v2, low, wallHeight, courses, depth = 0.46) => {
      const [x1, , z1] = transform(u1, v1, 0), [x2, , z2] = transform(u2, v2, 0);
      masonry(x1, z1, x2, z2, floor + low, wallHeight, courses, depth);
    };
    for (let i = 0; i < 4; i++) segment(...corners[i], ...corners[(i + 1) % 4], -foundation, foundation, Math.ceil(foundation / 0.34), 0.52);
    segment(-w/2, -d/2, -w/2, d/2, 0, height, 4);
    segment(w/2, -d/2, w/2, d/2, 0, height, 4);
    if (windowed) {
      segment(-w/2, -d/2, w/2, -d/2, 0, height * 0.40, 2);
      segment(-w/2, -d/2, w/2, -d/2, height * 0.78, height * 0.22, 1);
      const window = 0.60, pitch = (w - 0.65) / 3;
      for (let i = 0; i <= 3; i++) {
        segment(i === 0 ? -w/2 : (i - 2) * pitch + window/2, -d/2,
          i === 3 ? w/2 : (i - 1) * pitch - window/2, -d/2, height * 0.39, height * 0.40, 2);
      }
    } else {
      segment(-w/2, -d/2, w/2, -d/2, 0, height * range(0.82, 1.10), 4);
    }
    const door = Math.min(0.52, w * 0.20);
    for (const side of [-1, 1]) {
      for (let level = 0; level < 4; level++) {
        const opening = door - 0.046 * level;
        segment(side * w/2, d/2, side * opening, d/2, height * level/4, height/4, 1);
      }
      if (gable) {
        const outer = Math.min(0.82, d * 0.31);
        for (let i = 0; i < 4; i++) {
          const span = d/2 * (1 - 0.23 * i);
          segment(side * w/2, -span, side * w/2, span, height + i * outer/4, outer/4, 1);
        }
      }
    }
    if (covered) {
      const eave = d / 2 + 0.28, span = w / 2 + 0.30;
      const ridge = floor + height + Math.min(0.82, d * 0.31) + 0.19;
      const low = floor + height - 0.04;
      for (let i = 0; i < 74; i++) {
        const a = mix(-span, span, i / 74), b = mix(-span, span, (i + 1) / 74);
        for (const sign of [-1, 1]) {
          const locate = (u, t, thickness = 0) =>
            transform(u, sign * eave * t, mix(ridge, low + 0.045 * Math.sin(61 * u), t ** 0.92) - thickness);
          for (let j = 0; j < 8; j++) {
            const t = j/8, next = (j+1)/8;
            const face = [locate(a, t), locate(a, next), locate(b, next), locate(b, t)];
            const color = tint(blend(palette.thatch, palette.wood, 0.28 * next), range(0.67, 1.37));
            const underside = [locate(a, t, 0.15), locate(a, next, 0.15),
              locate(b, next, 0.15), locate(b, t, 0.15)];
            quad(...(sign === 1 ? face : face.reverse()), color);
            quad(...(sign === 1 ? underside.reverse() : underside), palette.wood);
            if (i === 0 || i === 73) {
              const u = i === 0 ? a : b;
              const edge = [locate(u, t), locate(u, next), locate(u, next, 0.15), locate(u, t, 0.15)];
              quad(...((i === 0) === (sign === 1) ? edge.reverse() : edge), palette.thatch);
            }
          }
          const edge = [locate(a, 1), locate(b, 1), locate(b, 1, 0.15), locate(a, 1, 0.15)];
          quad(...(sign === 1 ? edge.reverse() : edge), palette.thatch);
        }
      }
      block(x, ridge - 0.06, z, w + 0.63, 0.14, 0.15, angle, palette.thatch);
      const [doorX, , doorZ] = transform(0, d / 2 - 0.07, 0);
      block(doorX, floor, doorZ, 0.66, 0.95, 0.16, angle, palette.wood);
      features.push({
        type: 'window', pos: transform(0, d / 2 + 0.05, floor + 0.49).map((value) => value * scale),
        yaw: -angle, w: 0.49 * scale, h: 0.73 * scale
      });
    }
  }

  const structures = [
    [-13.8,-6.8,3.30,2.25,-0.10,1.16,true],
    [-10.1,-7.4,3.40,2.13,-0.08,1.16,true],
    [-13.4,-3.9,3.05,2.20,-0.07,1.08,true],
    [-9.8,-4.1,3.15,2.35,-0.08,1.12,false],
    [-13.0,-0.8,3.15,2.30,-0.05,1.10,true],
    [-9.4,-0.7,3.07,2.26,-0.05,1.14,true],
    [-13.4,2.1,2.64,1.9,-0.11,0.92,false],
    [-9.8,2.1,3.25,1.98,-0.06,0.92,true],
    [-5.4,-7.4,4.27,2.47,-0.04,1.38,false,false,true],
    [-1.2,-8.6,3.04,2.14,0.04,1.25,true],
    [2.5,-7.3,3.1,2.05,0.03,1.1,false],
    [6.0,-7.6,3.25,2.19,0.09,1.08,true],
    [9.4,-6.9,2.65,2.1,0.14,1.14,true],
    [5.8,-4.5,3.4,2.21,0.11,1.16,true],
    [9.1,-4.0,2.68,1.90,0.04,0.96,false],
    [8.6,-1.0,2.45,1.83,0.15,1.12,true],
    [6.3,2.55,2.65,1.81,0.10,1.15,true],
    [9.1,2.74,2.12,1.69,0.09,0.92,false],
    [-16.0,6.05,2.84,2.11,-0.29,1.45,true,true]
  ];
  structures.forEach((dimensions) => building(...dimensions));

  function route(points, width, color) {
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = points.slice(i, i + 2);
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      const point = (t, side) => {
        const x = mix(a[0], b[0], t) + (dz / len) * side * width/2;
        const z = mix(a[1], b[1], t) - (dx / len) * side * width/2;
        return [x, ground(x, z) + 0.054, z];
      };
      const steps = Math.ceil(len / 0.34);
      for (let j = 0; j < steps; j++) {
        const t = j / steps, n = (j+1) / steps;
        quad(point(t, -1), point(n, -1), point(n, 1), point(t, 1), tint(color, range(0.83, 1.13)));
      }
    }
  }
  route([[-7.25,3.4],[-7.03,-1.6],[-7.24,-5.5],[-6.94,-8.35]], 0.66, palette.path);
  route([[4,3.25],[4.3,-0.8],[3.9,-5.36],[-2.1,-5.48],[-7.08,-5.49]], 0.72, palette.path);
  route([[-7.05,3.23],[-0.8,3.15],[4.02,3.26],[9.9,3.85]], 0.79, palette.path);
  route([[-15.95,5.45],[-16.0,3.5],[-15.33,2.77],[-11.8,2.64]], 0.47, palette.path);
  for (const [x, z] of rearTrail.slice(3, -1)) {
    const y = ground(x, z - 0.44);
    block(x, y - 0.42, z - 0.44, 0.65, 0.86, 0.5, 0.25, palette.rock, 1.2);
  }
  masonry(-7.35, -4.85, -7.12, 2.7, (x,z) => ground(x,z)-0.12, 0.46, 2, 0.33);
  masonry(-6.2, 3.76, 1.65, 3.78, (x,z) => ground(x,z)-0.14, 0.59, 2, 0.37);
  masonry(4.59, -4.05, 4.66, -0.45, (x,z) => ground(x,z)-0.16, 0.64, 2, 0.37);
  masonry(-2.59, -8.06, -2.34, -5.55, (x,z) => ground(x,z)-0.13, 0.68, 2, 0.43);

  function stairs(x, width) {
    const total = terraceCount * 8;
    let previous = null;
    for (let i = 0; i < total; i++) {
      const q = frontStart + frontStep * i/8;
      const cx = x;
      const y = terraceY(i / 8) + 0.25;
      const z = q + terraceCurve(cx);
      block(cx, y - 0.58, z, width, 0.57, 0.29, -0.03, tint(palette.granite, range(0.76, 1.08)));
      if (previous && i % 4 === 0) {
        masonry(previous[0] - width/2, previous[2], cx - width/2, z,
          y - 0.28, 0.54, 2, 0.19, 0.31);
      }
      if (i % 4 === 0) previous = [cx, y, z];
    }
  }
  stairways.forEach(([x, width]) => stairs(x, width));

  function curvedTemple() {
    const x = 5.45, z = 0.2;
    const bottom = ground(x, z) - 0.17;
    block(x - 0.27, bottom - 0.13, z, 3.20, 0.48, 2.80, -0.12, palette.rock, 1.5);
    const rim = Array.from({length: 13}, (_, i) => {
      const phase = mix(-Math.PI/2, Math.PI/2, i / 12);
      return [x + 1.38 * Math.cos(phase), z + 1.33 * Math.sin(phase)];
    });
    for (let i = 0; i < rim.length - 1; i++) {
      const [a,b] = rim.slice(i, i+2);
      masonry(...a, ...b, bottom + 0.25, i === 4 || i === 8 ? 0.73 : 1.25, i === 4 || i === 8 ? 3 : 5, 0.46);
      triangle([x, bottom + 0.38, z], [b[0], bottom + 0.38, b[1]], [a[0], bottom + 0.38, a[1]], palette.soil);
    }
    masonry(x-1.3,z-1.33,...rim[0],bottom+0.22,1.24,5);
    masonry(x-1.3,z+1.33,...rim.at(-1),bottom+0.22,1.13,4);
    masonry(x-1.30,z-1.33,x-1.30,z-0.35,bottom+0.22,1.25,5);
    masonry(x-1.30,z+0.36,x-1.30,z+1.33,bottom+0.22,1.25,5);
  }
  curvedTemple();

  const sacredY = ground(-10,-9.4) + 0.10;
  block(-10, sacredY-0.55, -9.4, 3.8, 0.90, 2.0, -0.11, palette.rock, 1.5);
  block(-10.25, sacredY+0.23, -9.4, 2.0, 0.49, 1.20, -0.12, palette.granite, 1.2);
  block(-10.12, sacredY+0.70, -9.38, 0.50, 0.65, 0.40, -0.10, palette.granite, 1.4);

  function organic(x, y, z, w, h, d, color, slices = 9, levels = 5) {
    const phases = Array.from({length: slices}, (_, i) => i * turn / slices + range(-0.12, 0.12));
    const twist = range(0, turn);
    const rings = Array.from({length: levels - 1}, (_, j) => {
      const theta = Math.PI * (j + 1) / levels;
      return phases.map((phase) => {
        const angle = phase + twist + (j % 2) * 0.24;
        const bulge = Math.sin(theta) * range(0.77, 1.20);
        return [x + w * bulge * Math.cos(angle), y + h * (Math.cos(theta) + range(-0.09, 0.09)), z + d * bulge * Math.sin(angle)];
      });
    });
    for (let i = 0; i < slices; i++) {
      const n = (i+1) % slices;
      triangle([x, y+h, z], rings[0][n], rings[0][i], tint(color, range(0.98, 1.27)));
      for (let j = 0; j < rings.length - 1; j++) {
        quad(rings[j][i], rings[j][n], rings[j+1][n], rings[j+1][i],
          tint(color, range(0.76, 1.22)), tint(color, range(0.75, 1.24)));
      }
      triangle([x, y-h, z], rings.at(-1)[i], rings.at(-1)[n], tint(color, range(0.62, 0.92)));
    }
  }

  for (let i = 0; i < 920; i++) {
    const [x, z] = boundary(range(0, turn), Math.sqrt(range(0.08, 0.90)));
    const city = x > -16.7 && x < 11.4 && z > -10.4 && z < 5.9;
    const q = z - terraceCurve(x);
    const [left, right] = footprint(clamp((q - frontStart)/(frontStep*terraceCount)));
    const front = q > frontStart - 0.5 && q < frontStart + terraceCount * frontStep + 0.7 && x > left - 1 && x < right + 1;
    const east = x > 8.9 && x < 17.8 && z > -7.8 && z < 8.9;
    if (city || front || east) continue;
    const y = ground(x, z);
    const grade = Math.hypot(ground(x+0.24,z)-ground(x-0.24,z), ground(x,z+0.24)-ground(x,z-0.24)) / 0.48;
    const ridge = texture(x * 0.47 + 5, z * 0.51);
    if (grade > 1.85 && rng() < 0.52) {
      const size = range(0.25, 0.78) * (y > 14 ? 1.45 : 1);
      organic(x, y - size * 0.36, z, size * range(0.55, 1), size * range(0.60, 1.15),
        size * range(0.62, 1.05), tint(blend(palette.rock, palette.bare, range(0.1, 0.6)), range(0.75, 1.17)), 8, 4);
    } else if (rng() < 0.73 + 0.25 * ridge) {
      const size = range(0.18, 0.62) * (y < 19 ? 1.15 : 0.76);
      const color = tint(blend(palette.forest, palette.grass, range(0.04, 0.58)), range(0.71, 1.16));
      organic(x, y + size * 0.48, z, size, size * 0.82, size * 0.75, color, 7, 4);
      for (let k = 0; k < (size > 0.39 ? 3 : 1); k++) {
        const angle = range(0, turn);
        const off = range(0.41, 0.82) * size;
        organic(x+Math.cos(angle)*off, y+size*range(0.35,0.85), z+Math.sin(angle)*off,
          size*0.64, size*0.66, size*0.58, tint(color, range(0.80,1.30)), 7, 4);
      }
    }
  }
  for (let i = 0; i < 180; i++) {
    const row = Math.floor(range(0, terraceCount));
    const [left, right] = footprint(row / terraceCount);
    const x = range(left + 0.18, right - 0.18);
    if (Math.abs(x - 3.2) < 0.65 || Math.abs(x + 9.35) < 0.45) continue;
    const z = frontStart + (row+1) * frontStep - range(0.25, 0.47) + terraceCurve(x);
    const size = range(0.045, 0.105);
    organic(x, terraceY(row)+0.018, z, size*1.8, size, size, tint(palette.grass, range(0.59, 1.24)), 5, 3);
  }

  // Anclajes cerca de la ladera y la ciudadela para acompañar las piezas que los alojan.
  const position = (x, y, z) => [x * scale, y * scale, z * scale];
  for (const [x, z, height, radius] of [[-16,-12,0.8,1.1],[-7,-16,1.6,1.3],[3,-15,1.1,1.0],[18,-13,0.7,1.0]]) {
    const y = ground(x, z) + height;
    features.push({ type: 'cloud', pos: position(x, y, z), center: position(x - 1.2, y, z + 0.48), size: radius * scale });
  }
  for (const [x, z] of [[-19,6],[-16,10],[-13,14],[-7,18],[0,18],[9,14],[13,10],[18,4],[15,-3],[9,-11],[-12,-11],[-16,-5]]) {
    const y = ground(x, z) + 0.82;
    features.push({ type: 'firefly', pos: position(x, y, z), size: 2.2 * scale });
  }
  for (const [x, z] of [[-7, 3.26], [4.15, 3.25], [4.37, -4.9], [6.4, -17.35]]) {
    const y = ground(x, z);
    block(x, y - 0.21, z, 0.41, 0.58, 0.39, 0.12, palette.rock);
    features.push({ type: 'city', pos: position(x, y + 0.59, z), size: 0.78 * scale });
  }
  return finish('Machu Picchu — Huayna Picchu');
}
