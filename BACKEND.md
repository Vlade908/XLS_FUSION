# Documentação do Backend 🖥️

O Backend do **XLS_FUSION** foi desenvolvido utilizando Node.js e Express, operando fortemente com o banco de dados MongoDB via `Mongoose`. A API gerencia desde autenticação até a lógica robusta de manipulação e compartilhamento de formulários.

## Arquitetura Resumida
A pasta principal do servidor é `src/server/`.
* **`index.ts`**: Ponto de entrada, configura o Express, cors, body-parser e inicia as rotas. Serve os arquivos do React em produção.
* **`db.ts`**: Inicializa a conexão com o MongoDB Atlas via `Mongoose` e `PrismaClient`.
* **`models.ts`**: Declara todos os schemas dinâmicos e estritos utilizados pelo sistema (`FormModel`, `UserModel`, `ResponseModel`, etc).
* **`auth.ts`**: Contém funções de validação de senhas, JWT (Criação e verificação de tokens).
* **`routes.ts`**: Centraliza todas as rotas da API REST do sistema.

---

## 📍 Mapeamento das Rotas (`routes.ts`)

As requisições que modificam ou consultam dados fechados utilizam o middleware `requireAuth`, que intercepta a requisição, checa a validade do Token JWT no cabeçalho (Bearer Token) e injeta os dados do usuário em `req.user`.

### 1. Autenticação e Usuário
- **`POST /api/signup`**: Registra um novo usuário no sistema. Criptografa a senha com `bcrypt` e gera um Token JWT inicial.
- **`POST /api/login`**: Realiza o login, retornando um JWT para o frontend.
- **`GET /api/me`**: Retorna os detalhes básicos do usuário logado baseado em seu token.

### 2. Gestão de Formulários Privados
- **`GET /api/forms`**: Lista todos os formulários aos quais o usuário logado possui acesso. Verifica se ele é o Dono (`ownerEmail`), se o seu e-mail está na lista de permissões (`allowedEmails`), ou se o domínio da sua empresa está na lista (`allowedDomains`).
- **`POST /api/forms`**: Cria um novo formulário OU edita um formulário existente (se passado o `_id`). Apenas o dono pode editar as questões e restrições.

### 3. Requisições de Acesso
Quando o formulário é restrito, os convidados podem "Pedir acesso" a ele:
- **`POST /api/forms/:formId/request-access`**: O usuário logado solicita permissão ao dono do formulário. Um pedido fica salvo no banco como `pending`.
- **`GET /api/access-requests`**: O dono lista todos os pedidos de acesso aos seus formulários.
- **`POST /api/forms/:formId/requests/:requestId/:action`**: O dono aprova (`approve`) ou nega (`deny`) o pedido. Se aprovado, o e-mail do solicitante é inserido na Array `allowedEmails` do formulário.

### 4. Formulários Públicos (Sem Autenticação Exigida)
Rotas utilizadas pela Tela de Responder (`WebResponderView`), rodando isoladas para garantir acesso público.
- **`GET /api/public-forms/:id`**: Retorna a estrutura das perguntas de um formulário pelo `id`. Não revela detalhes sigilosos, como os arrays de permissão, caso o formulário não possua segurança.
- **`POST /api/public-forms/:id/responses`**: Recebe e processa as respostas. Antes de salvar as respostas (`ResponseModel`), a rota valida por segurança se o e-mail preenchido (`responderEmail`) é válido para responder o formulário (caso tenha restrição de acesso por E-mail/Domínio).

### 5. Legado: Planilhas e Documentos
Essas rotas manipulam envios de arquivos pelo `GridFS` (salvando arquivos fragmentados diretos no MongoDB, e não no disco local).
- **`POST /api/upload-planilha`** e **`POST /api/upload-anexo`**: (Requerem Auth) Utilizam `multer` adaptado ao `GridFS` para armazenar PDFs, Imagens e Excel.
- **`POST /api/share-spreadsheet`**: Cria um hash curto compartilhável para uma planilha específica.
- **`GET /api/share/:hash`**: Consulta dados públicos sobre a planilha compartilhada.
- **`GET /api/share/:hash/download`**: Faz o "Stream" (Download) seguro do arquivo vindo direto das entranhas do MongoDB GridFS para a máquina do usuário final.
