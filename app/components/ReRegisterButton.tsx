// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

import { useT } from '@/app/i18n/client';

/**
 * Calls the register endpoint again for an already connected number, without
 * deregistering first. Meta only applies a newly approved display name after
 * the number is registered again (error #131037 until then).
 */
export default function ReRegisterButton({ phoneId, wabaId }: { phoneId: string; wabaId: string }) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const run = async () => {
    const ok = window.confirm(
      t(
        'Register this number with WhatsApp again? This applies an approved display name. The number stays connected.',
        'Bu numara WhatsApp’a yeniden kaydedilsin mi? Bu işlem onaylanan görünen adı devreye alır. Numaranın bağlantısı kesilmez.',
      ),
    );
    if (!ok) return;
    setState('busy');
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wabaId, phoneId }),
      });
      if (res.ok) {
        setState('done');
        return;
      }
      const data: { metaCode?: number; metaMessage?: string; message?: string } = await res.json().catch(() => ({}));
      setError(
        data.metaCode !== undefined
          ? `${data.metaMessage ?? data.message ?? ''} (${t('Meta code', 'Meta kodu')}: ${data.metaCode})`
          : (data.message ?? t(`Server error (${res.status})`, `Sunucu hatası (${res.status})`)),
      );
      setState('error');
    } catch {
      setError(t('Could not reach the server.', 'Sunucuya ulaşılamadı.'));
      setState('error');
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={run}
        disabled={state === 'busy'}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
      >
        {state === 'busy' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        {t('Re-register number', 'Numarayı yeniden kaydet')}
      </button>
      {state === 'done' && (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
          <CheckCircle2 className="w-3 h-3" />
          {t('Done — try sending again', 'Tamamlandı — tekrar göndermeyi deneyin')}
        </span>
      )}
      {state === 'error' && (
        <span role="alert" className="text-[11px] text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
