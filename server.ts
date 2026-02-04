import mongoose from 'mongoose';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';
import path from 'path';

// 1. Criar a conexão com o MongoDB (URI do seu Datastore Enterprise)
const mongoURI = "SUA_URI_DO_MONGODB_AQUI";
const conn = mongoose.createConnection(mongoURI);

// 2. Configurar o Storage do GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // Gerar um nome único para o arquivo para não sobrescrever
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads_xlfusion', // Nome da coleção no Mongo
          metadata: { 
            originalName: file.originalname,
            uploadDate: new Date()
          }
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({ storage });