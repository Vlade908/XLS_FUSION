/** @format */

/**
 * routes.ts — Mapa de Rotas (MVC)
 *
 * Este arquivo é APENAS um mapa de roteamento.
 * Toda a lógica de negócio fica nos Controllers.
 * Os middlewares de segurança ficam em /middleware.
 */

import { Express } from 'express';
import { upload } from './gridfs';

// Middleware
import { requireAuth } from './middleware/authMiddleware';

// Controllers
import { signup, login, me } from './controllers/authController';
import {
  listForms,
  saveForm,
  requestAccess,
  listAccessRequests,
  handleAccessRequest,
} from './controllers/formController';
import { getPublicForm, submitPublicResponse } from './controllers/publicFormController';
import {
  uploadAnexo,
  uploadPlanilha,
  shareSpreadsheet,
  getShareInfo,
  downloadShare,
} from './controllers/fileController';

export function registerRoutes(app: Express) {
  // ─────────────────────────────────────────────
  // 1. Sistema de Saúde
  // ─────────────────────────────────────────────
  app.get('/api/health', (_req, res) => res.status(200).send('OK'));

  // ─────────────────────────────────────────────
  // 2. Autenticação
  // ─────────────────────────────────────────────
  app.post('/api/signup', signup);
  app.post('/api/login', login);
  app.get('/api/me', requireAuth, me);

  // ─────────────────────────────────────────────
  // 3. Formulários (Privados — requer login)
  // ─────────────────────────────────────────────
  app.get('/api/forms', requireAuth, listForms);
  app.post('/api/forms', requireAuth, saveForm);

  // ─────────────────────────────────────────────
  // 4. Formulários Públicos (sem autenticação)
  // ─────────────────────────────────────────────
  app.get('/api/public-forms/:id', getPublicForm);
  app.post('/api/public-forms/:id/responses', submitPublicResponse);

  // ─────────────────────────────────────────────
  // 5. Pedidos de Acesso
  // ─────────────────────────────────────────────
  app.post('/api/forms/:formId/request-access', requireAuth, requestAccess);
  app.get('/api/access-requests', requireAuth, listAccessRequests);
  app.post('/api/forms/:formId/requests/:requestId/:action', requireAuth, handleAccessRequest);

  // ─────────────────────────────────────────────
  // 6. Upload de Arquivos (GridFS)
  // ─────────────────────────────────────────────
  app.post('/api/upload-anexo', requireAuth, upload.single('file'), uploadAnexo);
  app.post('/api/upload-planilha', requireAuth, upload.single('file'), uploadPlanilha);

  // ─────────────────────────────────────────────
  // 7. Compartilhamento de Planilhas (Legado)
  // ─────────────────────────────────────────────
  app.post('/api/share-spreadsheet', requireAuth, shareSpreadsheet);
  app.get('/api/share/:hash', getShareInfo);
  app.get('/api/share/:hash/download', downloadShare);
}
