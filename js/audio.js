// Sonido sintetizado con WebAudio: sin archivos externos.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // pentatónica mayor

export class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.progress = 0; }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    // ambiente: olas (ruido filtrado con vaivén lento) que crece con el progreso
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const wave = ctx.createGain(); wave.gain.value = 0.55;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain).connect(wave.gain);
    this.ambient = ctx.createGain(); this.ambient.gain.value = 0.05;
    src.connect(lp).connect(wave).connect(this.ambient).connect(this.master);
    src.start(); lfo.start();
    this.setProgress(this.progress);
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  setProgress(p) {
    this.progress = p;
    if (this.ctx) this.ambient.gain.setTargetAtTime(0.05 + 0.3 * p, this.ctx.currentTime, 0.8);
  }

  tone(freq, t0, dur, type = 'sine', vol = 0.2) {
    const ctx = this.ctx; if (!ctx) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + t0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  pick() { this.tone(520, 0, 0.07, 'sine', 0.08); }
  drop() { this.tone(300, 0, 0.09, 'sine', 0.07); }

  snap() {
    const step = SCALE[Math.min(SCALE.length - 1, Math.floor(this.progress * SCALE.length))];
    const f = 392 * Math.pow(2, step / 12);
    this.tone(f, 0, 0.35, 'triangle', 0.22);
    this.tone(f * 1.5, 0.06, 0.45, 'sine', 0.14);
  }

  complete() {
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => {
      this.tone(392 * Math.pow(2, s / 12), i * 0.11, 1.2, 'triangle', 0.18);
    });
  }
}
