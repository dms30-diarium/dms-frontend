import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ContactTableComponent } from './contact-table.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { ContactOption } from '@app/shared/commonTypes';
import { makeUserSuggestion } from '@app/shared/testing/mock-factories';

describe('ContactTableComponent', () => {
  let component: ContactTableComponent;
  let fixture: ComponentFixture<ContactTableComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let contactsSignal: ReturnType<typeof signal<ContactOption[]>>;

  function setup(type: 'internal' | 'external') {
    return TestBed.configureTestingModule({
      imports: [ContactTableComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(ContactTableComponent, '<div></div>')
      .compileComponents()
      .then(() => {
        contactsSignal = signal<ContactOption[]>([]);
        fixture = TestBed.createComponent(ContactTableComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('tableFields', contactsSignal);
        fixture.componentRef.setInput('type', type);
        fixture.componentRef.setInput('fieldName', 'handlaggare');
        fixture.detectChanges();
      });
  }

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getUserSuggestions']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getUserSuggestions.and.returnValue(of([]));
  });

  describe('internal type', () => {
    beforeEach(async () => setup('internal'));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('calls getUserSuggestions for internal type', () => {
      expect(apiSpy.getUserSuggestions).toHaveBeenCalled();
    });

    it('sets userOptions from API response', () => {
      apiSpy.getUserSuggestions.and.returnValue(
        of([makeUserSuggestion({ displayLabel: 'Alice', id: 'alice', email: 'a@t.com', company: 'OrgA' })])
      );
      component.getUserOptions();
      expect(component.userOptions().length).toBe(1);
      expect(component.userOptions()[0].email).toBe('a@t.com');
    });

    it('customColumnConfig returns 5 columns for internal', () => {
      expect(component.customColumnConfig().length).toBe(5);
    });

    it('signals initial state: isContactDialogOpen=false', () => {
      expect(component.isContactDialogOpen()).toBeFalse();
    });

    it('signals initial state: tableName=contact_table', () => {
      expect(component.tableName()).toBe('contact_table');
    });

    it('getDefaultColumnOptions returns 5 options for internal', () => {
      expect(component.getDefaultColumnOptions().length).toBe(5);
    });

    it('addContact appends to contacts signal', () => {
      component.addContact({ name: 'Alice', email: 'a@t.com', org: '' });
      expect(contactsSignal().length).toBe(1);
    });

    it('removeContact removes matching item', () => {
      component.addContact({ name: 'Alice' });
      const added = contactsSignal()[0];
      component.removeContact(added);
      expect(contactsSignal().length).toBe(0);
    });

    it('updateEditedData enriches contact with user email from userOptions', () => {
      component.userOptions.set([{ label: 'Bob', id: 'bob', email: 'bob@t.com', company: 'BobCo' }]);
      component.updateEditedData([{ name: 'bob', type: 'Handlaggare' }]);
      expect(contactsSignal()[0]['email']).toBe('bob@t.com');
    });

    it('updateEditedData handles array name for multi-select', () => {
      component.userOptions.set([
        { label: 'Alice', id: 'alice', email: 'a@t.com', company: 'OA' },
        { label: 'Bob', id: 'bob', email: 'b@t.com', company: 'OB' },
      ]);
      component.updateEditedData([{ name: ['alice', 'bob'] }]);
      const result = contactsSignal()[0];
      expect(result['email']).toContain('a@t.com');
      expect(result['email']).toContain('b@t.com');
    });

    it('updateEditedData falls back to el.email when user not found', () => {
      component.userOptions.set([]);
      component.updateEditedData([{ name: 'unknown', email: 'u@t.com' }]);
      expect(contactsSignal()[0]['email']).toBe('u@t.com');
    });
  });

  describe('external type', () => {
    beforeEach(async () => setup('external'));

    it('does not call getUserSuggestions', () => {
      expect(apiSpy.getUserSuggestions).not.toHaveBeenCalled();
    });

    it('customColumnConfig returns 8 columns for external', () => {
      expect(component.customColumnConfig().length).toBe(8);
    });

    it('getDefaultColumnOptions returns 8 options for external', () => {
      expect(component.getDefaultColumnOptions().length).toBe(8);
    });

    it('external columns include typ, name, org, email', () => {
      const keys = component.customColumnConfig().map(c => c.key);
      expect(keys).toContain('typ');
      expect(keys).toContain('name');
      expect(keys).toContain('email');
    });
  });
});
