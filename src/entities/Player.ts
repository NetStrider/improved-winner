import { 
  Scene, 
  Vector3, 
  UniversalCamera, 
  TransformNode,
  Ray,
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
} from '@babylonjs/core';
import { PCInputManager, MobileInputManager, VRInputManager, InputAction } from '../input';

/**
 * Player - Main player entity with movement, physics, and shooting
 */
export class Player {
  private scene: Scene;
  private camera: UniversalCamera;
  private playerNode: TransformNode;
  
  private pcInput: PCInputManager | null = null;
  private mobileInput: MobileInputManager | null = null;
  private vrInput: VRInputManager | null = null;
  
  // Player stats
  private health: number = 100;
  private maxHealth: number = 100;
  private armor: number = 0;
  private maxArmor: number = 100;
  
  // Movement
  private moveSpeed: number = 6;
  private sprintMultiplier: number = 1.6;
  private jumpForce: number = 8;
  private gravity: number = -20;
  private verticalVelocity: number = 0;
  private isGrounded: boolean = true;
  
  // Shooting
  private shootCooldown: number = 0;
  private shootRate: number = 0.1; // seconds between shots
  private isReloading: boolean = false;
  private ammo: number = 30;
  private maxAmmo: number = 30;
  private reserveAmmo: number = 120;

  // Weapon visuals
  private weaponMesh: Mesh | null = null;

  // Callbacks
  public onHealthChanged: ((health: number, maxHealth: number) => void) | null = null;
  public onAmmoChanged: ((ammo: number, maxAmmo: number, reserve: number) => void) | null = null;
  public onShoot: ((origin: Vector3, direction: Vector3) => void) | null = null;

  constructor(scene: Scene, camera: UniversalCamera) {
    this.scene = scene;
    this.camera = camera;
    
    // Create player transform node
    this.playerNode = new TransformNode('player', scene);
    this.playerNode.position = camera.position.clone();
    
    this.createWeaponMesh();
  }

  /**
   * Create a simple weapon mesh
   */
  private createWeaponMesh(): void {
    // Create a simple box as placeholder weapon
    this.weaponMesh = MeshBuilder.CreateBox('weapon', {
      width: 0.1,
      height: 0.1,
      depth: 0.5,
    }, this.scene);
    
    const weaponMat = new StandardMaterial('weaponMat', this.scene);
    weaponMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
    weaponMat.specularColor = new Color3(0.3, 0.3, 0.3);
    this.weaponMesh.material = weaponMat;
    
    // Position weapon relative to camera
    this.weaponMesh.parent = this.camera;
    this.weaponMesh.position = new Vector3(0.3, -0.2, 0.5);
  }

  /**
   * Set PC input manager
   */
  public setPCInput(input: PCInputManager): void {
    this.pcInput = input;
    this.setupPCInputCallbacks();
  }

  /**
   * Set mobile input manager
   */
  public setMobileInput(input: MobileInputManager): void {
    this.mobileInput = input;
    this.setupMobileInputCallbacks();
  }

  /**
   * Set VR input manager
   */
  public setVRInput(input: VRInputManager): void {
    this.vrInput = input;
    this.setupVRInputCallbacks();
  }

  /**
   * Setup PC input callbacks
   */
  private setupPCInputCallbacks(): void {
    if (!this.pcInput) return;
    
    this.pcInput.onAction(InputAction.JUMP, () => this.jump());
    this.pcInput.onAction(InputAction.RELOAD, () => this.reload());
    this.pcInput.onAction(InputAction.SHOOT, () => this.shoot());
  }

  /**
   * Setup mobile input callbacks
   */
  private setupMobileInputCallbacks(): void {
    if (!this.mobileInput) return;
    
    this.mobileInput.onAction(InputAction.JUMP, () => this.jump());
    this.mobileInput.onAction(InputAction.RELOAD, () => this.reload());
    this.mobileInput.onAction(InputAction.SHOOT, () => this.shoot());
  }

  /**
   * Setup VR input callbacks
   */
  private setupVRInputCallbacks(): void {
    if (!this.vrInput) return;
    
    this.vrInput.onAction(InputAction.JUMP, () => this.jump());
    this.vrInput.onAction(InputAction.RELOAD, () => this.reload());
    this.vrInput.onAction(InputAction.SHOOT, () => this.shoot());
  }

  /**
   * Update player every frame
   */
  public update(deltaTime: number): void {
    this.updateMovement(deltaTime);
    this.updateShooting(deltaTime);
    
    // Sync player node with camera
    this.playerNode.position = this.camera.position.clone();
  }

