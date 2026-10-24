/**
 * Pure helpers behind every content form (no React here):
 *
 *   getInitialValues(type)              empty form
 *   valuesFromItem(type, item)          API item → form values (edit mode)
 *   validateValues(type, values, opts)  client-side checks (the server checks again)
 *   buildPayload(type, values, opts)    form values → what to send
 *                                       create: every filled field
 *                                       edit:   only the fields that changed (PATCH)
 *   toRequestBody(payload)              JSON object, or FormData when a file is sent
 *   parseJsonImport / pickJsonPayload   the JSON tab (bulk add, no files)
 */
import { ENV } from '../config/env';
import { arcadeFromApi, arcadeToApi, validateArcade } from '../config/arcade';

/* ---------------------------------------------------------------------------
 * Options
 * ------------------------------------------------------------------------- */

/**
 * Normalises any option list to [{ value, label }]. Accepts the shapes
 * /choices/ returns: { value, label }, { id, name } and { slug, title }.
 */
export const toOptions = (list) =>
  (Array.isArray(list) ? list : [])
    .map((o) => {
      if (o === null || o === undefined) return null;
      if (typeof o !== 'object') return { value: String(o), label: String(o) };
      if ('value' in o) return { ...o, value: String(o.value), label: String(o.label ?? o.value) };
      if ('slug' in o && 'title' in o) return { value: String(o.slug), label: String(o.title) };
      if ('id' in o) return { value: String(o.id), label: String(o.name ?? o.title ?? `#${o.id}`) };
      return null;
    })
    .filter(Boolean);

/** The options a select shows: live from /choices/, else the field's fallback list. */
export const getFieldOptions = (field, values, choices) => {
  if (field.optionsFn) return toOptions(field.optionsFn(values || {}, choices || {}));
  const live = field.optionsFrom ? choices?.[field.optionsFrom] : undefined;
  if (Array.isArray(live) && (live.length || !field.options)) return toOptions(live);
  return toOptions(field.options);
};

/* ---------------------------------------------------------------------------
 * Visibility & empty values
 * ------------------------------------------------------------------------- */

/** True when a field's `showWhen` rule matches the current values. */
export const isFieldVisible = (field, values) => {
  if (!field.showWhen) return true;
  return field.showWhen.in.includes(values[field.showWhen.field]);
};

