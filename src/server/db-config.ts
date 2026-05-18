
/**
 * Configura automaticamente DATABASE_URL baseado em MONGO_URI
 * Se MONGO_URI está vazio → usa MongoDB local (padrão)
 * Se MONGO_URI está preenchido e é um cluster Atlas → será usado o MongoDB Atlas
 */
export function configureDatabase() {
  const mongoUri = process.env.MONGO_URI || '';

  // Verifica se o MONGO_URI parece ser um URI válido do Atlas ou MongoDB
  const isMongoDb = mongoUri && mongoUri.trim() !== '' && mongoUri.startsWith('mongodb');

  if (isMongoDb) {
    // Usuário definiu MONGO_URI
    process.env.DATABASE_URL = mongoUri;
    console.log('🌐 Usando MongoDB configurado (MONGO_URI definido)');
  } else {
    // Usar MongoDB local (padrão do Prisma e Docker)
    const localUri = 'mongodb://127.0.0.1:27017/xls_fusion';
    process.env.DATABASE_URL = localUri;
    process.env.MONGO_URI = localUri;
    console.log('📦 Usando MongoDB Local (MONGO_URI vazio ou inválido)');
  }
}
