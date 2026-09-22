import type { ConversionMode } from '../types/api.ts';

/**
 * Returns the sensible default download filename based on the conversion mode.
 * - Text → Braille: braille-output.txt
 * - Braille → Text: text-output.txt
 */
export const getDownloadFilename = (mode: ConversionMode): string => {
  return mode === 'text-to-braille' ? 'braille-output.txt' : 'text-output.txt';
};

/**
 * Triggers a client-side download of plain text content using Blob and URL APIs.
 * Does not require external libraries or backend file generation.
 */
export const downloadTextFile = (content: string, filename: string): void => {
  if (!content) return;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Triggers a browser-safe file download from a Blob (e.g. backend-generated PDF).
 * Creates a temporary object URL, triggers an anchor click, and revokes the URL.
 */
export const downloadBlobFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
