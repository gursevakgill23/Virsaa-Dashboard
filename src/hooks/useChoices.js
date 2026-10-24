/**
 * useChoices — the options every form's drop-downs need, from
 * GET /api/dashboard/choices/ (authors, topics, languages, game names, Gurbani
 * types and licences, every section's categories and kinds…).
 *
 * Loaded once and shared by every component; call refreshChoices() after
 * adding, renaming or deleting an author, topic or history article.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client';

let cache = null; // last good response
let inflight = null; // the request in progress, shared by all callers
const subscribers = new Set();

const notify = () => subscribers.forEach((fn) => fn());

export const loadChoices = (force = false) => {
  if (!force && cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = api
    .get('/api/dashboard/choices/')
    .then(({ data }) => {
      cache = data && typeof data === 'object' ? data : {};
      notify();
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

/** Re-load the options in the background (after authors/topics change). */
export const refreshChoices = () => loadChoices(true).catch(() => {});

const useChoices = () => {
  const [, rerender] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const onChange = () => rerender((n) => n + 1);
    subscribers.add(onChange);
    if (!cache) loadChoices().catch((err) => setError(getErrorMessage(err, 'Could not load the form options.')));
    return () => subscribers.delete(onChange);
  }, []);

  const reload = useCallback(() => {
    setError('');
    loadChoices(true).catch((err) => setError(getErrorMessage(err, 'Could not load the form options.')));
  }, []);

  return { choices: cache || {}, loaded: Boolean(cache), error, reload };
};

export default useChoices;
