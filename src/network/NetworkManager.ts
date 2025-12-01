import { Vector3 } from '@babylonjs/core';

/**
 * Network state enum
 */
export enum NetworkState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Player network data
 */
export interface PlayerNetworkData {
  id: string;
  position: Vector3;
  rotation: Vector3;
  health: number;
  isAlive: boolean;
}

/**
 * Game sync data
 */
export interface GameSyncData {
  wave: number;
  enemyCount: number;
  players: PlayerNetworkData[];
}

/**
 * NetworkManager - Handles multiplayer/co-op networking
 * Uses WebSocket for real-time communication
 */
export class NetworkManager {
  private socket: WebSocket | null = null;
  private state: NetworkState = NetworkState.DISCONNECTED;
  private playerId: string = '';
  private roomId: string = '';
  private players: Map<string, PlayerNetworkData> = new Map();
  
  // Callbacks
  public onStateChanged: ((state: NetworkState) => void) | null = null;
  public onPlayerJoined: ((playerId: string) => void) | null = null;
  public onPlayerLeft: ((playerId: string) => void) | null = null;
  public onPlayerUpdate: ((player: PlayerNetworkData) => void) | null = null;
  public onGameSync: ((data: GameSyncData) => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  constructor() {
    // Generate unique player ID
    this.playerId = this.generatePlayerId();
  }

  /**
   * Generate a unique player ID
   */
  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Connect to game server
   */
  public connect(serverUrl: string, roomId?: string): void {
    if (this.state === NetworkState.CONNECTED || this.state === NetworkState.CONNECTING) {
      return;
    }

    this.state = NetworkState.CONNECTING;
    this.setState(NetworkState.CONNECTING);
    this.roomId = roomId || this.generateRoomId();

    try {
      this.socket = new WebSocket(serverUrl);

      this.socket.onopen = () => {
        this.setState(NetworkState.CONNECTED);
        this.sendJoinRoom();
      };

      this.socket.onclose = () => {
        this.setState(NetworkState.DISCONNECTED);
        this.players.clear();
      };

      this.socket.onerror = () => {
        this.setState(NetworkState.ERROR);
        if (this.onError) {
          this.onError('WebSocket connection error');
        }
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      this.setState(NetworkState.ERROR);
      console.error('Failed to connect:', error);
    }
  }

  /**
   * Generate a room ID
   */
  private generateRoomId(): string {
    return 'room_' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Set and notify state change
   */
  private setState(state: NetworkState): void {
    this.state = state;
    if (this.onStateChanged) {
      this.onStateChanged(state);
    }
  }

  /**
   * Send join room message
   */
  private sendJoinRoom(): void {
    this.send({
      type: 'join',
      playerId: this.playerId,
      roomId: this.roomId,
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'player_joined':
          this.handlePlayerJoined(message);
          break;
        case 'player_left':
          this.handlePlayerLeft(message);
          break;
        case 'player_update':
          this.handlePlayerUpdate(message);
          break;
        case 'game_sync':
          this.handleGameSync(message);
          break;
        case 'room_info':
          this.handleRoomInfo(message);
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Handle player joined event
   */
  private handlePlayerJoined(message: { playerId: string; data: PlayerNetworkData }): void {
    if (message.playerId !== this.playerId) {
      this.players.set(message.playerId, message.data);
      if (this.onPlayerJoined) {
        this.onPlayerJoined(message.playerId);
      }
    }
  }

  /**
   * Handle player left event
   */
  private handlePlayerLeft(message: { playerId: string }): void {
    this.players.delete(message.playerId);
    if (this.onPlayerLeft) {
      this.onPlayerLeft(message.playerId);
    }
  }

  /**
   * Handle player update event
   */
  private handlePlayerUpdate(message: { playerId: string; data: Partial<PlayerNetworkData> }): void {
    const player = this.players.get(message.playerId);
    if (player && message.playerId !== this.playerId) {
      Object.assign(player, message.data);
      if (this.onPlayerUpdate) {
        this.onPlayerUpdate(player);
      }
    }
  }

  /**
   * Handle game sync event
   */
  private handleGameSync(message: { data: GameSyncData }): void {
    if (this.onGameSync) {
      this.onGameSync(message.data);
    }
  }

  /**
   * Handle room info
   */
  private handleRoomInfo(message: { players: PlayerNetworkData[] }): void {
    message.players.forEach(player => {
      if (player.id !== this.playerId) {
        this.players.set(player.id, player);
      }
    });
  }

  /**
   * Send a message to the server
   */
  private send(data: object): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  /**
   * Send player position/state update
   */
  public sendPlayerUpdate(data: { position?: Vector3; rotation?: Vector3; health?: number }): void {
    this.send({
      type: 'player_update',
      playerId: this.playerId,
      roomId: this.roomId,
      data,
    });
  }

  /**
   * Send enemy spawn event (for host)
   */
  public sendEnemySpawn(enemyData: { id: string; type: string; position: Vector3 }): void {
    this.send({
      type: 'enemy_spawn',
      roomId: this.roomId,
      data: enemyData,
    });
  }

  /**
   * Send enemy damage event
   */
  public sendEnemyDamage(enemyId: string, damage: number): void {
    this.send({
      type: 'enemy_damage',
      roomId: this.roomId,
      enemyId,
      damage,
    });
  }

  /**
   * Send wave start event (for host)
   */
  public sendWaveStart(wave: number): void {
    this.send({
      type: 'wave_start',
      roomId: this.roomId,
      wave,
    });
  }

  /**
   * Get current room ID
   */
  public getRoomId(): string {
    return this.roomId;
  }

  /**
   * Get player ID
   */
  public getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Get all connected players
   */
  public getPlayers(): PlayerNetworkData[] {
    return Array.from(this.players.values());
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.state === NetworkState.CONNECTED;
  }

  /**
   * Get current state
   */
  public getState(): NetworkState {
    return this.state;
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setState(NetworkState.DISCONNECTED);
    this.players.clear();
  }

  /**
   * Create a room and become host
   */
  public createRoom(): string {
    this.roomId = this.generateRoomId();
    return this.roomId;
  }

  /**
   * Join an existing room
   */
  public joinRoom(roomId: string): void {
    this.roomId = roomId;
    if (this.isConnected()) {
      this.sendJoinRoom();
    }
  }
}
