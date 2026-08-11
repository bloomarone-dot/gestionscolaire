function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function isValidAccessToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (token.startsWith('demo-')) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 < Date.now() - 5000) return false;
  return true;
}

export function readStoredAccessToken() {
  const stored = localStorage.getItem('access_token');
  if (stored) return stored;
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.token || null;
  } catch {
    return null;
  }
}

export function purgeInvalidAuthSession() {
  const token = readStoredAccessToken();
  if (isValidAccessToken(token)) return false;
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  localStorage.removeItem('selectedSchool');
  return true;
}
