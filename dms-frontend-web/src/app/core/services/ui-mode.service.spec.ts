import { TestBed } from '@angular/core/testing';
import { UiModeService } from './ui-mode.service';

describe('UiModeService', () => {
  let service: UiModeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [UiModeService] });
    service = TestBed.inject(UiModeService);
  });

  it('defaults to standard mode when nothing stored', () => {
    expect(service.mode()).toBe('standard');
  });

  it('isSimplified is false in standard mode', () => {
    expect(service.isSimplified()).toBeFalse();
  });

  it('sets mode to simplified', () => {
    service.setMode('simplified');
    expect(service.mode()).toBe('simplified');
    expect(service.isSimplified()).toBeTrue();
  });

  it('persists mode to localStorage', () => {
    service.setMode('simplified');
    expect(localStorage.getItem('uiMode')).toBe('simplified');
  });

  it('restores mode from localStorage on init', () => {
    localStorage.setItem('uiMode', 'simplified');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [UiModeService] });
    const fresh = TestBed.inject(UiModeService);
    expect(fresh.mode()).toBe('simplified');
  });

  it('switches back to standard mode', () => {
    service.setMode('simplified');
    service.setMode('standard');
    expect(service.mode()).toBe('standard');
    expect(service.isSimplified()).toBeFalse();
  });
});
