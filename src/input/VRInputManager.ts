import { 
  Scene,
  Vector3, 
  WebXRDefaultExperience,
  WebXRInputSource,
} from '@babylonjs/core';
import { InputAction } from './PCInputManager';

/**
 * VRInputManager - Handles VR controller input
 */
export class VRInputManager {
  private xrExperience: WebXRDefaultExperience;
  
  private actionStates: Map<InputAction, boolean> = new Map();
  private actionCallbacks: Map<InputAction, (() => void)[]> = new Map();
  
  private leftController: WebXRInputSource | null = null;
  private rightController: WebXRInputSource | null = null;
  
  private movementDirection: Vector3 = Vector3.Zero();

  constructor(_scene: Scene, xrExperience: WebXRDefaultExperience) {
    this.xrExperience = xrExperience;
    
    this.setupControllers();
  }

  /**
   * Setup VR controller input handling
   */
  private setupControllers(): void {
    const inputManager = this.xrExperience.input;
    
    inputManager.onControllerAddedObservable.add((controller) => {
      const handedness = controller.inputSource.handedness;
      
      if (handedness === 'left') {
        this.leftController = controller;
        this.setupLeftController(controller);
      } else if (handedness === 'right') {
        this.rightController = controller;
        this.setupRightController(controller);
      }
    });

    inputManager.onControllerRemovedObservable.add((controller) => {
      if (controller === this.leftController) {
        this.leftController = null;
      } else if (controller === this.rightController) {
        this.rightController = null;
      }
    });
  }

  /**
   * Setup left controller (movement)
   */
  private setupLeftController(controller: WebXRInputSource): void {
    controller.onMotionControllerInitObservable.add((motionController) => {
      // Thumbstick for movement
      const thumbstick = motionController.getComponent('xr-standard-thumbstick');
      if (thumbstick) {
        thumbstick.onAxisValueChangedObservable.add((values) => {
          this.movementDirection.x = values.x;
          this.movementDirection.z = -values.y;
        });
      }

      // Trigger for sprint
      const trigger = motionController.getComponent('xr-standard-trigger');
      if (trigger) {
        trigger.onButtonStateChangedObservable.add((component) => {
          this.actionStates.set(InputAction.SPRINT, component.pressed);
        });
      }

      // Grip for crouch
      const grip = motionController.getComponent('xr-standard-squeeze');
      if (grip) {
        grip.onButtonStateChangedObservable.add((component) => {
          if (component.pressed) {
            this.triggerActionCallbacks(InputAction.CROUCH);
          }
        });
      }

      // X button for reload
      const xButton = motionController.getComponent('x-button');
      if (xButton) {
        xButton.onButtonStateChangedObservable.add((component) => {
          if (component.pressed) {
            this.triggerActionCallbacks(InputAction.RELOAD);
          }
        });
      }
    });
  }

  /**
   * Setup right controller (shooting/interaction)
   */
  private setupRightController(controller: WebXRInputSource): void {
    controller.onMotionControllerInitObservable.add((motionController) => {
      // Trigger for shooting
      const trigger = motionController.getComponent('xr-standard-trigger');
      if (trigger) {
        trigger.onButtonStateChangedObservable.add((component) => {
          const wasPressed = this.actionStates.get(InputAction.SHOOT);
          this.actionStates.set(InputAction.SHOOT, component.pressed);
          
          if (component.pressed && !wasPressed) {
            this.triggerActionCallbacks(InputAction.SHOOT);
          }
        });
      }

      // Grip for interact
      const grip = motionController.getComponent('xr-standard-squeeze');
      if (grip) {
        grip.onButtonStateChangedObservable.add((component) => {
          if (component.pressed) {
            this.triggerActionCallbacks(InputAction.INTERACT);
          }
        });
      }

      // A button for jump
      const aButton = motionController.getComponent('a-button');
      if (aButton) {
        aButton.onButtonStateChangedObservable.add((component) => {
          if (component.pressed) {
            this.triggerActionCallbacks(InputAction.JUMP);
          }
        });
      }

      // B button for weapon switch
      const bButton = motionController.getComponent('b-button');
      if (bButton) {
        bButton.onButtonStateChangedObservable.add((component) => {
          if (component.pressed) {
            this.triggerActionCallbacks(InputAction.WEAPON_NEXT);
          }
        });
      }
    });
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
   * Get movement direction from left thumbstick
   */
  public getMovementDirection(): Vector3 {
    return this.movementDirection.clone();
  }

  /**
   * Get the aim direction from the right controller
   */
  public getAimDirection(): Vector3 | null {
    if (!this.rightController?.grip) {
      return null;
    }
    
    const gripMesh = this.rightController.grip;
    return gripMesh.forward;
  }

  /**
   * Get right controller position for weapon placement
   */
  public getRightControllerPosition(): Vector3 | null {
    if (!this.rightController?.grip) {
      return null;
    }
    
    return this.rightController.grip.position;
  }
}
