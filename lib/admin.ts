// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Shared by server pages/APIs (enforcement) and the sidebar (hiding menu items).

/** Accounts that see admin-only sections (paid messages, pages, ad accounts, datasets, catalogs, Instagram). */
export const ADMIN_EMAILS = ['destek@dekatre.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
