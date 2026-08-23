import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri);
    console.log('[db] MongoDB connected successfully');
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err);
  });
}
