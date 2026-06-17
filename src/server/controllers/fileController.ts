import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SharedSpreadsheetModel } from '../models/index';

// ── In-memory upload metrics tracker ─────────────────────────────────────────
interface UploadMetric {
  durationMs: number;
  success: boolean;
  sizeBytes: number;
  timestamp: number;
}

const uploadMetrics: UploadMetric[] = [];
const MAX_METRICS_HISTORY = 500;

function recordUploadMetric(durationMs: number, success: boolean, sizeBytes: number) {
  uploadMetrics.push({ durationMs, success, sizeBytes, timestamp: Date.now() });
  if (uploadMetrics.length > MAX_METRICS_HISTORY) uploadMetrics.shift();
}

export function getUploadSystemMetrics() {
  const total = uploadMetrics.length;
  const successes = uploadMetrics.filter(m => m.success).length;
  const failures = total - successes;
  const successRate = total > 0 ? parseFloat(((successes / total) * 100).toFixed(2)) : null;

  // Only measure heavy uploads (>100KB) for the avg parsing time
  const heavyUploads = uploadMetrics.filter(m => m.success && m.sizeBytes > 100 * 1024);
  const avgParsingMs = heavyUploads.length > 0
    ? Math.round(heavyUploads.reduce((s, m) => s + m.durationMs, 0) / heavyUploads.length)
    : null;

  // All uploads avg
  const allSuccess = uploadMetrics.filter(m => m.success);
  const avgAllMs = allSuccess.length > 0
    ? Math.round(allSuccess.reduce((s, m) => s + m.durationMs, 0) / allSuccess.length)
    : null;

  return {
    totalUploads: total,
    successfulUploads: successes,
    failedUploads: failures,
    successRatePct: successRate,
    avgParsingMs: avgParsingMs ?? avgAllMs,
    heavyUploadCount: heavyUploads.length,
  };
}

const sanitizePath = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .trim();

const createShareHash = () =>
  `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;

export const uploadAnexo = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).send('Arquivo não encontrado.');

    const safeResponder = sanitizePath(String(req.body.responder || 'desconhecido'));
    const safeForm = sanitizePath(String(req.body.formName || 'geral'));
    const safeQNumber = sanitizePath(String(req.body.questionNumber || '0'));

    const fileInfo = {
      id: (req.file as any).id,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      responder: safeResponder,
      questionNumber: safeQNumber,
      formName: safeForm,
    };

    res.status(201).json({ message: 'Anexo salvo com sucesso!', file: fileInfo });
  } catch (err: any) {
    console.error('❌ [UPLOAD ANEXO ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const uploadPlanilha = async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      recordUploadMetric(Date.now() - startTime, false, 0);
      return res.status(400).send('Arquivo não encontrado.');
    }

    const fileInfo = {
      id: String((req.file as any).id),
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };

    recordUploadMetric(Date.now() - startTime, true, req.file.size);
    res.status(201).json({ message: 'Planilha salva!', file: fileInfo });
  } catch (err: any) {
    recordUploadMetric(Date.now() - startTime, false, req.file?.size || 0);
    console.error('❌ [UPLOAD PLANILHA ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const shareSpreadsheet = async (req: Request, res: Response) => {
  try {
    const { fileId, originalname, description } = req.body;
    if (!fileId || !originalname) {
      return res.status(400).json({ error: 'fileId e originalname são obrigatórios.' });
    }

    const ownerEmail = (req as any).user?.email || 'anonymous';
    const hash = createShareHash();
    const share = await SharedSpreadsheetModel.create({
      fileId: String(fileId),
      ownerEmail: ownerEmail.toLowerCase(),
      originalname: String(originalname).trim(),
      description: String(description || ''),
      hash,
    });

    const origin = String(
      req.headers.origin || `http://localhost:${process.env.PORT || 8080}`
    );
    const shareUrl = `${origin}/share/${share.hash}`;

    res.status(201).json({
      message: 'Link de compartilhamento criado.',
      hash: share.hash,
      shareUrl,
      info: {
        originalname: share.originalname,
        ownerEmail: share.ownerEmail,
        description: share.description,
        createdAt: share.createdAt,
      },
    });
  } catch (err: any) {
    console.error('❌ [SHARE ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getShareInfo = async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const share = await SharedSpreadsheetModel.findOne({ hash }).lean();
    if (!share) return res.status(404).json({ error: 'Link de compartilhamento não encontrado.' });

    res.status(200).json({
      hash: share.hash,
      originalname: share.originalname,
      ownerEmail: share.ownerEmail,
      description: share.description,
      createdAt: share.createdAt,
      downloadUrl: `/api/share/${share.hash}/download`,
    });
  } catch (err: any) {
    console.error('❌ [SHARE INFO ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const downloadShare = async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const share = await SharedSpreadsheetModel.findOne({ hash }).lean();
    if (!share) return res.status(404).json({ error: 'Link de compartilhamento não encontrado.' });

    if (!mongoose.connection.db) {
      return res.status(500).json({ error: 'Conexão ao banco de dados não disponível.' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });
    const objectId = new mongoose.Types.ObjectId(share.fileId);
    const downloadStream = bucket.openDownloadStream(objectId);

    res.setHeader('Content-Disposition', `attachment; filename="${share.originalname}"`);
    downloadStream.pipe(res).on('error', (error) => {
      console.error('❌ [DOWNLOAD ERROR]:', error);
      res.status(500).end();
    });
  } catch (err: any) {
    console.error('❌ [SHARE DOWNLOAD ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};
