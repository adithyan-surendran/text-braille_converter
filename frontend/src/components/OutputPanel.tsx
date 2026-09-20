import type { ConversionMode } from '../types/api.ts';

interface OutputPanelProps {
  mode: ConversionMode;
  value: string;
  onSwitchToInput?: () => void;
}

export default function OutputPanel({
  mode,
  value,
  onSwitchToInput,
}: OutputPanelProps) {
  const isTextToBraille = mode === 'text-to-braille';
  const labelText = isTextToBraille ? 'Braille output' : 'Text output';

  return (
    <div className="flex flex-col bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wide">
            {labelText}
          </span>
          {onSwitchToInput && (
            <button
              type="button"
              onClick={onSwitchToInput}
              className="md:hidden inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              aria-label="Switch to input box"
            >
              ← Back to Input
            </button>
          )}
        </div>
        <span
          aria-live="polite"
          className="text-xs font-medium text-slate-400 shrink-0"
        >
          {value.length} {value.length === 1 ? 'character' : 'characters'}
        </span>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={labelText}
        className={`w-full min-h-[140px] sm:min-h-[180px] md:min-h-[200px] p-3 sm:p-4 bg-slate-50/70 border border-slate-200 rounded-xl overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words select-text focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all ${
          isTextToBraille
            ? 'text-xl sm:text-2xl md:text-3xl leading-relaxed tracking-wider text-slate-900 font-mono'
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
