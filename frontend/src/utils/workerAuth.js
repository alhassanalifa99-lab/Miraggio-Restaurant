// Central place for worker auth token handling.
// The token is just the worker password, issued back by POST /api/worker/login,
// and sent as "Authorization: Bearer <token>" on protected requests.

const TOKEN_KEY = 'workerToken';

export function setWorkerToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getWorkerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearWorkerToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isWorkerAuthenticated() {
  return !!getWorkerToken();
}

// Spread this into an axios config's `headers` for any protected request,
// e.g. axios.get('/api/orders', { headers: authHeader() })
export function authHeader() {
  const token = getWorkerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
