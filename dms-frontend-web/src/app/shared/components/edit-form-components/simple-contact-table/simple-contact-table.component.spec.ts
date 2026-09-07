import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { SimpleContactTableComponent } from './simple-contact-table.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { ContactOption } from '@app/shared/commonTypes';

describe('SimpleContactTableComponent', () => {
  let component: SimpleContactTableComponent;
  let fixture: ComponentFixture<SimpleContactTableComponent>;
  let tableFields: ReturnType<typeof signal<ContactOption[]>>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [SimpleContactTableComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(SimpleContactTableComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SimpleContactTableComponent);
    component = fixture.componentInstance;
    tableFields = signal<ContactOption[]>([]);
    fixture.componentRef.setInput('tableFields', tableFields);
    fixture.componentRef.setInput('fieldName', 'contacts');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isContactDialogOpen defaults to false', () => {
    expect(component.isContactDialogOpen()).toBeFalse();
  });

  describe('addContact', () => {
    it('does nothing when both namn and email are empty', () => {
      component.form.setValue({ namn: '', email: '' });
      component.addContact();
      expect(tableFields()).toEqual([]);
    });

    it('adds a new contact with a generated id', () => {
      component.form.setValue({ namn: 'Alice', email: 'alice@example.com' });
      component.addContact();

      expect(tableFields().length).toBe(1);
      expect(tableFields()[0].namn).toBe('Alice');
      expect(tableFields()[0].email).toBe('alice@example.com');
      expect(tableFields()[0].id).toBeTruthy();
    });
  });

  describe('removeContact', () => {
    it('removes the matching contact by id', () => {
      tableFields.set([
        { id: '1', namn: 'Alice' },
        { id: '2', namn: 'Bob' },
      ]);

      component.removeContact({ id: '1', namn: 'Alice' });

      expect(tableFields()).toEqual([{ id: '2', namn: 'Bob' }]);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns the column config mapped to options', () => {
      const options = component.getDefaultColumnOptions();
      expect(options.map(o => o.id)).toEqual(['namn', 'email']);
      expect(options.every(o => o.visible)).toBeTrue();
    });
  });
});
