import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateAudioFormComponent } from './create-audio-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Audio', title: '' });

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

function setup(path = '/folder', itemType = 'Audio') {
  const fixture = TestBed.createComponent(CreateAudioFormComponent);
  const component = fixture.componentInstance;
  fixture.componentRef.setInput('path', path);
  fixture.componentRef.setInput('itemType', itemType);
  fixture.detectChanges();
  return { fixture, component };
}

describe('CreateAudioFormComponent', () => {
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
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'aud-1', type: 'Audio', title: 'a' })));
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
      imports: [CreateAudioFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
      ],
    })
      .overrideTemplate(CreateAudioFormComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults', () => {
      setup('/audio', 'Audio');
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/audio', 'Audio');
    });

    it('calls directory option services', () => {
      setup();
      expect(dirOptSpy.getNatureOptions).toHaveBeenCalled();
      expect(dirOptSpy.getSubjectOptions).toHaveBeenCalled();
      expect(dirOptSpy.getCoverageOptions).toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      const { component } = setup();
      expect(component.isLoading()).toBeFalse();
    });

    it('createAudioConfig has 7 fields', () => {
      const { component } = setup();
      expect(component.createAudioConfig().length).toBe(7);
    });

    it('includes uploadFile field', () => {
      const { component } = setup();
      const names = component.createAudioConfig().map(f => f.name);
      expect(names).toContain('uploadFile');
    });
  });

  describe('onFileUpload', () => {
    it('does nothing for non-uploadFile field', () => {
      const { component } = setup();
      component.onFileUpload({ files: [makeUploadedFile('a.mp3')], fieldName: 'other' });
      expect(apiSpy.initializeUpload).not.toHaveBeenCalled();
    });

    it('clears fileBatchId when files empty', () => {
      const { component } = setup();
      component.onFileUpload({ files: [], fieldName: 'uploadFile' });
      expect(component.fileBatchId).toBe('');
    });

    it('calls initializeUpload when file provided', () => {
      const { component } = setup();
      apiSpy.initializeUpload.calls.reset();
      component.onFileUpload({ files: [makeUploadedFile('track.mp3')], fieldName: 'uploadFile' });
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
    });

    it('sets uploadedFileName', () => {
      const { component } = setup();
      component.onFileUpload({ files: [makeUploadedFile('sound.mp3')], fieldName: 'uploadFile' });
      expect(component.uploadedFileName).toBe('sound.mp3');
    });

    it('updates title field with file name', () => {
      const { component } = setup();
      component.onFileUpload({ files: [makeUploadedFile('track.mp3')], fieldName: 'uploadFile' });
      const titleField = component.createAudioConfig().find(f => f.name === 'title');
      expect(titleField?.defaultValue).toBe('track.mp3');
    });
  });

  describe('createDocument', () => {
    it('throws when no defaultPayload', () => {
      const { component } = setup();
      component.defaultPayload.set(null);
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('shows warning when no fileBatchId', () => {
      const { component } = setup();
      component.fileBatchId = '';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T' });
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('calls createDocument API when fileBatchId set', () => {
      const { component } = setup();
      component.fileBatchId = 'batch-1';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Audio' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'My Audio' }), '/folder');
    });

    it('emits dialogClosed on success', () => {
      const { component } = setup();
      component.fileBatchId = 'batch-1';
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeTruthy();
    });

    it('uses uploadedFileName when title is empty', () => {
      const { component } = setup();
      component.fileBatchId = 'batch-1';
      component.uploadedFileName = 'uploaded.mp3';
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: '' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect(payload.title).toBe('uploaded.mp3');
    });
  });
});
