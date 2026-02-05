import mongoose from 'mongoose';
import { GoogleAuth } from 'google-auth-library';

// Substitua pelos seus dados reais do console
const DATABASE_UID = "seu-uid-aqui";
const LOCATION = "southamerica-east1"; // ou o seu local
const DATABASE_ID = "xlfusion";

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

async function getConnectionString() {
  // Isso busca automaticamente as credenciais do ambiente (ADC)
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  
  // A URL deve seguir o formato da documentação: UID.LOCATION.firestore.goog
  // Usamos o token como mecanismo de autenticação OIDC
  return `mongodb://EXTERNAL_CALLBACK_USER@${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;
}

// Criamos a conexão de forma assíncrona
const conn = mongoose.createConnection();

getConnectionString().then(uri => {
  conn.openUri(uri, {
    // Esta função simula o "onRequest" do código Java
    authMechanismProperties: {
      ENVIRONMENT: 'test', // No Bolt.new usamos modo teste/local
      OIDC_CALLBACK: async () => {
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        return {
          accessToken: tokenResponse.token,
          expiresInSeconds: 3600
        };
      }
    }
  });
});

conn.on('error', err => console.error("❌ Erro Firestore:", err));
conn.once('open', () => console.log("✅ Conectado via Google OAuth!"));

export { conn };