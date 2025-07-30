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
  // Make the board keyboard navigable: arrow keys move through cells, Enter/Space triggers click
  const boardRef = React.useRef();
  const cellRefs = React.useRef(
    [...Array(3)].map(() => Array(3).fill(null).map(() => React.createRef()))
  );

  function handleKeyDown(e, rIdx, cIdx) {
    if (disabled) return;
    let nextR = rIdx, nextC = cIdx;
    if (e.key === "ArrowDown") {nextR = (rIdx + 1) % 3;}
    else if (e.key === "ArrowUp") {nextR = (rIdx + 2) % 3;}
    else if (e.key === "ArrowRight") {nextC = (cIdx + 1) % 3;}
    else if (e.key === "ArrowLeft") {nextC = (cIdx + 2) % 3;}
    else if (e.key === "Enter" || e.key === " ") {
      if (!board[rIdx][cIdx] && onCellClick) {
        e.preventDefault();
        onCellClick(rIdx, cIdx);
      }
      return;
    } else return;
    e.preventDefault();
    const ref = cellRefs.current?.[nextR][nextC];
    if (ref?.current) ref.current.focus();
  }

  return (
    <div className="game-board" role="region" aria-label="Tic tac toe board" tabIndex={0} ref={boardRef}>
      {board.map((rowArr, rowIdx) => (
        <div className="board-row" key={rowIdx}>
          {rowArr.map((cell, colIdx) => {
            const filled = cell !== null;
            return (
              <button
                className="board-cell"
                key={colIdx}
                ref={cellRefs.current[rowIdx][colIdx]}
                disabled={disabled || filled}
                aria-label={
                  filled
                    ? `Cell ${rowIdx+1},${colIdx+1}: ${cell === "X" ? "X, already selected" : "O, already selected"}`
                    : `Cell ${rowIdx+1},${colIdx+1}: empty`
                }
                aria-disabled={disabled || filled}
                tabIndex={0}
                style={{
                  outline: filled && !disabled ? '2px solid #FFC107' : undefined,
                  background: filled
                    ? cell === "X"
                      ? "#f2ede3" // subtle X background
                      : "#e7eaf7" // O background
                    : "var(--bg-primary)"
                }}
                onClick={() => onCellClick && onCellClick(rowIdx, colIdx)}
                onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: cell === "X" ? "#1976D2" : cell === "O" ? "#FFC107" : "#888",
                    filter: "contrast(1.3)",
                  }}
                  aria-hidden={true}
                >
                  {cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default GameBoard;
