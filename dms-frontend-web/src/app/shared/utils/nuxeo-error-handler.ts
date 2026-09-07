import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorInfo {
  statusCode: number | null;
  message: string;
  isRetriable: boolean;
  isPermissionDenied: boolean;
  isValidationError: boolean;
}

export interface ErrorHandlerOptions {
  logToConsole?: boolean;
  fallbackMessage?: string;
}

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Felaktig förfrågan. Kontrollera inmatningen.',
  401: 'Du är inte autentiserad. Logga in igen.',
  403: 'Du har inte behörighet att utföra denna åtgärd.',
  404: 'Resursen finns inte.',
  422: 'Valideringsfel. Kontrollera att alla obligatoriska fält är ifyllda med giltiga värden.',
  500: 'Serverfel. Försök igen senare.',
  503: 'Tjänsten är tillfälligt otillgänglig. Försök igen senare.',
};

const RETRIABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse;
}

function extractHttpStatus(error: unknown): number | null {
  if (isHttpErrorResponse(error)) {
    return error.status;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as Record<string, unknown>)['status'];
    if (typeof status === 'number') {
      return status;
    }
  }

  return null;
}

function extractErrorMessage(error: unknown): string | null {
  if (isHttpErrorResponse(error)) {
    if (error.error?.['error']) {
      return error.error['error'];
    }
    if (error.error?.['message']) {
      return error.error['message'];
    }
    if (typeof error.error === 'string') {
      return error.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return null;
}

export function analyzeError(error: unknown, options: ErrorHandlerOptions = {}): ErrorInfo {
  const statusCode = extractHttpStatus(error);
  const customMessage = extractErrorMessage(error);
  const fallbackMessage = options.fallbackMessage || 'Ett fel inträffade. Försök igen senare.';

  const message = customMessage || ERROR_MESSAGES[statusCode ?? -1] || fallbackMessage;
  const isRetriable = statusCode ? RETRIABLE_STATUS_CODES.has(statusCode) : true;
  const isPermissionDenied = statusCode === 403;
  const isValidationError = statusCode === 422;

  if (options.logToConsole) {
    console.error('Nuxeo API Error:', {
      statusCode,
      message,
      originalError: error,
      isRetriable,
      isPermissionDenied,
      isValidationError,
    });
  }

  return {
    statusCode,
    message,
    isRetriable,
    isPermissionDenied,
    isValidationError,
  };
}

export function getNotificationVariation(statusCode: number | null): 'info' | 'danger' | 'warning' | 'success' {
  if (!statusCode) return 'danger';

  if (statusCode === 403 || statusCode === 401) return 'warning';
  if (statusCode === 422) return 'warning';
  if (statusCode >= 500) return 'danger';
  if (statusCode >= 400) return 'warning';

  return 'danger';
}

export function isPermissionError(error: unknown): boolean {
  const statusCode = extractHttpStatus(error);
  return statusCode === 403;
}

export function isValidationError(error: unknown): boolean {
  const statusCode = extractHttpStatus(error);
  return statusCode === 422;
}

export function isRetriableError(error: unknown): boolean {
  const statusCode = extractHttpStatus(error);
  if (!statusCode) return true;
  return RETRIABLE_STATUS_CODES.has(statusCode);
}

export function getHttpStatus(error: unknown): number | null {
  return extractHttpStatus(error);
}

export function getErrorMessage(error: unknown, fallback = 'Ett okänt fel inträffade.'): string {
  return extractErrorMessage(error) || fallback;
}
