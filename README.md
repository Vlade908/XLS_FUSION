# XLS_FUSION 🚀

Plataforma full-stack para construção e distribuição de **formulários inteligentes** com lógica condicional, controle de acesso por e-mail/domínio e compartilhamento via link direto.

Desenvolvida com **React + TypeScript + Vite** no frontend e **Node.js + Express + MongoDB** no backend, seguindo a arquitetura **MVC**.

---

## ✨ Funcionalidades

- 🔐 **Autenticação JWT** — registro, login e sessão persistente
- 📋 **Construtor de Formulários** — criação visual com múltiplos tipos de questão
- 🧠 **Lógica Condicional** — questões que aparecem/somem baseadas em respostas anteriores
- 🌐 **Tela de Resposta Pública** — link compartilhável sem necessidade de login
- 👥 **Controle de Acesso** — restrição por e-mail ou domínio corporativo
- 📬 **Pedidos de Acesso** — workflow de solicitação e aprovação entre usuários
- 📁 **Upload de Arquivos** — armazenamento no MongoDB via GridFS

---

## 🛠️ Setup do Zero

### Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 18+ |
| Git | qualquer |
| MongoDB Atlas | conta gratuita ou instância local na `27017` |

### Passo 1 — Clone
```bash
git clone https://github.com/SEU_USUARIO/XLS_FUSION.git
cd XLS_FUSION
```

### Passo 2 — Instale as dependências
```bash
npm install
```

### Passo 3 — Configure o ambiente

Crie um arquivo `.env` na raiz do projeto:
```env
# Porta do Backend (padrão: 8080)
PORT=8080

# Connection String do MongoDB Atlas (ou local)
MONGO_URI=mongodb+srv://<usuario>:<senha>@cluster0.exemplo.mongodb.net/xls_fusion?retryWrites=true&w=majority

# Mesma URI para o Prisma
DATABASE_URL=mongodb+srv://<usuario>:<senha>@cluster0.exemplo.mongodb.net/xls_fusion?retryWrites=true&w=majority

# Segredo JWT — use uma string longa e aleatória
JWT_SECRET=sua_chave_secreta_super_segura_aqui
```

> Você pode copiar o arquivo `.env.example` como ponto de partida: `cp .env.example .env`

### Passo 4 — Sincronize o Prisma
```bash
npx prisma generate
npx prisma db push
```

### Passo 5 — Inicie a aplicação
```bash
npm run dev
```

| Serviço | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (API) | http://localhost:8080 |

---

## 📜 Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia frontend + backend simultaneamente |
| `npm run server` | Inicia apenas o backend (com hot-reload via tsx watch) |
| `npm run build` | Compila TypeScript e gera o bundle de produção |
| `npm run typecheck` | Valida tipagem TypeScript sem compilar |
| `npm run lint` | Analisa o código com ESLint |
| `npx prisma studio` | Abre o Prisma Studio (visualizador de dados) |

---

## 🗂️ Estrutura do Projeto

```
XLS_FUSION/
├── src/
│   ├── App.tsx                    # Roteamento principal do frontend
│   ├── main.tsx                   # Entry point React
│   ├── index.css                  # Estilos globais
│   │
│   ├── components/                # Componentes visuais reutilizáveis
│   │   ├── AuthView.tsx
│   │   ├── FileCard.tsx
│   │   ├── FileUpload.tsx
│   │   ├── AuditorUpload.tsx
│   │   ├── AssignmentRules.tsx
│   │   └── PreFlightModal.tsx
│   │
│   ├── views/                     # Páginas completas do frontend
│   │   ├── FormBuilderView.tsx    # Construtor de formulários
│   │   ├── WebResponderView.tsx   # Tela pública de resposta
│   │   ├── ResponderView.tsx      # Tela de resposta interna
│   │   ├── PreparationView.tsx
│   │   ├── FiltrosView.tsx
│   │   ├── ConsolidationView.tsx
│   │   ├── NotificationsView.tsx
│   │   └── ShareView.tsx
│   │
│   ├── context/                   # Context API (AuthContext)
│   ├── utils/                     # Funções utilitárias
│   │
│   └── server/                    # Backend (MVC)
│       ├── index.ts               # Entry point Express
│       ├── routes.ts              # Mapa de rotas (sem lógica)
│       ├── auth.ts                # JWT + bcrypt
│       ├── db.ts                  # Conexão MongoDB + Prisma
│       ├── db-config.ts           # Configuração de variáveis
│       ├── gridfs.ts              # Multer + GridFS
│       ├── types.d.ts             # Tipagens globais Express
│       │
│       ├── models/
│       │   └── index.ts           # Todos os Schemas Mongoose
│       │
│       ├── middleware/
│       │   └── authMiddleware.ts  # requireAuth (JWT guard)
│       │
│       └── controllers/
│           ├── authController.ts       # signup, login, me
│           ├── formController.ts       # CRUD formulários + acessos
│           ├── publicFormController.ts # Rota pública + respostas
│           └── fileController.ts       # Upload + compartilhamento
│
├── prisma/
│   └── schema.prisma              # Schema do banco de dados
├── .env.example                   # Modelo de variáveis de ambiente
├── README.md                      # Este arquivo
├── BACKEND.md                     # Documentação do backend e rotas
├── API.md                         # Referência completa da API REST
├── DATABASE.md                    # Guia de configuração do banco
└── DEVELOPMENT.md                 # Guia de desenvolvimento e arquitetura
```

---

## ⚠️ Atenção: Processo Zumbi no Windows

Ao pressionar `Ctrl+C` no terminal, o Node.js do backend pode continuar rodando em segundo plano. Se ao reiniciar o servidor aparecer erros de "porta já em uso" ou as novas rotas não funcionarem:

```powershell
# Verificar qual processo está na porta 8080
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess

# Encerrar pelo PID encontrado acima
Stop-Process -Id <PID> -Force
```

Depois disso, rode `npm run dev` normalmente.