/** A blank quiz question: four answers, the first marked right. */
export const createEmptyQuestion = () => ({
  text: '',
  points: 1,
  explanation: '',
  options: [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
});

const emptyValue = (field) => {
  const def = typeof field.defaultValue === 'function' ? field.defaultValue() : field.defaultValue;
  switch (field.type) {
    case 'checkbox':
      return def ?? false;
    case 'file':
      return null;
    case 'list':
    case 'multiselect':
      return [];
    case 'questions':
      return [createEmptyQuestion()];
    case 'arcadeData':
      return {};
    default:
      return def ?? '';
  }
};

/** The empty form for a content type. */
export const getInitialValues = (type) => Object.fromEntries(type.fields.map((f) => [f.name, emptyValue(f)]));

/* ---------------------------------------------------------------------------
 * API → form (edit mode)
 * ------------------------------------------------------------------------- */
const pad = (n) => String(n).padStart(2, '0');

/** ISO date-time → "YYYY-MM-DDTHH:mm" in the browser's time zone (for <input type="datetime-local">). */
const toLocalInput = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const asText = (v) => (v === null || v === undefined ? '' : String(v));

const rowFromApi = (field, row) =>
  Object.fromEntries(
    field.itemFields.map((col) => {
      const v = row?.[col.name];
      if (col.type === 'checkbox') return [col.name, Boolean(v)];
      if (col.type === 'textarea' && Array.isArray(v)) return [col.name, v.join('\n\n')];
      return [col.name, asText(v)];
    })
  );

const questionFromApi = (q) => {
  const options = (Array.isArray(q?.options) ? q.options : []).map((o) => ({
    text: asText(o?.text ?? o),
    is_correct: Boolean(o?.is_correct),
  }));
  while (options.length < 2) options.push({ text: '', is_correct: false });
  return {
    text: asText(q?.text),
    points: q?.points ?? 1,
    explanation: asText(q?.explanation),
    image: asText(q?.image),
    time_limit_seconds: asText(q?.time_limit_seconds),
    options,
  };
};

const fromApi = (field, value, item) => {
  switch (field.type) {
    case 'checkbox':
      return Boolean(value);
    case 'file':
      return typeof value === 'string' && value ? value : null;
    case 'date':
      return value ? String(value).slice(0, 10) : '';
    case 'time':
      return value ? String(value).slice(0, 5) : '';
    case 'datetime':
      return value ? toLocalInput(value) : '';
    case 'list':
      return Array.isArray(value) ? value.map((row) => rowFromApi(field, row)) : [];
    case 'multiselect':
      return Array.isArray(value) ? value.map(String) : [];
    case 'questions':
      return Array.isArray(value) && value.length ? value.map(questionFromApi) : [createEmptyQuestion()];
    case 'json':
      return value && typeof value === 'object' && Object.keys(value).length ? JSON.stringify(value, null, 2) : '';
    case 'arcadeData':
      return arcadeFromApi(item?.game_key, value);
    default:
      return asText(value);
  }
};

/** An item from GET <section>/<id>/ → form values. */
export const valuesFromItem = (type, item) =>
  Object.fromEntries(type.fields.map((f) => [f.name, fromApi(f, item?.[f.name], item)]));

/* ---------------------------------------------------------------------------
 * Form → API
 * ------------------------------------------------------------------------- */
const rowToApi = (field, row) => {
  const out = {};
  field.itemFields.forEach((col) => {
    const v = row?.[col.name];
    if (col.type === 'checkbox') out[col.name] = Boolean(v);
    else if (col.type === 'number') {
      const text = asText(v).trim();
      if (text !== '') out[col.name] = Number(text);
    } else {
      const text = asText(v).trim();
      if (text !== '') out[col.name] = text;
    }
  });
  return out;
};

/** A row counts as empty when none of its text/number columns are filled in. */
const rowIsEmpty = (field, row) =>
  field.itemFields.every((col) => col.type === 'checkbox' || asText(row?.[col.name]).trim() === '');

const questionsToApi = (list) =>
  (Array.isArray(list) ? list : []).map((q) => {
    const out = {
      text: asText(q.text).trim(),
      points: Math.max(1, Number.parseInt(q.points, 10) || 1),
      explanation: asText(q.explanation).trim(),
      options: (q.options || [])
        .filter((o) => asText(o.text).trim())
        .map((o) => ({ text: asText(o.text).trim(), is_correct: Boolean(o.is_correct) })),
    };
    if (asText(q.image).trim()) out.image = asText(q.image).trim();
    if (asText(q.time_limit_seconds).trim() !== '') out.time_limit_seconds = Number(q.time_limit_seconds);
    return out;
  });

/** One field's form value → the value sent to the API. */
const toApi = (field, value, values) => {
  switch (field.type) {
    case 'checkbox':
      return Boolean(value);
    case 'file':
      return value; // File | string (unchanged URL) | null
    case 'number': {
      const text = asText(value).trim();
      return text === '' ? null : Number(text);
    }
    case 'select': {
      if (value === '' || value === null || value === undefined) return null;
      return field.numeric ? Number(value) : value;
    }
    case 'date':
    case 'time':
    case 'datetime':
      return value ? value : null;
    case 'list':
      return (Array.isArray(value) ? value : []).filter((row) => !rowIsEmpty(field, row)).map((row) => rowToApi(field, row));
    case 'multiselect':
      return Array.isArray(value) ? value : [];
    case 'questions':
      return questionsToApi(value);
    case 'json': {
      const text = asText(value).trim();
      if (!text) return {};
      try {
        return JSON.parse(text);
      } catch {
        return text; // validation reports it before sending
      }
    }
    case 'arcadeData':
      return arcadeToApi(values.game_key, value);
    default:
      return asText(value).trim();
  }
};

const isBlank = (v) =>
  v === null ||
  v === undefined ||
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !(v instanceof File) && !Array.isArray(v) && Object.keys(v).length === 0);

