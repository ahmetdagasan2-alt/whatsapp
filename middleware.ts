// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { NextResponse, type NextRequest } from 'next/server';

// Pages check the session themselves (lib/auth.ts). This only keeps the old
// Auth0 URLs working for bookmarks and links that still point at them.
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/auth/logout') {
    return NextResponse.redirect(new URL('/api/auth/logout', request.url));
  }
  const signup = new URLSearchParams(search).get('screen_hint') === 'signup';
  return NextResponse.redirect(new URL(signup ? '/signup' : '/login', request.url));
}

export const config = {
  matcher: ['/auth/:path*'],
};
