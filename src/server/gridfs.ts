// src/server/gridfs.ts
import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';

// 1. Apontamos para o arquivo de chave que você criou
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'google-credentials.json');

const DATABASE_UID = "SEU_UID_AQUI"; 
const LOCATION = "SEU_LOCAL_AQUI"; // ex: southamerica-east1
const DATABASE_ID = "(default)"; // ou o ID do seu banco

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

async function connectToFirestore() {
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    // Formato de URI para OIDC conforme a documentação do Google
    const uri = `mongodb://EXTERNAL_CALLBACK_USER@${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;

    return { uri, accessToken };
  } catch (error) {
    console.error("Erro ao obter token do Google:", error);
    throw error;
  }
}

const conn = mongoose.createConnection();

connectToFirestore().then(({ uri, accessToken }) => {
  conn.openUri(uri, {
    // @ts-ignore - Propriedade específica do driver para o callback do Google
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
  }).then(() => {
    console.log("✅ XLFusion Conectado ao Firestore Enterprise da Prefeitura!");
  });
});

export { conn };