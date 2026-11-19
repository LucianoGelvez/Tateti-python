// Entorno virtual: una plataforma de piedra en medio de una pradera, con árboles, montañas,
// nubes, estrellas, sol y luna. Todo va en un grupo que se oculta entero en realidad mixta.
// Son pocas mallas grandes (unas 10 llamadas de dibujo) para no gastar el rendimiento del visor.
import * as THREE from './vendor/three.module.js';
import { mulberry32, makeNoise, smooth } from './dioramas/builder.js';
import { softDot } from './life.js';

const PLATFORM_R = 1.75;

// Junta triángulos sueltos con color por cara en una sola malla de aspecto facetado.
class Soup {
  constructor() { this.pos = []; this.col = []; }
  tri(a, b, c, rgb) {
    this.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let i = 0; i < 3; i++) this.col.push(rgb.r, rgb.g, rgb.b);
  }
  // hornea una geometría de three.js con una matriz; colorOf(centroY, normalY) -> THREE.Color
  geo(g, matrix, colorOf) {
    const n = g.index ? g.toNonIndexed() : g;
    n.applyMatrix4(matrix);
    const a = n.attributes.position.array;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i < a.length; i += 9) {
      A.set(a[i], a[i + 1], a[i + 2]); B.set(a[i + 3], a[i + 4], a[i + 5]); Cc.set(a[i + 6], a[i + 7], a[i + 8]);
      N.subVectors(B, A).cross(new THREE.Vector3().subVectors(Cc, A));
      if (N.lengthSq() < 1e-12) continue;
      N.normalize();
      this.tri(A, B, Cc, colorOf((A.y + B.y + Cc.y) / 3, N.y));
    }
    g.dispose(); if (n !== g) n.dispose();
  }
  mesh(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
    g.computeVertexNormals();
    return new THREE.Mesh(g, material || new THREE.MeshLambertMaterial({ vertexColors: true }));
  }
}

