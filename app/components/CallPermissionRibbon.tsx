// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useState, useEffect } from 'react';

import { Loader2, ShieldCheck, ShieldX, PhoneOutgoing, Clock } from 'lucide-react';
import { useLocale, useT } from '@/app/i18n/client';
import type { PermissionState } from '@/app/types/calling';
import { cn } from '@/lib/utils';
import { formatTimeRemaining } from '@/app/utils/calling';

interface CallPermissionRibbonProps {
  permissionState: PermissionState;
  expirationTime?: number;
  remainingRequests?: string;
  onRequestPermission: () => void;
}

export default function CallPermissionRibbon({
  permissionState,
  expirationTime,
  remainingRequests,
  onRequestPermission,
}: CallPermissionRibbonProps) {
  const t = useT();
  const locale = useLocale();
  const [timeRemaining, setTimeRemaining] = useState(
    expirationTime ? formatTimeRemaining(expirationTime, locale) : '',
  );
  const expiredLabel = formatTimeRemaining(0, locale);

  // Live countdown for temporary permissions
  useEffect(() => {
    if (!expirationTime) return undefined;
    setTimeRemaining(formatTimeRemaining(expirationTime, locale));
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(expirationTime, locale));
    }, 30000);
    return () => clearInterval(interval);
  }, [expirationTime, locale]);

  if (permissionState === 'none') return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        'px-4 py-2 flex items-center justify-between border-b text-xs transition-all',
        permissionState === 'checking' && 'bg-blue-50 border-blue-200',
        permissionState === 'requesting' && 'bg-amber-50 border-amber-200',
        permissionState === 'pending' && 'bg-blue-50 border-blue-200',
        permissionState === 'granted' && 'bg-green-50 border-green-200',
        permissionState === 'denied' && 'bg-red-50 border-red-200',
        permissionState === 'rate_limited' && 'bg-orange-50 border-orange-200',
      )}
    >
      <div className="flex items-center gap-2">
        {permissionState === 'checking' && (
          <>
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span className="font-medium text-blue-800">{t('Checking call permissions...', 'Arama izinleri kontrol ediliyor...')}</span>
          </>
        )}
        {permissionState === 'requesting' && (
          <>
            <PhoneOutgoing className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium text-amber-800">
              {t('Call permission required', 'Arama izni gerekli')}
              {remainingRequests && (
                <span className="font-normal text-amber-600 ml-1">· {remainingRequests}</span>
              )}
            </span>
          </>
        )}
        {permissionState === 'pending' && (
          <>
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span className="font-medium text-blue-800">
              {t('Permission request sent — waiting for response', 'İzin isteği gönderildi — yanıt bekleniyor')}
              {remainingRequests && (
                <span className="font-normal text-blue-600 ml-1">· {remainingRequests}</span>
              )}
            </span>
          </>
        )}
        {permissionState === 'granted' && (
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            <span className="font-medium text-green-800">
              {t('Permission granted', 'İzin verildi')}
              {expirationTime && timeRemaining !== expiredLabel && (
                <span className="inline-flex items-center gap-1 ml-2 text-green-600 font-normal">
                  <Clock className="w-3 h-3" />
                  {t(`expires in ${timeRemaining}`, `${timeRemaining} sonra sona erecek`)}
                </span>
              )}
            </span>
          </>
        )}
        {permissionState === 'denied' && (
          <>
            <ShieldX className="w-3.5 h-3.5 text-red-500" />
            <span className="font-medium text-red-600">{t('Permission declined', 'İzin reddedildi')}</span>
          </>
        )}
        {permissionState === 'rate_limited' && (
          <>
            <ShieldX className="w-3.5 h-3.5 text-orange-600" />
            <span className="font-medium text-orange-700">
              {t(
                'Call permission request limit reached — try again later',
                'Arama izni isteği sınırına ulaşıldı — daha sonra tekrar deneyin',
              )}
            </span>
          </>
        )}
      </div>

      {(permissionState === 'requesting' || permissionState === 'denied') && (
        <button
          onClick={onRequestPermission}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors flex-shrink-0"
        >
          {permissionState === 'denied' ? t('Request Again', 'Tekrar İste') : t('Request Permission', 'İzin İste')}
        </button>
      )}
    </div>
  );
}
