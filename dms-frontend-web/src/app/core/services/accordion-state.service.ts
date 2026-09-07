import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccordionStateService {
  loadState(key: string, defaults: Record<string, boolean>): Record<string, boolean> {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return { ...defaults };
      return { ...defaults, ...JSON.parse(saved) };
    } catch {
      return { ...defaults };
    }
  }

  saveState(key: string, state: Record<string, boolean>): void {
    localStorage.setItem(key, JSON.stringify(state));
  }
}
