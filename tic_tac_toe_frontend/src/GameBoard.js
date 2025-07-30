import React from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * GameBoard component - displays the 3x3 tic-tac-toe grid.
 * Props:
 * - board: 2D array representing the board state.
 * - onCellClick: (row, col) => void, called when a cell is clicked.
 * - disabled: bool, whether board is disabled.
 */
function GameBoard({ board = [[null,null,null],[null,null,null],[null,null,null]], onCellClick, disabled }) {
  return (
    <div className="game-board">
      {board.map((rowArr, rowIdx) => (
        <div className="board-row" key={rowIdx}>
          {rowArr.map((cell, colIdx) => (
            <button
              className="board-cell"
              key={colIdx}
              disabled={disabled || cell !== null}
              aria-label={`Cell ${rowIdx},${colIdx}`}
              onClick={() => onCellClick && onCellClick(rowIdx, colIdx)}
            >
              {cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default GameBoard;
