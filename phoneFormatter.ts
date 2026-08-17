/**
 * Utility functions for Thai Phone Number formatting and cleaning.
 * Ensures leading 0 is preserved across Google Sheets, storage, and UI.
 */

export function cleanPhoneNumber(rawPhone: string | number | undefined | null): string {
  if (!rawPhone) return '-';
  let phoneStr = String(rawPhone).trim();
  if (!phoneStr || phoneStr === '-' || phoneStr === 'undefined' || phoneStr === 'null') {
    return '-';
  }

  // Remove leading apostrophe if present from Google Sheets raw text
  phoneStr = phoneStr.replace(/^'+/, '').trim();

  // Strip non-digit characters except leading +
  let clean = phoneStr.replace(/[^\d+]/g, '');

  // Handle +66 or 66 country code for Thailand
  if (clean.startsWith('+66')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('66') && clean.length >= 10) {
    clean = '0' + clean.slice(2);
  }

  // If 9 digits starting with 6, 8, 9 (mobile) or 2, 3, 4, 5, 7 (landline), prepend '0'
  if (clean.length === 9 && ['6', '8', '9', '2', '3', '4', '5', '7'].includes(clean[0])) {
    clean = '0' + clean;
  }
  // If 8 digits starting with 2 (Bangkok landline without 0 and area prefix)
  else if (clean.length === 8 && clean.startsWith('2')) {
    clean = '0' + clean;
  }

  return clean || '-';
}

/**
 * Formats a phone number for display with hyphens (e.g., 081-234-5678 or 02-123-4567)
 */
export function formatPhoneNumber(rawPhone: string | number | undefined | null): string {
  const clean = cleanPhoneNumber(rawPhone);
  if (!clean || clean === '-') return '-';

  // 10 digits Thai Mobile: 08x-xxx-xxxx or 09x-xxx-xxxx or 06x-xxx-xxxx
  if (clean.length === 10 && clean.startsWith('0')) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }

  // 9 digits Thai Landline: 02-xxx-xxxx or 0xx-xxx-xxx
  if (clean.length === 9 && clean.startsWith('02')) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
  }
  if (clean.length === 9 && clean.startsWith('0')) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }

  return clean;
}

/**
 * Format phone number string for storing into Google Sheets with leading 0 guaranteed
 */
export function formatPhoneForGoogleSheets(rawPhone: string | number | undefined | null): string {
  const clean = cleanPhoneNumber(rawPhone);
  if (!clean || clean === '-') return '-';
  // Prepend single quote so Google Sheets always stores as Text without dropping leading 0
  return `'${clean}`;
}
