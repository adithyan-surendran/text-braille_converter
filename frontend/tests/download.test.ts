import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile, getDownloadFilename } from '../src/utils/download.ts';

describe('Download Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDownloadFilename', () => {
    it('returns braille-output.txt for text-to-braille conversion mode', () => {
      expect(getDownloadFilename('text-to-braille')).toBe('braille-output.txt');
    });

    it('returns text-output.txt for braille-to-text conversion mode', () => {
      expect(getDownloadFilename('braille-to-text')).toBe('text-output.txt');
    });
  });

  describe('downloadTextFile', () => {
    it('does nothing and creates no download elements when content is empty', () => {
      const createObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;
      const appendSpy = vi.spyOn(document.body, 'appendChild');

      downloadTextFile('', 'braille-output.txt');

      expect(createObjectURLMock).not.toHaveBeenCalled();
      expect(appendSpy).not.toHaveBeenCalled();
    });

    it('creates Blob with correct charset, sets download attribute, clicks anchor, and revokes URL', async () => {
      const mockUrl = 'blob:http://localhost/test-uuid';
      const createObjectURLMock = vi.fn().mockReturnValue(mockUrl);
      const revokeObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(clickMock);
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      const content = '⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙';
      const filename = 'braille-output.txt';

      downloadTextFile(content, filename);

      // Verify Blob creation
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/plain;charset=utf-8');
      expect(await blobArg.text()).toBe(content);

      // Verify Anchor configuration and lifecycle
      expect(appendSpy).toHaveBeenCalledTimes(1);
      const appendedElement = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(appendedElement).toBeInstanceOf(HTMLAnchorElement);
      expect(appendedElement.download).toBe(filename);
      expect(appendedElement.href).toBe(mockUrl);

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith(appendedElement);
      expect(revokeObjectURLMock).toHaveBeenCalledWith(mockUrl);
    });
  });
});
