// Barra de iconos flotante dentro del visor (VR y realidad mixta).
// Se apunta con el rayo de la mano o del mando y se pulsa con gatillo o pinza.
import * as THREE from './vendor/three.module.js';
import { drawIcon } from './icons.js';

const SIZE = 0.06, GAP = 0.016, PAD = 0.02;
const PAPER = '#faf7f0', INK = '#1d2733', ACCENT = '#d2553f';

function canvasPlane(w, h, pxW, pxH) {
  const cv = document.createElement('canvas'); cv.width = pxW; cv.height = pxH;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  return { cv, ctx: cv.getContext('2d'), tex, mesh };
}

// defs: [{ id, icon(): nombre, label(): texto, active(): bool (resaltado), dim(): bool (apagado), visible(): bool, press() }]
export function createVRBar(defs) {
  const group = new THREE.Group();
  group.visible = false;
  group.position.set(0, 2.05, -1.6);
  group.scale.setScalar(1.45); // a 1,6 m: se ve del mismo tamaño que antes a 1,1 m

  const plate = canvasPlane(1, SIZE + PAD * 2, 512, 64);
  plate.mesh.position.z = -0.004; plate.mesh.renderOrder = 20;
  group.add(plate.mesh);

  const tip = canvasPlane(0.4, 0.055, 640, 88);
  tip.mesh.position.set(0, -(SIZE / 2 + PAD + 0.042), 0); tip.mesh.renderOrder = 21; tip.mesh.visible = false;
  group.add(tip.mesh);
  let tipText = '';

  const buttons = defs.map((def) => {
    const p = canvasPlane(SIZE, SIZE, 128, 128);
    p.mesh.renderOrder = 21;
    const b = { def, ...p, hover: false, shown: true, drawn: '' };
    p.mesh.userData.btn = b;
    group.add(p.mesh);
    return b;
  });

  function draw(b) {
    const on = !!(b.def.active && b.def.active()), dim = !on && !!(b.def.dim && b.def.dim()), icon = b.def.icon();
    const key = `${icon}|${on}|${dim}|${b.hover}`;
    if (key === b.drawn) return;
    b.drawn = key;
    const { ctx } = b;
    ctx.clearRect(0, 0, 128, 128);
    ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fillStyle = on ? ACCENT : dim ? 'rgba(250,247,240,0.42)' : PAPER; ctx.fill();
    if (b.hover) { ctx.lineWidth = 7; ctx.strokeStyle = on ? '#ffffff' : ACCENT; ctx.stroke(); }
    drawIcon(ctx, icon, 64, 64, 66, on ? '#ffffff' : dim ? 'rgba(29,39,51,0.6)' : INK, 2.1);
    b.tex.needsUpdate = true;
  }

  function drawPlate(width) {
    const { ctx, cv, tex, mesh } = plate;
    mesh.scale.x = width;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(29,39,51,0.62)';
    ctx.beginPath(); ctx.roundRect(0, 0, cv.width, cv.height, 32); ctx.fill();
    tex.needsUpdate = true;
  }

  function setTip(text) {
    if (text === tipText) return;
    tipText = text;
    tip.mesh.visible = !!text;
    if (!text) return;
    const { ctx, cv, tex } = tip;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.font = '600 44px system-ui, sans-serif';
    const w = Math.min(cv.width - 8, ctx.measureText(text).width + 56);
    ctx.fillStyle = 'rgba(250,247,240,0.96)';
    ctx.beginPath(); ctx.roundRect((cv.width - w) / 2, 6, w, cv.height - 12, 38); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cv.width / 2, cv.height / 2 + 2, cv.width - 60);
    tex.needsUpdate = true;
  }

  let lastLayout = '';
  // Recalcula qué botones se ven, su posición y su aspecto. Llamar cuando cambie algún estado.
  function refresh() {
    const vis = buttons.filter((b) => !b.def.visible || b.def.visible());
    const key = vis.map((b) => b.def.id).join(',');
    if (key !== lastLayout) {
      lastLayout = key;
      const total = vis.length * SIZE + (vis.length - 1) * GAP;
      for (const b of buttons) { b.shown = vis.includes(b); b.mesh.visible = b.shown; if (!b.shown) b.hover = false; }
      vis.forEach((b, i) => { b.mesh.position.set(-total / 2 + SIZE / 2 + i * (SIZE + GAP), 0, 0); });
      drawPlate(total + PAD * 2);
      group.updateMatrixWorld(true);
    }
    for (const b of vis) draw(b);
  }

  // Botón apuntado por el rayo (o null).
  const targets = () => buttons.filter((b) => b.shown).map((b) => b.mesh);
  function pick(raycaster) {
    if (!group.visible) return null;
    const hits = raycaster.intersectObjects(targets(), false);
    return hits.length ? { btn: hits[0].object.userData.btn, dist: hits[0].distance } : null;
  }

  // hovered: botones apuntados en este cuadro (por cualquiera de las dos manos).
  function update(dt, hovered) {
    let tipFor = null;
    for (const b of buttons) {
      const h = hovered.includes(b);
      if (h !== b.hover) { b.hover = h; draw(b); }
      if (h && !tipFor) tipFor = b;
      const target = h ? 1.16 : 1;
      const s = b.mesh.scale.x + (target - b.mesh.scale.x) * Math.min(1, dt * 14);
      b.mesh.scale.set(s, s, 1);
    }
    if (tipFor) { tip.mesh.position.x = tipFor.mesh.position.x * 0.5; setTip(tipFor.def.label()); } else setTip('');
  }

  // Coloca la barra por encima de la zona de armado, mirando hacia la cabeza del jugador.
  function place(head, center) {
    // lejos y por encima de la zona de armado, para que no estorbe al mover piezas
    group.position.set(center.x, THREE.MathUtils.clamp(head.y + 0.45, 1.55, 2.6), center.z - 1.15);
    group.lookAt(head.x, head.y, head.z);
    group.updateMatrixWorld(true);
  }

  refresh();
  return { group, buttons, refresh, pick, update, place };
}
