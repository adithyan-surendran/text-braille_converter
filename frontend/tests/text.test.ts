import { describe, expect, it } from 'vitest';
import { normalizeLineEndings } from '../src/utils/text.ts';

describe('normalizeLineEndings utility', () => {
  it('normalizes CRLF to LF', () => {
    expect(normalizeLineEndings('hello\r\nworld\r\n')).toBe('hello\nworld\n');
  });

  it('preserves LF', () => {
    expect(normalizeLineEndings('hello\nworld\n')).toBe('hello\nworld\n');
  });

  it('normalizes legacy Mac CR to LF', () => {
    expect(normalizeLineEndings('hello\rworld\r')).toBe('hello\nworld\n');
  });

  it('normalizes mixed line endings', () => {
    expect(normalizeLineEndings('line1\r\nline2\rline3\nline4')).toBe(
      'line1\nline2\nline3\nline4'
    );
  });

  it('strips UTF-8 BOM if present at start', () => {
    expect(normalizeLineEndings('\uFEFFhello\r\nworld')).toBe('hello\nworld');
    expect(normalizeLineEndings('\uFEFFhello world')).toBe('hello world');
  });

  it('handles empty string gracefully', () => {
    expect(normalizeLineEndings('')).toBe('');
  });
});