/**
 * What to send.
 * @param {'create'|'edit'} opts.mode
 * @param {object} opts.initial  values the item was loaded with (edit mode)
 * @param {object} opts.extra    extra keys, e.g. { allow_duplicate: true }
 */
export const buildPayload = (type, values, { mode = 'create', initial = {}, extra = {} } = {}) => {
  const out = {};
  type.fields.forEach((field) => {
    if (field.sendToApi === false) return;
    if (!isFieldVisible(field, values)) return;
    if (mode === 'edit' && field.lockOnEdit) return;

    const current = toApi(field, values[field.name], values);

    if (field.type === 'file') {
      if (current instanceof File) out[field.name] = current;
      // Removing a file that was there: send it empty
      else if (mode === 'edit' && current === null && typeof initial[field.name] === 'string') out[field.name] = null;
      return;
    }

    if (mode === 'create') {
      if (field.type === 'checkbox' || !isBlank(current)) out[field.name] = current;
      return;
    }

    // Edit: only what changed since the item was loaded
    const before = toApi(field, initial[field.name], initial);
    if (JSON.stringify(current) !== JSON.stringify(before)) out[field.name] = current;
  });
  return { ...out, ...extra };
};

/**
 * JSON for plain data, multipart FormData when a file is included. In a form,
 * lists/objects go as JSON text, null as "" (Django reads "" as empty/removed)
 * and booleans as "true"/"false".
 */
export const toRequestBody = (payload) => {
  const hasFile = Object.values(payload).some((v) => v instanceof File);
  if (!hasFile) return payload;
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value instanceof File) form.append(key, value, value.name);
    else if (value === null || value === undefined) form.append(key, '');
    else if (typeof value === 'boolean') form.append(key, value ? 'true' : 'false');
    else if (typeof value === 'object') form.append(key, JSON.stringify(value));
    else form.append(key, String(value));
  });
  return form;
};

