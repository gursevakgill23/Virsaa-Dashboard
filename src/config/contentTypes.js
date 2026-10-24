/**
 * =============================================================================
 * CONTENT TYPES — one entry per dashboard page, matching /api/dashboard/.
 * =============================================================================
 * Every content page (route, sidebar link, list, filters, add/edit form,
 * delete, JSON import) is generated from this file. Field `name`s are sent to
 * Django exactly as written and match dashboard_api/serializers.py.
 *
 * Content type keys:
 *   endpoint      list + create URL; `${endpoint}${id}/` reads/edits/deletes one
 *   summaryKey    key in GET /api/dashboard/ for the overview counts
 *   row(item)     what the list shows: { title, subtitle, image }
 *   filters       drop-downs above the list → ?name=value
 *   refreshChoices  re-load /choices/ after saving (authors, topics…)
 *   jsonImport    false to hide the JSON tab
 *
 * Field keys:
 *   name, label, type, hint, placeholder, span ('full')
 *   type          text | textarea | gurmukhi | number | select | multiselect |
 *                 checkbox | date | time | datetime | url | file | list |
 *                 questions | json | arcadeData
 *   required          needed on create and edit
 *   requiredOnCreate  needed when adding only (e.g. files that can't be removed)
 *   optionsFrom   key of GET /api/dashboard/choices/ (e.g. 'authors')
 *   options       fallback options when /choices/ hasn't loaded
 *   numeric       select value is an id → sent as a number
 *   kind          for files: picture | pdf | audio | video (see FILE_KINDS)
 *   removable     false = a file can be replaced but not removed
 *   showWhen      { field, in: [...] } — only shown when another field matches
 *   lockOnEdit    can't be changed after creation
 *   itemFields    for `list`: the columns of each row
 *   sendToApi     false = UI-only helper field
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
  FaTags,
  FaFont,
  FaPuzzlePiece,
  FaCalendarCheck,
  FaNewspaper,
} from 'react-icons/fa';
import { ARCADE_GAMES, ARCADE_GROUPS } from './arcade';

const API = '/api/dashboard';

/** 'easy:Easy|medium:Medium' → [{ value, label }] — compact fallback lists. */
const opts = (spec) =>
  spec.split('|').map((pair) => {
    const [value, label] = pair.split(':');
    return { value, label: label || value };
  });

/* ---------------------------------------------------------------------------
 * Files — limits match dashboard_api/files.py
 * ------------------------------------------------------------------------- */
export const FILE_KINDS = {
  picture: {
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxMB: 15,
    hint: 'JPG, PNG or WebP · up to 15 MB',
  },
  pdf: {
    accept: ['application/pdf'],
    extensions: ['pdf'],
    maxMB: 250,
    hint: 'PDF without a password · up to 250 MB',
  },
  audio: {
    accept: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac'],
    extensions: ['mp3', 'm4a'],
    maxMB: 280,
    hint: 'MP3 or M4A · up to 280 MB · its length is measured for you',
  },
  video: {
    accept: ['video/mp4', 'video/quicktime', 'video/webm'],
    extensions: ['mp4', 'mov', 'webm'],
    maxMB: 280,
    hint: 'MP4, MOV or WebM · up to 280 MB',
  },
};

const file = (name, label, kind, extra = {}) => ({ name, label, type: 'file', kind, ...FILE_KINDS[kind], ...extra });

/* ---------------------------------------------------------------------------
 * Shared fields and filters
 * ------------------------------------------------------------------------- */
const DIFFICULTIES = opts('easy:Easy|medium:Medium|hard:Hard');
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const DURATION = /^(\d{1,3}:)?[0-5]?\d:[0-5]\d$/;

const published = { name: 'is_published', label: 'Published on the website', type: 'checkbox', defaultValue: true };
const order = { name: 'order', label: 'Order', type: 'number', min: 0, step: 1, hint: 'Lower numbers come first.' };
const rating = { name: 'rating', label: 'Rating (0 – 5)', type: 'number', min: 0, max: 5, step: 0.1 };
const slug = {
  name: 'slug',
  label: 'Web address (slug)',
  type: 'text',
  maxLength: 120,
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  patternMessage: 'Use lower-case letters, numbers and dashes only.',
  hint: 'Made from the title when left empty.',
};
const youtubeId = (name = 'youtube_id', label = 'YouTube video id') => ({
  name,
  label,
  type: 'text',
  pattern: YOUTUBE_ID,
  patternMessage: 'The 11 characters after "v=" in the YouTube link.',
  placeholder: 'dQw4w9WgXcQ',
});

