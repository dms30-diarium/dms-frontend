import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HandlingPageComponent } from './handling-page.component';
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
import { CustomMetadataService } from '@app/shared/services/custom-metadata.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { makeNuxeoDocument, makeSearchResult, makeWorkflowInfo } from '@app/shared/testing/mock-factories';
import { NuxeoFileDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { NotificationType } from '@app/shared/components/notification/notification.component';
import { EditHandlingResult, GeneralWorkflowVocabulary } from './handling-types';
import { Transitions } from '@app/pages/case-page/case-types';
import { Router } from '@angular/router';
import { CollectionCardItem } from '@app/shared/components/collection-card/collection-card.component';

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
    uid: 'handling-1',
    title: 'Test Handling',
    type: 'Handling',
    path: '/default-domain/workspaces/case-1/handling-1',
    parentRef: 'case-1',
    state: 'project',
    lockOwner: undefined,
    contextParameters: { runningWorkflows: [], pendingTasks: [] },
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Handling',
      [NUXEO_SCHEMA_FIELDS.notif.notifications]: [],
      ...overrides,
    } as unknown as NuxeoProperties,
  });
}

function makeTransitions(overrides: Partial<Transitions> = {}): Transitions {
  return {
    allowedTransitions: [],
    currentStateLabel: '',
    currentState: '',
    transitions: [],
    ...overrides,
  };
}

