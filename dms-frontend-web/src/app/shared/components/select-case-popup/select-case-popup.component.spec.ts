import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SelectCaseComponent } from './select-case-popup.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore, BaseButton } from '@app/core/services/general-store.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NuxeoDocument, MessagesJson } from '@app/shared/api/nuxeo-api.types';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';

function makeStoreMock() {
  return {
    notification: { set: jasmine.createSpy('set') },
    navigationPanelContext: signal<'browse' | 'info' | null>(null),
    openPage: signal<string | null>(null),
    lastCreatedCase: signal<NuxeoDocument | null>(null),
    baseButtons: signal<BaseButton[]>([]),
    messagesInfo: signal<MessagesJson | null>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
  };
}

function makePathInfoResponse(overrides: Record<string, unknown> = {}) {
  return {
    ...makeNuxeoDocument({ uid: 'parent-uid', type: 'Handling', path: '/test' }),
    contextParameters: {
      subtypes: [
        { type: 'Arende', facets: [] },
        { type: 'Handling', facets: [] },
        { type: 'HiddenDoc', facets: ['HiddenInCreation'] },
        { type: 'OrderedFolder', facets: [] },
      ],
    },
    properties: {},
    ...overrides,
  };
}

describe('SelectCaseComponent', () => {
  let component: SelectCaseComponent;
  let fixture: ComponentFixture<SelectCaseComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let directoryOptionsSpy: jasmine.SpyObj<DirectoryOptionsService>;
  let router: Router;

  beforeEach(async () => {
    storeMock = makeStoreMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getPathInfo',
      'getEntriesForParentPath',
      'createDocument',
      'initializeUpload',
      'uploadFile',
      'attachFile',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getPathInfo.and.returnValue(of(makePathInfoResponse()));
    apiSpy.getEntriesForParentPath.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'new-uid', type: 'Arende' })));
    apiSpy.initializeUpload.and.returnValue(of({ batchId: 'batch-1' }));
    apiSpy.uploadFile.and.returnValue(of({}));
    apiSpy.attachFile.and.returnValue(of(makeNuxeoDocument({ uid: 'file-uid', type: 'File' })));

    directoryOptionsSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    directoryOptionsSpy.getNatureOptions.and.returnValue(of([]));
    directoryOptionsSpy.getSubjectOptions.and.returnValue(of([]));
    directoryOptionsSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SelectCaseComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: DirectoryOptionsService, useValue: directoryOptionsSpy },
      ],
    })
      .overrideTemplate(SelectCaseComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SelectCaseComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('documentPath', '/default-domain/workspaces');
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getOptions on init', () => {
      expect(apiSpy.getPathInfo).toHaveBeenCalled();
    });

    it('fetches nature, subject, and coverage options', () => {
      expect(directoryOptionsSpy.getNatureOptions).toHaveBeenCalled();
      expect(directoryOptionsSpy.getSubjectOptions).toHaveBeenCalled();
      expect(directoryOptionsSpy.getCoverageOptions).toHaveBeenCalled();
    });
  });

  describe('getOptions', () => {
    it('filters out HiddenInCreation subtypes', () => {
      expect(component.availableDocuments().some(s => s.facets.includes('HiddenInCreation'))).toBeFalse();
    });

    it('filters out hiddenTypes (OrderedFolder)', () => {
      expect(component.availableDocuments().some(s => s.type === 'OrderedFolder')).toBeFalse();
    });

    it('sets parentUid from response', () => {
      expect(component.parentUid()).toBe('parent-uid');
    });

    it('sets autocompleteOptions from entries', () => {
      const entries = [makeNuxeoDocument({ path: '/some/path' })];
      apiSpy.getEntriesForParentPath.and.returnValue(of(makeSearchResult({ entries })));
      component.getOptions('/test');
      expect(component.autocompleteOptions()).toEqual(entries);
    });

    it('sets autocompleteOptionsPaths with trailing slashes', () => {
      const entries = [makeNuxeoDocument({ path: '/some/path' })];
      apiSpy.getEntriesForParentPath.and.returnValue(of(makeSearchResult({ entries })));
      component.getOptions('/test');
      expect(component.autocompleteOptionsPaths()).toEqual(['/some/path/']);
    });

    it('restricts tabs to create-only for non-Handling parent type', () => {
      const response = makePathInfoResponse({ type: 'Arende' });
      apiSpy.getPathInfo.and.returnValue(of(response));
      component.getOptions('/arende');
      expect(component.tabs.length).toBe(1);
      expect(component.tabs[0].id).toBe('create');
    });

    it('restores both tabs for Handling parent type', () => {
      const response = makePathInfoResponse({ type: 'Handling' });
      apiSpy.getPathInfo.and.returnValue(of(response));
      component.getOptions('/handling');
      expect(component.tabs.length).toBe(2);
    });

    it('sets prefix to arende when parent is Arende type', () => {
      const response = makePathInfoResponse({ type: 'Arende' });
      apiSpy.getPathInfo.and.returnValue(of(response));
      component.getOptions('/arende');
      expect(component.prefix).toBe('arende');
    });

    it('sets prefix to handling for non-Arende type', () => {
      const response = makePathInfoResponse({ type: 'Handling' });
      apiSpy.getPathInfo.and.returnValue(of(response));
      component.getOptions('/handling');
      expect(component.prefix).toBe('handling');
    });
  });

  describe('getParentPath', () => {
    it('returns path as-is if it ends with /', () => {
      expect(component.getParentPath('/some/path/')).toBe('/some/path/');
    });

    it('returns parent path for nested path', () => {
      expect(component.getParentPath('/a/b/c')).toBe('a/b');
    });

    it('returns / for top-level path', () => {
      expect(component.getParentPath('/root')).toBe('/');
    });

    it('returns / for empty path', () => {
      expect(component.getParentPath('')).toBe('/');
    });
  });

  describe('updateOptions', () => {
    it('sets path signal', () => {
      component.updateOptions('/new/path/');
      expect(component.path()).toBe('/new/path/');
    });

    it('calls getOptions when parent path changes', () => {
      const initialCallCount = apiSpy.getPathInfo.calls.count();
      component.currentParentPath = '';
      component.updateOptions('/new/path/sub');
      expect(apiSpy.getPathInfo.calls.count()).toBeGreaterThan(initialCallCount);
    });

    it('does not call getOptions when parent path is unchanged', () => {
      component.updateOptions('/some/path/sub');
      const callCountAfterFirst = apiSpy.getPathInfo.calls.count();
      component.updateOptions('/some/path/other');
      expect(apiSpy.getPathInfo.calls.count()).toBe(callCountAfterFirst);
    });
  });

  describe('getIcon', () => {
    it('returns figmaIcon path for known icon types', () => {
      expect(component.getIcon('arende')).toContain('figmaIcons/arende.svg');
    });

    it('returns workspace svg for unknown types', () => {
      expect(component.getIcon('UnknownType')).toContain('workspace.svg');
    });
  });

  describe('onDocumentClick', () => {
    it('sets selectedType for known types', () => {
      component.onDocumentClick('Arende');
      expect(component.selectedType()).toBe('Arende');
    });

    it('sets heading to Skapa ärende for Arende', () => {
      component.onDocumentClick('Arende');
      expect(component.heading()).toBe('Skapa ärende');
    });

    it('sets heading to Skapa handling for Handling', () => {
      component.onDocumentClick('Handling');
      expect(component.heading()).toBe('Skapa handling');
    });

    it('sets heading to Skapa utkast for Utkast', () => {
      component.onDocumentClick('Utkast');
      expect(component.heading()).toBe('Skapa utkast');
    });

    it('sets heading to Skapa domän for Domain', () => {
      component.onDocumentClick('Domain');
      expect(component.heading()).toBe('Skapa domän');
    });

    it('sets heading to Skapa myndighet for Myndighet', () => {
      component.onDocumentClick('Myndighet');
      expect(component.heading()).toBe('Skapa myndighet');
    });

    it('uses generic Skapa <type> heading for default types', () => {
      component.onDocumentClick('Fil');
      expect(component.heading()).toBe('Skapa Fil');
    });

    it('does not change selectedType for unknown types', () => {
      component.selectedType.set('');
      component.onDocumentClick('SomethingUnknown');
      expect(component.selectedType()).toBe('');
    });

    it('emits organizationCreateSelected and returns early when useOrganizationCreateForm is true and type is Organisationsdel', () => {
      fixture.componentRef.setInput('useOrganizationCreateForm', true);
      const emitSpy = spyOn(component.organizationCreateSelected, 'emit');
      component.onDocumentClick('Organisationsdel');
      expect(emitSpy).toHaveBeenCalled();
      expect(component.selectedType()).toBe('');
    });
  });

  describe('onTabChanged', () => {
    it('updates activeTabId', () => {
      component.onTabChanged('import');
      expect(component.activeTabId).toBe('import');
    });
  });

  describe('uploadFile', () => {
    it('stores selected files', () => {
      const files: UploadedFile[] = [Object.assign(new File([], 'file.pdf'), { id: 'f1' }) as UploadedFile];
      component.uploadFile(files);
      expect(component.selectedFiles).toEqual(files);
    });
  });

  describe('closeDialog', () => {
    it('does nothing meaningful when result is null', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.closeDialog(null);
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(component.selectedType()).toBe('');
    });

    it('does nothing meaningful when result has no uid', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.closeDialog(makeNuxeoDocument({ uid: '' }));
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(component.selectedType()).toBe('');
    });

    it('navigates to /personal for personal workspace result', () => {
      const navigateSpy = spyOn(router, 'navigate');
      const dialogCloseSpy = spyOn(component.dialogClose, 'emit');
      const doc = makeNuxeoDocument({
        uid: 'ws-uid',
        type: 'Workspace',
        path: '/default-domain/UserWorkspaces/myworkspace',
      });
      component.closeDialog(doc);
      expect(navigateSpy).toHaveBeenCalledWith(
        ['/personal'],
        jasmine.objectContaining({ queryParams: { path: doc.path } })
      );
      expect(dialogCloseSpy).toHaveBeenCalled();
    });

    it('navigates to doc target path for other document types', () => {
      const navigateSpy = spyOn(router, 'navigate');
      const doc = makeNuxeoDocument({ uid: 'arende-uid', type: 'Arende', path: '/default-domain/workspaces/arende' });
      component.closeDialog(doc);
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('passes justCreated state when navigating for a new Arende', () => {
      const navigateSpy = spyOn(router, 'navigate');
      const doc = makeNuxeoDocument({ uid: 'arende-uid', type: 'Arende', path: '/default-domain/workspaces/arende' });
      component.closeDialog(doc);
      expect(navigateSpy).toHaveBeenCalledWith(['/doc/', 'arende-uid'], { state: { justCreated: true } });
    });

    it('does not pass justCreated state for non-Arende document types', () => {
      const navigateSpy = spyOn(router, 'navigate');
      const doc = makeNuxeoDocument({
        uid: 'handling-uid',
        type: 'Handling',
        path: '/default-domain/workspaces/handling',
      });
      component.closeDialog(doc);
      expect(navigateSpy).toHaveBeenCalledWith(['/doc/', 'handling-uid'], undefined);
    });
  });

  describe('createDocumentFile', () => {
    it('shows warning notification when no files selected', () => {
      component.selectedFiles = [];
      component.createDocumentFile();
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'warning' }));
    });

    it('calls API pipeline when files are selected', () => {
      component.selectedFiles = [Object.assign(new File([], 'doc.pdf'), { id: 'f1' }) as UploadedFile];
      component.createDocumentFile();
      expect(apiSpy.getPathInfo).toHaveBeenCalled();
      expect(apiSpy.initializeUpload).toHaveBeenCalled();
    });

    it('shows success notification and navigates on upload success', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.selectedFiles = [Object.assign(new File([], 'doc.pdf'), { id: 'f1' }) as UploadedFile];
      const fileDoc = makeNuxeoDocument({ uid: 'file-uid', type: 'File' });
      apiSpy.attachFile.and.returnValue(of(fileDoc));
      component.createDocumentFile();
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
      expect(navigateSpy).toHaveBeenCalled();
    });

    it('shows danger notification on upload error', () => {
      component.selectedFiles = [Object.assign(new File([], 'doc.pdf'), { id: 'f1' }) as UploadedFile];
      apiSpy.getPathInfo.and.returnValue(throwError(() => new Error('upload failed')));
      component.createDocumentFile();
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('saveReferences', () => {
    it('emits updateReferences and closes dialog', () => {
      const updateRefSpy = spyOn(component.updateReferences, 'emit');
      const dialogCloseSpy = spyOn(component.dialogClose, 'emit');
      component.saveReferences();
      expect(updateRefSpy).toHaveBeenCalled();
      expect(dialogCloseSpy).toHaveBeenCalled();
    });

    it('maps intArendeRefs to payload', () => {
      const updateRefSpy = spyOn(component.updateReferences, 'emit');
      component.intArendeRefs.set([{ caseRef: 'ref-1', comment: 'note', type: 'typ' }]);
      component.prefix = 'arende';
      component.saveReferences();
      expect(updateRefSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          'arende:intern_arendereferens': [{ arende: 'ref-1', referenstyp: 'typ', referenskommentar: 'note' }],
        })
      );
    });

    it('maps externArendeRefs to payload', () => {
      const updateRefSpy = spyOn(component.updateReferences, 'emit');
      component.externArendeRefs.set([{ referens: 'ext-ref', comment: 'kommentar' }]);
      component.prefix = 'handling';
      component.saveReferences();
      expect(updateRefSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          'handling:extern_referens': [{ referens: 'ext-ref', referenskommentar: 'kommentar' }],
        })
      );
    });
  });

  describe('onDomainFormResult', () => {
    it('calls createDocument and shows success notification', () => {
      const result = makeNuxeoDocument({ uid: 'domain-uid', type: 'Domain' });
      apiSpy.createDocument.and.returnValue(of(result));
      component.onDomainFormResult({ title: 'Test Domain', description: 'Desc' }, 'Domain');
      expect(apiSpy.createDocument).toHaveBeenCalled();
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
    });

    it('shows danger notification on createDocument error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('create failed')));
      component.onDomainFormResult({ title: 'Test' }, 'Domain');
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('onMyndighetFormResult', () => {
    it('calls createDocument and shows success notification', () => {
      const result = makeNuxeoDocument({ uid: 'myndighet-uid', type: 'Myndighet' });
      apiSpy.createDocument.and.returnValue(of(result));
      component.onMyndighetFormResult({ title: 'My Myndighet', description: '', organisationsnummer: '123' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
    });

    it('shows danger notification on error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('failed')));
      component.onMyndighetFormResult({ title: 'Fail', description: '', organisationsnummer: '000' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('onExportArMappFormResult', () => {
    it('calls createDocument and shows success on success', () => {
      const result = makeNuxeoDocument({ uid: 'export-uid', type: 'ExportArMapp' });
      apiSpy.createDocument.and.returnValue(of(result));
      component.onExportArMappFormResult({ title: 'ExportArMapp', description: '', ar: 2024 });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
    });

    it('shows danger notification on error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('failed')));
      component.onExportArMappFormResult({ title: 'Fail', description: '', ar: 2024 });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('onExportutrymmeFormResult', () => {
    it('calls createDocument and shows success on success', () => {
      const result = makeNuxeoDocument({ uid: 'exportutrymme-uid', type: 'Exportutrymme' });
      apiSpy.createDocument.and.returnValue(of(result));
      component.onExportutrymmeFormResult({ title: 'Exportutrymme', description: '' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
    });

    it('shows danger notification on error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('failed')));
      component.onExportutrymmeFormResult({ title: 'Fail', description: '' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('onInformationsforvaltningFormResult', () => {
    it('calls createDocument and shows success', () => {
      const result = makeNuxeoDocument({ uid: 'info-uid', type: 'Informationsforvaltning' });
      apiSpy.createDocument.and.returnValue(of(result));
      component.onInformationsforvaltningFormResult({ title: 'Info', description: '' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
    });

    it('shows danger notification on error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('failed')));
      component.onInformationsforvaltningFormResult({ title: 'Fail', description: '' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('onOrganisationFormResult', () => {
    it('calls createDocument and shows success', () => {
      const result = makeNuxeoDocument({ uid: 'org-uid', type: 'Organisation' });
      apiSpy.createDocument.and.returnValue(of(result));
      component.onOrganisationFormResult({ title: 'Org', description: '' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
    });

    it('shows danger notification on error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('failed')));
      component.onOrganisationFormResult({ title: 'Fail', description: '' });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('onDiariumFormResult', () => {
    it('calls createDocument and shows success', () => {
      const result = makeNuxeoDocument({ uid: 'diarium-uid', type: 'Diarium' });
      apiSpy.createDocument.and.returnValue(of(result));
      component.onDiariumFormResult({
        title: 'Diarium',
        description: '',
        prefix: 'P',
        suffix: 'S',
        lopnummerlangd: 6,
        handlingslopnummerlangd: 4,
      });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
    });

    it('shows danger notification on error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('failed')));
      component.onDiariumFormResult({
        title: 'Fail',
        description: '',
        prefix: '',
        suffix: '',
        lopnummerlangd: 0,
        handlingslopnummerlangd: 0,
      });
      expect(storeMock.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('buildDomainFormConfig', () => {
    it('returns the current domainFormConfig', () => {
      const config = component.buildDomainFormConfig();
      expect(config.length).toBeGreaterThan(0);
      expect(config.some(f => f.name === 'title')).toBeTrue();
    });
  });

  describe('buildMyndighetFormConfig', () => {
    it('returns form fields including organisationsnummer', () => {
      const config = component.buildMyndighetFormConfig();
      expect(config.some(f => f.name === 'organisationsnummer')).toBeTrue();
    });
  });

  describe('buildExportArMappFormConfig', () => {
    it('returns form fields including ar', () => {
      const config = component.buildExportArMappFormConfig();
      expect(config.some(f => f.name === 'ar')).toBeTrue();
    });
  });

  describe('buildExportutrymmeFormConfig', () => {
    it('returns title and description fields', () => {
      const config = component.buildExportutrymmeFormConfig();
      expect(config.some(f => f.name === 'title')).toBeTrue();
      expect(config.some(f => f.name === 'description')).toBeTrue();
    });
  });

  describe('buildInformationsforvaltningFormConfig', () => {
    it('returns title and description fields', () => {
      const config = component.buildInformationsforvaltningFormConfig();
      expect(config.some(f => f.name === 'title')).toBeTrue();
    });
  });

  describe('buildOrganisationFormConfig', () => {
    it('returns title and description fields', () => {
      const config = component.buildOrganisationFormConfig();
      expect(config.some(f => f.name === 'title')).toBeTrue();
    });
  });

  describe('buildDiariumFormConfig', () => {
    it('returns diarium-specific fields', () => {
      const config = component.buildDiariumFormConfig();
      expect(config.some(f => f.name === 'lopnummerlangd')).toBeTrue();
      expect(config.some(f => f.name === 'handlingslopnummerlangd')).toBeTrue();
    });
  });
});
