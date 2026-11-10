const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('a API permite enviar, listar e baixar documentos por owner', async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const testApp = app.createApp({ storageDir, maxFileSize: 1024 });
  const server = testApp.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const formData = new FormData();
    formData.append('owner', 'usuario-123');
    formData.append('file', new Blob(['conteudo']), 'relatorio.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
    assert.strictEqual(uploadResponse.status, 201);
    const document = await uploadResponse.json();
    assert.deepStrictEqual(Object.keys(document).sort(), [
      'id',
      'originalName',
      'owner',
      'size',
      'uploadedAt',
    ]);
    assert.strictEqual(document.owner, 'usuario-123');
    assert.strictEqual(document.size, Buffer.byteLength('conteudo'));

    const listResponse = await fetch(`${baseUrl}/documents?owner=usuario-123`);
    assert.strictEqual(listResponse.status, 200);
    assert.deepStrictEqual(await listResponse.json(), [document]);

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${document.id}/download?owner=usuario-123`,
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
    assert.strictEqual(await downloadResponse.text(), 'conteudo');

    const wrongOwnerResponse = await fetch(
      `${baseUrl}/documents/${document.id}/download?owner=outro-usuario`,
    );
    assert.strictEqual(wrongOwnerResponse.status, 404);

    const missingOwnerResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(missingOwnerResponse.status, 400);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  }
});

test('a API rejeita uploads acima do limite configurado', async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const testApp = app.createApp({ storageDir, maxFileSize: 4 });
  const server = testApp.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const formData = new FormData();
    formData.append('owner', 'usuario-123');
    formData.append('file', new Blob(['maior']), 'arquivo.bin');

    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
    assert.strictEqual(response.status, 413);
    assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  }
});

test('a API remove o arquivo quando o upload não informa owner', async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const testApp = app.createApp({ storageDir, maxFileSize: 1024 });
  const server = testApp.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const formData = new FormData();
    formData.append('file', new Blob(['conteudo']), 'relatorio.txt');

    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(await fs.readdir(storageDir), []);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  }
});

test('a API retorna 404 quando o arquivo local não está disponível', async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const testApp = app.createApp({ storageDir, maxFileSize: 1024 });
  const server = testApp.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const formData = new FormData();
    formData.append('owner', 'usuario-123');
    formData.append('file', new Blob(['conteudo']), 'relatorio.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
    const document = await uploadResponse.json();
    const [storageName] = await fs.readdir(storageDir);
    await fs.unlink(path.join(storageDir, storageName));

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${document.id}/download?owner=usuario-123`,
    );

    assert.strictEqual(downloadResponse.status, 404);
    assert.strictEqual((await downloadResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  }
});
