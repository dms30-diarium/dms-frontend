import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MotpartTableComponent } from './motpart-table.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { ArendeExtendedProperties, Motpart, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

function makeDoc(
  motpart?: Motpart<{ id: string; properties?: { label: string } }>
): NuxeoDocument<ArendeExtendedProperties> {
  return {
    uid: 'a-1',
    type: 'Arende',
    title: 'A',
    properties: { [NUXEO_SCHEMA_FIELDS.arende.motpart]: motpart },
  } as NuxeoDocument<ArendeExtendedProperties>;
}

describe('MotpartTableComponent', () => {
  let component: MotpartTableComponent;
  let fixture: ComponentFixture<MotpartTableComponent>;

  function setup(doc: NuxeoDocument<ArendeExtendedProperties>) {
    fixture = TestBed.createComponent(MotpartTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', doc);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotpartTableComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(MotpartTableComponent, '<div></div>')
      .compileComponents();

    setup(makeDoc());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('type computed', () => {
    it('returns undefined when no motpart', () => {
      expect(component.type()).toBeUndefined();
    });

    it('returns typ.id when motpart set', () => {
      setup(makeDoc({ typ: { id: 'privatePerson' } }));
      expect(component.type()).toBe('privatePerson');
    });
  });

  describe('motpartItems computed', () => {
    it('maps fields from motpart', () => {
      setup(
        makeDoc({
          motpart: 'Alice',
          organisationsnummer: '123',
          epost: 'a@t.com',
          adress: 'St 1',
          telefon: '0700',
          postnummer: '12345',
          typ: { id: 'privatePerson', properties: { label: 'Privatperson' } },
        })
      );
      const items = component.motpartItems();
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Alice');
      expect(items[0].type).toBe('Privatperson');
      expect(items[0].org).toBe('123');
    });

    it('returns single item with undefined fields when no motpart', () => {
      const items = component.motpartItems();
      expect(items.length).toBe(1);
      expect(items[0].name).toBeUndefined();
    });
  });

  describe('customColumnConfig', () => {
    it('has 8 columns', () => {
      expect(component.customColumnConfig().length).toBe(8);
    });

    it('uses personnummer label for privatePerson type', () => {
      setup(makeDoc({ typ: { id: 'privatePerson' } }));
      const orgCol = component.customColumnConfig().find(c => c.key === 'org');
      expect(orgCol?.label).toBe('Motpartens personummer');
    });

    it('uses organisationsnummer label for non-privatePerson type', () => {
      setup(makeDoc({ typ: { id: 'company' } }));
      const orgCol = component.customColumnConfig().find(c => c.key === 'org');
      expect(orgCol?.label).toBe('Motpartens organisationsnummer');
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 8 options', () => {
      expect(component.getDefaultColumnOptions().length).toBe(8);
    });
  });
});
