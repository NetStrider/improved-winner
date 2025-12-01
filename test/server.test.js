const http = require('http');
const WebSocket = require('ws');

const PORT = 3001;

// Test helper functions
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        passed++;
    } else {
        console.log(`❌ FAIL: ${message}`);
        failed++;
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Start a test server instance
async function startTestServer() {
    // Modify the server to use a different port
    process.env.PORT = PORT;
    const { server } = require('../server');
    await new Promise(resolve => {
        if (server.listening) {
            resolve();
        } else {
            server.on('listening', resolve);
        }
    });
    return server;
}

// Test HTTP server
async function testHttpServer() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${PORT}`, (res) => {
            assert(res.statusCode === 200, 'HTTP server responds with 200');
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                assert(data.includes('Cross-Play'), 'HTML includes Cross-Play text');
                assert(data.includes('babylon.js'), 'HTML includes Babylon.js script');
                resolve();
            });
        });
        req.on('error', (e) => {
            assert(false, `HTTP server error: ${e.message}`);
            resolve();
        });
    });
}

// Test WebSocket connection
async function testWebSocketConnection() {
    return new Promise((resolve) => {
        const ws = new WebSocket(`ws://localhost:${PORT}`);
        
        ws.on('open', () => {
            assert(true, 'WebSocket connection established');
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'init') {
                assert(message.playerId !== undefined, 'Player receives playerId on init');
                assert(message.player !== undefined, 'Player receives player data on init');
                assert(Array.isArray(message.players), 'Player receives players array on init');
                assert(Array.isArray(message.collectibles), 'Player receives collectibles array on init');
                assert(typeof message.scores === 'object', 'Player receives scores object on init');
                assert(message.player.color !== undefined, 'Player has a color assigned');
                
                ws.close();
                resolve();
            }
        });
        
        ws.on('error', (e) => {
            assert(false, `WebSocket error: ${e.message}`);
            resolve();
        });
    });
}

// Test multiplayer functionality
async function testMultiplayer() {
    return new Promise(async (resolve) => {
        const ws1 = new WebSocket(`ws://localhost:${PORT}`);
        let player1Id = null;
        
        ws1.on('open', () => {
            assert(true, 'First player connected');
        });
        
        ws1.on('message', async (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'init') {
                player1Id = message.playerId;
                
                // Connect second player
                const ws2 = new WebSocket(`ws://localhost:${PORT}`);
                
                ws2.on('message', (data2) => {
                    const msg2 = JSON.parse(data2);
                    
                    if (msg2.type === 'init') {
                        // Verify second player sees first player
                        const seesPlayer1 = msg2.players.some(p => p.id === player1Id);
                        assert(seesPlayer1, 'Second player can see first player');
                        
                        ws2.close();
                        ws1.close();
                        resolve();
                    }
                });
            }
            
            if (message.type === 'playerJoined') {
                assert(true, 'First player notified when second player joins');
            }
        });
    });
}

// Test player movement synchronization
async function testMovement() {
    return new Promise(async (resolve) => {
        const ws1 = new WebSocket(`ws://localhost:${PORT}`);
        const ws2 = new WebSocket(`ws://localhost:${PORT}`);
        let player1Id = null;
        let player2Ready = false;
        
        ws1.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'init') {
                player1Id = message.playerId;
            }
            
            if (message.type === 'playerMoved' && player2Ready) {
                assert(message.x === 5, 'Movement X position synced');
                assert(message.z === 5, 'Movement Z position synced');
                ws1.close();
                ws2.close();
                resolve();
            }
        });
        
        ws2.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'init') {
                player2Ready = true;
                // Send movement
                ws2.send(JSON.stringify({
                    type: 'move',
                    x: 5,
                    y: 1,
                    z: 5
                }));
            }
        });
    });
}

// Test platform detection message
async function testPlatformUpdate() {
    return new Promise(async (resolve) => {
        const ws1 = new WebSocket(`ws://localhost:${PORT}`);
        const ws2 = new WebSocket(`ws://localhost:${PORT}`);
        let player2Ready = false;
        
        ws1.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'platformUpdate' && player2Ready) {
                assert(message.platform === 'Windows', 'Platform update received');
                ws1.close();
                ws2.close();
                resolve();
            }
        });
        
        ws2.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'init') {
                player2Ready = true;
                // Send platform info
                ws2.send(JSON.stringify({
                    type: 'platform',
                    platform: 'Windows'
                }));
            }
        });
    });
}

// Run all tests
async function runTests() {
    console.log('🧪 Starting Cross-Play Multiplayer Game Tests\n');
    
    const server = await startTestServer();
    await delay(500); // Wait for server to be fully ready
    
    console.log('\n--- HTTP Server Tests ---');
    await testHttpServer();
    
    console.log('\n--- WebSocket Connection Tests ---');
    await testWebSocketConnection();
    
    console.log('\n--- Multiplayer Tests ---');
    await testMultiplayer();
    
    console.log('\n--- Movement Sync Tests ---');
    await testMovement();
    
    console.log('\n--- Platform Update Tests ---');
    await testPlatformUpdate();
    
    console.log('\n========================================');
    console.log(`Tests completed: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');
    
    server.close();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
