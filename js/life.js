// La "capa viva" de un diorama: pequeños efectos que se encienden a medida que se arma.
// Cada efecto está anclado a un punto del modelo y cuelga de la pieza que contiene ese punto;
// se activa cuando esa pieza ya está unida a otra, y se apaga suavemente si no.
//
// Tipos de efecto (features del modelo):
//   beam     haz giratorio + linterna (faro), de noche
//   window   ventana iluminada, de noche
//   smoke    humo de chimenea
//   sparkle  destello sobre el agua, de día
//   firefly  luciérnaga, de noche
//   gulls    gaviotas dando vueltas, de día
//   brooms   personas volando en escoba alrededor del modelo, día y noche
//   city     luces de ciudad, de noche
//   cloud    nube que deriva despacio
//   flame    llama de quemador, que de noche ilumina desde dentro
import * as THREE from './vendor/three.module.js';

// Nubes de puntos luminosos: destellos del agua (día), luciérnagas y luces de ciudad (noche).
const TWINKLE = {
  sparkle: { size: 0.7, color: [1, 1, 1], day: true },
  firefly: { size: 0.3, color: [0.85, 1, 0.35], day: false },
  city: { size: 1, color: [1, 0.78, 0.4], day: false },
};

// punto redondo y difuso para que los destellos no se vean como cuadraditos de cerca
let dotTex = null;
export function softDot() {
  if (dotTex) return dotTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(cv);
  return dotTex;
}

const glowMat = (color) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
});

// Los efectos son solo decorado: no deben interceptar el rayo con el que se agarran las piezas.
const noRay = (obj) => { obj.traverse((o) => { o.raycast = () => {}; }); return obj; };

