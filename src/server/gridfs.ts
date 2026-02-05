import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';

// Configuração de Credenciais
const KEY_PATH = path.join(process.cwd(), 'google-credentials.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_PATH;

const DATABASE_UID = "formulario01"; // Conforme sua imagem do console
const LOCATION = "nam5";             // Conforme sua imagem do console
const DATABASE_ID = "formulario01";  // Geralmente o ID é o mesmo do UID neste modo

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
    OIDC_CALLBACK: getGoogleAccessToken
  },
  serverSelectionTimeoutMS: 5000, // Desiste rápido para não travar o Bolt
  family: 4                       // Força IPv4 para evitar problemas de DNS no container
};

// 3. ABRIR A CONEXÃO (Sem travar o boot)
conn.openUri(mongoURI, mongoOptions).then(() => {
  console.log("✅ Banco de Dados da Prefeitura Conectado!");
}).catch(err => {
  console.error("❌ Erro na conexão:", err.message);
});

// 4. EXPORTAR A CONEXÃO (O que faltava!)
export { conn };