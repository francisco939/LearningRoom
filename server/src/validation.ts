import { z } from 'zod'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Email is required')
  .max(254, 'Email must be at most 254 characters')
  .pipe(z.email('Enter a valid email address'))
  .transform(normalizeEmail)

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name is required')
  .max(50, 'Display name must be at most 50 characters')

export const tokenSchema = z
  .string()
  .trim()
  .min(20, 'Token is invalid')
  .max(256, 'Token is invalid')
  .regex(/^[A-Za-z0-9_-]+$/u, 'Token is invalid')

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
})

export const verifyEmailSchema = z.object({
  token: tokenSchema,
})

export const resendVerificationSchema = z.object({
  email: emailSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: passwordSchema,
})

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required').max(128),
})

export const updateMeSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((value) => value.displayName !== undefined || value.email !== undefined, {
    message: 'Provide displayName or email',
  })

const jsonObjectSchema = z.record(z.string(), z.unknown())

const epochMsSchema = z
  .number()
  .int()
  .nonnegative()
  .max(8_640_000_000_000_000, 'Timestamp is out of range')

const violationSchema = z
  .object({
    at: epochMsSchema,
    kind: z.enum(['away', 'no-checkin']),
    detail: z.string().max(500).optional(),
  })
  .passthrough()

export const syncSessionSchema = z
  .object({
    id: z.string().trim().min(1, 'Session id is required').max(128),
    startedAt: epochMsSchema,
    endedAt: epochMsSchema,
    mode: z.enum(['pomodoro', 'countdown', 'stopwatch']),
    scene: z.string().min(1).max(64),
    supervision: z.enum(['lenient', 'standard', 'strict']),
    plannedSec: z.number().int().min(0).max(604800),
    focusedSec: z.number().int().min(0).max(604800),
    starsLeft: z.number().int().min(0).max(3),
    violations: z.array(violationSchema).max(100),
    status: z.enum(['completed', 'aborted', 'failed']),
    fishEarned: z.number().int().min(0).max(1000000),
  })
  .passthrough()

export const syncSchema = z.object({
  settings: jsonObjectSchema,
  progress: jsonObjectSchema,
  sessions: z.array(syncSessionSchema).max(2000, 'At most 2000 sessions per sync'),
})

export type SyncInput = z.infer<typeof syncSchema>
export type SyncSessionInput = z.infer<typeof syncSessionSchema>
