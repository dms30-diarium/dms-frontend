import { TestBed } from '@angular/core/testing';
import { CustomColors, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    [
      '--color-primary',
      '--color-gray-primary',
      '--color-header-primary',
      '--color-table-header',
      '--color-arende-button',
    ].forEach(p => document.documentElement.style.removeProperty(p));
    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);
  });

  it('defaults to default theme when nothing stored', () => {
    expect(service.currentTheme()).toBe('default');
  });

  it('removes data-theme attribute for default theme', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('sets theme to blue and applies data-theme attribute', () => {
    service.setTheme('blue');
    expect(service.currentTheme()).toBe('blue');
    expect(document.documentElement.getAttribute('data-theme')).toBe('blue');
  });

  it('sets theme to dark', () => {
    service.setTheme('dark');
    expect(service.currentTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('persists theme to localStorage', () => {
    service.setTheme('dark');
    expect(localStorage.getItem('appTheme')).toBe('dark');
  });

  it('restores theme from localStorage on init', () => {
    localStorage.setItem('appTheme', 'kawaii');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.currentTheme()).toBe('kawaii');
  });

  it('removes data-theme attribute when switching back to default', () => {
    service.setTheme('blue');
    service.setTheme('default');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('defaults hideStartPageImages to false', () => {
    expect(service.hideStartPageImages()).toBeFalse();
  });

  it('sets hideStartPageImages and persists to localStorage', () => {
    service.setHideStartPageImages(true);
    expect(service.hideStartPageImages()).toBeTrue();
    expect(localStorage.getItem('hideStartPageImages')).toBe('true');
  });

  it('restores hideStartPageImages from localStorage', () => {
    localStorage.setItem('hideStartPageImages', 'true');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.hideStartPageImages()).toBeTrue();
  });

  it('defaults hideWeekCalendar to false', () => {
    expect(service.hideWeekCalendar()).toBeFalse();
  });

  it('sets hideWeekCalendar and persists to localStorage', () => {
    service.setHideWeekCalendar(true);
    expect(service.hideWeekCalendar()).toBeTrue();
    expect(localStorage.getItem('hideWeekCalendar')).toBe('true');
  });

  it('sets custom colors and applies CSS custom properties', () => {
    const colors: CustomColors = {
      primary: '#ff0000',
      grayPrimary: '#eeeeee',
      headerPrimary: '#ffffff',
      tableHeader: '#dddddd',
      arendeButton: '#00ff00',
    };
    service.setCustomColors(colors);
    expect(service.customColors()).toEqual(colors);
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#ff0000');
    expect(document.documentElement.style.getPropertyValue('--color-arende-button')).toBe('#00ff00');
  });

  it('persists custom colors to localStorage', () => {
    const colors: CustomColors = {
      primary: '#ff0000',
      grayPrimary: '#eeeeee',
      headerPrimary: '#ffffff',
      tableHeader: '#dddddd',
      arendeButton: '#00ff00',
    };
    service.setCustomColors(colors);
    expect(localStorage.getItem('appCustomColors')).toBe(JSON.stringify(colors));
  });

  it('applies custom colors on init when theme is custom', () => {
    const colors: CustomColors = {
      primary: '#123456',
      grayPrimary: '#eeeeee',
      headerPrimary: '#ffffff',
      tableHeader: '#dddddd',
      arendeButton: '#654321',
    };
    localStorage.setItem('appTheme', 'custom');
    localStorage.setItem('appCustomColors', JSON.stringify(colors));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    TestBed.inject(ThemeService);
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#123456');
  });

  it('clears CSS custom properties when switching from custom to another theme', () => {
    const colors: CustomColors = {
      primary: '#ff0000',
      grayPrimary: '#eeeeee',
      headerPrimary: '#ffffff',
      tableHeader: '#dddddd',
      arendeButton: '#00ff00',
    };
    service.setCustomColors(colors);
    service.setTheme('blue');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });

  it('restores custom colors from localStorage, merging with defaults', () => {
    localStorage.setItem('appCustomColors', JSON.stringify({ primary: '#aabbcc' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.customColors().primary).toBe('#aabbcc');
    expect(fresh.customColors().grayPrimary).toBe('#eff1f4');
  });

  it('returns default theme for unknown stored value', () => {
    localStorage.setItem('appTheme', 'invalid-theme');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.currentTheme()).toBe('default');
  });

  it('handles corrupt JSON in customColors localStorage gracefully', () => {
    localStorage.setItem('appCustomColors', 'not-valid-json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.customColors().primary).toBe('#00005a');
  });
});
