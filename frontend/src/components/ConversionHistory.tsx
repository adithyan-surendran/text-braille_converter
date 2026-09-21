import type { ConversionHistoryItem } from '../types/api.ts';
import { formatPreview } from '../utils/text.ts';

interface ConversionHistoryProps {
  history: ConversionHistoryItem[];
  onRestore: (item: ConversionHistoryItem) => void;
  onClearHistory: () => void;
  disabled?: boolean;
}

export default function ConversionHistory({
  history,
  onRestore,
  onClearHistory,
  disabled = false,
}: ConversionHistoryProps) {
  return (
    <section
      aria-labelledby="history-heading"
      className="w-full bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3"
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2
            id="history-heading"
            className="text-xs sm:text-sm font-semibold text-slate-800 tracking-wide"
          >
            Conversion History
          </h2>
          {history.length > 0 && (
            <span
              aria-label={`${history.length} of 5 items`}
              className="text-xs font-medium text-slate-400"
            >
              ({history.length} / 5)
            </span>
          )}
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            disabled={disabled}
            aria-label="Delete all conversion history"
            title="Clear all conversion history"
            className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-600 focus-visible:ring-1 focus-visible:ring-rose-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs sm:text-sm text-slate-400 italic py-2">
          No recent conversions yet.
        </p>
      ) : (
        <ul
          role="list"
          className="space-y-2.5"
          aria-label="Recent conversions list"
        >
          {history.map((item, index) => {
            const isTextToBraille = item.mode === 'text-to-braille';
            const modeLabel = isTextToBraille
              ? 'Text → Braille'
              : 'Braille → Text';
            const inputPreview = formatPreview(item.inputText, 35);
            const outputPreview = formatPreview(item.outputText, 35);
            const accessibleRestoreLabel = `Restore ${
              isTextToBraille ? 'Text to Braille' : 'Braille to Text'
            } conversion: "${inputPreview}"`;

            return (
              <li
                key={item.id}
                data-testid={`history-item-${index}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        isTextToBraille
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {modeLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-500 shrink-0">
                        Input:
                      </span>
                      <span
                        data-testid={`history-input-${index}`}
                        className="truncate font-mono text-slate-800"
                        title={item.inputText}
                      >
                        "{inputPreview}"
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-500 shrink-0">
                        Output:
                      </span>
                      <span
                        data-testid={`history-output-${index}`}
                        className={`truncate text-slate-800 ${
                          isTextToBraille ? 'font-mono' : ''
                        }`}
                        title={item.outputText}
                      >
                        "{outputPreview}"
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRestore(item)}
                  disabled={disabled}
                  aria-label={accessibleRestoreLabel}
                  className="self-start sm:self-center shrink-0 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 active:bg-blue-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 focus-visible:ring-1 focus-visible:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restore
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
