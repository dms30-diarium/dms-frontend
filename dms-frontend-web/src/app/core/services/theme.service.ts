import { computed, Injectable, signal } from '@angular/core';

export type AppTheme = 'default' | 'blue' | 'dark' | 'kawaii' | 'custom';

export interface CustomColors {
  primary: string;
  grayPrimary: string;
  headerPrimary: string;
  tableHeader: string;
  arendeButton: string;
}

const THEME_STORAGE_KEY = 'appTheme';
const HIDE_START_IMAGES_KEY = 'hideStartPageImages';
const HIDE_WEEK_CALENDAR_KEY = 'hideWeekCalendar';
const CUSTOM_COLORS_KEY = 'appCustomColors';

const DEFAULT_CUSTOM_COLORS: CustomColors = {
  primary: '#00005a',
  grayPrimary: '#eff1f4',
  headerPrimary: '#ffffff',
  tableHeader: '#e2e6eb',
  arendeButton: '#1f756b',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly theme = signal<AppTheme>(this.loadTheme());
  readonly hideStartPageImages = signal<boolean>(this.loadBool(HIDE_START_IMAGES_KEY));
  readonly hideWeekCalendar = signal<boolean>(this.loadBool(HIDE_WEEK_CALENDAR_KEY));
  readonly customColors = signal<CustomColors>(this.loadCustomColors());

  readonly currentTheme = computed(() => this.theme());

  constructor() {
    this.applyTheme(this.theme());
    if (this.theme() === 'custom') {
      this.applyCustomColors(this.customColors());
    }
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.applyTheme(theme);
    if (theme === 'custom') {
      this.applyCustomColors(this.customColors());
    } else {
      this.clearCustomColors();
    }
  }

  setCustomColors(colors: CustomColors): void {
    this.customColors.set(colors);
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
    this.applyCustomColors(colors);
  }

  setHideStartPageImages(hide: boolean): void {
    this.hideStartPageImages.set(hide);
    localStorage.setItem(HIDE_START_IMAGES_KEY, String(hide));
  }

  setHideWeekCalendar(hide: boolean): void {
    this.hideWeekCalendar.set(hide);
    localStorage.setItem(HIDE_WEEK_CALENDAR_KEY, String(hide));
  }

  private applyTheme(theme: AppTheme): void {
    const html = document.documentElement;
    if (theme === 'default') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', theme);
    }
  }

  private applyCustomColors(colors: CustomColors): void {
    const html = document.documentElement;
    html.style.setProperty('--color-primary', colors.primary);
    html.style.setProperty('--color-gray-primary', colors.grayPrimary);
    html.style.setProperty('--color-header-primary', colors.headerPrimary);
    html.style.setProperty('--color-table-header', colors.tableHeader);
    html.style.setProperty('--color-arende-button', colors.arendeButton);
  }

  private clearCustomColors(): void {
    const html = document.documentElement;
    html.style.removeProperty('--color-primary');
    html.style.removeProperty('--color-gray-primary');
    html.style.removeProperty('--color-header-primary');
    html.style.removeProperty('--color-table-header');
    html.style.removeProperty('--color-arende-button');
  }

  private loadTheme(): AppTheme {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'blue' || stored === 'dark' || stored === 'kawaii' || stored === 'custom') return stored;
    return 'default';
  }

  private loadCustomColors(): CustomColors {
    try {
      const stored = localStorage.getItem(CUSTOM_COLORS_KEY);
      if (stored) return { ...DEFAULT_CUSTOM_COLORS, ...JSON.parse(stored) };
    } catch {
      // fall through to defaults
    }
    return { ...DEFAULT_CUSTOM_COLORS };
  }

  private loadBool(key: string): boolean {
    return localStorage.getItem(key) === 'true';
  }
}
