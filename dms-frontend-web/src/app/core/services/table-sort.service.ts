import { Injectable, WritableSignal } from '@angular/core';

export type SortOrder = 'asc' | 'desc';

export interface TableSortState {
  sortBy: string;
  sortOrder: SortOrder;
}

@Injectable({ providedIn: 'root' })
export class TableSortService {
  sortLocalItems<T extends Record<string, unknown>>(items: T[], sortBy: string, sortOrder: SortOrder): T[] {
    const direction = sortOrder === 'asc' ? 1 : -1;

    return [...items].sort(
      (firstItem, secondItem) =>
        String(firstItem[sortBy]).localeCompare(String(secondItem[sortBy]), 'sv-SE', {
          numeric: true,
          sensitivity: 'base',
        }) * direction
    );
  }

  resolveSort(current: TableSortState, next: TableSortState, defaultSort: TableSortState): TableSortState {
    const isAtDefault = current.sortBy === defaultSort.sortBy && current.sortOrder === defaultSort.sortOrder;
    const shouldResetToDefault =
      !isAtDefault && current.sortBy === next.sortBy && current.sortOrder === 'desc' && next.sortOrder === 'asc';

    return shouldResetToDefault ? defaultSort : next;
  }

  applySortSignals(
    sortBy: WritableSignal<string>,
    sortOrder: WritableSignal<SortOrder>,
    next: TableSortState,
    defaultSort: TableSortState
  ): TableSortState {
    const resolved = this.resolveSort({ sortBy: sortBy(), sortOrder: sortOrder() }, next, defaultSort);
    sortBy.set(resolved.sortBy);
    sortOrder.set(resolved.sortOrder);
    return resolved;
  }
}
