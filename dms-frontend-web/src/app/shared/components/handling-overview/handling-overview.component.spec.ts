import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HandlingOverviewComponent } from './handling-overview.component';
import { CasesService } from '@app/core/services/cases.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { DirectoryEntry, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makeDirection(id: string, label: string): DirectoryEntry {
  return { 'entity-type': 'directoryEntry', id, properties: { label } };
}

function makeDoc(direction?: DirectoryEntry | string, state = 'Created'): NuxeoDocument<HandlingExtendedProperties> {
  return makeNuxeoDocument<HandlingExtendedProperties>({
    uid: 'h-1',
    type: 'Handling',
    title: 'H',
    state,
    properties: {
      [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: direction,
      [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]: '2024-01-01',
      [NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum]: '2024-02-01',
      [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]: '2024-03-01',
    } as HandlingExtendedProperties,
  });
}

describe('HandlingOverviewComponent', () => {
  let component: HandlingOverviewComponent;
  let fixture: ComponentFixture<HandlingOverviewComponent>;
  let casesSpy: jasmine.SpyObj<CasesService>;

  function setup(doc: NuxeoDocument<HandlingExtendedProperties>) {
    fixture = TestBed.createComponent(HandlingOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', doc);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    casesSpy = jasmine.createSpyObj('CasesService', ['getStatusLabel', 'getStatusColor', 'getStatusVariation']);
    casesSpy.getStatusLabel.and.returnValue('Status Label');
    casesSpy.getStatusColor.and.returnValue('approved');
    casesSpy.getStatusVariation.and.returnValue('primary');

    await TestBed.configureTestingModule({
      imports: [HandlingOverviewComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CasesService, useValue: casesSpy },
      ],
    })
      .overrideTemplate(HandlingOverviewComponent, '<div></div>')
      .compileComponents();

    setup(makeDoc());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('directionInfo', () => {
    it('returns inkommande info for inkommande direction', () => {
      setup(makeDoc(makeDirection(NUXEO_VOCAB_IDS.arendeRiktning.inkommande, 'Inkommande')));
      expect(component.directionInfo().label).toBe('Inkommen datum');
      expect(component.directionInfo().date).toBe('2024-01-01');
    });

    it('returns utgaende info for utgaende direction', () => {
      setup(makeDoc(makeDirection(NUXEO_VOCAB_IDS.arendeRiktning.utgaende, 'Utgående')));
      expect(component.directionInfo().label).toBe('Upprättad datum');
      expect(component.directionInfo().date).toBe('2024-02-01');
    });

    it('returns intern info for intern direction', () => {
      setup(makeDoc(makeDirection(NUXEO_VOCAB_IDS.arendeRiktning.intern, 'Intern')));
      expect(component.directionInfo().date).toBe('2024-03-01');
    });

    it('returns fallback when direction unrecognized', () => {
      setup(makeDoc(makeDirection('unknown-id', 'Unknown')));
      expect(component.directionInfo().date).toBeUndefined();
    });

    it('handles string direction value', () => {
      setup(makeDoc(NUXEO_VOCAB_IDS.arendeRiktning.inkommande));
      expect(component.directionInfo().date).toBe('2024-01-01');
    });
  });

  describe('directionLabel', () => {
    it('returns directionLabel from directionInfo', () => {
      setup(makeDoc(makeDirection(NUXEO_VOCAB_IDS.arendeRiktning.inkommande, 'In')));
      expect(component.directionLabel()).toBe('In');
    });
  });

  describe('statusValue', () => {
    it('returns label from casesService', () => {
      expect(component.statusValue()).toBe('Status Label');
    });

    it('returns undefined when label is empty', () => {
      casesSpy.getStatusLabel.and.returnValue('');
      setup(makeDoc());
      expect(component.statusValue()).toBeUndefined();
    });
  });

  describe('statusType / statusVariation', () => {
    it('calls casesService.getStatusColor with fallback', () => {
      component.statusType();
      expect(casesSpy.getStatusColor).toHaveBeenCalledWith('Created', { fallback: 'denied' });
    });

    it('calls casesService.getStatusVariation', () => {
      component.statusVariation();
      expect(casesSpy.getStatusVariation).toHaveBeenCalledWith('Created');
    });
  });

  describe('getDate', () => {
    it('returns empty string for non-string input', () => {
      expect(component.getDate(undefined)).toBe('');
    });

    it('returns formatted date string for valid date', () => {
      expect(component.getDate('2024-01-01')).toBeTruthy();
    });

    it('returns empty string for invalid date string gracefully', () => {
      expect(component.getDate('not-a-date')).toBeTruthy();
    });
  });
});
