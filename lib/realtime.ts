// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Server-only. Webhooks are fanned out on per-user Ably channels so a customer's
// browser only ever receives events for the WABAs that customer connected; the
// admin channel receives everything. Ably tokens are limited to the viewer's channel.

import { createHash, createHmac } from 'crypto';

import { isAdminEmail } from '@/lib/admin';

export const ADMIN_CHANNEL = 'webhooks:admin';

/** Opaque per-user channel name (doesn't expose the email). */
export function userChannel(email: string): string {
  const normalized = email.trim().toLowerCase();
  const secret = process.env.SESSION_SECRET?.trim() || process.env.AUTH0_SECRET?.trim();
  const digest = secret
    ? createHmac('sha256', secret).update(normalized).digest('hex')
    : createHash('sha256').update(normalized).digest('hex');
  return `webhooks:user:${digest.slice(0, 32)}`;
}

/** The channel the signed-in viewer subscribes to. */
export function channelForViewer(email: string): string {
  return isAdminEmail(email) ? ADMIN_CHANNEL : userChannel(email);
}

/** Channels a webhook is published to: every owner of the WABA, plus the admin. */
export function channelsForOwners(ownerEmails: string[]): string[] {
  return [...new Set([...ownerEmails.filter(Boolean).map(userChannel), ADMIN_CHANNEL])];
}
