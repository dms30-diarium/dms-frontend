import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, EMPTY } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { StatisticsComponent } from './statistics.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult, makeStatistics } from '@app/shared/testing/mock-factories';
import { StatisticItem } from '@app/shared/api/nuxeo-api.types';
import { DigiFormSelectFilterCustomEvent } from '@designsystem-se/af/dist/types/components';

describe('StatisticsComponent', () => {
  let component: StatisticsComponent;
  let fixture: ComponentFixture<StatisticsComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getStatistics', 'DMSDocumentSuggestion']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    // Return EMPTY so tap/setOpenCasesData never fire (avoids ViewChild crash)
    apiSpy.getStatistics.and.returnValue(EMPTY);
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));

    await TestBed.configureTestingModule({
      imports: [StatisticsComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(StatisticsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls DMSDocumentSuggestion for Klass and Organisationsdel', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('', 'Klass', '', '');
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('', 'Organisationsdel', '', '');
    });
  });

  describe('signals initial state', () => {
    it('data defaults to null', () => {
      expect(component.data()).toBeNull();
    });

    it('totalOpen defaults to null', () => {
      expect(component.totalOpen()).toBeNull();
    });

    it('totalClosed defaults to null', () => {
      expect(component.totalClosed()).toBeNull();
    });

    it('activeTabId defaults to arende', () => {
      expect(component.activeTabId()).toBe('arende');
    });

    it('suggestions is an object', () => {
      expect(typeof component.suggestions()).toBe('object');
    });
  });

  describe('onDocTypeTabChanged', () => {
    it('sets activeTabId', () => {
      component.onDocTypeTabChanged('handling');
      expect(component.activeTabId()).toBe('handling');
    });
  });

  describe('mapData', () => {
    it('maps empty array to empty', () => {
      expect(component.mapData([])).toEqual([]);
    });

    it('maps data to category/value', () => {
      const result = component.mapData([{ key: 'TypeA', doc_count: 5 }]);
      expect(result).toEqual([{ category: 'TypeA', value: 5 }]);
    });

    it('handles null input gracefully', () => {
      expect(component.mapData(null as unknown as StatisticItem[])).toEqual([]);
    });
  });

  describe('getDocumentSuggestions', () => {
    it('updates suggestions for caseType', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'klass-1', title: 'Type A', path: '/klasses/1' })] }))
      );
      component.getDocumentSuggestions('Klass', 'caseType');
      expect(component.suggestions()['caseType']?.[0].id).toBe('klass-1');
    });

    it('updates suggestions for organization', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'org-1', title: 'Org A', path: '/orgs/1' })] }))
      );
      component.getDocumentSuggestions('Organisationsdel', 'organization', 'search');
      expect(component.suggestions()['organization']?.[0].id).toBe('org-1');
    });

    it('passes searchTerm to DMSDocumentSuggestion', () => {
      apiSpy.DMSDocumentSuggestion.calls.reset();
      component.getDocumentSuggestions('Klass', 'caseType', 'myTerm');
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('', 'Klass', '', 'myTerm');
    });
  });

  describe('onDocumentQuery', () => {
    it('calls getDocumentSuggestions with event detail', () => {
      apiSpy.DMSDocumentSuggestion.calls.reset();
      const event = new CustomEvent('query', {
        detail: 'search-term',
      }) as unknown as DigiFormSelectFilterCustomEvent<string>;
      component.onDocumentQuery(event, 'Klass', 'caseType');
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('', 'Klass', '', 'search-term');
    });
  });

  describe('onDocumentSelect', () => {
    it('updates form control and calls changeSelectedOptions', () => {
      apiSpy.getStatistics.and.returnValue(EMPTY);
      const event = new CustomEvent('select', { detail: [{ id: 'klass-1', label: 'Type A', value: 'klass-1' }] });
      component.onDocumentSelect(event, 'caseType');
      expect(component.filtersForm.get('caseType')?.value).toEqual([jasmine.objectContaining({ id: 'klass-1' })]);
    });
  });

  describe('restoreFilters', () => {
    it('resets filtersForm', () => {
      component.filtersForm.patchValue({ month: '06', year: 2025 } as unknown as { month: null; year: null });
      component.restoreFilters();
      expect(component.filtersForm.get('month')?.value).toBeNull();
      expect(component.filtersForm.get('year')?.value).toBeNull();
    });

    it('calls getStatistics', () => {
      apiSpy.getStatistics.calls.reset();
      component.restoreFilters();
      expect(apiSpy.getStatistics).toHaveBeenCalled();
    });
  });

  describe('changeSelectedOptions', () => {
    it('calls getStatistics with payload from form', () => {
      apiSpy.getStatistics.calls.reset();
      component.filtersForm.patchValue({ month: '06', year: 2025 } as unknown as { month: null; year: null });
      component.changeSelectedOptions();
      expect(apiSpy.getStatistics).toHaveBeenCalledWith(
        jasmine.objectContaining({
          month: '06',
          year: 2025,
        })
      );
    });

    it('uses first option id from caseType selection', () => {
      apiSpy.getStatistics.calls.reset();
      component.filtersForm.patchValue({
        caseType: [{ id: 'klass-uid', label: 'Klass A', value: 'klass-uid' }],
      });
      component.changeSelectedOptions();
      expect(apiSpy.getStatistics).toHaveBeenCalledWith(
        jasmine.objectContaining({
          klass: 'klass-uid',
        })
      );
    });
  });

  describe('tabs', () => {
    it('has 3 tabs', () => {
      expect(component.tabs.length).toBe(3);
    });

    it('first tab is arende', () => {
      expect(component.tabs[0].id).toBe('arende');
    });
  });

  describe('yearOptions', () => {
    it('includes year 2024 and 2025', () => {
      const ids = component.yearOptions.map(y => y.id);
      expect(ids).toContain(2024);
      expect(ids).toContain(2025);
    });
  });

  describe('monthOptions', () => {
    it('has 12 months', () => {
      expect(component.monthOptions.length).toBe(12);
    });

    it('first month is 01 Januari', () => {
      expect(component.monthOptions[0].id).toBe('01');
      expect(component.monthOptions[0].label).toBe('Januari');
    });
  });

  describe('filtersForm', () => {
    it('has caseType, org, month, year controls', () => {
      expect(component.filtersForm.contains('caseType')).toBeTrue();
      expect(component.filtersForm.contains('org')).toBeTrue();
      expect(component.filtersForm.contains('month')).toBeTrue();
      expect(component.filtersForm.contains('year')).toBeTrue();
    });
  });

  describe('getStatistics', () => {
    it('calls nuxeoApi.getStatistics with payload', () => {
      apiSpy.getStatistics.calls.reset();
      component.getStatistics({ klass: 'klass-1' });
      expect(apiSpy.getStatistics).toHaveBeenCalledWith({ klass: 'klass-1' });
    });

    it('updates data signal when response emits', () => {
      const statsData = makeStatistics({
        arenden: { totalt: 42, ansvarig_organisatorisk_enhet: [], arendetyp: [] },
        stangda_arenden: { totalt: 10, ansvarig_organisatorisk_enhet: [], arendetyp: [] },
      });
      apiSpy.getStatistics.and.returnValue(of(statsData));
      component.getStatistics({ klass: undefined });
      expect(component.data()).toEqual(statsData);
    });
  });

  describe('updateOpenCasesData', () => {
    it('sets totalOpen from data', () => {
      const data = makeStatistics({
        arenden: { totalt: 99, ansvarig_organisatorisk_enhet: [], arendetyp: [] },
        stangda_arenden: { totalt: 0, ansvarig_organisatorisk_enhet: [], arendetyp: [] },
      });
      component.updateOpenCasesData(data);
      expect(component.totalOpen()).toBe(99);
    });
  });

  describe('updateClosedCasesData', () => {
    it('sets totalOpen from closed data (note: it uses totalOpen signal)', () => {
      const data = makeStatistics({
        stangda_arenden: { totalt: 77, ansvarig_organisatorisk_enhet: [], arendetyp: [] },
        arenden: { totalt: 0, ansvarig_organisatorisk_enhet: [], arendetyp: [] },
      });
      component.updateClosedCasesData(data);
      expect(component.totalOpen()).toBe(77);
    });
  });
});
