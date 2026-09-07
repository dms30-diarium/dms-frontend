import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { DigiButton, DigiDialog } from '@designsystem-se/af-angular';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  KLASS_LOAD_ERROR_MESSAGE,
  KLASS_LOAD_OPTIONS_ERROR_MESSAGE,
  KLASS_UPDATE_ERROR_MESSAGE,
  KLASS_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, Direction, NuxeoDocument, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { MetadataDefinitionRow } from '@app/shared/components/edit-form-components/basic-metadata-table/basic-metadata-table.component';
import { BasicMetaDataTableComponent } from '@app/shared/components/edit-form-components/basic-metadata-table/basic-metadata-table.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { Option } from '@app/shared/commonTypes';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';
import { DocRef, KlassEditEvent, KlassProperties } from './types';
import { ArendemeningOptionsComponent } from '@app/shared/components/edit-form-components/arendemening-options/arendemening-options.component';

@Component({
  selector: 'nuxeo-klass-page',
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
  templateUrl: './klass-page.component.html',
})
export class KlassPageComponent implements OnInit {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auditRefresh = inject(AuditRefreshService);
  private readonly store = inject(GeneralStore);
  private readonly formUtils = inject(FormUtilsService);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');

  document = signal<NuxeoDocument<KlassProperties> | null>(null);
  isLoading = signal(true);
  loadError = signal(false);
  isEditOpen = signal(false);
  isSaving = signal(false);
  editConfig = signal<FieldConfig[]>([]);
  metadataDefinitionFields = signal<MetadataDefinitionRow[]>([]);
  beslutstyperOptions = signal<Option[]>([]);
  beredningsbeslutstyperOptions = signal<Option[]>([]);
  handlingstyperOptions = signal<Option[]>([]);
  klasstypOptions = signal<Option[]>([]);
  ansvarigOrgOptions = signal<Option[]>([]);
  fordelningsprincipOptions = signal<Option[]>([]);
  checklistaOptions = signal<Option[]>([]);
  secretClassOptions = signal<Option[]>([]);
  secretOptions = signal<Option[]>([]);
  lagrumOptions = signal<Option[]>([]);
  riktningOptions = signal<Option[]>([]);
  bevarasOptions = signal<Option[]>([]);
  arendemening = signal<Record<string, string>[]>([]);

