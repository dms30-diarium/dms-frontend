import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateChecklistComponent } from './create-checklist.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const MOCK_PAYLOAD = makeNuxeoDocument({
  type: 'Checklista',
  title: '',
  properties: {},
});

describe('CreateChecklistComponent', () => {
  let component: CreateChecklistComponent;
  let fixture: ComponentFixture<CreateChecklistComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(
      of(makeNuxeoDocument({ uid: 'cl-1', type: 'Checklista', title: 'CL', properties: {} }))
    );

    await TestBed.configureTestingModule({
      imports: [CreateChecklistComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateChecklistComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateChecklistComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/checklists');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Checklista', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/checklists', 'Checklista');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('isDialogOpen defaults to false', () => {
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('isEdit defaults to false', () => {
      expect(component.isEdit()).toBeFalse();
    });

    it('editedIndex defaults to null', () => {
      expect(component.editedIndex()).toBeNull();
    });

    it('checklistsArray starts empty', () => {
      expect(component.checklistsArray.length).toBe(0);
    });
  });

  describe('editItem', () => {
    it('sets isDialogOpen and isEdit to true', () => {
      component.dialogForm.controls.name.setValue('Item 1');
      component.addToTheTable();
      component.editItem({ name: 'Item 1' });
      expect(component.isDialogOpen()).toBeTrue();
      expect(component.isEdit()).toBeTrue();
    });

    it('patches dialogForm with item values', () => {
      component.dialogForm.controls.name.setValue('Test Item');
      component.addToTheTable();
      component.editItem({ name: 'Test Item' });
      expect(component.dialogForm.value.name).toBe('Test Item');
    });
  });

  describe('addToTheTable', () => {
    it('does not add when form is invalid', () => {
      component.dialogForm.controls.name.setValue('');
      component.addToTheTable();
      expect(component.checklistsArray.length).toBe(0);
    });

    it('adds item when form is valid', () => {
      component.dialogForm.controls.name.setValue('New Item');
      component.addToTheTable();
      expect(component.checklistsArray.length).toBe(1);
    });

    it('closes dialog after adding', () => {
      component.isDialogOpen.set(true);
      component.dialogForm.controls.name.setValue('Item');
      component.addToTheTable();
      expect(component.isDialogOpen()).toBeFalse();
    });

    it('resets dialogForm after adding', () => {
      component.dialogForm.controls.name.setValue('Item');
      component.addToTheTable();
      expect(component.dialogForm.value.name).toBeNull();
    });
  });

  describe('deleteItem', () => {
    it('removes item by name', () => {
      component.dialogForm.controls.name.setValue('To Delete');
      component.addToTheTable();
      expect(component.checklistsArray.length).toBe(1);
      component.deleteItem({ name: 'To Delete' });
      expect(component.checklistsArray.length).toBe(0);
    });

    it('does nothing when item not found', () => {
      component.dialogForm.controls.name.setValue('Existing');
      component.addToTheTable();
      component.deleteItem({ name: 'Not Found' });
      expect(component.checklistsArray.length).toBe(1);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns 3 column options', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBe(3);
    });

    it('all visible by default', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.every(o => o.visible)).toBeTrue();
    });
  });

  describe('submit', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      component.form.controls.checklistTitle.setValue('CL');
      expect(() => component.submit()).toThrow();
    });

    it('throws when checklistTitle is empty', () => {
      component.form.controls.checklistTitle.setValue('');
      expect(() => component.submit()).toThrow();
    });

    it('calls createDocument when valid', () => {
      apiSpy.createDocument.calls.reset();
      component.form.controls.checklistTitle.setValue('My Checklist');
      component.submit();
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Checklist' }),
        '/domain/checklists'
      );
    });

    it('emits dialogClosed on success', () => {
      let emitted: NuxeoDocument | null | undefined;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.form.controls.checklistTitle.setValue('My Checklist');
      component.submit();
      expect(emitted).toBeTruthy();
    });
  });
});
