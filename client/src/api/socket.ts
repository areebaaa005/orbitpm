import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './client';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token: getAccessToken() },
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
