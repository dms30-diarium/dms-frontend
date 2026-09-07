import { Injectable, computed, inject, signal } from '@angular/core';
import { SearchService } from '@app/core/services/search-service';
import { TableSortService } from '@app/core/services/table-sort.service';

type SortOrder = 'asc' | 'desc';

@Injectable({ providedIn: 'root' })
export class SearchSortService {
  private readonly searchService = inject(SearchService);
  private readonly tableSortService = inject(TableSortService);

  private readonly sortBy = signal<string>('');
  private readonly sortOrder = signal<SortOrder>('desc');
  private readonly sortByByType = signal<Record<string, string>>({});
  private readonly sortOrderByType = signal<Record<string, SortOrder>>({});

  readonly activeSortBy = computed(() => {
    if (!this.searchService.isTabbed()) return this.sortBy();
    const activeType = this.searchService.activeDocType();
    if (!activeType) return '';
    return this.sortByByType()[activeType] ?? '';
  });

  readonly activeSortOrder = computed(() => {
    if (!this.searchService.isTabbed()) return this.sortOrder();
    const activeType = this.searchService.activeDocType();
    if (!activeType) return this.sortOrder();
    return this.sortOrderByType()[activeType] ?? this.sortOrder();
  });

  setActiveSort(sortBy: string, sortOrder: SortOrder) {
    if (this.searchService.isTabbed()) {
      const activeType = this.searchService.activeDocType();
      if (!activeType) return;
      this.sortByByType.update(current => ({ ...current, [activeType]: sortBy }));
      this.sortOrderByType.update(current => ({ ...current, [activeType]: sortOrder }));
      return;
    }

    this.sortBy.set(sortBy);
    this.sortOrder.set(sortOrder);
  }

  applyActiveSort(
    next: { sortBy: string; sortOrder: SortOrder },
    defaultSort: { sortBy: string; sortOrder: SortOrder }
  ) {
    const resolved = this.tableSortService.resolveSort(
      { sortBy: this.activeSortBy(), sortOrder: this.activeSortOrder() },
      next,
      defaultSort
    );
    this.setActiveSort(resolved.sortBy, resolved.sortOrder);
  }

  getSortForDocType(docType: string): { sortBy: string; sortOrder: SortOrder } {
    if (!this.searchService.isTabbed()) {
      return { sortBy: this.sortBy(), sortOrder: this.sortOrder() };
    }
    return {
      sortBy: this.sortByByType()[docType] ?? '',
      sortOrder: this.sortOrderByType()[docType] ?? this.sortOrder(),
    };
  }
}
