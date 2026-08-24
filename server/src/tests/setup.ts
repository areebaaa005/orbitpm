import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function deriveTestUri(uri: string): string {
  // Swap the database name for a dedicated test database so tests never
  // touch real development data, regardless of SRV or standard URI shape.
  if (uri.includes('/orbitpm?') || uri.includes('/orbitpm_test?')) {
    return uri.replace(/\/orbitpm(_test)?\?/, '/orbitpm_test?');
  }
  return uri.includes('?') ? uri.replace('?', '_test?') : `${uri}_test`;
}

beforeAll(async () => {
  const baseUri = process.env.MONGO_URI;
  if (!baseUri) throw new Error('MONGO_URI is not set — cannot run tests');
  await mongoose.connect(deriveTestUri(baseUri));
});

afterAll(async () => {
  // dropDatabase() needs a dbAdmin role that Atlas free-tier users don't
  // have. Clearing each collection only needs readWrite, which we do have.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  await mongoose.disconnect();
});
