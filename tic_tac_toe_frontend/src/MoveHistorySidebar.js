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
  // Enable keyboard navigation for move history
  const listRef = React.useRef();

  // Handle keyboard navigation for up/down arrows in move list
  React.useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const handleKeyDown = e => {
      const buttons = node.querySelectorAll('button.move-btn');
      if (!buttons.length) return;
      const active = Array.from(buttons).findIndex(btn => document.activeElement === btn);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (active + 1) % buttons.length;
        buttons[next].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (active - 1 + buttons.length) % buttons.length;
        buttons[prev].focus();
      }
    };
    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside className="move-history" aria-label="Move history" tabIndex={0}>
      <h3 id="history-header">Move History</h3>
      {moves.length === 0 && <div className="move-empty">No moves yet.</div>}
      <ul
        ref={listRef}
        aria-labelledby="history-header"
        tabIndex={0}
        role="listbox"
      >
        {[...moves].map((move, idx) => (
          <li key={idx} role="option" aria-selected={currentMove === idx}>
            <button
              className={`move-btn${currentMove === idx ? ' active' : ''}`}
              aria-label={`View board as of move ${idx === 0 ? 'game start' : idx}`}
              aria-current={currentMove === idx ? "step" : undefined}
              tabIndex={0}
              onClick={() => onSelectMove && onSelectMove(idx)}
              onKeyDown={e => {
                // Enter and spacebar also trigger
                if ((e.key === 'Enter' || e.key === ' ') && onSelectMove) {
                  e.preventDefault();
                  onSelectMove(idx);
                }
              }}
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
