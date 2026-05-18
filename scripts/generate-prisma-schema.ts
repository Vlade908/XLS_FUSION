import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gera o schema.prisma dinamicamente baseado em MONGO_URI
 * Se MONGO_URI está preenchido → MongoDB
 * Senão → SQLite
 */
export function generatePrismaSchema() {
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
  const provider = isMongoDb ? 'mongodb' : 'sqlite';

  const schema = `// Prisma schema for XLS_FUSION
// Este arquivo é gerado automaticamente baseado em MONGO_URI

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = ${isMongoDb ? `"${mongoUri}"` : '"file:./prisma/dev.db"'}
}

// User model
model User {
  id        String     @id @default(${isMongoDb ? 'auto' : 'cuid()'})
  ${isMongoDb ? '  _id       String     @map("_id")' : ''}
  email     String     @unique
  password  String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  // Relacionamentos
  uploads   Upload[]
  shares    Share[]
  forms     Form[]
}

// Upload model para rastrear uploads de arquivos
model Upload {
  id        String   @id @default(${isMongoDb ? 'auto' : 'cuid()'})
  ${isMongoDb ? '  _id       String     @map("_id")' : ''}
  filename  String
  fileSize  Int
  mimeType  String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

// Share model para compartilhamentos de spreadsheets
model Share {
  id        String   @id @default(${isMongoDb ? 'auto' : 'cuid()'})
  ${isMongoDb ? '  _id       String     @map("_id")' : ''}
  shareCode String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  data      String   // JSON serializado do spreadsheet
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime?

  @@index([userId])
  @@index([shareCode])
}

// Form model para formulários personalizados
model Form {
  id        String   @id @default(${isMongoDb ? 'auto' : 'cuid()'})
  ${isMongoDb ? '  _id       String     @map("_id")' : ''}
  name      String
  schema    String   // JSON schema do formulário
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
`;

  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  fs.writeFileSync(schemaPath, schema, 'utf8');

  console.log(`✅ Generated prisma/schema.prisma for ${provider}`);
  
  // Configura as variáveis de ambiente
  process.env.DATABASE_PROVIDER = provider;
  process.env.DATABASE_URL = isMongoDb ? mongoUri : 'file:./prisma/dev.db';
}
