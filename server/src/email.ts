import type { Env } from './env'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const FROM = 'LearningRoom <noreply@learningroom.dpdns.org>'

interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function authLink(env: Env, kind: 'verify' | 'reset', token: string): string {
  const base = env.APP_ORIGIN.replace(/\/+$/u, '')
  return `${base}/?auth=${kind}&token=${encodeURIComponent(token)}`
}

async function sendEmail(env: Env, message: EmailMessage): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    // Missing email configuration must not break account creation or password
    // recovery. The generic API response intentionally reveals nothing.
    return false
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    })

    if (!response.ok) {
      console.error('Resend rejected an email request', { status: response.status })
      return false
    }
    return true
  } catch {
    console.error('Resend email request failed')
    return false
  }
}

export async function sendVerificationEmail(
  env: Env,
  email: string,
  displayName: string,
  token: string,
): Promise<boolean> {
  const link = authLink(env, 'verify', token)
  const safeName = escapeHtml(displayName)
  return sendEmail(env, {
    to: email,
    subject: 'Verify your LearningRoom email',
    text: [
      `Hi ${displayName},`,
      '',
      'Verify your LearningRoom email within 24 hours:',
      link,
      '',
      'If you did not create this account, you can ignore this message.',
    ].join('\n'),
    html: [
      `<p>Hi ${safeName},</p>`,
      '<p>Verify your LearningRoom email within 24 hours:</p>',
      `<p><a href="${escapeHtml(link)}">Verify email</a></p>`,
      '<p>If you did not create this account, you can ignore this message.</p>',
    ].join(''),
  })
}

export async function sendPasswordResetEmail(
  env: Env,
  email: string,
  token: string,
): Promise<boolean> {
  const link = authLink(env, 'reset', token)
  return sendEmail(env, {
    to: email,
    subject: 'Reset your LearningRoom password',
    text: [
      'A password reset was requested for this LearningRoom account.',
      '',
      'Use this link within 1 hour:',
      link,
      '',
      'If you did not request this, ignore this message. Your password will not change.',
    ].join('\n'),
    html: [
      '<p>A password reset was requested for this LearningRoom account.</p>',
      '<p>Use this link within 1 hour:</p>',
      `<p><a href="${escapeHtml(link)}">Reset password</a></p>`,
      '<p>If you did not request this, ignore this message. Your password will not change.</p>',
    ].join(''),
  })
}
