import { computed, Injectable, signal } from '@angular/core';

export type UiMode = 'standard' | 'simplified';

const UI_MODE_STORAGE_KEY = 'uiMode';

@Injectable({ providedIn: 'root' })
export class UiModeService {
  private readonly uiMode = signal<UiMode>(this.loadUiMode());

  readonly mode = computed(() => this.uiMode());
  readonly isSimplified = computed(() => this.uiMode() === 'simplified');

  setMode(mode: UiMode): void {
    this.uiMode.set(mode);
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  }

  private loadUiMode(): UiMode {
    const storedMode = localStorage.getItem(UI_MODE_STORAGE_KEY);
    return storedMode === 'simplified' ? 'simplified' : 'standard';
  }
}
