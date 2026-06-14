/** @jest-environment node */

const request = require('supertest');
const express = require('express');
const { registerRoutes } = require('../../src/server/routes');

// Mock Models
jest.mock('../../src/server/models', () => ({
  UserModel: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  FormModel: {},
  AccessRequestModel: {},
  ResponseModel: {},
  SharedSpreadsheetModel: {},
}));

jest.mock('../../src/server/gridfs', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  upload: { single: jest.fn(() => (req: any, res: any, next: any) => next()) },
}));

jest.mock('../../src/server/utils/emailService', () => ({
  sendResetEmail: jest.fn().mockResolvedValue({
    sent: true,
    method: 'mocked',
    resetUrl: 'http://localhost:5173/#reset-password?token=mocked-token',
  }),
}));


const { UserModel } = require('../../src/server/models');

const mockUser = {
  email: 'user@example.com',
  passwordHash: 'hashed_password',
  resetPasswordToken: null,
  resetPasswordExpires: null,
  save: jest.fn().mockResolvedValue(true),
};

describe('Auth Forgot/Reset Password Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/forgot-password', () => {
    it('should generate token and reset link for existing user', async () => {
      const userInstance = { ...mockUser };
      UserModel.findOne.mockResolvedValue(userInstance);

      const response = await request(app)
        .post('/api/forgot-password')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(userInstance.resetPasswordToken).toBeDefined();
      expect(userInstance.resetPasswordExpires).toBeInstanceOf(Date);
      expect(userInstance.save).toHaveBeenCalled();
    });

    it('should return success message even if user does not exist (for security)', async () => {
      UserModel.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Se o e-mail estiver cadastrado');
    });

    it('should return 400 when email is not provided', async () => {
      const response = await request(app)
        .post('/api/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'E-mail é obrigatório.');
    });
  });

  describe('POST /api/reset-password', () => {
    it('should update password and clear reset token when token is valid', async () => {
      const userInstance = {
        ...mockUser,
        resetPasswordToken: 'valid-token',
        resetPasswordExpires: new Date(Date.now() + 60000), // 1 min in future
      };
      UserModel.findOne.mockResolvedValue(userInstance);

      const response = await request(app)
        .post('/api/reset-password')
        .send({ token: 'valid-token', password: 'newpassword123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Senha redefinida com sucesso!');
      expect(userInstance.resetPasswordToken).toBeNull();
      expect(userInstance.resetPasswordExpires).toBeNull();
      expect(userInstance.save).toHaveBeenCalled();
    });

    it('should return 400 when token is expired or invalid', async () => {
      UserModel.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/reset-password')
        .send({ token: 'invalid-token', password: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token de redefinição de senha inválido ou expirado.');
    });

    it('should return 400 when password is less than 6 chars', async () => {
      const response = await request(app)
        .post('/api/reset-password')
        .send({ token: 'some-token', password: '123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'A nova senha deve ter pelo menos 6 caracteres.');
    });
  });
});

export {};
