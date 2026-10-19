/**
 * ContentUploadForm — the generic upload experience used by every content
 * type. Two modes:
 *   1. "Form"  — guided inputs built from the schema, with file uploads,
 *                live validation and an upload progress bar.
 *   2. "JSON"  — paste one object or an array (bulk import, text fields only).
 *
 * All values are validated client-side AND only schema-defined fields are
 * sent (pickSchemaValues), so pasted JSON cannot inject extra fields.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCode, FaWpforms, FaCloudUploadAlt, FaUndo, FaMagic } from 'react-icons/fa';
import axios from 'axios';
import { api, getErrorMessage, getFieldErrors } from '../../api/client';
import { ENV } from '../../config/env';
import useAuthors, { invalidateAuthorsCache } from '../../hooks/useAuthors';
import {
  buildJsonExample,
  buildRequestBody,
  getInitialValues,
  isFieldVisible,
  parseJsonImport,
  validateValues,
  MAX_JSON_ITEMS,
} from '../../utils/contentForm';
import FormField from './FormField';
import pageStyles from '../../styles/Page.module.css';
import styles from './Form.module.css';

const ContentUploadForm = ({ contentType, onCreated }) => {
  const [mode, setMode] = useState('form');
  const [values, setValues] = useState(() => getInitialValues(contentType));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jsonText, setJsonText] = useState('');
  const [jsonErrors, setJsonErrors] = useState([]);
  const abortRef = useRef(null);

  const needsAuthors = contentType.fields.some((f) => f.type === 'author');
  const authors = useAuthors(needsAuthors);

  const hasFiles = contentType.fields.some((f) => f.type === 'file');
  const visibleFields = contentType.fields.filter((field) => isFieldVisible(field, values));
  const jsonExample = useMemo(() => JSON.stringify(buildJsonExample(contentType), null, 2), [contentType]);

  // Reset everything when switching to a different content type.
  useEffect(() => {
    setValues(getInitialValues(contentType));
    setErrors({});
    setJsonText('');
    setJsonErrors([]);
    setMode('form');
  }, [contentType]);

  // Cancel an in-flight upload if the admin leaves the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Warn before closing the tab mid-upload.
  useEffect(() => {
    if (!submitting) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [submitting]);

  /* ------------------------------------------------------------------ */
  /* Field changes                                                       */
  /* ------------------------------------------------------------------ */
  const setFieldValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const setFieldError = (name, message) => setErrors((prev) => ({ ...prev, [name]: message }));

  const resetForm = () => {
    setValues(getInitialValues(contentType));
    setErrors({});
    setProgress(0);
  };

  /* ------------------------------------------------------------------ */
  /* Submit (form mode)                                                  */
  /* ------------------------------------------------------------------ */
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validation = validateValues(contentType, values);
    const firstError = Object.entries(validation).find(([, message]) => message);
    if (firstError) {
      setErrors(validation);
      toast.error(firstError[1]);
      // Move focus to the first invalid field for keyboard/screen-reader users.
      document.getElementById(`field-${firstError[0]}`)?.focus();
      return;
    }

    const body = buildRequestBody(contentType, values);
    const isMultipart = body instanceof FormData;
    abortRef.current = new AbortController();

    setSubmitting(true);
    setProgress(0);
    try {
      const { data } = await api.post(contentType.endpoints.create, body, {
        signal: abortRef.current.signal,
        timeout: isMultipart ? ENV.UPLOAD_TIMEOUT_MS : ENV.REQUEST_TIMEOUT_MS,
        // Let the browser set the multipart boundary itself.
        headers: isMultipart ? {} : { 'Content-Type': 'application/json' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success(`${contentType.singular} uploaded successfully.`);
      if (contentType.key === 'authors') invalidateAuthorsCache();
      resetForm();
      onCreated?.(data);
    } catch (error) {
      if (axios.isCancel(error)) {
        toast.info('Upload cancelled.');
      } else {
        const fieldErrors = getFieldErrors(error);
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
        toast.error(getErrorMessage(error, `Could not upload this ${contentType.singular.toLowerCase()}.`));
      }
    } finally {
      setSubmitting(false);
      abortRef.current = null;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Submit (JSON mode) — items are sent one at a time                  */
  /* ------------------------------------------------------------------ */
  const handleJsonSubmit = async () => {
    if (submitting) return;
    const { items, errors: parseErrors } = parseJsonImport(contentType, jsonText);
    setJsonErrors(parseErrors);
    if (parseErrors.length) {
      toast.error(parseErrors[0]);
      return;
    }

    setSubmitting(true);
    setProgress(0);
    let created = 0;
    const failures = [];

    for (let i = 0; i < items.length; i += 1) {
      try {
        const body = buildRequestBody(contentType, items[i], { forceJson: true });
        // eslint-disable-next-line no-await-in-loop
        const { data } = await api.post(contentType.endpoints.create, body, {
          headers: { 'Content-Type': 'application/json' },
        });
        created += 1;
        onCreated?.(data);
      } catch (error) {
        failures.push(`Item ${i + 1}: ${getErrorMessage(error)}`);
      }
      setProgress(Math.round(((i + 1) / items.length) * 100));
    }

    setSubmitting(false);
    setJsonErrors(failures);
    if (created) {
      toast.success(`${created} ${created === 1 ? contentType.singular.toLowerCase() : 'items'} imported.`);
      if (contentType.key === 'authors') invalidateAuthorsCache();
    }
    if (failures.length) toast.error(`${failures.length} item(s) failed — see details below.`);
    else setJsonText('');
  };

  /** Pretty-prints the JSON box, or reports why it can't. */
  const formatJson = () => {
    try {
      setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2));
      setJsonErrors([]);
    } catch (error) {
      setJsonErrors([`Invalid JSON: ${error.message}`]);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <section className={`${pageStyles.card} ${pageStyles.fadeIn}`} aria-labelledby="upload-heading">
      <div className={pageStyles.cardHeader}>
        <h2 id="upload-heading" className={pageStyles.cardTitle}>
          New {contentType.singular.toLowerCase()}
        </h2>
        <div className={pageStyles.tabs} role="tablist" aria-label="Upload mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'form'}
            className={`${pageStyles.tab} ${mode === 'form' ? pageStyles.tabActive : ''}`}
            onClick={() => setMode('form')}
            disabled={submitting}
          >
            <FaWpforms aria-hidden="true" /> Form
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'json'}
            className={`${pageStyles.tab} ${mode === 'json' ? pageStyles.tabActive : ''}`}
            onClick={() => setMode('json')}
            disabled={submitting}
          >
            <FaCode aria-hidden="true" /> JSON
          </button>
        </div>
      </div>

      {needsAuthors && authors.error && mode === 'form' && (
        <div className={pageStyles.errorBox} role="alert" style={{ marginBottom: 16 }}>
          {authors.error}
        </div>
      )}

      {mode === 'form' ? (
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.grid}>
            {visibleFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                value={values[field.name]}
                error={errors[field.name]}
                onChange={(value) => setFieldValue(field.name, value)}
                onFieldError={(message) => setFieldError(field.name, message)}
                disabled={submitting}
                authors={authors}
              />
            ))}
          </div>

          {/* Errors the API returned for fields not shown in the form */}
          {Object.entries(errors)
            .filter(([name, message]) => message && !visibleFields.some((f) => f.name === name))
            .map(([name, message]) => (
              <p key={name} className={styles.error} role="alert">
                {name.replace(/_/g, ' ')}: {message}
              </p>
            ))}

          {submitting && hasFiles && (
            <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              <span>{progress < 100 ? `Uploading… ${progress}%` : 'Processing on server…'}</span>
            </div>
          )}

          <div className={styles.actions}>
            {submitting ? (
              <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={() => abortRef.current?.abort()}>
                Cancel upload
              </button>
            ) : (
              <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={resetForm}>
                <FaUndo aria-hidden="true" /> Clear
              </button>
            )}
            <button type="submit" className={`${pageStyles.button} ${pageStyles.buttonGradient}`} disabled={submitting}>
              <FaCloudUploadAlt aria-hidden="true" />
              {submitting ? 'Uploading…' : `Upload ${contentType.singular.toLowerCase()}`}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.form}>
          <p className={styles.jsonIntro}>
            Paste one object, or an array of up to {MAX_JSON_ITEMS} objects for bulk import. Only the fields listed in the
            form are sent; anything else is ignored.
            {hasFiles && ' Files cannot be sent as JSON — upload covers, PDFs and audio from the Form tab.'}
          </p>
          <label htmlFor="json-input" className="sr-only">
            JSON data
          </label>
          <textarea
            id="json-input"
            className={`${styles.input} ${styles.jsonInput}`}
            rows={14}
            spellCheck={false}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonErrors([]);
            }}
            placeholder={jsonExample}
            disabled={submitting}
            maxLength={2000000}
          />

          {jsonErrors.length > 0 && (
            <ul className={styles.jsonErrors} role="alert">
              {jsonErrors.slice(0, 12).map((message) => (
                <li key={message}>{message}</li>
              ))}
              {jsonErrors.length > 12 && <li>…and {jsonErrors.length - 12} more.</li>}
            </ul>
          )}

          {submitting && (
            <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              <span>Importing… {progress}%</span>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={() => setJsonText(jsonExample)} disabled={submitting}>
              <FaMagic aria-hidden="true" /> Insert example
            </button>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={formatJson} disabled={submitting || !jsonText}>
              Format
            </button>
            <button
              type="button"
              className={`${pageStyles.button} ${pageStyles.buttonGradient}`}
              onClick={handleJsonSubmit}
              disabled={submitting || !jsonText.trim()}
            >
              <FaCloudUploadAlt aria-hidden="true" /> {submitting ? 'Importing…' : 'Import JSON'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContentUploadForm;
