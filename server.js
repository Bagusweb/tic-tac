const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));

const waitingPlayers = new Map();
const activeGames = new Map();

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('findGame', (playerName) => {
        console.log(`${playerName} (${socket.id}) mencari game`);
        console.log('Waiting players:', waitingPlayers.size);

        if (waitingPlayers.size > 0) {
            const [waitingId, waitingName] = waitingPlayers.entries().next().value;
            waitingPlayers.delete(waitingId);
            
            const gameId = Math.random().toString(36).substring(7);
            activeGames.set(gameId, {
                players: [
                    {id: waitingId, name: waitingName, symbol: 'X'},
                    {id: socket.id, name: playerName, symbol: 'O'}
                ],
                board: Array(9).fill(''),
                currentTurn: waitingId
            });

            io.to(waitingId).emit('gameStart', {
                gameId,
                opponent: playerName,
                symbol: 'X',
                isYourTurn: true
            });
            
            socket.emit('gameStart', {
                gameId,
                opponent: waitingName,
                symbol: 'O',
                isYourTurn: false
            });
        } else {
            waitingPlayers.set(socket.id, playerName);
            socket.emit('waiting');
        }
    });

    socket.on('makeMove', ({gameId, index}) => {
        const game = activeGames.get(gameId);
        if (!game || game.board[index] !== '' || game.currentTurn !== socket.id) return;

        const player = game.players.find(p => p.id === socket.id);
        game.board[index] = player.symbol;
        
        const winner = checkWinner(game.board);
        if (winner || game.board.every(cell => cell !== '')) {
            io.to(game.players[0].id).to(game.players[1].id)
                .emit('gameEnd', {winner, board: game.board});
            activeGames.delete(gameId);
        } else {
            game.currentTurn = game.players.find(p => p.id !== socket.id).id;
            io.to(game.players[0].id).to(game.players[1].id)
                .emit('moveMade', {index, symbol: player.symbol, nextTurn: game.currentTurn});
        }
    });

    socket.on('disconnect', () => {
        waitingPlayers.delete(socket.id);
        for (const [gameId, game] of activeGames) {
            if (game.players.some(p => p.id === socket.id)) {
                const opponent = game.players.find(p => p.id !== socket.id);
                if (opponent) {
                    io.to(opponent.id).emit('opponentLeft');
                }
                activeGames.delete(gameId);
            }
        }
    });
});

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
