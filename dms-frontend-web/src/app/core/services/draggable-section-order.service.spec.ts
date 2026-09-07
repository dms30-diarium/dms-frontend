import { TestBed } from '@angular/core/testing';
import { DraggableSectionOrderService } from './draggable-section-order.service';

type Section = 'a' | 'b' | 'c' | 'd';
const STORAGE_KEY = 'test-sections';
const DEFAULT_ORDER: readonly Section[] = ['a', 'b', 'c', 'd'];

describe('DraggableSectionOrderService', () => {
  let service: DraggableSectionOrderService;
  const defaultOrder: readonly Section[] = DEFAULT_ORDER;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DraggableSectionOrderService] });
    service = TestBed.inject(DraggableSectionOrderService);
  });

  describe('loadOrder', () => {
    it('returns copy of defaultOrder when nothing stored', () => {
      const result = service.loadOrder(STORAGE_KEY, defaultOrder);
      expect(result).toEqual(['a', 'b', 'c', 'd']);
    });

    it('returns stored order when valid', () => {
      service.saveOrder(STORAGE_KEY, ['c', 'b', 'a', 'd']);
      expect(service.loadOrder(STORAGE_KEY, defaultOrder)).toEqual(['c', 'b', 'a', 'd']);
    });

    it('filters out unknown sections from storage', () => {
      localStorage.setItem(STORAGE_KEY, 'x,y,a,b');
      const result = service.loadOrder<string>('test-sections', ['a', 'b', 'c', 'd']);
      expect(result.includes('x')).toBeFalse();
      expect(result.includes('y')).toBeFalse();
      expect(result.includes('a')).toBeTrue();
    });

    it('appends missing sections at end', () => {
      localStorage.setItem(STORAGE_KEY, 'a,b');
      const result = service.loadOrder(STORAGE_KEY, defaultOrder);
      expect(result).toContain('c');
      expect(result).toContain('d');
    });

    it('returns default order for empty string in storage', () => {
      localStorage.setItem(STORAGE_KEY, '');
      const result = service.loadOrder(STORAGE_KEY, defaultOrder);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('saveOrder', () => {
    it('persists order in localStorage', () => {
      service.saveOrder(STORAGE_KEY, ['d', 'c', 'b', 'a']);
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBe('d,c,b,a');
    });
  });

  describe('visibleSections', () => {
    it('returns only sections where predicate is true', () => {
      const visible = service.visibleSections(defaultOrder, s => s !== 'b');
      expect(visible).toEqual(['a', 'c', 'd']);
    });

    it('returns empty array when none visible', () => {
      expect(service.visibleSections(defaultOrder, () => false)).toEqual([]);
    });

    it('returns all when all visible', () => {
      expect(service.visibleSections(defaultOrder, () => true)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('reorderSections', () => {
    it('reorders visible sections correctly', () => {
      const isVisible = (_s: Section) => true;
      const result = service.reorderSections(defaultOrder, isVisible, 0, 2);
      expect(result[2]).toBe('a');
    });

    it('preserves invisible sections in their original positions', () => {
      const isVisible = (s: Section) => s !== 'b';
      const result = service.reorderSections(defaultOrder, isVisible, 0, 1);
      expect(result[1]).toBe('b');
    });

    it('does not mutate original order', () => {
      const order: Section[] = ['a', 'b', 'c', 'd'];
      const original = [...order];
      service.reorderSections(order, () => true, 0, 3);
      expect(order).toEqual(original);
    });
  });
});
