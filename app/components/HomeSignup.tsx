// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';

import { formatErrors } from '@/app/errorformat';
import { feGraphApiPostWrapper } from '@/app/feUtils';
import FBL4BLauncher from '@/app/components/Fbl4bLauncher';
import { useT } from '@/app/i18n/client';
import type { SessionInfo } from '@/app/types/api';

interface HomeSignupProps {
  appId: string;
  appName: string;
  userId: string;
  tpConfigs: { id: string; name: string }[];
  publicEsVersions: string[];
}

type Status = 'idle' | 'running' | 'saving' | 'success' | 'partial' | 'error';

interface OperationStatus {
  status?: string;
}

// The token endpoint returns a nested list of { fun, status } results.
function hasFailedStep(result: unknown): boolean {
  if (Array.isArray(result)) return result.some(hasFailedStep);
  return (result as OperationStatus | null)?.status === 'failed';
}

export default function HomeSignup({ appId, appName, userId, tpConfigs, publicEsVersions }: HomeSignupProps) {
  const t = useT();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');

  // Same defaults the advanced Payload Builder starts with: first config, latest
  // version, default flow; register number + subscribe webhooks on, calling off.
  const configId = tpConfigs[0]?.id ?? '';
  const esConfig = JSON.stringify({
    config_id: configId,
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      sessionInfoVersion: '3',
      version: publicEsVersions[publicEsVersions.length - 1],
      features: [],
    },
  });

  const handleClick = useCallback((): boolean => {
    if (!configId) {
      setStatus('error');
      setMessage(
        t(
          'The connection is not configured yet. Please contact Dekatre support.',
          'Bağlantı henüz yapılandırılmamış. Lütfen Dekatre destek ekibiyle iletişime geçin.',
        ),
      );
      setDetails('');
      return true;
    }
    setStatus('running');
    setMessage('');
    setDetails('');
    return false;
  }, [configId, t]);

  const handleBannerInfoChange = useCallback((info: string) => {
    if (info === 'ES Started...') return;
    // An empty banner means the user closed or cancelled the Meta window.
    if (info === '') {
      setStatus((s) => (s === 'running' ? 'idle' : s));
      return;
    }
    setStatus('error');
    setMessage(info);
  }, []);

  const handleLastEventDataChange = useCallback(() => {}, []);

  const handleSaveToken = useCallback(
    async (code: string, sessionInfo: SessionInfo) => {
      setStatus('saving');
      const {
        waba_id: wabaId,
        business_id: businessId,
        phone_number_id: phoneNumberId,
        page_ids: pageIds,
        ad_account_ids: adAccountIds,
        catalog_ids: catalogIds,
        dataset_ids: datasetIds,
        instagram_account_ids: instagramAccountIds,
      } = sessionInfo.data;
      const filterIds = (ids: string[] | undefined) => (ids || []).filter((id) => id && id.trim() !== '');
      try {
        const d = await feGraphApiPostWrapper('/api/token', {
          code,
          app_id: appId,
          waba_id: wabaId,
          waba_ids: wabaId ? [wabaId] : [],
          business_id: businessId,
          phone_number_id: phoneNumberId,
          page_ids: pageIds || [],
          ad_account_ids: adAccountIds || [],
          dataset_ids: filterIds(datasetIds),
          catalog_ids: filterIds(catalogIds),
          instagram_account_ids: filterIds(instagramAccountIds),
          es_option_reg: true,
          es_option_sub: true,
          es_option_calling: false,
          user_id: userId,
        });
        setDetails(formatErrors(d));
        setStatus(hasFailedStep(d) ? 'partial' : 'success');
      } catch (err) {
        console.error('WABA setup failed:', err);
        setStatus('error');
        setMessage(
          t('Setup could not be completed.', 'Kurulum tamamlanamadı.') +
            (err instanceof Error ? ` (${err.message})` : ''),
        );
      }
    },
    [appId, userId, t],
  );

  const busy = status === 'running' || status === 'saving';

  return (
    <div className="min-h-full flex flex-col">
      {/* Hero — mirrors the dekatre.com landing section */}
      <section
        className="relative flex-1 min-h-[560px] flex items-center justify-center overflow-hidden bg-brand-950 bg-cover bg-center"
        style={{ backgroundImage: "url('/dekatre-hero.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950/90 via-brand-900/75 to-brand-700/60" />

        <div className="relative z-10 w-full max-w-3xl px-6 py-16 text-center text-white">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-brand-200">
            Dekatre Danışmanlık
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.05]">
            {t('WhatsApp Business', 'WhatsApp İş')}
            <br />
            <span className="bg-gradient-to-r from-brand-cyan to-brand-300 bg-clip-text text-transparent">
              {t('Platform', 'Platformu')}
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-brand-100/90 max-w-xl mx-auto">
            {t(
              'Connect your WhatsApp Business account in a few steps and manage all customer conversations in one place.',
              'WhatsApp Business hesabınızı birkaç adımda bağlayın, tüm müşteri görüşmelerinizi tek yerden yönetin.',
            )}
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="w-full max-w-sm">
              <FBL4BLauncher
                appId={appId}
                appName={appName}
                esConfig={esConfig}
                onClickFbl4b={handleClick}
                onBannerInfoChange={handleBannerInfoChange}
                onLastEventDataChange={handleLastEventDataChange}
                onSaveToken={handleSaveToken}
                label={t('Connect WhatsApp Account', 'WhatsApp Hesabını Bağla')}
                className="py-4 text-base bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800 shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.3)] disabled:opacity-60"
              />
            </div>
            <p className="text-xs text-brand-100/70">
              {t(
                'You will be redirected to Meta’s secure sign-in window.',
                'Meta’nın güvenli giriş penceresine yönlendirileceksiniz.',
              )}
            </p>
          </div>

          {/* Result */}
          <div aria-live="polite" className="mt-8 flex justify-center">
            {busy && (
              <div className="inline-flex items-center gap-3 rounded-xl bg-white/10 ring-1 ring-white/20 px-5 py-3 text-sm backdrop-blur">
                <Loader2 className="w-4 h-4 animate-spin" />
                {status === 'running'
                  ? t('Complete the steps in the Meta window…', 'Meta penceresindeki adımları tamamlayın…')
                  : t('Setting up your account…', 'Hesabınız kuruluyor…')}
              </div>
            )}

            {(status === 'success' || status === 'partial') && (
              <div className="w-full max-w-md rounded-2xl bg-white text-left text-slate-800 shadow-xl p-5">
                <div className="flex items-start gap-3">
                  {status === 'success' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {status === 'success'
                        ? t('Your account is connected!', 'Hesabınız bağlandı!')
                        : t('Connected with warnings', 'Hesap bağlandı, bazı adımlar tamamlanamadı')}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {status === 'success'
                        ? t(
                            'You can now send and receive messages from your inbox.',
                            'Artık gelen kutunuzdan mesaj gönderip alabilirsiniz.',
                          )
                        : t(
                            'Some setup steps failed. Please share the details below with Dekatre support.',
                            'Bazı kurulum adımları başarısız oldu. Lütfen aşağıdaki detayları Dekatre destek ekibiyle paylaşın.',
                          )}
                    </p>
                    {status === 'partial' && details && (
                      <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-50 border border-slate-200 p-3 text-[11px] font-mono text-slate-600 whitespace-pre-wrap">
                        {details}
                      </pre>
                    )}
                    <Link
                      href="/my-inbox"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {t('Go to Inbox', 'Gelen Kutusuna Git')}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="w-full max-w-md rounded-2xl bg-white text-left text-slate-800 shadow-xl p-5 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{t('Something went wrong', 'Bir sorun oluştu')}</p>
                  <p className="text-sm text-slate-500 mt-1 break-words">{message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 px-6 py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Dekatre Danışmanlık Hizmetleri Ltd. Şti. ·{' '}
        <a href="https://www.dekatre.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">
          dekatre.com
        </a>
      </footer>
    </div>
  );
}
