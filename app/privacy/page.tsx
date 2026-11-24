// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import Link from 'next/link';
import {redirect} from 'next/navigation';

import {getT} from '@/app/i18n/server';

function isHttpUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  try {
    const {protocol} = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function PrivacyPage() {
  // Vercel's deploy button makes every listed env var required and rejects a
  // blank value, so operators without a policy URL enter a sentinel like "none".
  // Only redirect when the value is a real http(s) URL; anything else falls
  // through to the inline HTML content or the placeholder page below.
  const privacyPolicyUrl = process.env.PRIVACY_POLICY_URL?.trim();
  if (isHttpUrl(privacyPolicyUrl)) {
    redirect(privacyPolicyUrl);
  }

  // Vercel requires every env var listed by the deploy button to have a value,
  // so treat the documented "None" sentinel as unset.
  const privacyPolicyHtml = process.env.PRIVACY_POLICY_HTML?.trim();
  if (privacyPolicyHtml && privacyPolicyHtml.toLowerCase() !== 'none') {
    return (
      <main className="min-h-screen bg-white px-4 py-10">
        <div
          className="max-w-3xl mx-auto prose prose-slate"
          dangerouslySetInnerHTML={{__html: privacyPolicyHtml}}
        />
      </main>
    );
  }

  const t = await getT();
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d97706"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">{t('Privacy Policy', 'Gizlilik Politikası')}</h1>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
          {t(
            "This is a placeholder page. As the operator of this application, you are responsible for providing your own Privacy Policy that complies with applicable laws and Meta's platform policies.",
            'Bu geçici bir sayfadır. Uygulamanın işletmecisi olarak, yürürlükteki mevzuata ve Meta platform politikalarına uygun kendi Gizlilik Politikanızı sağlamakla yükümlüsünüz.',
          )}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-left mb-6">
          <p className="text-[13px] font-semibold text-amber-800 mb-1">{t('Action required', 'Yapılması gereken')}</p>
          <p className="text-[12px] text-amber-700 leading-relaxed mb-3">
            {t('Before deploying to production, do one of the following so', 'Canlıya almadan önce,')}{' '}
            <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">/privacy</code>{' '}
            {t(
              'serves your own Privacy Policy. This URL can then be referenced in your Meta app configuration and Embedded Signup setup.',
              'adresinin kendi Gizlilik Politikanızı göstermesi için aşağıdakilerden birini yapın. Bu adres daha sonra Meta uygulama ayarlarında ve Embedded Signup kurulumunda kullanılabilir.',
            )}
          </p>
          <ul className="text-[12px] text-amber-700 leading-relaxed list-disc pl-4 space-y-1">
            <li>
              <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">PRIVACY_POLICY_URL</code>{' '}
              {t(
                'environment variable: set it to redirect this route to a policy you host elsewhere, or',
                'ortam değişkenini, başka yerde barındırdığınız politikaya yönlendirecek şekilde ayarlayın veya',
              )}
            </li>
            <li>
              <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">app/privacy/page.tsx</code>{' '}
              {t('content: replace it with your own Privacy Policy.', 'dosyasının içeriğini kendi Gizlilik Politikanızla değiştirin.')}
            </li>
          </ul>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-[13px] font-semibold rounded-full hover:bg-brand-700 transition-colors"
        >
          ← {t('Back to app', 'Panele dön')}
        </Link>
      </div>
    </main>
  );
}
