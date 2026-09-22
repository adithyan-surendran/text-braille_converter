import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeBraille, encodeFile, encodeText, generatePdf } from '../src/services/api.ts';

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

  describe('encodeFile (PDF upload)', () => {
    it('sends FormData to /api/encode-file without manual Content-Type header and returns data', async () => {
      const mockResponse = { input: 'PDF Extracted Text', braille: '⠠⠏⠙⠋' };
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const file = new File(['%PDF-1.4 dummy'], 'sample.pdf', { type: 'application/pdf' });
      const result = await encodeFile(file);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/encode-file',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );

      // Verify no manual Content-Type header was passed
      const fetchArgs = vi.mocked(globalThis.fetch).mock.calls[0][1];
      expect(fetchArgs?.headers).toBeUndefined();
      expect(result).toEqual(mockResponse);
    });

    it('handles HTTP 400 error from backend for invalid or scanned PDF', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'Could not extract text from this PDF. Scanned/image-only PDFs are not supported yet.',
        }),
      } as unknown as Response);

      const file = new File(['%PDF-1.4 scanned'], 'scanned.pdf', { type: 'application/pdf' });
      await expect(encodeFile(file)).rejects.toThrow(
        'Could not extract text from this PDF. Scanned/image-only PDFs are not supported yet.'
      );
    });

    it('handles network failure during PDF file upload', async () => {
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const file = new File(['%PDF-1.4 dummy'], 'doc.pdf', { type: 'application/pdf' });
      await expect(encodeFile(file)).rejects.toThrow(
        'Unable to connect to the converter service. Please make sure the backend server is running.'
      );
    });
  });

  describe('generatePdf (PDF download)', () => {
    it('sends JSON payload to /api/generate-pdf with Content-Type application/json and returns a Blob', async () => {
      const mockBlob = new Blob(['%PDF-1.4 binary content'], { type: 'application/pdf' });
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      } as unknown as Response);

      const payload = { input: 'Hello 123!', braille: '⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖' };
      const result = await generatePdf(payload);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/generate-pdf',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      );

      expect(result).toBe(mockBlob);
      expect(result.type).toBe('application/pdf');
    });

    it('handles HTTP 400 error from backend when content is invalid or empty', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'Cannot generate PDF from empty content. Please perform a conversion first.',
        }),
      } as unknown as Response);

      await expect(generatePdf({ input: '', braille: '' })).rejects.toThrow(
        'Cannot generate PDF from empty content. Please perform a conversion first.'
      );
    });

    it('handles HTTP 422 error from backend when fields are missing or invalid', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          detail: [{ loc: ['body', 'input'], msg: 'Field required', type: 'missing' }],
        }),
      } as unknown as Response);

      await expect(
        generatePdf({ input: '', braille: '' } as unknown as { input: string; braille: string })
      ).rejects.toThrow('Field required');
    });

    it('handles network failure during PDF generation request', async () => {
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(
        generatePdf({ input: 'Test', braille: '⠠⠞⠑⠎⠞' })
      ).rejects.toThrow(
        'Unable to connect to the converter service. Please make sure the backend server is running.'
      );
    });
  });
});

