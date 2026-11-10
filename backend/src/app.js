// Arquivos de upload são gravados localmente via Multer diskStorage.

const express = require('express');
const { createDocumentsController } = require('./controllers/documents.controller');
const { createDocumentsRepository } = require('./repositories/documents.repository');
const { createDocumentsRouter } = require('./routes/documents.routes');
const { createDocumentsService } = require('./services/documents.service');

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

function getMaxFileSize(value = process.env.UPLOAD_MAX_BYTES) {
  if (value === undefined) {
    return DEFAULT_MAX_FILE_SIZE;
  }

  const maxFileSize = Number(value);
  if (!Number.isSafeInteger(maxFileSize) || maxFileSize < 1) {
    throw new Error('UPLOAD_MAX_BYTES deve ser um inteiro positivo.');
  }

  return maxFileSize;
}

function createApp({ storageDir, maxFileSize = getMaxFileSize() } = {}) {
  const app = express();
  const documentsRepository = createDocumentsRepository({ storageDir });
  const documentsService = createDocumentsService(documentsRepository);
  const documentsController = createDocumentsController(documentsService);
  const documentsRouter = createDocumentsRouter({
    controller: documentsController,
    storageDir: documentsRepository.storageDir,
    maxFileSize,
  });

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(documentsRouter);

  return app;
}

const app = createApp();
app.createApp = createApp;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
