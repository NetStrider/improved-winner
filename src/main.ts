import { GameEngine, SceneManager } from './core';
import { PCInputManager, MobileInputManager, VRInputManager } from './input';
import { Player } from './entities';
import { WaveManager } from './game';
import { GameUI } from './ui';
import { NetworkManager, NetworkState } from './network';
import { Vector3 } from '@babylonjs/core';

/**
 * Main Game Class - Survival Shooter (L4D style)
 */
class SurvivalShooter {
  private gameEngine: GameEngine;
  private sceneManager: SceneManager;
  private player: Player | null = null;
  private waveManager: WaveManager | null = null;
  private gameUI: GameUI | null = null;
  private networkManager: NetworkManager | null = null;
  
  // Input managers
  private pcInput: PCInputManager | null = null;
  private mobileInput: MobileInputManager | null = null;
  private vrInput: VRInputManager | null = null;
  
  // Game state
  private score: number = 0;
  private isGameRunning: boolean = false;
  private lastFrameTime: number = 0;
  private isMobile: boolean = false;

  constructor() {
    // Initialize game engine
    this.gameEngine = new GameEngine('renderCanvas');
    this.sceneManager = new SceneManager(this.gameEngine.getScene());
    
    // Detect mobile
    this.isMobile = MobileInputManager.isMobileDevice();
  }

  /**
   * Initialize the game
   */
  public async init(): Promise<void> {
    // Hide loading message
    const loadingElement = document.getElementById('loading');
    
    try {
      // Setup scene
      const camera = this.sceneManager.setupScene(this.gameEngine.getCanvas());
      
      // Create player
      this.player = new Player(this.gameEngine.getScene(), camera);
      
      // Setup input based on device
      if (this.isMobile) {
        this.mobileInput = new MobileInputManager(this.gameEngine.getScene(), camera);
        this.player.setMobileInput(this.mobileInput);
      } else {
        this.pcInput = new PCInputManager(
          this.gameEngine.getScene(), 
          camera, 
          this.gameEngine.getCanvas()
        );
        this.player.setPCInput(this.pcInput);
      }
      
      // Initialize VR support
      await this.initVR();
      
      // Create wave manager
      this.waveManager = new WaveManager(this.gameEngine.getScene());
      this.setupWaveCallbacks();
      
      // Create UI
      this.gameUI = new GameUI(this.gameEngine.getScene());
      this.setupPlayerCallbacks();
      
      // Initialize network manager for co-op
      this.networkManager = new NetworkManager();
      this.setupNetworkCallbacks();
      
      // Hide loading, show start message
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      
      // Show start message
      this.gameUI.showMessage('Click to start - WASD to move, Mouse to aim', 5000);
      
      // Start render loop
      this.startGame();
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
      if (loadingElement) {
        loadingElement.textContent = 'Failed to load game. Please refresh.';
      }
    }
  }

  /**
   * Initialize VR support
   */
  private async initVR(): Promise<void> {
    const xrExperience = await this.gameEngine.initVR();
    
    if (xrExperience && this.player) {
      this.vrInput = new VRInputManager(this.gameEngine.getScene(), xrExperience);
      this.player.setVRInput(this.vrInput);
      
      // Hide mobile controls when in VR
      if (this.mobileInput) {
        xrExperience.baseExperience.onStateChangedObservable.add(() => {
          if (this.gameEngine.isInVR()) {
            this.mobileInput?.setVisible(false);
            this.gameUI?.setCrosshairVisible(false);
          } else {
            this.mobileInput?.setVisible(true);
            this.gameUI?.setCrosshairVisible(true);
          }
        });
      }
    }
  }

  /**
   * Setup wave manager callbacks
   */
  private setupWaveCallbacks(): void {
    if (!this.waveManager) return;
    
    this.waveManager.onWaveStart = (wave) => {
      this.gameUI?.updateWave(wave);
      this.gameUI?.showMessage(`Wave ${wave} Starting!`, 2000);
    };
    
    this.waveManager.onWaveComplete = (wave) => {
      this.gameUI?.showMessage(`Wave ${wave} Complete!`, 3000);
      
      // Start next wave after delay
      setTimeout(() => {
        this.waveManager?.startWave();
      }, 5000);
    };
    
    this.waveManager.onEnemyKilled = (_enemy, wave) => {
      // Score based on enemy type and wave
      const baseScore = 100;
      this.score += baseScore * wave;
      this.gameUI?.updateScore(this.score);
    };
  }

