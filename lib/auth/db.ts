// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { sql } from '@vercel/postgres';

export interface UserRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_e164: string;
  phone_country: string;
  password_hash: string;
  phone_verified_at: string | null;
  created_at: string;
}

export interface OtpRow {
  id: string;
  purpose: 'signup' | 'reset';
  phone_e164: string;
  email: string;
  payload: Record<string, unknown> | null;
  code_hash: string;
  attempts: number;
  sent_count: number;
  last_sent_at: string;
  expires_at: string;
  consumed_at: string | null;
}

let ensured: Promise<void> | null = null;

/** Creates the auth tables on first use so no manual migration step is needed. */
export function ensureAuthTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone_e164 TEXT NOT NULL UNIQUE,
          phone_country TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          phone_verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS auth_otps (
          id TEXT PRIMARY KEY,
          purpose TEXT NOT NULL,
          phone_e164 TEXT NOT NULL,
          email TEXT NOT NULL,
          payload JSONB,
          code_hash TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          sent_count INTEGER NOT NULL DEFAULT 1,
          last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          consumed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await sql`CREATE INDEX IF NOT EXISTS auth_otps_phone_idx ON auth_otps (phone_e164, created_at)`;
    })().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureAuthTables();
  const { rows } = await sql<UserRow>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return rows[0] ?? null;
}

export async function findUserByPhone(phoneE164: string): Promise<UserRow | null> {
  await ensureAuthTables();
  const { rows } = await sql<UserRow>`SELECT * FROM users WHERE phone_e164 = ${phoneE164} LIMIT 1`;
  return rows[0] ?? null;
}

export async function createUser(user: {
  firstName: string;
  lastName: string;
  email: string;
  phoneE164: string;
  phoneCountry: string;
  passwordHash: string;
}): Promise<UserRow> {
  await ensureAuthTables();
  const { rows } = await sql<UserRow>`
    INSERT INTO users (first_name, last_name, email, phone_e164, phone_country, password_hash, phone_verified_at)
    VALUES (${user.firstName}, ${user.lastName}, ${user.email}, ${user.phoneE164}, ${user.phoneCountry}, ${user.passwordHash}, NOW())
    RETURNING *`;
  return rows[0];
}

export async function updatePassword(userId: number, passwordHash: string): Promise<void> {
  await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`;
}

export async function insertOtp(otp: {
  id: string;
  purpose: 'signup' | 'reset';
  phoneE164: string;
  email: string;
  payload: Record<string, unknown> | null;
  codeHash: string;
  expiresAt: Date;
}): Promise<void> {
  await ensureAuthTables();
  await sql`
    INSERT INTO auth_otps (id, purpose, phone_e164, email, payload, code_hash, expires_at)
    VALUES (${otp.id}, ${otp.purpose}, ${otp.phoneE164}, ${otp.email},
            ${otp.payload ? JSON.stringify(otp.payload) : null}, ${otp.codeHash}, ${otp.expiresAt.toISOString()})`;
}

export async function getOtp(id: string): Promise<OtpRow | null> {
  await ensureAuthTables();
  const { rows } = await sql<OtpRow>`SELECT * FROM auth_otps WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function recordOtpAttempt(id: string): Promise<void> {
  await sql`UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ${id}`;
}

export async function consumeOtp(id: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE auth_otps SET consumed_at = NOW() WHERE id = ${id} AND consumed_at IS NULL`;
  return (rowCount ?? 0) > 0;
}

export async function refreshOtp(id: string, codeHash: string, expiresAt: Date): Promise<void> {
  await sql`
    UPDATE auth_otps
    SET code_hash = ${codeHash}, expires_at = ${expiresAt.toISOString()}, attempts = 0,
        sent_count = sent_count + 1, last_sent_at = NOW()
    WHERE id = ${id}`;
}

/** Number of codes sent to a phone within the last hour (new requests + resends). */
export async function countRecentSends(phoneE164: string): Promise<number> {
  await ensureAuthTables();
  const { rows } = await sql<{ total: string | null }>`
    SELECT COALESCE(SUM(sent_count), 0) AS total FROM auth_otps
    WHERE phone_e164 = ${phoneE164} AND last_sent_at > NOW() - INTERVAL '1 hour'`;
  return Number(rows[0]?.total ?? 0);
}
