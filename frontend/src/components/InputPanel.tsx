import { useEffect, useRef, useState } from 'react';
import { MAX_FILE_SIZE_BYTES } from '../types/api.ts';
import type { ConversionMode } from '../types/api.ts';
import { normalizeLineEndings } from '../utils/text.ts';

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
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const currentFileName =
    uploadedFileName !== undefined ? uploadedFileName : internalFileName;

  const lineCount = value ? value.split('\n').length : 0;

  // Clear native file input DOM element when uploadedFileName is reset or cleared
  useEffect(() => {
    if (!uploadedFileName && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadedFileName]);

  const processFile = async (file: File) => {
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
      const rawContent = await readFileContent(file);
      const content = normalizeLineEndings(rawContent);

      // Validate usable text content (empty or whitespace-only)
      if (content.length === 0) {
        const errorMsg = 'The selected file is empty and contains no text.';
        setInternalFileName(null);
        if (onError) {
          onError(errorMsg);
        }
        return;
      }

      if (content.trim().length === 0) {
        const errorMsg =
          'The selected file contains only whitespace and has no usable text.';
        setInternalFileName(null);
        if (onError) {
          onError(errorMsg);
        }
        return;
      }

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    await processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (disabled) return;

    // Reset input value so future native selections trigger correctly
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      setInternalFileName(null);
      if (onError) {
        onError('Please drop only one file at a time.');
      }
      return;
    }

    const file = files[0];
    await processFile(file);
  };

  const handleRemoveFile = () => {
    setInternalFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove?.();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-2 min-h-[32px]">
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
          {lineCount > 1 ? `${lineCount} lines · ` : ''}
          {value.length} {value.length === 1 ? 'character' : 'characters'}
        </span>
      </div>

      {/* Accessible File Upload Dropzone */}
      <div
        data-testid="file-dropzone"
        data-dragging={isDragging ? 'true' : 'false'}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative transition-all duration-200 rounded-xl mb-3 border p-2.5 sm:px-3 sm:py-2 ${
          isDragging
            ? 'border-2 border-dashed border-blue-500 bg-blue-50/90 ring-2 ring-blue-400/20'
            : 'border-slate-200 bg-slate-50/50'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isDragging && (
          <div className="flex items-center justify-center gap-2 py-1 text-xs sm:text-sm font-semibold text-blue-700 pointer-events-none">
            <span className="text-base" aria-hidden="true">
              📥
            </span>
            <span>Drop .txt file to upload</span>
          </div>
        )}

        <div
          className={`flex flex-wrap items-center justify-between gap-2 ${
            isDragging ? 'hidden' : 'flex'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <label
              htmlFor="txt-file-upload"
              className="text-xs font-medium text-slate-700 shrink-0"
            >
              Upload .txt:
            </label>
            <input
              ref={fileInputRef}
              id="txt-file-upload"
              type="file"
              accept=".txt"
              disabled={disabled}
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={handleFileChange}
              aria-label="Upload .txt file"
              className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-medium file:bg-white hover:file:bg-slate-100 file:text-slate-700 file:cursor-pointer cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-[11px] text-slate-400 hidden sm:inline select-none">
              (or drag &amp; drop here)
            </span>
          </div>

          {currentFileName && (
            <div
              role="group"
              aria-label={`Uploaded file: ${currentFileName}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 font-medium max-w-full min-w-0 shadow-2xs"
            >
              <span
                data-testid="uploaded-file-name"
                className="truncate min-w-0 max-w-[150px] sm:max-w-[260px] md:max-w-[340px] lg:max-w-[400px]"
                title={currentFileName}
              >
                📄 {currentFileName}
              </span>
              <button
                type="button"
                onClick={handleRemoveFile}
                aria-label="Remove uploaded file"
                title={`Remove uploaded file: ${currentFileName}`}
                className="shrink-0 text-blue-500 hover:text-blue-800 font-bold px-1 rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                ×
              </button>
            </div>
          )}
        </div>
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
        className="w-full flex-1 min-h-[160px] sm:min-h-[200px] md:min-h-[240px] p-3 sm:p-4 bg-slate-50/50 border border-slate-300 rounded-xl resize-y text-slate-800 text-sm sm:text-base leading-relaxed focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/25 focus:outline-none transition-all disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
}
