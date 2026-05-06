# XLS_FUSION

Sistema de Processamento e Consolidação de Auditorias em Excel

XLS Fusion é uma aplicação web moderna para processamento de auditorias estruturadas em planilhas Excel. Permite a criação, resposta e consolidação de formulários de auditoria com interface intuitiva e armazenamento seguro em MongoDB.

## 🚀 Funcionalidades

### 🎨 Preparação
- **Carregamento de Regras**: Importe planilhas com regras de auditoria
- **Mapeamento de Responsáveis**: Associe questões a funcionários específicos
- **Configuração Visual**: Defina cores personalizadas para cada responsável
- **Export/Import de Configurações**: Salve e reutilize configurações de cores

### ⚡ Filtros
- **Upload de Planilhas**: Envie planilhas de auditoria para processamento
- **Processamento Automático**: Aplicação automática de regras e formatação
- **Feedback Visual**: Barra de progresso em tempo real durante o upload

### 📝 Responder
- **Interface Imersiva**: Modo tela cheia para foco na resposta
- **Navegação por Questões**: Sistema de navegação intuitivo entre perguntas
- **Validação Automática**: Verificação de respostas obrigatórias
- **Salvamento Automático**: Persistência de respostas em tempo real

### 📊 Consolidação
- **Agregação de Respostas**: Junte múltiplas respostas de diferentes auditores
- **Relatórios Estruturados**: Geração automática de relatórios consolidados
- **Análise Visual**: Cores e formatação para facilitar a leitura
- **Exportação**: Download de relatórios finais em Excel

## 🏗️ Arquitetura

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Framer Motion** para animações
- **XLSX.js** para processamento de Excel

### Backend
- **Express.js** com TypeScript
- **MongoDB** com GridFS para armazenamento de arquivos
- **Multer** para upload de arquivos
- **Helmet** e **CORS** para segurança

### Infraestrutura
- **Docker Compose** para orquestração
- **MongoDB** em container separado
- **Healthchecks** para garantia de disponibilidade
- **Volumes persistentes** para dados

## 📋 Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local)
- 4GB RAM disponível
- 2GB espaço em disco

## 🚀 Instalação e Execução

### Com Docker (Recomendado)

1. **Clone o repositório**:
   ```bash
   git clone <repository-url>
   cd xls_fusion
   ```

2. **Configure o ambiente**:
   ```bash
   cp .env.example .env
   # Edite .env se necessário (valores padrão funcionam)
   ```

3. **Execute a aplicação**:
   ```bash
   docker compose up --build
   ```

4. **Acesse**:
   - Aplicação: http://localhost:8080
   - API Health: http://localhost:8080/api/health

### Desenvolvimento Local

1. **Instale dependências**:
   ```bash
   npm install
   ```

2. **Configure MongoDB**:
   ```bash
   # Instale MongoDB localmente ou use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```

3. **Configure ambiente**:
   ```bash
   cp .env.example .env
   # Ajuste MONGO_URI para mongodb://localhost:27017/xls_fusion
   ```

4. **Execute**:
   ```bash
   npm run dev
   ```

> **⚠️ Nota sobre Testes**: Se estiver usando Node.js v24.13.0 no Windows, os testes Jest podem apresentar erros. Use Node.js v18 ou v20 para desenvolvimento, ou execute testes em container Docker.

## 📖 Uso

### 1. Preparação
1. Acesse a aba "Preparação"
2. Carregue a planilha de regras (formato Excel)
3. Carregue o formulário base
4. Configure cores para cada responsável
5. Exporte as configurações se desejar reutilizar

### 2. Filtros
1. Acesse a aba "Filtros"
2. Selecione uma planilha de auditoria
3. Clique em "Enviar Agora"
4. Aguarde o processamento (barra de progresso)

### 3. Responder
1. Acesse a aba "Responder"
2. Carregue uma planilha de respostas
3. Selecione um responsável
4. Responda às questões apresentadas
5. Navegue entre questões usando os controles

### 4. Consolidação
1. Acesse a aba "Consolidar"
2. Carregue a planilha base
3. Carregue múltiplas planilhas de respostas
4. Execute a consolidação
5. Baixe o relatório final

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Porta da aplicação
PORT=8080

# URL de conexão MongoDB
MONGO_URI=mongodb://root:example@mongo:27017/xls_fusion?authSource=admin

# Ambiente da aplicação
NODE_ENV=production
```

### Docker Compose

O `docker-compose.yml` configura:
- **App**: Container Node.js com a aplicação
- **MongoDB**: Banco de dados com autenticação
- **Volumes**: Persistência de dados
- **Healthchecks**: Verificação de saúde dos serviços

## 📚 API

### Endpoints

#### `GET /api/health`
Verifica se a aplicação está funcionando.

**Resposta**:
```json
"OK"
```

#### `POST /api/upload-planilha`
Faz upload de uma planilha de auditoria.

**Parâmetros** (FormData):
- `file`: Arquivo Excel (.xlsx, .xls)

**Resposta**:
```json
{
  "message": "Planilha salva!",
  "file": {
    "id": "gridfs_id",
    "filename": "arquivo.xlsx",
    "originalname": "original.xlsx",
    "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "size": 12345
  }
}
```

#### `POST /api/upload-anexo`
Faz upload de um anexo relacionado a uma questão.

**Parâmetros** (FormData):
- `file`: Arquivo a ser anexado
- `responder`: Nome do responsável
- `questionNumber`: Número da questão
- `formName`: Nome do formulário

**Resposta**:
```json
{
  "message": "Anexo salvo com sucesso!",
  "file": {
    "id": "gridfs_id",
    "filename": "arquivo.ext",
    "originalname": "original.ext",
    "mimetype": "tipo/mime",
    "size": 12345,
    "responder": "João Silva",
    "questionNumber": "1",
    "formName": "auditoria_2024"
  }
}
```

## 🧪 Testes

### Executando Testes

```bash
# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes E2E
npm run test:e2e

# Todos os testes
npm run test
```

### Cobertura de Testes

```bash
npm run test:coverage
```

## 🔒 Segurança

- **Helmet**: Headers de segurança HTTP
- **CORS**: Controle de origem das requisições
- **Limitação de Upload**: Máximo 50MB por arquivo
- **Validação de Arquivos**: Apenas Excel (.xlsx, .xls)
- **Sanitização**: Limpeza de nomes de arquivos e caminhos
- **Autenticação MongoDB**: Credenciais obrigatórias

## 🐛 Troubleshooting

### Aplicação não inicia
1. Verifique se as portas 8080 e 27017 estão livres
2. Confirme se Docker está rodando
3. Verifique logs: `docker compose logs`

### Erro de conexão MongoDB
1. Aguarde o healthcheck do MongoDB
2. Verifique `MONGO_URI` no .env
3. Confirme se o container mongo está saudável

### Upload falha
1. Verifique tamanho do arquivo (máx. 50MB)
2. Confirme formato Excel válido
3. Verifique permissões de escrita

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação de API
- Verifique os logs da aplicação

