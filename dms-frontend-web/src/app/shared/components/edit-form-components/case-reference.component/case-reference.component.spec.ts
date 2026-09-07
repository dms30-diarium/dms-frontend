import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CaseReferenceComponent } from './case-reference.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import { Direction, NuxeoDocument, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { TableItem } from '@app/shared/models/case-table';
import { ArendeRefOption } from './case-reference.component';

function makeSearchResult(entries: NuxeoDocument[] = []): SearchResult {
  return {
    'entity-type': 'documents',
    isPaginable: true,
    resultsCount: entries.length,
    totalSize: entries.length,
    pageSize: entries.length,
    pageIndex: 0,
    pageCount: 1,
    entries,
  };
}

describe('CaseReferenceComponent', () => {
  let component: CaseReferenceComponent;
  let fixture: ComponentFixture<CaseReferenceComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let valueSpy: jasmine.SpyObj<DocumentValueService>;

  const makeRefSignal = (refs: ArendeRefOption[] = []) => signal(refs);

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'DMSDocumentSuggestion',
      'getSeveralDocsByUids',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult()));
    apiSpy.getSeveralDocsByUids.and.returnValue(of(makeSearchResult()));

    valueSpy = jasmine.createSpyObj('DocumentValueService', ['getDirectoryLabel', 'getDate']);
    valueSpy.getDirectoryLabel.and.returnValue('');
    valueSpy.getDate.and.returnValue('');

    await TestBed.configureTestingModule({
      imports: [CaseReferenceComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DocumentValueService, useValue: valueSpy },
      ],
    })
      .overrideTemplate(CaseReferenceComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CaseReferenceComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tableFields', makeRefSignal());
    fixture.componentRef.setInput('refType', 'Arende');
    fixture.componentRef.setInput('parentRef', 'parent-1');
    fixture.componentRef.setInput('fieldName', 'references');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getDirectorySuggestions for Referenstyp', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Referenstyp');
    });

    it('calls DMSDocumentSuggestion for parent ref', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Arende', 'Handling');
    });

    it('does not call getSeveralDocsByUids when refs is empty', () => {
      expect(apiSpy.getSeveralDocsByUids).not.toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('typeOptions defaults to empty array', () => {
      expect(component.typeOptions()).toEqual([]);
    });

    it('caseOptions defaults to empty array', () => {
      expect(component.caseOptions()).toEqual([]);
    });
  });

  describe('customColumnConfig computed', () => {
    it('generates Arende columns when refType is Arende', () => {
      const cols = component.customColumnConfig();
      const keys = cols.map(c => c.key);
      expect(keys).toContain('caseNumber');
      expect(keys).toContain('caseTitle');
    });

    it('generates Handling columns when refType is Handling', () => {
      fixture.componentRef.setInput('refType', 'Handling');
      fixture.detectChanges();
      const cols = component.customColumnConfig();
      const keys = cols.map(c => c.key);
      expect(keys).toContain('handlingNumber');
      expect(keys).toContain('handlingTitle');
    });

    it('sets tableName to REFERENCE_ARENDE for Arende type', () => {
      const cols = component.customColumnConfig();
      expect(cols.every(c => c.tableName === 'REFERENCE_ARENDE')).toBeTrue();
    });

    it('sets tableName to REFERENCE_HANDLING for Handling type', () => {
      fixture.componentRef.setInput('refType', 'Handling');
      fixture.detectChanges();
      const cols = component.customColumnConfig();
      expect(cols.every(c => c.tableName === 'REFERENCE_HANDLING')).toBeTrue();
    });
  });

  describe('addContact', () => {
    it('adds new ref to signal', () => {
      const refs = makeRefSignal([]);
      fixture.componentRef.setInput('tableFields', refs);
      fixture.detectChanges();
      component.addContact({ id: 'ref-1' }); // no caseRef so updateTableData skips API call
      expect(refs().length).toBe(1);
    });

    it('emits saveReferences', () => {
      let emitted = false;
      component.saveReferences.subscribe(() => (emitted = true));
      component.addContact({ id: 'ref-1' });
      expect(emitted).toBeTrue();
    });
  });

  describe('removeContact', () => {
    it('removes ref by id', () => {
      const refs = makeRefSignal([
        { id: 'ref-1', caseRef: 'case-1' },
        { id: 'ref-2', caseRef: 'case-2' },
      ]);
      fixture.componentRef.setInput('tableFields', refs);
      fixture.detectChanges();
      component.removeContact({ id: 'ref-1' });
      expect(refs().length).toBe(1);
      expect(refs()[0].id).toBe('ref-2');
    });

    it('does nothing when id not found', () => {
      const refs = makeRefSignal([{ id: 'ref-1', caseRef: 'case-1' }]);
      fixture.componentRef.setInput('tableFields', refs);
      fixture.detectChanges();
      component.removeContact({ id: 'ref-99' });
      expect(refs().length).toBe(1);
    });
  });

  describe('updateEditedData', () => {
    it('replaces refs with new items', () => {
      const refs = makeRefSignal([{ id: 'old' }]);
      fixture.componentRef.setInput('tableFields', refs);
      fixture.detectChanges();
      component.updateEditedData([{ id: 'new-1' }, { id: 'new-2' }] as TableItem[]);
      expect(refs().length).toBe(2);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns array with visible: true for each col', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.every(o => o.visible)).toBeTrue();
    });

    it('maps key to id', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts[0].id).toBe('caseNumber');
    });
  });

  describe('updateTableData', () => {
    it('calls getSeveralDocsByUids when refs have caseRef', () => {
      const refs = makeRefSignal([{ id: 'r1', caseRef: 'uid-1' }]);
      fixture.componentRef.setInput('tableFields', refs);
      fixture.detectChanges();
      apiSpy.getSeveralDocsByUids.calls.reset();
      component.updateTableData();
      expect(apiSpy.getSeveralDocsByUids).toHaveBeenCalledWith(['uid-1']);
    });

    it('does not call getSeveralDocsByUids when refs have no caseRef', () => {
      const refs = makeRefSignal([{ id: 'r1' }]);
      fixture.componentRef.setInput('tableFields', refs);
      fixture.detectChanges();
      apiSpy.getSeveralDocsByUids.calls.reset();
      component.updateTableData();
      expect(apiSpy.getSeveralDocsByUids).not.toHaveBeenCalled();
    });
  });

  describe('typeOptions', () => {
    it('populates from getDirectorySuggestions response', () => {
      apiSpy.getDirectorySuggestions.and.returnValue(
        of([{ id: 'ref-type-1', label: 'Referenstyp 1', displayLabel: 'Referenstyp 1' } as Direction])
      );
      component.ngOnInit();
      expect(component.typeOptions().length).toBe(1);
      expect(component.typeOptions()[0].id).toBe('ref-type-1');
    });
  });
});
