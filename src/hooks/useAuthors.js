/**
 * useAuthors — loads the author list once and shares it between every form
 * that needs an author dropdown (Ebooks, Audiobooks). A simple module-level
 * cache avoids re-downloading the list on every page visit.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage, toList } from '../api/client';

let cache = null; // { authors: [], loadedAt: number }
const CACHE_MS = 5 * 60 * 1000;

/** Call after creating an author so dropdowns pick up the new name. */
export const invalidateAuthorsCache = () => {
  cache = null;
};

/** @param {boolean} [enabled=true] skip the request on forms without an author field */
const useAuthors = (enabled = true) => {
  const [authors, setAuthors] = useState(cache?.authors || []);
  const [loading, setLoading] = useState(enabled && !cache);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!force && cache && Date.now() - cache.loadedAt < CACHE_MS) {
      setAuthors(cache.authors);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // page_size is ignored if the endpoint is not paginated.
      const { data } = await api.get('/collections/authors/', { params: { page_size: 1000 } });
      const list = toList(data)
        .filter((a) => a && a.id !== undefined && typeof a.name === 'string')
        .sort((a, b) => a.name.localeCompare(b.name));
      cache = { authors: list, loadedAt: Date.now() };
      setAuthors(list);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load authors.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { authors, loading, error, reload: () => load(true) };
};

export default useAuthors;
