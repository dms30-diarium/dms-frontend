import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UserGroupsComponent } from './user-groups.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { SearchService } from '@app/core/services/search.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { makeNuxeoDocument, makeUserSuggestion } from '@app/shared/testing/mock-factories';
import type { NuxeoDocuments, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

interface CreateGroupPayload {
  'entity-type': 'group';
  groupname: string;
  grouplabel?: string;
  memberUsers?: string[];
  memberGroups?: string[];
}

describe('UserGroupsComponent', () => {
  let component: UserGroupsComponent;
  let fixture: ComponentFixture<UserGroupsComponent>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let searchServiceSpy: jasmine.SpyObj<SearchService>;
  let storeSpy: {
    notification: { set: jasmine.Spy };
    navigationPanelContext: () => null;
    messagesInfo: () => null;
    openPage: ReturnType<typeof signal>;
  };
  let router: Router;

  const makeGroupSearchResponse = (
    entries = [
      {
        'entity-type': 'group' as const,
        id: 'group1',
        groupname: 'group1',
        grouplabel: 'Group 1',
        memberUsers: [],
        memberGroups: [],
      },
    ]
  ) => ({
    'entity-type': 'groups' as const,
    entries,
    resultsCount: entries.length,
  });

  const makeUserSearchResponse = (
    entries = [
      {
        'entity-type': 'user' as const,
        id: 'user1',
        properties: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      },
    ]
  ) => ({
    'entity-type': 'users' as const,
    entries,
    resultsCount: entries.length,
  });

  const makeRecentResponse = () => ({
    'entity-type': 'documents' as const,
    entries: [] as NuxeoDocument[],
    currentPageIndex: 0,
    pageSize: 50,
    maxResults: 50,
    totalSize: 0,
  });

  beforeEach(async () => {
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'searchGroups',
      'searchUsers',
      'createGroup',
      'createUser',
      'getLatestCreatedUsersOrGroups',
      'getUserGroupSuggestions',
    ]);

    searchServiceSpy = jasmine.createSpyObj('SearchService', ['extractTerm', 'toContainsPattern']);

    storeSpy = {
      notification: { set: jasmine.createSpy('set') },
      navigationPanelContext: () => null,
      messagesInfo: () => null,
      openPage: signal(null),
    };

    nuxeoApiSpy.getLatestCreatedUsersOrGroups.and.returnValue(of(makeRecentResponse() as unknown as NuxeoDocuments));
    nuxeoApiSpy.searchGroups.and.returnValue(of(makeGroupSearchResponse()));
    nuxeoApiSpy.searchUsers.and.returnValue(of(makeUserSearchResponse()));
    nuxeoApiSpy.createGroup.and.returnValue(of({}));
    nuxeoApiSpy.createUser.and.returnValue(of({ 'entity-type': 'user', id: 'newUser' }));
    nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));
    searchServiceSpy.extractTerm.and.callFake((raw: unknown) => {
      if (typeof raw === 'string') return raw;
      return '';
    });

    await TestBed.configureTestingModule({
      imports: [UserGroupsComponent],
      providers: [
        provideRouter([]),
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    })
      .overrideTemplate(UserGroupsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(UserGroupsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSearchInput', () => {
    it('clears results when search term is empty', () => {
      component.groupsRows.set([{ id: 'g1', name: 'Group 1' }]);
      component.usersRows.set([{ id: 'u1', name: 'User 1' }]);
      component.groupsTotal.set(1);
      component.usersTotal.set(1);

      searchServiceSpy.extractTerm.and.returnValue('');
      component.onSearchInput('');

      expect(component.groupsRows()).toEqual([]);
      expect(component.usersRows()).toEqual([]);
      expect(component.groupsTotal()).toBe(0);
      expect(component.usersTotal()).toBe(0);
    });

    it('does not call API when search term is empty', () => {
      nuxeoApiSpy.searchGroups.calls.reset();
      nuxeoApiSpy.searchUsers.calls.reset();

      searchServiceSpy.extractTerm.and.returnValue('');
      component.onSearchInput('');

      expect(nuxeoApiSpy.searchGroups).not.toHaveBeenCalled();
      expect(nuxeoApiSpy.searchUsers).not.toHaveBeenCalled();
    });

    it('calls searchGroups and searchUsers when term is non-empty', fakeAsync(() => {
      nuxeoApiSpy.searchGroups.calls.reset();
      nuxeoApiSpy.searchUsers.calls.reset();

      searchServiceSpy.extractTerm.and.returnValue('admin');
      component.onSearchInput('admin');
      tick();

      expect(nuxeoApiSpy.searchGroups).toHaveBeenCalledWith('admin', 0, 50);
      expect(nuxeoApiSpy.searchUsers).toHaveBeenCalledWith('admin', 0, 50);
    }));

    it('updates groupsRows and usersRows on non-empty search', fakeAsync(() => {
      searchServiceSpy.extractTerm.and.returnValue('test');
      nuxeoApiSpy.searchGroups.and.returnValue(of(makeGroupSearchResponse()));
      nuxeoApiSpy.searchUsers.and.returnValue(of(makeUserSearchResponse()));

      component.onSearchInput('test');
      tick();

      expect(component.groupsRows().length).toBe(1);
      expect(component.usersRows().length).toBe(1);
    }));

    it('sets searchTerm signal to the extracted term', () => {
      searchServiceSpy.extractTerm.and.returnValue('myTerm');
      component.onSearchInput('myTerm');
      expect(component.searchTerm()).toBe('myTerm');
    });
  });

  describe('refreshResults', () => {
    it('re-runs the current search term', fakeAsync(() => {
      searchServiceSpy.extractTerm.and.returnValue('refresh');
      component.onSearchInput('refresh');
      tick();

      nuxeoApiSpy.searchGroups.calls.reset();
      nuxeoApiSpy.searchUsers.calls.reset();

      component.refreshResults();
      tick();

      expect(nuxeoApiSpy.searchGroups).toHaveBeenCalledWith('refresh', 0, 50);
      expect(nuxeoApiSpy.searchUsers).toHaveBeenCalledWith('refresh', 0, 50);
    }));
  });

  describe('refreshRecent', () => {
    it('calls getLatestCreatedUsersOrGroups', () => {
      nuxeoApiSpy.getLatestCreatedUsersOrGroups.calls.reset();
      component.refreshRecent();
      expect(nuxeoApiSpy.getLatestCreatedUsersOrGroups).toHaveBeenCalled();
    });
  });

  describe('openGroupDetail', () => {
    it('navigates to the group detail path', fakeAsync(() => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openGroupDetail('group-123');
      expect(navSpy).toHaveBeenCalledWith(['/admin/anvandare-grupper', 'group-123']);
    }));

    it('does not navigate when groupId is empty', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openGroupDetail('');
      expect(navSpy).not.toHaveBeenCalled();
    });
  });

  describe('openUserDetail', () => {
    it('navigates to the user detail path', fakeAsync(() => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openUserDetail('user-456');
      expect(navSpy).toHaveBeenCalledWith(['/admin/anvandare-grupper/users', 'user-456']);
    }));

    it('does not navigate when userId is empty', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openUserDetail('');
      expect(navSpy).not.toHaveBeenCalled();
    });
  });

  describe('openRecentDetail', () => {
    it('navigates to group path when entry type is group', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.recentRows.set([{ id: 'g1', name: 'Group', entryType: 'group' }]);
      component.openRecentDetail('g1');
      expect(navSpy).toHaveBeenCalledWith(['/admin/anvandare-grupper', 'g1']);
    });

    it('navigates to user path when entry type is user', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.recentRows.set([{ id: 'u1', name: 'User', entryType: 'user' }]);
      component.openRecentDetail('u1');
      expect(navSpy).toHaveBeenCalledWith(['/admin/anvandare-grupper/users', 'u1']);
    });

    it('does nothing when rowId is not found', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.recentRows.set([]);
      component.openRecentDetail('unknown');
      expect(navSpy).not.toHaveBeenCalled();
    });
  });

  describe('openCreateGroup / closeCreateGroup', () => {
    it('sets isCreateGroupOpen to true', () => {
      component.isCreateGroupOpen.set(false);
      component.openCreateGroup();
      expect(component.isCreateGroupOpen()).toBe(true);
    });

    it('sets isCreateGroupOpen to false', () => {
      component.isCreateGroupOpen.set(true);
      component.closeCreateGroup();
      expect(component.isCreateGroupOpen()).toBe(false);
    });
  });

  describe('openCreateUser / closeCreateUser', () => {
    it('sets isCreateUserOpen to true', () => {
      component.isCreateUserOpen.set(false);
      component.openCreateUser();
      expect(component.isCreateUserOpen()).toBe(true);
    });

    it('sets isCreateUserOpen to false', () => {
      component.isCreateUserOpen.set(true);
      component.closeCreateUser();
      expect(component.isCreateUserOpen()).toBe(false);
    });
  });

  describe('submitCreateGroup', () => {
    it('sets createGroupAction and calls form submit', () => {
      const formSpy = jasmine.createSpyObj<GeneralFormComponent>('GeneralFormComponent', ['submit']);
      component.submitCreateGroup('another', formSpy);
      expect(component.createGroupAction()).toBe('another');
      expect(formSpy.submit).toHaveBeenCalled();
    });

    it('works without a form reference', () => {
      expect(() => component.submitCreateGroup('close', null)).not.toThrow();
      expect(component.createGroupAction()).toBe('close');
    });
  });

  describe('submitCreateUser', () => {
    it('sets createUserAction and calls form submit', () => {
      const formSpy = jasmine.createSpyObj<GeneralFormComponent>('GeneralFormComponent', ['submit']);
      component.submitCreateUser('another', formSpy);
      expect(component.createUserAction()).toBe('another');
      expect(formSpy.submit).toHaveBeenCalled();
    });

    it('works without a form reference', () => {
      expect(() => component.submitCreateUser('close', null)).not.toThrow();
      expect(component.createUserAction()).toBe('close');
    });
  });

  describe('handleCreateGroup', () => {
    it('shows success notification on successful group creation', () => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.handleCreateGroup({ groupName: 'testGroup', groupLabel: 'Test Group', members: [] });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
    });

    it('shows error notification on failed group creation', () => {
      nuxeoApiSpy.createGroup.and.returnValue(throwError(() => new Error('fail')));
      component.handleCreateGroup({ groupName: 'testGroup', groupLabel: '', members: [] });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('does nothing when groupName is empty', () => {
      nuxeoApiSpy.createGroup.calls.reset();
      component.handleCreateGroup({ groupName: '', groupLabel: '', members: [] });
      expect(nuxeoApiSpy.createGroup).not.toHaveBeenCalled();
    });

    it('closes dialog after success with close action', () => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.createGroupAction.set('close');
      component.isCreateGroupOpen.set(true);
      component.handleCreateGroup({ groupName: 'testGroup', groupLabel: '', members: [] });
      expect(component.isCreateGroupOpen()).toBe(false);
    });

    it('keeps dialog open after success with another action', () => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.createGroupAction.set('another');
      component.isCreateGroupOpen.set(true);
      component.handleCreateGroup({ groupName: 'testGroup', groupLabel: '', members: [] });
      expect(component.isCreateGroupOpen()).toBe(true);
    });
  });

  describe('handleCreateUser', () => {
    const validUserForm = {
      username: 'john',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme',
      email: 'john@example.com',
      groups: [],
      password: 'secret123',
      passwordVerify: 'secret123',
    };

    it('shows success notification on successful user creation', () => {
      nuxeoApiSpy.createUser.and.returnValue(of({ 'entity-type': 'user', id: 'john' }));
      component.handleCreateUser(validUserForm);
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
    });

    it('shows error notification on failed user creation', () => {
      nuxeoApiSpy.createUser.and.returnValue(throwError(() => new Error('fail')));
      component.handleCreateUser(validUserForm);
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('does nothing when username is missing', () => {
      nuxeoApiSpy.createUser.calls.reset();
      component.handleCreateUser({ ...validUserForm, username: '' });
      expect(nuxeoApiSpy.createUser).not.toHaveBeenCalled();
    });

    it('does nothing when passwords do not match', () => {
      nuxeoApiSpy.createUser.calls.reset();
      component.handleCreateUser({ ...validUserForm, passwordVerify: 'different' });
      expect(nuxeoApiSpy.createUser).not.toHaveBeenCalled();
    });

    it('closes dialog after success with close action', () => {
      nuxeoApiSpy.createUser.and.returnValue(of({ 'entity-type': 'user', id: 'john' }));
      component.createUserAction.set('close');
      component.isCreateUserOpen.set(true);
      component.handleCreateUser(validUserForm);
      expect(component.isCreateUserOpen()).toBe(false);
    });
  });

  describe('fetchResults error handling', () => {
    it('handles error from forkJoin gracefully', fakeAsync(() => {
      nuxeoApiSpy.searchGroups.and.returnValue(throwError(() => new Error('network error')));
      nuxeoApiSpy.searchUsers.and.returnValue(of(makeUserSearchResponse()));

      searchServiceSpy.extractTerm.and.returnValue('errorTerm');
      component.onSearchInput('errorTerm');
      tick();

      expect(component.groupsRows()).toEqual([]);
      expect(component.usersRows()).toEqual([]);
    }));
  });

  describe('handleCreateGroup — members classification', () => {
    it('classifies group: prefixed members into memberGroups', () => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.handleCreateGroup({
        groupName: 'myGroup',
        groupLabel: 'My Group',
        members: [{ id: 'group:admins', label: 'Admins', value: 'group:admins' }],
      });
      const args = nuxeoApiSpy.createGroup.calls.mostRecent().args[0] as unknown as CreateGroupPayload;
      expect(args.memberGroups).toContain('group:admins');
      expect(args.memberUsers).toEqual([]);
    });

    it('classifies user: prefixed members into memberUsers', () => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.handleCreateGroup({
        groupName: 'myGroup',
        groupLabel: '',
        members: [{ id: 'user:alice', label: 'Alice', value: 'user:alice' }],
      });
      const args = nuxeoApiSpy.createGroup.calls.mostRecent().args[0] as unknown as CreateGroupPayload;
      expect(args.memberUsers).toContain('user:alice');
      expect(args.memberGroups).toEqual([]);
    });

    it('classifies members without prefix into memberUsers', () => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.handleCreateGroup({
        groupName: 'myGroup',
        groupLabel: '',
        members: [{ id: 'plain-user', label: 'Plain User', value: 'plain-user' }],
      });
      const args = nuxeoApiSpy.createGroup.calls.mostRecent().args[0] as unknown as CreateGroupPayload;
      expect(args.memberUsers).toContain('plain-user');
    });

    it('uses groupName as grouplabel when groupLabel is empty', () => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.handleCreateGroup({ groupName: 'myGroup', groupLabel: '', members: [] });
      const args = nuxeoApiSpy.createGroup.calls.mostRecent().args[0] as unknown as CreateGroupPayload;
      expect(args.grouplabel).toBe('myGroup');
    });

    it('refreshes results after "another" action when searchTerm is set', fakeAsync(() => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.createGroupAction.set('another');
      component.searchTerm.set('active');
      nuxeoApiSpy.searchGroups.calls.reset();
      nuxeoApiSpy.searchUsers.calls.reset();
      component.handleCreateGroup({ groupName: 'grp', groupLabel: '', members: [] });
      tick();
      expect(nuxeoApiSpy.searchGroups).toHaveBeenCalled();
    }));

    it('refreshes results after "close" action when searchTerm is set', fakeAsync(() => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.createGroupAction.set('close');
      component.searchTerm.set('active');
      nuxeoApiSpy.searchGroups.calls.reset();
      nuxeoApiSpy.searchUsers.calls.reset();
      component.handleCreateGroup({ groupName: 'grp', groupLabel: '', members: [] });
      tick();
      expect(nuxeoApiSpy.searchGroups).toHaveBeenCalled();
    }));

    it('does not call refreshResults when searchTerm is empty and action is "another"', fakeAsync(() => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.createGroupAction.set('another');
      component.searchTerm.set('');
      nuxeoApiSpy.searchGroups.calls.reset();
      component.handleCreateGroup({ groupName: 'grp', groupLabel: '', members: [] });
      tick();
      expect(nuxeoApiSpy.searchGroups).not.toHaveBeenCalled();
    }));

    it('does not call refreshResults when searchTerm is empty and action is "close"', fakeAsync(() => {
      nuxeoApiSpy.createGroup.and.returnValue(of({}));
      component.createGroupAction.set('close');
      component.searchTerm.set('');
      nuxeoApiSpy.searchGroups.calls.reset();
      component.handleCreateGroup({ groupName: 'grp', groupLabel: '', members: [] });
      tick();
      expect(nuxeoApiSpy.searchGroups).not.toHaveBeenCalled();
    }));
  });

  describe('handleCreateUser — extra branches', () => {
    const validUserForm = {
      username: 'john',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme',
      email: 'john@example.com',
      groups: [],
      password: 'secret123',
      passwordVerify: 'secret123',
    };

    it('does nothing when email is missing', () => {
      nuxeoApiSpy.createUser.calls.reset();
      component.handleCreateUser({ ...validUserForm, email: '' });
      expect(nuxeoApiSpy.createUser).not.toHaveBeenCalled();
    });

    it('does nothing when password is empty', () => {
      nuxeoApiSpy.createUser.calls.reset();
      component.handleCreateUser({ ...validUserForm, password: '' });
      expect(nuxeoApiSpy.createUser).not.toHaveBeenCalled();
    });

    it('keeps dialog open after success with another action and refreshes', fakeAsync(() => {
      nuxeoApiSpy.createUser.and.returnValue(of({ 'entity-type': 'user', id: 'john' }));
      component.createUserAction.set('another');
      component.isCreateUserOpen.set(true);
      component.searchTerm.set('');
      nuxeoApiSpy.getLatestCreatedUsersOrGroups.calls.reset();
      component.handleCreateUser(validUserForm);
      tick();
      expect(component.isCreateUserOpen()).toBe(true);
      expect(nuxeoApiSpy.getLatestCreatedUsersOrGroups).toHaveBeenCalled();
    }));

    it('refreshes results after "close" action when searchTerm is set', fakeAsync(() => {
      nuxeoApiSpy.createUser.and.returnValue(of({ 'entity-type': 'user', id: 'john' }));
      component.createUserAction.set('close');
      component.searchTerm.set('active');
      nuxeoApiSpy.searchGroups.calls.reset();
      nuxeoApiSpy.searchUsers.calls.reset();
      component.handleCreateUser(validUserForm);
      tick();
      expect(nuxeoApiSpy.searchGroups).toHaveBeenCalled();
    }));

    it('refreshes results after "another" action when searchTerm is set', fakeAsync(() => {
      nuxeoApiSpy.createUser.and.returnValue(of({ 'entity-type': 'user', id: 'john' }));
      component.createUserAction.set('another');
      component.searchTerm.set('active');
      nuxeoApiSpy.searchGroups.calls.reset();
      nuxeoApiSpy.searchUsers.calls.reset();
      component.handleCreateUser(validUserForm);
      tick();
      expect(nuxeoApiSpy.searchGroups).toHaveBeenCalled();
    }));

    it('handles non-string raw values gracefully (username as object)', () => {
      nuxeoApiSpy.createUser.calls.reset();
      component.handleCreateUser({
        ...validUserForm,
        username: 42 as never,
        email: 'x@x.com',
      });
      expect(nuxeoApiSpy.createUser).not.toHaveBeenCalled();
    });
  });

  describe('handleCreateGroupDropdownChanged', () => {
    it('fetches getUserGroupSuggestions with term when fieldName is members', () => {
      nuxeoApiSpy.getUserGroupSuggestions.calls.reset();
      component.handleCreateGroupDropdownChanged({ fieldName: 'members', value: 'alice' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('alice');
    });

    it('does nothing when fieldName is not members', () => {
      nuxeoApiSpy.getUserGroupSuggestions.calls.reset();
      component.handleCreateGroupDropdownChanged({ fieldName: 'groupName', value: 'test' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).not.toHaveBeenCalled();
    });

    it('passes empty string when value is falsy', () => {
      nuxeoApiSpy.getUserGroupSuggestions.calls.reset();
      component.handleCreateGroupDropdownChanged({ fieldName: 'members', value: null });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('');
    });

    it('updates memberOptions from suggestions', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(
        of([makeUserSuggestion({ id: 'user-opt', displayLabel: 'User Opt', prefixed_id: 'user:user-opt' })])
      );
      component.handleCreateGroupDropdownChanged({ fieldName: 'members', value: 'user' });
      expect(component.memberOptions().length).toBe(1);
      expect(component.memberOptions()[0].label).toBe('User Opt');
    });

    it('filters out suggestions without an id', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(
        of([makeUserSuggestion({ id: '', displayLabel: 'No ID', prefixed_id: '' })])
      );
      component.handleCreateGroupDropdownChanged({ fieldName: 'members', value: 'x' });
      expect(component.memberOptions().length).toBe(0);
    });
  });

  describe('handleCreateUserDropdownChanged', () => {
    it('fetches getUserGroupSuggestions with GROUP_TYPE when fieldName is groups', () => {
      nuxeoApiSpy.getUserGroupSuggestions.calls.reset();
      component.handleCreateUserDropdownChanged({ fieldName: 'groups', value: 'mgmt' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('mgmt', 'GROUP_TYPE');
    });

    it('does nothing when fieldName is not groups', () => {
      nuxeoApiSpy.getUserGroupSuggestions.calls.reset();
      component.handleCreateUserDropdownChanged({ fieldName: 'username', value: 'test' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).not.toHaveBeenCalled();
    });

    it('passes empty string when value is falsy', () => {
      nuxeoApiSpy.getUserGroupSuggestions.calls.reset();
      component.handleCreateUserDropdownChanged({ fieldName: 'groups', value: '' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('', 'GROUP_TYPE');
    });

    it('updates groupOptions from suggestions', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(
        of([makeUserSuggestion({ id: 'grp-opt', displayLabel: 'Group Opt', prefixed_id: 'group:grp-opt' })])
      );
      component.handleCreateUserDropdownChanged({ fieldName: 'groups', value: 'grp' });
      expect(component.groupOptions().length).toBe(1);
      expect(component.groupOptions()[0].label).toBe('Group Opt');
    });
  });

  describe('fetchRecent error handling', () => {
    it('handles error from getLatestCreatedUsersOrGroups gracefully', () => {
      nuxeoApiSpy.getLatestCreatedUsersOrGroups.and.returnValue(throwError(() => new Error('recent error')));
      expect(() => component.refreshRecent()).not.toThrow();
      expect(component.recentRows()).toEqual([]);
    });
  });

  describe('mapRecentEntry: group and user variants', () => {
    it('maps group entries with grouplabel and groupname from properties', () => {
      const groupEntry = {
        ...makeNuxeoDocument({
          uid: 'g-uid',
          type: 'group',
          title: 'Group Title',
          name: 'g-name',
          path: '',
        }),
        properties: {
          'group:grouplabel': 'My Group Label',
          'group:groupname': 'my-group',
        },
      };
      nuxeoApiSpy.getLatestCreatedUsersOrGroups.and.returnValue(
        of({
          'entity-type': 'documents',
          entries: [groupEntry],
          currentPageIndex: 0,
          pageSize: 50,
          maxResults: 1,
          totalSize: 1,
        })
      );
      component.refreshRecent();

      expect(component.recentRows().length).toBe(1);
      expect(component.recentRows()[0]['name']).toBe('My Group Label');
      expect(component.recentRows()[0]['identifier']).toBe('my-group');
      expect(component.recentRows()[0]['entryType']).toBe('group');
    });

    it('maps user entries with firstName, lastName, and email from properties', () => {
      const userEntry = {
        ...makeNuxeoDocument({
          uid: 'u-uid',
          type: 'user',
          title: 'User Title',
          name: 'u-name',
          path: '',
        }),
        properties: {
          'user:firstName': 'Jane',
          'user:lastName': 'Smith',
          'user:email': 'jane@example.com',
          'user:username': 'jsmith',
        },
      };
      nuxeoApiSpy.getLatestCreatedUsersOrGroups.and.returnValue(
        of({
          'entity-type': 'documents',
          entries: [userEntry],
          currentPageIndex: 0,
          pageSize: 50,
          maxResults: 1,
          totalSize: 1,
        })
      );
      component.refreshRecent();

      expect(component.recentRows().length).toBe(1);
      expect(component.recentRows()[0]['name']).toBe('Jane Smith');
      expect(component.recentRows()[0]['email']).toBe('jane@example.com');
      expect(component.recentRows()[0]['entryType']).toBe('user');
    });

    it('maps group entry with no properties — falls back to title/uid', () => {
      const groupNoProps = {
        ...makeNuxeoDocument({
          uid: 'g-noprops',
          type: 'group',
          title: 'Fallback Title',
          name: 'g-name',
          path: '',
        }),
        properties: null,
      };
      nuxeoApiSpy.getLatestCreatedUsersOrGroups.and.returnValue(
        of({
          'entity-type': 'documents',
          entries: [{ ...groupNoProps, properties: {} }],
          currentPageIndex: 0,
          pageSize: 50,
          maxResults: 1,
          totalSize: 1,
        })
      );
      component.refreshRecent();

      expect(component.recentRows().length).toBe(1);
      expect(component.recentRows()[0]['name']).toBe('Fallback Title');
    });

    it('maps user entry with no username — falls back to uid', () => {
      const userNoUsername = {
        ...makeNuxeoDocument({
          uid: 'u-nouser',
          type: 'user',
          title: 'User Fallback',
          name: 'u-name',
          path: '',
        }),
        properties: {
          'user:firstName': '',
          'user:lastName': '',
        },
      };
      nuxeoApiSpy.getLatestCreatedUsersOrGroups.and.returnValue(
        of({
          'entity-type': 'documents',
          entries: [userNoUsername],
          currentPageIndex: 0,
          pageSize: 50,
          maxResults: 1,
          totalSize: 1,
        })
      );
      component.refreshRecent();

      expect(component.recentRows().length).toBe(1);

      expect(component.recentRows()[0]['identifier']).toBe('u-nouser');
    });
  });

  describe('mapGroupToRow', () => {
    it('maps group search result with multiple members', fakeAsync(() => {
      nuxeoApiSpy.searchGroups.and.returnValue(
        of({
          'entity-type': 'groups' as const,
          entries: [
            {
              'entity-type': 'group' as const,
              id: 'grp1',
              groupname: 'grp1',
              grouplabel: 'Group One',
              memberUsers: ['u1', 'u2'],
              memberGroups: ['g1'],
            },
          ],
          resultsCount: 1,
        })
      );
      searchServiceSpy.extractTerm.and.returnValue('grp');
      component.onSearchInput('grp');
      tick();

      expect(component.groupsRows().length).toBe(1);
      expect(component.groupsRows()[0]['contains']).toBe('3 members');
    }));

    it('mapGroupToRow: single member uses singular label', fakeAsync(() => {
      nuxeoApiSpy.searchGroups.and.returnValue(
        of({
          'entity-type': 'groups' as const,
          entries: [
            {
              'entity-type': 'group' as const,
              id: 'grp-single',
              groupname: 'grp-single',
              grouplabel: 'Group Single',
              memberUsers: ['u1'],
              memberGroups: [],
            },
          ],
          resultsCount: 1,
        })
      );
      searchServiceSpy.extractTerm.and.returnValue('grp');
      component.onSearchInput('grp');
      tick();

      expect(component.groupsRows()[0]['contains']).toBe('1 member');
    }));

    it('mapGroupToRow: falls back to groupname when grouplabel is absent', fakeAsync(() => {
      nuxeoApiSpy.searchGroups.and.returnValue(
        of({
          'entity-type': 'groups' as const,
          entries: [
            {
              'entity-type': 'group' as const,
              id: 'fallback-grp',
              groupname: 'fallback-grp',
              memberUsers: [],
              memberGroups: [],
            },
          ],
          resultsCount: 1,
        })
      );
      searchServiceSpy.extractTerm.and.returnValue('fallback');
      component.onSearchInput('fallback');
      tick();

      expect(component.groupsRows()[0]['name']).toBe('fallback-grp');
    }));
  });

  describe('mapUserToRow', () => {
    it('uses alt firstName/lastName when primary props are missing', fakeAsync(() => {
      nuxeoApiSpy.searchUsers.and.returnValue(
        of({
          'entity-type': 'users' as const,
          entries: [
            {
              'entity-type': 'user' as const,
              id: 'alt-user',
              properties: {
                'user:firstName': 'Alt',
                'user:lastName': 'User',
                'user:email': 'alt@example.com',
              },
            },
          ],
          resultsCount: 1,
        })
      );
      searchServiceSpy.extractTerm.and.returnValue('alt');
      component.onSearchInput('alt');
      tick();

      expect(component.usersRows().length).toBe(1);
      expect(component.usersRows()[0]['name']).toBe('Alt User');
    }));

    it('mapUserToRow uses user.id as name fallback when all name fields are empty', fakeAsync(() => {
      nuxeoApiSpy.searchUsers.and.returnValue(
        of({
          'entity-type': 'users' as const,
          entries: [
            {
              'entity-type': 'user' as const,
              id: 'bare-user',
              properties: {},
            },
          ],
          resultsCount: 1,
        })
      );
      searchServiceSpy.extractTerm.and.returnValue('bare');
      component.onSearchInput('bare');
      tick();

      expect(component.usersRows()[0]['name']).toBe('bare-user');
    }));

    it('mapUserToRow uses alt email field when primary email is absent', fakeAsync(() => {
      nuxeoApiSpy.searchUsers.and.returnValue(
        of({
          'entity-type': 'users' as const,
          entries: [
            {
              'entity-type': 'user' as const,
              id: 'email-alt-user',
              properties: {
                'user:email': 'altalt@example.com',
              },
            },
          ],
          resultsCount: 1,
        })
      );
      searchServiceSpy.extractTerm.and.returnValue('email-alt');
      component.onSearchInput('email-alt');
      tick();

      expect(component.usersRows()[0]['email']).toBe('altalt@example.com');
    }));
  });

  describe('fetchResults with null entries', () => {
    it('handles null groups entries from API gracefully', fakeAsync(() => {
      nuxeoApiSpy.searchGroups.and.returnValue(of({ 'entity-type': 'groups' as const, entries: [], resultsCount: 0 }));
      nuxeoApiSpy.searchUsers.and.returnValue(of({ 'entity-type': 'users' as const, entries: [], resultsCount: 0 }));
      searchServiceSpy.extractTerm.and.returnValue('empty');
      component.onSearchInput('empty');
      tick();

      expect(component.groupsRows()).toEqual([]);
      expect(component.usersRows()).toEqual([]);
      expect(component.groupsTotal()).toBe(0);
      expect(component.usersTotal()).toBe(0);
    }));
  });

  describe('buildDefaultColumnOptions', () => {
    it('returns column options mapped from each table config', () => {
      expect(component.groupsDefaultColumnOptions.length).toBe(component.groupsTableConfig.length);
      expect(component.usersDefaultColumnOptions.length).toBe(component.usersTableConfig.length);
      expect(component.recentDefaultColumnOptions.length).toBe(component.recentTableConfig.length);
      expect(component.groupsDefaultColumnOptions[0]).toEqual(
        jasmine.objectContaining({ id: component.groupsTableConfig[0].key.toString() })
      );
    });
  });
});
