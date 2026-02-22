import { Game } from './game.js';

// Expose globally so modules can reference game state without circular deps
window.__game = new Game();
