import { Scene, UniversalCamera, Vector3, KeyboardEventTypes, PointerEventTypes } from '@babylonjs/core';

/**
 * InputAction - Defines game input actions
 */
export enum InputAction {
  MOVE_FORWARD = 'moveForward',
  MOVE_BACKWARD = 'moveBackward',
  MOVE_LEFT = 'moveLeft',
  MOVE_RIGHT = 'moveRight',
  JUMP = 'jump',
  CROUCH = 'crouch',
  SPRINT = 'sprint',
  SHOOT = 'shoot',
  RELOAD = 'reload',
  INTERACT = 'interact',
  WEAPON_NEXT = 'weaponNext',
  WEAPON_PREV = 'weaponPrev',
}

/**
 * PCInputManager - Handles keyboard and mouse input for PC
 */
export class PCInputManager {
  private scene: Scene;
  private camera: UniversalCamera;
  private canvas: HTMLCanvasElement;
  
  private keyStates: Map<string, boolean> = new Map();
  private actionStates: Map<InputAction, boolean> = new Map();
  private actionCallbacks: Map<InputAction, (() => void)[]> = new Map();
  
  private isPointerLocked: boolean = false;
  private mouseSensitivity: number = 0.002;
  
  // Key bindings
  private keyBindings: Map<string, InputAction> = new Map([
    ['KeyW', InputAction.MOVE_FORWARD],
    ['KeyS', InputAction.MOVE_BACKWARD],
    ['KeyA', InputAction.MOVE_LEFT],
    ['KeyD', InputAction.MOVE_RIGHT],
    ['Space', InputAction.JUMP],
    ['ControlLeft', InputAction.CROUCH],
    ['ShiftLeft', InputAction.SPRINT],
    ['KeyR', InputAction.RELOAD],
    ['KeyE', InputAction.INTERACT],
  ]);

  constructor(scene: Scene, camera: UniversalCamera, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    
    this.initializeKeyboard();
    this.initializeMouse();
  }

  /**
   * Initialize keyboard input handling
   */
  private initializeKeyboard(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.code;
      
      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        this.keyStates.set(key, true);
        
        const action = this.keyBindings.get(key);
        if (action) {
          const wasActive = this.actionStates.get(action);
          this.actionStates.set(action, true);
          
          // Trigger callbacks on key down
          if (!wasActive) {
            this.triggerActionCallbacks(action);
          }
        }
      } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
        this.keyStates.set(key, false);
        
        const action = this.keyBindings.get(key);
        if (action) {
          this.actionStates.set(action, false);
        }
      }
    });
  }

  /**
   * Initialize mouse input handling
   */
  private initializeMouse(): void {
    // Request pointer lock on canvas click
    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });

    // Track pointer lock state
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    // Handle mouse movement for camera rotation
    document.addEventListener('mousemove', (event) => {
      if (this.isPointerLocked) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.camera.rotation.y += movementX * this.mouseSensitivity;
        this.camera.rotation.x += movementY * this.mouseSensitivity;
        
        // Clamp vertical rotation
        this.camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.camera.rotation.x));
      }
    });

    // Handle mouse buttons
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        if (pointerInfo.event.button === 0) { // Left click
          this.actionStates.set(InputAction.SHOOT, true);
          this.triggerActionCallbacks(InputAction.SHOOT);
        }
      } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        if (pointerInfo.event.button === 0) {
          this.actionStates.set(InputAction.SHOOT, false);
        }
      }
    });

    // Handle mouse wheel for weapon switching
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.triggerActionCallbacks(InputAction.WEAPON_NEXT);
      } else {
        this.triggerActionCallbacks(InputAction.WEAPON_PREV);
      }
    }, { passive: false });
  }

  /**
   * Check if an action is currently active
   */
  public isActionActive(action: InputAction): boolean {
    return this.actionStates.get(action) || false;
  }

  /**
   * Register a callback for an action
   */
  public onAction(action: InputAction, callback: () => void): void {
    if (!this.actionCallbacks.has(action)) {
      this.actionCallbacks.set(action, []);
    }
    this.actionCallbacks.get(action)!.push(callback);
  }

  /**
   * Trigger all callbacks for an action
   */
  private triggerActionCallbacks(action: InputAction): void {
    const callbacks = this.actionCallbacks.get(action);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  }

  /**
   * Get movement direction vector based on current input
   */
  public getMovementDirection(): Vector3 {
    const direction = new Vector3(0, 0, 0);
    
    if (this.isActionActive(InputAction.MOVE_FORWARD)) direction.z += 1;
    if (this.isActionActive(InputAction.MOVE_BACKWARD)) direction.z -= 1;
    if (this.isActionActive(InputAction.MOVE_LEFT)) direction.x -= 1;
    if (this.isActionActive(InputAction.MOVE_RIGHT)) direction.x += 1;
    
    if (direction.length() > 0) {
      direction.normalize();
    }
    
    return direction;
  }

  /**
   * Set mouse sensitivity
   */
  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }
}
