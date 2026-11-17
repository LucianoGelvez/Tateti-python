# Diorama 3D

Rompecabezas 3D para navegador y WebXR (Meta Quest 3: VR, realidad mixta, mandos y manos).
Sitio estático, sin paso de compilación: three.js vendorizado en `js/vendor/`.

- El usuario juega **solo en el visor**; su prioridad es cómo se siente en las gafas.
- Hablarle en español.
- Para crear o retocar un diorama, usar la skill `crear-diorama` (`.claude/skills/crear-diorama/`).

## Mapa

- `js/main.js` — escena, entrada (ratón, mandos, manos), encastre, guardado, menú.
- `js/slicer.js` — corte del modelo en piezas (Voronoi). `js/loader.js` — modelos GLB externos.
- `js/life.js` — efectos vivos y ciclo de día y noche.
- `js/music.js` — música de fondo por diorama (sintetizada; capas que crecen con el progreso). `js/audio.js` — efectos.
- `js/environment.js` — entorno virtual (se oculta entero en realidad mixta).
- `js/vrbar.js` — barra de iconos dentro del visor (salir, realidad mixta, referencia…). `js/icons.js` — iconos.
- `js/dioramas/` — un archivo por diorama hecho por código + `builder.js` + `index.js` (menú).
- `servidor.py` — servidor local sin caché; también lista la carpeta `modelos/` (no versionada).

## Probar

No hay visor en las sesiones en la nube. Se verifica con Chromium sin ventana (Playwright ya
está instalado): `node .claude/skills/crear-diorama/scripts/preview.cjs <id>` valida un diorama
y deja capturas. Abrir la página con `?debug` expone `window.__game` para pruebas.
Decir siempre con claridad qué se probó en el navegador y qué queda por ver en el visor.

## Al entregar

Subir el número de versión en `index.html` (`#version` y los `?v=`): el usuario lo usa para
confirmar en el visor que cargó la versión nueva.
