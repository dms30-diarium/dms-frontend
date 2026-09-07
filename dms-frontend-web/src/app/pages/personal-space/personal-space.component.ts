import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';

import { DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { Validators } from '@angular/forms';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { AddButtonComponent } from '@app/shared/components/add-button/add-button.component';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { AssignCollectionModalComponent } from '@app/shared/components/assign-collection-modal.component/assign-collection-modal.component';
import { ActionButton } from '@app/shared/components/button-menu.component/button-menu.component';
import { SelectCaseComponent } from '@app/shared/components/select-case-popup/select-case-popup.component';
import { TopButtonsPanelComponent } from '@app/shared/components/top-buttons-panel/top-buttons-panel.component';
import { AuthService } from '@app/core/services/auth.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NxUser, NxUserProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { Option } from '@app/shared/commonTypes';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { EntityOverviewComponent } from '@app/shared/components/entity-overview/entity-overview.component';
import {
  DOCUMENT_UPDATE_ERROR_MESSAGE,
  DOCUMENT_UPDATE_SUCCESS_MESSAGE,
  PERSONAL_SPACE_CLIPBOARD_COPY_ERROR_MESSAGE,
  PERSONAL_SPACE_CLIPBOARD_COPY_SUCCESS_MESSAGE,
  PERSONAL_SPACE_CLIPBOARD_UNSUPPORTED_MESSAGE,
  PERSONAL_SPACE_COLLECTION_SELECTION_REQUIRED_MESSAGE,
  PERSONAL_SPACE_COPY_SELECTION_REQUIRED_MESSAGE,
  PERSONAL_SPACE_DELETE_ERROR_MESSAGE,
  PERSONAL_SPACE_DELETE_SELECTION_REQUIRED_MESSAGE,
  PERSONAL_SPACE_DELETE_SUCCESS_MESSAGE,
  PERSONAL_SPACE_DOWNLOAD_ERROR_MESSAGE,
  PERSONAL_SPACE_DOWNLOAD_SELECTION_REQUIRED_MESSAGE,
} from '@app/shared/constants/notification-messages';
import {
  COLLECTIONS_TABLE_NAME,
  WORKSPACE_TABLE_NAME,
  collectionsTableConfig,
  workspaceTableConfig,
} from './personal-space.table-config';
import { updateCurrentPage } from '@app/shared/utils/pagination-utils';
import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from '@app/shared/utils/page-size-storage';
import { SortOrder, TableSortService } from '@app/core/services/table-sort.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-personal-space',
  standalone: true,
  imports: [
    DigiArbetsformedlingenAngularModule,
    DigiNavigationBreadcrumbs,
    AddButtonComponent,
    SelectCaseComponent,
    CaseListTableComponent,
    AssignCollectionModalComponent,
    GeneralFormComponent,
    TopButtonsPanelComponent,
    EntityOverviewComponent,
  ],
  templateUrl: './personal-space.component.html',
})
export class PersonalSpaceComponent implements OnInit, OnDestroy {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  private auth = inject(AuthService);
  private store = inject(GeneralStore);
  private nuxeoApi = inject(NuxeoApiService);
  private directoryOptions = inject(DirectoryOptionsService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tableSortService = inject(TableSortService);
  readonly messagesInfo = this.store.messagesInfo;
  isDialogOpened = signal(false);
  workspaceItems = signal<TableItem[]>([]);
  workspaceTotal = signal(0);
  workspaceLoading = signal(false);
  workspaceError = signal<string | null>(null);
  collections = signal<TableItem[]>([]);
  folderDocs = signal<NuxeoDocument[]>([]);
  total = signal(0);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  page = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>('');
  sortOrder = signal<SortOrder>('desc');
  readonly pageSizeOptions = [5, 10, 15, 25, 30, 50];
  isEditDialogOpen = signal(false);
  isSavingEdit = signal(false);
  folderEditConfig = signal<FieldConfig[]>([]);
  folderNatureOptions = signal<Option[]>([]);
  folderSubjectOptions = signal<Option[]>([]);
  folderCoverageOptions = signal<Option[]>([]);
  @ViewChild('folderEditForm') private folderEditForm?: GeneralFormComponent;
  private lastFetchedPath = '';
  selectedFolderId = signal<string | null>(null);
  selectedFolderTitle = signal<string>('Samlingar');
  selectedFolderPath = signal<string>('');
  selectedFolderDoc = signal<NuxeoDocument | null>(null);
  viewMode = signal<'workspace' | 'folder'>('workspace');

  selectedItemIds = signal<string[]>([]);
  isAssignCollectionOpen = signal(false);

  readonly topbarButtons = computed<ActionButton[]>(() => [
    createButton('downloadAllFiles', () => this.downloadSelectedAsZip()),
    createButton('collection', () => this.addSelectedToCollection()),
    { text: 'Kopiera', icon: 'Copy', click: () => this.copySelectedToClipboard() },
    { text: 'Radera', icon: 'Trash2', click: () => this.deleteSelectedItems() },
  ]);

  readonly WORKSPACE_TABLE_NAME = WORKSPACE_TABLE_NAME;
  readonly COLLECTIONS_TABLE_NAME = COLLECTIONS_TABLE_NAME;
  readonly workspaceTableConfig: TableColumn[] = workspaceTableConfig;
  readonly tableConfig: TableColumn[] = collectionsTableConfig;
  private readonly containerTypes = new Set([
    'Folder',
    'OrderedFolder',
    'Workspace',
    'Collections',
    'Collection',
    'Favorites',
    'MailFolder',
    'Importorsmapp',
  ]);
  private readonly editableContainerTypes = new Set(['Folder', 'Workspace', 'Collection']);
  private readonly collectionContentTypes = new Set(['Collection', 'Favorites']);

  readonly canEditSelectedFolder = computed(() => {
    const doc = this.selectedFolderDoc();
    return this.viewMode() === 'folder' && !!doc && this.editableContainerTypes.has(doc.type);
  });

  private userWorkspacePath = computed(() => {
    const username = this.auth.username();
    return username ? `/default-domain/UserWorkspaces/${username}` : '';
  });

  constructor() {
    effect(() => {
      const doc = this.selectedFolderDoc();
      if (this.viewMode() === 'folder' && doc && this.editableContainerTypes.has(doc.type)) {
        this.store.baseButtons.set([createButton('edit', () => this.openEditDialog())]);
        return;
      }
      this.store.baseButtons.set([]);
    });
    effect(() => {
      const total = this.getActiveTotal();
      const pageSize = this.pageSize();
      const current = this.page();
      updateCurrentPage(this.page, total, pageSize);
      if (this.page() !== current) {
        this.reloadActivePage();
      }
    });
  }

  ngOnInit(): void {
    this.store.openPage.set('personal');
    this.restorePageSize();
    this.loadFolderOptions();
    const initialPath = this.route.snapshot.queryParamMap.get('path') ?? '';
    if (initialPath && !this.isWorkspaceRootPath(initialPath)) {
      this.openFolderByPath(initialPath, false);
    } else {
      this.loadWorkspace();
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const path = params.get('path') ?? '';
      if (!path || this.isWorkspaceRootPath(path)) {
        if (this.viewMode() !== 'workspace') {
          this.viewMode.set('workspace');
          this.selectedFolderId.set(null);
          this.selectedFolderTitle.set('Samlingar');
          this.selectedFolderPath.set('');
          this.selectedFolderDoc.set(null);
          this.folderDocs.set([]);
          this.page.set(0);
          this.loadWorkspace();
        }
        return;
      }

      if (path === this.selectedFolderPath()) return;
      this.openFolderByPath(path, false);
    });
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }

