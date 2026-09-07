import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PersonalSpaceComponent } from './personal-space.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuthService } from '@app/core/services/auth.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { Option } from '@app/shared/commonTypes';
import { NuxeoProperties } from '@app/shared/api/nuxeo-api.types';

function makeAuthMock() {
  return {
    loaded: signal(true),
    loadError: signal(null),
    username: signal<string | null>('testuser'),
    activeRole: signal<string | null>('HANDLAGGARE'),
    adminViewEnabled: signal(false),
    isAdmin: computed(() => false),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    loadMe: jasmine.createSpy('loadMe').and.returnValue(Promise.resolve()),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
}

function makeRouteMock(initialPath?: string) {
  const queryParamMapSubject = new Subject<ParamMap>();
  return {
    snapshot: { queryParamMap: convertToParamMap(initialPath ? { path: initialPath } : {}) },
    queryParamMap: queryParamMapSubject.asObservable(),
    params: of({}),
    queryParams: of({}),
    _paramMapSubject: queryParamMapSubject,
  };
}

describe('PersonalSpaceComponent', () => {
  let component: PersonalSpaceComponent;
  let fixture: ComponentFixture<PersonalSpaceComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let dirOptSpy: jasmine.SpyObj<DirectoryOptionsService>;
  let routeMock: ReturnType<typeof makeRouteMock>;

  function castComponent() {
    return component as unknown as {
      router: { navigate: jasmine.Spy };
      reloadActivePage: () => void;
      store: { openPage: { (): string | null; set: (v: string | null) => void } };
    };
  }

  beforeEach(async () => {
    localStorage.clear();
    authMock = makeAuthMock();
    routeMock = makeRouteMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getAdvancedDocumentContent',
      'getCollectionDocuments',
      'downloadBulk',
      'deleteDocument',
      'editDocument',
      'getPathInfo',
      'getDocumentById',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getAdvancedDocumentContent.and.returnValue(of(makeSearchResult({ entries: [], totalSize: 0 })));
    apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [], totalSize: 0 })));
    apiSpy.downloadBulk.and.returnValue(of(new Blob()));
    apiSpy.deleteDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getPathInfo.and.returnValue(
      of(makeNuxeoDocument({ uid: 'workspace-1', title: 'Workspace', type: 'Workspace' }))
    );
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ uid: 'doc-1', type: 'Folder' })));

    dirOptSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    dirOptSpy.getNatureOptions.and.returnValue(of([]));
    dirOptSpy.getSubjectOptions.and.returnValue(of([]));
    dirOptSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PersonalSpaceComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
        { provide: ActivatedRoute, useValue: routeMock },
      ],
    })
      .overrideTemplate(PersonalSpaceComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(PersonalSpaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('viewMode signal', () => {
    it('defaults to workspace', () => {
      expect(component.viewMode()).toBe('workspace');
    });
  });

  describe('isDialogOpened signal', () => {
    it('defaults to false', () => {
      expect(component.isDialogOpened()).toBeFalse();
    });
  });

  describe('isEditDialogOpen signal', () => {
    it('defaults to false', () => {
      expect(component.isEditDialogOpen()).toBeFalse();
    });
  });

  describe('isAssignCollectionOpen signal', () => {
    it('defaults to false', () => {
      expect(component.isAssignCollectionOpen()).toBeFalse();
    });
  });

  describe('openDialog', () => {
    it('sets isDialogOpened to true', () => {
      component.openDialog();
      expect(component.isDialogOpened()).toBeTrue();
    });
  });

  describe('closeEditDialog', () => {
    it('sets isEditDialogOpen to false', () => {
      component.isEditDialogOpen.set(true);
      component.closeEditDialog();
      expect(component.isEditDialogOpen()).toBeFalse();
    });
  });

  describe('getEditDialogHeading', () => {
    it('returns generic heading when no folder selected', () => {
      expect(component.getEditDialogHeading()).toBe('Redigera');
    });

    it('returns workspace heading for Workspace doc type', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Workspace' }));
      expect(component.getEditDialogHeading()).toBe('Redigera arbetsyta');
    });

    it('returns folder heading for Folder doc type', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Folder' }));
      expect(component.getEditDialogHeading()).toBe('Redigera mapp');
    });

    it('returns collection heading for Collection doc type', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Collection' }));
      expect(component.getEditDialogHeading()).toBe('Redigera samling');
    });
  });

  describe('getPath', () => {
    it('returns user workspace path based on username', () => {
      authMock.username.set('myuser');
      fixture.detectChanges();
      const path = component.getPath();
      expect(path).toContain('myuser');
      expect(path).toContain('UserWorkspaces');
    });

    it('returns empty string when username is null', () => {
      authMock.username.set(null);
      fixture.detectChanges();
      expect(component.getPath()).toBe('');
    });
  });

  describe('getCreatePath', () => {
    it('returns workspace path when viewMode is workspace', () => {
      component.viewMode.set('workspace');
      authMock.username.set('user1');
      fixture.detectChanges();
      expect(component.getCreatePath()).toContain('UserWorkspaces');
    });

    it('returns selectedFolderPath when in folder mode', () => {
      component.viewMode.set('folder');
      component.selectedFolderPath.set('/domain/workspaces/folder-1');
      expect(component.getCreatePath()).toBe('/domain/workspaces/folder-1');
    });

    it('falls back to selectedFolderDoc path when selectedFolderPath is empty', () => {
      component.viewMode.set('folder');
      component.selectedFolderPath.set('');
      component.selectedFolderDoc.set(makeNuxeoDocument({ path: '/domain/workspaces/doc-path' }));
      expect(component.getCreatePath()).toBe('/domain/workspaces/doc-path');
    });

    it('falls back to getPath when neither selectedFolderPath nor doc path is set', () => {
      component.viewMode.set('folder');
      component.selectedFolderPath.set('');
      component.selectedFolderDoc.set(null);
      authMock.username.set('fallbackuser');
      fixture.detectChanges();
      expect(component.getCreatePath()).toContain('fallbackuser');
    });
  });

  describe('getActiveColumnOptions', () => {
    it('returns workspace column options mapped from workspaceTableConfig', () => {
      component.viewMode.set('workspace');
      const options = component.getActiveColumnOptions();
      expect(options.length).toBe(component.workspaceTableConfig.length);
      expect(options[0]).toEqual(
        jasmine.objectContaining({
          id: component.workspaceTableConfig[0].key.toString(),
          label: component.workspaceTableConfig[0].label,
        })
      );
    });

    it('returns collection column options mapped from tableConfig', () => {
      component.viewMode.set('folder');
      const options = component.getActiveColumnOptions();
      expect(options.length).toBe(component.tableConfig.length);
    });

    it('defaults visible to true when column.visible is undefined', () => {
      component.viewMode.set('workspace');
      const options = component.getActiveColumnOptions();
      expect(options.every(o => o.visible === true || o.visible === false)).toBeTrue();
    });
  });

  describe('getActiveTableConfig', () => {
    it('returns workspaceTableConfig in workspace mode', () => {
      component.viewMode.set('workspace');
      expect(component.getActiveTableConfig()).toBe(component.workspaceTableConfig);
    });

    it('returns collectionsTableConfig in folder mode', () => {
      component.viewMode.set('folder');
      expect(component.getActiveTableConfig()).toBe(component.tableConfig);
    });
  });

  describe('getActiveItems', () => {
    it('returns workspaceItems in workspace mode', () => {
      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'w1' }]);
      expect(component.getActiveItems()).toEqual([{ id: 'w1' }]);
    });

    it('returns collections in folder mode', () => {
      component.viewMode.set('folder');
      component.collections.set([{ id: 'c1' }]);
      expect(component.getActiveItems()).toEqual([{ id: 'c1' }]);
    });
  });

  describe('getActiveLoading', () => {
    it('returns workspaceLoading in workspace mode', () => {
      component.viewMode.set('workspace');
      component.workspaceLoading.set(true);
      expect(component.getActiveLoading()).toBeTrue();
    });

    it('returns isLoading in folder mode', () => {
      component.viewMode.set('folder');
      component.isLoading.set(true);
      expect(component.getActiveLoading()).toBeTrue();
    });
  });

  describe('getActiveTotal', () => {
    it('returns workspaceTotal in workspace mode', () => {
      component.viewMode.set('workspace');
      component.workspaceTotal.set(42);
      expect(component.getActiveTotal()).toBe(42);
    });

    it('returns total in folder mode', () => {
      component.viewMode.set('folder');
      component.total.set(17);
      expect(component.getActiveTotal()).toBe(17);
    });
  });

  describe('getActiveError', () => {
    it('returns workspaceError in workspace mode', () => {
      component.viewMode.set('workspace');
      component.workspaceError.set('error msg');
      expect(component.getActiveError()).toBe('error msg');
    });

    it('returns errorMessage in folder mode', () => {
      component.viewMode.set('folder');
      component.errorMessage.set('folder error');
      expect(component.getActiveError()).toBe('folder error');
    });
  });

  describe('getActiveTitle', () => {
    it('returns fixed title in workspace mode', () => {
      component.viewMode.set('workspace');
      expect(component.getActiveTitle()).toBe('Personliga mappar');
    });

    it('returns selectedFolderTitle in folder mode', () => {
      component.viewMode.set('folder');
      component.selectedFolderTitle.set('My Folder');
      expect(component.getActiveTitle()).toBe('My Folder');
    });
  });

  describe('onSelectedCheckboxes', () => {
    it('sets selectedItemIds', () => {
      component.onSelectedCheckboxes(['id-1', 'id-2']);
      expect(component.selectedItemIds()).toEqual(['id-1', 'id-2']);
    });

    it('handles null input as empty array', () => {
      component.onSelectedCheckboxes(null as unknown as string[]);
      expect(component.selectedItemIds()).toEqual([]);
    });
  });

  describe('addSelectedToCollection', () => {
    it('shows warning notification when nothing selected', () => {
      component.selectedItemIds.set([]);
      component.addSelectedToCollection();
      expect(component.isAssignCollectionOpen()).toBeFalse();
    });

    it('opens assign collection modal when items are selected', () => {
      component.selectedItemIds.set(['doc-1']);
      component.addSelectedToCollection();
      expect(component.isAssignCollectionOpen()).toBeTrue();
    });
  });

  describe('downloadSelectedAsZip', () => {
    it('shows warning when no items selected', () => {
      component.selectedItemIds.set([]);
      component.downloadSelectedAsZip();
      expect(apiSpy.downloadBulk).not.toHaveBeenCalled();
    });

    it('calls downloadBulk when items selected', () => {
      component.selectedItemIds.set(['doc-1', 'doc-2']);
      component.downloadSelectedAsZip();
      expect(apiSpy.downloadBulk).toHaveBeenCalledWith(['doc-1', 'doc-2']);
    });

    it('shows danger notification when downloadBulk errors', () => {
      apiSpy.downloadBulk.and.returnValue(throwError(() => new Error('fail')));
      component.selectedItemIds.set(['doc-1']);
      expect(() => component.downloadSelectedAsZip()).not.toThrow();
    });
  });

  describe('canEditSelectedFolder computed', () => {
    it('returns false in workspace mode', () => {
      component.viewMode.set('workspace');
      expect(component.canEditSelectedFolder()).toBeFalse();
    });

    it('returns false in folder mode without selected folder doc', () => {
      component.viewMode.set('folder');
      component.selectedFolderDoc.set(null);
      expect(component.canEditSelectedFolder()).toBeFalse();
    });

    it('returns true for editable type in folder mode', () => {
      component.viewMode.set('folder');
      component.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Folder', uid: 'f1' }));
      expect(component.canEditSelectedFolder()).toBeTrue();
    });

    it('returns false for non-editable type', () => {
      component.viewMode.set('folder');
      component.selectedFolderDoc.set(makeNuxeoDocument({ type: 'MailFolder', uid: 'f1' }));
      expect(component.canEditSelectedFolder()).toBeFalse();
    });
  });

  describe('onRowSelected', () => {
    it('does nothing when item not found', () => {
      component.viewMode.set('workspace');
      component.workspaceItems.set([]);
      const routerSpy = jasmine.createSpy('navigate');
      castComponent().router = { navigate: routerSpy };
      component.onRowSelected('nonexistent');
      expect(routerSpy).not.toHaveBeenCalled();
    });

    it('navigates to doc page for non-container types', () => {
      const navSpy = jasmine.createSpy('navigate');
      castComponent().router = { navigate: navSpy };
      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'doc-1', type: 'Handling', title: 'Test' }]);
      component.onRowSelected('doc-1');
      expect(navSpy).toHaveBeenCalledWith(['/doc', 'doc-1']);
    });

    it('opens folder by path for a container item that already has a path', () => {
      const navSpy = jasmine.createSpy('navigate');
      castComponent().router = { navigate: navSpy };
      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-1', type: 'Folder', title: 'F', path: '/domain/f1' }]);
      apiSpy.getPathInfo.calls.reset();
      component.onRowSelected('folder-1');
      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/domain/f1');
    });

    it('opens folder by uid for a container item without a path', () => {
      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-2', type: 'Folder', title: 'F2', path: '' }]);
      apiSpy.getDocumentById.calls.reset();
      component.onRowSelected('folder-2');
      expect(apiSpy.getDocumentById).toHaveBeenCalledWith('folder-2');
      expect(component.viewMode()).toBe('folder');
    });

    it('does nothing when same folder uid is clicked again without path', () => {
      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-3', type: 'Folder', title: 'F3', path: '' }]);
      component.onRowSelected('folder-3');
      apiSpy.getDocumentById.calls.reset();
      component.workspaceItems.set([{ id: 'folder-3', type: 'Folder', title: 'F3', path: '' }]);
      component.onRowSelected('folder-3');
      expect(apiSpy.getDocumentById).not.toHaveBeenCalled();
    });
  });

  describe('onSortChange', () => {
    it('updates sort signals, resets page, and reloads active page', () => {
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.onSortChange({ sortBy: 'title', sortOrder: 'asc' });
      expect(component.sortBy()).toBe('title');
      expect(component.sortOrder()).toBe('asc');
      expect(component.page()).toBe(0);
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('onPageChange', () => {
    it('does nothing when new page equals current page', () => {
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.onPageChange(component.page());
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('updates page and reloads when page changes', () => {
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.onPageChange(3);
      expect(component.page()).toBe(3);
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('onPageSizeSelect', () => {
    it('ignores non-finite values', () => {
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.onPageSizeSelect('not-a-number');
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('ignores value equal to current pageSize', () => {
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.onPageSizeSelect(component.pageSize());
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('updates pageSize, resets page, reloads, and persists for logged-in user', () => {
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      authMock.username.set('persisted-user');
      component.onPageSizeSelect(50);
      expect(component.pageSize()).toBe(50);
      expect(component.page()).toBe(0);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('does not throw when username is null', () => {
      authMock.username.set(null);
      expect(() => component.onPageSizeSelect(10)).not.toThrow();
      expect(component.pageSize()).toBe(10);
    });
  });

  describe('restorePageSize', () => {
    it('restores a previously saved page size for the current user on init', () => {
      localStorage.setItem('pageSizeByUsername', JSON.stringify({ pageSizeMap: { testuser: 15 } }));
      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();
      expect(fixture2.componentInstance.pageSize()).toBe(15);
    });
  });

  describe('copySelectedToClipboard', () => {
    let originalClipboard: Clipboard;

    beforeEach(() => {
      originalClipboard = navigator.clipboard;
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    });

    it('shows warning when nothing selected', () => {
      component.selectedItemIds.set([]);
      component.copySelectedToClipboard();
      expect(component.isAssignCollectionOpen()).toBeFalse();
    });

    it('shows unsupported notification when clipboard API is unavailable', () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      component.selectedItemIds.set(['doc-1']);
      expect(() => component.copySelectedToClipboard()).not.toThrow();
    });

    it('shows success notification when writeText resolves', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        configurable: true,
      });
      const store = TestBed.inject(GeneralStore);
      component.selectedItemIds.set(['doc-1', 'doc-2']);
      component.copySelectedToClipboard();
      await Promise.resolve();
      await Promise.resolve();
      expect(store.notification().variation).toBe('success');
    });

    it('shows danger notification when writeText rejects', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
        configurable: true,
      });
      const store = TestBed.inject(GeneralStore);
      component.selectedItemIds.set(['doc-1']);
      component.copySelectedToClipboard();
      await Promise.resolve();
      await Promise.resolve();
      expect(store.notification().variation).toBe('danger');
    });
  });

  describe('deleteSelectedItems', () => {
    let confirmSpy: jasmine.Spy;

    beforeEach(() => {
      confirmSpy = spyOn(window, 'confirm');
    });

    it('shows warning when nothing selected', () => {
      component.selectedItemIds.set([]);
      component.deleteSelectedItems();
      expect(apiSpy.deleteDocument).not.toHaveBeenCalled();
    });

    it('does nothing when confirmation is declined', () => {
      confirmSpy.and.returnValue(false);
      component.selectedItemIds.set(['doc-1']);
      component.deleteSelectedItems();
      expect(apiSpy.deleteDocument).not.toHaveBeenCalled();
    });

    it('deletes a single selected item and reloads', () => {
      confirmSpy.and.returnValue(true);
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.selectedItemIds.set(['doc-1']);
      component.deleteSelectedItems();
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('doc-1');
      expect(component.selectedItemIds()).toEqual([]);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('deletes multiple selected items via forkJoin and reloads', () => {
      confirmSpy.and.returnValue(true);
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.selectedItemIds.set(['doc-1', 'doc-2', 'doc-3']);
      component.deleteSelectedItems();
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('doc-1');
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('doc-2');
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('doc-3');
      expect(component.selectedItemIds()).toEqual([]);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('shows danger notification but still proceeds when the first delete errors', () => {
      confirmSpy.and.returnValue(true);
      apiSpy.deleteDocument.and.returnValue(throwError(() => new Error('boom')));
      const reloadSpy = spyOn(castComponent(), 'reloadActivePage');
      component.selectedItemIds.set(['doc-1']);
      expect(() => component.deleteSelectedItems()).not.toThrow();
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('backToWorkspace', () => {
    it('resets to workspace view when there is no current folder path', () => {
      const navSpy = jasmine.createSpy('navigate');
      castComponent().router = { navigate: navSpy };
      component.selectedFolderPath.set('');
      component.viewMode.set('folder');
      component.backToWorkspace();
      expect(component.viewMode()).toBe('workspace');
      expect(navSpy).toHaveBeenCalled();
    });

    it('resets to workspace when parent path is the workspace root', () => {
      const navSpy = jasmine.createSpy('navigate');
      castComponent().router = { navigate: navSpy };
      authMock.username.set('rootuser');
      fixture.detectChanges();
      component.selectedFolderPath.set('/default-domain/UserWorkspaces/rootuser/sub');
      component.viewMode.set('folder');
      component.backToWorkspace();
      expect(component.viewMode()).toBe('workspace');
    });

    it('navigates to the parent folder when it is not the workspace root', () => {
      authMock.username.set('rootuser2');
      fixture.detectChanges();
      component.selectedFolderPath.set('/default-domain/UserWorkspaces/rootuser2/sub/child');
      component.viewMode.set('folder');
      apiSpy.getPathInfo.calls.reset();
      component.backToWorkspace();
      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/default-domain/UserWorkspaces/rootuser2/sub');
    });
  });

  describe('openEditDialog / submitFolderEdit', () => {
    it('does nothing when no folder is selected', () => {
      component.selectedFolderDoc.set(null);
      component.openEditDialog();
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('does nothing for a non-editable doc type', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ type: 'MailFolder' }));
      component.openEditDialog();
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('opens the dialog and builds form config for an editable doc', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Folder', title: 'My Folder' }));
      component.openEditDialog();
      expect(component.isEditDialogOpen()).toBeTrue();
      expect(component.folderEditConfig().length).toBeGreaterThan(0);
      const titleField = component.folderEditConfig().find(f => f.name === 'title');
      expect(titleField?.defaultValue).toBe('My Folder');
    });

    it('submitFolderEdit does not throw when no form is bound', () => {
      expect(() => component.submitFolderEdit()).not.toThrow();
    });
  });

  describe('saveFolderEdits', () => {
    it('does nothing when no folder is selected', () => {
      component.selectedFolderDoc.set(null);
      apiSpy.editDocument.calls.reset();
      component.saveFolderEdits({ title: 'X' });
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('saves edits with title, description, nature, coverage, subjects, and expires', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'folder-edit-1', type: 'Folder', path: '/p1' }));
      component.selectedFolderPath.set('/p1');
      apiSpy.editDocument.calls.reset();
      apiSpy.getPathInfo.calls.reset();
      const expiresDate = new Date('2024-06-01');

      component.saveFolderEdits({
        title: 'New Title',
        description: 'A description',
        nature: { id: 'nature-1' },
        coverage: { id: 'coverage-1' },
        subjects: [{ id: 'subj-1' }, { id: '' }],
        expires: [expiresDate],
      });

      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'folder-edit-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'New Title',
          [NUXEO_SCHEMA_FIELDS.dc.description]: 'A description',
          [NUXEO_SCHEMA_FIELDS.dc.nature]: 'nature-1',
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: 'coverage-1',
          [NUXEO_SCHEMA_FIELDS.dc.subjects]: ['subj-1'],
          [NUXEO_SCHEMA_FIELDS.dc.expired]: expiresDate.toISOString(),
        })
      );
      expect(component.isEditDialogOpen()).toBeFalse();
      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/p1');
    });

    it('omits optional fields when blank and uses plain string nature/coverage values', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'folder-edit-2', type: 'Folder', path: '' }));
      component.selectedFolderPath.set('');
      apiSpy.editDocument.calls.reset();

      component.saveFolderEdits({
        title: 'Only Title',
        description: '',
        nature: 'plain-nature',
        coverage: '',
        subjects: [],
        expires: '',
      });

      const payload = apiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(payload[NUXEO_SCHEMA_FIELDS.dc.title]).toBe('Only Title');
      expect(payload[NUXEO_SCHEMA_FIELDS.dc.description]).toBeUndefined();
      expect(payload[NUXEO_SCHEMA_FIELDS.dc.coverage]).toBeUndefined();
    });

    it('shows danger notification and resets isSavingEdit when editDocument errors', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'folder-edit-3', type: 'Folder' }));
      apiSpy.editDocument.and.returnValue(throwError(() => new Error('save failed')));
      component.saveFolderEdits({ title: 'T' });
      expect(component.isSavingEdit()).toBeFalse();
    });
  });

  describe('loadFolderOptions rebuild on edit dialog', () => {
    it('rebuilds folderEditConfig when nature options arrive while dialog is open', () => {
      const natureSubject = new Subject<Option[]>();
      dirOptSpy.getNatureOptions.and.returnValue(natureSubject.asObservable());

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      component2.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Folder', title: 'Editable' }));
      component2.openEditDialog();
      expect(component2.isEditDialogOpen()).toBeTrue();

      natureSubject.next([{ id: 'n1', label: 'Nature One' }]);
      expect(component2.folderNatureOptions()).toEqual([{ id: 'n1', label: 'Nature One' }]);
    });
  });

  describe('ngOnInit with an initial non-root path query param', () => {
    it('opens the folder for the given initial path', () => {
      routeMock.snapshot = {
        queryParamMap: convertToParamMap({ path: '/default-domain/UserWorkspaces/testuser/sub' }),
      };
      apiSpy.getPathInfo.calls.reset();

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();

      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/default-domain/UserWorkspaces/testuser/sub');
      expect(fixture2.componentInstance.viewMode()).toBe('folder');
    });
  });

  describe('ngOnInit query param subscription', () => {
    it('switches back to workspace mode when path param becomes empty while in folder mode', () => {
      component.viewMode.set('folder');
      component.selectedFolderPath.set('/some/folder');
      routeMock._paramMapSubject.next(convertToParamMap({}));
      expect(component.viewMode()).toBe('workspace');
      expect(component.selectedFolderPath()).toBe('');
    });

    it('does nothing when path param is empty and already in workspace mode', () => {
      component.viewMode.set('workspace');
      apiSpy.getPathInfo.calls.reset();
      routeMock._paramMapSubject.next(convertToParamMap({}));
      expect(apiSpy.getPathInfo).not.toHaveBeenCalled();
    });

    it('opens a new folder when path param changes to a non-root path', () => {
      apiSpy.getPathInfo.calls.reset();
      routeMock._paramMapSubject.next(convertToParamMap({ path: '/default-domain/UserWorkspaces/testuser/other' }));
      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/default-domain/UserWorkspaces/testuser/other');
    });

    it('does nothing when path param equals the currently selected folder path', () => {
      component.selectedFolderPath.set('/already/here');
      apiSpy.getPathInfo.calls.reset();
      routeMock._paramMapSubject.next(convertToParamMap({ path: '/already/here' }));
      expect(apiSpy.getPathInfo).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('clears the open page in the store', () => {
      const store = TestBed.inject(GeneralStore);
      component.ngOnDestroy();
      expect(store.openPage()).toBeNull();
    });
  });

  describe('toWorkspaceTableItem / toTableItem mapping via API flows', () => {
    it('maps workspace folder entries with container link and folderish flag', () => {
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeNuxeoDocument({
                uid: 'wf-1',
                title: 'Workspace Folder',
                type: 'Folder',
                path: '/p/wf-1',
                facets: ['Folderish'],
              }),
            ],
            totalSize: 1,
          })
        )
      );

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();

      const items = fixture2.componentInstance.workspaceItems();
      expect(items.length).toBe(1);
      expect(items[0]['link']).toBe('/personal');
      expect(items[0]['isFolderish']).toBeTrue();
      expect(items[0]['linkQueryParams']).toEqual({ path: '/p/wf-1' });
    });

    it('maps non-container workspace entries with doc link', () => {
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'doc-99', title: 'A File', type: 'Handling', path: '/p/doc-99' })],
            totalSize: 1,
          })
        )
      );

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();

      const items = fixture2.componentInstance.workspaceItems();
      expect(items[0]['link']).toBe('/doc/doc-99');
      expect(items[0]['linkQueryParams']).toBeNull();
    });

    it('maps folder content entries with author, version, nature, and coverage', () => {
      const creator = { 'entity-type': 'user' as const, id: 'u1', properties: { firstName: 'Anna', lastName: 'A' } };
      const properties = {
        [NUXEO_SCHEMA_FIELDS.dc.creator]: creator,
        [NUXEO_SCHEMA_FIELDS.dc.lastContributor]: creator,
        [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 1,
        [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0,
        [NUXEO_SCHEMA_FIELDS.dc.nature]: { id: 'nature-1' },
        [NUXEO_SCHEMA_FIELDS.dc.coverage]: {
          properties: { label_en: 'Coverage Value', parent: { properties: { label_en: 'Coverage Parent' } } },
        },
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: [{ properties: { label_en: 'Subject One' } }],
      } as unknown as NuxeoProperties;

      apiSpy.getDocumentById.and.returnValue(
        of(makeNuxeoDocument({ uid: 'folder-content-1', type: 'Folder', path: '' }))
      );
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'content-1', title: 'Content Doc', type: 'Handling', properties })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-content-1', type: 'Folder', title: 'FC', path: '' }]);
      component.onRowSelected('folder-content-1');

      const items = component.collections();
      expect(items.length).toBe(1);
      expect(items[0]['author']).toBe('Anna A');
      expect(items[0]['lastContributor']).toBe('Anna A');
      expect(items[0]['version']).toBe('1.0');
      expect(items[0]['nature']).toBe('');
      expect(items[0]['coverage']).toBe('Coverage Parent/Coverage Value');
      expect(items[0]['subjects']).toBe('Subject One');
    });

    it('loads children via getCollectionDocuments for Collection/Favorites doc types', () => {
      apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ uid: 'coll-1', type: 'Collection', path: '' })));
      apiSpy.getCollectionDocuments.calls.reset();

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'coll-1', type: 'Collection', title: 'Coll', path: '' }]);
      component.onRowSelected('coll-1');

      expect(apiSpy.getCollectionDocuments).toHaveBeenCalled();
    });

    it('toTableItem: container folder in folder mode has returnPath query param', () => {
      apiSpy.getDocumentById.and.returnValue(
        of(makeNuxeoDocument({ uid: 'parent-folder', type: 'Folder', path: '/parent' }))
      );
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'nested-folder', type: 'Folder', path: '/parent/nested' })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'parent-folder', type: 'Folder', title: 'Parent', path: '' }]);
      component.onRowSelected('parent-folder');

      const items = component.collections();
      expect(items.length).toBe(1);
      expect(items[0]['link']).toBe('/personal');
    });

    it('toTableItem: non-container in folder mode uses returnPath in linkQueryParams', () => {
      apiSpy.getDocumentById.and.returnValue(
        of(makeNuxeoDocument({ uid: 'folder-with-doc', type: 'Folder', path: '' }))
      );
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'doc-inside', type: 'Handling', path: '/folder/doc-inside' })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-with-doc', type: 'Folder', title: 'F', path: '' }]);
      component.onRowSelected('folder-with-doc');

      const items = component.collections();
      expect(items.length).toBe(1);
      expect(items[0]['link']).toBe('/doc/doc-inside');
    });

    it('maps workspace entry without a path — linkQueryParams is null', () => {
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'wf-nop', type: 'Folder', path: '' })],
            totalSize: 1,
          })
        )
      );

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();

      const items = fixture2.componentInstance.workspaceItems();
      expect(items[0]['linkQueryParams']).toBeNull();
    });
  });

  describe('loadWorkspace with auth not loaded', () => {
    it('calls loadMe when auth is not yet loaded', async () => {
      let resolveLoadMe!: () => void;
      authMock.loaded.set(false);
      authMock.loadMe.and.callFake(
        () =>
          new Promise<void>(resolve => {
            resolveLoadMe = resolve;
          })
      );

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();
      expect(authMock.loadMe).toHaveBeenCalled();

      authMock.loaded.set(true);
      resolveLoadMe();
      await Promise.resolve();
      await Promise.resolve();
    });

    it('handles empty username gracefully after auth loaded', () => {
      authMock.loaded.set(true);
      authMock.username.set(null);
      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();
      expect(fixture2.componentInstance.workspaceLoading()).toBeFalse();
    });
  });

  describe('fetchWorkspaceFolders error path', () => {
    it('sets workspaceError when getPathInfo fails', () => {
      apiSpy.getPathInfo.and.returnValue(throwError(() => new Error('path error')));

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();

      expect(fixture2.componentInstance.workspaceError()).toBeTruthy();
      expect(fixture2.componentInstance.workspaceItems()).toEqual([]);
    });
  });

  describe('fetchCollections error path', () => {
    it('sets errorMessage when getDocumentById fails', () => {
      apiSpy.getDocumentById.and.returnValue(throwError(() => new Error('fetch error')));

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'bad-id', type: 'Folder', title: 'F', path: '' }]);
      component.onRowSelected('bad-id');

      expect(component.errorMessage()).toBeTruthy();
      expect(component.collections()).toEqual([]);
    });
  });

  describe('openFolderByPath error path', () => {
    it('sets errorMessage when getPathInfo fails during openFolderByPath', () => {
      apiSpy.getPathInfo.and.returnValue(throwError(() => new Error('path error')));
      routeMock._paramMapSubject.next(convertToParamMap({ path: '/default-domain/UserWorkspaces/testuser/fail-path' }));
      expect(component.errorMessage()).toBeTruthy();
    });
  });

  describe('openFolderByPath with workspace root path', () => {
    it('resets to workspace view when path equals workspace root', () => {
      authMock.username.set('rootuser3');
      fixture.detectChanges();
      apiSpy.getPathInfo.calls.reset();

      routeMock._paramMapSubject.next(convertToParamMap({ path: '/default-domain/UserWorkspaces/rootuser3' }));
      expect(component.viewMode()).toBe('workspace');
    });
  });

  describe('reloadActivePage scenarios', () => {
    it('reloads workspace folder content when in workspace mode', () => {
      component.viewMode.set('workspace');
      apiSpy.getPathInfo.calls.reset();
      apiSpy.getAdvancedDocumentContent.calls.reset();
      component.onPageChange(1);

      expect(apiSpy.getAdvancedDocumentContent).toHaveBeenCalled();
    });

    it('reloads folder via selectedFolderDoc when in folder mode with doc set', () => {
      component.viewMode.set('folder');
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'reload-folder', type: 'Folder' }));
      apiSpy.getAdvancedDocumentContent.calls.reset();
      component.onPageChange(1);
      expect(apiSpy.getAdvancedDocumentContent).toHaveBeenCalled();
    });

    it('reloads via fetchCollections when in folder mode without selectedFolderDoc but has folderId', () => {
      component.viewMode.set('folder');
      component.selectedFolderDoc.set(null);
      component.selectedFolderId.set('folder-id-x');
      apiSpy.getDocumentById.calls.reset();
      component.onPageChange(1);
      expect(apiSpy.getDocumentById).toHaveBeenCalledWith('folder-id-x');
    });

    it('reloadActivePage in folder mode with doc error sets errorMessage', () => {
      component.viewMode.set('folder');
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'err-folder', type: 'Folder' }));
      apiSpy.getAdvancedDocumentContent.and.returnValue(throwError(() => new Error('reload err')));
      component.onPageChange(1);
      expect(component.errorMessage()).toBeTruthy();

      apiSpy.getAdvancedDocumentContent.and.returnValue(of(makeSearchResult({ entries: [], totalSize: 0 })));
    });
  });

  describe('saveFolderEdits extra branches', () => {
    it('uses doc.path as refresh path when selectedFolderPath is empty', () => {
      component.selectedFolderDoc.set(
        makeNuxeoDocument({ uid: 'folder-path-test', type: 'Folder', path: '/doc-path' })
      );
      component.selectedFolderPath.set('');
      apiSpy.editDocument.calls.reset();
      apiSpy.getPathInfo.calls.reset();
      component.saveFolderEdits({ title: 'X' });
      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/doc-path');
    });

    it('does not refresh when both selectedFolderPath and doc.path are empty', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'folder-nopath', type: 'Folder', path: '' }));
      component.selectedFolderPath.set('');
      apiSpy.editDocument.calls.reset();
      apiSpy.getPathInfo.calls.reset();
      component.saveFolderEdits({ title: 'Y' });
      expect(apiSpy.editDocument).toHaveBeenCalled();
      expect(apiSpy.getPathInfo).not.toHaveBeenCalled();
    });

    it('handles expires as a non-array non-Date string', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'expires-test', type: 'Folder' }));
      apiSpy.editDocument.calls.reset();
      component.saveFolderEdits({ title: 'T', expires: '2025-01-01T00:00:00.000Z' });
      const payload = apiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(payload[NUXEO_SCHEMA_FIELDS.dc.expired]).toBe('2025-01-01T00:00:00.000Z');
    });

    it('sends nature as plain string when object has no id or value', () => {
      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'nature-plain', type: 'Folder' }));
      apiSpy.editDocument.calls.reset();
      component.saveFolderEdits({ title: 'T', nature: { value: 'v1' } });
      const payload = apiSpy.editDocument.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(payload[NUXEO_SCHEMA_FIELDS.dc.nature]).toBe('v1');
    });
  });

  describe('loadFolderOptions rebuild on edit dialog — subjects and coverage', () => {
    it('rebuilds folderEditConfig when subject options arrive while dialog is open', () => {
      const subjectSubject = new Subject<Option[]>();
      dirOptSpy.getSubjectOptions.and.returnValue(subjectSubject.asObservable());

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      component2.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Folder', title: 'Editable' }));
      component2.openEditDialog();
      expect(component2.isEditDialogOpen()).toBeTrue();

      subjectSubject.next([{ id: 's1', label: 'Subject One' }]);
      expect(component2.folderSubjectOptions()).toEqual([{ id: 's1', label: 'Subject One' }]);
    });

    it('rebuilds folderEditConfig when coverage options arrive while dialog is open', () => {
      const coverageSubject = new Subject<Option[]>();
      dirOptSpy.getCoverageOptions.and.returnValue(coverageSubject.asObservable());

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      component2.selectedFolderDoc.set(makeNuxeoDocument({ type: 'Folder', title: 'Editable' }));
      component2.openEditDialog();

      coverageSubject.next([{ id: 'c1', label: 'Coverage One' }]);
      expect(component2.folderCoverageOptions()).toEqual([{ id: 'c1', label: 'Coverage One' }]);
    });

    it('does not rebuild config when dialog is closed when options arrive', () => {
      const natureSubject = new Subject<Option[]>();
      dirOptSpy.getNatureOptions.and.returnValue(natureSubject.asObservable());

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.isEditDialogOpen()).toBeFalse();
      const configBefore = component2.folderEditConfig();
      natureSubject.next([{ id: 'n2', label: 'Nature Two' }]);

      expect(component2.folderEditConfig()).toEqual(configBefore);
    });
  });

  describe('backToWorkspace — no parentPath found', () => {
    it('resets to workspace when getParentPath returns empty string', () => {
      const navSpy = jasmine.createSpy('navigate');
      castComponent().router = { navigate: navSpy };

      component.selectedFolderPath.set('/rootlevel');
      component.viewMode.set('folder');
      authMock.username.set('');
      fixture.detectChanges();
      component.backToWorkspace();
      expect(component.viewMode()).toBe('workspace');
    });
  });

  describe('ngOnInit with a workspace root path query param', () => {
    it('loads workspace when initial path equals workspace root', () => {
      authMock.username.set('rootuser4');
      routeMock.snapshot = {
        queryParamMap: convertToParamMap({ path: '/default-domain/UserWorkspaces/rootuser4' }),
      };
      apiSpy.getPathInfo.calls.reset();

      const fixture2 = TestBed.createComponent(PersonalSpaceComponent);
      fixture2.detectChanges();

      expect(fixture2.componentInstance.viewMode()).toBe('workspace');
    });
  });

  describe('toTableItem edge cases', () => {
    it('toTableItem handles null state correctly (stateLabel empty)', () => {
      apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ uid: 'folder-state', type: 'Folder', path: '' })));
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'stateless-doc', type: 'Handling', path: '' })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-state', type: 'Folder', title: 'F', path: '' }]);
      component.onRowSelected('folder-state');

      const items = component.collections();
      expect(items[0]['state']).toBe('');
    });

    it('toTableItem: version label is major-only when minor is null', () => {
      const properties = {
        [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 3,
        [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: null,
      } as unknown as NuxeoProperties;

      apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ uid: 'folder-ver', type: 'Folder', path: '' })));
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'versioned-doc', type: 'Handling', path: '', properties })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-ver', type: 'Folder', title: 'F', path: '' }]);
      component.onRowSelected('folder-ver');

      const items = component.collections();
      expect(items[0]['version']).toBe('3');
    });

    it('toTableItem: coverage label uses label fallback (no label_en)', () => {
      const properties = {
        [NUXEO_SCHEMA_FIELDS.dc.coverage]: {
          properties: { label: 'Coverage Label', parent: { properties: { label: 'Coverage Parent Label' } } },
        },
      } as unknown as NuxeoProperties;

      apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ uid: 'folder-cov', type: 'Folder', path: '' })));
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'coverage-doc', type: 'Handling', path: '', properties })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-cov', type: 'Folder', title: 'F', path: '' }]);
      component.onRowSelected('folder-cov');

      const items = component.collections();
      expect(items[0]['coverage']).toContain('Coverage Parent Label');
    });

    it('toTableItem: subjects without properties use label fallback', () => {
      const properties = {
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: [{ properties: { label: 'Subject Label' } }, { properties: {} }],
      } as unknown as NuxeoProperties;

      apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ uid: 'folder-subj', type: 'Folder', path: '' })));
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'subj-doc', type: 'Handling', path: '', properties })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.workspaceItems.set([{ id: 'folder-subj', type: 'Folder', title: 'F', path: '' }]);
      component.onRowSelected('folder-subj');

      const items = component.collections();
      expect(items[0]['subjects']).toBe('Subject Label');
    });

    it('toTableItem: non-container in folder mode with no returnPath uses null linkQueryParams', () => {
      apiSpy.getDocumentById.and.returnValue(
        of(makeNuxeoDocument({ uid: 'folder-noreturn', type: 'Folder', path: '' }))
      );
      apiSpy.getAdvancedDocumentContent.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'nrd-doc', type: 'Handling', path: '' })],
            totalSize: 1,
          })
        )
      );

      component.viewMode.set('workspace');
      component.selectedFolderPath.set('');
      component.workspaceItems.set([{ id: 'folder-noreturn', type: 'Folder', title: 'F', path: '' }]);
      component.onRowSelected('folder-noreturn');

      const items = component.collections();

      expect(items[0]['linkQueryParams']).toBeNull();
    });
  });

  describe('buildFolderEditConfig with properties', () => {
    it('builds config with coverageDefault from parent/id', () => {
      const properties = {
        [NUXEO_SCHEMA_FIELDS.dc.nature]: { id: 'nat1', properties: { id: 'nat1' } },
        [NUXEO_SCHEMA_FIELDS.dc.coverage]: {
          id: 'cov1',
          properties: { id: 'cov1', parent: { id: 'par1' } },
        },
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: [{ id: 'sub1', properties: { id: 'sub1', parent: { id: 'subpar1' } } }],
        [NUXEO_SCHEMA_FIELDS.dc.expired]: '2025-01-01T00:00:00.000Z',
      } as unknown as NuxeoProperties;

      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'cfg-folder', type: 'Folder', properties }));
      component.openEditDialog();

      const titleField = component.folderEditConfig().find(f => f.name === 'title');
      expect(titleField).toBeDefined();
      const expiresField = component.folderEditConfig().find(f => f.name === 'expires');
      expect(expiresField).toBeDefined();
      expect((expiresField?.defaultValue as Date[])?.length).toBeGreaterThan(0);
    });

    it('builds config with subjects array from properties.id fallback', () => {
      const properties = {
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: ['plain-string-subject'],
      } as unknown as NuxeoProperties;

      component.selectedFolderDoc.set(makeNuxeoDocument({ uid: 'cfg-folder2', type: 'Folder', properties }));
      component.openEditDialog();

      const subjField = component.folderEditConfig().find(f => f.name === 'subjects');
      expect(subjField).toBeDefined();
    });
  });
});
