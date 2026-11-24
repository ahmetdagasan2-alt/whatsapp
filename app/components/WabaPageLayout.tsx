// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import type { ReactNode } from 'react';

import SidebarLayout from '@/app/components/SidebarLayout';
import { getT } from '@/app/i18n/server';

interface WabaPageLayoutProps {
  children: ReactNode;
  userId: string;
  logoUrl?: string;
  appName: string;
  title: string;
  description?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  icon?: React.ReactNode;
}

export default async function WabaPageLayout({
  children,
  userId,
  logoUrl,
  appName,
  title,
  description,
  isEmpty = false,
  emptyMessage,
  emptyDescription,
  icon,
}: WabaPageLayoutProps) {
  const t = await getT();
  return (
    <SidebarLayout userId={userId} logoUrl={logoUrl} appName={appName}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
        {isEmpty ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
            {icon && (
              <div className="mb-4 mx-auto w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 [&_svg]:w-8 [&_svg]:h-8">
                {icon}
              </div>
            )}
            <p className="text-base font-semibold text-slate-700">{emptyMessage ?? t('No items found.', 'Kayıt bulunamadı.')}</p>
            {emptyDescription && <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{emptyDescription}</p>}
          </div>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </div>
    </SidebarLayout>
  );
}