  openDialog(): void {
    this.isDialogOpened.set(true);
  }

  openEditDialog(): void {
    const doc = this.selectedFolderDoc();
    if (!doc || !this.editableContainerTypes.has(doc.type)) return;
    this.folderEditConfig.set(this.buildFolderEditConfig(doc));
    this.isEditDialogOpen.set(true);
  }

  getEditDialogHeading(): string {
    const type = this.selectedFolderDoc()?.type;
    if (type === 'Workspace') return 'Redigera arbetsyta';
    if (type === 'Folder') return 'Redigera mapp';
    if (type === 'Collection') return 'Redigera samling';
    return 'Redigera';
  }

  closeEditDialog(): void {
    this.isEditDialogOpen.set(false);
  }

  submitFolderEdit(): void {
    this.folderEditForm?.submit();
  }

  saveFolderEdits(event: Record<string, unknown>): void {
    const doc = this.selectedFolderDoc();
    const docId = doc?.uid ?? '';
    if (!docId) return;

    const titleValue = event['title'];
    const titleText = String(titleValue ?? '').trim();
    const descriptionValue = event['description'];
    const descriptionText = String(descriptionValue ?? '').trim();
    const description = descriptionText ? descriptionText : null;

    const natureValue = event['nature'];
    const natureObject = natureValue == null ? null : Object(natureValue);
    const natureCandidate = natureObject ? (natureObject['id'] ?? natureObject['value'] ?? natureValue) : '';
    const nature = String(natureCandidate ?? '').trim();

    const coverageValue = event['coverage'];
    const coverageObject = coverageValue == null ? null : Object(coverageValue);
    const coverageCandidate = coverageObject ? (coverageObject['id'] ?? coverageObject['value'] ?? coverageValue) : '';
    const coverage = String(coverageCandidate ?? '').trim();

    const subjectsValue = event['subjects'];
    const subjects = Array.isArray(subjectsValue)
      ? subjectsValue
          .map(entry => {
            const entryObject = entry == null ? null : Object(entry);
            const candidate = entryObject ? (entryObject['id'] ?? entryObject['value'] ?? entry) : '';
            return String(candidate ?? '').trim();
          })
          .filter(entry => entry)
      : [];

    const expiresValue = event['expires'];
    const rawExpires = Array.isArray(expiresValue) ? expiresValue[0] : expiresValue;
    const expires = rawExpires instanceof Date ? rawExpires.toISOString() : String(rawExpires ?? '').trim();

    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: titleText,
      ...(description ? { [NUXEO_SCHEMA_FIELDS.dc.description]: description } : {}),
      ...(nature ? { [NUXEO_SCHEMA_FIELDS.dc.nature]: nature } : {}),
      ...(subjects.length ? { [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects } : {}),
      ...(coverage ? { [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage } : {}),
      ...(expires ? { [NUXEO_SCHEMA_FIELDS.dc.expired]: expires } : {}),
    };

    this.isSavingEdit.set(true);
    this.nuxeoApi
      .editDocument(docId, properties)
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: DOCUMENT_UPDATE_SUCCESS_MESSAGE,
          });
          this.isEditDialogOpen.set(false);
          const refreshPath = this.selectedFolderPath() || doc?.path || '';
          if (refreshPath) {
            this.openFolderByPath(refreshPath, false);
          }
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DOCUMENT_UPDATE_ERROR_MESSAGE,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.isSavingEdit.set(false));
  }

  getPath(): string {
    return this.userWorkspacePath();
  }

  getCreatePath(): string {
    if (this.viewMode() !== 'folder') {
      return this.getPath();
    }
    const selectedPath = this.selectedFolderPath();
    if (selectedPath) return selectedPath;
    const docPath = this.selectedFolderDoc()?.path ?? '';
    return docPath || this.getPath();
  }

  getActiveColumnOptions(): TableColOption[] {
    const config = this.viewMode() === 'workspace' ? this.workspaceTableConfig : this.tableConfig;
    return config.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }));
  }

  getActiveTableConfig(): TableColumn[] {
    return this.viewMode() === 'workspace' ? this.workspaceTableConfig : this.tableConfig;
  }

  getActiveItems(): TableItem[] {
    return this.viewMode() === 'workspace' ? this.workspaceItems() : this.collections();
  }

  getActiveLoading(): boolean {
    return this.viewMode() === 'workspace' ? this.workspaceLoading() : this.isLoading();
  }

  getActiveTotal(): number {
    return this.viewMode() === 'workspace' ? this.workspaceTotal() : this.total();
  }

  getActiveError(): string | null {
    return this.viewMode() === 'workspace' ? this.workspaceError() : this.errorMessage();
  }

  getActiveTitle(): string {
    return this.viewMode() === 'workspace' ? 'Personliga mappar' : this.selectedFolderTitle();
  }

  onRowSelected(uid: string): void {
    const items = this.getActiveItems();
    const item = items.find(entry => entry['id'] === uid);
    if (!item) return;
    const typeValue = item['type'];
    const type = String(typeValue ?? '');
    const title = item['title'] ?? 'Samlingar';
    const pathValue = item['path'];
    const path = String(pathValue ?? '');

    if (type && this.containerTypes.has(type)) {
      this.openFolder(uid, title, path);
      return;
    }

    this.router.navigate(['/doc', uid]);
  }

  onSelectedCheckboxes(selectedIds: string[]): void {
    this.selectedItemIds.set(selectedIds ?? []);
  }

  onSortChange(event: { sortBy: string; sortOrder: SortOrder }): void {
    this.tableSortService.applySortSignals(this.sortBy, this.sortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });
    this.page.set(0);
    this.reloadActivePage();
  }

  downloadSelectedAsZip(): void {
    const ids = this.selectedItemIds();
    if (!ids.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: PERSONAL_SPACE_DOWNLOAD_SELECTION_REQUIRED_MESSAGE,
      });
      return;
    }

    this.nuxeoApi.downloadBulk(ids).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'selection.zip';
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: PERSONAL_SPACE_DOWNLOAD_ERROR_MESSAGE,
        });
      },
    });
  }

  addSelectedToCollection(): void {
    if (!this.selectedItemIds().length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: PERSONAL_SPACE_COLLECTION_SELECTION_REQUIRED_MESSAGE,
      });
      return;
    }
    this.isAssignCollectionOpen.set(true);
  }

  copySelectedToClipboard(): void {
    const ids = this.selectedItemIds();
    if (!ids.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: PERSONAL_SPACE_COPY_SELECTION_REQUIRED_MESSAGE,
      });
      return;
    }

    const text = ids.join(',');
    if (!navigator.clipboard) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: PERSONAL_SPACE_CLIPBOARD_UNSUPPORTED_MESSAGE,
      });
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: PERSONAL_SPACE_CLIPBOARD_COPY_SUCCESS_MESSAGE,
        });
      })
      .catch(() => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: PERSONAL_SPACE_CLIPBOARD_COPY_ERROR_MESSAGE,
        });
      });
  }

  deleteSelectedItems(): void {
    const ids = this.selectedItemIds();
    if (!ids.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: PERSONAL_SPACE_DELETE_SELECTION_REQUIRED_MESSAGE,
      });
      return;
    }

    if (!confirm('Är du säker på att du vill ta bort valda objekt?')) {
      return;
    }

    this.nuxeoApi
      .deleteDocument(ids[0])
      .pipe(
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PERSONAL_SPACE_DELETE_ERROR_MESSAGE,
          });
          return of(null);
        })
      )
      .subscribe(() => {
        const remaining = ids.slice(1);
        if (!remaining.length) {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PERSONAL_SPACE_DELETE_SUCCESS_MESSAGE,
          });
          this.selectedItemIds.set([]);
          this.reloadActivePage();
          return;
        }

        const deletions = remaining.map(id => this.nuxeoApi.deleteDocument(id).pipe(catchError(() => of(null))));
        forkJoin(deletions).subscribe(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PERSONAL_SPACE_DELETE_SUCCESS_MESSAGE,
          });
          this.selectedItemIds.set([]);
          this.reloadActivePage();
        });
      });
  }

  onPageChange(newPage: number) {
    if (newPage === this.page()) return;
    this.page.set(newPage);
    this.reloadActivePage();
  }

  onPageSizeSelect(value: string | number) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    if (nextValue === this.pageSize()) return;
    this.pageSize.set(nextValue);
    this.page.set(0);
    this.reloadActivePage();
    const username = this.auth.username();
    if (username) {
      savePageSize(username, GLOBAL_PAGE_SIZE_KEY, nextValue);
    }
  }

  backToWorkspace(): void {
    const currentPath = this.selectedFolderPath();
    if (!currentPath) {
      this.viewMode.set('workspace');
      this.selectedFolderId.set(null);
      this.selectedFolderTitle.set('Samlingar');
      this.selectedFolderPath.set('');
      this.selectedFolderDoc.set(null);
      this.folderDocs.set([]);
      this.page.set(0);
      this.updatePathParam(null);
      return;
    }

    const parentPath = this.getParentPath(currentPath);
    if (!parentPath || parentPath === this.userWorkspacePath()) {
      this.viewMode.set('workspace');
      this.selectedFolderId.set(null);
      this.selectedFolderTitle.set('Samlingar');
      this.selectedFolderPath.set('');
      this.selectedFolderDoc.set(null);
      this.folderDocs.set([]);
      this.page.set(0);
      this.updatePathParam(null);
      this.loadWorkspace();
      return;
    }

    this.openFolderByPath(parentPath, true);
  }

  private fetchWorkspaceFolders(
    path: string,
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: SortOrder
  ): void {
    this.workspaceLoading.set(true);
    this.workspaceError.set(null);
    this.viewMode.set('workspace');
    this.selectedFolderPath.set('');

    this.nuxeoApi
      .getPathInfo(path)
      .pipe(
        switchMap(doc => this.nuxeoApi.getAdvancedDocumentContent(doc.uid, page, pageSize, false, sortBy, sortOrder)),
        tap(result => {
          const items = result.entries.map(entry => this.toWorkspaceTableItem(entry));
          this.workspaceItems.set(items);
          this.workspaceTotal.set(result.totalSize ?? items.length);
          this.selectedItemIds.set([]);
          this.workspaceLoading.set(false);
        }),
        catchError(_err => {
          this.workspaceItems.set([]);
          this.workspaceTotal.set(0);
          this.workspaceLoading.set(false);
          this.workspaceError.set('Kunde inte läsa mappar i Personlig yta.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private fetchCollections(uid: string, page: number, pageSize: number, sortBy: string, sortOrder: SortOrder): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.nuxeoApi
      .getDocumentById(uid)
      .pipe(
        tap(doc => {
          this.selectedFolderDoc.set(doc);
        }),
        switchMap(doc => this.loadChildrenForDoc(doc, page, pageSize, sortBy, sortOrder)),
        tap(result => {
          this.folderDocs.set(result.entries);
          this.updateFolderItems();
          this.total.set(result.totalSize ?? result.entries.length);
          this.isLoading.set(false);
        }),
        catchError(_err => {
          this.collections.set([]);
          this.folderDocs.set([]);
          this.selectedFolderDoc.set(null);
          this.total.set(0);
          this.isLoading.set(false);
          this.errorMessage.set('Kunde inte läsa innehåll i samlingen.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private loadWorkspace(): void {
    if (!this.auth.loaded()) {
      this.workspaceLoading.set(true);
      this.auth
        .loadMe()
        .catch(() => null)
        .finally(() => this.loadWorkspace());
      return;
    }

    const username = this.auth.username();
    if (!username) {
      this.workspaceLoading.set(false);
      this.workspaceError.set('Kunde inte läsa användarprofilen.');
      return;
    }

    const path = `/default-domain/UserWorkspaces/${username}`;
    this.page.set(0);
    const fetchKey = `${path}|${this.page()}|${this.pageSize()}|${this.sortBy()}|${this.sortOrder()}`;
    if (fetchKey === this.lastFetchedPath) {
      return;
    }
    this.lastFetchedPath = fetchKey;
    this.fetchWorkspaceFolders(path, this.page(), this.pageSize(), this.sortBy(), this.sortOrder());
  }

  private openFolder(uid: string, title: string, path: string): void {
    if (!uid) {
      return;
    }
    if (path) {
      this.openFolderByPath(path, true);
      return;
    }

    if (this.selectedFolderId() === uid) {
      return;
    }

    this.selectedFolderId.set(uid);
    this.selectedFolderTitle.set(title);
    this.selectedFolderPath.set('');
    this.selectedFolderDoc.set(null);
    this.viewMode.set('folder');
    this.page.set(0);
    this.updatePathParam(null);
    this.fetchCollections(uid, this.page(), this.pageSize(), this.sortBy(), this.sortOrder());
  }

  private openFolderByPath(path: string, updateUrl: boolean): void {
    if (!path || this.isWorkspaceRootPath(path)) {
      this.viewMode.set('workspace');
      this.selectedFolderId.set(null);
      this.selectedFolderTitle.set('Samlingar');
      this.selectedFolderPath.set('');
      this.selectedFolderDoc.set(null);
      this.folderDocs.set([]);
      this.page.set(0);
      if (updateUrl) {
        this.updatePathParam(null);
      }
      this.loadWorkspace();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.viewMode.set('folder');
    this.selectedFolderPath.set(path);
    this.page.set(0);
    if (updateUrl) {
      this.updatePathParam(path);
    }

    this.nuxeoApi
      .getPathInfo(path)
      .pipe(
        switchMap(doc => {
          this.selectedFolderId.set(doc.uid);
          this.selectedFolderTitle.set(doc.title ?? 'Samlingar');
          this.selectedFolderDoc.set(doc);
          return this.loadChildrenForDoc(doc, this.page(), this.pageSize(), this.sortBy(), this.sortOrder());
        }),
        tap(result => {
          this.folderDocs.set(result.entries);
          this.updateFolderItems();
          this.total.set(result.totalSize ?? result.entries.length);
          this.isLoading.set(false);
        }),
        catchError(_err => {
          this.collections.set([]);
          this.folderDocs.set([]);
          this.selectedFolderDoc.set(null);
          this.total.set(0);
          this.isLoading.set(false);
          this.errorMessage.set('Kunde inte läsa innehåll i samlingen.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private loadChildrenForDoc(doc: NuxeoDocument, page: number, pageSize: number, sortBy: string, sortOrder: SortOrder) {
    if (this.collectionContentTypes.has(doc.type)) {
      return this.nuxeoApi.getCollectionDocuments(doc.uid, page, pageSize, sortBy, sortOrder);
    }
    return this.nuxeoApi.getAdvancedDocumentContent(doc.uid, page, pageSize, false, sortBy, sortOrder);
  }

  private toWorkspaceTableItem(doc: NuxeoDocument): TableItem {
    const path = doc.path;
    const isContainer = this.containerTypes.has(doc.type);
    return {
      id: doc.uid,
      title: doc.title,
      type: doc.type,
      modified: formatDateOrMissing(doc.lastModified),
      isFolderish: doc.facets?.includes('Folderish') ?? false,
      path,
      link: isContainer ? '/personal' : `/doc/${doc.uid}`,
      linkQueryParams: isContainer && path ? { path } : null,
    };
  }

  private toTableItem(doc: NuxeoDocument): TableItem {
    const props = doc.properties ?? {};
    const path = doc.path;
    const isFolderish = doc.facets?.includes('Folderish') ?? false;
    const created = formatDateOrMissing(props[NUXEO_SCHEMA_FIELDS.dc.created]);
    const modified = formatDateOrMissing(doc.lastModified);

    const creator = props[NUXEO_SCHEMA_FIELDS.dc.creator];
    const creatorProps: NxUserProperties = (creator as NxUser | null | undefined)?.properties ?? {};
    const creatorFirst = String(
      creatorProps.firstName ?? creatorProps[NUXEO_SCHEMA_FIELDS.user.firstName] ?? ''
    ).trim();
    const creatorLast = String(creatorProps.lastName ?? creatorProps[NUXEO_SCHEMA_FIELDS.user.lastName] ?? '').trim();
    const author = [creatorFirst, creatorLast].filter(part => part.length > 0).join(' ');

    const lastContributor = props[NUXEO_SCHEMA_FIELDS.dc.lastContributor];
    const lastContributorProps: NxUserProperties = (lastContributor as NxUser | null | undefined)?.properties ?? {};
    const lastFirst = String(
      lastContributorProps.firstName ?? lastContributorProps[NUXEO_SCHEMA_FIELDS.user.firstName] ?? ''
    ).trim();
    const lastLast = String(
      lastContributorProps.lastName ?? lastContributorProps[NUXEO_SCHEMA_FIELDS.user.lastName] ?? ''
    ).trim();
    const lastContributorLabel = [lastFirst, lastLast].filter(part => part.length > 0).join(' ');

    const stateKey = doc.state ? `label.ui.state.${doc.state}` : '';
    const stateLabel = stateKey ? (this.store.messagesInfo()?.[stateKey] ?? '') : '';

    const majorValue = props[NUXEO_SCHEMA_FIELDS.uid.majorVersion];
    const majorText = majorValue == null ? '' : String(majorValue);
    const minorValue = props[NUXEO_SCHEMA_FIELDS.uid.minorVersion];
    const minorText = minorValue == null ? '' : String(minorValue);
    const versionLabel = majorText && minorText ? `${majorText}.${minorText}` : majorText || minorText || '';

    const natureValue = props[NUXEO_SCHEMA_FIELDS.dc.nature];
    const natureId = natureValue?.id ?? natureValue?.properties?.id ?? '';
    const natureKey = natureId ? `label.nature.${natureId}` : '';
    const natureLabel = natureKey ? (this.store.messagesInfo()?.[natureKey] ?? '') : '';

    const coverageValue = props[NUXEO_SCHEMA_FIELDS.dc.coverage];
    const coverageLabel =
      coverageValue?.properties?.['parent']?.properties?.['label_en'] ??
      coverageValue?.properties?.['parent']?.properties?.['label'] ??
      '';
    const coverageValueLabel = coverageValue?.properties?.['label_en'] ?? coverageValue?.properties?.['label'] ?? '';
    const coverageDisplay =
      coverageLabel && coverageValueLabel
        ? `${coverageLabel}/${coverageValueLabel}`
        : coverageLabel || coverageValueLabel;

    const subjectItems = props[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const subjectLabels = subjectItems
      .map(item => {
        return item?.properties?.label_en ?? item?.properties?.label ?? '';
      })
      .filter(label => label.length > 0);

    const returnPath = this.selectedFolderPath();
    return {
      id: doc.uid,
      title: doc.title,
      type: doc.type,
      created,
      modified,
      lastContributor: lastContributorLabel,
      author,
      state: stateLabel,
      version: versionLabel,
      nature: natureLabel,
      coverage: coverageDisplay,
      subjects: subjectLabels.join(', '),
      flags: '',
      isFolderish,
      path,
      link: this.containerTypes.has(doc.type) ? '/personal' : `/doc/${doc.uid}`,
      linkQueryParams: this.containerTypes.has(doc.type)
        ? path
          ? { path }
          : null
        : returnPath
          ? { path: returnPath }
          : null,
    };
  }

  private updateFolderItems(): void {
    const docs = this.folderDocs();
    if (!docs.length) {
      this.collections.set([]);
      return;
    }
    this.collections.set(docs.map(doc => this.toTableItem(doc)));
  }

  private getParentPath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? `/${parts.join('/')}` : '';
  }

  private isWorkspaceRootPath(path: string): boolean {
    return this.userWorkspacePath() === path;
  }

  private updatePathParam(path: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { path: path || null },
      queryParamsHandling: 'merge',
    });
  }

  private reloadActivePage(): void {
    const page = this.page();
    const pageSize = this.pageSize();
    if (this.viewMode() === 'workspace') {
      const path = this.userWorkspacePath();
      if (!path) return;
      this.fetchWorkspaceFolders(path, page, pageSize, this.sortBy(), this.sortOrder());
      return;
    }

    const doc = this.selectedFolderDoc();
    if (doc) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.loadChildrenForDoc(doc, page, pageSize, this.sortBy(), this.sortOrder())
        .pipe(
          tap(result => {
            this.folderDocs.set(result.entries);
            this.updateFolderItems();
            this.total.set(result.totalSize ?? result.entries.length);
            this.isLoading.set(false);
          }),
          catchError(_err => {
            this.collections.set([]);
            this.folderDocs.set([]);
            this.total.set(0);
            this.isLoading.set(false);
            this.errorMessage.set('Kunde inte läsa innehåll i samlingen.');
            return of(null);
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe();
      return;
    }

    const folderId = this.selectedFolderId();
    if (folderId) {
      this.fetchCollections(folderId, page, pageSize, this.sortBy(), this.sortOrder());
    }
  }

  private restorePageSize() {
    const username = this.auth.username();
    if (!username) return;
    const savedSize = loadPageSize(username, GLOBAL_PAGE_SIZE_KEY);
    if (savedSize != null) {
      this.pageSize.set(savedSize);
    }
  }

  private loadFolderOptions(): void {
    this.directoryOptions
      .getNatureOptions()
      .pipe(
        tap(options => {
          this.folderNatureOptions.set(options);
          if (!this.isEditDialogOpen()) return;
          const doc = this.selectedFolderDoc();
          if (!doc) return;
          this.folderEditConfig.set(this.buildFolderEditConfig(doc));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    this.directoryOptions
      .getSubjectOptions()
      .pipe(
        tap(options => {
          this.folderSubjectOptions.set(options);
          if (!this.isEditDialogOpen()) return;
          const doc = this.selectedFolderDoc();
          if (!doc) return;
          this.folderEditConfig.set(this.buildFolderEditConfig(doc));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    this.directoryOptions
      .getCoverageOptions()
      .pipe(
        tap(options => {
          this.folderCoverageOptions.set(options);
          if (!this.isEditDialogOpen()) return;
          const doc = this.selectedFolderDoc();
          if (!doc) return;
          this.folderEditConfig.set(this.buildFolderEditConfig(doc));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private buildFolderEditConfig(doc: NuxeoDocument): FieldConfig[] {
    const props = doc.properties ?? {};
    const titleValue = props[NUXEO_SCHEMA_FIELDS.dc.title] ?? doc.title ?? '';
    const descriptionValue = props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '';
    const natureValue = props[NUXEO_SCHEMA_FIELDS.dc.nature];
    const natureId = natureValue?.id ?? natureValue?.properties?.id ?? '';
    const coverageValue = props[NUXEO_SCHEMA_FIELDS.dc.coverage];
    const coverageId = coverageValue?.id ?? coverageValue?.properties?.id ?? '';
    const coverageParentId = coverageValue?.properties?.parent?.id ?? '';
    const coverageDefault = coverageParentId && coverageId ? `${coverageParentId}/${coverageId}` : coverageId;
    const subjectsValue = props[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const subjectsArray = Array.isArray(subjectsValue) ? subjectsValue : [subjectsValue];
    const subjectIdSet = new Set(
      subjectsArray
        .map(entry => {
          const entryId = entry?.id ?? entry?.properties?.id ?? '';
          const parentId = entry?.properties?.parent?.id ?? '';
          return parentId && entryId ? `${parentId}/${entryId}` : entryId;
        })
        .filter(entry => entry.length > 0)
    );
    const selectedSubjects = this.folderSubjectOptions().filter(option => subjectIdSet.has(option.id));
    const expiresValue = props[NUXEO_SCHEMA_FIELDS.dc.expired];
    const expiresDefault = expiresValue ? [new Date(String(expiresValue))] : [];

    return [
      {
        type: 'input',
        name: 'title',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        defaultValue: String(titleValue),
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: String(descriptionValue ?? ''),
      },
      {
        type: 'dropdown',
        name: 'nature',
        label: 'Nature',
        options: this.folderNatureOptions(),
        defaultValue: String(natureId),
      },
      {
        type: 'dropdown-search',
        name: 'subjects',
        label: 'Subjects',
        options: this.folderSubjectOptions(),
        multiple: true,
        defaultValue: selectedSubjects,
      },
      {
        type: 'dropdown',
        name: 'coverage',
        label: 'Coverage',
        options: this.folderCoverageOptions(),
        defaultValue: String(coverageDefault),
      },
      {
        type: 'datepicker',
        name: 'expires',
        label: 'Expires',
        defaultValue: expiresDefault,
      },
    ];
  }
}
