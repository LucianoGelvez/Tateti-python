// Registro de los dioramas incluidos en el juego. El orden es el del menú.
// Para sumar uno: crear js/dioramas/<id>.js con una función build() y añadirlo a esta lista.
import { buildFaro } from './faro.js';
import { buildGlobo } from './globo.js';
import { buildCastillo } from './castillo.js';

export const DIORAMAS = [
  { id: 'faro', name: 'El Faro', build: buildFaro },
  { id: 'globo', name: 'El Mundo en Globo', build: buildGlobo },
  { id: 'castillo', name: 'El Castillo de Hogwarts', build: buildCastillo },
];
