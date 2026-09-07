import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { loadVocabPage, saveVocabDocument, sortAuditEntries } from '../vocabulary-page-helpers';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  HANDLAGGNINGSSTATUS_UPDATE_ERROR_MESSAGE,
  HANDLAGGNINGSSTATUS_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, NuxeoDocument, NxUser } from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import {
  DocumentInfoPageComponent,
  InfoItem,
} from '@app/shared/components/document-info-page/document-info-page.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';

interface HandlaggningsstatusProperties {
  'handlaggningsstatus:kod'?: string;
  'handlaggningsstatus:kodnamn'?: string;
  'handlaggningsstatus:kortnamn'?: string;
  'handlaggningsstatus:namn'?: string;
  'handlaggningsstatus:sortering'?: string | number;
  'handlaggningsstatus:beskrivning'?: string;
  'handlaggningsstatus:giltigFran'?: string;
  'handlaggningsstatus:giltig_fran'?: string;
  'handlaggningsstatus:giltigTill'?: string;
  'handlaggningsstatus:giltig_till'?: string;
  'cv:kod'?: string;
  'cv:kodnamn'?: string;
  'cv:kortnamn'?: string;
  'cv:namn'?: string;
  'cv:sortering'?: string | number;
  'cv:giltigFran'?: string;
  'cv:giltigTill'?: string;
  'dc:description'?: string | null;
  'dc:created'?: string;
  'dc:title'?: string;
  'dc:creator'?: NxUser;
  'dc:contributors'?: NxUser[] | null;
}

interface HandlaggningsstatusEditEvent {
  title?: string | null;
  code?: string | null;
  codeName?: string | null;
  shortName?: string | null;
  name?: string | null;
  description?: string | null;
  sort?: string | number | null;
  dateFrom?: Date[] | string[] | null;
  dateTill?: Date[] | string[] | null;
}

@Component({
  selector: 'nuxeo-handlaggningsstatus-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, DocumentInfoPageComponent],
  templateUrl: './handlaggningsstatus-page.component.html',
})
export class HandlaggningsstatusPageComponent implements OnInit {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  private readonly route = inject(ActivatedRoute);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auditRefresh = inject(AuditRefreshService);
  private readonly store = inject(GeneralStore);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');

  document = signal<NuxeoDocument<HandlaggningsstatusProperties> | null>(null);
  isLoading = signal(true);
  loadError = signal(false);
  isEditOpen = signal(false);
  isSaving = signal(false);
  editConfig = signal<FieldConfig[]>([]);

