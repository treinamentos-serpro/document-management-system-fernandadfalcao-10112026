import { useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentsApi.js';
import './App.css';

export default function App() {
  const [owner, setOwner] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loadedOwner, setLoadedOwner] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState('');

  async function loadDocuments(targetOwner) {
    const normalizedOwner = targetOwner.trim();
    if (!normalizedOwner) {
      setListError('Informe um identificador de usuário.');
      return;
    }

    setIsLoading(true);
    setListError('');
    try {
      const result = await listDocuments(normalizedOwner);
      setDocuments(result);
      setLoadedOwner(normalizedOwner);
      setHasLoaded(true);
    } catch (error) {
      setListError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOwnerChange(event) {
    const nextOwner = event.target.value;
    setOwner(nextOwner);
    if (nextOwner.trim() !== loadedOwner) {
      setDocuments([]);
      setHasLoaded(false);
      setListError('');
    }
  }

  function handleOwnerSubmit(event) {
    event.preventDefault();
    loadDocuments(owner);
  }

  async function handleUploaded(document) {
    setOwner(document.owner);
    await loadDocuments(document.owner);
  }

  const currentOwner = owner.trim();
  const visibleDocuments = loadedOwner === currentOwner ? documents : [];
  const visibleHasLoaded = hasLoaded && loadedOwner === currentOwner;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">DOCS<span>/</span>LOCAL</span>
        </a>
        <span className="storage-label"><span className="status-dot" /> ARMAZENAMENTO LOCAL</span>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <p className="eyebrow">DOCUMENT MANAGEMENT SYSTEM <span> / </span> WORKSPACE</p>
          <h1>Central de documentos</h1>
        </div>

        <form className="owner-form" onSubmit={handleOwnerSubmit}>
          <label htmlFor="owner">Identificador do usuário</label>
          <div className="owner-form__controls">
            <input
              id="owner"
              name="owner"
              autoComplete="username"
              value={owner}
              onChange={handleOwnerChange}
              placeholder="Ex.: usuario-123"
            />
            <button className="button button--dark" type="submit" disabled={isLoading}>
              {isLoading ? 'Carregando...' : 'Carregar arquivos'}
            </button>
          </div>
        </form>

        <div className="workspace-grid">
          <section className="upload-section" aria-labelledby="upload-heading">
            <div className="section-heading section-heading--upload">
              <div className="section-heading__title">
                <span className="section-index">01</span>
                <h2 id="upload-heading">Novo envio</h2>
              </div>
            </div>
            <UploadComponent owner={currentOwner} onUploaded={handleUploaded} />
          </section>

          <DocumentList
            documents={visibleDocuments}
            owner={currentOwner}
            hasLoaded={visibleHasLoaded}
            isLoading={isLoading}
            error={listError}
            onReload={() => loadDocuments(currentOwner)}
          />
        </div>
      </main>

      <footer className="page-footer">
        <span>DMS <span className="footer-separator">/</span> Gestão de documentos</span>
        <span>ARQUIVOS NO DISCO LOCAL</span>
      </footer>
    </div>
  );
}