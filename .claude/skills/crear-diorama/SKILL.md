---
name: crear-diorama
description: Crea un diorama nuevo, hecho por código y con efectos vivos (luces, humo, llamas, nubes, día y noche), para el juego de rompecabezas 3D de este repositorio (Tiny Worlds VR, WebXR para Meta Quest). Usar SIEMPRE que el usuario pida un diorama, modelo, puzzle, rompecabezas, escena o lugar nuevo para el juego — "quiero que creemos el castillo de…", "hagamos un diorama de la casa de…", "agregá un molino", "otro puzzle", "un modelo nuevo" — y también cuando pida mejorar, retocar o corregir la estética o los efectos de un diorama existente, aunque no diga la palabra "diorama".
---

# Crear un diorama para Tiny Worlds VR

El juego corta un modelo 3D en piezas y el jugador lo arma en VR o realidad mixta. Los dioramas
propios se generan **con código** (no hay Blender ni archivos de modelo): cada uno es un archivo
`js/dioramas/<id>.js` que construye una "sopa de triángulos" de colores planos, estilo low‑poly,
más una lista de **efectos vivos** que despiertan a medida que se arma.

El resultado de esta skill es: un archivo de diorama nuevo, registrado en el menú, verificado con
capturas, y subido a la rama de trabajo.

## Qué ve el jugador (y por qué importa al modelar)

- El jugador sostiene piezas de unos 5–15 cm a 30 cm de la cara, las gira y las mira **por todos
  lados, también desde abajo**. Lo que en una captura lejana pasa desapercibido (una casa que no
  toca el suelo, una pared sin fondo) en el visor se nota muchísimo.
- El corte es por regiones del espacio (celdas de Voronoi): cada pieza es un trozo de cáscara del
  modelo. Las caras traseras se ven como interior oscuro. Por eso conviene que todo parezca sólido.
- Nada de la geometría se mueve. Todo lo que tenga vida (luz, humo, fuego, pájaros, nubes) es un
  **efecto** anclado a un punto; el efecto cuelga de la pieza que contiene ese punto y se enciende
  cuando esa pieza se une a otra. Hay además un ciclo de día y noche automático.
- Zonas grandes de un solo color dan piezas indistinguibles y frustrantes. Un buen puzzle tiene
  referencias por todas partes: cada pieza debería contener algo reconocible.

## Flujo de trabajo

1. **Entender el pedido y planificar.** Antes de escribir código, anotar (en el chat, breve):
   la silueta general, 5 a 8 elementos reconocibles que lo vuelven "ese lugar", la paleta, la
   base sobre la que se apoya y los efectos vivos de día y de noche. Si es un lugar real o de
   ficción y no se recuerdan bien sus rasgos, buscar referencias en la web primero.
2. **Leer `references/api.md`** (herramientas de construcción y catálogo de efectos) y, la primera
   vez, mirar `assets/plantilla.js` y un diorama real: `js/dioramas/faro.js` (terreno, edificios)
   o `js/dioramas/globo.js` (formas con patrón de color calculado).
3. **Escribir `js/dioramas/<id>.js`** exportando `build<Nombre>(seed)`. El `id` va en minúsculas,
   sin espacios ni acentos.
4. **Registrarlo** en `js/dioramas/index.js` (import + una línea en `DIORAMAS`), con el tema de
   música que le corresponda (`music`, ver `references/api.md`).
5. **Previsualizar y validar:**
   ```bash
   node .claude/skills/crear-diorama/scripts/preview.cjs <id>
   ```
   Imprime un informe y deja capturas en `.preview/<id>/`. **Hay que abrir las capturas** (con
   Read) y mirarlas con ojo crítico; el informe solo detecta fallos mecánicos.
6. **Iterar.** El primer intento casi nunca queda bien. Corregir y volver a previsualizar hasta
   que pase la lista de control de abajo. Lo normal son 2 a 4 vueltas.
7. **Subir.** Aumentar el número de versión en `index.html` (el texto de `#version` y los
   `?v=` de `style.css` y `main.js`), para que el usuario pueda confirmar en el visor que tiene
   la versión nueva. Hacer commit y push a la rama de trabajo de la sesión. No abrir un pull
   request salvo que lo pidan.
8. **Informar** qué se construyó, qué efectos tiene, y dejar claro que se verificó en un
   navegador sin visor: cómo se siente en las gafas solo lo puede decir el usuario.

## Reglas del motor

Estas no son preferencias: salirse de ellas rompe el juego o el rendimiento en el Quest.

- **Presupuesto: 6.000 a 12.000 triángulos; tope 16.000.** Cada pieza es una llamada de dibujo y
  el corte añade alrededor de un 40 % de triángulos. Las esferas y los toros son caros: usar
  pocos segmentos (8 a 12 lados alcanza para casi todo).
- **Solo `rng()` para el azar, nunca `Math.random()`.** Las partidas guardadas reconstruyen el
  modelo y lo vuelven a cortar; si la geometría cambia entre una carga y otra, las piezas
  guardadas ya no coinciden.
