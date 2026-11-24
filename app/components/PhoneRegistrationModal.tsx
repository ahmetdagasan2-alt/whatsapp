// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

'use client';

import { useState, useRef, useEffect } from 'react';

import { feGraphApiPostWrapper } from '@/app/feUtils';
import { useT } from '@/app/i18n/client';
import { cn } from '@/lib/utils';

interface PhoneRegistrationModalProps {
  phone: {
    id: string;
    display_phone_number: string;
    wabaId: string;
    status: string;
    code_verification_status: string;
  };
  onClose: () => void;
  onRegistrationComplete?: () => void;
}

type Step = 'request' | 'verify' | 'register' | 'done';

export default function PhoneRegistrationModal({
  phone,
  onClose,
  onRegistrationComplete,
}: PhoneRegistrationModalProps) {
  const t = useT();
  const [step, setStep] = useState<Step>(() => {
    if (phone.status === 'CONNECTED') return 'done';
    if (phone.code_verification_status === 'VERIFIED') return 'register';
    if (phone.status === 'SENT') return 'verify';
    return 'request';
  });
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(6);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (otpExpiry <= 0) return undefined;
    const timer = setTimeout(() => {
      const next = otpExpiry - 1;
      setOtpExpiry(next);
      if (next === 0) {
        setOtpExpired(true);
        setError(t('Code expired. Please request a new one.', 'Kodun süresi doldu. Lütfen yeni bir kod isteyin.'));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [otpExpiry, t]);

  // Auto-submit only when all 6 slots contain a valid digit (0-9)
  const allDigitsFilled = digits.every((d) => /^\d$/.test(d));

  useEffect(() => {
    if (step === 'verify' && allDigitsFilled && !isLoading && !otpExpired && attempts > 0) {
      handleVerifyCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleRequestCode() {
    setIsLoading(true);
    setError(null);
    try {
      await feGraphApiPostWrapper('/api/request-code', {
        waba_id: phone.wabaId,
        phone_number_id: phone.id,
      });
      setStep('verify');
      setResendTimer(60);
      setOtpExpiry(600);
      setOtpExpired(false);
    } catch {
      setError(t('Failed to request verification code. Please try again.', 'Doğrulama kodu istenemedi. Lütfen tekrar deneyin.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode() {
    const otpCode = digits.join('');
    // Strictly require exactly 6 numeric digits — reject if any slot is empty or non-numeric
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) return;
    setIsLoading(true);
    setError(null);
    try {
      await feGraphApiPostWrapper('/api/verify-code', {
        wabaId: phone.wabaId,
        phoneId: phone.id,
        otpCode,
      });
      setStep('register');
    } catch (err: unknown) {
      setAttempts((prev) => prev - 1);
      const errMsg = (err as { message?: string; code?: string })?.message ?? (err as { code?: string })?.code ?? '';
      if (/expired/i.test(errMsg)) {
        setError(t('Your code has expired. Please request a new one.', 'Kodunuzun süresi doldu. Lütfen yeni bir kod isteyin.'));
      } else if (/rate|limit/i.test(errMsg)) {
        setError(t('Too many requests. Please wait a moment and try again.', 'Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.'));
      } else {
        setError(t('Invalid code. Please check and try again.', 'Kod geçersiz. Lütfen kontrol edip tekrar deneyin.'));
      }
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister() {
    setIsLoading(true);
    setError(null);
    try {
      await feGraphApiPostWrapper('/api/register', {
        wabaId: phone.wabaId,
        phoneId: phone.id,
      });
      setStep('done');
      onRegistrationComplete?.();
    } catch (err: unknown) {
      const errMsg = (err as { message?: string; code?: string })?.message ?? (err as { code?: string })?.code ?? '';
      if (/expired/i.test(errMsg)) {
        setError(t('Your code has expired. Please request a new one.', 'Kodunuzun süresi doldu. Lütfen yeni bir kod isteyin.'));
      } else if (/rate|limit/i.test(errMsg)) {
        setError(t('Too many requests. Please wait a moment and try again.', 'Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.'));
      } else {
        setError(t('Failed to register phone. Please try again.', 'Numara kaydedilemedi. Lütfen tekrar deneyin.'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={onClose}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 'request' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('Verify your phone number', 'Telefon numaranızı doğrulayın')}</h2>
            <p className="text-sm text-gray-600">
              {t(
                `We'll send a verification code to ${phone.display_phone_number}. It may take a few moments to arrive.`,
                `${phone.display_phone_number} numarasına bir doğrulama kodu göndereceğiz. Kodun ulaşması birkaç dakika sürebilir.`,
              )}
            </p>
            <button
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              onClick={handleRequestCode}
              disabled={isLoading}
            >
              {isLoading ? t('Sending...', 'Gönderiliyor...') : t('Send verification code', 'Doğrulama kodu gönder')}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('Verify your phone number', 'Telefon numaranızı doğrulayın')}</h2>
            <p className="text-sm text-gray-600">
              {t(
                `We sent a verification code to ${phone.display_phone_number}. It may take a few moments to arrive. To verify your number, enter the 6-digit code.`,
                `${phone.display_phone_number} numarasına bir doğrulama kodu gönderdik. Kodun ulaşması birkaç dakika sürebilir. Numaranızı doğrulamak için 6 haneli kodu girin.`,
              )}
            </p>

            {otpExpired ? (
              <div className="text-center space-y-3 py-2">
                <p className="text-sm text-red-600 font-medium">{t('Code expired', 'Kodun süresi doldu')}</p>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  onClick={handleRequestCode}
                  disabled={isLoading}
                >
                  {isLoading ? t('Sending...', 'Gönderiliyor...') : t('Resend code', 'Kodu tekrar gönder')}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('Verification code', 'Doğrulama kodu')}</label>
                  <div className="flex gap-2 justify-center">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        className="w-11 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        value={digit}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        maxLength={1}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button
                    className={cn('text-blue-600 hover:text-blue-800', resendTimer > 0 && 'opacity-50 cursor-not-allowed')}
                    onClick={handleRequestCode}
                    disabled={resendTimer > 0 || isLoading}
                  >
                    {t('Resend code', 'Kodu tekrar gönder')}{' '}
                    {resendTimer > 0 ? `(0:${resendTimer.toString().padStart(2, '0')})` : ''}
                  </button>
                  <span className="text-gray-500">
                    {t('Code expires in', 'Kalan süre:')} {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t(`${attempts}/6 attempts left`, `${attempts}/6 deneme hakkı kaldı`)}</span>
                  {attempts === 0 && (
                    <span className="text-red-600">
                      {t('Too many attempts. Please request a new code.', 'Çok fazla deneme yapıldı. Lütfen yeni kod isteyin.')}
                    </span>
                  )}
                </div>

                <button
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  onClick={handleVerifyCode}
                  disabled={isLoading || digits.some((d) => !d) || attempts === 0}
                >
                  {isLoading ? t('Verifying...', 'Doğrulanıyor...') : t('Next', 'İleri')}
                </button>
              </>
            )}
          </div>
        )}

        {step === 'register' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('Complete registration', 'Kaydı tamamlayın')}</h2>
            <p className="text-sm text-gray-600">
              {t(
                'Your phone number has been verified. Click below to complete the registration.',
                'Telefon numaranız doğrulandı. Kaydı tamamlamak için aşağıdaki butona tıklayın.',
              )}
            </p>
            <button
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? t('Registering...', 'Kaydediliyor...') : t('Register', 'Kaydet')}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">{t('Phone number registered successfully!', 'Telefon numarası başarıyla kaydedildi!')}</p>
            <button
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              onClick={onClose}
            >
              {t('Close', 'Kapat')}
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
