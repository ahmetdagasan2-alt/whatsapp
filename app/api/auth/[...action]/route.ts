// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { type NextRequest, NextResponse } from 'next/server';

import { endSession } from '@/lib/auth/session';
import {
  AuthError,
  completePasswordReset,
  completeSignup,
  login,
  resendCode,
  startPasswordReset,
  startSignup,
} from '@/lib/auth/service';

export const runtime = 'nodejs';

type Handler = (body: Record<string, unknown>) => Promise<unknown>;

const POST_ACTIONS: Record<string, Handler> = {
  'signup/start': startSignup,
  'signup/verify': completeSignup,
  'otp/resend': resendCode,
  login,
  'password/forgot': startPasswordReset,
  'password/reset': completePasswordReset,
};

type Context = { params: Promise<{ action: string[] }> };

export async function POST(request: NextRequest, { params }: Context) {
  const action = (await params).action.join('/');
  if (action === 'logout') {
    await endSession();
    return NextResponse.json({ ok: true });
  }
  const handler = POST_ACTIONS[action];
  if (!handler) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  try {
    const result = await handler(body);
    return NextResponse.json({ ok: true, ...(result as object | undefined) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error(`[auth] ${action} failed:`, err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Context) {
  const action = (await params).action.join('/');
  if (action !== 'logout') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await endSession();
  return NextResponse.redirect(new URL('/', request.url));
}
