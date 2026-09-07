import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { DocumentPreviewComponent } from './document-preview.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { DocumentVersionService } from '@app/core/services/document-version.service';
import { Direction, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

const noteDocument: NuxeoDocument = {
  'entity-type': 'document',
  repository: 'default',
  uid: 'note-1',
  path: '/default-domain/workspaces/note-1',
  type: 'Note',
  name: 'note-1',
  title: 'Note title',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {
    [NUXEO_SCHEMA_FIELDS.dc.title]: 'Note title',
    [NUXEO_SCHEMA_FIELDS.note.note]: '<p>Initial note</p>',
    [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 1,
    [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 2,
  },
};

const fileDocument: NuxeoDocument = {
  ...noteDocument,
  uid: 'file-1',
  type: 'File',
  title: 'File title',
  properties: {
    [NUXEO_SCHEMA_FIELDS.dc.title]: 'File title',
    [NUXEO_SCHEMA_FIELDS.file.content]: {
      name: 'file.pdf',
      data: '/nuxeo/nxfile/default/file-1/file:content/file.pdf',
      'mime-type': 'application/pdf',
    },
  },
};

const audioDocument: NuxeoDocument = {
  ...noteDocument,
  uid: 'audio-1',
  type: 'Audio',
  changeToken: '1-0',
  properties: {
    [NUXEO_SCHEMA_FIELDS.dc.title]: 'Audio title',
    [NUXEO_SCHEMA_FIELDS.file.content]: {
      name: 'audio.mp3',
      'mime-type': 'audio/mpeg',
    },
  },
};

const directoryEntry: Direction = {
  id: 'nature-1',
  displayLabel: 'Nature 1',
};

describe('DocumentPreviewComponent', () => {
  let component: DocumentPreviewComponent;
  let fixture: ComponentFixture<DocumentPreviewComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let versionSpy: jasmine.SpyObj<DocumentVersionService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'downloadFile',
      'initializeUpload',
      'uploadFile',
      'updateFile',
      'editDocument',
      'getSourceDocumentFromProxy',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(of([directoryEntry]));
    apiSpy.downloadFile.and.returnValue('/nuxeo/nxfile/default/audio-1/file:content/audio.mp3');
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of({}));
    apiSpy.updateFile.and.returnValue(of(fileDocument));
    apiSpy.editDocument.and.returnValue(of(noteDocument));
    apiSpy.getSourceDocumentFromProxy.and.returnValue(of(noteDocument));

    versionSpy = jasmine.createSpyObj('DocumentVersionService', [
      'getDocumentVersions',
      'getVersionDocument',
      'restoreVersion',
    ]);
    versionSpy.getDocumentVersions.and.returnValue(of([noteDocument]));
    versionSpy.getVersionDocument.and.returnValue(of({ ...noteDocument, uid: 'version-1' }));
    versionSpy.restoreVersion.and.returnValue(of(noteDocument));

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        GeneralStore,
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DocumentVersionService, useValue: versionSpy },
      ],
    })
      .overrideTemplate(DocumentPreviewComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DocumentPreviewComponent);
    fixture.componentRef.setInput('document', noteDocument);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates and exposes note title, content and version labels', () => {
    expect(component).toBeTruthy();
    expect(component.title()).toBe('Note title');
    expect(component.getNoteContent()).toBe('<p>Initial note</p>');
    expect(component.getCurrentNoteVersionOptionLabel()).toBe('Aktuell (1.2)');
    expect(component.getNoteVersionOptionLabel(noteDocument)).toContain('Version 1.2');
  });

  it('builds audio source and download urls with client reason', () => {
    fixture.componentRef.setInput('document', audioDocument);

    expect(component.isAudioDocument()).toBeTrue();
    expect(component.audioSourceUrl()).toContain('clientReason=view');
    expect(component.audioDownloadUrl()).toContain('clientReason=download');
    expect(component.audioMimeType()).toBe('audio/mpeg');
  });

  it('opens and closes edit dialogs for notes and files', () => {
    component.openEditDialog();

    expect(component.isEditDialogOpen()).toBeTrue();
    expect(component.noteEditConfig().length).toBeGreaterThan(0);

    component.closeEditDialog();
    fixture.componentRef.setInput('document', fileDocument);
    component.openEditDialog();

    expect(component.isEditDialogOpen()).toBeTrue();
    expect(component.fileEditConfig().length).toBeGreaterThan(0);
  });

  it('warns for empty inline note and saves non-empty inline note', () => {
    const store = TestBed.inject(GeneralStore);
    const reloadSpy = jasmine.createSpy('reloadDocument');
    component.reloadDocument.subscribe(reloadSpy);

    component.onNoteDraftChange('<p> </p>');
    component.saveInlineNote();

    expect(store.notification().variation).toBe('warning');

    component.onNoteDraftChange('<p>Updated note</p>');
    component.saveInlineNote();

    expect(apiSpy.editDocument).toHaveBeenCalledWith('note-1', {
      [NUXEO_SCHEMA_FIELDS.note.note]: '<p>Updated note</p>',
    });
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('saves full note edits and file edits', () => {
    component.saveNoteEdits({
      title: 'Updated note',
      description: 'Description',
      format: 'text/html',
      note: '<p>Body</p>',
      nature: { id: 'nature-1' },
      coverage: { id: 'coverage-1' },
      subjects: [{ id: 'subject-1' }],
      expires: [new Date('2026-06-20T00:00:00.000Z')],
    });

    fixture.componentRef.setInput('document', fileDocument);
    component.saveFileEdits({
      title: 'Updated file',
      description: 'File description',
      nature: 'nature-1',
      coverage: 'coverage-1',
      subjects: [{ id: 'subject-1' }],
      expires: [new Date('2026-06-20T00:00:00.000Z')],
    });

    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'note-1',
      jasmine.objectContaining({
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Updated note',
        [NUXEO_SCHEMA_FIELDS.note.note]: '<p>Body</p>',
      })
    );
    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'file-1',
      jasmine.objectContaining({
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Updated file',
      })
    );
  });

  it('uploads and confirms audio replacement', () => {
    const reloadSpy = jasmine.createSpy('reloadDocument');
    component.reloadDocument.subscribe(reloadSpy);
    fixture.componentRef.setInput('document', audioDocument);
    const file = Object.assign(new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' }), { id: 'upload-1' });

    component.openAudioReplaceDialog();
    component.onAudioReplaceFiles([file]);
    component.confirmAudioReplace();

    expect(component.isAudioReplaceDialogOpen()).toBeFalse();
    expect(apiSpy.initializeUpload).toHaveBeenCalled();
    expect(apiSpy.uploadFile).toHaveBeenCalledWith('batch-1', [file]);
    expect(apiSpy.updateFile).toHaveBeenCalledWith('audio-1', 'batch-1', file);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('selects and restores note versions', () => {
    const store = TestBed.inject(GeneralStore);
    const reloadSpy = jasmine.createSpy('reloadDocument');
    component.reloadDocument.subscribe(reloadSpy);

    component.onNoteVersionSelect('version-1');

    expect(component.selectedNoteVersionId()).toBe('version-1');
    expect(component.notePreviewDoc()?.uid).toBe('version-1');
    expect(component.getActiveNoteVersionLabel()).toBe('Vald version (1.2)');

    component.openRestoreDialog();
    component.restoreSelectedNoteVersion();

    expect(versionSpy.restoreVersion).toHaveBeenCalledWith('version-1', false);
    expect(component.isRestoreDialogOpen()).toBeFalse();
    expect(store.notification().variation).toBe('success');
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('title() falls back to doc.title when dc:title is absent', () => {
    const doc: NuxeoDocument = { ...noteDocument, uid: 'no-dctitle', properties: {} };
    fixture.componentRef.setInput('document', doc);
    expect(component.title()).toBe('Note title');
  });

  it('title() falls back to doc.uid when dc:title and title are absent', () => {
    const doc: NuxeoDocument = { ...noteDocument, uid: 'fallback-uid', title: '', properties: {} };
    fixture.componentRef.setInput('document', doc);
    expect(component.title()).toBe('fallback-uid');
  });

  it('title() returns empty string when document is null', () => {
    fixture.componentRef.setInput('document', null);
    expect(component.title()).toBe('');
  });

  it('isNoteDocument is false for File type', () => {
    fixture.componentRef.setInput('document', fileDocument);
    expect(component.isNoteDocument()).toBeFalse();
    expect(component.isAudioDocument()).toBeFalse();
  });

  it('getNoteContent returns empty string when document is not a Note', () => {
    fixture.componentRef.setInput('document', fileDocument);
    expect(component.getNoteContent()).toBe('');
  });

  it('getNoteContent returns empty string for null note property', () => {
    const doc: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.note.note]: null,
      },
    };
    fixture.componentRef.setInput('document', doc);
    expect(component.getNoteContent()).toBe('');
  });

  it('hasMainFile is false when document has no content fields', () => {
    const doc: NuxeoDocument = { ...noteDocument, properties: {} };
    fixture.componentRef.setInput('document', doc);
    expect(component.hasMainFile()).toBeFalse();
  });

  it('hasMainFile is true when fil:vattenstampel is present', () => {
    const doc: NuxeoDocument = {
      ...noteDocument,
      type: 'File',
      properties: {
        [NUXEO_SCHEMA_FIELDS.fil.vattenstampel]: { name: 'stamp.pdf' },
      },
    };
    fixture.componentRef.setInput('document', doc);
    expect(component.hasMainFile()).toBeTrue();
  });

  it('hasMainFile is false when document is null', () => {
    fixture.componentRef.setInput('document', null);
    expect(component.hasMainFile()).toBeFalse();
  });

  it('audioSourceUrl uses blobUrl fallback when data is not a string', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: {
          name: 'audio.mp3',
          blobUrl: 'https://blob.example.com/audio.mp3',
          'mime-type': 'audio/mpeg',
        },
      },
    };
    fixture.componentRef.setInput('document', doc);
    const url = component.audioSourceUrl();
    expect(url).toContain('blob.example.com');
    expect(url).toContain('clientReason=view');
  });

  it('audioSourceUrl builds from uid/fileName when no data or blobUrl', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      uid: 'audio-2',
      changeToken: 'ct-2',
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: {
          name: 'track.mp3',
          'mime-type': 'audio/mpeg',
        },
      },
    };
    fixture.componentRef.setInput('document', doc);
    const url = component.audioSourceUrl();
    expect(url).toContain('/nuxeo/nxfile/default/audio-2/file:content/track.mp3');
    expect(url).toContain('clientReason=view');
  });

  it('audioSourceUrl returns empty string when no uid or fileName', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      uid: '',
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'audio/mpeg' },
      },
    };
    fixture.componentRef.setInput('document', doc);
    expect(component.audioSourceUrl()).toBe('');
  });

  it('audioSourceUrl returns empty string when document is null', () => {
    fixture.componentRef.setInput('document', null);
    expect(component.audioSourceUrl()).toBe('');
  });

  it('audioSourceUrl does not double-append clientReason if already present', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: {
          data: 'https://example.com/audio.mp3?clientReason=view',
          'mime-type': 'audio/mpeg',
        },
      },
    };
    fixture.componentRef.setInput('document', doc);
    const url = component.audioSourceUrl();
    expect(url.match(/clientReason/g)?.length).toBe(1);
  });

  it('audioDownloadUrl falls back to downloadFile when uid present but no fileName', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      uid: 'audio-3',
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'audio/mpeg' },
      },
    };
    fixture.componentRef.setInput('document', doc);
    const url = component.audioDownloadUrl();
    expect(apiSpy.downloadFile).toHaveBeenCalledWith('audio-3');
    expect(url).toContain('clientReason=download');
  });

  it('audioDownloadUrl returns empty string when document is null', () => {
    fixture.componentRef.setInput('document', null);
    expect(component.audioDownloadUrl()).toBe('');
  });

  it('audioDownloadUrl returns empty string when no uid and no data', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      uid: '',
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'audio/mpeg' },
      },
    };
    fixture.componentRef.setInput('document', doc);
    expect(component.audioDownloadUrl()).toBe('');
  });

  it('audioMimeType falls back to audio/mpeg when mime-type is missing', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: { name: 'audio.mp3' },
      },
    };
    fixture.componentRef.setInput('document', doc);
    expect(component.audioMimeType()).toBe('audio/mpeg');
  });

  it('audioMimeType falls back to audio/mpeg when file content is absent', () => {
    const doc: NuxeoDocument = { ...audioDocument, properties: {} };
    fixture.componentRef.setInput('document', doc);
    expect(component.audioMimeType()).toBe('audio/mpeg');
  });

  it('audioMimeType uses the provided mime-type when it is a non-empty string', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'audio/ogg' },
      },
    };
    fixture.componentRef.setInput('document', doc);
    expect(component.audioMimeType()).toBe('audio/ogg');
  });

  it('getNoteVersionOptionLabel returns Version • date when no version numbers', () => {
    const noVersionDoc: NuxeoDocument = { ...noteDocument, properties: {} };
    const label = component.getNoteVersionOptionLabel(noVersionDoc);
    expect(label).toContain('Version •');
  });

  it('getCurrentNoteVersionOptionLabel returns Aktuell (without version) when doc has no version', () => {
    const doc: NuxeoDocument = { ...noteDocument, properties: {} };
    fixture.componentRef.setInput('document', doc);
    expect(component.getCurrentNoteVersionOptionLabel()).toBe('Aktuell');
  });

  it('getCurrentNoteVersionOptionLabel returns Aktuell when document is null', () => {
    fixture.componentRef.setInput('document', null);
    expect(component.getCurrentNoteVersionOptionLabel()).toBe('Aktuell');
  });

  it('getActiveNoteVersionLabel returns current version label when no preview doc selected', () => {
    expect(component.getActiveNoteVersionLabel()).toBe('Aktuell (1.2)');
  });

  it('getActiveNoteVersionLabel returns Vald version (without label) when preview doc has no version', () => {
    const noVersionDoc: NuxeoDocument = { ...noteDocument, uid: 'version-2', properties: {} };
    versionSpy.getVersionDocument.and.returnValue(of(noVersionDoc));
    component.onNoteVersionSelect('version-2');
    expect(component.getActiveNoteVersionLabel()).toBe('Vald version');
  });

  it('onNoteVersionSelect with empty string clears preview doc', () => {
    component.onNoteVersionSelect('version-1');
    expect(component.selectedNoteVersionId()).toBe('version-1');

    component.onNoteVersionSelect('');
    expect(component.selectedNoteVersionId()).toBe('');
    expect(component.notePreviewDoc()).toBeNull();
  });

  it('onNoteVersionSelect on non-Note document is a no-op', () => {
    fixture.componentRef.setInput('document', fileDocument);
    component.onNoteVersionSelect('version-1');
    expect(component.selectedNoteVersionId()).toBe('');
  });

  it('onNoteVersionSelect handles error by clearing preview doc and version id', () => {
    versionSpy.getVersionDocument.and.returnValue(throwError(() => new Error('Load failed')));
    component.onNoteVersionSelect('bad-version');
    expect(component.notePreviewDoc()).toBeNull();
    expect(component.selectedNoteVersionId()).toBe('');
  });

  it('openRestoreDialog does not open when no version is selected', () => {
    component.openRestoreDialog();
    expect(component.isRestoreDialogOpen()).toBeFalse();
  });

  it('restoreSelectedNoteVersion shows danger notification on error', () => {
    const store = TestBed.inject(GeneralStore);
    versionSpy.restoreVersion.and.returnValue(throwError(() => new Error('Restore failed')));
    component.onNoteVersionSelect('version-1');
    component.openRestoreDialog();
    component.restoreSelectedNoteVersion();

    expect(store.notification().variation).toBe('danger');
  });

  it('restoreSelectedNoteVersion is no-op when no version is selected', () => {
    component.restoreSelectedNoteVersion();
    expect(versionSpy.restoreVersion).not.toHaveBeenCalled();
  });

  it('openNoteEdit sets noteEditMode to text and opens dialog', () => {
    component.openNoteEdit();
    expect(component.noteEditMode()).toBe('text');
    expect(component.isEditDialogOpen()).toBeTrue();
    expect(component.noteEditConfig().length).toBeGreaterThan(0);
  });

  it('openNoteEdit is no-op when document is not Note', () => {
    fixture.componentRef.setInput('document', fileDocument);
    component.openNoteEdit();
    expect(component.isEditDialogOpen()).toBeFalse();
  });

  it('openNoteEdit is no-op when a version is selected', () => {
    component.onNoteVersionSelect('version-1');
    component.openNoteEdit();
    expect(component.isEditDialogOpen()).toBeFalse();
  });

  it('saveNoteEdits in text-only mode sends only note content', () => {
    const reloadSpy = jasmine.createSpy('reloadDocument');
    component.reloadDocument.subscribe(reloadSpy);

    component.openNoteEdit();
    component.saveNoteEdits({ note: '<p>Text only</p>' });

    expect(apiSpy.editDocument).toHaveBeenCalledWith('note-1', {
      [NUXEO_SCHEMA_FIELDS.note.note]: '<p>Text only</p>',
    });
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('saveNoteEdits is no-op when document uid is absent', () => {
    fixture.componentRef.setInput('document', null);
    component.saveNoteEdits({ note: 'test' });
    expect(apiSpy.editDocument).not.toHaveBeenCalled();
  });

  it('saveNoteEdits shows danger notification on API error', () => {
    const store = TestBed.inject(GeneralStore);
    apiSpy.editDocument.and.returnValue(throwError(() => new Error('Edit failed')));
    component.saveNoteEdits({ title: 'T', note: '<p>Content</p>' });
    expect(store.notification().variation).toBe('danger');
  });

  it('saveNoteEdits handles subjects as non-array gracefully', () => {
    component.saveNoteEdits({
      title: 'T',
      note: '<p>Content</p>',
      subjects: null,
      expires: null,
    });
    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'note-1',
      jasmine.objectContaining({ [NUXEO_SCHEMA_FIELDS.dc.subjects]: [] })
    );
  });

  it('saveInlineNote is no-op when document is not a Note', () => {
    fixture.componentRef.setInput('document', fileDocument);
    component.onNoteDraftChange('<p>Changed</p>');
    component.saveInlineNote();
    expect(apiSpy.editDocument).not.toHaveBeenCalled();
  });

  it('saveInlineNote is no-op when a version is selected', () => {
    component.onNoteVersionSelect('version-1');
    component.onNoteDraftChange('<p>Changed</p>');
    component.saveInlineNote();
    expect(apiSpy.editDocument).toHaveBeenCalledTimes(0);
  });

  it('saveInlineNote is no-op when note is not dirty', () => {
    component.saveInlineNote();
    expect(apiSpy.editDocument).not.toHaveBeenCalled();
  });

  it('isNoteDirty is false before any change', () => {
    expect(component.isNoteDirty()).toBeFalse();
  });

  it('isNoteDirty is true after changing note content', () => {
    component.onNoteDraftChange('<p>New content</p>');
    expect(component.isNoteDirty()).toBeTrue();
  });

  it('saveFileEdits for Utkastmall sends template properties', () => {
    const utkastmallDoc: NuxeoDocument = {
      ...fileDocument,
      uid: 'utkast-1',
      type: 'Utkastmall',
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Template',
        [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [{ nyckel: 'key1', varde: 'value1' }],
      },
    };
    fixture.componentRef.setInput('document', utkastmallDoc);
    component.saveFileEdits({
      title: 'Template title',
      description: 'Desc',
      templateProperties: [{ nyckel: 'key1', varde: 'value1' }],
    });

    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'utkast-1',
      jasmine.objectContaining({
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Template title',
        [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: jasmine.any(Array),
      })
    );
  });

  it('saveFileEdits for EPostmall sends amne field', () => {
    const epostmallDoc: NuxeoDocument = {
      ...fileDocument,
      uid: 'epost-1',
      type: 'EPostmall',
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Email template',
      },
    };
    fixture.componentRef.setInput('document', epostmallDoc);
    component.saveFileEdits({
      title: 'Email title',
      description: 'Desc',
      subject: 'Re: something',
    });

    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'epost-1',
      jasmine.objectContaining({
        [NUXEO_SCHEMA_FIELDS.epostmall.amne]: 'Re: something',
      })
    );
  });

  it('saveFileEdits shows danger notification on error', () => {
    const store = TestBed.inject(GeneralStore);
    apiSpy.editDocument.and.returnValue(throwError(() => new Error('Error')));
    fixture.componentRef.setInput('document', fileDocument);
    component.saveFileEdits({ title: 'File', description: '' });
    expect(store.notification().variation).toBe('danger');
  });

  it('saveFileEdits is no-op when document uid is absent', () => {
    fixture.componentRef.setInput('document', null);
    component.saveFileEdits({ title: 'X' });
    expect(apiSpy.editDocument).not.toHaveBeenCalled();
  });

  it('openEditDialog builds file config for Utkastmall document', () => {
    const utkastmallDoc: NuxeoDocument = {
      ...fileDocument,
      type: 'Utkastmall',
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Utkast',
        [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [],
      },
    };
    fixture.componentRef.setInput('document', utkastmallDoc);
    component.openEditDialog();
    expect(component.isEditDialogOpen()).toBeTrue();
    const config = component.fileEditConfig();
    expect(config.length).toBeGreaterThan(0);
    const hasTemplateProps = config.some(f => f.name === 'templateProperties');
    expect(hasTemplateProps).toBeTrue();
  });

  it('openEditDialog builds file config for EPostmall document', () => {
    const epostmallDoc: NuxeoDocument = {
      ...fileDocument,
      type: 'EPostmall',
      properties: { [NUXEO_SCHEMA_FIELDS.dc.title]: 'Email' },
    };
    fixture.componentRef.setInput('document', epostmallDoc);
    component.openEditDialog();
    expect(component.isEditDialogOpen()).toBeTrue();
    const config = component.fileEditConfig();
    const hasSubject = config.some(f => f.name === 'subject');
    expect(hasSubject).toBeTrue();
  });

  it('openEditDialog is no-op when document is null', () => {
    fixture.componentRef.setInput('document', null);
    component.openEditDialog();
    expect(component.isEditDialogOpen()).toBeFalse();
  });

  it('saveNoteEdits for proxy document resolves source document uid', () => {
    const proxyDoc: NuxeoDocument = {
      ...noteDocument,
      uid: 'proxy-1',
      isProxy: true,
    };
    fixture.componentRef.setInput('document', proxyDoc);
    apiSpy.getSourceDocumentFromProxy.and.returnValue(of({ ...noteDocument, uid: 'source-1' }));
    component.saveNoteEdits({ title: 'T', note: '<p>Content</p>' });

    expect(apiSpy.getSourceDocumentFromProxy).toHaveBeenCalledWith('proxy-1');
    expect(apiSpy.editDocument).toHaveBeenCalledWith('source-1', jasmine.any(Object));
  });

  it('closeAudioReplaceDialog closes the audio replace dialog', () => {
    component.openAudioReplaceDialog();
    expect(component.isAudioReplaceDialogOpen()).toBeTrue();

    component.closeAudioReplaceDialog();
    expect(component.isAudioReplaceDialogOpen()).toBeFalse();
  });

  it('onAudioReplaceFiles with empty array clears batch id without uploading', () => {
    component.audioReplaceFileBatchId.set('existing-batch');
    component.onAudioReplaceFiles([]);

    expect(component.audioReplaceFileBatchId()).toBe('');
    expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
  });

  it('confirmAudioReplace is no-op when no files are set', () => {
    fixture.componentRef.setInput('document', audioDocument);
    component.openAudioReplaceDialog();
    component.confirmAudioReplace();
    expect(apiSpy.updateFile).not.toHaveBeenCalled();
  });

  it('confirmAudioReplace is no-op when document is null', () => {
    fixture.componentRef.setInput('document', null);
    component.confirmAudioReplace();
    expect(apiSpy.updateFile).not.toHaveBeenCalled();
  });

  it('resolvedNoteEditorConfig is editable when no version selected and not saving', () => {
    const config = component.resolvedNoteEditorConfig();
    expect(config.editable).toBeTrue();
    expect(config.showToolbar).toBeTrue();
  });

  it('resolvedNoteEditorConfig is read-only when a version is selected', () => {
    component.onNoteVersionSelect('version-1');
    const config = component.resolvedNoteEditorConfig();
    expect(config.editable).toBeFalse();
    expect(config.showToolbar).toBeFalse();
  });

  it('editDialogHeading returns note heading for Note documents', () => {
    expect(component.editDialogHeading()).toBe('Redigera anteckning');
  });

  it('editDialogHeading returns file heading for non-Note documents', () => {
    fixture.componentRef.setInput('document', fileDocument);
    expect(component.editDialogHeading()).toBe('Redigera fil');
  });

  it('getDate returns a formatted date string for a valid ISO date', () => {
    const result = component.getDate('2026-06-15T00:00:00.000Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('getDate handles null value gracefully', () => {
    const result = component.getDate(null);
    expect(typeof result).toBe('string');
  });

  it('ngOnDestroy sets store.openPage to null', () => {
    const store = TestBed.inject(GeneralStore);
    component.ngOnDestroy();
    expect(store.openPage()).toBeNull();
  });

  it('saveFileEdits handles expires as a single value (not an array)', () => {
    fixture.componentRef.setInput('document', fileDocument);
    const singleDate = new Date('2026-08-01');
    component.saveFileEdits({
      title: 'File',
      description: '',
      expires: singleDate,
    });
    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'file-1',
      jasmine.objectContaining({ [NUXEO_SCHEMA_FIELDS.dc.expired]: singleDate })
    );
  });

  it('getNoteVersionOptionLabel shows only major version when minor is absent', () => {
    const majorOnlyDoc: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 3,
      },
    };
    const label = component.getNoteVersionOptionLabel(majorOnlyDoc);
    expect(label).toContain('Version 3');
  });

  it('handles directory entries with children (e.g. l10nsubjects)', async () => {
    const parentEntry: Direction = {
      id: 'parent',
      displayLabel: 'Parent',
      children: [
        {
          computedId: 'parent/child-1',
          absoluteLabel: 'Parent / Child 1',
        },
      ],
    };
    apiSpy.getDirectorySuggestions.and.returnValue(of([parentEntry]));

    fixture = TestBed.createComponent(DocumentPreviewComponent);
    fixture.componentRef.setInput('document', noteDocument);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.noteSubjectOptions()).toBeDefined();
  });

  it('mapDirectoryEntries filters out child entries without a computedId', () => {
    const entryWithBadChild: Direction = {
      id: 'top',
      displayLabel: 'Top',
      children: [
        { absoluteLabel: 'No Id Child', computedId: '' },
        { computedId: 'top/valid', absoluteLabel: 'Valid Child' },
      ],
    };
    apiSpy.getDirectorySuggestions.and.returnValue(of([entryWithBadChild]));

    fixture = TestBed.createComponent(DocumentPreviewComponent);
    fixture.componentRef.setInput('document', noteDocument);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const options = component.noteNatureOptions();
    const validOptions = options.filter(o => o.id === 'valid');
    expect(validOptions.length).toBe(1);
  });

  it('mapDirectoryEntries handles top-level entry without id or computedId', () => {
    const entryWithNoId: Direction = {
      id: '',
      displayLabel: 'No id entry',
      children: [],
    };
    apiSpy.getDirectorySuggestions.and.returnValue(of([entryWithNoId]));

    fixture = TestBed.createComponent(DocumentPreviewComponent);
    fixture.componentRef.setInput('document', noteDocument);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.noteNatureOptions()).toEqual([]);
  });

  it('mapDirectoryEntries uses displayLabel, absoluteLabel, computedId and id as label fallbacks', () => {
    const entries: Direction[] = [
      { id: 'e1', displayLabel: 'Absolute Label', absoluteLabel: 'Absolute Label' },
      { id: 'e2', displayLabel: 'Display Label' },
      { id: 'e3', label: 'Plain Label', displayLabel: '' } as Direction,
    ];
    apiSpy.getDirectorySuggestions.and.returnValue(of(entries));

    fixture = TestBed.createComponent(DocumentPreviewComponent);
    fixture.componentRef.setInput('document', noteDocument);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const options = component.noteNatureOptions();
    expect(options.find(o => o.id === 'e1')?.label).toBe('Absolute Label');
    expect(options.find(o => o.id === 'e2')?.label).toBe('Display Label');
    expect(options.find(o => o.id === 'e3')?.label).toBeTruthy();
  });

  it('toDatepickerValue: handles ISO date input via expires field', () => {
    const expires = '2027-01-01T00:00:00.000Z';
    const docWithExpires: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Note',
        [NUXEO_SCHEMA_FIELDS.note.note]: '',
        [NUXEO_SCHEMA_FIELDS.dc.expired]: expires,
      },
    };
    fixture.componentRef.setInput('document', docWithExpires);
    component.openEditDialog();
    const expiresField = component.noteEditConfig().find(f => f.name === 'expires');
    expect(expiresField?.defaultValue).toBeTruthy();
  });

  it('toDatepickerValue: handles ISO timestamp via expires field', () => {
    const timestamp = '2027-06-01T00:00:00.000Z';
    const docWithExpires: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Note',
        [NUXEO_SCHEMA_FIELDS.note.note]: '',
        [NUXEO_SCHEMA_FIELDS.dc.expired]: timestamp,
      },
    };
    fixture.componentRef.setInput('document', docWithExpires);
    component.openEditDialog();
    const expiresField = component.noteEditConfig().find(f => f.name === 'expires');
    expect(expiresField?.defaultValue).toBeTruthy();
  });

  it('toDatepickerValue: returns null for invalid date string', () => {
    const docWithExpires: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Note',
        [NUXEO_SCHEMA_FIELDS.note.note]: '',
        [NUXEO_SCHEMA_FIELDS.dc.expired]: 'not-a-date',
      },
    };
    fixture.componentRef.setInput('document', docWithExpires);
    component.openEditDialog();
    const expiresField = component.noteEditConfig().find(f => f.name === 'expires');
    expect(expiresField?.defaultValue).toBeNull();
  });

  it('toDatepickerValue: returns null for null/undefined expires', () => {
    const docWithNoExpires: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Note',
        [NUXEO_SCHEMA_FIELDS.note.note]: '',
      },
    };
    fixture.componentRef.setInput('document', docWithNoExpires);
    component.openEditDialog();
    const expiresField = component.noteEditConfig().find(f => f.name === 'expires');
    expect(expiresField?.defaultValue).toBeNull();
  });

  it('downloadAudio exits early when audioDownloadUrl computed is empty string', () => {
    const emptyDoc: NuxeoDocument = {
      ...audioDocument,
      uid: '',
      properties: { [NUXEO_SCHEMA_FIELDS.file.content]: {} },
    };
    fixture.componentRef.setInput('document', emptyDoc);
    expect(component.audioDownloadUrl()).toBe('');
    expect(() => component.downloadAudio()).not.toThrow();
  });

  it('downloadAudio does nothing when audioDownloadUrl is empty', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      uid: '',
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: {},
      },
    };
    fixture.componentRef.setInput('document', doc);

    expect(() => component.downloadAudio()).not.toThrow();
  });

  it('openNoteEdit does not throw when doc is null', () => {
    fixture.componentRef.setInput('document', null);
    expect(() => component.openNoteEdit()).not.toThrow();
  });

  it('saveNoteEdits handles expires value at index 0 of array', () => {
    const expiresDate = new Date('2027-03-15');
    component.saveNoteEdits({
      title: 'T',
      note: '<p>Content</p>',
      expires: [expiresDate],
    });
    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'note-1',
      jasmine.objectContaining({ [NUXEO_SCHEMA_FIELDS.dc.expired]: expiresDate })
    );
  });

  it('saveNoteEdits handles nature and coverage as plain object with value field', () => {
    component.saveNoteEdits({
      title: 'T',
      note: '<p>Content</p>',
      nature: { value: 'v1' },
      coverage: { value: 'cv1' },
    });
    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'note-1',
      jasmine.objectContaining({
        [NUXEO_SCHEMA_FIELDS.dc.nature]: 'v1',
        [NUXEO_SCHEMA_FIELDS.dc.coverage]: 'cv1',
      })
    );
  });

  it('saveNoteEdits sends null for empty nature and coverage', () => {
    component.saveNoteEdits({
      title: 'T',
      note: '<p>Content</p>',
      nature: '',
      coverage: '',
    });
    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'note-1',
      jasmine.objectContaining({
        [NUXEO_SCHEMA_FIELDS.dc.nature]: null,
        [NUXEO_SCHEMA_FIELDS.dc.coverage]: null,
      })
    );
  });

  it('saveFileEdits handles non-array subjects gracefully', () => {
    fixture.componentRef.setInput('document', fileDocument);
    component.saveFileEdits({
      title: 'File',
      description: '',
      subjects: null,
    });
    expect(apiSpy.editDocument).toHaveBeenCalledWith(
      'file-1',
      jasmine.objectContaining({ [NUXEO_SCHEMA_FIELDS.dc.subjects]: [] })
    );
  });

  it('saveFileEdits for Utkastmall filters out entries with only empty keys', () => {
    const utkastmallDoc: NuxeoDocument = {
      ...fileDocument,
      uid: 'utkast-filter',
      type: 'Utkastmall',
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Template',
        [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [],
      },
    };
    fixture.componentRef.setInput('document', utkastmallDoc);
    component.saveFileEdits({
      title: 'Template',
      description: '',
      templateProperties: [{ nyckel: '', varde: '' }, { nyckel: 'key', varde: 'val' }, null],
    });
    const payload = apiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
    const props = payload[NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper] as { nyckel: string; varde: string | null }[];
    expect(props.length).toBe(1);
    expect(props[0].nyckel).toBe('key');
  });

  it('normalizeTemplateProperties returns empty array when input is not an array', () => {
    const utkastmallDoc: NuxeoDocument = {
      ...fileDocument,
      uid: 'utkast-nonarr',
      type: 'Utkastmall',
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Template',
        [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: [],
      },
    };
    fixture.componentRef.setInput('document', utkastmallDoc);
    component.saveFileEdits({
      title: 'Template',
      description: '',
      templateProperties: null,
    });
    const payload = apiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
    const props = payload[NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper] as { nyckel: string; varde: string | null }[];
    expect(props).toEqual([]);
  });

  it('saveInlineNote is no-op when document uid is empty string', () => {
    const docNoUid: NuxeoDocument = { ...noteDocument, uid: '' };
    fixture.componentRef.setInput('document', docNoUid);
    component.onNoteDraftChange('<p>Content</p>');
    component.saveInlineNote();
    expect(apiSpy.editDocument).not.toHaveBeenCalled();
  });

  it('re-creates options and config when dialog is open and directory options reload', () => {
    component.openEditDialog();
    expect(component.isEditDialogOpen()).toBeTrue();

    apiSpy.getDirectorySuggestions.and.returnValue(of([{ id: 'new-nature', displayLabel: 'New Nature' }]));

    const fixture2 = TestBed.createComponent(DocumentPreviewComponent);
    fixture2.componentRef.setInput('document', noteDocument);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();
    component2.openEditDialog();

    expect(component2.isEditDialogOpen()).toBeTrue();
    expect(component2.noteEditConfig().length).toBeGreaterThan(0);
  });

  it('rebuilds fileEditConfig when directory options load and file dialog is open', () => {
    fixture.componentRef.setInput('document', fileDocument);
    component.openEditDialog();
    expect(component.isEditDialogOpen()).toBeTrue();
    expect(component.fileEditConfig().length).toBeGreaterThan(0);

    apiSpy.getDirectorySuggestions.and.returnValue(of([{ id: 'nat-reload', displayLabel: 'Nat Reload' }]));
    const fixture2 = TestBed.createComponent(DocumentPreviewComponent);
    fixture2.componentRef.setInput('document', fileDocument);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();
    component2.openEditDialog();
    expect(component2.fileEditConfig().length).toBeGreaterThan(0);
  });

  it('submitNoteEdit does not throw when no form is bound', () => {
    expect(() => component.submitNoteEdit()).not.toThrow();
  });

  it('submitFileEdit does not throw when no form is bound', () => {
    expect(() => component.submitFileEdit()).not.toThrow();
  });

  it('onAudioReplaceFiles handles upload error gracefully', () => {
    apiSpy.initializeUpload.and.returnValue(throwError(() => new Error('upload error')));
    fixture.componentRef.setInput('document', audioDocument);
    const file = Object.assign(new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' }), { id: 'err-file' });

    expect(() => component.onAudioReplaceFiles([file])).not.toThrow();
    expect(component.isUploadingAudioReplace()).toBeFalse();
  });

  it('audioDownloadUrl uses blobUrl when data is absent', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: {
          blobUrl: 'https://blob.example.com/audio.mp3',
          'mime-type': 'audio/mpeg',
        },
      },
    };
    fixture.componentRef.setInput('document', doc);
    const url = component.audioDownloadUrl();
    expect(url).toContain('blob.example.com');
    expect(url).toContain('clientReason=download');
  });

  it('audioDownloadUrl builds from uid/fileName when both blobUrl and data absent', () => {
    const doc: NuxeoDocument = {
      ...audioDocument,
      uid: 'audio-dl-4',
      changeToken: 'ct-dl-4',
      properties: {
        [NUXEO_SCHEMA_FIELDS.file.content]: {
          name: 'track-dl.mp3',
          'mime-type': 'audio/mpeg',
        },
      },
    };
    fixture.componentRef.setInput('document', doc);
    const url = component.audioDownloadUrl();
    expect(url).toContain('/nuxeo/nxfile/default/audio-dl-4/file:content/track-dl.mp3');
    expect(url).toContain('clientReason=download');
  });

  it('loadNoteDirectoryOptions rebuilds text-mode noteEditConfig when dialog is in text mode', () => {
    component.openNoteEdit();
    expect(component.noteEditMode()).toBe('text');

    const fixture2 = TestBed.createComponent(DocumentPreviewComponent);
    fixture2.componentRef.setInput('document', noteDocument);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();
    component2.openNoteEdit();
    expect(component2.noteEditMode()).toBe('text');
    expect(component2.noteEditConfig().length).toBeGreaterThan(0);

    expect(component2.noteEditConfig().find(f => f.name === 'note')).toBeDefined();
    expect(component2.noteEditConfig().find(f => f.name === 'title')).toBeUndefined();
  });

  it('buildNoteEditConfig keeps subjects empty when matching options are not loaded', () => {
    const docWithSubjects: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Note',
        [NUXEO_SCHEMA_FIELDS.note.note]: '',
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: [
          { 'entity-type': 'directoryEntry', id: 'subj-val-1', properties: { id: 'subj-val-1', label: 'Subject 1' } },
        ],
      },
    };
    fixture.componentRef.setInput('document', docWithSubjects);
    component.openEditDialog();
    const subjField = component.noteEditConfig().find(f => f.name === 'subjects');
    expect(subjField).toBeDefined();

    expect(subjField?.defaultValue).toEqual([]);
  });

  it('buildNoteEditConfig keeps directory-entry subjects empty when no matching options exist', () => {
    const docWithSubjectsSingle: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: 'Note',
        [NUXEO_SCHEMA_FIELDS.note.note]: '',
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: [
          {
            'entity-type': 'directoryEntry',
            id: 'single-subject',
            properties: { id: 'single-subject', label: 'Single Subject' },
          },
        ],
      },
    };
    fixture.componentRef.setInput('document', docWithSubjectsSingle);
    component.openEditDialog();
    const subjField = component.noteEditConfig().find(f => f.name === 'subjects');
    expect(subjField).toBeDefined();
    expect(subjField?.defaultValue).toEqual([]);
  });

  it('getNoteVersionOptionLabel shows Version • date when only minor version present', () => {
    const minorOnlyDoc: NuxeoDocument = {
      ...noteDocument,
      properties: {
        [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 5,
      },
    };
    const label = component.getNoteVersionOptionLabel(minorOnlyDoc);

    expect(label).toContain('5');
  });

  it('getActiveNoteVersionLabel returns Vald version when preview doc has no version numbers at all', () => {
    const noVersionDoc2: NuxeoDocument = {
      ...noteDocument,
      uid: 'version-none-2',
      properties: {},
    };
    versionSpy.getVersionDocument.and.returnValue(of(noVersionDoc2));
    component.onNoteVersionSelect('version-none-2');
    expect(component.getActiveNoteVersionLabel()).toBe('Vald version');
  });
});
