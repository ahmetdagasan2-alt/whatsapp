// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { type NextRequest, NextResponse } from 'next/server';

import { setAckBotStatus, getAckBotMessage, userCanAccessPhone } from '@/app/api/beUtils';
import { withAuth } from '@/app/api/authWrapper';

const forbidden = () => NextResponse.json({ error: 'You do not have access to this phone' }, { status: 403 });

export const POST = withAuth(async function updateAckBotStatus(request: NextRequest, session) {
  try {
    const body = await request.json();
    const { isAckBotEnabled, phoneId, wabaId, ackBotMessage } = body;
    const userId = session.user.email;

    if (!userId) {
      return NextResponse.json({ error: 'Missing user email in session' }, { status: 401 });
    }
    if (!phoneId || typeof phoneId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid phoneId' }, { status: 400 });
    }
    if (!wabaId || typeof wabaId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid wabaId' }, { status: 400 });
    }
    if (typeof isAckBotEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid isAckBotEnabled' }, { status: 400 });
    }
    if (!(await userCanAccessPhone(userId, wabaId, phoneId))) return forbidden();

    await setAckBotStatus(phoneId, isAckBotEnabled, userId, ackBotMessage);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to update ack bot status:', error);
    return NextResponse.json({ error: 'Failed to update ack bot status' }, { status: 500 });
  }
});

export const GET = withAuth(async function getPhoneConfig(request: NextRequest, session) {
  try {
    const phoneId = request.nextUrl.searchParams.get('phoneId');
    const wabaId = request.nextUrl.searchParams.get('wabaId');
    if (!phoneId || !wabaId) {
      return NextResponse.json({ error: 'phoneId and wabaId are required' }, { status: 400 });
    }
    const userId = session.user.email;
    if (!userId || !(await userCanAccessPhone(userId, wabaId, phoneId))) return forbidden();

    const message = await getAckBotMessage(phoneId);
    return NextResponse.json({ ackBotMessage: message });
  } catch (error) {
    console.error('Failed to get phone config:', error);
    return NextResponse.json({ error: 'Failed to get phone config' }, { status: 500 });
  }
});
