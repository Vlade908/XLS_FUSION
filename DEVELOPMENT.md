# XLS Fusion - Guia de Desenvolvimento

## Visão Geral da Arquitetura

XLS Fusion é uma aplicação full-stack composta por:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript + MongoDB
- **Infraestrutura**: Docker + Docker Compose

## Estrutura do Projeto

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── FileCard.tsx    # Componente para upload de arquivos
│   ├── AuditorUpload.tsx
│   ├── AssignmentRules.tsx
│   ├── PreFlightModal.tsx
│   └── FileUpload.tsx
├── server/             # Backend Express
│   ├── index.ts        # Ponto de entrada do servidor
│   ├── routes.ts       # Definição das rotas da API
│   ├── gridfs.ts       # Configuração do GridFS
│   └── db.ts          # Conexão com MongoDB
├── utils/              # Utilitários
│   ├── excelLogic.tsx  # Lógica de processamento Excel
│   └── documentProcessor.ts
├── views/              # Páginas/Views da aplicação
│   ├── PreparationView.tsx
│   ├── FiltrosView.tsx
│   ├── ResponderView.tsx
│   └── ConsolidationView.tsx
├── App.tsx             # Componente principal
├── main.tsx            # Ponto de entrada React
└── index.css           # Estilos globais
```

## Fluxo de Dados

### 1. Preparação
```
Arquivo de Regras (.xlsx) → Processamento → Mapeamento Responsável ↔ Questão
Arquivo Formulário (.xlsx) → Aplicação de Cores → Download Formulário Colorido
```

### 2. Filtros
```
Planilha de Auditoria (.xlsx) → Upload → GridFS → Processamento → Confirmação
```

### 3. Responder
```
Planilha de Respostas (.xlsx) → Carregamento → Seleção Responsável → Navegação Questões → Salvamento
```

### 4. Consolidação
```
Planilha Base + Múltiplas Respostas → Agregação → Relatório Consolidado → Download
```

## Componentes Principais

### FileCard
Componente reutilizável para upload de arquivos com drag-and-drop.

**Props**:
```typescript
interface FileCardProps {
  title: string;
  subtitle: string;
  icon: string;
  file: File | FileList | null;
  onFileChange: (file: any) => void;
  multiple?: boolean;
  color: string;
}
```

### Excel Logic Utils
Funções utilitárias para processamento de Excel:

- `smartClean()`: Limpa strings do Excel
- `normID()`: Normaliza IDs de questões
- `hexToExcelColor()`: Converte cores hex para formato Excel
- `getContrastColor()`: Calcula cor de contraste
- `evaluateCheckbox()`: Avalia valores booleanos

## Gerenciamento de Estado

A aplicação usa estado local do React com os seguintes estados globais:

- `activeTab`: Aba atual da navegação
- `rulesFile`: Arquivo de regras carregado
- `senderFormFile`: Arquivo do formulário
- `baseFile`: Arquivo base para consolidação
- `employeeFiles`: Lista de arquivos de funcionários
- `workerColors`: Mapeamento de cores por responsável

## Processamento de Excel

### Leitura de Arquivos
```typescript
import * as XLSX from 'xlsx-js-style';

// Leitura com estilos preservados
const wb = XLSX.read(await file.arrayBuffer(), { cellStyles: true });

// Acesso a uma aba específica
const ws = wb.Sheets[wb.SheetNames[0]];

// Conversão para array de arrays
const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
```

### Escrita de Arquivos
```typescript
// Criação de nova planilha
const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.aoa_to_sheet(data);

// Aplicação de estilos
newWs['A1'].s = getBaseStyle('#334155', '#ffffff');

// Salvamento
XLSX.writeFile(newWb, 'output.xlsx');
```

## API Backend

### Estrutura das Rotas
```typescript
// server/routes.ts
export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), handler);
  app.post('/api/upload-anexo', upload.single('file'), handler);
  app.get('/api/health', handler);
}
```

### GridFS para Uploads
```typescript
// server/gridfs.ts
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    filename: `${Date.now()}-${file.originalname}`,
    bucketName: 'uploads'
  })
});
```

## Desenvolvimento Local

### Pré-requisitos
- Node.js 20+
- Docker (para MongoDB)
- Git

### Configuração
```bash
# Clone o repositório
git clone <repo>
cd xls_fusion

# Instale dependências
npm install

# Configure ambiente
cp .env.example .env

# Inicie MongoDB
docker run -d -p 27017:27017 mongo:7.0

# Execute em modo desenvolvimento
npm run dev
```

### Scripts Disponíveis
```json
{
  "dev": "concurrently \"npm run server\" \"vite\"",
  "server": "tsx src/server/index.ts",
  "build": "tsc && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit -p tsconfig.app.json"
}
```

## Testes

### Estrutura de Testes
```
tests/
├── unit/              # Testes unitários
├── integration/       # Testes de integração
└── e2e/              # Testes end-to-end
```

### Configuração do Jest
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
```

## Docker

### Desenvolvimento
```yaml
# docker-compose.dev.yml
version: '3.9'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - '8080:8080'
    environment:
      - NODE_ENV=development
```

### Produção
```yaml
# docker-compose.yml
version: '3.9'
services:
  app:
    build: .
    ports:
      - '8080:8080'
    depends_on:
      mongo:
        condition: service_healthy
  mongo:
    image: mongo:7.0
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
```

## Boas Práticas

### Frontend
- Use TypeScript para tipagem forte
- Mantenha componentes pequenos e reutilizáveis
- Use hooks customizados para lógica complexa
- Implemente loading states e error boundaries

### Backend
- Valide todas as entradas de usuário
- Use middleware para tratamento de erros
- Implemente logging adequado
- Mantenha endpoints RESTful

### Geral
- Escreva testes para funcionalidades críticas
- Documente APIs e componentes
- Use commits descritivos
- Mantenha dependências atualizadas

## Troubleshooting

### Problemas Comuns

1. **Erro de CORS**: Verifique configuração do CORS no backend
2. **Upload falha**: Verifique limites de tamanho e tipos MIME
3. **MongoDB não conecta**: Verifique MONGO_URI e status do container
4. **Build falha**: Verifique dependências e TypeScript errors

### Debug
```bash
# Logs do Docker
docker compose logs -f

# Debug do frontend
npm run dev -- --host 0.0.0.0

# Testes específicos
npm test -- --testNamePattern="upload"
```

## Contribuição

1. Crie uma branch para sua feature
2. Escreva testes para novas funcionalidades
3. Siga o padrão de commits
4. Abra PR com descrição detalhada