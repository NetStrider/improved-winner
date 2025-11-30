const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const players = new Map();
const gameState = {
    collectibles: [],
    scores: {}
};

// Initialize collectibles
function initCollectibles() {
    gameState.collectibles = [];
    for (let i = 0; i < 10; i++) {
        gameState.collectibles.push({
            id: uuidv4(),
            x: (Math.random() - 0.5) * 40,
            y: 1,
            z: (Math.random() - 0.5) * 40
        });
    }
}

initCollectibles();

// Broadcast to all players
function broadcast(message, exclude = null) {
    const data = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
    const playerId = uuidv4();
    const playerColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    
    // Create new player
    const player = {
        id: playerId,
        x: (Math.random() - 0.5) * 10,
        y: 1,
        z: (Math.random() - 0.5) * 10,
        color: playerColor,
        platform: 'unknown'
    };
    
    players.set(playerId, player);
    gameState.scores[playerId] = 0;
    
    // Send initial state to new player
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        player: player,
        players: Array.from(players.values()),
        collectibles: gameState.collectibles,
        scores: gameState.scores
    }));
    
    // Notify other players
    broadcast({
        type: 'playerJoined',
        player: player
    }, ws);
    
    console.log(`Player ${playerId} connected. Total players: ${players.size}`);
    
    // Handle messages from client
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'move':
                    const player = players.get(playerId);
                    if (player) {
                        player.x = message.x;
                        player.y = message.y;
                        player.z = message.z;
                        
                        broadcast({
                            type: 'playerMoved',
                            playerId: playerId,
                            x: player.x,
                            y: player.y,
                            z: player.z
                        }, ws);
                    }
                    break;
                    
                case 'collect':
                    const collectibleIndex = gameState.collectibles.findIndex(c => c.id === message.collectibleId);
                    if (collectibleIndex !== -1) {
                        gameState.collectibles.splice(collectibleIndex, 1);
                        gameState.scores[playerId] = (gameState.scores[playerId] || 0) + 10;
                        
                        // Spawn new collectible
                        const newCollectible = {
                            id: uuidv4(),
                            x: (Math.random() - 0.5) * 40,
                            y: 1,
                            z: (Math.random() - 0.5) * 40
                        };
                        gameState.collectibles.push(newCollectible);
                        
                        broadcast({
                            type: 'collectibleCollected',
                            collectibleId: message.collectibleId,
                            playerId: playerId,
                            newScore: gameState.scores[playerId],
                            newCollectible: newCollectible
                        });
                    }
                    break;
                    
                case 'platform':
                    const p = players.get(playerId);
                    if (p) {
                        p.platform = message.platform;
                        broadcast({
                            type: 'platformUpdate',
                            playerId: playerId,
                            platform: message.platform
                        }, ws);
                    }
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });
    
    // Handle disconnect
    ws.on('close', () => {
        players.delete(playerId);
        delete gameState.scores[playerId];
        
        broadcast({
            type: 'playerLeft',
            playerId: playerId
        });
        
        console.log(`Player ${playerId} disconnected. Total players: ${players.size}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to play`);
});

module.exports = { app, server };
