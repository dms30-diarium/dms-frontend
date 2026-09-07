import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MotpartEditTableComponent } from './motpart-edit-table.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeDirection } from '@app/shared/testing/mock-factories';
import { ArendeExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { ContactOption } from '@app/shared/commonTypes';
import { TableItem } from '@app/shared/models/case-table';

function makeDoc(motpartTypId?: string): NuxeoDocument<ArendeExtendedProperties> {
  return makeNuxeoDocument<ArendeExtendedProperties>({
    uid: 'a-1',
    type: 'Arende',
    title: 'Test Arende',
    properties: {
      [NUXEO_SCHEMA_FIELDS.arende.motpart]: motpartTypId
        ? { typ: { id: motpartTypId, properties: { label: motpartTypId, id: motpartTypId } } }
        : undefined,
    },
  });
}

describe('MotpartEditTableComponent', () => {
  let component: MotpartEditTableComponent;
  let fixture: ComponentFixture<MotpartEditTableComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let contactsSignal: WritableSignal<ContactOption[]>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getDirectorySuggestions']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [MotpartEditTableComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(MotpartEditTableComponent, '<div></div>')
      .compileComponents();

    contactsSignal = signal<ContactOption[]>([]);

    fixture = TestBed.createComponent(MotpartEditTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tableFields', contactsSignal);
    fixture.componentRef.setInput('doc', makeDoc());
    fixture.componentRef.setInput('fieldName', 'motpart');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getDirectorySuggestions for MotpartTyp', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('MotpartTyp');
    });

    it('sets motpartTypOptions from API response', () => {
      apiSpy.getDirectorySuggestions.and.returnValue(
        of([
          makeDirection({ displayLabel: 'Privat', id: 'privatePerson' }),
          makeDirection({ displayLabel: 'Org', id: 'organization' }),
        ])
      );
      component.ngOnInit();
      expect(component.motpartTypOptions().length).toBe(2);
      expect(component.motpartTypOptions()[0].id).toBe('privatePerson');
      expect(component.motpartTypOptions()[0].label).toBe('Privat');
    });

    it('sets type signal from doc motpart.typ.id', () => {
      fixture.componentRef.setInput('doc', makeDoc('organization'));
      component.ngOnInit();
      expect(component.type()).toBe('organization');
    });

    it('sets type to undefined when no motpart', () => {
      component.ngOnInit();
      expect(component.type()).toBeUndefined();
    });
  });

  describe('signals initial state', () => {
    it('isContactDialogOpen defaults to false', () => {
      expect(component.isContactDialogOpen()).toBeFalse();
    });

    it('tableName defaults to motpart_table', () => {
      expect(component.tableName()).toBe('motpart_table');
    });

    it('motpartTypOptions defaults to empty array', () => {
      expect(component.motpartTypOptions()).toEqual([]);
    });
  });

  describe('customColumnConfig', () => {
    it('has 8 columns', () => {
      expect(component.customColumnConfig().length).toBe(8);
    });

    it('shows personnummer label when type is privatePerson', () => {
      component.type.set('privatePerson');
      const orgCol = component.customColumnConfig().find(c => c.key === 'organisationsnummer');
      expect(orgCol?.label).toContain('personummer');
    });

    it('shows organisationsnummer label when type is not privatePerson', () => {
      component.type.set('organization');
      const orgCol = component.customColumnConfig().find(c => c.key === 'organisationsnummer');
      expect(orgCol?.label).toContain('organisationsnummer');
    });

    it('all columns have visible=true', () => {
      expect(component.customColumnConfig().every(c => c.visible)).toBeTrue();
    });

    it('includes typ, motpart, epost, telefon columns', () => {
      const keys = component.customColumnConfig().map(c => c.key);
      expect(keys).toContain('typ');
      expect(keys).toContain('motpart');
      expect(keys).toContain('epost');
      expect(keys).toContain('telefon');
    });
  });

  describe('updateEditedData', () => {
    it('updates contacts signal', () => {
      component.type = signal(undefined);
      const newContacts: TableItem[] = [{ typ: 'organization', motpart: 'Alice' }];
      component.updateEditedData(newContacts);
      expect(contactsSignal()).toEqual(newContacts as unknown as ContactOption[]);
    });

    it('sets type from first contact typ', () => {
      component.type = signal(undefined);
      component.updateEditedData([{ typ: 'privatePerson' }]);
      expect(component.type()).toBe('privatePerson');
    });

    it('sets type to undefined when contacts empty', () => {
      component.type = signal('organization');
      component.updateEditedData([]);
      expect(component.type()).toBeUndefined();
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 8 column options', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBe(8);
    });

    it('all visible by default', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.every(o => o.visible)).toBeTrue();
    });
  });
});
