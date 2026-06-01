# Guia de Desenvolvimento 🛠️

Este documento descreve a arquitetura, convenções e fluxos de trabalho para contribuir com o **XLS_FUSION**.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS |
| Backend | Node.js + Express 5 + TypeScript |
| ORM | Mongoose (principal) + Prisma (tipos/studio) |
| Banco de Dados | MongoDB Atlas |
| Autenticação | JWT + bcrypt |
| Upload de Arquivos | Multer + GridFS (MongoDB) |
| Runtime | tsx watch (desenvolvimento) |
| Processos Paralelos | concurrently |

---

## Arquitetura MVC

O backend segue estritamente o padrão **MVC**:

```
Requisição HTTP
     │
     ▼
routes.ts          ← apenas declara qual Controller trata cada rota
     │
     ▼
middleware/        ← authMiddleware valida JWT antes de chegar no controller
     │
     ▼
controllers/       ← toda lógica de negócio fica aqui
     │
     ▼
models/index.ts    ← acesso ao banco via Mongoose
     │
     ▼
MongoDB Atlas
```

---

## Estrutura do Projeto

```
src/
├── App.tsx                     # Roteamento de views do frontend (hash-based)
├── main.tsx                    # Entry point React
├── index.css                   # Estilos globais (Tailwind @base)
│
├── components/                 # Componentes reutilizáveis
│   ├── AuthView.tsx            # Tela de login/registro
│   ├── FileCard.tsx            # Card de upload de arquivo
│   ├── FileUpload.tsx          # Input de upload estilizado
│   ├── AuditorUpload.tsx       # Upload de planilhas de auditoria
│   ├── AssignmentRules.tsx     # Regras de atribuição
│   └── PreFlightModal.tsx      # Modal de confirmação pré-envio
│
├── views/                      # Páginas completas
│   ├── FormBuilderView.tsx     # Construtor de formulários (principal)
│   ├── WebResponderView.tsx    # Tela pública de resposta (sem login)
│   ├── ResponderView.tsx       # Central de Respostas (respostas online/edição e planilha offline)
│   ├── NotificationsView.tsx   # Notificações e pedidos de acesso
│   └── ShareView.tsx           # Compartilhamento de planilhas (legado)
│
├── context/
│   └── AuthContext.tsx         # Contexto de autenticação global
│
├── utils/                      # Utilitários frontend
│   ├── excelLogic.tsx          # Processamento de arquivos Excel
│   └── documentProcessor.ts   # Processamento de documentos
│
└── server/                     # Backend
    ├── index.ts                # Entry point Express
    ├── routes.ts               # Mapa de rotas MVC
    ├── auth.ts                 # JWT + bcrypt
    ├── db.ts                   # Conexão MongoDB + Prisma
    ├── db-config.ts            # Configuração de variáveis de ambiente
    ├── gridfs.ts               # Multer + GridFS para uploads
    ├── types.d.ts              # Extensão de tipos Express
    │
    ├── models/
    │   └── index.ts            # Todos os Schemas Mongoose
    │
    ├── middleware/
    │   └── authMiddleware.ts   # requireAuth (JWT guard)
    │
    └── controllers/
        ├── authController.ts       # signup, login, me
        ├── formController.ts       # CRUD formulários + acessos
        ├── publicFormController.ts # Formulário público + respostas
        └── fileController.ts       # Upload e compartilhamento
```

---

## Roteamento do Frontend

O frontend usa **hash-based routing** sem React Router:

```typescript
// App.tsx detecta:
// /#builder       → FormBuilderView
// /#responder     → ResponderView
// /#notifications → NotificationsView
// /share-form/:id → WebResponderView (URL limpa, sem hash)
```

A rota `/share-form/:id` é especial: usa `pushState` ao invés de hash para gerar links limpos que possam ser compartilhados externamente.

---

## Fluxo de Criação e Compartilhamento de Formulário

```
1. Usuário cria formulário em FormBuilderView
         ↓
2. POST /api/forms → salvo no MongoDB com _id gerado
         ↓
3. Usuário clica em "Compartilhar" no card do formulário
         ↓
4. Link gerado: http://localhost:5173/share-form/{_id}
         ↓
5. Respondente acessa o link → WebResponderView carrega
         ↓
6. GET /api/public-forms/{_id} → retorna estrutura do formulário
         ↓
7. Respondente preenche → POST /api/public-forms/{_id}/responses
         ↓
8. Resposta salva em ResponseModel no MongoDB
```

---

## Lógica Condicional de Questões

O sistema suporta dependências entre questões via `parentId` e `showWhenValue`:

```typescript
// Questão só aparece se a questão pai tiver valor específico
const isVisible = !question.parentId || 
  answers[question.parentId] === question.showWhenValue;
```

A mesma lógica funciona em:
- **FormBuilderView** (preview interativo)
- **WebResponderView** (resposta pública)
- **No envio**: apenas as questões visíveis têm suas respostas enviadas

---

## Convenções de Código

### Nomenclatura
- **Controllers**: camelCase, sufixo `Controller.ts` (ex: `authController.ts`)
- **Views**: PascalCase, sufixo `View.tsx` (ex: `FormBuilderView.tsx`)
- **Componentes**: PascalCase (ex: `FileCard.tsx`)
- **Funções de Controller**: camelCase descritivo (ex: `listForms`, `saveForm`, `handleAccessRequest`)

### Controllers
```typescript
// ✅ Correto — controller isolado com tipagem
export const meuController = async (req: Request, res: Response) => {
  try {
    // lógica aqui
  } catch (err: any) {
    console.error('❌ [NOME ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};
```

### Rotas
```typescript
// ✅ Correto — routes.ts é apenas mapa
app.get('/api/recurso', requireAuth, meuController);

// ❌ Errado — lógica dentro do routes.ts
app.get('/api/recurso', async (req, res) => { /* lógica */ });
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Exemplo |
|---|---|---|
| `MONGO_URI` | ✅ | `mongodb+srv://user:pass@cluster.net/db` |
| `DATABASE_URL` | ✅ | idem acima (para o Prisma) |
| `JWT_SECRET` | ✅ | `minha_chave_super_secreta_42chars` |
| `PORT` | ❌ | `8080` (padrão) |

---

## Scripts

```bash
npm run dev          # Frontend (Vite) + Backend (tsx watch) em paralelo
npm run server       # Apenas backend com hot-reload
npm run build        # Build de produção
npm run typecheck    # Validação TypeScript sem compilar
npm run lint         # ESLint
npx prisma studio    # UI visual para o banco de dados
npx prisma generate  # Regenerar tipos Prisma
npx prisma db push   # Sincronizar schema com o banco
```

---

## Troubleshooting

### Processo "zumbi" na porta 8080 (Windows)
Após `Ctrl+C`, o Node pode continuar em background. Identifique e encerre:
```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### Erro `Unexpected token '<'... is not valid JSON`
A API está retornando HTML em vez de JSON. Causas comuns:
- Servidor antigo ainda rodando (processo zumbi — veja acima)
- A rota `/api/...` não foi registrada — verifique se o backend reiniciou

### TypeScript errors após mover arquivos
Execute `npx tsc --noEmit` para ver erros. Atualize todos os caminhos de `import` para refletir a nova localização dos arquivos.

### `MongoServerSelectionError`
- Verifique `MONGO_URI` no `.env`
- Libere seu IP no MongoDB Atlas (Network Access → `0.0.0.0/0`)