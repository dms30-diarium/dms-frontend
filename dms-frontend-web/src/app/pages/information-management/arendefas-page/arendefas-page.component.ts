import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { loadVocabPage, saveVocabDocument } from '../vocabulary-page-helpers';
import { DigiButton, DigiDialog } from '@designsystem-se/af-angular';
import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  ARENDEFAS_UPDATE_ERROR_MESSAGE,
  ARENDEFAS_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

interface ArendefasProperties extends NuxeoProperties {
  'cv:kod'?: string | null;
  'cv:kodnamn'?: string | null;
  'cv:kortnamn'?: string | null;
  'cv:namn'?: string | null;
  'cv:sortering'?: string | number | null;
  'cv:giltigFran'?: string | null;
  'cv:giltigTill'?: string | null;
}

interface ArendefasEditEvent {
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
  selector: 'nuxeo-arendefas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, NavigationBreadComponent, GeneralFormComponent, DigiButton, DigiDialog],
  templateUrl: './arendefas-page.component.html',
})
export class ArendefasPageComponent implements OnInit {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auditRefresh = inject(AuditRefreshService);
  private readonly store = inject(GeneralStore);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');

  document = signal<NuxeoDocument<ArendefasProperties> | null>(null);
  isLoading = signal(true);
  loadError = signal(false);
  isEditOpen = signal(false);
  isSaving = signal(false);
  editConfig = signal<FieldConfig[]>([]);
  private readonly emptyProps: ArendefasProperties = Object.create(null);
  props = computed(() => this.document()?.properties ?? this.emptyProps);
  readonly getUserFullName = formatUserFullName;
  contributorsLabel = computed(() =>
    this.props()
      [NUXEO_SCHEMA_FIELDS.dc.contributors]?.map(val => formatUserFullName(val))
      .join(', ')
  );
  readonly formatDateOrMissing = formatDateOrMissing;

  ngOnInit(): void {
    loadVocabPage<ArendefasProperties>({
      route: this.route,
      auditRefresh: this.auditRefresh,
      docTypeName: 'Arendefas',
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

  submitEdit(): void {
    this.generalForm?.submit();
  }

  handleEditResult(event: ArendefasEditEvent) {
    const doc = this.document();
    if (!doc) return;
    const previousAuditTimestamp = this.auditRefresh.getLatestAuditTimestamp(doc);
    const code = event.code ?? '';
    const shortName = event.shortName ?? '';
    const computedTitle = code && shortName ? `${code} ${shortName}` : doc.title;
    const dateFrom = event.dateFrom?.[0] ?? null;
    const dateTill = event.dateTill?.[0] ?? null;

    const updates: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: event.title ?? computedTitle,
      [NUXEO_SCHEMA_FIELDS.dc.description]: event.description ?? null,
      [NUXEO_SCHEMA_FIELDS.cv.kod]: event.code ?? null,
      [NUXEO_SCHEMA_FIELDS.cv.kodnamn]: event.codeName ?? null,
      [NUXEO_SCHEMA_FIELDS.cv.kortnamn]: event.shortName ?? null,
      [NUXEO_SCHEMA_FIELDS.cv.namn]: event.name ?? null,
      [NUXEO_SCHEMA_FIELDS.cv.sortering]: event.sort ?? null,
      [NUXEO_SCHEMA_FIELDS.cv.giltigFran]: dateFrom,
      [NUXEO_SCHEMA_FIELDS.cv.giltigTill]: dateTill,
    };

    saveVocabDocument<ArendefasProperties>({
      uid: doc.uid,
      updates,
      previousAuditTimestamp,
      nuxeoApi: this.nuxeoApi,
      auditRefresh: this.auditRefresh,
      store: this.store,
      docTypeName: 'Arendefas',
      onDocumentUpdate: newDoc => this.document.set(newDoc),
      setSaving: v => this.isSaving.set(v),
      setEditOpen: v => this.isEditOpen.set(v),
      successMsg: ARENDEFAS_UPDATE_SUCCESS_MESSAGE,
      errorMsg: ARENDEFAS_UPDATE_ERROR_MESSAGE,
    });
  }

  private refreshEditConfig(): void {
    const doc = this.document();
    if (!doc) return;
    const props = this.props();
    const dateFromValue = props[NUXEO_SCHEMA_FIELDS.cv.giltigFran];
    const dateTillValue = props[NUXEO_SCHEMA_FIELDS.cv.giltigTill];
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
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.kod] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'codeName',
        label: this.store.getValue('label.ui.schema.cv.kodnamn') ?? 'Kodnamn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.kodnamn] ?? '',
      },
      {
        type: 'input',
        name: 'shortName',
        label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.kortnamn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'name',
        label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.namn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '',
      },
      {
        type: 'input',
        name: 'sort',
        label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',
        inputType: 'number',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.cv.sortering] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'datepicker',
        name: 'dateFrom',
        label: this.store.getValue('label.ui.schema.cv.giltigFran') ?? 'Giltig från',
        defaultValue: dateFromValue ? [new Date(dateFromValue)] : null,
        validators: [Validators.required],
      },
      {
        type: 'datepicker',
        name: 'dateTill',
        label: this.store.getValue('label.ui.schema.cv.giltigTill') ?? 'Giltig till',
        defaultValue: dateTillValue ? [new Date(dateTillValue)] : null,
        validators: [Validators.required],
      },
    ]);
  }
}
