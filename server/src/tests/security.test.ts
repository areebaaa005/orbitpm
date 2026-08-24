import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app).post('/api/v1/auth/register').send({
    name: 'Security Test',
    email,
    password: 'ValidPass123',
  });
  return res.body.data.accessToken as string;
}

describe('Security: cross-workspace isolation', () => {
  let tokenA: string;
  let tokenB: string;
  let workspaceAId: string;
  let projectAId: string;

  beforeAll(async () => {
    tokenA = await registerAndLogin('security-user-a@orbitpm.dev');
    tokenB = await registerAndLogin('security-user-b@orbitpm.dev');

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
    ownerToken = await registerAndLogin('rbac-owner@orbitpm.dev');
    viewerToken = await registerAndLogin('rbac-viewer@orbitpm.dev');

    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'RBAC Workspace' });
    workspaceId = wsRes.body.data.workspace._id;

    const inviteRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'rbac-viewer@orbitpm.dev', role: 'viewer' });

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
