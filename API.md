# XLS Fusion - Documentação da API

## Visão Geral

A API do XLS Fusion fornece endpoints para upload e processamento de arquivos Excel relacionados a auditorias. Todos os arquivos são armazenados de forma segura no MongoDB usando GridFS.

## Base URL
```
http://localhost:8080/api
```

## Autenticação
Atualmente, a API não requer autenticação específica, mas todas as requisições são protegidas por CORS e validações de entrada.

## Endpoints

### GET /health

Verifica se a aplicação e o banco de dados estão funcionando corretamente.

**Método**: `GET`
**URL**: `/api/health`
**Parâmetros**: Nenhum

**Resposta de Sucesso (200)**:
```json
"OK"
```

**Resposta de Erro (500)**:
```json
{
  "error": "Database connection failed"
}
```

---

### POST /upload-planilha

Faz upload de uma planilha Excel para processamento de auditoria.

**Método**: `POST`
**URL**: `/api/upload-planilha`
**Content-Type**: `multipart/form-data`

**Parâmetros (FormData)**:
- `file` (obrigatório): Arquivo Excel (.xlsx ou .xls)

**Limitações**:
- Tamanho máximo: 50MB
- Tipos aceitos: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`

**Resposta de Sucesso (201)**:
```json
{
  "message": "Planilha salva!",
  "file": {
    "id": "507f1f77bcf86cd799439011",
    "filename": "auditoria-1734567890123.xlsx",
    "originalname": "relatorio_auditoria.xlsx",
    "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "size": 245760
  }
}
```

**Resposta de Erro (400)**:
```json
{
  "error": "Arquivo não encontrado."
}
```

**Resposta de Erro (413)**:
```json
{
  "error": "File too large"
}
```

**Resposta de Erro (500)**:
```json
{
  "error": "Erro interno do servidor"
}
```

---

### POST /upload-anexo

Faz upload de um anexo relacionado a uma questão específica de auditoria.

**Método**: `POST`
**URL**: `/api/upload-anexo`
**Content-Type**: `multipart/form-data`

**Parâmetros (FormData)**:
- `file` (obrigatório): Arquivo a ser anexado
- `responder` (obrigatório): Nome do responsável pela resposta
- `questionNumber` (obrigatório): Número da questão
- `formName` (opcional): Nome do formulário (padrão: "geral")

**Limitações**:
- Tamanho máximo: 50MB
- Nomes são sanitizados (acentos removidos, caracteres especiais substituídos)

**Resposta de Sucesso (201)**:
```json
{
  "message": "Anexo salvo com sucesso!",
  "file": {
    "id": "507f1f77bcf86cd799439012",
    "filename": "documento-1734567890123.pdf",
    "originalname": "comprovante.pdf",
    "mimetype": "application/pdf",
    "size": 102400,
    "responder": "João Silva",
    "questionNumber": "5",
    "formName": "auditoria_qualidade"
  }
}
```

**Resposta de Erro (400)**:
```json
{
  "error": "Arquivo não encontrado."
}
```

## Códigos de Status HTTP

- **200**: OK - Requisição bem-sucedida
- **201**: Created - Recurso criado com sucesso
- **400**: Bad Request - Parâmetros inválidos
- **413**: Payload Too Large - Arquivo muito grande
- **500**: Internal Server Error - Erro interno do servidor

## Tratamento de Erros

Todos os erros seguem o formato:
```json
{
  "error": "Descrição do erro"
}
```

## Segurança

- **Limitação de Taxa**: Não implementada (recomendado para produção)
- **Validação de Arquivos**: Apenas tipos MIME específicos são aceitos
- **Sanitização**: Nomes de arquivos e caminhos são limpos automaticamente
- **CORS**: Configurado para aceitar origens específicas
- **Helmet**: Headers de segurança aplicados

## Exemplos de Uso

### Upload de Planilha com cURL
```bash
curl -X POST http://localhost:8080/api/upload-planilha \
  -F "file=@relatorio.xlsx"
```

### Upload de Anexo com cURL
```bash
curl -X POST http://localhost:8080/api/upload-anexo \
  -F "file=@comprovante.pdf" \
  -F "responder=João Silva" \
  -F "questionNumber=5" \
  -F "formName=auditoria_qualidade"
```

### Verificação de Saúde
```bash
curl http://localhost:8080/api/health
```

## Desenvolvimento

Para testar a API localmente:

1. Inicie o servidor:
   ```bash
   npm run dev
   ```

2. Use ferramentas como Postman, Insomnia ou cURL para testar os endpoints

3. Verifique os logs do servidor para debugging

## Monitoramento

- Logs de erro são gravados no console
- Conexões com MongoDB são monitoradas
- Health checks estão disponíveis para monitoramento externo