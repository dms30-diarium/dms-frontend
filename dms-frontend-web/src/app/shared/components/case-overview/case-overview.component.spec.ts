import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CaseOverviewComponent } from './case-overview.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CasesService } from '@app/core/services/cases.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { ArendeExtendedProperties } from '@app/shared/api/nuxeo-api.types';

describe('CaseOverviewComponent', () => {
  let component: CaseOverviewComponent;
  let fixture: ComponentFixture<CaseOverviewComponent>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getDirectorySuggestions']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(
      of([
        { id: 'person', displayLabel: 'Person' },
        { id: 'organisation', displayLabel: 'Organisation' },
      ])
    );
    const casesSpy = jasmine.createSpyObj('CasesService', ['getStatusColor', 'getStatusVariation', 'getStatusLabel']);

    await TestBed.configureTestingModule({
      imports: [CaseOverviewComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: CasesService, useValue: casesSpy },
      ],
    })
      .overrideTemplate(CaseOverviewComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CaseOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'case-1' }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('props', () => {
    it('exposes the document properties', () => {
      expect(component.props()).toEqual(component.doc().properties);
    });
  });

  describe('motpartTypeLabel', () => {
    it('resolves a label when arende:motpart/typ is a plain directory id string', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          properties: { 'arende:motpart': { typ: 'organisation', motpart: 'Acme AB' } as any },
        })
      );
      fixture.detectChanges();

      expect(component.motpartTypeLabel()).toBe('Organisation');
    });

    it('resolves a label when arende:motpart/typ is already a resolved {id} object', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          properties: { 'arende:motpart': { typ: { id: 'person' } as any, motpart: 'Jane Doe' } },
        })
      );
      fixture.detectChanges();

      expect(component.motpartTypeLabel()).toBe('Person');
    });

    it('returns an empty string when there is no motpart', () => {
      expect(component.motpartTypeLabel()).toBe('');
    });
  });

  describe('getDate', () => {
    it('formats a valid date string', () => {
      expect(typeof component.getDate('2026-06-15T00:00:00Z')).toBe('string');
    });

    it('handles null/undefined gracefully', () => {
      expect(typeof component.getDate(null)).toBe('string');
      expect(typeof component.getDate(undefined)).toBe('string');
    });
  });
});
