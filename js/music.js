// Música de fondo generativa, sintetizada con WebAudio (sin archivos de audio).
//
// Cada diorama tiene un tema propio con 4 capas que se suman a medida que se arma el
// rompecabezas (como en Puzzling Places, el lugar "cobra vida" pieza a pieza):
//   capa 0: colchón armónico   (desde el principio)
//   capa 1: acompañamiento      (desde el 15 %)
//   capa 2: melodía             (desde el 40 %)
//   capa 3: adornos y percusión (desde el 70 %)
// Las melodías son composiciones originales escritas para este juego.

const LAYER_FROM = [0, 0.15, 0.4, 0.7];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteNum(s) { // "F#5" -> 78
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) throw new Error('Nota inválida: ' + s);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// "Em", "B7", "F#dim", "G/F", "Dm7" -> { notes: [midi en la octava 3-4], bass: midi en la octava 2 }
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus4: [0, 5, 7], sus2: [0, 2, 7] };
function chord(s) {
  const [name, slash] = s.split('/');
  const m = /^([A-G])(#|b)?(.*)$/.exec(name);
  let root = 48 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  if (root > 54) root -= 12;          // raíz entre F#2+12 y F3+12: voces centradas
  const notes = (QUALITY[m[3]] || QUALITY['']).map((i) => root + 12 + i);
  let bass = root;
  if (slash) { bass = 36 + NOTE[slash[0]] + (slash[1] === '#' ? 1 : slash[1] === 'b' ? -1 : 0); if (bass < 38) bass += 12; }
  return { notes, bass, root: root + 12 };
}
// "E5 - - F#5 G5 ." -> en cada paso: { m: midi, len: pasos } o null
function melody(s) {
  const tok = s.trim().split(/\s+/), out = tok.map(() => null);
  for (let i = 0; i < tok.length; i++) {
    if (tok[i] === '-' || tok[i] === '.') continue;
    let len = 1;
    while (tok[i + len] === '-') len++;
    out[i] = { m: noteNum(tok[i]), len };
  }
  return out;
}

// ------------------------------------------------------------------ temas
// bars: [acorde, melodía]. Cada token de la melodía dura un paso (corchea).
export const THEMES = {
  // El Faro: se queda con el mar de siempre, sin instrumentos.
  faro: { root: 67, minor: false, ambient: 'waves', bars: [] },

  // Castillo: vals misterioso en mi menor, celesta + arpa + cuerdas.
  castillo: {
    bpm: 96, beats: 3, sub: 2, root: 64, minor: true, reverb: 0.5, ambient: 'night',
    bars: [
      ['Em', 'E5 - - F#5 G5 -'], ['Em', 'B5 - A5 G5 F#5 -'], ['C', 'E5 - G5 - C6 -'], ['C', 'B5 - - - . .'],
      ['Am', 'A5 - C6 - B5 A5'], ['B7', 'F#5 - D#5 - B4 -'], ['Em', 'E5 - G5 - B5 -'], ['Em', 'E6 - - - . .'],
      ['G', 'D6 - B5 - G5 -'], ['D', 'A5 - F#5 - D5 -'], ['Em', 'G5 - E5 - B4 -'], ['C', 'C5 - E5 G5 C6 -'],
      ['Am', 'A5 - - G5 F#5 E5'], ['F#dim', 'D#5 - F#5 - A5 -'], ['B7', 'G5 - F#5 - D#5 -'], ['Em', 'E5 - - - . .'],
    ],
    play(e, bar, s, t, L, pass) {
      const c = bar.c, step = e.stepDur;
      if (L[0] && s === 0) { e.pad(t, c.notes, step * 6 + 0.4, 0.07, 0); e.bass(t, c.bass, step * 6, 0.11, 0); }
      if (L[1]) { const arp = [0, 1, 2, 1, 2, 1]; e.pluck(t, c.notes[arp[s] % c.notes.length] + 12, step * 3, s === 0 ? 0.08 : 0.055, 1); }
      const n = bar.mel[s];
      if (n && L[2]) e.bell(t, n.m, n.len * step, 0.13, 2);
      if (L[3]) {
        if (n && pass % 2 === 1) e.flute(t, n.m - 12, n.len * step * 0.95, 0.05, 3);
        if (s === 0 && bar.i % 4 === 0) e.drum(t, 0.13, 70, 3);
        if (s === 0) e.choir(t, [c.notes[0] + 12, c.notes[2] + 12], step * 6 + 0.3, 0.025, 3);
      }
    },
  },

  // Coliseo: marcha lenta y antigua en re menor (con la dominante mayor), lira, tambor de marco y metales.
  roma: {
    bpm: 76, beats: 4, sub: 2, root: 62, minor: true, reverb: 0.55, ambient: 'wind',
    bars: [
      ['Dm', 'D5 - - - E5 F5 E5 D5'], ['C', 'C5 - E5 - G5 - - -'], ['Bb', 'F5 - - E5 D5 - C5 -'], ['C', 'E5 - - - - - . .'],
      ['Dm', 'A5 - - G5 F5 - E5 -'], ['Gm', 'D5 - G5 - Bb5 - A5 G5'], ['A', 'C#5 - E5 - A5 - G5 -'], ['A', 'F5 - E5 - C#5 - - -'],
    ],
    play(e, bar, s, t, L, pass) {
      const c = bar.c, step = e.stepDur;
      if (L[0] && s === 0) { e.pad(t, [c.bass + 12, c.bass + 19], step * 8 + 0.5, 0.08, 0); e.choir(t, c.notes, step * 8 + 0.4, 0.03, 0); }
      if (L[1]) {
        if (s % 2 === 0) { const arp = [0, 2, 1, 2]; e.pluck(t, c.notes[arp[s / 2]] + 12, step * 3, 0.07, 1); }
        if (s === 0) e.drum(t, 0.16, 90, 1);
        if (s === 4) e.drum(t, 0.07, 95, 1);
        if (s === 3 || s === 6) e.tek(t, 0.035, 1);
      }
      const n = bar.mel[s];
      if (n && L[2]) e.reed(t, n.m, n.len * step * 0.92, 0.075, 2, pass % 2 ? 1 : 0.6);
      if (L[3]) {
        if (s === 0 && bar.i % 4 === 0) e.brass(t, [c.root - 12, c.root - 5, c.root], step * 4, 0.05, 3);
        if (s === 0 || s === 4) e.bass(t, c.bass, step * 3, 0.1, 3);
        if (s === 5 || s === 7) e.tek(t, 0.025, 3);
      }
    },
  },

  // Torre Eiffel: vals musette parisino en la menor, acordeón con "oom-pa-pa".
  paris: {
    bpm: 138, beats: 3, sub: 2, root: 69, minor: true, reverb: 0.32, ambient: null,
    bars: [
      ['Am', 'E5 - A5 - C6 B5'], ['Am', 'A5 - E5 - - -'], ['Dm', 'F5 - A5 - D6 C6'], ['Dm', 'A5 - F5 - - -'],
      ['G7', 'D5 - G5 - B5 A5'], ['G7', 'G5 F5 D5 - B4 -'], ['C', 'C5 - E5 - G5 -'], ['E7', 'G#5 - B5 - E5 -'],
      ['Am', 'A5 B5 C6 - A5 -'], ['Am', 'E5 - - - C5 E5'], ['Dm', 'D5 E5 F5 - D5 -'], ['Dm', 'A5 - - - F5 A5'],
      ['F', 'C6 - A5 - F5 -'], ['E7', 'B5 - G#5 - E5 D5'], ['Am', 'C5 - E5 - A5 -'], ['E7', 'G#5 - - - E5 -'],
    ],
    play(e, bar, s, t, L, pass) {
      const c = bar.c, step = e.stepDur;
      if (L[0] && s === 0) e.pad(t, c.notes, step * 6 + 0.2, 0.045, 0);
      if (L[1]) {
        if (s === 0) e.bass(t, bar.i % 2 ? c.bass + 7 : c.bass, step * 1.6, 0.13, 1);
        if (s === 2 || s === 4) for (const m of c.notes) e.reed(t, m, step * 0.7, 0.022, 1, 0.5);
      }
      const n = bar.mel[s];
      if (n && L[2]) e.reed(t, n.m, n.len * step * 0.94, 0.085, 2, 1, true);
      if (L[3]) {
        if (n && pass % 2 === 1) e.bell(t, n.m + 12, n.len * step, 0.03, 3);
        if (s % 2 === 0) e.shaker(t, s === 0 ? 0.03 : 0.018, 3);
      }
    },
  },

  // El Mundo en Globo: aire libre en fa lidio, flauta, marimba y viento.
  globo: {
    bpm: 84, beats: 4, sub: 2, root: 65, minor: false, reverb: 0.45, ambient: 'wind',
    bars: [
      ['F', 'C6 - A5 - F5 - G5 A5'], ['G/F', 'B5 - - - A5 G5 - -'], ['Am', 'E5 - A5 - C6 - B5 A5'], ['C', 'G5 - - - - - . .'],
      ['Dm', 'F5 - A5 - D6 - C6 A5'], ['Bb', 'D6 - - C6 Bb5 - A5 -'], ['F/C', 'A5 - C6 - F6 - E6 C6'], ['C', 'D6 - - - C6 - - -'],
    ],
    play(e, bar, s, t, L, pass) {
      const c = bar.c, step = e.stepDur;
      if (L[0] && s === 0) e.pad(t, c.notes, step * 8 + 0.5, 0.06, 0);
      if (L[1]) { const arp = [0, 1, 2, 3, 2, 1, 0, 1]; const m = c.notes[arp[s] % c.notes.length] + (arp[s] === 3 ? 12 : 12); e.marimba(t, arp[s] === 3 ? c.notes[0] + 24 : m, step * 2, 0.06, 1); }
      const n = bar.mel[s];
      if (n && L[2]) e.flute(t, n.m, n.len * step * 0.95, 0.075, 2);
      if (L[3]) {
        if (s === 0 || s === 4) e.bass(t, c.bass, step * 3, 0.1, 3);
        if (s % 2 === 1) e.shaker(t, 0.014, 3);
        if (s === 0) e.drum(t, 0.05, 110, 3);
      }
    },
  },
};
for (const th of Object.values(THEMES)) th.bars = th.bars.map(([c, m], i) => ({ i, c: chord(c), mel: melody(m) }));

// Qué tema le corresponde a cada rompecabezas: el campo "music" del diorama o, si no lo tiene, su nombre.
export function themeFor(pz) {
  if (pz && pz.music && THEMES[pz.music]) return pz.music;
  const k = `${(pz && pz.id) || ''} ${(pz && pz.name) || ''}`.toLowerCase();
  if (/eiffel|par[ií]s/.test(k)) return 'paris';
  if (/colis|roma/.test(k)) return 'roma';
  if (/castill|hogwarts/.test(k)) return 'castillo';
  if (/faro|lighthouse/.test(k)) return 'faro';
  return 'globo';
}

// ------------------------------------------------------------------ motor
export class Music {
  constructor(ctx, out) {
    this.ctx = ctx; this.out = out;
    this.theme = null; this.themeName = '';
    this.level = 0; this.enabled = true; this.active = false;
    this.bus = ctx.createGain(); this.bus.gain.value = 0;
    this.bus.connect(out);
    // reverberación generada (ruido que decae): da espacio sin archivos de impulso
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(2.8);
    this.verbIn = ctx.createGain();
    this.verbIn.connect(this.verb).connect(this.bus);
    this.layers = LAYER_FROM.map(() => {
      const g = ctx.createGain(); g.gain.value = 0;
      g.connect(this.bus); g.connect(this.verbIn);
      return g;
    });
    this.noise = (() => {
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();
    this.ambient = null;
    this.timer = null;
  }

  impulse(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return b;
  }

  // ---------------------------------------------------- control
  setTheme(name) {
    if (!THEMES[name] || name === this.themeName) return;
    const ctx = this.ctx, now = ctx.currentTime;
    this.themeName = name; this.theme = THEMES[name];
    this.verbIn.gain.setTargetAtTime(this.theme.reverb || 0.4, now, 0.3);
    this.stepDur = this.theme.bpm ? 60 / this.theme.bpm / this.theme.sub : 0.25;
    this.stepsPerBar = this.theme.bpm ? this.theme.beats * this.theme.sub : 1;
    this.step = 0;
    this.nextTime = now + 0.6; // pequeño silencio entre temas
    // el colchón de capas vuelve a crecer desde cero
    for (const g of this.layers) { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0, now, 0.15); }
    this.setAmbient(this.theme.ambient);
    this.apply();
    if (this.onTheme) this.onTheme(this.theme);
  }
  setLevel(p) { this.level = p; this.apply(); }
  setEnabled(on) { this.enabled = on; this.apply(); }
  setActive(on) { this.active = on; this.apply(); }

  apply() {
    const ctx = this.ctx, now = ctx.currentTime, on = this.enabled && this.active;
    this.bus.gain.setTargetAtTime(on ? 0.6 : 0, now, on ? 0.8 : 0.4); // de fondo: por debajo de los efectos
    this.layers.forEach((g, i) => g.gain.setTargetAtTime(on && this.level >= LAYER_FROM[i] ? 1 : 0, now, 1.2));
    if (this.ambientGain) {
      const base = this.theme && this.theme.ambient === 'waves' ? 0.05 + 0.3 * this.level : 0.06 + 0.06 * this.level;
      this.ambientGain.gain.setTargetAtTime(this.active ? base : 0, now, 0.8);
    }
    if (on && this.theme && this.theme.bars.length && !this.timer) {
      if (this.nextTime < now) this.nextTime = now + 0.1;
      this.timer = setInterval(() => this.schedule(), 25);
    } else if ((!on || !this.theme || !this.theme.bars.length) && this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  // Programa con un poco de anticipación todas las notas de los próximos 150 ms.
  schedule() {
    const th = this.theme, ctx = this.ctx;
    if (!th || !th.bars.length) return;
    if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.05; // tras una pausa, no ponerse al día de golpe
    const L = LAYER_FROM.map((from) => this.level >= from);
    while (this.nextTime < ctx.currentTime + 0.15) {
      const barIdx = Math.floor(this.step / this.stepsPerBar), s = this.step % this.stepsPerBar;
      const bar = th.bars[barIdx % th.bars.length], pass = Math.floor(barIdx / th.bars.length);
      try { th.play(this, bar, s, this.nextTime, L, pass); } catch (e) { console.warn(e); }
      this.step++;
      this.nextTime += this.stepDur;
    }
  }

  // Fondo continuo de ruido filtrado: olas (Faro), viento (aire libre) o noche quieta (castillo).
  setAmbient(kind) {
    const ctx = this.ctx;
    if (this.ambient) {
      const old = this.ambient, g = this.ambientGain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => { try { old.forEach((n) => n.stop && n.stop()); } catch (e) { /* ya parado */ } g.disconnect(); }, 2500);
      this.ambient = null; this.ambientGain = null;
    }
    if (!kind) return;
    const src = ctx.createBufferSource();
    // ruido "marrón" (más grave que el blanco), en bucle
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(), sway = ctx.createGain(), lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    const g = ctx.createGain(); g.gain.value = 0;
    if (kind === 'waves') { f.type = 'lowpass'; f.frequency.value = 700; sway.gain.value = 0.55; lfo.frequency.value = 0.11; lfoG.gain.value = 0.4; }
    else if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6; sway.gain.value = 0.6; lfo.frequency.value = 0.07; lfoG.gain.value = 0.35; }
    else { f.type = 'lowpass'; f.frequency.value = 300; sway.gain.value = 0.35; lfo.frequency.value = 0.05; lfoG.gain.value = 0.15; }
    lfo.connect(lfoG).connect(sway.gain);
    src.connect(f).connect(sway).connect(g).connect(this.out); // el ambiente suena aunque la música esté apagada
    src.start(); lfo.start();
    this.ambient = [src, lfo]; this.ambientGain = g;
  }

  // ---------------------------------------------------- instrumentos
  // Todos reciben: tiempo de inicio, nota(s) MIDI, duración (s), volumen y capa de salida.
  env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + rel);
    return t + Math.max(a, dur) + rel + 0.05;
  }
  osc(type, freq, t, end, to, detune = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.connect(to); o.start(t); o.stop(end);
    return o;
  }
  // celesta / caja de música
  bell(t, m, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), f = mtof(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.4);
    g.connect(this.layers[layer]);
    const end = t + dur + 1.5;
    this.osc('sine', f, t, end, g);
    const h = ctx.createGain(); h.gain.setValueAtTime(0.35, t); h.gain.exponentialRampToValueAtTime(0.001, t + 0.25); h.connect(g);
    this.osc('sine', f * 4, t, t + 0.3, h);
    const h2 = ctx.createGain(); h2.gain.value = 0.12; h2.connect(g);
    this.osc('sine', f * 2.01, t, end, h2);
  }
  // arpa / lira: diente de sierra con filtro que se cierra
  pluck(t, m, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter(), f = mtof(m);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, f * 8), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
    lp.connect(g).connect(this.layers[layer]);
    const end = t + dur + 1;
    this.osc('triangle', f, t, end, lp); this.osc('sawtooth', f, t, end, lp, 4);
  }
  marimba(t, m, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), f = mtof(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    g.connect(this.layers[layer]);
    this.osc('sine', f, t, t + 0.6, g);
    const h = ctx.createGain(); h.gain.setValueAtTime(0.25, t); h.gain.exponentialRampToValueAtTime(0.001, t + 0.08); h.connect(g);
    this.osc('sine', f * 3.9, t, t + 0.1, h);
  }
  // cuerdas suaves: dos dientes de sierra desafinados por nota, filtrados
  pad(t, notes, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.3;
    const end = this.env(g, t, 0.9, v / Math.sqrt(notes.length), dur, 1.4);
    lp.connect(g).connect(this.layers[layer]);
    for (const m of notes) { this.osc('sawtooth', mtof(m), t, end, lp, -7); this.osc('sawtooth', mtof(m), t, end, lp, 7); }
  }
  // coro "aah": diente de sierra por dos formantes
  choir(t, notes, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), sum = ctx.createGain();
    const end = this.env(g, t, 1.1, v, dur, 1.2);
    for (const [fq, q, k] of [[730, 7, 1], [1090, 8, 0.6], [2440, 10, 0.25]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
      const kg = ctx.createGain(); kg.gain.value = k * 3;
      sum.connect(bp).connect(kg).connect(g);
    }
    g.connect(this.layers[layer]);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = 9;
    vib.connect(vg); vib.start(t); vib.stop(end);
    for (const m of notes) for (const d of [-9, 9]) { const o = this.osc('sawtooth', mtof(m), t, end, sum, d); vg.connect(o.detune); }
  }
  // acordeón (musette: dos voces desafinadas) u oboe antiguo
  reed(t, m, dur, v, layer, bright = 1, musette = false) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter(), f = mtof(m);
    lp.type = 'lowpass'; lp.frequency.value = 900 + 2200 * bright; lp.Q.value = 1.2;
    const end = this.env(g, t, 0.025, v, dur, 0.09);
    lp.connect(g).connect(this.layers[layer]);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.5; vg.gain.value = 6;
    vib.connect(vg); vib.start(t); vib.stop(end);
    const a = this.osc('sawtooth', f, t, end, lp, musette ? -11 : -3), b = this.osc(musette ? 'sawtooth' : 'square', f, t, end, lp, musette ? 11 : 3);
    vg.connect(a.detune); vg.connect(b.detune);
  }
  flute(t, m, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), f = mtof(m);
    const end = this.env(g, t, 0.07, v, dur, 0.18);
    g.connect(this.layers[layer]);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5;
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(10, t + 0.35);
    vib.connect(vg); vib.start(t); vib.stop(end);
    const o = this.osc('sine', f, t, end, g); vg.connect(o.detune);
    const h = ctx.createGain(); h.gain.value = 0.12; h.connect(g);
    const o2 = this.osc('triangle', f * 2, t, end, h); vg.connect(o2.detune);
    // soplo: ruido filtrado al ataque
    const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = this.noise; bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
    ng.gain.setValueAtTime(v * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    n.connect(bp).connect(ng).connect(this.layers[layer]); n.start(t); n.stop(t + 0.15);
  }
  // metales que crecen (filtro que se abre)
  brass(t, notes, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(1900, t + 0.35); lp.frequency.linearRampToValueAtTime(900, t + dur);
    const end = this.env(g, t, 0.28, v / Math.sqrt(notes.length), dur, 0.5);
    lp.connect(g).connect(this.layers[layer]);
    for (const m of notes) { this.osc('sawtooth', mtof(m), t, end, lp, -5); this.osc('sawtooth', mtof(m), t, end, lp, 5); }
  }
  bass(t, m, dur, v, layer) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter(), f = mtof(m);
    lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
    lp.connect(g).connect(this.layers[layer]);
    this.osc('triangle', f, t, t + dur + 0.35, lp); this.osc('sine', f, t, t + dur + 0.35, lp);
  }
  // tambor de marco / timbal suave
  drum(t, v, pitch, layer) {
    const ctx = this.ctx, g = ctx.createGain(), o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(pitch * 1.9, t); o.frequency.exponentialRampToValueAtTime(pitch, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(this.layers[layer]); o.start(t); o.stop(t + 0.6);
    const n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = this.noise; lp.type = 'lowpass'; lp.frequency.value = 900;
    ng.gain.setValueAtTime(v * 0.4, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(lp).connect(ng).connect(this.layers[layer]); n.start(t); n.stop(t + 0.08);
  }
  noiseHit(t, v, type, freq, decay, layer) {
    const ctx = this.ctx, n = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noise; fl.type = type; fl.frequency.value = freq; fl.Q.value = 1;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    n.connect(fl).connect(g).connect(this.layers[layer]);
    const off = Math.random() * 0.5; n.start(t, off); n.stop(t + decay + 0.02);
  }
  tek(t, v, layer) { this.noiseHit(t, v, 'bandpass', 2600, 0.07, layer); }
  shaker(t, v, layer) { this.noiseHit(t, v, 'highpass', 6500, 0.05, layer); }
}
