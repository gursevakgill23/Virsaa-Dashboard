/**
 * useDebouncedValue — returns `value` once it has stopped changing for `delay`
 * ms. Used so the list searches after the admin stops typing, not on every key.
 */
import { useEffect, useState } from 'react';

const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export default useDebouncedValue;
