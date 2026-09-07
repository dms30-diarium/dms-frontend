import { HttpErrorResponse } from '@angular/common/http';
import {
  analyzeError,
  getNotificationVariation,
  isPermissionError,
  isValidationError,
  isRetriableError,
  getHttpStatus,
  getErrorMessage,
} from './nuxeo-error-handler';

describe('NuxeoErrorHandler', () => {
  describe('analyzeError', () => {
    it('should extract status code from HttpErrorResponse', () => {
      const error = new HttpErrorResponse({ status: 403 });
      const info = analyzeError(error);

      expect(info.statusCode).toBe(403);
      expect(info.isPermissionDenied).toBeTrue();
    });

    it('should extract error message from HttpErrorResponse.error.error', () => {
      const error = new HttpErrorResponse({
        status: 422,
        error: { error: 'Invalid vocab ID' },
      });
      const info = analyzeError(error);

      expect(info.message).toContain('Invalid vocab ID');
    });

    it('should fall back to ERROR_MESSAGES for standard HTTP status codes', () => {
      const error = new HttpErrorResponse({ status: 403 });
      const info = analyzeError(error);

      expect(info.message).toContain('behörighet');
    });

    it('should identify retriable errors (5xx)', () => {
      const error = new HttpErrorResponse({ status: 503 });
      const info = analyzeError(error);

      expect(info.isRetriable).toBeTrue();
    });

    it('should identify non-retriable errors (4xx)', () => {
      const error = new HttpErrorResponse({ status: 403 });
      const info = analyzeError(error);

      expect(info.isRetriable).toBeFalse();
    });

    it('should identify validation errors (422)', () => {
      const error = new HttpErrorResponse({ status: 422 });
      const info = analyzeError(error);

      expect(info.isValidationError).toBeTrue();
    });

    it('should handle Error objects', () => {
      const error = new Error('Custom error message');
      const info = analyzeError(error);

      expect(info.message).toBe('Custom error message');
      expect(info.statusCode).toBeNull();
    });

    it('should handle string errors', () => {
      const info = analyzeError('String error');

      expect(info.message).toBe('String error');
    });

    it('should use fallbackMessage when provided', () => {
      const error = new HttpErrorResponse({ status: 500, error: '' });
      const info = analyzeError(error, { fallbackMessage: 'Custom fallback' });

      expect(info.message).toContain('Serverfel');
    });

    it('should log to console when logToConsole option is true', () => {
      spyOn(console, 'error');
      const error = new HttpErrorResponse({ status: 403 });

      analyzeError(error, { logToConsole: true });

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getNotificationVariation', () => {
    it('should return "warning" for 403 (permission denied)', () => {
      expect(getNotificationVariation(403)).toBe('warning');
    });

    it('should return "warning" for 401 (unauthorized)', () => {
      expect(getNotificationVariation(401)).toBe('warning');
    });

    it('should return "warning" for 422 (validation error)', () => {
      expect(getNotificationVariation(422)).toBe('warning');
    });

    it('should return "danger" for 5xx errors', () => {
      expect(getNotificationVariation(500)).toBe('danger');
      expect(getNotificationVariation(503)).toBe('danger');
    });

    it('should return "warning" for other 4xx errors', () => {
      expect(getNotificationVariation(400)).toBe('warning');
      expect(getNotificationVariation(404)).toBe('warning');
    });

    it('should return "danger" for null status', () => {
      expect(getNotificationVariation(null)).toBe('danger');
    });
  });

  describe('isPermissionError', () => {
    it('should return true for 403 status', () => {
      const error = new HttpErrorResponse({ status: 403 });
      expect(isPermissionError(error)).toBeTrue();
    });

    it('should return false for other status codes', () => {
      const error = new HttpErrorResponse({ status: 500 });
      expect(isPermissionError(error)).toBeFalse();
    });

    it('should return false for non-HTTP errors', () => {
      expect(isPermissionError(new Error('Test'))).toBeFalse();
    });
  });

  describe('isValidationError', () => {
    it('should return true for 422 status', () => {
      const error = new HttpErrorResponse({ status: 422 });
      expect(isValidationError(error)).toBeTrue();
    });

    it('should return false for other status codes', () => {
      const error = new HttpErrorResponse({ status: 403 });
      expect(isValidationError(error)).toBeFalse();
    });
  });

  describe('isRetriableError', () => {
    it('should return true for 5xx errors', () => {
      expect(isRetriableError(new HttpErrorResponse({ status: 500 }))).toBeTrue();
      expect(isRetriableError(new HttpErrorResponse({ status: 503 }))).toBeTrue();
    });

    it('should return true for 429 (rate limit)', () => {
      expect(isRetriableError(new HttpErrorResponse({ status: 429 }))).toBeTrue();
    });

    it('should return false for 4xx errors (except 429)', () => {
      expect(isRetriableError(new HttpErrorResponse({ status: 403 }))).toBeFalse();
      expect(isRetriableError(new HttpErrorResponse({ status: 422 }))).toBeFalse();
    });

    it('should return true for non-HTTP errors (unknown retriability)', () => {
      expect(isRetriableError(new Error('Unknown'))).toBeTrue();
    });
  });

  describe('getHttpStatus', () => {
    it('should extract status from HttpErrorResponse', () => {
      const error = new HttpErrorResponse({ status: 422 });
      expect(getHttpStatus(error)).toBe(422);
    });

    it('should return null for non-HTTP errors', () => {
      expect(getHttpStatus(new Error('Test'))).toBeNull();
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from HttpErrorResponse', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { error: 'Custom error' },
      });
      expect(getErrorMessage(error)).toBe('Custom error');
    });

    it('should extract message from Error object', () => {
      const error = new Error('Error message');
      expect(getErrorMessage(error)).toBe('Error message');
    });

    it('should use fallback when error has no message', () => {
      expect(getErrorMessage({}, 'Fallback message')).toBe('Fallback message');
    });

    it('should use default fallback when none provided', () => {
      const result = getErrorMessage({});
      expect(result).toBe('Ett okänt fel inträffade.');
    });
  });
});
