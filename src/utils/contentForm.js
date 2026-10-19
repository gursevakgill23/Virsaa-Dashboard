/**
 * Pure helpers used by the upload form: default values, conditional fields,
 * validation (for both the visual form and JSON import) and building the
 * request body. Kept free of React so it is easy to test.
 */
import { ENV } from '../config/env';

/* ---------------------------------------------------------------------------
 * Visibility & defaults
 * ------------------------------------------------------------------------- */

/** True when a field's `showWhen` rule matches the current values. */
export const isFieldVisible = (field, values) => {
  if (!field.showWhen) return true;
  const current = values[field.showWhen.field];
  return field.showWhen.in.includes(current);
};

/** Builds the empty state for a form from its schema. */
export const getInitialValues = (contentType) =>
  Object.fromEntries(
    contentType.fields.map((field) => {
      if (field.defaultValue !== undefined) return [field.name, field.defaultValue];
      if (field.type === 'checkbox') return [field.name, false];
      if (field.type === 'file') return [field.name, null];
      if (field.type === 'questions') return [field.name, [createEmptyQuestion()]];
      return [field.name, ''];
    })
  );

/** A blank multiple-choice question for the quiz builder. */
export const createEmptyQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correct_option: 0,
  explanation: '',
});

/* ---------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------- */

const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const fileExtension = (fileName) => {
  const parts = String(fileName || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

/**
 * Checks an uploaded File against the field's MIME list, extension list and
 * size limit. Both MIME and extension are checked because browsers sometimes
 * report an empty or generic MIME type. Returns an error string or ''.
 */
export const validateFile = (field, file) => {
  if (!(file instanceof File)) return 'Please choose a file.';
  if (file.size === 0) return 'This file is empty.';

  const limitMB = Math.min(field.maxMB || ENV.MAX_UPLOAD_MB, ENV.MAX_UPLOAD_MB);
  if (file.size > limitMB * 1024 * 1024) return `File is larger than ${limitMB} MB.`;

  const ext = fileExtension(file.name);
  if (field.extensions?.length && !field.extensions.includes(ext)) {
    return `Allowed file types: ${field.extensions.map((e) => `.${e}`).join(', ')}`;
  }
  if (field.accept?.length && file.type && !field.accept.includes(file.type)) {
    return `Allowed file types: ${field.extensions?.map((e) => `.${e}`).join(', ') || field.accept.join(', ')}`;
  }
  return '';
};

/** Only http(s) URLs are accepted in URL fields. */
const isValidHttpUrl = (value) => {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

/** Validates the quiz builder's question list. */
const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) return 'Add at least one question.';
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i] || {};
    const n = i + 1;
    if (isEmpty(q.question)) return `Question ${n} is missing its text.`;
    if (!Array.isArray(q.options) || q.options.filter((o) => !isEmpty(o)).length < 2) {
      return `Question ${n} needs at least two answer options.`;
    }
    const correct = Number(q.correct_option);
    if (!Number.isInteger(correct) || isEmpty(q.options[correct])) {
      return `Question ${n}: choose which option is correct.`;
    }
  }
  return '';
};

/**
 * Validates a set of values against a content type.
 * @param {object} contentType  schema from config/contentTypes
 * @param {object} values       current form values (or parsed JSON object)
 * @param {object} [options]
 * @param {boolean} [options.skipFiles]  JSON import cannot carry files
 * @returns {object} map of field name → error message (empty when valid)
 */
export const validateValues = (contentType, values, { skipFiles = false } = {}) => {
  const errors = {};

  contentType.fields.forEach((field) => {
    if (!isFieldVisible(field, values)) return;
    if (skipFiles && field.type === 'file') return;

    const value = values[field.name];
    const label = field.label;

    // ---- required ----
    if (field.required && field.type !== 'checkbox' && field.type !== 'questions' && isEmpty(value)) {
      errors[field.name] = `${label} is required.`;
      return;
    }
    if (isEmpty(value) && field.type !== 'questions') return;

    switch (field.type) {
      case 'number': {
        const num = Number(value);
        if (!Number.isFinite(num)) errors[field.name] = `${label} must be a number.`;
        else if (field.min !== undefined && num < field.min) errors[field.name] = `${label} must be at least ${field.min}.`;
        else if (field.max !== undefined && num > field.max) errors[field.name] = `${label} must be at most ${field.max}.`;
        else if (field.step === 1 && !Number.isInteger(num)) errors[field.name] = `${label} must be a whole number.`;
        break;
      }
      case 'url':
        if (!isValidHttpUrl(value)) errors[field.name] = 'Enter a full link starting with https://';
        break;
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) errors[field.name] = 'Use the format YYYY-MM-DD.';
        break;
      case 'time':
        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(String(value))) errors[field.name] = 'Use the format HH:MM.';
        break;
      case 'select': {
        const allowed = (field.options || []).map((o) => (typeof o === 'object' ? o.value : o));
        if (!allowed.includes(value)) errors[field.name] = `Choose a valid ${label.toLowerCase()}.`;
        break;
      }
      case 'author':
        if (!/^\d+$/.test(String(value))) errors[field.name] = 'Choose an author from the list.';
        break;
      case 'file': {
        const fileError = validateFile(field, value);
        if (fileError) errors[field.name] = fileError;
        break;
      }
      case 'questions': {
        const questionError = validateQuestions(value);
        if (questionError) errors[field.name] = questionError;
        break;
      }
      default:
        break;
    }

    // ---- text rules (apply to any string value) ----
    if (!errors[field.name] && typeof value === 'string') {
      if (field.maxLength && value.length > field.maxLength) {
        errors[field.name] = `${label} must be ${field.maxLength.toLocaleString()} characters or fewer.`;
      } else if (field.pattern && !field.pattern.test(value.trim())) {
        errors[field.name] = field.patternMessage || `${label} is not in the right format.`;
      }
    }
  });

  // Logical date check used by Authors and Events.
  if (values.born && values.died && values.died < values.born) errors.died = 'Died must be after Born.';
  if (values.date && values.end_date && values.end_date < values.date) errors.end_date = 'End date must be after the start date.';

  return errors;
};

