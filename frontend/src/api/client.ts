// Cliente HTTP mínimo sobre fetch. Centraliza:
//  - la URL base,
//  - la serialización JSON,
//  - la conversión de errores HTTP en excepciones con un mensaje legible.
// Si algún día hay autenticación, aquí se añadiría la cabecera Authorization.

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** FastAPI devuelve `detail` como texto (HTTPException) o como lista (errores de validación). */
function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => {
        const field = d.loc?.filter((p) => p !== 'body').join('.')
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .join(' · ')
  }
  return 'Error desconocido'
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está arrancado el backend?')
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      message = formatDetail((await response.json()).detail)
    } catch {
      /* respuesta sin JSON: nos quedamos con el status */
    }
    throw new ApiError(response.status, message)
  }
  // 204 No Content no tiene cuerpo
  return (response.status === 204 ? undefined : await response.json()) as T
}

/** Construye "?a=1&b=2" ignorando valores undefined. */
export function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
}