export function buildEnvironment(center) {
  const group = new THREE.Group();
  const rng = mulberry32(4242), fbm = makeNoise(4242);
  const tmp = new THREE.Color();
  const shade = (hex, amt = 0.07) => tmp.setHex(hex).multiplyScalar(1 + (rng() - 0.5) * 2 * amt).clone();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const mat = (x, y, z, sx, sy, sz, ry = 0, rx = 0) => M.compose(new THREE.Vector3(x, y, z), Q.setFromEuler(E.set(rx, ry, 0)), new THREE.Vector3(sx, sy, sz));
  const px = center.x, pz = -0.2; // la plataforma abarca al jugador (en el origen) y al pedestal

  // altura del terreno: llano junto a la plataforma, lomas suaves más lejos
  const ground = (x, z) => {
    const r = Math.hypot(x - px, z - pz);
    return -0.035 + smooth((r - 3.5) / 12) * (fbm(x * 0.09 + 5, z * 0.09 + 9) - 0.42) * 3.2
      + smooth((r - 22) / 40) * (fbm(x * 0.035 + 1, z * 0.035 + 3)) * 9;
  };

  // --- pradera ---
  {
    const s = new Soup();
    const radii = [0, 1.2, 1.9, 2.6, 3.4, 4.4, 5.6, 7, 8.8, 11, 13.5, 16.5, 20, 24, 29, 35, 42, 50, 60, 72, 86, 100];
    const S = 56;
    const P = (k, i) => {
      const a = (i + (k % 2) * 0.5) / S * Math.PI * 2, r = radii[k];
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      return new THREE.Vector3(x, ground(x, z), z);
    };
    const grass = (p) => {
      const v = fbm(p.x * 0.35 + 20, p.z * 0.35 + 7), far = smooth((Math.hypot(p.x, p.z) - 30) / 50);
      const c = tmp.setHex(v > 0.56 ? 0x8cc46a : v > 0.44 ? 0x7dbb62 : 0x6fae5a).clone();
      c.lerp(new THREE.Color(0x5f9a66), far * 0.6);
      return c.multiplyScalar(1 + (rng() - 0.5) * 0.1);
    };
    for (let k = 0; k < radii.length - 1; k++) for (let i = 0; i < S; i++) {
      const a = P(k, i), b = P(k + 1, i), c = P(k + 1, i + 1), d = P(k, i + 1);
      const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
      if (k > 0) s.tri(a, d, b, grass(mid));
      s.tri(b, d, c, grass(mid));
    }
    group.add(s.mesh());
  }

  // --- plataforma de piedra, con el piso exactamente a la altura del suelo real ---
  {
    const s = new Soup();
    const rings = [0, 0.32, 0.66, 1.0, 1.34, 1.62, PLATFORM_R];
    const stones = [0xd9cfbb, 0xcfc4ae, 0xe2d9c7, 0xc7bca6];
    for (let k = 0; k < rings.length - 1; k++) {
      const n = k === 0 ? 8 : 8 + k * 7, r0 = rings[k], r1 = rings[k + 1], off = rng() * 6;
      const rim = k === rings.length - 2;
      for (let i = 0; i < n; i++) {
        const a0 = off + i / n * Math.PI * 2, a1 = off + (i + 1) / n * Math.PI * 2;
        const col = rim ? shade(0xa89f8d, 0.05) : shade(stones[Math.floor(rng() * stones.length)], 0.04);
        const y = 0.0;
        const p = (r, a) => new THREE.Vector3(px + Math.cos(a) * r, y, pz + Math.sin(a) * r);
        s.tri(p(r0, a0), p(r1, a1), p(r1, a0), col);
        if (k > 0) s.tri(p(r0, a0), p(r0, a1), p(r1, a1), col);
      }
    }
    // base bajo las baldosas: tapa las rendijas entre anillos y hace de junta
    s.geo(new THREE.CylinderGeometry(PLATFORM_R - 0.01, PLATFORM_R - 0.01, 0.02, 56), mat(px, -0.0125, pz, 1, 1, 1), () => shade(0xb3a994, 0.03));
    // canto de la plataforma
    s.geo(new THREE.CylinderGeometry(PLATFORM_R, PLATFORM_R + 0.06, 0.06, 56, 1, true), mat(px, -0.03, pz, 1, 1, 1), () => shade(0x9a917f, 0.05));
    group.add(s.mesh());
  }

  // --- faroles alrededor de la plataforma (se encienden de noche) ---
  const lampGlow = new THREE.SpriteMaterial({ map: softDot(), color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const lampCore = new THREE.MeshBasicMaterial({ color: 0x6b5a3a, fog: true });
  {
    const s = new Soup();
    const coreGeo = new THREE.BoxGeometry(0.085, 0.11, 0.085);
    for (const deg of [82, 140, 180, 220, 278]) { // a los costados y detrás, para no estorbar la vista del rompecabezas
      const a = (deg - 90) * Math.PI / 180, x = px + Math.cos(a) * (PLATFORM_R - 0.16), z = pz + Math.sin(a) * (PLATFORM_R - 0.16);
      s.geo(new THREE.CylinderGeometry(0.05, 0.065, 0.06, 8), mat(x, 0.03, z, 1, 1, 1), () => shade(0x4a4f57, 0.05));
      s.geo(new THREE.CylinderGeometry(0.016, 0.02, 1.0, 6), mat(x, 0.56, z, 1, 1, 1), () => shade(0x3b3f46, 0.05));
      s.geo(new THREE.BoxGeometry(0.13, 0.02, 0.13), mat(x, 1.07, z, 1, 1, 1), () => shade(0x3b3f46, 0.05));
      s.geo(new THREE.ConeGeometry(0.11, 0.07, 4), mat(x, 1.235, z, 1, 1, 1, Math.PI / 4), () => shade(0x3b3f46, 0.05));
      const core = new THREE.Mesh(coreGeo, lampCore); core.position.set(x, 1.14, z); group.add(core);
      const glow = new THREE.Sprite(lampGlow); glow.position.set(x, 1.14, z); glow.scale.setScalar(0.75); group.add(glow);
    }
    group.add(s.mesh());
  }

  // --- árboles y rocas ---
  {
    const s = new Soup();
    const greens = [0x3f8a4b, 0x357a43, 0x4a9655, 0x2f6f3d], leaf = [0x6dae4a, 0x7dbb52, 0x5fa243];
    let placed = 0, tries = 0;
    while (placed < 170 && tries++ < 3000) {
      const a = rng() * Math.PI * 2, r = 12 + Math.pow(rng(), 0.8) * 58;
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (fbm(x * 0.07 + 31, z * 0.07 + 13) < 0.47) continue; // bosquecillos con claros
      if (z < 0 && Math.abs(Math.atan2(x - px, -(z - pz))) < 0.5 && r < 46) continue; // el frente queda despejado hacia las montañas
      const y = ground(x, z) - 0.08, h = 2.2 + rng() * 3.4, ry = rng() * 6;
      if (rng() < 0.68) {
        s.geo(new THREE.CylinderGeometry(h * 0.035, h * 0.05, h * 0.3, 5, 1, true), mat(x, y + h * 0.15, z, 1, 1, 1), () => shade(0x6e4a2c, 0.06));
        const g = greens[Math.floor(rng() * greens.length)];
        for (let j = 0; j < 3; j++) {
          s.geo(new THREE.ConeGeometry(h * (0.3 - j * 0.07), h * 0.42, 6), mat(x, y + h * (0.42 + j * 0.24), z, 1, 1, 1, ry + j), () => shade(g, 0.1));
        }
      } else {
        s.geo(new THREE.CylinderGeometry(h * 0.04, h * 0.055, h * 0.45, 5, 1, true), mat(x, y + h * 0.22, z, 1, 1, 1), () => shade(0x6e4a2c, 0.06));
        const g = leaf[Math.floor(rng() * leaf.length)];
        s.geo(new THREE.IcosahedronGeometry(h * 0.3, 0), mat(x, y + h * 0.62, z, 1, 0.9, 1, ry, rng() * 3), () => shade(g, 0.11));
        s.geo(new THREE.IcosahedronGeometry(h * 0.2, 0), mat(x + h * 0.16, y + h * 0.8, z + h * 0.08, 1, 1, 1, ry, rng() * 3), () => shade(g, 0.11));
      }
      placed++;
    }
    for (let i = 0; i < 46; i++) {
      const a = rng() * Math.PI * 2, r = 4.5 + rng() * 34, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r, sz = 0.12 + rng() * 0.5;
      s.geo(new THREE.IcosahedronGeometry(sz, 0), mat(x, ground(x, z) + sz * 0.15, z, 1.2, 0.7, 1, rng() * 6, rng() * 3), () => shade(0x8d8a86, 0.1));
    }
    // matas de flores cerca de la plataforma
    const petals = [0xf2c14e, 0xf7f3e8, 0xe58fb1, 0xd2553f];
    for (let i = 0; i < 160; i++) {
      const a = rng() * Math.PI * 2, r = PLATFORM_R + 0.25 + rng() * 7, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      const c = petals[Math.floor(rng() * petals.length)];
      s.geo(new THREE.IcosahedronGeometry(0.018 + rng() * 0.018, 0), mat(x, ground(x, z) + 0.03, z, 1, 0.6, 1, rng() * 6), () => shade(c, 0.06));
    }
    group.add(s.mesh());
  }

  // --- montañas en el horizonte ---
  {
    const s = new Soup();
    for (let i = 0; i < 30; i++) {
      const a = (i + rng() * 0.7) / 30 * Math.PI * 2, r = 82 + rng() * 34;
      const h = 22 + rng() * 34, w = 20 + rng() * 16, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      const g = new THREE.ConeGeometry(w, h, 7, 3);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) { // peñascos irregulares (misma deformación para vértices coincidentes)
        const k = 1 + (fbm(p.getX(v) * 0.21 + i * 3, p.getZ(v) * 0.21 + p.getY(v) * 0.13) - 0.5) * 0.55;
        p.setXYZ(v, p.getX(v) * k, p.getY(v), p.getZ(v) * k);
      }
      const snow = h > 34 ? 0.24 + rng() * 0.12 : 2;
      s.geo(g, mat(x, h / 2 - 3, z, 1, 1, 1, rng() * 6), (cy) => {
        const t = (cy + 3) / h;
        return t > 1 - snow ? shade(0xf1f5f8, 0.03) : t > 0.4 ? shade(0x8e96a6, 0.06) : shade(0x6f8f78, 0.06);
      });
    }
    group.add(s.mesh());
  }

  // --- nubes que giran muy despacio ---
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }); // de día se aclaran por debajo
  {
    const s = new Soup();
    for (let i = 0; i < 18; i++) {
      const a = rng() * Math.PI * 2, r = 75 + rng() * 70, y = 30 + rng() * 26, sc = 5 + rng() * 6; // lejos y altas: adornan el horizonte sin pesar sobre la cabeza
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r, n = 4 + Math.floor(rng() * 3);
      for (let j = 0; j < n; j++) {
        const k = 0.55 + rng() * 0.6;
        s.geo(new THREE.IcosahedronGeometry(sc * k, 0),
          mat(cx + (j - n / 2) * sc * 0.85 + rng() * sc * 0.3, y + (rng() - 0.4) * sc * 0.35, cz + (rng() - 0.5) * sc, 1.25, 0.62, 1, rng() * 6, rng() * 3),
          (cy, ny) => tmp.setHex(0xffffff).multiplyScalar(ny < -0.3 ? 0.94 : 1).clone());
      }
    }
    clouds.add(s.mesh(cloudMat));
    clouds.position.set(px, 0, pz);
    group.add(clouds);
  }

  // --- estrellas, sol y luna ---
  const stars = (() => {
    const N = 520, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = rng() * Math.PI * 2, v = Math.acos(rng() * 0.96), R = 190;
      pos.set([Math.sin(v) * Math.cos(u) * R, Math.cos(v) * R + 2, Math.sin(v) * Math.sin(u) * R], i * 3);
      const b = 0.45 + rng() * 0.55, warm = rng();
      col.set([b, b * (0.92 + warm * 0.08), b * (0.85 + (1 - warm) * 0.15)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.3, map: softDot(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    group.add(pts);
    return pts;
  })();
  const disc = (radius, color) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), new THREE.MeshBasicMaterial({ color, fog: false, depthWrite: false, transparent: true }));
    m.renderOrder = -5;
    group.add(m);
    return m;
  };
  const sunDisc = disc(9, 0xfff3c4), sunHalo = disc(20, 0xfff0b0), moonDisc = disc(6.5, 0xe9eef7);
  sunHalo.material.opacity = 0.18; sunHalo.material.blending = THREE.AdditiveBlending;

  // --- luciérnagas alrededor de la plataforma ---
  const flies = (() => {
    const N = 46, base = [], pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = rng() * Math.PI * 2, r = PLATFORM_R + 0.4 + rng() * 6;
      base.push([px + Math.cos(a) * r, 0.25 + rng() * 1.5, pz + Math.sin(a) * r, rng() * 50]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.05, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    group.add(pts);
    return { pts, base, pos, col, N };
  })();

  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(), lightDir = new THREE.Vector3();
  return {
    group,
    // phase: 0 mediodía … 0.5 medianoche; night: 0..1; light: la luz direccional de la escena
    update(dt, t, phase, night, light) {
      const a = phase * Math.PI * 2;
      sunDir.set(Math.sin(a) * 0.9, Math.cos(a), -0.38).normalize();
      moonDir.set(-Math.sin(a) * 0.9, -Math.cos(a), -0.38).normalize();
      for (const [m, d, R] of [[sunDisc, sunDir, 170], [sunHalo, sunDir, 171], [moonDisc, moonDir, 170]]) {
        m.position.copy(d).multiplyScalar(R); m.lookAt(0, 0, 0);
        m.visible = d.y > -0.12;
      }
      sunHalo.material.opacity = 0.2 * (1 - night);
      moonDisc.material.opacity = THREE.MathUtils.clamp(night * 1.6, 0, 1);
      stars.material.opacity = night * 0.95;
      stars.rotation.y = t * 0.004;
      clouds.rotation.y = t * 0.0035;
      cloudMat.emissive.setScalar(0.2 * (1 - night));
      lampGlow.opacity = night * 0.8 * (0.92 + 0.08 * Math.sin(t * 5.3));
      lampCore.color.setHex(0x6b5a3a).lerp(tmp.setHex(0xffe9a8), night);
      lightFromPhase(phase, light);
      // luciérnagas
      flies.pts.visible = night > 0.03;
      if (flies.pts.visible) {
        for (let i = 0; i < flies.N; i++) {
          const b = flies.base[i], ph = b[3];
          flies.pos[i * 3] = b[0] + Math.sin(t * 0.4 + ph) * 0.5;
          flies.pos[i * 3 + 1] = b[1] + Math.sin(t * 0.7 + ph * 2) * 0.25;
          flies.pos[i * 3 + 2] = b[2] + Math.cos(t * 0.33 + ph * 3) * 0.5;
          const v = night * (0.3 + 0.7 * Math.max(0, Math.sin(t * 1.2 + ph)));
          flies.col[i * 3] = 0.85 * v; flies.col[i * 3 + 1] = v; flies.col[i * 3 + 2] = 0.35 * v;
        }
        flies.pts.geometry.attributes.position.needsUpdate = true;
        flies.pts.geometry.attributes.color.needsUpdate = true;
      }
    },
  };
}
const tmp3 = new THREE.Vector3();

