# Diorama 3D — El Faro

Rompecabezas tridimensional para navegador y realidad virtual (WebXR, Meta Quest).
Un diorama low‑poly —una isla con su faro, una casa, un muelle y un bote— se corta en
piezas 3D que flotan a tu alrededor. Toma una pieza, acércala a su vecina y se unen
solas; no hay un tablero fijo: armás el modelo en el aire, por partes, como prefieras.

Todo es original y procedural: el modelo, el corte en piezas y el sonido se generan
con código. No hay assets externos ni paso de compilación.

## Cómo jugar

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

| | Controles |
|---|---|
| **Ratón** | Arrastrar una pieza la mueve · arrastrar el fondo gira la cámara · rueda = zoom |
| **Modo clásico** | Clic derecho (o Mayús + arrastrar) gira la pieza · `Q` / `E` la hacen rodar |
| **Mientras arrastrás** | La rueda acerca o aleja la pieza |
| **Táctil** | Un dedo mueve piezas o la cámara · pellizco = zoom |
| **VR** | Gatillo o agarre toma la pieza (al alcance de la mano o apuntando con el rayo) · la palanca la acerca o aleja · una pieza en cada mano y juntalas |

- **Relajado:** las piezas ya vienen orientadas; solo hay que ubicarlas.
- **Clásico:** las piezas vienen giradas al azar (pensado sobre todo para VR).
- 20, 40, 80 o 150 piezas. El corte es distinto en cada partida.
- La partida se guarda sola en el navegador ("Continuar").
- Una miniatura de referencia gira sobre el pedestal; el sonido del mar crece a medida que avanzás.

## En Meta Quest

WebXR exige HTTPS, así que lo más simple es publicar el repo con **GitHub Pages**
(Settings → Pages → *Deploy from a branch*, carpeta raíz) y abrir la URL en el
navegador del visor; ahí aparece el botón **Jugar en VR**.
Para probar en local: `adb reverse tcp:8000 tcp:8000` y abrir `http://localhost:8000` en el visor.

## Cómo funciona

- `js/model.js` — construye el diorama como una sopa de triángulos coloreados.
- `js/slicer.js` — reparte semillas sobre la superficie y recorta cada triángulo contra
  las celdas de Voronoi; los cortes son planos compartidos, por eso las piezas encajan
  exactamente. También calcula qué piezas son vecinas y el punto donde se tocan.
- `js/main.js` — escena, cámara, entrada (ratón, táctil, mandos VR), encastre, guardado.
- `js/audio.js` — efectos y ambiente sintetizados con WebAudio.
- `js/vendor/` — three.js (licencia MIT).

Dos grupos se unen cuando un par de piezas vecinas queda con su punto de contacto a
menos de ~4 cm y con menos de 30° de diferencia de orientación. Con ratón la profundidad
respecto a la cámara casi no cuenta, para que se pueda jugar en una pantalla plana.

Agregar `?debug` a la URL expone `window.__game` (útil para pruebas automáticas).
