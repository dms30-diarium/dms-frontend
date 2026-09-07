import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { ChecklistaPageComponent } from './checklista-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { ChecklistItem } from '@app/pages/case-page/case-types';
import {
  CHECKLISTA_LOAD_ERROR_MESSAGE,
  CHECKLISTA_UPDATE_ERROR_MESSAGE,
  CHECKLISTA_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

function makeStoreMock() {
  return jasmine.createSpyObj('GeneralStore', ['getValue'], {
    notification: { set: jasmine.createSpy('set') },
    navigationPanelContext: signal<'browse' | 'info' | null>(null),
  });
}

function makeChecklistaDoc(checklistesteg: unknown[] = []) {
  return makeNuxeoDocument({
    uid: 'checklista-uid-1',
    title: 'Test Checklista',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Checklista',
      [NUXEO_SCHEMA_FIELDS.checklista.checklistesteg]: checklistesteg,
    } as unknown as NuxeoProperties,
  });
}

describe('ChecklistaPageComponent', () => {
  let component: ChecklistaPageComponent;
  let fixture: ComponentFixture<ChecklistaPageComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let auditRefreshSpy: jasmine.SpyObj<AuditRefreshService>;
  let storeMock: jasmine.SpyObj<GeneralStore>;
  let routeParams$: Subject<{ id: string }>;

  beforeEach(async () => {
    routeParams$ = new Subject<{ id: string }>();
    const auditSubject$ = new Subject<NuxeoDocument>();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['editDocument']);
    apiSpy.editDocument.and.returnValue(of(makeChecklistaDoc()));

    auditRefreshSpy = jasmine.createSpyObj('AuditRefreshService', [
      'loadDocumentWithAudit',
      'refreshAuditAsync',
      'getLatestAuditTimestamp',
    ]);
    auditRefreshSpy.loadDocumentWithAudit.and.returnValue(auditSubject$);
    auditRefreshSpy.refreshAuditAsync.and.returnValue(of(makeChecklistaDoc()));
    auditRefreshSpy.getLatestAuditTimestamp.and.returnValue(0);

    storeMock = makeStoreMock();

    await TestBed.configureTestingModule({
      imports: [ChecklistaPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: AuditRefreshService, useValue: auditRefreshSpy },
        { provide: GeneralStore, useValue: storeMock },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
    })
      .overrideTemplate(ChecklistaPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ChecklistaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('isLoading is true initially', () => {
      expect(component.isLoading()).toBeTrue();
    });

    it('document is null initially', () => {
      expect(component.document()).toBeNull();
    });

    it('loadError is false initially', () => {
      expect(component.loadError()).toBeFalse();
    });

    it('isEditOpen is false initially', () => {
      expect(component.isEditOpen()).toBeFalse();
    });

    it('isSaving is false initially', () => {
      expect(component.isSaving()).toBeFalse();
    });

    it('isDialogOpen is false initially', () => {
      expect(component.isDialogOpen()).toBeFalse();
    });
  });

  describe('ngOnInit — route params handling', () => {
    it('sets isLoading to true on new route param', () => {
      component.isLoading.set(false);
      routeParams$.next({ id: 'doc-1' });
      expect(component.isLoading()).toBeTrue();
    });

    it('calls loadDocumentWithAudit with route param id', () => {
      routeParams$.next({ id: 'doc-abc' });
      expect(auditRefreshSpy.loadDocumentWithAudit).toHaveBeenCalledWith('doc-abc');
    });

    it('sets document and isLoading=false on successful load', () => {
      const auditSubject$ = new Subject<NuxeoDocument>();
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(auditSubject$);
      routeParams$.next({ id: 'doc-success' });
      const doc = makeChecklistaDoc();
      auditSubject$.next(doc);
      expect(component.document()).toBe(doc);
      expect(component.isLoading()).toBeFalse();
    });

    it('shows error notification and sets loadError on load failure', () => {
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(throwError(() => new Error('fail')));
      routeParams$.next({ id: 'doc-fail' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: CHECKLISTA_LOAD_ERROR_MESSAGE })
      );
      expect(component.loadError()).toBeTrue();
      expect(component.isLoading()).toBeFalse();
    });
  });

  describe('openEdit', () => {
    it('does nothing when document is null', () => {
      component.document.set(null);
      component.openEdit();
      expect(component.isEditOpen()).toBeFalse();
    });

    it('sets isEditOpen to true when document is loaded', () => {
      component.document.set(makeChecklistaDoc());
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
    });

    it('populates editForm title from document', () => {
      const doc = makeChecklistaDoc();
      component.document.set(doc);
      component.openEdit();
      expect(component.editForm.get('title')?.value).toBe('Test Checklista');
    });

    it('populates checklistsArray from document checklistesteg', () => {
      const doc = makeChecklistaDoc([
        { namn: 'Step 1', notering: 'Note 1', klar: false },
        { namn: 'Step 2', notering: '', klar: true },
      ]);
      component.document.set(doc);
      component.openEdit();
      expect(component.checklistsArray.length).toBe(2);
    });

    it('clears previous checklistsArray entries before repopulating', () => {
      const doc = makeChecklistaDoc([{ namn: 'Step', notering: '', klar: false }]);
      component.document.set(doc);
      component.openEdit();
      component.openEdit();
      expect(component.checklistsArray.length).toBe(1);
    });
  });

  describe('closeEdit', () => {
    it('sets isEditOpen to false', () => {
      component.isEditOpen.set(true);
      component.closeEdit();
      expect(component.isEditOpen()).toBeFalse();
    });

    it('closes the dialog and resets edit item state', () => {
      component.isDialogOpen.set(true);
      component.isEditItem.set(true);
      component.editedIndex.set(1);
      component.closeEdit();
      expect(component.isDialogOpen()).toBeFalse();
      expect(component.isEditItem()).toBeFalse();
      expect(component.editedIndex()).toBeNull();
    });
  });

  describe('openItemDialog', () => {
    it('opens dialog without pre-filling when no item passed', () => {
      component.openItemDialog();
      expect(component.isDialogOpen()).toBeTrue();
      expect(component.isEditItem()).toBeFalse();
      expect(component.editedIndex()).toBeNull();
    });

    it('opens dialog with pre-filled values when item passed', () => {
      const doc = makeChecklistaDoc([{ namn: 'Task A', notering: 'Note A', klar: true }]);
      component.document.set(doc);
      component.openEdit();

      component.openItemDialog({ id: '0-Task A', name: 'Task A', note: 'Note A', isChecked: true });

      expect(component.isDialogOpen()).toBeTrue();
      expect(component.isEditItem()).toBeTrue();
      expect(component.dialogForm.get('name')?.value).toBe('Task A');
      expect(component.dialogForm.get('note')?.value).toBe('Note A');
      expect(component.dialogForm.get('isChecked')?.value).toBeTrue();
    });

    it('sets editedIndex to found index when item exists in checklistsArray', () => {
      const doc = makeChecklistaDoc([{ namn: 'Task B', notering: 'Note B', klar: false }]);
      component.document.set(doc);
      component.openEdit();

      component.openItemDialog({ id: '0-Task B', name: 'Task B', note: 'Note B', isChecked: false });

      expect(component.editedIndex()).toBe(0);
    });

    it('sets editedIndex to null when item is not found in checklistsArray', () => {
      component.openItemDialog({ id: 'x', name: 'Unknown', note: '', isChecked: false });
      expect(component.editedIndex()).toBeNull();
    });
  });

  describe('addOrUpdateItem', () => {
    it('does nothing when dialogForm is invalid', () => {
      component.dialogForm.patchValue({ name: '', note: '', isChecked: false });
      component.dialogForm.get('name')?.setErrors({ required: true });
      const initialLength = component.checklistsArray.length;
      component.addOrUpdateItem();
      expect(component.checklistsArray.length).toBe(initialLength);
    });

    it('adds new item to checklistsArray when not in edit mode', () => {
      component.isEditItem.set(false);
      component.editedIndex.set(null);
      component.dialogForm.patchValue({ name: 'New Item', note: 'Note', isChecked: false });
      component.addOrUpdateItem();
      expect(component.checklistsArray.length).toBe(1);
      expect(component.checklistsArray.at(0).get('name')?.value).toBe('New Item');
    });

    it('updates existing item in checklistsArray when in edit mode', () => {
      component.isEditItem.set(false);
      component.dialogForm.patchValue({ name: 'Original', note: '', isChecked: false });
      component.addOrUpdateItem();

      component.isEditItem.set(true);
      component.editedIndex.set(0);
      component.dialogForm.patchValue({ name: 'Updated', note: 'Updated note', isChecked: true });
      component.addOrUpdateItem();

      expect(component.checklistsArray.at(0).get('name')?.value).toBe('Updated');
      expect(component.checklistsArray.at(0).get('isChecked')?.value).toBeTrue();
    });

    it('closes dialog and resets state after adding', () => {
      component.dialogForm.patchValue({ name: 'Item', note: '', isChecked: false });
      component.addOrUpdateItem();
      expect(component.isDialogOpen()).toBeFalse();
      expect(component.isEditItem()).toBeFalse();
      expect(component.editedIndex()).toBeNull();
    });
  });

  describe('deleteItem', () => {
    it('removes item from checklistsArray by matching name and note', () => {
      const doc = makeChecklistaDoc([
        { namn: 'Task 1', notering: 'Note 1', klar: false },
        { namn: 'Task 2', notering: 'Note 2', klar: true },
      ]);
      component.document.set(doc);
      component.openEdit();

      component.deleteItem({ id: '0-Task 1', name: 'Task 1', note: 'Note 1', isChecked: false });

      expect(component.checklistsArray.length).toBe(1);
      expect(component.checklistsArray.at(0).get('name')?.value).toBe('Task 2');
    });

    it('does nothing when item is not found', () => {
      const doc = makeChecklistaDoc([{ namn: 'Task', notering: '', klar: false }]);
      component.document.set(doc);
      component.openEdit();

      component.deleteItem({ id: 'x', name: 'Non-existent', note: 'nope', isChecked: false });

      expect(component.checklistsArray.length).toBe(1);
    });
  });

  describe('saveEdit', () => {
    beforeEach(() => {
      const doc = makeChecklistaDoc([{ namn: 'Step', notering: 'Note', klar: false }]);
      component.document.set(doc);
      component.openEdit();
    });

    it('marks form as touched and returns when editForm is invalid', () => {
      component.editForm.get('title')?.setValue('');
      component.editForm.get('title')?.setErrors({ required: true });
      component.saveEdit();
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument with correct uid and properties', () => {
      const auditDoc = makeChecklistaDoc();
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(auditDoc));
      component.editForm.get('title')?.setValue('Updated Title');
      component.saveEdit();
      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'checklista-uid-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Updated Title',
        })
      );
    });

    it('sets isSaving to true during save and false after success', () => {
      const auditDoc = makeChecklistaDoc();
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(auditDoc));
      component.saveEdit();
      expect(component.isSaving()).toBeFalse();
    });

    it('shows success notification and closes edit on success', () => {
      const auditDoc = makeChecklistaDoc();
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(auditDoc));
      component.saveEdit();
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'success', text: CHECKLISTA_UPDATE_SUCCESS_MESSAGE })
      );
      expect(component.isEditOpen()).toBeFalse();
    });

    it('shows error notification on save failure', () => {
      apiSpy.editDocument.and.returnValue(throwError(() => new Error('fail')));
      component.saveEdit();
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: CHECKLISTA_UPDATE_ERROR_MESSAGE })
      );
      expect(component.isSaving()).toBeFalse();
    });

    it('does nothing when document is null', () => {
      component.document.set(null);
      component.saveEdit();
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('maps checklists array to correct payload format', () => {
      const auditDoc = makeChecklistaDoc();
      auditRefreshSpy.loadDocumentWithAudit.and.returnValue(of(auditDoc));
      component.saveEdit();
      const callArgs = apiSpy.editDocument.calls.mostRecent().args[1] as NuxeoProperties;
      const steps = callArgs[NUXEO_SCHEMA_FIELDS.checklista.checklistesteg] as ChecklistItem[];
      expect(steps[0].namn).toBe('Step');
      expect(steps[0].notering).toBe('Note');
      expect(steps[0].klar).toBe(false);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns column options matching columnConfig', () => {
      const options = component.getDefaultColumnOptions();
      expect(options.length).toBe(component.columnConfig.length);
      expect(options[0].id).toBe('name');
      expect(options[0].visible).toBeTrue();
    });
  });

  describe('computed signals', () => {
    describe('props', () => {
      it('returns empty object when document is null', () => {
        component.document.set(null);
        expect(component.props()).toEqual(Object.create(null));
      });

      it('returns document properties when document is set', () => {
        const doc = makeChecklistaDoc([{ namn: 'A', notering: '', klar: false }]);
        component.document.set(doc);
        expect(component.props()[NUXEO_SCHEMA_FIELDS.checklista.checklistesteg]).toBeTruthy();
      });
    });

    describe('checklistRows', () => {
      it('returns empty array when no checklista steps', () => {
        component.document.set(makeChecklistaDoc());
        expect(component.checklistRows()).toEqual([]);
      });

      it('maps checklistesteg to ChecklistRow format', () => {
        const doc = makeChecklistaDoc([
          { namn: 'Step 1', notering: 'Note 1', klar: true },
          { namn: 'Step 2', notering: 'Note 2', klar: false },
        ]);
        component.document.set(doc);
        const rows = component.checklistRows();
        expect(rows.length).toBe(2);
        expect(rows[0].name).toBe('Step 1');
        expect(rows[0].isChecked).toBeTrue();
        expect(rows[1].note).toBe('Note 2');
      });

      it('handles items with missing namn/notering gracefully', () => {
        const doc = makeChecklistaDoc([{ klar: false }]);
        component.document.set(doc);
        const rows = component.checklistRows();
        expect(rows[0].name).toBe('');
        expect(rows[0].note).toBe('');
      });
    });

    describe('auditEntries', () => {
      it('returns empty array when no audit entries', () => {
        component.document.set(makeChecklistaDoc());
        expect(component.auditEntries()).toEqual([]);
      });

      it('sorts audit entries by eventDate descending', () => {
        const doc = makeNuxeoDocument({
          contextParameters: {
            audit: [
              { 'entity-type': 'logEntry' as const, id: 1, eventDate: '2024-01-01T00:00:00Z' },
              { 'entity-type': 'logEntry' as const, id: 2, eventDate: '2024-01-03T00:00:00Z' },
              { 'entity-type': 'logEntry' as const, id: 3, eventDate: '2024-01-02T00:00:00Z' },
            ],
          },
        });
        component.document.set(doc);
        const entries = component.auditEntries();
        expect(entries[0].id).toBe(2);
        expect(entries[1].id).toBe(3);
        expect(entries[2].id).toBe(1);
      });

      it('sorts entries with missing dates as 0 (to end)', () => {
        const doc = makeNuxeoDocument({
          contextParameters: {
            audit: [
              { 'entity-type': 'logEntry' as const, id: 1 },
              { 'entity-type': 'logEntry' as const, id: 2, eventDate: '2024-01-01T00:00:00Z' },
            ],
          },
        });
        component.document.set(doc);
        const entries = component.auditEntries();
        expect(entries[0].id).toBe(2);
      });
    });

    describe('contributorsLabel', () => {
      it('returns undefined when no contributors', () => {
        component.document.set(makeChecklistaDoc());
        expect(component.contributorsLabel()).toBeUndefined();
      });
    });

    describe('canEdit', () => {
      it('returns true when navigationPanelContext is not browse', () => {
        expect(component.canEdit()).toBeTrue();
      });
    });
  });
});
