import { useEffect, useRef, useState } from 'react';
import type { BrailleSize, ConversionMode } from '../types/api.ts';
import { downloadTextFile, getDownloadFilename } from '../utils/download.ts';

interface BrailleSizeConfig {
  id: BrailleSize;
  label: string;
  className: string;
}

const BRAILLE_SIZES: BrailleSizeConfig[] = [
  {
    id: 'small',
    label: 'Small',
    className: 'text-lg sm:text-xl md:text-2xl leading-relaxed tracking-wider',
  },
  {
    id: 'medium',
    label: 'Medium (Default)',
    className: 'text-xl sm:text-2xl md:text-3xl leading-loose tracking-widest',
  },
  {
    id: 'large',
    label: 'Large',
    className: 'text-2xl sm:text-3xl md:text-4xl leading-loose tracking-widest',
  },
  {
    id: 'extra-large',
    label: 'Extra Large',
    className: 'text-3xl sm:text-4xl md:text-5xl leading-loose tracking-widest',
  },
];

const DEFAULT_BRAILLE_SIZE_INDEX = 1;

interface OutputPanelProps {
  mode: ConversionMode;
  value: string;
  onSwitchToInput?: () => void;
  outputRef?: React.Ref<HTMLDivElement>;
  brailleSize?: BrailleSize;
  onBrailleSizeChange?: (size: BrailleSize) => void;
  disabled?: boolean;
  onDownloadSuccess?: () => void;
  onError?: (error: string) => void;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

export default function OutputPanel({
  mode,
  value,
  onSwitchToInput,
  outputRef,
  brailleSize: propBrailleSize,
  onBrailleSizeChange,
  disabled = false,
  onDownloadSuccess,
  onError,
  onDownloadPdf,
  isGeneratingPdf = false,
}: OutputPanelProps) {
  const isTextToBraille = mode === 'text-to-braille';
  const labelText = isTextToBraille ? 'Braille output' : 'Text output';

  const [internalSizeIndex, setInternalSizeIndex] = useState<number>(DEFAULT_BRAILLE_SIZE_INDEX);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const downloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filename = getDownloadFilename(mode);

  const [prevTracked, setPrevTracked] = useState({ value, mode });
  if (prevTracked.value !== value || prevTracked.mode !== mode) {
    setPrevTracked({ value, mode });
    setDownloaded(false);
    setIsDropdownOpen(false);
  }

  useEffect(() => {
    return () => {
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);


  const handleDownload = () => {
    if (!value || disabled) return;

    try {
      downloadTextFile(value, filename);
      setDownloaded(true);
      onDownloadSuccess?.();

      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
      }
      downloadTimeoutRef.current = setTimeout(() => {
        setDownloaded(false);
      }, 2000);
    } catch (err) {
      setDownloaded(false);
      const errorMsg =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to download output. Please try again.';
      onError?.(errorMsg);
    }
  };

  const sizeIndex =
    propBrailleSize !== undefined
      ? Math.max(0, BRAILLE_SIZES.findIndex((s) => s.id === propBrailleSize))
      : internalSizeIndex;

  const currentSize = BRAILLE_SIZES[sizeIndex] || BRAILLE_SIZES[DEFAULT_BRAILLE_SIZE_INDEX];
  const lineCount = value ? value.split('\n').length : 0;

  const updateSizeIndex = (newIndex: number) => {
    setInternalSizeIndex(newIndex);
    onBrailleSizeChange?.(BRAILLE_SIZES[newIndex].id);
  };

  const handleDecreaseSize = () => {
    if (sizeIndex > 0) {
      updateSizeIndex(sizeIndex - 1);
    }
  };

  const handleIncreaseSize = () => {
    if (sizeIndex < BRAILLE_SIZES.length - 1) {
      updateSizeIndex(sizeIndex + 1);
    }
  };

  const handleResetSize = () => {
    updateSizeIndex(DEFAULT_BRAILLE_SIZE_INDEX);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 min-h-[32px]">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wide">
            {labelText}
          </span>
          {onSwitchToInput && (
            <button
              type="button"
              onClick={onSwitchToInput}
              className="md:hidden inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20"
              aria-label="Switch to input box"
            >
              ← Back to Input
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isTextToBraille && (
            <div
              role="group"
              aria-label="Braille font size controls"
              className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs"
            >
              <button
                type="button"
                onClick={handleDecreaseSize}
                disabled={sizeIndex === 0}
                aria-label="Decrease Braille font size"
                className="px-2 py-1 font-medium text-slate-700 hover:text-slate-900 hover:bg-white rounded cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-1 focus-visible:ring-blue-500/30"
              >
                A−
              </button>
              <button
                type="button"
                onClick={handleResetSize}
                aria-label="Reset Braille font size"
                className="px-2 py-1 font-medium text-slate-700 hover:text-slate-900 hover:bg-white rounded cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-1 focus-visible:ring-blue-500/30"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleIncreaseSize}
                disabled={sizeIndex === BRAILLE_SIZES.length - 1}
                aria-label="Increase Braille font size"
                className="px-2 py-1 font-medium text-slate-700 hover:text-slate-900 hover:bg-white rounded cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-1 focus-visible:ring-blue-500/30"
              >
                A+
              </button>
            </div>
          )}

          <span
            aria-live="polite"
            className="text-xs font-medium text-slate-400 shrink-0"
          >
            {lineCount > 1 ? `${lineCount} lines · ` : ''}
            {value.length} {value.length === 1 ? 'character' : 'characters'}
          </span>
        </div>
      </div>

      {/* Output Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 min-h-[33px]">
        <div className="flex items-center gap-2">
          {/* Download Split Dropdown Button */}
          <div className="relative inline-flex items-center" ref={dropdownRef}>
            <div
              className={`inline-flex items-center rounded-lg border shadow-2xs transition-all ${
                downloaded
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-white border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={handleDownload}
                disabled={!value || disabled || isGeneratingPdf}
                aria-label={`Download ${isTextToBraille ? 'Braille' : 'text'} output`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-l-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed ${
                  downloaded
                    ? 'text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {downloaded ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  )}
                </svg>
                <span>
                  {isGeneratingPdf
                    ? 'Downloading PDF...'
                    : downloaded
                    ? 'Downloaded!'
                    : 'Download'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                disabled={!value || disabled || isGeneratingPdf}
                aria-label="Format options"
                aria-haspopup="menu"
                aria-expanded={isDropdownOpen}
                className={`px-1.5 py-1 text-xs border-l transition-colors cursor-pointer rounded-r-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed ${
                  downloaded
                    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-100/60'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                role="menu"
                aria-label="Download formats"
                className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-label="Download as text (.txt)"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleDownload();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-medium">Text (.txt)</span>
                  <span className="text-[10px] text-slate-400 font-mono">.txt</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  aria-label="Download as PDF (.pdf)"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onDownloadPdf?.();
                  }}
                  disabled={isGeneratingPdf}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-medium">PDF Document (.pdf)</span>
                  <span className="text-[10px] text-slate-400 font-mono">.pdf</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {value ? (
          <span
            data-testid="output-filename"
            className="text-xs text-slate-400 font-mono hidden sm:inline"
          >
            📄 {filename}
          </span>
        ) : null}
      </div>

      <div
        ref={outputRef}
        tabIndex={0}
        role="region"
        aria-label={labelText}
        data-braille-size={isTextToBraille ? currentSize.id : undefined}
        className={`w-full flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[240px] p-3 sm:p-4 bg-slate-50/70 border border-slate-200 rounded-xl overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words select-text focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/25 focus:outline-none transition-all ${
          isTextToBraille
            ? `${currentSize.className} text-slate-900 font-mono`
            : 'text-sm sm:text-base leading-relaxed text-slate-900'
        }`}
      >
        {value ? (
          value
        ) : (
          <span className="text-xs sm:text-sm text-slate-400 italic select-none">
            Conversion output will appear here...
          </span>
        )}
      </div>
    </div>
  );
}
