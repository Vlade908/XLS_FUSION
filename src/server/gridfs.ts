import mongoose from 'mongoose';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';
import path from 'path';

// 1. Sua URI do Firestore Enterprise (Modo MongoDB)
const mongoURI = "mongodb://enzoalves:0wr4Gc6R_4k44nCFPprHVLrpPiMDRIFhYeVCijjAVkzqAp1G@16158504-0949-4082-a560-03c600920d32.nam5.firestore.goog:443/formulario01?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false";

// 2. Criar a conexão
const conn = mongoose.createConnection(mongoURI);

// 3. Configurar o armazenamento do GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // Criamos um nome único para evitar conflitos
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        
        const fileInfo = {
          filename: filename,
          bucketName: 'planilhas_auditoria', // Nome das coleções no Firestore
          metadata: {
            originalName: file.originalname,
            uploadedBy: req.body.workerName || 'Anonimo',
            uploadDate: new Date()
          }
        };
        resolve(fileInfo);
      });
    });
  }
});

export const upload = multer({ storage });