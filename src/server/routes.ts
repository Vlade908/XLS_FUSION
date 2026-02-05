import { Express } from 'express';
import { upload } from './gridfs.js';
import { GoogleAuth } from 'google-auth-library';
import mongoose from 'mongoose';
import fs from 'fs';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    console.log("🔍 INICIANDO DIAGNÓSTICO DE TI...");

    try {
      const DATABASE_UID = "formulario01"; 
      const LOCATION = "nam5";
      const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_UID}?authMechanism=MONGODB-OIDC&ssl=true`;

      // Passo 1: Testar o Google Auth (Token)
      console.log("1. Gerando Token de Acesso...");
      const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      
      if (!tokenResponse.token) throw new Error("Falha ao gerar Token!");
      console.log("✅ Token gerado com sucesso.");

      // Passo 2: Testar Conectividade Pura (DNS/Porta)
      console.log("2. Tentando Handshake com Firestore...");
      
      // Tentativa de conexão via Mongoose com logs detalhados
      const conn = await mongoose.createConnection(mongoURI, {
        authMechanismProperties: {
          ENVIRONMENT: 'test',
          OIDC_CALLBACK: async () => ({ accessToken: tokenResponse.token!, expiresInSeconds: 3600 })
        },
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        family: 4,
        maxPoolSize: 1
      }).asPromise();

      console.log("✅ CONEXÃO ESTABELECIDA!");

      // ... lógica de upload do GridFS aqui ...
      conn.close();
      res.status(200).send("Sucesso total no diagnóstico!");

    } catch (err: any) {
      console.error("❌ FALHA NO DIAGNÓSTICO:");
      console.error("Mensagem:", err.message);
      console.error("Stack:", err.stack);
      
      // Se der erro 530 aqui, o problema é o Proxy do ambiente.
      // Se der Timeout, o problema é o Firewall do Google.
      res.status(500).send(`Erro de Diagnóstico: ${err.message}`);
    }
  });
}