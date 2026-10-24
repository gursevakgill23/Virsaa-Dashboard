/**
 * ContentForm — add or edit one item of any section.
 *
 *   No itemId  → "New …": POST <endpoint>   (Form tab, or JSON tab for bulk add)
 *   itemId     → "Edit …": GET <endpoint><id>/ to fill the form,
 *                PATCH <endpoint><id>/ with only the fields that changed
 *
 * Files go as multipart/form-data with an upload progress bar; everything else
 * as JSON. Errors from Django appear under the matching field. Events that
 * repeat a calendar day (409) can be added anyway after a confirmation.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCode, FaWpforms, FaCloudUploadAlt, FaUndo, FaMagic, FaSave, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { api, getErrorMessage, getFieldErrors } from '../../api/client';
import { ENV } from '../../config/env';
import useChoices, { refreshChoices } from '../../hooks/useChoices';
import {
  buildJsonExample,
  buildPayload,
  getInitialValues,
  isFieldVisible,
  parseJsonImport,
  pickJsonPayload,
  toRequestBody,
  validateValues,
  valuesFromItem,
  MAX_JSON_ITEMS,
} from '../../utils/contentForm';
import FormField from './FormField';
import pageStyles from '../../styles/Page.module.css';
import styles from './Form.module.css';

const ContentForm = ({ contentType, itemId, onSaved, onCancelEdit }) => {
  const mode = itemId ? 'edit' : 'create';
  const { choices, error: choicesError, reload: reloadChoices } = useChoices();

  const [values, setValues] = useState(() => getInitialValues(contentType));
  const [initial, setInitial] = useState(() => getInitialValues(contentType));
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonErrors, setJsonErrors] = useState([]);
  const abortRef = useRef(null);

  const endpoint = contentType.endpoint;
  const singular = contentType.singular.toLowerCase();
  const visibleFields = contentType.fields.filter((f) => isFieldVisible(f, values));
  const hasFiles = contentType.fields.some((f) => f.type === 'file');
  const jsonExample = useMemo(() => JSON.stringify(buildJsonExample(contentType), null, 2), [contentType]);

  const clearMessages = () => {
    setErrors({});
    setFormError('');
    setDuplicate(null);
  };

  /* ------------------------------------------------------------------ */
  /* Load the item when editing (or reset to empty when adding)          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    clearMessages();
    setTab('form');
    if (!itemId) {
      const empty = getInitialValues(contentType);
      setValues(empty);
      setInitial(empty);
      setItemError('');
      return undefined;
    }
    const controller = new AbortController();
    setItemLoading(true);
    setItemError('');
    api
      .get(`${endpoint}${itemId}/`, { signal: controller.signal })
      .then(({ data }) => {
        const loaded = valuesFromItem(contentType, data);
        setValues(loaded);
        setInitial(loaded);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setItemError(getErrorMessage(err, `Could not load this ${singular}.`));
      })
      .finally(() => {
        if (!controller.signal.aborted) setItemLoading(false);
      });
    return () => controller.abort();
  }, [contentType, endpoint, itemId, singular]);

  // Cancel an upload if the admin leaves the page; warn before closing the tab mid-upload
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!submitting) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [submitting]);

  /** Unsaved changes in edit mode (what PATCH would send). */
  const changes = useMemo(() => (mode === 'edit' ? buildPayload(contentType, values, { mode, initial }) : null), [contentType, values, mode, initial]);
  const changedCount = changes ? Object.keys(changes).length : 0;

  /* ------------------------------------------------------------------ */
  /* Field changes                                                       */
  /* ------------------------------------------------------------------ */
  const setFieldValue = (name, value) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      // A different arcade game needs different content and groups
      if (name === 'game_key' && contentType.key === 'arcade' && prev.game_key !== value) {
        next.data = {};
        next.group = '';
      }
      return next;
    });
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
    if (duplicate) setDuplicate(null);
  };

  const resetForm = () => {
    setValues(initial);
    clearMessages();
    setProgress(0);
  };

  /* ------------------------------------------------------------------ */
  /* Save (form tab)                                                     */
  /* ------------------------------------------------------------------ */
  const handleSubmit = async (event, extra = {}) => {
    event?.preventDefault();
    if (submitting) return;
    clearMessages();

    const validation = validateValues(contentType, values, { mode, initial });
    const first = Object.entries(validation).find(([, m]) => m);
    if (first) {
      setErrors(validation);
      toast.error(first[1]);
      document.getElementById(`field-${first[0]}`)?.focus();
      return;
    }

    const payload = buildPayload(contentType, values, { mode, initial, extra });
    if (mode === 'edit' && Object.keys(payload).length === 0) {
      toast.info('Nothing to save — no changes yet.');
      return;
    }

    const body = toRequestBody(payload);
    const isMultipart = body instanceof FormData;
    abortRef.current = new AbortController();
    setSubmitting(true);
    setProgress(0);

    try {
      const config = {
        signal: abortRef.current.signal,
        timeout: isMultipart ? ENV.UPLOAD_TIMEOUT_MS : ENV.REQUEST_TIMEOUT_MS,
        headers: isMultipart ? {} : { 'Content-Type': 'application/json' },
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      };
      const { data } = mode === 'edit' ? await api.patch(`${endpoint}${itemId}/`, body, config) : await api.post(endpoint, body, config);

      toast.success(mode === 'edit' ? `${contentType.singular} saved.` : `${contentType.singular} added.`);
      if (contentType.refreshChoices) refreshChoices();
      onSaved?.(data, mode);

      if (mode === 'edit') {
        const fresh = valuesFromItem(contentType, data);
        setValues(fresh);
        setInitial(fresh);
      } else {
        const empty = getInitialValues(contentType);
        setValues(empty);
        setInitial(empty);
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        toast.info('Upload cancelled.');
      } else if (error?.response?.status === 409 && error.response.data?.code === 'duplicate') {
        setDuplicate(error.response.data);
      } else {
        const fieldErrors = getFieldErrors(error);
        const { non_field_errors: general, ...rest } = fieldErrors;
        if (Object.keys(rest).length) setErrors(rest);
        if (general) setFormError(general);
        toast.error(getErrorMessage(error, `Could not save this ${singular}.`));
      }
    } finally {
      setSubmitting(false);
      abortRef.current = null;
    }
  };

  /* ------------------------------------------------------------------ */
  /* JSON tab — add one or many (text only, one request per item)       */
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
    let added = 0;
    const failures = [];
    for (let i = 0; i < items.length; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const { data } = await api.post(endpoint, pickJsonPayload(contentType, items[i]), { headers: { 'Content-Type': 'application/json' } });
        added += 1;
        onSaved?.(data, 'create');
      } catch (error) {
        failures.push(`Item ${i + 1}: ${getErrorMessage(error)}`);
      }
      setProgress(Math.round(((i + 1) / items.length) * 100));
    }
    setSubmitting(false);
    setJsonErrors(failures);
    if (added) {
      toast.success(`${added} added.`);
      if (contentType.refreshChoices) refreshChoices();
    }
    if (failures.length) toast.error(`${failures.length} couldn’t be added — see below.`);
    else setJsonText('');
  };

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
  const title = mode === 'edit' ? `Edit ${singular}` : `New ${singular}`;
  const showJsonTab = mode === 'create' && contentType.jsonImport !== false;
  const lockedForEdit = (field) => mode === 'edit' && field.lockOnEdit;
  const otherErrors = Object.entries(errors).filter(([name, message]) => message && !visibleFields.some((f) => f.name === name));

  return (
    <section className={`${pageStyles.card} ${pageStyles.fadeIn} ${mode === 'edit' ? styles.editing : ''}`} aria-labelledby="content-form-heading">
      <div className={pageStyles.cardHeader}>
        <div>
          <h2 id="content-form-heading" className={pageStyles.cardTitle}>
            {title}
          </h2>
          {mode === 'edit' && !itemLoading && (
            <p className={pageStyles.cardMeta}>{changedCount ? `${changedCount} unsaved change${changedCount === 1 ? '' : 's'}` : 'No changes yet'}</p>
          )}
        </div>
        {showJsonTab ? (
          <div className={pageStyles.tabs} role="tablist" aria-label="How to add">
            <button type="button" role="tab" aria-selected={tab === 'form'} className={`${pageStyles.tab} ${tab === 'form' ? pageStyles.tabActive : ''}`} onClick={() => setTab('form')} disabled={submitting}>
              <FaWpforms aria-hidden="true" /> Form
            </button>
            <button type="button" role="tab" aria-selected={tab === 'json'} className={`${pageStyles.tab} ${tab === 'json' ? pageStyles.tabActive : ''}`} onClick={() => setTab('json')} disabled={submitting}>
              <FaCode aria-hidden="true" /> JSON
            </button>
          </div>
        ) : (
          mode === 'edit' && (
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost} ${pageStyles.buttonSmall}`} onClick={onCancelEdit} disabled={submitting}>
              <FaTimes aria-hidden="true" /> Close
            </button>
          )
        )}
      </div>

      {choicesError && (
        <div className={pageStyles.errorBox} role="alert" style={{ marginBottom: 16 }}>
          <span>{choicesError}</span>
          <button type="button" className={styles.linkButton} onClick={reloadChoices}>
            Try again
          </button>
        </div>
      )}

      {itemError && (
        <div className={pageStyles.errorBox} role="alert">
          {itemError}
        </div>
      )}

      {itemLoading && (
        <div className={styles.grid} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.field}>
              <span className={pageStyles.skeleton} style={{ height: 12, width: '40%' }} />
              <span className={pageStyles.skeleton} style={{ height: 44 }} />
            </div>
          ))}
        </div>
      )}

      {!itemLoading && !itemError && tab === 'form' && (
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          {formError && (
            <div className={pageStyles.errorBox} role="alert">
              {formError}
            </div>
          )}

          <div className={styles.grid}>
            {visibleFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                value={values[field.name]}
                initialValue={initial[field.name]}
                values={values}
                choices={choices}
                error={errors[field.name]}
                onChange={(v) => setFieldValue(field.name, v)}
                onFieldError={(m) => setErrors((prev) => ({ ...prev, [field.name]: m }))}
                disabled={submitting}
                locked={lockedForEdit(field)}
              />
            ))}
          </div>

          {otherErrors.map(([name, message]) => (
            <p key={name} className={styles.error} role="alert">
              {name.replace(/_/g, ' ')}: {message}
            </p>
          ))}

          {/* An event that repeats one already on the calendar */}
          {duplicate && (
            <div className={styles.duplicateBox} role="alert">
              <FaExclamationTriangle aria-hidden="true" />
              <div>
                <p>{(duplicate.detail || 'This looks like something already on the calendar.').replace(/\s*Send allow_duplicate.*$/, '')}</p>
                <div className={styles.duplicateActions}>
                  <button type="button" className={`${pageStyles.button} ${pageStyles.buttonSmall}`} onClick={() => handleSubmit(null, { allow_duplicate: true })} disabled={submitting}>
                    Add it anyway
                  </button>
                  <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost} ${pageStyles.buttonSmall}`} onClick={() => setDuplicate(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {submitting && hasFiles && (
            <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              <span>{progress < 100 ? `Uploading… ${progress}%` : 'Processing on the server…'}</span>
            </div>
          )}

          <div className={styles.actions}>
            {submitting ? (
              <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={() => abortRef.current?.abort()}>
                Cancel
              </button>
            ) : (
              <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={resetForm} disabled={mode === 'edit' && !changedCount}>
                <FaUndo aria-hidden="true" /> {mode === 'edit' ? 'Undo changes' : 'Clear'}
              </button>
            )}
            <button type="submit" className={`${pageStyles.button} ${pageStyles.buttonGradient}`} disabled={submitting || (mode === 'edit' && !changedCount)}>
              {mode === 'edit' ? <FaSave aria-hidden="true" /> : <FaCloudUploadAlt aria-hidden="true" />}
              {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : `Add ${singular}`}
            </button>
          </div>
        </form>
      )}

      {tab === 'json' && showJsonTab && (
        <div className={styles.form}>
          <p className={styles.jsonIntro}>
            Paste one object, or a list of up to {MAX_JSON_ITEMS}, in the API’s format. Only this section’s fields are sent.
            {hasFiles && ' Files can’t go in JSON — add pictures, PDFs and recordings from the Form tab (or edit the item afterwards).'}
          </p>
          <label htmlFor="json-input" className="sr-only">
            JSON
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
          />
          {jsonErrors.length > 0 && (
            <ul className={styles.jsonErrors} role="alert">
              {jsonErrors.slice(0, 12).map((m) => (
                <li key={m}>{m}</li>
              ))}
              {jsonErrors.length > 12 && <li>…and {jsonErrors.length - 12} more.</li>}
            </ul>
          )}
          {submitting && (
            <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              <span>Adding… {progress}%</span>
            </div>
          )}
          <div className={styles.actions}>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={() => setJsonText(jsonExample)} disabled={submitting}>
              <FaMagic aria-hidden="true" /> Example
            </button>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGhost}`} onClick={formatJson} disabled={submitting || !jsonText}>
              Format
            </button>
            <button type="button" className={`${pageStyles.button} ${pageStyles.buttonGradient}`} onClick={handleJsonSubmit} disabled={submitting || !jsonText.trim()}>
              <FaCloudUploadAlt aria-hidden="true" /> {submitting ? 'Adding…' : 'Add from JSON'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContentForm;
