import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  KLASSTYP_UPDATE_ERROR_MESSAGE,
  KLASSTYP_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import {
  DocumentInfoPageComponent,
  InfoItem,
} from '@app/shared/components/document-info-page/document-info-page.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { buildVocabStatusItems, loadVocabPage, saveVocabDocument, sortAuditEntries } from '../vocabulary-page-helpers';

interface KlasstypProperties extends NuxeoProperties {
  'klasstyp:kod'?: string;
  'klasstyp:kortnamn'?: string;
  'klasstyp:namn'?: string;
  'klasstyp:beskrivning'?: string;
  'klasstyp:sortering'?: string | number;
  'klasstyp:giltigFran'?: string;
  'klasstyp:giltig_fran'?: string;
  'klasstyp:giltigTill'?: string;
  'klasstyp:giltig_till'?: string;
  'cv:kod'?: string;
  'cv:kortnamn'?: string;
  'cv:namn'?: string;
  'cv:beskrivning'?: string;
  'cv:sortering'?: string | number;
  'cv:giltigFran'?: string;
  'cv:giltigTill'?: string;
  'dc:description'?: string | null;
  'dc:created'?: string;
  'dc:title'?: string;
}

interface KlasstypEditEvent {
  title?: string | null;
  code?: string | null;
  shortName?: string | null;
  name?: string | null;
  description?: string | null;
  sort?: string | number | null;
  dateFrom?: Date[] | string[] | null;
  dateTill?: Date[] | string[] | null;
}

