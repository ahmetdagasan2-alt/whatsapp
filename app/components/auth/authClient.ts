// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import type { T } from '@/app/i18n/locale';

export class AuthRequestError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export async function authPost<R = Record<string, unknown>>(action: string, body: Record<string, unknown>): Promise<R> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthRequestError('network');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthRequestError(data.error ?? 'server_error');
  return data as R;
}

export function authErrorMessage(err: unknown, t: T): string {
  const code = err instanceof AuthRequestError ? err.code : 'server_error';
  switch (code) {
    case 'invalid_input':
      return t('Please fill in all fields.', 'Lütfen tüm alanları doldurun.');
    case 'invalid_email':
      return t('Please enter a valid email address.', 'Lütfen geçerli bir e-posta adresi girin.');
    case 'invalid_phone':
      return t(
        'This phone number is not valid for the selected country.',
        'Bu telefon numarası seçilen ülke için geçerli değil.',
      );
    case 'weak_password':
      return t('Password must be at least 8 characters.', 'Şifre en az 8 karakter olmalıdır.');
    case 'email_taken':
      return t(
        'An account with this email already exists. Try logging in.',
        'Bu e-posta adresiyle kayıtlı bir hesap zaten var. Giriş yapmayı deneyin.',
      );
    case 'phone_taken':
      return t(
        'This phone number is already registered to another account.',
        'Bu telefon numarası başka bir hesapta kayıtlı.',
      );
    case 'otp_not_configured':
      return t(
        'Phone verification is not set up yet. Please contact Dekatre support.',
        'Telefon doğrulaması henüz yapılandırılmadı. Lütfen Dekatre destek ekibiyle iletişime geçin.',
      );
    case 'otp_send_failed':
      return t(
        'We could not send a WhatsApp code to this number. Make sure it uses WhatsApp and try again.',
        'Bu numaraya WhatsApp kodu gönderilemedi. Numaranın WhatsApp kullandığından emin olup tekrar deneyin.',
      );
    case 'rate_limited':
      return t(
        'Too many codes were requested. Please wait an hour and try again.',
        'Çok fazla kod istendi. Lütfen bir saat sonra tekrar deneyin.',
      );
    case 'cooldown':
      return t('Please wait a minute before requesting a new code.', 'Yeni kod istemeden önce lütfen bir dakika bekleyin.');
    case 'invalid_code':
      return t('The code is incorrect.', 'Kod hatalı.');
    case 'expired_code':
      return t('The code has expired. Request a new one.', 'Kodun süresi doldu. Yeni bir kod isteyin.');
    case 'too_many_attempts':
      return t('Too many wrong attempts. Request a new code.', 'Çok fazla hatalı deneme yapıldı. Yeni bir kod isteyin.');
    case 'invalid_credentials':
      return t('Email or password is incorrect.', 'E-posta veya şifre hatalı.');
    case 'network':
      return t('Could not reach the server. Check your connection.', 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.');
    default:
      return t('Something went wrong. Please try again.', 'Bir sorun oluştu. Lütfen tekrar deneyin.');
  }
}
