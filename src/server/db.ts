import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import dns from 'dns';
import { configureDatabase } from './db-config';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}
// Configura DATABASE_URL e MONGO_URI automaticamente
configureDatabase();

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  return prismaInstance;
}

export async function connectDB() {
  const usePrisma = process.env.USE_PRISMA !== 'false';

  try {
    if (usePrisma) {
      // 1. Conecta o Prisma
      const prisma = getPrisma();
      await prisma.$connect();
      console.log('⬡ Conectado ao Prisma com sucesso!');
    } else {
      console.log('⬡ Prisma está desabilitado.');
    }
    
    // 2. Conecta o Mongoose
    const mongoUri = (process.env.MONGO_URI || process.env.DATABASE_URL) as string;
    await mongoose.connect(mongoUri, { family: 4 });
    console.log(`✅ Conectado ao MongoDB com sucesso (Mongoose${usePrisma ? ' & Prisma' : ''})!`);
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    throw error;
  }
}

export async function disconnectDB() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
