import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

const DATABASE_UID = "formulario01"; 
const LOCATION = "nam5";             
const DATABASE_ID = "formulario01";  

const KEY_PATH = path.join(process.cwd(), 'google-credentials.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_PATH;

// Deixamos a URI pronta
const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

// Criamos o Storage SEM conectar imediatamente
const storage = new GridFsStorage({
  url: mongoURI,
  options: {
    authMechanismProperties: {
      ENVIRONMENT: 'test',
      OIDC_CALLBACK: async () => {
        const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        const client = await auth.getClient();
        const res = await client.getAccessToken();
        return { accessToken: res.token, expiresInSeconds: 3600 };
      }
    },
    serverSelectionTimeoutMS: 5000,
    family: 4
  },
  file: (req, file) => {
    return {
      filename: crypto.randomBytes(16).toString('hex') + path.extname(file.originalname),
      bucketName: 'planilhas_auditoria'
    };
  }
});

// Exportamos apenas o middleware. O Mongoose só tentará abrir a conexão
// quando o primeiro arquivo bater na rota de upload.
export const upload = multer({ storage });