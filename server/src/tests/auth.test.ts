import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Auth', () => {
  it('registers a new user with valid data', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'auth-test-1@orbitpm.dev',
      password: 'ValidPass123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('auth-test-1@orbitpm.dev');
  });

  it('rejects registration with a short password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'auth-test-2@orbitpm.dev',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'First',
      email: 'auth-test-dup@orbitpm.dev',
      password: 'ValidPass123',
    });
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Second',
      email: 'auth-test-dup@orbitpm.dev',
      password: 'ValidPass123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects login with the wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Login Test',
      email: 'auth-test-login@orbitpm.dev',
      password: 'ValidPass123',
    });
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'auth-test-login@orbitpm.dev',
      password: 'WrongPassword',
    });
    expect(res.status).toBe(401);
  });

  it('rejects /auth/me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
