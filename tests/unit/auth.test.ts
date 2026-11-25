// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-1234';

// ── In-memory stand-ins for Postgres, WhatsApp and cookies ───────────────────

const db = vi.hoisted(() => ({
  users: [] as Record<string, unknown>[],
  otps: new Map<string, Record<string, unknown>>(),
}));
const sentCodes = vi.hoisted(() => [] as { phone: string; code: string }[]);
const sessions = vi.hoisted(() => [] as { email: string }[]);
const sendFailure = vi.hoisted(() => ({ metaCode: undefined as number | undefined }));

vi.mock('@/lib/auth/db', () => ({
  findUserByEmail: async (email: string) => db.users.find((u) => u.email === email) ?? null,
  findUserByPhone: async (phone: string) => db.users.find((u) => u.phone_e164 === phone) ?? null,
  createUser: async (u: Record<string, string>) => {
    const row = {
      id: db.users.length + 1,
      first_name: u.firstName,
      last_name: u.lastName,
      email: u.email,
      phone_e164: u.phoneE164,
      phone_country: u.phoneCountry,
      password_hash: u.passwordHash,
    };
    db.users.push(row);
    return row;
  },
  updatePassword: async (id: number, hash: string) => {
    const user = db.users.find((u) => u.id === id);
    if (user) user.password_hash = hash;
  },
  insertOtp: async (o: Record<string, unknown>) => {
    db.otps.set(o.id as string, {
      id: o.id,
      purpose: o.purpose,
      phone_e164: o.phoneE164,
      email: o.email,
      payload: o.payload,
      code_hash: o.codeHash,
      attempts: 0,
      sent_count: 1,
      last_sent_at: new Date().toISOString(),
      expires_at: (o.expiresAt as Date).toISOString(),
      consumed_at: null,
    });
  },
  getOtp: async (id: string) => (db.otps.has(id) ? { ...db.otps.get(id) } : null),
  recordOtpAttempt: async (id: string) => {
    const otp = db.otps.get(id)!;
    otp.attempts = (otp.attempts as number) + 1;
  },
  consumeOtp: async (id: string) => {
    const otp = db.otps.get(id)!;
    if (otp.consumed_at) return false;
    otp.consumed_at = new Date().toISOString();
    return true;
  },
  refreshOtp: async () => {},
  countRecentSends: async () => 0,
}));

vi.mock('@/lib/auth/otp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/otp')>()),
  sendOtpViaWhatsApp: async (phone: string, code: string) => {
    if (sendFailure.metaCode !== undefined) {
      const { OtpSendError } = await import('@/lib/auth/otp');
      throw new OtpSendError('meta error', sendFailure.metaCode);
    }
    sentCodes.push({ phone, code });
  },
}));

vi.mock('@/lib/auth/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/session')>()),
  startSession: async (user: { email: string }) => {
    sessions.push(user);
  },
}));

import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';
import { getCountryOptions, maskPhone, toE164 } from '@/lib/auth/phone';
import {
  AuthError,
  completePasswordReset,
  completeSignup,
  login,
  startPasswordReset,
  startSignup,
} from '@/lib/auth/service';

const lastCode = () => sentCodes[sentCodes.length - 1].code;
const wrongCode = (code: string) => (code === '000000' ? '111111' : '000000');

async function expectAuthError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(AuthError);
  await expect(promise).rejects.toMatchObject({ code });
}

const validSignup = {
  firstName: ' Ayşe ',
  lastName: 'Yılmaz',
  email: 'Ayse@Example.com',
  country: 'TR',
  phone: '532 123 45 67',
  password: 'guclu-sifre-1',
};

beforeEach(() => {
  db.users.length = 0;
  db.otps.clear();
  sentCodes.length = 0;
  sessions.length = 0;
  sendFailure.metaCode = undefined;
});

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('dogru-sifre');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('dogru-sifre', hash)).toBe(true);
    expect(await verifyPassword('yanlis-sifre', hash)).toBe(false);
  });
});

