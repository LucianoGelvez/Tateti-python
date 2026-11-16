# Modelos propios

Todo archivo `.glb` que dejes en esta carpeta aparece en el menú del juego, en la lista
"Rompecabezas". También sirve una carpeta con un `.gltf` dentro (por ejemplo, un `.zip`
de Sketchfab descomprimido aquí).

- Arrancá el juego con `python3 servidor.py`: el servidor arma la lista solo.
- El nombre que se ve en el menú sale del nombre del archivo (o de la carpeta).
- Límite: 1 millón de triángulos. Cuanto más pesado el modelo, más tarda en cargar y más exige al visor;
  activá "Mostrar cuadros por segundo" en Ajustes para ver si se mantiene fluido.
- Las texturas de más de 2048 px se reducen automáticamente al cargar.

El contenido de esta carpeta **no se sube a GitHub** (está en `.gitignore`): los modelos
descargados tienen su propia licencia y suelen pesar mucho.
