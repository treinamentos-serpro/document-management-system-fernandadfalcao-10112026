import DownloadButton from './DownloadButton.jsx';
import { formatFileSize } from '../utils/formatFileSize.js';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DocumentList({
  documents,
  owner,
  hasLoaded,
  isLoading,
  error,
  onReload,
}) {
  return (
    <section className="document-section" aria-labelledby="documents-heading" aria-busy={isLoading}>
      <div className="section-heading">
        <div className="section-heading__title">
          <span className="section-index">02</span>
          <h2 id="documents-heading">Arquivos</h2>
          {hasLoaded && <span className="document-count">{documents.length}</span>}
        </div>
        <button
          className="button button--text"
          type="button"
          onClick={onReload}
          disabled={!owner || isLoading}
        >
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {error && <p className="list-message list-message--error" role="alert">{error}</p>}
      {isLoading ? (
        <p className="list-message" role="status">Carregando documentos...</p>
      ) : !hasLoaded ? (
        <p className="list-message">Nenhuma lista carregada.</p>
      ) : documents.length === 0 ? (
        <p className="list-message">Nenhum documento encontrado.</p>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <span className="file-mark" aria-hidden="true">DOC</span>
              <div className="document-row__details">
                <span className="document-name" title={document.originalName}>
                  {document.originalName}
                </span>
                <span className="document-meta">
                  {formatFileSize(document.size)} <span aria-hidden="true">/</span> {formatDate(document.uploadedAt)}
                </span>
              </div>
              <DownloadButton document={document} owner={owner} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}