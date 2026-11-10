const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDocumentsService } = require('../src/services/documents.service');

const notFoundError = {
  status: 404,
  code: 'DOCUMENT_NOT_FOUND',
  message: 'Documento não encontrado.',
};

test('getDownload returns the same not-found error for missing metadata and files', async (t) => {
  const document = { storageName: 'stored-file', originalName: 'report.txt' };
  const scenarios = [
    {
      name: 'document metadata is missing',
      foundDocument: null,
      fileExists: false,
    },
    {
      name: 'local file is missing',
      foundDocument: document,
      fileExists: false,
    },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const repository = {
        async findByIdAndOwner(id, owner) {
          assert.strictEqual(id, 'document-id');
          assert.strictEqual(owner, 'owner-id');
          return scenario.foundDocument;
        },
        async fileExists(storageName) {
          assert.strictEqual(storageName, document.storageName);
          return scenario.fileExists;
        },
      };
      const service = createDocumentsService(repository);

      await assert.rejects(service.getDownload('document-id', 'owner-id'), notFoundError);
    });
  }
});
