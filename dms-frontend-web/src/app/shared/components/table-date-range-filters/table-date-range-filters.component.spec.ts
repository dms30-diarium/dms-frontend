import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { TableDateRangeFiltersComponent } from './table-date-range-filters.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';

const COL_RANGE = { label: 'Datum', sortField: 'dc:created' };
const COL_SINGLE = { label: 'Registrerat', sortField: 'arende:registrerat', mode: 'single' as const };

describe('TableDateRangeFiltersComponent', () => {
  let component: TableDateRangeFiltersComponent;
  let fixture: ComponentFixture<TableDateRangeFiltersComponent>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [TableDateRangeFiltersComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(TableDateRangeFiltersComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(TableDateRangeFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signals initial state', () => {
    it('isDialogOpen defaults to false', () => {
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('quickRange defaults to empty string', () => {
      expect(component.quickRange()).toBe('');
    });

    it('hasAnySelection defaults to false', () => {
      expect(component.hasAnySelection()).toBeFalse();
    });
  });

  describe('openDialog', () => {
    it('sets isDialogOpen to true', () => {
      component.openDialog();
      expect(component.isDialogOpen()).toBeTrue();
    });
  });

  describe('closeDialog', () => {
    it('sets isDialogOpen to false', () => {
      component.openDialog();
      component.closeDialog();
      expect(component.isDialogOpen()).toBeFalse();
    });
  });

  describe('reset', () => {
    it('closes dialog', () => {
      component.openDialog();
      component.reset();
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('clears hasAnySelection after dates were set', () => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
      const event = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-01-01')] });
      component.onDateChange(event, COL_RANGE, 'from');
      expect(component.hasAnySelection()).toBeTrue();
      component.reset();
      expect(component.hasAnySelection()).toBeFalse();
    });
  });

  describe('isSingleDate', () => {
    it('returns true when mode is single', () => {
      expect(component.isSingleDate(COL_SINGLE)).toBeTrue();
    });

    it('returns false when mode is range', () => {
      expect(component.isSingleDate(COL_RANGE)).toBeFalse();
    });

    it('returns false when mode is undefined', () => {
      expect(component.isSingleDate({ label: 'Test', sortField: 'test' })).toBeFalse();
    });
  });

  describe('getInputId', () => {
    it('generates unique ID from column and edge', () => {
      const id = component.getInputId(COL_RANGE, 'from');
      expect(id).toContain('table-date-range');
      expect(id).toContain('from');
    });

    it('generates different IDs for from and to', () => {
      const fromId = component.getInputId(COL_RANGE, 'from');
      const toId = component.getInputId(COL_RANGE, 'to');
      expect(fromId).not.toBe(toId);
    });
  });

  describe('onDateChange', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
    });

    it('sets hasAnySelection to true when date is provided', () => {
      const event = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-06-15')] });
      component.onDateChange(event, COL_RANGE, 'from');
      expect(component.hasAnySelection()).toBeTrue();
    });

    it('clears selection when empty date detail', () => {
      const setEvent = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-06-15')] });
      component.onDateChange(setEvent, COL_RANGE, 'from');
      const clearEvent = new CustomEvent<Date[]>('dateChange', { detail: [] });
      component.onDateChange(clearEvent, COL_RANGE, 'from');
      expect(component.hasAnySelection()).toBeFalse();
    });
  });

  describe('getDateSelection', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
    });

    it('returns empty array when no date set', () => {
      expect(component.getDateSelection(COL_RANGE, 'from')).toEqual([]);
    });

    it('returns Date array when date was set', () => {
      const event = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-06-15')] });
      component.onDateChange(event, COL_RANGE, 'from');
      const selection = component.getDateSelection(COL_RANGE, 'from');
      expect(selection.length).toBe(1);
      expect(selection[0]).toBeInstanceOf(Date);
    });
  });

  describe('clearDate', () => {
    it('clears specific date without affecting others', () => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
      const fromEvent = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-01-01')] });
      const toEvent = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-12-31')] });
      component.onDateChange(fromEvent, COL_RANGE, 'from');
      component.onDateChange(toEvent, COL_RANGE, 'to');
      component.clearDate(COL_RANGE, 'from');
      expect(component.getDateSelection(COL_RANGE, 'from')).toEqual([]);
      expect(component.getDateSelection(COL_RANGE, 'to').length).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('clears all dates for all columns', () => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE, COL_SINGLE]);
      fixture.detectChanges();
      const event = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-06-15')] });
      component.onDateChange(event, COL_RANGE, 'from');
      component.onDateChange(event, COL_SINGLE, 'from');
      component.clearAll();
      expect(component.hasAnySelection()).toBeFalse();
    });
  });

  describe('applyFilters', () => {
    it('emits dateRangeChange for each column', () => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
      const fromEvent = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-01-01')] });
      component.onDateChange(fromEvent, COL_RANGE, 'from');

      const emitted: { field: string; value: string }[] = [];
      component.dateRangeChange.subscribe(e => emitted.push(e));
      component.applyFilters();
      expect(emitted.length).toBeGreaterThanOrEqual(1);
    });

    it('closes dialog after applying', () => {
      component.openDialog();
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
      component.applyFilters();
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('emits field with _min suffix for range columns', () => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
      const fromEvent = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-01-01')] });
      component.onDateChange(fromEvent, COL_RANGE, 'from');

      const emitted: { field: string; value: string }[] = [];
      component.dateRangeChange.subscribe(e => emitted.push(e));
      component.applyFilters();
      const minEmit = emitted.find(e => e.field.includes('_min'));
      expect(minEmit).toBeTruthy();
    });

    it('emits dc_created as dublincore_created alias', () => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.detectChanges();
      const fromEvent = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-01-01')] });
      component.onDateChange(fromEvent, COL_RANGE, 'from');

      const emitted: { field: string; value: string }[] = [];
      component.dateRangeChange.subscribe(e => emitted.push(e));
      component.applyFilters();
      expect(emitted.some(e => e.field.startsWith('dublincore_created'))).toBeTrue();
    });

    it('emits base field without suffix for single mode columns', () => {
      fixture.componentRef.setInput('dateColumns', [COL_SINGLE]);
      fixture.detectChanges();
      const fromEvent = new CustomEvent<Date[]>('dateChange', { detail: [new Date('2024-01-01')] });
      component.onDateChange(fromEvent, COL_SINGLE, 'from');

      const emitted: { field: string; value: string }[] = [];
      component.dateRangeChange.subscribe(e => emitted.push(e));
      component.applyFilters();
      expect(emitted.some(e => !e.field.includes('_min') && !e.field.includes('_max'))).toBeTrue();
    });
  });

  describe('dateRangeSelection input effect', () => {
    it('syncs selection from external dateRangeSelection', () => {
      fixture.componentRef.setInput('dateColumns', [COL_RANGE]);
      fixture.componentRef.setInput('dateRangeSelection', { dublincore_created_min: '2024-01-01' });
      fixture.detectChanges();
      expect(component.hasAnySelection()).toBeTrue();
    });
  });
});