describe('HandlingPageComponent', () => {
  let component: HandlingPageComponent;
  let fixture: ComponentFixture<HandlingPageComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let favSpy: jasmine.SpyObj<FavoritesService>;
  let lockSpy: jasmine.SpyObj<LockService>;
  let selectedFilesSpy: jasmine.SpyObj<SelectedFilesToolbarService>;
  let accordionSpy: jasmine.SpyObj<AccordionStateService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let shareLinkSpy: jasmine.SpyObj<ShareLinkService>;
  let printSpy: jasmine.SpyObj<PrintService>;
  let customMetaSpy: jasmine.SpyObj<CustomMetadataService>;
  let draggableSpy: jasmine.SpyObj<DraggableSectionOrderService>;

  beforeEach(async () => {
    authMock = makeAuthMock();
    storeMock = makeStoreMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getHandlingWithFile',
      'getLagrumOptions',
      'getLifecycleTransitions',
      'getCollections',
      'getCollectionDocuments',
      'getDirectorySuggestions',
      'getUserSuggestions',
      'DMSDocumentSuggestion',
      'deleteWorkflow',
      'editWorkflow',
      'downloadBulk',
      'getDocumentById',
      'createWorkflow',
      'followLifecycleTransition',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getHandlingWithFile.and.returnValue(of(makeSearchResult<NuxeoFileDocument>({ entries: [] })));
    apiSpy.getLagrumOptions.and.returnValue(of([]));
    apiSpy.getLifecycleTransitions.and.returnValue(of(makeTransitions()));
    apiSpy.getCollections.and.returnValue(of([]));
    apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [] })));
    (apiSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((vocab: string) => {
      if (vocab === 'AtgarderAllmannaArbetsflodet') {
        return of([{ displayLabel: 'Handling', children: [] }]);
      }
      return of([]);
    });
    apiSpy.getUserSuggestions.and.returnValue(of([]));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.deleteWorkflow.and.returnValue(of([]));
    apiSpy.editWorkflow.and.returnValue(of(makeWorkflowInfo()));
    apiSpy.downloadBulk.and.returnValue(of(new Blob()));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    (apiSpy.createWorkflow as jasmine.Spy).and.returnValue(of(makeWorkflowInfo()));
    (apiSpy.followLifecycleTransition as jasmine.Spy).and.returnValue(of(makeNuxeoDocument()));

    favSpy = jasmine.createSpyObj('FavoritesService', ['checkInFavorites', 'toggleFavorites', 'getFavoritesUid']);
    favSpy.checkInFavorites.and.returnValue(of(false));
    favSpy.toggleFavorites.and.returnValue(of(makeNuxeoDocument()));
    favSpy.getFavoritesUid.and.returnValue(of(makeNuxeoDocument()));

    lockSpy = jasmine.createSpyObj('LockService', ['initLockState', 'toggleAndUpdate']);
    lockSpy.initLockState.and.returnValue(undefined);
    lockSpy.toggleAndUpdate.and.returnValue(of(makeNuxeoDocument()));

    selectedFilesSpy = jasmine.createSpyObj('SelectedFilesToolbarService', [
      'updateFileSelection',
      'updateAttachmentSelection',
      'clearSelection',
      'downloadSelectedFilesAsZip',
      'printSelectedFiles',
      'mergeSelectedFilesAsPdf',
    ]);

    accordionSpy = jasmine.createSpyObj('AccordionStateService', ['loadState', 'saveState']);
    accordionSpy.loadState.and.returnValue({});

    draggableSpy = jasmine.createSpyObj('DraggableSectionOrderService', [
      'loadOrder',
      'saveOrder',
      'visibleSections',
      'reorderSections',
    ]);
    draggableSpy.loadOrder.and.returnValue(['eventLog', 'files']);
    draggableSpy.visibleSections.and.returnValue(['eventLog', 'files']);
    draggableSpy.reorderSections.and.returnValue(['files', 'eventLog']);

    customMetaSpy = jasmine.createSpyObj('CustomMetadataService', [
      'getDefinitions',
      'getDefinitionsFromDocument',
      'getMetadataValues',
      'normalizeDefinitions',
      'saveDefinitionsThenDocument',
    ]);
    customMetaSpy.getDefinitions.and.returnValue(of([]));
    customMetaSpy.getDefinitionsFromDocument.and.returnValue([]);
    customMetaSpy.getMetadataValues.and.returnValue([]);
    customMetaSpy.normalizeDefinitions.and.returnValue([]);
    customMetaSpy.saveDefinitionsThenDocument.and.returnValue(of(makeNuxeoDocument()));

    notificationSpy = jasmine.createSpyObj('NotificationService', ['isUserSubscribed', 'subscribe', 'unsubscribe']);
    notificationSpy.subscribe.and.returnValue(of(makeNuxeoDocument()));
    notificationSpy.unsubscribe.and.returnValue(of(makeNuxeoDocument()));

    shareLinkSpy = jasmine.createSpyObj('ShareLinkService', ['buildDocLink', 'copyDocumentLink']);
    shareLinkSpy.buildDocLink.and.returnValue('http://link');

    printSpy = jasmine.createSpyObj('PrintService', [
      'getPrintableTarget',
      'printUrl',
      'getPrintableDocuments',
      'printDocuments',
    ]);
    printSpy.getPrintableTarget.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [HandlingPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: FavoritesService, useValue: favSpy },
        { provide: LockService, useValue: lockSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ShareLinkService, useValue: shareLinkSpy },
        { provide: SecretStampService, useValue: jasmine.createSpyObj('SecretStampService', ['getStamp']) },
        { provide: PrintService, useValue: printSpy },
        { provide: SelectedFilesToolbarService, useValue: selectedFilesSpy },
        { provide: DraggableSectionOrderService, useValue: draggableSpy },
        { provide: AccordionStateService, useValue: accordionSpy },
        { provide: CustomMetadataService, useValue: customMetaSpy },
      ],
    })
      .overrideTemplate(HandlingPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(HandlingPageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('document', makeDoc());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSectionToggled', () => {
    it('updates accordionState and saves', () => {
      component.onSectionToggled('files', true);
      expect(component.accordionState()['files']).toBeTrue();
      expect(accordionSpy.saveState).toHaveBeenCalled();
    });

    it('collapses section', () => {
      component.accordionState.set({ files: true });
      component.onSectionToggled('files', false);
      expect(component.accordionState()['files']).toBeFalse();
    });
  });

  describe('onSectionDropped', () => {
    it('reorders sections and saves order', () => {
      const event: Parameters<HandlingPageComponent['onSectionDropped']>[0] = {
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
      expect(draggableSpy.reorderSections).toHaveBeenCalled();
      expect(draggableSpy.saveOrder).toHaveBeenCalled();
    });
  });

  describe('isUserAssignedForWorkflow', () => {
    it('returns false when no workflows assigned', () => {
      component.worflows.set([]);
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.isUserAssignedForWorkflow(workflow)).toBeFalse();
    });

    it('uses worflowsAssignedToUser from context', () => {
      const workflow = makeWorkflowInfo({ id: 'wf-1' });
      expect(component.isUserAssignedForWorkflow(workflow)).toBeFalse();
    });

    it('returns true when pending task matches workflow id', () => {
      const workflow = makeWorkflowInfo({ id: 'wf-99' });
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-99' })]);
      expect(component.isUserAssignedForWorkflow(workflow)).toBeTrue();
    });
  });

  describe('canUserCancelWorkflow', () => {
    it('returns true when workflow initiator matches username', () => {
      const workflow = makeWorkflowInfo({ initiator: 'user1' });
      expect(component.canUserCancelWorkflow(workflow)).toBeTrue();
    });

    it('returns false when workflow initiator does not match username', () => {
      const workflow = makeWorkflowInfo({ initiator: 'other-user' });
      expect(component.canUserCancelWorkflow(workflow)).toBeFalse();
    });
  });

  describe('getTaskActions', () => {
    it('returns undefined when no pending tasks', () => {
      component.pendingTasks.set(undefined);
      expect(component.getTaskActions(makeWorkflowInfo({ id: 'wf-1' }))).toBeUndefined();
    });

    it('finds task actions for matching workflow', () => {
      const actions = [{ name: 'approve', label: '', url: '' }];
      component.pendingTasks.set([
        makeWorkflowInfo({
          workflowInstanceId: 'wf-1',
          taskInfo: { taskActions: actions },
        }),
      ]);
      const result = component.getTaskActions(makeWorkflowInfo({ id: 'wf-1' }));
      expect(result).toEqual(actions);
    });

    it('returns undefined when no task matches the workflow', () => {
      component.pendingTasks.set([makeWorkflowInfo({ workflowInstanceId: 'wf-other' })]);
      expect(component.getTaskActions(makeWorkflowInfo({ id: 'wf-1' }))).toBeUndefined();
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

  describe('findActionName', () => {
    it('returns empty string when id not found', () => {
      expect(component.findActionName('non-existent')).toBe('');
    });

    it('returns empty string for undefined id', () => {
      expect(component.findActionName(undefined)).toBe('');
    });
  });

  describe('sendReviewDecision', () => {
    it('does nothing when no workflowTaskId found', () => {
      component.pendingTasks.set([]);
      component.sendReviewDecision('approve', makeWorkflowInfo({ id: 'wf-1' }));
      expect(apiSpy.editWorkflow).not.toHaveBeenCalled();
    });

    it('calls editWorkflow and emits reloadDocument on success (avvisa)', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      const decisionTask = makeWorkflowInfo({ id: 'task-1', workflowInstanceId: 'wf-1' });
      component.pendingTasks.set([decisionTask]);
      apiSpy.editWorkflow.and.returnValue(of(makeWorkflowInfo()));

      component.sendReviewDecision(NUXEO_VOCAB_IDS.arbetsflodeAtgard.avvisa, makeWorkflowInfo({ id: 'wf-1' }));

      expect(apiSpy.editWorkflow).toHaveBeenCalledWith(
        'task-1',
        NUXEO_VOCAB_IDS.arbetsflodeAtgard.avvisa,
        jasmine.any(Object)
      );
      expect(reloadSpy).toHaveBeenCalled();
      expect(storeMock.notification().variation).toBe('success');
    });

    it('calls editWorkflow and shows model-specific message on non-avvisa action', () => {
      const decisionTask = makeWorkflowInfo({
        id: 'task-2',
        workflowInstanceId: 'wf-2',
        workflowModelName: 'AllmantArbetsflode',
      });
      component.pendingTasks.set([decisionTask]);
      apiSpy.editWorkflow.and.returnValue(of(makeWorkflowInfo()));

      component.sendReviewDecision(
        'approve',
        makeWorkflowInfo({ id: 'wf-2', workflowModelName: 'AllmantArbetsflode' })
      );

      expect(apiSpy.editWorkflow).toHaveBeenCalled();
      expect(storeMock.notification().variation).toBe('success');
    });

    it('shows error notification on editWorkflow failure', () => {
      const decisionTask = makeWorkflowInfo({ id: 'task-3', workflowInstanceId: 'wf-3' });
      component.pendingTasks.set([decisionTask]);
      apiSpy.editWorkflow.and.returnValue(throwError(() => new Error('fail')));

      component.sendReviewDecision('approve', makeWorkflowInfo({ id: 'wf-3' }));

      expect(storeMock.notification().variation).toBe('danger');
    });
  });

  describe('getWorkflowComments', () => {
    it('returns undefined when no arbetsfloden property', () => {
      const result = component.getWorkflowComments(makeWorkflowInfo({ id: 'wf-1' }));
      expect(result).toBeUndefined();
    });

    it('returns filtered and sorted comments for matching workflow', () => {
      const docWithWorkflow = makeDoc({
        [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: [
          {
            arbetsflodesid: 'wf-workflow',
            slutdatum: null,
            arbetsflodesnamn: 'name',
            status: 'running',
            startdatum: new Date(),
            anvandare: [],
            initiativtagare: {},
            uppgifter: [
              { aktorer: [], kommentar: 'comment A', namn: 'task1', atgardDatum: new Date('2024-01-02') },
              { aktorer: [], kommentar: null, namn: 'task2', atgardDatum: new Date('2024-01-01') },
              { aktorer: [], kommentar: 'comment B', namn: 'task3', atgardDatum: new Date('2024-01-01') },
            ],
          },
        ],
      });
      fixture.componentRef.setInput('document', docWithWorkflow);
      fixture.detectChanges();

      const result = component.getWorkflowComments(makeWorkflowInfo({ id: 'wf-workflow' }));
      expect(result).toBeTruthy();
      expect(result!.length).toBe(2);
      expect(result![0].kommentar).toBe('comment B');
      expect(result![1].kommentar).toBe('comment A');
    });
  });

  describe('getUserName', () => {
    it('concatenates firstName and lastName from user properties', () => {
      const user = {
        'entity-type': 'user' as const,
        id: 'user-1',
        properties: {
          [NUXEO_SCHEMA_FIELDS.user.firstName]: 'Jane',
          [NUXEO_SCHEMA_FIELDS.user.lastName]: 'Doe',
        },
      };
      const result = component.getUserName(user);
      expect(result).toBe('Jane Doe');
    });
  });

  describe('onFileSelectionChange', () => {
    it('delegates to selectedFilesToolbarService', () => {
      const event = { file: makeNuxeoDocument(), selected: true };
      component.onFileSelectionChange(event);
      expect(selectedFilesSpy.updateFileSelection).toHaveBeenCalledWith(component.selectedFileIds, event);
    });
  });

  describe('onAttachmentSelectionChange', () => {
    it('delegates to selectedFilesToolbarService', () => {
      const event = { files: [], selected: true };
      component.onAttachmentSelectionChange(event);
      expect(selectedFilesSpy.updateAttachmentSelection).toHaveBeenCalledWith(component.selectedFileIds, event);
    });
  });

  describe('clearSelectedFiles', () => {
    it('delegates to selectedFilesToolbarService', () => {
      component.clearSelectedFiles();
      expect(selectedFilesSpy.clearSelection).toHaveBeenCalledWith(component.selectedFileIds);
    });
  });

  describe('downloadSelectedFilesAsZip', () => {
    it('delegates to selectedFilesToolbarService', () => {
      component.downloadSelectedFilesAsZip();
      expect(selectedFilesSpy.downloadSelectedFilesAsZip).toHaveBeenCalledWith(component.selectedFileIds());
    });
  });

  describe('mergeSelectedFilesAsPdf', () => {
    it('delegates to selectedFilesToolbarService with parentRef and selectedFileIds', () => {
      component.mergeSelectedFilesAsPdf();
      expect(selectedFilesSpy.mergeSelectedFilesAsPdf).toHaveBeenCalledWith('case-1', component.selectedFileIds());
    });
  });

  describe('onPrint', () => {
    it('calls printSelectedFiles with current files and selectedFileIds', () => {
      component.onPrint();
      expect(selectedFilesSpy.printSelectedFiles).toHaveBeenCalledWith(component.files(), component.selectedFileIds());
    });
  });

  describe('openDocument', () => {
    it('navigates to /doc/:uid', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');
      component.openDocument('doc-uid-1');
      expect(navigateSpy).toHaveBeenCalledWith(['/doc/', 'doc-uid-1']);
    });
  });

  describe('printFile', () => {
    it('shows warning notification when no printable target', () => {
      printSpy.getPrintableTarget.and.returnValue(null);
      component.printFile(makeNuxeoDocument());
      expect(storeMock.notification().variation).toBe('warning');
      expect(printSpy.printUrl).not.toHaveBeenCalled();
    });

    it('shows info notification and calls printUrl when target exists', () => {
      printSpy.getPrintableTarget.and.returnValue({ url: 'http://example.com/file.pdf', delayMs: 500 });
      component.printFile(makeNuxeoDocument());
      expect(storeMock.notification().variation).toBe('info');
      expect(printSpy.printUrl).toHaveBeenCalledWith('http://example.com/file.pdf', 500);
    });

    it('uses default delayMs of 1000 when not specified', () => {
      printSpy.getPrintableTarget.and.returnValue({ url: 'http://example.com/file.pdf' });
      component.printFile(makeNuxeoDocument());
      expect(printSpy.printUrl).toHaveBeenCalledWith('http://example.com/file.pdf', 1000);
    });
  });

  describe('getDate', () => {
    it('returns empty string for null/undefined input', () => {
      expect(component.getDate(null)).toBe('');
      expect(component.getDate(undefined)).toBe('');
    });

    it('formats a valid date string', () => {
      const result = component.getDate('2024-06-15');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('properties computed', () => {
    it('returns document properties', () => {
      expect(component.properties()).toBeTruthy();
      expect(component.properties()[NUXEO_SCHEMA_FIELDS.dc.title]).toBe('Test Handling');
    });
  });

  describe('inFavorites signal', () => {
    it('defaults to false', () => {
      expect(component.inFavorites()).toBeFalse();
    });
  });

  describe('isLockedByUser signal', () => {
    it('defaults to false when document has no lockOwner', () => {
      expect(component.isLockedByUser()).toBeFalse();
    });
  });

  describe('sendForReviewWorkflow', () => {
    it('initializes to empty array from document with no workflows', () => {
      expect(component.sendForReviewWorkflow()).toEqual([]);
    });

    it('filters workflows by SkickaForGranskning workflowModelName', () => {
      const doc = makeDoc();
      doc.contextParameters = {
        runningWorkflows: [
          makeWorkflowInfo({ workflowModelName: 'SkickaForGranskning' }),
          makeWorkflowInfo({ workflowModelName: 'OtherWorkflow' }),
        ],
        pendingTasks: [],
      };
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.sendForReviewWorkflow()!.length).toBe(1);
    });
  });

  describe('sendForApprovalWorkflow', () => {
    it('initializes to empty array from document with no workflows', () => {
      expect(component.sendForApprovalWorkflow()).toEqual([]);
    });

    it('filters workflows by StickaForGodkannande workflowModelName', () => {
      const doc = makeDoc();
      doc.contextParameters = {
        runningWorkflows: [
          makeWorkflowInfo({ workflowModelName: 'StickaForGodkannande' }),
          makeWorkflowInfo({ workflowModelName: 'SkickaForGranskning' }),
        ],
        pendingTasks: [],
      };
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.sendForApprovalWorkflow()!.length).toBe(1);
    });
  });

  describe('worflows signal', () => {
    it('filters workflows by AllmantArbetsflode', () => {
      const doc = makeDoc();
      doc.contextParameters = {
        runningWorkflows: [
          makeWorkflowInfo({ workflowModelName: 'AllmantArbetsflode' }),
          makeWorkflowInfo({ workflowModelName: 'SkickaForGranskning' }),
        ],
        pendingTasks: [],
      };
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.worflows()!.length).toBe(1);
    });
  });

  describe('files signal', () => {
    it('defaults to empty array', () => {
      expect(component.files()).toEqual([]);
    });
  });

  describe('loadCaseDetails', () => {
    it('calls getHandlingWithFile on construction', () => {
      expect(apiSpy.getHandlingWithFile).toHaveBeenCalledWith('handling-1');
    });

    it('sets files from result', () => {
      const mockFile = makeNuxeoDocument<NuxeoFileDocument['properties']>({
        type: 'Fil',
        properties: {
          [NUXEO_SCHEMA_FIELDS.fil?.typ || 'file:typ']: 'Huvudfil',
        } as unknown as NuxeoFileDocument['properties'],
      });
      apiSpy.getHandlingWithFile.and.returnValue(of(makeSearchResult<NuxeoFileDocument>({ entries: [mockFile] })));
      component.loadCaseDetails();
      expect(component.files()[0]).toBe(mockFile);
    });

    it('sets selectedFile to main file (hauptfil) when present', () => {
      const mainFile = makeNuxeoDocument<NuxeoFileDocument['properties']>({
        uid: 'main-file-uid',
        type: 'Fil',
        properties: {
          [NUXEO_SCHEMA_FIELDS.fil.typ]: NUXEO_VOCAB_IDS.filTyp.huvudfil,
        } as unknown as NuxeoFileDocument['properties'],
      });
      const otherFile = makeNuxeoDocument<NuxeoFileDocument['properties']>({
        uid: 'other-file-uid',
        type: 'Fil',
        properties: {
          [NUXEO_SCHEMA_FIELDS.fil.typ]: NUXEO_VOCAB_IDS.filTyp.bilaga,
        } as unknown as NuxeoFileDocument['properties'],
      });
      apiSpy.getHandlingWithFile.and.returnValue(
        of(makeSearchResult<NuxeoFileDocument>({ entries: [otherFile, mainFile] }))
      );
      component.loadCaseDetails();
      expect(component.selectedFile()?.uid).toBe('main-file-uid');
    });

    it('sets selectedFile to null when no hauptfil found', () => {
      const otherFile = makeNuxeoDocument<NuxeoFileDocument['properties']>({
        type: 'Fil',
        properties: {
          [NUXEO_SCHEMA_FIELDS.fil.typ]: NUXEO_VOCAB_IDS.filTyp.bilaga,
        } as unknown as NuxeoFileDocument['properties'],
      });
      apiSpy.getHandlingWithFile.and.returnValue(of(makeSearchResult<NuxeoFileDocument>({ entries: [otherFile] })));
      component.loadCaseDetails();
      expect(component.selectedFile()).toBeNull();
    });

    it('resets selectedFileIds on load', () => {
      component.selectedFileIds.set(new Set(['old-id']));
      apiSpy.getHandlingWithFile.and.returnValue(of(makeSearchResult({ entries: [] })));
      component.loadCaseDetails();
      expect(component.selectedFileIds().size).toBe(0);
    });
  });

  describe('toggleSubscription', () => {
    it('calls subscribe when not subscribed and updates state', () => {
      component.isSubscribed.set(false);
      const updatedDoc = makeNuxeoDocument({
        properties: {
          [NUXEO_SCHEMA_FIELDS.notif.notifications]: [{ subscribers: ['user:user1'] }],
        } as unknown as NuxeoProperties,
      });
      notificationSpy.subscribe.and.returnValue(of(updatedDoc));

      component.toggleSubscription();

      expect(notificationSpy.subscribe).toHaveBeenCalledWith('handling-1');
      expect(component.isSubscribed()).toBeTrue();
    });

    it('calls unsubscribe when subscribed and updates state', () => {
      component.isSubscribed.set(true);
      const updatedDoc = makeNuxeoDocument({
        properties: {
          [NUXEO_SCHEMA_FIELDS.notif.notifications]: [],
        } as unknown as NuxeoProperties,
      });
      notificationSpy.unsubscribe.and.returnValue(of(updatedDoc));

      component.toggleSubscription();

      expect(notificationSpy.unsubscribe).toHaveBeenCalledWith('handling-1');
      expect(component.isSubscribed()).toBeFalse();
    });

    it('shows error notification when subscription fails', () => {
      component.isSubscribed.set(false);
      notificationSpy.subscribe.and.returnValue(throwError(() => new Error('error')));

      component.toggleSubscription();

      expect(storeMock.notification().variation).toBe('danger');
    });
  });

  describe('toggleLockState', () => {
    it('calls lockService.toggleAndUpdate', () => {
      component.toggleLockState();
      expect(lockSpy.toggleAndUpdate).toHaveBeenCalledWith(
        component.document(),
        component.isLockedByUser,
        component.reloadDocument
      );
    });
  });

  describe('copyLink', () => {
    it('calls shareLinkService.copyDocumentLink', () => {
      component.copyLink();
      expect(shareLinkSpy.copyDocumentLink).toHaveBeenCalledWith('handling-1', jasmine.any(Function));
    });
  });

  describe('buttons computed', () => {
    it('returns base buttons when document is not locked', () => {
      const doc = makeNuxeoDocument({
        uid: 'handling-1',
        path: '/default-domain/workspaces/case-1/handling-1',
        contextParameters: { runningWorkflows: [], pendingTasks: [] },
        properties: { [NUXEO_SCHEMA_FIELDS.notif.notifications]: [] } as unknown as NuxeoProperties,
      });
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      const buttons = component.buttons();
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('returns restricted buttons when locked by another user (not admin)', () => {
      const doc = makeNuxeoDocument({
        uid: 'handling-1',
        path: '/default-domain/workspaces/case-1/handling-1',
        lockOwner: 'other-user',
        contextParameters: { runningWorkflows: [], pendingTasks: [] },
        properties: { [NUXEO_SCHEMA_FIELDS.notif.notifications]: [] } as unknown as NuxeoProperties,
      });
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();

      const buttons = component.buttons();
      expect(buttons.length).toBe(4);
    });

    it('returns base buttons when locked by current user', () => {
      const doc = makeNuxeoDocument({
        uid: 'handling-1',
        path: '/default-domain/workspaces/case-1/handling-1',
        lockOwner: 'user1',
        contextParameters: { runningWorkflows: [], pendingTasks: [] },
        properties: { [NUXEO_SCHEMA_FIELDS.notif.notifications]: [] } as unknown as NuxeoProperties,
      });
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      const buttons = component.buttons();
      expect(buttons.length).toBeGreaterThan(4);
    });
  });

  describe('setBaseButtons', () => {
    it('uses unlock preset when isLockedByUser is true', () => {
      component.isLockedByUser.set(true);
      component.setBaseButtons();
      expect(component.baseButtons().length).toBeGreaterThan(0);
    });

    it('uses favoriteActive preset when inFavorites is true', () => {
      component.inFavorites.set(true);
      component.setBaseButtons();
      expect(component.baseButtons().length).toBeGreaterThan(0);
    });

    it('uses stopNotify preset when isSubscribed is true', () => {
      component.isSubscribed.set(true);
      component.setBaseButtons();
      expect(component.baseButtons().length).toBeGreaterThan(0);
    });
  });

  describe('editForm', () => {
    it('emits reloadDocument and closes edit page on success', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      customMetaSpy.saveDefinitionsThenDocument.and.returnValue(of(makeNuxeoDocument()));

      component.isEditPageOpen.set(true);
      component.editForm({ title: 'new title' });

      expect(reloadSpy).toHaveBeenCalled();
      expect(component.isEditPageOpen()).toBeFalse();
    });

    it('shows error notification on save failure', () => {
      const error = { error: { violations: [{ message: 'Validation error' }] } };
      customMetaSpy.saveDefinitionsThenDocument.and.returnValue(throwError(() => error));

      component.editForm({ title: 'bad' });

      expect(storeMock.notification().variation).toBe('danger');
      expect(storeMock.notification().text).toBe('Validation error');
    });
  });

  describe('updateDropdownValues', () => {
    it('calls getSuggestions for handlingstyp field', () => {
      const getSuggestionsSpy = spyOn(component, 'getSuggestions');
      component.updateDropdownValues({ fieldName: 'handlingstyp', value: 'typ-1' });
      expect(getSuggestionsSpy).toHaveBeenCalledWith(
        'handlingType',
        'docSuggestion',
        '_',
        'Handlingstyp',
        'Handling',
        'typ-1'
      );
    });

    it('calls getSuggestions for ansvarigOrg field', () => {
      const getSuggestionsSpy = spyOn(component, 'getSuggestions');
      component.updateDropdownValues({ fieldName: 'ansvarigOrg', value: 'org-1' });
      expect(getSuggestionsSpy).toHaveBeenCalledWith(
        'ansvarigOrg',
        'docSuggestion',
        '_',
        'Organisationsdel',
        'Handling',
        'org-1'
      );
    });

    it('does nothing for unknown field', () => {
      const getSuggestionsSpy = spyOn(component, 'getSuggestions');
      component.updateDropdownValues({ fieldName: 'unknown', value: 'val' });
      expect(getSuggestionsSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateReferences', () => {
    it('calls editForm with arende property key and empty array when no references', () => {
      const editFormSpy = spyOn(component, 'editForm');
      component.updateReferences([], 'arende', 'arende');
      expect(editFormSpy).toHaveBeenCalled();
    });

    it('calls editForm with handlings property key and mapped references', () => {
      const editFormSpy = spyOn(component, 'editForm');
      const refs = [{ caseRef: 'uid-1', comment: 'note', type: 'ref-type' }];
      component.updateReferences(refs, 'handlings', 'handling');
      expect(editFormSpy).toHaveBeenCalled();
    });
  });

  describe('saveGeneralWorkflowForm', () => {
    it('sets generalWorkflowFormValue signal', () => {
      component.saveGeneralWorkflowForm({ handlaggare: 'user-a', registrator: 'user-b' });
      expect(component.generalWorkflowFormValue()['handlaggare']).toBe('user-a');
    });
  });

  describe('startWorkflow', () => {
    it('calls createWorkflow and emits reloadDocument', () => {
      const reloadSpy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(reloadSpy);
      (apiSpy.createWorkflow as jasmine.Spy).and.returnValue(of(makeWorkflowInfo()));

      component.startWorkflow();

      expect(apiSpy.createWorkflow).toHaveBeenCalledWith('handling-1', jasmine.any(Object));
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('uses generalWorkflowFormValue when provided', () => {
      component.saveGeneralWorkflowForm({ registrator: 'reg-user', handlaggare: 'hand-user' });
      (apiSpy.createWorkflow as jasmine.Spy).and.returnValue(of(makeWorkflowInfo()));

      component.startWorkflow();

      const call = apiSpy.createWorkflow.calls.mostRecent();
      expect(
        (call.args[1] as { variables: { registrator?: string; handlaggare?: string } }).variables.registrator
      ).toBe('reg-user');
      expect(
        (call.args[1] as { variables: { registrator?: string; handlaggare?: string } }).variables.handlaggare
      ).toBe('hand-user');
    });
  });

  describe('getLifecycleTransitions', () => {
    it('updates handlingssteg suggestions', () => {
      apiSpy.getLifecycleTransitions.and.returnValue(
        of(
          makeTransitions({
            currentState: 'project',
            currentStateLabel: 'Project',
            transitions: [{ name: 'to_active', destinationStateLabel: 'Active', destinationState: 'active' }],
          })
        )
      );
      component.getLifecycleTransitions();
      const suggestions = component.suggestions();
      expect(suggestions['handlingssteg']).toBeTruthy();
      expect(suggestions['handlingssteg'].length).toBe(2);
    });
  });

  describe('getGeneralWorkfows', () => {
    it('sets generalWorkflowMenu when result contains Handling entry', () => {
      const children = [{ id: 'action-1', displayLabel: 'Action 1' }];
      (apiSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((vocab: string) => {
        if (vocab === 'AtgarderAllmannaArbetsflodet') {
          return of([{ displayLabel: 'Handling', children }]);
        }
        return of([]);
      });
      component.getGeneralWorkfows();
      expect(component.generalWorkflowMenu()).toEqual(children as unknown as GeneralWorkflowVocabulary[]);
    });

    it('does not update menu when no Handling entry found in result', () => {
      (apiSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((_vocab: string) => of(null));
      const initialMenu = component.generalWorkflowMenu();
      component.getGeneralWorkfows();

      expect(component.generalWorkflowMenu()).toEqual(initialMenu);
    });
  });

  describe('checkDocumentInCollections', () => {
    it('returns false when collections are empty', done => {
      apiSpy.getCollections.and.returnValue(of([]));
      component.checkDocumentInCollections('some-uid').subscribe(result => {
        expect(result).toBeFalse();
        done();
      });
    });

    it('returns true when document is found in a collection', done => {
      const collection: CollectionCardItem = { uid: 'col-1', title: 'Col 1', date: new Date(), property: '' };
      const docInCollection = makeNuxeoDocument({ uid: 'target-doc' });
      apiSpy.getCollections.and.returnValue(of([collection]));
      apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [docInCollection] })));

      component.checkDocumentInCollections('target-doc').subscribe(result => {
        expect(result).toBeTrue();
        done();
      });
    });

    it('returns false when document is not in any collection', done => {
      const collection: CollectionCardItem = { uid: 'col-1', title: 'Col 1', date: new Date(), property: '' };
      apiSpy.getCollections.and.returnValue(of([collection]));
      apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [] })));

      component.checkDocumentInCollections('target-doc').subscribe(result => {
        expect(result).toBeFalse();
        done();
      });
    });
  });

  describe('caseReferencesTableData', () => {
    it('returns empty array when internArendereferens is not set', () => {
      expect(component.caseReferencesTableData()).toEqual([]);
    });

    it('maps internArendereferens to ArendeRefOption format', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.handling.internArendereferens]: [
          {
            referenskommentar: 'comment-1',
            arende: { uid: 'arende-uid-1' },
            referenstyp: { id: 'ref-type-1' },
          },
        ],
      });
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      const data = component.caseReferencesTableData();
      expect(data.length).toBe(1);
      expect(data[0].caseRef).toBe('arende-uid-1');
      expect(data[0].comment).toBe('comment-1');
    });
  });

  describe('handlingReferencesTableData', () => {
    it('returns empty array when internHandlingsreferens is not set', () => {
      expect(component.handlingReferencesTableData()).toEqual([]);
    });

    it('maps internHandlingsreferens to ArendeRefOption format', () => {
      const doc = makeDoc({
        [NUXEO_SCHEMA_FIELDS.handling.internHandlingsreferens]: [
          {
            referenskommentar: 'comment-h',
            handling: { uid: 'handling-ref-uid' },
            referenstyp: { id: 'ref-type-h' },
          },
        ],
      });
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      const data = component.handlingReferencesTableData();
      expect(data.length).toBe(1);
      expect(data[0].caseRef).toBe('handling-ref-uid');
      expect(data[0].comment).toBe('comment-h');
    });
  });

  describe('editConfig computed', () => {
    it('sets optionsSignal for handlingstyp dropdown-search field', () => {
      component.suggestions.update(s => ({ ...s, handlingType: [{ id: 'ht-1', label: 'HT1' }] }));
      const config = component.editConfig();
      const allFields = config.flatMap(g => g.groupFields);
      const htField = allFields.find(f => f.name === 'handlingstyp');
      if (htField && htField.type === 'dropdown-search') {
        expect(htField.props?.['optionsSignal']).toBeDefined();
      }
    });

    it('returns config without crashing when suggestions are empty', () => {
      const config = component.editConfig();
      expect(Array.isArray(config)).toBeTrue();
    });
  });

  describe('formatEditForm', () => {
    it('calls editForm with mapped properties for inkommande direction', () => {
      const editFormSpy = spyOn(component, 'editForm');
      const formResult = {
        handlingDetails: {
          handlingsnamn: 'Name',
          handlingsriktning: NUXEO_VOCAB_IDS.arendeRiktning?.inkommande ?? 'Inkommande',
          inkommen_datum: [new Date('2024-01-01')],
          upprattad_datum: [new Date('2024-01-02')],
          handlingstyp: [{ id: 'typ-id', label: 'Typ' }],
        },
        actor: { ansvarigOrg: [{ id: 'org-id' }] },
        secret: { lagrumsbeskrivning: [{ id: 'lag-id' }], secretClass: null, secret: null, gdpr: false },
        overview: { beslut: null, beslutDate: null, handlingssteg: null, beslutsfattare: null },
        comment: { kommentarer: null, makuleringskommentar: null },
        bevaras: { bevaras: null, arkiverad_datum: null, gallrad_datum: null, makulerad_datum: null },
        avsandare: [],
        mottagare: [],
        internArendereferens: [],
        internHandlingsreferens: [],
        externReferens: [],
        customMetadataValues: null,
        customMetadataDefinitionDocId: null,
        customMetadataDefinitions: [],
      };
      component.formatEditForm(formResult as unknown as EditHandlingResult);
      expect(editFormSpy).toHaveBeenCalled();
    });

    it('calls followLifecycleTransition when handlingssteg has changed', () => {
      spyOn(component, 'editForm');
      component.currentHandlingState.set({ id: 'project', label: 'Project' });
      const formResult = {
        handlingDetails: { handlingsriktning: 'Upprattad', handlingstyp: 'typ-plain' },
        actor: { ansvarigOrg: 'org-direct' },
        secret: { lagrumsbeskrivning: null, secretClass: null, secret: null, gdpr: false },
        overview: { beslut: null, beslutDate: null, handlingssteg: 'active', beslutsfattare: null },
        comment: { kommentarer: null, makuleringskommentar: null },
        bevaras: { bevaras: null, arkiverad_datum: null, gallrad_datum: null, makulerad_datum: null },
        avsandare: [],
        mottagare: [],
        internArendereferens: [],
        internHandlingsreferens: [],
        externReferens: [],
        customMetadataValues: null,
        customMetadataDefinitionDocId: null,
        customMetadataDefinitions: [],
      };
      component.formatEditForm(formResult as unknown as EditHandlingResult);
      expect(apiSpy.followLifecycleTransition).toHaveBeenCalledWith('handling-1', 'active');
    });

    it('includes customMetadata values in form properties when provided', () => {
      const editFormSpy = spyOn(component, 'editForm');
      const metadataValues = [{ key: 'field1', value: 'val1' }];
      const formResult = {
        handlingDetails: { handlingsriktning: 'Upprattad', handlingstyp: null },
        actor: { ansvarigOrg: null },
        secret: { lagrumsbeskrivning: null, secretClass: null, secret: null, gdpr: false },
        overview: { beslut: null, beslutDate: null, handlingssteg: null, beslutsfattare: null },
        comment: { kommentarer: null, makuleringskommentar: null },
        bevaras: { bevaras: null, arkiverad_datum: null, gallrad_datum: null, makulerad_datum: null },
        avsandare: [],
        mottagare: [],
        internArendereferens: [],
        internHandlingsreferens: [],
        externReferens: [],
        customMetadataValues: metadataValues,
        customMetadataDefinitionDocId: 'def-doc',
        customMetadataDefinitions: [],
      };
      component.formatEditForm(formResult as unknown as EditHandlingResult);
      const callArgs = editFormSpy.calls.mostRecent().args[0];
      expect(callArgs[NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt]).toEqual(metadataValues);
    });
  });

  describe('downloadThumbnail / downloadXML / downloadZip', () => {
    it('downloadThumbnail returns correct URL', () => {
      expect(component.downloadThumbnail()).toContain('handling-1');
      expect(component.downloadThumbnail()).toContain('@rendition/thumbnail');
    });

    it('downloadXML returns correct URL', () => {
      expect(component.downloadXML()).toContain('handling-1');
      expect(component.downloadXML()).toContain('@rendition/xmlExport');
    });

    it('downloadZip returns correct URL', () => {
      expect(component.downloadZip()).toContain('handling-1');
      expect(component.downloadZip()).toContain('@rendition/zipTreeExport');
    });
  });

  describe('ngOnDestroy', () => {
    it('sets openPage to null on destroy', () => {
      component.ngOnDestroy();
      expect(storeMock.openPage()).toBeNull();
    });
  });

  describe('documentLink computed', () => {
    it('calls shareLinkService.buildDocLink with document uid', () => {
      const link = component.documentLink();
      expect(shareLinkSpy.buildDocLink).toHaveBeenCalledWith('handling-1');
      expect(link).toBe('http://link');
    });
  });

  describe('loadLagrumSuggestionsFromCase', () => {
    it('sets lagrum suggestions on success', () => {
      const options = [{ id: 'lag-1', label: 'Lag 1' }];
      apiSpy.getLagrumOptions.and.returnValue(of(options));

      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.suggestions()['lagrum']).toBeTruthy();
    });
  });

  describe('getBevarasSuggestions', () => {
    it('sets bevaras suggestions from flat entries', () => {
      (apiSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((vocab: string) => {
        if (vocab === 'BevarasGallras') {
          return of([{ label: 'Bevaras', id: 'bev-1', children: null }]);
        }
        return of([]);
      });
      component.getBevarasSuggestions();
      expect(component.suggestions()['bevaras']).toBeTruthy();
    });

    it('sets bevaras suggestions from nested entries with children', () => {
      (apiSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((vocab: string) => {
        if (vocab === 'BevarasGallras') {
          return of([
            {
              label: 'Parent',
              id: 'parent',
              children: [
                { absoluteLabel: 'Child 1', computedId: 'child-1' },
                { absoluteLabel: 'Child 2', computedId: 'child-2' },
              ],
            },
          ]);
        }
        return of([]);
      });
      component.getBevarasSuggestions();
      expect(component.suggestions()['bevaras']).toBeTruthy();
      expect(component.suggestions()['bevaras'].length).toBe(2);
    });
  });

  describe('generalWorkflowVocabComputed', () => {
    it('returns flat list of children from all menu items', () => {
      const children = [{ id: 'act-1', displayLabel: 'Act 1' }];
      component.generalWorkflowMenu.set([{ children } as unknown as GeneralWorkflowVocabulary]);
      expect(component.generalWorkflowVocabComputed().length).toBe(1);
    });
  });

  describe('selectedFileIdList computed', () => {
    it('converts selectedFileIds Set to array', () => {
      component.selectedFileIds.set(new Set(['file-a', 'file-b']));
      const list = component.selectedFileIdList();
      expect(list).toContain('file-a');
      expect(list).toContain('file-b');
    });
  });
});
