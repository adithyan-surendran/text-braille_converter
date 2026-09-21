import { describe, expect, it } from 'vitest';
import { formatPreview, generateHistoryId, normalizeLineEndings } from '../src/utils/text.ts';

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

describe('formatPreview utility', () => {
  it('returns (empty) for empty or whitespace-only strings', () => {
    expect(formatPreview('')).toBe('(empty)');
    expect(formatPreview('   \n\t  ')).toBe('(empty)');
  });

  it('normalizes whitespace and returns full text when within maxLength', () => {
    expect(formatPreview('Hello world')).toBe('Hello world');
    expect(formatPreview('  Hello   \n  world  ')).toBe('Hello world');
  });

  it('truncates and appends ellipsis when text exceeds maxLength', () => {
    const longText = 'The quick brown fox jumps over the lazy dog';
    expect(formatPreview(longText, 20)).toBe('The quick brown fox …');
    expect(formatPreview(longText, 10)).toBe('The quick …');
  });

  it('preserves Braille characters during formatting and truncation', () => {
    const braille = '⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙';
    expect(formatPreview(braille, 35)).toBe(braille);
    expect(formatPreview('⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙ ⠁⠛⠁⠊⠝', 10)).toBe('⠠⠓⠑⠇⠇⠕ ⠠⠺⠕…');
  });
});

describe('generateHistoryId utility', () => {
  it('generates distinct non-empty string IDs', () => {
    const id1 = generateHistoryId();
    const id2 = generateHistoryId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});