describe('session tokens', () => {
  it('round-trips a signed token', () => {
    const token = createSessionToken({ sub: '1', email: 'a@b.com', name: 'A B' });
    expect(verifySessionToken(token)?.user.email).toBe('a@b.com');
  });

  it('rejects a tampered token', () => {
    const token = createSessionToken({ sub: '1', email: 'a@b.com' });
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: '2', email: 'evil@x.com', exp: 9e9 })).toString('base64url');
    expect(verifySessionToken(`${forged}.${sig}`)).toBeNull();
    expect(verifySessionToken(`${body}.x${sig.slice(1)}`)).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });
});

describe('phone helpers', () => {
  it('lists every country with a dial code', () => {
    const options = getCountryOptions('tr');
    expect(options.length).toBeGreaterThan(200);
    expect(options.find((o) => o.iso === 'TR')).toMatchObject({ dialCode: '+90', name: 'Türkiye' });
  });

  it('validates numbers for the selected country', () => {
    expect(toE164('TR', '0532 123 45 67')).toBe('+905321234567');
    expect(toE164('TR', '123')).toBeNull();
    expect(toE164('US', '555 12')).toBeNull();
    expect(toE164('GB', '07400 123456')).toBe('+447400123456');
  });

  it('masks the middle digits', () => {
    expect(maskPhone('+905321234567')).toBe('+90 532 *** ** 67');
  });
});

describe('signup flow', () => {
  it('sends a WhatsApp code and creates the user once it is verified', async () => {
    const { requestId, phoneMasked } = await startSignup(validSignup);
    expect(sentCodes).toEqual([{ phone: '+905321234567', code: expect.stringMatching(/^\d{6}$/) }]);
    expect(phoneMasked).toBe('+90 532 *** ** 67');
    expect(db.users).toHaveLength(0);

    await completeSignup({ requestId, code: lastCode() });
    expect(db.users).toHaveLength(1);
    expect(db.users[0]).toMatchObject({ first_name: 'Ayşe', email: 'ayse@example.com', phone_e164: '+905321234567' });
    expect(db.users[0].password_hash).not.toContain(validSignup.password);
    expect(sessions).toEqual([expect.objectContaining({ email: 'ayse@example.com' })]);
  });

  it('rejects invalid input before sending anything', async () => {
    await expectAuthError(startSignup({ ...validSignup, email: 'not-an-email' }), 'invalid_email');
    await expectAuthError(startSignup({ ...validSignup, phone: '12' }), 'invalid_phone');
    await expectAuthError(startSignup({ ...validSignup, country: 'XX' }), 'invalid_phone');
    await expectAuthError(startSignup({ ...validSignup, password: 'short' }), 'weak_password');
    expect(sentCodes).toHaveLength(0);
  });

  it('blocks an email or phone that is already registered', async () => {
    const first = await startSignup(validSignup);
    await completeSignup({ requestId: first.requestId, code: lastCode() });

    await expectAuthError(startSignup({ ...validSignup, phone: '533 000 00 00' }), 'email_taken');
    await expectAuthError(startSignup({ ...validSignup, email: 'other@example.com' }), 'phone_taken');
  });

  it('locks the code after too many wrong attempts', async () => {
    const { requestId } = await startSignup(validSignup);
    const bad = wrongCode(lastCode());
    for (let i = 0; i < 4; i++) await expectAuthError(completeSignup({ requestId, code: bad }), 'invalid_code');
    await expectAuthError(completeSignup({ requestId, code: bad }), 'too_many_attempts');
    await expectAuthError(completeSignup({ requestId, code: lastCode() }), 'too_many_attempts');
    expect(db.users).toHaveLength(0);
  });

  it('does not accept the same code twice', async () => {
    const { requestId } = await startSignup(validSignup);
    const code = lastCode();
    await completeSignup({ requestId, code });
    await expectAuthError(completeSignup({ requestId, code }), 'invalid_code');
  });
});

describe('OTP env values', () => {
  it('strips quotes, whitespace and a Bearer prefix pasted with the token', async () => {
    const { cleanEnvValue } = await import('@/lib/auth/otp');
    expect(cleanEnvValue('  "EAAG123"\n')).toBe('EAAG123');
    expect(cleanEnvValue("'EAAG123'")).toBe('EAAG123');
    expect(cleanEnvValue('Bearer EAAG123')).toBe('EAAG123');
    expect(cleanEnvValue('EAAG 123\n456')).toBe('EAAG123456');
    expect(cleanEnvValue(undefined)).toBe('');
  });
});

