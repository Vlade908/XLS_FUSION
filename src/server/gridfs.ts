import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import path from 'path';

const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/xls_fusion';

const storage = new GridFsStorage({
  url: mongoUri,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  file: (req, file) => {
    const filename = `${Date.now()}-${path.basename(file.originalname)}`;

    return {
      filename,
      bucketName: 'uploads',
      metadata: {
        originalname: file.originalname,
        fieldname: file.fieldname,
      },
    };
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});