/**
 * =============================================================================
 * CONTENT TYPES — one schema per upload page.
 * =============================================================================
 * Every upload page in the dashboard is generated from this file. To add a
 * new content type, add one entry to CONTENT_TYPES — the route, sidebar link,
 * form, validation, JSON import and "recent uploads" list appear automatically.
 *
 * Field names below are sent to Django exactly as written, so they must match
 * your serializer fields. Ebooks, Audiobooks and Authors use the field names
 * from the existing dashboard (already working against the backend). The other
 * types follow the same conventions — check them against your models and edit
 * `name:` values here if anything differs. DRF ignores unknown fields on
 * create, so an extra field here will never break an upload.
 *
 * Field definition reference:
 *   name        — key sent to the API (required)
 *   label       — text shown above the input
 *   type        — text | textarea | number | select | date | url | file |
 *                 checkbox | author | tags | questions | gurmukhi
 *   required    — must be filled in
 *   options     — for `select`: array of strings or { value, label }
 *   accept      — for `file`: allowed MIME types
 *   extensions  — for `file`: allowed extensions (checked as well as MIME)
 *   maxMB       — for `file`: maximum size in megabytes
 *   min / max / step / maxLength / pattern / patternMessage — validation
 *   showWhen    — { field, in: [...] } only show when another field matches
 *   span        — 'full' to make the field take the whole row
 *   hint        — small helper text under the input
 * ========================================================================== */
import {
  FaBook,
  FaHeadphones,
  FaUserEdit,
  FaGraduationCap,
  FaQuestionCircle,
  FaGamepad,
  FaPrayingHands,
  FaLandmark,
  FaCalendarAlt,
  FaFeatherAlt,
} from 'react-icons/fa';

/* ---------------------------------------------------------------------------
 * Shared option lists
 * ------------------------------------------------------------------------- */
export const LANGUAGES = ['English', 'Punjabi', 'Hindi', 'Bilingual (English / Punjabi)'];

/** Ontario grade levels — matches the Khalsa school syllabus structure. */
export const GRADE_LEVELS = [
  'JK',
  'SK',
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  'All Ages',
];

export const AGE_GROUPS = ['3-5', '6-8', '9-12', '13-17', 'Adults', 'All Ages'];

export const GURUS = [
  'Guru Nanak Dev Ji',
  'Guru Angad Dev Ji',
  'Guru Amar Das Ji',
  'Guru Ram Das Ji',
  'Guru Arjan Dev Ji',
  'Guru Hargobind Sahib Ji',
  'Guru Har Rai Ji',
  'Guru Har Krishan Ji',
  'Guru Tegh Bahadur Ji',
  'Guru Gobind Singh Ji',
  'Guru Granth Sahib Ji',
  'Other / General',
];

/* ---------------------------------------------------------------------------
 * Reusable field builders (keeps the schemas short and consistent)
 * ------------------------------------------------------------------------- */
const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];

const imageField = (name, label, extra = {}) => ({
  name,
  label,
  type: 'file',
  accept: IMAGE_MIME,
  extensions: IMAGE_EXT,
  maxMB: 5,
  hint: 'PNG, JPG or WebP · up to 5 MB',
  ...extra,
});

const audioField = (name, label, extra = {}) => ({
  name,
  label,
  type: 'file',
  accept: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav'],
  extensions: ['mp3', 'm4a', 'aac', 'wav'],
  maxMB: 300,
  hint: 'MP3, M4A, AAC or WAV · up to 300 MB',
  ...extra,
});

const pdfField = (name, label, extra = {}) => ({
  name,
  label,
  type: 'file',
  accept: ['application/pdf'],
  extensions: ['pdf'],
  maxMB: 100,
  hint: 'PDF · up to 100 MB',
  ...extra,
});

const ratingField = { name: 'rating', label: 'Rating (0 – 5)', type: 'number', min: 0, max: 5, step: 0.1, defaultValue: 0 };
const premiumField = {
  name: 'is_premium',
  label: 'Premium only',
  type: 'checkbox',
  hint: 'Only members on the Premium plan can open this.',
  defaultValue: false,
};
const descriptionField = { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000, span: 'full' };
const languageField = { name: 'language', label: 'Language', type: 'select', options: LANGUAGES, defaultValue: 'English' };

