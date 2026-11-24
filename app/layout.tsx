// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

import '@/app/globals.css';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import MissingEnvVars from '@/app/components/MissingEnvVars';
import { getMissingEnvVars, type MissingEnvVarInfo } from '@/app/envChecker';
import { LocaleProvider } from '@/app/i18n/client';
import { getLocale } from '@/app/i18n/server';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dekatre Danışmanlık | WhatsApp İş Platformu',
  description: 'Dekatre Danışmanlık WhatsApp Business API yönetim paneli.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check for missing environment variables
  const missingEnvVars: MissingEnvVarInfo[] = getMissingEnvVars();

  // If there are missing environment variables, show the error page
  if (missingEnvVars.length > 0) {
    return (
      <html lang="en">
        <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
          <MissingEnvVars missingVars={missingEnvVars} />
        </body>
      </html>
    );
  }

  const locale = await getLocale();

  return (
    <html lang={locale}>
      <Script
        src={`https://connect.facebook.net/${locale === 'tr' ? 'tr_TR' : 'en_US'}/sdk.js`}
        strategy="afterInteractive"
      />

      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <LocaleProvider locale={locale}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </LocaleProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
