import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DigiNavigationBreadcrumbs, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { ReactiveFormsModule } from '@angular/forms';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { catchError, EMPTY, tap } from 'rxjs';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { ToggleButtonComponent } from '@app/shared/components/toggle-button/toggle-button.component';
import { ViewMode } from '@app/shared/models/view-mode.enum';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { ImageButtonComponent } from '@app/shared/components/image-button/image-button.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { TopButtonsPanelComponent } from '@app/shared/components/top-buttons-panel/top-buttons-panel.component';
import { DeletedCardsComponent } from '@app/shared/components/deleted-cards/deleted-cards.component';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from '@app/shared/utils/page-size-storage';
import { GridPaginationControlsComponent } from '@app/shared/components/grid-pagination-controls/grid-pagination-controls.component';
import {
  DELETED_FILES_DELETE_ERROR_MESSAGE,
  DELETED_FILES_DELETE_SUCCESS_MESSAGE,
  DELETED_FILES_RESTORE_ERROR_MESSAGE,
  DELETED_FILES_RESTORE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { SortOrder, TableSortService } from '@app/core/services/table-sort.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-deleted-files',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    ReactiveFormsModule,
    CaseListTableComponent,
    ToggleButtonComponent,
    ImageButtonComponent,
    TopButtonsPanelComponent,
    DeletedCardsComponent,
    GridPaginationControlsComponent,
  ],
  templateUrl: './deleted-files.component.html',
})
export class DeletedFielsComponent implements OnInit {
  private nuxeoApi = inject(NuxeoApiService);
  private auth = inject(AuthService);
  private tableSortService = inject(TableSortService);
  deletedFiles = signal<NuxeoDocument[] | null>(null);
  viewMode = signal<ViewMode>(ViewMode.Grid);
  selectedFiles = signal<string[]>([]);
  readonly store = inject(GeneralStore);
  page = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>('');
  sortOrder = signal<SortOrder>('desc');
  readonly pageSizeOptions = [5, 10, 15, 25, 30, 50];

  totalSize = signal<number>(0);
  totalPages = computed(() => {
    const totalItems = Math.max(0, this.totalSize());
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(totalItems / size));
  });

  tableConfig: TableColumn[] = [
    {
      id: 'title',
      class: 'w-[30%]',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      visible: true,
      asLink: true,
    },
    { id: 'type', class: 'w-[30%]', label: 'Typ', key: 'type', sortField: 'ecm:primaryType', visible: true },
    {
      id: 'lastModified',
      class: 'w-[30%]',
      label: 'Senast ändrad',
      key: 'lastModified',
      sortField: NUXEO_SCHEMA_FIELDS.dc.modified,
      visible: true,
    },
  ].map(column => ({ ...column, tableName: 'DELETED_ITEMS_TABLE' }));

  defaultColumnOptions(): TableColOption[] {
    return this.tableConfig.map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: column.visible ?? true,
    }));
  }

  ngOnInit(): void {
    this.restorePageSize();
    this.loadDeletedFiles(0, this.pageSize());
  }

  loadDeletedFiles(currentPage: number, pageSize: number) {
    this.nuxeoApi
      .getDeletedFiles(currentPage, pageSize, this.sortBy(), this.sortOrder())
      .pipe(
        tap(data => {
          this.totalSize.set(data.totalSize);

          this.deletedFiles.set(
            data.entries.map(el => ({ ...el, id: el.uid, lastModified: formatDateOrMissing(el.lastModified) }))
          );
        })
      )
      .subscribe();
  }

  onToggleButtonChange(activeButtonIndex: number): void {
    this.viewMode.set(activeButtonIndex === 1 ? ViewMode.Grid : ViewMode.Table);
  }
  selectFiles(e: string[]) {
    this.selectedFiles.set(e);
  }

  restoreSelectedFiles(filesUid: string | string[]) {
    this.selectedFiles.set([]);
    this.nuxeoApi
      .restoreSelectedFiles(filesUid)
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: DELETED_FILES_RESTORE_SUCCESS_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DELETED_FILES_RESTORE_ERROR_MESSAGE,
          });
          return EMPTY;
        }),
        tap(() => this.loadDeletedFiles(0, this.pageSize()))
      )
      .subscribe();
  }

  deleteSelectedFiles(filesUid: string | string[]) {
    this.selectedFiles.set([]);
    this.nuxeoApi
      .deleteSelectedFiles(filesUid)
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: DELETED_FILES_DELETE_SUCCESS_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DELETED_FILES_DELETE_ERROR_MESSAGE,
          });
          return EMPTY;
        }),
        tap(() => this.loadDeletedFiles(0, this.pageSize()))
      )
      .subscribe();
  }
  onPageChange(newPage: number) {
    this.page.set(newPage);
    this.loadDeletedFiles(newPage, this.pageSize());
  }

  onPageSizeSelect(value: string | number) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    if (nextValue === this.pageSize()) return;
    this.pageSize.set(nextValue);
    this.page.set(0);
    this.loadDeletedFiles(0, nextValue);
    const username = this.auth.username();
    if (username) {
      savePageSize(username, GLOBAL_PAGE_SIZE_KEY, nextValue);
    }
  }

  onSortChange(event: { sortBy: string; sortOrder: SortOrder }): void {
    this.tableSortService.applySortSignals(this.sortBy, this.sortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });
    this.page.set(0);
    this.loadDeletedFiles(0, this.pageSize());
  }

  onGridPageChange(newPage: number): void {
    this.onPageChange(newPage);
  }

  onGridPageSizeSelect(value: string | number): void {
    this.onPageSizeSelect(value);
  }

  private restorePageSize() {
    const username = this.auth.username();
    if (!username) return;
    const savedSize = loadPageSize(username, GLOBAL_PAGE_SIZE_KEY);
    if (savedSize != null) {
      this.pageSize.set(savedSize);
    }
  }
}
