import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CollectionPermissionsComponent } from './collection-permissions.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CollectionPermissionsService } from './collection-permissions.service';
import { CollectionPermissionEntry, ParsedCollectionPermissions } from './collection-permissions.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { UserSuggestion } from '@app/shared/api/nuxeo-api.types';

function makeAclResponse(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument({
    contextParameters: { acls: [] },
    ...overrides,
  });
}

function makeEntry(overrides: Partial<CollectionPermissionEntry> = {}): CollectionPermissionEntry {
  return {
    key: 'perm-1',
    aclName: 'local',
    id: 'perm-1',
    principalRef: 'user:alice',
    principalId: 'alice',
    principalType: 'user',
    creatorId: '',
    creatorLabel: '',
    permission: 'Read',
    begin: null,
    end: null,
    displayLabel: 'Alice',
    scope: 'local',
    ...overrides,
  };
}

function makeParsedPermissions(overrides: Partial<ParsedCollectionPermissions> = {}): ParsedCollectionPermissions {
  return {
    local: [],
    inherited: [],
    external: [],
    index: {},
    inheritanceBlocked: false,
    ...overrides,
  };
}

describe('CollectionPermissionsComponent', () => {
  let component: CollectionPermissionsComponent;
  let fixture: ComponentFixture<CollectionPermissionsComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let permServiceSpy: jasmine.SpyObj<CollectionPermissionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDocumentWithAcls',
      'addDocumentPermission',
      'replaceDocumentPermission',
      'removeDocumentPermissionAutomation',
      'shareDocumentWithExternalUser',
      'sendPermissionNotificationEmail',
      'getUserGroupSuggestions',
      'blockPermissionInheritance',
      'unblockPermissionInheritance',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDocumentWithAcls.and.returnValue(of(makeAclResponse()));
    apiSpy.addDocumentPermission.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.replaceDocumentPermission.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.removeDocumentPermissionAutomation.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.shareDocumentWithExternalUser.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.sendPermissionNotificationEmail.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getUserGroupSuggestions.and.returnValue(of([]));
    apiSpy.blockPermissionInheritance.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.unblockPermissionInheritance.and.returnValue(of(makeNuxeoDocument()));

    permServiceSpy = jasmine.createSpyObj('CollectionPermissionsService', [
      'parseAclEntries',
      'mapPermissionsToRows',
      'resolvePrincipalLabel',
    ]);
    permServiceSpy.parseAclEntries.and.returnValue(makeParsedPermissions());
    permServiceSpy.mapPermissionsToRows.and.returnValue([]);
    permServiceSpy.resolvePrincipalLabel.and.returnValue('Test User');

    await TestBed.configureTestingModule({
      imports: [CollectionPermissionsComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: CollectionPermissionsService, useValue: permServiceSpy },
      ],
    })
      .overrideTemplate(CollectionPermissionsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CollectionPermissionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('documentId', 'doc-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('constructor effect — loadPermissions', () => {
    it('calls getDocumentWithAcls on init', () => {
      expect(apiSpy.getDocumentWithAcls).toHaveBeenCalledWith('doc-1');
    });

    it('sets loading to false after load', () => {
      expect(component.loading()).toBeFalse();
    });

    it('sets localPermissions, inheritedPermissions, externalPermissions from parse', () => {
      expect(component.localPermissions()).toEqual([]);
      expect(component.inheritedPermissions()).toEqual([]);
      expect(component.externalPermissions()).toEqual([]);
    });

    it('resets permissions when documentId is empty', () => {
      fixture.componentRef.setInput('documentId', '');
      fixture.detectChanges();
      expect(component.localPermissions()).toEqual([]);
      expect(component.inheritanceBlocked()).toBeFalse();
    });

    it('resets permissions on load error', () => {
      apiSpy.getDocumentWithAcls.and.returnValue(throwError(() => new Error('not found')));
      fixture.componentRef.setInput('documentId', 'doc-error');
      fixture.detectChanges();
      expect(component.localPermissions()).toEqual([]);
      expect(component.loading()).toBeFalse();
    });
  });

  describe('signals initial state', () => {
    it('loading defaults to false after init', () => {
      expect(component.loading()).toBeFalse();
    });

    it('permissionDialogMode defaults to null', () => {
      expect(component.permissionDialogMode()).toBeNull();
    });

    it('externalDialogMode defaults to null', () => {
      expect(component.externalDialogMode()).toBeNull();
    });

    it('editingPermissionKey defaults to null', () => {
      expect(component.editingPermissionKey()).toBeNull();
    });

    it('editingExternalKey defaults to null', () => {
      expect(component.editingExternalKey()).toBeNull();
    });

    it('deleteDialogEntry defaults to null', () => {
      expect(component.deleteDialogEntry()).toBeNull();
    });

    it('inheritanceBlocked defaults to false', () => {
      expect(component.inheritanceBlocked()).toBeFalse();
    });

    it('principalOptions defaults to empty array', () => {
      expect(component.principalOptions()).toEqual([]);
    });
  });

  describe('openAddPermission', () => {
    it('sets permissionDialogMode to add', () => {
      component.openAddPermission();
      expect(component.permissionDialogMode()).toBe('add');
    });

    it('clears editing key', () => {
      component.editingPermissionKey.set('some-key');
      component.openAddPermission();
      expect(component.editingPermissionKey()).toBeNull();
    });

    it('resets permission form', () => {
      component.permissionForm.controls.comment.setValue('old comment');
      component.openAddPermission();
      expect(component.permissionForm.controls.comment.value).toBe('');
      expect(component.permissionForm.controls.permission.value).toBe('Read');
    });
  });

  describe('closePermissionDialog', () => {
    it('sets permissionDialogMode to null', () => {
      component.permissionDialogMode.set('add');
      component.closePermissionDialog();
      expect(component.permissionDialogMode()).toBeNull();
    });

    it('clears editingPermissionKey', () => {
      component.editingPermissionKey.set('key-1');
      component.closePermissionDialog();
      expect(component.editingPermissionKey()).toBeNull();
    });
  });

  describe('openExternalDialog', () => {
    it('sets externalDialogMode to add', () => {
      component.openExternalDialog();
      expect(component.externalDialogMode()).toBe('add');
    });

    it('resets external form', () => {
      component.externalForm.controls.email.setValue('test@test.com');
      component.openExternalDialog();
      expect(component.externalForm.controls.email.value).toBe('');
    });
  });

  describe('closeExternalDialog', () => {
    it('sets externalDialogMode to null', () => {
      component.externalDialogMode.set('add');
      component.closeExternalDialog();
      expect(component.externalDialogMode()).toBeNull();
    });
  });

  describe('openEditPermissionFromRow', () => {
    beforeEach(() => {
      const entry = makeEntry({
        id: 'perm-1',
        aclName: 'local',
        principalRef: 'user:alice',
        principalId: 'alice',
        permission: 'Read',
        displayLabel: 'Alice',
      });
      component.permissionIndex.set({ 'perm-1': entry });
    });

    it('does nothing when row has no id', () => {
      component.openEditPermissionFromRow({ id: '' });
      expect(component.permissionDialogMode()).toBeNull();
    });

    it('sets permissionDialogMode to edit', () => {
      component.openEditPermissionFromRow({ id: 'perm-1' });
      expect(component.permissionDialogMode()).toBe('edit');
    });

    it('sets editingPermissionKey', () => {
      component.openEditPermissionFromRow({ id: 'perm-1' });
      expect(component.editingPermissionKey()).toBe('perm-1');
    });

    it('populates form with entry values', () => {
      component.openEditPermissionFromRow({ id: 'perm-1' });
      expect(component.permissionForm.controls.permission.value).toBe('Read');
    });

    it('adds option to principalOptions when not already present', () => {
      component.principalOptions.set([]);
      component.openEditPermissionFromRow({ id: 'perm-1' });
      expect(component.principalOptions().some(o => o.id === 'user:alice')).toBeTrue();
    });
  });

  describe('openEditExternalPermissionFromRow', () => {
    beforeEach(() => {
      const entry = makeEntry({
        id: 'ext-1',
        aclName: 'local',
        principalId: 'ext-user',
        principalRef: 'ext-user',
        permission: 'Read',
        displayLabel: 'external@user.com',
        notify: false,
        comment: 'ext-comment',
      });
      component.permissionIndex.set({ 'ext-1': entry });
    });

    it('does nothing for empty row id', () => {
      component.openEditExternalPermissionFromRow({ id: '' });
      expect(component.externalDialogMode()).toBeNull();
    });

    it('sets externalDialogMode to edit', () => {
      component.openEditExternalPermissionFromRow({ id: 'ext-1' });
      expect(component.externalDialogMode()).toBe('edit');
    });

    it('sets editingExternalKey', () => {
      component.openEditExternalPermissionFromRow({ id: 'ext-1' });
      expect(component.editingExternalKey()).toBe('ext-1');
    });

    it('populates external form email from displayLabel', () => {
      component.openEditExternalPermissionFromRow({ id: 'ext-1' });
      expect(component.externalForm.controls.email.value).toBe('external@user.com');
    });
  });

  describe('openRemovePermissionFromRow', () => {
    beforeEach(() => {
      const entry = makeEntry({
        id: 'perm-1',
        aclName: 'local',
        principalId: 'alice',
        principalRef: 'user:alice',
        permission: 'Read',
      });
      component.permissionIndex.set({ 'perm-1': entry });
    });

    it('does nothing for empty row id', () => {
      component.openRemovePermissionFromRow({ id: '' });
      expect(component.deleteDialogEntry()).toBeNull();
    });

    it('sets deleteDialogEntry', () => {
      component.openRemovePermissionFromRow({ id: 'perm-1' });
      expect(component.deleteDialogEntry()).toBeTruthy();
    });
  });

  describe('closeDeleteDialog', () => {
    it('sets deleteDialogEntry to null', () => {
      component.deleteDialogEntry.set(makeEntry({ id: 'perm-1' }));
      component.closeDeleteDialog();
      expect(component.deleteDialogEntry()).toBeNull();
    });
  });

  describe('confirmDeletePermission', () => {
    it('does nothing when deleteDialogEntry is null', () => {
      component.deleteDialogEntry.set(null);
      component.confirmDeletePermission();
      expect(apiSpy.removeDocumentPermissionAutomation).not.toHaveBeenCalled();
    });

    it('calls removeDocumentPermissionAutomation', () => {
      component.deleteDialogEntry.set(makeEntry({ id: 'perm-1', aclName: 'local' }));
      component.confirmDeletePermission();
      expect(apiSpy.removeDocumentPermissionAutomation).toHaveBeenCalledWith('doc-1', {
        id: 'perm-1',
        acl: 'local',
      });
    });

    it('closes dialog on success', () => {
      component.deleteDialogEntry.set(makeEntry({ id: 'perm-1', aclName: 'local' }));
      component.confirmDeletePermission();
      expect(component.deleteDialogEntry()).toBeNull();
    });
  });

  describe('sendPermissionNotificationFromRow', () => {
    it('does nothing for empty row id', () => {
      component.sendPermissionNotificationFromRow({ id: '' });
      expect(apiSpy.sendPermissionNotificationEmail).not.toHaveBeenCalled();
    });

    it('calls sendPermissionNotificationEmail for valid entry', () => {
      component.permissionIndex.set({ 'perm-1': makeEntry({ id: 'perm-1' }) });
      component.sendPermissionNotificationFromRow({ id: 'perm-1' });
      expect(apiSpy.sendPermissionNotificationEmail).toHaveBeenCalledWith('doc-1', { id: 'perm-1' });
    });
  });

  describe('togglePermissionInheritance', () => {
    it('calls blockPermissionInheritance when inheritance is not blocked', () => {
      component.inheritanceBlocked.set(false);
      component.togglePermissionInheritance();
      expect(apiSpy.blockPermissionInheritance).toHaveBeenCalledWith('doc-1');
    });

    it('calls unblockPermissionInheritance when inheritance is blocked', () => {
      component.inheritanceBlocked.set(true);
      component.togglePermissionInheritance();
      expect(apiSpy.unblockPermissionInheritance).toHaveBeenCalledWith('doc-1');
    });

    it('does nothing when documentId is empty', () => {
      fixture.componentRef.setInput('documentId', '');
      fixture.detectChanges();
      apiSpy.blockPermissionInheritance.calls.reset();
      component.inheritanceBlocked.set(false);
      component.togglePermissionInheritance();
      expect(apiSpy.blockPermissionInheritance).not.toHaveBeenCalled();
    });
  });

  describe('submitPermission', () => {
    it('shows error notification when form invalid', () => {
      component.permissionForm.controls.principal.setValue(null);
      component.permissionForm.controls.permission.setValue('');
      component.submitPermission();
      expect(apiSpy.addDocumentPermission).not.toHaveBeenCalled();
    });

    it('calls addDocumentPermission for add mode', () => {
      component.permissionDialogMode.set('add');
      component.permissionForm.controls.principal.setValue({ id: 'user:alice', label: 'Alice', value: 'alice' });
      component.permissionForm.controls.permission.setValue('Read');
      component.permissionForm.controls.timeFrame.setValue('permanent');
      component.submitPermission();
      expect(apiSpy.addDocumentPermission).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          users: ['alice'],
          permission: 'Read',
        })
      );
    });

    it('calls replaceDocumentPermission for edit mode', () => {
      const entry = makeEntry({ id: 'perm-1', principalId: 'alice', aclName: 'local', principalRef: 'user:alice' });
      component.permissionIndex.set({ 'edit-key': entry });
      component.permissionDialogMode.set('edit');
      component.editingPermissionKey.set('edit-key');
      component.permissionForm.controls.principal.setValue({ id: 'user:alice', label: 'Alice', value: 'alice' });
      component.permissionForm.controls.permission.setValue('ReadWrite');
      component.permissionForm.controls.timeFrame.setValue('permanent');
      component.submitPermission();
      expect(apiSpy.replaceDocumentPermission).toHaveBeenCalled();
    });
  });

  describe('submitExternalPermission', () => {
    it('shows error notification when external form invalid', () => {
      component.externalDialogMode.set('add');
      component.externalForm.controls.email.setValue('');
      component.externalForm.controls.end.setValue(null);
      component.submitExternalPermission();
      expect(apiSpy.shareDocumentWithExternalUser).not.toHaveBeenCalled();
    });

    it('calls shareDocumentWithExternalUser when form valid', () => {
      component.externalDialogMode.set('add');
      component.externalForm.controls.email.setValue('external@test.com');
      component.externalForm.controls.permission.setValue('Read');
      component.externalForm.controls.end.setValue(new Date('2025-12-31'));
      component.submitExternalPermission();
      expect(apiSpy.shareDocumentWithExternalUser).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          email: 'external@test.com',
          permission: 'Read',
        })
      );
    });
  });

  describe('onPrincipalQueryChanged', () => {
    it('calls getUserGroupSuggestions and updates principalOptions', () => {
      const suggestions: UserSuggestion[] = [
        { id: 'alice', prefixed_id: 'user:alice', displayLabel: 'Alice', 'entity-type': 'userEntry' },
      ];
      apiSpy.getUserGroupSuggestions.and.returnValue(of(suggestions));
      const event = new CustomEvent('query', { detail: 'ali' });
      component.onPrincipalQueryChanged(event);
      expect(apiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('ali', 'USER_GROUP_TYPE');
      expect(component.principalOptions().length).toBe(1);
    });

    it('trims whitespace from query', () => {
      component.onPrincipalQueryChanged(new CustomEvent('query', { detail: '  anna  ' }));
      expect(apiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('anna', 'USER_GROUP_TYPE');
    });
  });

  describe('onPrincipalSelected', () => {
    it('sets principal form control from event detail', () => {
      const option = { id: 'user:bob', label: 'Bob', value: 'bob' };
      component.onPrincipalSelected(new CustomEvent('select', { detail: [option] }));
      expect(component.permissionForm.controls.principal.value).toEqual(option);
    });

    it('sets null when event detail is empty', () => {
      component.onPrincipalSelected(new CustomEvent('select', { detail: [] }));
      expect(component.permissionForm.controls.principal.value).toBeNull();
    });
  });

  describe('permissionOptions', () => {
    it('has 4 options', () => {
      expect(component.permissionOptions.length).toBe(4);
    });

    it('includes Read, ReadCanCollect, ReadWrite, Everything', () => {
      const ids = component.permissionOptions.map(o => o.id);
      expect(ids).toContain('Read');
      expect(ids).toContain('ReadCanCollect');
      expect(ids).toContain('ReadWrite');
      expect(ids).toContain('Everything');
    });
  });

  describe('localRows computed', () => {
    it('returns mapped rows from permissionsService', () => {
      permServiceSpy.mapPermissionsToRows.and.returnValue([{ principal: 'Alice', right: 'Read' }]);
      component.localPermissions.set([makeEntry()]);
      expect(component.localRows().length).toBe(1);
    });
  });

  describe('table config', () => {
    it('localPermissionsTableConfig includes COLLECTION_PERMISSIONS_LOCAL tableName', () => {
      expect(component.localPermissionsTableConfig[0].tableName).toBe('COLLECTION_PERMISSIONS_LOCAL');
    });

    it('inheritedPermissionsTableConfig includes COLLECTION_PERMISSIONS_INHERITED tableName', () => {
      expect(component.inheritedPermissionsTableConfig[0].tableName).toBe('COLLECTION_PERMISSIONS_INHERITED');
    });

    it('externalPermissionsTableConfig includes COLLECTION_PERMISSIONS_EXTERNAL tableName', () => {
      expect(component.externalPermissionsTableConfig[0].tableName).toBe('COLLECTION_PERMISSIONS_EXTERNAL');
    });
  });

  describe('default column options', () => {
    it('localPermissionsDefaultColumnOptions has 4 entries', () => {
      expect(component.localPermissionsDefaultColumnOptions.length).toBe(4);
    });

    it('all default column options have visible=true', () => {
      expect(component.localPermissionsDefaultColumnOptions.every(o => o.visible)).toBeTrue();
    });
  });
});
