import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HandlingActorsComponent } from './handling-actors.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { ContactEntry, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

type HandlingActorContact = ContactEntry & { org?: string };

function makeDoc(
  senders: HandlingActorContact[] = [],
  recipients: HandlingActorContact[] = []
): NuxeoDocument<HandlingExtendedProperties> {
  return {
    uid: 'h-1',
    type: 'Handling',
    title: 'H',
    properties: {
      [NUXEO_SCHEMA_FIELDS.handling.avsandare]: senders,
      [NUXEO_SCHEMA_FIELDS.handling.mottagare]: recipients,
    },
  } as NuxeoDocument<HandlingExtendedProperties>;
}

describe('HandlingActorsComponent', () => {
  let component: HandlingActorsComponent;
  let fixture: ComponentFixture<HandlingActorsComponent>;

  function setup(doc: NuxeoDocument<HandlingExtendedProperties>) {
    fixture = TestBed.createComponent(HandlingActorsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', doc);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandlingActorsComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(HandlingActorsComponent, '<div></div>')
      .compileComponents();

    setup(makeDoc());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('columns', () => {
    it('has 6 columns', () => {
      expect(component.columns.length).toBe(6);
    });

    it('all columns belong to HANDLING_PARTIES table', () => {
      expect(component.columns.every(c => c.tableName === 'HANDLING_PARTIES')).toBeTrue();
    });
  });

  describe('defaultColumnOptions', () => {
    it('maps 6 column options', () => {
      expect(component.defaultColumnOptions().length).toBe(6);
    });

    it('all visible', () => {
      expect(component.defaultColumnOptions().every(o => o.visible)).toBeTrue();
    });
  });

  describe('rows computed', () => {
    it('returns empty array when no senders/recipients', () => {
      expect(component.rows()).toEqual([]);
    });

    it('maps senders with typ Avsändare', () => {
      setup(makeDoc([{ namn: 'Alice', epost: 'a@t.com', telefon: '123', org: 'Org A' }]));
      expect(component.rows().length).toBe(1);
      expect(component.rows()[0].typ).toBe('Avsändare');
      expect(component.rows()[0].namn).toBe('Alice');
      expect(component.rows()[0].organization).toBe('Org A');
    });

    it('maps recipients with typ Mottagare', () => {
      setup(makeDoc([], [{ namn: 'Bob', epost: 'b@t.com' }]));
      expect(component.rows().length).toBe(1);
      expect(component.rows()[0].typ).toBe('Mottagare');
      expect(component.rows()[0].namn).toBe('Bob');
    });

    it('combines senders and recipients', () => {
      setup(makeDoc([{ namn: 'Alice' }], [{ namn: 'Bob' }]));
      expect(component.rows().length).toBe(2);
    });

    it('falls back organization to organisation field', () => {
      setup(makeDoc([{ namn: 'Alice', organisation: 'Org B' }]));
      expect(component.rows()[0].organization).toBe('Org B');
    });

    it('falls back organization to foretag field', () => {
      setup(makeDoc([{ namn: 'Alice', foretag: 'Company C' }]));
      expect(component.rows()[0].organization).toBe('Company C');
    });

    it('defaults organization to empty string when none present', () => {
      setup(makeDoc([{ namn: 'Alice' }]));
      expect(component.rows()[0].organization).toBe('');
    });

    it('defaults missing namn/epost/telefon to empty string', () => {
      setup(makeDoc([{}]));
      expect(component.rows()[0].namn).toBe('');
      expect(component.rows()[0].email).toBe('');
      expect(component.rows()[0].telefon).toBe('');
    });
  });
});
