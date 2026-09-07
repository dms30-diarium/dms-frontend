import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Contact, ContactTableComponent } from './contact-table.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { ArendeExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { InternalContact } from '@app/pages/case-page/case-types';

function makeDoc(type: 'internal' | 'external', contacts: Contact[] = []): NuxeoDocument<ArendeExtendedProperties> {
  return {
    uid: 'a-1',
    type: 'Arende',
    title: 'A',
    properties: {
      [NUXEO_SCHEMA_FIELDS.arende.kontakter]: contacts,
    },
  } as NuxeoDocument<ArendeExtendedProperties>;
}

describe('ContactTableComponent', () => {
  let component: ContactTableComponent;
  let fixture: ComponentFixture<ContactTableComponent>;

  function setup(
    type: 'internal' | 'external',
    doc?: NuxeoDocument<ArendeExtendedProperties>,
    internalContacts?: InternalContact[]
  ) {
    fixture = TestBed.createComponent(ContactTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', doc ?? makeDoc(type));
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('parentRef', 'parent-uid');
    if (internalContacts) {
      fixture.componentRef.setInput('internalContactsData', internalContacts);
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactTableComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(ContactTableComponent, '<div></div>')
      .compileComponents();
  });

  describe('internal type', () => {
    beforeEach(() => setup('internal'));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('isContactDialogOpen defaults to false', () => {
      expect(component.isContactDialogOpen()).toBeFalse();
    });

    it('customColumnConfig has 5 columns for internal', () => {
      expect(component.customColumnConfig().length).toBe(5);
    });

    it('contacts returns empty when no internalContactsData', () => {
      expect(component.contacts().length).toBe(0);
    });

    it('contacts maps internal contacts from internalContactsData', () => {
      setup('internal', makeDoc('internal'), [
        { id: 'u1', type: 'Handlaggare', name: 'alice', org: 'Dep A', email: 'a@t.com' },
      ]);
      expect(component.contacts().length).toBe(1);
    });

    it('getDefaultColumnOptions returns 5 options for internal', () => {
      expect(component.getDefaultColumnOptions().length).toBe(5);
    });
  });

  describe('external type', () => {
    beforeEach(() =>
      setup('external', makeDoc('external', [{ namn: 'Alice', email: 'a@t.com', telefon: '123', adress: 'St 1' }]))
    );

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('customColumnConfig has 8 columns for external', () => {
      expect(component.customColumnConfig().length).toBe(8);
    });

    it('contacts returns external contacts from doc properties', () => {
      expect(component.contacts().length).toBe(1);
    });

    it('contacts maps namn to name field', () => {
      expect(component.contacts()[0].name).toBe('Alice');
    });

    it('getDefaultColumnOptions returns 8 options for external', () => {
      expect(component.getDefaultColumnOptions().length).toBe(8);
    });

    it('external columns include adress, postnummer', () => {
      const keys = component.customColumnConfig().map(c => c.key);
      expect(keys).toContain('adress');
      expect(keys).toContain('postnummer');
    });
  });
});
