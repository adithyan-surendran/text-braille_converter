import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Converter from '../src/components/Converter.tsx';
import * as api from '../src/services/api.ts';
import type { EncodeResponse } from '../src/types/api.ts';

// Mock the API service functions
vi.mock('../src/services/api.ts', () => ({
  encodeText: vi.fn(),
  decodeBraille: vi.fn(),
}));

describe('Converter Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main converter and essential elements', () => {
    render(<Converter />);

    // Mode toggles
    expect(screen.getByRole('button', { name: /text → braille/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /braille → text/i })).toBeInTheDocument();

    // Input & Output areas
    expect(screen.getByLabelText(/english text/i)).toBeInTheDocument();
    expect(screen.getByText(/braille output/i)).toBeInTheDocument();

    // Action buttons
    expect(screen.getByRole('button', { name: /^convert$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('has Text → Braille mode selected initially', () => {
    render(<Converter />);

    const textModeBtn = screen.getByRole('button', { name: /text → braille/i });
    const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });

    expect(textModeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(brailleModeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText(/english text/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter text to convert/i)).toBeInTheDocument();
  });

  it('allows the user to enter text and updates character count', async () => {
    const user = userEvent.setup();
    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Hello 123!');

    expect(textarea).toHaveValue('Hello 123!');
    expect(screen.getByText('10 characters')).toBeInTheDocument();
  });

  it('calls encode API when Convert is clicked in Text → Braille mode and displays Braille', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Hello 123!',
      braille: '⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖',
    });

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Hello 123!');

    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    await user.click(convertBtn);

    expect(api.encodeText).toHaveBeenCalledWith('Hello 123!');
    await waitFor(() => {
      expect(screen.getByText('⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖')).toBeInTheDocument();
    });
  });

  it('allows switching to Braille → Text mode and updates labels/placeholders', async () => {
    const user = userEvent.setup();
    render(<Converter />);

    const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });
    await user.click(brailleModeBtn);

    expect(brailleModeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/braille input/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter braille to convert/i)).toBeInTheDocument();
    expect(screen.getByText(/text output/i)).toBeInTheDocument();
  });

  it('calls decode API with Braille input and displays returned text', async () => {
    const user = userEvent.setup();
    vi.mocked(api.decodeBraille).mockResolvedValueOnce({
      braille: '⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖',
      text: 'Hello 123!',
    });

    render(<Converter />);

    // Switch to Braille -> Text mode
    await user.click(screen.getByRole('button', { name: /braille → text/i }));

    const textarea = screen.getByLabelText(/braille input/i);
    fireEvent.change(textarea, { target: { value: '⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖' } });

    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    await user.click(convertBtn);

    expect(api.decodeBraille).toHaveBeenCalledWith('⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖');
    await waitFor(() => {
      expect(screen.getByText('Hello 123!')).toBeInTheDocument();
    });
  });

  it('shows loading state while converting and disables buttons', async () => {
    const user = userEvent.setup();
    let resolvePromise: (val: EncodeResponse) => void;
    const pendingPromise = new Promise<EncodeResponse>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(api.encodeText).mockReturnValueOnce(pendingPromise);

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Test');

    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    await user.click(convertBtn);

    // Verify loading state
    expect(screen.getByRole('button', { name: /converting\.\.\./i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();

    // Resolve promise
    resolvePromise!({ input: 'Test', braille: '⠠⠞⠑⠎⠞' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^convert$/i })).not.toBeDisabled();
    });
  });

  it('displays API error when conversion fails and allows dismissing it', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockRejectedValueOnce(
      new Error('Text contains unsupported characters.')
    );

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'hello @ world');

    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    await user.click(convertBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Text contains unsupported characters.')).toBeInTheDocument();
    });

    // Dismiss error
    const dismissBtn = screen.getByRole('button', { name: /dismiss error/i });
    await user.click(dismissBtn);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears input, output, and errors when Clear button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'hello',
      braille: '⠓⠑⠇⠇⠕',
    });

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'hello');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    await waitFor(() => {
      expect(screen.getByText('⠓⠑⠇⠇⠕')).toBeInTheDocument();
    });

    // Click Clear
    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(textarea).toHaveValue('');
    expect(screen.queryByText('⠓⠑⠇⠇⠕')).not.toBeInTheDocument();
    expect(screen.getByText(/conversion output will appear here/i)).toBeInTheDocument();
  });

  it('attempts to copy output to clipboard when Copy is clicked', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    render(<Converter />);

    // Copy button is disabled when output is empty
    expect(screen.getByRole('button', { name: /copy output to clipboard/i })).toBeDisabled();

    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Hello',
      braille: '⠠⠓⠑⠇⠇⠕',
    });

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Hello');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    await waitFor(() => {
      expect(screen.getByText('⠠⠓⠑⠇⠇⠕')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /copy output to clipboard/i });
    expect(copyBtn).not.toBeDisabled();
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('⠠⠓⠑⠇⠇⠕');
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('disables Copy button when there is no output and resets copy state on Clear', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Hello',
      braille: '⠠⠓⠑⠇⠇⠕',
    });

    render(<Converter />);

    const copyBtn = screen.getByRole('button', { name: /copy output to clipboard/i });
    expect(copyBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Hello');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    await waitFor(() => {
      expect(screen.getByText('⠠⠓⠑⠇⠇⠕')).toBeInTheDocument();
    });

    expect(copyBtn).not.toBeDisabled();
    await user.click(copyBtn);
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    // Click Clear
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(copyBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: /copy output to clipboard/i })).toHaveTextContent('Copy');
  });

  it('handles empty input conversion successfully without throwing', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: '',
      braille: '',
    });

    render(<Converter />);

    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    await user.click(convertBtn);

    expect(api.encodeText).toHaveBeenCalledWith('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/conversion output will appear here/i)).toBeInTheDocument();
  });

  it('handles clipboard copy error gracefully', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockRejectedValueOnce(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Test',
      braille: '⠠⠞⠑⠎⠞',
    });

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Test');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    await waitFor(() => {
      expect(screen.getByText('⠠⠞⠑⠎⠞')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /copy output to clipboard/i });
    await user.click(copyBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to copy')).toBeInTheDocument();
    });
  });

  it('switches between input and output panels using mobile tabs and quick buttons', async () => {
    const user = userEvent.setup();
    render(<Converter />);

    const inputTab = screen.getByRole('tab', { name: /^input$/i });
    const outputTab = screen.getByRole('tab', { name: /^output$/i });

    // Initial state: input tab is selected
    expect(inputTab).toHaveAttribute('aria-selected', 'true');
    expect(outputTab).toHaveAttribute('aria-selected', 'false');

    // Switch to output via mobile tab
    await user.click(outputTab);
    expect(outputTab).toHaveAttribute('aria-selected', 'true');
    expect(inputTab).toHaveAttribute('aria-selected', 'false');

    // Switch back to input via quick button in output panel
    const backToInputBtn = screen.getByRole('button', { name: /switch to input box/i });
    await user.click(backToInputBtn);
    expect(inputTab).toHaveAttribute('aria-selected', 'true');

    // Switch to output via quick button in input panel
    const viewOutputBtn = screen.getByRole('button', { name: /switch to output box/i });
    await user.click(viewOutputBtn);
    expect(outputTab).toHaveAttribute('aria-selected', 'true');
  });

  it('automatically switches to output panel when Convert is clicked and resets to input on Clear', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Test',
      braille: '⠠⠞⠑⠎⠞',
    });

    render(<Converter />);

    const inputTab = screen.getByRole('tab', { name: /^input$/i });
    const outputTab = screen.getByRole('tab', { name: /^output$/i });

    expect(inputTab).toHaveAttribute('aria-selected', 'true');

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Test');

    // Click Convert -> should switch to output panel
    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    expect(outputTab).toHaveAttribute('aria-selected', 'true');
    expect(inputTab).toHaveAttribute('aria-selected', 'false');
    await waitFor(() => {
      expect(screen.getByText('⠠⠞⠑⠎⠞')).toBeInTheDocument();
    });

    // Click Clear -> should switch back to input panel
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(inputTab).toHaveAttribute('aria-selected', 'true');
    expect(outputTab).toHaveAttribute('aria-selected', 'false');
  });

  it('swaps input and output data when switching conversion modes so English stays with English and Braille with Braille', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Hello',
      braille: '⠠⠓⠑⠇⠇⠕',
    });

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    await user.type(textarea, 'Hello');
    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    await waitFor(() => {
      expect(screen.getByText('⠠⠓⠑⠇⠇⠕')).toBeInTheDocument();
    });

    // Currently: English text is in input ("Hello"), Braille is in output ("⠠⠓⠑⠇⠇⠕")
    // Switch to Braille -> Text mode:
    const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });
    await user.click(brailleModeBtn);

    // Braille Input should now receive the Braille text
    const brailleInput = screen.getByLabelText(/braille input/i);
    expect(brailleInput).toHaveValue('⠠⠓⠑⠇⠇⠕');

    // Text Output should now receive the English text
    expect(screen.getByText('Hello')).toBeInTheDocument();

    // Switch back to Text -> Braille mode:
    const textModeBtn = screen.getByRole('button', { name: /text → braille/i });
    await user.click(textModeBtn);

    // English Text should now have "Hello"
    const englishInput = screen.getByLabelText(/english text/i);
    expect(englishInput).toHaveValue('Hello');

    // Braille output should now have "⠠⠓⠑⠇⠇⠕"
    expect(screen.getByText('⠠⠓⠑⠇⠇⠕')).toBeInTheDocument();
  });

  it('moves focus to the output area after successful conversion in both modes', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Braille Focus',
      braille: '⠠⠃⠗⠁⠊⠇⠇⠑ ⠠⠋⠕⠉⠥⠎',
    });

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    const outputRegion = screen.getByRole('region', { name: /braille output/i });

    // Output should not have focus initially
    expect(outputRegion).not.toHaveFocus();

    await user.type(textarea, 'Braille Focus');
    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    await user.click(convertBtn);

    // After conversion succeeds, output area must receive focus
    await waitFor(() => {
      expect(outputRegion).toHaveFocus();
    });

    // Switch to Braille -> Text mode and test reverse conversion focus
    vi.mocked(api.decodeBraille).mockResolvedValueOnce({
      braille: '⠠⠃⠗⠁⠊⠇⠇⠑',
      text: 'Braille',
    });

    const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });
    await user.click(brailleModeBtn);

    const brailleTextarea = screen.getByLabelText(/braille input/i);
    fireEvent.change(brailleTextarea, { target: { value: '⠠⠃⠗⠁⠊⠇⠇⠑' } });

    await user.click(screen.getByRole('button', { name: /^convert$/i }));

    const textOutputRegion = screen.getByRole('region', { name: /text output/i });
    await waitFor(() => {
      expect(textOutputRegion).toHaveFocus();
    });
  });

  it('keeps or moves focus to the input textarea when conversion fails with an error', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockRejectedValueOnce(
      new Error('Text contains unsupported characters.')
    );

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    const outputRegion = screen.getByRole('region', { name: /braille output/i });

    await user.type(textarea, 'invalid @ text');
    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    await user.click(convertBtn);

    // On failure: error alert is shown, input textarea gets focus, output does NOT get focus
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(textarea).toHaveFocus();
      expect(outputRegion).not.toHaveFocus();
    });
  });

  it('allows operating interactive elements entirely with keyboard (Tab, Enter, Space)', async () => {
    const user = userEvent.setup();
    vi.mocked(api.encodeText).mockResolvedValueOnce({
      input: 'Key',
      braille: '⠠⠅⠑⠽',
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<Converter />);

    const textarea = screen.getByLabelText(/english text/i);
    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    const copyBtn = screen.getByRole('button', { name: /copy output to clipboard/i });
    const clearBtn = screen.getByRole('button', { name: /clear/i });
    const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });

    // Focus mode toggle button and press Enter to toggle mode
    brailleModeBtn.focus();
    expect(brailleModeBtn).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(brailleModeBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch back to Text -> Braille via Space key
    const textModeBtn = screen.getByRole('button', { name: /text → braille/i });
    textModeBtn.focus();
    await user.keyboard(' ');
    expect(textModeBtn).toHaveAttribute('aria-pressed', 'true');

    // Focus textarea and type
    textarea.focus();
    expect(textarea).toHaveFocus();
    await user.keyboard('Key');
    expect(textarea).toHaveValue('Key');

    // Tab / focus Convert and trigger via Enter
    convertBtn.focus();
    expect(convertBtn).toHaveFocus();
    await user.keyboard('{Enter}');

    // Output receives focus after conversion
    const outputRegion = screen.getByRole('region', { name: /braille output/i });
    await waitFor(() => {
      expect(outputRegion).toHaveFocus();
    });

    // Focus Copy button and trigger via Space key
    copyBtn.focus();
    expect(copyBtn).toHaveFocus();
    await user.keyboard(' ');
    expect(writeTextMock).toHaveBeenCalledWith('⠠⠅⠑⠽');

    // Focus Clear button and trigger via Enter key
    clearBtn.focus();
    expect(clearBtn).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(textarea).toHaveValue('');
  });

  it('ensures all interactive elements have visible focus indicator classes', () => {
    render(<Converter />);

    // Mode toggle buttons
    const textModeBtn = screen.getByRole('button', { name: /text → braille/i });
    expect(textModeBtn.className).toMatch(/focus-visible:outline/);

    // Mobile tabs
    const inputTab = screen.getByRole('tab', { name: /^input$/i });
    const outputTab = screen.getByRole('tab', { name: /^output$/i });
    expect(inputTab.className).toMatch(/focus-visible:outline/);
    expect(outputTab.className).toMatch(/focus-visible:outline/);

    // Textarea and output region
    const textarea = screen.getByLabelText(/english text/i);
    expect(textarea.className).toMatch(/focus:ring/);
    const outputRegion = screen.getByRole('region', { name: /braille output/i });
    expect(outputRegion.className).toMatch(/focus:ring/);

    // Action buttons
    const convertBtn = screen.getByRole('button', { name: /^convert$/i });
    expect(convertBtn.className).toMatch(/focus-visible:outline/);
    const copyBtn = screen.getByRole('button', { name: /copy output to clipboard/i });
    expect(copyBtn.className).toMatch(/focus-visible:outline/);
    const clearBtn = screen.getByRole('button', { name: /clear/i });
    expect(clearBtn.className).toMatch(/focus-visible:outline/);
  });

  describe('V3.2 Screen Reader Accessibility and Status Announcements', () => {
    it('announces "Converting..." in the accessible status live region during conversion (Requirement A)', async () => {
      const user = userEvent.setup();
      let resolvePromise: (val: EncodeResponse) => void;
      const pendingPromise = new Promise<EncodeResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(api.encodeText).mockReturnValueOnce(pendingPromise);

      render(<Converter />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
      expect(statusRegion).toHaveTextContent('');

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Hello');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      // Status region announces "Converting..." while loading
      expect(statusRegion).toHaveTextContent('Converting...');
      expect(convertBtn).toHaveAttribute('aria-busy', 'true');

      // Resolve and verify status updates
      resolvePromise!({ input: 'Hello', braille: '⠠⠓⠑⠇⠇⠕' });
      await waitFor(() => {
        expect(statusRegion).toHaveTextContent('Conversion complete.');
      });
    });

    it('announces "Conversion complete." on success and displays the output correctly (Requirement B)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Test Text',
        braille: '⠠⠞⠑⠎⠞ ⠠⠞⠑⠭⠞',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Test Text');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Conversion complete.');
        expect(screen.getByText('⠠⠞⠑⠎⠞ ⠠⠞⠑⠭⠞')).toBeInTheDocument();
      });
    });

    it('announces error with role="alert" on failure without duplicate status announcement, returning focus to input (Requirement C)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockRejectedValueOnce(
        new Error('Text contains unsupported characters.')
      );

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'unsupported @');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-atomic', 'true');
        expect(alert).toHaveTextContent('Text contains unsupported characters.');
        expect(textarea).toHaveFocus();
        // role="status" is cleared on error so assistive tech receives single announcement via role="alert"
        expect(screen.getByRole('status')).toHaveTextContent('');
      });
    });

    it('exposes meaningful accessible name and region semantics for output in both modes (Requirement D)', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      // In Text -> Braille mode
      const brailleRegion = screen.getByRole('region', { name: 'Braille output' });
      expect(brailleRegion).toBeInTheDocument();
      expect(brailleRegion).toHaveAttribute('aria-label', 'Braille output');
      expect(brailleRegion).not.toHaveAttribute('aria-live'); // Output is not live to prevent spamming

      // Switch to Braille -> Text mode
      const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });
      await user.click(brailleModeBtn);

      const textRegion = screen.getByRole('region', { name: 'Text output' });
      expect(textRegion).toBeInTheDocument();
      expect(textRegion).toHaveAttribute('aria-label', 'Text output');
      expect(textRegion).not.toHaveAttribute('aria-live');
    });

    it('correctly exposes active conversion mode semantics using aria-pressed (Requirement E)', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const modeGroup = screen.getByRole('group', { name: 'Conversion Mode' });
      expect(modeGroup).toBeInTheDocument();

      const textModeBtn = screen.getByRole('button', { name: /text → braille/i });
      const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });

      expect(textModeBtn).toHaveAttribute('aria-pressed', 'true');
      expect(brailleModeBtn).toHaveAttribute('aria-pressed', 'false');

      // Switch mode and verify updated aria-pressed
      await user.click(brailleModeBtn);
      expect(textModeBtn).toHaveAttribute('aria-pressed', 'false');
      expect(brailleModeBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('correctly exposes mobile tab selection and panel controls to screen readers (Requirement F)', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const tablist = screen.getByRole('tablist', { name: 'Panel selection' });
      expect(tablist).toBeInTheDocument();

      const inputTab = screen.getByRole('tab', { name: 'Input' });
      const outputTab = screen.getByRole('tab', { name: 'Output' });

      expect(inputTab).toHaveAttribute('aria-selected', 'true');
      expect(inputTab).toHaveAttribute('aria-controls', 'panel-input');
      expect(outputTab).toHaveAttribute('aria-selected', 'false');
      expect(outputTab).toHaveAttribute('aria-controls', 'panel-output');

      await user.click(outputTab);
      expect(inputTab).toHaveAttribute('aria-selected', 'false');
      expect(outputTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('V3.3 Refined Feedback and Duplicate Announcement Prevention', () => {
    it('enters loading state, disables controls, and prevents duplicate conversion calls when activated repeatedly (Requirement A & 1)', async () => {
      const user = userEvent.setup();
      let resolvePromise: (val: EncodeResponse) => void;
      const pendingPromise = new Promise<EncodeResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(api.encodeText).mockReturnValue(pendingPromise);

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Hello World');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      // Verify loading state
      expect(convertBtn).toHaveTextContent('Converting...');
      expect(convertBtn).toBeDisabled();
      expect(convertBtn).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('Converting...');
      expect(api.encodeText).toHaveBeenCalledTimes(1);

      // Attempt repeated activations while loading
      await user.click(convertBtn);
      fireEvent.click(convertBtn);
      expect(api.encodeText).toHaveBeenCalledTimes(1);

      // Complete conversion
      resolvePromise!({ input: 'Hello World', braille: '⠠⠓⠑⠇⠇⠕ ⠠⠺⠕⠗⠇⠙' });
      await waitFor(() => {
        expect(convertBtn).not.toBeDisabled();
        expect(convertBtn).toHaveTextContent('Convert');
        expect(convertBtn).toHaveAttribute('aria-busy', 'false');
        expect(screen.getByRole('status')).toHaveTextContent('Conversion complete.');
      });
    });

    it('clears loading state and re-enables controls after conversion failure (Requirement A)', async () => {
      const user = userEvent.setup();
      let rejectPromise: (err: Error) => void;
      const pendingPromise = new Promise<EncodeResponse>((_, reject) => {
        rejectPromise = reject;
      });
      vi.mocked(api.encodeText).mockReturnValueOnce(pendingPromise);

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'bad @ text');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      expect(convertBtn).toBeDisabled();
      expect(convertBtn).toHaveAttribute('aria-busy', 'true');

      // Fail conversion
      rejectPromise!(new Error('Text contains unsupported characters.'));
      await waitFor(() => {
        expect(convertBtn).not.toBeDisabled();
        expect(convertBtn).toHaveTextContent('Convert');
        expect(convertBtn).toHaveAttribute('aria-busy', 'false');
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(textarea).toHaveFocus();
      });
    });

    it('announces "Conversion complete." once, updates output, and moves focus to output without live region on output (Requirement B)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Test Text',
        braille: '⠠⠞⠑⠎⠞ ⠠⠞⠑⠭⠞',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Test Text');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      await waitFor(() => {
        const statusRegion = screen.getByRole('status');
        expect(statusRegion).toHaveTextContent('Conversion complete.');
        const outputRegion = screen.getByRole('region', { name: 'Braille output' });
        expect(outputRegion).toHaveFocus();
        expect(outputRegion).not.toHaveAttribute('aria-live');
        expect(screen.getByText('⠠⠞⠑⠎⠞ ⠠⠞⠑⠭⠞')).toBeInTheDocument();
      });
    });

    it('displays error in role="alert", returns focus to input, and safely refocuses input when dismissed via keyboard (Requirement C & 5)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockRejectedValueOnce(
        new Error('Text contains unsupported characters.')
      );

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'invalid @');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(textarea).toHaveFocus();
      });

      // Focus dismiss button with keyboard
      const dismissBtn = screen.getByRole('button', { name: /dismiss error/i });
      dismissBtn.focus();
      expect(dismissBtn).toHaveFocus();

      // Dismiss error with keyboard
      await user.keyboard('{Enter}');

      // Verify error is removed, status is cleared, and focus returns to input textarea
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('');
      expect(textarea).toHaveFocus();
    });

    it('ensures zero competing live announcements across loading, success, and error states (Requirement D & 7)', async () => {
      const user = userEvent.setup();
      let resolvePromise: (val: EncodeResponse) => void;
      const pendingPromise = new Promise<EncodeResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(api.encodeText).mockReturnValueOnce(pendingPromise);

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Check Live Regions');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      // During loading: exactly one status live region has text, no alerts
      const liveStatus = screen.getByRole('status');
      expect(liveStatus).toHaveTextContent('Converting...');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // During success: status announces completion, output region is non-live
      resolvePromise!({ input: 'Check Live Regions', braille: '⠠⠉⠓⠑⠉⠅' });
      await waitFor(() => {
        expect(liveStatus).toHaveTextContent('Conversion complete.');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        const outputRegion = screen.getByRole('region', { name: 'Braille output' });
        expect(outputRegion).not.toHaveAttribute('aria-live');
      });

      // During error: alert is present, role="status" is empty
      vi.mocked(api.encodeText).mockRejectedValueOnce(new Error('Invalid character'));
      await user.click(convertBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid character');
        expect(liveStatus).toHaveTextContent(''); // No duplicate "Conversion failed." announcement
      });
    });

    it('handles empty input conversion cleanly, returning empty output and indicating completion (Requirement 6)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: '',
        braille: '',
      });

      render(<Converter />);

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      await waitFor(() => {
        expect(api.encodeText).toHaveBeenCalledWith('');
        expect(screen.getByRole('status')).toHaveTextContent('Conversion complete.');
        const outputRegion = screen.getByRole('region', { name: 'Braille output' });
        expect(outputRegion).toHaveFocus();
        expect(screen.getByText('Conversion output will appear here...')).toBeInTheDocument();
      });
    });
  });

  describe('V3.4 Braille Readability, Size Controls, and Copy Feedback', () => {
    it('renders size controls with accessible labels and comfortable default Braille formatting', () => {
      render(<Converter />);

      const sizeGroup = screen.getByRole('group', { name: 'Braille font size controls' });
      expect(sizeGroup).toBeInTheDocument();

      const decreaseBtn = screen.getByRole('button', { name: 'Decrease Braille font size' });
      const resetBtn = screen.getByRole('button', { name: 'Reset Braille font size' });
      const increaseBtn = screen.getByRole('button', { name: 'Increase Braille font size' });

      expect(decreaseBtn).toBeInTheDocument();
      expect(resetBtn).toBeInTheDocument();
      expect(increaseBtn).toBeInTheDocument();

      const outputRegion = screen.getByRole('region', { name: 'Braille output' });
      expect(outputRegion).toHaveAttribute('data-braille-size', 'medium');
      expect(outputRegion.className).toContain('leading-loose');
      expect(outputRegion.className).toContain('tracking-widest');
    });

    it('increases Braille font size when Increase button is activated', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const increaseBtn = screen.getByRole('button', { name: 'Increase Braille font size' });
      const outputRegion = screen.getByRole('region', { name: 'Braille output' });

      expect(outputRegion).toHaveAttribute('data-braille-size', 'medium');
      await user.click(increaseBtn);

      expect(outputRegion).toHaveAttribute('data-braille-size', 'large');
      expect(outputRegion.className).toContain('text-2xl');
    });

    it('decreases Braille font size when Decrease button is activated', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const decreaseBtn = screen.getByRole('button', { name: 'Decrease Braille font size' });
      const outputRegion = screen.getByRole('region', { name: 'Braille output' });

      expect(outputRegion).toHaveAttribute('data-braille-size', 'medium');
      await user.click(decreaseBtn);

      expect(outputRegion).toHaveAttribute('data-braille-size', 'small');
      expect(outputRegion.className).toContain('text-lg');
    });

    it('enforces minimum and maximum size boundaries correctly', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const decreaseBtn = screen.getByRole('button', { name: 'Decrease Braille font size' });
      const increaseBtn = screen.getByRole('button', { name: 'Increase Braille font size' });
      const outputRegion = screen.getByRole('region', { name: 'Braille output' });

      // Decrease to minimum ('small')
      await user.click(decreaseBtn);
      expect(outputRegion).toHaveAttribute('data-braille-size', 'small');
      expect(decreaseBtn).toBeDisabled();

      // Attempt to decrease past minimum
      await user.click(decreaseBtn);
      expect(outputRegion).toHaveAttribute('data-braille-size', 'small');

      // Increase to 'medium', then 'large', then 'extra-large' (maximum)
      await user.click(increaseBtn); // to medium
      expect(outputRegion).toHaveAttribute('data-braille-size', 'medium');
      expect(decreaseBtn).not.toBeDisabled();

      await user.click(increaseBtn); // to large
      expect(outputRegion).toHaveAttribute('data-braille-size', 'large');

      await user.click(increaseBtn); // to extra-large
      expect(outputRegion).toHaveAttribute('data-braille-size', 'extra-large');
      expect(increaseBtn).toBeDisabled();

      // Attempt to increase past maximum
      await user.click(increaseBtn);
      expect(outputRegion).toHaveAttribute('data-braille-size', 'extra-large');
    });

    it('resets Braille font size to default (medium) when Reset button is activated', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const increaseBtn = screen.getByRole('button', { name: 'Increase Braille font size' });
      const resetBtn = screen.getByRole('button', { name: 'Reset Braille font size' });
      const outputRegion = screen.getByRole('region', { name: 'Braille output' });

      // Change size to extra-large
      await user.click(increaseBtn);
      await user.click(increaseBtn);
      expect(outputRegion).toHaveAttribute('data-braille-size', 'extra-large');

      // Reset
      await user.click(resetBtn);
      expect(outputRegion).toHaveAttribute('data-braille-size', 'medium');
    });

    it('supports operating size controls via keyboard navigation and focus indicators', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const decreaseBtn = screen.getByRole('button', { name: 'Decrease Braille font size' });
      const resetBtn = screen.getByRole('button', { name: 'Reset Braille font size' });
      const increaseBtn = screen.getByRole('button', { name: 'Increase Braille font size' });
      const outputRegion = screen.getByRole('region', { name: 'Braille output' });

      // Check visible focus classes
      expect(decreaseBtn.className).toContain('focus-visible:outline');
      expect(resetBtn.className).toContain('focus-visible:outline');
      expect(increaseBtn.className).toContain('focus-visible:outline');

      // Keyboard navigation: focus increase and press Enter
      increaseBtn.focus();
      expect(increaseBtn).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(outputRegion).toHaveAttribute('data-braille-size', 'large');

      // Keyboard navigation: focus reset and press Space
      resetBtn.focus();
      expect(resetBtn).toHaveFocus();
      await user.keyboard(' ');
      expect(outputRegion).toHaveAttribute('data-braille-size', 'medium');
    });

    it('displays Braille size controls only for Braille output, hiding them in Braille → Text mode', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      expect(screen.getByRole('group', { name: 'Braille font size controls' })).toBeInTheDocument();

      // Switch to Braille -> Text mode
      const brailleModeBtn = screen.getByRole('button', { name: /braille → text/i });
      await user.click(brailleModeBtn);

      // Output is text, so Braille size controls are hidden
      expect(screen.queryByRole('group', { name: 'Braille font size controls' })).not.toBeInTheDocument();

      // Switch back to Text -> Braille mode
      const textModeBtn = screen.getByRole('button', { name: /text → braille/i });
      await user.click(textModeBtn);

      expect(screen.getByRole('group', { name: 'Braille font size controls' })).toBeInTheDocument();
    });

    it('announces "Copied to clipboard." through polite live region and displays visual feedback on copy success', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Accessibility',
        braille: '⠠⠁⠉⠉⠑⠎⠎⠊⠃⠊⠇⠊⠞⠽',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Accessibility');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠁⠉⠉⠑⠎⠎⠊⠃⠊⠇⠊⠞⠽')).toBeInTheDocument();
      });

      const copyBtn = screen.getByRole('button', { name: /copy output to clipboard/i });
      await user.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith('⠠⠁⠉⠉⠑⠎⠎⠊⠃⠊⠇⠊⠞⠽');

      // Visual feedback
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Accessible status announcement
      expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard.');
    });

    it('announces "Failed to copy to clipboard." through live status region and displays visual feedback on copy failure', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockRejectedValueOnce(new Error('Permission denied'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Fail Test',
        braille: '⠠⠋⠁⠊⠇',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Fail Test');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠋⠁⠊⠇')).toBeInTheDocument();
      });

      const copyBtn = screen.getByRole('button', { name: /copy output to clipboard/i });
      await user.click(copyBtn);

      // Visual feedback
      await waitFor(() => {
        expect(screen.getByText('Failed to copy')).toBeInTheDocument();
      });

      // Accessible status announcement
      expect(screen.getByRole('status')).toHaveTextContent('Failed to copy to clipboard.');
    });
  });

  describe('V4.1 Text File Upload Support', () => {
    it('uploads a valid .txt file, populates the input textarea, shows filename, and announces status', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const fileContent = 'Hello world from uploaded file';
      const file = new File([fileContent], 'sample.txt', { type: 'text/plain' });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.txt');

      await user.upload(fileInput, file);

      // Verify text in textarea
      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue(fileContent);

      // Verify filename badge
      expect(screen.getByTestId('uploaded-file-name')).toHaveTextContent('sample.txt');

      // Verify status announcement
      expect(screen.getByRole('status')).toHaveTextContent('File "sample.txt" loaded successfully.');
    });

    it('converts uploaded .txt file content seamlessly with existing Convert button and focus management', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Uploaded text',
        braille: '⠠⠥⠏⠇⠕⠁⠙⠑⠙ ⠞⠑⠭⠞',
      });

      render(<Converter />);

      const file = new File(['Uploaded text'], 'test-doc.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, file);

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      await waitFor(() => {
        expect(api.encodeText).toHaveBeenCalledWith('Uploaded text');
        expect(screen.getByRole('status')).toHaveTextContent('Conversion complete.');
        expect(screen.getByText('⠠⠥⠏⠇⠕⠁⠙⠑⠙ ⠞⠑⠭⠞')).toBeInTheDocument();
        const outputRegion = screen.getByRole('region', { name: 'Braille output' });
        expect(outputRegion).toHaveFocus();
      });
    });

    it('rejects files that do not have .txt extension and displays accessible error alert', async () => {
      render(<Converter />);

      const invalidFile = new File(['%PDF-1.4 sample'], 'document.pdf', {
        type: 'application/pdf',
      });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // Error alert displayed
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Invalid file type. Please upload a .txt file.');

      // Filename badge not displayed
      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();

      // Textarea retains empty / previous value
      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue('');
    });

    it('rejects files exceeding the 100 KB size limit and displays accessible error alert', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      // Create content larger than 100 KB (100 * 1024 bytes)
      const oversizedContent = 'a'.repeat(101 * 1024);
      const oversizedFile = new File([oversizedContent], 'huge.txt', { type: 'text/plain' });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, oversizedFile);

      // Error alert displayed
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'File size exceeds the 100 KB limit. Please choose a smaller .txt file.'
      );

      // Filename badge not displayed
      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/english text/i)).toHaveValue('');
    });

    it('removes uploaded file badge without unexpectedly wiping manual edits in the textarea', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const file = new File(['Initial file content'], 'notes.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, file);

      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue('Initial file content');
      expect(screen.getByTestId('uploaded-file-name')).toHaveTextContent('notes.txt');

      // User adds extra manual notes
      await user.type(textarea, ' - updated notes');
      expect(textarea).toHaveValue('Initial file content - updated notes');

      // Click remove file button
      const removeFileBtn = screen.getByRole('button', { name: /remove uploaded file/i });
      await user.click(removeFileBtn);

      // Filename badge is removed
      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();

      // Textarea content is preserved!
      expect(textarea).toHaveValue('Initial file content - updated notes');
      expect(screen.getByRole('status')).toHaveTextContent('File removed.');
    });

    it('resets uploaded file badge when main Clear button is activated', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const file = new File(['Text to clear'], 'to-clear.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, file);

      expect(screen.getByTestId('uploaded-file-name')).toHaveTextContent('to-clear.txt');
      expect(screen.getByLabelText(/english text/i)).toHaveValue('Text to clear');

      const clearBtn = screen.getByRole('button', { name: /clear/i });
      await user.click(clearBtn);

      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/english text/i)).toHaveValue('');
    });

    it('ensures upload control and remove button are keyboard accessible with visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      expect(fileInput.className).toContain('focus-visible:outline');

      // Upload file
      const file = new File(['Keyboard test'], 'keys.txt', { type: 'text/plain' });
      await user.upload(fileInput, file);

      const removeBtn = screen.getByRole('button', { name: /remove uploaded file/i });
      expect(removeBtn.className).toContain('focus-visible:outline');

      removeBtn.focus();
      expect(removeBtn).toHaveFocus();

      // Activate with keyboard
      await user.keyboard('{Enter}');
      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
    });

    it('preserves existing manual typing and conversion behavior without file upload', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Manual typing',
        braille: '⠠⠍⠁⠝⠥⠁⠇',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Manual typing');

      const convertBtn = screen.getByRole('button', { name: /^convert$/i });
      await user.click(convertBtn);

      await waitFor(() => {
        expect(api.encodeText).toHaveBeenCalledWith('Manual typing');
        expect(screen.getByText('⠠⠍⠁⠝⠥⠁⠇')).toBeInTheDocument();
      });
    });
  });

  describe('V4.2 File Content Validation & Text Normalization', () => {
    it('normalizes Windows CRLF (\\r\\n) line endings to consistent Unix LF (\\n)', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const windowsContent = 'Hello\r\nBraille\r\nWorld';
      const file = new File([windowsContent], 'windows.txt', { type: 'text/plain' });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, file);

      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue('Hello\nBraille\nWorld');

      // 3 lines · 19 characters (instead of 21 with \r\n)
      expect(screen.getByText('3 lines · 19 characters')).toBeInTheDocument();
      expect(screen.getByTestId('uploaded-file-name')).toHaveTextContent('windows.txt');
    });

    it('handles standard Unix LF (\\n) line endings cleanly without alteration', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const unixContent = 'Line 1\nLine 2';
      const file = new File([unixContent], 'unix.txt', { type: 'text/plain' });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, file);

      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(screen.getByText('2 lines · 13 characters')).toBeInTheDocument();
    });

    it('handles legacy Mac CR (\\r) line endings by normalizing to LF (\\n)', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const macContent = 'Old\rMac\rLines';
      const file = new File([macContent], 'mac.txt', { type: 'text/plain' });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, file);

      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue('Old\nMac\nLines');
      expect(screen.getByText('3 lines · 13 characters')).toBeInTheDocument();
    });

    it('rejects an empty file gracefully with an accessible error alert and clears the file badge', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, emptyFile);

      // Error alert displayed
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('The selected file is empty and contains no text.');

      // File badge is cleared
      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();

      // Textarea remains empty and receives focus
      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue('');
      expect(textarea).toHaveFocus();
    });

    it('rejects a file containing only whitespace gracefully with an accessible error alert and clears the file badge', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const whitespaceFile = new File(['   \n\t  \r\n   '], 'whitespace.txt', {
        type: 'text/plain',
      });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, whitespaceFile);

      // Error alert displayed
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'The selected file contains only whitespace and has no usable text.'
      );

      // File badge is cleared
      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();

      // Textarea remains empty and receives focus
      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue('');
      expect(textarea).toHaveFocus();
    });

    it('preserves meaningful spaces, indentation, and blank lines inside valid multiline documents', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const multilineDocument = 'Paragraph 1\n\n  Indented paragraph 2\n\nFinal line';
      const file = new File([multilineDocument], 'document.txt', { type: 'text/plain' });

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      await user.upload(fileInput, file);

      const textarea = screen.getByLabelText(/english text/i);
      expect(textarea).toHaveValue(multilineDocument);
      expect(screen.getByTestId('uploaded-file-name')).toHaveTextContent('document.txt');
      expect(screen.getByText('5 lines · 47 characters')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('updates character and line count dynamically when manually typing multiline text', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Line one{enter}Line two');

      expect(textarea).toHaveValue('Line one\nLine two');
      expect(screen.getByText('2 lines · 17 characters')).toBeInTheDocument();
    });
  });

  describe('V4.3 Output Download Functionality', () => {
    it('disables the download button when output is empty and prevents downloads', async () => {
      const user = userEvent.setup();
      const createObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;

      render(<Converter />);

      const downloadBtn = screen.getByRole('button', { name: /download/i });
      expect(downloadBtn).toBeInTheDocument();
      expect(downloadBtn).toBeDisabled();
      expect(screen.queryByTestId('output-filename')).not.toBeInTheDocument();

      // Attempting to click does nothing
      await user.click(downloadBtn);
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('enables the download button and displays filename badge when output exists', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Hello',
        braille: '⠠⠓⠑⠇⠇⠕',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Hello');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠓⠑⠇⠇⠕')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /download/i });
      expect(downloadBtn).toBeVisible();
      expect(downloadBtn).not.toBeDisabled();
      expect(screen.getByTestId('output-filename')).toHaveTextContent('braille-output.txt');
    });

    it('downloads converted Braille output with sensible filename "braille-output.txt" and correct content', async () => {
      const user = userEvent.setup();
      const mockUrl = 'blob:http://localhost/test-braille-blob';
      const createObjectURLMock = vi.fn().mockReturnValue(mockUrl);
      const revokeObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickMock);
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Hello 123!',
        braille: '⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Hello 123!');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /download braille output/i });
      await user.click(downloadBtn);

      // Verify Blob and URL creation
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe('text/plain;charset=utf-8');
      expect(await blobArg.text()).toBe('⠠⠓⠑⠇⠇⠕ ⠼⠁⠃⠉⠖');

      // Verify anchor configuration
      const anchor = appendSpy.mock.calls.find(
        (call) => call[0] instanceof HTMLAnchorElement
      )?.[0] as HTMLAnchorElement;
      expect(anchor).toBeDefined();
      expect(anchor.download).toBe('braille-output.txt');
      expect(anchor.href).toBe(mockUrl);

      // Verify click, cleanup, and URL revocation
      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith(anchor);
      expect(revokeObjectURLMock).toHaveBeenCalledWith(mockUrl);
    });

    it('downloads converted English text output with sensible filename "text-output.txt" and correct content', async () => {
      const user = userEvent.setup();
      const mockUrl = 'blob:http://localhost/test-text-blob';
      const createObjectURLMock = vi.fn().mockReturnValue(mockUrl);
      const revokeObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickMock);
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      vi.mocked(api.decodeBraille).mockResolvedValueOnce({
        braille: '⠠⠓⠑⠇⠇⠕',
        text: 'Hello',
      });

      render(<Converter />);

      // Switch to Braille -> Text mode
      await user.click(screen.getByRole('button', { name: /braille → text/i }));

      const textarea = screen.getByLabelText(/braille input/i);
      fireEvent.change(textarea, { target: { value: '⠠⠓⠑⠇⠇⠕' } });
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /download text output/i });
      expect(screen.getByTestId('output-filename')).toHaveTextContent('text-output.txt');
      await user.click(downloadBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe('text/plain;charset=utf-8');
      expect(await blobArg.text()).toBe('Hello');

      const anchor = appendSpy.mock.calls.find(
        (call) => call[0] instanceof HTMLAnchorElement
      )?.[0] as HTMLAnchorElement;
      expect(anchor).toBeDefined();
      expect(anchor.download).toBe('text-output.txt');
      expect(anchor.href).toBe(mockUrl);

      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith(anchor);
      expect(revokeObjectURLMock).toHaveBeenCalledWith(mockUrl);
    });

    it('provides clear visual feedback ("Downloaded!") and announces "Download started." politely with zero competing alerts', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Hello',
        braille: '⠠⠓⠑⠇⠇⠕',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Hello');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠓⠑⠇⠇⠕')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /download braille output/i });
      expect(downloadBtn).toHaveTextContent('Download');

      await user.click(downloadBtn);

      // Visual feedback changes
      expect(downloadBtn).toHaveTextContent('Downloaded!');
      expect(downloadBtn.className).toContain('text-emerald-700');

      // Status announced politely without competing alerts
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveTextContent('Download started.');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('displays accessible error alert and clears polite status when download operation fails', async () => {
      const user = userEvent.setup();
      window.URL.createObjectURL = vi.fn().mockImplementation(() => {
        throw new Error('Browser out of memory or Blob creation failed.');
      });

      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Hello',
        braille: '⠠⠓⠑⠇⠇⠕',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Hello');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠓⠑⠇⠇⠕')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /download braille output/i });
      await user.click(downloadBtn);

      // Accessible error banner displayed
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Browser out of memory or Blob creation failed.');

      // Polite status cleared to prevent duplicate / competing announcements
      expect(screen.getByRole('status')).toHaveTextContent('');

      // Button is not stuck in downloaded state
      expect(downloadBtn).toHaveTextContent('Download');
    });

    it('supports keyboard navigation, focus indicators, and activation via Enter key', async () => {
      const user = userEvent.setup();
      const mockUrl = 'blob:http://localhost/test-kbd-blob';
      window.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
      window.URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Keyboard test',
        braille: '⠠⠅⠑⠽⠃⠕⠁⠗⠙',
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Keyboard test');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠅⠑⠽⠃⠕⠁⠗⠙')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /download braille output/i });
      downloadBtn.focus();
      expect(downloadBtn).toHaveFocus();
      expect(downloadBtn.className).toContain('focus-visible:outline-blue-600');

      // Trigger via Enter key
      await user.keyboard('{Enter}');

      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('status')).toHaveTextContent('Download started.');
    });

    it('downloads exact multiline content preserving blank lines, indentation, and special characters', async () => {
      const user = userEvent.setup();
      const mockUrl = 'blob:http://localhost/multiline-blob';
      const createObjectURLMock = vi.fn().mockReturnValue(mockUrl);
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const multilineBraille = '⠠⠇⠊⠝⠑ ⠼⠁\n\n  ⠠⠊⠝⠙⠑⠝⠞⠑⠙ ⠇⠊⠝⠑ ⠼⠃';
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Line 1\n\n  Indented line 2',
        braille: multilineBraille,
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      fireEvent.change(textarea, { target: { value: 'Line 1\n\n  Indented line 2' } });
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Braille output' })).toHaveTextContent(
          '⠠⠇⠊⠝⠑ ⠼⠁'
        );
      });

      const downloadBtn = screen.getByRole('button', { name: /download braille output/i });
      await user.click(downloadBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(await blobArg.text()).toBe(multilineBraille);
    });

    it('preserves existing copy to clipboard and clear button functionality alongside download', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Keep existing',
        braille: '⠠⠅⠑⠑⠏',
      });

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Keep existing');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠅⠑⠑⠏')).toBeInTheDocument();
      });

      // Copy works
      const copyBtn = screen.getByRole('button', { name: /copy/i });
      await user.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith('⠠⠅⠑⠑⠏');
      expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard.');

      // Clear works and disables both copy and download
      const clearBtn = screen.getByRole('button', { name: /clear/i });
      await user.click(clearBtn);

      expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
      expect(textarea).toHaveValue('');
    });

    it('disables download button during conversion loading state', async () => {
      const user = userEvent.setup();
      let resolvePromise: (val: EncodeResponse) => void;
      const pendingPromise = new Promise<EncodeResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(api.encodeText).mockReturnValueOnce(pendingPromise);

      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Testing Loading');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      // While converting
      const downloadBtn = screen.getByRole('button', { name: /download/i });
      expect(downloadBtn).toBeDisabled();

      // Complete conversion
      resolvePromise!({ input: 'Testing Loading', braille: '⠠⠞⠑⠎⠞' });
      await waitFor(() => {
        expect(downloadBtn).not.toBeDisabled();
      });
    });
  });

  describe('V4.4 Accessible Drag-and-Drop File Upload', () => {
    it('activates visual drag-over state on dragenter and removes it on dragleave', () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      expect(dropzone).toHaveAttribute('data-dragging', 'false');
      expect(dropzone.className).not.toContain('border-dashed');

      // Drag enter activates visual cues (non-color: dashed border, icon, text prompt)
      fireEvent.dragEnter(dropzone, {
        dataTransfer: { items: [{ kind: 'file', type: 'text/plain' }] },
      });
      expect(dropzone).toHaveAttribute('data-dragging', 'true');
      expect(dropzone.className).toContain('border-dashed');
      expect(screen.getByText(/drop \.txt file to upload/i)).toBeInTheDocument();

      // Drag leave resets to default state smoothly
      fireEvent.dragLeave(dropzone);
      expect(dropzone).toHaveAttribute('data-dragging', 'false');
      expect(dropzone.className).not.toContain('border-dashed');
      expect(screen.queryByText(/drop \.txt file to upload/i)).not.toBeInTheDocument();
    });

    it('loads a valid dropped .txt file and updates input, filename badge, and live announcement', async () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const file = new File(['Hello from dropped file!'], 'dropped.txt', {
        type: 'text/plain',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/english text/i)).toHaveValue(
          'Hello from dropped file!'
        );
      });

      expect(screen.getByTestId('uploaded-file-name')).toHaveTextContent('dropped.txt');
      expect(screen.getByRole('status')).toHaveTextContent(
        'File "dropped.txt" loaded successfully.'
      );
      expect(dropzone).toHaveAttribute('data-dragging', 'false');
    });

    it('normalizes CRLF line endings when dropping a .txt file', async () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const file = new File(['Line 1\r\nLine 2\r\nLine 3'], 'multiline-drop.txt', {
        type: 'text/plain',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/english text/i)).toHaveValue(
          'Line 1\nLine 2\nLine 3'
        );
      });

      expect(screen.getByText('3 lines · 20 characters')).toBeInTheDocument();
    });

    it('rejects an invalid file type (.pdf, .png) dropped on the dropzone with an alert', async () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const pdfFile = new File(['%PDF-1.4 dummy content'], 'document.pdf', {
        type: 'application/pdf',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [pdfFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Invalid file type. Please upload a .txt file.'
        );
      });

      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
      expect(dropzone).toHaveAttribute('data-dragging', 'false');
    });

    it('rejects a dropped file exceeding the 100 KB limit with an alert', async () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const largeContent = 'a'.repeat(100 * 1024 + 1);
      const largeFile = new File([largeContent], 'too-large.txt', {
        type: 'text/plain',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [largeFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'File size exceeds the 100 KB limit. Please choose a smaller .txt file.'
        );
      });

      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
    });

    it('rejects a dropped empty (0 bytes) file with an alert', async () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [emptyFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'The selected file is empty and contains no text.'
        );
      });

      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
    });

    it('rejects a dropped whitespace-only file with an alert', async () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const whitespaceFile = new File(['   \n  \t  \n  '], 'spaces.txt', {
        type: 'text/plain',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [whitespaceFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'The selected file contains only whitespace and has no usable text.'
        );
      });

      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
    });

    it('rejects dropping multiple files with a clear error alert', async () => {
      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const file1 = new File(['Content 1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['Content 2'], 'file2.txt', { type: 'text/plain' });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file1, file2],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Please drop only one file at a time.'
        );
      });

      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();
    });

    it('preserves native file input functionality alongside drag-and-drop', async () => {
      const user = userEvent.setup();
      render(<Converter />);

      const fileInput = screen.getByLabelText(/upload \.txt file/i);
      expect(fileInput).toBeInTheDocument();

      const file = new File(['Uploaded via native picker'], 'native.txt', {
        type: 'text/plain',
      });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByLabelText(/english text/i)).toHaveValue(
          'Uploaded via native picker'
        );
      });
      expect(screen.getByTestId('uploaded-file-name')).toHaveTextContent('native.txt');
    });

    it('allows full conversion and download workflow after dropping a .txt file', async () => {
      const user = userEvent.setup();
      vi.mocked(api.encodeText).mockResolvedValueOnce({
        input: 'Dropped text to convert',
        braille: '⠠⠙⠗⠕⠏⠏⠑⠙',
      });

      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-uuid');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      render(<Converter />);

      const dropzone = screen.getByTestId('file-dropzone');
      const file = new File(['Dropped text to convert'], 'convert-me.txt', {
        type: 'text/plain',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/english text/i)).toHaveValue(
          'Dropped text to convert'
        );
      });

      // Convert
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      await waitFor(() => {
        expect(screen.getByText('⠠⠙⠗⠕⠏⠏⠑⠙')).toBeInTheDocument();
      });

      // Download
      const downloadBtn = screen.getByRole('button', {
        name: /download braille output/i,
      });
      await user.click(downloadBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    });

    it('does not accept drop events when converter is disabled/loading', async () => {
      let resolvePromise: (val: EncodeResponse) => void;
      const pendingPromise = new Promise<EncodeResponse>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(api.encodeText).mockReturnValueOnce(pendingPromise);

      const user = userEvent.setup();
      render(<Converter />);

      const textarea = screen.getByLabelText(/english text/i);
      await user.type(textarea, 'Working...');
      await user.click(screen.getByRole('button', { name: /^convert$/i }));

      const dropzone = screen.getByTestId('file-dropzone');
      const file = new File(['Ignored file'], 'ignored.txt', { type: 'text/plain' });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      // Still the original value, not overwritten
      expect(textarea).toHaveValue('Working...');
      expect(screen.queryByTestId('uploaded-file-name')).not.toBeInTheDocument();

      resolvePromise!({ input: 'Working...', braille: '⠠⠺' });
      await waitFor(() => {
        expect(screen.getByText('⠠⠺')).toBeInTheDocument();
      });
    });
  });
});
