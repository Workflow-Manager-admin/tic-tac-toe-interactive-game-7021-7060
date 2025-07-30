import React from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * NotificationToast component - displays a notification message.
 * Props:
 * - message: String
 * - onClose: () => void
 * - type: "info" | "error" | "success"
 */
function NotificationToast({ message, onClose, type = "info" }) {
  if (!message) return null;
  return (
    <div className={`notification-toast ${type}`}>
      <span>{message}</span>
      <button className="close-btn" onClick={onClose} aria-label="Close notification">×</button>
    </div>
  );
}

export default NotificationToast;
