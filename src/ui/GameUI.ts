import { Scene } from '@babylonjs/core';
import { 
  AdvancedDynamicTexture, 
  TextBlock, 
  Rectangle,
  Control,
  StackPanel,
  Button,
} from '@babylonjs/gui';

/**
 * GameUI - Heads-up display for the game
 */
export class GameUI {
  private scene: Scene;
  private ui: AdvancedDynamicTexture;
  
  // UI elements
  private healthBar: Rectangle | null = null;
  private healthText: TextBlock | null = null;
  private ammoText: TextBlock | null = null;
  private waveText: TextBlock | null = null;
  private enemyCountText: TextBlock | null = null;
  private scoreText: TextBlock | null = null;
  private crosshair: TextBlock | null = null;
  private messageText: TextBlock | null = null;
  
  // State
  private messageTimeout: number | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI('gameUI', true, scene);
    
    this.createHUD();
  }

  /**
   * Create all HUD elements
   */
  private createHUD(): void {
    this.createCrosshair();
    this.createHealthDisplay();
    this.createAmmoDisplay();
    this.createWaveDisplay();
    this.createScoreDisplay();
    this.createMessageDisplay();
  }

  /**
   * Create crosshair
   */
  private createCrosshair(): void {
    this.crosshair = new TextBlock('crosshair', '+');
    this.crosshair.color = 'white';
    this.crosshair.fontSize = 30;
    this.crosshair.fontFamily = 'monospace';
    this.crosshair.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.crosshair.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.ui.addControl(this.crosshair);
  }

  /**
   * Create health display
   */
  private createHealthDisplay(): void {
    // Health container
    const healthContainer = new Rectangle('healthContainer');
    healthContainer.width = '200px';
    healthContainer.height = '30px';
    healthContainer.cornerRadius = 5;
    healthContainer.color = 'white';
    healthContainer.thickness = 2;
    healthContainer.background = 'rgba(0, 0, 0, 0.5)';
    healthContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    healthContainer.left = 20;
    healthContainer.top = -20;
    this.ui.addControl(healthContainer);
    
    // Health bar fill
    this.healthBar = new Rectangle('healthBar');
    this.healthBar.width = '100%';
    this.healthBar.height = '100%';
    this.healthBar.background = 'rgba(255, 50, 50, 0.8)';
    this.healthBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthContainer.addControl(this.healthBar);
    
    // Health text
    this.healthText = new TextBlock('healthText', '100');
    this.healthText.color = 'white';
    this.healthText.fontSize = 18;
    this.healthText.fontFamily = 'Arial';
    this.healthText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    healthContainer.addControl(this.healthText);
  }

  /**
   * Create ammo display
   */
  private createAmmoDisplay(): void {
    this.ammoText = new TextBlock('ammoText', '30 / 120');
    this.ammoText.color = 'white';
    this.ammoText.fontSize = 24;
    this.ammoText.fontFamily = 'Arial';
    this.ammoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.ammoText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.ammoText.paddingRight = '20px';
    this.ammoText.paddingBottom = '20px';
    this.ui.addControl(this.ammoText);
  }

  /**
   * Create wave display
   */
  private createWaveDisplay(): void {
    this.waveText = new TextBlock('waveText', 'Wave: 1');
    this.waveText.color = 'white';
    this.waveText.fontSize = 24;
    this.waveText.fontFamily = 'Arial';
    this.waveText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.waveText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.waveText.paddingTop = '20px';
    this.ui.addControl(this.waveText);
    
    this.enemyCountText = new TextBlock('enemyCountText', 'Enemies: 0');
    this.enemyCountText.color = 'white';
    this.enemyCountText.fontSize = 18;
    this.enemyCountText.fontFamily = 'Arial';
    this.enemyCountText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.enemyCountText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.enemyCountText.paddingTop = '50px';
    this.ui.addControl(this.enemyCountText);
  }

  /**
   * Create score display
   */
  private createScoreDisplay(): void {
    this.scoreText = new TextBlock('scoreText', 'Score: 0');
    this.scoreText.color = 'white';
    this.scoreText.fontSize = 24;
    this.scoreText.fontFamily = 'Arial';
    this.scoreText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.scoreText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.scoreText.paddingLeft = '20px';
    this.scoreText.paddingTop = '20px';
    this.ui.addControl(this.scoreText);
  }

  /**
   * Create message display for notifications
   */
  private createMessageDisplay(): void {
    this.messageText = new TextBlock('messageText', '');
    this.messageText.color = 'yellow';
    this.messageText.fontSize = 36;
    this.messageText.fontFamily = 'Arial';
    this.messageText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.messageText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.messageText.top = '-100px';
    this.messageText.isVisible = false;
    this.ui.addControl(this.messageText);
  }

  /**
   * Update health display
   */
  public updateHealth(current: number, max: number): void {
    if (this.healthBar) {
      const percentage = (current / max) * 100;
      this.healthBar.width = percentage + '%';
      
      // Change color based on health
      if (percentage > 60) {
        this.healthBar.background = 'rgba(50, 255, 50, 0.8)';
      } else if (percentage > 30) {
        this.healthBar.background = 'rgba(255, 200, 50, 0.8)';
      } else {
        this.healthBar.background = 'rgba(255, 50, 50, 0.8)';
      }
    }
    
    if (this.healthText) {
      this.healthText.text = Math.floor(current).toString();
    }
  }

  /**
   * Update ammo display
   */
  public updateAmmo(current: number, max: number, reserve: number): void {
    if (this.ammoText) {
      this.ammoText.text = `${current} / ${reserve}`;
      
      // Change color when low
      if (current <= max * 0.3) {
        this.ammoText.color = 'red';
      } else {
        this.ammoText.color = 'white';
      }
    }
  }

  /**
   * Update wave display
   */
  public updateWave(wave: number): void {
    if (this.waveText) {
      this.waveText.text = `Wave: ${wave}`;
    }
  }

  /**
   * Update enemy count display
   */
  public updateEnemyCount(count: number): void {
    if (this.enemyCountText) {
      this.enemyCountText.text = `Enemies: ${count}`;
    }
  }

  /**
   * Update score display
   */
  public updateScore(score: number): void {
    if (this.scoreText) {
      this.scoreText.text = `Score: ${score}`;
    }
  }

  /**
   * Show a temporary message
   */
  public showMessage(text: string, duration: number = 3000): void {
    if (!this.messageText) return;
    
    // Clear existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    this.messageText.text = text;
    this.messageText.isVisible = true;
    
    this.messageTimeout = window.setTimeout(() => {
      if (this.messageText) {
        this.messageText.isVisible = false;
      }
    }, duration);
  }

  /**
   * Show reloading indicator
   */
  public showReloading(isReloading: boolean): void {
    if (this.ammoText) {
      if (isReloading) {
        this.ammoText.text = 'RELOADING...';
        this.ammoText.color = 'yellow';
      }
    }
  }

  /**
   * Show/hide crosshair
   */
  public setCrosshairVisible(visible: boolean): void {
    if (this.crosshair) {
      this.crosshair.isVisible = visible;
    }
  }

  /**
   * Dispose of UI
   */
  public dispose(): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    this.ui.dispose();
  }
}
