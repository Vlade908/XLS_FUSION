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

jest.mock('../../src/server/models', () => ({
  FormModel,
  AccessRequestModel: { find: jest.fn(), findOne: jest.fn(), findById: jest.fn() },
  SharedSpreadsheetModel: { findOne: jest.fn() },
  UserModel: { findOne: jest.fn() },
  ResponseModel: { find: jest.fn() },
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
});
