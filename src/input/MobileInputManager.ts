import { Scene, UniversalCamera, Vector3 } from '@babylonjs/core';
import { 
  AdvancedDynamicTexture, 
  Ellipse, 
  Button, 
  Control,
  Rectangle,
} from '@babylonjs/gui';
import { InputAction } from './PCInputManager';

/**
 * VirtualJoystick - Touch-based virtual joystick for mobile
 */
interface VirtualJoystick {
  container: Ellipse;
  stick: Ellipse;
  pressed: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * MobileInputManager - Handles touch input for mobile devices
 */
export class MobileInputManager {
  private scene: Scene;
  private camera: UniversalCamera;
  private ui: AdvancedDynamicTexture;
  
  private leftJoystick: VirtualJoystick | null = null;
  private rightJoystick: VirtualJoystick | null = null;
  
  private actionStates: Map<InputAction, boolean> = new Map();
  private actionCallbacks: Map<InputAction, (() => void)[]> = new Map();
  
  private joystickSize: number = 150;
  private joystickMargin: number = 50;
  
  private shootButton: Button | null = null;
  private reloadButton: Button | null = null;
  private jumpButton: Button | null = null;

  constructor(scene: Scene, camera: UniversalCamera) {
    this.scene = scene;
    this.camera = camera;
    
    // Create fullscreen UI
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI('mobileUI', true, scene);
    
    this.createJoysticks();
    this.createActionButtons();
  }

  /**
   * Check if device is mobile/touch
   */
  public static isMobileDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Create virtual joysticks for movement and camera
   */
  private createJoysticks(): void {
    // Left joystick for movement
    this.leftJoystick = this.createJoystick('leftJoystick');
    this.leftJoystick.container.left = this.joystickMargin;
    this.leftJoystick.container.top = -this.joystickMargin;
    this.leftJoystick.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.leftJoystick.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    // Right joystick for camera look
    this.rightJoystick = this.createJoystick('rightJoystick');
    this.rightJoystick.container.left = -this.joystickMargin;
    this.rightJoystick.container.top = -this.joystickMargin;
    this.rightJoystick.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.rightJoystick.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    this.ui.addControl(this.leftJoystick.container);
    this.ui.addControl(this.rightJoystick.container);

    this.setupJoystickTouch();
  }

  /**
   * Create a single virtual joystick
   */
  private createJoystick(name: string): VirtualJoystick {
    // Outer container
    const container = new Ellipse(name + '_container');
    container.width = this.joystickSize + 'px';
    container.height = this.joystickSize + 'px';
    container.background = 'rgba(255, 255, 255, 0.2)';
    container.color = 'rgba(255, 255, 255, 0.4)';
    container.thickness = 2;

    // Inner stick
    const stick = new Ellipse(name + '_stick');
    stick.width = (this.joystickSize * 0.4) + 'px';
    stick.height = (this.joystickSize * 0.4) + 'px';
    stick.background = 'rgba(255, 255, 255, 0.5)';
    stick.color = 'rgba(255, 255, 255, 0.7)';
    stick.thickness = 2;
    
    container.addControl(stick);

    return {
      container,
      stick,
      pressed: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    };
  }

  /**
   * Setup touch handling for joysticks
   */
  private setupJoystickTouch(): void {
    // We'll use pointer events on the canvas for more control
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const activeTouches: Map<number, 'left' | 'right' | 'none'> = new Map();

    canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const isLeftSide = touch.clientX < canvas.width / 2;
        
        if (isLeftSide && this.leftJoystick && !this.leftJoystick.pressed) {
          this.leftJoystick.pressed = true;
          this.leftJoystick.startX = touch.clientX;
          this.leftJoystick.startY = touch.clientY;
          activeTouches.set(touch.identifier, 'left');
        } else if (!isLeftSide && this.rightJoystick && !this.rightJoystick.pressed) {
          this.rightJoystick.pressed = true;
          this.rightJoystick.startX = touch.clientX;
          this.rightJoystick.startY = touch.clientY;
          activeTouches.set(touch.identifier, 'right');
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const joystickSide = activeTouches.get(touch.identifier);
        
        if (joystickSide === 'left' && this.leftJoystick) {
          this.updateJoystick(this.leftJoystick, touch.clientX, touch.clientY);
        } else if (joystickSide === 'right' && this.rightJoystick) {
          this.updateJoystick(this.rightJoystick, touch.clientX, touch.clientY);
          this.updateCameraFromJoystick();
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (event) => {
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const joystickSide = activeTouches.get(touch.identifier);
        
        if (joystickSide === 'left' && this.leftJoystick) {
          this.resetJoystick(this.leftJoystick);
        } else if (joystickSide === 'right' && this.rightJoystick) {
          this.resetJoystick(this.rightJoystick);
        }
        
        activeTouches.delete(touch.identifier);
      }
    });
  }

