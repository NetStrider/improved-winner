// Cross-Play Multiplayer Game Client

// Game constants
const ARENA_SIZE = 25;
const ARENA_BOUNDARY = ARENA_SIZE - 1;
const ANIMATION_FPS = 60;
const ANIMATION_DURATION = 6;

class MultiplayerGame {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = null;
        this.camera = null;
        this.player = null;
        this.playerId = null;
        this.playerMesh = null;
        this.otherPlayers = new Map();
        this.collectibles = new Map();
        this.scores = {};
        this.ws = null;
        this.keys = {};
        this.moveSpeed = 0.15;
        this.joystickInput = { x: 0, z: 0 };
        this.platform = this.detectPlatform();
        
        this.init();
    }
    
    detectPlatform() {
        const ua = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
        if (/Android/.test(ua)) return 'Android';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'macOS';
        if (/Linux/.test(ua)) return 'Linux';
        return 'Web';
    }
    
    async init() {
        await this.createScene();
        this.setupControls();
        this.setupMobileControls();
        this.connectToServer();
        
        this.engine.runRenderLoop(() => {
            this.update();
            this.scene.render();
        });
        
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
    
    async createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.2, 1);
        
        // Camera
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            Math.PI / 2,
            Math.PI / 3,
            25,
            BABYLON.Vector3.Zero(),
            this.scene
        );
        this.camera.attachControl(this.canvas, false);
        this.camera.lowerRadiusLimit = 10;
        this.camera.upperRadiusLimit = 50;
        
        // Lighting
        const light = new BABYLON.HemisphericLight(
            'light',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        light.intensity = 0.8;
        
        const dirLight = new BABYLON.DirectionalLight(
            'dirLight',
            new BABYLON.Vector3(-1, -2, -1),
            this.scene
        );
        dirLight.intensity = 0.5;
        
        // Ground
        const ground = BABYLON.MeshBuilder.CreateGround(
            'ground',
            { width: 50, height: 50 },
            this.scene
        );
        const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.3);
        
        // Create grid pattern
        const gridTexture = new BABYLON.DynamicTexture('gridTexture', 512, this.scene);
        const ctx = gridTexture.getContext();
        ctx.fillStyle = '#3a5a4a';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#4a6a5a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 512; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }
        gridTexture.update();
        groundMat.diffuseTexture = gridTexture;
        ground.material = groundMat;
        
        // Create boundary walls
        this.createBoundary();
        
        // Skybox
        const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 200 }, this.scene);
        const skyboxMat = new BABYLON.StandardMaterial('skyBoxMat', this.scene);
        skyboxMat.backFaceCulling = false;
        skyboxMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        skyboxMat.specularColor = new BABYLON.Color3(0, 0, 0);
        skyboxMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.1);
        skybox.material = skyboxMat;
    }
    
    createBoundary() {
        const wallHeight = 2;
        const wallThickness = 0.5;
        
        const wallMat = new BABYLON.StandardMaterial('wallMat', this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.5);
        wallMat.alpha = 0.5;
        
        const walls = [
            { pos: [0, wallHeight / 2, ARENA_SIZE], size: [ARENA_SIZE * 2, wallHeight, wallThickness] },
            { pos: [0, wallHeight / 2, -ARENA_SIZE], size: [ARENA_SIZE * 2, wallHeight, wallThickness] },
            { pos: [ARENA_SIZE, wallHeight / 2, 0], size: [wallThickness, wallHeight, ARENA_SIZE * 2] },
            { pos: [-ARENA_SIZE, wallHeight / 2, 0], size: [wallThickness, wallHeight, ARENA_SIZE * 2] }
        ];
        
        walls.forEach((wall, i) => {
            const mesh = BABYLON.MeshBuilder.CreateBox(`wall${i}`, {
                width: wall.size[0],
                height: wall.size[1],
                depth: wall.size[2]
            }, this.scene);
            mesh.position = new BABYLON.Vector3(...wall.pos);
            mesh.material = wallMat;
        });
    }
    
    createPlayerMesh(playerId, color, x, y, z) {
        // Main body (sphere)
        const body = BABYLON.MeshBuilder.CreateSphere(
            `player_${playerId}`,
            { diameter: 1.5 },
            this.scene
        );
        
        const mat = new BABYLON.StandardMaterial(`playerMat_${playerId}`, this.scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString(color);
        mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        mat.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.3);
        body.material = mat;
        
        body.position = new BABYLON.Vector3(x, y, z);
        
        // Add glow effect
        const glowLayer = this.scene.getGlowLayerByName('glow') || new BABYLON.GlowLayer('glow', this.scene);
        glowLayer.addIncludedOnlyMesh(body);
        
        return body;
    }
    
    createCollectible(collectible) {
        const orb = BABYLON.MeshBuilder.CreateSphere(
            `collectible_${collectible.id}`,
            { diameter: 0.8 },
            this.scene
        );
        
        const mat = new BABYLON.StandardMaterial(`collectibleMat_${collectible.id}`, this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0.84, 0);
        mat.emissiveColor = new BABYLON.Color3(0.5, 0.42, 0);
        mat.specularColor = new BABYLON.Color3(1, 1, 1);
        orb.material = mat;
        
        orb.position = new BABYLON.Vector3(collectible.x, collectible.y, collectible.z);
        
        // Animation
        const animation = new BABYLON.Animation(
            'floatAnimation',
            'position.y',
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const keys = [
            { frame: 0, value: collectible.y },
            { frame: 30, value: collectible.y + 0.5 },
            { frame: 60, value: collectible.y }
        ];
        animation.setKeys(keys);
        orb.animations.push(animation);
        this.scene.beginAnimation(orb, 0, 60, true);
        
        // Rotation animation
        const rotAnimation = new BABYLON.Animation(
            'rotateAnimation',
            'rotation.y',
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        const rotKeys = [
            { frame: 0, value: 0 },
            { frame: 60, value: Math.PI * 2 }
        ];
        rotAnimation.setKeys(rotKeys);
        orb.animations.push(rotAnimation);
        this.scene.beginAnimation(orb, 0, 60, true);
        
        this.collectibles.set(collectible.id, orb);
        return orb;
    }
    
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    setupMobileControls() {
        const joystickContainer = document.getElementById('joystick-container');
        const joystick = document.getElementById('joystick');
        
        if (!joystickContainer || !joystick) return;
        
        let isDragging = false;
        const containerRect = () => joystickContainer.getBoundingClientRect();
        const centerX = () => containerRect().width / 2;
        const centerY = () => containerRect().height / 2;
        const maxDistance = 35;
        
        const handleMove = (clientX, clientY) => {
            const rect = containerRect();
            const x = clientX - rect.left - centerX();
            const y = clientY - rect.top - centerY();
            
            const distance = Math.min(Math.sqrt(x * x + y * y), maxDistance);
            const angle = Math.atan2(y, x);
            
            const moveX = Math.cos(angle) * distance;
            const moveY = Math.sin(angle) * distance;
            
            joystick.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
            
            this.joystickInput.x = moveX / maxDistance;
            this.joystickInput.z = moveY / maxDistance;
        };
        
        const handleEnd = () => {
            isDragging = false;
            joystick.style.transform = 'translate(-50%, -50%)';
            this.joystickInput.x = 0;
            this.joystickInput.z = 0;
        };
        
        // Touch events
        joystickContainer.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        });
        
        joystickContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        });
        
        joystickContainer.addEventListener('touchend', handleEnd);
        joystickContainer.addEventListener('touchcancel', handleEnd);
        
        // Mouse events for testing
        joystickContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            handleMove(e.clientX, e.clientY);
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            handleMove(e.clientX, e.clientY);
        });
        
        window.addEventListener('mouseup', handleEnd);
    }
    
    connectToServer() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to server');
            this.updateConnectionStatus('connected');
            
            // Send platform info
            this.ws.send(JSON.stringify({
                type: 'platform',
                platform: this.platform
            }));
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('disconnected');
            
            // Attempt reconnect after 3 seconds
            setTimeout(() => {
                this.connectToServer();
            }, 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
        };
    }
    
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;
        
        switch (status) {
            case 'connected':
                statusEl.innerHTML = '<span class="status-connected">✅ Connected</span>';
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 2000);
                break;
            case 'disconnected':
                statusEl.style.display = 'block';
                statusEl.innerHTML = '<span class="status-disconnected">❌ Disconnected - Reconnecting...</span>';
                break;
            case 'connecting':
                statusEl.style.display = 'block';
                statusEl.innerHTML = '<span class="status-connecting">⏳ Connecting...</span>';
                break;
        }
    }
    
    handleServerMessage(message) {
        switch (message.type) {
            case 'init':
                this.playerId = message.playerId;
                this.player = message.player;
                this.scores = message.scores;
                
                // Create own player
                this.playerMesh = this.createPlayerMesh(
                    message.player.id,
                    message.player.color,
                    message.player.x,
                    message.player.y,
                    message.player.z
                );
                
                // Update camera target
                this.camera.target = this.playerMesh.position;
                
                // Create other players
                message.players.forEach(p => {
                    if (p.id !== this.playerId) {
                        const mesh = this.createPlayerMesh(p.id, p.color, p.x, p.y, p.z);
                        this.otherPlayers.set(p.id, { data: p, mesh: mesh });
                    }
                });
                
                // Create collectibles
                message.collectibles.forEach(c => {
                    this.createCollectible(c);
                });
                
                this.updateUI();
                break;
                
            case 'playerJoined':
                if (message.player.id !== this.playerId) {
                    const mesh = this.createPlayerMesh(
                        message.player.id,
                        message.player.color,
                        message.player.x,
                        message.player.y,
                        message.player.z
                    );
                    this.otherPlayers.set(message.player.id, {
                        data: message.player,
                        mesh: mesh
                    });
                    this.scores[message.player.id] = 0;
                    this.updateUI();
                }
                break;
                
            case 'playerLeft':
                const left = this.otherPlayers.get(message.playerId);
                if (left) {
                    left.mesh.dispose();
                    this.otherPlayers.delete(message.playerId);
                    delete this.scores[message.playerId];
                    this.updateUI();
                }
                break;
                
            case 'playerMoved':
                const moved = this.otherPlayers.get(message.playerId);
                if (moved) {
                    // Smooth interpolation
                    BABYLON.Animation.CreateAndStartAnimation(
                        'moveAnim',
                        moved.mesh,
                        'position',
                        ANIMATION_FPS,
                        ANIMATION_DURATION,
                        moved.mesh.position,
                        new BABYLON.Vector3(message.x, message.y, message.z),
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                }
                break;
                
            case 'collectibleCollected':
                const collected = this.collectibles.get(message.collectibleId);
                if (collected) {
                    collected.dispose();
                    this.collectibles.delete(message.collectibleId);
                }
                
                // Update score
                this.scores[message.playerId] = message.newScore;
                this.updateUI();
                
                // Create new collectible
                if (message.newCollectible) {
                    this.createCollectible(message.newCollectible);
                }
                break;
                
            case 'platformUpdate':
                const playerData = this.otherPlayers.get(message.playerId);
                if (playerData) {
                    playerData.data.platform = message.platform;
                    this.updateUI();
                }
                break;
        }
    }
    
    update() {
        if (!this.playerMesh || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        let dx = 0;
        let dz = 0;
        
        // Keyboard input
        if (this.keys['w'] || this.keys['arrowup']) dz -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dz += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        
        // Mobile joystick input
        dx += this.joystickInput.x;
        dz += this.joystickInput.z;
        
        // Normalize diagonal movement
        if (dx !== 0 || dz !== 0) {
            const length = Math.sqrt(dx * dx + dz * dz);
            dx = (dx / length) * this.moveSpeed;
            dz = (dz / length) * this.moveSpeed;
            
            // Apply movement
            const newX = this.playerMesh.position.x + dx;
            const newZ = this.playerMesh.position.z + dz;
            
            // Boundary check using arena boundary constant
            if (Math.abs(newX) < ARENA_BOUNDARY && Math.abs(newZ) < ARENA_BOUNDARY) {
                this.playerMesh.position.x = newX;
                this.playerMesh.position.z = newZ;
                
                // Update camera
                this.camera.target = this.playerMesh.position;
                
                // Send position to server
                this.ws.send(JSON.stringify({
                    type: 'move',
                    x: this.playerMesh.position.x,
                    y: this.playerMesh.position.y,
                    z: this.playerMesh.position.z
                }));
            }
        }
        
        // Check collectible collisions
        this.collectibles.forEach((mesh, id) => {
            const dist = BABYLON.Vector3.Distance(this.playerMesh.position, mesh.position);
            if (dist < 1.5) {
                this.ws.send(JSON.stringify({
                    type: 'collect',
                    collectibleId: id
                }));
            }
        });
    }
    
    updateUI() {
        // Update player info
        const playerInfo = document.getElementById('player-info');
        if (playerInfo && this.player) {
            playerInfo.innerHTML = `
                <span style="color: ${this.player.color}">●</span> 
                You (${this.platform})
            `;
        }
        
        // Update scoreboard
        const scoresEl = document.getElementById('scores');
        if (!scoresEl) return;
        
        const allPlayers = [
            { id: this.playerId, ...this.player, score: this.scores[this.playerId] || 0 }
        ];
        
        this.otherPlayers.forEach((p, id) => {
            allPlayers.push({ id, ...p.data, score: this.scores[id] || 0 });
        });
        
        // Sort by score
        allPlayers.sort((a, b) => b.score - a.score);
        
        scoresEl.innerHTML = allPlayers.map(p => `
            <div class="player-score ${p.id === this.playerId ? 'self' : ''}">
                <span>
                    <span class="player-color" style="background: ${p.color || '#fff'}"></span>
                    ${p.id === this.playerId ? 'You' : 'Player'}
                    <span class="platform-badge">${p.platform || '?'}</span>
                </span>
                <span>${p.score}</span>
            </div>
        `).join('');
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new MultiplayerGame();
});
