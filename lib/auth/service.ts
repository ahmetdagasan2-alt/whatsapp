// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Signup / login / password-reset flows. Route handlers in app/api/auth/* are thin
// wrappers that translate AuthError codes into HTTP responses.

import {
  consumeOtp,
  countRecentSends,
  createUser,
  findUserByEmail,
  findUserByPhone,
  getOtp,
  insertOtp,
  recordOtpAttempt,
  refreshOtp,
  updatePassword,
  type OtpRow,
} from '@/lib/auth/db';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_RESEND_COOLDOWN_SECONDS,
  OtpNotConfiguredError,
  codeMatches,
  generateCode,
  generateRequestId,
  hashCode,
  otpExpiry,
  sendOtpViaWhatsApp,
} from '@/lib/auth/otp';
import { hashPassword, isStrongEnough, verifyPassword } from '@/lib/auth/password';
import { isCountryCode, maskPhone, toE164 } from '@/lib/auth/phone';
import { startSession } from '@/lib/auth/session';

export type AuthErrorCode =
  | 'invalid_input'
  | 'invalid_email'
  | 'invalid_phone'
  | 'weak_password'
  | 'email_taken'
  | 'phone_taken'
  | 'otp_not_configured'
  | 'otp_send_failed'
  | 'rate_limited'
  | 'cooldown'
  | 'invalid_code'
  | 'expired_code'
  | 'too_many_attempts'
  | 'invalid_credentials';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly status = 400,
  ) {
    super(code);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function sendCode(phoneE164: string, code: string): Promise<void> {
  if ((await countRecentSends(phoneE164)) >= OTP_MAX_SENDS_PER_HOUR) throw new AuthError('rate_limited', 429);
  try {
    await sendOtpViaWhatsApp(phoneE164, code);
  } catch (err) {
    if (err instanceof OtpNotConfiguredError) throw new AuthError('otp_not_configured', 503);
    throw new AuthError('otp_send_failed', 502);
  }
}

// ── Signup ──────────────────────────────────────────────────────────────────

export async function startSignup(input: Record<string, unknown>) {
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  const email = normalizeEmail(input.email);
  const country = input.country;
  const password = typeof input.password === 'string' ? input.password : '';

  if (!firstName || !lastName) throw new AuthError('invalid_input');
  if (!EMAIL_RE.test(email)) throw new AuthError('invalid_email');
  if (!isCountryCode(country)) throw new AuthError('invalid_phone');
  const phoneE164 = toE164(country, String(input.phone ?? ''));
  if (!phoneE164) throw new AuthError('invalid_phone');
  if (!isStrongEnough(password)) throw new AuthError('weak_password');

  if (await findUserByEmail(email)) throw new AuthError('email_taken', 409);
  if (await findUserByPhone(phoneE164)) throw new AuthError('phone_taken', 409);

  const requestId = generateRequestId();
  const code = generateCode();
  await sendCode(phoneE164, code);
  await insertOtp({
    id: requestId,
    purpose: 'signup',
    phoneE164,
    email,
    payload: { firstName, lastName, country, passwordHash: await hashPassword(password) },
    codeHash: hashCode(requestId, code),
    expiresAt: otpExpiry(),
  });
  return { requestId, phoneMasked: maskPhone(phoneE164), resendAfter: OTP_RESEND_COOLDOWN_SECONDS };
}

async function checkCode(otp: OtpRow | null, purpose: OtpRow['purpose'], code: unknown): Promise<OtpRow> {
  if (!otp || otp.purpose !== purpose || otp.consumed_at) throw new AuthError('invalid_code');
  if (new Date(otp.expires_at).getTime() < Date.now()) throw new AuthError('expired_code');
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new AuthError('too_many_attempts', 429);
  if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !codeMatches(otp.id, code, otp.code_hash)) {
    await recordOtpAttempt(otp.id);
    throw new AuthError(otp.attempts + 1 >= OTP_MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid_code');
  }
  if (!(await consumeOtp(otp.id))) throw new AuthError('invalid_code');
  return otp;
}

export async function completeSignup(input: Record<string, unknown>) {
  const otp = await checkCode(await getOtp(String(input.requestId ?? '')), 'signup', input.code);
  const payload = otp.payload as { firstName: string; lastName: string; country: string; passwordHash: string };

  // Someone may have registered the same email/phone while this code was pending.
  if (await findUserByEmail(otp.email)) throw new AuthError('email_taken', 409);
  if (await findUserByPhone(otp.phone_e164)) throw new AuthError('phone_taken', 409);

  const user = await createUser({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: otp.email,
    phoneE164: otp.phone_e164,
    phoneCountry: payload.country,
    passwordHash: payload.passwordHash,
  });
  await startSession({ sub: String(user.id), email: user.email, name: `${user.first_name} ${user.last_name}` });
}

export async function resendCode(input: Record<string, unknown>) {
  const otp = await getOtp(String(input.requestId ?? ''));
  if (!otp || otp.consumed_at) throw new AuthError('invalid_code');
  const elapsed = (Date.now() - new Date(otp.last_sent_at).getTime()) / 1000;
  if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) throw new AuthError('cooldown', 429);
  const code = generateCode();
  await sendCode(otp.phone_e164, code);
  await refreshOtp(otp.id, hashCode(otp.id, code), otpExpiry());
  return { resendAfter: OTP_RESEND_COOLDOWN_SECONDS };
}

// ── Login ───────────────────────────────────────────────────────────────────

export async function login(input: Record<string, unknown>) {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const user = email ? await findUserByEmail(email) : null;
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(
    password,
    user?.password_hash ?? 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
  );
  if (!user || !ok) throw new AuthError('invalid_credentials', 401);
  await startSession({ sub: String(user.id), email: user.email, name: `${user.first_name} ${user.last_name}` });
}

// ── Password reset ──────────────────────────────────────────────────────────

export async function startPasswordReset(input: Record<string, unknown>) {
  const email = normalizeEmail(input.email);
  if (!EMAIL_RE.test(email)) throw new AuthError('invalid_email');
  const requestId = generateRequestId();
  const user = await findUserByEmail(email);
  // Unknown emails get the same response so the form can't be used to discover accounts.
  if (!user) return { requestId, resendAfter: OTP_RESEND_COOLDOWN_SECONDS };

  const code = generateCode();
  await sendCode(user.phone_e164, code);
  await insertOtp({
    id: requestId,
    purpose: 'reset',
    phoneE164: user.phone_e164,
    email,
    payload: null,
    codeHash: hashCode(requestId, code),
    expiresAt: otpExpiry(),
  });
  // The masked phone is not echoed back either, for the same reason.
  return { requestId, resendAfter: OTP_RESEND_COOLDOWN_SECONDS };
}

export async function completePasswordReset(input: Record<string, unknown>) {
  const password = typeof input.password === 'string' ? input.password : '';
  if (!isStrongEnough(password)) throw new AuthError('weak_password');
  const otp = await checkCode(await getOtp(String(input.requestId ?? '')), 'reset', input.code);
  const user = await findUserByEmail(otp.email);
  if (!user) throw new AuthError('invalid_code');
  await updatePassword(user.id, await hashPassword(password));
  await startSession({ sub: String(user.id), email: user.email, name: `${user.first_name} ${user.last_name}` });
}
