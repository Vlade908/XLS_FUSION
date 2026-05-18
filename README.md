# XLS_FUSION 🚀

XLS_FUSION é uma plataforma híbrida (React + Node.js/Express + MongoDB) projetada para construção de formulários inteligentes, dinâmicos e dependentes, voltados para ambientes corporativos e educacionais. 

O sistema permite a criação de formulários complexos (com lógica condicional), compartilhamento de acesso via e-mail/domínio, e possui uma tela de visualização pública responsiva e otimizada.

---

## 🛠️ Como rodar a aplicação do zero

Siga este passo a passo para baixar o repositório e colocar a aplicação no ar no seu ambiente local de desenvolvimento.

### Pré-requisitos
Certifique-se de que sua máquina possui:
- **Node.js** (versão 18 ou superior)
- **Git** (para clonar o repositório)
- Uma conta no **MongoDB Atlas** (ou MongoDB rodando localmente na porta 27017)

### Passo 1: Clone o Repositório
Abra seu terminal e clone o projeto na pasta desejada:
```bash
git clone https://github.com/SEU_USUARIO/XLS_FUSION.git
cd XLS_FUSION
```

### Passo 2: Instale as Dependências
Instale todos os pacotes necessários pelo NPM (ou Yarn/Pnpm se preferir):
```bash
npm install
```

### Passo 3: Configuração do Banco de Dados (.env)
A aplicação exige conexão com um banco de dados MongoDB (recomendamos o MongoDB Atlas para nuvem, mas funciona perfeitamente local).
Crie um arquivo chamado `.env` na raiz do projeto contendo as variáveis abaixo:

```env
# Porta onde o backend irá rodar (Padrão: 8080)
PORT=8080

# URL de Conexão do MongoDB (Substitua por sua Connection String do Atlas ou local)
MONGO_URI=mongodb+srv://<usuario>:<senha>@cluster0.exemplo.mongodb.net/xls_fusion?retryWrites=true&w=majority&appName=Cluster0

# URL do banco de dados (Variável auxiliar para o Prisma, caso esteja em uso)
DATABASE_URL=mongodb+srv://<usuario>:<senha>@cluster0.exemplo.mongodb.net/xls_fusion?retryWrites=true&w=majority&appName=Cluster0

# Segredo para assinatura de Tokens JWT (crie uma senha forte)
JWT_SECRET=sua_chave_secreta_super_segura_aqui
```

### Passo 4: Sincronização e Geração do Prisma
O sistema utiliza o Prisma para auxiliar no gerenciamento inicial e no Studio, além do Mongoose para esquemas dinâmicos. Sincronize o banco:
```bash
npx prisma generate
npx prisma db push
```

### Passo 5: Inicializando o Servidor
Com tudo configurado, basta rodar o comando principal de desenvolvimento. Ele inicializa tanto o Front-end (Vite) quanto o Back-end (Express via tsx watch) simultaneamente:
```bash
npm run dev
```

Acesse a aplicação no seu navegador:
- **Painel Front-end:** `http://localhost:5173`
- **Servidor Back-end (API):** `http://localhost:8080`

🎉 Pronto! O XLS_FUSION está rodando e pronto para receber novos formulários.

---

## Estrutura Principal do Projeto
* `src/views/`: Telas principais do frontend (React).
* `src/components/`: Componentes visuais isolados do frontend.
* `src/server/`: Backend em Node.js com as rotas, modelos de banco e lógica de autenticação.
* `prisma/`: Definições esquemáticas do Prisma e conexão primária.
