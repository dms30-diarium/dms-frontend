import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { VocabulariesComponent } from './vocabularies.component';
import type { DirectoryEntry, Directory } from '@app/shared/api/nuxeo-api.types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  VOCABULARY_ENTRIES_LOAD_ERROR_MESSAGE,
  VOCABULARY_ENTRY_CREATE_ERROR_MESSAGE,
  VOCABULARY_ENTRY_CREATE_SUCCESS_MESSAGE,
  VOCABULARY_ENTRY_DELETE_ERROR_MESSAGE,
  VOCABULARY_ENTRY_DELETE_SUCCESS_MESSAGE,
  VOCABULARY_ENTRY_UPDATE_ERROR_MESSAGE,
  VOCABULARY_ENTRY_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

function makeDirectoriesResponse(names: string[] = ['vocab1', 'vocab2']) {
  return {
    'entity-type': 'directories' as const,
    entries: names.map(name => ({
      'entity-type': 'directory' as const,
      name,
      schema: 'vocabulary',
      idField: 'id',
      readOnly: false,
      parent: null,
    })),
  };
}

function makeDirectoryEntriesResponse(
  entries: { id: string; label?: string; obsolete?: number; ordering?: number }[] = []
) {
  return {
    'entity-type': 'directoryEntries' as const,
    entries: entries.map(e => ({
      'entity-type': 'directoryEntry' as const,
      directoryName: 'vocab1',
      id: e.id,
      properties: {
        id: e.id,
        label: e.label ?? '',
        obsolete: e.obsolete ?? 0,
        ordering: e.ordering,
      },
    })),
  };
}

