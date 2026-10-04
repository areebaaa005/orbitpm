import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  status: 'active' | 'suspended';
  lastSeenAt?: Date;
  /** Google account id (the stable `sub` claim) once Google sign-in is connected. */
  googleId?: string;
  /** false for accounts created through Google: they have no password the user knows. */
  passwordSet?: boolean;
  twoFactor?: {
    enabled: boolean;
    enabledAt?: Date;
    secretEnc?: string;
    pendingSecretEnc?: string;
    recoveryCodeHashes?: string[];
    lastUsedStep?: number | null;
    failedAttempts?: number;
    lockedUntil?: Date | null;
  };
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    lastSeenAt: { type: Date, default: Date.now },
    googleId: { type: String, unique: true, sparse: true },
    passwordSet: { type: Boolean, default: true },
    // Secrets are select:false: they only load when a query asks for them explicitly.
    twoFactor: {
      enabled: { type: Boolean, default: false },
      enabledAt: { type: Date },
      secretEnc: { type: String, select: false },
      pendingSecretEnc: { type: String, select: false },
      recoveryCodeHashes: { type: [String], select: false },
      lastUsedStep: { type: Number, select: false },
      failedAttempts: { type: Number, default: 0, select: false },
      lockedUntil: { type: Date, select: false },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never leak passwordHash even if accidentally selected
userSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    if (ret.twoFactor) {
      delete ret.twoFactor.secretEnc;
      delete ret.twoFactor.pendingSecretEnc;
      delete ret.twoFactor.recoveryCodeHashes;
    }
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
