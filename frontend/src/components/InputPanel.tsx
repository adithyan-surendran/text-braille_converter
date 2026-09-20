import { useRef, useState } from 'react';
import { MAX_FILE_SIZE_BYTES } from '../types/api.ts';
import type { ConversionMode } from '../types/api.ts';

interface InputPanelProps {
  mode: ConversionMode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSwitchToOutput?: () => void;
  inputRef?: React.Ref<HTMLTextAreaElement>;
  uploadedFileName?: string | null;
  onFileUpload?: (fileName: string, content: string) => void;
  onFileRemove?: () => void;
  onError?: (error: string) => void;
}

const readFileContent = async (file: File): Promise<string> => {
  if (typeof file.text === 'function') {
    return await file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export default function InputPanel({
  mode,
  value,
  onChange,
  disabled = false,
  onSwitchToOutput,
  inputRef,
  uploadedFileName,
  onFileUpload,
  onFileRemove,
  onError,
}: InputPanelProps) {
  const isTextToBraille = mode === 'text-to-braille';
  const labelText = isTextToBraille ? 'English Text' : 'Braille Input';
  const placeholderText = isTextToBraille
    ? 'Enter text to convert...'
    : 'Enter Braille to convert...';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalFileName, setInternalFileName] = useState<string | null>(null);
  const currentFileName =
    uploadedFileName !== undefined ? uploadedFileName : internalFileName;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file extension (.txt only)
    if (!file.name.toLowerCase().endsWith('.txt')) {
      const errorMsg = 'Invalid file type. Please upload a .txt file.';
      setInternalFileName(null);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    // Validate file size (100 KB limit)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const errorMsg =
        'File size exceeds the 100 KB limit. Please choose a smaller .txt file.';
      setInternalFileName(null);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    try {
      const content = await readFileContent(file);
      setInternalFileName(file.name);
      onChange(content);
      onFileUpload?.(file.name, content);
    } catch {
      const errorMsg = 'Failed to read file. Please try again.';
      setInternalFileName(null);
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const handleRemoveFile = () => {
    setInternalFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove?.();
  };

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

      {/* File Upload Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <label
            htmlFor="txt-file-upload"
            className="text-xs font-medium text-slate-600 shrink-0"
          >
            Upload .txt:
          </label>
          <input
            ref={fileInputRef}
            id="txt-file-upload"
            type="file"
            accept=".txt"
            disabled={disabled}
            onChange={handleFileChange}
            aria-label="Upload .txt file"
            className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-medium file:bg-slate-50 hover:file:bg-slate-100 file:text-slate-700 file:cursor-pointer cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {currentFileName && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 font-medium">
            <span
              data-testid="uploaded-file-name"
              className="truncate max-w-[140px] sm:max-w-[200px]"
              title={currentFileName}
            >
              📄 {currentFileName}
            </span>
            <button
              type="button"
              onClick={handleRemoveFile}
              aria-label="Remove uploaded file"
              className="text-blue-500 hover:text-blue-800 font-bold px-1 rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            >
              ×
            </button>
          </div>
        )}
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
