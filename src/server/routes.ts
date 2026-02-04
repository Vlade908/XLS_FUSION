import { Express } from 'express';
import { upload } from './gridfs';

export function registerRoutes(app: Express) {
  // Rota para o funcionário enviar a planilha
  app.post('/api/upload-planilha', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('Nenhum arquivo enviado.');
    }
    
    // O Multer-Gridfs já salvou o arquivo no Firestore aqui!
    res.status(200).json({
      message: 'Planilha salva no Google Cloud via GridFS!',
      fileId: req.file.id,
      filename: req.file.filename
    });
  });
}