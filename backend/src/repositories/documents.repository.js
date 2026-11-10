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
  fs.mkdirSync(storageDir, { recursive: true });

  return {
    storageDir,

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
      return path.join(storageDir, storageName);
    },

    async fileExists(storageName) {
      try {
        await fsPromises.access(path.join(storageDir, storageName));
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
        await fsPromises.unlink(path.join(storageDir, storageName));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
}

module.exports = { createDocumentsRepository };