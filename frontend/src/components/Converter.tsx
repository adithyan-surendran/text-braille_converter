import { useRef, useState } from 'react';
import { decodeBraille, encodeText } from '../services/api.ts';
import type { ConversionMode } from '../types/api.ts';
import InputPanel from './InputPanel.tsx';
import ModeToggle from './ModeToggle.tsx';
import OutputPanel from './OutputPanel.tsx';

export default function Converter() {
  const [mode, setMode] = useState<ConversionMode>('text-to-braille');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleConvert = async () => {
    setError(null);
    setCopied(false);
    setCopyError(null);
    setMobileTab('output');
    setIsLoading(true);

    let isSuccess = false;
    try {
      if (mode === 'text-to-braille') {
        const result = await encodeText(input);
        setOutput(result.braille);
      } else {
        const result = await decodeBraille(input);
        setOutput(result.text);
      }
      isSuccess = true;
    } catch (err) {
      setMobileTab('input');
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

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Failed to copy');
      setTimeout(() => setCopyError(null), 2500);
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
    setMobileTab('input');
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
    setCopied(false);
    setCopyError(null);
    setMobileTab('input');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Mode Toggle Controls */}
      <div className="flex justify-center">
        <ModeToggle
          mode={mode}
          onModeChange={handleModeChange}
          disabled={isLoading}
        />
      </div>

      {/* Error Alert Display */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
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
            onClick={() => setError(null)}
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
            type="button"
            role="tab"
            aria-selected={mobileTab === 'input'}
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
            type="button"
            role="tab"
            aria-selected={mobileTab === 'output'}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className={mobileTab === 'output' ? 'hidden md:block' : 'block'}>
          <InputPanel
            inputRef={inputRef}
            mode={mode}
            value={input}
            onChange={(newVal) => {
              setInput(newVal);
              if (error) setError(null);
            }}
            disabled={isLoading}
            onSwitchToOutput={() => setMobileTab('output')}
          />
        </div>

        <div className={mobileTab === 'input' ? 'hidden md:block' : 'block'}>
          <OutputPanel
            outputRef={outputRef}
            mode={mode}
            value={output}
            onSwitchToInput={() => setMobileTab('input')}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2 w-full max-w-md sm:max-w-none mx-auto">
        <button
          type="button"
          onClick={handleConvert}
          disabled={isLoading}
          aria-busy={isLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-400/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer min-h-[44px]"
        >
          {isLoading ? 'Converting...' : 'Convert'}
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!output || isLoading}
            aria-label={copied ? 'Output copied' : 'Copy output to clipboard'}
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
            disabled={isLoading}
            aria-label="Clear input and output"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-medium text-base border border-slate-300 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer min-h-[44px]"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
