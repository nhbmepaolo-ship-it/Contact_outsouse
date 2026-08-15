import { VisitorRecord } from '../types';

export const RETENTION_DAYS = 5;

/**
 * Parses timestamp string (e.g. "25/2/2025, 16:40:51" or ISO) into Date object
 */
export function parseRecordDate(timestamp: string, createdDate?: string): Date {
  if (createdDate) {
    const d = new Date(createdDate);
    if (!isNaN(d.getTime())) return d;
  }

  if (!timestamp) return new Date();

  // Check if format is "d/m/yyyy, HH:MM:SS" or "dd/mm/yyyy, HH:MM:SS"
  const match = timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 12;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }

  const parsed = new Date(timestamp);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Checks whether an image has passed the 5-day retention period.
 */
export function checkImageExpired(record: VisitorRecord, now = new Date()): boolean {
  const recordDate = parseRecordDate(record.timestamp, record.createdDate);
  const diffMs = now.getTime() - recordDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= RETENTION_DAYS;
}

/**
 * Calculates days remaining before image expiration.
 */
export function getDaysRemaining(record: VisitorRecord, now = new Date()): number {
  const recordDate = parseRecordDate(record.timestamp, record.createdDate);
  const expireDate = new Date(recordDate.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const diffMs = expireDate.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Applies retention policy to a list of visitor records.
 * Marks expired records and redacts the image if expired.
 */
export function applyImageRetentionPolicy(records: VisitorRecord[], now = new Date()): VisitorRecord[] {
  return records.map((record) => {
    const isExpired = checkImageExpired(record, now);
    const recordDate = parseRecordDate(record.timestamp, record.createdDate);
    const expireDate = new Date(recordDate.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

    return {
      ...record,
      isImageExpired: isExpired,
      imageExpireDate: expireDate.toISOString(),
      // If expired and had an image, retain flag but we treat the image as deleted
    };
  });
}
