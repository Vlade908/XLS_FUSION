import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

// 1. Configuração do Ambiente de Credenciais
// O caminho deve ser absoluto para evitar erros no ambiente de container do Bolt
const KEY_PATH = path.join(process.cwd(), 'google-credentials.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_PATH;

const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; 
const DATABASE_ID = "(default)"; 

// 2. Instância de Autenticação do Google
const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

// 3. URI de Conexão Oficial (Firestore Enterprise MongoDB Compatibility)
const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

/**
 * Função auxiliar para buscar o Token OIDC do Google Cloud
 * Essencial para o mecanismo MONGODB-OIDC
 */
const getGoogleAccessToken = async () => {
  try {
    const client = await auth.getClient();
    const res = await client.getAccessToken();
    return {
      accessToken: res.token,
      expiresInSeconds: 3600
    };
  } catch (error) {
    console.error("❌ Falha ao obter Token do Google Cloud:", error);
    throw error;
  }
};

// 4. Configurações de Conexão Compartilhadas
const mongoOptions = {
  authMechanismProperties: {
    ENVIRONMENT: 'test', // 'test' indica uso de callback local para OIDC
    OIDC_CALLBACK: getGoogleAccessToken
  },
  serverSelectionTimeoutMS: 15000, // Aumentado para lidar com a latência do handshake OIDC
  heartbeatFrequencyMS: 10000
};

// 5. Gerenciamento de Conexão Singleton (Evita vazamento de memória no Bolt)
let conn: mongoose.Connection;

if ((global as any).mongooseConn) {
  conn = (global as any).mongooseConn;
} else {
  conn = mongoose.createConnection();
  (global as any).mongooseConn = conn;
}

// 6. Configuração do Storage do GridFS
// O Multer-GridFS precisa da URI e das opções de autenticação para fatiar o arquivo
const storage = new GridFsStorage({
  url: mongoURI,
  options: mongoOptions,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'planilhas_auditoria', // Nome da coleção no Firestore
          metadata: {
            originalName: file.originalname,
            uploadDate: new Date(),
            contentType: file.mimetype,
            workerName: req.body.workerName || 'Desconhecido'
          }
        };
        resolve(fileInfo);
      });
    });
  }
});

// Tratamento de erros de armazenamento
storage.on('connectionError', (err) => {
  console.error("❌ Erro de conexão no Storage GridFS:", err.message);
});

// 7. Ativação da Conexão Principal do Mongoose
if (conn.readyState === 0) {
  conn.openUri(mongoURI, mongoOptions)
    .then(() => console.log("✅ Conectado ao Firestore Enterprise via OIDC"))
    .catch(err => {
      console.error("❌ Falha na conexão inicial Mongoose:", err.message);
      if (err.message.includes('detached')) {
        console.warn("⚠️ Detectado erro de memória do Bolt. Reiniciando processo...");
      }
    });
}

// 8. Exportações
export const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // Limite de 20MB para planilhas
});
export { conn };