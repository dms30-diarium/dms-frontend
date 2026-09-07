import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, computed, Signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';

import { UtkastPageComponent } from './utkast-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuthService } from '@app/core/services/auth.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { LockService } from '@app/core/services/lock-service.service';
import { NotificationService } from '@app/core/services/notification-service.service';
import { ShareLinkService } from '@app/core/services/share-link.service';
import { SecretStampService } from '@app/shared/services/secret-stamp.service';
import { PrintService } from '@app/core/services/print.service';
import { SelectedFilesToolbarService } from '@app/core/services/selected-files-toolbar.service';
import { DraggableSectionOrderService } from '@app/core/services/draggable-section-order.service';
import { AccordionStateService } from '@app/core/services/accordion-state.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeWorkflowInfo, makeNxUser, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NuxeoFileDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import type { Option } from '@app/shared/commonTypes';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { BUTTON_PRESETS } from '@app/shared/components/button-menu.component/button-presets';
import { CollectionCardItem } from '@app/shared/components/collection-card/collection-card.component';
import { NotificationType } from '@app/shared/components/notification/notification.component';

function makeAuthMock() {
  return {
    loaded: signal(false),
    loadError: signal(null),
    username: signal<string | null>('user1'),
    activeRole: signal<string | null>('HANDLAGGARE'),
    adminViewEnabled: signal(false),
    isAdmin: computed(() => false),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    loadMe: jasmine.createSpy('loadMe'),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
}

function makeStoreMock() {
  return {
    openPage: signal<string | null>(null),
    lastCreatedCase: signal<unknown>(null),
    notification: signal<NotificationType>({ show: false }),
    baseButtons: signal<unknown[]>([]),
    navigationPanelContext: signal<unknown>(null),
    messagesInfo: signal<unknown>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
    getLabelByType: jasmine.createSpy('getLabelByType').and.returnValue(''),
  };
}

function makeDoc(overrides: Record<string, unknown> = {}) {
  return makeNuxeoDocument({
    uid: 'utkast-1',
    title: 'Test Utkast',
    type: 'Utkast',
    path: '/default-domain/workspaces/case-1/utkast-1',
    parentRef: 'parent-uid-1',
    state: 'project',
    contextParameters: { runningWorkflows: [], pendingTasks: [] },
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Utkast',
      [NUXEO_SCHEMA_FIELDS.notif.notifications]: [],
      ...overrides,
    } as unknown as NuxeoProperties,
  });
}

