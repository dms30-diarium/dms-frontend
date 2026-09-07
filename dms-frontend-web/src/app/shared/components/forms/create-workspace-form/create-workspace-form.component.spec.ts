import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateWorkspaceFormComponent } from './create-workspace-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Workspace', title: '' });
const MOCK_DOC = makeNuxeoDocument({ uid: 'ws-1', type: 'Workspace', title: 'W' });

describe('CreateWorkspaceFormComponent', () => {
  let component: CreateWorkspaceFormComponent;
  let fixture: ComponentFixture<CreateWorkspaceFormComponent>;
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
      imports: [CreateWorkspaceFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirSpy },
      ],
    })
      .overrideTemplate(CreateWorkspaceFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateWorkspaceFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/workspaces');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Workspace', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/workspaces', 'Workspace');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload()).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createWorkspaceConfig has 6 fields', () => {
      expect(component.createWorkspaceConfig().length).toBe(6);
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload.set(null);
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Workspace' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Workspace', type: 'Workspace' }),
        '/domain/workspaces'
      );
    });

    it('uses "workspace" as fallback name when title is empty', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: '' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect(payload.name).toBe('workspace');
    });

    it('emits dialogClosed on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeTruthy();
    });

    it('sets isLoading to false after success', () => {
      component.createDocument({ title: 'T' });
      expect(component.isLoading()).toBeFalse();
    });

    it('does not include description when blank', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T', description: '' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const descKey = Object.keys(payload.properties).find(k => k.includes('description'));
      expect(descKey).toBeUndefined();
    });

    it('includes description when provided', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T', description: 'Some description' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const descKey = Object.keys(payload.properties).find(k => k.includes('description'));
      expect((payload.properties as Record<string, unknown>)[descKey!]).toBe('Some description');
    });
  });
});