describe('WhatsApp send failures', () => {
  it('blames our configuration for template/token errors and shows the Meta code', async () => {
    sendFailure.metaCode = 132001; // template name does not exist in the translation
    await expect(startSignup(validSignup)).rejects.toMatchObject({ code: 'otp_config_error', detail: '132001' });
  });

  it('blames the number only for recipient errors', async () => {
    sendFailure.metaCode = 131026;
    await expect(startSignup(validSignup)).rejects.toMatchObject({ code: 'otp_send_failed', detail: '131026' });
  });

  it('reports Meta throttling as a rate limit', async () => {
    sendFailure.metaCode = 130429;
    await expect(startSignup(validSignup)).rejects.toMatchObject({ code: 'rate_limited' });
  });
});

describe('login and password reset', () => {
  beforeEach(async () => {
    const { requestId } = await startSignup(validSignup);
    await completeSignup({ requestId, code: lastCode() });
    sessions.length = 0;
  });

  it('logs in with the right email (any case) and password only', async () => {
    await login({ email: 'AYSE@example.com', password: validSignup.password });
    expect(sessions).toHaveLength(1);
    await expectAuthError(login({ email: 'ayse@example.com', password: 'wrong-password' }), 'invalid_credentials');
    await expectAuthError(login({ email: 'nobody@example.com', password: validSignup.password }), 'invalid_credentials');
  });

  it('resets the password with a WhatsApp code', async () => {
    const { requestId } = await startPasswordReset({ email: 'ayse@example.com' });
    expect(sentCodes[sentCodes.length - 1].phone).toBe('+905321234567');
    await completePasswordReset({ requestId, code: lastCode(), password: 'yeni-sifre-123' });

    await login({ email: 'ayse@example.com', password: 'yeni-sifre-123' });
    await expectAuthError(login({ email: 'ayse@example.com', password: validSignup.password }), 'invalid_credentials');
  });

  it('answers the same way for unknown emails and sends nothing', async () => {
    const before = sentCodes.length;
    const res = await startPasswordReset({ email: 'nobody@example.com' });
    expect(res).toHaveProperty('requestId');
    expect(sentCodes).toHaveLength(before);
    await expectAuthError(
      completePasswordReset({ requestId: res.requestId, code: '123456', password: 'whatever-123' }),
      'invalid_code',
    );
  });
});

describe('fixed admin account', () => {
  const ADMIN = 'destek@dekatre.com';

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'Dekatre-Admin-2026!';
  });

  it('logs in with ADMIN_PASSWORD without a users row', async () => {
    await login({ email: 'Destek@Dekatre.com', password: 'Dekatre-Admin-2026!' });
    expect(sessions).toEqual([{ sub: 'admin', email: ADMIN, name: 'Dekatre Danışmanlık' }]);
    expect(db.users).toHaveLength(0);
  });

  it('rejects a wrong password, and any password when ADMIN_PASSWORD is not set', async () => {
    await expectAuthError(login({ email: ADMIN, password: 'yanlis' }), 'invalid_credentials');
    delete process.env.ADMIN_PASSWORD;
    await expectAuthError(login({ email: ADMIN, password: '' }), 'invalid_credentials');
    await expectAuthError(login({ email: ADMIN, password: 'anything' }), 'invalid_credentials');
    expect(sessions).toHaveLength(0);
  });

  it('cannot be claimed through signup', async () => {
    await expectAuthError(startSignup({ ...validSignup, email: 'DESTEK@dekatre.com' }), 'email_taken');
    expect(sentCodes).toHaveLength(0);
  });

  it('ignores a users row someone created earlier with the admin email', async () => {
    db.users.push({
      id: 99,
      first_name: 'X',
      last_name: 'Y',
      email: ADMIN,
      phone_e164: '+905550000000',
      password_hash: await hashPassword('db-password-123'),
    });
    await expectAuthError(login({ email: ADMIN, password: 'db-password-123' }), 'invalid_credentials');
    const reset = await startPasswordReset({ email: ADMIN });
    expect(reset).toHaveProperty('requestId');
    expect(sentCodes).toHaveLength(0);
  });
});