const F_PUBLISHED = { name: 'is_published', label: 'Status', options: opts('true:Published|false:Hidden') };
const F_ACTIVE = { name: 'is_active', label: 'Status', options: opts('true:Active|false:Inactive') };

/** Lessons, quizzes and games share these (LearningItemSerializer.COMMON). */
const learningCommon = [
  { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 200 },
  { name: 'category', label: 'Topic', type: 'select', required: true, optionsFrom: 'categories', numeric: true, hint: 'Add topics on the Topics page.' },
  { name: 'description', label: 'Short description', type: 'textarea', required: true, rows: 3, span: 'full' },
  { name: 'difficulty', label: 'Difficulty', type: 'select', optionsFrom: 'difficulties', options: DIFFICULTIES, defaultValue: 'easy' },
  slug,
  order,
  { name: 'xp_reward', label: 'XP reward', type: 'number', min: 0, step: 1 },
  { name: 'coin_reward', label: 'Coin reward', type: 'number', min: 0, step: 1 },
  file('image_file', 'Picture', 'picture'),
  { name: 'image', label: '…or picture link', type: 'url', hint: 'Used when no picture is uploaded.' },
  published,
  { name: 'is_restricted', label: 'Sign-in needed', type: 'checkbox', defaultValue: false },
  { name: 'is_premium', label: 'Premium only', type: 'checkbox', defaultValue: false },
];
const learningFilters = [
  { name: 'category', label: 'Topic', optionsFrom: 'categories' },
  { name: 'difficulty', label: 'Difficulty', optionsFrom: 'difficulties', options: DIFFICULTIES },
  F_PUBLISHED,
];
const learningRow = (item) => ({ title: item.title, subtitle: item.category_name, image: item.picture });

/* ---------------------------------------------------------------------------
 * The content types
 * ------------------------------------------------------------------------- */
