# Diorama 3D — El Faro

Rompecabezas tridimensional para navegador y realidad virtual (WebXR, Meta Quest).
Un diorama low‑poly —una isla con su faro, o un globo aerostático cuya vela es el planeta
Tierra— se corta en
piezas 3D que flotan a tu alrededor. Toma una pieza, acércala a su vecina y se unen
solas; no hay un tablero fijo: armás el modelo en el aire, por partes, como prefieras.

El diorama incluido, el corte en piezas y el sonido se generan con código, y también
podés cargar tus propios modelos 3D. No hay paso de compilación.

## Cómo jugar

```bash
python3 servidor.py
# abrir http://localhost:8000
```

| | Controles |
|---|---|
| **Ratón** | Arrastrar una pieza la mueve · arrastrar el fondo gira la cámara · rueda = zoom |
| **Modo clásico** | Clic derecho (o Mayús + arrastrar) gira la pieza · `Q` / `E` la hacen rodar |
| **Mientras arrastrás** | La rueda acerca o aleja la pieza |
| **Táctil** | Un dedo mueve piezas o la cámara · pellizco = zoom |
| **VR con mandos** | Gatillo o agarre toma la pieza (al alcance de la mano o apuntando con el rayo; viaja sola hasta la mano) · la palanca la aleja o acerca |
| **Realidad mixta** | Las piezas flotan en tu habitación real (Quest 3). Se elige en el menú ("Dónde jugar") o se alterna dentro del visor, sin salir |
| **Modelo terminado** | Se puede agrandar o achicar: botones de lupa (barra del visor o de la página), agarrándolo con las dos manos y separándolas, o con la palanca del mando hacia los lados mientras se lo sostiene. El botón del medio lo devuelve a su tamaño y lugar |
| **Barra de iconos** | Flota sobre la zona de armado dentro del visor: salir, realidad mixta, miniatura de referencia, reordenar piezas, sonido, día y noche, nueva partida. Se apunta con el rayo y se pulsa con gatillo o pinza |
| **VR con las manos** | Sin mandos: pinza (pulgar + índice) sobre la pieza, o apuntarla con el rayo y hacer pinza |

Las piezas se unen **al soltarlas**. La pieza agarrada conserva su color; un aclarado muy
leve (y una vibración en el mando) avisa cuando ya está a punto de encajar. En VR la pieza sigue a la mano con total libertad (posición y giro).

- **Relajado:** las piezas empiezan bien orientadas.
- **Clásico:** las piezas empiezan giradas al azar.
- **Ajustes:** el cronómetro está oculto por defecto; se activa con "Mostrar el tiempo".
- 25, 50 o 100 piezas. El corte es distinto en cada partida.
- La partida se guarda sola en el navegador ("Continuar").
- Una miniatura de referencia gira sobre el pedestal; el sonido del mar crece a medida que avanzás.

## Dioramas vivos

El diorama cobra vida a medida que lo armás: cada efecto está anclado a una pieza y se
enciende cuando esa pieza ya está unida a otra. En El Mundo en Globo: la llama del quemador
(que de noche ilumina la vela), las luces de las ciudades, nubes a la deriva y destellos en
los océanos. En El Faro: el haz giratorio del faro,
ventanas iluminadas y luciérnagas de noche; humo en la chimenea, destellos en el agua y
gaviotas de día. Además hay un ciclo de día y noche (se puede apagar en Ajustes).

Los efectos se declaran junto al modelo como una lista de puntos (`features` en
`js/dioramas/<id>.js`) y los dibuja `js/life.js`. Los modelos descargados solo reciben el ciclo
de día y noche: sus detalles vivos habría que definirlos a mano, uno por uno.

## Modelos propios

Además de El Faro, el juego convierte en rompecabezas cualquier modelo 3D `.glb` / `.gltf`,
con texturas incluidas (por ejemplo, escaneos de lugares reales descargados de Sketchfab).
Dejá el archivo en la carpeta `modelos/` y arrancá con `python3 servidor.py`: aparece en la
lista "Rompecabezas" del menú. Detalles y límites en [`modelos/LEEME.md`](modelos/LEEME.md).

Esa carpeta no se sube a GitHub: cada modelo descargado tiene su propia licencia.

## En Meta Quest

WebXR exige HTTPS, así que lo más simple es publicar el repo con **GitHub Pages**
(Settings → Pages → *Deploy from a branch*, carpeta raíz) y abrir la URL en el
navegador del visor; ahí aparece el botón **Jugar en VR**.
Para jugar con las manos hay que tener activado el seguimiento de manos en los ajustes del visor
y aceptar el permiso que pide el navegador al entrar; se puede alternar entre mandos y manos en plena partida.
Para probar en local: `adb reverse tcp:8000 tcp:8000` y abrir `http://localhost:8000` en el visor.

## Cómo funciona

- `js/dioramas/` — un archivo por diorama hecho por código (El Faro, El Mundo en Globo, El Castillo, El Coliseo), más `builder.js` (herramientas comunes) e `index.js` (la lista del menú).
- `js/environment.js` — el entorno virtual (pradera, plataforma, árboles, montañas, nubes, astros).
- `js/vrbar.js` — la barra de iconos flotante dentro del visor. `js/icons.js` — los iconos.
- `js/loader.js` — carga modelos glTF/GLB (texturas, Draco, Meshopt) y los lleva al mismo formato.
- `js/slicer.js` — reparte semillas sobre la superficie y recorta cada triángulo contra
  las celdas de Voronoi; los cortes son planos compartidos, por eso las piezas encajan
  exactamente. También calcula qué piezas son vecinas y el punto donde se tocan.
- `js/main.js` — escena, cámara, entrada (ratón, táctil, mandos VR), encastre, guardado.
- `js/audio.js` — efectos sintetizados con WebAudio.
- `js/music.js` — música de fondo generativa: un tema original por diorama, que suma instrumentos a medida que se arma.
- `js/vendor/` — three.js y sus complementos (licencia MIT). `assets/hands/` — malla de mano de WebXR (MIT).

Al soltar una pieza, dos grupos se unen si un par de piezas vecinas queda con su punto de contacto a
menos de ~4 cm y con menos de 30° de diferencia de orientación. Con ratón la profundidad
respecto a la cámara casi no cuenta, para que se pueda jugar en una pantalla plana.

Agregar `?debug` a la URL expone `window.__game` (útil para pruebas automáticas).
