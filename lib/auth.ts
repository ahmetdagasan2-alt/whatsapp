// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { cookies } from 'next/headers';

import { SESSION_COOKIE, verifySessionToken, type Session } from '@/lib/auth/session';

const bypassAuth = process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'development';

const mockSession: Session = {
  user: {
    email: process.env.TP_CONTACT_EMAIL ?? 'dev@localhost',
    name: 'Local Dev User',
    sub: 'local-dev',
  },
};

async function getSession(): Promise<Session | null> {
  if (bypassAuth) return mockSession;
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export const auth = { getSession };
