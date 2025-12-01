import { 
  Scene, 
  Vector3, 
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  Animation,
} from '@babylonjs/core';

export enum EnemyType {
  BASIC = 'basic',
  FAST = 'fast',
  TANK = 'tank',
  SPECIAL = 'special',
}

export enum EnemyState {
  IDLE = 'idle',
  CHASING = 'chasing',
  ATTACKING = 'attacking',
  STUNNED = 'stunned',
  DEAD = 'dead',
}

/**
 * Enemy - Basic enemy entity with AI
 */
export class Enemy {
  private scene: Scene;
  private mesh: Mesh;
  private node: TransformNode;
  
  private type: EnemyType;
  private state: EnemyState = EnemyState.IDLE;
  
  // Stats
  private health: number;
  private damage: number;
  private speed: number;
  private attackRange: number = 2;
  private attackCooldown: number = 0;
  private attackRate: number = 1; // seconds between attacks
  
  // AI
  private detectionRange: number = 30;
  private isActive: boolean = true;

  // Callbacks
  public onDeath: ((enemy: Enemy) => void) | null = null;
  public onAttack: ((enemy: Enemy, damage: number) => void) | null = null;

  constructor(scene: Scene, type: EnemyType = EnemyType.BASIC, position: Vector3) {
    this.scene = scene;
    this.type = type;
    
    // Create transform node
    this.node = new TransformNode(`enemy_${type}_${Date.now()}`, scene);
    this.node.position = position;
    
    // Set stats based on type
    const stats = this.getStatsByType(type);
    this.health = stats.health;
    this.damage = stats.damage;
    this.speed = stats.speed;
    
    // Create mesh
    this.mesh = this.createMesh(type);
    this.mesh.parent = this.node;
  }

  /**
   * Get stats for enemy type
   */
  private getStatsByType(type: EnemyType): { health: number; damage: number; speed: number } {
    switch (type) {
      case EnemyType.FAST:
        return { health: 50, damage: 10, speed: 8 };
      case EnemyType.TANK:
        return { health: 200, damage: 25, speed: 2 };
      case EnemyType.SPECIAL:
        return { health: 100, damage: 30, speed: 5 };
      case EnemyType.BASIC:
      default:
        return { health: 100, damage: 15, speed: 4 };
    }
  }

  /**
   * Create enemy mesh based on type
   */
  private createMesh(type: EnemyType): Mesh {
    let mesh: Mesh;
    let color: Color3;
    
    switch (type) {
      case EnemyType.FAST:
        mesh = MeshBuilder.CreateBox('enemy_fast', { size: 1 }, this.scene);
        color = new Color3(1, 1, 0); // Yellow
        break;
      case EnemyType.TANK:
        mesh = MeshBuilder.CreateBox('enemy_tank', { 
          width: 2, height: 2.5, depth: 2 
        }, this.scene);
        color = new Color3(0.8, 0.2, 0.2); // Dark red
        break;
      case EnemyType.SPECIAL:
        mesh = MeshBuilder.CreateSphere('enemy_special', { diameter: 1.5 }, this.scene);
        color = new Color3(0.8, 0, 0.8); // Purple
        break;
      case EnemyType.BASIC:
      default:
        mesh = MeshBuilder.CreateBox('enemy_basic', { 
          width: 1, height: 1.8, depth: 1 
        }, this.scene);
        color = new Color3(0.6, 0.1, 0.1); // Red
        break;
    }
    
    const material = new StandardMaterial(`enemyMat_${type}`, this.scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    mesh.material = material;
    
    // Position mesh center at ground level
    mesh.position.y = mesh.getBoundingInfo().boundingBox.extendSize.y;
    
    return mesh;
  }

  /**
   * Update enemy every frame
   */
  public update(deltaTime: number, playerPosition: Vector3): void {
    if (!this.isActive || this.state === EnemyState.DEAD) {
      return;
    }
    
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
    
    // Calculate distance to player
    const toPlayer = playerPosition.subtract(this.node.position);
    const distance = toPlayer.length();
    
    // Update state based on distance
    if (distance <= this.attackRange) {
      this.state = EnemyState.ATTACKING;
      this.attack();
    } else if (distance <= this.detectionRange) {
      this.state = EnemyState.CHASING;
      this.moveTowards(playerPosition, deltaTime);
    } else {
      this.state = EnemyState.IDLE;
    }
    
    // Look at player when active
    if (this.state !== EnemyState.IDLE) {
      const lookTarget = new Vector3(playerPosition.x, this.node.position.y, playerPosition.z);
      this.node.lookAt(lookTarget);
    }
  }

  /**
   * Move towards target position
   */
  private moveTowards(target: Vector3, deltaTime: number): void {
    const direction = target.subtract(this.node.position);
    direction.y = 0; // Keep on ground
    direction.normalize();
    
    this.node.position.addInPlace(direction.scale(this.speed * deltaTime));
  }

  /**
   * Attack the player
   */
  private attack(): void {
    if (this.attackCooldown > 0) {
      return;
    }
    
    this.attackCooldown = this.attackRate;
    
    if (this.onAttack) {
      this.onAttack(this, this.damage);
    }
  }

  /**
   * Take damage
   */
  public takeDamage(amount: number): void {
    if (this.state === EnemyState.DEAD) {
      return;
    }
    
    this.health -= amount;
    
    // Flash red on hit
    this.flashDamage();
    
    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Flash effect when taking damage
   */
  private flashDamage(): void {
    const material = this.mesh.material as StandardMaterial;
    const originalColor = material.diffuseColor.clone();
    
    material.diffuseColor = new Color3(1, 1, 1);
    
    setTimeout(() => {
      if (material) {
        material.diffuseColor = originalColor;
      }
    }, 100);
  }

  /**
   * Handle enemy death
   */
  private die(): void {
    this.state = EnemyState.DEAD;
    this.isActive = false;
    
    // Death animation - scale down and fade
    Animation.CreateAndStartAnimation(
      'deathAnim',
      this.mesh,
      'scaling',
      30,
      15,
      this.mesh.scaling,
      Vector3.Zero(),
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      () => {
        if (this.onDeath) {
          this.onDeath(this);
        }
        this.dispose();
      }
    );
  }

  /**
   * Get enemy position
   */
  public getPosition(): Vector3 {
    return this.node.position.clone();
  }

  /**
   * Get enemy mesh for raycasting
   */
  public getMesh(): Mesh {
    return this.mesh;
  }

  /**
   * Get enemy type
   */
  public getType(): EnemyType {
    return this.type;
  }

  /**
   * Check if enemy is alive
   */
  public isAlive(): boolean {
    return this.health > 0 && this.isActive;
  }

  /**
   * Dispose of enemy resources
   */
  public dispose(): void {
    this.mesh.dispose();
    this.node.dispose();
  }
}
