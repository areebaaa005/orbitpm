import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspaces/workspace.routes';
import { workspaceProjectRouter, projectRouter } from './modules/projects/project.routes';
import { projectTaskRouter, taskRouter } from './modules/tasks/task.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import { projectActivityRouter } from './modules/activities/activity.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/workspaces', workspaceRoutes);
  // Nested under workspaces: /api/v1/workspaces/:workspaceId/projects
  app.use('/api/v1/workspaces/:workspaceId/projects', workspaceProjectRouter);
  // Flat project/task routes that resolve their own workspace context
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/projects/:projectId/tasks', projectTaskRouter);
  app.use('/api/v1/tasks', taskRouter);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/projects/:projectId/activity', projectActivityRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
