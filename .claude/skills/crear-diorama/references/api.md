# Referencia: construcción y efectos

Contenido:
1. Estructura de un archivo de diorama
2. Herramientas de construcción (`makeBuilder`)
3. Recetas frecuentes
4. Catálogo de efectos vivos (`features`)
5. Cómo agregar un tipo de efecto nuevo

## 1. Estructura de un archivo de diorama

```js
// js/dioramas/molino.js
import * as THREE from '../vendor/three.module.js';
import { makeBuilder, smooth } from './builder.js';

export function buildMolino(seed = 31) {
  const { rng, fbm, features, jitter, addTri, addGeo, addRod, finish } = makeBuilder(seed);
  // ... geometría con addGeo / addTri / addRod ...
  // ... features.push({ type: '...', pos: [x, y, z], ... }) ...
  return finish('El Molino');   // nombre que se ve en el menú
}
```

Registro en `js/dioramas/index.js`:

```js
import { buildMolino } from './molino.js';
// ...
  { id: 'molino', name: 'El Molino', build: buildMolino },
```

Elegir una semilla (`seed`) distinta de las ya usadas para que el ruido no repita formas.

**Música.** Cada entrada puede llevar `music: '<tema>'` con uno de los temas de `js/music.js`:
`faro` (solo olas), `castillo` (vals misterioso), `roma` (marcha antigua), `paris` (vals musette
de acordeón) o `globo` (aire libre, flauta). Sin ese campo se elige por el nombre o el `id`
(eiffel/parís → `paris`, coliseo/roma → `roma`, castillo/hogwarts → `castillo`) y, si nada
coincide, `globo`. Si ningún tema le queda bien al lugar, se puede componer uno nuevo en
`js/music.js` siguiendo el formato de los existentes (melodías originales, nunca copiadas).

## 2. Herramientas de construcción

`makeBuilder(seed)` devuelve:

| Herramienta | Qué hace |
|---|---|
| `rng()` | Número al azar entre 0 y 1, repetible. Es la única fuente de azar permitida. |
| `fbm(x, y)` | Ruido suave entre 0 y 1 (para relieve, manchas, costas). Multiplicar las coordenadas para cambiar la frecuencia: `fbm(x * 14, z * 14)`. |
| `jitter(hex, amt = 0.06)` | Color `[r, g, b]` a partir de un hex, con una variación de brillo al azar. Es lo que da el aspecto low‑poly facetado. |
| `rgbOf(hex, k = 1)` | Color `[r, g, b]` exacto, multiplicado por `k`. |
| `addGeo(geometria, hex, opciones)` | Hornea cualquier geometría de three.js en el modelo. |
| `addTri(a, b, c, rgb, haciaDonde)` | Agrega un triángulo suelto (para terrenos y formas a medida). |
| `addRod(a, b, radio, hex, lados = 5)` | Varilla o cuerda entre dos puntos `[x, y, z]`. |
| `features` | Lista donde se anotan los efectos vivos. |
| `finish(nombre)` | Cierra el modelo; es lo que devuelve `build`. |
| `stats()` | `{ triangles }` acumulados hasta el momento (útil para vigilar el presupuesto). |

También se exportan `smooth(t)` (suavizado 0..1 con tope, para mezclar alturas) y
`makeNoise(seed)` desde `builder.js`.

### `addGeo(geometria, hex, { p, r, q, s, amt, colorFn })`

- `geometria`: cualquier `THREE.*Geometry` (Box, Cylinder, Cone, Sphere, Icosahedron, Torus,
  Lathe, Extrude…). Se consume: no reutilizar el mismo objeto en dos llamadas.
- `p`: posición `[x, y, z]`. `r`: giro `[rx, ry, rz]` en radianes. `q`: giro como cuaternión
  (tiene prioridad sobre `r`). `s`: escala `[sx, sy, sz]`, siempre positiva.
- `amt`: cuánta variación de brillo por triángulo (0.03 para superficies lisas como paredes,
  0.08–0.1 para roca y follaje).
- `colorFn(va, vb, vc)`: en lugar de un color único, calcula el color de cada triángulo a
  partir de sus tres vértices (ya transformados). Devuelve `[r, g, b]`, normalmente con
  `jitter(...)`. Sirve para rayas, damero, bandas por altura. Los tres vectores se reciclan:
  leerlos en el momento, no guardarlos.

Para ahorrar triángulos, los cilindros y conos cuyas tapas quedan ocultas se crean abiertos
(último argumento `true`). Si la tapa se ve, dejarla cerrada.

### `addTri(a, b, c, rgb, haciaDonde)`

`a`, `b`, `c` son `THREE.Vector3`. `haciaDonde` (opcional) es un vector hacia el lado visible;
si se pasa, el triángulo se orienta solo. Sin él, el orden de los vértices decide la cara.
Usarlo siempre en terrenos (`new THREE.Vector3(0, 1, 0)`).

## 3. Recetas frecuentes

**Terreno con relieve.** Definir una función `altura(x, z)` y recorrer una rejilla (polar para
bases redondas, como en `faro.js`; cuadrada para bases rectangulares) creando dos triángulos
por celda con `addTri`. Colorear cada triángulo según altura y pendiente (arena, pasto, roca).
Cerrar siempre con costados y fondo.

**Explanada bajo un edificio.** Mezclar la altura hacia un valor fijo cerca del edificio:

```js
const k = smooth((r1 - dist) / (r1 - r0));   // 1 dentro de r0, 0 fuera de r1
h += (alturaPlana - h) * k;
```

`r0` debe superar el contorno del edificio en al menos una celda de la rejilla. Luego apoyar
el edificio en `alturaPlana` y añadir cimientos hundidos (ver `faro.js`, `LH` y `HS`).

