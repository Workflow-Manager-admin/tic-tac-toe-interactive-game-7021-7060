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
    <div className="game-controls">
      <button className="btn" onClick={onNewGame} disabled={disableActions}>New Game</button>
      <button className="btn" onClick={onJoinGame} disabled={disableActions}>Join Game</button>
      <button className="btn" onClick={onSurrender} disabled={disableActions}>Surrender</button>
    </div>
  );
}

export default GameControls;
