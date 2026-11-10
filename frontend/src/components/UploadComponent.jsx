import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentsApi.js';
import { formatFileSize } from '../utils/formatFileSize.js';

export default function UploadComponent({ owner, onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function chooseFile(nextFile) {
    if (!nextFile) return;
    setFile(nextFile);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || !owner) return;

    setIsUploading(true);
    setError('');
    setSuccess('');

    let uploadedDocument;
    try {
      uploadedDocument = await uploadDocument(file, owner);
    } catch (uploadError) {
      setError(uploadError.message);
      return;
    } finally {
      setIsUploading(false);
    }

    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    setSuccess(`${uploadedDocument.originalName} enviado.`);

    try {
      await onUploaded?.(uploadedDocument);
    } catch {
      setError('Documento enviado, mas não foi possível atualizar a lista.');
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        className={`drop-zone${isDragging ? ' drop-zone--active' : ''}`}
        htmlFor="document-file"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          chooseFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          id="document-file"
          className="visually-hidden"
          type="file"
          onChange={(event) => chooseFile(event.target.files[0])}
        />
        <span className="drop-zone__symbol" aria-hidden="true">+</span>
        <span className="drop-zone__title">
          {file ? file.name : 'Escolher um arquivo'}
        </span>
        <span className="drop-zone__hint">
          {file ? formatFileSize(file.size) : 'Arraste para cá ou procure no dispositivo'}
        </span>
      </label>

      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {success && <p className="form-message form-message--success" role="status">{success}</p>}

      <button
        className="button button--primary upload-submit"
        type="submit"
        disabled={!owner || !file || isUploading}
      >
        {isUploading ? 'Enviando...' : 'Enviar documento'}
        {!isUploading && <span aria-hidden="true">&#8599;</span>}
      </button>
      {!owner && <p className="upload-note">Informe um identificador de usuário para enviar.</p>}
    </form>
  );
}