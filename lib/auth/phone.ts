// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Shared by the signup form (client) and the auth API (server).

import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export interface CountryOption {
  iso: CountryCode;
  dialCode: string;
  name: string;
  flag: string;
}

function flagEmoji(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Every country with a calling code, named in the given UI language and sorted alphabetically. */
export function getCountryOptions(locale: 'tr' | 'en'): CountryOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale === 'tr' ? 'tr-TR' : 'en-US'], { type: 'region' });
  } catch {
    names = null;
  }
  const collator = new Intl.Collator(locale === 'tr' ? 'tr-TR' : 'en-US');
  return getCountries()
    .map((iso) => ({
      iso,
      dialCode: `+${getCountryCallingCode(iso)}`,
      name: names?.of(iso) ?? iso,
      flag: flagEmoji(iso),
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (getCountries() as string[]).includes(value);
}

/**
 * Validates a national number for the selected country and returns it in E.164
 * (e.g. "+905321234567"), or null when the number cannot exist in that country.
 */
export function toE164(country: CountryCode, nationalNumber: string): string | null {
  const parsed = parsePhoneNumberFromString(nationalNumber, country);
  if (!parsed || !parsed.isValid() || parsed.country !== country) return null;
  return parsed.number;
}

/** "+90 532 *** ** 67" style masking for showing where a code was sent. */
export function maskPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  const intl = parsed?.formatInternational() ?? e164;
  const totalDigits = intl.replace(/\D/g, '').length;
  // Keep the calling code plus the first 3 national digits, and the last 2 digits.
  const keepStart = (parsed?.countryCallingCode.length ?? 0) + 3;
  const keepEnd = 2;
  let index = 0;
  return intl.replace(/\d/g, (d) => {
    const i = index++;
    return i >= keepStart && i < totalDigits - keepEnd ? '*' : d;
  });
}
