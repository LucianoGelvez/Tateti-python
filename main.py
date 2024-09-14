import random

print("Welcome to Ta Te Ti!")


def display_board(board):
    """Armamos el tablero de TaTeTi"""
    print(board[7] + "|" + board[8] + "|" + board[9])
    print(board[4] + "|" + board[5] + "|" + board[6])
    print(board[1] + "|" + board[2] + "|" + board[3])
    print("----------")


test_board = [" ", " ", " ", " ", " ", " ", " ", " ", " ", " "]
display_board(test_board)


def choose_first():
    """Elegimos al azar qué jugador arranca jugando"""
    who_play = random.randint(1, 2)
    print(f"Start the player {who_play}!")
    return who_play


def player_input(player):
    """Solicita al jugador que elija una posición válida"""
    while True:
        try:
            position = int(input(f"Player {player} enter a position (1-9): "))
            if position in range(1, 10):
                break
            else:
                print("The number must be between 1 and 9.")
        except ValueError:
            print("Invalid input! Please enter a valid number.")
    return position


def replay():
    """Pregunta si el jugador quiere seguir jugando"""
    new_game = input("Your board is full. Do you want to start again? (y/n) ").lower()
    while new_game not in ["y", "n"]:
        new_game = input("Please try again: (y/n) ").lower()
        test_board = [" "] * 10
        print(test_board)
    return new_game == "y"


def full_board_check(board):
    """Verifica si el tablero está lleno"""
    return " " not in board[1:]


def win_check(board, mark):
    """Comprueba si un jugador ha ganado"""
    if (
        (board[1] == board[2] == board[3] == mark.upper()) or 
        (board[4] == board[5] == board[6] == mark.upper()) or  
        (board[7] == board[8] == board[9] == mark.upper()) or  
        (board[1] == board[4] == board[7] == mark.upper()) or  
        (board[2] == board[5] == board[8] == mark.upper()) or  
        (board[3] == board[6] == board[9] == mark.upper()) or  
        (board[1] == board[5] == board[9] == mark.upper()) or  
        (board[3] == board[5] == board[7] == mark.upper())
    ):
        print(f"Winner user {n_player}!")
        win = True
    else:
        win = False
    return win


def space_check(board, position):
    """Verifica si una posición en el tablero está vacía"""
    return board[position] == " "


def place_marker(board, marker, position):
    """Coloca el marcador en el tablero"""
    board[position] = marker.upper()
    display_board(board)

player1_marker = ""
player2_marker = ""
n_player = choose_first()

if n_player == 1:
    player1_marker = input("Player 1, choose 'X' or 'O': ").lower()
    while player1_marker not in ["x", "o"]:
        player1_marker = input("Invalid input. Please choose 'X' or 'O': ").lower()
    player2_marker = "o" if player1_marker == "x" else "x"
else:
    player2_marker = input("Player 2, choose 'X' or 'O': ").lower()
    while player2_marker not in ["x", "o"]:
        player2_marker = input("Invalid input. Please choose 'X' or 'O': ").lower()
    player1_marker = "o" if player2_marker == "x" else "x"

print(f"Player 1 will be '{player1_marker.upper()}', Player 2 will be '{player2_marker.upper()}'")

win = False
current_player = n_player

while not win:
    if current_player == 1:
        print("Player 1's turn:")
        position = player_input(1)
        while not space_check(test_board, position):
            print(f"Position {position} is already taken. Try again.")
            position = player_input(1)
        place_marker(test_board, player1_marker, position)

        if win_check(test_board, player1_marker):
            print("Player 1 wins!")
            win = True
        current_player = 2

    else:
        print("Player 2's turn:")
        position = player_input(2)
        while not space_check(test_board, position):
            print(f"Position {position} is already taken. Try again.")
            position = player_input(2)
        place_marker(test_board, player2_marker, position)

        if win_check(test_board, player2_marker):
            print("Player 2 wins!")
            win = True
        current_player = 1

    if full_board_check(test_board) and not win:
        print("It's a tie!")
        if replay():
            test_board = [" "] * 10
            win = False
            current_player = choose_first()
        else:
            print("Thanks for playing!")
            break
