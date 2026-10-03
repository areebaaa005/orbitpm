import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { signAccessToken } from '../utils/jwt';
import { User } from '../modules/users/user.model';

const app = createApp();

const runId = Date.now();

async function registerAndLogin(emailPrefix: string) {
  const res = await request(app).post('/api/v1/auth/register').send({
    name: 'Security Test',
    email: `${emailPrefix}-${runId}@orbitpm.dev`,
    password: 'ValidPass123',
  });
  if (!res.body?.data?.accessToken) {
    throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.data.accessToken as string,
    email: `${emailPrefix}-${runId}@orbitpm.dev`,
  };
}

describe('Security: cross-workspace isolation', () => {
  let tokenA: string;
  let tokenB: string;
  let workspaceAId: string;
  let projectAId: string;

  beforeAll(async () => {
    const a = await registerAndLogin('security-user-a');
    const b = await registerAndLogin('security-user-b');
    tokenA = a.token;
    tokenB = b.token;

    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Workspace A' });
    workspaceAId = wsRes.body.data.workspace._id;

    const projRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Project A', key: 'PRA' });
    projectAId = projRes.body.data.project._id;
  });

  it('blocks a non-member from listing another workspace\'s projects', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it('blocks a non-member from creating a project in another workspace', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Intruder Project', key: 'INT' });
    expect(res.status).toBe(403);
  });

  it('blocks a non-member from reading a project they are not part of', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it('blocks a non-member from updating a project they are not part of', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijacked name' });
    expect(res.status).toBe(403);
  });

  it('allows the owner full access to their own workspace project', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });
});

describe('Security: role-based permission enforcement', () => {
  let ownerToken: string;
  let viewerToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    const owner = await registerAndLogin('rbac-owner');
    const viewer = await registerAndLogin('rbac-viewer');
    ownerToken = owner.token;
    viewerToken = viewer.token;

    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'RBAC Workspace' });
    workspaceId = wsRes.body.data.workspace._id;

    const inviteRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: viewer.email, role: 'viewer' });

    await request(app)
      .post('/api/v1/workspaces/invitations/accept')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ token: inviteRes.body.data.invitation.token });
  });

  it('blocks a viewer from creating a project (requires pm role or higher)', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Viewer Attempt', key: 'VWA' });
    expect(res.status).toBe(403);
  });

  it('blocks a viewer from inviting other members (requires admin role)', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ email: 'someone-else@orbitpm.dev', role: 'member' });
    expect(res.status).toBe(403);
  });

  it('allows a viewer to read workspace projects', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Robustness: malformed ids', () => {
  const token = signAccessToken({ userId: '507f1f77bcf86cd799439011' });

  it.each([
    '/api/v1/tasks/not-an-id',
    '/api/v1/projects/not-an-id/tasks',
    '/api/v1/workspaces/not-an-id/projects',
  ])('returns 400 (and does not hang) for %s', async (url) => {
    const res = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});

describe('Audit log', () => {
  it('records admin actions, shows them to admins only, and exports CSV', async () => {
    const owner = await registerAndLogin('audit-owner');
    const outsider = await registerAndLogin('audit-outsider');

    const ws = await request(app).post('/api/v1/workspaces').set('Authorization', `Bearer ${owner.token}`).send({ name: 'Audit WS' });
    const id = ws.body.data.workspace._id;
    await request(app).patch(`/api/v1/workspaces/${id}`).set('Authorization', `Bearer ${owner.token}`).send({ name: 'Audit WS renamed' });

    const list = await request(app).get(`/api/v1/workspaces/${id}/audit-logs`).set('Authorization', `Bearer ${owner.token}`);
    expect(list.status).toBe(200);
    const actions = list.body.data.logs.map((l: { action: string }) => l.action);
    expect(actions).toContain('workspace.created');
    expect(actions).toContain('workspace.renamed');
    // Entries without extra details (e.g. workspace.created) must still carry a metadata object
    expect(list.body.data.logs.every((l: { metadata: unknown }) => typeof l.metadata === 'object' && l.metadata !== null)).toBe(true);

    const denied = await request(app).get(`/api/v1/workspaces/${id}/audit-logs`).set('Authorization', `Bearer ${outsider.token}`);
    expect([403, 404]).toContain(denied.status);

    const csv = await request(app).get(`/api/v1/workspaces/${id}/audit-logs/export`).set('Authorization', `Bearer ${owner.token}`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('workspace.renamed');
  });
});

describe('Hardening: search input', () => {
  it('treats regex characters literally and rejects non-string queries without erroring', async () => {
    const { token } = await registerAndLogin('search-hardening');
    const ws = await request(app).post('/api/v1/workspaces').set('Authorization', `Bearer ${token}`).send({ name: 'Search WS' });
    const id = ws.body.data.workspace._id;
    for (const q of ['((', '(a+)+$', '[abc', '.*']) {
      const res = await request(app)
        .get(`/api/v1/workspaces/${id}/search`)
        .query({ q })
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
    const arr = await request(app).get(`/api/v1/workspaces/${id}/search?q=ab&q=cd`).set('Authorization', `Bearer ${token}`);
    expect(arr.status).toBe(200);
  });
});

describe('Hardening: sessions', () => {
  it('stops a suspended user from refreshing their session', async () => {
    const email = `suspended-${runId}@orbitpm.dev`;
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'To Suspend', email, password: 'ValidPass123' });
    const cookies = reg.headers['set-cookie'];
    await User.updateOne({ email }, { status: 'suspended' });
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});