  /**
   * Setup player callbacks
   */
  private setupPlayerCallbacks(): void {
    if (!this.player) return;
    
    this.player.onHealthChanged = (health, maxHealth) => {
      this.gameUI?.updateHealth(health, maxHealth);
      
      if (health <= 0) {
        this.gameOver();
      }
    };
    
    this.player.onAmmoChanged = (ammo, maxAmmo, reserve) => {
      this.gameUI?.updateAmmo(ammo, maxAmmo, reserve);
    };
    
    this.player.onShoot = (origin, direction) => {
      // Check for enemy hits
      const hitEnemy = this.waveManager?.checkHit(origin, direction);
      if (hitEnemy) {
        hitEnemy.takeDamage(25); // Base weapon damage
      }
    };
    
    // Initialize UI with starting values
    this.gameUI?.updateHealth(100, 100);
    this.gameUI?.updateAmmo(30, 30, 120);
    this.gameUI?.updateWave(0);
    this.gameUI?.updateScore(0);
  }

  /**
   * Setup network callbacks for co-op
   */
  private setupNetworkCallbacks(): void {
    if (!this.networkManager) return;
    
    this.networkManager.onStateChanged = (state) => {
      switch (state) {
        case NetworkState.CONNECTED:
          this.gameUI?.showMessage('Connected to server', 2000);
          break;
        case NetworkState.DISCONNECTED:
          this.gameUI?.showMessage('Disconnected from server', 2000);
          break;
        case NetworkState.ERROR:
          this.gameUI?.showMessage('Connection error', 2000);
          break;
      }
    };
    
    this.networkManager.onPlayerJoined = (playerId) => {
      this.gameUI?.showMessage(`Player joined: ${playerId}`, 2000);
    };
    
    this.networkManager.onPlayerLeft = (playerId) => {
      this.gameUI?.showMessage(`Player left: ${playerId}`, 2000);
    };
  }

  /**
   * Start the game
   */
  private startGame(): void {
    this.isGameRunning = true;
    this.lastFrameTime = performance.now();
    
    // Start first wave after a delay
    setTimeout(() => {
      this.waveManager?.startWave(1);
    }, 3000);
    
    // Run game loop
    this.gameEngine.run(() => {
      this.update();
    });
  }

  /**
   * Main game update loop
   */
  private update(): void {
    if (!this.isGameRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    
    // Cap delta time to prevent large jumps
    const cappedDelta = Math.min(deltaTime, 0.1);
    
    // Update player
    if (this.player?.isAlive()) {
      this.player.update(cappedDelta);
      
      // Update wave manager with player position
      const playerPos = this.player.getPosition();
      this.waveManager?.update(cappedDelta, playerPos);
      
      // Update enemy count UI
      this.gameUI?.updateEnemyCount(this.waveManager?.getEnemiesAlive() ?? 0);
      
      // Check for enemy attacks on player
      this.checkEnemyAttacks();
    }
    
    // Send network updates
    if (this.networkManager?.isConnected() && this.player) {
      this.networkManager.sendPlayerUpdate({
        position: this.player.getPosition(),
        health: this.player.getHealth(),
      });
    }
  }

  /**
   * Check if enemies are attacking the player
   */
  private checkEnemyAttacks(): void {
    if (!this.waveManager || !this.player) return;
    
    const enemies = this.waveManager.getEnemies();
    const playerPos = this.player.getPosition();
    
    enemies.forEach(enemy => {
      enemy.onAttack = (e, damage) => {
        const distance = Vector3.Distance(e.getPosition(), playerPos);
        if (distance < 3) { // Attack range
          this.player?.takeDamage(damage);
        }
      };
    });
  }

  /**
   * Handle game over
   */
  private gameOver(): void {
    this.isGameRunning = false;
    this.gameUI?.showMessage(`Game Over! Score: ${this.score}`, 10000);
    
    // Restart after delay
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.waveManager?.dispose();
    this.mobileInput?.dispose();
    this.gameUI?.dispose();
    this.networkManager?.disconnect();
    this.gameEngine.dispose();
  }
}

// Initialize game when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
  const game = new SurvivalShooter();
  await game.init();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    game.dispose();
  });
});
