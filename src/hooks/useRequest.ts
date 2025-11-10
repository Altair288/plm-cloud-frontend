import { useState, useCallback } from 'react';

interface UseRequestOptions<T> {
  manual?: boolean;
  defaultData?: T;
}

export function useRequest<T>(fn: () => Promise<T>, options: UseRequestOptions<T> = {}) {
  const { manual = false, defaultData } = options;
  const [data, setData] = useState<T | undefined>(defaultData);
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  if (!manual && loading && data === undefined) {
    // fire first load
    void run();
  }

  return { data, loading, error, run } as const;
}
