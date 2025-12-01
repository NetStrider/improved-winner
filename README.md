# Cross-Play Multiplayer Game

A web-based 3D multiplayer game built with Babylon.js featuring cross-platform play support.

## Features

- **Cross-Play Multiplayer**: Play with friends across different devices and platforms (Windows, macOS, Linux, iOS, Android, Web browsers)
- **Real-time Synchronization**: WebSocket-based real-time player movement and game state sync
- **3D Graphics**: Beautiful 3D graphics powered by Babylon.js
- **Mobile Support**: Touch controls with virtual joystick for mobile devices
- **Collectible System**: Collect golden orbs to score points
- **Live Scoreboard**: See all connected players and their scores in real-time

## Controls

### Desktop
- **W / Arrow Up**: Move forward
- **S / Arrow Down**: Move backward
- **A / Arrow Left**: Move left
- **D / Arrow Right**: Move right
- **Mouse**: Rotate camera view

### Mobile
- **Virtual Joystick**: Move in any direction
- **Touch/Drag**: Rotate camera view

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
```

### Running the Game

1. Start the server with `npm start`
2. Open your browser and navigate to `http://localhost:3000`
3. Share the URL with friends to play together!

## Technical Stack

- **Frontend**: Babylon.js (3D rendering engine)
- **Backend**: Node.js with Express
- **Real-time Communication**: WebSocket (ws library)
- **Cross-platform**: Works on any device with a modern web browser

## Running Tests

```bash
npm test
```

## Architecture

- `server.js` - WebSocket server handling multiplayer game state
- `public/index.html` - Game HTML with UI elements
- `public/game.js` - Babylon.js game client with networking

## License

ISC
