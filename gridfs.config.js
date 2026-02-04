const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto'); // Para gerar nomes únicos de arquivos
const path = require('path');

// 1. Criar a estratégia de armazenamento
const storage = new GridFsStorage({
  url: process.env.MONGO_URI, // Sua string de conexão do Datastore Enterprise
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // Gerar um nome aleatório para evitar conflitos de nomes de funcionários
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'planilhas_xls_fusion', // Nome da coleção no GridFS
          metadata: { 
            autor: req.body.funcionarioNome, // Pegando dados do formulário do Bolt
            setor: req.body.setor 
          }
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({ storage });