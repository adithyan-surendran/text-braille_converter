import type {
  ApiErrorResponse,
  DecodeRequest,
  DecodeResponse,
  EncodeRequest,
  EncodeResponse,
} from '../types/api.ts';

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000';

/**
 * Parses HTTP error responses into clean, user-friendly error messages.
 */
async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const errorData = (await response.json()) as ApiErrorResponse;

    if (typeof errorData?.detail === 'string') {
      return errorData.detail;
    }

    if (Array.isArray(errorData?.detail) && errorData.detail.length > 0) {
      const messages = errorData.detail
        .map((d) => d.msg || 'Invalid field')
        .filter(Boolean);
      return messages.length > 0 ? messages.join(', ') : 'Validation error occurred.';
    }
  } catch {
    // If response is not JSON, fall through to status-based messages
  }

  if (response.status === 400) {
    return 'Input contains unsupported characters.';
  }

  if (response.status === 422) {
    return 'Invalid request format or missing required field.';
  }

  return 'Something went wrong. Please try again.';
}

/**
 * Handle network-level errors gracefully.
 */
function handleNetworkError(error: unknown): never {
  if (error instanceof Error) {
    // Check for common browser network / CORS failures
    if (
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    ) {
      throw new Error(
        'Unable to connect to the converter service. Please make sure the backend server is running.'
      );
    }
    throw error;
  }
  throw new Error('Something went wrong. Please try again.');
}

/**
 * Sends a request to encode English text to Braille.
 * Calls POST /api/encode
 */
export async function encodeText(text: string): Promise<EncodeResponse> {
  try {
    const payload: EncodeRequest = { text };
    const response = await fetch(`${API_BASE_URL}/api/encode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    return (await response.json()) as EncodeResponse;
  } catch (error) {
    return handleNetworkError(error);
  }
}

/**
 * Sends a request to decode Braille symbols back to English text.
 * Calls POST /api/decode
 */
export async function decodeBraille(braille: string): Promise<DecodeResponse> {
  try {
    const payload: DecodeRequest = { braille };
    const response = await fetch(`${API_BASE_URL}/api/decode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    return (await response.json()) as DecodeResponse;
  } catch (error) {
    return handleNetworkError(error);
  }
}
