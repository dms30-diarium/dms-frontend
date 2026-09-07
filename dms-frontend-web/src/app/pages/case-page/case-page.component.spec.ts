import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CasePageComponent } from './case-page.component';
import {
  ArendeExtendedProperties,
  HandlingExtendedProperties,
  HandlingstypProperties,
  NuxeoDocument,
  NuxeoProperties,
  TemplateSourceProperties,
} from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { ViewMode } from '@app/shared/models/view-mode.enum';
import { makeNuxeoDocument, makeSearchResult, makeWorkflowInfo } from '@app/shared/testing/mock-factories';
import { CollectionCardItem } from '@app/shared/components/collection-card/collection-card.component';
import { GeneralWorkflowAction, Transitions } from './case-types';
import { PrintableDocument } from '@app/core/services/print.service';
import { CaseEditOptionsService } from '@app/core/services/case-edit-options.service';
import { DraggableSectionOrderService } from '@app/core/services/draggable-section-order.service';
import { UiModeService } from '@app/core/services/ui-mode.service';

const caseDocument: NuxeoDocument<ArendeExtendedProperties> = {
  'entity-type': 'document',
  repository: 'default',
  uid: 'case-1',
  path: '/default-domain/workspaces/case-1',
  type: 'Arende',
  name: 'case-1',
  title: 'Case 1',
  state: 'open',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {
    [NUXEO_SCHEMA_FIELDS.arende.arendemening]: 'Case sentence',
  },
};

const baseDocument = (uid: string): NuxeoDocument<NuxeoProperties> => ({
  'entity-type': 'document',
  repository: 'default',
  uid,
  path: `/default-domain/workspaces/${uid}`,
  type: 'Handling',
  name: uid,
  title: uid,
  state: 'open',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {},
});

const handlingTypeDocument: NuxeoDocument<HandlingstypProperties> = {
  'entity-type': 'document',
  repository: 'default',
  uid: 'handling-type-1',
  path: '/default-domain/workspaces/handling-type-1',
  type: 'Handlingstyp',
  name: 'handling-type-1',
  title: 'Handling type',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {},
};

