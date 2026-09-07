import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateFileFormComponent } from './create-file-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

describe('CreateFileFormComponent', () => {
  let component: CreateFileFormComponent;
  let fixture: ComponentFixture<CreateFileFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirOptSpy: jasmine.SpyObj<DirectoryOptionsService>;
  let storeSpy: { notification: { set: jasmine.Spy }; navigationPanelContext: () => null; getValue: jasmine.Spy };

  function setup(itemType = 'File') {
    fixture.componentRef.setInput('path', '/default/path');
    fixture.componentRef.setInput('itemType', itemType);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    storeSpy = {
      notification: { set: jasmine.createSpy('set') },
      navigationPanelContext: () => null,
      getValue: jasmine.createSpy('getValue').and.returnValue(null),
    };

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getEmptyWithDefaults',
      'initializeUpload',
      'uploadFile',
      'createDocument',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(makeNuxeoDocument({ uid: 'empty-1', type: 'File' })));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of({}));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'new-1', type: 'File' })));

    dirOptSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    dirOptSpy.getNatureOptions.and.returnValue(of([]));
    dirOptSpy.getSubjectOptions.and.returnValue(of([]));
    dirOptSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CreateFileFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeSpy },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
      ],
    })
      .overrideTemplate(CreateFileFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateFileFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit for File type', () => {
    beforeEach(() => setup('File'));

    it('calls getEmptyWithDefaults', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/default/path', 'File');
    });

    it('sets defaultPayload from API', () => {
      expect(component.defaultPayload()).not.toBeNull();
    });

    it('calls directory option services', () => {
      expect(dirOptSpy.getNatureOptions).toHaveBeenCalled();
      expect(dirOptSpy.getSubjectOptions).toHaveBeenCalled();
      expect(dirOptSpy.getCoverageOptions).toHaveBeenCalled();
    });

    it('builds config with 7 fields for File type', () => {
      expect(component.createFileConfig().length).toBe(7);
    });

    it('config includes nature, subjects, coverage, expires for File', () => {
      const names = component.createFileConfig().map(f => f.name);
      expect(names).toContain('nature');
      expect(names).toContain('subjects');
      expect(names).toContain('coverage');
      expect(names).toContain('expires');
    });
  });

  describe('ngOnInit for Utkastmall type', () => {
    beforeEach(() => setup('Utkastmall'));

    it('does not call directory option services', () => {
      expect(dirOptSpy.getNatureOptions).not.toHaveBeenCalled();
    });

    it('includes templateProperties component field', () => {
      const names = component.createFileConfig().map(f => f.name);
      expect(names).toContain('templateProperties');
    });

    it('does not include nature for Utkastmall', () => {
      const names = component.createFileConfig().map(f => f.name);
      expect(names).not.toContain('nature');
    });
  });

  describe('ngOnInit for EPostmall type', () => {
    beforeEach(() => setup('EPostmall'));

    it('does not call directory option services', () => {
      expect(dirOptSpy.getNatureOptions).not.toHaveBeenCalled();
    });

    it('includes subject field for EPostmall', () => {
      const names = component.createFileConfig().map(f => f.name);
      expect(names).toContain('subject');
    });

    it('does not include nature for EPostmall', () => {
      const names = component.createFileConfig().map(f => f.name);
      expect(names).not.toContain('nature');
    });
  });

  describe('signals initial state', () => {
    beforeEach(() => setup());

    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('templateProperties defaults to empty array', () => {
      expect(component.templateProperties()).toEqual([]);
    });

    it('fileBatchId defaults to empty string', () => {
      expect(component.fileBatchId).toBe('');
    });
  });

  describe('onFileUpload', () => {
    beforeEach(() => setup());

    it('ignores events where fieldName is not uploadFile', () => {
      const spy = spyOn(component, 'uploadFile');
      component.onFileUpload({ files: [], fieldName: 'other' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('calls uploadFile for uploadFile fieldName', () => {
      const spy = spyOn(component, 'uploadFile');
      component.onFileUpload({ files: [], fieldName: 'uploadFile' });
      expect(spy).toHaveBeenCalledWith([]);
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => setup());

    it('clears fileBatchId and uploadedFileName when files is empty', () => {
      component.fileBatchId = 'existing-batch';
      component.uploadFile([]);
      expect(component.fileBatchId).toBe('');
    });

    it('sets uploadedFileName from first file', () => {
      component.uploadFile([makeUploadedFile('photo.jpg')]);
      expect(component.uploadedFileName).toBe('photo.jpg');
    });

    it('calls initializeUpload and uploadFile on API', () => {
      component.uploadFile([makeUploadedFile('file.pdf')]);
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
      expect(apiSpy.uploadFile).toHaveBeenCalled();
    });

    it('updates title field default value to file name', () => {
      component.uploadFile([makeUploadedFile('report.docx')]);
      const titleField = component.createFileConfig().find(f => f.name === 'title');
      expect(titleField?.defaultValue).toBe('report.docx');
    });
  });

  describe('createDocument', () => {
    beforeEach(() => setup());

    it('throws when defaultPayload is null', () => {
      component.defaultPayload.set(null);
      component.fileBatchId = 'batch-1';
      expect(() => component.createDocument({ title: 'Test' })).toThrow();
    });

    it('sets notification when no fileBatchId', () => {
      component.fileBatchId = '';
      component.createDocument({ title: 'Test' });
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('calls createDocument API with batch info', () => {
      component.fileBatchId = 'batch-x';
      component.createDocument({ title: 'My File', description: 'desc' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({
          name: 'My File',
          properties: jasmine.objectContaining({
            'file:content': jasmine.objectContaining({ 'upload-batch': 'batch-x' }),
          }),
        }),
        '/default/path'
      );
    });

    it('emits dialogClosed on success', () => {
      component.fileBatchId = 'batch-x';
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'My File' });
      expect(emitted).toBeTruthy();
    });

    it('uses uploadedFileName when title is null/undefined', () => {
      component.fileBatchId = 'batch-x';
      component.uploadedFileName = 'uploaded.pdf';
      component.createDocument({ title: null });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'uploaded.pdf' }),
        '/default/path'
      );
    });

    it('uses Utkastmall type from itemType', () => {
      setup('Utkastmall');
      component.fileBatchId = 'batch-x';
      component.createDocument({ title: 'Template File' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'Utkastmall' }),
        '/default/path'
      );
    });

    it('emits dialogClosed with null on createDocument error', () => {
      component.fileBatchId = 'batch-x';
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('fail')));
      let emitted: unknown = 'not-set';
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'My File' });
      expect(emitted).toBeNull();
    });

    it('shows warning notification when fileBatchId is empty', () => {
      component.fileBatchId = '';
      component.createDocument({ title: 'Test' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'warning' }));
    });

    it('shows danger notification on createDocument error', () => {
      component.fileBatchId = 'batch-x';
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('fail')));
      component.createDocument({ title: 'My File' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });

    it('passes subject field for EPostmall type', () => {
      setup('EPostmall');
      component.fileBatchId = 'batch-e';
      component.createDocument({ title: 'Email Template', subject: 'Re: test' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'EPostmall' }),
        '/default/path'
      );
    });

    it('passes templateProperties for Utkastmall type', () => {
      setup('Utkastmall');
      component.fileBatchId = 'batch-u';
      component.createDocument({
        title: 'Draft',
        templateProperties: [{ nyckel: 'key1', varde: 'val1' }],
      });
      expect(apiSpy.createDocument).toHaveBeenCalled();
    });
  });

  describe('uploadFile error path', () => {
    beforeEach(() => setup());

    it('shows danger notification when upload fails', () => {
      apiSpy.initializeUpload.and.returnValue(throwError(() => new Error('upload fail')));
      component.uploadFile([makeUploadedFile('fail.pdf')]);
      expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });

    it('resets isLoading to false after upload error', () => {
      apiSpy.initializeUpload.and.returnValue(throwError(() => new Error('fail')));
      component.uploadFile([makeUploadedFile('fail.pdf')]);
      expect(component.isLoading()).toBeFalse();
    });
  });
});
