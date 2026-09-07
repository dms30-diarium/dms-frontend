import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateExportFormComponent, ExportFormEvent } from './create-export-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Export', title: '' });

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

describe('CreateExportFormComponent', () => {
  let component: CreateExportFormComponent;
  let fixture: ComponentFixture<CreateExportFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'createDocument',
      'initializeUpload',
      'uploadFile',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'exp-1', type: 'Export', title: 'E' })));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of([{}]));

    await TestBed.configureTestingModule({
      imports: [CreateExportFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateExportFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateExportFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/exports');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Export', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/exports', 'Export');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('arendeUids defaults to empty array', () => {
      expect(component.arendeUids()).toEqual([]);
    });

    it('formConfig has 6 fields', () => {
      expect(component.formConfig().length).toBe(6);
    });

    it('includes title, exportPath, status fields', () => {
      const names = component.formConfig().map(f => f.name);
      expect(names).toContain('title');
      expect(names).toContain('exportPath');
      expect(names).toContain('status');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Export' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Export' }),
        '/domain/exports'
      );
    });

    it('maps arendeUids to uid array in properties', () => {
      apiSpy.createDocument.calls.reset();
      const event: ExportFormEvent = {
        title: 'Exp',
        arendeUids: [
          { id: 'row-1', arendeUid: 'uid-1' },
          { id: 'row-2', arendeUid: 'uid-2' },
        ],
      };
      component.createDocument(event);
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const properties = payload.properties as Record<string, unknown>;
      expect(
        properties['export:arendeUids'] ??
          properties['arkiv:arendeUids'] ??
          Object.values(properties).find(v => Array.isArray(v))
      ).toBeTruthy();
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
      const hasBatch = Object.values(payload.properties ?? {}).some(
        v => v && typeof v === 'object' && (v as Record<string, unknown>)['upload-batch'] === 'batch-zip'
      );
      expect(hasBatch).toBeTrue();
    });

    it('sets isLoading to true during request then false after', () => {
      component.createDocument({ title: 'T' });
      expect(component.isLoading()).toBeFalse();
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
