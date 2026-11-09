export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly headers: Record<string, string>

  constructor(status: number, code: string, message: string, headers: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.headers = headers
  }
}

export function errorBody(code: string, message: string) {
  return { error: { code, message } }
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /unique constraint failed/i.test(error.message)
}