/* ---------------------------------------------------------------------------
 * Payload building
 * ------------------------------------------------------------------------- */

/** Converts a raw form value into what the API expects for that field type. */
const serialiseValue = (field, value) => {
  switch (field.type) {
    case 'number':
      return value === '' ? undefined : Number(value);
    case 'checkbox':
      return Boolean(value);
    case 'author':
      return value === '' ? undefined : Number(value);
    case 'tags':
      return String(value)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .join(', ');
    case 'questions':
      return (value || []).map((q, index) => {
        const trimmed = q.options.map((o) => String(o).trim());
        const correct = Number(q.correct_option);
        // Blank options are dropped, so shift the correct index to match
        // (e.g. ["A", "", "C"] with correct=2 becomes ["A", "C"] with correct=1).
        const shiftedCorrect = trimmed.slice(0, correct).filter(Boolean).length;
        return {
          order: index + 1,
          question: String(q.question).trim(),
          options: trimmed.filter(Boolean),
          correct_option: shiftedCorrect,
          explanation: String(q.explanation || '').trim(),
        };
      });
    default:
      return typeof value === 'string' ? value.trim() : value;
  }
};

/**
 * Keeps only the fields defined in the schema (and currently visible).
 * This is a mass-assignment guard: a pasted JSON object containing extra
 * keys such as "is_staff" or "id" is never forwarded to the API.
 */
export const pickSchemaValues = (contentType, values, { skipFiles = false } = {}) => {
  const clean = {};
  contentType.fields.forEach((field) => {
    if (field.sendToApi === false) return;
    if (!isFieldVisible(field, values)) return;
    if (skipFiles && field.type === 'file') return;
    const raw = values[field.name];
    if (raw === undefined || raw === null || raw === '') return;
    const serialised = serialiseValue(field, raw);
    if (serialised === undefined || serialised === '') return;
    clean[field.name] = serialised;
  });
  return clean;
};

/**
 * Builds the request body: multipart FormData for types with files,
 * or a plain object for JSON types (and for the JSON import tab).
 */
export const buildRequestBody = (contentType, values, { forceJson = false } = {}) => {
  const clean = pickSchemaValues(contentType, values, { skipFiles: forceJson });
  if (forceJson || contentType.submitAs === 'json') return clean;

  const formData = new FormData();
  Object.entries(clean).forEach(([key, value]) => {
    if (value instanceof File) formData.append(key, value, value.name);
    else if (typeof value === 'object') formData.append(key, JSON.stringify(value));
    else formData.append(key, String(value));
  });
  return formData;
};

/* ---------------------------------------------------------------------------
 * JSON import
 * ------------------------------------------------------------------------- */

/** Builds a sample JSON object for the JSON tab's placeholder. */
export const buildJsonExample = (contentType) => {
  const example = {};
  contentType.fields.forEach((field) => {
    if (field.type === 'file' || field.sendToApi === false) return;
    switch (field.type) {
      case 'number':
        example[field.name] = field.defaultValue ?? field.min ?? 1;
        break;
      case 'checkbox':
        example[field.name] = false;
        break;
      case 'author':
        example[field.name] = 1;
        break;
      case 'select': {
        const first = field.defaultValue ?? field.options?.[0];
        example[field.name] = typeof first === 'object' ? first.value : first;
        break;
      }
      case 'date':
        example[field.name] = '2026-01-01';
        break;
      case 'questions':
        example[field.name] = [
          {
            question: 'Who founded the Khalsa?',
            options: ['Guru Nanak Dev Ji', 'Guru Gobind Singh Ji', 'Guru Arjan Dev Ji', 'Guru Tegh Bahadur Ji'],
            correct_option: 1,
            explanation: 'Guru Gobind Singh Ji created the Khalsa on Vaisakhi 1699.',
          },
        ];
        break;
      default:
        if (field.required) example[field.name] = field.placeholder || `Example ${field.label.toLowerCase()}`;
    }
  });
  return example;
};

/** Max items accepted in one bulk JSON import — protects the API. */
export const MAX_JSON_ITEMS = 100;

/**
 * Parses and validates the JSON tab. Accepts a single object or an array of
 * objects. Returns { items, errors } where errors is a list of strings.
 */
export const parseJsonImport = (contentType, text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { items: [], errors: [`Invalid JSON: ${error.message}`] };
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length === 0) return { items: [], errors: ['The JSON array is empty.'] };
  if (list.length > MAX_JSON_ITEMS) return { items: [], errors: [`Import at most ${MAX_JSON_ITEMS} items at a time.`] };

  const errors = [];
  list.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Item ${index + 1}: must be an object.`);
      return;
    }
    const itemErrors = validateValues(contentType, item, { skipFiles: true });
    Object.values(itemErrors).forEach((message) => errors.push(`Item ${index + 1}: ${message}`));
  });

  return { items: errors.length ? [] : list, errors };
};
