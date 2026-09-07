import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { ParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GroupDetailComponent } from './group-detail.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import type { NuxeoGroup, UserSearchResponse } from '@app/shared/api/nuxeo-api.types';
import type { Option } from '@app/shared/commonTypes';

describe('GroupDetailComponent', () => {
  let component: GroupDetailComponent;
  let fixture: ComponentFixture<GroupDetailComponent>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeSpy: { notification: { set: jasmine.Spy }; navigationPanelContext: () => null; getValue: jasmine.Spy };
  let router: Router;
  let paramMapSubject: Subject<ParamMap>;

  const makeGroup = (overrides: Record<string, unknown> = {}) => ({
    'entity-type': 'group' as const,
    id: 'testgroup',
    groupname: 'testgroup',
    grouplabel: 'Test Group',
    memberUsers: [],
    memberGroups: [],
    ...overrides,
  });

  const makeGroupUsersResponse = (entries: unknown[] = []) => ({
    'entity-type': 'users' as const,
    entries,
    resultsCount: entries.length,
  });

  beforeEach(async () => {
    paramMapSubject = new Subject<ParamMap>();

    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getGroup',
      'deleteGroup',
      'updateGroup',
      'getGroupUsers',
      'getUserGroupSuggestions',
    ]);

    storeSpy = {
      notification: { set: jasmine.createSpy('set') },
      navigationPanelContext: () => null,
      getValue: jasmine.createSpy('getValue').and.returnValue(''),
    };

    nuxeoApiSpy.getGroup.and.returnValue(of(makeGroup()));
    nuxeoApiSpy.deleteGroup.and.returnValue(of(void 0));
    nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup()));
    nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
    nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [GroupDetailComponent],
      providers: [
        provideRouter([]),
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
        { provide: GeneralStore, useValue: storeSpy },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMapSubject.asObservable() },
        },
      ],
    })
      .overrideTemplate(GroupDetailComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(GroupDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('groupLabel computed', () => {
    it('returns grouplabel from group', () => {
      component.group.set(makeGroup());
      expect(component.groupLabel()).toBe('Test Group');
    });

    it('falls back to groupname when grouplabel is missing', () => {
      component.group.set(makeGroup({ grouplabel: undefined, groupname: 'mygroup' }));
      expect(component.groupLabel()).toBe('mygroup');
    });

    it('falls back to groupId when group is null', () => {
      component.group.set(null);
      component.groupId.set('fallback-id');
      expect(component.groupLabel()).toBe('fallback-id');
    });

    it('falls back to "Group" when group and groupId are both empty', () => {
      component.group.set(null);
      component.groupId.set('');
      expect(component.groupLabel()).toBe('Group');
    });
  });

  describe('openEditGroup / closeEditGroup', () => {
    it('openEditGroup sets isEditGroupOpen to true', () => {
      component.isEditGroupOpen.set(false);
      component.group.set(makeGroup());
      component.openEditGroup();
      expect(component.isEditGroupOpen()).toBe(true);
    });

    it('closeEditGroup sets isEditGroupOpen to false', () => {
      component.isEditGroupOpen.set(true);
      component.closeEditGroup();
      expect(component.isEditGroupOpen()).toBe(false);
    });
  });

  describe('openAddMembers / closeAddMembers', () => {
    it('openAddMembers sets isAddMembersOpen to true', () => {
      component.isAddMembersOpen.set(false);
      component.openAddMembers();
      expect(component.isAddMembersOpen()).toBe(true);
    });

    it('closeAddMembers sets isAddMembersOpen to false', () => {
      component.isAddMembersOpen.set(true);
      component.closeAddMembers();
      expect(component.isAddMembersOpen()).toBe(false);
    });
  });

  describe('openRemoveMember', () => {
    it('sets pendingRemoveMemberId and opens dialog', () => {
      component.isRemoveMemberOpen.set(false);
      component.openRemoveMember('user-abc');
      expect(component.pendingRemoveMemberId()).toBe('user-abc');
      expect(component.isRemoveMemberOpen()).toBe(true);
    });

    it('does nothing when memberId is empty', () => {
      component.isRemoveMemberOpen.set(false);
      component.openRemoveMember('');
      expect(component.isRemoveMemberOpen()).toBe(false);
      expect(component.pendingRemoveMemberId()).toBeNull();
    });
  });

  describe('closeRemoveMember', () => {
    it('clears pendingRemoveMemberId and closes dialog', () => {
      component.isRemoveMemberOpen.set(true);
      component.pendingRemoveMemberId.set('user-abc');
      component.closeRemoveMember();
      expect(component.isRemoveMemberOpen()).toBe(false);
      expect(component.pendingRemoveMemberId()).toBeNull();
    });
  });

  describe('deleteGroup', () => {
    it('calls deleteGroup API and navigates on success', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      nuxeoApiSpy.deleteGroup.and.returnValue(of(void 0));
      component.groupId.set('testgroup');

      component.deleteGroup();

      expect(nuxeoApiSpy.deleteGroup).toHaveBeenCalledWith('testgroup');
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
      expect(navSpy).toHaveBeenCalledWith(['/admin/anvandare-grupper']);
    });

    it('shows error notification on deleteGroup failure', () => {
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      nuxeoApiSpy.deleteGroup.and.returnValue(throwError(() => new Error('fail')));
      component.groupId.set('testgroup');

      component.deleteGroup();

      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('does nothing when groupId is empty', () => {
      component.groupId.set('');
      component.deleteGroup();
      expect(nuxeoApiSpy.deleteGroup).not.toHaveBeenCalled();
    });
  });

  describe('openUserDetail', () => {
    it('navigates to user detail page', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openUserDetail('user-123');
      expect(navSpy).toHaveBeenCalledWith(['/admin/anvandare-grupper/users', 'user-123']);
    });

    it('does not navigate when userId is empty', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      component.openUserDetail('');
      expect(navSpy).not.toHaveBeenCalled();
    });
  });

  describe('route paramMap triggers group load', () => {
    it('loads group when paramMap emits a groupId', () => {
      nuxeoApiSpy.getGroup.calls.reset();
      nuxeoApiSpy.getGroupUsers.calls.reset();
      paramMapSubject.next(convertToParamMap({ groupId: 'group42' }));
      expect(nuxeoApiSpy.getGroup).toHaveBeenCalledWith('group42');
    });

    it('does not load group when groupId is missing from paramMap', () => {
      nuxeoApiSpy.getGroup.calls.reset();
      paramMapSubject.next(convertToParamMap({}));
      expect(nuxeoApiSpy.getGroup).not.toHaveBeenCalled();
    });
  });

  describe('groupIdentifier computed', () => {
    it('returns groupname when group has groupname', () => {
      component.group.set(makeGroup());
      expect(component.groupIdentifier()).toBe('testgroup');
    });

    it('falls back to group.id when no groupname', () => {
      component.group.set(makeGroup({ groupname: undefined, id: 'id-fallback' }));
      expect(component.groupIdentifier()).toBe('id-fallback');
    });

    it('falls back to groupId signal when group is null', () => {
      component.group.set(null);
      component.groupId.set('signal-group-id');
      expect(component.groupIdentifier()).toBe('signal-group-id');
    });

    it('returns em dash when group and groupId are both empty', () => {
      component.group.set(null);
      component.groupId.set('');
      expect(component.groupIdentifier()).toBe('—');
    });
  });

  describe('memberSummary computed', () => {
    it('shows singular member when count is 1', () => {
      component.group.set(makeGroup({ memberUsers: ['u1'], memberGroups: [] }));
      expect(component.memberSummary()).toContain('1 member');
      expect(component.memberSummary()).not.toContain('members');
    });

    it('shows plural members when count is not 1', () => {
      component.group.set(makeGroup({ memberUsers: ['u1', 'u2'], memberGroups: [] }));
      expect(component.memberSummary()).toContain('2 members');
    });

    it('shows singular nested group when count is 1', () => {
      component.group.set(makeGroup({ memberUsers: [], memberGroups: ['g1'] }));
      expect(component.memberSummary()).toContain('1 nested group');
      expect(component.memberSummary()).not.toContain('nested groups');
    });

    it('shows plural nested groups when count is not 1', () => {
      component.group.set(makeGroup({ memberUsers: [], memberGroups: ['g1', 'g2'] }));
      expect(component.memberSummary()).toContain('2 nested groups');
    });

    it('uses usersRows length when group.memberUsers is null', () => {
      component.group.set(makeGroup({ memberUsers: null }) as unknown as NuxeoGroup);
      component.usersRows.set([{ id: 'r1', name: 'Row 1' }]);
      expect(component.memberSummary()).toContain('1 member');
    });
  });

  describe('submitEditGroup', () => {
    it('calls form.submit when form is provided', () => {
      const mockForm = jasmine.createSpyObj('GeneralFormComponent', ['submit']);
      component.submitEditGroup(mockForm);
      expect(mockForm.submit).toHaveBeenCalled();
    });

    it('does nothing when form is null', () => {
      expect(() => component.submitEditGroup(null)).not.toThrow();
    });

    it('does nothing when form is undefined', () => {
      expect(() => component.submitEditGroup(undefined)).not.toThrow();
    });
  });

  describe('submitAddMembers', () => {
    it('calls form.submit when form is provided', () => {
      const mockForm = jasmine.createSpyObj('GeneralFormComponent', ['submit']);
      component.submitAddMembers(mockForm);
      expect(mockForm.submit).toHaveBeenCalled();
    });

    it('does nothing when form is null', () => {
      expect(() => component.submitAddMembers(null)).not.toThrow();
    });
  });

  describe('handleEditGroup', () => {
    it('does nothing when group is null', () => {
      component.group.set(null);
      component.handleEditGroup({ grouplabel: 'New Label' });
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('does nothing when grouplabel is empty string', () => {
      component.group.set(makeGroup());
      component.handleEditGroup({ grouplabel: '' });
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('does nothing when grouplabel is whitespace only', () => {
      component.group.set(makeGroup());
      component.handleEditGroup({ grouplabel: '   ' });
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('does nothing when grouplabel is not a string', () => {
      component.group.set(makeGroup());
      component.handleEditGroup({ grouplabel: 42 });
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('calls updateGroup and shows success notification on success', () => {
      component.group.set(makeGroup());
      component.groupId.set('testgroup');
      nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup({ grouplabel: 'Updated Label' })));
      component.handleEditGroup({ grouplabel: 'Updated Label' });
      expect(nuxeoApiSpy.updateGroup).toHaveBeenCalledWith('testgroup', jasmine.any(Object));
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
      expect(component.isEditGroupOpen()).toBe(false);
    });

    it('updates group signal with updated value on success', () => {
      component.group.set(makeGroup());
      component.groupId.set('testgroup');
      const updatedGroup = makeGroup({ grouplabel: 'New Name' });
      nuxeoApiSpy.updateGroup.and.returnValue(of(updatedGroup));
      component.handleEditGroup({ grouplabel: 'New Name' });
      expect(component.group()?.grouplabel).toBe('New Name');
    });

    it('uses payload as fallback when updated is null', () => {
      component.group.set(makeGroup());
      component.groupId.set('testgroup');
      nuxeoApiSpy.updateGroup.and.returnValue(of(null as unknown as NuxeoGroup));
      component.handleEditGroup({ grouplabel: 'Fallback Label' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
    });

    it('shows error notification on update failure', () => {
      component.group.set(makeGroup());
      component.groupId.set('testgroup');
      nuxeoApiSpy.updateGroup.and.returnValue(throwError(() => new Error('fail')));
      component.handleEditGroup({ grouplabel: 'Test' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('uses groupId signal as groupname fallback when group.groupname is undefined', () => {
      component.group.set(makeGroup({ groupname: undefined, id: undefined }));
      component.groupId.set('signal-id');
      nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup()));
      component.handleEditGroup({ grouplabel: 'Test Label' });
      expect(nuxeoApiSpy.updateGroup).toHaveBeenCalledWith(
        'signal-id',
        jasmine.objectContaining({
          groupname: 'signal-id',
        })
      );
    });
  });

  describe('handleAddMembers', () => {
    it('does nothing when group is null', () => {
      component.group.set(null);
      component.handleAddMembers({ members: ['u1'] });
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('does nothing when selected members is empty', () => {
      component.group.set(makeGroup());
      component.handleAddMembers({ members: [] });
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('calls updateGroup with selected members on success', () => {
      component.group.set(makeGroup());
      component.groupId.set('testgroup');
      const updatedGroup = makeGroup({ memberUsers: ['u1'] });
      nuxeoApiSpy.updateGroup.and.returnValue(of(updatedGroup));
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      component.handleAddMembers({ members: [{ id: 'u1', label: 'User 1', value: 'u1', selected: true }] });
      expect(nuxeoApiSpy.updateGroup).toHaveBeenCalled();
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
      expect(component.isAddMembersOpen()).toBe(false);
    });

    it('merges group with memberUsers after update', () => {
      component.group.set(makeGroup());
      component.groupId.set('testgroup');
      nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      component.handleAddMembers({ members: [{ id: 'u1', label: 'U1', value: 'u1', selected: true }] });
      expect(component.group()?.memberUsers).toEqual(['u1']);
    });

    it('shows error notification on failure', () => {
      component.group.set(makeGroup());
      component.groupId.set('testgroup');
      nuxeoApiSpy.updateGroup.and.returnValue(throwError(() => new Error('fail')));
      component.handleAddMembers({ members: [{ id: 'u1', label: 'U1', value: 'u1', selected: true }] });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });
  });

  describe('handleAddMembersDropdownChanged', () => {
    it('does nothing for non-members field', () => {
      component.handleAddMembersDropdownChanged({ fieldName: 'otherField', value: 'search' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).not.toHaveBeenCalled();
    });

    it('calls getUserGroupSuggestions with search term for members field', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));
      component.handleAddMembersDropdownChanged({ fieldName: 'members', value: 'john' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('john', 'USER_TYPE');
    });

    it('uses empty string when value is null/falsy', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));
      component.handleAddMembersDropdownChanged({ fieldName: 'members', value: null });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('', 'USER_TYPE');
    });

    it('maps suggestions to options and updates memberOptions', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(
        of([{ id: 'u1', displayLabel: 'User One', 'entity-type': 'userEntry' }])
      );
      component.handleAddMembersDropdownChanged({ fieldName: 'members', value: 'user' });
      expect(component.memberOptions().length).toBe(1);
      expect(component.memberOptions()[0].id).toBe('u1');
      expect(component.memberOptions()[0].label).toBe('User One');
    });

    it('filters out suggestions with empty id', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(
        of([
          { id: '', displayLabel: 'No ID', 'entity-type': 'userEntry' },
          { id: 'u2', displayLabel: 'User Two', 'entity-type': 'userEntry' },
        ])
      );
      component.handleAddMembersDropdownChanged({ fieldName: 'members', value: 'u' });
      expect(component.memberOptions().length).toBe(1);
      expect(component.memberOptions()[0].id).toBe('u2');
    });

    it('uses prefixed_id fallback when id is empty but prefixed_id exists', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(
        of([{ id: '', prefixed_id: 'user:u3', displayLabel: 'User Three', 'entity-type': 'userEntry' }])
      );
      component.handleAddMembersDropdownChanged({ fieldName: 'members', value: 'u' });
      expect(component.memberOptions().length).toBe(1);
      expect(component.memberOptions()[0].id).toBe('user:u3');
    });
  });

  describe('openRemoveMember - with event', () => {
    it('stops event propagation', () => {
      const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation']);
      component.openRemoveMember('user-abc', mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('confirmRemoveMember', () => {
    it('does nothing when group is null', () => {
      component.group.set(null);
      component.pendingRemoveMemberId.set('u1');
      component.confirmRemoveMember();
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('does nothing when pendingRemoveMemberId is null', () => {
      component.group.set(makeGroup());
      component.pendingRemoveMemberId.set(null);
      component.confirmRemoveMember();
      expect(nuxeoApiSpy.updateGroup).not.toHaveBeenCalled();
    });

    it('removes member from memberUsers and calls updateGroup', () => {
      component.group.set(makeGroup({ memberUsers: ['u1', 'u2'] }));
      component.groupId.set('testgroup');
      component.pendingRemoveMemberId.set('u1');
      nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      component.confirmRemoveMember();
      expect(nuxeoApiSpy.updateGroup).toHaveBeenCalledWith(
        'testgroup',
        jasmine.objectContaining({ memberUsers: ['u2'] })
      );
    });

    it('uses tableUsers as fallback when group.memberUsers is empty', () => {
      component.group.set(makeGroup({ memberUsers: [] }));
      component.usersRows.set([{ id: 'u1', name: 'User 1', identifier: 'u1' }]);
      component.groupId.set('testgroup');
      component.pendingRemoveMemberId.set('u1');
      nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      component.confirmRemoveMember();

      const callPayload = nuxeoApiSpy.updateGroup.calls.mostRecent().args[1];
      expect(callPayload.memberUsers).not.toContain('u1');
    });

    it('shows success notification and closes dialog on success', () => {
      component.group.set(makeGroup({ memberUsers: ['u1', 'u2'] }));
      component.groupId.set('testgroup');
      component.pendingRemoveMemberId.set('u1');
      nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      component.confirmRemoveMember();
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
      expect(component.isRemoveMemberOpen()).toBe(false);
      expect(component.pendingRemoveMemberId()).toBeNull();
    });

    it('shows error notification on failure', () => {
      component.group.set(makeGroup({ memberUsers: ['u1'] }));
      component.groupId.set('testgroup');
      component.pendingRemoveMemberId.set('u1');
      nuxeoApiSpy.updateGroup.and.returnValue(throwError(() => new Error('fail')));
      component.confirmRemoveMember();
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('merges updated group with memberUsers after success', () => {
      component.group.set(makeGroup({ memberUsers: ['u1', 'u2'] }));
      component.groupId.set('testgroup');
      component.pendingRemoveMemberId.set('u1');
      nuxeoApiSpy.updateGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      component.confirmRemoveMember();
      expect(component.group()?.memberUsers).toEqual(['u2']);
    });
  });

  describe('onUsersSearch', () => {
    it('does nothing when field is not "name"', () => {
      component.groupId.set('testgroup');
      nuxeoApiSpy.getGroupUsers.calls.reset();
      component.onUsersSearch({ field: 'otherField', value: 'query' });
      expect(nuxeoApiSpy.getGroupUsers).not.toHaveBeenCalled();
    });

    it('does nothing when groupId is empty', () => {
      component.groupId.set('');
      nuxeoApiSpy.getGroupUsers.calls.reset();
      component.onUsersSearch({ field: 'name', value: 'query' });
      expect(nuxeoApiSpy.getGroupUsers).not.toHaveBeenCalled();
    });

    it('calls getGroupUsers with query and updates usersRows', () => {
      component.groupId.set('testgroup');
      const user = { id: 'u1', properties: { firstName: 'Anna', lastName: 'Berg' } };
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse([user]) as unknown as UserSearchResponse));
      component.onUsersSearch({ field: 'name', value: 'anna' });
      expect(nuxeoApiSpy.getGroupUsers).toHaveBeenCalledWith('testgroup', 'anna', 0);
      expect(component.usersRows().length).toBe(1);
    });

    it('joins array values into a single query string', () => {
      component.groupId.set('testgroup');
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      component.onUsersSearch({ field: 'name', value: ['first', 'second'] });
      expect(nuxeoApiSpy.getGroupUsers).toHaveBeenCalledWith('testgroup', 'first second', 0);
    });

    it('handles API error gracefully (returns null result)', () => {
      component.groupId.set('testgroup');
      nuxeoApiSpy.getGroupUsers.and.returnValue(throwError(() => new Error('fail')));
      expect(() => component.onUsersSearch({ field: 'name', value: 'query' })).not.toThrow();
    });

    it('sets usersTotal from resultsCount', () => {
      component.groupId.set('testgroup');
      const response = { ...makeGroupUsersResponse([{ id: 'u1', properties: {} }]), resultsCount: 42 };
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(response as unknown as UserSearchResponse));
      component.onUsersSearch({ field: 'name', value: 'u' });
      expect(component.usersTotal()).toBe(42);
    });
  });

  describe('loadGroup - null group', () => {
    it('resets all signals when getGroup returns null', () => {
      nuxeoApiSpy.getGroup.and.returnValue(of(null as unknown as NuxeoGroup));
      paramMapSubject.next(convertToParamMap({ groupId: 'nonexistent' }));
      expect(component.group()).toBeNull();
      expect(component.usersRows()).toEqual([]);
      expect(component.usersTotal()).toBe(0);
      expect(component.nestedGroupsRows()).toEqual([]);
      expect(component.nestedGroupsTotal()).toBe(0);
    });

    it('handles getGroup error by returning null (catchError)', () => {
      nuxeoApiSpy.getGroup.and.returnValue(throwError(() => new Error('api error')));
      expect(() => paramMapSubject.next(convertToParamMap({ groupId: 'errgroup' }))).not.toThrow();
    });
  });

  describe('loadMembers - via paramMap', () => {
    it('sets nestedGroupsRows when group has memberGroups', () => {
      const groupWithNested = makeGroup({ memberGroups: ['g1', 'g2'] });
      nuxeoApiSpy.getGroup.and.returnValue(of(groupWithNested));
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(makeGroupUsersResponse() as unknown as UserSearchResponse));
      paramMapSubject.next(convertToParamMap({ groupId: 'nested-test' }));
      expect(component.nestedGroupsRows().length).toBe(2);
      expect(component.nestedGroupsTotal()).toBe(2);
    });

    it('maps user entries to table rows with full name', () => {
      nuxeoApiSpy.getGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(
        of(
          makeGroupUsersResponse([
            { id: 'u1', properties: { firstName: 'Anna', lastName: 'Berg', email: 'anna@test.com' } },
          ]) as unknown as UserSearchResponse
        )
      );
      paramMapSubject.next(convertToParamMap({ groupId: 'user-test' }));
      expect(component.usersRows().length).toBe(1);
      expect(component.usersRows()[0]['name']).toBe('Anna Berg');
    });

    it('uses user.id as name when first+last name is empty', () => {
      nuxeoApiSpy.getGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(
        of(makeGroupUsersResponse([{ id: 'u-no-name', properties: {} }]) as unknown as UserSearchResponse)
      );
      paramMapSubject.next(convertToParamMap({ groupId: 'no-name-test' }));
      expect(component.usersRows()[0]['name']).toBe('u-no-name');
    });

    it('handles getGroupUsers error by using empty entries', () => {
      nuxeoApiSpy.getGroup.and.returnValue(of(makeGroup()));
      nuxeoApiSpy.getGroupUsers.and.returnValue(throwError(() => new Error('fail')));
      expect(() => paramMapSubject.next(convertToParamMap({ groupId: 'err-users' }))).not.toThrow();
    });

    it('uses rows.length as usersTotal when resultsCount is not in result', () => {
      nuxeoApiSpy.getGroup.and.returnValue(of(makeGroup()));
      const responseWithoutCount = {
        'entity-type': 'users',
        entries: [{ id: 'u1', properties: { firstName: 'X', lastName: 'Y' } }],
      };
      nuxeoApiSpy.getGroupUsers.and.returnValue(of(responseWithoutCount as unknown as UserSearchResponse));
      paramMapSubject.next(convertToParamMap({ groupId: 'count-test' }));
      expect(component.usersTotal()).toBe(1);
    });
  });

  describe('openAddMembers - with existing members', () => {
    it('pre-populates memberOptions from current usersRows', () => {
      component.usersRows.set([
        { id: 'u1', name: 'User1', identifier: 'u1' },
        { id: 'u2', name: 'User2', identifier: 'u2' },
      ]);
      component.openAddMembers();

      const defaults = component.addMembersFormConfig()[0].defaultValue as Option[];
      expect(defaults.length).toBe(2);
      expect(defaults[0].id).toBe('u1');
    });

    it('ignores usersRows entries without a string identifier', () => {
      component.usersRows.set([
        { id: 'u1', identifier: 123 },
        { id: 'u2', identifier: 'valid-id' },
      ]);
      component.openAddMembers();
      const defaults = component.addMembersFormConfig()[0].defaultValue as Option[];
      expect(defaults.length).toBe(1);
      expect(defaults[0].id).toBe('valid-id');
    });
  });

  describe('openEditGroup - label fallback', () => {
    it('uses properties.grouplabel when grouplabel is missing', () => {
      component.group.set(
        makeGroup({
          grouplabel: undefined,
          properties: { grouplabel: 'Props Label' },
        })
      );
      component.openEditGroup();
      const defaultVal = component.editGroupFormConfig()[0].defaultValue;
      expect(defaultVal).toBe('Props Label');
    });

    it('falls back to groupname when grouplabel and properties.grouplabel are absent', () => {
      component.group.set(
        makeGroup({
          grouplabel: undefined,
          properties: {},
          groupname: 'gname-fallback',
        })
      );
      component.openEditGroup();
      const defaultVal = component.editGroupFormConfig()[0].defaultValue;
      expect(defaultVal).toBe('gname-fallback');
    });

    it('falls back to groupId when all group fields absent', () => {
      component.group.set(
        makeGroup({
          grouplabel: undefined,
          properties: {},
          groupname: undefined,
        })
      );
      component.groupId.set('gid-fallback');
      component.openEditGroup();
      const defaultVal = component.editGroupFormConfig()[0].defaultValue;
      expect(defaultVal).toBe('gid-fallback');
    });
  });

  describe('closeAddMembers - resets form config', () => {
    it('resets addMembersFormConfig to empty defaults', () => {
      component.isAddMembersOpen.set(true);
      component.closeAddMembers();
      const config = component.addMembersFormConfig();
      const defaultVal = config[0].defaultValue;
      expect(Array.isArray(defaultVal)).toBeTrue();
      expect((defaultVal as Option[]).length).toBe(0);
    });
  });

  describe('groupLabel - properties.grouplabel fallback', () => {
    it('uses properties.grouplabel when grouplabel field is absent', () => {
      component.group.set(
        makeGroup({
          grouplabel: undefined,
          properties: { grouplabel: 'Props Group Label' },
        })
      );
      expect(component.groupLabel()).toBe('Props Group Label');
    });

    it('uses group.id when all label/name fields are absent', () => {
      component.group.set(
        makeGroup({
          grouplabel: undefined,
          groupname: undefined,
          properties: {},
          id: 'id-only',
        })
      );
      expect(component.groupLabel()).toBe('id-only');
    });
  });
});
