import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TableItem } from '@app/shared/models/case-table';
import type { AggBucket } from '@app/shared/api/nuxeo-api.types';
import type { Option } from '@app/shared/commonTypes';

export type AdvancedSearchQueryParamsState = Record<
  string,
  string | number | boolean | readonly (string | number | boolean)[]
>;

@Injectable({ providedIn: 'root' })
export class SearchService {
  entries = signal<TableItem[] | null>([]);
  entriesByType = signal<Record<string, TableItem[]>>({});
  selectedItem = signal<TableItem | null>(null);
  resultsCount = signal<number>(0);
  selectedDocTypes = signal<string[]>([]);
  quickArendeStatusFilter = signal<string[]>([]);
  quickHandlingStatusFilter = signal<string[]>([]);
  quickUtkastStatusFilter = signal<string[]>([]);
  quickArendeOrgFilter = signal<string[]>([]);
  quickArendeDateFilters = signal<Record<string, string>>({});
  quickHandlingDateFilters = signal<Record<string, string>>({});
  quickCreatedRangeByType = signal<Record<string, string[]>>({});
  createdAggBucketsByType = signal<Record<string, AggBucket[]>>({});
  handlingStatusAggOptions = signal<Option[]>([]);
  utkastStatusOptions = signal<Option[]>([]);
  activeAdvancedSearchQueryParams = signal<AdvancedSearchQueryParamsState>({});
  advancedSearchQueryParamsByType = signal<Record<string, AdvancedSearchQueryParamsState>>({});
  docTypeCounts = signal<Record<string, number>>({});
  totalsByType = signal<Record<string, number>>({});
  pagesByType = signal<Record<string, number>>({});
  activeDocType = signal<string>('');
  currentDocType = computed(() => {
    const selected = this.selectedDocTypes() ?? [];
    if (selected.length === 1) return selected[0] ?? '';
    return this.activeDocType();
  });
  isTabbed = computed(() => (this.selectedDocTypes()?.length ?? 0) > 1);
  activeEntries = computed(() => {
    if (!this.isTabbed()) return this.entries() ?? [];
    const activeType = this.activeDocType();
    return this.entriesByType()[activeType] ?? [];
  });
  activeTotal = computed(() => {
    if (!this.isTabbed()) return this.total() ?? 0;
    const activeType = this.activeDocType();
    return this.totalsByType()[activeType] ?? 0;
  });
  activePage = computed(() => {
    if (!this.isTabbed()) return this.page();
    const activeType = this.activeDocType();
    return this.pagesByType()[activeType] ?? 0;
  });
  visibleResultsCount = computed(() => (this.isTabbed() ? this.activeTotal() : this.resultsCount()));
  router = inject(Router);
  page = signal(0);
  total = signal<number | null>(null);

  constructor() {
    effect(() => {
      const item = this.selectedItem();
      if (item) {
        this.router.navigate(['/doc/', item?.['id']]);
      }
    });
  }

  setActiveDocType(tabId: string) {
    this.activeDocType.set(tabId);
    if (!this.isTabbed()) return;
    const nextPage = this.pagesByType()[tabId] ?? 0;
    if (this.page() !== nextPage) {
      this.page.set(nextPage);
    }
  }

  setActivePage(page: number) {
    if (this.isTabbed()) {
      const activeType = this.activeDocType();
      if (!activeType) return;
      this.pagesByType.update(current => ({ ...current, [activeType]: page }));
    }
    this.page.set(page);
  }
}
