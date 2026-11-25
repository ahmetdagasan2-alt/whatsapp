// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import MessageBubble from '@/app/components/MessageBubble';
import { LocaleProvider } from '@/app/i18n/client';
import { makeT } from '@/app/i18n/locale';
import { displayNameWarning, sendFailureReason } from '@/app/utils/whatsappStatus';

const tr = makeT('tr');

describe('sendFailureReason', () => {
  it('explains the display-name error in Turkish', () => {
    expect(sendFailureReason(tr, 131037)).toBe('Bu numaranın görünen adı henüz onaylanmadı.');
  });

  it('falls back to the Meta message and code for unknown errors', () => {
    expect(sendFailureReason(tr, 999, 'Something odd')).toBe('Something odd (Meta kodu: 999)');
  });
});

describe('displayNameWarning', () => {
  it('says nothing for an approved name or a missing field', () => {
    expect(displayNameWarning(tr, { name_status: 'APPROVED' })).toBeNull();
    expect(displayNameWarning(tr, { name_status: 'AVAILABLE_WITHOUT_REVIEW' })).toBeNull();
    expect(displayNameWarning(tr, {})).toBeNull();
  });

  it('flags pending and declined names', () => {
    expect(displayNameWarning(tr, { name_status: 'PENDING_REVIEW' })).toMatchObject({ level: 'warning' });
    expect(displayNameWarning(tr, { name_status: 'DECLINED' })).toMatchObject({ level: 'error' });
    expect(displayNameWarning(tr, { name_status: 'NONE' })).toMatchObject({ level: 'error' });
  });

  it('only warns softly about a pending name change while the old name is approved', () => {
    expect(displayNameWarning(tr, { name_status: 'APPROVED', new_name_status: 'PENDING_REVIEW' })).toMatchObject({
      level: 'warning',
      text: 'Yeni görünen ad onay bekliyor',
    });
  });
});

describe('failed outgoing message bubble', () => {
  it('shows why the message was not sent', () => {
    render(
      <LocaleProvider locale="tr">
        <MessageBubble
          type="text"
          text="Merhaba"
          direction="outgoing"
          timestamp={Date.now()}
          failedReason="Bu numaranın görünen adı henüz onaylanmadı."
        />
      </LocaleProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Gönderilemedi: Bu numaranın görünen adı henüz onaylanmadı.');
  });
});
