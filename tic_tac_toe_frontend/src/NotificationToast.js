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
  let typeIcon = "";
  if (type === "success") typeIcon = "✔️";
  else if (type === "error") typeIcon = "❌";
  else typeIcon = "🔔";
  
  // Audible live region for accessibility
  return (
    <div
      className={`notification-toast ${type}`}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      tabIndex={0}
      style={{
        outline: type === "success" ? "2px solid #41cf89" : type === "error" ? "2px solid #D32F2F" : undefined,
        borderLeftWidth: 8,
      }}
    >
      <span aria-hidden="true" style={{fontSize: "1.3em"}}>{typeIcon}</span>
      <span style={{flex: 1}}>{message}</span>
      <button className="close-btn" onClick={onClose} aria-label="Close notification">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}

export default NotificationToast;
