import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  HandlingExtendedProperties,
  ContactEntry,
  NuxeoDocument,
  NuxeoFileDocument,
  NxUser,
  TemplateField,
  WorkflowInfo,
} from '@app/shared/api/nuxeo-api.types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import { UtkastDialogComponent } from '@app/shared/components/utkast-dialog/utkast-dialog.component';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { AssignCollectionModalComponent } from '@app/shared/components/assign-collection-modal.component/assign-collection-modal.component';
import { ButtonMenuComponent } from '@app/shared/components/button-menu.component/button-menu.component';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

import { NotificationService, NuxeoNotification } from '@app/core/services/notification-service.service';
import { ShareLinkService } from '@app/core/services/share-link.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { truncateForTitle } from '@app/shared/utils/text-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';

import { AuthService } from '@app/core/services/auth.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { LockService } from '@app/core/services/lock-service.service';
import { SecretStampService } from '@app/shared/services/secret-stamp.service';

import { DigiDialog, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { EMPTY, catchError, forkJoin, map, Observable, of, switchMap, tap, retry, timer } from 'rxjs';
import { BaseButton, GeneralStore } from '@app/core/services/general-store.service';
import {
  FAVORITE_ADDED_MESSAGE,
  FAVORITE_REMOVED_MESSAGE,
  FAVORITE_UPDATE_ERROR_MESSAGE,
  SUBSCRIPTION_DISABLED_MESSAGE,
  SUBSCRIPTION_ENABLED_MESSAGE,
  SUBSCRIPTION_ERROR_MESSAGE,
  UTKAST_COMPLETE_REVIEW_FIRST_MESSAGE,
  UTKAST_VERSIONS_LOAD_ERROR_MESSAGE,
  UTKAST_HANDLING_CREATED_MESSAGE,
  UTKAST_HANDLING_CREATE_ERROR_MESSAGE,
  UTKAST_PRINT_LOADING_MESSAGE,
  UTKAST_PRINT_UNSUPPORTED_MESSAGE,
  UTKAST_REVIEW_APPROVED_MESSAGE,
  UTKAST_REVIEW_CONFIRM_ERROR_MESSAGE,
  UTKAST_REVIEW_REJECTED_MESSAGE,
  UTKAST_UPDATE_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { AccordionComponent } from '@app/shared/components/accordion/accordion.component';
import { ConfirmationDialogComponent } from '@app/shared/components/confirmation-dialog/confirmation-dialog.component';
import { UtkastReviewComponent } from '@app/shared/components/utkast-review/utkast-review.component';
import { HandlingFilesComponent } from '@app/shared/components/handling-files/handling-files.component';
import { PrintService } from '@app/core/services/print.service';
import { SelectedFilesToolbarService } from '@app/core/services/selected-files-toolbar.service';
import { DraggableSectionOrderService } from '@app/core/services/draggable-section-order.service';
import { AccordionStateService } from '@app/core/services/accordion-state.service';
import { UTKAST_PAGE_ACCORDION_STATE_KEY, UTKAST_PAGE_ACCORDION_DEFAULTS } from './constants';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { ToggleButtonComponent } from '@app/shared/components/toggle-button/toggle-button.component';
import { FormControl, FormGroup, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { DragHandleComponent } from '@app/shared/components/drag-handle/drag-handle.component';
import { EditFormComponent } from '@app/shared/components/edit-form/edit-form.component';
import { EditGroup } from '@app/shared/components/general-form/general-form.types';
import { ContactOption, Option } from '@app/shared/commonTypes';
import { noWhitespaceValidator } from '@app/shared/utils/validators-utils';
import { BasicContactTableComponent } from '@app/shared/components/edit-form-components/basic-contact-table/basic-contact-table.component';
import { EditSuggestionRequestType, loadEditSuggestions } from '@app/shared/utils/edit-suggestions-utils';
import { TopButtonsPanelComponent } from '@app/shared/components/top-buttons-panel/top-buttons-panel.component';
import { SvgIconComponent } from '@app/shared/components/svg-icon/svg-icon.component';
import { buildLagrumFieldConfig } from '@app/shared/services/lagrum-field.service';

type UtkastPageSectionKey = 'eventLog' | 'files';

interface UtkastEditFormResult {
  handlingDetails?: {
    title?: string;
    handlingsriktning?: string;
    handlingstyp?: string | Option[];
    secret?: string;
    lagrumsbeskrivning?: Option[];
    gdpr?: boolean;
    kommentarer?: string;
  };
  actor?: {
    granskare?: string;
    beslutsfattare?: string;
  };
  avsandare?: ContactOption[];
  mottagare?: ContactOption[];
}

const UTKAST_PAGE_SECTION_ORDER_STORAGE_KEY = 'utkastPageSectionOrder';
const UTKAST_PAGE_DEFAULT_SECTION_ORDER: UtkastPageSectionKey[] = ['eventLog', 'files'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-utkast-page',
  imports: [
    RouterModule,
    DragDropModule,
    PdfViewerComponent,
    DigiDialog,
    UtkastDialogComponent,
    DigiArbetsformedlingenAngularModule,
    NavigationBreadComponent,
    AssignCollectionModalComponent,
    ButtonMenuComponent,
    AccordionComponent,
    UtkastReviewComponent,
    ConfirmationDialogComponent,
    HandlingFilesComponent,
    CommonModule,
    TooltipDirective,
    ToggleButtonComponent,
    ReactiveFormsModule,
    DragHandleComponent,
    EditFormComponent,
    TopButtonsPanelComponent,
    SvgIconComponent,
  ],
  templateUrl: './utkast-page.component.html',
})
export class UtkastPageComponent implements OnInit, OnDestroy {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  protected readonly VOCAB_IDS = NUXEO_VOCAB_IDS;
  readonly getUserFullName = formatUserFullName;
  private nuxeoApiService = inject(NuxeoApiService);
  private formUtils = inject(FormUtilsService);
  private router = inject(Router);
  private favoritesService = inject(FavoritesService);
  private notificationService = inject(NotificationService);
  private lockService = inject(LockService);
  auth = inject(AuthService);
  readonly store = inject(GeneralStore);
  private shareLinkService = inject(ShareLinkService);
  private secretStampService = inject(SecretStampService);

  document = input.required<NuxeoDocument<HandlingExtendedProperties>>();
  properties = computed(() => this.document().properties);
  readonly secretStampText = computed(() =>
    this.secretStampService.getSecretStampText(this.properties()[NUXEO_SCHEMA_FIELDS.handling.sekretess]?.id)
  );
  reloadDocument = output();

  isLockedByUser = signal<boolean>(false);
  isSendForApprovalOpened = signal<string | null>(null);
  isChangeResponsibleOpened = signal<boolean>(false);
  isChangeRequesterOpened = signal<boolean>(false);
  isSendForReviewDialogOpen = signal<boolean>(false);
  inFavorites = signal<boolean>(false);
  inCollection = signal<boolean>(false);
  isEditPageOpen = signal<boolean>(false);
  showConfirmation = signal<boolean>(false);
  isAssignCollectionOpened = signal<string[] | null>(null);
  isSubscribed = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  sendForReviewWorkflow = signal<WorkflowInfo[] | null>(null);
  sendForApprovalWorkflow = signal<WorkflowInfo[] | null>(null);
  worflowsAssignedToUser = signal<WorkflowInfo[] | null>(null);
  pendingTasks = signal<WorkflowInfo[] | null>(null);
  namesByUid: Record<string, string> = {};
  files = signal<NuxeoFileDocument[]>([]);
  suggestions = signal<Record<string, Option[]>>({});
  selectedFile = signal<NuxeoDocument | null>(null);
  selectedFileIds = signal<Set<string>>(new Set());
  selectedFileIdList = computed(() => Array.from(this.selectedFileIds()));
  previewFile = signal<NuxeoDocument | null>(null);
  private printService = inject(PrintService);
  private selectedFilesToolbarService = inject(SelectedFilesToolbarService);
  viewMode = signal<'edit' | 'doc'>('doc');
  editProps = signal<TemplateField[]>([]);
  templateId = signal<string>('');
  availableVersions = signal<NuxeoDocument[]>([]);
  currentFileVersion = signal<NuxeoDocument | null>(null);
  isCreatedFromTemplate = signal<boolean>(false);
  private readonly draggableSectionOrderService = inject(DraggableSectionOrderService);
  private readonly accordionStateService = inject(AccordionStateService);
  accordionState = signal<Record<string, boolean>>(
    this.accordionStateService.loadState(UTKAST_PAGE_ACCORDION_STATE_KEY, UTKAST_PAGE_ACCORDION_DEFAULTS)
  );
  private activeDocumentUid = '';
  readonly sectionOrder = signal<UtkastPageSectionKey[]>([...UTKAST_PAGE_DEFAULT_SECTION_ORDER]);
  readonly visibleSections = computed(() =>
    this.draggableSectionOrderService.visibleSections(this.sectionOrder(), section => this.isSectionVisible(section))
  );

  fileDoc = signal<NuxeoDocument>({} as NuxeoDocument);
  role = this.auth.activeRole();

  currentUsername = computed(() => this.auth.username());
  loggedAtions = computed(() => this.document().properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]);
  loggedAtionsReviewWorkflow = computed(() => {
    if (!this.document().properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]?.length) return [];
    const reviews = this.document().properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]?.find(
      el => el.arbetsflodesnamn === NUXEO_VOCAB_IDS.arbetsflode.skickaForGranskning
    );
    if (!reviews) return [];

    const reviewsWithStartDate = [
      {
        datum: reviews?.startdatum,
        atgard: 'Start',
        anvandare: [reviews?.initiativtagare],
      },
      {
        datum: reviews?.startdatum,
        atgard: reviews.arbetsflodesnamn,
        anvandare: reviews?.uppgifter?.map(el => el.aktorer[0]) ?? [],
        status: reviews?.status,
      },
    ];

    return reviewsWithStartDate;
  });

  versionForm = new FormGroup({
    version: new FormControl<string | null>(null),
  });

  loggedAtionsApproveWorkflow = computed(() => {
    if (!this.document().properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]?.length) return [];
    const approves = this.document().properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]?.find(
      el => el.arbetsflodesnamn === 'StickaForGodkannande'
    );

    if (!approves) return [];
    const approveWithStartDate = [
      {
        datum: approves?.startdatum,
        atgard: 'Start',
        anvandare: [approves?.initiativtagare],
        status: approves?.status,
      },
      {
        datum: approves?.startdatum,
        atgard: approves.arbetsflodesnamn,
        anvandare: approves?.uppgifter?.[0]?.aktorer,
        status: approves?.status,
      },
    ];
    return approveWithStartDate;
  });

  documentLink = computed(() => {
    return this.shareLinkService.buildDocLink(this.document().uid);
  });

  editFieldsForm = new FormRecord<FormControl<string>>({});

  isCopyLinkDialogOpen = signal<boolean>(false);
  linkWasCopied = signal<boolean>(false);
  baseButtons = signal<BaseButton[]>([]);
  truncateTitle = (value: unknown) => truncateForTitle(value);
  editConfig = computed<EditGroup[]>(() => {
    const props = this.document().properties;

    const lagrumDoc = props[NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning];
    const lagrumDefault = lagrumDoc ? { id: lagrumDoc.uid, label: lagrumDoc.title ?? '' } : undefined;
    const shouldShowLagrum = this.formUtils.hasStrongSecrecy(props[NUXEO_SCHEMA_FIELDS.handling.sekretess]?.id);

    return [
      {
        groupName: 'Utkast detaljer',
        groupId: 'handlingDetails',
        cssClass: 'grid-cols-2',
        size: 'big',
        groupFields: [
          {
            type: 'input',
            name: 'title',
            label: this.store.getValue('label.dublincore.title') ?? 'Titel',
            validators: [Validators.required, noWhitespaceValidator()],
            defaultValue: String(props[NUXEO_SCHEMA_FIELDS.dc.title] ?? ''),
          },
          {
            type: 'dropdown-search',
            name: 'handlingstyp',
            label: 'Handlingstyp',
            defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.handlingstyp]?.uid,
            options: this.suggestions()['handlingType'],
            props: {
              optionsSignal: () => this.suggestions()['handlingType'],
            },
          },
          {
            type: 'dropdown',
            name: 'handlingsriktning',
            label: 'Handlingsriktning',
            defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]?.id,
            options: this.suggestions()['riktning'],
          },
          {
            type: 'dropdown',
            name: 'secret',
            label: 'Sekretess',
            defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.sekretess]?.id,
            options: this.suggestions()['secret'],
          },
          {
            ...buildLagrumFieldConfig({
              name: 'lagrumsbeskrivning',
              options: this.suggestions()['lagrum'],
              defaultValue: lagrumDefault ? [lagrumDefault] : undefined,
            }),
            isHidden: !shouldShowLagrum,
          },
          {
            type: 'checkbox',
            name: 'gdpr',
            label: 'Innehåller personuppgifter GDPR',
            defaultValue: !!props[NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr],
          },
          {
            type: 'textarea',
            name: 'kommentarer',
            label: 'Kommentar',
            defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.kommentarer],
            cssClass: 'col-span-2',
          },
        ],
      },
      {
        groupName: 'Interna/Externa aktörer',
        groupId: 'actor',
        size: 'big',
        groupFields: [
          {
            type: 'component',
            name: 'avsandare',
            label: 'Avsändare',
            class: BasicContactTableComponent,
            defaultValue: (props[NUXEO_SCHEMA_FIELDS.handling.avsandare] ?? []).map(contact => ({
              namn: contact?.namn ?? '',
              email: contact?.epost ?? '',
            })),
            __type: 'avsandare',
          },
          {
            type: 'component',
            name: 'mottagare',
            label: 'Mottagare',
            class: BasicContactTableComponent,
            defaultValue: (props[NUXEO_SCHEMA_FIELDS.handling.mottagare] ?? []).map(contact => ({
              namn: contact?.namn ?? '',
              email: contact?.epost ?? '',
            })),
            __type: 'mottagare',
          },
          {
            type: 'dropdown',
            name: 'granskare',
            label: 'Granskare',
            defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.granskare]?.id,
            options: this.suggestions()['granskare'],
          },
          {
            type: 'dropdown',
            name: 'beslutsfattare',
            label: 'Beslutsfattare',
            defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.beslutsfattare]?.id,
            options: this.suggestions()['beslutsfattare'],
          },
        ],
      },
    ];
  });
  reviewDecisionTaken = computed(() => {
    const props = this.document().properties ?? {};

    return Boolean(
      props[NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum] ||
        props[NUXEO_SCHEMA_FIELDS.handling.granskningskommentar] ||
        props[NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]
    );
  });
  currentAnsvHandlaggare = computed(() =>
    this.extractUserId(this.document().properties?.[NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare])
  );
  approvalPending = computed(() => {
    const assigneeUsername = this.currentAnsvHandlaggare();
    if (!assigneeUsername) return false;

    return !this.reviewDecisionTaken();
  });
  currentUserIsReviewer = computed(() => {
    const username = this.auth.username()?.toLowerCase();
    const assigneeUsername = this.currentAnsvHandlaggare()?.toLowerCase();
    return !!username && !!assigneeUsername && username === assigneeUsername;
  });
  requesterId = computed(() =>
    this.extractUserId(this.document().properties?.[NUXEO_SCHEMA_FIELDS.handling.granskare])
  );
  canChangeResponsible = computed(() => {
    if (this.auth.isAdmin()) return true;

    const username = this.auth.username()?.toLowerCase();
    const requesterUsername = this.requesterId()?.toLowerCase();
    const assigneeUsername = this.currentAnsvHandlaggare()?.toLowerCase();

    if (!username) return false;

    if (this.approvalPending()) {
      return !!requesterUsername && username === requesterUsername;
    }

    return !!assigneeUsername && username === assigneeUsername;
  });
  canChangeRequester = computed(() => {
    if (this.auth.isAdmin()) return true;

    const username = this.auth.username()?.toLowerCase();
    const requesterUsername = this.requesterId()?.toLowerCase();

    if (!username || !requesterUsername) return false;

    if (this.approvalPending()) {
      return username === requesterUsername;
    }

    return false;
  });
  canRequestApproval = computed(() => {
    if (this.auth.isAdmin()) return true;

    const username = this.auth.username()?.toLowerCase();
    const assigneeUsername = this.currentAnsvHandlaggare()?.toLowerCase();

    if (!assigneeUsername) return true;

    return !!username && username === assigneeUsername;
  });
  approvalAssignee = computed(() =>
    this.getUserDisplay(this.document().properties?.[NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare])
  );
  responsibleForChanges = computed(
    () => this.approvalAssignee() ?? this.currentAnsvHandlaggare() ?? this.reviewerName() ?? null
  );
  isApproved = computed(() => Boolean(this.document().properties?.[NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]));
  hasRequestedChanges = computed(() => {
    const props = this.document().properties ?? {};
    const granskningskommentar = props[NUXEO_SCHEMA_FIELDS.handling.granskningskommentar];
    const comment = typeof granskningskommentar === 'string' ? granskningskommentar : '';
    return Boolean(comment.trim()) && !this.isApproved();
  });
  reviewerName = computed(() =>
    this.getUserDisplay(this.document().properties?.[NUXEO_SCHEMA_FIELDS.handling.granskare])
  );

  buttons = computed(() => {
    const isAdmin = this.auth.isAdmin();
    const currentDocument = this.document();
    const lockOwner = currentDocument.lockOwner?.toLowerCase();
    const usernameLowercase = this.auth.username()?.toLowerCase();
    const isOwner = lockOwner === usernameLowercase;
    const isLocked = !!lockOwner;
    const showChangeResponsible = this.canChangeResponsible();
    const showChangeRequester = this.canChangeRequester();
    const lockPreset = this.isLockedByUser() ? 'unlock' : 'lock';
    const bookmarkPreset = this.inFavorites() ? 'bookmarkActive' : 'bookmark';

    const upprattaButton = createButton('createHandlingFromDraft', () => this.showConfirmation.set(true));
    const changeResponsibleButton = createButton('changeResponsibleHandler', () =>
      this.isChangeResponsibleOpened.set(true)
    );
    const changeRequesterButton = createButton('changeRequester', () => this.isChangeRequesterOpened.set(true));
    const baseButtons: BaseButton[] = [
      createButton('sendForReview', () => this.sendForReview()),
      createButton('sendForApproval', () => this.sendForApprove()),
      ...(showChangeResponsible ? [changeResponsibleButton] : []),
      ...(showChangeRequester ? [changeRequesterButton] : []),
      createButton('clear', () => this.deleteDocument()),
    ];

    if (isLocked && !isOwner && !isAdmin) {
      const lockedButtons: BaseButton[] = [
        createButton(lockPreset, () => this.toggleLockState()),
        createButton(bookmarkPreset, () =>
          this.favoritesService
            .toggleFavorites(this.document().uid, this.inFavorites())
            .pipe(tap(() => this.inFavorites.set(!this.inFavorites())))
            .subscribe()
        ),
        ...(showChangeRequester ? [changeRequesterButton] : []),
        ...(showChangeResponsible ? [changeResponsibleButton] : []),
      ];
      return [upprattaButton, ...lockedButtons];
    }

    return [upprattaButton, ...baseButtons];
  });

  constructor() {
    effect(() => {
      this.setBaseButtons();
    });

    effect(() => {
      const sendForReviewWorkflows = this.document()?.contextParameters?.runningWorkflows?.filter(
        el => el.workflowModelName === NUXEO_VOCAB_IDS.arbetsflode.skickaForGranskning
      );
      this.sendForReviewWorkflow.set(sendForReviewWorkflows ?? null);

      const sendForApproveWorkflows = this.document()?.contextParameters?.runningWorkflows?.filter(
        el => el.workflowModelName === 'StickaForGodkannande'
      );

      this.sendForApprovalWorkflow.set(sendForApproveWorkflows ?? null);

      const worflowsAssignedToUser = this.document()?.contextParameters?.runningWorkflows?.filter(el =>
        el.variables.anvandare?.find(user => user.id === this.currentUsername())
      );
      this.worflowsAssignedToUser.set(worflowsAssignedToUser ?? null);
      this.pendingTasks.set(this.document()?.contextParameters?.pendingTasks ?? null);
    });

    effect(() => {
      const fields = this.editProps();

      for (const field of fields) {
        if (!this.editFieldsForm.contains(field.nyckel)) {
          this.editFieldsForm.addControl(field.nyckel, new FormControl(field.varde || '', { nonNullable: true }));
        } else {
          this.editFieldsForm.controls[field.nyckel].setValue(field.varde || '');
        }
      }

      for (const key of Object.keys(this.editFieldsForm.controls)) {
        if (!fields.find(field => field.nyckel === key)) {
          this.editFieldsForm.removeControl(key);
        }
      }
    });

    effect(() => {
      const documentUid = this.document().uid;
      if (!documentUid || !this.activeDocumentUid || documentUid === this.activeDocumentUid) return;
      this.initializeDocumentContext();
    });
  }

  sendForApprove() {
    if (this.sendForApprovalWorkflow()?.length === 0 && this.sendForReviewWorkflow()?.length === 0) {
      this.isSendForApprovalOpened.set(this.document().uid);
    } else {
      const text = this.sendForApprovalWorkflow()?.length
        ? 'Du har ett pågående arbetsflöde för "Skicka för godkännande".'
        : UTKAST_COMPLETE_REVIEW_FIRST_MESSAGE;
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: text,
      });
    }
  }

  sendForReview() {
    if (this.sendForApprovalWorkflow()?.length === 0 && this.sendForReviewWorkflow()?.length === 0) {
      this.isSendForReviewDialogOpen.set(true);
    } else {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: UTKAST_COMPLETE_REVIEW_FIRST_MESSAGE,
      });
    }
  }

  abortWorkflow(workflow: WorkflowInfo) {
    this.nuxeoApiService.deleteWorkflow(workflow.id).subscribe(() => this.reloadDocument.emit());
  }

  reload() {
    setTimeout(() => {
      this.reloadDocument.emit();
    }, 1000);
  }

  ngOnInit(): void {
    this.sectionOrder.set(
      this.draggableSectionOrderService.loadOrder(
        UTKAST_PAGE_SECTION_ORDER_STORAGE_KEY,
        UTKAST_PAGE_DEFAULT_SECTION_ORDER
      )
    );

    this.setBaseButtons();
    this.store.baseButtons.set(this.baseButtons());
    this.store.openPage.set('utkast');

    this.initializeDocumentContext();
  }

  private initializeDocumentContext(): void {
    const documentUid = this.document().uid;
    this.activeDocumentUid = documentUid;
    this.getFile(true);
    this.lockService.initLockState(this.document(), this.isLockedByUser);

    this.favoritesService
      .checkInFavorites(documentUid)
      .pipe(tap(result => this.inFavorites.set(result)))
      .subscribe();

    this.getSuggestions('handlingType', 'docSuggestion', '_', 'Handlingstyp', 'Handling');
    this.getSuggestions('riktning', 'suggestEntries', 'Riktning');
    this.getSuggestions('secret', 'suggestEntries', 'Sekretess');
    this.loadLagrumSuggestions();
    this.getSuggestions('granskare', 'userSuggestion');
    this.getSuggestions('beslutsfattare', 'userSuggestion');

    const rawNotifications = this.document().properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
    const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];

    this.isSubscribed.set(this.isUserSubscribed(notifications));

    this.checkInCollection();

    this.getSeveralNamesByUids([this.document().parentRef]);
  }

  onSectionToggled(section: string, isExpanded: boolean) {
    const next = { ...this.accordionState(), [section]: isExpanded };
    this.accordionState.set(next);
    this.accordionStateService.saveState(UTKAST_PAGE_ACCORDION_STATE_KEY, next);
  }

  onSectionDropped(event: CdkDragDrop<UtkastPageSectionKey[]>) {
    const nextSectionOrder = this.draggableSectionOrderService.reorderSections(
      this.sectionOrder(),
      section => this.isSectionVisible(section),
      event.previousIndex,
      event.currentIndex
    );
    this.sectionOrder.set(nextSectionOrder);
    this.draggableSectionOrderService.saveOrder(UTKAST_PAGE_SECTION_ORDER_STORAGE_KEY, nextSectionOrder);
  }

  private isSectionVisible(section: UtkastPageSectionKey): boolean {
    switch (section) {
      case 'files':
        return this.files().length > 0;
      default:
        return true;
    }
  }

  getVersions(mainFile: NuxeoDocument) {
    return this.nuxeoApiService.getUtkastDocumentVersions(mainFile.uid).pipe(
      tap(data => {
        if (data.entries.every(el => !el.isLatestVersion)) {
          throw new Error('No data yet');
        }
        this.availableVersions.set(data.entries);
        const latestVesrion = data.entries.find(el => el.isLatestVersion) ?? null;
        const versionMajorId = mainFile?.properties[NUXEO_SCHEMA_FIELDS.uid.majorVersion];
        const versionMinorId = mainFile?.properties[NUXEO_SCHEMA_FIELDS.uid.minorVersion];
        const currentVersion = this.availableVersions().find(
          version =>
            version.properties[NUXEO_SCHEMA_FIELDS.uid.majorVersion] === versionMajorId &&
            version.properties[NUXEO_SCHEMA_FIELDS.uid.minorVersion] === versionMinorId
        );
        this.currentFileVersion.set(currentVersion ?? latestVesrion);
        this.versionForm.controls.version.setValue(currentVersion?.uid ?? latestVesrion?.uid ?? null);
      }),
      retry({
        count: 5,
        delay: () => timer(500),
      }),
      catchError(() => {
        this.store.notification.set({ show: true, variation: 'danger', text: UTKAST_VERSIONS_LOAD_ERROR_MESSAGE });
        return of(null);
      })
    );
  }

  changeCurrentVersion(event: CustomEvent) {
    this.selectedFile.set(this.availableVersions().find(el => el.uid === event?.detail.target.value) ?? null);
  }

  getFile(shouldSaveEditDocProperties = false) {
    this.isLoading.set(true);
    this.nuxeoApiService
      .getHandlingWithFile(this.document().uid)
      .pipe(
        switchMap(result => {
          const fileEntries = result.entries.filter(entry => entry.type === 'Fil');
          this.files.set(fileEntries);

          const mainFile =
            fileEntries.find(
              file => file.properties?.[NUXEO_SCHEMA_FIELDS.fil.typ] === NUXEO_VOCAB_IDS.filTyp.huvudfil
            ) ?? null;

          this.selectedFile.set(mainFile);

          const isCreatedFromTemplate = !!mainFile?.properties[NUXEO_SCHEMA_FIELDS.fil.mallenId];
          this.isCreatedFromTemplate.set(isCreatedFromTemplate);

          this.editProps.set(mainFile?.properties[NUXEO_SCHEMA_FIELDS.fil.mallegenskaper] ?? []);
          this.templateId.set(mainFile?.properties[NUXEO_SCHEMA_FIELDS.fil.mallenId] ?? '');

          this.selectedFileIds.set(new Set());

          if (mainFile?.uid && isCreatedFromTemplate) {
            return forkJoin({
              versions: this.getVersions(mainFile),
              template: this.nuxeoApiService.getDocumentById(
                mainFile.properties[NUXEO_SCHEMA_FIELDS.fil.mallenId] ?? ''
              ),
            });
          }
          return of(null);
        }),
        tap(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe(result => {
        //for the first upload
        if (result && !this.editProps().length) {
          const editableProps = result?.template.properties[NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper];
          this.editProps.set(editableProps ?? []);
          if (shouldSaveEditDocProperties) {
            this.saveEditDocProperties(editableProps);
          }
        }
      });
  }

  isUserAssignedForWorkflow(workflow: WorkflowInfo) {
    return !!this.worflowsAssignedToUser()?.find(el => el.id === workflow.id);
  }

  restoreSelectedVersion() {
    const versionToRestore = this.versionForm.controls.version.value;
    if (versionToRestore) {
      this.nuxeoApiService
        .restoreDocumentVersion(versionToRestore)
        .pipe(tap(() => this.getFile()))
        .subscribe();
    }
  }

  onToggleButtonChange(activeButtonIndex: number): void {
    this.viewMode.set(activeButtonIndex === 1 ? 'edit' : 'doc');
  }

  saveEditDocProperties(editProps?: TemplateField[]) {
    const updatedFields = Object.keys(this.editFieldsForm.value).map(key => ({
      varde: this.editFieldsForm.value[key] ?? '',
      nyckel: key,
    }));
    const fileId = this.selectedFile()?.uid;
    if (fileId) {
      this.isLoading.set(true);
      this.nuxeoApiService
        .saveEditDocProperties(fileId, this.templateId(), editProps ? editProps : updatedFields)
        .pipe(
          tap(() => {
            this.getFile();
            this.viewMode.set('doc');
          })
        )
        .subscribe();
    }
  }

  getTaskActions(workflow: WorkflowInfo) {
    const task = this.pendingTasks()?.find(el => el.workflowInstanceId === workflow.id);
    return task?.taskInfo.taskActions;
  }

  printFile(file: NuxeoDocument) {
    const target = this.printService.getPrintableTarget(file);
    if (!target) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: UTKAST_PRINT_UNSUPPORTED_MESSAGE,
      });
      return;
    }
    this.store.notification.set({
      show: true,
      variation: 'info',
      text: UTKAST_PRINT_LOADING_MESSAGE,
    });
    this.printService.printUrl(target.url, target.delayMs ?? 1000);
  }

  onPrint(): void {
    this.selectedFilesToolbarService.printSelectedFiles(this.files(), this.selectedFileIds());
  }

  getUsers(users?: NxUser[]) {
    if (!users) return '';
    return users.map(user => this.getUserFullName(user));
  }

  onFileSelectionChange(event: { file: NuxeoDocument; selected: boolean }) {
    this.selectedFilesToolbarService.updateFileSelection(this.selectedFileIds, event);
  }

  onAttachmentSelectionChange(event: { files: NuxeoDocument[]; selected: boolean }) {
    this.selectedFilesToolbarService.updateAttachmentSelection(this.selectedFileIds, event);
  }

  clearSelectedFiles(): void {
    this.selectedFilesToolbarService.clearSelection(this.selectedFileIds);
  }

  downloadSelectedFilesAsZip() {
    this.selectedFilesToolbarService.downloadSelectedFilesAsZip(this.selectedFileIds());
  }

  sendReviewDecision(action: string, workflow: WorkflowInfo) {
    const decisionTask = this.pendingTasks()?.find(el => el.workflowInstanceId === workflow.id);

    const workflowId = decisionTask?.id;
    if (!workflowId) {
      return;
    }
    const payload = {
      id: workflowId,
      'entity-type': 'task',
      variables: {},
    };
    this.nuxeoApiService
      .editWorkflow(workflowId, action, payload)
      .pipe(
        tap(() => {
          if (action === NUXEO_VOCAB_IDS.arbetsflodeAtgard.upprata) {
            this.onCreateHandling();
          }
        }),
        tap(() => {
          const nowInFavorites = !this.inFavorites();
          this.inFavorites.set(nowInFavorites);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text:
              action === NUXEO_VOCAB_IDS.arbetsflodeAtgard.avvisa
                ? UTKAST_REVIEW_REJECTED_MESSAGE
                : UTKAST_REVIEW_APPROVED_MESSAGE,
          });
        }),
        tap(() => this.reloadDocument.emit()),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: UTKAST_REVIEW_CONFIRM_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  getSeveralNamesByUids(uids: (string | undefined)[]) {
    const filteredUids = uids.filter((uid): uid is string => Boolean(uid));
    this.nuxeoApiService
      .getSeveralDocsByUids(filteredUids)
      .pipe(map(result => result.entries.map(el => (this.namesByUid[el.uid] = el.title))))
      .subscribe();
  }

  getSuggestions(
    name: string,
    requestType: EditSuggestionRequestType,
    label?: string,
    targetType?: string,
    docType?: string,
    searchTerm = ''
  ) {
    loadEditSuggestions({
      name,
      requestType,
      label,
      targetType,
      docType,
      searchTerm,
      apiService: this.nuxeoApiService,
      parentRef: this.document().parentRef ?? '',
      suggestions: this.suggestions,
    });
  }

  private loadLagrumSuggestions(): void {
    this.nuxeoApiService
      .getLagrumOptions(this.document().uid)
      .pipe(
        tap(options => {
          this.suggestions.update(current => ({ ...current, lagrum: options }));
        }),
        catchError(() => {
          this.suggestions.update(current => ({ ...current, lagrum: [] }));
          return EMPTY;
        })
      )
      .subscribe();
  }

  updateDropdownValues(event: { fieldName: string; value: string }) {
    if (event.fieldName === 'handlingstyp') {
      this.getSuggestions('handlingType', 'docSuggestion', '_', 'Handlingstyp', 'Handling', event.value);
    }
  }

  formatEditForm(formResult: UtkastEditFormResult) {
    const handlingstyp = Array.isArray(formResult?.handlingDetails?.handlingstyp)
      ? (formResult.handlingDetails.handlingstyp[0]?.id ?? formResult.handlingDetails.handlingstyp[0])
      : formResult?.handlingDetails?.handlingstyp;

    const formProperties = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: formResult?.handlingDetails?.title,
      [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: formResult?.handlingDetails?.handlingsriktning,
      [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: handlingstyp,
      [NUXEO_SCHEMA_FIELDS.handling.kommentarer]: formResult?.handlingDetails?.kommentarer,
      [NUXEO_SCHEMA_FIELDS.handling.sekretess]: formResult?.handlingDetails?.secret,
      [NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]:
        formResult?.handlingDetails?.lagrumsbeskrivning?.[0]?.id ?? null,
      [NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]: formResult?.handlingDetails?.gdpr,
      [NUXEO_SCHEMA_FIELDS.handling.avsandare]: this.mapContactsToPayload(formResult?.avsandare),
      [NUXEO_SCHEMA_FIELDS.handling.mottagare]: this.mapContactsToPayload(formResult?.mottagare),
      [NUXEO_SCHEMA_FIELDS.handling.granskare]: formResult?.actor?.granskare,
      [NUXEO_SCHEMA_FIELDS.handling.beslutsfattare]: formResult?.actor?.beslutsfattare,
    };

    const filteredProps = Object.fromEntries(
      Object.entries(formProperties).filter(
        ([, value]) => value !== '' && value !== undefined && (!Array.isArray(value) || value.length > 0)
      )
    );

    this.editForm(filteredProps);
  }

  private mapContactsToPayload(contacts?: ContactOption[]): ContactEntry[] | undefined {
    return contacts?.map(contact => ({
      namn: contact.namn ?? contact.title ?? undefined,
      epost: contact.email ?? undefined,
      telefon: contact.telefon ?? undefined,
      adress: contact.adress,
      organisation: contact.org ?? null,
    }));
  }

  editForm(props: Record<string, unknown>) {
    this.nuxeoApiService
      .editDocument(this.document().uid, props)
      .pipe(
        tap(() => {
          this.reloadDocument.emit();
          this.isEditPageOpen.set(false);
        }),
        catchError(error => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: error.error?.violations?.[0]?.message ?? UTKAST_UPDATE_ERROR_MESSAGE,
          });

          return EMPTY;
        })
      )
      .subscribe();
  }

  setBaseButtons() {
    const lockPreset = this.isLockedByUser() ? 'unlock' : 'lock';
    const favoritePreset = this.inFavorites() ? 'favoriteActive' : 'favorite';
    const notifyPreset = this.isSubscribed() ? 'stopNotify' : 'notify';

    const editButton = createButton('edit', () => this.isEditPageOpen.set(true));
    this.baseButtons.set([
      editButton,
      createButton('share', () => this.isCopyLinkDialogOpen.set(true)),
      createButton(lockPreset, () => this.toggleLockState()),
      createButton(favoritePreset, () =>
        this.favoritesService
          .toggleFavorites(this.document().uid, this.inFavorites())
          .pipe(
            tap(() => {
              const nowInFavorites = !this.inFavorites();
              this.inFavorites.set(nowInFavorites);

              this.store.notification.set({
                show: true,
                variation: 'success',
                text: nowInFavorites ? FAVORITE_ADDED_MESSAGE : FAVORITE_REMOVED_MESSAGE,
              });
            }),
            catchError(() => {
              this.store.notification.set({
                show: true,
                variation: 'danger',
                text: FAVORITE_UPDATE_ERROR_MESSAGE,
              });
              return EMPTY;
            })
          )
          .subscribe()
      ),
      createButton('collection', () => {
        this.isAssignCollectionOpened.set([this.document().uid]);
      }),
      createButton(notifyPreset, () => this.toggleSubscription()),
    ]);
    this.store.baseButtons.set(this.baseButtons());
  }

  onCreateHandling() {
    this.nuxeoApiService
      .createHandlingFromUtkast(this.document().uid)
      .pipe(
        tap(result => this.router.navigate(['/doc/', result.uid])),
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: UTKAST_HANDLING_CREATED_MESSAGE,
          });
          this.reloadDocument.emit();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: UTKAST_HANDLING_CREATE_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  isPicture(doc: NuxeoDocument): boolean {
    return doc.facets.includes('Picture');
  }

  getDate(date: string | Date | undefined | null | unknown): string {
    return formatDateOrMissing(date);
  }

  deleteDocument() {
    this.nuxeoApiService.deleteDocument(this.document().uid).subscribe();
    this.router.navigate(['']);
  }

  checkInCollection() {
    this.checkDocumentInCollections(this.document().uid)
      .pipe(tap(inCollection => this.inCollection.set(inCollection)))
      .subscribe();
  }

  checkDocumentInCollections(documentId: string): Observable<boolean> {
    return this.nuxeoApiService.getCollections().pipe(
      switchMap(collections => {
        if (!collections.length) return of([]);

        return forkJoin(
          collections.map(collection =>
            this.nuxeoApiService
              .getCollectionDocuments(collection.uid)
              .pipe(map(result => result.entries.some(entry => entry.uid === documentId)))
          )
        );
      }),
      map((results: boolean[]) => results.some(found => found))
    );
  }

  onEdit(): void {
    console.log('Edit action triggered');
  }

  toggleLockState() {
    this.lockService.toggleAndUpdate(this.document(), this.isLockedByUser, this.reloadDocument).subscribe();
  }

  toggleSubscription(): void {
    const currentDocument = this.document();
    const documentId = currentDocument.uid;
    const isCurrentlySubscribed = this.isSubscribed();

    const operation$ = isCurrentlySubscribed
      ? this.notificationService.unsubscribe(documentId)
      : this.notificationService.subscribe(documentId);

    operation$
      .pipe(
        tap(updatedDocument => {
          const rawNotifications = updatedDocument.properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
          const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];

          const stillSubscribed = this.isUserSubscribed(notifications);

          this.isSubscribed.set(stillSubscribed);
          this.reloadDocument.emit();

          this.store.notification.set({
            show: true,
            variation: 'success',
            text: stillSubscribed ? SUBSCRIPTION_ENABLED_MESSAGE : SUBSCRIPTION_DISABLED_MESSAGE,
          });
        })
      )
      .subscribe({
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: SUBSCRIPTION_ERROR_MESSAGE,
          });
        },
      });
  }

  copyLink() {
    this.shareLinkService.copyDocumentLink(this.document().uid, copied => this.linkWasCopied.set(copied));
  }

  private extractUserId(value: NxUser | string | null | undefined): string | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const normalized = value.replace(/^user:/i, '').trim();
      return normalized || null;
    }

    if (typeof value.id === 'string' && value.id.trim()) {
      return value.id.trim();
    }

    const userProps = value.properties ?? {};
    const prefixedUsername = userProps[NUXEO_SCHEMA_FIELDS.user.username];
    const usernameProp =
      typeof userProps['username'] === 'string'
        ? userProps['username']
        : typeof prefixedUsername === 'string'
          ? prefixedUsername
          : null;

    if (usernameProp?.trim()) {
      return usernameProp.trim();
    }

    return null;
  }

  private getUserDisplay(user: NxUser | string | null | undefined): string | null {
    if (!user) return null;

    if (typeof user === 'string') {
      return user || null;
    }

    const userProps = user.properties ?? {};

    const firstName =
      typeof userProps.firstName === 'string'
        ? userProps.firstName.trim()
        : typeof userProps['firstname'] === 'string'
          ? userProps['firstname'].trim()
          : '';
    const lastName =
      typeof userProps.lastName === 'string'
        ? userProps.lastName.trim()
        : typeof userProps['lastname'] === 'string'
          ? userProps['lastname'].trim()
          : '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;

    const prefixedUsername = userProps[NUXEO_SCHEMA_FIELDS.user.username];
    const username =
      typeof userProps.username === 'string'
        ? userProps.username.trim()
        : typeof prefixedUsername === 'string'
          ? prefixedUsername.trim()
          : '';
    if (username) return username;

    if (typeof user.id === 'string' && user.id.trim()) return user.id.trim();

    return null;
  }

  private isUserSubscribed(notifications: NuxeoNotification[]): boolean {
    const username = this.auth.username();
    if (!username) return false;

    return notifications.some(n =>
      (n.subscribers ?? []).some(user => {
        if (!user) return false;
        const cleaned = user.replace(/^user:/i, '').trim();
        return cleaned === username;
      })
    );
  }

  renderRaw(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }
}
