import React from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * MoveHistorySidebar component - displays the list of moves.
 * Props:
 * - moves: Array<{player: 'X'|'O', position: [row, col]}>: move list.
 * - onSelectMove: idx => void
 * - currentMove: integer: current move index
 */
function MoveHistorySidebar({ moves = [], onSelectMove, currentMove }) {
  return (
    <aside className="move-history">
      <h3>Move History</h3>
      {moves.length === 0 && <div className="move-empty">No moves yet.</div>}
      <ul>
        {moves.map((move, idx) => (
          <li key={idx}>
            <button
              className={`move-btn${currentMove === idx ? ' active' : ''}`}
              onClick={() => onSelectMove && onSelectMove(idx)}
            >
              {idx === 0
                ? 'Game start'
                : `#${idx} ${move.player} → [${move.position[0]},${move.position[1]}]`}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default MoveHistorySidebar;
