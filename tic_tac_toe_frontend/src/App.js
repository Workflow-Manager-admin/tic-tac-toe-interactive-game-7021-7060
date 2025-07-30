import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import GameBoard from './GameBoard';
import GameControls from './GameControls';
import MoveHistorySidebar from './MoveHistorySidebar';
import NotificationToast from './NotificationToast';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { apiFetch, setJWT, getJWT } from './api';

// PUBLIC_INTERFACE
/**
 * Main App component - Manages global theme and top-level game/auth/game state,
 * and is fully wired to backend REST API.
 */
function App() {
  // Theme state and effect
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

  // App logic state
  const [jwtToken, setJwtToken] = useState(null);
  const [user, setUser] = useState(null); // {username}
  const [authMode, setAuthMode] = useState('login'); // or 'register'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ]);
  const [moves, setMoves] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);
  const [gamesList, setGamesList] = useState([]);
  const [playerSymbol, setPlayerSymbol] = useState(null); // 'X' | 'O'
  const [opponent, setOpponent] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStatus, setGameStatus] = useState('');
  const [controlsDisabled, setControlsDisabled] = useState(false);

  // Notification
  const [notification, setNotification] = useState('');
  const [notifType, setNotifType] = useState('info');

  // For polling (board updates)
  const pollIntervalMs = 2000;
  const pollRef = useRef();
  const pollActiveRef = useRef(false);

  // --- User authentication handlers ---

  // PUBLIC_INTERFACE
  // Login: POST /login {username, password}
  async function handleLogin({ username, password }) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await apiFetch({ method: 'POST', path: '/login', data: { username, password } });
      // API should return {access_token, token_type, user: {username}}
      if (!result.access_token || !result.user) throw new Error("Malformed login response");
      setJwtToken(result.access_token);
      setJWT(result.access_token);
      setUser(result.user);
      setAuthMode('login');
      setAuthError('');
      setNotification('Login successful');
      setNotifType('success');
      // Optionally: load in-progress games for user
      fetchGamesList();
    } catch (err) {
      setAuthError(err.message || "Login failed");
      setNotifType('error');
      setNotification(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  // Register: POST /register {username, password}
  async function handleRegister({ username, password }) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await apiFetch({ method: 'POST', path: '/register', data: { username, password } });
      // API should return {access_token, token_type, user: {username}}
      if (!result.access_token || !result.user) throw new Error("Malformed register response");
      setJwtToken(result.access_token);
      setJWT(result.access_token);
      setUser(result.user);
      setAuthMode('login');
      setNotification('Registered and logged in!');
      setNotifType('success');
    } catch (err) {
      setAuthError(err.message || "Registration failed");
      setNotifType('error');
      setNotification(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setJwtToken(null); setJWT(null); setUser(null);
    setGameId(null);
    setBoard([[null,null,null],[null,null,null],[null,null,null]]);
    setMoves([]); setCurrentMove(0);
    setPlayerSymbol(null); setOpponent('');
    setIsGameOver(false);
    setGameStatus('');
    setNotification('Logged out');
    setNotifType('info');
  }

  // --- Game management ---
  // List available/created games (GET /games or similar)
  const fetchGamesList = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const result = await apiFetch({ method: 'GET', path: '/games' });
      setGamesList(result.games || []);
    } catch (err) {
      // ignore fail silently here
      setGamesList([]);
    }
  }, [jwtToken]);

  // Create game (POST /games)
  async function handleNewGame() {
    if (!user || !jwtToken) return;
    setControlsDisabled(true);
    try {
      const result = await apiFetch({ method: 'POST', path: '/games' });
      if (!result.game_id) throw new Error("Game creation failed");
      setGameId(result.game_id);
      setPlayerSymbol(result.player_symbol);
      setOpponent(result.opponent_username || null);
      setNotification("New game created!");
      setNotifType("success");
      await syncGameState(result.game_id);
      pollRef.current = setInterval(() => periodicPoll(result.game_id), pollIntervalMs);
      pollActiveRef.current = true;
    } catch (err) {
      setNotification(err.message || "Error creating game");
      setNotifType("error");
    }
    setControlsDisabled(false);
  }

  // Join game (POST /games/{id}/join)
  async function handleJoinGame() {
    if (!user || !jwtToken) return;
    setControlsDisabled(true);
    try {
      // Use existing games list, pick first joinable? In real UI, show list to select.
      await fetchGamesList();
      const joinable = gamesList.find(g => g.status === 'waiting' && !g.is_full);
      if (!joinable) {
        setNotification("No open games to join.");
        setNotifType("error");
        setControlsDisabled(false);
        return;
      }
      const result = await apiFetch({ method: 'POST', path: `/games/${joinable.id}/join` });
      setGameId(result.game_id);
      setPlayerSymbol(result.player_symbol);
      setOpponent(result.opponent_username || null);
      setNotification("Joined game!");
      setNotifType("success");
      await syncGameState(result.game_id);
      pollRef.current = setInterval(() => periodicPoll(result.game_id), pollIntervalMs);
      pollActiveRef.current = true;
    } catch (err) {
      setNotification(err.message || "Failed to join game");
      setNotifType("error");
      setControlsDisabled(false);
    }
  }

  // Surrender (POST /games/{id}/surrender)
  async function handleSurrender() {
    if (!user || !jwtToken || !gameId) return;
    try {
      await apiFetch({ method: 'POST', path: `/games/${gameId}/surrender` });
      setNotification("Surrendered. Game ended.");
      setNotifType("info");
      setGameId(null);
      setPlayerSymbol(null);
      setOpponent('');
      setBoard([[null,null,null],[null,null,null]]);
      setMoves([]); setCurrentMove(0);
      setIsGameOver(true);
      setGameStatus("surrendered");
      stopPolling();
    } catch (err) {
      setNotification(err.message || "Surrender failed");
      setNotifType("error");
    }
  }

  // --- Board, move and polling logic ---

  // Make a move (POST /games/{id}/move {row, col})
  async function handleCellClick(row, col) {
    if (!user || !jwtToken || !gameId) return;
    if (board[row][col]) return;
    if (isGameOver) return;
    setControlsDisabled(true);
    try {
      const result = await apiFetch({ method: 'POST', path: `/games/${gameId}/move`, data: { row, col } });
      await syncGameState(gameId);
    } catch (err) {
      setNotification((err.message || "Invalid move") + (err.status === 403 ? " (not your turn?)" : ""));
      setNotifType("error");
    } finally {
      setControlsDisabled(false);
    }
  }

  // Sync board and moves from backend for a given game
  async function syncGameState(gameID = null) {
    if (!gameID && !gameId) return;
    try {
      const id = gameID || gameId;
      const statusResult = await apiFetch({ method: 'GET', path: `/games/${id}` });
      setBoard(statusResult.board || [[null,null,null],[null,null,null],[null,null,null]]);
      setMoves(statusResult.moves || []);
      setCurrentMove((statusResult.moves || []).length);
      setPlayerSymbol(statusResult.player_symbol || playerSymbol);
      setOpponent(statusResult.opponent_username || opponent);
      setIsGameOver(statusResult.is_over);
      setGameStatus(statusResult.status || "");
      if (statusResult.is_over) stopPolling();
      if (statusResult.winner) {
        setNotification(`Game over. Winner: ${statusResult.winner}`);
        setNotifType('success');
        setIsGameOver(true);
      }
    } catch (err) {
      setNotification("Lost sync with game state: " + (err.message || "Unknown error"));
      setNotifType("error");
    }
  }

  // Polling for game state (until websocket support)
  const periodicPoll = useCallback(
    (id) => {
      syncGameState(id);
    },
    [gameId]
  );
  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pollActiveRef.current = false;
  }
  useEffect(() => {
    if (gameId && jwtToken && !pollActiveRef.current) {
      pollRef.current = setInterval(() => periodicPoll(gameId), pollIntervalMs);
      pollActiveRef.current = true;
    }
    return () => stopPolling();
    // eslint-disable-next-line
  }, [gameId, jwtToken]);

  // Move history: select move for board preview
  function handleSelectMove(idx) {
    setCurrentMove(idx);
    // optionally update board to show as-of that move:
    if (idx === moves.length) {
      setBoard(movesToBoard(moves));
    } else {
      setBoard(movesToBoard(moves.slice(0, idx)));
    }
  }

  // Helper: compute board from move list
  function movesToBoard(moveArr) {
    const b = [[null,null,null],[null,null,null],[null,null,null]];
    let curr = 'X';
    moveArr.forEach(m => {
      if (!m.position) return;
      const [r, c] = m.position;
      b[r][c] = m.player || curr;
      curr = (curr === 'X') ? 'O' : 'X';
    });
    return b;
  }

  // Clean up polling on logout/game over
  useEffect(() => {
    if (!gameId || isGameOver) stopPolling();
    // eslint-disable-next-line
  }, [gameId, isGameOver]);

  // On mount, if logged in, fetch available games
  useEffect(() => {
    if (jwtToken) fetchGamesList();
    // eslint-disable-next-line
  }, [jwtToken]);

  // --- Layout ---
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
                disableActions={controlsDisabled || isGameOver}
              />
              <div className="user-info">
                Logged in as <strong>{user.username}</strong>
                <button className="btn logout-btn" onClick={handleLogout}>
                  Log out
                </button>
                {playerSymbol &&
                  <span>Your symbol: <strong>{playerSymbol}</strong></span>
                }
                {opponent &&
                  <span>Opponent: <strong>{opponent}</strong></span>
                }
                {gameStatus &&
                  <span>Status: <strong>{gameStatus}</strong></span>
                }
              </div>
            </div>
            <GameBoard board={board} onCellClick={handleCellClick} disabled={controlsDisabled || isGameOver} />
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