const extendedHandlingDocument = (uid: string): NuxeoDocument<HandlingExtendedProperties> => ({
  'entity-type': 'document',
  repository: 'default',
  uid,
  path: `/default-domain/workspaces/${uid}`,
  type: 'Handling',
  name: uid,
  title: uid,
  state: 'open',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T00:00:00.000Z',
  properties: {
    [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: handlingTypeDocument,
    [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: uid,
    [NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats]: '',
    [NUXEO_SCHEMA_FIELDS.handling.digitaltOriginal]: '',
    [NUXEO_SCHEMA_FIELDS.handling.kommentarer]: '',
  },
});

describe('CasePageComponent', () => {
  let component: CasePageComponent;
  let fixture: ComponentFixture<CasePageComponent>;
  let caseEditOptions: CaseEditOptionsService;
  let draggableSectionOrderService: DraggableSectionOrderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CasePageComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(CasePageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CasePageComponent);
    fixture.componentRef.setInput('document', caseDocument);
    component = fixture.componentInstance;
    caseEditOptions = TestBed.inject(CaseEditOptionsService);
    draggableSectionOrderService = TestBed.inject(DraggableSectionOrderService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates pagination, view modes, filters and search signals', () => {
    spyOn(component.searchService, 'extractTerm').and.returnValue('invoice');

    component.onInternHandlingsPageChange(2);
    component.onUtgaendeInternHandlingsPageChange(3);
    component.onAllHandlingsPageChange(4);
    component.onHandlingarCardsPageChange(-1);
    component.onHandlingarPageSizeSelect('25');
    component.onInkommandeHandlingarPageSizeSelect('15');
    component.onUtgaendeInternHandlingarPageSizeSelect('30');
    component.onAllHandlingarPageSizeSelect('50');
    component.onArbetsmaterialToggleButtonChange(0);
    component.onArbetsmaterialToggleButtonChange(1);
    component.onHandlingarToggleButtonChange(0);
    component.onHandlingarToggleButtonChange(1);
    component.onHandlingarTableModeChange('all');
    component.onHandlingarSearch({ target: { value: 'invoice' } });
    component.onHandlingarFiltersChanged({ checked: ['folder-1'] });
    component.onArbetsmaterialCardsPageChange(-2);
    component.onArbetsmaterialPageSizeSelect(10);

    expect(component.pageInternHandlingsTable()).toBe(0);
    expect(component.pageUtgaendeInternHandlingsTable()).toBe(0);
    expect(component.pageAllHandlingsTable()).toBe(0);
    expect(component.pageHandlingarCards()).toBe(0);
    expect(component.handlingarPageSize()).toBe(25);
    expect(component.inkommandeHandlingarPageSize()).toBe(15);
    expect(component.utgaendeInternHandlingarPageSize()).toBe(30);
    expect(component.allHandlingarPageSize()).toBe(50);
    expect(component.arbetsmaterialViewMode()).toBe(ViewMode.Grid);
    expect(component.handlingarViewMode()).toBe(ViewMode.Grid);
    expect(component.handlingarTableMode()).toBe('all');
    expect(component.handlingarSearchTerm()).toBe('invoice');
    expect(component.handlingarPathFilter()).toBe('folder-1');
    expect(component.arbetsmaterialPageSize()).toBe(10);
    expect(component.pageArbetsmaterialCards()).toBe(0);
  });

  it('maps column options and delegates sort changes', () => {
    spyOn(component.tableSortService, 'applySortSignals').and.callThrough();

    component.pageArbetsmaterialCards.set(2);
    component.pageInternHandlingsTable.set(2);
    component.pageUtgaendeInternHandlingsTable.set(2);
    component.pageAllHandlingsTable.set(2);
    component.onArbetsmaterialSortChange({ sortBy: 'title', sortOrder: 'asc' });
    component.onInkommandeHandlingarSortChange({ sortBy: 'title', sortOrder: 'asc' });
    component.onUtgaendeInternHandlingarSortChange({ sortBy: 'title', sortOrder: 'asc' });
    component.onAllHandlingarSortChange({ sortBy: 'title', sortOrder: 'asc' });

    expect(component.getDefaultColumnOptions().length).toBe(component.CUSTOM_COLS.length);
    expect(component.getArbetsmaterialDefaultColumnOptions().length).toBe(component.arbetsmaterialTableConfig.length);
    expect(component.getHandlingarDefaultColumnOptions().length).toBe(component.handlingarTableConfig.length);
    expect(component.tableSortService.applySortSignals).toHaveBeenCalledTimes(4);
    expect(component.pageArbetsmaterialCards()).toBe(0);
    expect(component.pageInternHandlingsTable()).toBe(0);
    expect(component.pageUtgaendeInternHandlingsTable()).toBe(0);
    expect(component.pageAllHandlingsTable()).toBe(0);
  });

  it('tracks selected files and handling selections', () => {
    const draft = extendedHandlingDocument('draft-1');
    const incoming = baseDocument('handling-1');
    const outgoing = baseDocument('handling-2');
    const incomingExtended = extendedHandlingDocument('handling-1');
    const outgoingExtended = extendedHandlingDocument('handling-2');

    component.utkasts.set([draft]);
    component.internHandlings.set([incoming]);
    component.utgaendeInternHandlings.set([outgoing]);
    component.allHandlings.set([incoming, outgoing]);

    component.onItemSelect(incomingExtended, 'handling');
    component.onItemSelect(outgoingExtended);
    component.onItemSelect(incomingExtended, 'handling');
    component.onArbetsmaterialTableSelect(['draft-1']);
    component.onInternHandlingarTableSelect(['handling-1']);
    component.onUtgaendeInternHandlingarTableSelect(['handling-2']);
    component.onAllHandlingarTableSelect(['handling-1', 'handling-2']);

    expect(component.selectedFiles()).toEqual(['draft-1', 'handling-1', 'handling-2']);
    expect(component.selectedHandlings()).toEqual(['handling-1', 'handling-2']);

    component.clearSelectedFiles();

    expect(component.selectedFiles()).toEqual([]);
    expect(component.selectedHandlings()).toEqual([]);
  });

  it('opens dialogs and delegates simple navigation actions', () => {
    spyOn(component.router, 'navigate');
    spyOn(component.shareLinkService, 'copyDocumentLink').and.callFake((_uid, copied) => copied(true));

    component.downloadAllFiles();
    component.openDocument('doc-1');
    component.handleServiceNoteCreated(baseDocument('note-1'));
    component.copyLink();

    expect(component.isDownloadAllDialogOpen()).toBeTrue();
    expect(component.router.navigate).toHaveBeenCalledWith(['/doc/', 'doc-1']);
    expect(component.router.navigate).toHaveBeenCalledWith(['/doc/', 'note-1']);
    expect(component.linkWasCopied()).toBeTrue();
  });

  it('loads lifecycle transitions into suggestions and current state', () => {
    const transitions: Transitions = {
      allowedTransitions: ['close'],
      currentState: 'open',
      currentStateLabel: 'case.open',
      transitions: [{ name: 'close', destinationState: 'closed', destinationStateLabel: 'case.closed' }],
    };
    spyOn(component.apiService, 'getLifecycleTransitions').and.returnValue(of(transitions));
    spyOn(component.store, 'getValue').and.callFake(key => `label:${key}`);

    component.getLifecycleTransitions();

    expect(component.suggestions()['arendesteg']).toEqual([
      { id: 'close', label: 'label:case.closed' },
      { id: 'open', label: 'label:case.open' },
    ]);
    expect(component.currentCaseState()).toEqual({ id: 'open', label: 'case.open' });
  });

  it('handles workflow task lookups, cancellation and review decisions', () => {
    const pendingTask = makeWorkflowInfo({
      id: 'task-1',
      workflowInstanceId: 'workflow-1',
      taskInfo: { taskActions: [{ name: 'approve', label: 'Approve', url: 'task/approve' }] },
    });
    const workflow = makeWorkflowInfo({
      id: 'workflow-1',
      workflowInstanceId: 'workflow-1',
      workflowModelName: NUXEO_VOCAB_IDS.arbetsflode.skickaForGranskning,
    });
    component.pendingTasks.set([pendingTask]);
    component.generalWorkflowCommentForm.controls['workflowComment'].setValue('Looks good');
    spyOn(component.apiService, 'deleteWorkflow').and.returnValue(of([]));
    spyOn(component.apiService, 'editWorkflow').and.returnValue(of(makeWorkflowInfo()));
    spyOn(component.reloadDocument, 'emit');

    expect(component.getTaskActions(workflow)).toEqual([{ name: 'approve', label: 'Approve', url: 'task/approve' }]);
    component.abortWorkflow(workflow);
    component.sendReviewDecision(NUXEO_VOCAB_IDS.arbetsflodeAtgard.upprata, workflow);

    expect(component.apiService.deleteWorkflow).toHaveBeenCalledWith('workflow-1');
    expect(component.apiService.editWorkflow).toHaveBeenCalledWith(
      'task-1',
      NUXEO_VOCAB_IDS.arbetsflodeAtgard.upprata,
      {
        id: 'task-1',
        'entity-type': 'task',
        variables: { kommentar: 'Looks good' },
      }
    );
    expect(component.generalWorkflowCommentForm.controls['workflowComment'].value).toBeNull();
    expect(component.reloadDocument.emit).toHaveBeenCalled();
  });

  it('sets review error notification and skips review decisions without a matching task', () => {
    const workflow = makeWorkflowInfo({ id: 'workflow-1', workflowInstanceId: 'workflow-1' });
    spyOn(component.apiService, 'editWorkflow').and.returnValue(throwError(() => new Error('failed')));

    component.pendingTasks.set([]);
    component.sendReviewDecision(NUXEO_VOCAB_IDS.arbetsflodeAtgard.upprata, workflow);

    expect(component.apiService.editWorkflow).not.toHaveBeenCalled();

    component.pendingTasks.set([makeWorkflowInfo({ id: 'task-1', workflowInstanceId: 'workflow-1' })]);
    component.sendReviewDecision(NUXEO_VOCAB_IDS.arbetsflodeAtgard.upprata, workflow);

    expect(component.store.notification().variation).toBe('danger');
  });

  it('marks cases ready to close and reports lifecycle errors', () => {
    spyOn(component.caseLifecycle, 'transitionToReadyToClose').and.returnValues(
      of(void 0),
      throwError(() => new Error('transition failed'))
    );
    spyOn(component, 'loadCaseDetails');
    spyOn(component.reloadDocument, 'emit');

    component.readyToCloseDecision.set(' Decision ');
    component.readyToCloseDecisionDate.set(' 2026-06-15 ');
    component.markReadyToClose();
    component.markReadyToClose();

    expect(component.caseLifecycle.transitionToReadyToClose).toHaveBeenCalledWith('case-1', 'open', {
      decision: 'Decision',
      decisionDate: '2026-06-15',
    });
    expect(component.loadCaseDetails).toHaveBeenCalledWith(caseDocument);
    expect(component.reloadDocument.emit).toHaveBeenCalled();
    expect(component.store.notification().variation).toBe('danger');
    expect(component.store.notification().text).toBe('transition failed');
  });

  it('closes cases with comments and handles warning-card actions', () => {
    spyOn(component.apiService, 'editDocument').and.returnValue(of(makeNuxeoDocument()));
    spyOn(component.apiService, 'closeCase').and.returnValue(of(makeNuxeoDocument()));
    spyOn(component, 'loadCaseDetails');
    spyOn(component.reloadDocument, 'emit');

    component.closeCaseComment.set(' close note ');
    component.closeCase();

    expect(component.apiService.editDocument).toHaveBeenCalledWith('case-1', {
      [NUXEO_SCHEMA_FIELDS.arende.allmanKommentar]: 'close note',
    });
    expect(component.apiService.closeCase).toHaveBeenCalledWith('case-1');

    component.warningActionType.set('closeCase');
    component.closeCaseComment.set('confirm note');
    component.handleWarningCardAction('confirm');

    expect(component.isWarningCardOpen()).toBeFalse();
    expect(component.warningActionType()).toBeNull();
    expect(component.closeCaseComment()).toBe('');
    expect(component.loadCaseDetails).toHaveBeenCalledWith(caseDocument);
    expect(component.reloadDocument.emit).toHaveBeenCalled();
  });

  it('toggles subscription state and handles subscription errors', () => {
    spyOn(component.notificationService, 'subscribe').and.returnValue(of(makeNuxeoDocument()));
    spyOn(component.notificationService, 'unsubscribe').and.returnValue(
      throwError(() => new Error('subscription failed'))
    );
    spyOn(component.reloadDocument, 'emit');

    component.isSubscribed.set(false);
    component.toggleSubscription();
    component.toggleSubscription();

    expect(component.notificationService.subscribe).toHaveBeenCalledWith('case-1');
    expect(component.notificationService.unsubscribe).toHaveBeenCalledWith('case-1');
    expect(component.isSubscribed()).toBeTrue();
    expect(component.reloadDocument.emit).toHaveBeenCalled();
    expect(component.store.notification().variation).toBe('danger');
  });

  it('exports all case handlingar through the myndighet ancestor and handles missing ancestors', () => {
    const myndighet = makeNuxeoDocument({ uid: 'myndighet-1', type: 'Myndighet' });
    spyOn(component.apiService, 'getAncestorsById').and.returnValues(of([myndighet]), of([]));
    spyOn(component.apiService, 'startZipExport').and.returnValue(of(new Blob(['zip'])));

    component.exportAllCaseHandlingar();
    component.exportAllCaseHandlingar();

    expect(component.apiService.startZipExport).toHaveBeenCalledWith('myndighet-1', 'case-1');
    expect(component.store.notification().variation).toBe('danger');
  });

  it('checks collection membership across returned collections', done => {
    const collectionA: CollectionCardItem = {
      uid: 'collection-a',
      title: 'Collection A',
      date: new Date('2026-06-15T00:00:00.000Z'),
      property: 'owner',
    };
    const collectionB: CollectionCardItem = {
      uid: 'collection-b',
      title: 'Collection B',
      date: new Date('2026-06-15T00:00:00.000Z'),
      property: 'owner',
    };
    spyOn(component.apiService, 'getCollections').and.returnValue(of([collectionA, collectionB]));
    spyOn(component.apiService, 'getCollectionDocuments').and.returnValues(
      of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'other-doc' })] })),
      of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'case-1' })] }))
    );

    component.checkDocumentInCollections('case-1').subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('loads handling lists and card data', () => {
    const handling = extendedHandlingDocument('handling-1');
    spyOn(component.apiService, 'getHandling').and.returnValues(
      of(makeSearchResult({ entries: [handling], totalSize: 1 })),
      of(makeSearchResult({ entries: [handling], totalSize: 1 })),
      of(makeSearchResult({ entries: [handling], totalSize: 1 })),
      of(makeSearchResult({ entries: [handling], totalSize: 1 }))
    );

    component.getInternHandlings(10, 0, 0, 'title', 'asc', 'term');
    component.getUtgaendeInternHandlings(10, 0, 0);
    component.getAllHandlings(10, 0, 0);
    component.loadCaseDetails(caseDocument);

    expect(component.internHandlingarTotal()).toBe(1);
    expect(component.utgaendeInternHandlingarTotal()).toBe(1);
    expect(component.allHandlingarTotal()).toBe(1);
    expect(component.handlingarCardsTotal()).toBe(1);
  });

  it('starts a general workflow with saved form values', () => {
    const action: GeneralWorkflowAction = {
      parent: 'Arende',
      ordering: 1,
      obsolete: 0,
      id: 'action-1',
      displayLabel: 'Action',
      label: 'Action',
      directoryName: 'AtgarderAllmannaArbetsflodet',
      properties: {
        parent: 'Arende',
        ordering: 1,
        obsolete: 0,
        id: 'action-1',
        label: 'Action',
      },
      'entity-type': 'directoryEntry',
      computedId: 'Arende/action-1',
      absoluteLabel: 'Arende/Action',
    };
    spyOn(component.apiService, 'createWorkflow').and.returnValue(of([]));
    spyOn(component.reloadDocument, 'emit');

    component.currentGeneralWorkflowAction.set({
      button: action,
      parent: { displayLabel: 'Arende', children: [action] },
    });
    component.saveGeneralWorkflowForm({
      registrator: 'registrator-1',
      handlaggare: 'handler-1',
      forfalloDatum: '2026-06-20',
      paminnelseDatum: '2026-06-18',
      comment: 'Start workflow',
    });
    component.startWorkflow();

    expect(component.apiService.createWorkflow).toHaveBeenCalledWith('case-1', {
      attachedDocumentIds: ['case-1'],
      'entity-type': 'workflow',
      workflowModelName: NUXEO_VOCAB_IDS.arbetsflode.allmanArbetsflode,
      variables: {
        registrator: 'registrator-1',
        handlaggare: 'handler-1',
        forfalloDatum: '2',
        paminnelseDatum: '2',
        valdAtgard: 'action-1',
        ursprungligKommentar: 'Start workflow',
      },
    });
    expect(component.reloadDocument.emit).toHaveBeenCalled();
  });

  it('toggles accordion state and destroys page state', () => {
    component.toggleAccordionBtn();
    component.onSectionToggled('details', false);
    component.ngOnDestroy();

    expect(component.accordionState()['details']).toBeFalse();
    expect(component.store.openPage()).toBeNull();
  });

  it('selects all handling rows and reports select-all fetch errors', () => {
    spyOn(component.apiService, 'getHandling').and.returnValues(
      of(makeSearchResult({ entries: [baseDocument('handling-1'), baseDocument('handling-2')], totalSize: 2 })),
      throwError(() => new Error('selection failed'))
    );

    component.internHandlingarTotal.set(2);
    component.onInternHandlingarTableSelectAll(true);
    component.onUtgaendeInternHandlingarTableSelectAll(false);

    expect(component.selectedFiles()).toEqual(['handling-1', 'handling-2']);
    expect(component.selectedHandlings()).toEqual(['handling-1', 'handling-2']);
    expect(component.store.notification().variation).toBe('danger');
  });

  it('updates references through edit form', () => {
    spyOn(component, 'editForm');

    component.updateReferences([{ type: 'ref-type', comment: 'Comment', caseRef: 'case-2' }], 'arende', 'arende');
    component.updateReferences([], 'handlings', 'handling');

    expect(component.editForm).toHaveBeenCalledWith({
      'arende:intern_arendereferens': [
        {
          referenstyp: 'ref-type',
          referenskommentar: 'Comment',
          arende: 'case-2',
        },
      ],
    });
    expect(component.editForm).toHaveBeenCalledWith({ 'arende:intern_handlingsreferens': [] });
  });

  it('edits forms through close, cancel and error branches', () => {
    spyOn(component.apiService, 'editDocument').and.returnValues(
      of(makeNuxeoDocument()),
      of(makeNuxeoDocument()),
      throwError(() => new Error('edit failed'))
    );
    spyOn(component.caseLifecycle, 'transitionToClosed').and.returnValue(of(void 0));
    spyOn(component.apiService, 'markCaseCancelled').and.returnValue(of(makeNuxeoDocument()));
    spyOn(component, 'loadCaseDetails');
    spyOn(component.reloadDocument, 'emit');

    component.editForm({ [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: { id: NUXEO_VOCAB_IDS.arendestatus.stangt } });
    component.editForm({ [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: { id: NUXEO_VOCAB_IDS.arendestatus.makulerat } });
    component.editForm({ [NUXEO_SCHEMA_FIELDS.arende.allmanKommentar]: 'comment' });

    expect(component.caseLifecycle.transitionToClosed).toHaveBeenCalledWith('case-1', 'open');
    expect(component.apiService.markCaseCancelled).toHaveBeenCalledWith('case-1');
    expect(component.loadCaseDetails).toHaveBeenCalledWith(caseDocument);
    expect(component.reloadDocument.emit).toHaveBeenCalled();
    expect(component.store.notification().variation).toBe('danger');
  });

  it('blocks closing edit form when drafts exist', () => {
    component.utkasts.set([extendedHandlingDocument('draft-1')]);

    component.editForm({ [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: { id: NUXEO_VOCAB_IDS.arendestatus.stangt } });

    expect(component.isUtkastCloseBlockedOpen()).toBeTrue();
  });

  it('updates checklist, favorites and deletes selected items', () => {
    spyOn(component.apiService, 'editDocument').and.returnValue(of(makeNuxeoDocument()));
    spyOn(component.apiService, 'deleteSeveralDocument').and.returnValue(of([makeNuxeoDocument()]));
    spyOn(component.favoritesService, 'toggleFavorites').and.returnValue(of(makeNuxeoDocument()));
    spyOn(component, 'loadCaseDetails');
    spyOn(component.reloadDocument, 'emit');
    fixture.componentRef.setInput(
      'document',
      makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'case-1',
        type: 'Arende',
        properties: {
          [NUXEO_SCHEMA_FIELDS.checklista.checklistesteg]: [
            { namn: 'Step 1', notering: 'Note 1', klar: false },
            { namn: 'Step 2', notering: 'Note 2', klar: false },
          ],
        },
      })
    );

    component.selectedFiles.set(['doc-1', 'doc-2']);
    component.updateChecklist(new CustomEvent('change', { detail: { target: { checked: true } } }), {
      namn: 'Step 1',
      notering: 'Note 1',
    });
    component.addToFavorites();
    component.deleteSelectedItems();

    expect(component.apiService.editDocument).toHaveBeenCalled();
    expect(component.favoritesService.toggleFavorites).toHaveBeenCalledWith('doc-1', false);
    expect(component.favoritesService.toggleFavorites).toHaveBeenCalledWith('doc-2', false);
    expect(component.apiService.deleteSeveralDocument).toHaveBeenCalledWith(['doc-1', 'doc-2']);
    expect(component.selectedFiles()).toEqual([]);
    expect(component.reloadDocument.emit).toHaveBeenCalled();
  });

  it('downloads selected files as zip', () => {
    const anchor = document.createElement('a');
    spyOn(component.apiService, 'downloadBulk').and.returnValue(of(new Blob(['zip'])));
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:selected');
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(anchor, 'click');

    component.selectedFiles.set(['doc-1']);
    component.downloadSelectedAsZip();

    expect(component.apiService.downloadBulk).toHaveBeenCalledWith(['doc-1']);
    expect(anchor.download).toBe('selection.zip');
    expect(anchor.click).toHaveBeenCalled();
  });

  it('prints selected files and warns when nothing is printable', () => {
    const doc = makeNuxeoDocument({ uid: 'doc-1', title: 'Doc 1' });
    const printable: PrintableDocument = { file: doc, url: '/print/doc-1' };
    spyOn(component.apiService, 'getDocumentById').and.returnValues(of(doc), of(doc));
    spyOn(component.printService, 'getPrintableDocuments').and.returnValues([printable], []);
    spyOn(component.printService, 'printDocuments').and.callFake((_queue, onBeforePrint, onDone) => {
      onBeforePrint(doc);
      onDone();
    });

    component.selectedFiles.set(['doc-1']);
    component.printSelectedFiles();
    component.printSelectedFiles();

    expect(component.printService.printDocuments).toHaveBeenCalled();
    expect(component.store.notification().variation).toBe('warning');
  });

  describe('ngOnInit', () => {
    it('loads suggestions, base buttons, favorites, and lock state', () => {
      spyOn(component.favoritesService, 'checkInFavorites').and.returnValue(of(true));
      spyOn(component.apiService, 'DMSDocumentSuggestion').and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'type-1', title: 'Type 1', path: '/p1' })] }))
      );
      spyOn(component.apiService, 'getDirectorySuggestions').and.returnValue(
        of([{ displayLabel: 'Arende', children: [{ id: 'a1', label: 'Action 1' }] }])
      );
      spyOn(caseEditOptions, 'getDirectorySuggestions').and.returnValue(of([]));
      spyOn(caseEditOptions, 'getLagrumSuggestions').and.returnValue(of([]));
      spyOn(caseEditOptions, 'getBevarasSuggestions').and.returnValue(of([]));
      spyOn(caseEditOptions, 'getDocumentSuggestions').and.returnValue(of([]));
      spyOn(caseEditOptions, 'getUserSuggestions').and.returnValue(of([]));
      spyOn(component.lockService, 'initLockState');

      component.ngOnInit();

      expect(component.store.openPage()).toBe('case');
      expect(component.inFavorites()).toBeTrue();
      expect(component.suggestions()['caseType']).toEqual([
        jasmine.objectContaining({ label: 'Type 1', id: 'type-1', value: 'type-1' }),
      ] as never);
      expect(component.generalWorkflowMenu()).toEqual([{ id: 'a1', label: 'Action 1' }] as never);
      expect(component.lockService.initLockState).toHaveBeenCalled();
      expect(component.baseButtons().length).toBeGreaterThan(0);
    });

    it('sets danger notification when a suggestion load fails', () => {
      spyOn(component.favoritesService, 'checkInFavorites').and.returnValue(of(false));
      spyOn(component.apiService, 'DMSDocumentSuggestion').and.returnValue(of(makeSearchResult({ entries: [] })));
      spyOn(component.apiService, 'getDirectorySuggestions').and.returnValue(
        of([{ displayLabel: 'Arende', children: [] }])
      );
      spyOn(caseEditOptions, 'getDirectorySuggestions').and.returnValue(throwError(() => new Error('boom')));
      spyOn(caseEditOptions, 'getLagrumSuggestions').and.returnValue(of([]));
      spyOn(caseEditOptions, 'getBevarasSuggestions').and.returnValue(of([]));
      spyOn(caseEditOptions, 'getDocumentSuggestions').and.returnValue(of([]));
      spyOn(caseEditOptions, 'getUserSuggestions').and.returnValue(of([]));
      spyOn(component.lockService, 'initLockState');

      component.ngOnInit();

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('isAwaitingCompletion / getUserName / getWorkflowComments / workflow helpers', () => {
    it('reports awaiting completion based on handlaggningsstatus', () => {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]: {
              'entity-type': 'directoryEntry',
              id: NUXEO_VOCAB_IDS.handlaggningsstatus.invantarKomplettering,
            },
          },
        })
      );
      expect(component.isAwaitingCompletion()).toBeTrue();
    });

    it('returns false when not awaiting completion', () => {
      expect(component.isAwaitingCompletion()).toBeFalse();
    });

    it('formats a user full name from first and last name properties', () => {
      const actor = {
        'entity-type': 'user' as const,
        id: 'u1',
        properties: {
          [NUXEO_SCHEMA_FIELDS.user.firstName]: 'Anna',
          [NUXEO_SCHEMA_FIELDS.user.lastName]: 'Svensson',
        },
      };
      expect(component.getUserName(actor)).toBe('Anna Svensson');
    });

    it('extracts sorted, commented workflow updates via getWorkflowComments', () => {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]: [
              {
                arbetsflodesid: 'wf-1',
                arbetsflodesnamn: 'Flow',
                status: 'running',
                startdatum: new Date('2026-01-01'),
                slutdatum: null,
                anvandare: [],
                initiativtagare: { 'entity-type': 'user', id: 'init-1' },
                uppgifter: [
                  { aktorer: [], kommentar: 'second', namn: 'step', atgardDatum: new Date('2026-02-01') },
                  { aktorer: [], kommentar: 'first', namn: 'step', atgardDatum: new Date('2026-01-01') },
                  { aktorer: [], kommentar: null, namn: 'step' },
                ],
              },
            ],
          },
        })
      );

      const workflow = makeWorkflowInfo({ id: 'wf-1', workflowInstanceId: 'wf-1' });
      const comments = component.getWorkflowComments(workflow);
      expect(comments?.map(c => c.kommentar)).toEqual(['first', 'second']);
    });

    it('checks if user is assigned to or can cancel a workflow', () => {
      const workflow = makeWorkflowInfo({
        id: 'wf-1',
        workflowInstanceId: 'wf-1',
        initiator: 'testuser',
      });
      component.pendingTasks.set([makeWorkflowInfo({ id: 'wf-1', workflowInstanceId: 'wf-1' })]);
      spyOn(component.auth, 'username').and.returnValue('testuser');

      expect(component.isUserAssignedForWorkflow(workflow)).toBeTrue();
      expect(component.canUserCancelWorkflow(workflow)).toBeTrue();
    });
  });

  describe('deleteWorkflow / saveNoteObject / updateDropdownValues / onCaseTypeChanged / getCaseTypes / getGeneralWorkfows', () => {
    it('deletes a workflow and emits reloadDocument', () => {
      spyOn(component.apiService, 'deleteWorkflow').and.returnValue(of([]));
      spyOn(component.reloadDocument, 'emit');

      component.deleteWorkflow('wf-1');

      expect(component.apiService.deleteWorkflow).toHaveBeenCalledWith('wf-1');
      expect(component.reloadDocument.emit).toHaveBeenCalled();
    });

    it('saves a note through editForm', () => {
      spyOn(component, 'editForm');
      component.saveNoteObject('a note');
      expect(component.editForm).toHaveBeenCalledWith({ [NUXEO_SCHEMA_FIELDS.arende.anteckning]: 'a note' });
    });

    it('reloads organization suggestions with a search term', () => {
      const spy = spyOn(caseEditOptions, 'getDocumentSuggestions').and.returnValue(of([]));
      component.updateDropdownValues({ fieldName: 'organization', value: 'search-term' });
      const args = spy.calls.mostRecent().args;
      expect(args[1]).toBe('Organisationsdel');
      expect(args[2]).toBe('search-term');
    });

    it('ignores dropdown changes for unrelated fields', () => {
      spyOn(caseEditOptions, 'getDocumentSuggestions');
      component.updateDropdownValues({ fieldName: 'other', value: 'x' });
      expect(caseEditOptions.getDocumentSuggestions).not.toHaveBeenCalled();
    });

    it('reloads lagrum suggestions when case type changes', () => {
      spyOn(caseEditOptions, 'getLagrumSuggestions').and.returnValue(of([]));
      component.onCaseTypeChanged('new-type');
      expect(caseEditOptions.getLagrumSuggestions).toHaveBeenCalledWith('/default-domain');
    });

    it('loads case type suggestions and reports load errors', () => {
      spyOn(component.apiService, 'DMSDocumentSuggestion').and.returnValues(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 't1', title: 'T1', path: '/p' })] })),
        throwError(() => new Error('fail'))
      );

      component.getCaseTypes();
      expect(component.suggestions()['caseType']).toEqual([
        jasmine.objectContaining({ label: 'T1', id: 't1', value: 't1' }),
      ] as never);

      component.getCaseTypes();
      expect(component.store.notification().variation).toBe('danger');
    });

    it('loads the general workflow menu from Arende directory entries', () => {
      spyOn(component.apiService, 'getDirectorySuggestions').and.returnValue(
        of([{ displayLabel: 'Arende', children: [{ id: 'action-x', label: 'Action X' }] }])
      );

      component.getGeneralWorkfows();

      expect(component.generalWorkflowMenu()).toEqual([{ id: 'action-x', label: 'Action X' }] as never);
    });
  });

  describe('checkInCollection', () => {
    it('sets inCollection based on checkDocumentInCollections result', () => {
      spyOn(component, 'checkDocumentInCollections').and.returnValue(of(true));
      component.checkInCollection();
      expect(component.checkDocumentInCollections).toHaveBeenCalledWith('case-1');
      expect(component.inCollection()).toBeTrue();
    });

    it('returns false immediately when there are no collections', done => {
      spyOn(component.apiService, 'getCollections').and.returnValue(of([]));
      component.checkDocumentInCollections('case-1').subscribe(result => {
        expect(result).toBeFalse();
        done();
      });
    });
  });

  describe('computed signals: editConfig, shouldShowActorsSection, hasReferences, ansvOrg, secretStampText', () => {
    it('editConfig grants edit access for admins and REGISTRATOR role', () => {
      const isAdminSpy = spyOn(component.auth, 'isAdmin').and.returnValue(true);
      expect(component.editConfig().length).toBeGreaterThan(0);

      isAdminSpy.and.returnValue(false);
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      expect(component.editConfig().length).toBeGreaterThan(0);
    });

    it('shouldShowActorsSection is true when responsible handler is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: { 'entity-type': 'user', id: 'h1' },
          },
        })
      );
      expect(component.shouldShowActorsSection()).toBeTrue();
    });

    it('shouldShowActorsSection is false with no actors set', () => {
      expect(component.shouldShowActorsSection()).toBeFalse();
    });

    it('hasReferences reflects externReferens length', () => {
      expect(component.hasReferences()).toBeFalsy();
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.externReferens]: [{ referens: 'r1' }],
          },
        })
      );
      expect(component.hasReferences()).toBeTruthy();
    });

    it('ansvOrg reads the organizational unit uid when present', () => {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]: makeNuxeoDocument({ uid: 'org-1' }),
          },
        })
      );
      expect(component.ansvOrg()).toBe('org-1');
    });

    it('secretStampText returns null without a sekretess id and a label when present', () => {
      expect(component.secretStampText()).toBeNull();
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.sekretess]: { 'entity-type': 'directoryEntry', id: 'starkSekretess' },
          },
        })
      );
      expect(component.secretStampText()).toBe('STARK - SEKRETESS');
    });
  });

  describe('buttons computed', () => {
    function setDoc(overrides: Record<string, unknown> = {}) {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'case-1', type: 'Arende', ...overrides })
      );
    }

    it('shows closeCase for registrator when closed by handler and not yet closed', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.avslutatAvHandlaggare });

      const texts = component.buttons().map(b => b.text);
      expect(texts).toContain('Stäng ärende');
    });

    it('shows readyToClose for registrator when not closed by handler', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      const texts = component.buttons().map(b => b.text);
      expect(texts).toContain('Ärende redo att avslutas');
    });

    it('returns handlaggare-specific buttons for the handlaggare role', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('HANDLAGGARE');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      const texts = component.buttons().map(b => b.text);
      expect(texts).toContain('Ärende redo att avslutas');
    });

    it('returns admin buttons (including closeCase) when admin view is enabled', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('HANDLAGGARE');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(true);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.avslutatAvHandlaggare });

      const texts = component.buttons().map(b => b.text);
      expect(texts).toContain('Stäng ärende');
    });

    it('limits buttons for a registrator viewing a doc locked by someone else', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      spyOn(component.auth, 'username').and.returnValue('viewer');
      setDoc({ lockOwner: 'someone-else', state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      const texts = component.buttons().map(b => b.text);
      expect(texts).not.toContain('Ärende redo att avslutas');
    });

    it('limits buttons for a handlaggare viewing a doc locked by someone else', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('HANDLAGGARE');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      spyOn(component.auth, 'username').and.returnValue('viewer');
      setDoc({ lockOwner: 'someone-else', state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      const texts = component.buttons().map(b => b.text);
      expect(texts).toContain('Begäran om komplettering');
    });

    it('returns an empty list for a role with no matching menu', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('ARKIVARIE');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      expect(component.buttons()).toEqual([]);
    });
  });

  describe('formatEditForm', () => {
    it('saves through customMetadataService, updates assignees on org change, and closes the case', () => {
      spyOn(component.customMetadataService, 'saveDefinitionsThenDocument').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.apiService, 'updateAssignees').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.apiService, 'closeCase').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.apiService, 'followLifecycleTransition').and.returnValue(
        of({ allowedTransitions: [], currentState: 'open', currentStateLabel: 'open', transitions: [] })
      );
      spyOn(component.reloadDocument, 'emit');

      component.formatEditForm({
        overview: { arendesteg: 'next-step', arendestatus: NUXEO_VOCAB_IDS.arendestatus.stangt },
        arendeDetails: { registered: [new Date('2026-06-01')] },
        actor: { organization: [{ id: 'org-2' }] },
        motpartContacts: [],
        customMetadataValues: { field1: 'value1' },
        customMetadataDefinitionDocId: 'def-doc-1',
        customMetadataDefinitions: [],
      } as never);

      expect(component.customMetadataService.saveDefinitionsThenDocument).toHaveBeenCalled();
      expect(component.apiService.updateAssignees).toHaveBeenCalledWith('case-1', 'org-2');
      expect(component.apiService.followLifecycleTransition).toHaveBeenCalledWith('case-1', 'next-step');
      expect(component.apiService.closeCase).toHaveBeenCalledWith('case-1');
      expect(component.isEditPageOpen()).toBeFalse();
      expect(component.reloadDocument.emit).toHaveBeenCalled();
      expect(component.store.notification().variation).toBe('success');
    });

    it('blocks the edit when closing the case while drafts exist', () => {
      component.utkasts.set([extendedHandlingDocument('draft-1')]);

      component.formatEditForm({
        overview: { arendestatus: NUXEO_VOCAB_IDS.arendestatus.stangt },
        motpartContacts: [],
      } as never);

      expect(component.isUtkastCloseBlockedOpen()).toBeTrue();
    });

    it('sets danger notification when saving fails', () => {
      spyOn(component.customMetadataService, 'saveDefinitionsThenDocument').and.returnValue(
        throwError(() => ({ error: { violations: [{ message: 'bad input' }] } }))
      );

      component.formatEditForm({ overview: {}, actor: {}, motpartContacts: [] } as never);

      expect(component.store.notification().variation).toBe('danger');
      expect(component.store.notification().text).toBe('bad input');
    });
  });

  describe('onSectionDropped', () => {
    it('reorders the section order and persists it', () => {
      spyOn(draggableSectionOrderService, 'saveOrder');
      const originalOrder = component.sectionOrder();

      component.onSectionDropped({ previousIndex: 0, currentIndex: 1 } as never);

      expect(component.sectionOrder()).not.toEqual(originalOrder);
      expect(draggableSectionOrderService.saveOrder).toHaveBeenCalled();
    });
  });

  describe('onReadyToCloseClicked / onCloseCaseClicked', () => {
    it('opens warning card for readyToClose with existing decision values', () => {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          state: NUXEO_VOCAB_IDS.arendestatus.avslutatAvHandlaggare,
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.beslutstyp]: makeNuxeoDocument({ uid: 'decision-uid' }),
            [NUXEO_SCHEMA_FIELDS.arende.beslutatDatum]: '2026-06-01',
          },
        })
      );

      component.onReadyToCloseClicked();

      expect(component.isWarningCardOpen()).toBeTrue();
      expect(component.warningActionType()).toBe('readyToClose');
      expect(component.isAlreadyMarkedReadyToClose()).toBeTrue();
      expect(component.readyToCloseDecision()).toBe('decision-uid');
      expect(component.readyToCloseDecisionDate()).toBe('2026-06-01');
      expect(component.isReadyToCloseDecisionLocked()).toBeTrue();
    });

    it('opens warning card for readyToClose without existing decision values', () => {
      component.onReadyToCloseClicked();

      expect(component.isWarningCardOpen()).toBeTrue();
      expect(component.warningActionType()).toBe('readyToClose');
      expect(component.isAlreadyMarkedReadyToClose()).toBeFalse();
      expect(component.isReadyToCloseDecisionLocked()).toBeFalse();
    });

    it('opens warning card for closeCase and resets fields', () => {
      component.closeCaseComment.set('some comment');
      component.onCloseCaseClicked();

      expect(component.isWarningCardOpen()).toBeTrue();
      expect(component.warningActionType()).toBe('closeCase');
      expect(component.isAlreadyMarkedReadyToClose()).toBeFalse();
      expect(component.closeCaseComment()).toBe('');
    });
  });

  describe('handleWarningCardAction branches', () => {
    it('cancels warning card and resets fields', () => {
      component.warningActionType.set('closeCase');
      component.isWarningCardOpen.set(true);
      component.closeCaseComment.set('some note');

      component.handleWarningCardAction('cancel');

      expect(component.isWarningCardOpen()).toBeFalse();
      expect(component.warningActionType()).toBeNull();
      expect(component.closeCaseComment()).toBe('');
    });

    it('confirms readyToClose action via warning card', () => {
      spyOn(component.caseLifecycle, 'transitionToReadyToClose').and.returnValue(of(void 0));
      spyOn(component, 'loadCaseDetails');
      spyOn(component.reloadDocument, 'emit');

      component.warningActionType.set('readyToClose');
      component.isWarningCardOpen.set(true);
      component.readyToCloseDecision.set('Decision');
      component.readyToCloseDecisionDate.set('2026-06-15');

      component.handleWarningCardAction('confirm');

      expect(component.isWarningCardOpen()).toBeFalse();
      expect(component.warningActionType()).toBeNull();
      expect(component.readyToCloseDecision()).toBe('');
      expect(component.readyToCloseDecisionDate()).toBe('');
      expect(component.caseLifecycle.transitionToReadyToClose).toHaveBeenCalled();
    });
  });

  describe('closeCase without comment', () => {
    it('closes case directly when no comment is provided', () => {
      spyOn(component.apiService, 'closeCase').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component, 'loadCaseDetails');
      spyOn(component.reloadDocument, 'emit');

      component.closeCaseComment.set('');
      component.closeCase();

      expect(component.apiService.closeCase).toHaveBeenCalledWith('case-1');
      expect(component.loadCaseDetails).toHaveBeenCalled();
      expect(component.reloadDocument.emit).toHaveBeenCalled();
    });

    it('sets danger notification on close error', () => {
      spyOn(component.apiService, 'closeCase').and.returnValue(throwError(() => new Error('close failed')));

      component.closeCaseComment.set('');
      component.closeCase();

      expect(component.store.notification().variation).toBe('danger');
      expect(component.store.notification().text).toBe('close failed');
    });

    it('falls back to generic error message when error has no message', () => {
      spyOn(component.apiService, 'closeCase').and.returnValue(throwError(() => ({})));

      component.closeCaseComment.set('');
      component.closeCase();

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('getPageSize', () => {
    it('loads and sets page size from storage when username is available', () => {
      spyOn(component.auth, 'username').and.returnValue('testuser');
      const origSize = component.handlingarPageSize();

      component.getPageSize();

      expect(component.handlingarPageSize()).toBeDefined();

      component.handlingarPageSize.set(origSize);
    });

    it('skips loading when username is not available', () => {
      spyOn(component.auth, 'username').and.returnValue(null);
      const origSize = component.handlingarPageSize();

      component.getPageSize();

      expect(component.handlingarPageSize()).toBe(origSize);
    });
  });

  describe('toggleLockState', () => {
    it('delegates to lockService.toggleAndUpdate', () => {
      spyOn(component.lockService, 'toggleAndUpdate').and.returnValue(of(makeNuxeoDocument()));

      component.toggleLockState();

      expect(component.lockService.toggleAndUpdate).toHaveBeenCalledWith(
        caseDocument,
        component.isLockedByUser,
        component.reloadDocument
      );
    });
  });

  describe('setBaseButtons', () => {
    it('creates lock button when not locked', () => {
      component.isLockedByUser.set(false);
      component.inFavorites.set(false);
      component.isSubscribed.set(false);

      component.setBaseButtons();

      const texts = component.baseButtons().map(b => b.text);
      expect(texts.length).toBeGreaterThan(0);
    });

    it('creates unlock and favoriteActive buttons when locked and in favorites', () => {
      component.isLockedByUser.set(true);
      component.inFavorites.set(true);
      component.isSubscribed.set(true);

      component.setBaseButtons();

      expect(component.baseButtons().length).toBeGreaterThan(0);
    });

    it('triggers favorite toggle success from base button click', () => {
      spyOn(component.favoritesService, 'toggleFavorites').and.returnValue(of(makeNuxeoDocument()));
      component.inFavorites.set(false);

      component.setBaseButtons();

      const favoriteBtn = component.baseButtons().find(b => b.text === 'Favorisera');
      favoriteBtn?.click?.();

      expect(component.favoritesService.toggleFavorites).toHaveBeenCalled();
    });

    it('triggers favorite toggle error notification from base button click', () => {
      spyOn(component.favoritesService, 'toggleFavorites').and.returnValue(throwError(() => new Error('fav error')));
      component.inFavorites.set(false);

      component.setBaseButtons();

      const favoriteBtn = component.baseButtons().find(b => b.text === 'Favorisera');
      favoriteBtn?.click?.();

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('printSelectedFiles branches', () => {
    it('shows info notification when some files are skipped (not all printable)', () => {
      const doc1 = makeNuxeoDocument({ uid: 'doc-1', title: 'Doc 1' });
      const doc2 = makeNuxeoDocument({ uid: 'doc-2', title: 'Doc 2' });
      const printable: PrintableDocument = { file: doc1, url: '/print/doc-1' };
      spyOn(component.apiService, 'getDocumentById').and.returnValues(of(doc1), of(doc2));
      spyOn(component.printService, 'getPrintableDocuments').and.returnValue([printable]);
      spyOn(component.printService, 'printDocuments').and.callFake((_queue, onBeforePrint, onDone) => {
        onBeforePrint(doc1);
        onDone();
      });

      component.selectedFiles.set(['doc-1', 'doc-2']);
      component.printSelectedFiles();

      expect(component.store.notification().variation).toBe('info');
    });

    it('does not re-enter print when already printing', () => {
      const doc = makeNuxeoDocument({ uid: 'doc-1', title: 'Doc 1' });
      const printable: PrintableDocument = { file: doc, url: '/print/doc-1' };
      spyOn(component.apiService, 'getDocumentById').and.returnValue(of(doc));
      spyOn(component.printService, 'getPrintableDocuments').and.returnValue([printable]);
      let printCallCount = 0;
      spyOn(component.printService, 'printDocuments').and.callFake(() => {
        printCallCount++;
      });

      component.selectedFiles.set(['doc-1']);
      component.printSelectedFiles();
      component.printSelectedFiles();

      expect(printCallCount).toBe(1);
    });
  });

  describe('openArendePdfDialog branches', () => {
    it('shows warning when no arendekort templates are found', () => {
      const template = makeNuxeoDocument<TemplateSourceProperties>({
        uid: 'template-2',
        properties: {
          'thumb:thumbnail': { name: 'thumb.png', 'mime-type': 'image/png', data: '' },
          'file:content': { name: 'other.odt', 'mime-type': 'application/octet-stream' },
          'tmpl:forcedTypes': [],
          'tmpl:applicableTypes': ['Arende'],
          [NUXEO_SCHEMA_FIELDS.tmpl.templateName]: 'OtherTemplate',
          [NUXEO_SCHEMA_FIELDS.tmpl.templateData]: 'data',
          'tmpl:templateType': 'odt',
        },
      });
      spyOn(component.apiService, 'filterTemplatesByType').and.returnValue(
        of(makeSearchResult<NuxeoDocument<TemplateSourceProperties>>({ entries: [template] }))
      );

      component.openArendePdfDialog();

      expect(component.store.notification().variation).toBe('warning');
      expect(component.isArendePdfDialogOpen()).toBeFalse();
    });

    it('shows danger notification when filterTemplatesByType fails', () => {
      spyOn(component.apiService, 'filterTemplatesByType').and.returnValue(throwError(() => new Error('fetch error')));

      component.openArendePdfDialog();

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('closeArendePdfDialog', () => {
    it('closes dialog and clears selected template uid', () => {
      component.isArendePdfDialogOpen.set(true);
      component.selectedArendePdfTemplateUid.set('some-uid');

      component.closeArendePdfDialog();

      expect(component.isArendePdfDialogOpen()).toBeFalse();
      expect(component.selectedArendePdfTemplateUid()).toBe('');
    });
  });

  describe('downloadArendePdf error branch', () => {
    it('shows danger notification when renderArendePdf fails', () => {
      const template = makeNuxeoDocument<TemplateSourceProperties>({
        uid: 'template-1',
        properties: {
          'thumb:thumbnail': { name: 'thumb.png', 'mime-type': 'image/png', data: '' },
          'file:content': { name: 'template.odt', 'mime-type': 'application/octet-stream' },
          'tmpl:forcedTypes': [],
          'tmpl:applicableTypes': ['Arende'],
          [NUXEO_SCHEMA_FIELDS.tmpl.templateName]: 'Arendekort',
          [NUXEO_SCHEMA_FIELDS.tmpl.templateData]: 'template-data',
          'tmpl:templateType': 'odt',
        },
      });
      component.arendePdfTemplates.set([template]);
      spyOn(component.apiService, 'renderArendePdf').and.returnValue(throwError(() => new Error('render error')));

      component.downloadArendePdf('template-1');

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('handleServiceNoteCreated without uid', () => {
    it('reloads case details when service note doc has no uid', () => {
      spyOn(component, 'loadCaseDetails');
      spyOn(component.reloadDocument, 'emit');

      const noUidDoc = { ...baseDocument('note-1'), uid: undefined } as unknown as NuxeoDocument;
      component.handleServiceNoteCreated(noUidDoc);

      expect(component.loadCaseDetails).toHaveBeenCalledWith(caseDocument);
      expect(component.reloadDocument.emit).toHaveBeenCalled();
    });
  });

  describe('updateSubscriptionState', () => {
    it('marks as subscribed when username appears in notification subscribers', () => {
      spyOn(component.auth, 'username').and.returnValue('alice');

      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.notif.notifications]: [{ id: 'n1', subscribers: ['user:alice', 'user:bob'] }],
          },
        })
      );

      fixture.detectChanges();

      expect(component.isSubscribed()).toBeTrue();
    });

    it('marks as not subscribed when username is not in subscribers', () => {
      spyOn(component.auth, 'username').and.returnValue('charlie');

      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.notif.notifications]: [{ id: 'n1', subscribers: ['user:alice'] }],
          },
        })
      );

      fixture.detectChanges();

      expect(component.isSubscribed()).toBeFalse();
    });
  });

  describe('computed signals: deadlineCommentGroups, generalWorkflowVocabComputed, generalWorkflowFormConfig', () => {
    it('deadlineCommentGroups maps deadline workflow data', () => {
      const wf = makeWorkflowInfo({
        id: 'wf-d1',
        workflowInstanceId: 'wf-d1',
        workflowModelName: 'DeadlineOchPaminnelse',
      });
      wf.variables = { ...wf.variables, deadline: new Date('2026-07-01'), beskrivning: 'Deadline note' };
      component.deadlineWorkflows.set([wf]);

      const groups = component.deadlineCommentGroups();

      expect(groups.length).toBe(1);
      expect(groups[0].date).toEqual(new Date('2026-07-01'));
      expect(groups[0].description).toBe('Deadline note');
    });

    it('deadlineCommentGroups handles null deadlineWorkflows', () => {
      component.deadlineWorkflows.set(null);

      const groups = component.deadlineCommentGroups();

      expect(groups).toEqual([]);
    });

    it('generalWorkflowVocabComputed flattens children from menu', () => {
      const action: GeneralWorkflowAction = {
        id: 'action-x',
        label: 'Action X',
        displayLabel: 'Action X',
        parent: 'Arende',
        ordering: 1,
        obsolete: 0,
        directoryName: 'AtgarderAllmannaArbetsflodet',
        properties: { parent: 'Arende', ordering: 1, obsolete: 0, id: 'action-x', label: 'Action X' },
        'entity-type': 'directoryEntry' as const,
        computedId: 'Arende/action-x',
        absoluteLabel: 'Arende/Action X',
      };
      component.generalWorkflowMenu.set([{ displayLabel: 'Arende', children: [action] }]);

      expect(component.generalWorkflowVocabComputed()).toEqual([action]);
    });

    it('generalWorkflowFormConfig returns array of field configs', () => {
      const config = component.generalWorkflowFormConfig();
      expect(config.length).toBeGreaterThan(0);
      const names = config.map(c => c.name);
      expect(names).toContain('handlaggare');
      expect(names).toContain('registrator');
    });
  });

  describe('caseReferencesTableData / handlingReferencesTableData computed', () => {
    it('maps internArendereferens into table rows', () => {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.internArendereferens]: [
              {
                referenskommentar: 'A comment',
                arende: makeNuxeoDocument({ uid: 'ref-case-1' }),
                referenstyp: { 'entity-type': 'directoryEntry', id: 'type-1' },
              },
            ],
          },
        })
      );

      const rows = component.caseReferencesTableData();

      expect(rows.length).toBe(1);
      expect(rows[0].comment).toBe('A comment');
      expect(rows[0].caseRef).toBe('ref-case-1');
      expect(rows[0].type).toBe('type-1');
    });

    it('maps internHandlingsreferens into table rows', () => {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.internHandlingsreferens]: [
              {
                referenskommentar: 'Handle ref',
                handling: makeNuxeoDocument({ uid: 'ref-handling-1' }),
                referenstyp: { 'entity-type': 'directoryEntry', id: 'htype-1' },
              },
            ],
          },
        })
      );

      const rows = component.handlingReferencesTableData();

      expect(rows.length).toBe(1);
      expect(rows[0].comment).toBe('Handle ref');
      expect(rows[0].caseRef).toBe('ref-handling-1');
      expect(rows[0].type).toBe('htype-1');
    });

    it('returns empty arrays when reference fields are absent', () => {
      expect(component.caseReferencesTableData()).toEqual([]);
      expect(component.handlingReferencesTableData()).toEqual([]);
    });
  });

  describe('isSectionVisible via visibleSections', () => {
    it('hides customMetadata section when hasCustomMetadata is false', () => {
      component.hasCustomMetadata.set(false);
      const visible = component.visibleSections();
      expect(visible).not.toContain('customMetadata');
    });

    it('shows customMetadata section when hasCustomMetadata is true', () => {
      component.hasCustomMetadata.set(true);
      const visible = component.visibleSections();
      expect(visible).toContain('customMetadata');
    });

    it('hides actors section when shouldShowActorsSection is false', () => {
      const visible = component.visibleSections();
      expect(visible).not.toContain('actors');
    });

    it('hides references section when hasReferences is falsy', () => {
      const visible = component.visibleSections();
      expect(visible).not.toContain('references');
    });

    it('hides arbetsmaterial and handlingar when no items exist', () => {
      component.utkasts.set([]);
      component.handlingarCardsTotal.set(0);
      component.handlingarSearchTerm.set('');
      const visible = component.visibleSections();
      expect(visible).not.toContain('arbetsmaterial');

      expect(visible).not.toContain('handlingar');
    });

    it('shows handlingar when handlingarSearchTerm is set even with no items', () => {
      component.utkasts.set([]);
      component.handlingarCardsTotal.set(0);
      component.handlingarSearchTerm.set('some term');
      const visible = component.visibleSections();
      expect(visible).toContain('handlingar');
    });

    it('hides simplified UI sections for HANDLAGGARE when simplified mode is on', () => {
      const uiModeService = TestBed.inject(UiModeService);
      uiModeService.setMode('simplified');
      spyOn(component.auth, 'activeRole').and.returnValue('HANDLAGGARE');
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({
          uid: 'case-1',
          type: 'Arende',
          properties: {
            [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: { 'entity-type': 'user', id: 'h1' },
            [NUXEO_SCHEMA_FIELDS.arende.externReferens]: [{ referens: 'r1' }],
          },
        })
      );
      component.hasCustomMetadata.set(true);

      const visible = component.visibleSections();
      expect(visible).not.toContain('details');
      expect(visible).not.toContain('email');
      expect(visible).not.toContain('actors');

      uiModeService.setMode('standard');
    });
  });

  describe('canSortCaseSection', () => {
    it('returns false for index 0 (overview section)', () => {
      expect(component.canSortCaseSection(0)).toBeFalse();
    });

    it('returns true for index > 0', () => {
      expect(component.canSortCaseSection(1)).toBeTrue();
      expect(component.canSortCaseSection(5)).toBeTrue();
    });
  });

  describe('onUtgaendeInternHandlingarTableSelectAll', () => {
    it('selects all utgaende intern handlingar when checked is true', () => {
      spyOn(component.apiService, 'getHandling').and.returnValue(
        of(makeSearchResult({ entries: [baseDocument('handling-3'), baseDocument('handling-4')], totalSize: 2 }))
      );
      component.utgaendeInternHandlingarTotal.set(2);

      component.onUtgaendeInternHandlingarTableSelectAll(true);

      expect(component.selectedFiles()).toEqual(['handling-3', 'handling-4']);
    });

    it('deselects all utgaende intern handlingar when checked is false', () => {
      spyOn(component.apiService, 'getHandling').and.returnValue(
        of(makeSearchResult({ entries: [baseDocument('handling-3')], totalSize: 1 }))
      );
      component.selectedFiles.set(['handling-3']);
      component.utgaendeInternHandlingarTotal.set(1);

      component.onUtgaendeInternHandlingarTableSelectAll(false);

      expect(component.selectedFiles()).toEqual([]);
    });
  });

  describe('onAllHandlingarTableSelectAll', () => {
    it('selects all handlingar when checked is true', () => {
      spyOn(component.apiService, 'getHandling').and.returnValue(
        of(makeSearchResult({ entries: [baseDocument('handling-5')], totalSize: 1 }))
      );
      component.allHandlingarTotal.set(1);

      component.onAllHandlingarTableSelectAll(true);

      expect(component.selectedFiles()).toEqual(['handling-5']);
    });

    it('sets danger notification when select all fails', () => {
      spyOn(component.apiService, 'getHandling').and.returnValue(throwError(() => new Error('select failed')));
      component.allHandlingarTotal.set(1);

      component.onAllHandlingarTableSelectAll(true);

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('formatEditForm additional branches', () => {
    it('skips closing case when status does not change (org unchanged)', () => {
      spyOn(component.customMetadataService, 'saveDefinitionsThenDocument').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.apiService, 'updateAssignees');
      spyOn(component.apiService, 'closeCase');
      spyOn(component.reloadDocument, 'emit');

      component.formatEditForm({
        overview: { arendestatus: 'oppet' },
        actor: { organization: null },
        motpartContacts: [],
      } as never);

      expect(component.apiService.closeCase).not.toHaveBeenCalled();
      expect(component.reloadDocument.emit).toHaveBeenCalled();
    });

    it('handles cancel case (makulerat) in formatEditForm', () => {
      spyOn(component.customMetadataService, 'saveDefinitionsThenDocument').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.apiService, 'markCaseCancelled').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.reloadDocument, 'emit');

      component.formatEditForm({
        overview: { arendestatus: NUXEO_VOCAB_IDS.arendestatus.makulerat },
        actor: {},
        motpartContacts: [],
      } as never);

      expect(component.apiService.markCaseCancelled).toHaveBeenCalledWith('case-1');
      expect(component.reloadDocument.emit).toHaveBeenCalled();
    });

    it('handles formatEditForm with arendesteg not changed (same as current state)', () => {
      spyOn(component.customMetadataService, 'saveDefinitionsThenDocument').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.apiService, 'followLifecycleTransition');
      spyOn(component.reloadDocument, 'emit');

      component.currentCaseState.set({ id: 'open', label: 'Open' });

      component.formatEditForm({
        overview: { arendesteg: 'open' },
        actor: {},
        motpartContacts: [],
      } as never);

      expect(component.apiService.followLifecycleTransition).not.toHaveBeenCalled();
      expect(component.reloadDocument.emit).toHaveBeenCalled();
    });

    it('sets success notification with alt message when formatEditForm succeeds', () => {
      spyOn(component.customMetadataService, 'saveDefinitionsThenDocument').and.returnValue(of(makeNuxeoDocument()));
      spyOn(component.reloadDocument, 'emit');

      component.formatEditForm({
        overview: {},
        actor: {},
        motpartContacts: [],
      } as never);

      expect(component.store.notification().variation).toBe('success');
      expect(component.isEditPageOpen()).toBeFalse();
    });
  });

  describe('exportAllCaseHandlingar success notification', () => {
    it('shows success notification after starting zip export', () => {
      const myndighet = makeNuxeoDocument({ uid: 'myndighet-1', type: 'Myndighet' });
      spyOn(component.apiService, 'getAncestorsById').and.returnValue(of([myndighet]));
      spyOn(component.apiService, 'startZipExport').and.returnValue(of(new Blob(['zip'])));

      component.exportAllCaseHandlingar();

      expect(component.store.notification().variation).toBe('success');
    });

    it('shows danger notification when zip export throws', () => {
      const myndighet = makeNuxeoDocument({ uid: 'myndighet-1', type: 'Myndighet' });
      spyOn(component.apiService, 'getAncestorsById').and.returnValue(of([myndighet]));
      spyOn(component.apiService, 'startZipExport').and.returnValue(
        throwError(() => ({ error: { message: 'export error' } }))
      );

      component.exportAllCaseHandlingar();

      expect(component.store.notification().variation).toBe('danger');
      expect(component.store.notification().text).toBe('export error');
    });
  });

  describe('onHandlingarFiltersChanged with empty checked', () => {
    it('resets handlingarPathFilter to null when checked is empty', () => {
      component.handlingarPathFilter.set('some-folder');
      component.onHandlingarFiltersChanged({ checked: [] });
      expect(component.handlingarPathFilter()).toBeNull();
    });
  });

  describe('onHandlingarTableModeChange branches', () => {
    it('resets intern and utgaende page when mode is grouped', () => {
      component.pageInternHandlingsTable.set(3);
      component.pageUtgaendeInternHandlingsTable.set(3);

      component.onHandlingarTableModeChange('grouped');

      expect(component.pageInternHandlingsTable()).toBe(0);
      expect(component.pageUtgaendeInternHandlingsTable()).toBe(0);
    });
  });

  describe('onArbetsmaterialPageSizeSelect edge cases', () => {
    it('ignores same page size', () => {
      component.arbetsmaterialPageSize.set(10);
      component.pageArbetsmaterialCards.set(3);

      component.onArbetsmaterialPageSizeSelect(10);

      expect(component.pageArbetsmaterialCards()).toBe(3);
    });

    it('ignores non-finite value', () => {
      component.arbetsmaterialPageSize.set(10);
      component.pageArbetsmaterialCards.set(3);

      component.onArbetsmaterialPageSizeSelect('abc');

      expect(component.pageArbetsmaterialCards()).toBe(3);
    });
  });

  describe('allAccordionsExpanded computed', () => {
    it('returns true when all accordion sections are expanded', () => {
      const allTrue = Object.fromEntries(Object.keys(component.accordionState()).map(k => [k, true]));
      component.accordionState.set(allTrue);
      expect(component.allAccordionsExpanded()).toBeTrue();
    });

    it('returns false when at least one accordion section is collapsed', () => {
      const someKeys = Object.keys(component.accordionState());
      const mixed = Object.fromEntries(someKeys.map((k, i) => [k, i !== 0]));
      component.accordionState.set(mixed);
      expect(component.allAccordionsExpanded()).toBeFalse();
    });
  });

  describe('toggleAccordionBtn', () => {
    it('collapses all when currently all expanded', () => {
      const allTrue = Object.fromEntries(Object.keys(component.accordionState()).map(k => [k, true]));
      component.accordionState.set(allTrue);

      component.toggleAccordionBtn();

      expect(Object.values(component.accordionState()).every(v => !v)).toBeTrue();
    });

    it('expands all when currently some are collapsed', () => {
      const someKeys = Object.keys(component.accordionState());
      const mixed = Object.fromEntries(someKeys.map((k, i) => [k, i !== 0]));
      component.accordionState.set(mixed);

      component.toggleAccordionBtn();

      expect(Object.values(component.accordionState()).every(v => v)).toBeTrue();
    });
  });

  describe('deleteSelectedItems error branch', () => {
    it('shows danger notification when delete fails', () => {
      spyOn(component.apiService, 'deleteSeveralDocument').and.returnValue(throwError(() => new Error('delete error')));

      component.selectedFiles.set(['doc-1']);
      component.deleteSelectedItems();

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('addToFavorites error branch', () => {
    it('shows danger notification when toggleFavorites fails', () => {
      spyOn(component.favoritesService, 'toggleFavorites').and.returnValue(throwError(() => new Error('fav error')));

      component.selectedFiles.set(['doc-1']);
      component.addToFavorites();

      expect(component.store.notification().variation).toBe('danger');
    });
  });

  describe('getGeneralWorkfows with null result', () => {
    it('leaves generalWorkflowMenu unchanged when result is falsy', () => {
      spyOn(component.apiService, 'getDirectorySuggestions').and.returnValue(of(null as never));

      component.generalWorkflowMenu.set([]);
      component.getGeneralWorkfows();

      expect(component.generalWorkflowMenu()).toEqual([]);
    });
  });

  describe('buttons computed additional branches', () => {
    function setDoc(overrides: Record<string, unknown> = {}) {
      fixture.componentRef.setInput(
        'document',
        makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'case-1', type: 'Arende', ...overrides })
      );
    }

    it('does not show readyToClose when case is already closed', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.stangt });

      const texts = component.buttons().map(b => b.text);
      expect(texts).not.toContain('Ärende redo att avslutas');
      expect(texts).not.toContain('Stäng ärende');
    });

    it('shows readyToClose for admin when case is not closed', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(true);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      const texts = component.buttons().map(b => b.text);
      expect(texts).toContain('Ärende redo att avslutas');
    });

    it('returns limited buttons for registrator locked by someone else', () => {
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      spyOn(component.auth, 'username').and.returnValue('me');
      setDoc({ lockOwner: 'other-user', state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      const texts = component.buttons().map(b => b.text);
      expect(texts).not.toContain('Ärende redo att avslutas');
      expect(texts).toContain('Ladda ner alla filer');
    });

    it('uses changeHandler preset when handlaggare is present', () => {
      component.handlaggarePresent.set(true);
      spyOn(component.auth, 'activeRole').and.returnValue('REGISTRATOR');
      spyOn(component.auth, 'adminViewEnabled').and.returnValue(false);
      setDoc({ state: NUXEO_VOCAB_IDS.arendestatus.oppet });

      const texts = component.buttons().map(b => b.text);
      expect(texts.some(t => t.toLowerCase().includes('handläggare'))).toBeTrue();
    });
  });

  it('opens, closes and downloads arende PDF templates', () => {
    const template = makeNuxeoDocument<TemplateSourceProperties>({
      uid: 'template-1',
      properties: {
        'thumb:thumbnail': { name: 'thumbnail.png', 'mime-type': 'image/png', data: 'thumb' },
        'file:content': { name: 'template.odt', 'mime-type': 'application/octet-stream' },
        'tmpl:forcedTypes': [],
        'tmpl:applicableTypes': ['Arende'],
        [NUXEO_SCHEMA_FIELDS.tmpl.templateName]: 'Arendekort',
        [NUXEO_SCHEMA_FIELDS.tmpl.templateData]: 'template-data',
        'tmpl:templateType': 'odt',
      },
    });
    const anchor = document.createElement('a');
    spyOn(component.apiService, 'filterTemplatesByType').and.returnValue(
      of(makeSearchResult<NuxeoDocument<TemplateSourceProperties>>({ entries: [template] }))
    );
    spyOn(component.apiService, 'renderArendePdf').and.returnValue(of(new Blob(['pdf'])));
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:case-pdf');
    spyOn(window.URL, 'revokeObjectURL');
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(anchor, 'click');

    component.openArendePdfDialog();
    component.downloadArendePdf('template-1');

    expect(component.isArendePdfDialogOpen()).toBeFalse();
    expect(component.selectedArendePdfTemplateUid()).toBe('');
    expect(component.apiService.renderArendePdf).toHaveBeenCalledWith('case-1', 'Arendekort', 'template-data');
    expect(anchor.download).toBe('Arendekort.pdf');
    expect(anchor.click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:case-pdf');
  });
});
