# XLS_FUSION — Visão Geral & Pontos de Melhoria 🚀

Este documento apresenta uma explicação geral do funcionamento do XLS_FUSION, seu ecossistema de funcionalidades e as recomendações técnicas de melhoria identificadas na arquitetura atual do sistema.

---

## 📋 O que a aplicação faz?

O **XLS_FUSION** é uma plataforma full-stack moderna para construção, gerenciamento e distribuição de **formulários inteligentes**.

### Principais Funcionalidades

1. **Autenticação Segura:**
   * Cadastro, login e sessão de usuários gerenciados via **JWT (JSON Web Tokens)**.
   * Suporte para autenticação facilitada em ambientes de testes automatizados.

2. **Construtor de Formulários (Form Builder):**
   * Interface visual completa para criação de formulários.
   * Múltiplos tipos de perguntas suportados (alternativas, resposta escrita, datas, links, sim/não e caixas de seleção).
   * **Lógica Condicional:** Perguntas podem aparecer ou sumir dinamicamente baseadas nas respostas de perguntas anteriores.

3. **Controle de Acesso Fino:**
   * Restrição de acesso a formulários por e-mails específicos.
   * Restrição de acesso por domínios corporativos (ex: `@empresa.com`).
   * Telas públicas de preenchimento (acessíveis sem login via link direto) quando não houver restrições ativas.

4. **Workflow de Pedido de Acesso:**
   * Usuários sem permissão podem solicitar acesso a um formulário privado diretamente pela plataforma.
   * O proprietário do formulário recebe notificações em tempo real e pode aprovar ou negar o pedido na interface.

5. **Upload de Arquivos:**
   * Upload de anexos e planilhas integrado com o **GridFS (MongoDB)**.
   * Visualização detalhada e opção de exclusão dos arquivos diretamente na interface antes do envio final.

---

## 🛠️ Pontos de Melhoria Recomendados

Após analisar a estrutura do código-fonte, foram selecionados os seguintes pontos críticos para otimização da plataforma:

### 1. Redundância de ORMs (Prisma + Mongoose)
* **Contexto:** O backend inicializa e conecta tanto o **Prisma Client** quanto o **Mongoose** no arquivo [`db.ts`](file:///home/inovia-g15/Documentos/projetos/GitHub/XLS_FUSION/src/server/db.ts). Contudo, todas as operações de banco de dados nos controllers utilizam exclusivamente os modelos do Mongoose.
* **Impacto:** Conexões redundantes são abertas simultaneamente, consumindo memória e recursos do servidor desnecessariamente. Além disso, o Prisma serve primariamente apenas para sincronização de schema via `npx prisma db push`.
* **Solução recomendada:** Unificar o acesso ao banco de dados.
  * *Opção A:* Remover o Prisma por completo, mantendo a simplicidade do Mongoose (ideal para uso flexível com MongoDB).
  * *Opção B:* Migrar todos os controllers e models para utilizar apenas o Prisma Client, dispensando o Mongoose.

### 2. Divergência de Tipagem nos Arrays (Prisma vs. Mongoose)
* **Contexto:** No [`schema.prisma`](file:///home/inovia-g15/Documentos/projetos/GitHub/XLS_FUSION/prisma/schema.prisma), propriedades como `questions`, `allowedEmails` e `allowedDomains` são tratadas como strings brutas (`String`) contendo JSON serializado. No [`index.ts`](file:///home/inovia-g15/Documentos/projetos/GitHub/XLS_FUSION/src/server/models/index.ts) do Mongoose, elas são representadas como estruturas reais do MongoDB (`[String]`, `[QuestionSchema]`).
* **Impacto:** Caso a plataforma passe a usar o Prisma no futuro, haverá conflitos de leitura/escrita no banco. Além disso, isso impede a execução de queries eficientes de busca nativa (como buscar formulários onde um e-mail está incluso no array de permissões) no Prisma.
* **Solução recomendada:** Corrigir os tipos no `schema.prisma` utilizando a representação nativa de arrays do MongoDB suportada pelo Prisma:
  ```prisma
  allowedEmails String[]
  ```

### 3. Validação de Input Manual vs. Validação Estruturada (Zod)
* **Contexto:** As validações de inputs recebidos por requisições HTTP são feitas de forma imperativa com rotinas manuais (como `isValidEmail`, `normalizeQuestions` no [`formController.ts`](file:///home/inovia-g15/Documentos/projetos/GitHub/XLS_FUSION/src/server/controllers/formController.ts)).
* **Impacto:** Menor legibilidade do código, maior vulnerabilidade a bugs causados por payloads mal formatados e dificuldade de reaproveitamento de tipos entre frontend e backend.
* **Solução recomendada:** Adotar o **Zod** para criar esquemas declarativos de validação no Express, facilitando a captura automática de erros e o compartilhamento de tipos de TypeScript.

### 4. Tratamento do Sinal de Encerramento (Processos Zumbis no Windows)
* **Contexto:** Conforme documentado no `README.md`, ao interromper o processo de desenvolvimento com `Ctrl+C` no Windows, o servidor backend Express frequentemente permanece rodando em segundo plano.
* **Impacto:** Ocupação indevida da porta de rede `8080`, exigindo comandos manuais no terminal para liberar a porta antes de iniciar o servidor novamente.
* **Solução recomendada:** Adicionar escutas explícitas de término de processo (`SIGINT`, `SIGTERM`) no entrypoint do servidor ([`index.ts`](file:///home/inovia-g15/Documentos/projetos/GitHub/XLS_FUSION/src/server/index.ts)) para garantir a limpeza de sockets abertos e encerramento correto do Node.js:
  ```typescript
  const gracefulShutdown = () => {
    console.log('Encerrando conexões...');
    server.close(() => {
      process.exit(0);
    });
  };
  
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  ```
