# Configuração do Banco de Dados 🗄️

O **XLS_FUSION** utiliza **MongoDB** como banco de dados principal, acessado por duas bibliotecas em paralelo:

| Biblioteca | Papel |
|---|---|
| **Mongoose** | ORM principal — schemas, models e queries |
| **Prisma** | Geração de tipos TypeScript e utilitário de studio |

---

## Opções de Banco

### ☁️ MongoDB Atlas (Recomendado — Produção e Desenvolvimento)

1. Crie uma conta em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster gratuito (M0)
3. Crie um usuário de banco de dados com senha
4. Em **Network Access**, libere o IP `0.0.0.0/0` (ou o IP específico da sua máquina)
5. Copie a **Connection String** no formato:
   ```
   mongodb+srv://<usuario>:<senha>@cluster0.exemplo.mongodb.net/xls_fusion?retryWrites=true&w=majority
   ```
6. Cole no `.env`:
   ```env
   MONGO_URI=mongodb+srv://...
   DATABASE_URL=mongodb+srv://...
   ```

---

### 🏠 MongoDB Local (Desenvolvimento rápido)

Se você tiver o MongoDB instalado localmente ou via Docker:

```env
MONGO_URI=mongodb://localhost:27017/xls_fusion
DATABASE_URL=mongodb://localhost:27017/xls_fusion
```

**Via Docker (sem instalar MongoDB):**
```bash
docker run -d --name mongo-local -p 27017:27017 mongo:7.0
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGO_URI` | ✅ Sim | URI completa de conexão com o MongoDB |
| `DATABASE_URL` | ✅ Sim | Mesma URI — usada pelo Prisma |
| `JWT_SECRET` | ✅ Sim | Segredo para assinar tokens JWT |
| `PORT` | ❌ Não | Porta do backend (padrão: `8080`) |

---

## Collections Criadas Automaticamente

O Mongoose cria as collections no primeiro uso, não é necessário nenhum passo de migração manual:

| Collection | Model | Descrição |
|---|---|---|
| `users` | `UserModel` | Usuários registrados |
| `forms` | `FormModel` | Formulários com questões |
| `accessrequests` | `AccessRequestModel` | Pedidos de acesso |
| `responses` | `ResponseModel` | Respostas de formulários públicos |
| `sharedspreadsheets` | `SharedSpreadsheetModel` | Links de planilhas compartilhadas |
| `uploads.files` | GridFS | Metadados de arquivos enviados |
| `uploads.chunks` | GridFS | Dados binários dos arquivos |

---

## Comandos Úteis

```bash
# Sincronizar schema do Prisma com o banco
npx prisma db push

# Gerar tipos TypeScript do Prisma
npx prisma generate

# Abrir o Prisma Studio (UI visual para navegar nos dados)
npx prisma studio
```

---

## Troubleshooting

### `MongoServerSelectionError: connection timed out`
- Verifique se o IP da sua máquina está liberado no MongoDB Atlas (Network Access)
- Se local, verifique se o MongoDB está rodando: `Get-Process mongod` (Windows) ou `ps aux | grep mongod` (Linux/Mac)

### `Authentication failed`
- Usuário ou senha incorretos na connection string
- Tente recriar o usuário no painel do Atlas

### `Unrecognized BSON field`
- Versão do driver incompatível — execute `npm install` para garantir as versões do `package.json`

### Processo na porta 8080 já em uso (Windows)
```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```
