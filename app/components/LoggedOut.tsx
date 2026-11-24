// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import Image from 'next/image';
import { ChevronRight, LogIn, MessageSquare, ShieldCheck, UserPlus, Workflow, Zap } from 'lucide-react';

import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import { getT } from '@/app/i18n/server';

export default async function LoggedOut() {
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
            {t('Talk to your customers professionally on WhatsApp.', 'Müşterilerinizle WhatsApp üzerinden profesyonelce iletişim kurun.')}
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
      <section className="relative flex flex-col items-center justify-center p-6 sm:p-12 bg-[#f5f7fb] lg:bg-white">
        <div className="absolute top-5 right-5">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/dekatre-logo.png" alt="Dekatre Danışmanlık" width={453} height={54} priority className="h-8 w-auto" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm lg:border-0 lg:shadow-none p-8 lg:p-0">
            <h2 className="text-2xl font-bold text-slate-900">{t('Welcome', 'Hoş geldiniz')}</h2>
            <p className="text-sm text-slate-500 mt-2">
              {t(
                'Sign in with your account or create a new one to access the dashboard.',
                'Panele erişmek için hesabınızla giriş yapın veya yeni bir hesap oluşturun.',
              )}
            </p>

            <div className="mt-8 space-y-3">
              <a
                href="/auth/login"
                className="group flex items-center justify-between w-full px-5 py-4 bg-brand-600 text-white rounded-xl shadow-sm shadow-brand-600/30 hover:bg-brand-700 active:bg-brand-800 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <LogIn className="w-5 h-5 opacity-90" />
                  <span>
                    <span className="block font-semibold leading-tight">{t('Log In', 'Giriş Yap')}</span>
                    <span className="block text-xs text-brand-100 leading-tight mt-0.5">{t('Continue with your existing account', 'Mevcut hesabınızla devam edin')}</span>
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 opacity-70 transition-transform group-hover:translate-x-0.5" />
              </a>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-slate-400 font-medium">{t('or', 'veya')}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <a
                href="/auth/login?screen_hint=signup"
                className="group flex items-center justify-between w-full px-5 py-4 bg-white text-slate-700 rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-brand-600" />
                  <span>
                    <span className="block font-semibold text-slate-900 leading-tight">{t('Sign Up', 'Kayıt Ol')}</span>
                    <span className="block text-xs text-slate-400 leading-tight mt-0.5">{t('Create a new account', 'Yeni bir hesap oluşturun')}</span>
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
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
