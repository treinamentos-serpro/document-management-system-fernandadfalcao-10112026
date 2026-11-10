import { useState } from 'react';
import { downloadDocument } from '../services/documentsApi.js';

export default function DownloadButton({ document, owner }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setIsDownloading(true);
    setError('');

    try {
      const { blob, filename } = await downloadDocument(
        document.id,
        owner,
        document.originalName,
      );
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="download-control">
      <button
        className="button button--quiet"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`Baixar ${document.originalName}`}
      >
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span className="download-error" role="alert">{error}</span>}
    </span>
  );
}