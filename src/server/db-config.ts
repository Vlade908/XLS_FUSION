import fs from 'fs';
import path from 'path';

/**
 * Configura automaticamente DATABASE_PROVIDER baseado em MONGO_URI
 * Se MONGO_URI está vazio → SQLite local (padrão)
 * Se MONGO_URI está preenchido → será necessário regenerar o schema com MongoDB
 */
export function configureDatabase() {
  const envPath = path.resolve(process.cwd(), '.env');

  let mongoUri = '';
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^\s*MONGO_URI\s*=\s*(.+?)\s*$/m);
    mongoUri = match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    // Continue com valor padrão
  }

  const isMongoDb = mongoUri && mongoUri.trim() !== '';

  if (isMongoDb) {
    // Usuário definiu MONGO_URI - vamos usar MongoDB
    process.env.DATABASE_PROVIDER = 'mongodb';
    process.env.DATABASE_URL = mongoUri;
    console.log('🌐 Usando MongoDB Atlas (MONGO_URI definido)');
  } else {
    // Usar SQLite local (padrão)
    process.env.DATABASE_PROVIDER = 'sqlite';
    process.env.DATABASE_URL = 'file:./prisma/dev.db';
    console.log('📦 Usando SQLite local (MONGO_URI vazio)');
  }
}

