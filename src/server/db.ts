import mongoose from 'mongoose';

// Detecta se está rodando em Docker ou localmente
const isDocker = process.env.DOCKER_CONTAINER === 'true' || process.env.NODE_ENV === 'production';

const MONGO_URI = process.env.MONGO_URI ||
  (isDocker
    ? 'mongodb://root:example@mongo:27017/xls_fusion?authSource=admin'
    : 'mongodb://localhost:27017/xls_fusion'
  );

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', false);

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    const sanitizedUri = MONGO_URI.replace(/(mongodb:\/\/)(.*@)/, '$1***:***@');
    console.log(`✅ MongoDB connected (${sanitizedUri})`);

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);

    // Se falhou e estamos em desenvolvimento, tenta localhost como fallback
    if (!isDocker && MONGO_URI.includes('mongo:')) {
      console.log('🔄 Trying localhost fallback...');
      const fallbackUri = 'mongodb://localhost:27017/xls_fusion';

      try {
        await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB connected to localhost (${fallbackUri})`);
        return mongoose.connection;
      } catch (fallbackError) {
        console.error('❌ Fallback connection also failed:', fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}
