import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeBraille, encodeText } from '../src/services/api.ts';

describe('API Service (api.ts)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('encodeText successfully calls /api/encode and returns data', async () => {
    const mockResponse = { input: 'Hello', braille: '⠠⠓⠑⠇⠇⠕' };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await encodeText('Hello');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/encode',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello' }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('decodeBraille successfully calls /api/decode and returns data', async () => {
    const mockResponse = { braille: '⠠⠓⠑⠇⠇⠕', text: 'Hello' };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await decodeBraille('⠠⠓⠑⠇⠇⠕');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/decode',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ braille: '⠠⠓⠑⠇⠇⠕' }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('handles HTTP 400 error with detail from backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Text contains unsupported characters.' }),
    } as unknown as Response);

    await expect(encodeText('hello @ world')).rejects.toThrow(
      'Text contains unsupported characters.'
    );
  });

  it('handles HTTP 422 error with validation details', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [{ loc: ['body', 'text'], msg: 'Field required', type: 'missing' }],
      }),
    } as unknown as Response);

    await expect(encodeText('')).rejects.toThrow('Field required');
  });

  it('handles network failure with helpful error message', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(encodeText('Hello')).rejects.toThrow(
      'Unable to connect to the converter service. Please make sure the backend server is running.'
    );
  });
});
