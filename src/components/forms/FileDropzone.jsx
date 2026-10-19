/**
 * FileDropzone — drag-and-drop (or click) file picker with validation,
 * image preview and file details. Styled like the web app's dropzone.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaFileAudio, FaFilePdf, FaFileArchive, FaTimes } from 'react-icons/fa';
import { validateFile } from '../../utils/contentForm';
import styles from './Form.module.css';

/** 1536000 → "1.5 MB" */
export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const iconFor = (file) => {
  if (!file) return FaFileAlt;
  if (file.type === 'application/pdf') return FaFilePdf;
  if (file.type.startsWith('audio/')) return FaFileAudio;
  if (file.name.toLowerCase().endsWith('.zip')) return FaFileArchive;
  return FaFileAlt;
};

const FileDropzone = ({ field, value, onChange, onError, disabled, invalid, describedBy }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const isImage = value instanceof File && value.type.startsWith('image/');

  // Create a preview URL for images and revoke it when no longer needed
  // (prevents memory leaks from object URLs).
  const previewUrl = useMemo(() => (isImage ? URL.createObjectURL(value) : ''), [isImage, value]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  // Clear the native input when the form resets the value to null.
  useEffect(() => {
    if (!value && inputRef.current) inputRef.current.value = '';
  }, [value]);

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

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFile(event.dataTransfer.files?.[0]);
  };

  const FileIcon = iconFor(value);
  const acceptAttr = [...(field.accept || []), ...(field.extensions || []).map((e) => `.${e}`)].join(',');

  if (value instanceof File) {
    return (
      <div className={styles.fileCard}>
        {isImage ? (
          <img src={previewUrl} alt="Selected preview" className={styles.filePreview} />
        ) : (
          <span className={styles.fileIcon}>
            <FileIcon aria-hidden="true" />
          </span>
        )}
        <div className={styles.fileMeta}>
          <strong title={value.name}>{value.name}</strong>
          <small>{formatBytes(value.size)}</small>
        </div>
        <button
          type="button"
          className={styles.fileRemove}
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label={`Remove ${value.name}`}
        >
          <FaTimes />
        </button>
      </div>
    );
  }

  return (
    <label
      className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${invalid ? styles.dropzoneInvalid : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <FaCloudUploadAlt aria-hidden="true" />
      <span>
        <strong>Click to choose</strong> or drag a file here
      </span>
      {field.hint && <small>{field.hint}</small>}
      <input
        ref={inputRef}
        id={`field-${field.name}`}
        type="file"
        accept={acceptAttr}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </label>
  );
};

export default FileDropzone;
