const API_PREFIX = '/api';

async function readError(response) {
  const body = await response.json().catch(() => null);
  return body?.error?.message || `Não foi possível concluir a solicitação (${response.status}).`;
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner', owner);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function listDocuments(owner) {
  const query = new URLSearchParams({ owner });
  const response = await fetch(`${API_PREFIX}/documents?${query}`);

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

function getFilename(contentDisposition, fallbackName) {
  const encodedName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedName) {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return fallbackName;
    }
  }

  const plainName = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
  return plainName || fallbackName;
}

export async function downloadDocument(id, owner, fallbackName) {
  const query = new URLSearchParams({ owner });
  const response = await fetch(
    `${API_PREFIX}/documents/${encodeURIComponent(id)}/download?${query}`,
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    blob: await response.blob(),
    filename: getFilename(response.headers.get('content-disposition'), fallbackName),
  };
}