@Component({
  selector: 'nuxeo-klasstyp-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, DocumentInfoPageComponent],
  templateUrl: './klasstyp-page.component.html',
})
export class KlasstypPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auditRefresh = inject(AuditRefreshService);
  private readonly store = inject(GeneralStore);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');

  document = signal<NuxeoDocument<KlasstypProperties> | null>(null);
  isLoading = signal(true);
  loadError = signal(false);
  isEditOpen = signal(false);
  isSaving = signal(false);
  editConfig = signal<FieldConfig[]>([]);

  private readonly emptyProps: KlasstypProperties = Object.create(null);
  props = computed(() => this.document()?.properties ?? this.emptyProps);
  statusItems = computed<InfoItem[]>(() => buildVocabStatusItems(this.document(), this.props()));
  detailItems = computed<InfoItem[]>(() => [
    {
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      value: this.props()[NUXEO_SCHEMA_FIELDS.dc.title] ?? this.document()?.title ?? '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',

      value: this.props()[NUXEO_SCHEMA_FIELDS.cv.kod] ?? this.props()[NUXEO_SCHEMA_FIELDS.klasstyp.kod] ?? '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',

      value: this.props()[NUXEO_SCHEMA_FIELDS.cv.kortnamn] ?? this.props()[NUXEO_SCHEMA_FIELDS.klasstyp.kortnamn] ?? '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',

      value: this.props()[NUXEO_SCHEMA_FIELDS.cv.namn] ?? this.props()[NUXEO_SCHEMA_FIELDS.klasstyp.namn] ?? '',
    },
    {
      label: this.store.getValue('label.description') ?? 'Beskrivning',
      value:
        this.props()[NUXEO_SCHEMA_FIELDS.dc.description] ??
        this.props()[NUXEO_SCHEMA_FIELDS.cv.beskrivning] ??
        this.props()[NUXEO_SCHEMA_FIELDS.klasstyp.beskrivning] ??
        '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',

      value:
        this.props()[NUXEO_SCHEMA_FIELDS.cv.sortering] ?? this.props()[NUXEO_SCHEMA_FIELDS.klasstyp.sortering] ?? '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.giltigFran') ?? 'Giltig från',
      value: formatDateOrMissing(
        this.props()[NUXEO_SCHEMA_FIELDS.cv.giltigFran] ?? this.props()[NUXEO_SCHEMA_FIELDS.klasstyp.giltigFran]
      ),
    },
    {
      label: this.store.getValue('label.ui.schema.cv.giltigTill') ?? 'Giltig till',
      value: formatDateOrMissing(
        this.props()[NUXEO_SCHEMA_FIELDS.cv.giltigTill] ?? this.props()[NUXEO_SCHEMA_FIELDS.klasstyp.giltigTill]
      ),
    },
  ]);
  auditEntries = computed<AuditEntry[]>(() => sortAuditEntries(this.document()?.contextParameters?.audit ?? []));

  ngOnInit(): void {
    loadVocabPage<KlasstypProperties>({
      route: this.route,
      auditRefresh: this.auditRefresh,
      docTypeName: 'Klasstyp',
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

  handleEditResult(event: KlasstypEditEvent) {
    const doc = this.document();
    if (!doc) return;
    const previousAuditTimestamp = this.auditRefresh.getLatestAuditTimestamp(doc);
    const props = this.props();
    const codeKey =
      props[NUXEO_SCHEMA_FIELDS.cv.kod] === undefined ? NUXEO_SCHEMA_FIELDS.klasstyp.kod : NUXEO_SCHEMA_FIELDS.cv.kod;
    const shortNameKey =
      props[NUXEO_SCHEMA_FIELDS.cv.kortnamn] === undefined
        ? NUXEO_SCHEMA_FIELDS.klasstyp.kortnamn
        : NUXEO_SCHEMA_FIELDS.cv.kortnamn;
    const nameKey =
      props[NUXEO_SCHEMA_FIELDS.cv.namn] === undefined
        ? NUXEO_SCHEMA_FIELDS.klasstyp.namn
        : NUXEO_SCHEMA_FIELDS.cv.namn;
    const descriptionKey =
      props[NUXEO_SCHEMA_FIELDS.dc.description] !== undefined
        ? NUXEO_SCHEMA_FIELDS.dc.description
        : props[NUXEO_SCHEMA_FIELDS.cv.beskrivning] !== undefined
          ? NUXEO_SCHEMA_FIELDS.cv.beskrivning
          : NUXEO_SCHEMA_FIELDS.klasstyp.beskrivning;
    const sortKey =
      props[NUXEO_SCHEMA_FIELDS.cv.sortering] === undefined
        ? NUXEO_SCHEMA_FIELDS.klasstyp.sortering
        : NUXEO_SCHEMA_FIELDS.cv.sortering;
    const validFromKey =
      props[NUXEO_SCHEMA_FIELDS.cv.giltigFran] !== undefined
        ? NUXEO_SCHEMA_FIELDS.cv.giltigFran
        : NUXEO_SCHEMA_FIELDS.klasstyp.giltigFran;
    const validTillKey =
      props[NUXEO_SCHEMA_FIELDS.cv.giltigTill] !== undefined
        ? NUXEO_SCHEMA_FIELDS.cv.giltigTill
        : NUXEO_SCHEMA_FIELDS.klasstyp.giltigTill;

    const code = event.code ?? '';
    const shortName = event.shortName ?? '';
    const computedTitle = code && shortName ? `${code} ${shortName}` : doc.title;
    const dateFrom = event.dateFrom?.[0] ?? null;
    const dateTill = event.dateTill?.[0] ?? null;

    const updates: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: event.title ?? computedTitle,
      [codeKey]: event.code ?? null,
      [shortNameKey]: event.shortName ?? null,
      [nameKey]: event.name ?? null,
      [descriptionKey]: event.description ?? null,
      [sortKey]: event.sort ?? null,
      [validFromKey]: dateFrom,
      [validTillKey]: dateTill,
    };

    saveVocabDocument<KlasstypProperties>({
      uid: doc.uid,
      updates,
      previousAuditTimestamp,
      nuxeoApi: this.nuxeoApi,
      auditRefresh: this.auditRefresh,
      store: this.store,
      docTypeName: 'Klasstyp',
      onDocumentUpdate: newDoc => this.document.set(newDoc),
      setSaving: v => this.isSaving.set(v),
      setEditOpen: v => this.isEditOpen.set(v),
      successMsg: KLASSTYP_UPDATE_SUCCESS_MESSAGE,
      errorMsg: KLASSTYP_UPDATE_ERROR_MESSAGE,
    });
  }

  private refreshEditConfig(): void {
    const doc = this.document();
    if (!doc) return;
    const props = this.props();
    const validFromValue = props[NUXEO_SCHEMA_FIELDS.cv.giltigFran] ?? props[NUXEO_SCHEMA_FIELDS.klasstyp.giltigFran];
    const validTillValue = props[NUXEO_SCHEMA_FIELDS.cv.giltigTill] ?? props[NUXEO_SCHEMA_FIELDS.klasstyp.giltigTill];
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
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.kod] ?? props[NUXEO_SCHEMA_FIELDS.klasstyp.kod] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'shortName',
        label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.kortnamn] ?? props[NUXEO_SCHEMA_FIELDS.klasstyp.kortnamn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'name',
        label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.namn] ?? props[NUXEO_SCHEMA_FIELDS.klasstyp.namn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.dc.description] ??
          props[NUXEO_SCHEMA_FIELDS.cv.beskrivning] ??
          props[NUXEO_SCHEMA_FIELDS.klasstyp.beskrivning] ??
          '',
      },
      {
        type: 'input',
        name: 'sort',
        label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',
        inputType: 'number',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.sortering] ?? props[NUXEO_SCHEMA_FIELDS.klasstyp.sortering] ?? '',
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
