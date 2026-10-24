/**
 * FileDropzone — drag-and-drop (or click) file picker.
 *
 * value:
 *   null            nothing chosen
 *   File            a new file to upload (validated before it's accepted)
 *   string (URL)    the file already stored (edit mode) — can be viewed,
 *                   replaced, or removed when the field allows it
 * initialValue: the stored URL, so "undo" after choosing a new file goes back to it
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaFileAudio, FaFilePdf, FaFileVideo, FaTimes, FaExternalLinkAlt, FaExchangeAlt } from 'react-icons/fa';
import { safeUrl } from '../../api/client';
import { validateFile } from '../../utils/contentForm';
import styles from './Form.module.css';

/** 1536000 → "1.5 MB" */
export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const KIND_ICONS = { pdf: FaFilePdf, audio: FaFileAudio, video: FaFileVideo };

const FileDropzone = ({ field, value, initialValue, onChange, onError, disabled, invalid, describedBy }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const isNewFile = value instanceof File;
  const storedUrl = typeof value === 'string' ? safeUrl(value) : '';
  const isPicture = field.kind === 'picture';

  // Preview for a newly chosen picture; the object URL is revoked when replaced
  const previewUrl = useMemo(() => (isNewFile && value.type.startsWith('image/') ? URL.createObjectURL(value) : ''), [isNewFile, value]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  // Clear the native input whenever the value is reset
  useEffect(() => {
    if (!isNewFile && inputRef.current) inputRef.current.value = '';
  }, [isNewFile]);

  const accept = [...(field.accept || []), ...(field.extensions || []).map((e) => `.${e}`)].join(',');
  const Icon = KIND_ICONS[field.kind] || FaFileAlt;

  const handleFile = (file) => {
    if (!file) return;
    const error = validateFile(field, file);
    if (error) {
      onError(error);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onChange(file);
  };

  const hiddenInput = (
    <input
      ref={inputRef}
      id={`field-${field.name}`}
      type="file"
      accept={accept}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => handleFile(e.target.files?.[0])}
    />
  );

  /* ---- a file is chosen or already stored ---- */
  if (isNewFile || storedUrl) {
    const thumb = isNewFile ? previewUrl : isPicture ? storedUrl : '';
    return (
      <div className={styles.fileCard}>
        {thumb ? (
          <img src={thumb} alt="" className={styles.filePreview} referrerPolicy="no-referrer" />
        ) : (
          <span className={styles.fileIcon}>
            <Icon aria-hidden="true" />
          </span>
        )}
        <div className={styles.fileMeta}>
          {isNewFile ? (
            <>
              <strong title={value.name}>{value.name}</strong>
              <small>{formatBytes(value.size)} · will be uploaded when you save</small>
            </>
          ) : (
            <>
              <strong>Current {isPicture ? 'picture' : 'file'}</strong>
              <a href={storedUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                Open <FaExternalLinkAlt aria-hidden="true" />
              </a>
            </>
          )}
        </div>
        <div className={styles.fileActions}>
          <label className={styles.fileAction} title="Replace">
            <FaExchangeAlt aria-hidden="true" />
            <span className="sr-only">Replace {field.label}</span>
            {hiddenInput}
          </label>
          {(isNewFile || field.removable !== false) && (
            <button
              type="button"
              className={styles.fileAction}
              onClick={() => onChange(isNewFile && typeof initialValue === 'string' ? initialValue : null)}
              disabled={disabled}
              title={isNewFile ? 'Undo' : 'Remove'}
              aria-label={isNewFile ? `Undo new ${field.label}` : `Remove ${field.label}`}
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---- nothing chosen ---- */
  return (
    <label
      className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${invalid ? styles.dropzoneInvalid : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <FaCloudUploadAlt aria-hidden="true" />
      <span>
        <strong>Click to choose</strong> or drag a file here
      </span>
      {field.hint && <small>{field.hint}</small>}
      {hiddenInput}
    </label>
  );
};

export default FileDropzone;
