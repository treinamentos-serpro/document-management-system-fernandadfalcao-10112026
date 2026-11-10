const { randomUUID } = require('node:crypto');

function createServiceError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function validateOwner(owner) {
  if (typeof owner !== 'string' || owner.trim().length === 0) {
    throw createServiceError(400, 'VALIDATION_ERROR', 'O campo owner é obrigatório.');
  }
}

async function findDownloadableDocument(repository, id, owner) {
  const document = await repository.findByIdAndOwner(id, owner);
  if (!document || !(await repository.fileExists(document.storageName))) {
    throw createServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return document;
}

function createDocumentsService(repository) {
  return {
    async upload({ file, owner }) {
      try {
        validateOwner(owner);
        if (!file) {
          throw createServiceError(400, 'VALIDATION_ERROR', 'O campo file é obrigatório.');
        }

        const document = {
          id: randomUUID(),
          originalName: file.originalname,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          owner,
          storageName: file.filename,
        };

        return await repository.create(document);
      } catch (error) {
        if (file) {
          try {
            await repository.removeFile(file.filename);
          } catch (_cleanupError) {
            // Preserva o erro original do registro dos metadados.
          }
        }
        throw error;
      }
    },

    async list(owner) {
      validateOwner(owner);
      return repository.listByOwner(owner);
    },

    async getDownload(id, owner) {
      validateOwner(owner);
      const document = await findDownloadableDocument(repository, id, owner);

      return {
        filePath: repository.getFilePath(document.storageName),
        originalName: document.originalName,
      };
    },
  };
}

module.exports = { createDocumentsService };