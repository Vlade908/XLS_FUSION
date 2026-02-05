import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';

// 1. Configurações vindas da sua imagem do Console Google
const DATABASE_UID = "formulario01"; 
const LOCATION = "nam5";             
const DATABASE_ID = "formulario01";  

const KEY_PATH = path.join(process.cwd(), 'google-credentials.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_PATH;

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

// 2. Definindo a função ANTES de usá-la nas opções
const getGoogleAccessToken = async () => {
  try {
    const client = await auth.getClient();
    const res = await client.getAccessToken();
    return {
      accessToken: res.token,
      expiresInSeconds: 3600
    };
  } catch (error) {
    console.error("❌ Erro ao buscar token Google:", error);
    throw error;
  }
};

const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

const mongoOptions = {
  authMechanismProperties: {
    ENVIRONMENT: 'test',
    OIDC_CALLBACK: getGoogleAccessToken
  },
  serverSelectionTimeoutMS: 10000,
  family: 4
};

// 3. Conexão Singleton para estabilidade no Bolt
let conn: mongoose.Connection;
if ((global as any).mongooseConn) {
  conn = (global as any).mongooseConn;
} else {
  conn = mongoose.createConnection();
  (global as any).mongooseConn = conn;
}

// 4. Storage do GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  options: mongoOptions,
  file: (req, file) => {
    return {
      filename: crypto.randomBytes(16).toString('hex') + path.extname(file.originalname),
      bucketName: 'planilhas_auditoria'
    };
  }
});

// Inicializa a conexão
if (conn.readyState === 0) {
  conn.openUri(mongoURI, mongoOptions)
    .then(() => console.log("✅ Conexão Firestore estabelecida com sucesso!"))
    .catch(err => console.error("❌ Erro de conexão:", err.message));
}

export const upload = multer({ storage });
export { conn };