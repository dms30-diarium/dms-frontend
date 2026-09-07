import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AccordionFieldService {
  getKeys(obj: unknown): string[] {
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      return Object.keys(obj);
    }
    return [];
  }

  isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  getRecord(value: unknown): Record<string, unknown> {
    return this.isRecord(value) ? value : {};
  }

  shouldRecurse(value: unknown): boolean {
    if (!this.isRecord(value)) return false;
    return Object.values(value).some(v => this.isRecord(v));
  }

  getNestedRecord(parent: unknown, key: string): Record<string, unknown> {
    const child = this.getRecord(parent)[key];
    return this.isRecord(child) ? child : {};
  }

  getPipeJoined(value: unknown): string {
    if (this.isRecord(value)) {
      return Object.keys(value)
        .map(k => {
          const v = value[k];
          return typeof v === 'string' || typeof v === 'number' ? v : '';
        })
        .join(' | ');
    }
    return String(value);
  }

  getNestedValueAsString(parent: unknown, key: string, subKey: string): string {
    const record = this.getRecord(parent);
    const child = record[key];
    if (this.isRecord(child)) {
      const value = child[subKey];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }
    return '';
  }
}
