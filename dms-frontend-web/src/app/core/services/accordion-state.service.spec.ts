import { TestBed } from '@angular/core/testing';
import { AccordionStateService } from './accordion-state.service';

describe('AccordionStateService', () => {
  let service: AccordionStateService;
  const KEY = 'test-accordion';
  const DEFAULTS = { section1: true, section2: false };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AccordionStateService] });
    service = TestBed.inject(AccordionStateService);
  });

  describe('loadState', () => {
    it('returns defaults when nothing stored', () => {
      expect(service.loadState(KEY, DEFAULTS)).toEqual(DEFAULTS);
    });

    it('merges stored state over defaults', () => {
      localStorage.setItem(KEY, JSON.stringify({ section2: true }));
      const result = service.loadState(KEY, DEFAULTS);
      expect(result).toEqual({ section1: true, section2: true });
    });

    it('returns defaults on invalid JSON', () => {
      localStorage.setItem(KEY, 'not-json');
      expect(service.loadState(KEY, DEFAULTS)).toEqual(DEFAULTS);
    });

    it('preserves default keys not in stored state', () => {
      localStorage.setItem(KEY, JSON.stringify({ section1: false }));
      const result = service.loadState(KEY, DEFAULTS);
      expect(result['section2']).toBeFalse();
    });
  });

  describe('saveState', () => {
    it('persists state to localStorage', () => {
      service.saveState(KEY, { section1: false, section2: true });
      const stored = JSON.parse(localStorage.getItem(KEY)!);
      expect(stored).toEqual({ section1: false, section2: true });
    });

    it('overwrites existing stored state', () => {
      service.saveState(KEY, { section1: true, section2: false });
      service.saveState(KEY, { section1: false });
      const stored = JSON.parse(localStorage.getItem(KEY)!);
      expect(stored).toEqual({ section1: false });
    });
  });
});
