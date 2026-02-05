import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

let conn: mongoose.Connection;

// 1. Configuração de Credenciais
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'google-credentials.json');

const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; 
const DATABASE_ID = "(default)"; 

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

// 2. URI de Conexão (Conforme documentação oficial que você enviou)
const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

// 3. Função para gerar o token do Google Cloud
const fetchGoogleToken = async () => {
  const client = await auth.getClient();
  const response = await client.getAccessToken();
  return {
    accessToken: response.token,
    expiresInSeconds: 3600
  };
};

// 4. Propriedades de Autenticação OIDC
const authProps = {
  authMechanismProperties: {
    // Para ambientes de desenvolvimento como Bolt.new, usamos 'test'
    // Mas garantimos que a URI esteja limpa de usuários manuais
    ENVIRONMENT: 'test',
    OIDC_CALLBACK: fetchGoogleToken
  }
};

// 5. Criamos a Conexão principal
const conn = mongoose.createConnection();

// Tentativa de conexão direta
conn.openUri(mongoURI, authProps)
  .then(() => console.log("✅ XLFusion: Conectado ao Firestore Enterprise via OIDC"))
  .catch(err => console.error("❌ Erro na conexão inicial:", err.message));

// 6. Configuração do Storage do GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  options: authProps, // Aqui passamos as propriedades para o storage também
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

export const upload = multer({ storage });
export { conn };