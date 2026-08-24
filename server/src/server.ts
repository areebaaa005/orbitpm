import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { initSocket } from './config/socket';

async function bootstrap() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] OrbitPM API running on port ${env.port} (${env.nodeEnv})`);
  });

  initSocket(server);
  console.log('[socket] Socket.io initialized');

  process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

bootstrap().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
