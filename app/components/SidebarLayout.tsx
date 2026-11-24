// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Home,
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
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';

import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import { useT } from '@/app/i18n/client';
import type { T } from '@/app/i18n/locale';
import { cn } from '@/lib/utils';

interface SidebarLayoutProps {
  children: ReactNode;
  userId: string;
  logoUrl?: string;
  appName: string;
}

interface NavItem {
  label: string;
  description?: string;
  href: string;
  Icon: typeof Home;
}

function getNavSections(t: T): { title: string; items: NavItem[] }[] {
  return [
    {
      title: t('Messaging', 'Mesajlaşma'),
      items: [
        {
          label: t('Home', 'Ana Sayfa'),
          description: t('Connect your WhatsApp account', 'WhatsApp hesabınızı bağlayın'),
          href: '/',
          Icon: Home,
        },
        {
          label: t('Inbox', 'Gelen Kutusu'),
          description: t('Send and receive messages on all numbers', 'Tüm numaralarınızdan mesaj gönderin ve alın'),
          href: '/my-inbox',
          Icon: MessageSquare,
        },
        {
          label: t('Paid Messages', 'Ücretli Mesajlar'),
          description: t('Send template and marketing messages', 'Şablon ve pazarlama mesajları gönderin'),
          href: '/paid_messaging',
          Icon: Mail,
        },
      ],
    },
    {
      title: t('My Assets', 'Varlıklarım'),
      items: [
        { label: t('WhatsApp Accounts', 'WhatsApp Hesapları'), href: '/my-wabas', Icon: Building2 },
        { label: t('Facebook Pages', 'Facebook Sayfaları'), href: '/my-pages', Icon: FileText },
        { label: t('Ad Accounts', 'Reklam Hesapları'), href: '/my-ad-accounts', Icon: Megaphone },
        { label: t('Datasets', 'Veri Kümeleri'), href: '/my-datasets', Icon: Database },
        { label: t('Catalogs', 'Kataloglar'), href: '/my-catalogs', Icon: BookOpen },
        { label: t('Instagram Accounts', 'Instagram Hesapları'), href: '/my-instagram-accounts', Icon: Instagram },
      ],
    },
    {
      title: t('System', 'Sistem'),
      items: [{ label: t('Webhook Logs', 'Webhook Kayıtları'), href: '/my-webhooks', Icon: Webhook }],
    },
  ];
}

function UserMenu({ userId }: { userId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (userId || '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 hover:bg-slate-100 transition-colors"
      >
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-cyan to-brand-600 text-white text-sm font-semibold flex items-center justify-center">
          {initial}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl ring-1 ring-slate-900/5 overflow-hidden z-[60]"
        >
          <div className="px-4 py-4 bg-gradient-to-br from-brand-50 to-white border-b border-slate-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-cyan to-brand-600 text-white font-semibold flex items-center justify-center flex-shrink-0">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t('Signed in as', 'Oturum açan')}
              </p>
              <p className="text-sm font-medium text-slate-800 truncate" title={userId}>
                {userId}
              </p>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-600">{t('Language', 'Dil')}</span>
            <LanguageSwitcher />
          </div>

          <div className="py-1.5">
            <Link
              href="/advanced"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              {t('Advanced Setup', 'Gelişmiş Kurulum')}
            </Link>
            <a
              href="/privacy"
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              {t('Privacy Policy', 'Gizlilik Politikası')}
            </a>
          </div>

          <div className="border-t border-slate-100 py-1.5">
            <a
              href="/auth/logout"
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              {t('Log out', 'Çıkış Yap')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SidebarLayout({ children, userId }: SidebarLayoutProps) {
  const t = useT();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navSections = getNavSections(t);

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
            aria-label={t('Toggle menu', 'Menüyü aç/kapat')}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/dekatre-logo.png"
              alt="Dekatre Danışmanlık"
              width={453}
              height={54}
              priority
              className="h-6 w-auto"
            />
            <span className="hidden sm:block h-6 w-px bg-gray-200" />
            <span className="hidden sm:block text-[13px] font-semibold text-slate-500 tracking-tight">
              {t('WhatsApp Business Platform', 'WhatsApp İş Platformu')}
            </span>
          </Link>
        </div>
        <UserMenu userId={userId} />
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
                          {item.description && (
                            <p className="text-[12px] text-slate-400 mt-0.5 leading-snug">{item.description}</p>
                          )}
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
            <p className="text-[11px] text-slate-400 mt-0.5">SAP &amp; ABAP · {t('Consulting', 'Danışmanlık')} · {t('Support', 'Destek')}</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
