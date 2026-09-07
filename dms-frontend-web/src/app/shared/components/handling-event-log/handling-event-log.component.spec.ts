import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HandlingEventLogComponent } from './handling-event-log.component';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { HandlingExtendedProperties } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

function makeDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument<HandlingExtendedProperties>({
    uid: 'h-1',
    properties: { ...overrides } as never,
  });
}

describe('HandlingEventLogComponent', () => {
  let component: HandlingEventLogComponent;
  let fixture: ComponentFixture<HandlingEventLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandlingEventLogComponent],
    })
      .overrideTemplate(HandlingEventLogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(HandlingEventLogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', makeDoc());
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

  describe('directionInfo', () => {
    it('returns inkommande labels when direction is inkommande', () => {
      fixture.componentRef.setInput(
        'doc',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: {
            'entity-type': 'directoryEntry',
            id: NUXEO_VOCAB_IDS.arendeRiktning.inkommande,
            properties: { label: 'Inkommande' },
          },
          [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]: '2026-06-01',
        })
      );

      const info = component.directionInfo();
      expect(info.handlingLabel).toBe('Inkommen handling');
      expect(info.dateLabel).toBe('Inkommen datum');
      expect(info.directionLabel).toBe('Inkommande');
      expect(info.date).toBe('2026-06-01');
    });

    it('returns utgaende labels when direction is utgaende', () => {
      fixture.componentRef.setInput(
        'doc',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: {
            'entity-type': 'directoryEntry',
            id: NUXEO_VOCAB_IDS.arendeRiktning.utgaende,
            properties: { label: 'Utgående' },
          },
          [NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum]: '2026-06-02',
        })
      );

      const info = component.directionInfo();
      expect(info.handlingLabel).toBe('Upprättad handling');
      expect(info.dateLabel).toBe('Upprättad utgående datum');
      expect(info.date).toBe('2026-06-02');
    });

    it('returns intern labels when direction is intern', () => {
      fixture.componentRef.setInput(
        'doc',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: {
            'entity-type': 'directoryEntry',
            id: NUXEO_VOCAB_IDS.arendeRiktning.intern,
            properties: { label: 'Intern' },
          },
          [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]: '2026-06-03',
        })
      );

      const info = component.directionInfo();
      expect(info.handlingLabel).toBe('Upprättad handling');
      expect(info.dateLabel).toBe('Upprättad intern datum');
      expect(info.date).toBe('2026-06-03');
    });

    it('falls back to inkommande labels when there is no direction', () => {
      fixture.componentRef.setInput('doc', makeDoc());

      const info = component.directionInfo();
      expect(info.handlingLabel).toBe('Inkommen handling');
      expect(info.dateLabel).toBe('Inkommen datum');
      expect(info.directionLabel).toBeUndefined();
    });
  });
});