- **Ejes y tamaño.** Y hacia arriba; el frente del diorama mira hacia +Z (hacia el jugador). Las
  unidades son libres: al cargar, el juego centra el modelo y lo escala para que mida 50 cm de
  ancho y como máximo 62 cm de alto. Conviene modelar con un ancho total de unos 0,6 a 0,7
  unidades, porque así los tamaños de efectos de los ejemplos sirven tal cual.
- **Sin escalas negativas** en `addGeo` (invierten las caras y se verían como interior).
- **Los efectos son decorado barato:** pocos objetos, sin luces reales de three.js (la escena
  solo tiene sol y luz ambiente), materiales con brillo aditivo para simular luz.

## Reglas de diseño

Cada una viene de un defecto real que el usuario vio en el visor.

- **Todo apoyado.** Ningún edificio, árbol ni objeto puede quedar en el aire. Aplanar el terreno
  debajo de cada construcción y, además, darle cimientos que se hundan 1 a 2 cm en el suelo. En
  una ladera, la mitad de la base queda flotando si no se hace esto.
- **Una base con cuerpo.** El diorama descansa sobre algo: una isla con su mar, un peñón, una
  plataforma, una nube. La base cierra por abajo (nada de terreno fino como papel).
- **Volúmenes, no láminas.** Puertas, ventanas, carteles y banderas son cajas finas que
  sobresalen 2 mm, no planos sueltos: un plano se ve oscuro por detrás.
- **Variedad por todas partes.** Repartir puntos de referencia (texturas de color, objetos,
  vegetación, caminos) para que no haya regiones grandes idénticas. Variar el color por
  triángulo con `jitter` y alternar dos o tres tonos por material.
- **Detalle legible.** A la escala final, lo que mide menos de 3 o 4 mm no se distingue. Mejor
  pocos elementos bien proporcionados y algo exagerados que muchos diminutos.
- **Piezas finas, pocas.** Cuerdas, antenas y barandas (con `addRod`) dan piezas frágiles y
  raras; usarlas con moderación y con al menos 1,5 mm de radio.
- **Vida de día y de noche.** Un diorama logrado tiene algo que mirar en las dos mitades del
  ciclo: de día humo, destellos, pájaros, nubes; de noche ventanas, faroles, luciérnagas, fuego.
  No modelar como geometría fija lo que va a ser un efecto (no hacer "humo" con esferas quietas).
- **Efectos locales.** Un efecto pertenece a una sola pieza. Si se aleja mucho de su punto de
  anclaje, se ve raro mientras el puzzle está a medio armar.

## Lista de control antes de subir

Mirando las capturas de `.preview/<id>/`:

- `6-ras-del-suelo-*`: ¿algo flota o deja ver un hueco debajo? ¿La base cierra bien?
- `1` a `4`: ¿se reconoce el lugar desde los cuatro lados, o tiene una "espalda" vacía?
- `5-arriba`: ¿hay zonas grandes de un solo color?
- `9-noche` y `8-atardecer`: ¿las luces aparecen donde deben y con un tamaño razonable?
- `10-piezas`: ¿las piezas se ven sólidas y variadas?
- Informe: `ok: true`, sin `problems`; leer los `warnings` y decidir si son aceptables.

Si se tocó `js/life.js` (un efecto nuevo), correr también la vista previa de `faro` y `globo`
para comprobar que no se rompieron.

## Efectos nuevos

Si el pedido necesita un efecto que no existe (una noria que gira, un tren, lluvia, un dragón
volando), se agrega en `js/life.js` siguiendo las indicaciones del final de `references/api.md`.
Antes de crear uno, ver si alguno existente sirve con otro tamaño o color.

## Derechos: qué se puede subir al repositorio

Tiny Worlds VR se va a vender en la Meta Horizon Store, así que lo que entra al repositorio tiene
que poder venderse:

- **Lugares de películas, series o juegos** (castillos de sagas, casas de series, naves…): no van
  al repositorio, ni siquiera con otro nombre si el lugar es reconocible. Si el usuario quiere uno
  para jugar él, se arma solo en su copia local y no se registra en `js/dioramas/index.js` del
  repositorio. Para el catálogo, crear una versión propia inspirada en el género (un castillo de
  fantasía original), con forma distinta, no solo un nombre distinto.
- **Monumentos con derechos de imagen:** algunos tienen restricciones aunque sean famosos. El
  Cristo Redentor (los derechos los reclama el Arzobispado de Río) queda afuera; la Torre Eiffel
  de día no tiene problema, pero su iluminación nocturna sí (no reproducir el centelleo ni el
  faro giratorio de la cima). Ante la duda con un monumento moderno (del siglo XX en adelante),
  consultarlo con el usuario antes de modelarlo.
- **Nada de logotipos, tipografías, personajes ni arte oficial** de terceros.
- **Música:** siempre melodías originales.
