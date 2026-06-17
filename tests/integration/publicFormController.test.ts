/** @jest-environment node */
/**
 * Integration Tests — publicFormController.ts
 * Covers: getPublicForm, submitPublicResponse, getPublicResponse, requestAccessPublic
 * Coverage target: ~85%+ of the 246 lines
 */

const request = require('supertest');
const express = require('express');

const FormModel = { findById: jest.fn() };
const ResponseModel = { findOne: jest.fn(), create: jest.fn() };
const AccessRequestModel = { findOne: jest.fn(), create: jest.fn() };
const NotificationModel = { create: jest.fn() };

jest.mock('../../src/server/models', () => ({
  FormModel,
  ResponseModel,
  AccessRequestModel,
  NotificationModel,
  SharedSpreadsheetModel: { findOne: jest.fn() },
  UserModel: { findOne: jest.fn() },
}));

jest.mock('../../src/server/gridfs', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  upload: { single: jest.fn(() => (req: any, res: any, next: any) => next()) },
}));

jest.mock('../../src/server/utils/emailService', () => ({
  sendResetEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

const { registerRoutes } = require('../../src/server/routes');

const publicForm = {
  _id: 'form-pub-1',
  name: 'formulario_publico',
  title: 'Formulário Público',
  description: 'Desc',
  ownerEmail: 'owner@example.com',
  questions: [
    { id: 'q1', type: 'simnao', text: 'Sim ou Não?' },
    { id: 'q2', type: 'respostaescrita', text: 'Escreva algo' },
  ],
  allowedEmails: [],
  allowedDomains: [],
};

const restrictedForm = {
  ...publicForm,
  _id: 'form-restricted-1',
  allowedEmails: ['allowed@example.com'],
  allowedDomains: ['trusted.com'],
};

describe('Public Form Controller', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    registerRoutes(app);
  });

  beforeEach(() => jest.clearAllMocks());

  // ── GET /api/public-forms/:id ───────────────────────────────────────────────

  describe('GET /api/public-forms/:id', () => {
    it('returns form data for a public form', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));

      const res = await request(app).get('/api/public-forms/form-pub-1');

      expect(res.status).toBe(200);
      expect(res.body._id).toBe('form-pub-1');
      expect(res.body.title).toBe('Formulário Público');
      expect(res.body.questions).toHaveLength(2);
    });

    it('returns 404 when form does not exist', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      const res = await request(app).get('/api/public-forms/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/não encontrado/i);
    });
  });

  // ── POST /api/public-forms/:id/responses ───────────────────────────────────

  describe('POST /api/public-forms/:id/responses', () => {
    const validData = { q1: 'Sim', q2: 'Olá' };

    it('creates a new response for a public form', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));
      ResponseModel.findOne.mockResolvedValue(null);
      ResponseModel.create.mockResolvedValue({ _id: 'resp-1' });
      NotificationModel.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/responses')
        .send({ responderEmail: 'responder@example.com', data: validData });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/sucesso/i);
    });

    it('updates existing response if data changed', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));
      const existing = {
        data: { q1: 'Não', q2: 'old' },
        history: [] as any[],
        submitted: false,
        save: jest.fn().mockResolvedValue({ _id: 'resp-1' }),
      };
      ResponseModel.findOne.mockResolvedValue(existing);
      NotificationModel.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/responses')
        .send({ responderEmail: 'responder@example.com', data: validData });

      expect(res.status).toBe(201);
      expect(existing.history).toHaveLength(1);
      expect(existing.save).toHaveBeenCalled();
    });

    it('does not add history when data is unchanged', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));
      const existing = {
        data: { q1: 'Sim', q2: 'Olá' },
        history: [] as any[],
        submitted: true,
        save: jest.fn().mockResolvedValue({ _id: 'resp-1' }),
      };
      ResponseModel.findOne.mockResolvedValue(existing);
      NotificationModel.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/responses')
        .send({ responderEmail: 'responder@example.com', data: validData });

      expect(res.status).toBe(201);
      expect(existing.history).toHaveLength(0);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/public-forms/form-pub-1/responses')
        .send({ responderEmail: 'not-an-email', data: {} });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inválido/i);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/public-forms/form-pub-1/responses')
        .send({ data: {} });
      expect(res.status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));
      const res = await request(app)
        .post('/api/public-forms/nonexistent/responses')
        .send({ responderEmail: 'a@b.com', data: {} });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid response data (wrong simnao value)', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));
      const res = await request(app)
        .post('/api/public-forms/form-pub-1/responses')
        .send({ responderEmail: 'a@b.com', data: { q1: 'Maybe' } });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inválidos/i);
    });

    it('returns 403 when email not allowed on restricted form', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(restrictedForm),
      }));
      const res = await request(app)
        .post('/api/public-forms/form-restricted-1/responses')
        .send({ responderEmail: 'notallowed@example.com', data: { q1: 'Sim', q2: 'hi' } });
      expect(res.status).toBe(403);
    });

    it('allows owner email on restricted form', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(restrictedForm),
      }));
      ResponseModel.findOne.mockResolvedValue(null);
      ResponseModel.create.mockResolvedValue({ _id: 'resp-2' });

      const res = await request(app)
        .post('/api/public-forms/form-restricted-1/responses')
        .send({ responderEmail: 'owner@example.com', data: { q1: 'Sim', q2: 'hi' } });
      expect(res.status).toBe(201);
    });

    it('allows email in allowedDomains on restricted form', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(restrictedForm),
      }));
      ResponseModel.findOne.mockResolvedValue(null);
      ResponseModel.create.mockResolvedValue({ _id: 'resp-3' });

      const res = await request(app)
        .post('/api/public-forms/form-restricted-1/responses')
        .send({ responderEmail: 'user@trusted.com', data: { q1: 'Sim', q2: 'hi' } });
      expect(res.status).toBe(201);
    });

    it('skips notification when responder is the owner', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));
      ResponseModel.findOne.mockResolvedValue(null);
      ResponseModel.create.mockResolvedValue({ _id: 'resp-4' });
      NotificationModel.create.mockClear();

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/responses')
        .send({ responderEmail: 'owner@example.com', data: { q1: 'Sim', q2: 'hi' } });

      expect(res.status).toBe(201);
      expect(NotificationModel.create).not.toHaveBeenCalled();
    });
  });

  // ── GET /api/public-forms/:id/responses ────────────────────────────────────

  describe('GET /api/public-forms/:id/responses', () => {
    it('returns existing response data for valid email', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));
      ResponseModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue({ data: { q1: 'Sim' } }),
      }));

      const res = await request(app)
        .get('/api/public-forms/form-pub-1/responses?email=responder@example.com');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ q1: 'Sim' });
    });

    it('returns empty object when no response found', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(publicForm),
      }));
      ResponseModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      const res = await request(app)
        .get('/api/public-forms/form-pub-1/responses?email=new@example.com');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it('returns 400 for invalid email query param', async () => {
      const res = await request(app)
        .get('/api/public-forms/form-pub-1/responses?email=bad-email');
      expect(res.status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));
      const res = await request(app)
        .get('/api/public-forms/nonexistent/responses?email=a@b.com');
      expect(res.status).toBe(404);
    });

    it('returns 403 when email not allowed on restricted form', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(restrictedForm),
      }));
      const res = await request(app)
        .get('/api/public-forms/form-restricted-1/responses?email=notallowed@example.com');
      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/public-forms/:id/request-access ──────────────────────────────

  describe('POST /api/public-forms/:id/request-access', () => {
    it('creates an access request successfully', async () => {
      FormModel.findById.mockResolvedValue({
        ...publicForm,
        allowedEmails: [],
        allowedDomains: [],
        ownerEmail: 'owner@example.com',
        name: 'formulario_publico',
        _id: 'form-pub-1',
      });
      AccessRequestModel.findOne.mockResolvedValue(null);
      AccessRequestModel.create.mockResolvedValue({ _id: 'req-1' });
      NotificationModel.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/request-access')
        .send({ requesterEmail: 'requester@example.com', message: 'Quero acesso.' });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/criada/i);
    });

    it('returns 400 for invalid requesterEmail', async () => {
      const res = await request(app)
        .post('/api/public-forms/form-pub-1/request-access')
        .send({ requesterEmail: 'not-email', message: '' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      FormModel.findById.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/public-forms/nonexistent/request-access')
        .send({ requesterEmail: 'a@b.com' });
      expect(res.status).toBe(404);
    });

    it('returns 200 when email already has access', async () => {
      FormModel.findById.mockResolvedValue({
        ...publicForm,
        allowedEmails: ['requester@example.com'],
        allowedDomains: [],
      });

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/request-access')
        .send({ requesterEmail: 'requester@example.com', message: '' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/já possui acesso/i);
    });

    it('returns 409 when pending request already exists', async () => {
      FormModel.findById.mockResolvedValue({
        ...publicForm,
        allowedEmails: [],
        allowedDomains: [],
      });
      AccessRequestModel.findOne.mockResolvedValue({ _id: 'req-existing', status: 'pending' });

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/request-access')
        .send({ requesterEmail: 'requester@example.com', message: '' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/pendente/i);
    });

    it('returns 200 when email domain already has access', async () => {
      FormModel.findById.mockResolvedValue({
        ...publicForm,
        allowedEmails: [],
        allowedDomains: ['trusted.com'],
      });

      const res = await request(app)
        .post('/api/public-forms/form-pub-1/request-access')
        .send({ requesterEmail: 'user@trusted.com', message: '' });

      expect(res.status).toBe(200);
    });
  });
});

export {};
