import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, AuditLogEntries } from '@app/shared/api/nuxeo-api.types';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { Option } from '@app/shared/commonTypes';
import { TableItem } from '@app/shared/models/case-table';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  AUDIT_LOAD_ACTIONS_ERROR_MESSAGE,
  AUDIT_LOAD_CATEGORIES_ERROR_MESSAGE,
  AUDIT_LOAD_LOG_ERROR_MESSAGE,
  AUDIT_LOAD_USERS_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { SearchService } from '@app/core/services/search.service';
import { catchError, debounceTime, EMPTY, finalize, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableSortService } from '@app/core/services/table-sort.service';

interface AuditFiltersInput {
  principalName?: Option[] | null;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
  eventId?: Option[] | null;
  category?: Option[] | null;
}

@Component({
  selector: 'nuxeo-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    ReactiveFormsModule,
    CaseListTableComponent,
  ],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.scss',
})
export class AuditComponent implements OnInit {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(GeneralStore);
  private readonly searchService = inject(SearchService);
  private readonly tableSortService = inject(TableSortService);

  readonly pageSize = 40;
  page = signal(0);
  sortBy = signal<string>('');
  sortOrder = signal<'asc' | 'desc'>('desc');

  loading = signal(false);
  response = signal<AuditLogEntries | null>(null);
  filtersValue = signal<AuditFiltersInput>({
    principalName: [],
    dateFrom: null,
    dateTo: null,
    eventId: [],
    category: [],
  });

  filters = this.fb.group({
    principalName: new FormControl<Option[] | null>([]),
    dateFrom: new FormControl<Date | string | null>(null),
    dateTo: new FormControl<Date | string | null>(null),
    eventId: new FormControl<Option[] | null>([]),
    category: new FormControl<Option[] | null>([]),
  });

  actionOptions = signal<Option[]>([{ id: '', label: 'All actions', value: '' }]);
  categoryOptions = signal<Option[]>([{ id: '', label: 'All categories', value: '' }]);
  userOptions = signal<Option[]>([{ id: '', label: 'All users', value: '' }]);

  readonly tableConfig: TableColumn[] = [
    {
      id: 'eventId',
      label: this.store.getValue('audit.performedAction') ?? 'Utförd åtgärd',
      key: 'eventId',
      sortField: 'eventId',
      visible: true,
      class: 'w-[18%]',
    },
    {
      id: 'eventDate',
      label: this.store.getValue('audit.date') ?? 'Datum',
      key: 'eventDate',
      sortField: 'eventDate',
      visible: true,
      class: 'w-[16%]',
    },
    {
      id: 'principalName',
      label: this.store.getValue('audit.username') ?? 'Användarnamn',
      key: 'principalName',
      sortField: 'principalName',
      visible: true,
      class: 'w-[16%]',
    },
    {
      id: 'category',
      label: this.store.getValue('audit.category') ?? 'Kategori',
      key: 'category',
      sortField: 'category',
      visible: true,
      class: 'w-[16%]',
    },
    {
      id: 'document',
      label: this.store.getValue('audit.document') ?? 'Dokument',
      key: 'document',
      sortField: 'document',
      visible: true,
      class: 'w-[22%]',
    },
    {
      id: 'comment',
      label: this.store.getValue('audit.comment') ?? 'Kommentar',
      key: 'comment',
      sortField: 'comment',
      visible: true,
      class: 'w-[16%]',
    },
  ].map(col => ({ ...col, tableName: 'AUDIT_LOG' }));

  readonly defaultColumnOptions: TableColOption[] = this.tableConfig.map(col => ({
    id: col.key.toString(),
    label: col.label,
    visible: col.visible ?? true,
  }));

  total = computed(() => {
    const response = this.response();
    if (!response) return 0;
    if (this.filteredEntries().length === 0) {
      return 0;
    }
    const pageCount = response.pageCount ?? response.numberOfPages;
    if (typeof pageCount === 'number' && response.pageSize) {
      return pageCount * response.pageSize;
    }
    return response.resultsCount ?? 0;
  });

  private readonly filteredEntries = computed(() => {
    const entries = this.response()?.entries ?? [];
    const filters = this.filtersValue();
    const principal = this.getSelectedValue(filters.principalName);
    const eventId = this.getSelectedValue(filters.eventId);
    const category = this.getSelectedValue(filters.category);
    const fromValue = this.getDateComparable(filters.dateFrom);
    const toValue = this.getDateComparable(filters.dateTo);

    return entries.filter(entry => {
      if (!this.matchesText(entry.principalName, principal, 'contains')) return false;
      if (!this.matchesText(entry.eventId, eventId, 'equals')) return false;
      if (!this.matchesText(entry.category, category, 'equals')) return false;

      if (fromValue || toValue) {
        if (typeof fromValue === 'string' || typeof toValue === 'string') {
          const rawDate = entry.eventDate || entry.logDate;
          if (typeof rawDate !== 'string') return false;
          if (typeof fromValue === 'string' && rawDate < fromValue) return false;
          if (typeof toValue === 'string' && rawDate > toValue) return false;
        } else {
          const timestamp = this.getEntryTimestamp(entry);
          if (!timestamp) return false;
          if (typeof fromValue === 'number' && timestamp < fromValue) return false;
          if (typeof toValue === 'number' && timestamp > toValue) return false;
        }
      }

      return true;
    });
  });

