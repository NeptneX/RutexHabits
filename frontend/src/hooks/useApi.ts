import { useCallback, useEffect, useState, type DependencyList } from 'react'

interface State<T> {
  data: T | undefined
  error: string | null
  loading: boolean
}

/**
 * Carga datos de la API y expone {data, error, loading, reload, setData}.
 *
 * - Se vuelve a ejecutar cuando cambian `deps` (p. ej. el mes del calendario).
 * - Ignora respuestas "viejas": si cambias de mes rápido, una respuesta lenta
 *   del mes anterior no pisa la del actual (flag `cancelled`).
 * - `setData` permite actualizaciones optimistas (pintar el cambio antes de
 *   que responda el servidor).
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((err: Error) => !cancelled && setState((s) => ({ ...s, error: err.message, loading: false })))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback((updater: (prev: T) => T) => {
    setState((s) => (s.data === undefined ? s : { ...s, data: updater(s.data) }))
  }, [])

  return { ...state, reload, setData }
}