/* ---------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------- */
const fileExtension = (name) => {
  const parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

/** Type (extension + MIME) and size check for an uploaded File. Returns a message or ''. */
export const validateFile = (field, file) => {
  if (!(file instanceof File)) return 'Please choose a file.';
  if (file.size === 0) return 'This file is empty.';
  const limitMB = Math.min(field.maxMB || ENV.MAX_UPLOAD_MB, ENV.MAX_UPLOAD_MB);
  if (file.size > limitMB * 1024 * 1024) return `This file is too big. The most is ${limitMB} MB.`;
  const allowed = (field.extensions || []).map((e) => `.${e}`).join(', ');
  if (field.extensions?.length && !field.extensions.includes(fileExtension(file.name))) return `Use ${allowed}.`;
  if (field.accept?.length && file.type && !field.accept.includes(file.type)) return `Use ${allowed || field.accept.join(', ')}.`;
  return '';
};

const isHttpUrl = (value, httpsOnly) => {
  try {
    const url = new URL(String(value).trim());
    return httpsOnly ? url.protocol === 'https:' : url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const validateQuestions = (list) => {
  if (!Array.isArray(list) || list.length === 0) return 'Add at least one question.';
  for (let i = 0; i < list.length; i += 1) {
    const q = list[i] || {};
    const filled = (q.options || []).filter((o) => asText(o.text).trim());
    if (!asText(q.text).trim()) return `Question ${i + 1}: write the question.`;
    if (filled.length < 2) return `Question ${i + 1}: give at least two answers.`;
    if (!filled.some((o) => o.is_correct)) return `Question ${i + 1}: mark the right answer.`;
    if (asText(q.image).trim() && !isHttpUrl(q.image, true)) return `Question ${i + 1}: the picture link must start with https://.`;
  }
  return '';
};

const checkText = (field, value) => {
  const text = asText(value).trim();
  if (field.maxLength && text.length > field.maxLength) return `${field.label} must be ${field.maxLength} characters or fewer.`;
  if (field.pattern && text && !field.pattern.test(text)) return field.patternMessage || `${field.label} isn’t in the right format.`;
  return '';
};

const checkNumber = (field, value) => {
  const text = asText(value).trim();
  if (text === '') return '';
  const n = Number(text);
  if (!Number.isFinite(n)) return `${field.label} must be a number.`;
  if (field.min !== undefined && n < field.min) return `${field.label} must be at least ${field.min}.`;
  if (field.max !== undefined && n > field.max) return `${field.label} must be at most ${field.max}.`;
  if (field.step === 1 && !Number.isInteger(n)) return `${field.label} must be a whole number.`;
  return '';
};

/**
 * Client-side checks. Returns { fieldName: message } (empty when valid).
 * In edit mode a required file is satisfied by the file already stored
 * (pass `initial`, the values the item was loaded with).
 */
export const validateValues = (type, values, { mode = 'create', initial = {} } = {}) => {
  const errors = {};

  type.fields.forEach((field) => {
    if (!isFieldVisible(field, values)) return;
    const value = values[field.name];
    const required = field.required || (mode === 'create' && field.requiredOnCreate);
    const label = field.label;
    let message = '';

    switch (field.type) {
      case 'checkbox':
        break;
      case 'file':
        if (value instanceof File) message = validateFile(field, value);
        else if (required && !(mode === 'edit' && typeof value === 'string')) message = `${label} is needed.`;
        // A file that was stored can be replaced but (for some fields) not removed
        else if (mode === 'edit' && field.removable === false && value === null && typeof initial[field.name] === 'string') message = `${label} can be replaced but not removed.`;
        break;
      case 'list': {
        const rows = (Array.isArray(value) ? value : []).filter((row) => !rowIsEmpty(field, row));
        if (required && rows.length === 0) message = `Add at least one ${label.toLowerCase().replace(/s$/, '')}.`;
        rows.some((row, i) =>
          field.itemFields.some((col) => {
            const v = asText(row[col.name]).trim();
            if (col.required && !v && col.type !== 'checkbox') message = `${label} ${i + 1}: ${col.label.toLowerCase()} is needed.`;
            else if (col.type === 'url' && v && !isHttpUrl(v, col.httpsOnly)) message = `${label} ${i + 1}: the link must start with ${col.httpsOnly ? 'https://' : 'http(s)://'}.`;
            else if (col.type === 'number' && v && !Number.isFinite(Number(v))) message = `${label} ${i + 1}: ${col.label.toLowerCase()} must be a number.`;
            else if (col.pattern && v && !col.pattern.test(v)) message = `${label} ${i + 1}: ${col.label.toLowerCase()} isn’t in the right format.`;
            return Boolean(message);
          })
        );
        break;
      }
      case 'questions':
        message = validateQuestions(value);
        break;
      case 'json': {
        const text = asText(value).trim();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) message = `${label} must be a JSON object, e.g. { "grid": 10 }.`;
          } catch (err) {
            message = `${label}: invalid JSON (${err.message}).`;
          }
        }
        break;
      }
      case 'arcadeData':
        message = validateArcade(values.game_key, value, values);
        break;
      case 'multiselect':
        if (required && (!Array.isArray(value) || value.length === 0)) message = `Choose at least one ${label.toLowerCase()}.`;
        break;
      default: {
        const blank = asText(value).trim() === '';
        if (required && blank) message = `${label} is needed.`;
        else if (!blank) {
          if (field.type === 'number') message = checkNumber(field, value);
          else if (field.type === 'url') message = isHttpUrl(value, field.httpsOnly) ? '' : `Enter a full link starting with https://.`;
          else message = checkText(field, value);
        }
      }
    }
    if (message) errors[field.name] = message;
  });

  // Dates and years in the right order
  if (!errors.died && values.born && values.died && values.died < values.born) errors.died = 'This is before the date of birth.';
  if (!errors.end_date && values.start_date && values.end_date && values.end_date < values.start_date) errors.end_date = 'The end date can’t be before the start date.';
  if (!errors.end_year && asText(values.start_year) && asText(values.end_year) && Number(values.end_year) < Number(values.start_year)) {
    errors.end_year = 'The end year can’t be before the start year.';
  }
  return errors;
};