  private readonly emptyProps: KlassProperties = Object.create(null);
  props = computed(() => this.document()?.properties ?? this.emptyProps);
  readonly formatDateOrMissing = formatDateOrMissing;
  readonly getUserFullName = formatUserFullName;
  contributorsLabel = computed(() =>
    this.props()
      [NUXEO_SCHEMA_FIELDS.dc.contributors]?.map(val => formatUserFullName(val))
      .join(', ')
  );
  klasstypLabel = computed(() => this.props()[NUXEO_SCHEMA_FIELDS.klass.klasstyp]?.title ?? '');
  ansvarigOrgLabel = computed(() => this.props()[NUXEO_SCHEMA_FIELDS.klass.ansvarigOrganisationsenhet]?.title ?? '');
  fordelningsprincipLabel = computed(
    () => this.props()[NUXEO_SCHEMA_FIELDS.klass.fordelningsprincip]?.properties?.label ?? ''
  );
  bevarasLabel = computed(() => this.props()[NUXEO_SCHEMA_FIELDS.klass.bevarasGallras]?.properties?.label ?? '');
  checklistaLabel = computed(() => this.props()[NUXEO_SCHEMA_FIELDS.klass.checklista]?.title ?? '');
  sekretessLabel = computed(() => this.props()[NUXEO_SCHEMA_FIELDS.klass.sekretess]?.properties?.label ?? '');
  sakerhetLabel = computed(
    () => this.props()[NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]?.properties?.label ?? ''
  );
  beslutstyperLabels = computed(() =>
    (this.props()[NUXEO_SCHEMA_FIELDS.klass.beslutstyper] ?? [])
      .map(item => item?.title ?? '')
      .filter(label => label.length)
      .join(', ')
  );
  beredningsbeslutstyperLabels = computed(() =>
    (this.props()[NUXEO_SCHEMA_FIELDS.klass.beredningsbeslutstyper] ?? [])
      .map(item => item?.title ?? '')
      .filter(label => label.length)
      .join(', ')
  );
  handlingstyperLabels = computed(() =>
    (this.props()[NUXEO_SCHEMA_FIELDS.klass.handlingstyper] ?? [])
      .map(item => item?.title ?? '')
      .filter(label => label.length)
      .join(', ')
  );
  lagrumLabels = computed(() =>
    (this.props()[NUXEO_SCHEMA_FIELDS.klass.lagrum] ?? [])
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
        switchMap(params => this.auditRefresh.loadDocumentWithAudit<KlassProperties>(params['id'])),
        tap(doc => {
          this.document.set(doc);
          this.isLoading.set(false);
          this.prepareEditState(doc).subscribe();
        }),
        catchError(() => {
          this.store.notification.set({ show: true, variation: 'danger', text: KLASS_LOAD_ERROR_MESSAGE });
          this.loadError.set(true);
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  openEdit(): void {
    const doc = this.document();
    this.isEditOpen.set(true);
    if (!doc) return;
    this.prepareEditState(doc).subscribe();
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
  }

  submitEdit(): void {
    this.generalForm?.submit();
  }

  handleEditResult(event: KlassEditEvent) {
    const doc = this.document();
    if (!doc) return;
    const previousAuditTimestamp = this.auditRefresh.getLatestAuditTimestamp(doc);
    const code = event.code ?? '';
    const name = event.name ?? '';
    const description = event.description ?? null;
    const gallringsforeskrift = event.gallringsforeskrift === '' ? null : (event.gallringsforeskrift ?? null);
    const ansvarigOrgValue = event.ansvarigOrg === '' ? null : (event.ansvarigOrg ?? null);
    const fordelningsprincipValue = event.fordelningsprincip === '' ? null : (event.fordelningsprincip ?? null);
    const checklistaValue = event.checklista === '' ? null : (event.checklista ?? null);
    const secretClassValue = event.secretClass === '' ? null : (event.secretClass ?? null);
    const secretValue = event.secret === '' ? null : (event.secret ?? null);
    const riktningValue = event.riktning === '' ? null : (event.riktning ?? null);
    const bevarasValue = event.bevaras === '' ? null : (event.bevaras ?? null);
    const computedTitle = code && name ? `${code} ${name}` : doc.title;
    const metadataDefinition = event.metadataDefinition ?? [];
    const beslutstyperValues = (event.beslutstyper ?? []).map(item => item.id).filter(value => value);
    const beredningsbeslutstyperValues = (event.beredningsbeslutstyper ?? [])
      .map(item => item.id)
      .filter(value => value);
    const handlingstyperValues = (event.handlingstyper ?? []).map(item => item.id).filter(value => value);
    const lagrumValues = (event.lagrum ?? []).map(item => item.id).filter(value => value);

    const updates: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: event.title ?? computedTitle,
      [NUXEO_SCHEMA_FIELDS.dc.description]: description,
      [NUXEO_SCHEMA_FIELDS.klass.kod]: event.code ?? '',
      [NUXEO_SCHEMA_FIELDS.klass.namn]: event.name ?? '',
      [NUXEO_SCHEMA_FIELDS.klass.arendemening]: this.arendemening().map(el => el['id']),
      [NUXEO_SCHEMA_FIELDS.klass.beslutstyper]: beslutstyperValues,
      [NUXEO_SCHEMA_FIELDS.klass.beredningsbeslutstyper]: beredningsbeslutstyperValues,
      [NUXEO_SCHEMA_FIELDS.klass.klasstyp]: event.klass?.[0].id || null,
      [NUXEO_SCHEMA_FIELDS.klass.handlingstyper]: handlingstyperValues,
      [NUXEO_SCHEMA_FIELDS.klass.registrerbar]: event.registrerbar ?? false,
      [NUXEO_SCHEMA_FIELDS.klass.ansvarigOrganisationsenhet]: ansvarigOrgValue,
      [NUXEO_SCHEMA_FIELDS.klass.paJkListan]: event.paJkListan ?? false,
      [NUXEO_SCHEMA_FIELDS.klass.fordelningsprincip]: fordelningsprincipValue,
      [NUXEO_SCHEMA_FIELDS.klass.checklista]: checklistaValue,
      [NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]: secretClassValue,
      [NUXEO_SCHEMA_FIELDS.klass.sekretess]: secretValue,
      [NUXEO_SCHEMA_FIELDS.klass.lagrum]: lagrumValues,
      [NUXEO_SCHEMA_FIELDS.klass.riktning]: riktningValue,
      [NUXEO_SCHEMA_FIELDS.klass.bevarasGallras]: bevarasValue,
      [NUXEO_SCHEMA_FIELDS.klass.gallringsforeskrift]: gallringsforeskrift,
      [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: metadataDefinition,
    };

    this.isSaving.set(true);
    this.nuxeoApi
      .editDocument(doc.uid, updates)
      .pipe(
        switchMap(() => this.auditRefresh.loadDocumentWithAudit<KlassProperties>(doc.uid)),
        tap(fullDoc => {
          this.document.set(fullDoc);
          this.auditRefresh
            .refreshAuditAsync<KlassProperties>(doc.uid, previousAuditTimestamp, updatedDoc =>
              this.document.set(updatedDoc)
            )
            .subscribe();
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: KLASS_UPDATE_SUCCESS_MESSAGE,
          });
          this.isSaving.set(false);
          this.isEditOpen.set(false);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: KLASS_UPDATE_ERROR_MESSAGE,
          });
          this.isSaving.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  private prepareEditState(doc: NuxeoDocument<KlassProperties>) {
    this.metadataDefinitionFields.set(this.toMetadataRows(doc));
    this.refreshEditConfig();
    return this.loadFormOptions(doc);
  }

  private loadFormOptions(doc: NuxeoDocument<KlassProperties>) {
    return forkJoin([this.loadEditOptions(doc), this.loadDirectoryOptions()]).pipe(map(() => void 0));
  }

  private loadEditOptions(doc: NuxeoDocument<KlassProperties>) {
    const parentUid = doc.parentRef ?? '';
    if (!parentUid) return of(void 0);

    return forkJoin({
      beslut: this.nuxeoApi.DMSDocumentSuggestion(parentUid, 'Beslut', 'Klass'),
      beredningsbeslut: this.nuxeoApi.DMSDocumentSuggestion(parentUid, 'Beredningsbeslut', 'Klass'),
      handling: this.nuxeoApi.DMSDocumentSuggestion(parentUid, 'Handlingstyp', 'Klass'),
      klass: this.nuxeoApi.DMSDocumentSuggestion(parentUid, 'Klasstyp', 'Klass'),
      organization: this.nuxeoApi.DMSDocumentSuggestion(parentUid, 'Organisationsdel', 'Klass'),
      checklista: this.nuxeoApi.DMSDocumentSuggestion(parentUid, 'Checklista', 'Klass'),
      lagrum: this.nuxeoApi.getLagrumOptions(parentUid),
    }).pipe(
      tap(result => {
        this.beslutstyperOptions.set(this.mapOptions(result.beslut));
        this.beredningsbeslutstyperOptions.set(this.mapOptions(result.beredningsbeslut));
        this.handlingstyperOptions.set(this.mapOptions(result.handling));
        this.klasstypOptions.set(this.mapOptions(result.klass));
        this.ansvarigOrgOptions.set(this.mapOptions(result.organization));
        this.checklistaOptions.set(this.mapOptions(result.checklista));
        this.lagrumOptions.set(result.lagrum);
        this.refreshEditConfig();
      }),
      map(() => void 0),
      catchError(() => {
        this.store.notification.set({ show: true, variation: 'danger', text: KLASS_LOAD_OPTIONS_ERROR_MESSAGE });
        this.beslutstyperOptions.set([]);
        this.beredningsbeslutstyperOptions.set([]);
        this.handlingstyperOptions.set([]);
        this.klasstypOptions.set([]);
        this.ansvarigOrgOptions.set([]);
        this.checklistaOptions.set([]);
        this.lagrumOptions.set([]);
        this.refreshEditConfig();
        return of(void 0);
      })
    );
  }

  private loadDirectoryOptions() {
    return forkJoin({
      riktning: this.getDirectoryOptions('ArendeRiktning'),
      sekretess: this.getDirectoryOptions('Sekretess'),
      secretClass: this.getDirectoryOptions('Sakerhetsskyddsklassificering'),
      bevaras: this.getDirectoryOptions('BevarasGallras'),
      fordelningsprincip: this.getDirectoryOptions('Fordelningsprincip'),
    }).pipe(
      tap(result => {
        this.riktningOptions.set(this.mapDirectoryOptions(result.riktning));
        this.secretOptions.set(this.mapDirectoryOptions(result.sekretess));
        this.secretClassOptions.set(this.mapDirectoryOptions(result.secretClass));
        this.bevarasOptions.set(this.mapDirectoryOptions(result.bevaras));
        this.fordelningsprincipOptions.set(this.mapDirectoryOptions(result.fordelningsprincip));
        this.refreshEditConfig();
      }),
      map(() => void 0),
      catchError(() => {
        this.store.notification.set({ show: true, variation: 'danger', text: KLASS_LOAD_OPTIONS_ERROR_MESSAGE });
        this.refreshEditConfig();
        return of(void 0);
      })
    );
  }

  private refreshEditConfig(): void {
    const doc = this.document();
    if (!doc) return;
    const props = this.props();
    const toIdValue = (value: DocRef | string | null | undefined) => {
      if (value === null || value === undefined) return '';
      if (Object(value) !== value) return `${value}`;
      const obj: Record<string, unknown> = Object(value);
      const rawId = obj['uid'] ?? obj['id'];
      if (rawId) return `${rawId}`;
      const propsValue = obj['properties'];
      if (Object(propsValue) !== propsValue) return '';
      const propsObj: Record<string, unknown> = Object(propsValue);
      const propId = propsObj['id'];
      return propId ? `${propId}` : '';
    };
    const toIdSet = (items: (DocRef | string)[] | null | undefined) =>
      new Set((items ?? []).map(item => toIdValue(item)).filter(value => value.length));
    const pickSelected = (options: Option[], ids: Set<string>) => options.filter(option => ids.has(option.id));
    const beslutstyperIds = toIdSet(props[NUXEO_SCHEMA_FIELDS.klass.beslutstyper]);
    const beredningsbeslutstyperIds = toIdSet(props[NUXEO_SCHEMA_FIELDS.klass.beredningsbeslutstyper]);
    const handlingstyperIds = toIdSet(props[NUXEO_SCHEMA_FIELDS.klass.handlingstyper]);
    const lagrumIds = toIdSet(props[NUXEO_SCHEMA_FIELDS.klass.lagrum]);
    const ansvarigOrgValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.ansvarigOrganisationsenhet]);
    const checklistaValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.checklista]);
    const secretValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.sekretess]);
    const secretClassValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]);
    const riktningValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.riktning]);
    const bevarasValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.bevarasGallras]);
    const fordelningsprincipValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.fordelningsprincip]);
    const handlingstyperValue = pickSelected(this.handlingstyperOptions(), handlingstyperIds);
    const beredningsbeslutstyperValue = pickSelected(this.beredningsbeslutstyperOptions(), beredningsbeslutstyperIds);
    const beslutstyperValue = pickSelected(this.beslutstyperOptions(), beslutstyperIds);
    const lagrumValue = pickSelected(this.lagrumOptions(), lagrumIds);
    const gallringsforeskriftValue = toIdValue(props[NUXEO_SCHEMA_FIELDS.klass.gallringsforeskrift]);
    const shouldShowLagrum = this.formUtils.hasStrongSecrecy(secretValue);
    const nextConfig: FieldConfig[] = [
      {
        type: 'input',
        name: 'title',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.dc.title] ?? '',
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '',
      },
      {
        type: 'input',
        name: 'code',
        label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.klass.kod] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'name',
        label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.klass.namn] ?? '',
        validators: [Validators.required],
      },
      {
        type: 'component',
        name: 'arendemening',
        class: ArendemeningOptionsComponent,
        props: {
          arendemeningChange: (event: Record<string, string>[]) => this.arendemeningChange(event),
          defaultValue: props[NUXEO_SCHEMA_FIELDS.klass.arendemening] ?? '',
        },
      },
      {
        type: 'dropdown-search',
        name: 'klass',
        label: 'Klasstyp',
        options: this.klasstypOptions(),
        defaultValue: this.getKlassDefault(props[NUXEO_SCHEMA_FIELDS.klass.klasstyp]?.uid ?? ''),
        validators: [Validators.required],
      },
      {
        type: 'checkbox',
        name: 'registrerbar',
        label: 'Registrerbar',
        defaultValue: Boolean(props[NUXEO_SCHEMA_FIELDS.klass.registrerbar]),
      },
      {
        type: 'dropdown-search',
        name: 'handlingstyper',
        label: 'Handlingstyper',
        options: this.handlingstyperOptions(),
        multiple: true,
        defaultValue: handlingstyperValue,
        validators: [Validators.required],
      },
      {
        type: 'dropdown-search',
        name: 'beredningsbeslutstyper',
        label: 'Beredningsbeslutstyper',
        options: this.beredningsbeslutstyperOptions(),
        multiple: true,
        defaultValue: beredningsbeslutstyperValue,
      },
      {
        type: 'dropdown-search',
        name: 'beslutstyper',
        label: 'Beslutstyper',
        options: this.beslutstyperOptions(),
        multiple: true,
        defaultValue: beslutstyperValue,
        validators: [Validators.required],
      },
      {
        type: 'dropdown',
        name: 'ansvarigOrg',
        label: 'Ansvarig organisationsenhet',
        options: this.ansvarigOrgOptions(),
        defaultValue: ansvarigOrgValue,
      },
      {
        type: 'checkbox',
        name: 'paJkListan',
        label: 'På JK-listan',
        defaultValue: Boolean(props[NUXEO_SCHEMA_FIELDS.klass.paJkListan]),
      },
      {
        type: 'dropdown',
        name: 'fordelningsprincip',
        label: 'Fördelningsprincip',
        options: this.fordelningsprincipOptions(),
        defaultValue: fordelningsprincipValue,
      },
      {
        type: 'dropdown',
        name: 'checklista',
        label: 'Checklista',
        options: this.checklistaOptions(),
        defaultValue: checklistaValue,
      },
      {
        type: 'dropdown',
        name: 'secret',
        label: 'Sekretess',
        options: this.secretOptions(),
        defaultValue: secretValue,
        validators: [Validators.required],
      },
      {
        type: 'dropdown-search',
        name: 'lagrum',
        label: 'Lagrum',
        options: this.lagrumOptions(),
        multiple: true,
        defaultValue: lagrumValue.length ? lagrumValue : undefined,
        validators: shouldShowLagrum ? [Validators.required] : undefined,
        isHidden: !shouldShowLagrum,
      },
      {
        type: 'dropdown',
        name: 'secretClass',
        label: 'Säkerhetsskyddsklassificering',
        options: this.secretClassOptions(),
        defaultValue: secretClassValue,
      },
      {
        type: 'dropdown',
        name: 'riktning',
        label: 'Riktning',
        options: this.riktningOptions(),
        defaultValue: riktningValue,
      },
      {
        type: 'dropdown',
        name: 'bevaras',
        label: 'Bevaras / Gallras',
        options: this.bevarasOptions(),
        defaultValue: bevarasValue,
      },
      {
        type: 'dropdown',
        name: 'gallringsforeskrift',
        label: 'Gallringsforeskrift',
        options: this.lagrumOptions(),
        defaultValue: gallringsforeskriftValue,
      },
      {
        type: 'component',
        name: 'metadataDefinition',
        label: 'Metadatafält',
        class: BasicMetaDataTableComponent,
        props: { tableFields: this.metadataDefinitionFields },
      },
    ];
    this.editConfig.set(nextConfig);
  }

  arendemeningChange(event: Record<string, string>[]) {
    this.arendemening.set(event);
  }

  selectedOptionChanged(event: { selectedValue: string; fieldName: string }) {
    if (event.fieldName !== 'secret') return;
    this.updateLagrumVisibility(this.formUtils.hasStrongSecrecy(event.selectedValue));
  }

  getKlassDefault(uid: string) {
    if (!uid) return null;
    return this.klasstypOptions().filter(opt => opt.id === uid);
  }

  private toMetadataRows(doc: NuxeoDocument<KlassProperties>): MetadataDefinitionRow[] {
    const fields = doc.properties?.[NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition] ?? [];
    return fields
      .map(field => ({
        id: crypto.randomUUID(),
        nyckel: field.nyckel ?? '',
        flervardig: field.flervardig,
        aktiv: field.aktiv,
        typ: field.typ,
        ordning: field.ordning,
      }))
      .filter(field => field.nyckel);
  }

  private mapOptions(result: SearchResult): Option[] {
    return result.entries.map(({ title, uid, path }) => ({ label: title, id: uid, path }));
  }

  private updateLagrumVisibility(shouldShowLagrum: boolean): void {
    this.editConfig.update(config =>
      config.map(field =>
        field.name === 'lagrum'
          ? { ...field, isHidden: !shouldShowLagrum, validators: shouldShowLagrum ? [Validators.required] : undefined }
          : field
      )
    );
  }

  updateDropdownValues(event: { fieldName: string; value: unknown }) {
    const parentRef = this.document()?.parentRef;
    if (!parentRef) return;
    if (event.fieldName === 'handlingstyper') {
      this.nuxeoApi
        .DMSDocumentSuggestion(parentRef, 'Handlingstyp', 'Klass', String(event.value))
        .subscribe(data => this.handlingstyperOptions.set(this.mapOptions(data)));
    } else if (event.fieldName === 'beslutstyper') {
      this.nuxeoApi
        .DMSDocumentSuggestion(parentRef, 'Beslut', 'Klass', String(event.value))
        .subscribe(data => this.beslutstyperOptions.set(this.mapOptions(data)));
    } else if (event.fieldName === 'klass') {
      this.nuxeoApi
        .DMSDocumentSuggestion(parentRef, 'Klasstyp', 'Klass', String(event.value))
        .subscribe(data => this.klasstypOptions.set(this.mapOptions(data)));
    }
  }

  private mapDirectoryOptions(entries: Direction[]): Option[] {
    const seen = new Set<string>();
    const options: Option[] = [];
    const addOption = (label: string, id: string) => {
      if (!label || !id || seen.has(id)) return;
      seen.add(id);
      options.push({ id, label });
    };

    entries.forEach(entry => {
      const parentLabel = entry.absoluteLabel ?? entry.displayLabel ?? entry.label ?? entry.properties?.label ?? '';
      if (Array.isArray(entry.children) && entry.children.length) {
        entry.children.forEach(child => {
          const childLabel = child.absoluteLabel ?? '';
          if (!childLabel) return;
          const label = parentLabel ? `${parentLabel} / ${childLabel}` : childLabel;
          const id = child.computedId ?? '';
          addOption(label, id);
        });
        return;
      }

      const label = parentLabel;
      if (!label) return;
      const id = entry.computedId ?? entry.id ?? '';
      addOption(label, id);
    });

    return options;
  }

  private getDirectoryOptions(name: string) {
    return this.nuxeoApi.getDirectorySuggestions(name).pipe(
      map(result => (Array.isArray(result) ? result : [])),
      catchError(() => of([]))
    );
  }
}
