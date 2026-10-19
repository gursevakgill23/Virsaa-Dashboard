/**
 * FormField — renders one input from a schema field definition
 * (see config/contentTypes.js) with its label, hint and error message.
 */
import React from 'react';
import { FaRedo } from 'react-icons/fa';
import FileDropzone from './FileDropzone';
import QuestionsBuilder from './QuestionsBuilder';
import styles from './Form.module.css';

/** Normalises select options to { value, label }. */
const toOptions = (options = []) =>
  options.map((option) => (typeof option === 'object' ? option : { value: option, label: option }));

const FormField = ({ field, value, error, onChange, onFieldError, disabled, authors }) => {
  const id = `field-${field.name}`;
  // File fields render their hint inside the dropzone, so they get no hint id.
  const hintId = field.hint && field.type !== 'file' ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error);

  const common = {
    id,
    name: field.name,
    disabled,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    'aria-required': field.required || undefined,
  };

  const inputClass = `${styles.input} ${invalid ? styles.inputError : ''}`;

  /** Picks the right control for the field type. */
  const renderControl = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...common}
            className={inputClass}
            rows={field.rows || 4}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'gurmukhi':
        // Same as text/textarea, but tagged as Punjabi so the browser picks a
        // Gurmukhi-capable font and spell-checker.
        return field.multiline ? (
          <textarea
            {...common}
            lang="pa"
            className={`${inputClass} ${styles.gurmukhi}`}
            rows={field.rows || 6}
            maxLength={field.maxLength}
            placeholder={field.placeholder || 'ਗੁਰਮੁਖੀ…'}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            {...common}
            lang="pa"
            type="text"
            className={`${inputClass} ${styles.gurmukhi}`}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            {...common}
            type="number"
            inputMode={field.step === 1 ? 'numeric' : 'decimal'}
            className={inputClass}
            min={field.min}
            max={field.max}
            step={field.step ?? 'any'}
            placeholder={field.placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'select':
        return (
          <select {...common} className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {toOptions(field.options).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'author':
        return (
          <div className={styles.inlineRow}>
            <select
              {...common}
              className={inputClass}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || authors.loading}
            >
              <option value="">{authors.loading ? 'Loading authors…' : 'Select an author'}</option>
              {authors.authors.map((author) => (
                <option key={author.id} value={String(author.id)}>
                  {author.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.iconSquare}
              onClick={authors.reload}
              disabled={disabled || authors.loading}
              aria-label="Reload authors"
              title="Reload authors"
            >
              <FaRedo />
            </button>
          </div>
        );

      case 'checkbox':
        return (
          <label className={styles.switchRow} htmlFor={id}>
            <input
              {...common}
              type="checkbox"
              className={styles.switchInput}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className={styles.switch} aria-hidden="true" />
            <span className={styles.switchLabel}>{field.label}</span>
          </label>
        );

      case 'file':
        return (
          <FileDropzone
            field={field}
            value={value}
            onChange={onChange}
            onError={onFieldError}
            disabled={disabled}
            invalid={invalid}
            describedBy={describedBy}
          />
        );

      case 'questions':
        return <QuestionsBuilder value={value} onChange={onChange} disabled={disabled} />;

      case 'date':
      case 'time':
      case 'url':
        return (
          <input
            {...common}
            type={field.type}
            className={inputClass}
            placeholder={field.placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            {...(field.type === 'url' ? { inputMode: 'url', autoComplete: 'off', spellCheck: false } : {})}
          />
        );

      case 'tags':
      case 'text':
      default:
        return (
          <input
            {...common}
            type="text"
            className={inputClass}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  const fullWidth = field.span === 'full' || field.type === 'questions' || field.type === 'file';

  return (
    <div className={`${styles.field} ${fullWidth ? styles.fieldFull : ''}`}>
      {field.type !== 'checkbox' && (
        <label htmlFor={id} className={styles.label}>
          {field.label}
          {field.required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {renderControl()}

      {field.hint && field.type !== 'file' && (
        <small id={hintId} className={styles.hint}>
          {field.hint}
        </small>
      )}
      {field.type === 'textarea' && field.maxLength && typeof value === 'string' && value.length > field.maxLength * 0.8 && (
        <small className={styles.counter}>
          {value.length.toLocaleString()} / {field.maxLength.toLocaleString()}
        </small>
      )}
      {error && (
        <small id={errorId} className={styles.error} role="alert">
          {error}
        </small>
      )}
    </div>
  );
};

export default FormField;
