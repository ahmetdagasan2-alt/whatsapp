// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import Image from 'next/image';
import type { ReactNode } from 'react';
import { MessageSquare, ShieldCheck, Workflow, Zap } from 'lucide-react';

import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import { getT } from '@/app/i18n/server';

/** Branded two-column frame shared by the login, signup and password-reset screens. */
export default async function AuthShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const t = await getT();
  const highlights = [
    {
      Icon: MessageSquare,
      title: t('One inbox', 'Tek gelen kutusu'),
      text: t(
        'Manage conversations from all your WhatsApp numbers on one screen.',
        'Tüm WhatsApp numaralarınızın konuşmalarını tek ekrandan yönetin.',
      ),
    },
    {
      Icon: Workflow,
      title: t('SAP integration', 'SAP entegrasyonu'),
      text: t(
        'Incoming messages and events are forwarded to your enterprise systems automatically.',
        'Gelen mesajlar ve olaylar kurumsal sistemlerinize otomatik iletilir.',
      ),
    },
    {
      Icon: Zap,
      title: t('Quick setup', 'Hızlı kurulum'),
      text: t(
        'Connect your business accounts through Meta in a few steps.',
        'İşletme hesaplarınızı birkaç adımda Meta üzerinden bağlayın.',
      ),
    },
  ];

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white">
      {/* Brand panel */}
      <section
        className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-950 bg-cover bg-center p-12 text-white"
        style={{ backgroundImage: "url('/dekatre-hero.jpg')" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-950/95 via-brand-900/85 to-brand-700/70" />
        <div className="pointer-events-none absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-brand-cyan/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 w-[32rem] h-[32rem] rounded-full bg-brand-400/20 blur-3xl" />

        <div className="relative">
          <Image src="/dekatre-logo-white.png" alt="Dekatre Danışmanlık" width={453} height={54} priority className="h-8 w-auto" />
        </div>

        <div className="relative max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-200">
            {t('WhatsApp Business Platform', 'WhatsApp İş Platformu')}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold uppercase leading-tight tracking-tight">
            {t('Talk to your customers professionally on WhatsApp.', 'Müşterilerinizle WhatsApp üzerinden profesyonel iletişim kurun.')}
          </h1>
          <ul className="mt-10 space-y-6">
            {highlights.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-100" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-brand-100/80 mt-0.5">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/70">
          &copy; {new Date().getFullYear()} Dekatre Danışmanlık Hizmetleri Ltd. Şti. {t('All rights reserved.', 'Tüm hakları saklıdır.')}
        </p>
      </section>

      {/* Sign-in panel */}
      <section className="relative flex flex-col items-center justify-center px-4 py-16 sm:p-12 bg-[#f5f7fb] lg:bg-white">
        <div className="absolute top-5 right-5">
          <LanguageSwitcher />
        </div>
        <div className={wide ? 'w-full max-w-lg' : 'w-full max-w-md'}>
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/dekatre-logo.png" alt="Dekatre Danışmanlık" width={453} height={54} priority className="h-8 w-auto" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm lg:border-0 lg:shadow-none p-6 sm:p-8 lg:p-0">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-2">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>

          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-slate-500">
              {t('By continuing, you accept the', 'Devam ederek')}{' '}
              <a href="/privacy" className="text-brand-600 hover:underline">
                {t('Privacy Policy', 'Gizlilik Politikası')}
              </a>
              {t('.', '’nı kabul etmiş olursunuz.')}
            </p>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              {t('Secure connection via the Meta WhatsApp Business API', 'Meta WhatsApp Business API altyapısı ile güvenli bağlantı')}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
