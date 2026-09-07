import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { DigiButton, DigiDialog } from '@designsystem-se/af-angular';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { HandlingsnamnOptionsComponent } from '@app/shared/components/edit-form-components/handlingsnamn-options/handlingsnamn-options.component';

import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  HANDLINGSTYP_LOAD_ERROR_MESSAGE,
  HANDLINGSTYP_UPDATE_ERROR_MESSAGE,
  HANDLINGSTYP_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import {
  AuditEntry,
  Direction,
  DirectoryEntry,
  NuxeoDocument,
  NuxeoExtendedProperties,
} from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import {
  BasicMetaDataTableComponent,
  MetadataDefinitionRow,
} from '@app/shared/components/edit-form-components/basic-metadata-table/basic-metadata-table.component';
import { Option } from '@app/shared/commonTypes';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';

interface HandlingstypProperties extends NuxeoExtendedProperties {
  'handlingstyp:arkiveringsregel'?: DirectoryEntry | null;
  'handlingstyp:gallringsbeslut'?: DirectoryEntry | null;
  'handlingstyp:sekretess'?: DirectoryEntry | null;
  'handlingstyp:sakerhetsskyddsklassificering'?: DirectoryEntry | null;
  'handlingstyp:handlingstyp'?: string | null;
  'handlingstyp:handlingsnamn'?: string[] | null;
  'handlingstyp:kommentar'?: string | null;
  'handlingstyp:lagrum'?: { title?: string; uid?: string }[] | null;
  'handlingstyp:diarieforing'?: boolean | null;
  'handlingstyp:automatiskGallring'?: boolean | null;
  'handlingstyp:gallringstid'?: string | null;
  'handlingstyp:arkivieringstid'?: string | null;
  'handlingstyp:bevarandekommentar'?: string | null;
  'handlingstyp:gallringskommentar'?: string | null;
  'dc:description'?: string | null;
  'dmsmetadatadefinition:faltdefinition'?: MetadataDefinitionRow[] | null;
}

interface HandlingstypEditEvent {
  handlingstyp?: string | null;
  handlingsnamn?: string[] | null;
  description?: string | null;
  comment?: string | null;
  diarieforing?: boolean | null;
  arkiveringsregel?: string | null;
  automatiskGallring?: boolean | null;
  gallringstid?: string | null;
  arkiveringstid?: string | null;
  bevarandekommentar?: string | null;
  gallringskommentar?: string | null;
  gallringsbeslut?: string | null;
  sekretess?: string | null;
  sakerhetsskyddsklassificering?: string | null;
  metadataDefinition?: MetadataDefinitionRow[] | null;
}

@Component({
  selector: 'nuxeo-handlingstyp-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    NavigationBreadComponent,
    GeneralFormComponent,
    BasicMetaDataTableComponent,
    DigiButton,
    DigiDialog,
  ],
  templateUrl: './handlingstyp-page.component.html',
})
export class HandlingstypPageComponent implements OnInit {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  readonly getUserFullName = formatUserFullName;
  private readonly route = inject(ActivatedRoute);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auditRefresh = inject(AuditRefreshService);
  private readonly store = inject(GeneralStore);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');

  document = signal<NuxeoDocument<HandlingstypProperties> | null>(null);
  isLoading = signal(true);
  loadError = signal(false);
  isEditOpen = signal(false);
  isSaving = signal(false);
  editConfig = signal<FieldConfig[]>([]);
  handlingsnamnValues = signal<string[]>([]);

  metadataDefinitionFields = signal<MetadataDefinitionRow[]>([]);
  editMetadataDefinitionFields = signal<MetadataDefinitionRow[]>([]);

