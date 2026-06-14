/** @jest-environment node */

const request = require('supertest');
const express = require('express');
const { createAuthToken } = require('../../src/server/auth');

const UserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

jest.mock('../../src/server/models', () => ({
  UserModel,
  FormModel: { find: jest.fn(), findById: jest.fn() },
  AccessRequestModel: { find: jest.fn() },
  ResponseModel: { find: jest.fn() },
  SharedSpreadsheetModel: { findOne: jest.fn() },
}));

jest.mock('../../src/server/gridfs', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  upload: { single: jest.fn(() => (req: any, res: any, next: any) => next()) },
}));

const { registerRoutes } = require('../../src/server/routes');

describe('Auth API Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/signup', () => {
    it('should register a new user successfully', async () => {
      UserModel.findOne.mockResolvedValue(null);
      UserModel.create.mockResolvedValue({
        _id: 'new-user-id',
        email: 'newuser@example.com',
        passwordHash: 'hashedpassword',
      });

      const response = await request(app)
        .post('/api/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({ email: 'newuser@example.com' });
      expect(UserModel.create).toHaveBeenCalled();
    });

    it('should return 400 when email or password is missing', async () => {
      const response = await request(app)
        .post('/api/signup')
        .send({ email: 'newuser@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('E-mail e senha são obrigatórios.');
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app)
        .post('/api/signup')
        .send({ email: 'invalidemail', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('E-mail inválido.');
    });

    it('should return 400 when password is shorter than 6 characters', async () => {
      const response = await request(app)
        .post('/api/signup')
        .send({ email: 'newuser@example.com', password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('A senha deve ter pelo menos 6 caracteres.');
    });

    it('should return 409 when user already exists', async () => {
      UserModel.findOne.mockResolvedValue({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/signup')
        .send({ email: 'existing@example.com', password: 'password123' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Usuário já existe.');
    });
  });

  describe('POST /api/login', () => {
    it('should log in successfully with correct credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      UserModel.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'user@example.com',
        passwordHash: hashedPassword,
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({ email: 'user@example.com' });
    });

    it('should return 401 with wrong credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      UserModel.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'user@example.com',
        passwordHash: hashedPassword,
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'user@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas.');
    });

    it('should return 401 when user is not found', async () => {
      UserModel.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas.');
    });
  });

  describe('GET /api/me', () => {
    it('should return 200 and user info with a valid token', async () => {
      const token = createAuthToken({ userId: 'user-id', email: 'user@example.com' });

      const response = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({ email: 'user@example.com' });
    });

    it('should return 401 when authorization header is missing', async () => {
      const response = await request(app).get('/api/me');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/refresh', () => {
    it('should refresh and return a new token when valid token is provided', async () => {
      const token = createAuthToken({ userId: 'user-id', email: 'user@example.com' });

      const response = await request(app)
        .post('/api/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({ email: 'user@example.com' });
    });
  });
});
