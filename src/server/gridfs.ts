import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

// 1. Configuração de Credenciais do Google Cloud
// Certifique-se de que o arquivo google-credentials.json está na raiz do projeto
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'google-credentials.json');

// --- DADOS DO SEU CONSOLE GOOGLE CLOUD ---
const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; 
const DATABASE_ID = "(default)"; 

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

// 2. URI de Conexão (Formato OIDC sem usuário fixo na URL)
const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

// 3. Função para buscar o Token de Acesso Dinâmico
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
    ENVIRONMENT: 'test',
    OIDC_CALLBACK: fetchGoogleToken
  }
};

// 5. Padrão Singleton para a Conexão (Evita erros de "detached ArrayBuffer")
let conn: mongoose.Connection;

if ((global as any).mongooseConn) {
  conn = (global as any).mongooseConn;
} else {
  conn = mongoose.createConnection();
  (global as any).mongooseConn = conn;
}

// 6. Configuração do Storage do GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  options: authProps, 
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'planilhas_auditoria', // Nome das coleções no Firestore
          metadata: { 
            originalName: file.originalname, 
            uploadDate: new Date(),
            worker: req.body.workerName || 'Sistema'
          }
        };
        resolve(fileInfo);
      });
    });
  }
});

// 7. Inicialização da Conexão
if (conn.readyState === 0) {
  conn.openUri(mongoURI, authProps)
    .then(() => console.log("✅ XLFusion: Conectado ao Firestore Enterprise via OIDC"))
    .catch(err => console.error("❌ Erro na conexão Firestore:", err.message));
}

// 8. Exportação do Middleware e da Conexão
export const upload = multer({ storage });
export { conn };