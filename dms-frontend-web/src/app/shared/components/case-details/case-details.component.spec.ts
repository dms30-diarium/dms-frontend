import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CaseDetailsComponent } from './case-details.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { ArendeExtendedProperties } from '@app/shared/api/nuxeo-api.types';

describe('CaseDetailsComponent', () => {
  let component: CaseDetailsComponent;
  let fixture: ComponentFixture<CaseDetailsComponent>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [CaseDetailsComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CaseDetailsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CaseDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'case-1' }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getDate', () => {
    it('formats a date value', () => {
      expect(typeof component.getDate('2026-06-15T00:00:00Z')).toBe('string');
    });
  });

  describe('getGallringsregelTitle', () => {
    it('returns an empty string when no gallringsforeskrift is set', () => {
      expect(component.getGallringsregelTitle()).toBe('');
    });

    it('returns the title when set', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.gallringsforeskrift]: makeNuxeoDocument({ title: 'Rule 1' }),
          } as never,
        })
      );
      expect(component.getGallringsregelTitle()).toBe('Rule 1');
    });
  });

  describe('getBeredningsbeslutTitle', () => {
    it('returns an empty string when not set', () => {
      expect(component.getBeredningsbeslutTitle()).toBe('');
    });

    it('returns the title when set', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.beredningsbeslut]: { title: 'Beslut 1' },
          } as never,
        })
      );
      expect(component.getBeredningsbeslutTitle()).toBe('Beslut 1');
    });
  });

  describe('shouldShowLagrum', () => {
    it('returns true when no sekretess is set', () => {
      expect(component.shouldShowLagrum()).toBeTrue();
    });

    it('returns false when sekretess label contains "ingen"', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.sekretess]: {
              'entity-type': 'directoryEntry',
              id: 'ingenSekretess',
              properties: { label: 'Ingen sekretess' },
            },
          } as never,
        })
      );
      expect(component.shouldShowLagrum()).toBeFalse();
    });

    it('returns false when sekretess id contains "ej"', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.sekretess]: { 'entity-type': 'directoryEntry', id: 'ejKlassad' },
          } as never,
        })
      );
      expect(component.shouldShowLagrum()).toBeFalse();
    });

    it('returns true for a real secrecy classification', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.sekretess]: {
              'entity-type': 'directoryEntry',
              id: 'starkSekretess',
              properties: { label: 'Stark sekretess' },
            },
          } as never,
        })
      );
      expect(component.shouldShowLagrum()).toBeTrue();
    });
  });
});
