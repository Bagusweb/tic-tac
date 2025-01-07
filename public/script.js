const socket = io({
    transports: ['websocket'],
    upgrade: false
});

let gameId = null;
let playerSymbol = null;
let isMyTurn = false;
let gameMode = 'pvp';
let gameActive = false;

socket.on('connect', () => {
    console.log('Connected to server');
});

function selectMode(mode) {
    gameMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

function startGame() {
    const playerName = document.getElementById('playerName').value;
    if (!playerName) {
        alert('Masukkan nama dulu ya!');
        return;
    }

    if (gameMode === 'pvp') {
        findMatch();
    } else {
        startAIGame(playerName);
    }
}

function findMatch() {
    const playerName = document.getElementById('playerName').value;
    document.querySelector('.welcome-screen').style.display = 'none';
    document.querySelector('.loading').style.display = 'block';
    socket.emit('findGame', playerName);
}

function startAIGame(playerName) {
    document.querySelector('.welcome-screen').style.display = 'none';
    document.querySelector('.battle-info').style.display = 'flex';
    document.querySelector('.game-board').style.display = 'grid';
    
    document.querySelector('#player1 .player-name').textContent = playerName;
    document.querySelector('#player2 .player-name').textContent = 'AI Player';
    
    gameActive = true;
    isMyTurn = true;
    updateBattleInfo(true);
}

function makeMove(index) {
    if (gameMode === 'pvp') {
        makePvPMove(index);
    } else if (gameMode === 'ai' && gameActive && isMyTurn) {
        makeAIMove(index);
    }
}

function makePvPMove(index) {
    if (!gameId || !isMyTurn) return;
    
    const cells = document.querySelectorAll('.cell');
    if (!cells[index].textContent) {
        socket.emit('makeMove', {gameId, index});
    }
}

function makeAIMove(index) {
    const cells = document.querySelectorAll('.cell');
    if (cells[index].textContent || !isMyTurn) return;

    // Player move
    cells[index].textContent = 'X';
    cells[index].classList.add('just-played');
    setTimeout(() => cells[index].classList.remove('just-played'), 300);
    
    if (checkWinner()) {
        gameActive = false;
        showNotification('win', 'Kamu Menang!');
        return;
    }
    
    if (isBoardFull()) {
        gameActive = false;
        showNotification('draw', 'Permainan Seri!');
        return;
    }

    // AI move
    isMyTurn = false;
    updateBattleInfo(false);
    
    setTimeout(() => {
        const aiMove = getBestMove();
        cells[aiMove].textContent = 'O';
        cells[aiMove].classList.add('just-played');
        setTimeout(() => cells[aiMove].classList.remove('just-played'), 300);
        
        if (checkWinner()) {
            gameActive = false;
            showNotification('lose', 'AI Menang!');
            return;
        }
        
        if (isBoardFull()) {
            gameActive = false;
            showNotification('draw', 'Permainan Seri!');
            return;
        }
        
        isMyTurn = true;
        updateBattleInfo(true);
    }, 700);
}

function updateBattleInfo(isPlayer1Turn) {
    document.getElementById('player1').classList.toggle('active', isPlayer1Turn);
    document.getElementById('player2').classList.toggle('active', !isPlayer1Turn);
}

function getBestMove() {
    const cells = document.querySelectorAll('.cell');
    const board = Array.from(cells).map(cell => cell.textContent);
    
    // Check for winning move
    for (let i = 0; i < 9; i++) {
        if (!board[i]) {
            board[i] = 'O';
            if (checkWinningMove(board)) {
                return i;
            }
            board[i] = '';
        }
    }
    
    // Check for blocking move
    for (let i = 0; i < 9; i++) {
        if (!board[i]) {
            board[i] = 'X';
            if (checkWinningMove(board)) {
                return i;
            }
            board[i] = '';
        }
    }
    
    // Take center
    if (!board[4]) return 4;
    
    // Take corner
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => !board[i]);
    if (availableCorners.length > 0) {
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    // Take any available space
    const availableSpaces = board.map((cell, i) => !cell ? i : null).filter(i => i !== null);
    return availableSpaces[Math.floor(Math.random() * availableSpaces.length)];
}

function showNotification(type, message) {
    const notification = document.getElementById('notification');
    const overlay = document.querySelector('.overlay');
    
    notification.classList.remove('notification-win', 'notification-lose', 'notification-draw');
    
    switch(type) {
        case 'win':
            notification.classList.add('notification-win');
            notification.querySelector('.emoji').textContent = '🎉';
            break;
        case 'lose':
            notification.classList.add('notification-lose');
            notification.querySelector('.emoji').textContent = '😢';
            break;
        case 'draw':
            notification.classList.add('notification-draw');
            notification.querySelector('.emoji').textContent = '🤝';
            break;
    }
    
    notification.querySelector('.result-text').textContent = message;
    notification.style.display = 'block';
    overlay.style.display = 'block';
}

function playAgain() {
    window.location.reload();
}

function checkWinner() {
    const cells = document.querySelectorAll('.cell');
    const board = Array.from(cells).map(cell => cell.textContent);
    return checkWinningMove(board);
}

function checkWinningMove(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    return lines.some(([a, b, c]) => 
        board[a] && board[a] === board[b] && board[a] === board[c]
    );
}

function isBoardFull() {
    const cells = document.querySelectorAll('.cell');
    return Array.from(cells).every(cell => cell.textContent);
}

// Socket events for PvP
socket.on('waiting', () => {
    document.querySelector('.status').textContent = 'Menunggu lawan...';
});

socket.on('gameStart', (data) => {
    console.log('Game started:', data);
    gameId = data.gameId;
    playerSymbol = data.symbol;
    isMyTurn = data.isYourTurn;
    gameActive = true;
    
    document.querySelector('.loading').style.display = 'none';
    document.querySelector('.battle-info').style.display = 'flex';
    document.querySelector('.game-board').style.display = 'grid';
    
    document.querySelector('#player1 .player-name').textContent = 
        playerSymbol === 'X' ? document.getElementById('playerName').value : data.opponent;
    document.querySelector('#player2 .player-name').textContent = 
        playerSymbol === 'O' ? document.getElementById('playerName').value : data.opponent;
    
    updateBattleInfo(isMyTurn);
    document.querySelector('.status').textContent = 
        isMyTurn ? 'Giliran kamu!' : 'Giliran lawan!';
});

socket.on('moveMade', (data) => {
    const cells = document.querySelectorAll('.cell');
    cells[data.index].textContent = data.symbol;
    cells[data.index].classList.add('just-played');
    setTimeout(() => cells[data.index].classList.remove('just-played'), 300);
    
    isMyTurn = data.nextTurn === socket.id;
    updateBattleInfo(isMyTurn);
    document.querySelector('.status').textContent = 
        isMyTurn ? 'Giliran kamu!' : 'Giliran lawan!';
});

socket.on('gameEnd', (data) => {
    const cells = document.querySelectorAll('.cell');
    data.board.forEach((symbol, index) => {
        cells[index].textContent = symbol;
    });

    if (data.winner) {
        if (data.winner === playerSymbol) {
            showNotification('win', 'Kamu Menang!');
        } else {
            showNotification('lose', 'Kamu Kalah!');
        }
    } else {
        showNotification('draw', 'Permainan Seri!');
    }
});

socket.on('opponentLeft', () => {
    showNotification('win', 'Lawan Keluar - Kamu Menang!');
});
