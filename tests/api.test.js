const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

jest.mock('../src/db', () => require('./mocks/db'));
const db = require('./mocks/db');
const { createApp } = require('../src/app');

let app;
let admin;
let uploader;
let viewer;
let other;
let documentId;

async function login(email, password) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ email, password });
  return { agent, response };
}

beforeEach(async () => {
  process.env.SESSION_SECRET = 'test-secret';
  db.reset();
  app = createApp();
  admin = await login('admin@trustvault.test', 'Admin@12345');
  uploader = await login('uploader@trustvault.test', 'Uploader@12345');
  viewer = await login('viewer@trustvault.test', 'Viewer@12345');
  other = await login('other@trustvault.test', 'Other@12345');

  const upload = await uploader.agent
    .post('/api/documents')
    .field('name', 'Contract')
    .field('category', 'Legal')
    .attach('file', Buffer.from(' confidential content '), { filename: 'contract.txt', contentType: 'text/plain' });
  documentId = upload.body.document.id;
});

describe('Authentication', () => {
  test('logs in with valid credentials', async () => {
    expect(uploader.response.status).toBe(200);
    expect(uploader.response.body.user.role).toBe('uploader');
  });

  test('rejects invalid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'uploader@trustvault.test',
      password: 'wrong-password'
    });
    expect(response.status).toBe(401);
    const logs = await db.listAudit();
    expect(logs.some((log) => log.action === 'LOGIN' && log.success === false)).toBe(true);
  });

  test('requires authentication for protected APIs', async () => {
    const response = await request(app).get('/api/documents');
    expect(response.status).toBe(401);
  });
});

describe('Role-based access', () => {
  test('admin can access admin APIs', async () => {
    const response = await admin.agent.get('/api/admin/users');
    expect(response.status).toBe(200);
    expect(response.body.users.length).toBeGreaterThan(0);
  });

  test('viewer cannot access admin APIs', async () => {
    const response = await viewer.agent.get('/api/admin/users');
    expect(response.status).toBe(403);
  });

  test('owner can access own document', async () => {
    const response = await uploader.agent.get(`/api/documents/${documentId}`);
    expect(response.status).toBe(200);
    expect(response.body.document.permission).toBe('owner');
  });

  test('viewer can access explicitly shared document', async () => {
    await uploader.agent
      .post(`/api/documents/${documentId}/access`)
      .send({ email: 'viewer@trustvault.test', permission: 'read' });
    const response = await viewer.agent.get(`/api/documents/${documentId}`);
    expect(response.status).toBe(200);
    expect(response.body.document.permission).toBe('read');
  });

  test('unauthorized user cannot view, download, edit, or delete a document', async () => {
    const view = await other.agent.get(`/api/documents/${documentId}`);
    const download = await other.agent.get(`/api/documents/${documentId}/download`);
    const edit = await other.agent
      .patch(`/api/documents/${documentId}`)
      .field('name', 'Changed');
    const remove = await other.agent.delete(`/api/documents/${documentId}`);

    expect(view.status).toBe(403);
    expect(download.status).toBe(403);
    expect(edit.status).toBe(403);
    expect(remove.status).toBe(403);

    const logs = await db.listAudit();
    expect(logs.some((log) => log.action === 'VIEW' && log.success === false)).toBe(true);
    expect(logs.some((log) => log.action === 'DOWNLOAD' && log.success === false)).toBe(true);
  });
});

describe('Document permissions', () => {
  test('read permission cannot edit', async () => {
    await uploader.agent
      .post(`/api/documents/${documentId}/access`)
      .send({ email: 'viewer@trustvault.test', permission: 'read' });
    const response = await viewer.agent
      .patch(`/api/documents/${documentId}`)
      .field('name', 'Should Not Work');
    expect(response.status).toBe(403);
  });

  test('edit permission can edit', async () => {
    await uploader.agent
      .post(`/api/documents/${documentId}/access`)
      .send({ email: 'viewer@trustvault.test', permission: 'edit' });
    const response = await viewer.agent
      .patch(`/api/documents/${documentId}`)
      .field('name', 'Updated Contract');
    expect(response.status).toBe(200);
    expect(response.body.document.name).toBe('Updated Contract');
  });

  test('revoked user cannot access or download', async () => {
    await uploader.agent
      .post(`/api/documents/${documentId}/access`)
      .send({ email: 'viewer@trustvault.test', permission: 'read' });
    const target = db.state.users.find((user) => user.email === 'viewer@trustvault.test');
    await uploader.agent.delete(`/api/documents/${documentId}/access/${target.id}`);

    const view = await viewer.agent.get(`/api/documents/${documentId}`);
    const download = await viewer.agent.get(`/api/documents/${documentId}/download`);
    expect(view.status).toBe(403);
    expect(download.status).toBe(403);
  });
});

describe('Upload validation', () => {
  test('rejects files larger than 5 MB', async () => {
    const response = await uploader.agent
      .post('/api/documents')
      .field('name', 'Too Large')
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1, 'a'), { filename: 'large.txt', contentType: 'text/plain' });
    expect(response.status).toBe(400);
  });

  test('rejects unsupported file types', async () => {
    const response = await uploader.agent
      .post('/api/documents')
      .field('name', 'Bad Type')
      .attach('file', Buffer.from('not allowed'), { filename: 'malware.exe', contentType: 'application/octet-stream' });
    expect(response.status).toBe(400);
  });

  test('uploads supported files', async () => {
    const response = await uploader.agent
      .post('/api/documents')
      .field('name', 'Valid File')
      .field('category', 'HR')
      .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(response.status).toBe(201);
    expect(response.body.document.category).toBe('HR');
  });
});

describe('Audit logging', () => {
  test('records successful and failed access attempts', async () => {
    await other.agent.get(`/api/documents/${documentId}`);
    await viewer.agent.get(`/api/documents/${documentId}/download`);

    const logs = await db.listAudit();
    expect(logs.some((log) => log.action === 'VIEW' && log.success === false && log.user_email === 'other@trustvault.test')).toBe(true);
    expect(logs.some((log) => log.action === 'DOWNLOAD' && log.success === false && log.user_email === 'viewer@trustvault.test')).toBe(true);
  });

  test('records upload, share, edit, and revoke events', async () => {
    await uploader.agent
      .post(`/api/documents/${documentId}/access`)
      .send({ email: 'viewer@trustvault.test', permission: 'edit' });
    await viewer.agent.patch(`/api/documents/${documentId}`).field('name', 'Renamed');
    const target = db.state.users.find((user) => user.email === 'viewer@trustvault.test');
    await uploader.agent.delete(`/api/documents/${documentId}/access/${target.id}`);

    const actions = (await db.listAudit()).map((log) => log.action);
    expect(actions).toEqual(expect.arrayContaining(['UPLOAD', 'SHARE', 'EDIT', 'REVOKE']));
  });
});
