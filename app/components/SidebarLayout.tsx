// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Settings,
  Webhook,
  MessageSquare,
  Building2,
  FileText,
  Megaphone,
  Database,
  BookOpen,
  Instagram,
  Mail,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface SidebarLayoutProps {
  children: ReactNode;
  userId: string;
  logoUrl?: string;
  appName: string;
}

const navSections = [
  {
    title: 'Mesajlaşma',
    items: [
      {
        label: 'Gelen Kutusu',
        description: 'Tüm numaralarınızdan mesaj gönderin ve alın',
        href: '/my-inbox',
        Icon: MessageSquare,
      },
      {
        label: 'Ücretli Mesajlar',
        description: 'Şablon ve pazarlama mesajları gönderin',
        href: '/paid_messaging',
        Icon: Mail,
      },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      {
        label: 'Kurulum',
        description: 'Hesap bağlama ve onboarding ayarları',
        href: '/',
        Icon: Settings,
      },
      {
        label: 'Webhook Kayıtları',
        description: 'Gelen webhook olaylarını izleyin',
        href: '/my-webhooks',
        Icon: Webhook,
      },
    ],
  },
  {
    title: 'Varlıklarım',
    items: [
      { label: 'WhatsApp Hesapları', href: '/my-wabas', Icon: Building2 },
      { label: 'Facebook Sayfaları', href: '/my-pages', Icon: FileText },
      { label: 'Reklam Hesapları', href: '/my-ad-accounts', Icon: Megaphone },
      { label: 'Veri Kümeleri', href: '/my-datasets', Icon: Database },
      { label: 'Kataloglar', href: '/my-catalogs', Icon: BookOpen },
      { label: 'Instagram Hesapları', href: '/my-instagram-accounts', Icon: Instagram },
    ],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  items: ReadonlyArray<{ label: string; description?: string; href: string; Icon: typeof Settings }>;
}>;

export default function SidebarLayout({ children, userId }: SidebarLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = (userId || '?').charAt(0).toUpperCase();

  return (
    <div className="h-screen flex flex-col bg-[#f5f7fb] overflow-hidden">
      {/* Top Header Bar */}
      <header className="relative bg-white border-b border-gray-200 px-4 md:px-6 h-16 flex items-center justify-between flex-shrink-0 z-50 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-cyan to-brand-600" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden -ml-1 p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Menüyü aç/kapat"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/dekatre-logo.png"
              alt="Dekatre Danışmanlık"
              width={459}
              height={62}
              priority
              className="h-6 w-auto"
            />
            <span className="hidden sm:block h-6 w-px bg-gray-200" />
            <span className="hidden sm:block text-[13px] font-semibold text-slate-500 tracking-tight">
              WhatsApp İş Platformu
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <a
            href="/privacy"
            className="hidden md:inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Gizlilik
          </a>
          <div className="hidden md:block h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2.5" title={userId}>
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan to-brand-600 text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
              {initial}
            </span>
            <span className="hidden lg:block text-sm font-medium text-slate-700 max-w-[220px] truncate">{userId}</span>
          </div>
          <a
            href="/auth/logout"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıkış Yap</span>
          </a>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-slate-900/30 z-30" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-40',
            'fixed md:static top-16 bottom-0 left-0 transition-transform duration-200 md:translate-x-0',
            mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
          )}
        >
          <nav className="flex-1 py-5 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.title} className="mb-5">
                <h3 className="px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <div className="space-y-0.5 px-3">
                  {section.items.map((item) => {
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    const description = 'description' in item ? item.description : undefined;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'group relative flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                          isActive ? 'bg-brand-50' : 'hover:bg-slate-50',
                        )}
                      >
                        {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-600" />}
                        <span
                          className={cn(
                            'mt-0.5 flex-shrink-0 transition-colors',
                            isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600',
                          )}
                        >
                          <item.Icon className="w-[18px] h-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <span
                            className={cn(
                              'text-[14px] font-semibold block leading-snug',
                              isActive ? 'text-brand-800' : 'text-slate-700',
                            )}
                          >
                            {item.label}
                          </span>
                          {description && <p className="text-[12px] text-slate-400 mt-0.5 leading-snug">{description}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-gray-100 px-6 py-4">
            <p className="text-[12px] font-semibold text-slate-600">Dekatre Danışmanlık</p>
            <p className="text-[11px] text-slate-400 mt-0.5">WhatsApp Business API çözümü</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
