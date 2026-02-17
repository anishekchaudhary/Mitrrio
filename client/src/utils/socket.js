import io from 'socket.io-client';

// Use environment variable for production, fallback to localhost for dev
const URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
});