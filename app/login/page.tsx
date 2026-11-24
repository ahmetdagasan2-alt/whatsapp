// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { redirect } from 'next/navigation';

import LoggedOut from '@/app/components/LoggedOut';
import { auth } from '@/lib/auth';

export default async function LoginPage() {
  if (await auth.getSession()) redirect('/');
  return <LoggedOut redirectTo="/" />;
}