  /**
   * Update player movement
   */
  private updateMovement(deltaTime: number): void {
    let movementDir = Vector3.Zero();
    let isSprinting = false;
    
    // Get movement input from active input manager
    if (this.pcInput) {
      movementDir = this.pcInput.getMovementDirection();
      isSprinting = this.pcInput.isActionActive(InputAction.SPRINT);
    } else if (this.mobileInput) {
      movementDir = this.mobileInput.getMovementDirection();
    } else if (this.vrInput) {
      movementDir = this.vrInput.getMovementDirection();
      isSprinting = this.vrInput.isActionActive(InputAction.SPRINT);
    }
    
    if (movementDir.length() > 0) {
      // Transform movement direction based on camera rotation
      const forward = this.camera.getDirection(Vector3.Forward());
      const right = this.camera.getDirection(Vector3.Right());
      
      forward.y = 0;
      forward.normalize();
      right.y = 0;
      right.normalize();
      
      const moveVec = forward.scale(movementDir.z)
        .add(right.scale(movementDir.x));
      
      let speed = this.moveSpeed;
      if (isSprinting) {
        speed *= this.sprintMultiplier;
      }
      
      moveVec.normalize();
      moveVec.scaleInPlace(speed * deltaTime);
      
      this.camera.position.addInPlace(moveVec);
    }
    
    // Apply gravity
    if (!this.isGrounded) {
      this.verticalVelocity += this.gravity * deltaTime;
    }
    
    this.camera.position.y += this.verticalVelocity * deltaTime;
    
    // Ground check (simple)
    if (this.camera.position.y <= 2) {
      this.camera.position.y = 2;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }
  }

  /**
   * Update shooting mechanics
   */
  private updateShooting(deltaTime: number): void {
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }
    
    // Handle continuous fire for PC
    if (this.pcInput?.isActionActive(InputAction.SHOOT)) {
      this.shoot();
    }
  }

  /**
   * Attempt to jump
   */
  public jump(): void {
    if (this.isGrounded) {
      this.verticalVelocity = this.jumpForce;
      this.isGrounded = false;
    }
  }

  /**
   * Fire weapon
   */
  public shoot(): void {
    if (this.shootCooldown > 0 || this.isReloading || this.ammo <= 0) {
      return;
    }
    
    this.ammo--;
    this.shootCooldown = this.shootRate;
    
    // Get shoot direction
    let origin: Vector3;
    let direction: Vector3;
    
    if (this.vrInput) {
      const vrOrigin = this.vrInput.getRightControllerPosition();
      const vrDir = this.vrInput.getAimDirection();
      if (vrOrigin && vrDir) {
        origin = vrOrigin;
        direction = vrDir;
      } else {
        origin = this.camera.position;
        direction = this.camera.getDirection(Vector3.Forward());
      }
    } else {
      origin = this.camera.position;
      direction = this.camera.getDirection(Vector3.Forward());
    }
    
    // Perform raycast (for future hit detection expansion)
    new Ray(origin, direction, 100);
    
    // Trigger callback
    if (this.onShoot) {
      this.onShoot(origin, direction);
    }
    
    // Auto-reload when empty
    if (this.ammo <= 0 && this.reserveAmmo > 0) {
      this.reload();
    }
    
    this.notifyAmmoChanged();
  }

  /**
   * Reload weapon
   */
  public reload(): void {
    if (this.isReloading || this.ammo === this.maxAmmo || this.reserveAmmo <= 0) {
      return;
    }
    
    this.isReloading = true;
    
    // Simulate reload time
    setTimeout(() => {
      const ammoNeeded = this.maxAmmo - this.ammo;
      const ammoToReload = Math.min(ammoNeeded, this.reserveAmmo);
      
      this.ammo += ammoToReload;
      this.reserveAmmo -= ammoToReload;
      this.isReloading = false;
      
      this.notifyAmmoChanged();
    }, 1500);
    
    this.notifyAmmoChanged();
  }

  /**
   * Take damage
   */
  public takeDamage(amount: number): void {
    // Apply to armor first
    if (this.armor > 0) {
      const armorDamage = Math.min(this.armor, amount * 0.7);
      this.armor -= armorDamage;
      amount -= armorDamage;
    }
    
    this.health = Math.max(0, this.health - amount);
    
    if (this.onHealthChanged) {
      this.onHealthChanged(this.health, this.maxHealth);
    }
  }

  /**
   * Heal player
   */
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    
    if (this.onHealthChanged) {
      this.onHealthChanged(this.health, this.maxHealth);
    }
  }

  /**
   * Add armor
   */
  public addArmor(amount: number): void {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }

  /**
   * Add ammo
   */
  public addAmmo(amount: number): void {
    this.reserveAmmo += amount;
    this.notifyAmmoChanged();
  }

  private notifyAmmoChanged(): void {
    if (this.onAmmoChanged) {
      this.onAmmoChanged(this.ammo, this.maxAmmo, this.reserveAmmo);
    }
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public getPosition(): Vector3 {
    return this.camera.position.clone();
  }

  public isAlive(): boolean {
    return this.health > 0;
  }
}
