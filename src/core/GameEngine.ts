import { Engine, Scene, WebXRDefaultExperience, WebXRState } from '@babylonjs/core';
import '@babylonjs/core/XR/webXRDefaultExperience';

/**
 * GameEngine - Core engine wrapper for BabylonJS
 * Handles engine initialization, scene management, and render loop
 */
export class GameEngine {
  private engine: Engine;
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private xrExperience: WebXRDefaultExperience | null = null;
  private isVRMode: boolean = false;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id '${canvasId}' not found`);
    }
    this.canvas = canvas;
    
    // Create engine with hardware scaling for optimization
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    // Create scene
    this.scene = new Scene(this.engine);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public isInVR(): boolean {
    return this.isVRMode;
  }

  /**
   * Initialize WebXR VR support
   */
  public async initVR(): Promise<WebXRDefaultExperience | null> {
    try {
      // Check if WebXR is available via navigator
      if (!navigator.xr) {
        console.warn('WebXR is not supported on this browser');
        return null;
      }

      const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!isSupported) {
        console.warn('WebXR VR is not supported on this device');
        return null;
      }

      this.xrExperience = await this.scene.createDefaultXRExperienceAsync({
        floorMeshes: [],
        uiOptions: {
          sessionMode: 'immersive-vr',
        },
      });

      // Track VR mode state
      this.xrExperience.baseExperience.onStateChangedObservable.add((state) => {
        this.isVRMode = state === WebXRState.IN_XR;
      });

      return this.xrExperience;
    } catch (error) {
      console.warn('Failed to initialize VR:', error);
      return null;
    }
  }

  public getXRExperience(): WebXRDefaultExperience | null {
    return this.xrExperience;
  }

  /**
   * Start the render loop
   */
  public run(onRender?: () => void): void {
    this.engine.runRenderLoop(() => {
      if (onRender) {
        onRender();
      }
      this.scene.render();
    });
  }

  /**
   * Stop the render loop
   */
  public stop(): void {
    this.engine.stopRenderLoop();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}
