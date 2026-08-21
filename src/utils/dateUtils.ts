/**
 * Date Utility for Common Era (ค.ศ.)
 * Formats all years in CE (e.g. 2026, 2024)
 */

/**
 * Returns today's date formatted as DD/MM/YYYY in Common Era (ค.ศ.)
 */
export const getTodayCE = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearCE = now.getFullYear();
  return `${day}/${month}/${yearCE}`;
};

export const getTodayThaiBE = (): string => {
  return getTodayCE();
};

/**
 * Normalizes any date string (ISO YYYY-MM-DD, DD/MM/YYYY, or Date object) into DD/MM/YYYY in ค.ศ.
 */
export const formatToCE = (inputStr?: string | Date | null): string => {
  if (!inputStr) return getTodayCE();

  if (inputStr instanceof Date) {
    const day = String(inputStr.getDate()).padStart(2, '0');
    const month = String(inputStr.getMonth() + 1).padStart(2, '0');
    let year = inputStr.getFullYear();
    if (year > 2400) year -= 543;
    return `${day}/${month}/${year}`;
  }

  const str = String(inputStr).trim();

  // Already DD/MM/YYYY
  const thMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (thMatch) {
    const day = thMatch[1].padStart(2, '0');
    const month = thMatch[2].padStart(2, '0');
    let year = parseInt(thMatch[3], 10);
    if (year > 2400) year -= 543;
    return `${day}/${month}/${year}`;
  }

  // HTML Date Input Format: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    if (year > 2400) year -= 543;
    const month = isoMatch[2];
    const day = isoMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Fallback try standard JS Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    let year = d.getFullYear();
    if (year > 2400) year -= 543;
    return `${day}/${month}/${year}`;
  }

  return str;
};

export const formatToThaiBE = (inputStr?: string | Date | null): string => {
  return formatToCE(inputStr);
};

/**
 * Converts a DD/MM/YYYY (ค.ศ.) string into YYYY-MM-DD for <input type="date">
 */
export const ceToISODate = (ceDateStr?: string): string => {
  if (!ceDateStr) return '';
  const match = String(ceDateStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  let year = parseInt(match[3], 10);
  if (year > 2400) year -= 543;
  return `${year}-${month}-${day}`;
};

export const thaiBEToISODate = (thaiDateStr?: string): string => {
  return ceToISODate(thaiDateStr);
};

/**
 * Normalizes year in a DD/MM/YYYY string to the current Common Era year (e.g. 2026)
 */
export const convertYearToCurrentCE = (dateStr?: string, defaultCurrent: boolean = true): string => {
  const currentCEYear = new Date().getFullYear();
  if (!dateStr || dateStr.trim() === '') {
    return defaultCurrent ? getTodayCE() : '';
  }

  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = parseInt(match[3], 10);
    if (year > 2400) {
      year -= 543;
    }
    if (year < 2000) {
      year = currentCEYear;
    }
    return `${day}/${month}/${year}`;
  }

  return formatToCE(dateStr);
};

export const convertYearToCurrentBE = (dateStr?: string, defaultCurrent: boolean = true): string => {
  return convertYearToCurrentCE(dateStr, defaultCurrent);
};
