import type { ErrorResponse } from '../types';

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  code?: string,
  stack?: string
): ErrorResponse {
  return {
    error: message,
    ...(code && { code }),
    ...(stack && process.env.NODE_ENV !== 'production' && { stack })
  };
}

/**
 * Safely handle errors in async functions
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<T | ErrorResponse> {
  try {
    return await fn();
  } catch (error: any) {
    console.error('Error:', error);
    return createErrorResponse(
      error.message || 'An unexpected error occurred',
      error.code,
      error.stack
    );
  }
}

/**
 * Check if a response is an error
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response === 'object' && 'error' in response;
} 