  private readonly emptyProps: HandlingstypProperties = Object.create(null);
  props = computed(() => this.document()?.properties ?? this.emptyProps);
  readonly formatDateOrMissing = formatDateOrMissing;
  contributorsLabel = computed(() =>
    this.props()
      [NUXEO_SCHEMA_FIELDS.dc.contributors]?.map(val => formatUserFullName(val))
      .join(', ')
  );
  lagrumLabels = computed(() =>
    (this.props()[NUXEO_SCHEMA_FIELDS.handlingstyp.lagrum] ?? [])
      .map(item => item?.title ?? '')
      .filter(label => label.length)
      .join(', ')
  );

  auditEntries = computed<AuditEntry[]>(() => {
    const entries = this.document()?.contextParameters?.audit ?? [];
    return [...entries].sort((entryA, entryB) => {
      const timeA = Date.parse(entryA.eventDate ?? entryA.logDate ?? '');
      const timeB = Date.parse(entryB.eventDate ?? entryB.logDate ?? '');
      const valueA = Number.isNaN(timeA) ? 0 : timeA;
      const valueB = Number.isNaN(timeB) ? 0 : timeB;
      return valueB - valueA;
    });
  });

  ngOnInit(): void {
    this.route.params
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.loadError.set(false);
          this.document.set(null);
        }),
        switchMap(params => this.auditRefresh.loadDocumentWithAudit<HandlingstypProperties>(params['id'])),
        tap(doc => {
          this.document.set(doc);
          this.isLoading.set(false);
          this.syncMetadataDefinition(doc);
          this.refreshEditConfig();
        }),
        catchError(() => {
          this.store.notification.set({ show: true, variation: 'danger', text: HANDLINGSTYP_LOAD_ERROR_MESSAGE });
          this.loadError.set(true);
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe();

    this.loadDirectoryOptions('Arkiveringsregel', 'arkiveringsregel');
    this.loadGallringsbeslutOptions();
    this.loadDirectoryOptions('Sekretess', 'sekretess');
    this.loadDirectoryOptions('Sakerhetsskyddsklassificering', 'sakerhetsskyddsklassificering');
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

  handleEditResult(event: HandlingstypEditEvent) {
    const doc = this.document();
    if (!doc) return;
    const previousAuditTimestamp = this.auditRefresh.getLatestAuditTimestamp(doc);
    const handlingsnamn = event.handlingsnamn ?? [];
    const description = event.description ?? null;
    const comment = event.comment ?? null;
    const diarieforing = event.diarieforing ?? false;
    const automatiskGallring = event.automatiskGallring ?? false;

    const metadataDefinition = (event.metadataDefinition ?? []).map(field => ({
      nyckel: field.nyckel ?? '',
      flervardig: Boolean(field.flervardig),
      aktiv: Boolean(field.aktiv),
      typ: field.typ ?? '',
      ordning: field.ordning ?? null,
    }));

    const updates: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.handlingstyp.handlingstyp]: event.handlingstyp ?? null,
      [NUXEO_SCHEMA_FIELDS.dc.description]: description,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn]: handlingsnamn.length ? handlingsnamn : [],
      [NUXEO_SCHEMA_FIELDS.handlingstyp.kommentar]: comment,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.diarieforing]: diarieforing,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.arkiveringsregel]: event.arkiveringsregel ?? null,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.automatiskGallring]: automatiskGallring,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.gallringstid]: event.gallringstid ?? null,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.arkivieringstid]: event.arkiveringstid ?? null,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.bevarandekommentar]: event.bevarandekommentar ?? null,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.gallringskommentar]: event.gallringskommentar ?? null,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.gallringsbeslut]: event.gallringsbeslut || null,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.sekretess]: event.sekretess ?? null,
      [NUXEO_SCHEMA_FIELDS.handlingstyp.sakerhetsskyddsklassificering]: event.sakerhetsskyddsklassificering ?? null,
      [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: metadataDefinition,
    };

    this.isSaving.set(true);
    this.nuxeoApi
      .editDocument(doc.uid, updates)
      .pipe(
        switchMap(() => this.auditRefresh.loadDocumentWithAudit<HandlingstypProperties>(doc.uid)),
        tap(fullDoc => {
          this.document.set(fullDoc);
          this.syncMetadataDefinition(fullDoc);
          this.auditRefresh
            .refreshAuditAsync<HandlingstypProperties>(doc.uid, previousAuditTimestamp, updatedDoc =>
              this.document.set(updatedDoc)
            )
            .subscribe();
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: HANDLINGSTYP_UPDATE_SUCCESS_MESSAGE,
          });
          this.isSaving.set(false);
          this.isEditOpen.set(false);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: HANDLINGSTYP_UPDATE_ERROR_MESSAGE,
          });
          this.isSaving.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  private refreshEditConfig(): void {
    const doc = this.document();
    if (!doc) return;
    const props = this.props();

    this.editMetadataDefinitionFields.set(this.metadataDefinitionFields().map(item => ({ ...item })));
    this.handlingsnamnValues.set([...(props[NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn] ?? [])]);

    this.editConfig.set([
      {
        type: 'textarea',
        name: 'handlingstyp',
        label: this.store.getValue('label.ui.schema.handlingstyp.handlingstyp') ?? 'Handlingstyp',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.handlingstyp] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'component',
        name: 'handlingsnamn',
        label: this.store.getValue('label.ui.schema.handling.handlingsnamn') ?? 'Handlingsnamn',
        class: HandlingsnamnOptionsComponent,
        props: { tableFields: this.handlingsnamnValues },
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '',
      },
      {
        type: 'textarea',
        name: 'comment',
        label: this.store.getValue('label.ui.schema.handlingstyp.kommentar') ?? 'Kommentar',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.kommentar] ?? '',
      },
      {
        type: 'checkbox',
        name: 'diarieforing',
        label: this.store.getValue('label.ui.schema.handlingstyp.diarieforing') ?? 'Diarieföring',
        defaultValue: Boolean(props[NUXEO_SCHEMA_FIELDS.handlingstyp.diarieforing]),
      },
      {
        type: 'dropdown',
        name: 'arkiveringsregel',
        label: this.store.getValue('label.ui.schema.handlingstyp.arkiveringsregel') ?? 'Arkiveringsregel',
        options: this.arkiveringsregelOptions,
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.arkiveringsregel] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'checkbox',
        name: 'automatiskGallring',
        label: this.store.getValue('label.ui.schema.handlingstyp.automatiskGallring') ?? 'Automatisk Gallring',
        defaultValue: Boolean(props[NUXEO_SCHEMA_FIELDS.handlingstyp.automatiskGallring]),
      },
      {
        type: 'input',
        name: 'gallringstid',
        label: this.store.getValue('label.ui.schema.handlingstyp.gallringstid') ?? 'Gallringstid',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.gallringstid] ?? '',
      },
      {
        type: 'input',
        name: 'arkiveringstid',
        label: this.store.getValue('label.ui.schema.handlingstyp.arkivieringstid') ?? 'Arkivieringstid',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.arkivieringstid] ?? '',
      },
      {
        type: 'textarea',
        name: 'bevarandekommentar',
        label: this.store.getValue('label.ui.schema.handlingstyp.bevarandekommentar') ?? 'Bevarandekommentar',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.bevarandekommentar] ?? '',
      },
      {
        type: 'textarea',
        name: 'gallringskommentar',
        label: this.store.getValue('label.ui.schema.handlingstyp.gallringskommentar') ?? 'Gallringskommentar',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.gallringskommentar] ?? '',
      },
      {
        type: 'dropdown',
        name: 'gallringsbeslut',
        label: this.store.getValue('label.ui.schema.handlingstyp.gallringsbeslut') ?? 'Gallringsbeslut',
        options: this.gallringsbeslutOptions,
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.gallringsbeslut] ?? '',
      },
      {
        type: 'dropdown',
        name: 'sekretess',
        label: this.store.getValue('label.ui.schema.handlingstyp.sekretess') ?? 'Sekretess',
        options: this.sekretessOptions,
        defaultValue:
          props[NUXEO_SCHEMA_FIELDS.handlingstyp.sekretess]?.properties?.id ??
          props[NUXEO_SCHEMA_FIELDS.handlingstyp.sekretess]?.id ??
          '',
        validators: [Validators.required],
      },
      {
        type: 'dropdown-search',
        name: 'lagrum',
        label: 'Lagrum',
        options: [],
        multiple: true,
        isHidden: true,
      },
      {
        type: 'dropdown',
        name: 'sakerhetsskyddsklassificering',
        label:
          this.store.getValue('label.ui.schema.handlingstyp.sakerhetsskyddsklassificering') ??
          'Säkerhetsskyddsklassificering',
        options: this.sakerhetsskyddsklassificeringOptions,
        defaultValue: props[NUXEO_SCHEMA_FIELDS.handlingstyp.sakerhetsskyddsklassificering] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'component',
        name: 'metadataDefinition',
        label: this.store.getValue('label.ui.schema.dmsmetadataanpassad.faltdefinition') ?? 'Fältdefinition',
        class: BasicMetaDataTableComponent,
        props: { tableFields: this.editMetadataDefinitionFields },
      },
    ]);
  }

  private loadDirectoryOptions(directoryName: string, fieldName: string) {
    this.nuxeoApi
      .getDirectorySuggestions(directoryName)
      .pipe(
        tap(options => {
          const mappedOptions = this.mapDirectoryOptions(options);
          if (fieldName === 'arkiveringsregel') this.arkiveringsregelOptions = mappedOptions;
          if (fieldName === 'sekretess') this.sekretessOptions = mappedOptions;
          if (fieldName === 'sakerhetsskyddsklassificering') {
            this.sakerhetsskyddsklassificeringOptions = mappedOptions;
          }
          this.updateEditConfigOptions(fieldName, mappedOptions);
        })
      )
      .subscribe();
  }

  private loadGallringsbeslutOptions() {
    this.nuxeoApi
      .requestPageProviderOptions('default')
      .pipe(
        tap(result => {
          this.gallringsbeslutOptions = result.entries.map(entry => ({ id: entry.uid, label: entry.title }));
          this.updateEditConfigOptions('gallringsbeslut', this.gallringsbeslutOptions);
        })
      )
      .subscribe();
  }

  private mapDirectoryOptions(entries: Direction[]): Option[] {
    return entries
      .flatMap(entry => {
        if (entry.children?.length) {
          return entry.children.map(child => ({ id: child.computedId, label: child.absoluteLabel }));
        }
        const id = entry.computedId ?? entry.id;
        const label = entry.absoluteLabel ?? entry.displayLabel ?? entry.label ?? entry.id;
        return id ? [{ id, label }] : [];
      })
      .filter(option => !!option.id && !!option.label);
  }

  private syncMetadataDefinition(doc: NuxeoDocument<HandlingstypProperties> | null) {
    const raw = doc?.properties?.[NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition] ?? [];
    const mapped = raw.map((entry, index) => ({
      id: this.buildMetadataId(entry, index),
      nyckel: entry?.nyckel ?? '',
      flervardig: Boolean(entry?.flervardig),
      aktiv: Boolean(entry?.aktiv),
      typ: entry?.typ ?? '',
      ordning: entry?.ordning ?? index + 1,
    }));
    this.metadataDefinitionFields.set(mapped);
  }

  private updateEditConfigOptions(fieldName: string, options: Option[]) {
    if (!this.editConfig().length) return;
    this.editConfig.update(config => config.map(field => (field.name === fieldName ? { ...field, options } : field)));
  }

  private buildMetadataId(entry: MetadataDefinitionRow, index: number): string {
    const base = entry?.nyckel ?? '';
    return base ? `${base}-${index + 1}` : `metadata-${index + 1}`;
  }

  private arkiveringsregelOptions: Option[] = [];
  private gallringsbeslutOptions: Option[] = [];
  private sekretessOptions: Option[] = [];
  private sakerhetsskyddsklassificeringOptions: Option[] = [];
}
