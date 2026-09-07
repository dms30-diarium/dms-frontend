import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  BEREDNINGSBESLUT_UPDATE_ERROR_MESSAGE,
  BEREDNINGSBESLUT_UPDATE_SUCCESS_MESSAGE,
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

interface BeredningsbeslutProperties extends NuxeoProperties {
  'beredningsbeslut:kod'?: string;
  'beredningsbeslut:kodnamn'?: string;
  'beredningsbeslut:kortnamn'?: string;
  'beredningsbeslut:namn'?: string;
  'beredningsbeslut:sortering'?: string | number;
  'beredningsbeslut:beskrivning'?: string;
  'beredningsbeslut:giltigFran'?: string;
  'beredningsbeslut:giltig_fran'?: string;
  'beredningsbeslut:giltigTill'?: string;
  'beredningsbeslut:giltig_till'?: string;
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
}

interface BeredningsbeslutEditEvent {
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
  selector: 'nuxeo-beredningsbeslut-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, DocumentInfoPageComponent],
  templateUrl: './beredningsbeslut-page.component.html',
})
export class BeredningsbeslutPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auditRefresh = inject(AuditRefreshService);
  private readonly store = inject(GeneralStore);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');

  document = signal<NuxeoDocument<BeredningsbeslutProperties> | null>(null);
  isLoading = signal(true);
  loadError = signal(false);
  isEditOpen = signal(false);
  isSaving = signal(false);
  editConfig = signal<FieldConfig[]>([]);

  private readonly emptyProps: BeredningsbeslutProperties = Object.create(null);
  props = computed(() => this.document()?.properties ?? this.emptyProps);
  statusItems = computed<InfoItem[]>(() => buildVocabStatusItems(this.document(), this.props()));
  detailItems = computed<InfoItem[]>(() => [
    {
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      value: this.props()[NUXEO_SCHEMA_FIELDS.dc.title] ?? this.document()?.title ?? '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',

      value: this.props()[NUXEO_SCHEMA_FIELDS.cv.kod] ?? this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.kod] ?? '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.kodnamn') ?? 'Kodnamn',

      value:
        this.props()[NUXEO_SCHEMA_FIELDS.cv.kodnamn] ??
        this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.kodnamn] ??
        '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',

      value:
        this.props()[NUXEO_SCHEMA_FIELDS.cv.kortnamn] ??
        this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.kortnamn] ??
        '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',

      value: this.props()[NUXEO_SCHEMA_FIELDS.cv.namn] ?? this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.namn] ?? '',
    },
    {
      label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',

      value:
        this.props()[NUXEO_SCHEMA_FIELDS.cv.sortering] ??
        this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.sortering] ??
        '',
    },
    {
      label: this.store.getValue('label.description') ?? 'Beskrivning',
      value:
        this.props()[NUXEO_SCHEMA_FIELDS.dc.description] ??
        this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.beskrivning] ??
        '',
      preserveWhitespace: true,
    },
    {
      label: this.store.getValue('label.ui.schema.cv.giltigFran') ?? 'Giltig från',
      value: formatDateOrMissing(
        this.props()[NUXEO_SCHEMA_FIELDS.cv.giltigFran] ?? this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.giltigFran]
      ),
    },
    {
      label: this.store.getValue('label.ui.schema.cv.giltigTill') ?? 'Giltig till',
      value: formatDateOrMissing(
        this.props()[NUXEO_SCHEMA_FIELDS.cv.giltigTill] ?? this.props()[NUXEO_SCHEMA_FIELDS.beredningsbeslut.giltigTill]
      ),
    },
  ]);
  auditEntries = computed<AuditEntry[]>(() => sortAuditEntries(this.document()?.contextParameters?.audit ?? []));

  ngOnInit(): void {
    loadVocabPage<BeredningsbeslutProperties>({
      route: this.route,
      auditRefresh: this.auditRefresh,
      docTypeName: 'Beredningsbeslut',
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

  handleEditResult(event: BeredningsbeslutEditEvent) {
    const doc = this.document();
    if (!doc) return;
    const previousAuditTimestamp = this.auditRefresh.getLatestAuditTimestamp(doc);
    const props = this.props();
    const codeKey =
      props[NUXEO_SCHEMA_FIELDS.cv.kod] === undefined
        ? NUXEO_SCHEMA_FIELDS.beredningsbeslut.kod
        : NUXEO_SCHEMA_FIELDS.cv.kod;
    const codeNameKey =
      props[NUXEO_SCHEMA_FIELDS.cv.kodnamn] === undefined
        ? NUXEO_SCHEMA_FIELDS.beredningsbeslut.kodnamn
        : NUXEO_SCHEMA_FIELDS.cv.kodnamn;
    const shortNameKey =
      props[NUXEO_SCHEMA_FIELDS.cv.kortnamn] === undefined
        ? NUXEO_SCHEMA_FIELDS.beredningsbeslut.kortnamn
        : NUXEO_SCHEMA_FIELDS.cv.kortnamn;
    const nameKey =
      props[NUXEO_SCHEMA_FIELDS.cv.namn] === undefined
        ? NUXEO_SCHEMA_FIELDS.beredningsbeslut.namn
        : NUXEO_SCHEMA_FIELDS.cv.namn;
    const sortKey =
      props[NUXEO_SCHEMA_FIELDS.cv.sortering] === undefined
        ? NUXEO_SCHEMA_FIELDS.beredningsbeslut.sortering
        : NUXEO_SCHEMA_FIELDS.cv.sortering;
    const descriptionKey =
      props[NUXEO_SCHEMA_FIELDS.dc.description] === undefined
        ? NUXEO_SCHEMA_FIELDS.beredningsbeslut.beskrivning
        : NUXEO_SCHEMA_FIELDS.dc.description;
    const validFromKey =
      props[NUXEO_SCHEMA_FIELDS.cv.giltigFran] !== undefined
        ? NUXEO_SCHEMA_FIELDS.cv.giltigFran
        : NUXEO_SCHEMA_FIELDS.beredningsbeslut.giltigFran;
    const validTillKey =
      props[NUXEO_SCHEMA_FIELDS.cv.giltigTill] !== undefined
        ? NUXEO_SCHEMA_FIELDS.cv.giltigTill
        : NUXEO_SCHEMA_FIELDS.beredningsbeslut.giltigTill;

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

    saveVocabDocument<BeredningsbeslutProperties>({
      uid: doc.uid,
      updates,
      previousAuditTimestamp,
      nuxeoApi: this.nuxeoApi,
      auditRefresh: this.auditRefresh,
      store: this.store,
      docTypeName: 'Beredningsbeslut',
      onDocumentUpdate: newDoc => this.document.set(newDoc),
      setSaving: v => this.isSaving.set(v),
      setEditOpen: v => this.isEditOpen.set(v),
      successMsg: BEREDNINGSBESLUT_UPDATE_SUCCESS_MESSAGE,
      errorMsg: BEREDNINGSBESLUT_UPDATE_ERROR_MESSAGE,
    });
  }

  private refreshEditConfig(): void {
    const doc = this.document();
    if (!doc) return;
    const props = this.props();
    const validFromValue =
      props[NUXEO_SCHEMA_FIELDS.cv.giltigFran] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.giltigFran];
    const validTillValue =
      props[NUXEO_SCHEMA_FIELDS.cv.giltigTill] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.giltigTill];
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
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.kod] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.kod] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'codeName',
        label: this.store.getValue('label.ui.schema.cv.kodnamn') ?? 'Kodnamn',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.cv.kodnamn] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.kodnamn] ?? '',
      },
      {
        type: 'input',
        name: 'shortName',
        label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.cv.kortnamn] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.kortnamn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'name',
        label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.namn] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.namn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.dc.description] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.beskrivning] ?? '',
      },
      {
        type: 'input',
        name: 'sort',
        label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',
        inputType: 'number',
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.cv.sortering] ?? props[NUXEO_SCHEMA_FIELDS.beredningsbeslut.sortering] ?? '',
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
