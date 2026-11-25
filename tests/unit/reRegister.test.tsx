// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ReRegisterButton from '@/app/components/ReRegisterButton';
import { makeT } from '@/app/i18n/locale';
import { nameStatusLabel } from '@/app/utils/whatsappStatus';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('nameStatusLabel', () => {
  it('labels known states and says when Meta sent nothing', () => {
    const tr = makeT('tr');
    expect(nameStatusLabel(tr, 'APPROVED')).toBe('Onaylandı');
    expect(nameStatusLabel(tr, 'AVAILABLE_WITHOUT_REVIEW')).toBe('İncelemesiz kullanılabilir');
    expect(nameStatusLabel(tr, undefined)).toBe('Meta bilgi vermedi');
    expect(nameStatusLabel(tr, 'SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

describe('ReRegisterButton', () => {
  it('registers the number again after confirmation', async () => {
    vi.stubGlobal('confirm', () => true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<ReRegisterButton phoneId="p1" wabaId="w1" />);
    await userEvent.click(screen.getByRole('button', { name: /re-register number/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/register', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ wabaId: 'w1', phoneId: 'p1' });
    expect(await screen.findByText(/Done/)).toBeInTheDocument();
  });

  it('shows the Meta error code when registration fails', async () => {
    vi.stubGlobal('confirm', () => true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ metaCode: 133005, metaMessage: 'Two step verification PIN Mismatch' }),
      }),
    );
    render(<ReRegisterButton phoneId="p1" wabaId="w1" />);
    await userEvent.click(screen.getByRole('button', { name: /re-register number/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Two step verification PIN Mismatch (Meta code: 133005)');
  });

  it('does nothing when the user cancels', async () => {
    vi.stubGlobal('confirm', () => false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ReRegisterButton phoneId="p1" wabaId="w1" />);
    await userEvent.click(screen.getByRole('button', { name: /re-register number/i }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
