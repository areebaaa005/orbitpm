import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId: string;
  userAgent?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

const refreshSessionSchema = new Schema<IRefreshSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: String, required: true, unique: true },
  userAgent: { type: String },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// TTL index: MongoDB auto-deletes expired sessions
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession = model<IRefreshSession>('RefreshSession', refreshSessionSchema);
