import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FileViewComponent } from './file-view.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makeDoc(overrides: Record<string, unknown> = {}): NuxeoDocument {
  return makeNuxeoDocument({
    uid: 'doc-1',
    type: 'Fil',
    title: 'My File',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'My File',
      [NUXEO_SCHEMA_FIELDS.dc.description]: '',
      [NUXEO_SCHEMA_FIELDS.dc.nature]: null,
      [NUXEO_SCHEMA_FIELDS.dc.subjects]: [],
      [NUXEO_SCHEMA_FIELDS.dc.coverage]: null,
      [NUXEO_SCHEMA_FIELDS.dc.expired]: null,
      [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'application/pdf' },
      [NUXEO_SCHEMA_FIELDS.fil.typ]: null,
      ...overrides,
    } as NuxeoProperties,
  });
}

describe('FileViewComponent', () => {
  let component: FileViewComponent;
  let fixture: ComponentFixture<FileViewComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirOptSpy: jasmine.SpyObj<DirectoryOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'deleteDocument', 'editDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.deleteDocument.and.returnValue(of(makeDoc()));
    apiSpy.editDocument.and.returnValue(of(makeDoc()));

    dirOptSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    dirOptSpy.getNatureOptions.and.returnValue(of([]));
    dirOptSpy.getSubjectOptions.and.returnValue(of([]));
    dirOptSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [FileViewComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', redirectTo: '' }]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
      ],
    })
      .overrideTemplate(FileViewComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(FileViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('constructor', () => {
    it('calls getNatureOptions on init', () => {
      expect(dirOptSpy.getNatureOptions).toHaveBeenCalled();
    });

    it('calls getSubjectOptions on init', () => {
      expect(dirOptSpy.getSubjectOptions).toHaveBeenCalled();
    });

    it('calls getCoverageOptions on init', () => {
      expect(dirOptSpy.getCoverageOptions).toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('isEditDialogOpen defaults to false', () => {
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('isDeleteDialogOpened defaults to false', () => {
      expect(component.isDeleteDialogOpened()).toBeFalse();
    });

    it('isSavingEdit defaults to false', () => {
      expect(component.isSavingEdit()).toBeFalse();
    });

    it('fileEditConfig defaults to empty array', () => {
      expect(component.fileEditConfig()).toEqual([]);
    });

    it('fileNatureOptions defaults to empty array from DirectoryOptionsService', () => {
      expect(component.fileNatureOptions()).toEqual([]);
    });
  });

  describe('openEditDialog', () => {
    it('does nothing when no document', () => {
      component.openEditDialog();
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('sets isEditDialogOpen to true when document is set', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.openEditDialog();
      expect(component.isEditDialogOpen()).toBeTrue();
    });

    it('populates fileEditConfig with 6 fields', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.openEditDialog();
      expect(component.fileEditConfig().length).toBe(6);
    });

    it('first field in config is title', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.openEditDialog();
      expect(component.fileEditConfig()[0].name).toBe('title');
    });
  });

  describe('closeEditDialog', () => {
    it('sets isEditDialogOpen to false', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.openEditDialog();
      component.closeEditDialog();
      expect(component.isEditDialogOpen()).toBeFalse();
    });
  });

  describe('canRenderPdf', () => {
    it('returns false when no document', () => {
      expect(component.canRenderPdf()).toBeFalse();
    });

    it('returns true when mime-type is pdf', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.canRenderPdf()).toBeTrue();
    });

    it('returns false when mime-type is not pdf', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'image/jpeg' },
        })
      );
      fixture.detectChanges();
      expect(component.canRenderPdf()).toBeFalse();
    });

    it('handles mimeType property (alternative casing)', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { mimeType: 'application/pdf' },
        })
      );
      fixture.detectChanges();
      expect(component.canRenderPdf()).toBeTrue();
    });
  });

  describe('getFileTypeLabel', () => {
    it('returns empty string when no document', () => {
      expect(component.getFileTypeLabel(null)).toBe('');
    });

    it('returns empty string when typ is a string', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.fil.typ]: 'somestring' });
      expect(component.getFileTypeLabel(doc)).toBe('');
    });

    it('returns label from object properties', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.fil.typ]: { 'entity-type': 'directoryEntry', id: 'pdf', properties: { label: 'PDF' } },
      });
      expect(component.getFileTypeLabel(doc)).toBe('PDF');
    });

    it('returns empty string when properties has no label', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.fil.typ]: { 'entity-type': 'directoryEntry', id: 'pdf', properties: {} },
      });
      expect(component.getFileTypeLabel(doc)).toBe('');
    });
  });

  describe('getDate', () => {
    it('returns string for valid date', () => {
      const result = component.getDate('2024-01-15');
      expect(typeof result).toBe('string');
    });

    it('returns missing marker for undefined', () => {
      const result = component.getDate(undefined);
      expect(typeof result).toBe('string');
    });
  });

  describe('saveEdits', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
    });

    it('calls editDocument with correct docId', () => {
      apiSpy.editDocument.calls.reset();
      component.saveEdits({ title: 'New Title', description: 'Desc', subjects: [] });
      expect(apiSpy.editDocument).toHaveBeenCalledWith('doc-1', jasmine.objectContaining({}));
    });

    it('closes edit dialog on success', () => {
      component.openEditDialog();
      component.saveEdits({ title: 'New Title', description: 'Desc', subjects: [] });
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('emits reloadDocument on success', () => {
      let emitted = false;
      component.reloadDocument.subscribe(() => (emitted = true));
      component.saveEdits({ title: 'New Title', description: 'Desc', subjects: [] });
      expect(emitted).toBeTrue();
    });

    it('sets isSavingEdit to false after success', () => {
      component.saveEdits({ title: 'New Title', description: 'Desc', subjects: [] });
      expect(component.isSavingEdit()).toBeFalse();
    });

    it('does nothing when no document uid', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      apiSpy.editDocument.calls.reset();
      component.saveEdits({ title: 'New Title' });
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('maps subjects array of objects with id', () => {
      apiSpy.editDocument.calls.reset();
      component.saveEdits({ title: 'T', subjects: [{ id: 'subj1' }, { id: 'subj2' }] });
      const callArgs = apiSpy.editDocument.calls.mostRecent().args[1];
      expect(callArgs[NUXEO_SCHEMA_FIELDS.dc.subjects]).toEqual(['subj1', 'subj2']);
    });
  });

  describe('ngOnDestroy', () => {
    it('does not throw', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
