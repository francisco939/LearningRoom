import { bytesToHex, constantTimeEqual, hexToBytes, utf8 } from '../crypto'

const ALGORITHM = 'pbkdf2-sha256'
const ITERATIONS = 100_000
const KEY_BITS = 256
const SALT_BYTES = 16

// A deliberately unusable hash used to keep failed-login timing closer to a
// real password check when the account does not exist.
export const TIMING_DUMMY_HASH =
  'pbkdf2-sha256$100000$00000000000000000000000000000000$' +
  '0000000000000000000000000000000000000000000000000000000000000000'

function pepperFor(pepper: string): string {
  if (!pepper || pepper.length < 16) {
    throw new Error('PASSWORD_PEPPER is not configured')
  }
  return pepper
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  pepper: string,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8(password + pepperFor(pepper)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string, pepper: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES)
  crypto.getRandomValues(salt)
  const hash = await derivePassword(password, salt, pepper)
  return `${ALGORITHM}$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`
}

export async function verifyPassword(
  password: string,
  stored: string,
  pepper: string,
): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== ALGORITHM) return false

  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 1_000_000) {
    return false
  }

  const salt = hexToBytes(parts[2] ?? '')
  const expected = hexToBytes(parts[3] ?? '')
  if (!salt || !expected || salt.length !== SALT_BYTES) return false

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8(password + pepperFor(pepper)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    expected.length * 8,
  )
  return constantTimeEqual(new Uint8Array(bits), expected)
}
