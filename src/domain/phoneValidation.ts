/**
 * ITU-T E.164 Phone Number Normalization & Formatting
 *
 * Designed for Moa v2: Domestic Bilingual Environment (+82 default).
 * Pure functions with zero third-party/network dependencies, verified by node:assert.
 */

export interface PhoneNormalizationResult {
  isValid: boolean;
  e164: string;           // e.g. '+821012345678', '+14155552671'
  nationalDigits: string; // e.g. '01012345678', '4155552671'
  countryCallingCode: string; // e.g. '82', '1', '84'
  isDomestic: boolean;    // true if South Korea (+82)
}

/**
 * Normalizes any domestic or international phone string into ITU-T E.164 standard.
 * Default country is '82' (South Korea).
 */
export function normalizeToE164(
  input?: string | null,
  defaultCountryCode = '82'
): PhoneNormalizationResult {
  const invalidResult: PhoneNormalizationResult = {
    isValid: false,
    e164: '',
    nationalDigits: '',
    countryCallingCode: '',
    isDomestic: false,
  };

  if (!input) return invalidResult;

  const raw = input.trim();
  if (!raw) return invalidResult;

  const startsWithPlus = raw.startsWith('+');
  const digitsOnly = raw.replace(/[^0-9]/g, '');

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return invalidResult;
  }

  let countryCode = defaultCountryCode.replace(/[^0-9]/g, '') || '82';
  let subscriberDigits = digitsOnly;
  let isDomestic = false;

  if (startsWithPlus) {
    // Explicit international number provided
    if (digitsOnly.startsWith('82')) {
      countryCode = '82';
      isDomestic = true;
      subscriberDigits = digitsOnly.slice(2);
      // Remove leading 0 if someone wrote +82010...
      if (subscriberDigits.startsWith('0')) {
        subscriberDigits = subscriberDigits.slice(1);
      }
    } else {
      isDomestic = false;
      // Derive country code (1 to 3 digits)
      if (digitsOnly.startsWith('1')) {
        countryCode = '1';
        subscriberDigits = digitsOnly.slice(1);
      } else if (digitsOnly.length >= 10 && (digitsOnly.startsWith('81') || digitsOnly.startsWith('84') || digitsOnly.startsWith('86') || digitsOnly.startsWith('44') || digitsOnly.startsWith('61') || digitsOnly.startsWith('49') || digitsOnly.startsWith('33'))) {
        countryCode = digitsOnly.slice(0, 2);
        subscriberDigits = digitsOnly.slice(2);
      } else {
        // Fallback: take up to 3 digits or remainder
        countryCode = digitsOnly.slice(0, 3);
        subscriberDigits = digitsOnly.slice(3);
      }
    }
  } else {
    // Domestic assumption with defaultCountryCode
    if (countryCode === '82') {
      isDomestic = true;
      if (digitsOnly.startsWith('82') && digitsOnly.length >= 10) {
        // e.g. 821012345678 entered without plus
        subscriberDigits = digitsOnly.slice(2);
        if (subscriberDigits.startsWith('0')) {
          subscriberDigits = subscriberDigits.slice(1);
        }
      } else {
        // e.g. 01012345678 or 021234567
        // Strip single leading 0 for E.164 national destination
        if (digitsOnly.startsWith('0')) {
          subscriberDigits = digitsOnly.slice(1);
        } else {
          subscriberDigits = digitsOnly;
        }
      }
    } else {
      isDomestic = false;
      subscriberDigits = digitsOnly;
    }
  }

  if (subscriberDigits.length < 5) {
    return invalidResult;
  }

  const e164 = `+${countryCode}${subscriberDigits}`;

  // Reconstruct domestic national representation
  let nationalDigits = subscriberDigits;
  if (isDomestic) {
    nationalDigits = subscriberDigits.startsWith('0') ? subscriberDigits : `0${subscriberDigits}`;
  }

  return {
    isValid: true,
    e164,
    nationalDigits,
    countryCallingCode: countryCode,
    isDomestic,
  };
}

/**
 * Formats a phone number for user-friendly UI display.
 * Automatically recognizes Korean domestic numbers and applies standard hyphen grouping.
 */
export function formatPhoneDisplay(
  phone?: string | null,
  formatStyle: 'national' | 'international' = 'national'
): string {
  if (!phone) return '-';

  const normalized = normalizeToE164(phone);
  if (!normalized.isValid) {
    return phone;
  }

  if (normalized.isDomestic) {
    const digits = normalized.nationalDigits;
    let formattedNational = digits;

    if (digits.startsWith('02')) {
      // Seoul: 02-XXX-XXXX or 02-XXXX-XXXX
      if (digits.length === 9) {
        formattedNational = `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
      } else if (digits.length === 10) {
        formattedNational = `02-${digits.slice(2, 6)}-${digits.slice(6)}`;
      }
    } else if (digits.length === 11) {
      // 010-XXXX-XXXX
      formattedNational = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      // 031-XXX-XXXX or 010-XXX-XXXX
      formattedNational = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 12) {
      // 050X-XXXX-XXXX
      formattedNational = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    }

    if (formatStyle === 'international') {
      return `+82 ${formattedNational.replace(/^0/, '')}`;
    }
    return formattedNational;
  }

  // International numbers
  const sub = normalized.nationalDigits;
  return `+${normalized.countryCallingCode} ${sub.length > 7 ? `${sub.slice(0, 3)}-${sub.slice(3, 6)}-${sub.slice(6)}` : sub}`;
}

/**
 * Masks phone number for privacy display (e.g. 010-****-5678).
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '-';
  const display = formatPhoneDisplay(phone);
  if (display === '-') return '-';

  const parts = display.split('-');
  if (parts.length === 3) {
    const maskLen = parts[1].length;
    return `${parts[0]}-${'*'.repeat(maskLen)}-${parts[2]}`;
  }

  // Fallback masking
  if (display.length > 7) {
    return `${display.slice(0, 3)}****${display.slice(-4)}`;
  }
  return display;
}