describe('UtkastPageComponent', () => {
  let component: UtkastPageComponent;
  let fixture: ComponentFixture<UtkastPageComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let favSpy: jasmine.SpyObj<FavoritesService>;
  let lockSpy: jasmine.SpyObj<LockService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;
  let selectedFilesSpy: jasmine.SpyObj<SelectedFilesToolbarService>;
  let draggableSpy: jasmine.SpyObj<DraggableSectionOrderService>;
  let accordionSpy: jasmine.SpyObj<AccordionStateService>;
  let printSpy: jasmine.SpyObj<PrintService>;
  let shareLinkSpy: jasmine.SpyObj<ShareLinkService>;
  let secretStampSpy: jasmine.SpyObj<SecretStampService>;

  beforeEach(async () => {
    authMock = makeAuthMock();
    storeMock = makeStoreMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getHandlingWithFile',
      'getLagrumOptions',
      'getDocumentById',
      'getUtkastDocumentVersions',
      'deleteWorkflow',
      'deleteDocument',
      'restoreDocumentVersion',
      'editWorkflow',
      'getSeveralDocsByUids',
      'getCollections',
      'saveEditDocProperties',
      'getDirectorySuggestions',
      'getUserSuggestions',
      'DMSDocumentSuggestion',
      'toggleFavorites',
      'downloadBulk',
      'editDocument',
      'createHandlingFromUtkast',
      'getCollectionDocuments',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getHandlingWithFile.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.getLagrumOptions.and.returnValue(of([]));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getUtkastDocumentVersions.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.deleteWorkflow.and.returnValue(of([]));
    apiSpy.deleteDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.restoreDocumentVersion.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.editWorkflow.and.returnValue(of(makeWorkflowInfo()));
    apiSpy.getSeveralDocsByUids.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.getCollections.and.returnValue(of([]));
    apiSpy.saveEditDocProperties.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.getUserSuggestions.and.returnValue(of([]));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.downloadBulk.and.returnValue(of(new Blob()));
    apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.createHandlingFromUtkast.and.returnValue(of(makeNuxeoDocument({ uid: 'new-handling-uid' })));
    apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [] })));

    favSpy = jasmine.createSpyObj('FavoritesService', ['checkInFavorites', 'toggleFavorites', 'getFavoritesUid']);
    favSpy.checkInFavorites.and.returnValue(of(false));
    favSpy.toggleFavorites.and.returnValue(of(makeNuxeoDocument()));
    favSpy.getFavoritesUid.and.returnValue(of(makeNuxeoDocument()));

    lockSpy = jasmine.createSpyObj('LockService', ['initLockState', 'toggleAndUpdate']);
    lockSpy.initLockState.and.returnValue(undefined);
    lockSpy.toggleAndUpdate.and.returnValue(of(makeNuxeoDocument()));

    notifSpy = jasmine.createSpyObj('NotificationService', ['isUserSubscribed', 'subscribe', 'unsubscribe']);
    notifSpy.isUserSubscribed.and.returnValue(false);
    notifSpy.subscribe.and.returnValue(of(makeNuxeoDocument()));
    notifSpy.unsubscribe.and.returnValue(of(makeNuxeoDocument()));

    shareLinkSpy = jasmine.createSpyObj('ShareLinkService', ['buildDocLink', 'copyDocumentLink']);
    shareLinkSpy.buildDocLink.and.returnValue('http://test.link');

    secretStampSpy = jasmine.createSpyObj('SecretStampService', ['getSecretStampText']);
    secretStampSpy.getSecretStampText.and.returnValue(null);

    printSpy = jasmine.createSpyObj('PrintService', [
      'getPrintableTarget',
      'printUrl',
      'getPrintableDocuments',
      'printDocuments',
    ]);
    printSpy.getPrintableTarget.and.returnValue(null);

    selectedFilesSpy = jasmine.createSpyObj('SelectedFilesToolbarService', [
      'updateFileSelection',
      'updateAttachmentSelection',
      'clearSelection',
      'downloadSelectedFilesAsZip',
      'printSelectedFiles',
    ]);

    draggableSpy = jasmine.createSpyObj('DraggableSectionOrderService', [
      'loadOrder',
      'saveOrder',
      'visibleSections',
      'reorderSections',
    ]);
    draggableSpy.loadOrder.and.returnValue(['eventLog', 'files']);
    draggableSpy.visibleSections.and.returnValue(['eventLog', 'files']);
    draggableSpy.reorderSections.and.returnValue(['files', 'eventLog']);

    accordionSpy = jasmine.createSpyObj('AccordionStateService', ['loadState', 'saveState']);
    accordionSpy.loadState.and.returnValue({});

    await TestBed.configureTestingModule({
      imports: [UtkastPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: FavoritesService, useValue: favSpy },
        { provide: LockService, useValue: lockSpy },
        { provide: NotificationService, useValue: notifSpy },
        { provide: ShareLinkService, useValue: shareLinkSpy },
        { provide: SecretStampService, useValue: secretStampSpy },
        { provide: PrintService, useValue: printSpy },
        { provide: SelectedFilesToolbarService, useValue: selectedFilesSpy },
        { provide: DraggableSectionOrderService, useValue: draggableSpy },
        { provide: AccordionStateService, useValue: accordionSpy },
      ],
    })
      .overrideTemplate(UtkastPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(UtkastPageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('document', makeDoc());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onToggleButtonChange', () => {
    it('sets viewMode to edit when button 1 is active', () => {
      component.onToggleButtonChange(1);
      expect(component.viewMode()).toBe('edit');
    });

    it('sets viewMode to doc when button 0 is active', () => {
      component.onToggleButtonChange(0);
      expect(component.viewMode()).toBe('doc');
    });
  });

  describe('clearSelectedFiles', () => {
    it('calls selectedFilesToolbarService.clearSelection', () => {
      component.clearSelectedFiles();
      expect(selectedFilesSpy.clearSelection).toHaveBeenCalledWith(component.selectedFileIds);
    });
  });

  describe('onFileSelectionChange', () => {
    it('calls selectedFilesToolbarService.updateFileSelection', () => {
      const event = { file: makeNuxeoDocument(), selected: true };
      component.onFileSelectionChange(event);
      expect(selectedFilesSpy.updateFileSelection).toHaveBeenCalledWith(component.selectedFileIds, event);
    });
  });

  describe('onAttachmentSelectionChange', () => {
    it('calls selectedFilesToolbarService.updateAttachmentSelection', () => {
      const event = { files: [], selected: true };
      component.onAttachmentSelectionChange(event);
      expect(selectedFilesSpy.updateAttachmentSelection).toHaveBeenCalledWith(component.selectedFileIds, event);
    });
  });

  describe('downloadSelectedFilesAsZip', () => {
    it('calls selectedFilesToolbarService.downloadSelectedFilesAsZip', () => {
      component.downloadSelectedFilesAsZip();
      expect(selectedFilesSpy.downloadSelectedFilesAsZip).toHaveBeenCalledWith(component.selectedFileIds());
    });
  });

  describe('getUsers', () => {
    it('returns empty string when users is undefined', () => {
      expect(component.getUsers(undefined)).toBe('');
    });

    it('returns formatted names for provided users', () => {
      const users = [makeNxUser({ properties: { firstName: 'Anna', lastName: 'Svensson' } })];
      const result = component.getUsers(users);
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTrue();
    });
  });

  describe('onSectionToggled', () => {
    it('updates accordionState and saves it', () => {
      component.onSectionToggled('files', true);
      expect(component.accordionState()['files']).toBeTrue();
      expect(accordionSpy.saveState).toHaveBeenCalled();
    });

    it('sets section to collapsed', () => {
      component.accordionState.set({ files: true });
      component.onSectionToggled('files', false);
      expect(component.accordionState()['files']).toBeFalse();
    });
  });

  describe('isUserAssignedForWorkflow', () => {
    it('returns false when no workflows assigned to user', () => {
      component.worflowsAssignedToUser.set([]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.isUserAssignedForWorkflow(workflow)).toBeFalse();
    });

    it('returns true when workflow is assigned to user', () => {
      component.worflowsAssignedToUser.set([makeWorkflowInfo({ id: 'wf-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.isUserAssignedForWorkflow(workflow)).toBeTrue();
    });

    it('returns false when worflowsAssignedToUser is null', () => {
      component.worflowsAssignedToUser.set(null);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.isUserAssignedForWorkflow(workflow)).toBeFalse();
    });
  });

  describe('getTaskActions', () => {
    it('returns undefined when no pending tasks', () => {
      component.pendingTasks.set(null);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.getTaskActions(workflow)).toBeUndefined();
    });

    it('returns task actions for matching workflow', () => {
      const actions = [{ name: 'approve', label: 'Godkänn', url: '' }];
      component.pendingTasks.set([
        makeWorkflowInfo({
          workflowInstanceId: 'wf-1',
          id: 'task-1',
          taskInfo: { taskActions: actions },
        }),
      ]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.getTaskActions(workflow)).toEqual(actions);
    });

    it('returns undefined when pending tasks exists but no matching workflow', () => {
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'other-wf', id: 'task-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.getTaskActions(workflow)).toBeUndefined();
    });
  });

  describe('sendForReview', () => {
    it('opens review dialog when no workflows are running', () => {
      component.sendForApprovalWorkflow.set([]);
      component.sendForReviewWorkflow.set([]);
      component.sendForReview();
      expect(component.isSendForReviewDialogOpen()).toBeTrue();
    });

    it('shows warning notification when approval workflow is running', () => {
      component.sendForApprovalWorkflow.set([makeWorkflowInfo({ id: 'wf-1' })]);
      component.sendForReviewWorkflow.set([]);
      component.sendForReview();
      expect(component.isSendForReviewDialogOpen()).toBeFalse();
      expect(storeMock.notification().show).toBeTrue();
    });

    it('shows warning when review workflow is already running', () => {
      component.sendForApprovalWorkflow.set([]);
      component.sendForReviewWorkflow.set([makeWorkflowInfo({ id: 'wf-1' })]);
      component.sendForReview();
      expect(component.isSendForReviewDialogOpen()).toBeFalse();
      expect(storeMock.notification().show).toBeTrue();
    });

    it('shows warning when both workflows are running', () => {
      component.sendForApprovalWorkflow.set([makeWorkflowInfo({ id: 'wf-1' })]);
      component.sendForReviewWorkflow.set([makeWorkflowInfo({ id: 'wf-2' })]);
      component.sendForReview();
      expect(component.isSendForReviewDialogOpen()).toBeFalse();
      expect(storeMock.notification().show).toBeTrue();
    });
  });

  describe('sendForApprove', () => {
    it('opens approval dialog when no workflows are running', () => {
      component.sendForApprovalWorkflow.set([]);
      component.sendForReviewWorkflow.set([]);
      component.sendForApprove();
      expect(component.isSendForApprovalOpened()).toBe('utkast-1');
    });

    it('shows warning when review workflow is running', () => {
      component.sendForApprovalWorkflow.set([]);
      component.sendForReviewWorkflow.set([makeWorkflowInfo({ id: 'wf-1' })]);
      component.sendForApprove();
      expect(component.isSendForApprovalOpened()).toBeNull();
    });

    it('shows warning with approval workflow message when approval workflow is running', () => {
      component.sendForApprovalWorkflow.set([makeWorkflowInfo({ id: 'wf-1' })]);
      component.sendForReviewWorkflow.set([]);
      component.sendForApprove();
      expect(component.isSendForApprovalOpened()).toBeNull();
      expect(storeMock.notification().show).toBeTrue();
    });
  });

  describe('abortWorkflow', () => {
    it('calls deleteWorkflow and emits reloadDocument', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      component.abortWorkflow(makeWorkflowInfo({ id: 'wf-1' }));
      expect(apiSpy.deleteWorkflow).toHaveBeenCalledWith('wf-1');
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('canChangeResponsible computed', () => {
    it('returns false when username is null', () => {
      authMock.username.set(null);
      fixture.detectChanges();
      expect(component.canChangeResponsible()).toBeFalse();
    });

    it('returns true when user is admin', () => {
      (authMock as unknown as { isAdmin: Signal<boolean> }).isAdmin = computed(() => true);
      fixture.detectChanges();
      expect(component.canChangeResponsible()).toBeTrue();
    });

    it('returns true when user is assignee and review decision already taken', () => {
      authMock.username.set('user1');

      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      expect(component.canChangeResponsible()).toBeTrue();
    });

    it('returns false when user is not assignee and review decision taken', () => {
      authMock.username.set('other-user');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      expect(component.canChangeResponsible()).toBeFalse();
    });
  });

  describe('currentUsername computed', () => {
    it('returns auth username', () => {
      authMock.username.set('testuser');
      expect(component.currentUsername()).toBe('testuser');
    });

    it('returns null when no username', () => {
      authMock.username.set(null);
      expect(component.currentUsername()).toBeNull();
    });
  });

  describe('canChangeRequester computed', () => {
    it('returns false when username is null', () => {
      authMock.username.set(null);
      fixture.detectChanges();
      expect(component.canChangeRequester()).toBeFalse();
    });

    it('returns true when user is admin', () => {
      (authMock as unknown as { isAdmin: Signal<boolean> }).isAdmin = computed(() => true);
      fixture.detectChanges();
      expect(component.canChangeRequester()).toBeTrue();
    });

    it('returns false when no requester', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.canChangeRequester()).toBeFalse();
    });
  });

  describe('canRequestApproval computed', () => {
    it('returns true when no assignee set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.canRequestApproval()).toBeTrue();
    });

    it('returns true when user is admin', () => {
      (authMock as unknown as { isAdmin: Signal<boolean> }).isAdmin = computed(() => true);
      fixture.detectChanges();
      expect(component.canRequestApproval()).toBeTrue();
    });

    it('returns true when username matches assignee', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
        })
      );
      fixture.detectChanges();
      expect(component.canRequestApproval()).toBeTrue();
    });

    it('returns false when username does not match assignee', () => {
      authMock.username.set('other-user');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
        })
      );
      fixture.detectChanges();
      expect(component.canRequestApproval()).toBeFalse();
    });
  });

  describe('isApproved computed', () => {
    it('returns false when no approval date', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.isApproved()).toBeFalse();
    });

    it('returns true when approval date is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      expect(component.isApproved()).toBeTrue();
    });
  });

  describe('hasRequestedChanges computed', () => {
    it('returns false when no granskningskommentar', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: '',
        })
      );
      fixture.detectChanges();
      expect(component.hasRequestedChanges()).toBeFalse();
    });

    it('returns true when granskningskommentar is present and not approved', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: 'Please fix this',
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.hasRequestedChanges()).toBeTrue();
    });

    it('returns false when approved even if comment present', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: 'Please fix this',
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      expect(component.hasRequestedChanges()).toBeFalse();
    });
  });

  describe('reviewDecisionTaken computed', () => {
    it('returns false when no review fields are set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.reviewDecisionTaken()).toBeFalse();
    });

    it('returns true when godkannandeDatum is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      expect(component.reviewDecisionTaken()).toBeTrue();
    });

    it('returns true when granskningsdatum is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      expect(component.reviewDecisionTaken()).toBeTrue();
    });
  });

  describe('approvalPending computed', () => {
    it('returns false when no assignee', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.approvalPending()).toBeFalse();
    });

    it('returns true when assignee set and review not taken', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.approvalPending()).toBeTrue();
    });
  });

  describe('currentUserIsReviewer computed', () => {
    it('returns false when no username', () => {
      authMock.username.set(null);
      fixture.detectChanges();
      expect(component.currentUserIsReviewer()).toBeFalse();
    });

    it('returns false when no assignee', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.currentUserIsReviewer()).toBeFalse();
    });

    it('returns true when username matches assignee (case-insensitive)', () => {
      authMock.username.set('User1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
        })
      );
      fixture.detectChanges();
      expect(component.currentUserIsReviewer()).toBeTrue();
    });
  });

  describe('loggedAtionsReviewWorkflow computed', () => {
    it('returns empty array when no arbetsfloden', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: null,
        })
      );
      fixture.detectChanges();
      expect(component.loggedAtionsReviewWorkflow()).toEqual([]);
    });

    it('returns empty array when empty arbetsfloden', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: [],
        })
      );
      fixture.detectChanges();
      expect(component.loggedAtionsReviewWorkflow()).toEqual([]);
    });

    it('returns empty array when review workflow not found', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: [
            {
              arbetsflodesnamn: 'SomethingElse',
              startdatum: '2024-01-01',
              initiativtagare: 'user1',
              uppgifter: [],
              status: 'done',
            },
          ],
        })
      );
      fixture.detectChanges();
      expect(component.loggedAtionsReviewWorkflow()).toEqual([]);
    });

    it('returns review workflow entries when found', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: [
            {
              arbetsflodesnamn: NUXEO_VOCAB_IDS.arbetsflode.skickaForGranskning,
              startdatum: '2024-01-01',
              initiativtagare: 'user1',
              uppgifter: [{ aktorer: ['reviewer1'] }],
              status: 'running',
            },
          ],
        })
      );
      fixture.detectChanges();
      const result = component.loggedAtionsReviewWorkflow();
      expect(result.length).toBe(2);
    });
  });

  describe('loggedAtionsApproveWorkflow computed', () => {
    it('returns empty array when no arbetsfloden', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: null,
        })
      );
      fixture.detectChanges();
      expect(component.loggedAtionsApproveWorkflow()).toEqual([]);
    });

    it('returns empty array when approve workflow not found', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: [
            {
              arbetsflodesnamn: 'SomethingElse',
              startdatum: '2024-01-01',
              initiativtagare: 'user1',
              uppgifter: [],
              status: 'done',
            },
          ],
        })
      );
      fixture.detectChanges();
      expect(component.loggedAtionsApproveWorkflow()).toEqual([]);
    });

    it('returns approve workflow entries when found', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: [
            {
              arbetsflodesnamn: 'StickaForGodkannande',
              startdatum: '2024-01-01',
              initiativtagare: 'user1',
              uppgifter: [{ aktorer: ['approver1'] }],
              status: 'running',
            },
          ],
        })
      );
      fixture.detectChanges();
      const result = component.loggedAtionsApproveWorkflow();
      expect(result.length).toBe(2);
    });
  });

  describe('deleteDocument', () => {
    it('calls deleteDocument and navigates to root', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');
      component.deleteDocument();
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('utkast-1');
      expect(navigateSpy).toHaveBeenCalledWith(['']);
    });
  });

  describe('toggleLockState', () => {
    it('calls lockService.toggleAndUpdate', () => {
      component.toggleLockState();
      expect(lockSpy.toggleAndUpdate).toHaveBeenCalled();
    });
  });

  describe('toggleSubscription', () => {
    it('calls subscribe when not subscribed', () => {
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: [],
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();
      expect(notifSpy.subscribe).toHaveBeenCalledWith('utkast-1');
    });

    it('calls unsubscribe when subscribed', () => {
      component.isSubscribed.set(true);
      notifSpy.unsubscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: [],
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();
      expect(notifSpy.unsubscribe).toHaveBeenCalledWith('utkast-1');
    });

    it('emits reloadDocument after subscription change', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: [],
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('shows error notification when subscription fails', () => {
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(throwError(() => new Error('Network error')));
      component.toggleSubscription();
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('danger');
    });

    it('sets isSubscribed based on returned notifications', () => {
      authMock.username.set('user1');
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: [{ subscribers: ['user:user1'] }],
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();
      expect(component.isSubscribed()).toBeTrue();
    });
  });

  describe('printFile', () => {
    it('shows unsupported notification when no printable target', () => {
      printSpy.getPrintableTarget.and.returnValue(null);
      component.printFile(makeNuxeoDocument());
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('warning');
    });

    it('shows loading notification and calls printUrl when target found', () => {
      printSpy.getPrintableTarget.and.returnValue({ url: 'http://file.pdf', delayMs: 500 });
      component.printFile(makeNuxeoDocument());
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('info');
      expect(printSpy.printUrl).toHaveBeenCalledWith('http://file.pdf', 500);
    });

    it('uses default delay when delayMs is not set', () => {
      printSpy.getPrintableTarget.and.returnValue({ url: 'http://file.pdf' });
      component.printFile(makeNuxeoDocument());
      expect(printSpy.printUrl).toHaveBeenCalledWith('http://file.pdf', 1000);
    });
  });

  describe('onPrint', () => {
    it('calls selectedFilesToolbarService.printSelectedFiles', () => {
      component.onPrint();
      expect(selectedFilesSpy.printSelectedFiles).toHaveBeenCalledWith(component.files(), component.selectedFileIds());
    });
  });

  describe('isPicture', () => {
    it('returns false when doc has no Picture facet', () => {
      const doc = makeNuxeoDocument({ facets: ['Folderish'] });
      expect(component.isPicture(doc)).toBeFalse();
    });

    it('returns true when doc has Picture facet', () => {
      const doc = makeNuxeoDocument({ facets: ['Picture'] });
      expect(component.isPicture(doc)).toBeTrue();
    });
  });

  describe('getDate', () => {
    it('returns formatted date string', () => {
      const result = component.getDate('2024-01-15T00:00:00Z');
      expect(typeof result).toBe('string');
    });

    it('returns missing indicator for null/undefined', () => {
      const result = component.getDate(null);
      expect(typeof result).toBe('string');
    });
  });

  describe('renderRaw', () => {
    it('returns empty string for null', () => {
      expect(component.renderRaw(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(component.renderRaw(undefined)).toBe('');
    });

    it('returns string as is', () => {
      expect(component.renderRaw('hello')).toBe('hello');
    });

    it('returns number as string', () => {
      expect(component.renderRaw(42)).toBe('42');
    });

    it('returns boolean as string', () => {
      expect(component.renderRaw(true)).toBe('true');
    });

    it('serializes objects to JSON', () => {
      expect(component.renderRaw({ key: 'value' })).toBe('{"key":"value"}');
    });
  });

  describe('copyLink', () => {
    it('calls shareLinkService.copyDocumentLink with document uid', () => {
      component.copyLink();
      expect(shareLinkSpy.copyDocumentLink).toHaveBeenCalledWith('utkast-1', jasmine.any(Function));
    });
  });

  describe('sendReviewDecision', () => {
    it('does nothing when no matching pending task', () => {
      component.pendingTasks.set([]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      component.sendReviewDecision('approve', workflow);
      expect(apiSpy.editWorkflow).not.toHaveBeenCalled();
    });

    it('calls editWorkflow with correct params when task found', () => {
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-1', id: 'task-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      component.sendReviewDecision('approve', workflow);
      expect(apiSpy.editWorkflow).toHaveBeenCalledWith('task-1', 'approve', jasmine.any(Object));
    });

    it('emits reloadDocument on success', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-1', id: 'task-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      component.sendReviewDecision('approve', workflow);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('shows success notification with approved message for non-reject action', () => {
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-1', id: 'task-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      component.sendReviewDecision('approve', workflow);
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('success');
    });

    it('shows error notification on failure', () => {
      apiSpy.editWorkflow.and.returnValue(throwError(() => new Error('error')));
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-1', id: 'task-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      component.sendReviewDecision('approve', workflow);
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('danger');
    });

    it('calls onCreateHandling when action is upprata', () => {
      apiSpy.createHandlingFromUtkast.and.returnValue(of(makeNuxeoDocument({ uid: 'new-uid' })));
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-1', id: 'task-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      component.sendReviewDecision(NUXEO_VOCAB_IDS.arbetsflodeAtgard.upprata, workflow);
      expect(apiSpy.createHandlingFromUtkast).toHaveBeenCalledWith('utkast-1');
    });
  });

  describe('onCreateHandling', () => {
    it('navigates to new handling on success', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');
      apiSpy.createHandlingFromUtkast.and.returnValue(of(makeNuxeoDocument({ uid: 'new-handling-uid' })));
      component.onCreateHandling();
      expect(navigateSpy).toHaveBeenCalledWith(['/doc/', 'new-handling-uid']);
    });

    it('shows success notification on create handling', () => {
      component.onCreateHandling();
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('success');
    });

    it('shows error notification when create handling fails', () => {
      apiSpy.createHandlingFromUtkast.and.returnValue(throwError(() => new Error('error')));
      component.onCreateHandling();
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('danger');
    });
  });

  describe('editForm', () => {
    it('calls editDocument with props', () => {
      component.editForm({ title: 'Test' });
      expect(apiSpy.editDocument).toHaveBeenCalledWith('utkast-1', { title: 'Test' });
    });

    it('emits reloadDocument on success', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      component.editForm({ title: 'Test' });
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('closes edit page on success', () => {
      component.isEditPageOpen.set(true);
      component.editForm({ title: 'Test' });
      expect(component.isEditPageOpen()).toBeFalse();
    });

    it('shows error notification when editDocument fails', () => {
      apiSpy.editDocument.and.returnValue(
        throwError(() => ({ error: { violations: [{ message: 'Validation error' }] } }))
      );
      component.editForm({ title: '' });
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('danger');
    });

    it('shows generic error when no violation message', () => {
      apiSpy.editDocument.and.returnValue(throwError(() => ({ error: {} })));
      component.editForm({ title: '' });
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('danger');
    });
  });

  describe('restoreSelectedVersion', () => {
    it('does nothing when no version selected', () => {
      component.versionForm.controls.version.setValue(null);
      component.restoreSelectedVersion();
      expect(apiSpy.restoreDocumentVersion).not.toHaveBeenCalled();
    });

    it('calls restoreDocumentVersion when version is selected', () => {
      component.versionForm.controls.version.setValue('version-uid-1');
      component.restoreSelectedVersion();
      expect(apiSpy.restoreDocumentVersion).toHaveBeenCalledWith('version-uid-1');
    });
  });

  describe('changeCurrentVersion', () => {
    it('sets selectedFile to matching version', () => {
      const versionDoc = makeNuxeoDocument({ uid: 'v-uid-1' });
      component.availableVersions.set([versionDoc]);
      const event = { detail: { target: { value: 'v-uid-1' } } } as unknown as CustomEvent;
      component.changeCurrentVersion(event);
      expect(component.selectedFile()?.uid).toBe('v-uid-1');
    });

    it('sets selectedFile to null when version not found', () => {
      component.availableVersions.set([]);
      const event = { detail: { target: { value: 'non-existent-uid' } } } as unknown as CustomEvent;
      component.changeCurrentVersion(event);
      expect(component.selectedFile()).toBeNull();
    });
  });

  describe('formatEditForm', () => {
    it('handles handlingstyp as array', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: {
          handlingstyp: [{ id: 'type-1', label: 'Type 1' }],
          title: 'Test',
        },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });

    it('handles handlingstyp as string', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: {
          handlingstyp: 'type-string',
          title: 'Test',
        },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });

    it('filters out empty string values', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: {
          title: '',
          kommentarer: 'Some comment',
        },
      });
      const callArgs = apiSpy.editDocument.calls.mostRecent().args[1];
      expect(callArgs[NUXEO_SCHEMA_FIELDS.dc.title]).toBeUndefined();
    });
  });

  describe('updateDropdownValues', () => {
    it('calls getSuggestions when fieldName is handlingstyp', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
      component.updateDropdownValues({ fieldName: 'handlingstyp', value: 'search-term' });
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalled();
    });

    it('does nothing for other field names', () => {
      apiSpy.DMSDocumentSuggestion.calls.reset();
      component.updateDropdownValues({ fieldName: 'otherField', value: 'value' });
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('setBaseButtons', () => {
    it('sets lock icon to LockClose (unlock) when isLockedByUser is true', () => {
      component.isLockedByUser.set(true);
      component.setBaseButtons();
      const buttons = component.baseButtons();
      const unlockIcon = BUTTON_PRESETS.unlock.icon;
      const lockButton = buttons.find(b => b.icon === unlockIcon);
      expect(lockButton).toBeTruthy();
    });

    it('sets lock icon to LockOpen (lock) when isLockedByUser is false', () => {
      component.isLockedByUser.set(false);
      component.setBaseButtons();
      const buttons = component.baseButtons();
      const lockIcon = BUTTON_PRESETS.lock.icon;
      const lockButton = buttons.find(b => b.icon === lockIcon && b.text === BUTTON_PRESETS.lock.text);
      expect(lockButton).toBeTruthy();
    });

    it('sets favorite icon to StarFull when inFavorites is true', () => {
      component.inFavorites.set(true);
      component.setBaseButtons();
      const buttons = component.baseButtons();
      const favIcon = BUTTON_PRESETS.favoriteActive.icon;
      const favButton = buttons.find(b => b.icon === favIcon);
      expect(favButton).toBeTruthy();
    });

    it('sets notify icon to stopNotify icon when isSubscribed is true', () => {
      component.isSubscribed.set(true);
      component.setBaseButtons();
      const buttons = component.baseButtons();
      const stopNotifyIcon = BUTTON_PRESETS.stopNotify.icon;
      const notifyButton = buttons.find(b => b.icon === stopNotifyIcon && b.text === BUTTON_PRESETS.stopNotify.text);
      expect(notifyButton).toBeTruthy();
    });
  });

  describe('reload', () => {
    it('emits reloadDocument after timeout', fakeAsync(() => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      component.reload();
      tick(1000);
      expect(reloadSpy).toHaveBeenCalled();
    }));
  });

  describe('checkInCollection', () => {
    it('sets inCollection false when no collections', () => {
      apiSpy.getCollections.and.returnValue(of([]));
      component.checkInCollection();
      expect(component.inCollection()).toBeFalse();
    });

    it('sets inCollection true when document is in a collection', () => {
      const docUid = 'utkast-1';
      const collectionItem: CollectionCardItem = {
        uid: 'collection-1',
        title: 'Test Collection',
        date: new Date('2024-01-01'),
        property: 'test',
      };
      apiSpy.getCollections.and.returnValue(of([collectionItem]));
      apiSpy.getCollectionDocuments.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: docUid })],
          })
        )
      );
      component.checkInCollection();
      expect(component.inCollection()).toBeTrue();
    });
  });

  describe('buttons computed', () => {
    it('includes uppratta button (createHandlingFromDraft text)', () => {
      const buttons = component.buttons();
      const upprattaText = BUTTON_PRESETS.createHandlingFromDraft.text;
      const upprattaButton = buttons.find(b => b.text === upprattaText);
      expect(upprattaButton).toBeTruthy();
    });

    it('shows locked buttons when locked by another user and not admin', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          lockOwner: 'another-user',
        })
      );
      authMock.username.set('user1');
      fixture.detectChanges();
      const buttons = component.buttons();

      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('shows changeResponsible button when canChangeResponsible is true', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      const buttons = component.buttons();
      const changeResponsibleText = BUTTON_PRESETS.changeResponsibleHandler.text;
      const changeResponsible = buttons.find(b => b.text === changeResponsibleText);
      expect(changeResponsible).toBeTruthy();
    });
  });

  describe('getSeveralNamesByUids', () => {
    it('calls getSeveralDocsByUids with filtered non-empty uids', () => {
      component.getSeveralNamesByUids(['uid-1', undefined, 'uid-2']);
      expect(apiSpy.getSeveralDocsByUids).toHaveBeenCalledWith(['uid-1', 'uid-2']);
    });

    it('stores names by uid', () => {
      apiSpy.getSeveralDocsByUids.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'uid-1', title: 'Doc Title' })],
          })
        )
      );
      component.getSeveralNamesByUids(['uid-1']);
      expect(component.namesByUid['uid-1']).toBe('Doc Title');
    });
  });

  describe('ngOnDestroy', () => {
    it('sets openPage to null', () => {
      storeMock.openPage.set('utkast');
      component.ngOnDestroy();
      expect(storeMock.openPage()).toBeNull();
    });
  });

  describe('onSectionDropped', () => {
    it('reorders sections and saves the new order', () => {
      draggableSpy.reorderSections.and.returnValue(['files', 'eventLog']);
      const event: Parameters<UtkastPageComponent['onSectionDropped']>[0] = {
        previousIndex: 0,
        currentIndex: 1,
        item: {} as never,
        container: { data: ['files', 'eventLog'] } as never,
        previousContainer: { data: ['files', 'eventLog'] } as never,
        isPointerOverContainer: true,
        distance: { x: 0, y: 0 },
        dropPoint: { x: 0, y: 0 },
        event: new MouseEvent('mouseup'),
      };
      component.onSectionDropped(event);
      expect(draggableSpy.saveOrder).toHaveBeenCalled();
      expect(component.sectionOrder()).toEqual(['files', 'eventLog']);
    });
  });

  describe('saveEditDocProperties', () => {
    it('does nothing when selectedFile is null', () => {
      component.selectedFile.set(null);
      component.saveEditDocProperties();
      expect(apiSpy.saveEditDocProperties).not.toHaveBeenCalled();
    });

    it('calls saveEditDocProperties when file is selected', () => {
      const file = makeNuxeoDocument({ uid: 'file-uid-1' });
      component.selectedFile.set(file);
      component.templateId.set('template-1');
      component.saveEditDocProperties();
      expect(apiSpy.saveEditDocProperties).toHaveBeenCalledWith('file-uid-1', 'template-1', jasmine.any(Array));
    });

    it('sets viewMode to doc after save', () => {
      const file = makeNuxeoDocument({ uid: 'file-uid-1' });
      component.selectedFile.set(file);
      component.viewMode.set('edit');
      component.saveEditDocProperties();
      expect(component.viewMode()).toBe('doc');
    });
  });

  describe('isUserSubscribed (via toggleSubscription)', () => {
    it('returns false when username is null', () => {
      authMock.username.set(null);
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: [{ subscribers: ['user:user1'] }],
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();

      expect(component.isSubscribed()).toBeFalse();
    });
  });

  describe('extractUserId (via currentAnsvHandlaggare)', () => {
    it('returns null when value is null', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBeNull();
    });

    it('returns string when value is a plain string', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: 'user1',
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBe('user1');
    });

    it('strips user: prefix from string value', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: 'user:john.doe',
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBe('john.doe');
    });

    it('returns null for whitespace-only string', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: '   ',
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBeNull();
    });

    it('returns id when NxUser has a non-empty id', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user-id-1' },
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBe('user-id-1');
    });

    it('returns prefixed username from user properties when id is empty', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: {
            id: '',
            properties: { [NUXEO_SCHEMA_FIELDS.user.username]: 'prefixed-user' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBe('prefixed-user');
    });

    it('returns plain username from properties when prefixed username missing', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: {
            id: '  ',
            properties: { username: 'plain-user' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBe('plain-user');
    });

    it('returns null when NxUser has empty id and no username in properties', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: {
            id: '',
            properties: {},
          },
        })
      );
      fixture.detectChanges();
      expect(component.currentAnsvHandlaggare()).toBeNull();
    });
  });

  describe('getUserDisplay (via reviewerName)', () => {
    it('returns null when granskare is null', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBeNull();
    });

    it('returns string value directly when granskare is a string', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: 'reviewer-string',
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBe('reviewer-string');
    });

    it('returns null when granskare is an empty string', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: '',
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBeNull();
    });

    it('returns full name from user properties (firstName + lastName)', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: {
            id: 'u1',
            properties: { firstName: 'Anna', lastName: 'Svensson' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBe('Anna Svensson');
    });

    it('returns full name using lowercase firstname/lastname fallback', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: {
            id: 'u1',
            properties: { firstname: 'Bo', lastname: 'Karlsson' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBe('Bo Karlsson');
    });

    it('returns username when name is empty but username exists', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: {
            id: 'u1',
            properties: { username: 'bkarlsson' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBe('bkarlsson');
    });

    it('returns prefixed username from properties', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: {
            id: 'u1',
            properties: { [NUXEO_SCHEMA_FIELDS.user.username]: 'prefixed-reviewer' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBe('prefixed-reviewer');
    });

    it('falls back to user.id when no name or username', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: {
            id: 'fallback-id',
            properties: {},
          },
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBe('fallback-id');
    });

    it('returns null when user has empty id and no name or username in properties', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: {
            id: '',
            properties: {},
          },
        })
      );
      fixture.detectChanges();
      expect(component.reviewerName()).toBeNull();
    });
  });

  describe('isUserSubscribed (via toggleSubscription)', () => {
    it('returns false when notifications is not an array', () => {
      authMock.username.set('user1');
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: null,
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();
      expect(component.isSubscribed()).toBeFalse();
    });

    it('returns true when subscriber matches username (without prefix)', () => {
      authMock.username.set('user1');
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: [{ subscribers: ['user1'] }],
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();
      expect(component.isSubscribed()).toBeTrue();
    });

    it('handles null subscriber entries in the list', () => {
      authMock.username.set('user1');
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(
        of(
          makeNuxeoDocument({
            properties: {
              [NUXEO_SCHEMA_FIELDS.notif.notifications]: [{ subscribers: [null, 'user:user1'] }],
            } as unknown as NuxeoProperties,
          })
        )
      );
      component.toggleSubscription();
      expect(component.isSubscribed()).toBeTrue();
    });
  });

  describe('canChangeRequester - approvalPending path', () => {
    it('returns true when approvalPending and username matches requester', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'someone-else' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.approvalPending()).toBeTrue();
      expect(component.canChangeRequester()).toBeTrue();
    });

    it('returns false when approvalPending and username does not match requester', () => {
      authMock.username.set('other-user');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'someone-else' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.approvalPending()).toBeTrue();
      expect(component.canChangeRequester()).toBeFalse();
    });

    it('returns false when not approvalPending (review decision taken)', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: '2024-01-01',
        })
      );
      fixture.detectChanges();
      expect(component.approvalPending()).toBeFalse();
      expect(component.canChangeRequester()).toBeFalse();
    });
  });

  describe('canChangeResponsible - approvalPending path', () => {
    it('returns true when approvalPending and username matches requester', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'someone-else' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.canChangeResponsible()).toBeTrue();
    });

    it('returns false when approvalPending and username does not match requester', () => {
      authMock.username.set('other-user');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'someone-else' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        })
      );
      fixture.detectChanges();
      expect(component.canChangeResponsible()).toBeFalse();
    });
  });

  describe('buttons computed - locked by owner', () => {
    it('returns base buttons when locked by current user', () => {
      fixture.componentRef.setInput('document', makeDoc({ lockOwner: 'user1' }));
      authMock.username.set('user1');
      fixture.detectChanges();

      const buttons = component.buttons();
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('returns locked buttons when locked by another user and not admin', () => {
      fixture.componentRef.setInput('document', makeDoc({ lockOwner: 'other-user' }));
      authMock.username.set('user1');
      (authMock as unknown as { isAdmin: Signal<boolean> }).isAdmin = computed(() => false);
      fixture.detectChanges();
      const buttons = component.buttons();

      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('includes changeRequester button when locked by another and canChangeRequester is true', () => {
      authMock.username.set('user1');
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          lockOwner: 'other-user',
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: { id: 'user1' },
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'other-user' },
          [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        })
      );
      (authMock as unknown as { isAdmin: Signal<boolean> }).isAdmin = computed(() => false);
      fixture.detectChanges();
      const buttons = component.buttons();
      expect(buttons.length).toBeGreaterThan(2);
    });

    it('returns base buttons when locked and user is admin', () => {
      fixture.componentRef.setInput('document', makeDoc({ lockOwner: 'other-user' }));
      authMock.username.set('user1');
      (authMock as unknown as { isAdmin: Signal<boolean> }).isAdmin = computed(() => true);
      fixture.detectChanges();

      const buttons = component.buttons();
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('responsibleForChanges computed', () => {
    it('returns approvalAssignee when set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: {
            id: 'u1',
            properties: { firstName: 'Anna', lastName: 'Berg' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.responsibleForChanges()).toBe('Anna Berg');
    });

    it('returns currentAnsvHandlaggare as fallback when approvalAssignee is null', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: { id: 'user-id-only' },
        })
      );
      fixture.detectChanges();

      expect(component.responsibleForChanges()).toBeTruthy();
    });

    it('returns null when no assignee or reviewer', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: null,
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.responsibleForChanges()).toBeNull();
    });
  });

  describe('approvalAssignee computed', () => {
    it('returns null when ansvarigHandlaggare is null', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.approvalAssignee()).toBeNull();
    });

    it('returns display name when ansvarigHandlaggare has properties', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: {
            id: 'u1',
            properties: { firstName: 'Karl', lastName: 'Johansson' },
          },
        })
      );
      fixture.detectChanges();
      expect(component.approvalAssignee()).toBe('Karl Johansson');
    });
  });

  describe('requesterId computed', () => {
    it('returns null when granskare is null', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: null,
        })
      );
      fixture.detectChanges();
      expect(component.requesterId()).toBeNull();
    });

    it('returns id when granskare is a string', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.granskare]: 'granskare-string',
        })
      );
      fixture.detectChanges();
      expect(component.requesterId()).toBe('granskare-string');
    });
  });

  describe('formatEditForm - additional branches', () => {
    it('handles lagrumsbeskrivning array with option id', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: {
          title: 'Test',
          lagrumsbeskrivning: [{ id: 'lagrum-1', label: 'Lagrum 1', value: 'lagrum-1' }],
        },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
      const callArgs = apiSpy.editDocument.calls.mostRecent().args[1];
      expect(callArgs[NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]).toBe('lagrum-1');
    });

    it('handles empty lagrumsbeskrivning array', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: {
          title: 'Test',
          lagrumsbeskrivning: [],
        },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });

    it('handles avsandare and mottagare contact mapping', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        avsandare: [{ namn: 'Sender', email: 's@test.com', telefon: '123', adress: 'Addr', org: 'Org' }],
        mottagare: [{ namn: 'Receiver', email: 'r@test.com' }],
        handlingDetails: { title: 'Test' },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
      const callArgs = apiSpy.editDocument.calls.mostRecent().args[1];
      expect(callArgs[NUXEO_SCHEMA_FIELDS.handling.avsandare]).toBeTruthy();
    });

    it('handles undefined avsandare and mottagare', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: { title: 'Test' },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });

    it('handles handlingstyp as array with option that has no id property', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: {
          title: 'Test',
          handlingstyp: [{ label: 'Type without id', value: 'val' } as unknown as Option],
        },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
    });

    it('handles gdpr as true (not filtered out)', () => {
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      component.formatEditForm({
        handlingDetails: {
          title: 'Test',
          gdpr: true,
        },
      });
      expect(apiSpy.editDocument).toHaveBeenCalled();
      const callArgs = apiSpy.editDocument.calls.mostRecent().args[1];
      expect(callArgs[NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]).toBe(true);
    });
  });

  describe('sendReviewDecision - rejected message', () => {
    it('shows rejected notification when action is avvisa', () => {
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-1', id: 'task-1' })]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      component.sendReviewDecision(NUXEO_VOCAB_IDS.arbetsflodeAtgard.avvisa, workflow);
      expect(storeMock.notification().show).toBeTrue();
      expect(storeMock.notification().variation).toBe('success');
      const text = storeMock.notification().text;
      expect(text).toBeTruthy();
    });
  });

  describe('checkDocumentInCollections', () => {
    it('returns false when collections is empty', done => {
      apiSpy.getCollections.and.returnValue(of([]));
      component.checkDocumentInCollections('uid-1').subscribe(result => {
        expect(result).toBeFalse();
        done();
      });
    });

    it('returns true when document found in a collection', done => {
      apiSpy.getCollections.and.returnValue(of([{ uid: 'col-1', title: 'Col', date: new Date(), property: 'p' }]));
      apiSpy.getCollectionDocuments.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'doc-uid' })] }))
      );
      component.checkDocumentInCollections('doc-uid').subscribe(result => {
        expect(result).toBeTrue();
        done();
      });
    });

    it('returns false when document not in any collection', done => {
      apiSpy.getCollections.and.returnValue(of([{ uid: 'col-1', title: 'Col', date: new Date(), property: 'p' }]));
      apiSpy.getCollectionDocuments.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'other-doc' })] }))
      );
      component.checkDocumentInCollections('doc-uid').subscribe(result => {
        expect(result).toBeFalse();
        done();
      });
    });
  });

  describe('documentLink computed', () => {
    it('returns the link from shareLinkService', () => {
      shareLinkSpy.buildDocLink.and.returnValue('http://my-link/doc/utkast-1');
      fixture.detectChanges();
      expect(component.documentLink()).toBe('http://my-link/doc/utkast-1');
      expect(shareLinkSpy.buildDocLink).toHaveBeenCalledWith('utkast-1');
    });
  });

  describe('secretStampText computed', () => {
    it('returns null when stamp service returns null', () => {
      secretStampSpy.getSecretStampText.and.returnValue(null);
      fixture.detectChanges();
      expect(component.secretStampText()).toBeNull();
    });

    it('returns stamp text from service', () => {
      secretStampSpy.getSecretStampText.and.returnValue('SECRET');

      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.starkSekretess },
        })
      );
      fixture.detectChanges();
      expect(component.secretStampText()).toBe('SECRET');
    });
  });

  describe('editConfig computed - shouldShowLagrum', () => {
    it('returns isHidden=true for lagrum field when sekretess is not svag/stark', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: { id: 'ingenSekretess' },
        })
      );
      fixture.detectChanges();
      const groups = component.editConfig();
      const handlingGroup = groups.find(g => g.groupId === 'handlingDetails');
      const lagrumField = handlingGroup?.groupFields?.find(f => f.name === 'lagrumsbeskrivning');
      expect(lagrumField?.isHidden).toBeTrue();
    });

    it('returns isHidden=false for lagrum field when sekretess is svagSekretess', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.svagSekretess },
        })
      );
      fixture.detectChanges();
      const groups = component.editConfig();
      const handlingGroup = groups.find(g => g.groupId === 'handlingDetails');
      const lagrumField = handlingGroup?.groupFields?.find(f => f.name === 'lagrumsbeskrivning');
      expect(lagrumField?.isHidden).toBeFalse();
    });

    it('returns isHidden=false for lagrum field when sekretess is starkSekretess', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.starkSekretess },
        })
      );
      fixture.detectChanges();
      const groups = component.editConfig();
      const handlingGroup = groups.find(g => g.groupId === 'handlingDetails');
      const lagrumField = handlingGroup?.groupFields?.find(f => f.name === 'lagrumsbeskrivning');
      expect(lagrumField?.isHidden).toBeFalse();
    });

    it('includes lagrumDefault when lagrumsbeskrivning has uid and title', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: { id: NUXEO_VOCAB_IDS.sekretess.svagSekretess },
          [NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]: { uid: 'lagrum-uid', title: 'Lagrum Title' },
        })
      );
      fixture.detectChanges();
      const groups = component.editConfig();
      const handlingGroup = groups.find(g => g.groupId === 'handlingDetails');
      const lagrumField = handlingGroup?.groupFields?.find(f => f.name === 'lagrumsbeskrivning');
      expect(lagrumField?.defaultValue).toEqual([{ id: 'lagrum-uid', label: 'Lagrum Title' }]);
    });
  });

  describe('renderRaw - non-serializable object', () => {
    it('falls back to String() when JSON.stringify throws', () => {
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;
      const result = component.renderRaw(circular);
      expect(typeof result).toBe('string');
    });
  });

  describe('getVersions', () => {
    it('sets currentFileVersion to latestVersion when no version matches', done => {
      const latestVersion = makeNuxeoDocument({
        uid: 'v-latest',
        isLatestVersion: true,
        properties: {
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 2,
          [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0,
        },
      });
      apiSpy.getUtkastDocumentVersions.and.returnValue(of(makeSearchResult({ entries: [latestVersion] })));
      const mainFile = makeNuxeoDocument({
        uid: 'file-main',
        properties: {
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 1,
          [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0,
        },
      });
      component.getVersions(mainFile).subscribe(() => {
        expect(component.currentFileVersion()?.uid).toBe('v-latest');
        done();
      });
    });

    it('sets currentFileVersion to matching version', done => {
      const matchingVersion = makeNuxeoDocument({
        uid: 'v-match',
        isLatestVersion: true,
        properties: {
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 1,
          [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0,
        },
      });
      apiSpy.getUtkastDocumentVersions.and.returnValue(of(makeSearchResult({ entries: [matchingVersion] })));
      const mainFile = makeNuxeoDocument({
        uid: 'file-main',
        properties: {
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 1,
          [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0,
        },
      });
      component.getVersions(mainFile).subscribe(() => {
        expect(component.currentFileVersion()?.uid).toBe('v-match');
        done();
      });
    });

    it('shows notification and returns of(null) on retry exhaustion', done => {
      apiSpy.getUtkastDocumentVersions.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ isLatestVersion: false })] }))
      );
      const mainFile = makeNuxeoDocument({ uid: 'file-main', properties: {} });
      component.getVersions(mainFile).subscribe(result => {
        expect(result).toBeNull();
        expect(storeMock.notification().show).toBeTrue();
        done();
      });
    }, 10000);
  });

  describe('getFile', () => {
    it('sets isLoading to false after completion', () => {
      apiSpy.getHandlingWithFile.and.returnValue(of(makeSearchResult({ entries: [] })));
      component.getFile();
      expect(component.isLoading()).toBeFalse();
    });

    it('sets files from entries of type Fil', () => {
      const filEntry: NuxeoFileDocument = makeNuxeoDocument({
        uid: 'file-uid',
        type: 'Fil',
        properties: {
          [NUXEO_SCHEMA_FIELDS.file.content]: { name: 'file.pdf' },
        },
      });
      filEntry.type = 'Fil';
      apiSpy.getHandlingWithFile.and.returnValue(of(makeSearchResult({ entries: [filEntry] })));
      component.getFile();
      expect(component.files().length).toBe(1);
    });
  });
});
