// Registro de los dioramas incluidos en el juego. El orden es el del menú.
// Para sumar uno: crear js/dioramas/<id>.js con una función build() y añadirlo a esta lista.
// Campos opcionales: music (tema de js/music.js) y ground (color del suelo, p. ej. 0xdaba79; si falta,
// se toma solo el color que más ocupa el terreno de la maqueta).
import { buildFaro } from './faro.js';
import { buildMachuPicchuV2 } from './machu-picchu-v2.js';
import { buildGlobo } from './globo.js';
import { buildCastillo } from './castillo.js';
import { buildColiseo } from './coliseo.js';
import { buildEiffel } from './eiffel.js';
import { buildTajMahal } from './tajmahal.js';
import { buildPiramides } from './piramides.js';
import { buildMachupicchu } from './machupicchu.js';
import { buildStonehenge } from './stonehenge.js';
import { buildStonehenge11 } from './stonehenge11.js';
import { buildCentralPark } from './centralpark.js';

export const DIORAMAS = [
  { id: 'faro', name: 'El Faro', build: buildFaro },
  { id: 'centralpark', name: 'Central Park — Nueva York', build: buildCentralPark, music: 'newyork' },
  { id: 'machu-picchu-v2', name: 'Machu Picchu — Huayna Picchu', build: buildMachuPicchuV2, music: 'globo' },
  { id: 'globo', name: 'El Mundo en Globo', build: buildGlobo, ground: 0x8fbf7a },
  { id: 'castillo', name: 'El Castillo de Hogwarts', build: buildCastillo },
  { id: 'coliseo', name: 'El Coliseo Romano', build: buildColiseo },
  { id: 'eiffel', name: 'La Torre Eiffel', build: buildEiffel, ground: 0x6f9f55 },
  { id: 'tajmahal', name: 'El Taj Mahal', build: buildTajMahal },
  { id: 'piramides', name: 'Las Pirámides de Egipto', build: buildPiramides, music: 'egipto' },
  { id: 'machupicchu', name: 'Machu Picchu', build: buildMachupicchu, music: 'andes' },
  { id: 'stonehenge', name: 'Stonehenge', build: buildStonehenge, music: 'celta' },
  { id: 'stonehenge11', name: 'Stonehenge 1:1', build: buildStonehenge11, music: 'celta' },
];
