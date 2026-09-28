import { useCallback, useEffect, useState } from 'react';

export interface ApiData<T> {
  /** The latest successfully loaded value; kept while reloading so the UI does not flicker. */
  data: T | undefined;
  /** The error from the current request, if it failed. */
  error: Error | undefined;
  isLoading: boolean;
  /** Fetches again, e.g. after a mutation. */
  reload: () => void;
}

interface Result<T> {
  load: (signal: AbortSignal) => Promise<T>;
  version: number;
  data?: T;
  error?: Error;
}

/**
 * Runs `load` whenever it changes (memoize it with useCallback) or `reload` is called.
 * Superseded and unmounted requests are aborted and their results ignored, so a slow
 * old response can never overwrite a newer one.
 */
export function useApiData<T>(load: (signal: AbortSignal) => Promise<T>): ApiData<T> {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T>>();

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult({ load, version, data });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult((previous) => ({
            load,
            version,
            data: previous?.data,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      },
    );
    return () => controller.abort();
  }, [load, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  const isCurrent = result?.load === load && result.version === version;
  return {
    data: result?.data,
    error: isCurrent ? result.error : undefined,
    isLoading: !isCurrent,
    reload,
  };
}
