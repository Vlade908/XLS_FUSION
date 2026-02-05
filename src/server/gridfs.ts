import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

// Dados do seu Google Cloud
const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; 
const DATABASE_ID = "(default)"; 

const KEY_PATH = path.join(process.cwd(), 'google-credentials.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_PATH;

// Criamos o storage de forma dinâmica
const storage = new GridFsStorage({
  url: `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`,
  options: {
    authMechanismProperties: {
      ENVIRONMENT: 'test',
      OIDC_CALLBACK: async () => {
        const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        const client = await auth.getClient();
        const res = await client.getAccessToken();
        return { accessToken: res.token, expiresInSeconds: 3600 };
      }
    }
  },
  file: (req, file) => {
    return {
      filename: crypto.randomBytes(16).toString('hex') + path.extname(file.originalname),
      bucketName: 'planilhas_auditoria',
      metadata: { originalName: file.originalname, uploadDate: new Date() }
    };
  }
});

export const upload = multer({ storage });