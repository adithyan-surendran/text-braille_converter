import { useRef, useState } from 'react';
import { decodeBraille, encodeFile, encodeText, generatePdf } from '../services/api.ts';
import type { ConversionHistoryItem, ConversionMode, GeneratePdfRequest } from '../types/api.ts';
import { downloadBlobFile } from '../utils/download.ts';
import { generateHistoryId } from '../utils/text.ts';
import ConversionHistory from './ConversionHistory.tsx';
import InputPanel from './InputPanel.tsx';
import ModeToggle from './ModeToggle.tsx';
import OutputPanel from './OutputPanel.tsx';

export default function Converter() {
  const [mode, setMode] = useState<ConversionMode>('text-to-braille');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleConvert = async () => {
    if (isLoading) return;

    setError(null);
    setCopied(false);
    setCopyError(null);
    setMobileTab('output');
    setStatusMessage('Converting...');
    setIsLoading(true);

    let isSuccess = false;
    let convertedOutput = '';
    try {
      if (mode === 'text-to-braille') {
        const result = await encodeText(input);
        setOutput(result.braille);
        convertedOutput = result.braille;
      } else {
        const result = await decodeBraille(input);
        setOutput(result.text);
        convertedOutput = result.text;
      }
      isSuccess = true;
      setStatusMessage('Conversion complete.');
      setHistory((prev) => [
        {
          id: generateHistoryId(),
          mode,
          inputText: input,
          outputText: convertedOutput,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 5));
    } catch (err) {
      setMobileTab('input');
      setStatusMessage('');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }

    if (isSuccess) {
      outputRef.current?.focus();
    } else {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleDismissError = () => {
    setError(null);
    setStatusMessage('');
    inputRef.current?.focus();
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setCopyError(null);
      setStatusMessage('Copied to clipboard.');
      setTimeout(() => {
        setCopied(false);
        setStatusMessage('');
      }, 2000);
    } catch {
      setCopyError('Failed to copy');
      setStatusMessage('Failed to copy to clipboard.');
      setTimeout(() => {
        setCopyError(null);
        setStatusMessage('');
      }, 2500);
    }
  };

  const handleModeChange = (newMode: ConversionMode) => {
    if (newMode === mode) return;

    setMode(newMode);
    // Switch data between panels so English stays with English and Braille with Braille
    setInput(output);
    setOutput(input);
    setError(null);
    setCopied(false);
    setCopyError(null);
    setUploadedFileName(null);
    setStatusMessage('');
    setMobileTab('input');
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
    setCopied(false);
    setCopyError(null);
    setUploadedFileName(null);
    setStatusMessage('');
    setMobileTab('input');
  };

  const handleFileUploadSuccess = (fileName: string, content: string) => {
    setInput(content);
    setUploadedFileName(fileName);
    setError(null);
    setStatusMessage(`File "${fileName}" loaded successfully.`);
  };

  const handleFileUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setStatusMessage('');
    setUploadedFileName(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handlePdfUpload = async (file: File) => {
    if (isLoading) return;

    setError(null);
    setCopied(false);
    setCopyError(null);
    setIsLoading(true);
    setStatusMessage('Extracting text from PDF and converting...');

    try {
      const result = await encodeFile(file);
      setMode('text-to-braille');
      setInput(result.input);
      setOutput(result.braille);
      setUploadedFileName(file.name);
      setMobileTab('output');
      setStatusMessage(`File "${file.name}" extracted and converted successfully.`);
      setHistory((prev) => [
        {
          id: generateHistoryId(),
          mode: 'text-to-braille' as const,
          inputText: result.input,
          outputText: result.braille,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 5));
      outputRef.current?.focus();
    } catch (err) {
      setUploadedFileName(null);
      setStatusMessage('');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to extract text from PDF. Please try again.');
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileRemove = () => {
    setUploadedFileName(null);
    setStatusMessage('File removed.');
  };

  const handleDownloadSuccess = () => {
    setError(null);
    setStatusMessage('Download started.');
    setTimeout(() => {
      setStatusMessage('');
    }, 2000);
  };

  const handleDownloadError = (errorMessage: string) => {
    setError(errorMessage);
    setStatusMessage('');
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf || isLoading || !output) return;

    setError(null);
    setIsGeneratingPdf(true);
    setStatusMessage('Generating PDF...');

    try {
      const payload: GeneratePdfRequest =
        mode === 'text-to-braille'
          ? { input, braille: output }
          : { input: output, braille: input };

      const blob = await generatePdf(payload);
      downloadBlobFile(blob, 'braille-conversion.pdf');
      setStatusMessage('PDF downloaded successfully.');
      setTimeout(() => {
        setStatusMessage('');
      }, 2500);
    } catch (err) {
      setStatusMessage('');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate PDF. Please try again.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRestore = (item: ConversionHistoryItem) => {
    setMode(item.mode);
    setInput(item.inputText);
    setOutput(item.outputText);
    setError(null);
    setCopied(false);
    setCopyError(null);
    setUploadedFileName(null);
    setMobileTab('input');
    const modeLabel =
      item.mode === 'text-to-braille' ? 'Text to Braille' : 'Braille to Text';
    setStatusMessage(`Restored ${modeLabel} conversion.`);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setStatusMessage('Conversion history cleared.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Screen Reader Status Announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* Mode Toggle Controls */}
      <div className="flex justify-center">
        <ModeToggle
          mode={mode}
          onModeChange={handleModeChange}
          disabled={isLoading || isGeneratingPdf}
        />
      </div>

      {/* Error Alert Display */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="flex items-start justify-between gap-3 p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-rose-600 font-bold text-base shrink-0">
              !
            </span>
            <span className="leading-snug">{error}</span>
          </div>
          <button
            type="button"
            onClick={handleDismissError}
            aria-label="Dismiss error"
            className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 rounded cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 focus-visible:ring-2 focus-visible:ring-rose-400/30"
          >
            ×
          </button>
        </div>
      )}

      {/* Mobile View Switcher (visible only on screens < md) */}
      <div className="flex md:hidden justify-center">
        <div
          role="tablist"
          aria-label="Panel selection"
          className="inline-flex w-full max-w-xs p-1 bg-slate-200/90 rounded-xl shadow-inner border border-slate-300/70"
        >
          <button
            id="mobile-tab-input"
            type="button"
            role="tab"
            aria-selected={mobileTab === 'input'}
            aria-controls="panel-input"
            onClick={() => setMobileTab('input')}
            className={`flex-1 text-center py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 ${
              mobileTab === 'input'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Input
          </button>
          <button
            id="mobile-tab-output"
            type="button"
            role="tab"
            aria-selected={mobileTab === 'output'}
            aria-controls="panel-output"
            onClick={() => setMobileTab('output')}
            className={`flex-1 text-center py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 ${
              mobileTab === 'output'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Output
          </button>
        </div>
      </div>

      {/* Dual Panel Grid (Input & Output) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <div
          id="panel-input"
          className={`h-full flex flex-col ${mobileTab === 'output' ? 'hidden md:flex' : 'flex'}`}
        >
          <InputPanel
            inputRef={inputRef}
            mode={mode}
            value={input}
            onChange={(newVal) => {
              setInput(newVal);
              if (error) {
                setError(null);
                setStatusMessage('');
              }
            }}
            disabled={isLoading || isGeneratingPdf}
            onSwitchToOutput={() => setMobileTab('output')}
            uploadedFileName={uploadedFileName}
            onFileUpload={handleFileUploadSuccess}
            onPdfUpload={handlePdfUpload}
            onFileRemove={handleFileRemove}
            onError={handleFileUploadError}
          />
        </div>

        <div
          id="panel-output"
          className={`h-full flex flex-col ${mobileTab === 'input' ? 'hidden md:flex' : 'flex'}`}
        >
          <OutputPanel
            outputRef={outputRef}
            mode={mode}
            value={output}
            disabled={isLoading || isGeneratingPdf}
            onSwitchToInput={() => setMobileTab('input')}
            onDownloadSuccess={handleDownloadSuccess}
            onError={handleDownloadError}
            onDownloadPdf={handleDownloadPdf}
            isGeneratingPdf={isGeneratingPdf}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2 w-full max-w-md sm:max-w-none mx-auto">
        <button
          type="button"
          onClick={handleConvert}
          disabled={isLoading || isGeneratingPdf}
          aria-busy={isLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-400/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer min-h-[44px]"
        >
          {isLoading ? 'Converting...' : 'Convert'}
        </button>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!output || isLoading || isGeneratingPdf}
            aria-label="Copy output to clipboard"
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium text-base border shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 transition-all cursor-pointer min-h-[44px] ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 focus-visible:outline-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-400/30'
                : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 border-slate-300 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {copied ? 'Copied!' : copyError ? copyError : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading || isGeneratingPdf}
            aria-label="Clear input and output"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-medium text-base border border-slate-300 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer min-h-[44px]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Conversion History */}
      <ConversionHistory
        history={history}
        onRestore={handleRestore}
        onClearHistory={handleClearHistory}
        disabled={isLoading || isGeneratingPdf}
      />
    </div>
  );
}

