// client/src/services/authService.js

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"; // Use /api to match Vercel rewrite

const API_BASE_URL = "/api";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const authClient = {
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');
    return data;
  },
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },
  updateProfile: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.message || data?.errors?.[0]?.message || 'Failed to update profile';
      throw new Error(msg);
    }
    return data;
  },
  changePassword: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/auth/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.message || data?.errors?.[0]?.message || 'Failed to change password';
      throw new Error(msg);
    }
    return data;
  },
  // Best-effort server logout — client clears local state regardless of
  // success so a network blip can't leave the user "stuck logged in".
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { ...authHeaders() },
      });
    } catch {
      /* no-op */
    }
  },
};

export const sessionsClient = {
  list: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/sessions`, { headers: { ...authHeaders() } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load sessions');
    return data.sessions;
  },
  revoke: async (id) => {
    const res = await fetch(`${API_BASE_URL}/auth/sessions/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to sign out session');
    return data;
  },
  revokeOthers: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/sessions`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to sign out other devices');
    return data;
  },
};