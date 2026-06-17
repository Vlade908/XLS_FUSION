/** @jest-environment node */
/**
 * Integration Tests — authController.ts
 * Covers: signup, login, me, refresh, updateProfile
 * Coverage target: ~90%+ of the 235 lines
 */

const request = require('supertest');
const express = require('express');

const UserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

jest.mock('../../src/server/models', () => ({
  UserModel,
  FormModel: { find: jest.fn(), findById: jest.fn(), create: jest.fn() },
  AccessRequestModel: { find: jest.fn(), findOne: jest.fn(), findById: jest.fn(), create: jest.fn() },
  ResponseModel: { find: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  SharedSpreadsheetModel: { findOne: jest.fn() },
  NotificationModel: { create: jest.fn(), find: jest.fn(), countDocuments: jest.fn(), updateMany: jest.fn() },
}));

jest.mock('../../src/server/gridfs', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  upload: { single: jest.fn(() => (req: any, res: any, next: any) => next()) },
}));

jest.mock('../../src/server/utils/emailService', () => ({
  sendResetEmail: jest.fn().mockResolvedValue({ sent: true, method: 'mocked', resetUrl: 'http://localhost/reset?token=t' }),
}));

const { registerRoutes } = require('../../src/server/routes');
const { createAuthToken, hashPassword } = require('../../src/server/auth');

describe('Auth Controller — signup / login / me / refresh / updateProfile', () => {
  let app: any;
  let authToken: string;

  beforeAll(() => {
    authToken = createAuthToken({ userId: 'u1', email: 'user@example.com' });
    app = express();
    app.use(express.json());
    registerRoutes(app);
  });

  beforeEach(() => jest.clearAllMocks());

  // ── POST /api/signup ────────────────────────────────────────────────────────

  describe('POST /api/signup', () => {
    it('creates a new user and returns a token', async () => {
      UserModel.findOne.mockResolvedValue(null);
      const createdUser = { _id: 'u1', email: 'new@example.com', name: 'New User', save: jest.fn() };
      UserModel.create.mockResolvedValue(createdUser);

      const res = await request(app).post('/api/signup').send({
        email: 'new@example.com',
        password: 'secret123',
        name: 'New User',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('new@example.com');
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(app).post('/api/signup').send({ password: 'secret123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/obrigatório/i);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app).post('/api/signup').send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app).post('/api/signup').send({ email: 'not-an-email', password: 'secret123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inválido/i);
    });

    it('returns 400 when password is shorter than 6 chars', async () => {
      const res = await request(app).post('/api/signup').send({ email: 'a@b.com', password: '123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/6 caracteres/i);
    });

    it('returns 409 when user already exists', async () => {
      UserModel.findOne.mockResolvedValue({ email: 'exists@example.com' });
      const res = await request(app).post('/api/signup').send({ email: 'exists@example.com', password: 'secret123' });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/já existe/i);
    });
  });

  // ── POST /api/login ─────────────────────────────────────────────────────────

  describe('POST /api/login', () => {
    it('returns token and user on valid credentials', async () => {
      const hash = await hashPassword('correct-password');
      UserModel.findOne.mockResolvedValue({
        _id: 'u1',
        email: 'user@example.com',
        name: 'User',
        passwordHash: hash,
      });

      const res = await request(app).post('/api/login').send({
        email: 'user@example.com',
        password: 'correct-password',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('user@example.com');
    });

    it('returns 400 when email or password is missing', async () => {
      const res = await request(app).post('/api/login').send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app).post('/api/login').send({ email: 'bad', password: 'pass' });
      expect(res.status).toBe(400);
    });

    it('returns 401 when user does not exist', async () => {
      UserModel.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/login').send({ email: 'ghost@example.com', password: 'pass123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/inválidas/i);
    });

    it('returns 401 when password is wrong', async () => {
      const hash = await hashPassword('correct-password');
      UserModel.findOne.mockResolvedValue({
        _id: 'u1',
        email: 'user@example.com',
        passwordHash: hash,
      });

      const res = await request(app).post('/api/login').send({
        email: 'user@example.com',
        password: 'wrong-password',
      });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/me ─────────────────────────────────────────────────────────────

  describe('GET /api/me', () => {
    it('returns user info when authenticated', async () => {
      UserModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue({ email: 'user@example.com', name: 'User', avatarUrl: '' }),
      }));

      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('user@example.com');
    });

    it('returns 401 when no token provided', async () => {
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found in DB', async () => {
      UserModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/refresh ───────────────────────────────────────────────────────

  describe('POST /api/refresh', () => {
    it('returns a new token when authenticated', async () => {
      UserModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue({ _id: 'u1', email: 'user@example.com', name: 'User' }),
      }));

      const res = await request(app)
        .post('/api/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('returns 404 when user not found', async () => {
      UserModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      const res = await request(app)
        .post('/api/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 when no auth token', async () => {
      const res = await request(app).post('/api/refresh');
      expect(res.status).toBe(401);
    });
  });

  // ── PUT /api/user/profile ───────────────────────────────────────────────────

  describe('PUT /api/user/profile', () => {
    it('updates name and avatarUrl successfully', async () => {
      const userInstance = {
        email: 'user@example.com',
        name: 'Old Name',
        avatarUrl: '',
        save: jest.fn().mockResolvedValue(true),
      };
      UserModel.findOne.mockResolvedValue(userInstance);

      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name', avatarUrl: 'https://example.com/avatar.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/atualizado/i);
      expect(userInstance.name).toBe('New Name');
      expect(userInstance.save).toHaveBeenCalled();
    });

    it('returns 401 when no token', async () => {
      const res = await request(app).put('/api/user/profile').send({ name: 'Test' });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found in DB', async () => {
      UserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });
});

export {};
