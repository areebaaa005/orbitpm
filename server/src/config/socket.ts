import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { Membership } from '../modules/workspaces/membership.model';
import { Project } from '../modules/projects/project.model';
import { isObjectId } from '../utils/objectId';
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

    // Handlers are async, so every one is wrapped in try/catch: an unhandled
    // rejection here (e.g. a malformed id) would otherwise crash the process.
    socket.on('join:workspace', async (workspaceId: string) => {
      try {
        if (!isObjectId(workspaceId)) return;
        const membership = await Membership.findOne({ workspaceId, userId: socket.userId });
        if (membership) {
          socket.join(`workspace:${workspaceId}`);
        }
      } catch {
        // ignore: the client simply doesn't get joined
      }
    });

    socket.on('join:project', async (payload: { projectId: string; workspaceId?: string }) => {
      try {
        if (!isObjectId(payload?.projectId)) return;
        // Never trust the workspaceId sent by the client: resolve the project's
        // real workspace and check membership against THAT one.
        const project = await Project.findById(payload.projectId).select('workspaceId');
        if (!project) return;
        const membership = await Membership.findOne({
          workspaceId: project.workspaceId,
          userId: socket.userId,
        });
        if (membership) {
          socket.join(`project:${payload.projectId}`);
        }
      } catch {
        // ignore
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
