import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreatePictureFormComponent } from './create-picture-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Picture', title: '' });
const MOCK_DOC = makeNuxeoDocument({ uid: 'pic-1', type: 'Picture', title: 'P' });

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

describe('CreatePictureFormComponent', () => {
  let component: CreatePictureFormComponent;
  let fixture: ComponentFixture<CreatePictureFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirSpy: jasmine.SpyObj<DirectoryOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'createDocument',
      'initializeUpload',
      'uploadFile',
      'getPathInfo',
    ]);
    dirSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of([{}]));
    apiSpy.getPathInfo.and.returnValue(of(MOCK_DOC));
    dirSpy.getNatureOptions.and.returnValue(of([]));
    dirSpy.getSubjectOptions.and.returnValue(of([]));
    dirSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CreatePictureFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirSpy },
      ],
    })
      .overrideTemplate(CreatePictureFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreatePictureFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/pictures');
    fixture.componentRef.setInput('itemType', 'Picture');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults with path and itemType', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/pictures', 'Picture');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload()).toEqual(MOCK_PAYLOAD);
    });

    it('calls directory option services', () => {
      expect(dirSpy.getNatureOptions).toHaveBeenCalled();
      expect(dirSpy.getCoverageOptions).toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createPictureConfig has 7 fields', () => {
      expect(component.createPictureConfig().length).toBe(7);
    });

    it('includes uploadFile field', () => {
      const names = component.createPictureConfig().map(f => f.name);
      expect(names).toContain('uploadFile');
    });
  });

  describe('onFileUpload', () => {
    it('ignores non-uploadFile field', () => {
      component.onFileUpload({ files: [makeUploadedFile('f.jpg')], fieldName: 'other' });
      expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
    });

    it('clears fileBatchId when files empty', () => {
      component.fileBatchId = 'old-batch';
      component.onFileUpload({ files: [], fieldName: 'uploadFile' });
      expect(component.fileBatchId).toBe('');
    });

    it('clears title defaultValue when files empty', () => {
      component.onFileUpload({ files: [], fieldName: 'uploadFile' });
      const titleField = component.createPictureConfig().find(f => f.name === 'title');
      expect(titleField?.defaultValue).toBe('');
    });

    it('calls initializeUpload when file provided', () => {
      apiSpy.initializeUpload.calls.reset();
      component.onFileUpload({ files: [makeUploadedFile('photo.jpg')], fieldName: 'uploadFile' });
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
    });

    it('sets uploadedFileName from file', () => {
      component.onFileUpload({ files: [makeUploadedFile('photo.jpg')], fieldName: 'uploadFile' });
      expect(component.uploadedFileName).toBe('photo.jpg');
    });

    it('sets fileBatchId from batch result', () => {
      component.onFileUpload({ files: [makeUploadedFile('f.jpg')], fieldName: 'uploadFile' });
      expect(component.fileBatchId).toBe('batch-1');
    });

    it('updates title defaultValue with filename', () => {
      component.onFileUpload({ files: [makeUploadedFile('my-photo.jpg')], fieldName: 'uploadFile' });
      const titleField = component.createPictureConfig().find(f => f.name === 'title');
      expect(titleField?.defaultValue).toBe('my-photo.jpg');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload.set(null);
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('shows warning when fileBatchId not set', () => {
      component.fileBatchId = '';
      let emitted = false;
      component.dialogClosed.subscribe(() => (emitted = true));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeFalse();
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('calls createDocument API when fileBatchId set', () => {
      component.fileBatchId = 'batch-1';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Picture' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Picture', type: 'Picture' }),
        '/domain/pictures'
      );
    });

    it('uses uploadedFileName as fallback title', () => {
      component.fileBatchId = 'batch-1';
      component.uploadedFileName = 'photo.jpg';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: '' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect(payload.name).toBe('photo.jpg');
    });

    it('emits dialogClosed on success', () => {
      component.fileBatchId = 'batch-1';
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeTruthy();
    });

    it('sets isLoading false after success', () => {
      component.fileBatchId = 'batch-1';
      component.createDocument({ title: 'T' });
      expect(component.isLoading()).toBeFalse();
    });
  });
});