/** Accepts "H:MM:SS" or "HH:MM:SS" (the format Django's DurationField expects). */
const DURATION_PATTERN = /^\d{1,3}:[0-5]\d:[0-5]\d$/;

/* ---------------------------------------------------------------------------
 * Content type schemas
 * ------------------------------------------------------------------------- */
export const CONTENT_TYPES = [
  /* ============================== EBOOKS ============================== */
  {
    key: 'ebooks',
    slug: 'ebooks',
    group: 'Library',
    label: 'Ebooks',
    singular: 'Ebook',
    icon: FaBook,
    description: 'PDF books for the Virsaa library — Sikh literature, history and teaching texts.',
    endpoints: { list: '/collections/ebooks/', create: '/collections/ebooks/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'author_name', image: 'cover_image' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 255 },
      { name: 'author', label: 'Author', type: 'author', required: true, hint: 'Add the author first on the Authors page if missing.' },
      imageField('cover_image', 'Cover image', { required: true }),
      pdfField('pdf_file', 'Book PDF', { required: true }),
      { name: 'pages', label: 'Pages', type: 'number', required: true, min: 1, max: 20000, step: 1 },
      ratingField,
      languageField,
      premiumField,
      descriptionField,
    ],
  },

  /* ============================ AUDIOBOOKS ============================ */
  {
    key: 'audiobooks',
    slug: 'audiobooks',
    group: 'Library',
    label: 'Audiobooks',
    singular: 'Audiobook',
    icon: FaHeadphones,
    description: 'Narrated books and long-form audio.',
    endpoints: { list: '/collections/audiobooks/', create: '/collections/audiobooks/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'author_name', image: 'cover' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 255 },
      { name: 'author', label: 'Author', type: 'author' },
      imageField('cover', 'Cover image'),
      audioField('mp3_file', 'Audio file', { required: true }),
      {
        name: 'duration',
        label: 'Duration',
        type: 'text',
        required: true,
        placeholder: '2:30:15',
        pattern: DURATION_PATTERN,
        patternMessage: 'Use H:MM:SS, for example 2:30:15',
      },
      { name: 'format', label: 'Format', type: 'select', options: ['MP3', 'M4A', 'AAC', 'WAV'], defaultValue: 'MP3' },
      { name: 'genre', label: 'Genre', type: 'text', maxLength: 100, placeholder: 'History, Biography, Sakhi…' },
      { name: 'narrator', label: 'Narrator', type: 'text', maxLength: 150 },
      ratingField,
      languageField,
      premiumField,
      descriptionField,
    ],
  },

  /* ============================== AUTHORS ============================= */
  {
    key: 'authors',
    slug: 'authors',
    group: 'Library',
    label: 'Authors',
    singular: 'Author',
    icon: FaUserEdit,
    description: 'Writers, scholars and historians shown on book pages.',
    endpoints: { list: '/collections/authors/', create: '/collections/authors/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'name', subtitle: 'genre', image: 'image' },
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: true, maxLength: 255 },
      imageField('image', 'Portrait'),
      { name: 'born', label: 'Born', type: 'date' },
      { name: 'died', label: 'Died', type: 'date', hint: 'Leave empty if living.' },
      { name: 'genre', label: 'Genre / field', type: 'text', maxLength: 100, placeholder: 'History, Gurmat, Poetry…' },
      ratingField,
      { name: 'notable_works', label: 'Notable works', type: 'textarea', maxLength: 2000, span: 'full' },
      { name: 'biography', label: 'Biography', type: 'textarea', maxLength: 10000, span: 'full' },
      { name: 'awards', label: 'Awards', type: 'textarea', maxLength: 2000, span: 'full' },
    ],
  },

  /* ========================= LEARNING MATERIAL ======================== */
  {
    key: 'learning',
    slug: 'learning-material',
    group: 'Learning portal',
    label: 'Learning Material',
    singular: 'Learning material',
    icon: FaGraduationCap,
    description: 'Lessons, worksheets and videos for the school learning portal, organised by grade.',
    endpoints: { list: '/collections/learning-materials/', create: '/collections/learning-materials/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'grade_level', image: 'thumbnail' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 255 },
      {
        name: 'subject',
        label: 'Subject',
        type: 'select',
        required: true,
        options: ['Gurmukhi (Punjabi)', 'Gurbani', 'Sikh History', 'Rehat Maryada', 'Kirtan & Music', 'Sikh Values', 'Other'],
      },
      { name: 'grade_level', label: 'Grade', type: 'select', required: true, options: GRADE_LEVELS },
      { name: 'unit', label: 'Unit / chapter', type: 'text', maxLength: 150, placeholder: 'Unit 2 — Painti Akhri' },
      {
        name: 'material_type',
        label: 'Material type',
        type: 'select',
        required: true,
        options: ['PDF', 'Worksheet', 'Slides', 'Video', 'Audio'],
        defaultValue: 'PDF',
      },
      {
        name: 'file',
        label: 'File',
        type: 'file',
        accept: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'audio/mpeg',
        ],
        extensions: ['pdf', 'pptx', 'docx', 'mp3'],
        maxMB: 100,
        hint: 'PDF, PPTX, DOCX or MP3 · up to 100 MB',
        showWhen: { field: 'material_type', in: ['PDF', 'Worksheet', 'Slides', 'Audio'] },
      },
      {
        name: 'video_url',
        label: 'Video link',
        type: 'url',
        placeholder: 'https://www.youtube.com/watch?v=…',
        showWhen: { field: 'material_type', in: ['Video'] },
      },
      imageField('thumbnail', 'Thumbnail'),
      { name: 'estimated_minutes', label: 'Lesson length (minutes)', type: 'number', min: 1, max: 600, step: 1 },
      languageField,
      premiumField,
      { name: 'learning_objectives', label: 'Learning objectives', type: 'textarea', maxLength: 3000, span: 'full', hint: 'One objective per line.' },
      descriptionField,
    ],
  },

  /* ============================== QUIZZES ============================= */
  {
    key: 'quizzes',
    slug: 'quizzes',
    group: 'Learning portal',
    label: 'Quizzes',
    singular: 'Quiz',
    icon: FaQuestionCircle,
    description: 'Multiple-choice quizzes. Build questions visually or paste JSON.',
    endpoints: { list: '/collections/quizzes/', create: '/collections/quizzes/admin_create/' },
    // Quizzes contain a nested `questions` array, so they are sent as JSON.
    submitAs: 'json',
    display: { title: 'title', subtitle: 'category' },
    fields: [
      { name: 'title', label: 'Quiz title', type: 'text', required: true, maxLength: 255 },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: ['Sikh History', 'Gurbani', 'Gurmukhi', 'Gurus', 'Rehat Maryada', 'General Knowledge'],
      },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'], defaultValue: 'Easy' },
      { name: 'grade_level', label: 'Grade', type: 'select', options: GRADE_LEVELS },
      { name: 'time_limit_minutes', label: 'Time limit (minutes)', type: 'number', min: 1, max: 180, step: 1, hint: 'Leave empty for no limit.' },
      { name: 'pass_percentage', label: 'Pass mark (%)', type: 'number', min: 0, max: 100, step: 1, defaultValue: 60 },
      premiumField,
      descriptionField,
      { name: 'questions', label: 'Questions', type: 'questions', required: true, span: 'full' },
    ],
  },

  /* =============================== GAMES ============================== */
  {
    key: 'games',
    slug: 'games',
    group: 'Learning portal',
    label: 'Games',
    singular: 'Game',
    icon: FaGamepad,
    description: 'Educational games — link to a hosted game or upload an HTML5 build.',
    endpoints: { list: '/collections/games/', create: '/collections/games/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'game_type', image: 'thumbnail' },
    fields: [
      { name: 'title', label: 'Game title', type: 'text', required: true, maxLength: 255 },
      {
        name: 'game_type',
        label: 'Game type',
        type: 'select',
        required: true,
        options: ['Trivia', 'Puzzle', 'Memory', 'Word Game', 'Matching', 'Adventure'],
      },
      { name: 'age_group', label: 'Age group', type: 'select', options: AGE_GROUPS, defaultValue: 'All Ages' },
      imageField('thumbnail', 'Thumbnail', { required: true }),
      {
        name: 'source',
        label: 'How is the game delivered?',
        type: 'select',
        options: [
          { value: 'url', label: 'Hosted link' },
          { value: 'upload', label: 'Upload HTML5 build (.zip)' },
        ],
        defaultValue: 'url',
        sendToApi: false,
      },
      { name: 'game_url', label: 'Game link', type: 'url', required: true, showWhen: { field: 'source', in: ['url'] } },
      {
        name: 'game_file',
        label: 'Game build (.zip)',
        type: 'file',
        accept: ['application/zip', 'application/x-zip-compressed'],
        extensions: ['zip'],
        maxMB: 200,
        required: true,
        hint: 'ZIP containing index.html · up to 200 MB',
        showWhen: { field: 'source', in: ['upload'] },
      },
      { name: 'how_to_play', label: 'How to play', type: 'textarea', maxLength: 3000, span: 'full' },
      premiumField,
      descriptionField,
    ],
  },

  /* ============================== GURBANI ============================= */
  {
    key: 'gurbani',
    slug: 'gurbani',
    group: 'Gurmat',
    label: 'Gurbani',
    singular: 'Gurbani entry',
    icon: FaPrayingHands,
    description: 'Banis, Shabads, Kirtan and Katha — text, audio or video.',
    endpoints: { list: '/collections/gurbani/', create: '/collections/gurbani/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'bani_type', image: 'cover_image' },
    fields: [
      { name: 'title', label: 'Title (English)', type: 'text', required: true, maxLength: 255, placeholder: 'Japji Sahib' },
      { name: 'title_gurmukhi', label: 'Title (Gurmukhi)', type: 'gurmukhi', maxLength: 255, placeholder: 'ਜਪੁਜੀ ਸਾਹਿਬ' },
      {
        name: 'bani_type',
        label: 'Category',
        type: 'select',
        required: true,
        options: ['Nitnem', 'Shabad', 'Kirtan', 'Katha', 'Ardas', 'Other'],
      },
      { name: 'media_type', label: 'Media', type: 'select', required: true, options: ['Text', 'Audio', 'Video'], defaultValue: 'Text' },
      { name: 'ang', label: 'Ang (SGGS page)', type: 'number', min: 1, max: 1430, step: 1, hint: '1 – 1430' },
      { name: 'raag', label: 'Raag', type: 'text', maxLength: 100, placeholder: 'Raag Asa' },
      { name: 'writer', label: 'Bani of', type: 'select', options: GURUS },
      {
        name: 'artist',
        label: 'Ragi / Kathavachak',
        type: 'text',
        maxLength: 150,
        showWhen: { field: 'media_type', in: ['Audio', 'Video'] },
      },
      audioField('audio_file', 'Audio file', { required: true, showWhen: { field: 'media_type', in: ['Audio'] } }),
      { name: 'video_url', label: 'Video link', type: 'url', required: true, showWhen: { field: 'media_type', in: ['Video'] } },
      imageField('cover_image', 'Cover image'),
      { name: 'gurmukhi_text', label: 'Gurmukhi text', type: 'gurmukhi', multiline: true, span: 'full', maxLength: 100000 },
      { name: 'transliteration', label: 'Transliteration', type: 'textarea', span: 'full', maxLength: 100000 },
      { name: 'translation', label: 'English translation', type: 'textarea', span: 'full', maxLength: 100000 },
      premiumField,
    ],
  },

  /* ============================ SIKH HISTORY =========================== */
  {
    key: 'history',
    slug: 'sikh-history',
    group: 'Gurmat',
    label: 'Sikh History',
    singular: 'History item',
    icon: FaLandmark,
    description: 'Articles, videos and podcasts about Sikh history.',
    endpoints: { list: '/collections/sikh-history/', create: '/collections/sikh-history/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'era', image: 'cover_image' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 255 },
      { name: 'content_type', label: 'Format', type: 'select', required: true, options: ['Article', 'Video', 'Podcast'], defaultValue: 'Article' },
      {
        name: 'era',
        label: 'Era',
        type: 'select',
        required: true,
        options: ['Guru Period (1469–1708)', 'Banda Singh Bahadur', 'Misl Period', 'Sikh Empire', 'Colonial Era', 'Partition', 'Modern Era', 'Diaspora'],
      },
      { name: 'year', label: 'Year / period', type: 'text', maxLength: 50, placeholder: '1699' },
      { name: 'related_guru', label: 'Related Guru', type: 'select', options: GURUS },
      imageField('cover_image', 'Cover image', { required: true }),
      { name: 'video_url', label: 'Video link', type: 'url', required: true, showWhen: { field: 'content_type', in: ['Video'] } },
      audioField('audio_file', 'Podcast audio', { required: true, showWhen: { field: 'content_type', in: ['Podcast'] } }),
      { name: 'duration', label: 'Duration', type: 'text', placeholder: '0:45:00', pattern: DURATION_PATTERN, patternMessage: 'Use H:MM:SS', showWhen: { field: 'content_type', in: ['Video', 'Podcast'] } },
      { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'Khalsa, Vaisakhi, Anandpur Sahib', hint: 'Separate with commas.' },
      languageField,
      premiumField,
      { name: 'summary', label: 'Short summary', type: 'textarea', maxLength: 500, span: 'full' },
      { name: 'body', label: 'Article', type: 'textarea', maxLength: 100000, span: 'full', rows: 10, required: true, showWhen: { field: 'content_type', in: ['Article'] } },
      { name: 'sources', label: 'Sources / references', type: 'textarea', maxLength: 5000, span: 'full' },
    ],
  },

  /* ============================== SAKHIS ============================== */
  {
    key: 'sakhis',
    slug: 'sakhis',
    group: 'Gurmat',
    label: 'Sakhis',
    singular: 'Sakhi',
    icon: FaFeatherAlt,
    description: 'Stories from Sikh history with a moral — great for younger learners.',
    endpoints: { list: '/collections/sakhis/', create: '/collections/sakhis/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'guru', image: 'cover_image' },
    fields: [
      { name: 'title', label: 'Title (English)', type: 'text', required: true, maxLength: 255 },
      { name: 'title_gurmukhi', label: 'Title (Gurmukhi)', type: 'gurmukhi', maxLength: 255 },
      { name: 'guru', label: 'Guru / figure', type: 'select', required: true, options: GURUS },
      { name: 'age_group', label: 'Age group', type: 'select', options: AGE_GROUPS, defaultValue: 'All Ages' },
      imageField('cover_image', 'Illustration', { required: true }),
      audioField('audio_file', 'Narration audio'),
      languageField,
      premiumField,
      { name: 'story', label: 'Story', type: 'textarea', required: true, maxLength: 50000, rows: 10, span: 'full' },
      { name: 'moral', label: 'Lesson / moral', type: 'textarea', maxLength: 1000, span: 'full' },
      { name: 'discussion_questions', label: 'Discussion questions', type: 'textarea', maxLength: 3000, span: 'full', hint: 'One question per line — for classroom use.' },
    ],
  },

  /* ============================== EVENTS ============================== */
  {
    key: 'events',
    slug: 'events',
    group: 'Community',
    label: 'Events & Gurpurabs',
    singular: 'Event',
    icon: FaCalendarAlt,
    description: 'Gurpurabs, Shaheedi days, Sangrand and community events for the Nanakshahi calendar.',
    endpoints: { list: '/collections/events/', create: '/collections/events/admin_create/' },
    submitAs: 'multipart',
    display: { title: 'title', subtitle: 'date', image: 'image' },
    fields: [
      { name: 'title', label: 'Event name', type: 'text', required: true, maxLength: 255 },
      {
        name: 'event_type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'gurpurab', label: 'Gurpurab' },
          { value: 'shaheedi', label: 'Shaheedi Purab' },
          { value: 'sangrand', label: 'Sangrand' },
          { value: 'festival', label: 'Festival (Vaisakhi, Bandi Chhor…)' },
          { value: 'event', label: 'Community event' },
        ],
      },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date', hint: 'For multi-day events.' },
      { name: 'time', label: 'Start time', type: 'time' },
      { name: 'location', label: 'Location', type: 'text', maxLength: 255, placeholder: 'Gurdwara, city' },
      imageField('image', 'Image'),
      { name: 'link', label: 'More info link', type: 'url' },
      { name: 'is_recurring', label: 'Repeats every year', type: 'checkbox', defaultValue: false },
      descriptionField,
    ],
  },
];

/* ---------------------------------------------------------------------------
 * Lookups
 * ------------------------------------------------------------------------- */
export const CONTENT_TYPES_BY_SLUG = Object.fromEntries(CONTENT_TYPES.map((type) => [type.slug, type]));

/** Sidebar groups in display order. */
export const CONTENT_GROUPS = ['Library', 'Learning portal', 'Gurmat', 'Community'];