  rows = computed<TableItem[]>(() =>
    this.filteredEntries().map(entry => ({
      id: entry.id?.toString() ?? '',
      eventId: entry.eventId || '-',
      eventDate: this.formatAuditDate(entry.eventDate || entry.logDate),
      principalName: entry.principalName || '-',
      category: entry.category || '-',
      document: this.formatDocument(entry),
      comment: entry.comment || '-',
    }))
  );

  ngOnInit(): void {
    this.filtersValue.set(this.filters.getRawValue());
    this.loadUserOptions('');
    this.loadActionOptions();
    this.loadCategoryOptions();
    this.loadAudit(0);

    this.filters.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      this.filtersValue.set(value ?? {});
      this.page.set(0);
      this.loadAudit(0);
    });
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadAudit(page);
  }

  onSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.tableSortService.applySortSignals(this.sortBy, this.sortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });

    this.page.set(0);
    this.loadAudit(0);
  }

  onUserQuery(event: unknown): void {
    const term = this.searchService.extractTerm(event);
    this.loadUserOptions(term);
  }

  onUserSelect(event: CustomEvent<unknown>): void {
    const items = this.resolveSelectionItems(event.detail);
    this.filters.get('principalName')?.setValue(items);
  }

  onActionSelect(event: CustomEvent<unknown>): void {
    const items = this.resolveSelectionItems(event.detail);
    this.filters.get('eventId')?.setValue(items);
  }

  onCategorySelect(event: CustomEvent<unknown>): void {
    const items = this.resolveSelectionItems(event.detail);
    this.filters.get('category')?.setValue(items);
  }

  onDateChange(controlName: 'dateFrom' | 'dateTo', event: CustomEvent<Date[] | string[] | []>): void {
    const selected = Array.isArray(event.detail) ? event.detail[0] : null;
    this.filters.get(controlName)?.setValue(selected ?? null);
  }

  getSelectedOptions(controlName: 'principalName' | 'eventId' | 'category'): Option[] {
    const rawValue = this.filters.get(controlName)?.value;
    return Array.isArray(rawValue) ? rawValue.filter(item => this.isOption(item)) : [];
  }

  private loadAudit(pageIndex: number): void {
    const filters = this.filtersValue();
    const principalName = this.getSelectedValue(filters.principalName)?.trim() ?? '';
    const eventIds = this.getSelectedValue(filters.eventId)?.trim() ?? '';
    const eventCategory = this.getSelectedValue(filters.category)?.trim() ?? '';
    this.loading.set(true);

    this.nuxeoApi
      .queryAuditEntries({
        principalName,
        eventIds: eventIds || undefined,
        eventCategory: eventCategory || undefined,
        currentPageIndex: pageIndex,
        pageSize: this.pageSize,
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      })
      .pipe(
        tap(response => this.response.set(response)),
        catchError(() => {
          this.response.set(null);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: AUDIT_LOAD_LOG_ERROR_MESSAGE,
          });
          return EMPTY;
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe();
  }

  private loadUserOptions(searchTerm: string): void {
    this.nuxeoApi
      .getUserSuggestions(searchTerm)
      .pipe(
        tap(users => {
          const options = users.map(user => ({
            id: user.id,
            label: user.displayLabel || user.username || user.id,
            value: user.id,
          }));
          this.userOptions.set([{ id: '', label: 'All users', value: '' }, ...options]);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: AUDIT_LOAD_USERS_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  private loadActionOptions(): void {
    this.nuxeoApi
      .getDirectorySuggestions('eventTypes', {
        dbl10n: false,
        localize: true,
        lang: 'en',
        searchTerm: '',
      })
      .pipe(
        tap(entries => {
          const options = entries.map(entry => ({
            id: entry.id,
            label: entry.displayLabel || entry.label || entry.id,
            value: entry.id,
          }));
          this.actionOptions.set([{ id: '', label: 'All actions', value: '' }, ...options]);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: AUDIT_LOAD_ACTIONS_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  private loadCategoryOptions(): void {
    this.nuxeoApi
      .getDirectorySuggestions('eventCategories', {
        dbl10n: false,
        localize: true,
        lang: 'en',
        searchTerm: '',
      })
      .pipe(
        tap(entries => {
          const options = entries.map(entry => ({
            id: entry.id,
            label: entry.displayLabel || entry.label || entry.id,
            value: entry.id,
          }));
          this.categoryOptions.set([{ id: '', label: 'All categories', value: '' }, ...options]);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: AUDIT_LOAD_CATEGORIES_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  private formatDocument(entry: AuditEntry): string {
    return entry.docPath || entry.docType || entry.docUUID || '-';
  }

  private formatAuditDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  private resolveSelectionItems(detail: unknown): Option[] {
    if (Array.isArray(detail)) {
      return detail.filter(item => this.isOption(item));
    }
    return this.isOption(detail) ? [detail] : [];
  }

  private getEntryTimestamp(entry: AuditEntry): number | null {
    const value = entry.eventDate || entry.logDate;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  private matchesText(value: unknown, filter: string | null, mode: 'contains' | 'equals'): boolean {
    if (!filter) return true;
    if (typeof value !== 'string') return false;
    return mode === 'contains' ? value.includes(filter) : value === filter;
  }

  private getSelectedValue(value: Option[] | null | undefined): string | null {
    const first = value?.[0];
    if (!first) return null;
    if (typeof first.value === 'string') return first.value;
    if (typeof first.id === 'string') return first.id;
    return null;
  }

  private getDateComparable(value: Date | string | null | undefined): string | number | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.getTime();
  }

  private isOption(value: unknown): value is Option {
    return this.isRecord(value) && typeof value['id'] === 'string' && typeof value['label'] === 'string';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
