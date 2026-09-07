import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BasicContactTableComponent } from './basic-contact-table.component';
import { ContactOption } from '@app/shared/commonTypes';

describe('BasicContactTableComponent', () => {
  let component: BasicContactTableComponent;
  let fixture: ComponentFixture<BasicContactTableComponent>;
  let contactsSignal: ReturnType<typeof signal<ContactOption[]>>;

  beforeEach(async () => {
    contactsSignal = signal<ContactOption[]>([]);

    await TestBed.configureTestingModule({
      imports: [BasicContactTableComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(BasicContactTableComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(BasicContactTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tableFields', contactsSignal);
    fixture.componentRef.setInput('fieldName', 'avsandare');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signals initial state', () => {
    it('isContactDialogOpen defaults to false', () => {
      expect(component.isContactDialogOpen()).toBeFalse();
    });

    it('heading defaults to empty string', () => {
      expect(component.heading()).toBe('');
    });
  });

  describe('form', () => {
    it('has namn, org, email, telefon, adress controls', () => {
      expect(component.form.contains('namn')).toBeTrue();
      expect(component.form.contains('org')).toBeTrue();
      expect(component.form.contains('email')).toBeTrue();
      expect(component.form.contains('telefon')).toBeTrue();
      expect(component.form.contains('adress')).toBeTrue();
    });
  });

  describe('customColumnConfig', () => {
    it('has 5 columns', () => {
      expect(component.customColumnConfig.length).toBe(5);
    });

    it('all have tableName=basicContact', () => {
      expect(component.customColumnConfig.every(c => c.tableName === 'basicContact')).toBeTrue();
    });
  });

  describe('addContact', () => {
    it('adds contact from form values', () => {
      component.form.setValue({ namn: 'Alice', org: 'OrgA', email: 'a@t.com', telefon: '123', adress: 'St 1' });
      component.addContact();
      const contacts = contactsSignal();
      expect(contacts.length).toBe(1);
      expect(contacts[0].namn).toBe('Alice');
    });

    it('generates id for new contact', () => {
      component.form.setValue({ namn: 'Bob', org: '', email: '', telefon: '', adress: '' });
      component.addContact();
      expect(contactsSignal()[0].id).toBeTruthy();
    });
  });

  describe('removeContact', () => {
    it('removes matching contact', () => {
      component.form.setValue({ namn: 'To Delete', org: '', email: '', telefon: '', adress: '' });
      component.addContact();
      const added = contactsSignal()[0];
      component.removeContact(added);
      expect(contactsSignal().length).toBe(0);
    });
  });

  describe('updateEditedData', () => {
    it('sets contacts to new values', () => {
      const newContacts = [{ id: 'c1', namn: 'UpdatedName' }];
      component.updateEditedData(newContacts);
      expect(contactsSignal()).toEqual(newContacts);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 5 column options', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBe(5);
    });

    it('all visible by default', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.every(o => o.visible)).toBeTrue();
    });
  });
});
