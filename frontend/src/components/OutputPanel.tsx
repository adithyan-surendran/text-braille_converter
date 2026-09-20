import { useState } from 'react';
import type { BrailleSize, ConversionMode } from '../types/api.ts';

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
}

export default function OutputPanel({
  mode,
  value,
  onSwitchToInput,
  outputRef,
  brailleSize: propBrailleSize,
  onBrailleSizeChange,
}: OutputPanelProps) {
  const isTextToBraille = mode === 'text-to-braille';
  const labelText = isTextToBraille ? 'Braille output' : 'Text output';

  const [internalSizeIndex, setInternalSizeIndex] = useState<number>(DEFAULT_BRAILLE_SIZE_INDEX);

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
    <div className="flex flex-col bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
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

      <div
        ref={outputRef}
        tabIndex={0}
        role="region"
        aria-label={labelText}
        data-braille-size={isTextToBraille ? currentSize.id : undefined}
        className={`w-full min-h-[140px] sm:min-h-[180px] md:min-h-[200px] p-3 sm:p-4 bg-slate-50/70 border border-slate-200 rounded-xl overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words select-text focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/25 focus:outline-none transition-all ${
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
