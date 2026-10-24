import { useCallback, useEffect, useState, type DependencyList } from "react";

export interface RequestState<T> {
  data: T | undefined;
  error: string;
  loading: boolean;
  /** Vuelve a pedir, por ejemplo después de guardar algo */
  reload: () => Promise<void>;
}

/**
 * Pide algo al back cuando se monta el componente y cada vez que cambian deps.
 * Si deps cambia antes de que llegue la respuesta, la vieja se ignora.
 * Con enabled en false no pide nada (por ejemplo mientras falta un dato).
 */
export function useRequest<T>(load: () => Promise<T>, deps: DependencyList, enabled = true): RequestState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);

  // La función se renueva solo cuando cambian deps, no en cada render
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    try {
      setData(await run());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [run]);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    setLoading(true);
    run()
      .then((result) => {
        if (!current) return;
        setData(result);
        setError("");
      })
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [run, enabled]);

  return { data, error, loading, reload };
}