**Edificio.** Cuerpo con `BoxGeometry` o `CylinderGeometry`; tejado a dos aguas con un prisma
(un cilindro de 3 lados girado, como en `faro.js`) o a cuatro aguas con `ConeGeometry` de 4
lados girado 45°; puertas y ventanas como cajas de 4–6 mm de fondo centradas en la pared.

**Torres y cúpulas.** `CylinderGeometry` con radios distintos arriba y abajo para dar conicidad;
`ConeGeometry` para chapiteles; `SphereGeometry(r, 10, 6, 0, 2π, 0, π/2)` para media esfera;
`LatheGeometry` para perfiles torneados (balaustres, jarrones, cúpulas bulbosas).

**Vegetación.** Pino: tronco + tres conos apilados girados al azar. Árbol redondo: tronco + uno
o dos icosaedros `IcosahedronGeometry(r, 0)`. Arbustos y rocas: icosaedros aplastados y girados.
Colocarlos con un bucle que descarte posiciones ocupadas, en pendiente fuerte o bajo el agua.

**Agua.** Superficie plana apenas ondulada, con color por profundidad y una franja clara de
espuma en la orilla. Sumar efectos `sparkle` repartidos sobre ella.

**Patrones.** Rayas, damero o tejas con `colorFn`, calculando el índice a partir del ángulo
(`Math.atan2`) o de la altura del centro del triángulo (ver la canasta y la boca en `globo.js`).

## 4. Catálogo de efectos vivos

Cada efecto es un objeto en `features` con `type`, `pos: [x, y, z]` (en las mismas unidades que
la geometría) y sus medidas. El juego reescala `pos`, `center`, `size`, `w` y `h` junto con el
modelo. Cada efecto se asigna a la pieza que contiene `pos`.

| `type` | Cuándo | Campos | Qué se ve |
|---|---|---|---|
| `window` | noche | `yaw`, `w`, `h` | Rectángulo de luz cálida que titila. Mira hacia +Z girado `yaw` alrededor de Y. Ponerlo 0,5 mm por delante del vidrio. |
| `beam` | noche | `size` | Linterna que brilla y dos haces giratorios de largo `14 × size` (faro, reflector). `size` ≈ radio de la linterna. |
| `flame` | siempre | `size` | Llama que arde a ráfagas, hacia arriba, con un halo que de noche ilumina alrededor. Alto ≈ `4 × size`. Antorchas, hogueras, quemadores, chimeneas de fábrica. |
| `smoke` | siempre | `size` | Bocanadas que suben unos `9 × size` y se disipan. `size` ≈ 0,008 para una chimenea doméstica. |
| `firefly` | noche | `size` | Punto de luz verdosa que deambula en un radio de `0,6 × size` (≈ 0,02). |
| `city` | noche | `size` | Punto de luz cálida fijo, con leve parpadeo. `size` es su diámetro (≈ 0,007). Faroles, ciudades lejanas, guirnaldas, ojos de buey. |
| `sparkle` | día | `size` | Chispazo blanco breve y repetido. Agua, nieve, cristales, tesoros. `size` ≈ 0,01. |
| `cloud` | siempre | `center`, `size` | Nube de cinco copos que va y viene girando despacio alrededor del eje vertical que pasa por `center`. `size` ≈ radio del copo mayor. |
| `gulls` | día | `size` | Tres pájaros que dan vueltas alrededor de `pos`, con radios de `0,7` a `1,2 × size`. Uno por diorama alcanza. |
| `brooms` | siempre | `size`, `w`?, `count`?, `speed`? | Personas volando en escoba con capa ondeando y brillo cálido nocturno, orbitando alrededor de `pos` con radio `~size`. |

Notas:
- Los puntos de luz (`firefly`, `city`, `sparkle`) que caen en una misma pieza comparten el
  tamaño del primero de su tipo: no mezclar tamaños muy distintos en zonas vecinas.
- La intensidad de cada efecto ya depende sola de la hora; no hace falta programar nada.
- Cantidades orientativas: 3–10 ventanas, 20–90 destellos, 10–25 luciérnagas, 5–10 nubes.

## 5. Cómo agregar un tipo de efecto nuevo

En `js/life.js`, dentro de `buildLife`, sumar un bloque `else if (f.type === '...')` con esta
forma (copiar la de `flame` o `cloud` como base):

```js
else if (f.type === 'rueda') {
  const root = new THREE.Group(); root.position.copy(P);   // P = posición del efecto
  // ... crear mallas con geometrías y materiales propios ...
  host.object.add(noRay(root));                            // noRay: que no estorbe al agarrar piezas
  effects.push({ host, a: 0,
    update(dt, t, night) {
      // this.a: 0..1, sube cuando la pieza anfitriona está unida a otra
      // t: segundos transcurridos; night: 0 (día) .. 1 (noche)
      root.rotation.z = t * 0.8;
      root.visible = this.a > 0.01;
    },
    dispose() { host.object.remove(root); /* y liberar geometrías y materiales */ },
  });
}
```

Reglas para que siga funcionando en el visor:
- Todo lo que se crea cuelga de `host.object` y pasa por `noRay(...)`.
- Aparecer y desaparecer con `this.a` (escala u opacidad), nunca de golpe.
- No crear objetos ni vectores dentro de `update` (corre en cada cuadro).
- Para "luz", usar `glowMat(color)` (brillo aditivo); para cuerpos sólidos, `MeshLambertMaterial`.
- Los tamaños salen de `f.size`, para que el efecto escale con el modelo.
- Si el efecto usa otro punto además de `pos` (como `center`), agregar ese campo a la lista que
  reescala `normalizeModel` en `js/loader.js`.
- Documentar el tipo nuevo en la cabecera de `js/life.js` y en la tabla de esta referencia.
