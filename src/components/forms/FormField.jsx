/**
 * FormField — renders one input from a field definition
 * (config/contentTypes.js) with its label, hint and error message.
 */
import React from 'react';
import FileDropzone from './FileDropzone';
import QuestionsBuilder from './QuestionsBuilder';
import ListEditor from './ListEditor';
import ArcadeDataEditor from './ArcadeDataEditor';
import { getFieldOptions } from '../../utils/contentForm';
import styles from './Form.module.css';

/** Types that always take the full row. */
const WIDE_TYPES = ['questions', 'file', 'list', 'json', 'arcadeData', 'multiselect'];

const FormField = ({ field, value, initialValue, error, onChange, onFieldError, disabled, choices, values, locked }) => {
  const id = `field-${field.name}`;
  const hintId = field.hint && field.type !== 'file' ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error);
  const isDisabled = disabled || locked;

  const common = {
    id,
    name: field.name,
    disabled: isDisabled,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    'aria-required': field.required || undefined,
  };
  const inputClass = `${styles.input} ${invalid ? styles.inputError : ''}`;
  const onText = (e) => onChange(e.target.value);

  const renderControl = () => {
    switch (field.type) {
      case 'textarea':
        return <textarea {...common} className={inputClass} rows={field.rows || 4} placeholder={field.placeholder} value={value ?? ''} onChange={onText} />;

      case 'gurmukhi':
        // Tagged as Punjabi so the browser uses a Gurmukhi font and keyboard
        return field.multiline ? (
          <textarea {...common} lang="pa" className={`${inputClass} ${styles.gurmukhi}`} rows={field.rows || 5} placeholder={field.placeholder || 'ਗੁਰਮੁਖੀ…'} value={value ?? ''} onChange={onText} />
        ) : (
          <input {...common} lang="pa" type="text" className={`${inputClass} ${styles.gurmukhi}`} placeholder={field.placeholder} value={value ?? ''} onChange={onText} />
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
            onChange={onText}
          />
        );

      case 'select': {
        const options = getFieldOptions(field, values, choices);
        const current = value ?? '';
        // Keep a stored value visible even if it isn't in the current option list
        const missing = current !== '' && !options.some((o) => o.value === current);
        return (
          <select {...common} className={inputClass} value={current} onChange={onText}>
            <option value="">{field.required ? 'Select…' : '— None —'}</option>
            {missing && <option value={current}>{current}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }

      case 'multiselect': {
        const options = getFieldOptions(field, values, choices);
        const selected = Array.isArray(value) ? value : [];
        const toggle = (v) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
        if (!options.length) return <p className={styles.listEmpty}>Nothing to choose yet.</p>;
        return (
          <div className={styles.chips} role="group" aria-labelledby={`${id}-label`}>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.chip} ${selected.includes(o.value) ? styles.chipOn : ''}`}
                aria-pressed={selected.includes(o.value)}
                onClick={() => toggle(o.value)}
                disabled={isDisabled}
              >
                {o.label}
              </button>
            ))}
          </div>
        );
      }

      case 'checkbox':
        return (
          <label className={styles.switchRow} htmlFor={id}>
            <input {...common} type="checkbox" className={styles.switchInput} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
            <span className={styles.switch} aria-hidden="true" />
            <span className={styles.switchLabel}>{field.label}</span>
          </label>
        );

      case 'file':
        return (
          <FileDropzone
            field={field}
            value={value}
            initialValue={initialValue}
            onChange={onChange}
            onError={onFieldError}
            disabled={isDisabled}
            invalid={invalid}
            describedBy={describedBy}
          />
        );

      case 'list':
        return <ListEditor field={field} value={value} onChange={onChange} disabled={isDisabled} />;

      case 'questions':
        return <QuestionsBuilder value={value} onChange={onChange} disabled={isDisabled} />;

      case 'arcadeData':
        return <ArcadeDataEditor gameKey={values.game_key} value={value} values={values} onChange={onChange} disabled={isDisabled} />;

      case 'json':
        return (
          <textarea
            {...common}
            className={`${inputClass} ${styles.code}`}
            rows={field.rows || 5}
            spellCheck={false}
            placeholder={field.placeholder}
            value={value ?? ''}
            onChange={onText}
          />
        );

      case 'datetime':
        return <input {...common} type="datetime-local" className={inputClass} value={value ?? ''} onChange={onText} />;

      case 'date':
      case 'time':
        return <input {...common} type={field.type} className={inputClass} value={value ?? ''} onChange={onText} />;

      case 'url':
        return (
          <input {...common} type="url" inputMode="url" autoComplete="off" spellCheck={false} className={inputClass} placeholder={field.placeholder || 'https://'} value={value ?? ''} onChange={onText} />
        );

      case 'text':
      default:
        return <input {...common} type="text" className={inputClass} maxLength={field.maxLength} placeholder={field.placeholder} value={value ?? ''} onChange={onText} />;
    }
  };

  const fullWidth = field.span === 'full' || WIDE_TYPES.includes(field.type);

  return (
    <div className={`${styles.field} ${fullWidth ? styles.fieldFull : ''}`}>
      {field.type !== 'checkbox' && (
        <label id={`${id}-label`} htmlFor={id} className={styles.label}>
          {field.label}
          {(field.required || field.requiredOnCreate) && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
          {locked && <span className={styles.lockedNote}>can’t be changed</span>}
        </label>
      )}

      {renderControl()}

      {hintId && (
        <small id={hintId} className={styles.hint}>
          {field.hint}
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
