import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { CaseCardComponent } from './case-card.component';
import { CasesService } from '@app/core/services/cases.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableItem } from '@app/shared/models/case-table';

function makeColumn(overrides: Partial<TableColumn> = {}): TableColumn {
  return {
    tableName: 'test',
    key: 'title',
    label: 'Title',
    visible: true,
    id: 'title',
    ...overrides,
  } as TableColumn;
}

function makeItem(overrides: Record<string, unknown> = {}): TableItem {
  return {
    title: 'Test Case',
    status: 'Open',
    created: '2024-01-01',
    ...overrides,
  } as unknown as TableItem;
}

describe('CaseCardComponent', () => {
  let component: CaseCardComponent;
  let fixture: ComponentFixture<CaseCardComponent>;
  let casesServiceSpy: jasmine.SpyObj<CasesService>;
  let storeSpy: { notification: { set: jasmine.Spy }; navigationPanelContext: () => null; getValue: jasmine.Spy };

  beforeEach(async () => {
    casesServiceSpy = jasmine.createSpyObj('CasesService', ['getStatusColor', 'getStatusVariation', 'getStatusLabel']);
    (casesServiceSpy.getStatusColor as jasmine.Spy).and.returnValue('approved');
    (casesServiceSpy.getStatusVariation as jasmine.Spy).and.returnValue('primary');
    casesServiceSpy.getStatusLabel.and.returnValue('Open');

    storeSpy = {
      notification: { set: jasmine.createSpy('set') },
      navigationPanelContext: () => null,
      getValue: jasmine.createSpy('getValue').and.returnValue(''),
    };

    await TestBed.configureTestingModule({
      imports: [CaseCardComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CasesService, useValue: casesServiceSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    })
      .overrideTemplate(CaseCardComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CaseCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('usesLegacyCaseLayout', () => {
    it('returns true for my-cases tab', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      expect(component.usesLegacyCaseLayout()).toBeTrue();
    });

    it('returns true for my-co-handled-cases tab', () => {
      fixture.componentRef.setInput('tab', 'my-co-handled-cases');
      expect(component.usesLegacyCaseLayout()).toBeTrue();
    });

    it('returns false for other tabs', () => {
      fixture.componentRef.setInput('tab', 'other-tab');
      expect(component.usesLegacyCaseLayout()).toBeFalse();
    });

    it('returns false for empty tab', () => {
      fixture.componentRef.setInput('tab', '');
      expect(component.usesLegacyCaseLayout()).toBeFalse();
    });
  });

  describe('getTitleColumn', () => {
    it('returns null when using legacy layout', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', asLink: true })]);
      expect(component.getTitleColumn()).toBeNull();
    });

    it('returns column with asLink=true when not legacy', () => {
      fixture.componentRef.setInput('tab', 'other');
      const linkCol = makeColumn({ key: 'title', asLink: true });
      fixture.componentRef.setInput('columns', [linkCol]);
      const result = component.getTitleColumn();
      expect(result?.key).toBe('title');
      expect(result?.asLink).toBeTrue();
    });

    it('returns column with key=title when no asLink column', () => {
      fixture.componentRef.setInput('tab', 'other');
      const titleCol = makeColumn({ key: 'title', asLink: false });
      fixture.componentRef.setInput('columns', [titleCol]);
      const result = component.getTitleColumn();
      expect(result?.key).toBe('title');
    });

    it('returns null when no matching column', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'status', asLink: false })]);
      expect(component.getTitleColumn()).toBeNull();
    });
  });

  describe('getTitle', () => {
    it('returns empty string when no caseData', () => {
      fixture.componentRef.setInput('caseData', null);
      fixture.componentRef.setInput('tab', 'other');
      expect(component.getTitle()).toBe('');
    });

    it('returns value from titleColumn when available', () => {
      const col = makeColumn({ key: 'title', asLink: true });
      fixture.componentRef.setInput('columns', [col]);
      fixture.componentRef.setInput('caseData', makeItem({ title: 'MyTitle' }));
      fixture.componentRef.setInput('tab', 'other');
      expect(component.getTitle()).toBe('MyTitle');
    });

    it('returns item title as string when no titleColumn (legacy layout)', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ title: 'Legacy Title' }));
      expect(component.getTitle()).toBe('Legacy Title');
    });

    it('returns empty string when title is undefined and no titleColumn', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ title: undefined }));
      expect(component.getTitle()).toBe('');
    });
  });

  describe('getHeaderDate', () => {
    it('returns created field for legacy layout', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ created: '2024-01-01' }));
      expect(component.getHeaderDate()).toBe('2024-01-01');
    });

    it('returns empty string when created is undefined in legacy layout', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ created: undefined }));
      expect(component.getHeaderDate()).toBe('');
    });

    it('returns date column value for non-legacy layout', () => {
      fixture.componentRef.setInput('tab', 'other');
      const dateCol = makeColumn({ key: 'registrationDate', searchInputType: 'date' });
      fixture.componentRef.setInput('columns', [dateCol]);
      fixture.componentRef.setInput('caseData', makeItem({ registrationDate: '2024-06-01' }));
      expect(component.getHeaderDate()).toBe('2024-06-01');
    });

    it('returns empty string when no date column in non-legacy layout', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', searchInputType: 'search' })]);
      fixture.componentRef.setInput('caseData', makeItem());
      expect(component.getHeaderDate()).toBe('');
    });

    it('detects date column by "datum" in key', () => {
      fixture.componentRef.setInput('tab', 'other');
      const datumCol = makeColumn({ key: 'atgardDatum', searchInputType: 'search' });
      fixture.componentRef.setInput('columns', [datumCol]);
      fixture.componentRef.setInput('caseData', makeItem({ atgardDatum: '2024-03-01' }));
      expect(component.getHeaderDate()).toBe('2024-03-01');
    });

    it('detects date column by key=created', () => {
      fixture.componentRef.setInput('tab', 'other');
      const createdCol = makeColumn({ key: 'created', searchInputType: 'search' });
      fixture.componentRef.setInput('columns', [createdCol]);
      fixture.componentRef.setInput('caseData', makeItem({ created: '2024-05-01' }));
      expect(component.getHeaderDate()).toBe('2024-05-01');
    });
  });

  describe('getCardFields', () => {
    it('excludes title and status columns, returns up to 6', () => {
      fixture.componentRef.setInput('tab', 'other');
      const cols = [
        makeColumn({ key: 'title', asLink: true, id: 'title' }),
        makeColumn({ key: 'status', id: 'status' }),
        makeColumn({ key: 'field1', id: 'field1' }),
        makeColumn({ key: 'field2', id: 'field2' }),
      ];
      fixture.componentRef.setInput('columns', cols);
      fixture.componentRef.setInput('caseData', makeItem({ status: 'Open' }));
      const fields = component.getCardFields();
      const keys = fields.map(f => f.key);
      expect(keys).not.toContain('title');
      expect(keys).not.toContain('status');
      expect(keys).toContain('field1');
      expect(keys).toContain('field2');
    });

    it('returns at most 6 fields', () => {
      fixture.componentRef.setInput('tab', 'other');
      const cols = Array.from({ length: 10 }, (_, i) => makeColumn({ key: `field${i}`, id: `field${i}` }));
      fixture.componentRef.setInput('columns', cols);
      fixture.componentRef.setInput('caseData', makeItem());
      expect(component.getCardFields().length).toBeLessThanOrEqual(6);
    });
  });

  describe('getCaseStatus', () => {
    it('returns arendestatus for legacy layout', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ arendestatus: 'Pågående' }));
      expect(component.getCaseStatus()).toBe('Pågående');
    });

    it('falls back to status for legacy layout', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ status: 'Closed' }));
      expect(component.getCaseStatus()).toBe('Closed');
    });

    it('falls back to handlaggningsstatus for legacy layout', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput(
        'caseData',
        makeItem({ status: undefined, handlaggningsstatus: 'Under behandling' })
      );
      expect(component.getCaseStatus()).toBe('Under behandling');
    });

    it('returns trimmed value from statusColumn for non-legacy layout', () => {
      fixture.componentRef.setInput('tab', 'other');
      const statusCol = makeColumn({ key: 'status', id: 'status' });
      fixture.componentRef.setInput('columns', [statusCol]);
      fixture.componentRef.setInput('caseData', makeItem({ status: 'Active ' }));
      expect(component.getCaseStatus()).toBe('Active');
    });

    it('returns state for Utkast type when no status column', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', id: 'title' })]);
      fixture.componentRef.setInput('caseData', makeItem({ type: 'Utkast', state: 'draft' }));
      expect(component.getCaseStatus()).toBe('draft');
    });

    it('returns state for MailMessage type when no status column', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', id: 'title' })]);
      fixture.componentRef.setInput('caseData', makeItem({ type: 'MailMessage', state: 'inbox' }));
      expect(component.getCaseStatus()).toBe('inbox');
    });

    it('returns state for Importorfil type when no status column', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', id: 'title' })]);
      fixture.componentRef.setInput('caseData', makeItem({ type: 'Importorfil', state: 'processing' }));
      expect(component.getCaseStatus()).toBe('processing');
    });

    it('falls back to arendestatus for non-legacy, no status column, non-state type', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', id: 'title' })]);
      fixture.componentRef.setInput('caseData', makeItem({ type: 'Arende', arendestatus: 'Pågående' }));
      expect(component.getCaseStatus()).toBe('Pågående');
    });

    it('returns empty string when no status found', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', id: 'title' })]);
      fixture.componentRef.setInput('caseData', makeItem({ type: 'Arende', status: undefined }));
      expect(component.getCaseStatus()).toBe('');
    });

    it('returns empty string when caseData is null in non-legacy layout', () => {
      fixture.componentRef.setInput('tab', 'other');
      fixture.componentRef.setInput('columns', [makeColumn({ key: 'title', id: 'title' })]);
      fixture.componentRef.setInput('caseData', null);
      expect(component.getCaseStatus()).toBe('');
    });
  });

  describe('getCaseStatusColor', () => {
    it('delegates to casesService.getStatusColor', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ arendestatus: 'Open' }));
      component.getCaseStatusColor();
      expect(casesServiceSpy.getStatusColor).toHaveBeenCalledWith('Open');
    });
  });

  describe('getCaseStatusVariation', () => {
    it('delegates to casesService.getStatusVariation', () => {
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ arendestatus: 'Open' }));
      component.getCaseStatusVariation();
      expect(casesServiceSpy.getStatusVariation).toHaveBeenCalledWith('Open');
    });
  });

  describe('getCaseStatusLabel', () => {
    it('returns label from casesService', () => {
      (casesServiceSpy.getStatusLabel as jasmine.Spy).and.returnValue('Open Label');
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ arendestatus: 'Open' }));
      expect(component.getCaseStatusLabel()).toBe('Open Label');
    });

    it('returns empty string when casesService returns falsy', () => {
      (casesServiceSpy.getStatusLabel as jasmine.Spy).and.returnValue('');
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.componentRef.setInput('caseData', makeItem({ arendestatus: '' }));
      expect(component.getCaseStatusLabel()).toBe('');
    });
  });

  describe('openDocument', () => {
    it('navigates to /doc/:uid when uid is provided', () => {
      const router = TestBed.inject(Router);
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openDocument('abc-123');
      expect(navSpy).toHaveBeenCalledWith(['/doc/', 'abc-123']);
    });

    it('does nothing when uid is empty', () => {
      const router = TestBed.inject(Router);
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openDocument('');
      expect(navSpy).not.toHaveBeenCalled();
    });
  });

  describe('getValue', () => {
    it('returns empty string when caseData is null', () => {
      fixture.componentRef.setInput('caseData', null);
      const col = makeColumn({ key: 'title' });
      expect(component.getValue(col)).toBe('');
    });

    it('returns em-dash for null value', () => {
      fixture.componentRef.setInput('caseData', makeItem({ title: null }));
      const col = makeColumn({ key: 'title' });
      expect(component.getValue(col)).toBe('—');
    });

    it('returns em-dash for empty string value', () => {
      fixture.componentRef.setInput('caseData', makeItem({ title: '' }));
      const col = makeColumn({ key: 'title' });
      expect(component.getValue(col)).toBe('—');
    });

    it('returns first element of array value', () => {
      fixture.componentRef.setInput('caseData', makeItem({ tags: ['a', 'b', 'c'] }));
      const col = makeColumn({ key: 'tags' });
      expect(component.getValue(col)).toBe('a');
    });

    it('returns em-dash for empty array', () => {
      fixture.componentRef.setInput('caseData', makeItem({ tags: [] }));
      const col = makeColumn({ key: 'tags' });
      expect(component.getValue(col)).toBe('—');
    });

    it('uses formatter when provided', () => {
      const item = makeItem({ dueDate: '2024-01-01' });
      fixture.componentRef.setInput('caseData', item);
      const col = makeColumn({
        key: 'dueDate',
        formatter: (val: unknown) => `formatted: ${val}`,
      });
      expect(component.getValue(col)).toBe('formatted: 2024-01-01');
    });

    it('returns string value as-is', () => {
      fixture.componentRef.setInput('caseData', makeItem({ title: 'Hello' }));
      const col = makeColumn({ key: 'title' });
      expect(component.getValue(col)).toBe('Hello');
    });
  });

  describe('hidden columns are excluded from visible columns', () => {
    it('excludes column with visible=false from title column search', () => {
      fixture.componentRef.setInput('tab', 'other');
      const hiddenCol = makeColumn({ key: 'title', asLink: true, visible: false });
      fixture.componentRef.setInput('columns', [hiddenCol]);
      expect(component.getTitleColumn()).toBeNull();
    });

    it('excludes actions column from visible columns', () => {
      fixture.componentRef.setInput('tab', 'other');
      const actionsCol = makeColumn({ key: 'actions', id: 'actions' });
      const titleCol = makeColumn({ key: 'title', id: 'title' });
      fixture.componentRef.setInput('columns', [actionsCol, titleCol]);
      const result = component.getTitleColumn();
      expect(result?.key).toBe('title');
    });
  });
});
