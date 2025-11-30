import { Scene, Vector3 } from '@babylonjs/core';
import { Enemy, EnemyType } from '../entities/Enemy';

export interface WaveConfig {
  waveNumber: number;
  enemies: { type: EnemyType; count: number }[];
  spawnDelay: number; // seconds between spawns
  bonusHealth?: number;
  bonusDamage?: number;
}

/**
 * WaveManager - Handles wave-based enemy spawning (L4D style)
 */
export class WaveManager {
  private scene: Scene;
  private enemies: Enemy[] = [];
  private currentWave: number = 0;
  private isWaveActive: boolean = false;
  private spawnPoints: Vector3[] = [];
  
  // Wave state
  private enemiesToSpawn: { type: EnemyType; count: number }[] = [];
  private spawnTimer: number = 0;
  private spawnDelay: number = 1;
  
  // Difficulty scaling
  private baseEnemyCount: number = 5;
  private enemyCountPerWave: number = 2;
  private maxEnemiesAlive: number = 15;

  // Callbacks
  public onWaveStart: ((wave: number) => void) | null = null;
  public onWaveComplete: ((wave: number) => void) | null = null;
  public onEnemySpawned: ((enemy: Enemy) => void) | null = null;
  public onEnemyKilled: ((enemy: Enemy, wave: number) => void) | null = null;
  public onAllWavesComplete: (() => void) | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.generateSpawnPoints();
  }

  /**
   * Generate spawn points around the arena
   */
  private generateSpawnPoints(): void {
    const radius = 30;
    const numPoints = 8;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.spawnPoints.push(new Vector3(x, 0, z));
    }
  }

  /**
   * Generate wave configuration based on wave number
   */
  private generateWaveConfig(waveNumber: number): WaveConfig {
    const totalEnemies = this.baseEnemyCount + (waveNumber - 1) * this.enemyCountPerWave;
    const enemies: { type: EnemyType; count: number }[] = [];
    
    // Basic enemies are always present
    let basicCount = Math.floor(totalEnemies * 0.6);
    enemies.push({ type: EnemyType.BASIC, count: basicCount });
    
    // Add fast enemies starting wave 2
    if (waveNumber >= 2) {
      const fastCount = Math.floor(totalEnemies * 0.2);
      enemies.push({ type: EnemyType.FAST, count: fastCount });
      basicCount -= fastCount;
    }
    
    // Add tank enemies starting wave 3
    if (waveNumber >= 3) {
      const tankCount = Math.floor(totalEnemies * 0.1);
      enemies.push({ type: EnemyType.TANK, count: tankCount });
    }
    
    // Add special enemies starting wave 5
    if (waveNumber >= 5 && waveNumber % 5 === 0) {
      enemies.push({ type: EnemyType.SPECIAL, count: 1 });
    }
    
    return {
      waveNumber,
      enemies,
      spawnDelay: Math.max(0.5, 2 - waveNumber * 0.1),
      bonusHealth: (waveNumber - 1) * 10,
      bonusDamage: (waveNumber - 1) * 2,
    };
  }

  /**
   * Start a new wave
   */
  public startWave(waveNumber?: number): void {
    if (this.isWaveActive) {
      return;
    }
    
    this.currentWave = waveNumber ?? this.currentWave + 1;
    this.isWaveActive = true;
    
    const config = this.generateWaveConfig(this.currentWave);
    this.enemiesToSpawn = [...config.enemies];
    this.spawnDelay = config.spawnDelay;
    this.spawnTimer = 0;
    
    if (this.onWaveStart) {
      this.onWaveStart(this.currentWave);
    }
  }

  /**
   * Update wave manager
   */
  public update(deltaTime: number, playerPosition: Vector3): void {
    // Update existing enemies
    this.enemies.forEach(enemy => {
      enemy.update(deltaTime, playerPosition);
    });
    
    // Remove dead enemies
    this.enemies = this.enemies.filter(enemy => enemy.isAlive());
    
    // Handle spawning
    if (this.isWaveActive) {
      this.spawnTimer += deltaTime;
      
      if (this.spawnTimer >= this.spawnDelay) {
        this.spawnTimer = 0;
        this.trySpawnEnemy(playerPosition);
      }
      
      // Check if wave is complete
      if (this.enemiesToSpawn.length === 0 && this.enemies.length === 0) {
        this.completeWave();
      }
    }
  }

  /**
   * Try to spawn an enemy
   */
  private trySpawnEnemy(playerPosition: Vector3): void {
    if (this.enemiesToSpawn.length === 0) {
      return;
    }
    
    if (this.enemies.length >= this.maxEnemiesAlive) {
      return;
    }
    
    // Get next enemy type to spawn
    const spawnInfo = this.enemiesToSpawn[0];
    if (spawnInfo.count <= 0) {
      this.enemiesToSpawn.shift();
      return;
    }
    
    // Find a spawn point away from player
    const spawnPoint = this.getSpawnPointAwayFromPlayer(playerPosition);
    
    // Create enemy
    const enemy = new Enemy(this.scene, spawnInfo.type, spawnPoint);
    
    // Setup enemy callbacks
    enemy.onDeath = (e) => {
      if (this.onEnemyKilled) {
        this.onEnemyKilled(e, this.currentWave);
      }
    };
    
    enemy.onAttack = (e, damage) => {
      // This will be connected to player damage in the game
    };
    
    this.enemies.push(enemy);
    spawnInfo.count--;
    
    if (this.onEnemySpawned) {
      this.onEnemySpawned(enemy);
    }
  }

  /**
   * Get a spawn point that's away from the player
   */
  private getSpawnPointAwayFromPlayer(playerPosition: Vector3): Vector3 {
    // Find spawn points that are far enough from player
    const minDistance = 15;
    const validPoints = this.spawnPoints.filter(point => {
      return Vector3.Distance(point, playerPosition) >= minDistance;
    });
    
    if (validPoints.length === 0) {
      // Use random spawn point if all are too close
      return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)].clone();
    }
    
    // Pick random valid point
    const point = validPoints[Math.floor(Math.random() * validPoints.length)];
    
    // Add some randomness to position
    const offset = new Vector3(
      (Math.random() - 0.5) * 10,
      0,
      (Math.random() - 0.5) * 10
    );
    
    return point.add(offset);
  }

  /**
   * Complete current wave
   */
  private completeWave(): void {
    this.isWaveActive = false;
    
    if (this.onWaveComplete) {
      this.onWaveComplete(this.currentWave);
    }
  }

  /**
   * Check if an enemy was hit by a ray
   */
  public checkHit(origin: Vector3, direction: Vector3): Enemy | null {
    // Simple distance-based hit detection
    const maxDistance = 100;
    
    for (const enemy of this.enemies) {
      const enemyPos = enemy.getPosition();
      enemyPos.y = 1; // Adjust to enemy center
      
      // Calculate closest point on ray to enemy
      const toEnemy = enemyPos.subtract(origin);
      const dot = Vector3.Dot(toEnemy, direction);
      
      if (dot > 0 && dot < maxDistance) {
        const closestPoint = origin.add(direction.scale(dot));
        const distance = Vector3.Distance(closestPoint, enemyPos);
        
        // Hit detection with enemy radius
        if (distance < 1.5) {
          return enemy;
        }
      }
    }
    
    return null;
  }

  /**
   * Get current wave number
   */
  public getCurrentWave(): number {
    return this.currentWave;
  }

  /**
   * Get number of enemies alive
   */
  public getEnemiesAlive(): number {
    return this.enemies.length;
  }

  /**
   * Check if wave is active
   */
  public isActive(): boolean {
    return this.isWaveActive;
  }

  /**
   * Get all enemies
   */
  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  /**
   * Dispose of all enemies
   */
  public dispose(): void {
    this.enemies.forEach(enemy => enemy.dispose());
    this.enemies = [];
  }
}
