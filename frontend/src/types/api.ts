export type ConversionMode = 'text-to-braille' | 'braille-to-text';
export type BrailleSize = 'small' | 'medium' | 'large' | 'extra-large';

export const MAX_FILE_SIZE_BYTES = 100 * 1024; // 100 KB

export type EncodeRequest = {
  text: string;
};

export type EncodeResponse = {
  input: string;
  braille: string;
};

export type DecodeRequest = {
  braille: string;
};

export type DecodeResponse = {
  braille: string;
  text: string;
};

export type ApiErrorDetail = {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
};

export type ApiErrorResponse = {
  detail?: string | ApiErrorDetail[];
};
