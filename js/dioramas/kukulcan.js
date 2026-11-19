// La Gran Nivelación vista desde el norte. Las distancias entre conjuntos están
// comprimidas para que cada borde de la maqueta tenga piezas reconocibles.
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildKukulcan(seed = 419) {
  const { rng, fbm, features, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);
  const tau = 2 * Math.PI;
  const between = (a, b) => a + (b - a) * rng();
  const mix = (a, b, t) => a + (b - a) * t;
  const pick = (items) => items[Math.floor(rng() * items.length)];
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const up = v(0, 1, 0), down = v(0, -1, 0);
  const ashlar = [0xc5bda6, 0xbcb59e, 0xcac2ac, 0xb6b19c, 0xc1b9a2];
  const cornice = [0xd7cfb8, 0xcfc6b0, 0xc9c1ab];
  const weathered = [0x979783, 0xaaa68f, 0xb4ad95];
  const forest = [0x427151, 0x516f38, 0x618240, 0x39745a, 0x768744];
  function quad(a, b, c, d, color, normal, variation = 0.035) {
    const tint = jitter(color, variation);
    addTri(a, b, c, tint, normal);
    addTri(a, c, d, tint, normal);
  }
  function box(x, y, z, w, h, d, color, yaw = 0) {
    addGeo(new THREE.BoxGeometry(w, h, d), color, { p: [x, y, z], r: [0, yaw, 0] });
  }
  function drum(x, y, z, top, base, h, sides, color) {
    addGeo(new THREE.CylinderGeometry(top, base, h, sides), color, { p: [x, y, z] });
  }
  function lump(x, y, z, w, h, d, color, detail = 0) {
    addGeo(new THREE.IcosahedronGeometry(1, detail), color,
      { p: [x, y, z], s: [w, h, d], r: [0, between(0, tau), 0], amt: 0.08 });
  }

  // Un solo terreno anular une el labio del cenote con el contorno exterior.
  // La pared kárstica desciende por dentro hasta el agua.
  const poolX = -22, poolZ = 33;
  const count = 192;
  const outline = [], rim = [];
  for (let i = 0; i < count; i++) {
    const a = tau * i / count;
    const dx = Math.cos(a), dz = Math.sin(a);
    const radiusToEdge = 1 / ((dx / 55) ** 4 + (dz / 46) ** 4) ** 0.25;
    const x = dx * radiusToEdge, z = dz * radiusToEdge;
    const irregular = 1 + 0.012 * Math.sin(7 * a) + 0.010 * Math.cos(11 * a);
    outline.push(v(x * irregular, 0, z * irregular));
    const ray = Math.atan2(z - poolZ, x - poolX);
    const radius = 1 + 0.055 * Math.sin(5 * ray) + 0.04 * Math.cos(3 * ray);
    rim.push(v(poolX + 8.3 * Math.cos(ray) * radius, 0, poolZ + 7.2 * Math.sin(ray) * radius));
  }
  const groundY = (x, z) => {
    const margin = smooth((Math.max(Math.abs(x) / 51, Math.abs(z) / 41) - 0.81) * 5);
    return 0.06 + margin * (fbm(x * 0.14, z * 0.14) - 0.45) * 1.65;
  };
  const pathDistance = (x, z) => Math.abs(x + Math.max(0, z - 24) * 1.8);
  function meadow(x, z) {
    const n = fbm(x * 0.115, z * 0.115);
    const apron = Math.max(Math.abs(x) - 27, Math.abs(z + 5) - 27);
    if ((apron < 3.8 + n && apron > -1) || (z > 22 && z < 35 && pathDistance(x, z) < 1.5 + n))
      return n > 0.47 ? 0xd0c6a1 : 0xc2b793;
    return n < 0.33 ? 0x819355 : n < 0.47 ? 0x94a460 : n < 0.58 ? 0xa1ad6a : 0xb1b77a;
  }
  function strip(inner, outer, colorAt, normalAt) {
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const a = inner[i], b = inner[j], c = outer[j], d = outer[i];
      quad(a, b, c, d, colorAt((a.x + c.x) / 2, (a.z + c.z) / 2, i), normalAt(i));
    }
  }
  let last = rim.map(p => v(p.x, groundY(p.x, p.z), p.z));
  for (let row = 1; row <= 70; row++) {
    const ring = rim.map((p, i) => {
      const t = row / 70, x = mix(p.x, outline[i].x, t), z = mix(p.z, outline[i].z, t);
      return v(x, groundY(x, z), z);
    });
    strip(last, ring, meadow, () => up);
    last = ring;
  }
  const strata = [[1.003, -0.65, 0x786b4d], [1.005, -1.5, 0x9b8461],
    [0.994, -2.0, 0xd0b78d], [0.989, -3.8, 0xb7a381], [0.976, -4.4, 0x897e66],
    [0.968, -6.8, 0xc0ab88], [0.94, -7.5, 0x9e8c71]];
  for (const [scale, depth, color] of strata) {
    const ring = outline.map(p => v(p.x * scale, depth + (depth > -7 ? fbm(p.x * 0.13, p.z * 0.13) - 0.5 : 0), p.z * scale));
    strip(last, ring, () => color, i => outline[i]);
    last = ring;
  }
  for (let i = 0; i < count; i++)
    addTri(v(0, -7.5, 0), last[i], last[(i + 1) % count], jitter(0xa49378, 0.035), down);
  last = rim.map(p => v(p.x, groundY(p.x, p.z), p.z));
  for (const [scale, depth, color] of [[0.98, -0.55, 0xc4b998], [1.02, -1.7, 0xa49677], [1.05, -3.5, 0x7b8066], [0.91, -4.4, 0x687862]]) {
    const ring = rim.map(p => v(mix(poolX, p.x, scale), depth, mix(poolZ, p.z, scale)));
    strip(last, ring, () => color, i => v(poolX - rim[i].x, 0, poolZ - rim[i].z));
    last = ring;
  }
  for (let k = 1; k <= 12; k++) {
    const ring = rim.map(p => {
      const t = (12 - k) / 12;
      return v(mix(poolX, p.x, t * 0.91), -4.4, mix(poolZ, p.z, t * 0.91));
    });
    const water = (x,z) => {
      const shade = smooth((k + 1.8*fbm(x*0.7,z*0.7))/9);
      const red = Math.round(mix(70,33,shade)), green = Math.round(mix(149,103,shade));
      return (red << 16) | (green << 8) | Math.round(mix(132,96,shade));
    };
    if (k < 12) strip(last, ring, water, () => up);
    else for (let i = 0; i < count; i++)
      addTri(last[i], last[(i + 1) % count], ring[i], jitter(water(poolX,poolZ), 0.02), up);
    last = ring;
  }

  // Frente local (+Z) de cada fachada. Las piedras se dibujan en hiladas a
  // matajunta sobre el talud; cada cara tiene un pequeño bisel de luz y sombra.
  function facade(side, x, z) {
    const ux = [1, 0, -1, 0][side], uz = [0, -1, 0, 1][side];
    return (u, h, depth) => v(x + u * ux - depth * uz, h, z + u * uz + depth * ux);
  }
  function tier(x, z, half, top, low, high, rows, pitch, colors, panels = false) {
    for (let side = 0; side < 4; side++) {
      const point = facade(side, x, z);
      const normal = point(0, 0, 1).sub(v(x, 0, z));
      function face(u, t, relief = 0) {
        const width = mix(half, top, t);
        return point(u * width, mix(low, high, t), width + relief);
      }
      quad(face(-1, 0), face(1, 0), face(1, 1), face(-1, 1), 0x8e8979, normal);
      const blocks = Math.max(2, Math.round(2 * half / pitch));
      for (let row = 0; row < rows; row++) {
        const shift = 0.5 * (row % 2);
        for (let col = 0; col < blocks + (row % 2); col++) {
          const left = Math.max(-1, (col - shift) * 2 / blocks - 1);
          const right = Math.min(1, (col + 1 - shift) * 2 / blocks - 1);
          const a = row / rows, b = (row + 1) / rows;
          const inset = 0.055 / half, bevel = 0.055 / (high - low);
          const relief = between(0.045, 0.095);
          const outer = [face(left,a), face(right,a), face(right,b), face(left,b)];
          const inner = [face(left+inset,a+bevel,relief), face(right-inset,a+bevel,relief),
            face(right-inset,b-bevel,relief), face(left+inset,b-bevel,relief)];
          const color = pick(colors);
          quad(...inner, color, normal);
          for (let j = 0; j < 4; j++)
            quad(outer[j], outer[(j+1)%4], inner[(j+1)%4], inner[j], color, normal);
        }
      }
      if (panels) {
        // Tableros rehundidos, en grupos a ambos lados de cada escalera.
        for (const sign of [-1, 1]) {
          const n = Math.max(1, Math.round((top - 5.5) / 3.4));
          for (let j = 0; j < n; j++) {
            const left = sign * (5.45 + (j + 0.10) * (top - 5.6) / n) / top;
            const right = sign * (5.45 + (j + 0.90) * (top - 5.6) / n) / top;
            quad(face(left,.34,.11),face(right,.34,.11),face(right,.72,.11),face(left,.72,.11),0x9c9884,normal);
          }
        }
      }
    }
    quad(v(x-top,high,z-top),v(x+top,high,z-top),v(x+top,high,z+top),v(x-top,high,z+top),pick(colors),up);
    quad(v(x-half,low,z-half),v(x+half,low,z-half),v(x+half,low,z+half),v(x-half,low,z+half),pick(colors),down);
  }

  const templeZ = -5, rise = 2.65, summit = 9 * rise;
  box(0, -0.75, templeZ, 55.6, 1.8, 55.6, 0xa7a089);
  for (let i = 0; i < 9; i++) {
    const base = 27.6 - i * 2.22, y = i * rise + 0.13;
    tier(0, templeZ, base, base - 0.76, y, y + 2.25, 3, 2.05, ashlar, true);
    tier(0, templeZ, base - 0.72, base - 0.79, y + 2.25, y + rise, 1, 2.6, cornice);
  }
  function staircase(side) {
    const p = facade(side, 0, templeZ);
    const forward = p(0,0,1).sub(p(0,0,0));
    const start = 31.8, end = 8.2, width = 3.1, steps = 91;
    const depth = t => mix(start, end, t), level = t => 0.15 + summit * t;
    // Una sola envolvente continua debajo de las huellas y contrahuellas.
    quad(p(-width,-0.4,end),p(width,-0.4,end),p(width,level(1),end),p(-width,level(1),end),0xa39d89,forward.clone().negate());
    quad(p(-width,-0.4,start),p(width,-0.4,start),p(width,-0.4,end),p(-width,-0.4,end),0xa39d89,down);
    for (let i = 0; i < steps; i++) {
      const t = i / steps, next = (i + 1) / steps, y = level(next);
      for (let j = 0; j < 4; j++) {
        const u = mix(-width,width,j/4), w = mix(-width,width,(j+1)/4);
        quad(p(u,y,depth(t)),p(w,y,depth(t)),p(w,y,depth(next)),p(u,y,depth(next)),pick(cornice),up);
        const sill = i === 0 ? -0.4 : level(t);
        quad(p(u,sill,depth(t)),p(w,sill,depth(t)),p(w,y,depth(t)),p(u,y,depth(t)),pick(weathered),forward);
      }
      for (const sign of [-1,1]) {
        const u = sign*width, n = p(sign,0,0).sub(p(0,0,0));
        quad(p(u,-0.4,depth(t)),p(u,-0.4,depth(next)),p(u,y,depth(next)),p(u,y,depth(t)),0xa39d89,n);
      }
    }
    // Alfardas continuas con un remate de piedra ligeramente saliente.
    for (const sign of [-1, 1]) {
      const inside = sign * width, outside = sign * (width + 1.20);
      const lateral = p(sign,0,0).sub(p(0,0,0));
      for (let i = 0; i < 23; i++) {
        const t = i/23, n = (i+1)/23, z = depth(t), zz = depth(n);
        const y = level(t) + 1.0, yy = level(n) + 1.0;
        quad(p(inside,y,z),p(outside,y,z),p(outside,yy,zz),p(inside,yy,zz),pick(cornice),up);
        quad(p(outside,y-3,z),p(outside,yy-3,zz),p(outside,yy,zz),p(outside,y,z),pick(ashlar),lateral);
        quad(p(inside,y-3,z),p(inside,yy-3,zz),p(inside,yy,zz),p(inside,y,z),pick(weathered),lateral.clone().negate());
        if (!i) quad(p(inside,y,z),p(outside,y,z),p(outside,y-3,z),p(inside,y-3,z),pick(ashlar),forward);
      }
    }
  }
  for (let side = 0; side < 4; side++) staircase(side);

  // Santuario hueco con pórtico de tres vanos al norte y puertas laterales.
  const floor = summit + 0.13, room = 5.9, wallH = 4.6;
  box(0,floor+0.20,templeZ,13.5,0.44,13.5,0xd4c9ae);
  for (let side = 0; side < 4; side++) {
    const p = facade(side,0,templeZ), opening = side === 0 ? 3.85 : 1.14;
    for (const sign of [-1,1]) {
      for (let row = 0; row < 5; row++) {
        const n = side === 0 ? 2 : 4;
        for (let j = 0; j < n; j++) {
          const u = sign * mix(opening,room,(j+0.5)/n);
          const at = p(u,floor+0.40+(row+0.5)*wallH/5,room-0.56);
          box(at.x,at.y,at.z,(room-opening)/n-0.02,wallH/5-0.016,1.12,pick(ashlar),side*Math.PI/2);
        }
      }
    }
    if (side === 0) for (const x of [-1.39,1.39]) {
      for (let k = 0; k < 5; k++)
        drum(x,floor+0.4+(k+0.5)*wallH/5,templeZ+5.38,0.48,0.53,wallH/5,10,pick(weathered));
    }
  }
  box(0,floor+2.5,templeZ-1,7.8,4.5,0.9,0x797665);
  const lintel = floor+0.40+wallH;
  tier(0,templeZ,6.2,6.2,lintel,lintel+0.59,1,1.8,cornice);
  tier(0,templeZ,6.03,5.94,lintel+0.59,lintel+1.58,2,1.6,ashlar);
  tier(0,templeZ,6.28,6.13,lintel+1.58,lintel+2.07,1,1.7,cornice);
  for (const sign of [-1,1]) {
    const x = sign*3.77, z = templeZ+32;
    // Hocico, mandíbula, cejas y colmillos de las cabezas de Kukulcán.
    lump(x,0.59,z+0.7,1.10,0.58,1.88,0xa6a18b,1);
    lump(x,1.08,z+0.95,0.96,0.48,1.53,0x625f50,1);
    lump(x,1.60,z+0.85,1.06,0.57,1.67,0xcdc3a7,1);
    lump(x,1.72,z-0.15,1.16,0.93,1.03,0xbab298,1);
    for (const s of [-1,1]) {
      lump(x+s*0.91,1.94,z+0.13,0.24,0.24,0.26,0x635f4d);
      lump(x+s*0.85,2.18,z+0.10,0.34,0.16,0.46,0xcec4a8);
      drum(x+s*0.57,1.05,z+1.9,0.20,0.04,0.58,6,0xdfd4b5);
    }
  }

  // Gran Juego de Pelota. Los aros sobresalen perpendicularmente de los
  // dos muros para que se vea el hueco mirando a lo largo de la cancha.
  const courtX = 40, courtZ = 7;
  box(courtX,-0.34,courtZ,16.8,1.1,31,0xbbba91);
  for (const sign of [-1,1]) {
    const x = courtX+sign*6.4;
    box(x,1.65,courtZ,2.8,4.0,30.5,0x9b9887);
    for (let row = 0; row < 5; row++) {
      const n = row % 2 ? 14 : 15;
      for (let i = 0; i < n; i++) {
        const z = courtZ + ((i+0.5)/n-0.5)*31;
        box(x,0.51+row*0.75,z,3.0,0.73,31/n-0.03,pick(ashlar));
      }
    }
    box(x,4.02,courtZ,3.23,0.4,31.2,0xd0c5a8);
    box(x-sign*1.64,0.60,courtZ,1.8,1.10,29.3,0xb6b098);
    const inner = x-sign*1.56;
    box(inner-sign*0.29,2.65,courtZ,0.84,0.63,0.65,0xa8a28b);
    addGeo(new THREE.TorusGeometry(0.79,0.24,8,22),0xcac1a5,{p:[inner-sign*0.94,2.70,courtZ]});
    for (let k = 0; k < 13; k++) {
      const z = courtZ + (k-6)*2.1;
      box(x-sign*2.51,0.67,z,0.14,0.56,1.68,pick(weathered));
    }
  }
  box(courtX,0.6,courtZ+17.5,7.6,1.45,3.9,0xb9b098);
  for (const x of [-2.6,0,2.6]) drum(courtX+x,2.22,courtZ+18,0.42,0.49,1.95,9,0xbcb49b);
  box(courtX,3.35,courtZ+18,7.0,0.67,2.45,0xcfc3a8);

  // Un fragmento del Templo de los Guerreros y la Plaza de las Mil Columnas.
  const warriorsX = -40, warriorsZ = 5;
  for (let k = 0; k < 4; k++) {
    const y = -0.4 + k*1.28, w = 7.5-k*0.88;
    tier(warriorsX,warriorsZ,w,w-0.42,y,y+1.28,2,1.85,ashlar);
  }
  for (let i = 0; i < 13; i++) {
    const y = 0.12 + (i+1)*0.36;
    box(warriorsX+9.7-i*0.41,y/2,warriorsZ,0.43,y,3.65,pick(cornice));
  }
  function column(x, z, base, height, radius) {
    const courses = Math.max(2,Math.round(height/0.66));
    drum(x,base+0.14,z,radius*1.15,radius*1.24,0.30,10,pick(weathered));
    for (let i = 0; i < courses; i++) {
      const r = radius*(1-0.05*i/courses);
      drum(x,base+0.27+(i+0.5)*height/courses,z,r*0.98,r,height/courses,10,pick(ashlar));
    }
    drum(x,base+height+0.34,z,radius*1.07,radius,0.21,10,pick(cornice));
  }
  for (const z of [-2.1,2.1]) for (const x of [-2.1,2.1])
    column(warriorsX+x,warriorsZ+z,4.72,2.95,0.52);
  box(warriorsX-3.0,5.44,warriorsZ,0.87,1.5,7.8,0xb8ad94);
  box(-40,-0.28,-15.8,15,1.45,23.7,0xb5aa8b);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 8; j++) {
    const x = -46+i*3.0, z = -25.7+j*2.85;
    const height = (i+2*j)%9 === 0 ? between(0.55,1.2) : between(2.45,3.8);
    column(x,z,0.445,height,0.56);
  }

  // La silueta del bosque alterna copas anchas, ramaje visible y palmas de
  // abanico. Los claros conservan libres la plaza, el sacbé y las ruinas.
  function broadleaf(x,z,scale) {
    const y = groundY(x,z), h = scale*between(4.5,6.7), bark = 0x77684d;
    drum(x,y+h*0.32-0.2,z,0.37*scale,0.69*scale,h*0.68+0.4,7,bark);
    const angle = between(0,tau), color = pick(forest);
    for (let i = 0; i < 4; i++) {
      const a = angle + tau*i/4, c = Math.cos(a), s = Math.sin(a);
      const dx = c*scale*between(1.1,2.0), dz = s*scale*between(1.1,2.0);
      addRod([x,y+h*0.45,z],[x+dx,y+h*0.92,z+dz],scale*0.25,bark,6);
      lump(x+dx,y+h*0.93,z+dz,2.30*scale,1.65*scale,2.1*scale,color,1);
      addRod([x+c*scale*0.98,y-0.14,z+s*scale*0.98],[x,y+1.3*scale,z],scale*0.24,bark,5);
    }
    lump(x,y+h+0.85*scale,z,2.5*scale,1.84*scale,2.26*scale,pick(forest),1);
  }
  function palm(x,z,scale) {
    const y = groundY(x,z), h = 5.9*scale;
    drum(x,y+h/2-0.15,z,0.24*scale,0.41*scale,h+0.3,8,0x948264);
    const angle = between(0,tau);
    for (let i = 0; i < 9; i++) {
      const a = angle+i*tau/9, length = between(2.0,3.1)*scale;
      const point = (l,w,height) => v(x+l*Math.cos(a)-w*Math.sin(a),y+h+height,z+l*Math.sin(a)+w*Math.cos(a));
      const stem = point(0,0,-0.07), center = point(length*0.63,0,0.63*scale);
      const left = point(length*0.58,-0.53*scale,0.40*scale), right = point(length*0.58,0.53*scale,0.40*scale);
      const tip = point(length,0,-0.75*scale), keel = point(length*0.59,0,0.21*scale);
      const ring = [stem,left,tip,right], color = pick(forest);
      for (let j = 0; j < 4; j++) {
        addTri(center,ring[j],ring[(j+1)%4],jitter(color,0.08),up);
        addTri(keel,ring[j],ring[(j+1)%4],jitter(0x47734c,0.07),down);
      }
    }
  }
  const planted = [];
  for (let tries = 0; tries < 9000 && planted.length < 104; tries++) {
    const x = between(-52,52), z = between(-43,43);
    if ((Math.abs(x)/53)**4+(Math.abs(z)/44)**4 > 0.91) continue;
    if (Math.abs(x)<32 && z>-35 && z<29) continue;
    if (x>29 && z>-11 && z<29 || x<-30 && z>-29 && z<15) continue;
    if (Math.hypot((x-poolX)/9.7,(z-poolZ)/8.9)<1 || z>22 && pathDistance(x,z)<3.1) continue;
    if (planted.some(p => Math.hypot(x-p.x,z-p.z)<3.0)) continue;
    const scale = between(0.62,1.03)*(z>22 ? 0.78 : 1);
    if (planted.length%5 === 0) palm(x,z,scale);
    else broadleaf(x,z,scale);
    planted.push({x,z});
    if (planted.length%6 === 0) features.push({type:'firefly',pos:[x+0.7,groundY(x,z)+2.3,z+0.7],size:2.2});
  }
  for (let i = 0; i < 12; i++) {
    const a = between(0,tau), r = between(0.15,0.78);
    features.push({type:'sparkle',pos:[poolX+7.4*r*Math.cos(a),-4.36,poolZ+6.5*r*Math.sin(a)],size:0.7});
  }
  // Afloramientos y raíces que cuelgan de la caliza húmeda del cenote.
  for (let i = 0; i < 52; i++) {
    const a = between(0,tau), r = 1 + 0.055*Math.sin(5*a) + 0.04*Math.cos(3*a);
    const x = poolX + 8.3*r*Math.cos(a), z = poolZ + 7.2*r*Math.sin(a);
    const h = between(0.37,1.1);
    lump(x,-h*0.13,z,between(0.55,1.12),h,between(0.48,1.12),pick(weathered),1);
    if (i%3 === 0) {
      const tip = [mix(poolX,x,0.92),between(-3.75,-1.6),mix(poolZ,z,0.92)];
      addRod([x,0.15,z],tip,between(0.10,0.19),0x655c3c,5);
      lump(x,0.22,z,0.84,0.45,0.67,pick(forest));
    }
  }
  features.push({type:'gulls',pos:[-39,10.5,-23],size:3.6});

  // Orientación de exposición y conversión de las medidas a escala de maqueta.
  const model = finish('Templo de Kukulcán');
  const angle = 0.27, c = Math.cos(angle), s = Math.sin(angle), scale = 0.006;
  function place(array,i) {
    const x = array[i], z = array[i+2];
    array[i] = (c*x+s*z)*scale;
    array[i+1] *= scale;
    array[i+2] = (c*z-s*x)*scale;
  }
  for (let i = 0; i < model.positions.length; i+=3) place(model.positions,i);
  for (const effect of features) {
    place(effect.pos,0);
    effect.size *= scale;
  }
  return model;
}
