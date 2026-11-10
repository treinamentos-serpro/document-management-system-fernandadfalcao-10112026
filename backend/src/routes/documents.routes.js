const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || 500;
  let code = error.status ? (error.code || 'REQUEST_ERROR') : 'INTERNAL_SERVER_ERROR';
  let message = status === 500 ? 'Erro interno do servidor.' : error.message;

  if (error.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'FILE_TOO_LARGE';
    message = 'O arquivo excede o tamanho máximo permitido.';
  } else if (error instanceof multer.MulterError) {
    status = 400;
    code = 'UPLOAD_ERROR';
    message = 'Não foi possível processar o arquivo enviado.';
  }

  res.status(status).json({ error: { code, message } });
}

function createDocumentsRouter({ controller, storageDir, maxFileSize }) {
  const router = express.Router();

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, storageDir),
      filename: (_req, _file, callback) => callback(null, randomUUID()),
    }),
    limits: {
      fileSize: maxFileSize,
      files: 1,
      fields: 1,
      fieldSize: 64 * 1024,
      parts: 3,
    },
  });

  router.post('/upload', upload.single('file'), controller.upload);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);
  router.use(errorHandler);

  return router;
}

module.exports = { createDocumentsRouter };