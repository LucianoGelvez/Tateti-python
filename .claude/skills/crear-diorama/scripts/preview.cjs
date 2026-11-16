#!/usr/bin/env node
// Vista previa y validación de un diorama, sin visor.
//
//   node .claude/skills/crear-diorama/scripts/preview.cjs <id> [carpeta-de-salida]
//
// Abre el juego en un navegador sin ventana, carga el diorama <id> y:
//   - saca capturas desde varios ángulos (de día, de noche, de cerca y a ras del suelo),
//   - mide triángulos, tamaño y efectos,
//   - arma el rompecabezas entero con 50 y con 100 piezas para comprobar que todo encaja,
//   - junta los errores de la consola.
// Imprime un informe JSON y termina con código 1 si algo falla.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const id = process.argv[2];
const out = path.resolve(process.argv[3] || path.join(ROOT, '.preview', id || 'x'));
if (!id) { console.error('Uso: node preview.cjs <id-del-diorama> [carpeta-de-salida]'); process.exit(2); }

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('Falta Playwright. En una sesión en la nube ya viene instalado; en local: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/?debug`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('EXCEPCIÓN: ' + e.message));
  const report = { id, ok: false, problems: [], warnings: [] };
  try {
    await page.goto(url);
    await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
    const known = await page.evaluate(() => __game.puzzles.map((p) => p.id));
    if (!known.includes(id)) throw new Error(`El diorama "${id}" no está en js/dioramas/index.js (hay: ${known.join(', ')})`);
    const loaded = await page.evaluate((id) => __game.selectPuzzle(id), id);
    if (!loaded) throw new Error('El diorama no cargó: ' + (await page.textContent('#puzzle-note')));

    Object.assign(report, await page.evaluate(() => {
      const m = __game.model, byType = {};
      for (const f of m.features || []) byType[f.type] = (byType[f.type] || 0) + 1;
      return { name: m.name, triangles: m.positions.length / 9, sizeMeters: m.size.map((x) => +x.toFixed(3)), features: byType };
    }));
    if (report.triangles > 16000) report.problems.push(`Demasiados triángulos (${report.triangles}); el objetivo es menos de 12.000 y el tope 16.000.`);
    if (report.triangles < 1500) report.warnings.push(`Muy pocos triángulos (${report.triangles}): las piezas quedarán pobres en detalle.`);
    if (!Object.keys(report.features).length) report.warnings.push('No tiene efectos vivos (features).');
    if (report.sizeMeters[1] < 0.2) report.warnings.push('Es muy chato: menos de 20 cm de alto en el juego.');

    // --- capturas del modelo completo ---
    await page.evaluate(() => document.getElementById('menu').classList.add('hidden'));
    const shot = async (name, orbit, phase) => {
      await page.evaluate(([o, ph]) => { Object.assign(__game.orbit, o); __game.setPhase(ph); }, [orbit, phase]);
      await page.waitForTimeout(1100);
      await page.screenshot({ path: path.join(out, name + '.png') });
    };
    const D = 1.25;
    await shot('1-frente', { az: 0, pol: 1.3, dist: D }, 0.03);
    await shot('2-derecha', { az: Math.PI / 2, pol: 1.3, dist: D }, 0.03);
    await shot('3-atras', { az: Math.PI, pol: 1.3, dist: D }, 0.03);
    await shot('4-izquierda', { az: -Math.PI / 2, pol: 1.3, dist: D }, 0.03);
    await shot('5-arriba', { az: 0.4, pol: 0.45, dist: D }, 0.03);
    await shot('6-ras-del-suelo-a', { az: 0.5, pol: 1.56, dist: 0.8 }, 0.03);   // aquí se ve si algo flota
    await shot('7-ras-del-suelo-b', { az: 3.6, pol: 1.56, dist: 0.8 }, 0.03);
    await shot('8-atardecer', { az: 0.3, pol: 1.3, dist: D }, 0.27);
    await shot('9-noche', { az: 0.3, pol: 1.3, dist: D }, 0.5);

    // --- el rompecabezas: cortar, mirar las piezas y armarlo entero ---
    await page.evaluate(() => { __game.orbit.az = 0.35; __game.orbit.pol = 1.02; __game.orbit.dist = 1.85; __game.setPhase(0.03); document.getElementById('menu').classList.remove('hidden'); });
    report.puzzles = [];
    for (const count of [50, 100]) {
      await page.click(`#seg-count button[data-v="${count}"]`);
      await page.click('#btn-start');
      await page.waitForFunction(() => __game.state.playing, null, { timeout: 60000 });
      await page.waitForTimeout(500);
      if (count === 50) await page.screenshot({ path: path.join(out, '10-piezas.png') });
      const r = await page.evaluate(() => {
        const s = __game.state;
        const tris = s.pieces.map((q) => q.mesh.geometry.attributes.position.count / 3);
        const info = { pieces: s.total, effects: __game.life.count, minTriangles: Math.min(...tris), tinyPieces: tris.filter((t) => t < 6).length, isolatedPieces: s.pieces.filter((q) => q.neighbors.size === 0).length };
        let n = 0;
        while (s.groups.size > 1 && n < 1000) { if (!__game.solveStep()) break; n++; }
        info.solved = s.complete;
        return info;
      });
      report.puzzles.push({ count, ...r });
      if (!r.solved) report.problems.push(`Con ${count} piezas el rompecabezas no se pudo armar entero.`);
      if (r.isolatedPieces) report.problems.push(`Con ${count} piezas hay ${r.isolatedPieces} piezas sin vecinas.`);
      if (r.tinyPieces > count * 0.1) report.warnings.push(`Con ${count} piezas, ${r.tinyPieces} son diminutas (menos de 6 triángulos): suele indicar partes sueltas o muy finas.`);
      if (count === 50) { await page.waitForTimeout(2500); await page.evaluate(() => document.getElementById('done').classList.add('hidden')); await page.screenshot({ path: path.join(out, '11-armado.png') }); }
      await page.evaluate(() => { document.getElementById('btn-again').click(); });
      await page.waitForTimeout(200);
    }
  } catch (e) {
    report.problems.push(String(e.message || e));
  }
  for (const e of errors) if (!/ReadPixels|GPU stall/.test(e)) report.problems.push('Consola: ' + e);
  report.ok = report.problems.length === 0;
  report.screenshots = out;
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.close();
  process.exit(report.ok ? 0 : 1);
})();
