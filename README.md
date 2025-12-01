# Survival Shooter

A **Left 4 Dead-style** 3D survival shooter game built with **BabylonJS** - the latest web-based 3D engine. Features wave-based gameplay with support for **PC**, **Mobile**, and **VR** platforms, plus **co-op multiplayer**.

## 🎮 Features

### Platforms
- **PC**: Full keyboard + mouse controls with pointer lock
- **Mobile**: Touch-based virtual joysticks and action buttons
- **VR**: WebXR support for immersive gameplay with motion controllers

### Gameplay (L4D-style)
- Wave-based survival gameplay
- Progressive difficulty scaling
- Multiple enemy types (Basic, Fast, Tank, Special)
- Ammunition management and reloading
- Health and armor system
- Score tracking

### Multiplayer (Co-op)
- Real-time WebSocket networking
- Room-based matchmaking
- Synchronized game state
- Player position updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/NetStrider/improved-winner.git
cd improved-winner

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` folder.

## 🎯 Controls

### PC Controls
| Action | Key/Button |
|--------|-----------|
| Move Forward | W |
| Move Backward | S |
| Move Left | A |
| Move Right | D |
| Jump | Space |
| Crouch | Left Ctrl |
| Sprint | Left Shift |
| Shoot | Left Mouse Button |
| Reload | R |
| Interact | E |
| Switch Weapon | Mouse Wheel |

### Mobile Controls
- **Left Joystick**: Movement
- **Right Joystick**: Camera look
- **Shoot Button**: Fire weapon
- **Reload Button**: Reload weapon
- **Jump Button**: Jump

### VR Controls
- **Left Thumbstick**: Movement
- **Left Trigger**: Sprint
- **Left Grip**: Crouch
- **Right Trigger**: Shoot
- **Right Grip**: Interact
- **A Button**: Jump
- **B Button**: Switch weapon
- **X Button**: Reload

## 🏗️ Project Structure

```
src/
├── core/           # Game engine and scene management
│   ├── GameEngine.ts
│   ├── SceneManager.ts
│   └── index.ts
├── entities/       # Player and enemy entities
│   ├── Player.ts
│   ├── Enemy.ts
│   └── index.ts
├── game/           # Game systems (waves, spawning)
│   ├── WaveManager.ts
│   └── index.ts
├── input/          # Input handling for all platforms
│   ├── PCInputManager.ts
│   ├── MobileInputManager.ts
│   ├── VRInputManager.ts
│   └── index.ts
├── network/        # Multiplayer networking
│   ├── NetworkManager.ts
│   └── index.ts
├── ui/             # Game UI/HUD
│   ├── GameUI.ts
│   └── index.ts
└── main.ts         # Game entry point
```

## 🔧 Technology Stack

- **BabylonJS 8.x** - 3D rendering engine
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **WebXR** - VR/AR support
- **WebSocket** - Real-time multiplayer

## 📋 Roadmap

- [x] Core game engine setup
- [x] PC controls (keyboard + mouse)
- [x] Mobile touch controls
- [x] VR/WebXR support
- [x] Wave-based enemy spawning
- [x] Enemy AI system
- [x] Player shooting mechanics
- [x] Health and ammo systems
- [x] Game UI/HUD
- [x] Network manager foundation
- [ ] Audio system
- [ ] Weapon variety
- [ ] Power-ups and items
- [ ] Level design
- [ ] Multiplayer server implementation
- [ ] Leaderboards

## 📄 License

ISC License
