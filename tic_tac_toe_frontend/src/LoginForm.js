import React, { useState } from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * LoginForm component - login UI for existing users
 * Props:
 * - onLogin: ({username, password}) => void
 * - loading: bool
 * - error: string
 */
function LoginForm({ onLogin, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onLogin && onLogin({ username, password });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Login</h2>
      {error && <div className="auth-error">{error}</div>}
      <label>
        Username
        <input
          required
          type="text"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </label>
      <button className="btn" type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
    </form>
  );
}

export default LoginForm;
