# XLS_FUSION 🚀

Plataforma full-stack para construção e distribuição de **formulários inteligentes** com lógica condicional, controle de acesso por e-mail/domínio e compartilhamento via link direto.

Desenvolvida com **React + TypeScript + Vite** no frontend e **Node.js + Express + MongoDB** no backend, seguindo a arquitetura **MVC** e integrada com **Prisma & Mongoose**.

---

## ✨ Funcionalidades

- 🔐 **Autenticação JWT** — registro, login e sessão persistente (com suporte a login automatizado em testes)
- 📋 **Construtor de Formulários** — criação visual com múltiplos tipos de questão
- 🧠 **Lógica Condicional** — questões que aparecem/somem baseadas em respostas anteriores
- 🌐 **Tela de Resposta Pública** — link compartilhável sem necessidade de login
- 👥 **Controle de Acesso** — restrição por e-mail ou domínio corporativo
- 📬 **Pedidos de Acesso** — workflow de solicitação e aprovação entre usuários
- 📁 **Upload de Arquivos** — armazenamento no MongoDB via GridFS com visualização detalhada do arquivo selecionado e opção de remoção direta na interface

---

## 🛠️ Setup do Zero

### Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 18+ |
| Git | qualquer |
| Docker / Docker Compose | Para o banco local |

### Passo 1 — Clone
```bash
git clone https://github.com/SEU_USUARIO/XLS_FUSION.git
cd XLS_FUSION
```

### Passo 2 — Instale as dependências
```bash
npm install
```

### Passo 3 — Inicialize o Banco de Dados (MongoDB)
Você pode rodar uma instância local do MongoDB rapidamente utilizando o Docker:
```bash
docker run -d --name mongo-local -p 27017:27017 mongo:7.0
```

### Passo 4 — Configure o ambiente
Crie um arquivo `.env` na raiz do projeto (copiando do `.env.example`):
```bash
cp .env.example .env
```
O conteúdo deve apontar para o banco de dados configurado:
```env
# Porta do Backend (padrão: 8080)
PORT=8080

# Conexão MongoDB para desenvolvimento local
MONGO_URI=mongodb://localhost:27017/xls_fusion
DATABASE_URL=mongodb://localhost:27017/xls_fusion

# Segredo JWT — use uma string longa e aleatória
JWT_SECRET=super_secret_for_local_development_xls_fusion
NODE_ENV=development
DOCKER_CONTAINER=false
```

### Passo 5 — Sincronize o Prisma
Gere o cliente do Prisma e sincronize a estrutura com o seu banco local:
```bash
npx prisma generate
npx prisma db push
```

### Passo 6 — Inicie a aplicação
```bash
npm run dev
```

| Serviço | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (API + Estáticos) | http://localhost:8080 |

---

## 🧪 Suíte de Testes

A plataforma possui uma suíte completa de testes unitários, de integração e End-to-End (E2E).

### 1. Testes Unitários e Integração (Jest)
Testam regras de negócio, componentes visuais e endpoints de API com mocks de banco de dados.
```bash
# Executa todos os testes unitários e de integração
npm run test
```

### 2. Testes End-to-End (Playwright)
Testam o fluxo completo do usuário no navegador de forma automatizada.
Os testes E2E estão configurados para **criar automaticamente um usuário único e autenticar-se** em paralelo para evitar conflitos de banco.
```bash
# Executa testes E2E (Chromium, Firefox e WebKit)
npm run test:e2e
```

---

## 📜 Scripts Disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia frontend + backend simultaneamente em desenvolvimento |
| `npm run server` | Inicia apenas o backend (com hot-reload via tsx watch) |
| `npm run build` | Compila TypeScript e gera o bundle de produção em `/dist` |
| `npm run typecheck` | Valida tipagem TypeScript sem compilar |
| `npm run lint` | Analisa o código com ESLint |
| `npx prisma studio` | Abre o Prisma Studio (visualizador de dados do banco) |

---

## 🗂️ Estrutura do Projeto

```
XLS_FUSION/
├── src/
├── components/                # Componentes visuais reutilizáveis
│   │   ├── AuthView.tsx
│   │   ├── FileCard.tsx           # Card de upload com preview e delete
│   │   ├── FileUpload.tsx
│   │   ├── AuditorUpload.tsx
│   │   ├── AssignmentRules.tsx
│   │   └── PreFlightModal.tsx
│   │
│   ├── views/                     # Páginas do frontend
│   │   ├── FormBuilderView.tsx    # Construtor de formulários (principal)
│   │   ├── WebResponderView.tsx   # Tela pública de resposta (sem login)
│   │   ├── ResponderView.tsx      # Central de Respostas (respostas online/edicao e planilha offline)
│   │   ├── NotificationsView.tsx  # Notificações e pedidos de acesso
│   │   └── ...
│   │
│   └── server/                    # Backend (Express + Mongoose + Prisma)
├── prisma/
│   └── schema.prisma              # Schema do Prisma
├── tests/
│   ├── unit/                      # Testes unitários Jest
│   ├── integration/               # Testes de integração de API
│   └── e2e/                       # Testes de navegador Playwright
```

---

## ⚠️ Atenção: Processo Zumbi no Windows

Ao pressionar `Ctrl+C` no terminal, o Node.js do backend pode continuar rodando em segundo plano. Se ao reiniciar o servidor aparecer erros de "porta já em uso", execute no PowerShell:

```powershell
# Verificar qual processo está na porta 8080
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess

# Encerrar pelo PID encontrado
Stop-Process -Id <PID> -Force
```
