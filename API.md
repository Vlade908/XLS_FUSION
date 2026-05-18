# Referência Completa da API REST 📡

Base URL (desenvolvimento):
```
http://localhost:8080/api
```

Rotas marcadas com 🔐 exigem o header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Sistema de Saúde

### `GET /api/health`
Verifica se o servidor está online.

**Resposta `200`:**
```
OK
```

---

## 2. Autenticação

### `POST /api/signup`
Registra um novo usuário.

**Body:**
```json
{ "email": "usuario@empresa.com", "password": "minhasenha123" }
```

**Resposta `201`:**
```json
{
  "token": "eyJhbGci...",
  "user": { "email": "usuario@empresa.com" }
}
```

**Erros:** `400` campos ausentes | `409` e-mail já cadastrado

---

### `POST /api/login`
Autentica um usuário existente.

**Body:**
```json
{ "email": "usuario@empresa.com", "password": "minhasenha123" }
```

**Resposta `200`:**
```json
{
  "token": "eyJhbGci...",
  "user": { "email": "usuario@empresa.com" }
}
```

**Erros:** `400` campos ausentes | `401` credenciais inválidas

---

### `GET /api/me` 🔐
Retorna os dados do usuário autenticado.

**Resposta `200`:**
```json
{ "user": { "email": "usuario@empresa.com" } }
```

---

## 3. Formulários

### `GET /api/forms` 🔐
Lista todos os formulários acessíveis ao usuário logado (proprietário, e-mail autorizado ou domínio autorizado).

**Resposta `200`:**
```json
[
  {
    "_id": "6a0b2ff465019a9fb55a81a4",
    "name": "Formulário de Auditoria",
    "title": "Auditoria Q1 2026",
    "description": "Coleta de dados do primeiro trimestre",
    "ownerEmail": "admin@empresa.com",
    "allowedEmails": ["auditor@empresa.com"],
    "allowedDomains": ["empresa.com"],
    "questions": [...],
    "isOwner": true,
    "hasAccess": true
  }
]
```

---

### `POST /api/forms` 🔐
Cria um novo formulário ou atualiza um existente (se `_id` for enviado).

**Body (criação):**
```json
{
  "name": "Meu Formulário",
  "title": "Título exibido",
  "description": "Descrição do formulário",
  "questions": [
    {
      "id": "uuid-gerado-no-frontend",
      "label": "A empresa possui CNPJ ativo?",
      "type": "simnao",
      "options": [],
      "parentId": null,
      "showWhenValue": ""
    }
  ],
  "allowedEmails": ["auditor@empresa.com"],
  "allowedDomains": ["empresa.com"]
}
```

**Body (atualização — inclua `_id`):**
```json
{ "_id": "6a0b2ff465019a9fb55a81a4", "name": "Nome atualizado", ... }
```

**Respostas:** `201` criado | `200` atualizado | `403` não é o dono | `404` não encontrado

---

## 4. Formulários Públicos (sem autenticação)

### `GET /api/public-forms/:id`
Retorna a estrutura de um formulário para o respondente público.

**Resposta `200`:**
```json
{
  "_id": "6a0b2ff465019a9fb55a81a4",
  "name": "Formulário de Auditoria",
  "title": "Auditoria Q1 2026",
  "description": "...",
  "questions": [...],
  "allowedEmails": [...],
  "allowedDomains": [...],
  "ownerEmail": "admin@empresa.com"
}
```

**Erros:** `404` formulário não encontrado

---

### `POST /api/public-forms/:id/responses`
Envia as respostas de um formulário público.

**Body:**
```json
{
  "responderEmail": "respondente@empresa.com",
  "data": {
    "uuid-da-questao-1": "Sim",
    "uuid-da-questao-2": "Resposta escrita aqui",
    "uuid-da-questao-3": ["Opção A", "Opção C"]
  }
}
```

**Respostas:** `201` enviado | `400` e-mail ausente | `403` e-mail não autorizado | `404` formulário não encontrado

---

## 5. Pedidos de Acesso

### `POST /api/forms/:formId/request-access` 🔐
Solicita acesso a um formulário restrito.

**Body:**
```json
{ "message": "Preciso acessar para a auditoria do setor X" }
```

**Respostas:** `201` pedido criado | `200` já tem acesso | `409` pedido pendente já existe

---

### `GET /api/access-requests` 🔐
Lista todos os pedidos de acesso pendentes para os formulários do usuário logado.

**Resposta `200`:**
```json
[
  {
    "_id": "...",
    "formId": "...",
    "formName": "Formulário de Auditoria",
    "requesterEmail": "auditor@empresa.com",
    "status": "pending",
    "message": "Preciso acessar...",
    "createdAt": "2026-05-18T..."
  }
]
```

---

### `POST /api/forms/:formId/requests/:requestId/:action` 🔐
Aprova ou nega um pedido de acesso. `:action` deve ser `approve` ou `deny`.

**Resposta `200`:**
```json
{ "message": "Pedido aprovado com sucesso." }
```

**Erros:** `400` ação inválida | `403` não é o dono do formulário | `404` pedido não encontrado

---

## 6. Upload de Arquivos

### `POST /api/upload-planilha` 🔐
Faz upload de uma planilha Excel para o GridFS.

**Content-Type:** `multipart/form-data`  
**Campo:** `file` (arquivo Excel)

**Resposta `201`:**
```json
{
  "message": "Planilha salva!",
  "file": { "id": "...", "filename": "...", "originalname": "...", "mimetype": "...", "size": 12345 }
}
```

---

### `POST /api/upload-anexo` 🔐
Faz upload de um anexo (PDF, imagem, etc.) vinculado a uma questão.

**Content-Type:** `multipart/form-data`  
**Campos:** `file`, `responder`, `questionNumber`, `formName`

---

## 7. Compartilhamento de Planilhas (Legado)

### `POST /api/share-spreadsheet` 🔐
Gera um hash único de compartilhamento para uma planilha já enviada.

**Body:**
```json
{ "fileId": "gridfs-object-id", "originalname": "relatorio.xlsx", "description": "Relatório Q1" }
```

**Resposta `201`:**
```json
{ "hash": "abc123xyz", "shareUrl": "http://localhost:5173/share/abc123xyz" }
```

---

### `GET /api/share/:hash`
Retorna metadados de uma planilha compartilhada.

### `GET /api/share/:hash/download`
Faz download (stream) do arquivo diretamente do GridFS.

---

## Tipos de Questão

| Tipo | Descrição | `options` |
|---|---|---|
| `simnao` | Sim / Não | `[]` |
| `alternativa` | Rádio — uma opção | `["Op A", "Op B"]` |
| `check` | Checkbox — múltiplas opções | `["Op A", "Op B"]` |
| `respostaescrita` | Textarea livre | `[]` |
| `data` | Seletor de data | `[]` |
| `link` | Campo de URL | `[]` |

## Lógica Condicional
Para criar uma questão dependente, preencha no objeto da questão:
- `parentId`: ID UUID da questão pai
- `showWhenValue`: Valor exato que a questão pai deve ter para esta questão aparecer

Exemplo: questão que só aparece se a resposta da questão pai for `"Sim"`:
```json
{ "parentId": "uuid-da-questao-pai", "showWhenValue": "Sim" }
```