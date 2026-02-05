import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

// 1. Configuração de Credenciais
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'google-credentials.json');

const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; 
const DATABASE_ID = "(default)"; 

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

// 2. URI de Conexão
const mongoURI = `mongodb://EXTERNAL_CALLBACK_USER@${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

// 3. Criamos a Conexão
const conn = mongoose.createConnection();

// 4. Configuração do Storage do GridFS
// IMPORTANTE: O storage precisa da URI para funcionar de forma independente
const storage = new GridFsStorage({
  url: mongoURI,
  options: {
    // @ts-ignore
    authMechanismProperties: {
      ENVIRONMENT: 'test',
      OIDC_CALLBACK: async () => {
        const client = await auth.getClient();
        const response = await client.getAccessToken();
        return {
          accessToken: response.token,
          expiresInSeconds: 3600
        };
      }
    }
  },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'planilhas_auditoria',
          metadata: { originalName: file.originalname, date: new Date() }
        };
        resolve(fileInfo);
      });
    });
  }
});

// 5. EXPORTAÇÕES (O que estava faltando)
export const upload = multer({ storage });
export { conn };

// Inicializa a conexão para log de debug
conn.openUri(mongoURI, storage.options).then(() => {
  console.log("✅ XLFusion: Conectado ao Firestore Enterprise via OIDC");
}).catch(err => console.error("❌ Erro na conexão inicial:", err));