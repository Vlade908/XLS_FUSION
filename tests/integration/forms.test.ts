/** @jest-environment node */

const request = require('supertest');
const express = require('express');
const { createAuthToken } = require('../../src/server/auth');

const mockForm = {
  _id: 'form-1',
  name: 'formulario_a',
  title: 'Formulário A',
  description: 'Descrição do formulário',
  ownerEmail: 'test@example.com',
  questions: [],
  allowedEmails: [],
  allowedDomains: [],
};

const FormModel = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const ResponseModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const AccessRequestModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const NotificationModel = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
};

jest.mock('../../src/server/models', () => ({
  FormModel,
  AccessRequestModel,
  SharedSpreadsheetModel: { findOne: jest.fn() },
  UserModel: { findOne: jest.fn() },
  ResponseModel,
  NotificationModel,
}));

jest.mock('../../src/server/gridfs', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  upload: { single: jest.fn(() => (req: any, res: any, next: any) => next()) },
}));

const { registerRoutes } = require('../../src/server/routes');

describe('Forms API Integration Tests', () => {
  let app: any;
  let authToken: string;

  beforeAll(() => {
    authToken = createAuthToken({ userId: 'test-user', email: 'test@example.com' });
    app = express();
    app.use(express.json());
    registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new form successfully', async () => {
    FormModel.create.mockResolvedValue(mockForm);

    const response = await request(app)
      .post('/api/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'formulario_a',
        title: 'Formulário A',
        description: 'Descrição do formulário',
        questions: [],
        allowedEmails: [],
        allowedDomains: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Formulário criado.');
    expect(response.body.form).toMatchObject({
      _id: 'form-1',
      name: 'formulario_a',
      ownerEmail: 'test@example.com',
    });
    expect(FormModel.create).toHaveBeenCalled();
  });

  it('should update an existing form when owned by the user', async () => {
    const existingForm = {
      ...mockForm,
      save: jest.fn().mockResolvedValue({ ...mockForm, title: 'Formulário Atualizado' }),
    };
    FormModel.findById.mockResolvedValue(existingForm);

    const response = await request(app)
      .post('/api/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        _id: 'form-1',
        name: 'formulario_a',
        title: 'Formulário Atualizado',
        description: 'Descrição atualizada',
        questions: [],
        allowedEmails: [],
        allowedDomains: [],
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Formulário atualizado.');
    expect(existingForm.save).toHaveBeenCalled();
    expect(response.body.form.title).toBe('Formulário Atualizado');
  });

  it('should list forms accessible by the user', async () => {
    FormModel.find.mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue([mockForm]),
    }));

    const response = await request(app)
      .get('/api/forms')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        ...mockForm,
        history: [],
        isOwner: true,
        hasAccess: true,
      },
    ]);
    expect(FormModel.find).toHaveBeenCalledWith({
      $or: [
        { ownerEmail: 'test@example.com' },
        { allowedEmails: 'test@example.com' },
        { allowedDomains: 'example.com' },
      ],
    });
  });

  describe('GET /api/forms/:id', () => {
    it('should return the form details if user is allowed', async () => {
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(mockForm),
      }));

      const response = await request(app)
        .get('/api/forms/form-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', 'form-1');
      expect(response.body).toHaveProperty('isOwner', true);
    });

    it('should return 403 if user is not allowed', async () => {
      const restrictedForm = {
        ...mockForm,
        ownerEmail: 'other@example.com',
        allowedEmails: ['allowed@example.com'],
        allowedDomains: ['allowed.com'],
      };
      FormModel.findById.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(restrictedForm),
      }));

      const response = await request(app)
        .get('/api/forms/form-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/forms/:id/response', () => {
    it('should return user response if exists', async () => {
      const mockResponse = {
        formId: 'form-1',
        responderEmail: 'test@example.com',
        data: { Q1: 'Sim' },
      };
      ResponseModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(mockResponse),
      }));

      const response = await request(app)
        .get('/api/forms/form-1/response')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('responderEmail', 'test@example.com');
      expect(response.body.data).toEqual({ Q1: 'Sim' });
    });
  });

  describe('POST /api/forms/:id/response', () => {
    it('should create new response if none exists', async () => {
      FormModel.findById.mockResolvedValue(mockForm);
      ResponseModel.findOne.mockResolvedValue(null);
      ResponseModel.create.mockResolvedValue({
        formId: 'form-1',
        responderEmail: 'test@example.com',
        data: { Q1: 'Não' },
        submitted: true,
      });

      const response = await request(app)
        .post('/api/forms/form-1/response')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { Q1: 'Não' } });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Resposta salva com sucesso!');
      expect(ResponseModel.create).toHaveBeenCalled();
    });

    it('should update existing response and create history log on change', async () => {
      FormModel.findById.mockResolvedValue(mockForm);
      const existingResponse = {
        formId: 'form-1',
        responderEmail: 'test@example.com',
        data: { Q1: 'Sim' },
        history: [] as any[],
        save: jest.fn().mockResolvedValue(true),
      };
      ResponseModel.findOne.mockResolvedValue(existingResponse);

      const response = await request(app)
        .post('/api/forms/form-1/response')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: { Q1: 'Não' } });

      expect(response.status).toBe(200);
      expect(existingResponse.history.length).toBe(1);
      expect(existingResponse.history[0].data).toEqual({ Q1: 'Sim' });
      expect(existingResponse.data).toEqual({ Q1: 'Não' });
      expect(existingResponse.save).toHaveBeenCalled();
    });
  });

  describe('GET /api/forms/:id/responses-dashboard', () => {
    it('should return all responses for form owner', async () => {
      FormModel.findById.mockResolvedValue(mockForm);
      ResponseModel.find.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ responderEmail: 'responder@example.com', data: {} }]),
      }));

      const response = await request(app)
        .get('/api/forms/form-1/responses-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty('responderEmail', 'responder@example.com');
    });

    it('should return 403 if user is not the owner', async () => {
      const restrictedForm = {
        ...mockForm,
        ownerEmail: 'other@example.com',
      };
      FormModel.findById.mockResolvedValue(restrictedForm);

      const response = await request(app)
        .get('/api/forms/form-1/responses-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Access Requests', () => {
    describe('POST /api/forms/:formId/request-access', () => {
      it('should request access successfully if not already requested or allowed', async () => {
        const restrictedForm = {
          ...mockForm,
          ownerEmail: 'other@example.com',
          allowedEmails: ['allowed@example.com'],
          allowedDomains: [],
        };
        FormModel.findById.mockResolvedValue(restrictedForm);
        AccessRequestModel.findOne.mockResolvedValue(null);
        AccessRequestModel.create.mockResolvedValue({
          _id: 'req-1',
          formId: 'form-1',
          requesterEmail: 'test@example.com',
          status: 'pending',
          message: 'Preciso de acesso.',
        });

        const response = await request(app)
          .post('/api/forms/form-1/request-access')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ message: 'Preciso de acesso.' });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Pedido de acesso criado.');
        expect(AccessRequestModel.create).toHaveBeenCalledWith({
          formId: 'form-1',
          requesterEmail: 'test@example.com',
          message: 'Preciso de acesso.',
        });
      });

      it('should return 409 if access request is already pending', async () => {
        const restrictedForm = {
          ...mockForm,
          ownerEmail: 'other@example.com',
          allowedEmails: [],
          allowedDomains: [],
        };
        FormModel.findById.mockResolvedValue(restrictedForm);
        AccessRequestModel.findOne.mockResolvedValue({ _id: 'req-1', status: 'pending' });

        const response = await request(app)
          .post('/api/forms/form-1/request-access')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ message: 'Preciso de acesso.' });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Já existe um pedido de acesso pendente.');
      });
    });

    describe('GET /api/access-requests', () => {
      it('should list pending access requests for forms owned by the user', async () => {
        FormModel.find.mockImplementation(() => ({
          select: jest.fn().mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue([{ _id: 'form-1', name: 'formulario_a' }]),
          })),
        }));

        AccessRequestModel.find.mockImplementation(() => ({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'req-1',
              formId: 'form-1',
              requesterEmail: 'requester@example.com',
              status: 'pending',
              message: 'Gostaria de responder.',
              createdAt: '2026-06-15T00:00:00Z',
            },
          ]),
        }));

        const response = await request(app)
          .get('/api/access-requests')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0]).toHaveProperty('formName', 'formulario_a');
        expect(response.body[0]).toHaveProperty('requesterEmail', 'requester@example.com');
      });
    });

    describe('POST /api/forms/:formId/requests/:requestId/:action', () => {
      it('should approve access request and add user email to allowedEmails', async () => {
        const existingForm = {
          ...mockForm,
          ownerEmail: 'test@example.com',
          allowedEmails: [] as string[],
          save: jest.fn().mockResolvedValue(true),
        };
        FormModel.findById.mockResolvedValue(existingForm);

        const mockRequest = {
          _id: 'req-1',
          formId: 'form-1',
          requesterEmail: 'requester@example.com',
          status: 'pending',
          save: jest.fn().mockResolvedValue(true),
        };
        AccessRequestModel.findById.mockResolvedValue(mockRequest);

        const response = await request(app)
          .post('/api/forms/form-1/requests/req-1/approve')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Pedido aprovado com sucesso.');
        expect(mockRequest.status).toBe('approved');
        expect(existingForm.allowedEmails).toContain('requester@example.com');
        expect(mockRequest.save).toHaveBeenCalled();
        expect(existingForm.save).toHaveBeenCalled();
      });

      it('should deny access request and not add user email to allowedEmails', async () => {
        const existingForm = {
          ...mockForm,
          ownerEmail: 'test@example.com',
          allowedEmails: [] as string[],
          save: jest.fn().mockResolvedValue(true),
        };
        FormModel.findById.mockResolvedValue(existingForm);

        const mockRequest = {
          _id: 'req-1',
          formId: 'form-1',
          requesterEmail: 'requester@example.com',
          status: 'pending',
          save: jest.fn().mockResolvedValue(true),
        };
        AccessRequestModel.findById.mockResolvedValue(mockRequest);

        const response = await request(app)
          .post('/api/forms/form-1/requests/req-1/deny')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Pedido negado com sucesso.');
        expect(mockRequest.status).toBe('denied');
        expect(existingForm.allowedEmails).not.toContain('requester@example.com');
        expect(mockRequest.save).toHaveBeenCalled();
        expect(existingForm.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Public Access Requests', () => {
    describe('POST /api/public-forms/:id/request-access', () => {
      it('should request access publicly successfully', async () => {
        const restrictedForm = {
          ...mockForm,
          ownerEmail: 'owner@example.com',
          allowedEmails: [],
          allowedDomains: [],
        };
        FormModel.findById.mockResolvedValue(restrictedForm);
        AccessRequestModel.findOne.mockResolvedValue(null);
        AccessRequestModel.create.mockResolvedValue({
          _id: 'req-2',
          formId: 'form-1',
          requesterEmail: 'public-user@example.com',
          status: 'pending',
          message: 'Solicitação via link público.',
        });

        const response = await request(app)
          .post('/api/public-forms/form-1/request-access')
          .send({ requesterEmail: 'public-user@example.com', message: 'Solicitação via link público.' });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Solicitação de acesso criada.');
        expect(AccessRequestModel.create).toHaveBeenCalledWith({
          formId: 'form-1',
          requesterEmail: 'public-user@example.com',
          message: 'Solicitação via link público.',
        });
      });
    });
  });

  describe('Notifications API', () => {
    describe('GET /api/notifications', () => {
      it('should list notifications for the logged in user', async () => {
        NotificationModel.find.mockImplementation(() => ({
          sort: jest.fn().mockImplementation(() => ({
            limit: jest.fn().mockImplementation(() => ({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: 'notif-1',
                  recipientEmail: 'test@example.com',
                  type: 'form_response',
                  title: 'Formulário Respondido',
                  message: 'user@example.com respondeu...',
                  formId: 'form-1',
                  formName: 'Form 1',
                  read: false,
                },
              ]),
            })),
          })),
        }));

        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].title).toBe('Formulário Respondido');
      });
    });

    describe('GET /api/notifications/unread-count', () => {
      it('should return unread count for the logged in user', async () => {
        NotificationModel.countDocuments.mockResolvedValue(3);

        const response = await request(app)
          .get('/api/notifications/unread-count')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.count).toBe(3);
      });
    });

    describe('POST /api/notifications/mark-read', () => {
      it('should mark all notifications as read', async () => {
        NotificationModel.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 2 });

        const response = await request(app)
          .post('/api/notifications/mark-read')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});

export {};
