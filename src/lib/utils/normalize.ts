/**
 * Checks if a car number is a temporary bypass placeholder (e.g. 'no-car-xxxx', '미입력', '미등록').
 */
export function isTempCarNumber(carNum?: string | null): boolean {
  if (!carNum) return true;
  const trimmed = carNum.trim();
  if (!trimmed || trimmed === '미입력' || trimmed === '미등록' || trimmed === '-') return true;
  return trimmed.toLowerCase().startsWith('no-car-');
}

/**
 * Checks if a phone number is a temporary bypass placeholder (e.g. 'no-phone-xxxx', '미입력', '미등록').
 */
export function isTempPhoneNumber(phone?: string | null): boolean {
  if (!phone) return true;
  const trimmed = phone.trim();
  if (!trimmed || trimmed === '미입력' || trimmed === '미등록' || trimmed === '-') return true;
  return trimmed.toLowerCase().startsWith('no-phone-');
}

/**
 * Masks temporary bypass car numbers for clean UI rendering.
 */
export function maskTempCarNumber(carNum?: string | null, fallback = ''): string {
  if (isTempCarNumber(carNum)) {
    return fallback;
  }
  return carNum!;
}

/**
 * Masks temporary bypass phone numbers for clean UI rendering.
 */
export function maskTempPhoneNumber(phone?: string | null, fallback = '', format = false): string {
  if (isTempPhoneNumber(phone)) {
    return fallback;
  }
  return format ? formatPhoneNumber(phone) : phone!;
}

/**
 * Strips non-digit characters from phone number string and normalizes leading zeros.
 * Handles format variations like: '010-1234-5678', '010 1234 5678', '1012345678'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || isTempPhoneNumber(phone)) return '';
  // Remove all non-numeric characters
  let digits = phone.replace(/\D/g, '');
  
  // If user typed 1012345678 (missing leading 0), prepend 0 if length is 10
  if (digits.length === 10 && digits.startsWith('10')) {
    digits = '0' + digits;
  }
  return digits;
}

/**
 * Formats a normalized phone number string into standard Korean hyphenated style.
 */
export function formatPhoneNumber(normalizedPhone: string, fallback = ''): string {
  if (!normalizedPhone || isTempPhoneNumber(normalizedPhone)) return fallback;
  const digits = normalizePhoneNumber(normalizedPhone);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return normalizedPhone;
}

/**
 * Normalizes license plate / car numbers by stripping excessive whitespace and standardizing Korean characters.
 */
export function normalizeCarNumber(carNum: string): string {
  if (!carNum || isTempCarNumber(carNum)) return '';
  return carNum.replace(/\s+/g, '').toUpperCase().trim();
}

/**
 * Replaces macro placeholders in templates, e.g. #{car_number} -> '12가3456'
 */
export function replaceMacroPlaceholders(
  template: string,
  variables: { [key: string]: string | undefined }
): string {
  let result = template;
  Object.keys(variables).forEach((key) => {
    const rawVal = variables[key] || '';
    // Mask temp values if macro key is car_number or phone_number
    let val = rawVal;
    if (key === 'car_number' && isTempCarNumber(rawVal)) {
      val = '';
    } else if (key === 'phone_number' && isTempPhoneNumber(rawVal)) {
      val = '';
    }
    const regex = new RegExp(`#{${key}}`, 'g');
    result = result.replace(regex, val);
  });
  return result;
}

