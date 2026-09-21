/**
 * Normalize line endings so Windows CRLF (\r\n), Unix LF (\n),
 * and legacy Mac CR (\r) behave consistently across all platforms.
 * Also strips UTF-8 BOM if present.
 */
export const normalizeLineEndings = (text: string): string => {
  const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};
