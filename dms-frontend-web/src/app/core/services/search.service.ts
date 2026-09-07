import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchService {
  extractTerm(raw: unknown): string {
    if (typeof raw === 'string') {
      return raw.trim();
    }

    if (this.isCustomEvent(raw)) {
      const detail = raw.detail;
      if (typeof detail === 'string') {
        return detail.trim();
      }

      if (this.isObjectWithValue(detail) && typeof detail.value === 'string') {
        return detail.value.trim();
      }
    }

    if (this.isDomEvent(raw)) {
      const target = raw.target as HTMLInputElement | null;
      if (typeof target?.value === 'string') {
        return target.value.trim();
      }
    }

    if (this.isObjectWithValue(raw) && typeof raw.value === 'string') {
      return raw.value.trim();
    }

    return '';
  }

  toContainsPattern(term: string): string {
    const sanitized = term?.trim();
    if (!sanitized) return '';
    const stripped = sanitized.replace(/%/g, '');
    return stripped ? `%${stripped}%` : '';
  }

  toContainsPatternFromEvent(raw: unknown): string {
    return this.toContainsPattern(this.extractTerm(raw));
  }

  private isCustomEvent(input: unknown): input is CustomEvent<unknown> {
    return typeof input === 'object' && input !== null && 'detail' in input;
  }

  private isDomEvent(input: unknown): input is Event {
    return typeof input === 'object' && input !== null && 'target' in input && 'type' in input;
  }

  private isObjectWithValue(input: unknown): input is { value?: unknown } {
    return typeof input === 'object' && input !== null && 'value' in input;
  }
}
