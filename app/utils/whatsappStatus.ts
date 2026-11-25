// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import type { T } from '@/app/i18n/locale';

/**
 * Human-readable reason for a failed WhatsApp send, from the Graph error code.
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes
 */
export function sendFailureReason(t: T, code?: number, metaMessage?: string): string {
  switch (code) {
    case 131037:
      return t(
        "This number's display name is not approved yet.",
        'Bu numaranın görünen adı henüz onaylanmadı.',
      );
    case 131047:
      return t(
        'More than 24 hours since the customer last wrote; only a template message can be sent.',
        'Müşterinin son mesajının üzerinden 24 saatten fazla geçti; yalnızca şablon mesaj gönderilebilir.',
      );
    case 131026:
      return t('The message could not be delivered to this recipient.', 'Mesaj bu alıcıya teslim edilemedi.');
    case 131030:
      return t('The recipient is not on the allowed test list.', 'Alıcı, izin verilen test listesinde değil.');
    case 133010:
      return t('This phone number is not registered.', 'Bu telefon numarası kayıtlı değil.');
    case 131042:
      return t('There is a payment problem on the WhatsApp account.', 'WhatsApp hesabında bir ödeme sorunu var.');
    case 190:
      return t('The access token is no longer valid. Reconnect the account.', 'Erişim izni geçersiz. Hesabı yeniden bağlayın.');
    case 10:
    case 200:
      return t('Missing permission to send from this number.', 'Bu numaradan gönderim için yetki yok.');
    case 130429:
    case 131048:
    case 131056:
      return t('Sending limit reached. Try again shortly.', 'Gönderim sınırına ulaşıldı. Biraz sonra tekrar deneyin.');
    case undefined:
      return t('Could not reach the server.', 'Sunucuya ulaşılamadı.');
    default:
      return `${metaMessage ?? t('Unknown error', 'Bilinmeyen hata')} (${t('Meta code', 'Meta kodu')}: ${code})`;
  }
}

export interface DisplayNameWarning {
  level: 'warning' | 'error';
  text: string;
  hint: string;
}

/**
 * A warning when the phone's display name blocks or may block sending, or null if
 * it is fine. A pending *new* name doesn't block sending while the old one is approved.
 */
export function displayNameWarning(
  t: T,
  phone: { name_status?: string; new_name_status?: string },
): DisplayNameWarning | null {
  const hint = t(
    'Check WhatsApp Manager → Phone numbers → Name status.',
    'WhatsApp Yöneticisi → Telefon numaraları → Ad durumu bölümünden kontrol edin.',
  );
  const current = phone.name_status;
  const pendingChange = phone.new_name_status;
  const usable = current === 'APPROVED' || current === 'AVAILABLE_WITHOUT_REVIEW';

  if (!current) return null; // older API response without the field — say nothing
  if (current === 'DECLINED') {
    return {
      level: 'error',
      text: t('Display name declined — messages cannot be sent', 'Görünen ad reddedildi — mesaj gönderilemez'),
      hint,
    };
  }
  if (current === 'PENDING_REVIEW') {
    return {
      level: 'warning',
      text: t('Display name pending review — sending may fail', 'Görünen ad onay bekliyor — gönderim başarısız olabilir'),
      hint,
    };
  }
  if (!usable) {
    return {
      level: 'error',
      text: t('Display name not approved — messages cannot be sent', 'Görünen ad onaylı değil — mesaj gönderilemez'),
      hint,
    };
  }
  if (pendingChange === 'PENDING_REVIEW') {
    return { level: 'warning', text: t('New display name pending review', 'Yeni görünen ad onay bekliyor'), hint };
  }
  if (pendingChange === 'DECLINED') {
    return { level: 'warning', text: t('New display name was declined', 'Yeni görünen ad reddedildi'), hint };
  }
  return null;
}