describe('VocabulariesComponent', () => {
  let component: VocabulariesComponent;
  let fixture: ComponentFixture<VocabulariesComponent>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeSpy: { notification: { set: jasmine.Spy }; navigationPanelContext: () => null; getValue: jasmine.Spy };

  beforeEach(async () => {
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectories',
      'getDirectoryEntries',
      'createDirectoryEntry',
      'updateDirectoryEntry',
      'deleteDirectoryEntry',
    ]);

    storeSpy = {
      notification: { set: jasmine.createSpy('set') },
      navigationPanelContext: () => null,
      getValue: jasmine.createSpy('getValue').and.returnValue(''),
    };

    nuxeoApiSpy.getMessagesJSON.and.returnValue(of({}));
    nuxeoApiSpy.getDirectories.and.returnValue(of(makeDirectoriesResponse()));
    nuxeoApiSpy.getDirectoryEntries.and.returnValue(of(makeDirectoryEntriesResponse()));
    nuxeoApiSpy.createDirectoryEntry.and.returnValue(of({} as unknown as DirectoryEntry));
    nuxeoApiSpy.updateDirectoryEntry.and.returnValue(of({} as unknown as DirectoryEntry));
    nuxeoApiSpy.deleteDirectoryEntry.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [VocabulariesComponent],
      providers: [
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    })
      .overrideTemplate(VocabulariesComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(VocabulariesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads and sorts vocabulary options from API', () => {
      nuxeoApiSpy.getDirectories.and.returnValue(of(makeDirectoriesResponse(['zebra', 'apple', 'mango'])));
      component.ngOnInit();
      const options = component.vocabularyOptions();
      expect(options.map(o => o.id)).toEqual(['apple', 'mango', 'zebra']);
    });

    it('sets isLoadingVocabularies to false after load', () => {
      component.ngOnInit();
      expect(component.isLoadingVocabularies()).toBeFalse();
    });

    it('sets empty array and still finishes loading on API error', () => {
      nuxeoApiSpy.getDirectories.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.vocabularyOptions()).toEqual([]);
      expect(component.isLoadingVocabularies()).toBeFalse();
    });

    it('handles empty entries response', () => {
      nuxeoApiSpy.getDirectories.and.returnValue(
        of({ 'entity-type': 'directories' as const, entries: undefined as unknown as Directory[] })
      );
      component.ngOnInit();
      expect(component.vocabularyOptions()).toEqual([]);
    });
  });

  describe('onVocabularyChange', () => {
    it('clears rows and does not call API when value is empty', () => {
      component.rows.set([{ title: 'old' }]);
      nuxeoApiSpy.getDirectoryEntries.calls.reset();
      component.onVocabularyChange('');
      expect(component.rows()).toEqual([]);
      expect(nuxeoApiSpy.getDirectoryEntries).not.toHaveBeenCalled();
    });

    it('clears rows when value is whitespace only', () => {
      component.rows.set([{ title: 'old' }]);
      nuxeoApiSpy.getDirectoryEntries.calls.reset();
      component.onVocabularyChange('   ');
      expect(component.rows()).toEqual([]);
      expect(nuxeoApiSpy.getDirectoryEntries).not.toHaveBeenCalled();
    });

    it('loads directory entries and maps to rows', () => {
      nuxeoApiSpy.getDirectoryEntries.and.returnValue(
        of(
          makeDirectoryEntriesResponse([
            { id: 'entry1', label: 'Entry One', obsolete: 0, ordering: 10 },
            { id: 'entry2', label: 'Entry Two', obsolete: 1, ordering: undefined },
          ])
        )
      );
      component.onVocabularyChange('vocab1');
      expect(nuxeoApiSpy.getDirectoryEntries).toHaveBeenCalledWith('vocab1', 0);
      expect(component.rows().length).toBe(2);
      expect(component.rows()[0]['id']).toBe('entry1');
      expect(component.rows()[0]['label']).toBe('Entry One');
      expect(component.rows()[0]['obsolete']).toBe(0);
      expect(component.rows()[0]['ordering']).toBe(10);
    });

    it('uses default values for missing entry properties', () => {
      nuxeoApiSpy.getDirectoryEntries.and.returnValue(
        of({
          'entity-type': 'directoryEntries' as const,
          entries: [
            {
              'entity-type': 'directoryEntry' as const,
              directoryName: 'vocab1',
              id: undefined,
              properties: {},
            },
          ],
        })
      );
      component.onVocabularyChange('vocab1');
      const row = component.rows()[0];
      expect(row['id']).toBe('');
      expect(row['label']).toBe('');
      expect(row['obsolete']).toBe(0);
      expect(row['ordering']).toBe('-');
    });

    it('sets isLoading to false after load', () => {
      component.onVocabularyChange('vocab1');
      expect(component.isLoading()).toBeFalse();
    });

    it('shows error notification and clears rows on API error', () => {
      nuxeoApiSpy.getDirectoryEntries.and.returnValue(throwError(() => new Error('fail')));
      component.onVocabularyChange('vocab1');
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'danger',
          text: VOCABULARY_ENTRIES_LOAD_ERROR_MESSAGE,
        })
      );
      expect(component.rows()).toEqual([]);
      expect(component.isLoading()).toBeFalse();
    });
  });

  describe('openAddEntry / closeAddEntry', () => {
    it('openAddEntry sets isAddEntryOpen to true and clears editingEntryId', () => {
      component.editingEntryId.set('some-id');
      component.openAddEntry();
      expect(component.isAddEntryOpen()).toBeTrue();
      expect(component.editingEntryId()).toBeNull();
    });

    it('closeAddEntry sets isAddEntryOpen to false and clears editingEntryId', () => {
      component.isAddEntryOpen.set(true);
      component.editingEntryId.set('some-id');
      component.closeAddEntry();
      expect(component.isAddEntryOpen()).toBeFalse();
      expect(component.editingEntryId()).toBeNull();
    });
  });

  describe('openEditEntry', () => {
    it('sets editingEntryId and opens form', () => {
      const item = { id: 'entry1', label: 'Test', obsolete: 0, ordering: 10 };
      component.openEditEntry(item);
      expect(component.editingEntryId()).toBe('entry1');
      expect(component.isAddEntryOpen()).toBeTrue();
    });

    it('does nothing when entry id is empty', () => {
      const item = { id: '', label: 'Test' };
      component.openEditEntry(item);
      expect(component.editingEntryId()).toBeNull();
      expect(component.isAddEntryOpen()).toBeFalse();
    });

    it('does nothing when item has no id', () => {
      const item = {};
      component.openEditEntry(item);
      expect(component.editingEntryId()).toBeNull();
    });

    it('maps obsolete=1 to true in form config', () => {
      const item = { id: 'entry1', label: 'Test', obsolete: 1, ordering: 5 };
      component.openEditEntry(item);
      const config = component.entryFormConfig();
      const obsoleteField = config.find(f => f.name === 'obsolete');
      expect(obsoleteField?.defaultValue).toBeTrue();
    });

    it('maps obsolete=0 to false in form config', () => {
      const item = { id: 'entry1', label: 'Test', obsolete: 0, ordering: 5 };
      component.openEditEntry(item);
      const config = component.entryFormConfig();
      const obsoleteField = config.find(f => f.name === 'obsolete');
      expect(obsoleteField?.defaultValue).toBeFalse();
    });

    it('maps ordering="-" to empty string in form config', () => {
      const item = { id: 'entry1', label: 'Test', obsolete: 0, ordering: '-' };
      component.openEditEntry(item);
      const config = component.entryFormConfig();
      const orderingField = config.find(f => f.name === 'ordering');
      expect(orderingField?.defaultValue).toBe('');
    });

    it('edit form config does not include id field', () => {
      const item = { id: 'entry1', label: 'Test', obsolete: 0, ordering: 5 };
      component.openEditEntry(item);
      const config = component.entryFormConfig();
      expect(config.find(f => f.name === 'id')).toBeUndefined();
    });
  });

  describe('handleEntryFormResult', () => {
    it('does nothing when no vocabulary selected', () => {
      component.selectedVocabulary.set(null);
      component.handleEntryFormResult({ id: 'e1', label: 'Label' });
      expect(nuxeoApiSpy.createDirectoryEntry).not.toHaveBeenCalled();
    });

    it('does nothing when entryId is empty and not editing', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set(null);
      component.handleEntryFormResult({ id: '', label: 'Label' });
      expect(nuxeoApiSpy.createDirectoryEntry).not.toHaveBeenCalled();
    });

    it('creates a new entry when not editing', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set(null);
      component.handleEntryFormResult({ id: 'newEntry', label: 'New Label', obsolete: false, ordering: '' });
      expect(nuxeoApiSpy.createDirectoryEntry).toHaveBeenCalledWith(
        'vocab1',
        jasmine.objectContaining({ id: 'newEntry' })
      );
    });

    it('shows success notification after create', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set(null);
      component.handleEntryFormResult({ id: 'e1', label: 'Test', obsolete: false, ordering: '' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'success',
          text: VOCABULARY_ENTRY_CREATE_SUCCESS_MESSAGE,
        })
      );
    });

    it('shows error notification on create failure', () => {
      nuxeoApiSpy.createDirectoryEntry.and.returnValue(throwError(() => new Error('fail')));
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set(null);
      component.handleEntryFormResult({ id: 'e1', label: 'Test', obsolete: false, ordering: '' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'danger',
          text: VOCABULARY_ENTRY_CREATE_ERROR_MESSAGE,
        })
      );
    });

    it('updates an existing entry when editing', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set('existingEntry');
      component.handleEntryFormResult({ label: 'Updated Label', obsolete: true, ordering: '5' });
      expect(nuxeoApiSpy.updateDirectoryEntry).toHaveBeenCalledWith(
        'vocab1',
        'existingEntry',
        jasmine.objectContaining({ id: 'existingEntry' })
      );
    });

    it('shows success notification after update', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set('existingEntry');
      component.handleEntryFormResult({ label: 'Updated Label', obsolete: false, ordering: '' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'success',
          text: VOCABULARY_ENTRY_UPDATE_SUCCESS_MESSAGE,
        })
      );
    });

    it('shows error notification on update failure', () => {
      nuxeoApiSpy.updateDirectoryEntry.and.returnValue(throwError(() => new Error('fail')));
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set('existingEntry');
      component.handleEntryFormResult({ label: 'Updated Label', obsolete: false, ordering: '' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'danger',
          text: VOCABULARY_ENTRY_UPDATE_ERROR_MESSAGE,
        })
      );
    });

    it('sets ordering to undefined when ordering is empty string', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set(null);
      component.handleEntryFormResult({ id: 'e1', label: 'Test', obsolete: false, ordering: '' });
      expect(nuxeoApiSpy.createDirectoryEntry).toHaveBeenCalledWith(
        'vocab1',
        jasmine.objectContaining({ properties: jasmine.objectContaining({ ordering: undefined }) })
      );
    });

    it('sets ordering to numeric value when ordering is a number string', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set(null);
      component.handleEntryFormResult({ id: 'e1', label: 'Test', obsolete: false, ordering: '42' });
      expect(nuxeoApiSpy.createDirectoryEntry).toHaveBeenCalledWith(
        'vocab1',
        jasmine.objectContaining({ properties: jasmine.objectContaining({ ordering: 42 }) })
      );
    });

    it('sets obsolete=1 when obsolete is true', () => {
      component.selectedVocabulary.set('vocab1');
      component.editingEntryId.set(null);
      component.handleEntryFormResult({ id: 'e1', label: 'Test', obsolete: true, ordering: '' });
      expect(nuxeoApiSpy.createDirectoryEntry).toHaveBeenCalledWith(
        'vocab1',
        jasmine.objectContaining({ properties: jasmine.objectContaining({ obsolete: 1 }) })
      );
    });
  });

  describe('deleteEntry', () => {
    it('does nothing when no vocabulary selected', () => {
      component.selectedVocabulary.set(null);
      component.deleteEntry({ id: 'e1' });
      expect(nuxeoApiSpy.deleteDirectoryEntry).not.toHaveBeenCalled();
    });

    it('does nothing when entryId is empty', () => {
      component.selectedVocabulary.set('vocab1');
      component.deleteEntry({ id: '' });
      expect(nuxeoApiSpy.deleteDirectoryEntry).not.toHaveBeenCalled();
    });

    it('calls deleteDirectoryEntry with correct args', () => {
      component.selectedVocabulary.set('vocab1');
      component.deleteEntry({ id: 'e1' });
      expect(nuxeoApiSpy.deleteDirectoryEntry).toHaveBeenCalledWith('vocab1', 'e1');
    });

    it('shows success notification after delete', () => {
      component.selectedVocabulary.set('vocab1');
      component.deleteEntry({ id: 'e1' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'success',
          text: VOCABULARY_ENTRY_DELETE_SUCCESS_MESSAGE,
        })
      );
    });

    it('shows error notification on delete failure', () => {
      nuxeoApiSpy.deleteDirectoryEntry.and.returnValue(throwError(() => new Error('fail')));
      component.selectedVocabulary.set('vocab1');
      component.deleteEntry({ id: 'e1' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'danger',
          text: VOCABULARY_ENTRY_DELETE_ERROR_MESSAGE,
        })
      );
    });
  });

  describe('confirmDeleteEntry', () => {
    it('calls deleteEntry when target is set and clears it', () => {
      const target = { id: 'e1' };
      component.selectedVocabulary.set('vocab1');
      component.deleteEntryTarget.set(target);
      component.confirmDeleteEntry();
      expect(nuxeoApiSpy.deleteDirectoryEntry).toHaveBeenCalledWith('vocab1', 'e1');
      expect(component.deleteEntryTarget()).toBeNull();
    });

    it('only clears target when no target set', () => {
      component.deleteEntryTarget.set(null);
      nuxeoApiSpy.deleteDirectoryEntry.calls.reset();
      component.confirmDeleteEntry();
      expect(nuxeoApiSpy.deleteDirectoryEntry).not.toHaveBeenCalled();
      expect(component.deleteEntryTarget()).toBeNull();
    });
  });

  describe('submitEntryForm', () => {
    it('does not throw when entryFormComponent is undefined', () => {
      expect(() => component.submitEntryForm()).not.toThrow();
    });
  });

  describe('buildEntryFormConfig (via openAddEntry)', () => {
    it('includes id field when not editing', () => {
      component.openAddEntry();
      const config = component.entryFormConfig();
      expect(config.find(f => f.name === 'id')).toBeDefined();
    });

    it('includes label, obsolete, ordering fields', () => {
      component.openAddEntry();
      const config = component.entryFormConfig();
      expect(config.find(f => f.name === 'label')).toBeDefined();
      expect(config.find(f => f.name === 'obsolete')).toBeDefined();
      expect(config.find(f => f.name === 'ordering')).toBeDefined();
    });
  });
});
