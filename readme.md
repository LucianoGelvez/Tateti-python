# Ta-te-ti or Tic-Tac-Toe 

This is a simple Tic-Tac-Toe game implemented in Python. The game allows two players to face off on a 3x3 grid, with the option to continue playing after each match.

## Game Rules

- The game is played on a 3x3 grid.
- Two players take turns placing their marks ("X" or "O") on an empty spot on the board.
- The first player to form a row, column, or diagonal of three identical marks wins the game.
- If all positions on the board are filled and no player has formed a row, column, or diagonal, the game ends in a tie.

## Features

- Random selection of which player starts.
- The first player can choose whether to play with "X" or "O".
- Automatic winner detection.
- Option to play again at the end of each game.

## How to Play

1. The first player is selected randomly.
2. The selected player chooses whether to play with "X" or "O".
3. Each player, on their turn, enters a number between 1 and 9 to place their mark on the board in the corresponding position:

4. The game continues alternating between the two players until one of them forms a row, column, or diagonal of three identical marks, or until the board is full (tie).
5. At the end of the game, there is an option to play again.

## Running the Game

### Requirements

This game requires Python 3 to be installed on your system. No external libraries are needed.

### Installation

1. Clone this repository to your local machine:

git clone https://github.com/lucianogelvez/tateti-python.git
cd tateti-python

2. Run the Python script to start the game:
python3 tateti.py

### Example Output

```bash
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
-----
O| | 
