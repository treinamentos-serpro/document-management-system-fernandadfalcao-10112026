const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_STORAGE_DIR = path.resolve(__dirname, '../../storage');

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function createDocumentsRepository({ storageDir = DEFAULT_STORAGE_DIR } = {}) {
  const documents = new Map();
  const resolvedStorageDir = path.resolve(storageDir);
  fs.mkdirSync(resolvedStorageDir, { recursive: true });

  function resolveStoragePath(storageName) {
    if (typeof storageName !== 'string' || !storageName) {
      const error = new Error('Nome de arquivo interno inválido.');
      error.code = 'INVALID_STORAGE_NAME';
      throw error;
    }

    const filePath = path.resolve(resolvedStorageDir, storageName);
    const relativePath = path.relative(resolvedStorageDir, filePath);
    if (
      !relativePath
      || relativePath === '..'
      || relativePath.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativePath)
    ) {
      const error = new Error('Nome de arquivo interno inválido.');
      error.code = 'INVALID_STORAGE_NAME';
      throw error;
    }

    return filePath;
  }

  return {
    storageDir: resolvedStorageDir,

    async create(document) {
      documents.set(document.id, { ...document });
      return toPublicDocument(document);
    },

    async listByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map(toPublicDocument);
    },

    async findByIdAndOwner(id, owner) {
      const document = documents.get(id);
      if (!document || document.owner !== owner) {
        return null;
      }

      return { ...document };
    },

    getFilePath(storageName) {
      return resolveStoragePath(storageName);
    },

    async fileExists(storageName) {
      try {
        await fsPromises.access(resolveStoragePath(storageName));
        return true;
      } catch (error) {
        if (error.code === 'ENOENT') {
          return false;
        }
        throw error;
      }
    },

    async removeFile(storageName) {
      try {
        await fsPromises.unlink(resolveStoragePath(storageName));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
}

module.exports = { createDocumentsRepository };