/**
 * The arcade's map games and what each one keeps in `data`
 * (mirrors ARCADE_FIELDS / ARCADE_GROUPS in dashboard_api/serializers.py
 * and the table in dashboard_api/README.md).
 *
 * Field types used by ArcadeDataEditor:
 *   text | gurmukhi | textarea | number | select | checkbox
 *   clues  — exactly 4 clues, hardest first (kaun_hai)
 *   tags   — comma-separated list (itihaas_timeline)
 */

/** Fallback list; the live list comes from GET /api/dashboard/choices/ (arcade_games). */
export const ARCADE_GAMES = [
  { value: 'akhar_sikho', label: 'Akhar Sikho (letters)' },
  { value: 'shabad_le', label: 'Shabad Le (words)' },
  { value: 'akhaan_jor', label: 'Akhaan Jor (proverbs)' },
  { value: 'akhar_barsat', label: 'Akhar Barsat (falling words)' },
  { value: 'itihaas_timeline', label: 'Itihaas Timeline' },
  { value: 'kaun_hai', label: 'Kaun Hai? (who am I)' },
  { value: 'map_quest', label: 'Map Quest (places)' },
  { value: 'gurdwara_jigsaw', label: 'Gurdwara Jigsaw' },
];

/** Allowed `group` values. Games not listed here set the group themselves. */
export const ARCADE_GROUPS = {
  akhar_sikho: ['mool', 'ka', 'cha', 'tta', 'ta', 'pa', 'ya', 'nukta', 'matra'],
  itihaas_timeline: ['gurus', 'empire', 'modern'],
  kaun_hai: ['guru', 'family', 'hero', 'ruler', 'writer'],
  map_quest: ['cities', 'towns', 'gurus', 'takhts', 'courage', 'india', 'pakistan'],
  gurdwara_jigsaw: [...Array.from({ length: 9 }, (_, i) => `stage-${i + 1}`), 'backup'],
};

/** Shabad Le: how many tiles a word must have at each difficulty. */
export const SHABAD_LE_TILES = { easy: 3, medium: 4, hard: 5 };

/** Is the akhar_sikho item a vowel sign? (kind is filled from the group when left empty) */
const isMatra = (data, values) => (data.kind || (values.group === 'matra' ? 'matra' : 'letter')) === 'matra';

export const ARCADE_FIELDS = {
  akhar_sikho: [
    { key: 'letter', label: 'Letter', type: 'gurmukhi', required: true, placeholder: 'ੳ' },
    { key: 'name', label: 'Name', type: 'gurmukhi', required: true, placeholder: 'ਊੜਾ' },
    { key: 'roman', label: 'Roman', required: true, placeholder: 'oorha' },
    { key: 'sound', label: 'Sound', required: true, placeholder: 'u' },
    {
      key: 'kind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: 'letter', label: 'Letter' },
        { value: 'matra', label: 'Vowel sign (matra)' },
      ],
      hint: 'Left empty: taken from the group.',
    },
    { key: 'sign', label: 'The sign on its own', type: 'gurmukhi', required: true, show: isMatra },
    { key: 'example', label: 'Example word', type: 'gurmukhi' },
    { key: 'example_meaning', label: 'Example meaning' },
  ],
  shabad_le: [
    { key: 'word', label: 'Word', type: 'gurmukhi', required: true, hint: 'Easy 3 tiles · medium 4 · hard 5 (a letter with its vowel sign is one tile).' },
    { key: 'roman', label: 'Roman', required: true },
    { key: 'meaning', label: 'Meaning', required: true },
    { key: 'hint', label: 'Hint (topic)', required: true, placeholder: 'School' },
  ],
  akhaan_jor: [
    { key: 'start', label: 'First half', type: 'gurmukhi', required: true },
    { key: 'end', label: 'Second half', type: 'gurmukhi', required: true },
    { key: 'literal', label: 'Literal translation', required: true },
    { key: 'meaning', label: 'Meaning', type: 'textarea', required: true },
  ],
  akhar_barsat: [
    { key: 'word', label: 'Word', type: 'gurmukhi', required: true, hint: '2 to 5 tiles.' },
    { key: 'roman', label: 'Roman', required: true },
    { key: 'meaning', label: 'Meaning', required: true },
  ],
  itihaas_timeline: [
    { key: 'year', label: 'Year', type: 'number', required: true, min: 1, max: 2100, placeholder: '1699' },
    { key: 'title', label: 'Title', required: true },
    { key: 'title_pa', label: 'Title (Gurmukhi)', type: 'gurmukhi', required: true },
    { key: 'detail', label: 'Detail', type: 'textarea', required: true },
    { key: 'tags', label: 'Tags', type: 'tags', hint: 'Separate with commas.' },
  ],
  kaun_hai: [
    { key: 'name', label: 'Name', required: true },
    { key: 'name_pa', label: 'Name (Gurmukhi)', type: 'gurmukhi', required: true },
    { key: 'clues', label: 'Clues (hardest first)', type: 'clues', required: true },
    { key: 'fact', label: 'Fact shown after', type: 'textarea', required: true },
    { key: 'female', label: 'Woman', type: 'checkbox' },
  ],
  map_quest: [
    { key: 'name', label: 'Place', required: true },
    { key: 'name_pa', label: 'Place (Gurmukhi)', type: 'gurmukhi', required: true },
    { key: 'lat', label: 'Latitude', type: 'number', required: true, min: -90, max: 90, step: 'any', placeholder: '31.62' },
    { key: 'lng', label: 'Longitude', type: 'number', required: true, min: -180, max: 180, step: 'any', placeholder: '74.88' },
    { key: 'fact', label: 'Fact', type: 'textarea', required: true },
  ],
  gurdwara_jigsaw: [
    { key: 'picture', label: 'Website picture name', required: true, hint: 'The key of a picture under Site images.' },
    { key: 'title', label: 'Title', required: true },
    { key: 'title_pa', label: 'Title (Gurmukhi)', type: 'gurmukhi', required: true },
    { key: 'story', label: 'Story', type: 'textarea', required: true },
  ],
};

