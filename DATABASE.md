# Database Configuration Guide

Este projeto suporta dois tipos de banco de dados:
- **SQLite local** (padrão, desenvolvimento local sem dependências)
- **MongoDB Atlas** (produção, dados em nuvem)

## Configuração Padrão (SQLite Local)

1. O arquivo `.env` vem com `MONGO_URI` vazio
2. Na primeira execução, execute:
   ```bash
   npm run db:migrate
   ```
3. O Prisma criará um banco SQLite em `prisma/dev.db`
4. Execute a aplicação normalmente:
   ```bash
   npm run dev
   ```

## Migrando para MongoDB Atlas

1. Crie uma conta em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster e um usuário
3. Copie a connection string (URI)
4. Atualize `.env`:
   ```env
   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/xls_fusion?retryWrites=true&w=majority
   ```
5. Atualize o schema para MongoDB (veja seção abaixo)
6. Rode a aplicação:
   ```bash
   npm run dev
   ```

## Alternando entre SQLite e MongoDB

### Para usar SQLite:
```env
MONGO_URI=
```
- O app automaticamente usa SQLite local
- Banco criado em `prisma/dev.db`

### Para usar MongoDB Atlas:
```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/database
```
- O app automaticamente conecta a MongoDB

## Comandos Úteis

```bash
# Executar migração
npm run db:migrate

# Resetar banco de dados (deleta tudo!)
npm run db:reset

# Abrir Prisma Studio (UI visual para dados)
npm run db:studio

# Iniciar app completo (server + frontend)
npm run dev

# Apenas servidor
npm run server
```

## Mudando de MongoDB para SQLite (ou vice-versa)

Se você alternou de banco de dados, você pode precisar resetar:

1. Deletar `prisma/dev.db` (se estava usando SQLite)
2. Deletar pasta `prisma/migrations/` (se estava usando SQLite)
3. Executar `npm run db:reset` para recrear

## Notas de Desenvolvimento

- **SQLite**: Perfeito para desenvolvimento local. Não precisa de servidor externo.
- **MongoDB Atlas**: Melhor para produção e colaboração em equipe. Dados persistidos em nuvem.
- Ambos os bancos usam o mesmo schema Prisma

## Troubleshooting

### "Command listCollections requires authentication"
- Seu MongoDB Atlas está configurado corretamente mas você está tentando conectar ao MongoDB local
- Verifique se `MONGO_URI` está configurado corretamente ou deixe vazio para usar SQLite

### "SQLite database dev.db created at..."
- Tudo funcionando! Seu banco local foi criado com sucesso

### Prisma Client gerado
- Se receber erro de cliente Prisma desatualizado: `npm install` para recriar o cliente
