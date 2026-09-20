/**
 * Normalize line endings so Windows CRLF (\r\n), Unix LF (\n),
 * and legacy Mac CR (\r) behave consistently across all platforms.
 */
export const normalizeLineEndings = (text: string): string => {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};
