# Testes - XLS Fusion

Este documento descreve a suíte de testes completa da aplicação XLS Fusion.

## ⚠️ Nota Importante sobre Jest

**Problema Conhecido**: O Jest apresenta incompatibilidade com Node.js v24.13.0 no Windows, causando erro `UNKNOWN: unknown error, read` ao tentar carregar arquivos.

**Soluções Temporárias**:
1. Usar Node.js v18 ou v20 (recomendado)
2. Executar testes em container Docker
3. Usar alternativas como Vitest (futuramente)

## Estrutura de Testes

```
tests/
├── unit/           # Testes unitários de componentes e utilitários
├── integration/    # Testes de integração da API
└── e2e/           # Testes end-to-end com Playwright
```

## Tipos de Testes

### 1. Testes Unitários
- **Framework**: Jest + Testing Library
- **Cobertura**: Componentes React, utilitários, lógica de negócio
- **Localização**: `tests/unit/`

### 2. Testes de Integração
- **Framework**: Jest + Supertest
- **Cobertura**: Endpoints da API, middleware, integrações
- **Localização**: `tests/integration/`

### 3. Testes E2E
- **Framework**: Playwright
- **Cobertura**: Fluxos completos do usuário, interface
- **Localização**: `tests/e2e/`

## Executando os Testes

### Pré-requisitos
1. **Node.js**: Versão 18 ou 20 (evitar v24.13.0)
2. **MongoDB**: Instância local rodando na porta 27017
3. **Dependências**: `npm install`

### Todos os Testes
```bash
npm run test:all
```

### Testes Unitários
```bash
npm run test:unit
```

### Testes de Integração
```bash
npm run test:integration
```

### Testes E2E
```bash
npm run test:e2e
```

### Cobertura de Testes
```bash
npm run test:coverage
```

### Modo Watch
```bash
npm run test:watch
```

### E2E com Interface Visual
```bash
npm run test:e2e:ui
```

## Ambiente de Desenvolvimento

### MongoDB Local
Para desenvolvimento local, use:
```bash
docker run -d --name mongodb-local -p 27017:27017 mongo:7
```

### Configurações de Ambiente
- **Desenvolvimento**: Arquivo `.env.local` sobrescreve `.env`
- **Docker**: Arquivo `.env` para produção/container
- **Testes**: Configurações específicas no `jest.config.json`

## Configurações

### Jest Configuration (`jest.config.ts`)
- Ambiente: jsdom para testes de componentes
- Cobertura: 70% mínimo para branches, funções, linhas e statements
- Mocks: CSS, imagens e APIs do navegador
- Setup: `src/setupTests.ts` para configurações globais

### Playwright Configuration (`playwright.config.ts`)
- Browsers: Chrome, Firefox, Safari
- Base URL: http://localhost:8080
- Screenshots e vídeos em caso de falha
- Web server automático para desenvolvimento

## Mocks e Utilitários

### Setup Global (`src/setupTests.ts`)
- MatchMedia API
- ResizeObserver
- FileReader
- URL.createObjectURL/revokeObjectURL

### Mocks de Arquivos (`__mocks__/fileMock.js`)
- Substituição de arquivos CSS e imagens

## Testes Implementados

### Unitários
- **FileUpload**: Upload, drag-and-drop, remoção de arquivos
- Validação de props, estados e interações

### Integração
- **API Routes**: Upload de anexos e planilhas
- Sanitização de nomes de arquivos
- Tratamento de erros
- Endpoint de health check

### E2E
- **Fluxo Completo**: Navegação, upload de arquivos
- **Drag and Drop**: Funcionalidade de arrastar arquivos
- **Remoção de Arquivos**: Interface de remoção
- **Navegação por Abas**: Consolidação, Filtros, Preparação
- **Upload de Auditor**: Funcionalidade específica
- **Tratamento de Erros**: Arquivos inválidos
- **Performance**: Upload de arquivos grandes

## Boas Práticas

### Testes Unitários
- Usar `describe` para agrupar testes relacionados
- Usar `beforeEach` para setup/cleanup
- Mockar dependências externas
- Testar estados e interações do usuário
- Verificar acessibilidade com roles apropriados

### Testes de Integração
- Mockar banco de dados e serviços externos
- Testar respostas HTTP completas
- Verificar sanitização e validação de dados
- Testar tratamento de erros

### Testes E2E
- Usar seletores estáveis (data-testid, roles)
- Evitar sleeps, usar waitFor
- Testar cenários críticos do usuário
- Verificar estados visuais e mensagens

## Cobertura de Código

A aplicação mantém uma cobertura mínima de 70% em:
- Branches
- Funções
- Linhas
- Statements

Para visualizar o relatório de cobertura:
```bash
npm run test:coverage
```

O relatório será gerado em `coverage/lcov-report/index.html`

## CI/CD

Os testes são executados automaticamente em:
- Push para branches principais
- Pull requests
- Releases

### Requisitos para CI
- Node.js 18+
- MongoDB em container Docker
- Browsers para E2E (Playwright install)

## Debugging

### Testes Unitários/Integração
```bash
# Debug específico
npm run test:unit -- --testNamePattern="FileUpload"
```

### Testes E2E
```bash
# Com interface visual
npm run test:e2e:ui

# Debug específico
npx playwright test --debug upload-flow.spec.ts
```

## Manutenção

### Adicionando Novos Testes
1. Criar arquivo `.test.ts` ou `.test.tsx`
2. Seguir convenções de nomenclatura
3. Adicionar ao diretório apropriado
4. Executar `npm run test:coverage` para verificar cobertura

### Atualizando Testes
- Manter testes sincronizados com mudanças no código
- Atualizar snapshots quando necessário
- Revisar cobertura após refatorações

## Troubleshooting

### Problemas Comuns

1. **Testes E2E falhando**: Verificar se o servidor está rodando na porta 8080
2. **Módulos não encontrados**: Executar `npm install` e verificar dependências
3. **Timeouts**: Aumentar timeout ou otimizar testes
4. **Flaky tests**: Usar `waitFor` ao invés de `sleep`

### Logs Úteis
```bash
# Ver logs detalhados
DEBUG=pw:api npm run test:e2e

# Ver cobertura detalhada
npm run test:coverage -- --verbose
```