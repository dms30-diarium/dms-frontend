import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AuditComponent } from './audit.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { SearchService } from '@app/core/services/search.service';
import { TableSortService } from '@app/core/services/table-sort.service';
import { makeAuditEntry, makeAuditLogEntries, makeUserSuggestion } from '@app/shared/testing/mock-factories';
import { Option } from '@app/shared/commonTypes';
import {
  AUDIT_LOAD_LOG_ERROR_MESSAGE,
  AUDIT_LOAD_USERS_ERROR_MESSAGE,
  AUDIT_LOAD_ACTIONS_ERROR_MESSAGE,
  AUDIT_LOAD_CATEGORIES_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';

describe('AuditComponent', () => {
  let component: AuditComponent;
  let fixture: ComponentFixture<AuditComponent>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let generalStoreSpy: jasmine.SpyObj<GeneralStore>;
  let searchServiceSpy: jasmine.SpyObj<SearchService>;
  let tableSortServiceSpy: jasmine.SpyObj<TableSortService>;
  let notificationSetSpy: jasmine.Spy;

  const defaultAuditLogEntries = makeAuditLogEntries({ entries: [], resultsCount: 0 });

  beforeEach(async () => {
    notificationSetSpy = jasmine.createSpy('set');

    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'queryAuditEntries',
      'getUserSuggestions',
      'getDirectorySuggestions',
    ]);
    nuxeoApiSpy.queryAuditEntries.and.returnValue(of(defaultAuditLogEntries));
    nuxeoApiSpy.getUserSuggestions.and.returnValue(of([]));
    nuxeoApiSpy.getDirectorySuggestions.and.returnValue(of([]));

    generalStoreSpy = jasmine.createSpyObj('GeneralStore', ['getValue'], {
      notification: { set: notificationSetSpy },
      navigationPanelContext: () => null,
      messagesInfo: () => null,
    });
    (generalStoreSpy.getValue as jasmine.Spy).and.returnValue(null);

    searchServiceSpy = jasmine.createSpyObj('SearchService', ['extractTerm']);
    searchServiceSpy.extractTerm.and.returnValue('');

    tableSortServiceSpy = jasmine.createSpyObj('TableSortService', ['applySortSignals']);

    await TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        FormBuilder,
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
        { provide: GeneralStore, useValue: generalStoreSpy },
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: TableSortService, useValue: tableSortServiceSpy },
      ],
    })
      .overrideTemplate(AuditComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(AuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call queryAuditEntries on init', () => {
      expect(nuxeoApiSpy.queryAuditEntries).toHaveBeenCalledWith(
        jasmine.objectContaining({ currentPageIndex: 0, pageSize: 40 })
      );
    });

    it('should call getUserSuggestions with empty string on init', () => {
      expect(nuxeoApiSpy.getUserSuggestions).toHaveBeenCalledWith('');
    });

    it('should call getDirectorySuggestions for eventTypes on init', () => {
      expect(nuxeoApiSpy.getDirectorySuggestions).toHaveBeenCalledWith(
        'eventTypes',
        jasmine.objectContaining({ lang: 'en' })
      );
    });

    it('should call getDirectorySuggestions for eventCategories on init', () => {
      expect(nuxeoApiSpy.getDirectorySuggestions).toHaveBeenCalledWith(
        'eventCategories',
        jasmine.objectContaining({ lang: 'en' })
      );
    });

    it('should set response signal after successful audit load', () => {
      const mockEntries = makeAuditLogEntries({ entries: [makeAuditEntry({ id: 1 })], resultsCount: 1 });
      nuxeoApiSpy.queryAuditEntries.and.returnValue(of(mockEntries));

      component.ngOnInit();

      expect(component.response()).toEqual(mockEntries);
    });

    it('should set loading to false after load completes', () => {
      nuxeoApiSpy.queryAuditEntries.and.returnValue(of(defaultAuditLogEntries));
      component.ngOnInit();
      expect(component.loading()).toBeFalse();
    });

    it('should re-run audit query when filters change with debounce', fakeAsync(() => {
      const callCountBefore = nuxeoApiSpy.queryAuditEntries.calls.count();

      component.filters.get('principalName')?.setValue([{ id: 'user-1', label: 'User One', value: 'user-1' }]);
      tick(300);

      expect(nuxeoApiSpy.queryAuditEntries.calls.count()).toBeGreaterThan(callCountBefore);
    }));
  });

  describe('onPageChange', () => {
    it('should update page signal', () => {
      component.onPageChange(3);
      expect(component.page()).toBe(3);
    });

    it('should call queryAuditEntries with the new page index', () => {
      nuxeoApiSpy.queryAuditEntries.calls.reset();
      component.onPageChange(2);
      expect(nuxeoApiSpy.queryAuditEntries).toHaveBeenCalledWith(jasmine.objectContaining({ currentPageIndex: 2 }));
    });
  });

  describe('onSortChange', () => {
    it('should delegate to tableSortService.applySortSignals', () => {
      const event = { sortBy: 'eventDate', sortOrder: 'asc' as const };
      component.onSortChange(event);
      expect(tableSortServiceSpy.applySortSignals).toHaveBeenCalledWith(
        component.sortBy,
        component.sortOrder,
        event,
        jasmine.objectContaining({ sortBy: '', sortOrder: 'desc' })
      );
    });

    it('should reset page to 0 after sort change', () => {
      component.page.set(5);
      component.onSortChange({ sortBy: 'eventDate', sortOrder: 'asc' });
      expect(component.page()).toBe(0);
    });

    it('should call queryAuditEntries with page 0 after sort change', () => {
      nuxeoApiSpy.queryAuditEntries.calls.reset();
      component.onSortChange({ sortBy: 'eventDate', sortOrder: 'asc' });
      expect(nuxeoApiSpy.queryAuditEntries).toHaveBeenCalledWith(jasmine.objectContaining({ currentPageIndex: 0 }));
    });
  });

  describe('rows computed signal', () => {
    it('should return empty array when response has no entries', () => {
      component.response.set(makeAuditLogEntries({ entries: [] }));
      expect(component.rows()).toEqual([]);
    });

    it('should map audit entries to table rows', () => {
      const entry = makeAuditEntry({
        id: 42,
        eventId: 'documentCreated',
        principalName: 'testuser',
        category: 'NuxeoTesting',
        eventDate: '2024-06-15T10:00:00Z',
        comment: 'Test comment',
        docPath: '/default-domain/doc',
      });
      component.response.set(makeAuditLogEntries({ entries: [entry] }));

      const rows = component.rows();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('42');
      expect(rows[0]['eventId']).toBe('documentCreated');
      expect(rows[0]['principalName']).toBe('testuser');
      expect(rows[0]['category']).toBe('NuxeoTesting');
      expect(rows[0]['comment']).toBe('Test comment');
      expect(rows[0]['document']).toBe('/default-domain/doc');
    });

    it('should use fallback dash for missing fields', () => {
      const entry = makeAuditEntry({ id: 1 });
      component.response.set(makeAuditLogEntries({ entries: [entry] }));
      const rows = component.rows();
      expect(rows[0]['eventId']).toBe('-');
      expect(rows[0]['principalName']).toBe('-');
      expect(rows[0]['category']).toBe('-');
      expect(rows[0]['comment']).toBe('-');
      expect(rows[0]['document']).toBe('-');
    });
  });

  describe('total computed signal', () => {
    it('should return 0 when response is null', () => {
      component.response.set(null);
      expect(component.total()).toBe(0);
    });

    it('should return 0 when entries are empty', () => {
      component.response.set(makeAuditLogEntries({ entries: [], resultsCount: 100 }));
      expect(component.total()).toBe(0);
    });

    it('should compute total from pageCount * pageSize', () => {
      const entry = makeAuditEntry({ id: 1 });
      component.response.set(makeAuditLogEntries({ entries: [entry], pageCount: 5, pageSize: 40, resultsCount: 200 }));
      expect(component.total()).toBe(200);
    });

    it('should fall back to resultsCount when no pageCount', () => {
      const entry = makeAuditEntry({ id: 1 });
      const log = makeAuditLogEntries({ entries: [entry], resultsCount: 73 });

      log.pageCount = undefined;
      log.pageSize = 0;
      component.response.set(log);
      expect(component.total()).toBe(73);
    });
  });

  describe('getSelectedOptions', () => {
    it('should return empty array when control is empty', () => {
      expect(component.getSelectedOptions('principalName')).toEqual([]);
    });

    it('should return valid Option items from principalName control', () => {
      const opt = { id: 'user-1', label: 'User One', value: 'user-1' };
      component.filters.get('principalName')?.setValue([opt]);
      expect(component.getSelectedOptions('principalName')).toEqual([opt]);
    });

    it('should filter out non-Option values from control', () => {
      component.filters
        .get('eventId')
        ?.setValue([{ id: 'act-1', label: 'Action One', value: 'act-1' }, null] as Option[]);
      const result = component.getSelectedOptions('eventId');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('act-1');
    });
  });

  describe('onUserSelect', () => {
    it('should set principalName form control from event detail array', () => {
      const opt = { id: 'user-2', label: 'User Two', value: 'user-2' };
      const event = new CustomEvent('select', { detail: [opt] });
      component.onUserSelect(event);
      expect(component.filters.get('principalName')?.value).toEqual([opt]);
    });

    it('should set principalName form control from single option in event detail', () => {
      const opt = { id: 'user-3', label: 'User Three', value: 'user-3' };
      const event = new CustomEvent('select', { detail: opt });
      component.onUserSelect(event);
      expect(component.filters.get('principalName')?.value).toEqual([opt]);
    });
  });

  describe('onActionSelect', () => {
    it('should set eventId form control from event detail', () => {
      const opt = { id: 'documentCreated', label: 'Document Created', value: 'documentCreated' };
      const event = new CustomEvent('select', { detail: [opt] });
      component.onActionSelect(event);
      expect(component.filters.get('eventId')?.value).toEqual([opt]);
    });
  });

  describe('onCategorySelect', () => {
    it('should set category form control from event detail', () => {
      const opt = { id: 'NuxeoTesting', label: 'Nuxeo Testing', value: 'NuxeoTesting' };
      const event = new CustomEvent('select', { detail: [opt] });
      component.onCategorySelect(event);
      expect(component.filters.get('category')?.value).toEqual([opt]);
    });
  });

  describe('onDateChange', () => {
    it('should set dateFrom control from event detail array', () => {
      const date = new Date('2024-01-01');
      const event = new CustomEvent<Date[]>('dateChange', { detail: [date] });
      component.onDateChange('dateFrom', event);
      expect(component.filters.get('dateFrom')?.value).toEqual(date);
    });

    it('should set dateTo control to null when detail is empty array', () => {
      const event = new CustomEvent<[]>('dateChange', { detail: [] });
      component.onDateChange('dateTo', event);
      expect(component.filters.get('dateTo')?.value).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set danger notification when queryAuditEntries fails', () => {
      nuxeoApiSpy.queryAuditEntries.and.returnValue(throwError(() => new Error('API error')));
      component.ngOnInit();
      expect(notificationSetSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: AUDIT_LOAD_LOG_ERROR_MESSAGE })
      );
    });

    it('should set response to null when queryAuditEntries fails', () => {
      nuxeoApiSpy.queryAuditEntries.and.returnValue(throwError(() => new Error('API error')));
      component.response.set(makeAuditLogEntries({ entries: [makeAuditEntry()] }));
      component.ngOnInit();
      expect(component.response()).toBeNull();
    });

    it('should set danger notification when getUserSuggestions fails', () => {
      nuxeoApiSpy.getUserSuggestions.and.returnValue(throwError(() => new Error('API error')));
      component.ngOnInit();
      expect(notificationSetSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: AUDIT_LOAD_USERS_ERROR_MESSAGE })
      );
    });

    it('should set danger notification when getDirectorySuggestions for actions fails', () => {
      (nuxeoApiSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((directory: string) => {
        if (directory === 'eventTypes') return throwError(() => new Error('API error'));
        return of([]);
      });
      component.ngOnInit();
      expect(notificationSetSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: AUDIT_LOAD_ACTIONS_ERROR_MESSAGE })
      );
    });

    it('should set danger notification when getDirectorySuggestions for categories fails', () => {
      (nuxeoApiSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((directory: string) => {
        if (directory === 'eventCategories') return throwError(() => new Error('API error'));
        return of([]);
      });
      component.ngOnInit();
      expect(notificationSetSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: AUDIT_LOAD_CATEGORIES_ERROR_MESSAGE })
      );
    });

    it('should set loading to false even when queryAuditEntries fails', () => {
      nuxeoApiSpy.queryAuditEntries.and.returnValue(throwError(() => new Error('API error')));
      component.ngOnInit();
      expect(component.loading()).toBeFalse();
    });
  });

  describe('userOptions signal', () => {
    it('should populate userOptions from getUserSuggestions response', () => {
      const user = makeUserSuggestion({ id: 'user-x', displayLabel: 'X User' });
      nuxeoApiSpy.getUserSuggestions.and.returnValue(of([user]));
      component.ngOnInit();
      const options = component.userOptions();
      expect(options.length).toBe(2);
      expect(options[1].id).toBe('user-x');
      expect(options[1].label).toBe('X User');
    });
  });

  describe('onUserQuery', () => {
    it('should call extractTerm and reload user options', () => {
      searchServiceSpy.extractTerm.and.returnValue('searchterm');
      component.onUserQuery({ detail: 'searchterm' });
      expect(searchServiceSpy.extractTerm).toHaveBeenCalled();
      expect(nuxeoApiSpy.getUserSuggestions).toHaveBeenCalledWith('searchterm');
    });
  });
});
