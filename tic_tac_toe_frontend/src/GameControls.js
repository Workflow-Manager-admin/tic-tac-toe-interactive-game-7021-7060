import React from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * GameControls component - controls for managing the game.
 * Props:
 * - onNewGame: () => void
 * - onJoinGame: () => void
 * - onSurrender: () => void
 * - disableActions: bool
 */
function GameControls({ onNewGame, onJoinGame, onSurrender, disableActions }) {
  return (
    <div className="game-controls" role="region" aria-label="Game controls">
      <button
        className="btn"
        onClick={onNewGame}
        disabled={disableActions}
        aria-label="Start a new game"
      >
        🎲 New Game
      </button>
      <button
        className="btn"
        onClick={onJoinGame}
        disabled={disableActions}
        aria-label="Join an existing game"
      >
        ⬇️ Join Game
      </button>
      <button
        className="btn"
        onClick={onSurrender}
        disabled={disableActions}
        aria-label="Surrender current game"
      >
        🚩 Surrender
      </button>
    </div>
  );
}

export default GameControls;