  /**
   * Update joystick position based on touch
   */
  private updateJoystick(joystick: VirtualJoystick, touchX: number, touchY: number): void {
    const deltaX = touchX - joystick.startX;
    const deltaY = touchY - joystick.startY;
    
    const maxDistance = this.joystickSize * 0.4;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let clampedX = deltaX;
    let clampedY = deltaY;
    
    if (distance > maxDistance) {
      clampedX = (deltaX / distance) * maxDistance;
      clampedY = (deltaY / distance) * maxDistance;
    }
    
    joystick.currentX = clampedX / maxDistance;
    joystick.currentY = clampedY / maxDistance;
    
    // Update visual position
    joystick.stick.left = clampedX + 'px';
    joystick.stick.top = clampedY + 'px';
  }

  /**
   * Reset joystick to center
   */
  private resetJoystick(joystick: VirtualJoystick): void {
    joystick.pressed = false;
    joystick.currentX = 0;
    joystick.currentY = 0;
    joystick.stick.left = '0px';
    joystick.stick.top = '0px';
  }

  /**
   * Update camera rotation based on right joystick
   */
  private updateCameraFromJoystick(): void {
    if (!this.rightJoystick) return;
    
    const sensitivity = 0.05;
    this.camera.rotation.y += this.rightJoystick.currentX * sensitivity;
    this.camera.rotation.x += this.rightJoystick.currentY * sensitivity;
    
    // Clamp vertical rotation
    this.camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.camera.rotation.x));
  }

  /**
   * Create action buttons (shoot, reload, jump)
   */
  private createActionButtons(): void {
    // Shoot button (large, right side)
    this.shootButton = this.createButton('shootBtn', '🔫', 80);
    this.shootButton.left = -this.joystickMargin;
    this.shootButton.top = -this.joystickMargin - this.joystickSize - 20;
    this.shootButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.shootButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.shootButton.onPointerDownObservable.add(() => {
      this.actionStates.set(InputAction.SHOOT, true);
      this.triggerActionCallbacks(InputAction.SHOOT);
    });
    this.shootButton.onPointerUpObservable.add(() => {
      this.actionStates.set(InputAction.SHOOT, false);
    });
    this.ui.addControl(this.shootButton);

    // Reload button
    this.reloadButton = this.createButton('reloadBtn', 'R', 50);
    this.reloadButton.left = -this.joystickMargin - 100;
    this.reloadButton.top = -this.joystickMargin - this.joystickSize - 40;
    this.reloadButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.reloadButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.reloadButton.onPointerDownObservable.add(() => {
      this.triggerActionCallbacks(InputAction.RELOAD);
    });
    this.ui.addControl(this.reloadButton);

    // Jump button
    this.jumpButton = this.createButton('jumpBtn', '⬆', 60);
    this.jumpButton.left = this.joystickMargin + this.joystickSize + 20;
    this.jumpButton.top = -this.joystickMargin - 30;
    this.jumpButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.jumpButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.jumpButton.onPointerDownObservable.add(() => {
      this.triggerActionCallbacks(InputAction.JUMP);
    });
    this.ui.addControl(this.jumpButton);
  }

  /**
   * Create a styled button
   */
  private createButton(name: string, text: string, size: number): Button {
    const button = Button.CreateSimpleButton(name, text);
    button.width = size + 'px';
    button.height = size + 'px';
    button.cornerRadius = size / 2;
    button.background = 'rgba(255, 255, 255, 0.3)';
    button.color = 'white';
    button.thickness = 2;
    button.fontSize = size * 0.4;
    return button;
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
   * Get movement direction from left joystick
   */
  public getMovementDirection(): Vector3 {
    if (!this.leftJoystick) {
      return Vector3.Zero();
    }
    
    // Invert Y because joystick up is negative
    return new Vector3(this.leftJoystick.currentX, 0, -this.leftJoystick.currentY);
  }

  /**
   * Show/hide mobile controls
   */
  public setVisible(visible: boolean): void {
    this.ui.rootContainer.isVisible = visible;
  }

  /**
   * Dispose of mobile UI
   */
  public dispose(): void {
    this.ui.dispose();
  }
}
