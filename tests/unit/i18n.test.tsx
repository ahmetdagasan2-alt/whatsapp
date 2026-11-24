// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import MessageBubble from '@/app/components/MessageBubble';
import CallPermissionRibbon from '@/app/components/CallPermissionRibbon';
import { LocaleProvider } from '@/app/i18n/client';
import { makeT, normalizeLocale } from '@/app/i18n/locale';
import { formatRemainingRequests, formatTimeRemaining } from '@/app/utils/calling';

describe('locale helpers', () => {
  it('defaults unknown values to Turkish', () => {
    expect(normalizeLocale(undefined)).toBe('tr');
    expect(normalizeLocale('de')).toBe('tr');
    expect(normalizeLocale('en')).toBe('en');
  });

  it('picks the text for the active locale', () => {
    expect(makeT('tr')('Send', 'Gönder')).toBe('Gönder');
    expect(makeT('en')('Send', 'Gönder')).toBe('Send');
  });
});

describe('calling utils in Turkish', () => {
  it('formats remaining time', () => {
    const twoDays = Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 1000;
    expect(formatTimeRemaining(twoDays, 'tr')).toBe('2g 0sa 0dk');
    expect(formatTimeRemaining(0, 'tr')).toBe('süresi doldu');
  });

  it('formats remaining permission requests', () => {
    const actions = [
      {
        action_name: 'send_call_permission_request',
        can_perform_action: true,
        limits: [{ time_period: 'PT24H', max_allowed: 1, current_usage: 0 }],
      },
    ];
    expect(formatRemainingRequests(actions, 'tr')).toBe('bugün 1 istek hakkı kaldı');
  });
});

describe('components under the Turkish locale', () => {
  it('renders call events in Turkish', () => {
    render(
      <LocaleProvider locale="tr">
        <MessageBubble type="call_event" event="missed" timestamp={Date.now()} />
      </LocaleProvider>,
    );
    expect(screen.getByText('Cevapsız arama')).toBeInTheDocument();
  });

  it('renders the permission ribbon in Turkish', () => {
    render(
      <LocaleProvider locale="tr">
        <CallPermissionRibbon permissionState="denied" onRequestPermission={() => {}} />
      </LocaleProvider>,
    );
    expect(screen.getByText('İzin reddedildi')).toBeInTheDocument();
    expect(screen.getByText('Tekrar İste')).toBeInTheDocument();
  });
});