// hostOf(pos) -> { object: Object3D en espacio del modelo, active: () => boolean }
export function buildLife(features, hostOf) {
  const effects = [];
  const twinkles = new Map(); // host.object -> { host, sparkle: [], firefly: [] }

  for (const f of features) {
    const host = hostOf(f.pos);
    if (!host) continue;
    const P = new THREE.Vector3(...f.pos);

    if (f.type === 'beam') {
      const root = new THREE.Group(); root.position.copy(P);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(f.size * 0.75, 12, 8), glowMat(0xffe9a0));
      const L = f.size * 14;
      const cone = new THREE.ConeGeometry(f.size * 2.6, L, 16, 1, true);
      cone.translate(0, -L / 2, 0); cone.rotateZ(Math.PI / 2); // vértice en el origen, abre hacia +X
      const mat = glowMat(0xfff0b0);
      const b1 = new THREE.Mesh(cone, mat), b2 = new THREE.Mesh(cone, mat);
      b2.rotation.y = Math.PI;
      const spin = new THREE.Group(); spin.add(b1, b2);
      root.add(lamp, spin);
      host.object.add(noRay(root));
      effects.push({ host, a: 0, update(dt, t, night) {
        spin.rotation.y = t * 0.9;
        lamp.material.opacity = this.a * (0.25 + 0.75 * night);
        mat.opacity = this.a * night * 0.11;
        root.visible = this.a > 0.01;
      }, dispose() { host.object.remove(root); lamp.geometry.dispose(); lamp.material.dispose(); cone.dispose(); mat.dispose(); } });
    }

    else if (f.type === 'window') {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.h), glowMat(0xffc860));
      m.position.copy(P); m.rotation.y = f.yaw;
      host.object.add(noRay(m));
      const ph = Math.random() * 10;
      effects.push({ host, a: 0, update(dt, t, night) {
        m.material.opacity = this.a * night * (0.85 + 0.15 * Math.sin(t * 7 + ph) * Math.sin(t * 2.3 + ph));
        m.visible = m.material.opacity > 0.01;
      }, dispose() { host.object.remove(m); m.geometry.dispose(); m.material.dispose(); } });
    }

    else if (f.type === 'smoke') {
      const root = new THREE.Group(); root.position.copy(P);
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const mat = new THREE.MeshLambertMaterial({ color: f.color || 0xe8e8ea, transparent: true, opacity: 0.75, depthWrite: false });
      const puffs = [];
      for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(geo, mat); p.userData.life = i / 6; root.add(p); puffs.push(p); }
      host.object.add(noRay(root));
      effects.push({ host, a: 0, update(dt, t) {
        root.visible = this.a > 0.01;
        for (const p of puffs) {
          p.userData.life = (p.userData.life + dt * 0.22) % 1;
          const l = p.userData.life;
          p.position.set(Math.sin(l * 5 + t * 0.5) * f.size * 1.2 * l, l * f.size * 9, l * l * f.size * 5);
          p.scale.setScalar(f.size * (0.35 + 1.4 * l) * Math.sin(Math.PI * Math.min(1, l * 1.05)) * this.a + 1e-6);
        }
      }, dispose() { host.object.remove(root); geo.dispose(); mat.dispose(); } });
    }

    else if (f.type === 'gulls') {
      // Gaviotas: cuerpo, cabeza, pico, cola y alas de dos tramos que baten y planean.
      const root = new THREE.Group(); root.position.copy(P);
      const u = f.size * 0.03; // unidad: medio ancho del cuerpo
      const white = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true });
      const grey = new THREE.MeshLambertMaterial({ color: 0x8e99a6, transparent: true });
      const dark = new THREE.MeshLambertMaterial({ color: 0x3a4048, transparent: true });
      const beakM = new THREE.MeshLambertMaterial({ color: 0xf2a23a, transparent: true });
      const mats = [white, grey, dark, beakM];
      const gBody = new THREE.SphereGeometry(1, 8, 6); gBody.scale(u * 0.55, u * 0.5, u * 1.7);
      const gHead = new THREE.SphereGeometry(u * 0.42, 7, 5);
      const gBeak = new THREE.ConeGeometry(u * 0.16, u * 0.6, 5); gBeak.rotateX(Math.PI / 2);
      const gTail = new THREE.BufferGeometry();
      gTail.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -u * 1.2, u * 0.55, 0, -u * 2.3, -u * 0.55, 0, -u * 2.3]), 3));
      gTail.computeVertexNormals();
      // ala: tramo interior (del cuerpo al codo) y exterior (del codo a la punta, más fina)
      const quad = (x0, x1, w0, w1, sweep) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
          x0, 0, w0, x1, 0, w1 - sweep, x1, 0, -w1 * 0.4 - sweep,
          x0, 0, w0, x1, 0, -w1 * 0.4 - sweep, x0, 0, -w0 * 0.7,
        ]), 3));
        g.computeVertexNormals();
        return g;
      };
      const L1 = u * 2.0, L2 = u * 2.4;
      const gIn = quad(0, L1, u * 0.75, u * 0.6, u * 0.1), gOut = quad(0, L2 * 0.72, u * 0.6, u * 0.32, u * 0.5);
      const gTip = quad(L2 * 0.72, L2, u * 0.32, u * 0.04, u * 0.9);
      gTip.translate(0, 0, -u * 0.5); // punta oscura, continúa el tramo exterior
      const geos = [gBody, gHead, gBeak, gTail, gIn, gOut, gTip];
      const birds = [];
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Group();
        const head = new THREE.Mesh(gHead, white); head.position.set(0, u * 0.25, u * 1.75);
        const beak = new THREE.Mesh(gBeak, beakM); beak.position.set(0, u * 0.2, u * 2.35);
        b.add(new THREE.Mesh(gBody, white), head, beak, new THREE.Mesh(gTail, grey));
        const wings = [];
        for (const side of [1, -1]) {
          const inner = new THREE.Group(); inner.position.set(side * u * 0.3, u * 0.2, u * 0.2); inner.scale.x = side;
          const outer = new THREE.Group(); outer.position.x = L1;
          for (const m of [new THREE.Mesh(gOut, grey), new THREE.Mesh(gTip, dark)]) { m.material.side = THREE.DoubleSide; outer.add(m); }
          const inMesh = new THREE.Mesh(gIn, grey);
          inner.add(inMesh, outer); b.add(inner);
          wings.push({ inner, outer, side });
        }
        root.add(b);
        birds.push({ b, wings, ph: i * 2.1, rad: f.size * (0.7 + 0.25 * i), sp: 0.5 - 0.09 * i, y: i * f.size * 0.18 });
      }
      host.object.add(noRay(root));
      effects.push({ host, a: 0, update(dt, t, night) {
        const vis = this.a * (1 - night);
        for (const m of mats) m.opacity = vis;
        root.visible = vis > 0.02;
        if (!root.visible) return;
        for (const g of birds) {
          const ang = t * g.sp + g.ph;
          g.b.position.set(Math.cos(ang) * g.rad, g.y + Math.sin(t * 0.7 + g.ph) * f.size * 0.08, Math.sin(ang) * g.rad);
          g.b.rotation.set(0, -ang, 0.3, 'YXZ'); // de frente al sentido del vuelo, inclinada hacia el giro
          // aletea un rato y luego planea con las alas en "M"
          const effort = THREE.MathUtils.smoothstep(Math.sin(t * 0.45 + g.ph * 1.7), -0.2, 0.5);
          const beat = Math.sin(t * 9 + g.ph);
          for (const w of g.wings) {
            w.inner.rotation.z = w.side * (0.22 + beat * 0.5 * effort); // el ala izquierda está espejada
            w.outer.rotation.z = -0.45 + Math.sin(t * 9 + g.ph - 0.9) * 0.55 * effort;
          }
        }
      }, dispose() { host.object.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); } });
    }

    else if (f.type === 'brooms') {
      // Personas volando en escoba con modelado detallado, gafas de vuelo, estribos y capa plisada naranja oscuro.
      const root = new THREE.Group(); root.position.copy(P);
      const u = (f.w || f.size * 0.1) * 0.22;
      const count = f.count || 3;
      const spd = f.speed || 1;

      const woodM = new THREE.MeshLambertMaterial({ color: 0x59351c, transparent: true });
      const darkWoodM = new THREE.MeshLambertMaterial({ color: 0x3b2211, transparent: true });
      const brushLightM = new THREE.MeshLambertMaterial({ color: 0x8c5e32, transparent: true });
      const brushDarkM = new THREE.MeshLambertMaterial({ color: 0x5b3a1c, transparent: true });
      const brassM = new THREE.MeshLambertMaterial({ color: 0xd4a642, transparent: true });
      const robeM = new THREE.MeshLambertMaterial({ color: 0x1b1f28, transparent: true });
      const coatFlapM = new THREE.MeshLambertMaterial({ color: 0x1e232e, transparent: true, side: THREE.DoubleSide });
      const leatherM = new THREE.MeshLambertMaterial({ color: 0x362214, transparent: true });
      const skinM = new THREE.MeshLambertMaterial({ color: 0xedc49d, transparent: true });
      const hairM = new THREE.MeshLambertMaterial({ color: 0x2e1d12, transparent: true });
      const lensM = new THREE.MeshLambertMaterial({ color: 0x7fc8d6, transparent: true });
      const hatM = new THREE.MeshLambertMaterial({ color: 0x141720, transparent: true });
      const capeM = new THREE.MeshLambertMaterial({ color: 0xb84a18, transparent: true, side: THREE.DoubleSide });
      const mats = [woodM, darkWoodM, brushLightM, brushDarkM, brassM, robeM, coatFlapM, leatherM, skinM, hairM, lensM, hatM, capeM];

      const geos = [];
      const reg = (g) => { geos.push(g); return g; };
      const UP = new THREE.Vector3(0, 1, 0);
      const makeSeg = (ax, ay, az, bx, by, bz, r0, r1, segs = 7) => {
        const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
        const dir = b.clone().sub(a), len = dir.length();
        const g = new THREE.CylinderGeometry(r1, r0, len, segs);
        dir.normalize();
        if (dir.y < -0.9999) g.rotateX(Math.PI);
        else g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
        const mid = a.add(b).multiplyScalar(0.5);
        g.translate(mid.x, mid.y, mid.z);
        return reg(g);
      };

      const makePleatedCape = (z0, z1, w0, w1, arch0, arch1, notch = 0) => {
        const xs = [-1, -0.64, -0.28, 0, 0.28, 0.64, 1];
        const pleats = [0.06, -0.05, 0.05, 0.08, 0.05, -0.05, 0.06];
        const pos = [];
        for (let s = 0; s < xs.length - 1; s++) {
          const tA = xs[s], tB = xs[s + 1];
          const fA = pleats[s], fB = pleats[s + 1];
          const p = (t, w, arch, pl, zEnd) => [
            t * w,
            arch * (1 - t * t * 0.72) + pl * u,
            zEnd,
          ];
          const z1A = z1 + (Math.abs(tA) < 0.35 ? notch : 0);
          const z1B = z1 + (Math.abs(tB) < 0.35 ? notch : 0);
          const a0 = p(tA, w0, arch0, fA * 0.4, z0);
          const b0 = p(tB, w0, arch0, fB * 0.4, z0);
          const a1 = p(tA, w1, arch1, fA, z1A);
          const b1 = p(tB, w1, arch1, fB, z1B);
          pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
        g.computeVertexNormals();
        return reg(g);
      };

      // Geometría compartida de la escoba de carreras (mango curvo en S + pomo + virolas + estribos + haces de ramas)
      const broomParts = [
        [makeSeg(0, u * 0.14, -u * 4.3, 0, u * 0.05, -u * 2.5, u * 0.14, u * 0.13, 8), woodM],
        [makeSeg(0, u * 0.05, -u * 2.5, 0, -u * 0.08, -u * 0.5, u * 0.13, u * 0.16, 8), woodM],
        [makeSeg(0, -u * 0.08, -u * 0.5, 0, u * 0.10, u * 1.4, u * 0.16, u * 0.15, 8), woodM],
        [makeSeg(0, u * 0.10, u * 1.4, 0, u * 0.38, u * 3.1, u * 0.15, u * 0.13, 8), woodM],
        [makeSeg(0, u * 0.38, u * 3.1, 0, u * 0.60, u * 4.35, u * 0.13, u * 0.09, 8), woodM],
        [reg(new THREE.SphereGeometry(u * 0.12, 8, 6)).translate(0, u * 0.62, u * 4.42), darkWoodM],
        [reg(new THREE.CylinderGeometry(u * 0.15, u * 0.15, u * 0.22, 8)).rotateX(Math.PI / 2 - 0.16).translate(0, u * 0.38, u * 3.1), brassM],
        // Virolas y anillos metálicos sujetando el cepillo
        [reg(new THREE.CylinderGeometry(u * 0.24, u * 0.26, u * 0.38, 10)).rotateX(Math.PI / 2).translate(0, u * 0.06, -u * 2.65), brassM],
        [reg(new THREE.TorusGeometry(u * 0.29, u * 0.045, 6, 12)).translate(0, u * 0.07, -u * 3.05), brassM],
        [reg(new THREE.TorusGeometry(u * 0.36, u * 0.045, 6, 12)).translate(0, u * 0.08, -u * 3.42), brassM],
        // Núcleo del cepillo de ramas
        [reg(new THREE.CylinderGeometry(u * 0.22, u * 0.62, u * 3.1, 10)).rotateX(Math.PI / 2).translate(0, u * 0.09, -u * 4.35), brushDarkM],
        // Anillo soporte de los estribos
        [reg(new THREE.CylinderGeometry(u * 0.19, u * 0.19, u * 0.22, 8)).rotateX(Math.PI / 2).translate(0, -u * 0.06, u * 0.05), brassM],
      ];

      // 8 haces individuales de ramas cónicas alrededor de la cola de la escoba
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const flare = k % 2 === 0 ? 0.68 : 0.48;
        const lenTail = k % 2 === 0 ? 5.95 : 5.55;
        const sx = Math.cos(a) * u * 0.20, sy = u * 0.08 + Math.sin(a) * u * 0.18;
        const ex = Math.cos(a) * u * flare, ey = u * 0.10 + Math.sin(a) * u * flare;
        broomParts.push([
          makeSeg(sx, sy, -u * 2.85, ex, ey, -u * lenTail, u * 0.16, u * 0.04, 5),
          k % 2 === 0 ? brushLightM : brushDarkM,
        ]);
      }

      // Estribos laterales (correas + pedales metálicos)
      for (const side of [-1, 1]) {
        broomParts.push(
          [makeSeg(side * u * 0.14, -u * 0.08, u * 0.05, side * u * 0.44, -u * 0.80, u * 0.22, u * 0.045, u * 0.04, 5), leatherM],
          [makeSeg(side * u * 0.30, -u * 0.81, u * 0.22, side * u * 0.58, -u * 0.81, u * 0.22, u * 0.045, u * 0.045, 5), brassM],
        );
      }

      // Anatomía y vestimenta del volador (pose aerodinámica inclinada hacia adelante)
      const bodyParts = [
        // Pelvis y cintura + cinturón de cuero con hebilla dorada
        [makeSeg(0, u * 0.34, -u * 0.35, 0, u * 0.88, u * 0.25, u * 0.48, u * 0.46, 8), robeM],
        [makeSeg(0, u * 0.56, -u * 0.10, 0, u * 0.68, u * 0.03, u * 0.49, u * 0.49, 10), leatherM],
        [reg(new THREE.BoxGeometry(u * 0.24, u * 0.20, u * 0.14)).translate(0, u * 0.72, u * 0.36), brassM],
        // Pecho y hombros redondeados
        [makeSeg(0, u * 0.84, u * 0.20, 0, u * 1.42, u * 0.92, u * 0.48, u * 0.58, 9), robeM],
        [reg(new THREE.SphereGeometry(u * 0.30, 8, 6)).translate(u * 0.54, u * 1.38, u * 0.88), robeM],
        [reg(new THREE.SphereGeometry(u * 0.30, 8, 6)).translate(-u * 0.54, u * 1.38, u * 0.88), robeM],
        // Faldones de la túnica abriéndose a ambos lados tras la cadera
        [makeSeg(u * 0.30, u * 0.42, -u * 0.30, u * 0.54, u * 0.28, -u * 1.45, u * 0.32, u * 0.18, 5), coatFlapM],
        [makeSeg(-u * 0.30, u * 0.42, -u * 0.30, -u * 0.54, u * 0.28, -u * 1.45, u * 0.32, u * 0.18, 5), coatFlapM],
        // Bufanda naranja oscuro enrollada al cuello + extremo ondeando atrás + broches dorados de capa
        [reg(new THREE.TorusGeometry(u * 0.46, u * 0.14, 7, 12)).rotateX(Math.PI / 2 - 0.55).translate(0, u * 1.54, u * 1.04), capeM],
        [makeSeg(u * 0.28, u * 1.50, u * 0.84, u * 0.42, u * 1.62, -u * 0.55, u * 0.18, u * 0.10, 5), capeM],
        [reg(new THREE.SphereGeometry(u * 0.11, 7, 5)).translate(u * 0.42, u * 1.48, u * 0.96), brassM],
        [reg(new THREE.SphereGeometry(u * 0.11, 7, 5)).translate(-u * 0.42, u * 1.48, u * 0.96), brassM],
        // Cuello, cabeza y mechones de cabello al viento
        [makeSeg(0, u * 1.46, u * 0.94, 0, u * 1.82, u * 1.24, u * 0.26, u * 0.24, 7), skinM],
        [reg(new THREE.SphereGeometry(u * 0.49, 10, 8)).translate(0, u * 2.04, u * 1.38), skinM],
        [reg(new THREE.SphereGeometry(u * 0.46, 8, 6)).translate(0, u * 2.12, u * 1.22), hairM],
        [makeSeg(u * 0.24, u * 1.98, u * 1.06, u * 0.38, u * 2.02, u * 0.42, u * 0.15, u * 0.04, 5), hairM],
        [makeSeg(-u * 0.24, u * 1.98, u * 1.06, -u * 0.38, u * 2.02, u * 0.42, u * 0.15, u * 0.04, 5), hairM],
        [makeSeg(0, u * 2.06, u * 0.96, 0, u * 2.12, u * 0.30, u * 0.18, u * 0.05, 5), hairM],
        // Correa de cuero + gafas de vuelo con marco dorado y lentes cian
        [reg(new THREE.CylinderGeometry(u * 0.50, u * 0.50, u * 0.14, 12)).rotateX(-0.20).translate(0, u * 2.07, u * 1.38), leatherM],
        [reg(new THREE.TorusGeometry(u * 0.14, u * 0.04, 6, 10)).translate(u * 0.19, u * 2.05, u * 1.82), brassM],
        [reg(new THREE.TorusGeometry(u * 0.14, u * 0.04, 6, 10)).translate(-u * 0.19, u * 2.05, u * 1.82), brassM],
        [reg(new THREE.SphereGeometry(u * 0.12, 8, 6)).scale(1, 1, 0.55).translate(u * 0.19, u * 2.05, u * 1.83), lensM],
        [reg(new THREE.SphereGeometry(u * 0.12, 8, 6)).scale(1, 1, 0.55).translate(-u * 0.19, u * 2.05, u * 1.83), lensM],
        // Sombrero de mago con ala ancha, cinta naranja oscuro y punta arqueada hacia atrás
        [reg(new THREE.CylinderGeometry(u * 1.04, u * 1.10, u * 0.10, 14)).rotateX(-0.28).translate(0, u * 2.38, u * 1.34), hatM],
        [reg(new THREE.CylinderGeometry(u * 0.52, u * 0.56, u * 0.16, 12)).rotateX(-0.28).translate(0, u * 2.48, u * 1.32), capeM],
        [makeSeg(0, u * 2.42, u * 1.32, 0, u * 3.35, u * 0.92, u * 0.54, u * 0.24, 10), hatM],
        [makeSeg(0, u * 3.35, u * 0.92, 0, u * 3.82, u * 0.22, u * 0.24, u * 0.03, 8), hatM],
      ];

      // Brazos articulados (hombro -> codo -> antebrazo -> guante agarrando el mango con manos alternadas)
      const handTargets = [
        { side: 1, hx: u * 0.11, hy: u * 0.26, hz: u * 2.05 },
        { side: -1, hx: -u * 0.11, hy: u * 0.18, hz: u * 1.55 },
      ];
      for (const h of handTargets) {
        const sx = h.side * u * 0.54, sy = u * 1.38, sz = u * 0.88;
        const ex = h.side * u * 0.58, ey = u * 0.78, ez = u * 1.24;
        bodyParts.push(
          [makeSeg(sx, sy, sz, ex, ey, ez, u * 0.20, u * 0.16, 6), robeM],
          [reg(new THREE.SphereGeometry(u * 0.16, 6, 5)).translate(ex, ey, ez), robeM],
          [makeSeg(ex, ey, ez, h.hx, h.hy, h.hz, u * 0.16, u * 0.13, 6), robeM],
          [reg(new THREE.SphereGeometry(u * 0.16, 7, 5)).translate(h.hx, h.hy, h.hz), leatherM],
        );
      }

      // Piernas articuladas (cadera -> rodilla flexionada -> espinilla -> bota apoyada en el estribo)
      for (const side of [-1, 1]) {
        const kx = side * u * 0.54, ky = -u * 0.18, kz = u * 0.42;
        const ax = side * u * 0.44, ay = -u * 0.74, az = u * 0.20;
        bodyParts.push(
          [makeSeg(side * u * 0.34, u * 0.34, -u * 0.28, kx, ky, kz, u * 0.24, u * 0.20, 6), robeM],
          [reg(new THREE.SphereGeometry(u * 0.20, 7, 5)).translate(kx, ky, kz), robeM],
          [makeSeg(kx, ky, kz, ax, ay, az, u * 0.19, u * 0.15, 6), leatherM],
          [makeSeg(ax, ay - u * 0.05, az, ax, ay - u * 0.10, az + u * 0.36, u * 0.15, u * 0.11, 6), leatherM],
        );
      }

      // Capa plisada en 3 tramos articulados color naranja oscuro (0xb84a18)
      const gCape1 = makePleatedCape(0, -u * 2.1, u * 0.56, u * 0.88, u * 0.14, u * 0.18);
      const gCape2 = makePleatedCape(0, -u * 2.2, u * 0.88, u * 1.16, u * 0.18, u * 0.22);
      const gCape3 = makePleatedCape(0, -u * 2.2, u * 1.16, u * 1.38, u * 0.22, u * 0.14, u * 0.42);
      const gGlowFront = reg(new THREE.SphereGeometry(u * 0.42, 8, 6));
      const gGlowTail = reg(new THREE.SphereGeometry(u * 0.30, 7, 5));

      const glowMats = [];
      const riders = [];

      for (let i = 0; i < count; i++) {
        const b = new THREE.Group();
        for (const [g, m] of broomParts) b.add(new THREE.Mesh(g, m));
        for (const [g, m] of bodyParts) b.add(new THREE.Mesh(g, m));

        const cape1 = new THREE.Group(); cape1.position.set(0, u * 1.50, u * 0.72);
        const cape2 = new THREE.Group(); cape2.position.set(0, 0, -u * 2.1);
        const cape3 = new THREE.Group(); cape3.position.set(0, 0, -u * 2.2);
        cape3.add(new THREE.Mesh(gCape3, capeM));
        cape2.add(new THREE.Mesh(gCape2, capeM), cape3);
        cape1.add(new THREE.Mesh(gCape1, capeM), cape2);
        b.add(cape1);

        const gmFront = glowMat(0xffe08a);
        const gmTail = glowMat(0xff9438);
        glowMats.push(gmFront, gmTail);
        const glowFront = new THREE.Mesh(gGlowFront, gmFront);
        glowFront.position.set(0, u * 0.65, u * 4.65);
        const glowTail = new THREE.Mesh(gGlowTail, gmTail);
        glowTail.position.set(0, u * 0.10, -u * 5.85);
        b.add(glowFront, glowTail);

        root.add(b);
        const dir = spd >= 0 ? 1 : -1;
        riders.push({
          b, cape1, cape2, cape3, gmFront, gmTail, dir,
          ph: (i / count) * Math.PI * 2,
          rx: f.size * (1.14 + 0.08 * (i % 3)),
          rz: f.size * (0.76 + 0.06 * (i % 3)),
          sp: (0.42 - 0.035 * i) * spd,
          y: (i - (count - 1) * 0.5) * f.size * 0.09,
          ampY: f.size * 0.055,
        });
      }

      host.object.add(noRay(root));
      effects.push({ host, a: 0, update(dt, t, night) {
        for (const m of mats) m.opacity = this.a;
        root.visible = this.a > 0.02;
        if (!root.visible) return;
        for (const g of riders) {
          const ang = t * g.sp + g.ph;
          const x = Math.cos(ang) * g.rx, z = Math.sin(ang) * g.rz;
          const y = g.y + Math.sin(ang * 2 + g.ph) * g.ampY;
          g.b.position.set(x, y, z);

          const vx = -Math.sin(ang) * g.rx * g.dir;
          const vz = Math.cos(ang) * g.rz * g.dir;
          const vy = 2 * Math.cos(ang * 2 + g.ph) * g.ampY * g.dir;
          const yaw = Math.atan2(vx, vz);
          const pitch = -Math.atan2(vy, Math.hypot(vx, vz));
          const roll = 0.28 * g.dir + Math.sin(t * 1.9 + g.ph) * 0.08;
          g.b.rotation.set(pitch, yaw, roll, 'YXZ');

          const w1 = Math.sin(t * 7.8 + g.ph);
          const w2 = Math.sin(t * 7.8 + g.ph - 1.0);
          const w3 = Math.sin(t * 7.8 + g.ph - 2.0);
          g.cape1.rotation.x = -0.14 + w1 * 0.18;
          g.cape1.rotation.y = Math.cos(t * 4.2 + g.ph) * 0.06;
          g.cape2.rotation.x = w2 * 0.28;
          g.cape2.rotation.z = Math.sin(t * 5.4 + g.ph) * 0.08;
          g.cape3.rotation.x = w3 * 0.36;
          g.cape3.rotation.y = Math.sin(t * 6.0 + g.ph - 1.2) * 0.10;

          const flicker = 0.85 + 0.15 * Math.sin(t * 9 + g.ph);
          g.gmFront.opacity = this.a * (0.16 + 0.78 * night) * flicker;
          g.gmTail.opacity = this.a * (0.08 + 0.52 * night) * flicker;
        }
      }, dispose() { host.object.remove(root); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); for (const m of glowMats) m.dispose(); } });
    }

    else if (f.type === 'flame') {
      // Llama del quemador: arde a ráfagas y de noche ilumina la vela desde dentro.
      const root = new THREE.Group(); root.position.copy(P);
      const cone = new THREE.ConeGeometry(1, 1, 8, 1, true); cone.translate(0, 0.5, 0);
      const mOut = glowMat(0xff7a1a), mIn = glowMat(0xffe07a), mGlow = glowMat(0xffa040);
      const outer = new THREE.Mesh(cone, mOut), inner = new THREE.Mesh(cone, mIn);
      const glowGeo = new THREE.SphereGeometry(f.size * 3.2, 12, 8);
      const glow = new THREE.Mesh(glowGeo, mGlow); glow.position.y = f.size * 3.4;
      root.add(outer, inner, glow);
      host.object.add(noRay(root));
      effects.push({ host, a: 0, update(dt, t, night) {
        const burst = THREE.MathUtils.smoothstep(Math.sin(t * 0.9), -0.1, 0.5); // ráfagas del quemador
        const flick = 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 17.3);
        const k = this.a * (0.25 + 0.75 * burst);
        outer.scale.set(f.size * 0.7, f.size * (1.2 + 3.2 * burst) * flick, f.size * 0.7);
        inner.scale.set(f.size * 0.38, f.size * (0.8 + 2.0 * burst) * flick, f.size * 0.38);
        mOut.opacity = 0.75 * k; mIn.opacity = 0.9 * k;
        mGlow.opacity = this.a * (0.08 + 0.3 * night) * (0.4 + 0.6 * burst) * flick;
        root.visible = this.a > 0.01;
      }, dispose() { host.object.remove(root); cone.dispose(); glowGeo.dispose(); mOut.dispose(); mIn.dispose(); mGlow.dispose(); } });
    }

    else if (f.type === 'cloud') {
      // Nube que va y viene despacio alrededor del eje del diorama.
      const C = new THREE.Vector3(...(f.center || f.pos));
      const pivot = new THREE.Group(); pivot.position.copy(C);
      const cloud = new THREE.Group(); cloud.position.copy(P).sub(C);
      cloud.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cloud.position.clone().normalize());
      const geo = new THREE.IcosahedronGeometry(1, 0);
      const mat = new THREE.MeshLambertMaterial({ color: f.color || 0xffffff, flatShading: true, transparent: true, opacity: 0.95 });
      const blobs = [[0, 0, 0, 1], [0.9, -0.1, 0.2, 0.7], [-0.85, -0.12, -0.1, 0.75], [0.25, 0.1, 0.75, 0.6], [-0.2, 0.25, -0.5, 0.55]];
      for (const [x, y, z, r] of blobs) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x * f.size, y * f.size, z * f.size); m.scale.set(r * f.size, r * f.size * 0.6, r * f.size);
        m.rotation.set(x * 3, z * 5, y * 7);
        cloud.add(m);
      }
      pivot.add(cloud);
      host.object.add(noRay(pivot));
      const ph = Math.random() * 20, amp = 0.18 + Math.random() * 0.2;
      effects.push({ host, a: 0, update(dt, t) {
        pivot.rotation.y = Math.sin(t * 0.13 + ph) * amp;
        cloud.scale.setScalar(Math.max(1e-4, this.a) * (1 + 0.04 * Math.sin(t * 0.8 + ph)));
        pivot.visible = this.a > 0.01;
      }, dispose() { host.object.remove(pivot); geo.dispose(); mat.dispose(); } });
    }

    else if (TWINKLE[f.type]) {
      let tw = twinkles.get(host.object);
      if (!tw) { tw = { host, sparkle: [], firefly: [], city: [] }; twinkles.set(host.object, tw); }
      tw[f.type].push(f);
    }
  }

  // destellos y luciérnagas: una nube de puntos por pieza
  for (const tw of twinkles.values()) {
    for (const kind of Object.keys(TWINKLE)) {
      const cfg = TWINKLE[kind];
      const list = tw[kind];
      if (!list.length) continue;
      const n = list.length;
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = list.map(() => Math.random() * 100);
      list.forEach((f, i) => pos.set(f.pos, i * 3));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size: list[0].size * cfg.size * 1.6, map: softDot(), vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      tw.host.object.add(noRay(pts));
      const base = cfg.color;
      effects.push({ host: tw.host, a: 0, update(dt, t, night) {
        const k = this.a * (cfg.day ? 1 - night : night);
        pts.visible = k > 0.02;
        if (!pts.visible) return;
        for (let i = 0; i < n; i++) {
          let v;
          if (kind === 'sparkle') v = Math.pow(Math.max(0, Math.sin(t * 1.7 + ph[i])), 14); // chispazos breves
          else if (kind === 'city') v = 0.75 + 0.25 * Math.sin(t * 2.1 + ph[i]);                 // luces de ciudad
          else {
            v = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.3 + ph[i]));
            const f = list[i], r = f.size * 0.6;
            pos[i * 3] = f.pos[0] + Math.sin(t * 0.6 + ph[i]) * r;
            pos[i * 3 + 1] = f.pos[1] + Math.sin(t * 0.9 + ph[i] * 2) * r * 0.5;
            pos[i * 3 + 2] = f.pos[2] + Math.cos(t * 0.5 + ph[i] * 3) * r;
          }
          col[i * 3] = base[0] * v * k; col[i * 3 + 1] = base[1] * v * k; col[i * 3 + 2] = base[2] * v * k;
        }
        geo.attributes.color.needsUpdate = true;
        if (kind === 'firefly') geo.attributes.position.needsUpdate = true;
      }, dispose() { tw.host.object.remove(pts); geo.dispose(); mat.dispose(); } });
    }
  }

  return {
    count: effects.length,
    update(dt, t, night) {
      for (const e of effects) {
        const target = e.host.active() ? 1 : 0;
        e.a += (target - e.a) * Math.min(1, dt * 2.5); // aparecen y se apagan suavemente
        e.update(dt, t, night);
      }
    },
    dispose() { for (const e of effects) e.dispose(); effects.length = 0; },
  };
}

