import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';

// Configuração de Credenciais
const KEY_PATH = path.join(process.cwd(), 'google-credentials.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_PATH;

const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; 
const DATABASE_ID = "(default)"; 

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

// 1. CRIAR A INSTÂNCIA DE CONEXÃO
const conn = mongoose.createConnection();

// 2. CONFIGURAR O OIDC
const mongoOptions = {
  authMechanismProperties: {
    ENVIRONMENT: 'test',
    OIDC_CALLBACK: async () => {
      const client = await auth.getClient();
      const res = await client.getAccessToken();
      return { accessToken: res.token, expiresInSeconds: 3600 };
    }
  }
};

// 3. ABRIR A CONEXÃO (Sem travar o boot)
conn.openUri(mongoURI, mongoOptions).then(() => {
  console.log("✅ Banco de Dados da Prefeitura Conectado!");
}).catch(err => {
  console.error("❌ Erro na conexão:", err.message);
});

// 4. EXPORTAR A CONEXÃO (O que faltava!)
export { conn };