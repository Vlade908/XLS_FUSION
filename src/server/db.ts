import { PrismaClient } from '@prisma/client';
import { configureDatabase } from './db-config.js';

// Configura DATABASE_PROVIDER e DATABASE_URL automaticamente
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
  const prisma = getPrisma();

  try {
    // Testa a conexão
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDB() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