// Ciclo de día y noche: devuelve los colores e intensidades para una fase 0..1 (0 = mediodía).
const DAY = { sky: new THREE.Color(0xcfe6ec), top: new THREE.Color(0x5c9ed4), sun: new THREE.Color(0xfff0d8), hemi: new THREE.Color(0xffffff), ground: new THREE.Color(0x8fa3b5) };
const DUSK = { sky: new THREE.Color(0xf2b98a), top: new THREE.Color(0x6a79b8), sun: new THREE.Color(0xff9a5a), hemi: new THREE.Color(0xffd9c0), ground: new THREE.Color(0x7a6f86) };
const NIGHT = { sky: new THREE.Color(0x1c2a44), top: new THREE.Color(0x070b18), sun: new THREE.Color(0x9fb8ff), hemi: new THREE.Color(0x7f93c8), ground: new THREE.Color(0x2a3350) };
const mix = (out, a, b, c, night, dusk) => out.copy(a).lerp(c, night).lerp(b, dusk);
export function dayNight(phase, out) {
  const c = Math.cos(phase * Math.PI * 2);                 // 1 mediodía … -1 medianoche
  const night = THREE.MathUtils.smoothstep(-c, -0.25, 0.45);
  const dusk = Math.max(0, 1 - Math.abs(c + 0.1) / 0.4) * 0.8; // franja cálida al amanecer y al atardecer
  for (const k of ['sky', 'top', 'sun', 'hemi', 'ground']) mix(out[k], DAY[k], DUSK[k], NIGHT[k], night, dusk);
  out.night = night;
  out.sunI = THREE.MathUtils.lerp(2.3, 0.35, night);
  out.hemiI = THREE.MathUtils.lerp(1.7, 1.0, night);
  return out;
}
export const newSky = () => ({ sky: new THREE.Color(), top: new THREE.Color(), sun: new THREE.Color(), hemi: new THREE.Color(), ground: new THREE.Color(), night: 0, sunI: 2.3, hemiI: 1.7 });
