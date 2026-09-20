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

    it('announces "Conversion failed." and displays error with role="alert" on failure, returning focus to input (Requirement C)', async () => {
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
        expect(screen.getByRole('status')).toHaveTextContent('Conversion failed.');
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-atomic', 'true');
        expect(alert).toHaveTextContent('Text contains unsupported characters.');
        expect(textarea).toHaveFocus();
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
});
