import React, { useState } from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * RegisterForm component - registration UI for new users
 * Props:
 * - onRegister: ({username, password, confirmPassword}) => void
 * - loading: bool
 * - error: string
 */
function RegisterForm({ onRegister, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    onRegister && onRegister({ username, password, confirmPassword });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Register</h2>
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
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </label>
      <label>
        Confirm Password
        <input
          required
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </label>
      <button className="btn" type="submit" disabled={loading}>{loading ? "Registering..." : "Register"}</button>
    </form>
  );
}

export default RegisterForm;
