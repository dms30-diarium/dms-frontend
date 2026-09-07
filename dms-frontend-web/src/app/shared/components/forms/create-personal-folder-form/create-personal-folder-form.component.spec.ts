import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreatePersonalFolderFormComponent } from './create-personal-folder-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Folder', title: '', properties: {}, repository: 'default' });
const MOCK_DOC = makeNuxeoDocument({ uid: 'f-1', type: 'Folder', title: 'F', properties: {} });

describe('CreatePersonalFolderFormComponent', () => {
  let component: CreatePersonalFolderFormComponent;
  let fixture: ComponentFixture<CreatePersonalFolderFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirSpy: jasmine.SpyObj<DirectoryOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    dirSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));
    dirSpy.getNatureOptions.and.returnValue(of([]));
    dirSpy.getSubjectOptions.and.returnValue(of([]));
    dirSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CreatePersonalFolderFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirSpy },
      ],
    })
      .overrideTemplate(CreatePersonalFolderFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreatePersonalFolderFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/personal');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Folder', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/personal', 'Folder');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload()).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createFolderConfig has 6 fields', () => {
      expect(component.createFolderConfig().length).toBe(6);
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload.set(null);
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Folder' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Folder', type: 'Folder' }),
        '/domain/personal'
      );
    });

    it('uses "folder" as fallback name when title is empty', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: '' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      expect(payload.name).toBe('folder');
    });

    it('emits dialogClosed on success', () => {
      let emitted: NuxeoDocument | null | undefined;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeTruthy();
    });

    it('sets isLoading to false after success', () => {
      component.createDocument({ title: 'T' });
      expect(component.isLoading()).toBeFalse();
    });
  });
});
