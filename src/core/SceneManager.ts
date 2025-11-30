import { 
  Scene, 
  UniversalCamera, 
  Vector3, 
  HemisphericLight, 
  DirectionalLight,
  ShadowGenerator,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Texture,
  CubeTexture,
} from '@babylonjs/core';

/**
 * SceneManager - Handles scene setup and environment
 */
export class SceneManager {
  private scene: Scene;
  private camera: UniversalCamera | null = null;
  private shadowGenerator: ShadowGenerator | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialize the game scene with lighting, camera, and environment
   */
  public setupScene(canvas: HTMLCanvasElement): UniversalCamera {
    // Set scene clear color
    this.scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);

    // Create camera
    this.camera = new UniversalCamera('playerCamera', new Vector3(0, 2, -10), this.scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(canvas, true);
    
    // Camera settings for FPS feel
    this.camera.speed = 0.5;
    this.camera.angularSensibility = 1000;
    this.camera.minZ = 0.1;
    this.camera.fov = 1.2; // Wider FOV for shooter feel

    // Create ambient light
    const hemisphericLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
    hemisphericLight.intensity = 0.4;
    hemisphericLight.groundColor = new Color3(0.2, 0.2, 0.3);

    // Create main directional light (sun/moon)
    const directionalLight = new DirectionalLight('mainLight', new Vector3(-1, -2, -1), this.scene);
    directionalLight.position = new Vector3(20, 40, 20);
    directionalLight.intensity = 0.8;

    // Setup shadows
    this.shadowGenerator = new ShadowGenerator(2048, directionalLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;

    // Create ground
    this.createGround();

    // Create test environment
    this.createTestEnvironment();

    return this.camera;
  }

  /**
   * Create ground plane
   */
  private createGround(): void {
    const ground = MeshBuilder.CreateGround('ground', { 
      width: 100, 
      height: 100,
      subdivisions: 4,
    }, this.scene);

    const groundMaterial = new StandardMaterial('groundMat', this.scene);
    groundMaterial.diffuseColor = new Color3(0.3, 0.3, 0.35);
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    ground.receiveShadows = true;
  }

  /**
   * Create test environment with obstacles
   */
  private createTestEnvironment(): void {
    // Create some boxes as obstacles/cover
    const boxMaterial = new StandardMaterial('boxMat', this.scene);
    boxMaterial.diffuseColor = new Color3(0.5, 0.4, 0.3);

    const positions = [
      new Vector3(5, 1, 5),
      new Vector3(-5, 1.5, 8),
      new Vector3(8, 1, -3),
      new Vector3(-8, 2, -6),
      new Vector3(0, 1, 15),
    ];

    positions.forEach((pos, index) => {
      const box = MeshBuilder.CreateBox(`obstacle_${index}`, {
        width: 2 + Math.random() * 2,
        height: 2 + Math.random() * 2,
        depth: 2 + Math.random() * 2,
      }, this.scene);
      box.position = pos;
      box.material = boxMaterial;
      box.receiveShadows = true;

      if (this.shadowGenerator) {
        this.shadowGenerator.addShadowCaster(box);
      }
    });
  }

  public getCamera(): UniversalCamera | null {
    return this.camera;
  }

  public getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator;
  }
}
