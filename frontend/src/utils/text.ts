/**
 * Normalize line endings so Windows CRLF (\r\n), Unix LF (\n),
 * and legacy Mac CR (\r) behave consistently across all platforms.
 * Also strips UTF-8 BOM if present.
 */
export const normalizeLineEndings = (text: string): string => {
  const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

/**
 * Truncate text into a single-line preview string suitable for UI cards and accessible labels.
 */
export const formatPreview = (text: string, maxLength = 35): string => {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (!singleLine) return '(empty)';
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength)}…`;
};

let historyCounter = 0;

/**
 * Generate a unique ID for history items.
 */
export const generateHistoryId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  historyCounter += 1;
  return `history-${Date.now()}-${historyCounter}`;
};

