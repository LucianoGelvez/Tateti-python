// Sonido sintetizado con WebAudio: sin archivos externos.
// Efectos (agarrar, soltar, encastrar, completar) + la música de fondo de cada diorama (js/music.js).
import { Music } from './music.js';

export class Sfx {
  constructor() {
    this.ctx = null; this.muted = false; this.progress = 0;
    this.music = null; this.musicOn = true; this.musicActive = false; this.themeName = 'faro';
    this.setKey(67, false); // sol mayor hasta que haya un tema
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.music = new Music(ctx, this.master);
    this.music.onTheme = (th) => { if (th.root) this.setKey(th.root, th.minor); };
    this.music.setEnabled(this.musicOn);
    this.music.setTheme(this.themeName);
    this.music.setLevel(this.progress);
    this.music.setActive(this.musicActive);
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }
  // Música: tema del diorama, encendida/apagada (ajuste) y activa (si hay algo en pantalla para acompañar).
  setTheme(name) { this.themeName = name; if (this.music) this.music.setTheme(name); }
  setMusicOn(on) { this.musicOn = on; if (this.music) this.music.setEnabled(on); }
  setMusicActive(on) { this.musicActive = on; if (this.music) this.music.setActive(on); }

  setProgress(p) {
    this.progress = p;
    if (this.music) this.music.setLevel(p);
  }

  // Los sonidos de encastre siguen la tonalidad del tema que suena.
  setKey(root, minor) {
    this.keyRoot = root; this.minor = minor;
    const pent = minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
    this.scale = [...pent, ...pent.map((x) => x + 12), 24];
  }
  hz(semi) { return 440 * Math.pow(2, (this.keyRoot - 69 + semi) / 12); }

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

  pick() { this.tone(this.hz(12), 0, 0.07, 'sine', 0.07); }
  drop() { this.tone(this.hz(0), 0, 0.09, 'sine', 0.06); }

  snap() {
    const step = this.scale[Math.min(this.scale.length - 1, Math.floor(this.progress * this.scale.length))];
    const f = this.hz(step);
    this.tone(f, 0, 0.35, 'triangle', 0.2);
    this.tone(f * 1.5, 0.06, 0.45, 'sine', 0.12);
  }

  complete() {
    const third = this.minor ? 3 : 4;
    [0, third, 7, 12, 12 + third, 19, 24].forEach((s, i) => this.tone(this.hz(s), i * 0.11, 1.2, 'triangle', 0.16));
  }
}
