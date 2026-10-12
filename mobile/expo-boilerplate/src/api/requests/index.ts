import axios from 'axios';

const api = axios.create({
  // EXPO_PUBLIC_API_URL is the full API base (already includes /api/v1) — the
  // same value the Apollo client uses. Non-EXPO_PUBLIC_ vars never reach the bundle.
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