const isVisible = (spec, data, values) => (spec.show ? spec.show(data, values) : true);

/** API `data` → editor state (lists become editable text, numbers become strings). */
export const arcadeFromApi = (gameKey, data) => {
  const out = { ...(data && typeof data === 'object' ? data : {}) };
  (ARCADE_FIELDS[gameKey] || []).forEach((spec) => {
    const v = out[spec.key];
    if (spec.type === 'tags') out[spec.key] = Array.isArray(v) ? v.join(', ') : v || '';
    else if (spec.type === 'clues') out[spec.key] = [0, 1, 2, 3].map((i) => (Array.isArray(v) && v[i]) || '');
    else if (spec.type === 'number') out[spec.key] = v === null || v === undefined ? '' : String(v);
    else if (spec.type === 'checkbox') out[spec.key] = Boolean(v);
    else out[spec.key] = v === null || v === undefined ? '' : String(v);
  });
  return out;
};

/** Editor state → API `data`. Keys the editor doesn't know (e.g. looks_like) are kept. */
export const arcadeToApi = (gameKey, data) => {
  const out = { ...(data || {}) };
  (ARCADE_FIELDS[gameKey] || []).forEach((spec) => {
    const v = out[spec.key];
    if (spec.type === 'tags') {
      out[spec.key] = String(v || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (spec.type === 'clues') {
      out[spec.key] = (Array.isArray(v) ? v : []).map((c) => String(c || '').trim()).filter(Boolean);
    } else if (spec.type === 'number') {
      const text = String(v ?? '').trim();
      out[spec.key] = text === '' ? '' : Number(text);
    } else if (spec.type === 'checkbox') {
      out[spec.key] = Boolean(v);
    } else if (typeof v === 'string') {
      out[spec.key] = v.trim();
      if (!out[spec.key] && !spec.required) delete out[spec.key];
    }
  });
  return out;
};

/** Client-side check of `data`; returns a message or ''. The server checks again. */
export const validateArcade = (gameKey, data, values) => {
  if (!gameKey) return 'Choose the game first.';
  const specs = ARCADE_FIELDS[gameKey] || [];
  for (const spec of specs) {
    if (!isVisible(spec, data || {}, values)) continue;
    const v = (data || {})[spec.key];
    if (spec.type === 'clues') {
      const filled = (Array.isArray(v) ? v : []).filter((c) => String(c || '').trim());
      if (filled.length !== 4) return 'Give exactly 4 clues, from the hardest to the easiest.';
    } else if (spec.type === 'number') {
      const text = String(v ?? '').trim();
      if (spec.required && text === '') return `${spec.label} is needed.`;
      if (text !== '' && !Number.isFinite(Number(text))) return `${spec.label} must be a number.`;
      if (text !== '' && spec.min !== undefined && Number(text) < spec.min) return `${spec.label} must be at least ${spec.min}.`;
      if (text !== '' && spec.max !== undefined && Number(text) > spec.max) return `${spec.label} must be at most ${spec.max}.`;
    } else if (spec.required && spec.type !== 'checkbox' && !String(v ?? '').trim()) {
      return `${spec.label} is needed.`;
    }
  }
  return '';
};

export { isVisible as isArcadeFieldVisible };
