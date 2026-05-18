# Documentação do Backend 🖥️

O backend do **XLS_FUSION** é uma API REST construída em **Node.js + Express + TypeScript**, seguindo o padrão de arquitetura **MVC** (Model-View-Controller). Toda a persistência de dados é feita no **MongoDB** via **Mongoose**, com suporte auxiliar ao **Prisma**.

---

## Arquitetura MVC

```
src/server/
├── index.ts               ← Entry point: configura Express, middlewares globais e inicia o servidor
├── routes.ts              ← Roteador (mapa limpo, sem lógica de negócio)
├── auth.ts                ← Utilitários: hash de senha (bcrypt) e JWT (assinar/verificar)
├── db.ts                  ← Inicializa Mongoose e PrismaClient
├── db-config.ts           ← Lê e valida variáveis de ambiente (MONGO_URI, DATABASE_URL)
├── gridfs.ts              ← Configura Multer + GridFS para upload de arquivos no MongoDB
├── types.d.ts             ← Extensão de tipos globais do Express (req.user)
│
├── models/
│   └── index.ts           ← M — Todos os Schemas e Models do Mongoose
│
├── middleware/
│   └── authMiddleware.ts  ← Guard de autenticação JWT (requireAuth)
│
└── controllers/
    ├── authController.ts       ← C — Lógica de autenticação
    ├── formController.ts       ← C — CRUD de formulários e pedidos de acesso
    ├── publicFormController.ts ← C — Formulários públicos e envio de respostas
    └── fileController.ts       ← C — Upload de arquivos e compartilhamento de planilhas
```

---

## Models (`src/server/models/index.ts`)

Todos os schemas do Mongoose estão centralizados neste arquivo:

| Model | Descrição |
|---|---|
| `UserModel` | Usuários registrados (email + passwordHash) |
| `FormModel` | Formulários com questões, permissões e configurações |
| `AccessRequestModel` | Pedidos de acesso a formulários restritos |
| `ResponseModel` | Respostas enviadas por respondentes públicos |
| `SharedSpreadsheetModel` | Links de compartilhamento de planilhas (legado) |

### Schema de Formulário (FormSchema)
```
FormModel
├── name          String (obrigatório)
├── title         String
├── description   String
├── ownerEmail    String (obrigatório)
├── questions     QuestionSchema[]
├── allowedEmails String[]
├── allowedDomains String[]
└── manual        Boolean
```

### Schema de Questão (QuestionSchema, embutido em FormModel)
```
QuestionSchema
├── id            String (obrigatório, UUID gerado no frontend)
├── label         String (obrigatório, texto da pergunta)
├── type          Enum: simnao | alternativa | respostaescrita | data | link | check
├── options       String[] (opções para tipos alternativa/check)
├── parentId      String | null (ID da questão pai para lógica condicional)
└── showWhenValue String (valor esperado na questão pai para exibir esta questão)
```

---

## Middleware (`src/server/middleware/authMiddleware.ts`)

### `requireAuth`
Intercepta todas as rotas protegidas. Extrai e valida o **Bearer Token JWT** do header `Authorization`. Se válido, injeta `req.user` com `{ userId, email }`. Caso contrário, retorna `401`.

---

## Controllers

### `authController.ts`

| Função | Método | Endpoint | Descrição |
|---|---|---|---|
| `signup` | POST | `/api/signup` | Cria novo usuário, hash bcrypt, retorna JWT |
| `login` | POST | `/api/login` | Valida credenciais, retorna JWT |
| `me` | GET | `/api/me` 🔐 | Retorna dados do usuário logado |

---

### `formController.ts`

| Função | Método | Endpoint | Descrição |
|---|---|---|---|
| `listForms` | GET | `/api/forms` 🔐 | Lista formulários acessíveis ao usuário logado |
| `saveForm` | POST | `/api/forms` 🔐 | Cria ou atualiza formulário (upsert por `_id`) |
| `requestAccess` | POST | `/api/forms/:formId/request-access` 🔐 | Solicita acesso a um formulário restrito |
| `listAccessRequests` | GET | `/api/access-requests` 🔐 | Lista pedidos pendentes para os formulários do dono |
| `handleAccessRequest` | POST | `/api/forms/:formId/requests/:requestId/:action` 🔐 | Aprova (`approve`) ou nega (`deny`) um pedido |

**Regras de negócio em `listForms`:**
O usuário tem acesso a um formulário se:
- É o `ownerEmail`, OU
- Seu e-mail está em `allowedEmails`, OU
- Seu domínio (`@empresa.com`) está em `allowedDomains`

---

### `publicFormController.ts`

Rotas **sem autenticação** — usadas pela tela pública de resposta (`/share-form/:id`).

| Função | Método | Endpoint | Descrição |
|---|---|---|---|
| `getPublicForm` | GET | `/api/public-forms/:id` | Retorna estrutura do formulário pelo ID |
| `submitPublicResponse` | POST | `/api/public-forms/:id/responses` | Recebe e salva respostas do respondente |

**Regras de segurança em `submitPublicResponse`:**
- Se o formulário tiver `allowedEmails` preenchido, valida se o `responderEmail` está autorizado antes de aceitar a resposta.
- Formulários sem restrição aceitam qualquer e-mail.

---

### `fileController.ts`

| Função | Método | Endpoint | Descrição |
|---|---|---|---|
| `uploadAnexo` | POST | `/api/upload-anexo` 🔐 | Upload de anexo vinculado a uma questão via GridFS |
| `uploadPlanilha` | POST | `/api/upload-planilha` 🔐 | Upload de planilha Excel via GridFS |
| `shareSpreadsheet` | POST | `/api/share-spreadsheet` 🔐 | Cria hash público para uma planilha existente |
| `getShareInfo` | GET | `/api/share/:hash` | Retorna metadados de uma planilha compartilhada |
| `downloadShare` | GET | `/api/share/:hash/download` | Faz stream do arquivo diretamente do GridFS |

---

## Rotas — Visão Geral (`routes.ts`)

```
GET    /api/health                                      → health check
POST   /api/signup                                      → authController.signup
POST   /api/login                                       → authController.login
GET    /api/me                              🔐          → authController.me

GET    /api/forms                           🔐          → formController.listForms
POST   /api/forms                           🔐          → formController.saveForm
POST   /api/forms/:formId/request-access    🔐          → formController.requestAccess
GET    /api/access-requests                 🔐          → formController.listAccessRequests
POST   /api/forms/:id/requests/:rid/:action 🔐          → formController.handleAccessRequest

GET    /api/public-forms/:id                            → publicFormController.getPublicForm
POST   /api/public-forms/:id/responses                  → publicFormController.submitPublicResponse

POST   /api/upload-anexo                    🔐 + multer → fileController.uploadAnexo
POST   /api/upload-planilha                 🔐 + multer → fileController.uploadPlanilha
POST   /api/share-spreadsheet               🔐          → fileController.shareSpreadsheet
GET    /api/share/:hash                                 → fileController.getShareInfo
GET    /api/share/:hash/download                        → fileController.downloadShare
```
> 🔐 = Requer Bearer Token JWT no header `Authorization`

---

## Segurança

- **JWT**: Tokens assinados com `JWT_SECRET`, validados no `authMiddleware` em cada rota protegida.
- **bcrypt**: Senhas são sempre armazenadas como hash, nunca em texto puro.
- **helmet**: Headers HTTP de segurança aplicados globalmente.
- **CORS**: Aceita requisições de qualquer origem em desenvolvimento (`origin: true`).
- **Sem exposição de dados**: A rota pública de formulários nunca expõe listas de e-mails autorizados.
