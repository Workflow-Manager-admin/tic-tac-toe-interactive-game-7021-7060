//
// API utility for talking to backend with authentication and error handling.
// Update BASE_URL as needed for backend preview.
//
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// WebSocket base URL (assume ws:// on localhost, wss:// in production—adjust as needed)
const WS_URL =
  (process.env.REACT_APP_WS_URL)
    || BASE_URL.replace(/^http/, 'ws') + '/ws/game'; // Default ws path: /ws/game

let wsInstance = null;
/**
 * Create and manage a WebSocket connection with simple pub/sub for real-time game events.
 * Usage:
 *   openGameWebSocket(gameId, onMessageCb), where onMessageCb takes {event, payload}
 * Returns a close() method.
 */
export function openGameWebSocket(gameId, onMessage, jwtToken = null) {
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
  // Compose query params for connection auth if needed
  const token = jwtToken || jwt;
  const url = WS_URL + `/${gameId}` + (token ? `?token=${encodeURIComponent(token)}` : '');

  wsInstance = new window.WebSocket(url);

  wsInstance.onopen = () => {
    // Can send initial message if needed
    // wsInstance.send(JSON.stringify({ type: "subscribe", gameId }));
  };
  wsInstance.onmessage = (evt) => {
    let data;
    try {
      data = JSON.parse(evt.data);
    } catch {
      data = { event: 'unknown', payload: evt.data };
    }
    if (onMessage) onMessage(data);
  };
  wsInstance.onerror = (err) => {
    // Optionally forward error events
    if (onMessage)
      onMessage({ event: 'error', payload: err });
  };
  wsInstance.onclose = () => {
    // Optionally send disconnect event
    if (onMessage)
      onMessage({ event: 'closed', payload: null });
    wsInstance = null;
  };
  return {
    close: () => {
      if (wsInstance) {
        wsInstance.close();
        wsInstance = null;
      }
    },
    send: (msgObj) => {
      if (wsInstance && wsInstance.readyState === 1) {
        wsInstance.send(JSON.stringify(msgObj));
      }
    },
    socket: wsInstance,
  };
}

let jwt = null;
export function setJWT(token) {
  jwt = token;
}
export function getJWT() {
  return jwt;
}

// PUBLIC_INTERFACE
/**
 * Low-level fetch wrapper with JWT token, error/status normalization, and JSON.
 * method: HTTP method
 * path: endpoint (e.g., '/login')
 * data: body for POST/PUT
 * opts: extra fetch params
 */
export async function apiFetch({ method = 'GET', path, data, opts = {} }) {
  let url = BASE_URL + path;
  let headers = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = 'Bearer ' + jwt;
  let fetchOpts = {
    method,
    headers,
    ...opts,
  };
  if (data) fetchOpts.body = JSON.stringify(data);

  let res;
  try {
    res = await fetch(url, fetchOpts);
  } catch (e) {
    throw { message: "Network error: " + e.message, code: 'network' };
  }
  let result;
  try {
    result = await res.json();
  } catch (_) {
    result = {};
  }
  if (!res.ok) {
    throw {
      message: result.detail || result.message || res.statusText,
      code: result.code || res.status,
      status: res.status,
      raw: result
    };
  }
  return result;
}
