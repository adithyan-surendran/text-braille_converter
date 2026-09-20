import type { ConversionMode } from '../types/api.ts';

interface ModeToggleProps {
  mode: ConversionMode;
  onModeChange: (mode: ConversionMode) => void;
  disabled?: boolean;
}

export default function ModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: ModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Conversion Mode"
      className="w-full max-w-sm sm:w-auto inline-flex p-1 bg-slate-200/80 rounded-xl shadow-inner border border-slate-300/60"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('text-to-braille')}
        aria-pressed={mode === 'text-to-braille'}
        className={`flex-1 sm:flex-initial text-center px-3 sm:px-5 py-2 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === 'text-to-braille'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Text → Braille
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('braille-to-text')}
        aria-pressed={mode === 'braille-to-text'}
        className={`flex-1 sm:flex-initial text-center px-3 sm:px-5 py-2 text-xs sm:text-sm md:text-base font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === 'braille-to-text'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Braille → Text
      </button>
    </div>
  );
}
