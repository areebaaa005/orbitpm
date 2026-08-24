import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { Membership } from '../modules/workspaces/membership.model';
import { env } from './env';

let io: SocketIOServer | null = null;

interface AuthedSocket extends Socket {
  userId?: string;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Authenticate every socket connection using the same access token as REST
  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Missing authentication token'));
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    // Every user automatically gets their own private room for notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('join:workspace', async (workspaceId: string) => {
      const membership = await Membership.findOne({ workspaceId, userId: socket.userId });
      if (membership) {
        socket.join(`workspace:${workspaceId}`);
      }
    });

    socket.on('join:project', async (payload: { projectId: string; workspaceId: string }) => {
      const membership = await Membership.findOne({
        workspaceId: payload.workspaceId,
        userId: socket.userId,
      });
      if (membership) {
        socket.join(`project:${payload.projectId}`);
      }
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized — call initSocket() first');
  return io;
}

// Emitters — called by services AFTER a mutation has been committed to the
// database. The REST write is always the source of truth; sockets only
// broadcast what already happened.
export function emitToProject(projectId: string, event: string, payload: unknown) {
  io?.to(`project:${projectId}`).emit(event, payload);
}

export function emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
  io?.to(`workspace:${workspaceId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
