//
// API utility for talking to backend with authentication and error handling.
// Update BASE_URL as needed for backend preview.
//
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

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
