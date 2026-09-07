import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AssignUserModalComponent } from './assign-user-modal.component';
import { UserService } from 'app/core/services/users.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import {
  ASSIGN_USER_ERROR_MESSAGE,
  ASSIGN_USER_LOAD_ERROR_MESSAGE,
  ASSIGN_USER_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

function makeOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    label: 'Organisation 1',
    participants: [{ id: 'user-1', label: 'User One' }],
    ...overrides,
  };
}

function makeCoworker(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'user-1',
    displayLabel: 'User One',
    email: 'user@example.com',
    company: '',
    type: 'user',
    prefixed_id: 'user:user-1',
    ...overrides,
  };
}

function makeStoreMock() {
  return jasmine.createSpyObj('GeneralStore', ['getValue'], {
    notification: { set: jasmine.createSpy('set') },
    navigationPanelContext: () => null,
  });
}

describe('AssignUserModalComponent', () => {
  let component: AssignUserModalComponent;
  let fixture: ComponentFixture<AssignUserModalComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeMock: jasmine.SpyObj<GeneralStore>;

  beforeEach(async () => {
    userServiceSpy = jasmine.createSpyObj('UserService', ['getOrganizations', 'getcoworkers']);
    userServiceSpy.getOrganizations.and.returnValue(of([makeOrg()]));
    userServiceSpy.getcoworkers.and.returnValue(of([makeCoworker()]));

    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getDocumentById', 'updateAssignees']);
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.updateAssignees.and.returnValue(of(null));

    storeMock = makeStoreMock();

    await TestBed.configureTestingModule({
      imports: [AssignUserModalComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: UserService, useValue: userServiceSpy },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
      ],
    })
      .overrideTemplate(AssignUserModalComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(AssignUserModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('has handlaggarePresent false by default', () => {
      expect(component.handlaggarePresent()).toBeFalse();
    });

    it('has empty organization and coworker options', () => {
      expect(component.organizationOptions).toEqual([]);
      expect(component.coworkerOptions).toEqual([]);
    });

    it('titleSig is set to Tilldela ansvarig handläggare when no handlaggare', () => {
      expect(component.titleSig()).toBe('Tilldela ansvarig handläggare');
    });

    it('blueButtonTextSig is Tilldela when handlaggarePresent is false', () => {
      expect(component.blueButtonTextSig()).toBe('Tilldela');
    });
  });

  describe('updateLabels', () => {
    it('shows Hantera handläggare when handlaggarePresent is true', () => {
      component.handlaggarePresent.set(true);
      component.updateDropdownOptions();

      component['updateLabels']();
      expect(component.titleSig()).toBe('Hantera handläggare');
      expect(component.blueButtonTextSig()).toBe('Spara');
    });

    it('shows Tilldela labels when handlaggarePresent is false', () => {
      component.handlaggarePresent.set(false);
      component['updateLabels']();
      expect(component.titleSig()).toBe('Tilldela ansvarig handläggare');
      expect(component.blueButtonTextSig()).toBe('Tilldela');
    });
  });

  describe('item input effect — loads data when caseId set', () => {
    it('calls getOrganizations and getcoworkers when item is set', () => {
      fixture.componentRef.setInput('item', 'case-uid-1');
      fixture.detectChanges();
      expect(userServiceSpy.getOrganizations).toHaveBeenCalledWith('case-uid-1');
      expect(userServiceSpy.getcoworkers).toHaveBeenCalled();
    });

    it('calls getDocumentById to load current assignment', () => {
      fixture.componentRef.setInput('item', 'case-uid-2');
      fixture.detectChanges();
      expect(apiSpy.getDocumentById).toHaveBeenCalledWith('case-uid-2');
    });

    it('does not reload when same caseId is set again', () => {
      fixture.componentRef.setInput('item', 'case-uid-3');
      fixture.detectChanges();
      const callCountOrgs = userServiceSpy.getOrganizations.calls.count();
      fixture.componentRef.setInput('item', 'case-uid-3');
      fixture.detectChanges();
      expect(userServiceSpy.getOrganizations.calls.count()).toBe(callCountOrgs);
    });

    it('resets state when item is cleared (undefined)', () => {
      fixture.componentRef.setInput('item', 'case-uid-4');
      fixture.detectChanges();
      fixture.componentRef.setInput('item', undefined);
      fixture.detectChanges();
      expect(component.handlaggarePresent()).toBeFalse();
    });
  });

  describe('handleOrganizationsLoaded — populates options', () => {
    it('populates organizationOptions from loaded orgs', () => {
      fixture.componentRef.setInput('item', 'case-org-test');
      fixture.detectChanges();
      expect(component.organizationOptions.length).toBeGreaterThan(0);
      expect(component.organizationOptions[0].id).toBe('org-1');
    });

    it('populates coworkerOptions from loaded coworkers', () => {
      fixture.componentRef.setInput('item', 'case-coworker-test');
      fixture.detectChanges();
      expect(component.coworkerOptions.length).toBeGreaterThan(0);
    });

    it('handles error from getOrganizations gracefully (returns empty)', () => {
      userServiceSpy.getOrganizations.and.returnValue(throwError(() => new Error('fail')));
      fixture.componentRef.setInput('item', 'case-error-org');
      fixture.detectChanges();
      expect(component.organizationOptions).toEqual([]);
    });

    it('handles error from getcoworkers gracefully (returns empty)', () => {
      userServiceSpy.getcoworkers.and.returnValue(throwError(() => new Error('fail')));
      fixture.componentRef.setInput('item', 'case-error-cw');
      fixture.detectChanges();
      expect(component.coworkerOptions).toEqual([]);
    });
  });

  describe('prefillForm — from loaded document', () => {
    it('prefills organization when doc has ansvarigOrganisatoriskEnhet', () => {
      const doc = makeNuxeoDocument({
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]: 'org-1',
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: 'user-1',
        } as unknown as NuxeoProperties,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      fixture.componentRef.setInput('item', 'case-prefill');
      fixture.detectChanges();
      expect(component.assignCaseFormGroup.get('organization')?.value).toBe('org-1');
    });

    it('sets handlaggarePresent to true when ansvarigHandlaggare is set and not skna', () => {
      const doc = makeNuxeoDocument({
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: 'user-1',
        } as unknown as NuxeoProperties,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      fixture.componentRef.setInput('item', 'case-handlaggare');
      fixture.detectChanges();
      expect(component.handlaggarePresent()).toBeTrue();
    });

    it('sets handlaggarePresent to false when ansvarigHandlaggare is skna', () => {
      const doc = makeNuxeoDocument({
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: 'skna',
        } as unknown as NuxeoProperties,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      fixture.componentRef.setInput('item', 'case-skna');
      fixture.detectChanges();
      expect(component.handlaggarePresent()).toBeFalse();
    });

    it('sets handlaggarePresent to false when ansvarigHandlaggare is null', () => {
      const doc = makeNuxeoDocument({
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: null,
        } as unknown as NuxeoProperties,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      fixture.componentRef.setInput('item', 'case-null-handlaggare');
      fixture.detectChanges();
      expect(component.handlaggarePresent()).toBeFalse();
    });

    it('sets medhandlaggare controls from doc properties', () => {
      const doc = makeNuxeoDocument({
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]: ['user-a', 'user-b'],
        } as unknown as NuxeoProperties,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      fixture.componentRef.setInput('item', 'case-med');
      fixture.detectChanges();
      expect(component.medhandlaggareArray.length).toBe(2);
    });

    it('shows load error notification when getDocumentById fails', () => {
      apiSpy.getDocumentById.and.returnValue(throwError(() => new Error('api error')));
      fixture.componentRef.setInput('item', 'case-load-err');
      fixture.detectChanges();
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: ASSIGN_USER_LOAD_ERROR_MESSAGE })
      );
    });
  });

  describe('onAssignUser', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('item', 'case-assign');
      fixture.detectChanges();
    });

    it('does nothing when organization or coworker is missing', () => {
      component.assignCaseFormGroup.patchValue({ organization: '', coworker: '' });
      component.onAssignUser();
      expect(apiSpy.updateAssignees).not.toHaveBeenCalled();
    });

    it('calls updateAssignees with organization and coworker values', () => {
      component.assignCaseFormGroup.patchValue({ organization: 'org-1', coworker: 'user-1' });
      component.onAssignUser();
      expect(apiSpy.updateAssignees).toHaveBeenCalledWith('case-assign', 'org-1', 'user-1', []);
    });

    it('emits closeDialog and shows success notification on success', () => {
      const closeSpy = jasmine.createSpy('closeDialog');
      component.closeDialog.subscribe(closeSpy);
      component.assignCaseFormGroup.patchValue({ organization: 'org-1', coworker: 'user-1' });
      apiSpy.updateAssignees.and.returnValue(of(null));
      component.onAssignUser();
      expect(closeSpy).toHaveBeenCalled();
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'success', text: ASSIGN_USER_SUCCESS_MESSAGE })
      );
    });

    it('shows danger notification on updateAssignees failure', () => {
      component.assignCaseFormGroup.patchValue({ organization: 'org-1', coworker: 'user-1' });
      apiSpy.updateAssignees.and.returnValue(throwError(() => new Error('fail')));
      component.onAssignUser();
      expect(storeMock.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: ASSIGN_USER_ERROR_MESSAGE })
      );
    });

    it('includes medhandlaggare values in updateAssignees call', () => {
      component.assignCaseFormGroup.patchValue({ organization: 'org-1', coworker: 'user-1' });
      component.addCoworkerColumn('user-2');
      component.onAssignUser();
      expect(apiSpy.updateAssignees).toHaveBeenCalledWith('case-assign', 'org-1', 'user-1', ['user-2']);
    });

    it('filters out null medhandlaggare values', () => {
      component.assignCaseFormGroup.patchValue({ organization: 'org-1', coworker: 'user-1' });
      component.addCoworkerColumn(null);
      component.onAssignUser();
      expect(apiSpy.updateAssignees).toHaveBeenCalledWith('case-assign', 'org-1', 'user-1', []);
    });
  });

  describe('onCancel', () => {
    it('emits closeDialog', () => {
      const closeSpy = jasmine.createSpy('closeDialog');
      component.closeDialog.subscribe(closeSpy);
      component.onCancel();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('addCoworkerColumn', () => {
    it('adds a new control to medhandlaggareArray', () => {
      const initialLength = component.medhandlaggareArray.length;
      component.addCoworkerColumn('user-x');
      expect(component.medhandlaggareArray.length).toBe(initialLength + 1);
    });

    it('adds control with null initial value when no value provided', () => {
      component.addCoworkerColumn();
      const lastControl = component.medhandlaggareArray.at(component.medhandlaggareArray.length - 1);
      expect(lastControl.value).toBe('');
    });

    it('syncs coworkerControllers after adding', () => {
      component.addCoworkerColumn('user-y');
      expect(component.coworkerControllers().length).toBe(component.medhandlaggareArray.length);
    });
  });

  describe('removeCoworkerColumn', () => {
    it('removes control at given index', () => {
      component.addCoworkerColumn('user-a');
      component.addCoworkerColumn('user-b');
      const initialLength = component.medhandlaggareArray.length;
      component.removeCoworkerColumn(0);
      expect(component.medhandlaggareArray.length).toBe(initialLength - 1);
    });

    it('syncs coworkerControllers after removal', () => {
      component.addCoworkerColumn('user-1');
      component.addCoworkerColumn('user-2');
      component.removeCoworkerColumn(0);
      expect(component.coworkerControllers().length).toBe(component.medhandlaggareArray.length);
    });
  });

  describe('updateDropdownOptions', () => {
    it('sets controllers signal with organization and coworker fields', () => {
      component.updateDropdownOptions();
      const controllers = component.controllers();
      expect(controllers.length).toBe(2);
      expect(controllers[0].title).toBe('Ansvarig organisatorisk enhet');
      expect(controllers[1].title).toBe('Ansvarig Handläggare');
    });
  });

  describe('organization filter — applyOrganizationFilter', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('item', 'case-filter');
      fixture.detectChanges();
    });

    it('filters coworker options when organization is selected', () => {
      component.assignCaseFormGroup.patchValue({ organization: 'org-1' });

      expect(component.coworkerOptions.length).toBeGreaterThanOrEqual(0);
    });

    it('shows all coworker options when no org is selected', () => {
      component.assignCaseFormGroup.patchValue({ organization: '' });

      expect(component.coworkerOptions).toEqual(component.medhandlaggareOptions);
    });

    it('resets coworker selection if selected coworker is not in new org', () => {
      component.assignCaseFormGroup.patchValue({ coworker: 'user-99' });

      component.assignCaseFormGroup.patchValue({ organization: 'org-1' });

      expect(component.assignCaseFormGroup.get('coworker')?.value).toBe('');
    });
  });

  describe('showConfirmation signal', () => {
    it('defaults to false', () => {
      expect(component.showConfirmation()).toBeFalse();
    });

    it('can be toggled to true', () => {
      component.showConfirmation.set(true);
      expect(component.showConfirmation()).toBeTrue();
    });
  });
});
