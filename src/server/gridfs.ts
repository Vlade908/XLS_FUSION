import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'google-credentials.json');

const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; 
const DATABASE_ID = "(default)"; 

const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

const storage = new GridFsStorage({
  url: mongoURI,
  options: {
    authMechanismProperties: {
      ENVIRONMENT: 'test',
      OIDC_CALLBACK: async () => {
        const client = await auth.getClient();
        const res = await client.getAccessToken();
        return { accessToken: res.token, expiresInSeconds: 3600 };
      }
    }
  },
  file: (req, file) => {
    return {
      filename: crypto.randomBytes(16).toString('hex') + path.extname(file.originalname),
      bucketName: 'planilhas_auditoria'
    };
  }
});

// Exportamos o middleware sem tentar conectar o mongoose globalmente agora
export const upload = multer({ storage });