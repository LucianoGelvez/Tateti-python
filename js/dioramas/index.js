// Registro de los dioramas incluidos en el juego. El orden es el del menú.
// Para sumar uno: crear js/dioramas/<id>.js con una función build() y añadirlo a esta lista.
import { buildFaro } from './faro.js';
import { buildGlobo } from './globo.js';
import { buildCastillo } from './castillo.js';
import { buildColiseo } from './coliseo.js';
import { buildEiffel } from './eiffel.js';
import { buildTajMahal } from './tajmahal.js';
import { buildPiramides } from './piramides.js';
import { buildMachupicchu } from './machupicchu.js';
import { buildStonehenge } from './stonehenge.js';
import { buildStonehenge11 } from './stonehenge11.js';

export const DIORAMAS = [
  { id: 'faro', name: 'El Faro', build: buildFaro },
  { id: 'globo', name: 'El Mundo en Globo', build: buildGlobo },
  { id: 'castillo', name: 'El Castillo de Hogwarts', build: buildCastillo },
  { id: 'coliseo', name: 'El Coliseo Romano', build: buildColiseo },
  { id: 'eiffel', name: 'La Torre Eiffel', build: buildEiffel },
  { id: 'tajmahal', name: 'El Taj Mahal', build: buildTajMahal },
  { id: 'piramides', name: 'Las Pirámides de Egipto', build: buildPiramides, music: 'egipto' },
  { id: 'machupicchu', name: 'Machu Picchu', build: buildMachupicchu, music: 'andes' },
  { id: 'stonehenge', name: 'Stonehenge', build: buildStonehenge, music: 'celta' },
  { id: 'stonehenge11', name: 'Stonehenge 1:1', build: buildStonehenge11, music: 'celta' },
];