// Dirección de la luz principal: del sol de día y de la luna de noche, nunca desde debajo del horizonte.
const sunV = new THREE.Vector3(), moonV = new THREE.Vector3(), mixV = new THREE.Vector3();
export function lightFromPhase(phase, light) {
  const a = phase * Math.PI * 2;
  sunV.set(Math.sin(a) * 0.9, Math.cos(a), -0.38).normalize();
  moonV.set(-Math.sin(a) * 0.9, -Math.cos(a), -0.38).normalize();
  const w = THREE.MathUtils.smoothstep(Math.cos(a), -0.3, 0.05);
  mixV.copy(moonV).setY(Math.max(moonV.y, 0.3)).normalize().lerp(sunV.setY(Math.max(sunV.y, 0.3)).normalize(), w).normalize();
  light.position.copy(mixV).multiplyScalar(6);
}

// Entorno sencillo (el predeterminado): sin geometría alrededor, solo un suelo suave bajo los pies.
// El cielo dibuja un paisaje desenfocado (ver SKY_SHADER), así el fondo no compite con el modelo
// y el visor gasta sus recursos en el rompecabezas.
export function buildSimpleEnvironment(center) {
  const group = new THREE.Group();
  const floorMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uColor: { value: new THREE.Color(0x7fa98a) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    // disco que se funde con el fondo hacia los bordes
    fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.15, r) * 0.9; gl_FragColor = vec4(uColor * (1.0 - 0.12 * r), a); }',
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(center.x, 0, -0.2);
  floor.renderOrder = -4;
  group.add(floor);
  return {
    group,
    update(dt, t, phase, night, light, ground) {
      floorMat.uniforms.uColor.value.copy(ground).multiplyScalar(0.92);
      lightFromPhase(phase, light);
    },
  };
}

// Cielo con degradé; con uSoft = 1 suma un horizonte de colinas desenfocadas (bordes muy suaves).
export const SKY_SHADER = {
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform vec3 uA; uniform vec3 uB; uniform vec3 uG; uniform float uSoft;
    varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 col = mix(uA, uB, smoothstep(-0.02, 0.7, h));
      if (uSoft > 0.0) {
        float az = atan(d.z, d.x);
        // colinas bajas y muy difusas: sugieren un paisaje lejano sin dibujar nada concreto
        float far = 0.035 + 0.025 * sin(az * 2.0 + 4.0) + 0.012 * sin(az * 5.0 + 1.0);
        float near = 0.004 + 0.018 * sin(az * 3.0 + 1.3) + 0.01 * sin(az * 7.0 + 0.4);
        float landFar = smoothstep(far + 0.07, far - 0.05, h);
        float landNear = smoothstep(near + 0.06, near - 0.07, h);
        col = mix(col, mix(uG, uA, 0.62), landFar * uSoft * 0.7);
        col = mix(col, mix(uG, uA, 0.22), landNear * uSoft);
        col = mix(col, uG * 0.9, smoothstep(-0.03, -0.55, h) * uSoft); // suelo lejano
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};
