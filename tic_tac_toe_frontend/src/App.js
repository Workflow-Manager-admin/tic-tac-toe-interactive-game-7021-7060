import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import GameBoard from './GameBoard';
import GameControls from './GameControls';
import MoveHistorySidebar from './MoveHistorySidebar';
import NotificationToast from './NotificationToast';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { apiFetch, setJWT, getJWT, openGameWebSocket } from './api';

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

  // For real-time: WebSocket wiring
  const wsRef = useRef();
  const wsGameId = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  // For fallback polling (legacy/if WS fails)
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
      setupGameWebSocket(result.game_id);
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
      setupGameWebSocket(result.game_id);
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
      stopGameWebSocket();
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
      if (statusResult.is_over) {
        stopGameWebSocket();
      }
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

  // --- Real-time WebSocket game synchronization ---
  // Call this whenever a game is (re)joined/created to hook up WS updates
  function setupGameWebSocket(newGameId) {
    stopGameWebSocket();
    wsGameId.current = newGameId;
    if (!newGameId || !jwtToken) return;
    wsRef.current = openGameWebSocket(newGameId, (data) => {
      if (data.event === "state") {
        // { board, moves, is_over, winner, ... }
        setBoard(data.payload.board || [[null,null,null],[null,null,null],[null,null,null]]);
        setMoves(data.payload.moves || []);
        setCurrentMove((data.payload.moves || []).length);
        setPlayerSymbol(data.payload.player_symbol || playerSymbol);
        setOpponent(data.payload.opponent_username || opponent);
        setIsGameOver(data.payload.is_over);
        setGameStatus(data.payload.status || "");
        if (data.payload.is_over) {
          stopGameWebSocket();
        }
        if (data.payload.winner) {
          setNotification(`Game over. Winner: ${data.payload.winner}`);
          setNotifType('success');
          setIsGameOver(true);
        }
      } else if (data.event === "move") {
        // Got a new move – update state
        setMoves(m => [...(m || []), data.payload]);
        setBoard(data.payload.board || board);
      } else if (data.event === "game_over") {
        setIsGameOver(true);
        setGameStatus("over");
        setNotification((data.payload && data.payload.msg) ? data.payload.msg : "Game over!");
        setNotifType("success");
        stopGameWebSocket();
      } else if (data.event === "error") {
        setNotification("WS error: " + (data.payload?.message || "Realtime connection failed"));
        setNotifType("error");
        stopGameWebSocket();
      } else if (data.event === "closed") {
        setWsConnected(false);
      } else if (data.event === "connected" || data.event === "open") {
        setWsConnected(true);
      }
    }, jwtToken);
  }
  function stopGameWebSocket() {
    wsGameId.current = null;
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  }
  // Fallback: Only poll if WebSocket is not up
  const periodicPoll = useCallback(
    (id) => {
      if (!wsConnected) syncGameState(id);
    },
    [gameId, wsConnected]
  );
  useEffect(() => {
    if (gameId && jwtToken && !wsConnected && !pollActiveRef.current) {
      pollRef.current = setInterval(() => periodicPoll(gameId), pollIntervalMs);
      pollActiveRef.current = true;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      pollActiveRef.current = false;
    };
    // eslint-disable-next-line
  }, [gameId, jwtToken, wsConnected]);

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

  // Clean up polling + realtime on logout/game over
  useEffect(() => {
    if (!gameId || isGameOver) {
      stopGameWebSocket();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      pollActiveRef.current = false;
    }
    // eslint-disable-next-line
  }, [gameId, isGameOver]);

  // On mount, if logged in, fetch available games
  useEffect(() => {
    if (jwtToken) fetchGamesList();
    // If you are already in a game, reconstruct WebSocket on reload
    if (jwtToken && gameId) {
      setupGameWebSocket(gameId);
    }
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
              <div className="user-info" role="region" aria-label="User information" style={{minWidth: 0}}>
                <span>
                  <strong style={{color: "#1976D2"}} aria-label="User">{user.username}</strong>
                </span>
                <button
                  className="btn logout-btn"
                  onClick={handleLogout}
                  aria-label="Log out"
                  tabIndex={0}
                  style={{marginTop: 5, marginBottom: 5}}
                >
                  Log&nbsp;out
                </button>
                {playerSymbol &&
                  <span>Your symbol: <strong aria-label="Your symbol" style={{color: "#FFC107"}}>{playerSymbol}</strong></span>
                }
                {opponent &&
                  <span>Opponent: <strong aria-label="Opponent" style={{color: "#1A1A1A"}}>{opponent}</strong></span>
                }
                {gameStatus &&
                  <span>Status: <strong aria-label="Game status" style={{color: "#41cf89"}}>{gameStatus}</strong></span>
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
