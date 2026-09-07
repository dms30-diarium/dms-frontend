import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';

import { Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { catchError, delay, EMPTY, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { TableItem } from '@app/shared/models/case-table';
import { getPathByDocType } from '@app/shared/utils';
import { AddButtonComponent } from '@app/shared/components/add-button/add-button.component';
import { SelectCaseComponent } from '@app/shared/components/select-case-popup/select-case-popup.component';
import { NuxeoDocument, NuxeoExtendedProperties, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { ActionButton, ButtonMenuComponent } from '@app/shared/components/button-menu.component/button-menu.component';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from '@app/shared/utils/page-size-storage';
import { DigiFormInput, DigiButton } from '@designsystem-se/af-angular';
import { OrganizationPageComponent } from '../admin/organization-page/organization-page.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { Option } from '@app/shared/commonTypes';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';
import { EntityOverviewComponent } from '@app/shared/components/entity-overview/entity-overview.component';
import {
  FOLDER_FETCH_EMAILS_ERROR_MESSAGE,
  FOLDER_IMPORTER_LAUNCH_ERROR_MESSAGE,
  FOLDER_IMPORT_FILE_CREATE_ERROR_MESSAGE,
  FOLDER_SAVE_ERROR_MESSAGE,
  FOLDER_SAVE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { SortOrder, TableSortService } from '@app/core/services/table-sort.service';

interface FolderInfoEditFormResult extends Record<string, string | Date[] | Option[] | undefined> {
  title?: string;
  description?: string;
  organisationsnummer?: string;
  prefix?: string;
  suffix?: string;
  lopnummerlangd?: string;
  handlingslopnummerlangd?: string;
  nature?: string;
  subjects?: Option[];
  coverage?: string;
  expires?: Date[];
}

const EXTRA_FIELDS_TYPES = new Set(['Domain', 'WorkspaceRoot', 'TemplateRoot', 'SectionRoot']);

@Component({
  selector: 'nuxeo-folder-page',
  standalone: true,
  imports: [
    RouterModule,
    DigiArbetsformedlingenAngularModule,
    CaseListTableComponent,
    AddButtonComponent,
    SelectCaseComponent,
    ButtonMenuComponent,
    DigiFormInput,
    DigiButton,
    OrganizationPageComponent,
    GeneralFormComponent,
    EntityOverviewComponent,
  ],
  templateUrl: './folder-page.component.html',
})
export class FolderPageComponent implements OnInit {
  route = inject(ActivatedRoute);
  nuxeoApi = inject(NuxeoApiService);
  isDialogOpened = signal(false);
  document = signal<NuxeoDocument | null>(null);
  readonly FOLDER_TABLE_NAME = 'FOLDER';
  isLoading = signal(false);
  private store = inject(GeneralStore);
  private destroy = inject(DestroyRef);
  private auth = inject(AuthService);
  private directoryOptions = inject(DirectoryOptionsService);
  private tableSortService = inject(TableSortService);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');
  isCreateImportFileOpen = signal(false);
  importFileTitle = signal('');
  importFileDescription = signal('');
  isInfoTableEditOpen = signal(false);
  isInfoTableSaving = signal(false);
  infoEditFormConfig = signal<FieldConfig[]>([]);
  natureOptions = signal<Option[]>([]);
  subjectOptions = signal<Option[]>([]);
  coverageOptions = signal<Option[]>([]);
  page = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>('');
  sortOrder = signal<SortOrder>('desc');
  readonly pageSizeOptions = [5, 10, 15, 25, 30, 50];

  handleInput(value: string | number, field: 'title' | 'description') {
    (field === 'title' ? this.importFileTitle : this.importFileDescription).set(String(value));
  }

  buttons: ActionButton[] = [];

  customColumnConfig: TableColumn[] = [
    {
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      class: 'w-[20%]',
      asLink: true,
      visible: true,
    },
    { label: 'Datum för ändring', key: 'modified', class: 'w-[15%]', visible: true },
    { label: 'Registreringsdatum', key: 'created', class: 'w-[15%]', visible: true },
    { label: 'Senast uppdaterad av', key: 'lastContributor', class: 'w-[20%]', visible: true },
  ].map(col => ({ ...col, tableName: this.FOLDER_TABLE_NAME }));

  folderTitle = signal('');
  tableData = signal<TableItem[] | null>(null);
  total = signal<number | null>(null);
  isOrganizationFolder = computed(() => {
    const doc = this.document();
    return !!doc && (doc.type === 'Organisationsdel' || doc.type === 'Organisation');
  });
  isExport = computed(() => this.document()?.type === 'Export');
  exportZipDownloadUrl = computed(() => {
    return this.document()?.properties[NUXEO_SCHEMA_FIELDS.export.exportZip]?.blobUrl ?? '';
  });

  ngOnInit(): void {
    this.restorePageSize();
    this.loadDirectoryOptions();
    this.route.params
      .pipe(
        switchMap(params => {
          return this.nuxeoApi.getDocumentById(params['id']);
        }),
        tap(result => {
          this.page.set(0);
          this.document.set(result);
          this.folderTitle.set(result.type === 'Root' ? result.type : result.title);

          this.buttons =
            result.type === 'MailFolder'
              ? [createButton('checkEmail', () => this.checkEmails())]
              : result.type === 'Importorsmapp'
                ? [
                    createButton('startImport', () => this.launchImporter()),
                    createButton('createImportFile', () => this.openCreateImportFileDialog()),
                  ]
                : [];
        }),
        switchMap(() => this.fetchPage())
      )
      .subscribe();
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.fetchPage().subscribe();
  }

  onPageSizeSelect(value: string): void {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    if (nextValue === this.pageSize()) return;
    this.pageSize.set(nextValue);
    this.page.set(0);
    const username = this.auth.username();
    if (username) {
      savePageSize(username, GLOBAL_PAGE_SIZE_KEY, nextValue);
    }
    this.fetchPage().subscribe();
  }

  refreshCurrentPage(): void {
    this.fetchPage().subscribe();
  }

  onSortChange(event: { sortBy: string; sortOrder: SortOrder }): void {
    this.tableSortService.applySortSignals(this.sortBy, this.sortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });
    this.page.set(0);
    this.fetchPage().subscribe();
  }

  private restorePageSize(): void {
    const username = this.auth.username();
    if (!username) return;
    const savedSize = loadPageSize(username, GLOBAL_PAGE_SIZE_KEY);
    if (savedSize != null) {
      this.pageSize.set(savedSize);
    }
  }

  private loadDirectoryOptions(): void {
    this.directoryOptions
      .getNatureOptions()
      .pipe(
        tap(options => {
          this.natureOptions.set(options);
          this.rebuildEditConfigIfOpen();
        }),
        takeUntilDestroyed(this.destroy)
      )
      .subscribe();

    this.directoryOptions
      .getSubjectOptions()
      .pipe(
        tap(options => {
          this.subjectOptions.set(options);
          this.rebuildEditConfigIfOpen();
        }),
        takeUntilDestroyed(this.destroy)
      )
      .subscribe();

    this.directoryOptions
      .getCoverageOptions()
      .pipe(
        tap(options => {
          this.coverageOptions.set(options);
          this.rebuildEditConfigIfOpen();
        }),
        takeUntilDestroyed(this.destroy)
      )
      .subscribe();
  }

  private rebuildEditConfigIfOpen(): void {
    const doc = this.document();
    if (!doc || !this.isInfoTableEditOpen()) return;
    this.infoEditFormConfig.set(this.buildEditFormConfig(doc));
  }

  private fetchPage() {
    const doc = this.document()!;
    const obs$ =
      doc.type === 'MailFolder'
        ? this.nuxeoApi.getMailMessages(doc.uid, this.page(), this.pageSize(), this.sortBy(), this.sortOrder())
        : this.nuxeoApi.getAdvancedDocumentContent<NuxeoDocument<NuxeoExtendedProperties>>(
            doc.uid,
            this.page(),
            this.pageSize(),
            true,
            this.sortBy(),
            this.sortOrder()
          );
    return obs$.pipe(tap(result => this.setTableData(result)));
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.customColumnConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: true,
    }));
  }

  private buildEditFormConfig(doc: NuxeoDocument): FieldConfig[] {
    const type = doc.type;
    const props = doc.properties;
    const isMyndighet = type === 'Myndighet';
    const isDiarium = type === 'Diarium';
    const hasTaxonomyFields = EXTRA_FIELDS_TYPES.has(type);
    const useEnglishLabels = isDiarium || hasTaxonomyFields;

    const subjectEntries = props[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const selectedPaths = new Set(
      subjectEntries.map(entry => {
        const parentId = String(entry.properties?.['parent']?.id ?? '');
        return parentId && entry.id ? `${parentId}/${entry.id}` : String(entry.id ?? '');
      })
    );
    const selectedSubjects = this.subjectOptions().filter(option => selectedPaths.has(option.id));
    const natureDefault = String(props[NUXEO_SCHEMA_FIELDS.dc.nature]?.id ?? '');
    const coverageId = String(props[NUXEO_SCHEMA_FIELDS.dc.coverage]?.id ?? '');
    const coverageParentId = String(props[NUXEO_SCHEMA_FIELDS.dc.coverage]?.properties?.['parent']?.id ?? '');
    const coverageDefault = coverageParentId && coverageId ? `${coverageParentId}/${coverageId}` : coverageId;
    const expiresValue = props[NUXEO_SCHEMA_FIELDS.dc.expired];
    const expiresDefault = typeof expiresValue === 'string' && expiresValue ? [new Date(expiresValue)] : [];

    const fields: FieldConfig[] = [
      {
        type: 'input',
        name: 'title',
        label: useEnglishLabels ? 'Title' : 'Titel',
        defaultValue: doc.title,
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: useEnglishLabels ? 'Description' : 'Beskrivning',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.dc.description],
      },
    ];

    if (isMyndighet) {
      fields.push({
        type: 'input',
        name: 'organisationsnummer',
        label: 'Organisationsnummer',
        defaultValue: props[NUXEO_SCHEMA_FIELDS.myndighet.organisationsnummer],
      });
    }

    if (isDiarium) {
      fields.push(
        { type: 'input', name: 'prefix', label: 'Prefix', defaultValue: props[NUXEO_SCHEMA_FIELDS.diarium.prefix] },
        { type: 'input', name: 'suffix', label: 'Suffix', defaultValue: props[NUXEO_SCHEMA_FIELDS.diarium.suffix] },
        {
          type: 'input',
          name: 'lopnummerlangd',
          label: 'Löpnummerlängd',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.diarium.lopnummerlangd],
          inputType: 'number',
          validators: [Validators.required],
        },
        {
          type: 'input',
          name: 'handlingslopnummerlangd',
          label: 'Handlingslöpnummerlängd',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.diarium.handlingslopnummerlangd],
          inputType: 'number',
          validators: [Validators.required],
        }
      );
    }

    if (hasTaxonomyFields) {
      fields.push(
        {
          type: 'dropdown',
          name: 'nature',
          label: 'Nature',
          options: this.natureOptions(),
          defaultValue: natureDefault,
        },
        {
          type: 'dropdown-search',
          name: 'subjects',
          label: 'Subjects',
          options: this.subjectOptions(),
          multiple: true,
          defaultValue: selectedSubjects,
        },
        {
          type: 'dropdown',
          name: 'coverage',
          label: 'Coverage',
          options: this.coverageOptions(),
          defaultValue: coverageDefault,
        },
        {
          type: 'datepicker',
          name: 'expires',
          label: 'Expires',
          defaultValue: expiresDefault,
        }
      );
    }

    return fields;
  }

  openEditCurrentDocument() {
    const current = this.document();
    if (!current?.uid) return;
    this.infoEditFormConfig.set(this.buildEditFormConfig(current));
    this.isInfoTableEditOpen.set(true);
  }

  closeInfoTableEdit() {
    this.isInfoTableEditOpen.set(false);
    this.isInfoTableSaving.set(false);
  }

  saveInfoTableEdit(result: FolderInfoEditFormResult) {
    const current = this.document();
    const uid = current?.uid ?? '';
    if (!uid) return;

    const nextTitle = (result['title'] ?? '').trim();
    const nextDescription = (result['description'] ?? '').trim();
    const isMyndighet = current?.type === 'Myndighet';
    const isDiarium = current?.type === 'Diarium';
    const hasTaxonomyFields = EXTRA_FIELDS_TYPES.has(current?.type ?? '');
    const nextOrgnr = isMyndighet ? (result['organisationsnummer'] ?? '').trim() : undefined;
    const nextPrefix = isDiarium ? (result['prefix'] ?? '').trim() : undefined;
    const nextSuffix = isDiarium ? (result['suffix'] ?? '').trim() : undefined;
    const nextLopnummerlangd = isDiarium ? Number(result['lopnummerlangd']) : undefined;
    const nextHandlingslopnummerlangd = isDiarium ? Number(result['handlingslopnummerlangd']) : undefined;
    const nextNature = hasTaxonomyFields ? (result.nature ?? '').trim() : undefined;
    const nextSubjects = hasTaxonomyFields ? (result.subjects ?? []).map(option => option.id) : [];
    const nextCoverage = hasTaxonomyFields ? (result.coverage ?? '').trim() : undefined;
    const expires = result.expires ?? [];
    const nextExpires = hasTaxonomyFields && expires.length ? toISODateOnlyString(expires[0]) : undefined;

    const payload: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: nextTitle,
      [NUXEO_SCHEMA_FIELDS.dc.description]: nextDescription,
    };
    if (isMyndighet && nextOrgnr !== undefined) {
      payload[NUXEO_SCHEMA_FIELDS.myndighet.organisationsnummer] = nextOrgnr;
    }
    if (isDiarium) {
      payload[NUXEO_SCHEMA_FIELDS.diarium.prefix] = nextPrefix;
      payload[NUXEO_SCHEMA_FIELDS.diarium.suffix] = nextSuffix;
      payload[NUXEO_SCHEMA_FIELDS.diarium.lopnummerlangd] = nextLopnummerlangd;
      payload[NUXEO_SCHEMA_FIELDS.diarium.handlingslopnummerlangd] = nextHandlingslopnummerlangd;
    }
    if (hasTaxonomyFields) {
      payload[NUXEO_SCHEMA_FIELDS.dc.nature] = nextNature;
      payload[NUXEO_SCHEMA_FIELDS.dc.subjects] = nextSubjects;
      payload[NUXEO_SCHEMA_FIELDS.dc.coverage] = nextCoverage;
      payload[NUXEO_SCHEMA_FIELDS.dc.expired] = nextExpires;
    }

    this.isInfoTableSaving.set(true);
    this.nuxeoApi
      .editDocument(uid, payload)
      .pipe(
        switchMap(() => this.nuxeoApi.getDocumentById(uid, true)),
        tap(updatedDoc => {
          this.document.set(updatedDoc);
          this.folderTitle.set(updatedDoc.type === 'Root' ? updatedDoc.type : updatedDoc.title);
          this.store.notification.set({ show: true, variation: 'success', text: FOLDER_SAVE_SUCCESS_MESSAGE });
          this.closeInfoTableEdit();
        }),
        catchError(() => {
          this.isInfoTableSaving.set(false);
          this.store.notification.set({ show: true, variation: 'danger', text: FOLDER_SAVE_ERROR_MESSAGE });
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroy)
      )
      .subscribe();
  }

  checkEmails() {
    const doc = this.document();
    if (doc?.uid) {
      this.isLoading.set(true);

      this.nuxeoApi
        .checkEmails(doc.uid)
        .pipe(
          delay(3000),
          switchMap(() =>
            this.nuxeoApi.getAdvancedDocumentContent<NuxeoDocument<NuxeoExtendedProperties>>(
              doc.uid,
              0,
              40,
              true,
              this.sortBy(),
              this.sortOrder()
            )
          ),
          tap(result => {
            this.setTableData(result);
            this.isLoading.set(false);
          }),
          catchError(() => {
            this.store.notification.set({
              show: true,
              variation: 'danger',
              text: FOLDER_FETCH_EMAILS_ERROR_MESSAGE,
            });
            this.isLoading.set(false);
            return EMPTY;
          })
        )
        .subscribe();
    }
  }

  openCreateImportFileDialog() {
    this.importFileTitle.set('');
    this.importFileDescription.set('');
    this.isCreateImportFileOpen.set(true);
  }

  createImportFile() {
    const currentFolder = this.document();
    const title = this.importFileTitle().trim();
    const description = this.importFileDescription().trim();

    if (!currentFolder?.path || !title) {
      return;
    }

    const payload: Partial<NuxeoDocument> = {
      'entity-type': 'document',
      type: 'Importorfil',
      name: title,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: title,
        [NUXEO_SCHEMA_FIELDS.dc.description]: description || null,
      },
    };

    this.isLoading.set(true);

    this.nuxeoApi
      .createDocument(payload, currentFolder.path)
      .pipe(
        switchMap(() =>
          this.nuxeoApi.getAdvancedDocumentContent<NuxeoDocument<NuxeoExtendedProperties>>(
            currentFolder.uid,
            0,
            40,
            true,
            this.sortBy(),
            this.sortOrder()
          )
        ),
        tap(result => {
          this.setTableData(result);
          this.isLoading.set(false);
          this.isCreateImportFileOpen.set(false);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: FOLDER_IMPORT_FILE_CREATE_ERROR_MESSAGE,
          });
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }

  launchImporter() {
    const doc = this.document();
    if (!doc?.uid) {
      return;
    }

    this.isLoading.set(true);

    this.nuxeoApi
      .launchImporter(doc.uid)
      .pipe(
        switchMap(() =>
          this.nuxeoApi.getAdvancedDocumentContent<NuxeoDocument<NuxeoExtendedProperties>>(
            doc.uid,
            0,
            40,
            true,
            this.sortBy(),
            this.sortOrder()
          )
        ),
        tap(result => {
          this.setTableData(result);
          this.isLoading.set(false);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: FOLDER_IMPORTER_LAUNCH_ERROR_MESSAGE,
          });
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private toFolderTableItem(doc: NuxeoDocument<NuxeoExtendedProperties>): TableItem {
    const creatorProps = doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.creator]?.properties;
    const creator = creatorProps
      ? creatorProps?.firstName + ' ' + creatorProps?.lastName
      : doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.creator]?.id;
    const pathPart = getPathByDocType(doc.type);
    const createdRaw = doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.created];
    const createdDate = createdRaw ? new Date(createdRaw) : null;
    const createdFormatted = createdDate ? createdDate.toLocaleDateString('sv-SE') : '';
    const dataExtracted = doc.properties?.[NUXEO_SCHEMA_FIELDS.import.arDataExtraherad];

    return {
      id: doc.uid,
      title: doc.title,
      modified: new Date(doc.lastModified).toLocaleDateString('sv-SE'),
      created: createdFormatted,
      lastContributor: creator,
      description: doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.description] ?? '',
      dataExtracted: typeof dataExtracted === 'boolean' ? (dataExtracted ? 'Ja' : 'Nej') : '',
      link: pathPart + doc.uid,
    };
  }

  private setTableData(result: SearchResult<NuxeoDocument<NuxeoExtendedProperties>>): void {
    this.tableData.set(result.entries.map(el => this.toFolderTableItem(el)));
    this.total.set(result.totalSize);
  }

  updateOrganizationDocument(document: NuxeoDocument): void {
    this.document.set(document);
    this.folderTitle.set(document.title);
  }
}
