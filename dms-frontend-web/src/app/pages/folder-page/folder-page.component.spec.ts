import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FolderPageComponent } from './folder-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { TableSortService } from '@app/core/services/table-sort.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NuxeoDocument, NuxeoExtendedProperties } from '@app/shared/api/nuxeo-api.types';

function makeStoreMock() {
  return {
    openPage: signal<string | null>(null),
    notification: signal<{ show: boolean; variation?: string; text?: string }>({ show: false }),
    navigationPanelContext: signal<string | null>(null),
    messagesInfo: signal<unknown>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
    getLabelByType: jasmine.createSpy('getLabelByType').and.returnValue(''),
  };
}

function makeAuthMock() {
  return {
    username: signal<string | null>('user1'),
    activeRole: signal<string | null>('REGISTRATOR'),
    isAdmin: computed(() => false),
    loaded: signal(false),
    loadError: signal(null),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    loadMe: jasmine.createSpy('loadMe'),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
}

function makeDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument({
    uid: 'folder-uid-1',
    title: 'Test Folder',
    type: 'Folder',
    path: '/default-domain/workspaces/test-folder',
    ...overrides,
  });
}

function makeEmptySearchResult() {
  return makeSearchResult<NuxeoDocument<NuxeoExtendedProperties>>({ entries: [], totalSize: 0 });
}

