import { useCallback, useEffect, useRef } from 'react';

export const useDebouncedSave = <T>(save: (value: T) => void, delay = 500) => {
  const saveRef = useRef(save);
  saveRef.current = save;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ value: T } | null>(null);

  const flush = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (pendingRef.current) {
      const { value } = pendingRef.current;
      pendingRef.current = null;
      saveRef.current(value);
    }
  }, []);

  useEffect(() => flush, [flush]);

  return useCallback((value: T) => {
    pendingRef.current = { value };
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(flush, delay);
  }, [delay, flush]);
};
