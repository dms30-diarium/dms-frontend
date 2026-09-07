import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { HistoryService } from '@app/core/services/history-service.service';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';
import { DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { paginateEntries, updateCurrentPage } from '@app/shared/utils/pagination-utils';
import { AuthService } from '@app/core/services/auth.service';
import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from '@app/shared/utils/page-size-storage';
import { SortOrder, TableSortService } from '@app/core/services/table-sort.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-recent-viewed',
  standalone: true,
  imports: [CaseListTableComponent, DigiNavigationBreadcrumbs],
  templateUrl: './recent-viewed.component.html',
})
export class RecentViewedComponent {
  historyService = inject(HistoryService);
  auth = inject(AuthService);
  private tableSortService = inject(TableSortService);

  readonly DEFAULT_TABLE_NAME = 'Recent_Viewed';

  readonly pageSizeOptions = [5, 10, 15, 25, 30, 50];
  tableConfig: TableColumn[] = [
    {
      label: 'Titel eller filnamn',
      key: 'title',
      sortField: 'title',
      class: 'w-[33%]',
      asLink: true,
      visible: true,
    },
    {
      label: 'Typ',
      key: 'type',
      sortField: 'type',
      class: 'w-[33%]',
      visible: true,
      inputConfig: { type: 'textWithIcon' as const },
    },
    { label: 'Senast visad', key: 'receivedDate', sortField: 'lastViewed', class: 'w-[33%]', visible: true },
  ].map(col => ({ ...col, tableName: this.DEFAULT_TABLE_NAME }));

  readonly page = signal(0);
  readonly pageSize = signal(25);
  readonly sortBy = signal<string>('lastViewed');
  readonly sortOrder = signal<SortOrder>('desc');

  historyTableItems = computed<TableItem[]>(() =>
    this.historyService.historySignal().map(entry => ({
      id: entry.url,
      title: entry.name,
      type: entry.type || 'Ärende/Handling',
      receivedDate: this.historyService.getDate(entry.lastViewed),
      lastViewed: entry.lastViewed ?? '',
      link: [entry.url],
    }))
  );

  readonly sortedHistoryItems = computed(() =>
    this.tableSortService.sortLocalItems(this.historyTableItems(), this.sortBy(), this.sortOrder())
  );
  readonly pagedHistoryItems = computed(() => paginateEntries(this.sortedHistoryItems(), this.page(), this.pageSize()));

  constructor() {
    this.restorePageSize();
    this.historyService.enrichMissingEntries();
    effect(() => {
      updateCurrentPage(this.page, this.historyTableItems().length, this.pageSize());
    });
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.tableConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: true,
    }));
  }

  onPageSizeSelect(value: string | number) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    if (nextValue === this.pageSize()) return;
    this.pageSize.set(nextValue);
    this.page.set(0);
    const username = this.auth.username();
    if (username) {
      savePageSize(username, GLOBAL_PAGE_SIZE_KEY, nextValue);
    }
  }

  onSortChange(event: { sortBy: string; sortOrder: SortOrder }): void {
    this.tableSortService.applySortSignals(this.sortBy, this.sortOrder, event, {
      sortBy: 'lastViewed',
      sortOrder: 'desc',
    });
    this.page.set(0);
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