export const CONTENT_TYPES = [
  /* ============================== LIBRARY ============================== */
  {
    key: 'ebooks',
    slug: 'ebooks',
    group: 'Library',
    label: 'Ebooks',
    singular: 'Ebook',
    icon: FaBook,
    description: 'PDF books for the library. Pages are counted from the PDF.',
    endpoint: `${API}/ebooks/`,
    summaryKey: 'ebooks',
    row: (item) => ({ title: item.title, subtitle: item.author_name || 'No author', image: item.cover_image }),
    filters: [{ name: 'author', label: 'Author', optionsFrom: 'authors' }],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 255 },
      { name: 'author', label: 'Author', type: 'select', optionsFrom: 'authors', numeric: true, hint: 'Missing? Add them on the Authors page.' },
      file('cover_image', 'Cover', 'picture', { requiredOnCreate: true, removable: false }),
      file('pdf_file', 'Book PDF', 'pdf', { requiredOnCreate: true, removable: false }),
      { name: 'pages', label: 'Pages', type: 'number', min: 1, step: 1, hint: 'Counted from the PDF when left empty.' },
      rating,
      { name: 'description', label: 'Description', type: 'textarea', span: 'full' },
      {
        name: 'chapters',
        label: 'Chapters',
        type: 'list',
        addLabel: 'Add chapter',
        itemFields: [{ name: 'title', label: 'Chapter title', type: 'text', required: true }],
        example: [{ title: 'Chapter 1' }, { title: 'Chapter 2' }],
      },
    ],
  },
  {
    key: 'audiobooks',
    slug: 'audiobooks',
    group: 'Library',
    label: 'Audiobooks',
    singular: 'Audiobook',
    icon: FaHeadphones,
    description: 'Your own recording, or a YouTube video or playlist. Length and format are read from the recording.',
    endpoint: `${API}/audiobooks/`,
    summaryKey: 'audiobooks',
    row: (item) => ({ title: item.title, subtitle: [item.author_name, item.duration].filter(Boolean).join(' · '), image: item.cover }),
    filters: [
      { name: 'author', label: 'Author', optionsFrom: 'authors' },
      { name: 'language', label: 'Language', optionsFrom: 'audiobook_languages', options: opts('pa:Punjabi|en:English|hi:Hindi|ur:Urdu') },
      F_PUBLISHED,
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 255 },
      { name: 'title_pa', label: 'Title (Gurmukhi)', type: 'gurmukhi', maxLength: 255 },
      { name: 'author', label: 'Author', type: 'select', optionsFrom: 'authors', numeric: true },
      { name: 'narrator', label: 'Narrator', type: 'text' },
      { name: 'language', label: 'Language', type: 'select', optionsFrom: 'audiobook_languages', options: opts('pa:Punjabi|en:English|hi:Hindi|ur:Urdu') },
      { name: 'genre', label: 'Genre', type: 'text', placeholder: 'History, Sakhi…' },
      file('cover', 'Cover', 'picture'),
      { name: 'cover_credit', label: 'Cover credit', type: 'text' },
      { name: 'cover_source_url', label: 'Cover source link', type: 'url' },
      file('mp3_file', 'Recording', 'audio'),
      {
        name: 'duration',
        label: 'Length',
        type: 'text',
        placeholder: '1:25:00',
        pattern: DURATION,
        patternMessage: 'Use H:MM:SS or MM:SS, e.g. 1:25:00.',
        hint: 'Filled in from the recording; needed for YouTube audiobooks.',
      },
      { name: 'format', label: 'Format', type: 'text', placeholder: 'MP3', hint: 'Filled in from the recording.' },
      youtubeId(),
      { name: 'youtube_playlist_id', label: 'YouTube playlist id', type: 'text' },
      { name: 'youtube_channel', label: 'YouTube channel', type: 'text' },
      { name: 'source_url', label: 'Source link', type: 'url' },
      rating,
      published,
      { name: 'description', label: 'Description', type: 'textarea', span: 'full' },
      {
        name: 'chapters',
        label: 'Chapters',
        type: 'list',
        addLabel: 'Add chapter',
        hint: 'YouTube chapters can’t be Premium-only (YouTube’s terms).',
        itemFields: [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'duration', label: 'Length', type: 'text', placeholder: '20:00' },
          { name: 'youtube_id', label: 'YouTube id', type: 'text', pattern: YOUTUBE_ID },
          { name: 'start_seconds', label: 'Starts at (s)', type: 'number', min: 0 },
          { name: 'locked', label: 'Premium', type: 'checkbox' },
        ],
        example: [{ title: 'Part 1', duration: '20:00', start_seconds: 0 }],
      },
    ],
  },
  {
    key: 'authors',
    slug: 'authors',
    group: 'Library',
    label: 'Authors',
    singular: 'Author',
    icon: FaUserEdit,
    description: 'Writers and scholars shown on ebook and audiobook pages.',
    endpoint: `${API}/authors/`,
    summaryKey: 'authors',
    refreshChoices: true,
    row: (item) => ({
      title: item.name,
      subtitle: [item.genre, `${item.book_count ?? 0} books · ${item.audiobook_count ?? 0} audiobooks`].filter(Boolean).join(' · '),
      image: item.image,
    }),
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: true, maxLength: 255 },
      { name: 'genre', label: 'Genre / field', type: 'text', placeholder: 'History, Poetry…' },
      file('image', 'Portrait', 'picture'),
      { name: 'image_credit', label: 'Portrait credit', type: 'text' },
      { name: 'image_source_url', label: 'Portrait source link', type: 'url' },
      rating,
      { name: 'born', label: 'Born', type: 'date' },
      { name: 'died', label: 'Died', type: 'date', hint: 'Leave empty if living.' },
      { name: 'notable_works', label: 'Notable works', type: 'textarea', span: 'full' },
      { name: 'biography', label: 'Biography', type: 'textarea', rows: 6, span: 'full' },
      { name: 'awards', label: 'Awards', type: 'textarea', span: 'full' },
    ],
  },

  /* =========================== LEARNING PORTAL ========================= */
  {
    key: 'learning',
    slug: 'learning-material',
    group: 'Learning portal',
    label: 'Learning Material',
    singular: 'Lesson',
    icon: FaGraduationCap,
    description: 'Lessons for the learning portal: text, a video link or an uploaded video.',
    endpoint: `${API}/learning-material/`,
    summaryKey: 'learning_material',
    row: learningRow,
    filters: learningFilters,
    fields: [
      ...learningCommon,
      { name: 'duration_minutes', label: 'Length (minutes)', type: 'number', min: 1, step: 1 },
      { name: 'video_file', label: 'Video link', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…' },
      file('video_upload', '…or upload a video', 'video'),
      { name: 'content', label: 'Lesson text', type: 'textarea', rows: 10, span: 'full', hint: 'Leave a blank line between sections.' },
    ],
  },
  {
    key: 'quizzes',
    slug: 'quizzes',
    group: 'Learning portal',
    label: 'Quizzes',
    singular: 'Quiz',
    icon: FaQuestionCircle,
    description: 'Multiple-choice quizzes. Saving the questions replaces all of them.',
    endpoint: `${API}/quizzes/`,
    summaryKey: 'quizzes',
    row: (item) => ({
      title: item.title,
      subtitle: [item.category_name, item.question_count != null && `${item.question_count} questions`].filter(Boolean).join(' · '),
      image: item.picture,
    }),
    filters: learningFilters,
    fields: [
      ...learningCommon,
      { name: 'time_limit_seconds', label: 'Time limit (seconds)', type: 'number', min: 0, step: 1, hint: 'Empty = no limit.' },
      { name: 'time_per_question_seconds', label: 'Time per question (seconds)', type: 'number', min: 0, step: 1 },
      { name: 'pass_percentage', label: 'Pass mark (%)', type: 'number', min: 0, max: 100, step: 1 },
      { name: 'max_attempts', label: 'Max attempts', type: 'number', min: 0, step: 1, hint: 'Empty = unlimited.' },
      { name: 'shuffle_questions', label: 'Shuffle questions', type: 'checkbox', defaultValue: false },
      { name: 'questions', label: 'Questions', type: 'questions', required: true, span: 'full' },
    ],
  },
  {
    key: 'categories',
    slug: 'topics',
    group: 'Learning portal',
    label: 'Topics',
    singular: 'Topic',
    icon: FaTags,
    description: 'The topics lessons, quizzes and games are filed under. A topic with items in it can’t be deleted.',
    endpoint: `${API}/categories/`,
    summaryKey: 'categories',
    refreshChoices: true,
    row: (item) => ({ title: item.name, subtitle: `${item.item_count ?? 0} items` }),
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 100 },
      { name: 'icon', label: 'Icon', type: 'text', placeholder: 'FaBook', hint: 'A react-icons name.' },
      order,
      { name: 'description', label: 'Description', type: 'textarea', span: 'full' },
    ],
  },

  /* ================================ GAMES ============================== */
  {
    key: 'games',
    slug: 'games',
    group: 'Games',
    label: 'Game cards',
    singular: 'Game card',
    icon: FaGamepad,
    description: 'The game cards on the Learning page and which game each one opens.',
    endpoint: `${API}/games/`,
    summaryKey: 'games',
    row: learningRow,
    filters: [{ name: 'game_key', label: 'Game', optionsFrom: 'game_keys' }, ...learningFilters],
    fields: [
      { name: 'game_key', label: 'Game', type: 'select', required: true, optionsFrom: 'game_keys', options: opts('word_search:Word Search|memory_match:Memory Match') },
      ...learningCommon,
      { name: 'game_settings', label: 'Game settings (JSON)', type: 'json', span: 'full', placeholder: '{ "grid": 10 }', hint: 'Optional options for the game, as a JSON object.' },
    ],
  },
  {
    key: 'game-words',
    slug: 'game-words',
    group: 'Games',
    label: 'Word Search words',
    singular: 'Word',
    icon: FaFont,
    description: 'Words for Word Search / Shabad Khoj: English letters plus the Gurmukhi word.',
    endpoint: `${API}/game-words/`,
    summaryKey: 'game_words',
    row: (item) => ({ title: `${item.word} · ${item.punjabi}`, subtitle: [item.level_range, item.difficulty, item.category].filter(Boolean).join(' · ') }),
    filters: [
      { name: 'level_range', label: 'Levels', optionsFrom: 'word_levels', options: opts('1-10|11-20') },
      { name: 'difficulty', label: 'Difficulty', optionsFrom: 'difficulties', options: DIFFICULTIES },
      F_ACTIVE,
    ],
    fields: [
      { name: 'word', label: 'Word (English letters)', type: 'text', required: true, pattern: /^[A-Za-z]+$/, patternMessage: 'English letters only — no spaces or numbers.' },
      { name: 'punjabi', label: 'Word (Gurmukhi)', type: 'gurmukhi', required: true },
      { name: 'game_key', label: 'Game', type: 'select', options: opts('word_search:Word Search'), defaultValue: 'word_search' },
      { name: 'level_range', label: 'Levels', type: 'select', optionsFrom: 'word_levels', options: opts('1-10|11-20') },
      { name: 'difficulty', label: 'Difficulty', type: 'select', optionsFrom: 'difficulties', options: DIFFICULTIES },
      { name: 'category', label: 'Category', type: 'text', placeholder: 'Family' },
      { name: 'hint', label: 'Hint', type: 'text' },
      { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
  },
  {
    key: 'arcade',
    slug: 'arcade-content',
    group: 'Games',
    label: 'Arcade content',
    singular: 'Arcade item',
    icon: FaPuzzlePiece,
    description: 'Letters, words, proverbs, events, people, places and jigsaw pictures for the map games.',
    endpoint: `${API}/arcade-content/`,
    summaryKey: 'arcade_content',
    loadBuiltin: `${API}/arcade-content/load-builtin/`,
    jsonImport: true,
    row: (item) => ({ title: item.label || item.slug, subtitle: [item.game_key, item.difficulty, item.group].filter(Boolean).join(' · ') }),
    filters: [
      { name: 'game_key', label: 'Game', optionsFrom: 'arcade_games', options: ARCADE_GAMES },
      { name: 'difficulty', label: 'Difficulty', optionsFrom: 'difficulties', options: DIFFICULTIES },
      F_ACTIVE,
    ],
    fields: [
      { name: 'game_key', label: 'Game', type: 'select', required: true, optionsFrom: 'arcade_games', options: ARCADE_GAMES, lockOnEdit: true },
      { name: 'difficulty', label: 'Difficulty', type: 'select', optionsFrom: 'difficulties', options: DIFFICULTIES, defaultValue: 'easy' },
      {
        name: 'group',
        label: 'Group',
        type: 'select',
        required: true,
        optionsFn: (values, choices) => {
          const live = (choices.arcade_games || []).find((g) => g.value === values.game_key);
          return (live?.groups?.length ? live.groups : ARCADE_GROUPS[values.game_key] || []).map((g) => ({ value: g, label: g }));
        },
        showWhen: { field: 'game_key', in: Object.keys(ARCADE_GROUPS) },
      },
      order,
      { name: 'slug', label: 'Short name', type: 'text', maxLength: 80, hint: 'Made up when left empty.' },
      { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
      { name: 'data', label: 'Content', type: 'arcadeData', required: true, span: 'full' },
    ],
  },

  /* ================================ GURMAT ============================= */
  {
    key: 'gurbani',
    slug: 'gurbani',
    group: 'Gurmat',
    label: 'Gurbani',
    singular: 'Gurbani item',
    icon: FaPrayingHands,
    description: 'Shabads and banis (BaniDB text or a PDF), kirtan audio and video — same rules as Django admin.',
    endpoint: `${API}/gurbani/`,
    summaryKey: 'gurbani',
    row: (item) => ({ title: item.title, subtitle: [item.type, item.category, item.artist].filter(Boolean).join(' · '), image: item.image }),
    filters: [
      { name: 'type', label: 'Type', optionsFrom: 'gurbani_types', options: opts('shabad:Shabad|audio:Audio|video:Video') },
      { name: 'category', label: 'Category', optionsFrom: 'gurbani_categories' },
      { name: 'access', label: 'Access', optionsFrom: 'gurbani_access', options: opts('free:Free|standard:Standard|premium:Premium') },
      F_PUBLISHED,
    ],
    fields: [
      { name: 'type', label: 'Type', type: 'select', required: true, optionsFrom: 'gurbani_types', options: opts('shabad:Shabad / bani (text)|audio:Audio|video:Video'), defaultValue: 'shabad' },
      { name: 'category', label: 'Category', type: 'select', optionsFrom: 'gurbani_categories', options: opts('nitnem:Nitnem|bani:Bani|shabad:Shabad|kirtan:Kirtan|katha:Katha|simran:Simran|history:History') },
      { name: 'title', label: 'Title (English)', type: 'text', required: true, maxLength: 200 },
      { name: 'title_gurmukhi', label: 'Title (Gurmukhi)', type: 'gurmukhi' },
      slug,
      { name: 'writer', label: 'Bani of', type: 'text', placeholder: 'Guru Nanak Dev Ji' },
      { name: 'raag', label: 'Raag', type: 'text' },
      { name: 'ang', label: 'Ang', type: 'number', min: 1, max: 1430, step: 1 },
      { name: 'banidb_kind', label: 'BaniDB text', type: 'select', optionsFrom: 'banidb_kinds', options: opts('shabad:Shabad|bani:Bani'), showWhen: { field: 'type', in: ['shabad'] } },
      { name: 'banidb_id', label: 'BaniDB id', type: 'number', min: 1, step: 1, showWhen: { field: 'type', in: ['shabad'] } },
      file('pdf_file', 'PDF', 'pdf', { showWhen: { field: 'type', in: ['shabad'] } }),
      { name: 'artist', label: 'Ragi / Kathavachak', type: 'text', showWhen: { field: 'type', in: ['audio', 'video'] } },
      file('audio_file', 'Audio file', 'audio', { showWhen: { field: 'type', in: ['audio'] } }),
      file('video_file', 'Video file', 'video', { showWhen: { field: 'type', in: ['video'] } }),
      youtubeId(),
      { name: 'youtube_channel', label: 'YouTube channel', type: 'text', showWhen: { field: 'type', in: ['audio', 'video'] } },
      { name: 'media_url', label: 'Media link (https)', type: 'url', httpsOnly: true, showWhen: { field: 'type', in: ['audio', 'video'] } },
      { name: 'duration_seconds', label: 'Length (seconds)', type: 'number', min: 0, step: 1, hint: 'Measured from the audio file.', showWhen: { field: 'type', in: ['audio', 'video'] } },
      { name: 'media_license', label: 'Licence', type: 'select', optionsFrom: 'gurbani_licences', options: opts('youtube:YouTube embed|cc-by:Creative Commons|permission:Owner’s permission|own:Our own') },
      { name: 'permission_note', label: 'Permission note', type: 'text', showWhen: { field: 'media_license', in: ['permission'] } },
      { name: 'source_url', label: 'Source link', type: 'url' },
      { name: 'access', label: 'Access', type: 'select', optionsFrom: 'gurbani_access', options: opts('free:Free|standard:Standard|premium:Premium'), defaultValue: 'free', hint: 'YouTube videos stay Free.' },
      file('image', 'Picture', 'picture'),
      order,
      published,
      { name: 'description', label: 'Description', type: 'textarea', span: 'full' },
    ],
  },
  {
    key: 'history',
    slug: 'sikh-history',
    group: 'Gurmat',
    label: 'Sikh History',
    singular: 'History article',
    icon: FaLandmark,
    description: 'Articles made of sections, with sources and related articles.',
    endpoint: `${API}/history/`,
    summaryKey: 'history',
    refreshChoices: true,
    row: (item) => ({ title: item.title, subtitle: [item.category, item.date_label].filter(Boolean).join(' · '), image: item.image }),
    filters: [{ name: 'category', label: 'Category', optionsFrom: 'history_categories' }, F_PUBLISHED],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 200 },
      { name: 'title_pa', label: 'Title (Gurmukhi)', type: 'gurmukhi' },
      { name: 'category', label: 'Category', type: 'select', required: true, optionsFrom: 'history_categories', options: opts('gurus:Gurus|khalsa:Khalsa|leaders:Leaders|events:Events|places:Places') },
      slug,
      { name: 'subtitle', label: 'Subtitle', type: 'text' },
      { name: 'date_label', label: 'Date label', type: 'text', placeholder: '1469 – 1539' },
      { name: 'start_year', label: 'Start year', type: 'number', step: 1 },
      { name: 'end_year', label: 'End year', type: 'number', step: 1 },
      file('image', 'Picture', 'picture'),
      order,
      published,
      { name: 'summary', label: 'Summary', type: 'textarea', required: true, rows: 3, span: 'full' },
      {
        name: 'sections',
        label: 'Sections',
        type: 'list',
        addLabel: 'Add section',
        itemFields: [
          { name: 'heading', label: 'Heading', type: 'text' },
          { name: 'paragraphs', label: 'Text', type: 'textarea', required: true, hint: 'Blank line between paragraphs.' },
        ],
        example: [{ heading: 'Early life', paragraphs: 'First paragraph.\n\nSecond paragraph.' }],
      },
      {
        name: 'sources',
        label: 'Sources',
        type: 'list',
        addLabel: 'Add source',
        itemFields: [
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'url', label: 'Link (https)', type: 'url', required: true, httpsOnly: true },
        ],
        example: [{ title: 'SikhiWiki', url: 'https://www.sikhiwiki.org' }],
      },
      { name: 'related', label: 'Related articles', type: 'multiselect', optionsFrom: 'history_articles', span: 'full' },
    ],
  },
  {
    key: 'sakhis',
    slug: 'sakhis',
    group: 'Gurmat',
    label: 'Sakhis & Kahaniyaan',
    singular: 'Sakhi',
    icon: FaFeatherAlt,
    description: 'Sakhis and kahaniyaan — the category decides which. Leave a blank line between paragraphs.',
    endpoint: `${API}/sakhis/`,
    summaryKey: 'sakhis',
    row: (item) => ({ title: item.title, subtitle: [item.kind, item.about || item.category].filter(Boolean).join(' · '), image: item.image }),
    filters: [
      { name: 'kind', label: 'Kind', options: opts('sakhi:Sakhis|kahani:Kahaniyaan') },
      { name: 'category', label: 'Category', optionsFrom: 'sakhi_categories' },
      F_PUBLISHED,
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 200 },
      { name: 'title_pa', label: 'Title (Gurmukhi)', type: 'gurmukhi' },
      { name: 'category', label: 'Category', type: 'select', optionsFrom: 'sakhi_categories', options: opts('gurus:Gurus|sikhs:Sikhs|bhagats:Bhagats|other:Other') },
      { name: 'about', label: 'About', type: 'text', placeholder: 'Guru Nanak Dev Ji' },
      slug,
      file('image', 'Illustration', 'picture'),
      file('audio_file', 'Read aloud (audio)', 'audio'),
      youtubeId(),
      { name: 'source', label: 'Source', type: 'text' },
      { name: 'source_url', label: 'Source link', type: 'url' },
      order,
      published,
      { name: 'summary', label: 'Summary', type: 'textarea', required: true, rows: 3, span: 'full' },
      { name: 'story', label: 'Story', type: 'textarea', required: true, rows: 10, span: 'full' },
      { name: 'story_pa', label: 'Story (Gurmukhi)', type: 'gurmukhi', multiline: true, rows: 8, span: 'full' },
      { name: 'lesson', label: 'Lesson', type: 'textarea', span: 'full' },
      { name: 'lesson_pa', label: 'Lesson (Gurmukhi)', type: 'gurmukhi', multiline: true, span: 'full' },
    ],
  },

  /* =============================== COMMUNITY =========================== */
  {
    key: 'events',
    slug: 'events',
    group: 'Community',
    label: 'Events',
    singular: 'Event',
    icon: FaCalendarAlt,
    description: 'Community events. Events members add wait here until approved.',
    endpoint: `${API}/events/`,
    summaryKey: 'events',
    row: (item) => ({ title: item.title, subtitle: [item.start_date, item.location].filter(Boolean).join(' · '), image: item.image }),
    filters: [
      { name: 'is_approved', label: 'Status', options: opts('false:Waiting for approval|true:Approved') },
      { name: 'when', label: 'When', options: opts('upcoming:Upcoming|past:Past') },
      { name: 'kind', label: 'Kind', optionsFrom: 'event_kinds' },
    ],
    fields: [
      { name: 'title', label: 'Event name', type: 'text', required: true, maxLength: 200 },
      { name: 'kind', label: 'Kind', type: 'select', optionsFrom: 'event_kinds', options: opts('event:Event|gurpurab:Gurpurab|sangrand:Sangrand|festival:Festival|kirtan:Kirtan|other:Other'), defaultValue: 'event' },
      { name: 'location', label: 'Location', type: 'text', required: true, placeholder: 'Gurdwara, city' },
      { name: 'start_date', label: 'Date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date' },
      { name: 'start_time', label: 'Start time', type: 'time' },
      { name: 'link', label: 'More info link', type: 'url' },
      file('image', 'Picture', 'picture'),
      { name: 'is_approved', label: 'Approved (shown on the website)', type: 'checkbox', defaultValue: true },
      { name: 'is_featured', label: 'Featured', type: 'checkbox', defaultValue: false },
      { name: 'description', label: 'One-line description', type: 'text', span: 'full', maxLength: 300 },
      { name: 'details', label: 'Details', type: 'textarea', span: 'full' },
    ],
  },
  {
    key: 'gurpurabs',
    slug: 'gurpurabs',
    group: 'Community',
    label: 'Gurpurabs',
    singular: 'Calendar day',
    icon: FaCalendarCheck,
    description: 'The Nanakshahi calendar. Days added or changed here are kept when a year is rebuilt.',
    endpoint: `${API}/gurpurabs/`,
    summaryKey: 'gurpurabs',
    row: (item) => ({ title: item.title, subtitle: [item.date, item.nanakshahi_date, item.kind].filter(Boolean).join(' · ') }),
    filters: [
      { name: 'year', label: 'Year', type: 'number', defaultValue: () => String(new Date().getFullYear()) },
      { name: 'month', label: 'Month', options: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => ({ value: String(i + 1), label: m })) },
      { name: 'kind', label: 'Kind', optionsFrom: 'gurpurab_kinds' },
      { name: 'is_custom', label: 'Source', options: opts('true:Added here|false:Built-in') },
    ],
    fields: [
      { name: 'title', label: 'Name', type: 'text', required: true, maxLength: 200 },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'kind', label: 'Kind', type: 'select', required: true, optionsFrom: 'gurpurab_kinds', options: opts('gurpurab:Gurpurab|shaheedi:Shaheedi Purab|festival:Festival|historical:Historical|sangrand:Sangrand|puranmashi:Puranmashi|masya:Masya') },
      { name: 'nanakshahi_date', label: 'Nanakshahi date', type: 'text', hint: 'Worked out from the date when left empty.' },
      { name: 'is_lunar', label: 'Follows the lunar calendar', type: 'checkbox', defaultValue: false },
      { name: 'description', label: 'Description', type: 'textarea', span: 'full' },
    ],
  },
  {
    key: 'news',
    slug: 'news',
    group: 'Community',
    label: 'News',
    singular: 'News article',
    icon: FaNewspaper,
    description: 'News and announcements for the website.',
    endpoint: `${API}/news/`,
    summaryKey: 'news',
    row: (item) => ({ title: item.title, subtitle: [item.category, item.published_at && String(item.published_at).slice(0, 10)].filter(Boolean).join(' · '), image: item.image }),
    filters: [{ name: 'category', label: 'Category', optionsFrom: 'news_categories' }, F_PUBLISHED],
    fields: [
      { name: 'title', label: 'Headline', type: 'text', required: true, maxLength: 255 },
      { name: 'category', label: 'Category', type: 'select', optionsFrom: 'news_categories', options: opts('news:News|announcement:Announcement|history:History|community:Community') },
      { name: 'published_at', label: 'Publish date', type: 'datetime' },
      { name: 'source_url', label: 'Source link', type: 'url' },
      file('image', 'Picture', 'picture'),
      published,
      { name: 'is_featured', label: 'Featured', type: 'checkbox', defaultValue: false },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 3, span: 'full' },
      { name: 'body', label: 'Article', type: 'textarea', rows: 10, span: 'full' },
    ],
  },
];

/* ---------------------------------------------------------------------------
 * Lookups
 * ------------------------------------------------------------------------- */
export const CONTENT_TYPES_BY_SLUG = Object.fromEntries(CONTENT_TYPES.map((type) => [type.slug, type]));

/** Sidebar groups in display order. */
export const CONTENT_GROUPS = ['Library', 'Learning portal', 'Games', 'Gurmat', 'Community'];
