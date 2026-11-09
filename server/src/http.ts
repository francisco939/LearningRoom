import type { Context } from 'hono'
import type { z } from 'zod'
import type { AppEnv } from './env'
import { ApiError } from './errors'

const MAX_JSON_BYTES = 5_000_000

export async function readJson<T>(c: Context<AppEnv>, schema: z.ZodType<T>): Promise<T> {
  const contentType = c.req.header('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json')
  }

  let text: string
  try {
    text = await c.req.text()
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body could not be read')
  }

  if (text.length > MAX_JSON_BYTES) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large')
  }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON')
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.length ? issue.path.join('.') : 'body'
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `${path}: ${issue?.message ?? 'Invalid request body'}`,
    )
  }

  return result.data
}

export function getClientIp(c: Context<AppEnv>): string {
  const direct = c.req.header('cf-connecting-ip')?.trim()
  if (direct) return direct
  const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'unknown'
}

export function parseStoredJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}
