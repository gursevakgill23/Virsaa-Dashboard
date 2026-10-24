/**
 * useContentList — one dashboard section's list, a page at a time.
 *
 *   GET <endpoint>?page=1&page_size=25&search=…&<filters>
 *   → { count, next, previous, results }
 *
 * Returns the loaded items plus helpers to load more, reload, and update the
 * list after an item is saved (upsert) or deleted (remove) without refetching.
 * Responses that arrive after the search/filters changed are ignored.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, getErrorMessage, toCount, toList } from '../api/client';

export const PAGE_SIZE = 25;

const useContentList = (endpoint, { search = '', filters = {} } = {}) => {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  // Only send filters that have a value
  const params = useMemo(() => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    if (search.trim()) clean.search = search.trim();
    return clean;
  }, [filters, search]);
  const paramsKey = JSON.stringify(params);

  const fetchPage = useCallback(
    async (pageNumber) => {
      if (!endpoint) return;
      const id = ++requestId.current;
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);
      setError('');
      try {
        const { data } = await api.get(endpoint, {
          params: { ...JSON.parse(paramsKey), page: pageNumber, page_size: PAGE_SIZE },
        });
        if (id !== requestId.current) return;
        const results = toList(data);
        setItems((prev) => (pageNumber === 1 ? results : [...prev, ...results]));
        setCount(toCount(data));
        setPage(pageNumber);
      } catch (err) {
        if (id !== requestId.current) return;
        if (pageNumber === 1) setItems([]);
        const status = err?.response?.status;
        setError(
          status === 404 && pageNumber === 1
            ? 'This section isn’t on the server yet. Deploy the dashboard_api app and try again.'
            : getErrorMessage(err, 'Could not load the list.')
        );
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [endpoint, paramsKey]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const reload = useCallback(() => fetchPage(1), [fetchPage]);
  const loadMore = useCallback(() => fetchPage(page + 1), [fetchPage, page]);

  /** Put a saved item in the list (replace it, or add it at the top). */
  const upsert = useCallback((item) => {
    if (!item || item.id === undefined) return;
    setItems((prev) => {
      const at = prev.findIndex((x) => x.id === item.id);
      if (at === -1) {
        setCount((c) => c + 1);
        return [item, ...prev];
      }
      const next = prev.slice();
      next[at] = item;
      return next;
    });
  }, []);

  /** Take a deleted item out of the list. */
  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setCount((c) => Math.max(0, c - 1));
  }, []);

  return { items, count, loading, loadingMore, error, hasMore: items.length < count, loadMore, reload, upsert, remove };
};

export default useContentList;
