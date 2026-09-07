import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { ParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserDetailComponent } from './user-detail.component';
import { NxUser } from '@app/shared/api/nuxeo-api.types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeSpy: { notification: { set: jasmine.Spy }; navigationPanelContext: () => null; getValue: jasmine.Spy };
  let router: Router;
  let paramMapSubject: Subject<ParamMap>;

  const makeUser = (overrides: Record<string, unknown> = {}) => ({
    'entity-type': 'user' as const,
    id: 'testuser',
    properties: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      company: 'Acme',
      ...((overrides['properties'] as Record<string, unknown>) ?? {}),
    },
    extendedGroups: [],
    ...overrides,
  });

  beforeEach(async () => {
    paramMapSubject = new Subject<ParamMap>();

    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getUser',
      'deleteUser',
      'updateUser',
      'getUserGroupSuggestions',
      'addUserToGroup',
      'removeUserFromGroup',
    ]);

    storeSpy = {
      notification: { set: jasmine.createSpy('set') },
      navigationPanelContext: () => null,
      getValue: jasmine.createSpy('getValue').and.returnValue(''),
    };

    nuxeoApiSpy.getUser.and.returnValue(of(makeUser() as unknown as NxUser));
    nuxeoApiSpy.deleteUser.and.returnValue(of(void 0));
    nuxeoApiSpy.updateUser.and.returnValue(of(makeUser() as unknown as NxUser));
    nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));
    nuxeoApiSpy.addUserToGroup.and.returnValue(of(void 0));
    nuxeoApiSpy.removeUserFromGroup.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
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
      .overrideTemplate(UserDetailComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('displayName computed', () => {
    it('returns first + last name from user properties', () => {
      component.user.set(makeUser() as unknown as NxUser);
      expect(component.displayName()).toBe('John Doe');
    });

    it('falls back to userId when user has no name properties', () => {
      component.user.set({ 'entity-type': 'user', id: 'fallbackId', properties: {} } as unknown as NxUser);
      component.userId.set('fallbackId');
      expect(component.displayName()).toBe('fallbackId');
    });

    it('falls back to "User" when user and userId are both empty', () => {
      component.user.set(null);
      component.userId.set('');
      expect(component.displayName()).toBe('User');
    });
  });

  describe('openChangePassword / closeChangePassword', () => {
    it('openChangePassword sets isChangePasswordOpen to true', () => {
      component.isChangePasswordOpen.set(false);
      component.openChangePassword();
      expect(component.isChangePasswordOpen()).toBe(true);
    });

    it('closeChangePassword sets isChangePasswordOpen to false', () => {
      component.isChangePasswordOpen.set(true);
      component.closeChangePassword();
      expect(component.isChangePasswordOpen()).toBe(false);
    });
  });

  describe('openEditUser / closeEditUser', () => {
    it('openEditUser sets isEditUserOpen to true', () => {
      component.isEditUserOpen.set(false);
      component.user.set(makeUser() as unknown as NxUser);
      component.openEditUser();
      expect(component.isEditUserOpen()).toBe(true);
    });

    it('closeEditUser sets isEditUserOpen to false', () => {
      component.isEditUserOpen.set(true);
      component.closeEditUser();
      expect(component.isEditUserOpen()).toBe(false);
    });
  });

  describe('openAddToGroup / closeAddToGroup', () => {
    it('openAddToGroup sets isAddToGroupOpen to true', () => {
      component.isAddToGroupOpen.set(false);
      component.openAddToGroup();
      expect(component.isAddToGroupOpen()).toBe(true);
    });

    it('closeAddToGroup sets isAddToGroupOpen to false', () => {
      component.isAddToGroupOpen.set(true);
      component.closeAddToGroup();
      expect(component.isAddToGroupOpen()).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('calls deleteUser API and navigates on success', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      nuxeoApiSpy.deleteUser.and.returnValue(of(void 0));
      component.userId.set('testuser');

      component.deleteUser();

      expect(nuxeoApiSpy.deleteUser).toHaveBeenCalledWith('testuser');
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
      expect(navSpy).toHaveBeenCalledWith(['/admin/anvandare-grupper']);
    });

    it('shows error notification on deleteUser failure', () => {
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      nuxeoApiSpy.deleteUser.and.returnValue(throwError(() => new Error('fail')));
      component.userId.set('testuser');

      component.deleteUser();

      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('does nothing when userId is empty', () => {
      component.userId.set('');
      component.deleteUser();
      expect(nuxeoApiSpy.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('handleChangePassword', () => {
    beforeEach(() => {
      component.user.set(makeUser() as unknown as NxUser);
    });

    it('does not call API when passwords do not match', () => {
      nuxeoApiSpy.updateUser.calls.reset();
      component.handleChangePassword({ password: 'abc', passwordVerify: 'xyz' });
      expect(nuxeoApiSpy.updateUser).not.toHaveBeenCalled();
    });

    it('does not call API when password is empty', () => {
      nuxeoApiSpy.updateUser.calls.reset();
      component.handleChangePassword({ password: '', passwordVerify: '' });
      expect(nuxeoApiSpy.updateUser).not.toHaveBeenCalled();
    });

    it('calls updateUser when passwords match', () => {
      nuxeoApiSpy.updateUser.and.returnValue(of(makeUser() as unknown as NxUser));
      component.handleChangePassword({ password: 'secret123', passwordVerify: 'secret123' });
      expect(nuxeoApiSpy.updateUser).toHaveBeenCalled();
    });

    it('shows success notification on password update success', () => {
      nuxeoApiSpy.updateUser.and.returnValue(of(makeUser() as unknown as NxUser));
      component.handleChangePassword({ password: 'secret123', passwordVerify: 'secret123' });
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
    });

    it('does nothing when user is null', () => {
      component.user.set(null);
      nuxeoApiSpy.updateUser.calls.reset();
      component.handleChangePassword({ password: 'secret123', passwordVerify: 'secret123' });
      expect(nuxeoApiSpy.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('route paramMap triggers user load', () => {
    it('loads user when paramMap emits a userId', () => {
      nuxeoApiSpy.getUser.calls.reset();
      paramMapSubject.next(convertToParamMap({ userId: 'user42' }));
      expect(nuxeoApiSpy.getUser).toHaveBeenCalledWith('user42');
    });

    it('does not load user when userId is missing from paramMap', () => {
      nuxeoApiSpy.getUser.calls.reset();
      paramMapSubject.next(convertToParamMap({}));
      expect(nuxeoApiSpy.getUser).not.toHaveBeenCalled();
    });
  });

  describe('email computed', () => {
    it('returns email from user properties', () => {
      component.user.set(makeUser() as unknown as NxUser);
      expect(component.email()).toBe('john@example.com');
    });

    it('returns — when user is null', () => {
      component.user.set(null);
      expect(component.email()).toBe('—');
    });

    it('returns — when email is empty', () => {
      component.user.set({ 'entity-type': 'user', id: 'x', properties: {} } as unknown as NxUser);
      expect(component.email()).toBe('—');
    });
  });

  describe('company computed', () => {
    it('returns company from user properties', () => {
      component.user.set(makeUser() as unknown as NxUser);
      expect(component.company()).toBe('Acme');
    });

    it('returns — when user is null', () => {
      component.user.set(null);
      expect(component.company()).toBe('—');
    });
  });

  describe('openRemoveGroup / closeRemoveGroup', () => {
    it('openRemoveGroup sets pendingRemoveGroupId and isRemoveGroupOpen', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      component.openRemoveGroup('group-123', event);
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.pendingRemoveGroupId()).toBe('group-123');
      expect(component.isRemoveGroupOpen()).toBeTrue();
    });

    it('does nothing if groupId is empty', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      component.openRemoveGroup('', event);
      expect(component.isRemoveGroupOpen()).toBeFalse();
    });

    it('closeRemoveGroup resets state', () => {
      const event = new MouseEvent('click');
      component.openRemoveGroup('group-123', event);
      component.closeRemoveGroup();
      expect(component.isRemoveGroupOpen()).toBeFalse();
      expect(component.pendingRemoveGroupId()).toBeNull();
    });
  });

  describe('confirmRemoveGroup', () => {
    it('does nothing when pendingRemoveGroupId is null', () => {
      component.pendingRemoveGroupId.set(null);
      component.confirmRemoveGroup();
      expect(nuxeoApiSpy.removeUserFromGroup).not.toHaveBeenCalled();
    });

    it('calls removeUserFromGroup and shows success notification', () => {
      component.userId.set('testuser');
      component.pendingRemoveGroupId.set('group-abc');
      nuxeoApiSpy.removeUserFromGroup.and.returnValue(of(void 0));
      nuxeoApiSpy.getUser.and.returnValue(of(makeUser() as unknown as NxUser));

      component.confirmRemoveGroup();

      expect(nuxeoApiSpy.removeUserFromGroup).toHaveBeenCalledWith('testuser', 'group-abc');
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
    });

    it('shows error notification when removeUserFromGroup fails', () => {
      component.userId.set('testuser');
      component.pendingRemoveGroupId.set('group-abc');
      nuxeoApiSpy.removeUserFromGroup.and.returnValue(throwError(() => new Error('fail')));

      component.confirmRemoveGroup();

      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });
  });

  describe('handleAddToGroup', () => {
    it('does nothing when no groups selected', () => {
      component.handleAddToGroup({ groups: [] });
      expect(nuxeoApiSpy.addUserToGroup).not.toHaveBeenCalled();
    });

    it('calls addUserToGroup for each selected group and shows success', () => {
      component.userId.set('testuser');
      nuxeoApiSpy.addUserToGroup.and.returnValue(of(void 0));
      nuxeoApiSpy.getUser.and.returnValue(of(makeUser() as unknown as NxUser));

      component.handleAddToGroup({ groups: [{ id: 'group:g1', label: 'G1', value: 'group:g1' }] });

      expect(nuxeoApiSpy.addUserToGroup).toHaveBeenCalledWith('testuser', 'g1');
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
    });

    it('shows error notification when addUserToGroup fails', () => {
      component.userId.set('testuser');
      nuxeoApiSpy.addUserToGroup.and.returnValue(throwError(() => new Error('fail')));

      component.handleAddToGroup({ groups: [{ id: 'group:g1', label: 'G1', value: 'group:g1' }] });

      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });
  });

  describe('handleAddToGroupDropdownChanged', () => {
    it('ignores events for other field names', () => {
      nuxeoApiSpy.getUserGroupSuggestions.calls.reset();
      component.handleAddToGroupDropdownChanged({ fieldName: 'other', value: 'search' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).not.toHaveBeenCalled();
    });

    it('calls loadGroupOptions with the search term for groups field', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));
      component.handleAddToGroupDropdownChanged({ fieldName: 'groups', value: 'search-term' });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('search-term', 'GROUP_TYPE');
    });

    it('uses empty string when value is falsy', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));
      component.handleAddToGroupDropdownChanged({ fieldName: 'groups', value: null });
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('', 'GROUP_TYPE');
    });
  });

  describe('submitAddToGroup', () => {
    it('calls form.submit()', () => {
      const formSpy = jasmine.createSpyObj('GeneralFormComponent', ['submit']);
      component.submitAddToGroup(formSpy);
      expect(formSpy.submit).toHaveBeenCalled();
    });
  });

  describe('submitChangePassword', () => {
    it('calls form.submit() when form is provided', () => {
      const formSpy = jasmine.createSpyObj('GeneralFormComponent', ['submit']);
      component.submitChangePassword(formSpy);
      expect(formSpy.submit).toHaveBeenCalled();
    });

    it('does nothing when form is null', () => {
      expect(() => component.submitChangePassword(null)).not.toThrow();
    });
  });

  describe('submitEditUser', () => {
    it('calls form.submit() when form is provided', () => {
      const formSpy = jasmine.createSpyObj('GeneralFormComponent', ['submit']);
      component.submitEditUser(formSpy);
      expect(formSpy.submit).toHaveBeenCalled();
    });

    it('does nothing when form is null', () => {
      expect(() => component.submitEditUser(null)).not.toThrow();
    });
  });

  describe('handleEditUser', () => {
    it('does nothing when user is null', () => {
      component.user.set(null);
      component.handleEditUser({ email: 'test@test.com' });
      expect(nuxeoApiSpy.updateUser).not.toHaveBeenCalled();
    });

    it('does nothing when email is empty', () => {
      component.user.set(makeUser() as unknown as NxUser);
      component.handleEditUser({ email: '' });
      expect(nuxeoApiSpy.updateUser).not.toHaveBeenCalled();
    });

    it('calls updateUser with updated properties on success', () => {
      component.user.set(makeUser() as unknown as NxUser);
      nuxeoApiSpy.updateUser.and.returnValue(of(makeUser() as unknown as NxUser));

      component.handleEditUser({
        email: 'new@email.com',
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'NewCo',
      });

      expect(nuxeoApiSpy.updateUser).toHaveBeenCalled();
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'success' })
      );
    });

    it('shows error notification when updateUser fails', () => {
      component.user.set(makeUser() as unknown as NxUser);
      nuxeoApiSpy.updateUser.and.returnValue(throwError(() => new Error('fail')));

      component.handleEditUser({ email: 'new@email.com' });

      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('closes edit dialog after success', () => {
      component.user.set(makeUser() as unknown as NxUser);
      component.isEditUserOpen.set(true);
      nuxeoApiSpy.updateUser.and.returnValue(of(makeUser() as unknown as NxUser));

      component.handleEditUser({ email: 'new@email.com' });

      expect(component.isEditUserOpen()).toBeFalse();
    });
  });

  describe('handleChangePassword error path', () => {
    it('shows error notification when updateUser fails', () => {
      component.user.set(makeUser() as unknown as NxUser);
      nuxeoApiSpy.updateUser.and.returnValue(throwError(() => new Error('fail')));
      storeSpy.notification.set.calls.reset();

      component.handleChangePassword({ password: 'secret123', passwordVerify: 'secret123' });

      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ show: true, variation: 'danger' })
      );
    });

    it('closes dialog after password update success', () => {
      component.user.set(makeUser() as unknown as NxUser);
      component.isChangePasswordOpen.set(true);
      nuxeoApiSpy.updateUser.and.returnValue(of(makeUser() as unknown as NxUser));

      component.handleChangePassword({ password: 'secret123', passwordVerify: 'secret123' });

      expect(component.isChangePasswordOpen()).toBeFalse();
    });
  });

  describe('loadUser with null result', () => {
    it('sets null user and empty groups when getUser returns null', () => {
      nuxeoApiSpy.getUser.and.returnValue(of(null as unknown as NxUser));
      paramMapSubject.next(convertToParamMap({ userId: 'unknown-user' }));
      expect(component.user()).toBeNull();
      expect(component.groupsRows()).toEqual([]);
    });
  });

  describe('loadUser with extendedGroups', () => {
    it('maps extendedGroups to rows when present', () => {
      const userWithGroups = makeUser({
        extendedGroups: [{ name: 'admins', label: 'Administrators', url: '/groups/admins' }],
      }) as unknown as NxUser;
      nuxeoApiSpy.getUser.and.returnValue(of(userWithGroups));
      paramMapSubject.next(convertToParamMap({ userId: 'testuser' }));
      expect(component.groupsRows().length).toBe(1);
      expect(component.groupsRows()[0]['identifier']).toBe('admins');
    });

    it('maps groups strings to rows when extendedGroups is empty', () => {
      const userWithGroups = makeUser({
        extendedGroups: [],
        properties: { groups: ['group-a', 'group-b'] },
      }) as unknown as NxUser;
      nuxeoApiSpy.getUser.and.returnValue(of(userWithGroups));
      paramMapSubject.next(convertToParamMap({ userId: 'testuser' }));
      expect(component.groupsRows().length).toBe(2);
    });
  });

  describe('loadUser error path', () => {
    it('sets null user on getUser error', () => {
      nuxeoApiSpy.getUser.and.returnValue(throwError(() => new Error('network error')));
      paramMapSubject.next(convertToParamMap({ userId: 'testuser' }));
      expect(component.user()).toBeNull();
    });
  });

  describe('openAddToGroup loads group options', () => {
    it('calls getUserGroupSuggestions when opening add to group', () => {
      nuxeoApiSpy.getUserGroupSuggestions.and.returnValue(of([]));
      component.openAddToGroup();
      expect(nuxeoApiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('', 'GROUP_TYPE');
    });
  });
});