  private readonly emptyProps: HandlaggningsstatusProperties = Object.create(null);
  props = computed(() => this.document()?.properties ?? this.emptyProps);
  readonly getUserFullName = formatUserFullName;
  statusItems = computed<InfoItem[]>(() => {
    const props = this.props();

    return [
      { label: 'Status', value: this.document()?.state ?? '' },
      { label: 'Senast ändrad', value: formatDateOrMissing(this.document()?.lastModified) },
      { label: 'Skapad', value: formatDateOrMissing(props[NUXEO_SCHEMA_FIELDS.dc.created]) },
      { label: 'Skapad av', value: formatUserFullName(props[NUXEO_SCHEMA_FIELDS.dc.creator]) },
      {
        label: 'Bidragsgivare',
        value: this.props()
          [NUXEO_SCHEMA_FIELDS.dc.contributors]?.map(val => formatUserFullName(val))
          .join(', '),
      },
    ];
  });
  detailItems = computed<InfoItem[]>(() => {
    const props = this.props();

    return [
      {
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        value: props[NUXEO_SCHEMA_FIELDS.dc.title] ?? '',
      },
      {
        label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',

        value: props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kod] ?? props[NUXEO_SCHEMA_FIELDS.cv.kod] ?? '',
      },
      {
        label: this.store.getValue('label.ui.schema.cv.kodnamn') ?? 'Kodnamn',

        value: props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kodnamn] ?? props[NUXEO_SCHEMA_FIELDS.cv.kodnamn] ?? '',
      },
      {
        label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',

        value: props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kortnamn] ?? props[NUXEO_SCHEMA_FIELDS.cv.kortnamn] ?? '',
      },
      {
        label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',

        value: props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.namn] ?? props[NUXEO_SCHEMA_FIELDS.cv.namn] ?? '',
      },
      {
        label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',

        value:
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.sortering] ?? props[NUXEO_SCHEMA_FIELDS.cv.sortering] ?? '',
      },
      {
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        value:
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.beskrivning] ?? props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '',
        preserveWhitespace: true,
      },
      {
        label: this.store.getValue('label.ui.schema.cv.giltigFran') ?? 'Giltig från',
        value: formatDateOrMissing(
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigFran] ?? props[NUXEO_SCHEMA_FIELDS.cv.giltigFran]
        ),
      },
      {
        label: this.store.getValue('label.ui.schema.cv.giltigTill') ?? 'Giltig till',
        value: formatDateOrMissing(
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigTill] ?? props[NUXEO_SCHEMA_FIELDS.cv.giltigTill]
        ),
      },
    ];
  });
  auditEntries = computed<AuditEntry[]>(() => sortAuditEntries(this.document()?.contextParameters?.audit ?? []));

  ngOnInit(): void {
    loadVocabPage<HandlaggningsstatusProperties>({
      route: this.route,
      auditRefresh: this.auditRefresh,
      docTypeName: 'Handlaggningsstatus',
      setLoading: v => this.isLoading.set(v),
      setError: v => this.loadError.set(v),
      setDocument: doc => this.document.set(doc),
      onLoad: () => this.refreshEditConfig(),
    });
  }

  openEdit(): void {
    this.refreshEditConfig();
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
  }

  handleEditResult(event: HandlaggningsstatusEditEvent) {
    const doc = this.document();
    if (!doc) return;
    const previousAuditTimestamp = this.auditRefresh.getLatestAuditTimestamp(doc);
    const props = this.props();
    const codeKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kod] === undefined
        ? NUXEO_SCHEMA_FIELDS.cv.kod
        : NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kod;
    const codeNameKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kodnamn] === undefined
        ? NUXEO_SCHEMA_FIELDS.cv.kodnamn
        : NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kodnamn;
    const shortNameKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kortnamn] === undefined
        ? NUXEO_SCHEMA_FIELDS.cv.kortnamn
        : NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kortnamn;
    const nameKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.namn] === undefined
        ? NUXEO_SCHEMA_FIELDS.cv.namn
        : NUXEO_SCHEMA_FIELDS.handlaggningsstatus.namn;
    const sortKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.sortering] === undefined
        ? NUXEO_SCHEMA_FIELDS.cv.sortering
        : NUXEO_SCHEMA_FIELDS.handlaggningsstatus.sortering;
    const descriptionKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.beskrivning] === undefined
        ? NUXEO_SCHEMA_FIELDS.dc.description
        : NUXEO_SCHEMA_FIELDS.handlaggningsstatus.beskrivning;
    const validFromKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigFran] !== undefined
        ? NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigFran
        : NUXEO_SCHEMA_FIELDS.cv.giltigFran;
    const validTillKey =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigTill] !== undefined
        ? NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigTill
        : NUXEO_SCHEMA_FIELDS.cv.giltigTill;

    const code = event.code ?? '';
    const shortName = event.shortName ?? '';
    const computedTitle = code && shortName ? `${code} ${shortName}` : doc.title;
    const dateFrom = event.dateFrom?.[0] ?? null;
    const dateTill = event.dateTill?.[0] ?? null;

    const updates: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: event.title ?? computedTitle,
      [codeKey]: event.code ?? null,
      [codeNameKey]: event.codeName ?? null,
      [shortNameKey]: event.shortName ?? null,
      [nameKey]: event.name ?? null,
      [sortKey]: event.sort ?? null,
      [descriptionKey]: event.description ?? null,
      [validFromKey]: dateFrom,
      [validTillKey]: dateTill,
    };

    saveVocabDocument<HandlaggningsstatusProperties>({
      uid: doc.uid,
      updates,
      previousAuditTimestamp,
      nuxeoApi: this.nuxeoApi,
      auditRefresh: this.auditRefresh,
      store: this.store,
      docTypeName: 'Handlaggningsstatus',
      onDocumentUpdate: newDoc => this.document.set(newDoc),
      setSaving: v => this.isSaving.set(v),
      setEditOpen: v => this.isEditOpen.set(v),
      successMsg: HANDLAGGNINGSSTATUS_UPDATE_SUCCESS_MESSAGE,
      errorMsg: HANDLAGGNINGSSTATUS_UPDATE_ERROR_MESSAGE,
    });
  }

  private refreshEditConfig(): void {
    const doc = this.document();
    if (!doc) return;
    const props = this.props();
    const validFromValue =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigFran] ?? props[NUXEO_SCHEMA_FIELDS.cv.giltigFran];
    const validTillValue =
      props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.giltigTill] ?? props[NUXEO_SCHEMA_FIELDS.cv.giltigTill];
    this.editConfig.set([
      {
        type: 'input',
        name: 'title',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.dc.title] ?? doc.title ?? '',
      },
      {
        type: 'input',
        name: 'code',
        label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kod] ?? props[NUXEO_SCHEMA_FIELDS.cv.kod] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'codeName',
        label: this.store.getValue('label.ui.schema.cv.kodnamn') ?? 'Kodnamn',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kodnamn] ?? props[NUXEO_SCHEMA_FIELDS.cv.kodnamn] ?? '',
      },
      {
        type: 'input',
        name: 'shortName',
        label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.kortnamn] ?? props[NUXEO_SCHEMA_FIELDS.cv.kortnamn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'name',
        label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.namn] ?? props[NUXEO_SCHEMA_FIELDS.cv.namn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.beskrivning] ?? props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '',
      },
      {
        type: 'input',
        name: 'sort',
        label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',
        inputType: 'number',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.handlaggningsstatus.sortering] ?? props[NUXEO_SCHEMA_FIELDS.cv.sortering] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'datepicker',
        name: 'dateFrom',
        label: this.store.getValue('label.ui.schema.cv.giltigFran') ?? 'Giltig från',
        defaultValue: validFromValue ? [new Date(validFromValue)] : null,
        validators: [Validators.required],
      },
      {
        type: 'datepicker',
        name: 'dateTill',
        label: this.store.getValue('label.ui.schema.cv.giltigTill') ?? 'Giltig till',
        defaultValue: validTillValue ? [new Date(validTillValue)] : null,
        validators: [Validators.required],
      },
    ]);
  }
}
