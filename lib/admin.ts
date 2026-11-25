// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Shared by server pages/APIs (enforcement) and the sidebar (hiding menu items).

/**
 * The fixed Dekatre Danışmanlık admin account. It is not stored in the users
 * table: it logs in with the ADMIN_PASSWORD env var, and nobody can sign up with it.
 */
export const ADMIN_EMAIL = 'destek@dekatre.com';
export const ADMIN_NAME = 'Dekatre Danışmanlık';

/** Accounts that see admin-only sections (paid messages, pages, ad accounts, datasets, catalogs, Instagram). */
export const ADMIN_EMAILS = [ADMIN_EMAIL];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