/* ---------------------------------------------------------------------------
 * JSON import (create only, no files)
 * ------------------------------------------------------------------------- */
export const MAX_JSON_ITEMS = 100;

/** Fields the JSON tab may send (no files, no UI-only helpers). */
const jsonFields = (type) => type.fields.filter((f) => f.type !== 'file' && f.sendToApi !== false);

/** Keeps only the schema's keys — pasted extra keys (id, is_staff…) are never sent. */
export const pickJsonPayload = (type, item) => {
  const out = {};
  jsonFields(type).forEach((f) => {
    if (item[f.name] !== undefined) out[f.name] = item[f.name];
  });
  return out;
};

/** A ready-to-edit example object for the JSON tab. */
export const buildJsonExample = (type) => {
  const example = {};
  jsonFields(type).forEach((f) => {
    const needed = f.required || f.requiredOnCreate;
    if (f.example !== undefined) example[f.name] = f.example;
    else if (f.type === 'questions') {
      example[f.name] = [
        {
          text: 'Who founded the Khalsa?',
          points: 1,
          explanation: 'Guru Gobind Singh Ji, on Vaisakhi 1699.',
          options: [
            { text: 'Guru Nanak Dev Ji' },
            { text: 'Guru Gobind Singh Ji', is_correct: true },
            { text: 'Guru Arjan Dev Ji' },
          ],
        },
      ];
    } else if (f.type === 'arcadeData') {
      example[f.name] = { name: 'Bibi Bhani Ji', name_pa: 'ਬੀਬੀ ਭਾਨੀ ਜੀ', clues: ['…', '…', '…', '…'], fact: '…' };
    } else if (f.type === 'checkbox') example[f.name] = f.defaultValue ?? false;
    else if (needed) {
      if (f.type === 'select') {
        const first = f.defaultValue ?? toOptions(f.options)[0]?.value ?? 1;
        example[f.name] = f.numeric ? 1 : first;
      } else if (f.type === 'number') example[f.name] = f.min ?? 1;
      else if (f.type === 'date') example[f.name] = '2026-11-20';
      else example[f.name] = f.placeholder || `Example ${f.label.toLowerCase()}`;
    }
  });
  if (type.key === 'arcade') example.game_key = 'kaun_hai';
  if (type.key === 'arcade') example.group = 'family';
  return example;
};

/** Parses the JSON tab: one object or a list. Returns { items, errors }. */
export const parseJsonImport = (type, text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { items: [], errors: [`Invalid JSON: ${error.message}`] };
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length === 0) return { items: [], errors: ['The list is empty.'] };
  if (list.length > MAX_JSON_ITEMS) return { items: [], errors: [`Import at most ${MAX_JSON_ITEMS} items at a time.`] };

  const errors = [];
  list.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Item ${index + 1}: must be an object.`);
      return;
    }
    jsonFields(type).forEach((f) => {
      const needed = (f.required || f.requiredOnCreate) && f.type !== 'checkbox' && isFieldVisible(f, item);
      if (needed && isBlank(typeof item[f.name] === 'string' ? item[f.name].trim() : item[f.name])) {
        errors.push(`Item ${index + 1}: "${f.name}" is needed.`);
      }
    });
  });
  return { items: errors.length ? [] : list, errors };
};