describe('FolderPageComponent', () => {
  let component: FolderPageComponent;
  let fixture: ComponentFixture<FolderPageComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let dirOptSpy: jasmine.SpyObj<DirectoryOptionsService>;
  let tableSortSpy: jasmine.SpyObj<TableSortService>;
  let routeParamsSubject: Subject<Record<string, string>>;

  beforeEach(async () => {
    localStorage.clear();
    storeMock = makeStoreMock();
    authMock = makeAuthMock();
    routeParamsSubject = new Subject();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getDocumentById',
      'getAdvancedDocumentContent',
      'getMailMessages',
      'editDocument',
      'checkEmails',
      'launchImporter',
      'createDocument',
      'getMessagesJSON',
    ]);
    apiSpy.getDocumentById.and.returnValue(of(makeDoc()));
    apiSpy.getAdvancedDocumentContent.and.returnValue(of(makeEmptySearchResult()));
    apiSpy.getMailMessages.and.returnValue(of(makeEmptySearchResult()));
    apiSpy.editDocument.and.returnValue(of(makeDoc()));
    apiSpy.checkEmails.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.launchImporter.and.returnValue(of(undefined));
    apiSpy.createDocument.and.returnValue(of(makeDoc()));
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    dirOptSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    dirOptSpy.getNatureOptions.and.returnValue(of([]));
    dirOptSpy.getSubjectOptions.and.returnValue(of([]));
    dirOptSpy.getCoverageOptions.and.returnValue(of([]));

    tableSortSpy = jasmine.createSpyObj('TableSortService', ['applySortSignals']);
    tableSortSpy.applySortSignals.and.callFake(
      (_sortBy: unknown, _sortOrder: unknown, event: { sortBy: string; sortOrder: 'asc' | 'desc' }) => event
    );

    await TestBed.configureTestingModule({
      imports: [FolderPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: AuthService, useValue: authMock },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
        { provide: TableSortService, useValue: tableSortSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: routeParamsSubject.asObservable(),
            queryParamMap: of(new Map()),
          },
        },
      ],
    })
      .overrideTemplate(FolderPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(FolderPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit - route params subscription', () => {
    it('loads document when route params emit', () => {
      routeParamsSubject.next({ id: 'folder-uid-1' });
      expect(apiSpy.getDocumentById).toHaveBeenCalledWith('folder-uid-1');
    });

    it('sets document signal from loaded response', () => {
      const doc = makeDoc({ uid: 'folder-uid-1', title: 'My Folder', type: 'Folder' });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'folder-uid-1' });
      expect(component.document()).toEqual(doc);
    });

    it('sets folderTitle to type when type is Root', () => {
      const doc = makeDoc({ uid: 'root-id', title: 'default', type: 'Root' });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'root-id' });
      expect(component.folderTitle()).toBe('Root');
    });

    it('sets folderTitle to title when type is not Root', () => {
      const doc = makeDoc({ uid: 'f-1', title: 'My Folder', type: 'Folder' });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      routeParamsSubject.next({ id: 'f-1' });
      expect(component.folderTitle()).toBe('My Folder');
    });

    it('resets page to 0 on new route param', () => {
      component.page.set(3);
      routeParamsSubject.next({ id: 'folder-uid-1' });
      expect(component.page()).toBe(0);
    });

    it('calls getAdvancedDocumentContent after loading document', () => {
      routeParamsSubject.next({ id: 'folder-uid-1' });
      expect(apiSpy.getAdvancedDocumentContent).toHaveBeenCalled();
    });

    it('uses getMailMessages for MailFolder type', () => {
      const mailDoc = makeDoc({ uid: 'mail-1', type: 'MailFolder' });
      apiSpy.getDocumentById.and.returnValue(of(mailDoc));
      routeParamsSubject.next({ id: 'mail-1' });
      expect(apiSpy.getMailMessages).toHaveBeenCalled();
    });
  });

  describe('onPageChange', () => {
    beforeEach(() => {
      component.document.set(makeDoc());
    });

    it('updates page signal', () => {
      component.onPageChange(3);
      expect(component.page()).toBe(3);
    });

    it('triggers fetchPage (calls getAdvancedDocumentContent)', () => {
      const callsBefore = apiSpy.getAdvancedDocumentContent.calls.count();
      component.onPageChange(2);
      expect(apiSpy.getAdvancedDocumentContent.calls.count()).toBeGreaterThan(callsBefore);
    });
  });

  describe('onPageSizeSelect', () => {
    beforeEach(() => {
      component.document.set(makeDoc());

      component.pageSize.set(25);
      localStorage.clear();
    });

    it('updates pageSize signal', () => {
      component.onPageSizeSelect('10');
      expect(component.pageSize()).toBe(10);
    });

    it('resets page to 0 when page size changes', () => {
      component.page.set(5);
      component.onPageSizeSelect('10');
      expect(component.page()).toBe(0);
    });

    it('saves to localStorage when username is set', () => {
      const setItemSpy = spyOn(Storage.prototype, 'setItem');
      component.onPageSizeSelect('10');
      expect(setItemSpy).toHaveBeenCalled();
    });

    it('does not save to localStorage when username is null', () => {
      authMock.username.set(null);
      const setItemSpy = spyOn(Storage.prototype, 'setItem');
      component.onPageSizeSelect('10');
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('does not update if value is the same as current page size', () => {
      const callsBefore = apiSpy.getAdvancedDocumentContent.calls.count();
      component.onPageSizeSelect('25');
      expect(apiSpy.getAdvancedDocumentContent.calls.count()).toBe(callsBefore);
    });

    it('does nothing for non-numeric value', () => {
      const callsBefore = apiSpy.getAdvancedDocumentContent.calls.count();
      component.onPageSizeSelect('abc');
      expect(apiSpy.getAdvancedDocumentContent.calls.count()).toBe(callsBefore);
    });
  });

  describe('onSortChange', () => {
    beforeEach(() => {
      component.document.set(makeDoc());
    });

    it('calls tableSortService.applySortSignals with the event', () => {
      const event = { sortBy: 'dc:title', sortOrder: 'asc' as const };
      component.onSortChange(event);
      expect(tableSortSpy.applySortSignals).toHaveBeenCalledWith(component.sortBy, component.sortOrder, event, {
        sortBy: '',
        sortOrder: 'desc',
      });
    });

    it('resets page to 0 on sort change', () => {
      component.page.set(4);
      component.onSortChange({ sortBy: 'dc:title', sortOrder: 'asc' });
      expect(component.page()).toBe(0);
    });

    it('triggers fetchPage after sort change', () => {
      const callsBefore = apiSpy.getAdvancedDocumentContent.calls.count();
      component.onSortChange({ sortBy: 'dc:title', sortOrder: 'desc' });
      expect(apiSpy.getAdvancedDocumentContent.calls.count()).toBeGreaterThan(callsBefore);
    });
  });

  describe('refreshCurrentPage', () => {
    it('triggers fetchPage', () => {
      component.document.set(makeDoc());
      const callsBefore = apiSpy.getAdvancedDocumentContent.calls.count();
      component.refreshCurrentPage();
      expect(apiSpy.getAdvancedDocumentContent.calls.count()).toBeGreaterThan(callsBefore);
    });
  });

  describe('openEditCurrentDocument', () => {
    it('sets isInfoTableEditOpen to true when document has uid', () => {
      component.document.set(makeDoc({ uid: 'doc-1' }));
      component.openEditCurrentDocument();
      expect(component.isInfoTableEditOpen()).toBeTrue();
    });

    it('does not open when document is null', () => {
      component.document.set(null);
      component.openEditCurrentDocument();
      expect(component.isInfoTableEditOpen()).toBeFalse();
    });

    it('does not open when document has no uid', () => {
      component.document.set(makeDoc({ uid: '' }));
      component.openEditCurrentDocument();
      expect(component.isInfoTableEditOpen()).toBeFalse();
    });
  });

  describe('closeInfoTableEdit', () => {
    it('sets isInfoTableEditOpen to false', () => {
      component.isInfoTableEditOpen.set(true);
      component.closeInfoTableEdit();
      expect(component.isInfoTableEditOpen()).toBeFalse();
    });

    it('resets isInfoTableSaving to false', () => {
      component.isInfoTableSaving.set(true);
      component.closeInfoTableEdit();
      expect(component.isInfoTableSaving()).toBeFalse();
    });
  });

  describe('saveInfoTableEdit', () => {
    it('does nothing when document has no uid', () => {
      component.document.set(makeDoc({ uid: '' }));
      component.saveInfoTableEdit({ title: 'New Title' });
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument with uid and payload on success', () => {
      const doc = makeDoc({ uid: 'doc-edit-1', type: 'Folder' });
      component.document.set(doc);
      apiSpy.editDocument.and.returnValue(of(doc));
      apiSpy.getDocumentById.and.returnValue(of(doc));

      component.saveInfoTableEdit({ title: 'Updated Title', description: 'Desc' });
      expect(apiSpy.editDocument).toHaveBeenCalledWith('doc-edit-1', jasmine.any(Object));
    });

    it('calls getDocumentById after editDocument succeeds', () => {
      const doc = makeDoc({ uid: 'doc-edit-1', type: 'Folder' });
      component.document.set(doc);
      apiSpy.editDocument.and.returnValue(of(doc));
      apiSpy.getDocumentById.and.returnValue(of(doc));

      component.saveInfoTableEdit({ title: 'Updated Title' });
      expect(apiSpy.getDocumentById).toHaveBeenCalledWith('doc-edit-1', true);
    });

    it('shows success notification and closes dialog after save', () => {
      const doc = makeDoc({ uid: 'doc-edit-1', title: 'Updated', type: 'Folder' });
      component.document.set(makeDoc({ uid: 'doc-edit-1', type: 'Folder' }));
      apiSpy.editDocument.and.returnValue(of(doc));
      apiSpy.getDocumentById.and.returnValue(of(doc));

      component.saveInfoTableEdit({ title: 'Updated' });
      expect(storeMock.notification().variation).toBe('success');
      expect(component.isInfoTableEditOpen()).toBeFalse();
    });

    it('shows danger notification and keeps dialog open on error', () => {
      const doc = makeDoc({ uid: 'doc-edit-1', type: 'Folder' });
      component.document.set(doc);
      apiSpy.editDocument.and.returnValue(throwError(() => new Error('save failed')));

      component.saveInfoTableEdit({ title: 'Updated' });
      expect(storeMock.notification().variation).toBe('danger');
      expect(component.isInfoTableSaving()).toBeFalse();
    });
  });

  describe('updateOrganizationDocument', () => {
    it('updates document signal', () => {
      const newDoc = makeDoc({ uid: 'org-1', title: 'New Org', type: 'Organisation' });
      component.updateOrganizationDocument(newDoc);
      expect(component.document()).toEqual(newDoc);
    });

    it('updates folderTitle from document title', () => {
      const newDoc = makeDoc({ uid: 'org-1', title: 'Org Title' });
      component.updateOrganizationDocument(newDoc);
      expect(component.folderTitle()).toBe('Org Title');
    });
  });

  describe('canEdit computed', () => {
    it('returns true when navigationPanelContext is null', () => {
      storeMock.navigationPanelContext.set(null);
      expect(component.canEdit()).toBeTrue();
    });

    it('returns false when navigationPanelContext is browse', () => {
      storeMock.navigationPanelContext.set('browse');
      expect(component.canEdit()).toBeFalse();
    });
  });

  describe('isOrganizationFolder computed', () => {
    it('returns true for Organisationsdel type', () => {
      component.document.set(makeDoc({ type: 'Organisationsdel' }));
      expect(component.isOrganizationFolder()).toBeTrue();
    });

    it('returns true for Organisation type', () => {
      component.document.set(makeDoc({ type: 'Organisation' }));
      expect(component.isOrganizationFolder()).toBeTrue();
    });

    it('returns false for Folder type', () => {
      component.document.set(makeDoc({ type: 'Folder' }));
      expect(component.isOrganizationFolder()).toBeFalse();
    });

    it('returns false when document is null', () => {
      component.document.set(null);
      expect(component.isOrganizationFolder()).toBeFalse();
    });
  });

  describe('isExport computed', () => {
    it('returns true for Export type', () => {
      component.document.set(makeDoc({ type: 'Export' }));
      expect(component.isExport()).toBeTrue();
    });

    it('returns false for Folder type', () => {
      component.document.set(makeDoc({ type: 'Folder' }));
      expect(component.isExport()).toBeFalse();
    });
  });

  describe('handleInput', () => {
    it('sets importFileTitle when field is title', () => {
      component.handleInput('My File', 'title');
      expect(component.importFileTitle()).toBe('My File');
    });

    it('sets importFileDescription when field is description', () => {
      component.handleInput('Some description', 'description');
      expect(component.importFileDescription()).toBe('Some description');
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns column options with all visible', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBeGreaterThan(0);
      expect(opts.every(o => o.visible)).toBeTrue();
    });
  });

  describe('checkEmails', () => {
    it('does nothing when document has no uid', () => {
      component.document.set(makeDoc({ uid: '' }));
      component.checkEmails();
      expect(apiSpy.checkEmails).not.toHaveBeenCalled();
    });

    it('does nothing when document is null', () => {
      component.document.set(null);
      component.checkEmails();
      expect(apiSpy.checkEmails).not.toHaveBeenCalled();
    });

    it('calls checkEmails API when document has uid', () => {
      component.document.set(makeDoc({ uid: 'mail-uid', type: 'MailFolder' }));
      apiSpy.checkEmails.and.returnValue(of(makeNuxeoDocument()));
      component.checkEmails();
      expect(apiSpy.checkEmails).toHaveBeenCalledWith('mail-uid');
    });

    it('shows danger notification on checkEmails error', () => {
      component.document.set(makeDoc({ uid: 'mail-uid', type: 'MailFolder' }));
      apiSpy.checkEmails.and.returnValue(throwError(() => new Error('fail')));
      component.checkEmails();
      expect(storeMock.notification().variation).toBe('danger');
    });
  });

  describe('openCreateImportFileDialog', () => {
    it('clears importFileTitle and opens dialog', () => {
      component.importFileTitle.set('old title');
      component.openCreateImportFileDialog();
      expect(component.importFileTitle()).toBe('');
      expect(component.isCreateImportFileOpen()).toBeTrue();
    });

    it('clears importFileDescription when opening dialog', () => {
      component.importFileDescription.set('old desc');
      component.openCreateImportFileDialog();
      expect(component.importFileDescription()).toBe('');
    });
  });

  describe('createImportFile', () => {
    beforeEach(() => {
      component.document.set(makeDoc({ uid: 'folder-1', path: '/path/to/folder' }));
      component.importFileTitle.set('My Import');
    });

    it('does nothing when document has no path', () => {
      component.document.set(makeDoc({ uid: 'folder-1', path: '' }));
      component.createImportFile();
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('does nothing when title is empty', () => {
      component.importFileTitle.set('');
      component.createImportFile();
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('calls createDocument with correct payload on success', () => {
      component.createImportFile();
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'Importorfil', name: 'My Import' }),
        '/path/to/folder'
      );
    });

    it('closes dialog and refreshes table on success', () => {
      component.createImportFile();
      expect(component.isCreateImportFileOpen()).toBeFalse();
      expect(apiSpy.getAdvancedDocumentContent).toHaveBeenCalled();
    });

    it('shows danger notification on createDocument error', () => {
      apiSpy.createDocument.and.returnValue(throwError(() => new Error('fail')));
      component.createImportFile();
      expect(storeMock.notification().variation).toBe('danger');
    });

    it('does nothing when document is null', () => {
      component.document.set(null);
      component.createImportFile();
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });
  });

  describe('launchImporter', () => {
    it('does nothing when document has no uid', () => {
      component.document.set(makeDoc({ uid: '' }));
      component.launchImporter();
      expect(apiSpy.launchImporter).not.toHaveBeenCalled();
    });

    it('does nothing when document is null', () => {
      component.document.set(null);
      component.launchImporter();
      expect(apiSpy.launchImporter).not.toHaveBeenCalled();
    });

    it('calls launchImporter API with document uid', () => {
      component.document.set(makeDoc({ uid: 'import-folder', type: 'Importorsmapp' }));
      apiSpy.launchImporter.and.returnValue(of(undefined));
      component.launchImporter();
      expect(apiSpy.launchImporter).toHaveBeenCalledWith('import-folder');
    });

    it('shows danger notification on launchImporter error', () => {
      component.document.set(makeDoc({ uid: 'import-folder', type: 'Importorsmapp' }));
      apiSpy.launchImporter.and.returnValue(throwError(() => new Error('fail')));
      component.launchImporter();
      expect(storeMock.notification().variation).toBe('danger');
    });
  });

  describe('exportZipDownloadUrl computed', () => {
    it('returns empty string when document is null', () => {
      component.document.set(null);
      expect(component.exportZipDownloadUrl()).toBe('');
    });

    it('returns empty string when export zip property is not set', () => {
      component.document.set(makeDoc({ type: 'Export' }));
      expect(component.exportZipDownloadUrl()).toBe('');
    });
  });

  describe('saveInfoTableEdit with Myndighet type', () => {
    it('includes organisationsnummer in payload for Myndighet type', () => {
      const doc = makeDoc({ uid: 'myndighet-1', type: 'Myndighet' });
      component.document.set(doc);
      apiSpy.editDocument.and.returnValue(of(doc));
      apiSpy.getDocumentById.and.returnValue(of(doc));

      component.saveInfoTableEdit({ title: 'Test', organisationsnummer: '123456' });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });
  });

  describe('saveInfoTableEdit with Diarium type', () => {
    it('includes diarium fields in payload for Diarium type', () => {
      const doc = makeDoc({ uid: 'diarium-1', type: 'Diarium' });
      component.document.set(doc);
      apiSpy.editDocument.and.returnValue(of(doc));
      apiSpy.getDocumentById.and.returnValue(of(doc));

      component.saveInfoTableEdit({
        title: 'Test',
        prefix: 'PRE',
        suffix: 'SUF',
        lopnummerlangd: '5',
        handlingslopnummerlangd: '4',
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });
  });

  describe('saveInfoTableEdit with Domain type (taxonomy fields)', () => {
    it('includes taxonomy fields in payload for Domain type', () => {
      const doc = makeDoc({ uid: 'domain-1', type: 'Domain' });
      component.document.set(doc);
      apiSpy.editDocument.and.returnValue(of(doc));
      apiSpy.getDocumentById.and.returnValue(of(doc));

      component.saveInfoTableEdit({
        title: 'Test',
        nature: 'nature-id',
        subjects: [{ id: 'sub-1', label: 'Sub 1', value: 'sub-1' }],
        coverage: 'cov-1',
        expires: [new Date('2026-12-31')],
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });
  });

  describe('ngOnInit MailFolder buttons', () => {
    it('sets checkEmail button for MailFolder type', () => {
      const mailDoc = makeDoc({ uid: 'mail-1', type: 'MailFolder' });
      apiSpy.getDocumentById.and.returnValue(of(mailDoc));
      routeParamsSubject.next({ id: 'mail-1' });
      expect(component.buttons.length).toBe(1);
    });

    it('sets startImport and createImportFile buttons for Importorsmapp type', () => {
      const importDoc = makeDoc({ uid: 'import-1', type: 'Importorsmapp' });
      apiSpy.getDocumentById.and.returnValue(of(importDoc));
      routeParamsSubject.next({ id: 'import-1' });
      expect(component.buttons.length).toBe(2);
    });

    it('sets empty buttons array for other types', () => {
      const folderDoc = makeDoc({ uid: 'folder-1', type: 'Folder' });
      apiSpy.getDocumentById.and.returnValue(of(folderDoc));
      routeParamsSubject.next({ id: 'folder-1' });
      expect(component.buttons.length).toBe(0);
    });
  });

  describe('restorePageSize', () => {
    it('does not set pageSize when username is null', () => {
      localStorage.clear();
      authMock.username.set(null);
      component.pageSize.set(25);
      (component as unknown as { restorePageSize(): void }).restorePageSize?.();

      expect(component.pageSize()).toBe(25);
    });
  });
});
