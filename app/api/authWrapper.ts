// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';

export interface AuthSession {
  user: {
    email?: string;
    name?: string;
    sub?: string;
  };
}

type ApiHandler = (request: NextRequest, session: AuthSession) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: ApiHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const session = await auth.getSession();

      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
      }

      return await handler(request, session);
    } catch (error) {
      console.error('Auth wrapper error:', error);
      return NextResponse.json({ error: 'Internal Server Error', message: 'Authentication failed' }, { status: 500 });
    }
  };
}
