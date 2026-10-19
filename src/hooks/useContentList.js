/**
 * useContentList — fetches the list endpoint for a content type and exposes
 * { items, loading, error, reload, prepend }. Stale responses from a previous
 * content type are ignored (prevents list flicker when switching pages fast).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage, toList } from '../api/client';

const useContentList = (endpoint) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!endpoint) return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(endpoint, { params: { ordering: '-id', page_size: 100 } });
      if (id !== requestId.current) return; // a newer request has started
      // Newest first, whether or not the API supports ?ordering=
      const list = toList(data).slice().sort((a, b) => (Number(b?.id) || 0) - (Number(a?.id) || 0));
      setItems(list);
    } catch (err) {
      if (id !== requestId.current) return;
      setItems([]);
      setError(
        err?.response?.status === 404
          ? 'This list endpoint does not exist on the backend yet. Uploads will work once the API route is added.'
          : getErrorMessage(err, 'Could not load items.')
      );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Adds a freshly created item to the top without refetching. */
  const prepend = useCallback((item) => {
    if (item && typeof item === 'object') setItems((prev) => [item, ...prev]);
  }, []);

  return { items, loading, error, reload, prepend };
};

export default useContentList;
