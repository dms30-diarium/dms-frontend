import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateVideoFormComponent } from './create-video-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Video', title: '' });

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

function setup(path = '/folder', itemType = 'Video') {
  const fixture = TestBed.createComponent(CreateVideoFormComponent);
  const component = fixture.componentInstance;
  fixture.componentRef.setInput('path', path);
  fixture.componentRef.setInput('itemType', itemType);
  fixture.detectChanges();
  return { fixture, component };
}

describe('CreateVideoFormComponent', () => {
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirOptSpy: jasmine.SpyObj<DirectoryOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'initializeUpload',
      'uploadFile',
      'createDocument',
      'getPathInfo',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of([{}]));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'vid-1', type: 'Video', title: 'v' })));
    apiSpy.getPathInfo.and.returnValue(of(makeNuxeoDocument()));

    dirOptSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    dirOptSpy.getNatureOptions.and.returnValue(of([]));
    dirOptSpy.getSubjectOptions.and.returnValue(of([]));
    dirOptSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CreateVideoFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
      ],
    })
      .overrideTemplate(CreateVideoFormComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults with path and itemType', () => {
      setup('/videos', 'Video');
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/videos', 'Video');
    });

    it('calls getNatureOptions from DirectoryOptionsService', () => {
      setup();
      expect(dirOptSpy.getNatureOptions).toHaveBeenCalled();
    });

    it('calls getSubjectOptions from DirectoryOptionsService', () => {
      setup();
      expect(dirOptSpy.getSubjectOptions).toHaveBeenCalled();
    });

    it('calls getCoverageOptions from DirectoryOptionsService', () => {
      setup();
      expect(dirOptSpy.getCoverageOptions).toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      const { component } = setup();
      expect(component.isLoading()).toBeFalse();
    });

    it('createVideoConfig has 7 fields', () => {
      const { component } = setup();
      expect(component.createVideoConfig().length).toBe(7);
    });

    it('first field is title input', () => {
      const { component } = setup();
      expect(component.createVideoConfig()[0].name).toBe('title');
    });

    it('includes uploadFile field', () => {
      const { component } = setup();
      const names = component.createVideoConfig().map(f => f.name);
      expect(names).toContain('uploadFile');
    });
  });

  describe('onFileUpload', () => {
    it('does nothing when fieldName is not uploadFile', () => {
      const { component } = setup();
      component.onFileUpload({ files: [makeUploadedFile('file.mp4')], fieldName: 'other' });
      expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
    });

    it('clears fileBatchId when files is empty', () => {
      const { component } = setup();
      component.onFileUpload({ files: [], fieldName: 'uploadFile' });
      expect(component.fileBatchId).toBe('');
    });

    it('calls initializeUpload when file provided', () => {
      const { component } = setup();
      apiSpy.initializeUpload.calls.reset();
      component.onFileUpload({ files: [makeUploadedFile('vid.mp4')], fieldName: 'uploadFile' });
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
    });

    it('sets uploadedFileName from file name', () => {
      const { component } = setup();
      component.onFileUpload({ files: [makeUploadedFile('my-video.mp4')], fieldName: 'uploadFile' });
      expect(component.uploadedFileName).toBe('my-video.mp4');
    });

    it('updates title field defaultValue to file name', () => {
      const { component } = setup();
      component.onFileUpload({ files: [makeUploadedFile('clip.mp4')], fieldName: 'uploadFile' });
      const titleField = component.createVideoConfig().find(f => f.name === 'title');
      expect(titleField?.defaultValue).toBe('clip.mp4');
    });
  });

  describe('createDocument', () => {
    it('does not call createDocument when no defaultPayload', () => {
      const { component } = setup();
      component.defaultPayload.set(null);
      apiSpy.createDocument.calls.reset();
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('shows warning and returns when no fileBatchId', () => {
      const { component } = setup();
      component.fileBatchId = '';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T' });
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('calls API when fileBatchId is set', () => {
      const { component } = setup();
      component.fileBatchId = 'batch-123';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Video' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'My Video' }), '/folder');
    });

    it('emits dialogClosed with result on success', () => {
      const { component } = setup();
      component.fileBatchId = 'batch-123';
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'My Video' });
      expect(emitted).toBeTruthy();
    });

    it('uses uploadedFileName when title is empty', () => {
      const { component } = setup();
      component.fileBatchId = 'batch-123';
      component.uploadedFileName = 'uploaded.mp4';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: '' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect(payload.title).toBe('uploaded.mp4');
    });
  });
});
