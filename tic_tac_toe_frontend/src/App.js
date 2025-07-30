import React, { useState, useEffect } from 'react';
import './App.css';
import GameBoard from './GameBoard';
import GameControls from './GameControls';
import MoveHistorySidebar from './MoveHistorySidebar';
import NotificationToast from './NotificationToast';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

// PUBLIC_INTERFACE
/**
 * Main App component - Manages global theme and top-level game/auth state.
 */
function App() {
  // Theme state and effect
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

  // App logic state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // or 'register'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [board, setBoard] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ]);
  const [moves, setMoves] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);
  const [notification, setNotification] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [controlsDisabled, setControlsDisabled] = useState(false);

  // Dummy login/register handlers for now (to be replaced with backend logic)
  function handleLogin({ username, password }) {
    setAuthLoading(true);
    setTimeout(() => {
      if (username === "test" && password === "test") {
        setUser({ username });
        setAuthError('');
        setAuthLoading(false);
      } else {
        setAuthError('Invalid credentials');
        setAuthLoading(false);
      }
    }, 900);
  }

  function handleRegister({ username, password }) {
    setAuthLoading(true);
    setTimeout(() => {
      if (username === "" || password.length < 4) {
        setAuthError('Username required and password >= 4 chars');
        setAuthLoading(false);
      } else {
        setUser({ username });
        setAuthError('');
        setAuthLoading(false);
        setNotification('Registered & logged in!');
        setNotifType('success');
      }
    }, 900);
  }

  // Handlers for gameplay UI (stub)
  function handleCellClick(row, col) {
    // Only allow play if cell is empty and user is logged in
    if (!user || board[row][col]) return;
    const player = moves.length % 2 === 0 ? 'X' : 'O';
    const newBoard = board.map(r => r.slice());
    newBoard[row][col] = player;
    setBoard(newBoard);
    setMoves([...moves, { player, position: [row, col] }]);
    setCurrentMove(moves.length + 1);
  }

  function handleNewGame() {
    setBoard([
      [null, null, null],
      [null, null, null],
      [null, null, null]
    ]);
    setMoves([]);
    setCurrentMove(0);
    setNotification('New game started!');
    setNotifType('info');
  }
  function handleJoinGame() {
    setNotification('Join Game not yet implemented.');
    setNotifType('error');
  }
  function handleSurrender() {
    setNotification('Game surrendered.');
    setNotifType('info');
  }
  function handleSelectMove(idx) {
    setCurrentMove(idx);
    // Could add logic to show board at move idx
  }

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h1>Tic Tac Toe</h1>
        {!user ? (
          <div className="auth-panel">
            {authMode === 'login' ? (
              <>
                <LoginForm
                  onLogin={handleLogin}
                  loading={authLoading}
                  error={authError}
                />
                <div className="auth-switch">
                  <span>Don't have an account?</span>
                  <button className="btn" onClick={() => { setAuthMode('register'); setAuthError(''); }}>Register</button>
                </div>
              </>
            ) : (
              <>
                <RegisterForm
                  onRegister={handleRegister}
                  loading={authLoading}
                  error={authError}
                />
                <div className="auth-switch">
                  <span>Already have an account?</span>
                  <button className="btn" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Login</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="main-layout">
            <div className="sidebar">
              <MoveHistorySidebar moves={moves} currentMove={currentMove} onSelectMove={handleSelectMove} />
              <GameControls
                onNewGame={handleNewGame}
                onJoinGame={handleJoinGame}
                onSurrender={handleSurrender}
                disableActions={controlsDisabled}
              />
              <div className="user-info">
                Logged in as <strong>{user.username}</strong>
                <button className="btn logout-btn" onClick={() => setUser(null)}>
                  Log out
                </button>
              </div>
            </div>
            <GameBoard board={board} onCellClick={handleCellClick} disabled={controlsDisabled} />
          </div>
        )}
        <NotificationToast
          message={notification}
          onClose={() => setNotification('')}
          type={notifType}
        />
      </header>
    </div>
  );
}

export default App;
