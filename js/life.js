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
function softDot() {
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
      const mat = new THREE.MeshLambertMaterial({ color: 0xe8e8ea, transparent: true, opacity: 0.75, depthWrite: false });
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
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.95 });
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
