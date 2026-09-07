import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateArkivFormComponent, ArkivFormEvent } from './create-arkiv-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Arkiv', title: '' });

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

describe('CreateArkivFormComponent', () => {
  let component: CreateArkivFormComponent;
  let fixture: ComponentFixture<CreateArkivFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'DMSDocumentSuggestion',
      'createDocument',
      'initializeUpload',
      'uploadFile',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'ark-1', type: 'Arkiv', title: 'A' })));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of([{}]));

    await TestBed.configureTestingModule({
      imports: [CreateArkivFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateArkivFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateArkivFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/arkiv');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Arkiv', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/arkiv', 'Arkiv');
    });

    it('calls DMSDocumentSuggestion for Myndighet', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('', 'Myndighet', '');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });

    it('populates myndighetOptions from entries', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'm1', title: 'Myndighet 1', path: '/m1' })] }))
      );
      component.ngOnInit();
      expect(component.myndighetOptions().length).toBe(1);
      expect(component.myndighetOptions()[0].id).toBe('m1');
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('arendeUids defaults to empty array', () => {
      expect(component.arendeUids()).toEqual([]);
    });

    it('formConfig has 9 fields', () => {
      expect(component.formConfig().length).toBe(9);
    });

    it('includes title, description, exportPath fields', () => {
      const names = component.formConfig().map(f => f.name);
      expect(names).toContain('title');
      expect(names).toContain('description');
      expect(names).toContain('exportPath');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Archive', arendeUids: [] });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Archive' }),
        '/domain/arkiv'
      );
    });

    it('maps arendeUids to uid array in properties', () => {
      apiSpy.createDocument.calls.reset();
      const event: ArkivFormEvent = {
        title: 'Ark',
        arendeUids: [
          { id: 'row-1', arendeUid: 'uid-1' },
          { id: 'row-2', arendeUid: 'uid-2' },
        ],
      };
      component.createDocument(event);
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect((payload.properties as Record<string, unknown>)['arkiv:arendeUids']).toEqual(['uid-1', 'uid-2']);
    });

    it('emits dialogClosed on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeTruthy();
    });

    it('includes exportZipBatchId in payload when set', () => {
      component.exportZipBatchId = 'batch-zip';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect((payload.properties as Record<string, unknown>)['arkiv:exportZip']).toBeTruthy();
    });
  });

  describe('onFileUpload', () => {
    it('ignores non-exportZip field', () => {
      component.onFileUpload({ files: [makeUploadedFile('f.zip')], fieldName: 'other' });
      expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
    });

    it('clears exportZipBatchId when files empty', () => {
      component.exportZipBatchId = 'old-batch';
      component.onFileUpload({ files: [], fieldName: 'exportZip' });
      expect(component.exportZipBatchId).toBe('');
    });

    it('calls initializeUpload when file provided', () => {
      apiSpy.initializeUpload.calls.reset();
      component.onFileUpload({ files: [makeUploadedFile('export.zip')], fieldName: 'exportZip' });
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
    });

    it('sets exportZipBatchId from batch result', () => {
      component.onFileUpload({ files: [makeUploadedFile('export.zip')], fieldName: 'exportZip' });
      expect(component.exportZipBatchId).toBe('batch-1');
    });
  });
});
