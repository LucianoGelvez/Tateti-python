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
import * as THREE from './vendor/three.module.js';

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
      const root = new THREE.Group(); root.position.copy(P);
      const wing = new THREE.BufferGeometry();
      const s = f.size * 0.09;
      wing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -s * 0.5, s * 2.2, 0, 0, 0, 0, s * 0.5]), 3));
      wing.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true });
      const birds = [];
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Group(), l = new THREE.Mesh(wing, mat), r = new THREE.Mesh(wing, mat);
        r.scale.x = -1; b.add(l, r); root.add(b);
        birds.push({ b, l, r, ph: i * 2.1, rad: f.size * (0.7 + 0.25 * i), sp: 0.55 - 0.1 * i, y: i * f.size * 0.18 });
      }
      host.object.add(noRay(root));
      effects.push({ host, a: 0, update(dt, t, night) {
        const vis = this.a * (1 - night);
        mat.opacity = vis; root.visible = vis > 0.02;
        for (const g of birds) {
          const ang = t * g.sp + g.ph;
          g.b.position.set(Math.cos(ang) * g.rad, g.y + Math.sin(t * 0.7 + g.ph) * f.size * 0.08, Math.sin(ang) * g.rad);
          g.b.rotation.y = -ang - Math.PI / 2; // mirando en el sentido del vuelo
          const flap = Math.sin(t * 6 + g.ph) * 0.55;
          g.l.rotation.z = flap; g.r.rotation.z = -flap;
        }
      }, dispose() { host.object.remove(root); wing.dispose(); mat.dispose(); } });
    }

    else if (f.type === 'sparkle' || f.type === 'firefly') {
      let tw = twinkles.get(host.object);
      if (!tw) { tw = { host, sparkle: [], firefly: [] }; twinkles.set(host.object, tw); }
      tw[f.type].push(f);
    }
  }

  // destellos y luciérnagas: una nube de puntos por pieza
  for (const tw of twinkles.values()) {
    for (const kind of ['sparkle', 'firefly']) {
      const list = tw[kind];
      if (!list.length) continue;
      const n = list.length;
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = list.map(() => Math.random() * 100);
      list.forEach((f, i) => pos.set(f.pos, i * 3));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size: kind === 'sparkle' ? list[0].size * 0.7 : list[0].size * 0.3, vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      tw.host.object.add(noRay(pts));
      const base = kind === 'sparkle' ? [1, 1, 1] : [0.85, 1, 0.35];
      effects.push({ host: tw.host, a: 0, update(dt, t, night) {
        const k = this.a * (kind === 'sparkle' ? 1 - night : night);
        pts.visible = k > 0.02;
        if (!pts.visible) return;
        for (let i = 0; i < n; i++) {
          let v;
          if (kind === 'sparkle') v = Math.pow(Math.max(0, Math.sin(t * 1.7 + ph[i])), 14); // chispazos breves
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
