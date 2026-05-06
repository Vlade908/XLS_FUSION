import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../src/server/routes';
import { connectDB } from '../../src/server/gridfs';

// Mock do connectDB para testes
jest.mock('../../src/server/gridfs', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  upload: {
    single: jest.fn(() => (req: any, res: any, next: any) => {
      // Mock do multer middleware
      req.file = {
        id: 'mock-file-id',
        filename: 'mock-filename.xlsx',
        originalname: 'test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
      };
      next();
    }),
  },
}));

describe('API Routes Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload-anexo', () => {
    it('should upload an attachment successfully', async () => {
      const response = await request(app)
        .post('/api/upload-anexo')
        .field('responder', 'João Silva')
        .field('formName', 'Formulário A')
        .field('questionNumber', 'Q1')
        .attach('file', Buffer.from('test file content'), 'test.xlsx');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Anexo salvo com sucesso!');
      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toMatchObject({
        id: 'mock-file-id',
        filename: 'mock-filename.xlsx',
        originalname: 'test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
        responder: 'Joao_Silva',
        questionNumber: 'Q1',
        formName: 'Formulario_A',
      });
    });

    it('should return 400 when no file is provided', async () => {
      // Mock multer to not set req.file
      const originalSingle = require('../../src/server/gridfs').upload.single;
      require('../../src/server/gridfs').upload.single = jest.fn(() => (req: any, res: any, next: any) => {
        next();
      });

      const response = await request(app)
        .post('/api/upload-anexo')
        .field('responder', 'João Silva');

      expect(response.status).toBe(400);
      expect(response.text).toBe('Arquivo não encontrado.');

      // Restore original mock
      require('../../src/server/gridfs').upload.single = originalSingle;
    });

    it('should sanitize special characters in responder name', async () => {
      const response = await request(app)
        .post('/api/upload-anexo')
        .field('responder', 'João@#$% Silva!')
        .field('formName', 'Formulário A')
        .field('questionNumber', 'Q1')
        .attach('file', Buffer.from('test'), 'test.xlsx');

      expect(response.status).toBe(201);
      expect(response.body.file.responder).toBe('Joao_Silva');
    });

    it('should handle missing optional fields', async () => {
      const response = await request(app)
        .post('/api/upload-anexo')
        .attach('file', Buffer.from('test'), 'test.xlsx');

      expect(response.status).toBe(201);
      expect(response.body.file.responder).toBe('desconhecido');
      expect(response.body.file.formName).toBe('geral');
      expect(response.body.file.questionNumber).toBe('0');
    });
  });

  describe('POST /api/upload-planilha', () => {
    it('should upload a spreadsheet successfully', async () => {
      const response = await request(app)
        .post('/api/upload-planilha')
        .attach('file', Buffer.from('spreadsheet content'), 'planilha.xlsx');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Planilha salva!');
      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toMatchObject({
        id: 'mock-file-id',
        filename: 'mock-filename.xlsx',
        originalname: 'planilha.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
      });
    });

    it('should return 400 when no file is provided', async () => {
      const originalSingle = require('../../src/server/gridfs').upload.single;
      require('../../src/server/gridfs').upload.single = jest.fn(() => (req: any, res: any, next: any) => {
        next();
      });

      const response = await request(app)
        .post('/api/upload-planilha');

      expect(response.status).toBe(400);
      expect(response.text).toBe('Arquivo não encontrado.');

      require('../../src/server/gridfs').upload.single = originalSingle;
    });
  });

  describe('GET /api/health', () => {
    it('should return OK status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });
});