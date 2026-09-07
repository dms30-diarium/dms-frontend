import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PdfViewerComponent } from './pdf-viewer.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { UploadedFile } from '../file-upload/file-upload.component';

function makeUploadedFile(name: string, id: string): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

describe('PdfViewerComponent', () => {
  let component: PdfViewerComponent;
  let fixture: ComponentFixture<PdfViewerComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'downloadFile',
      'deleteDocument',
      'initializeUpload',
      'uploadFile',
      'updateFile',
      'attachFile',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.downloadFile.and.returnValue('/nuxeo/download/doc-1');
    apiSpy.deleteDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of({}));
    apiSpy.updateFile.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.attachFile.and.returnValue(of(makeNuxeoDocument()));

    await TestBed.configureTestingModule({
      imports: [PdfViewerComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(PdfViewerComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(PdfViewerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', makeNuxeoDocument({ uid: 'doc-1' }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('computes the download url from the document uid', () => {
    expect(apiSpy.downloadFile).toHaveBeenCalledWith('doc-1');
    expect(component.downloadUrl).toBe('/nuxeo/download/doc-1');
  });

  describe('getFileType', () => {
    it('returns "pdf" by default', () => {
      expect(component.fileType()).toBe('pdf');
    });

    it('returns "img" for image mime types', () => {
      fixture.componentRef.setInput('mimeType', 'image/png');
      expect(component.getFileType()).toBe('img');
    });

    it('returns "video" for video mime types', () => {
      fixture.componentRef.setInput('mimeType', 'video/mp4');
      expect(component.getFileType()).toBe('video');
    });

    it('reads mime type from the document file:content property', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument({
          uid: 'doc-2',
          properties: { [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'image/jpeg' } } as never,
        })
      );
      expect(component.getFileType()).toBe('img');
    });
  });

  describe('getFileBlob / fileName / fileSize / hasFileMetadata', () => {
    it('returns undefined fileName when there is no blob', () => {
      expect(component.fileName()).toBe('');
      expect(component.fileSize()).toBe('');
      expect(component.hasFileMetadata()).toBeFalse();
    });

    it('reads the file name and size from file:content', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument({
          uid: 'doc-3',
          properties: {
            [NUXEO_SCHEMA_FIELDS.file.content]: { name: 'report.pdf', length: 2048 },
          } as never,
        })
      );
      expect(component.fileName()).toBe('report.pdf');
      expect(component.fileSize()).not.toBe('');
      expect(component.hasFileMetadata()).toBeTrue();
    });

    it('falls back to fil:vattenstampel when file:content is absent', () => {
      fixture.componentRef.setInput(
        'doc',
        makeNuxeoDocument({
          uid: 'doc-4',
          properties: {
            [NUXEO_SCHEMA_FIELDS.fil.vattenstampel]: { name: 'watermark.pdf', length: 1024 },
          } as never,
        })
      );
      expect(component.fileName()).toBe('watermark.pdf');
    });
  });

  describe('getFileLink', () => {
    it('uses blobUrl when provided', () => {
      fixture.componentRef.setInput('blobUrl', '/blob/preview.pdf');
      const link = component.getFileLink();
      expect(
        (link as { changingThisBreaksApplicationSecurity: string }).changingThisBreaksApplicationSecurity
      ).toContain(encodeURIComponent('/blob/preview.pdf'));
    });

    it('builds a rendition pdf url when no other source is available', () => {
      const link = component.getFileLink() as { changingThisBreaksApplicationSecurity: string };
      const decoded = decodeURIComponent(link.changingThisBreaksApplicationSecurity);
      expect(decoded).toContain('@rendition/pdf');
    });
  });

  describe('deleteAttachment', () => {
    it('deletes the document and emits reloadDocument', () => {
      const spy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(spy);
      component.deleteAttachment();
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('doc-1');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('initializes the upload and uploads the file batch', () => {
      const files = [makeUploadedFile('a.pdf', 'id-1')];
      component.uploadFile(files);
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
      expect(apiSpy.uploadFile).toHaveBeenCalledWith('batch-1', files);
      expect(component.fileBatchId).toBe('batch-1');
    });
  });

  describe('printFile', () => {
    it('emits backendPrintRequested when useBackendPrint is true', () => {
      fixture.componentRef.setInput('useBackendPrint', true);
      const spy = jasmine.createSpy('backendPrintRequested');
      component.backendPrintRequested.subscribe(spy);

      component.printFile();

      expect(spy).toHaveBeenCalledWith(component.doc());
    });

    it('does not throw when there is no pdf frame available', () => {
      expect(() => component.printFile()).not.toThrow();
    });
  });

  describe('confirmFileReplace', () => {
    it('does nothing when there is no pending file', () => {
      component.confirmFileReplace();
      expect(apiSpy.updateFile).not.toHaveBeenCalled();
      expect(apiSpy.attachFile).not.toHaveBeenCalled();
    });

    it('updates the existing document file when doc has a uid', () => {
      const files = [makeUploadedFile('a.pdf', 'id-1')];
      component.uploadFile(files);
      component.confirmFileReplace();
      expect(apiSpy.updateFile).toHaveBeenCalledWith('doc-1', 'batch-1', files[0]);
    });

    it('attaches the file to the parent document when doc has no uid', () => {
      fixture.componentRef.setInput('doc', makeNuxeoDocument({ uid: '' }));
      fixture.componentRef.setInput('parentDoc', makeNuxeoDocument({ uid: 'parent-1' }));
      const files = [makeUploadedFile('a.pdf', 'id-1')];
      component.uploadFile(files);

      component.confirmFileReplace();

      expect(apiSpy.attachFile).toHaveBeenCalledWith('batch-1', 'a.pdf', 'parent-1');
    });
  });
});
