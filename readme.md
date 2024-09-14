# Ta Te Ti (Tic-Tac-Toe)

Este es un sencillo juego de Ta Te Ti (Tic-Tac-Toe) implementado en Python. El juego permite que dos jugadores se enfrenten entre sí en una cuadrícula de 3x3, con la opción de continuar jugando después de cada partida.

## Reglas del juego

- El juego se juega en una cuadrícula de 3x3.
- Dos jugadores toman turnos para colocar sus marcas ("X" o "O") en una posición vacía del tablero.
- El primer jugador en formar una fila, columna o diagonal de tres marcas iguales gana el juego.
- Si todas las posiciones del tablero están llenas y ningún jugador ha formado una fila, columna o diagonal, el juego termina en empate.
  
## Características

- Elección aleatoria de qué jugador comienza.
- El primer jugador puede elegir si juega con "X" o "O".
- Verificación automática de ganador.
- Opción para jugar nuevamente al final de cada partida.

## Cómo jugar

1. El primer jugador es seleccionado aleatoriamente.
2. El jugador seleccionado elige si jugará con "X" o "O".
3. Cada jugador, en su turno, ingresa un número entre 1 y 9 para colocar su marca en el tablero en la posición correspondiente:


4. El juego continúa alternando entre los dos jugadores hasta que uno de ellos forme una fila, columna o diagonal de tres marcas iguales, o hasta que el tablero esté lleno (empate).
5. Al final del juego, se puede optar por jugar nuevamente.

## Ejecución del juego

### Requisitos

Este juego requiere tener instalado Python 3 en tu sistema. No se necesitan bibliotecas externas.

### Instalación

1. Clona este repositorio en tu máquina local:

```bash
git clone https://github.com/lucianogelvez/tateti-python.git
cd tateti-python

2. Ejecuta el script de Python para iniciar el juego:
python3 tateti.py

### Ejemplo de salida

Welcome to Ta Te Ti!
Start the player 1!
Player 1, choose 'X' or 'O': x
Player 1 will be 'X', Player 2 will be 'O'
Player 1's turn:
Player 1 enter a position (1-9): 5
 | | 
-----
 |X| 
-----
 | | 
Player 2's turn:
Player 2 enter a position (1-9): 1
 | | 
-----
 |X| 
O| | 