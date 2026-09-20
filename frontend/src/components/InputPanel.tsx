import type { ConversionMode } from '../types/api.ts';

interface InputPanelProps {
  mode: ConversionMode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSwitchToOutput?: () => void;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

export default function InputPanel({
  mode,
  value,
  onChange,
  disabled = false,
  onSwitchToOutput,
  inputRef,
}: InputPanelProps) {
  const isTextToBraille = mode === 'text-to-braille';
  const labelText = isTextToBraille ? 'English Text' : 'Braille Input';
  const placeholderText = isTextToBraille
    ? 'Enter text to convert...'
    : 'Enter Braille to convert...';

  return (
    <div className="flex flex-col bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor="converter-input"
            className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wide"
          >
            {labelText}
          </label>
          {onSwitchToOutput && (
            <button
              type="button"
              onClick={onSwitchToOutput}
              className="md:hidden inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20"
              aria-label="Switch to output box"
            >
              View Output →
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

      <textarea
        ref={inputRef}
        id="converter-input"
        name="converter-input"
        rows={6}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderText}
        className={`w-full min-h-[140px] sm:min-h-[180px] md:min-h-[200px] p-3 sm:p-4 bg-slate-50/50 border border-slate-300 rounded-xl resize-y text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/25 focus:outline-none transition-all disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed ${
          !isTextToBraille
            ? 'text-xl sm:text-2xl md:text-3xl leading-relaxed tracking-wider'
            : 'text-sm sm:text-base leading-relaxed'
        }`}
      />
    </div>
  );
}
