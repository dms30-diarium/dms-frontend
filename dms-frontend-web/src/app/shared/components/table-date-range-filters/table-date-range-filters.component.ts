import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';

type DateRangeEdge = 'from' | 'to';
type DateRangeMode = 'range' | 'single';

interface DateRangeValue {
  from: string;
  to: string;
}

interface DateRangeColumn {
  label: string;
  sortField: string;
  mode?: DateRangeMode;
  filterField?: string;
}

@Component({
  selector: 'nuxeo-table-date-range-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiArbetsformedlingenAngularModule],
  templateUrl: './table-date-range-filters.component.html',
})
export class TableDateRangeFiltersComponent {
  dateColumns = input<DateRangeColumn[]>([]);
  showQuickRangeFilter = input(true);
  dateRangeSelection = input<Record<string, string>>({});
  dateRangeChange = output<{ field: string; value: string }>();

  isDialogOpen = signal(false);
  quickRange = signal('');
  private dateValues = signal<Record<string, DateRangeValue>>({});
  private lastConfigKey = '';

  hasAnySelection = computed(() => {
    const values = Object.values(this.dateValues());
    return values.some(value => value.from || value.to);
  });

  constructor() {
    effect(() => {
      const config = this.dateColumns();
      const signature = config.map(col => this.getColumnKey(col)).join('|');
      if (signature === this.lastConfigKey) return;
      this.lastConfigKey = signature;
      this.dateValues.set({});
    });

    effect(() => {
      const selection = this.dateRangeSelection();
      const columns = this.dateColumns();
      if (this.isDialogOpen()) return;
      this.syncDateValuesFromSelection(columns, selection);
    });
  }

  openDialog(): void {
    this.syncDateValuesFromSelection(this.dateColumns(), this.dateRangeSelection());
    this.isDialogOpen.set(true);
  }

  closeDialog(): void {
    this.isDialogOpen.set(false);
  }

  getDateSelection(col: DateRangeColumn, edge: DateRangeEdge): Date[] {
    const raw = this.getDateValue(col, edge);
    if (!raw) return [];
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? [] : [date];
  }

  isSingleDate(col: DateRangeColumn): boolean {
    return col.mode === 'single';
  }

  getInputId(col: DateRangeColumn, edge: DateRangeEdge): string {
    const base = this.getColumnKey(col).replace(/[^a-z0-9_-]+/gi, '-');
    return `table-date-range-${base}-${edge}`;
  }

  onDateChange(event: CustomEvent<Date[] | string[] | []>, col: DateRangeColumn, edge: DateRangeEdge): void {
    const [first] = event.detail ?? [];
    const dateValue = first ? new Date(String(first)) : null;
    const value = dateValue && !Number.isNaN(dateValue.getTime()) ? toISODateOnlyString(dateValue) : '';
    const key = this.getColumnKey(col);
    const current = this.dateValues()[key] ?? { from: '', to: '' };
    const nextFrom = edge === 'from' ? value : current.from;
    const nextTo = edge === 'to' ? value : current.to;

    const next = { ...current, from: nextFrom, to: nextTo };

    this.dateValues.update(state => ({
      ...state,
      [key]: next,
    }));
  }

  clearDate(col: DateRangeColumn, edge: DateRangeEdge): void {
    this.updateDateValue(col, edge, '');
  }

  clearAll(): void {
    const columns = this.dateColumns();
    columns.forEach(col => {
      this.updateDateValue(col, 'from', '');
      this.updateDateValue(col, 'to', '');
    });
  }

  reset(): void {
    this.dateValues.set({});
    this.closeDialog();
  }

  private updateDateValue(col: DateRangeColumn, edge: DateRangeEdge, value: string): void {
    const key = this.getColumnKey(col);
    const current = this.dateValues()[key] ?? { from: '', to: '' };
    const next = edge === 'from' ? { ...current, from: value } : { ...current, to: value };

    this.dateValues.update(state => ({
      ...state,
      [key]: next,
    }));
  }

  applyFilters(): void {
    const columns = this.dateColumns();
    columns.forEach(col => {
      const rangeFields = this.getRangeFields(col);
      if (this.isSingleDate(col)) {
        if (rangeFields.baseField) {
          this.dateRangeChange.emit({ field: rangeFields.baseField, value: this.getDateValue(col, 'from') });
        }
        return;
      }
      if (rangeFields.minField) {
        this.dateRangeChange.emit({ field: rangeFields.minField, value: this.getDateValue(col, 'from') });
      }
      if (rangeFields.maxField) {
        this.dateRangeChange.emit({ field: rangeFields.maxField, value: this.getDateValue(col, 'to') });
      }
    });
    this.closeDialog();
  }

  private getDateValue(col: DateRangeColumn, edge: DateRangeEdge): string {
    const key = this.getColumnKey(col);
    const current = this.dateValues()[key];
    if (!current) return '';
    return edge === 'from' ? current.from : current.to;
  }

  private buildDateValuesFromSelection(
    columns: DateRangeColumn[],
    selection: Record<string, string>
  ): Record<string, DateRangeValue> {
    const next: Record<string, DateRangeValue> = {};
    columns.forEach(col => {
      const key = this.getColumnKey(col);
      const rangeFields = this.getRangeFields(col);
      if (this.isSingleDate(col)) {
        const value = selection[rangeFields.baseField] ?? '';
        if (value) {
          next[key] = { from: value, to: '' };
        }
        return;
      }
      const from = selection[rangeFields.minField] ?? '';
      const to = selection[rangeFields.maxField] ?? '';
      if (from || to) {
        next[key] = { from, to };
      }
    });
    return next;
  }

  private syncDateValuesFromSelection(columns: DateRangeColumn[], selection: Record<string, string>): void {
    const next = this.buildDateValuesFromSelection(columns, selection);
    if (this.isDateValueMapUnchanged(this.dateValues(), next)) return;
    this.dateValues.set(next);
  }

  private isDateValueMapUnchanged(
    left: Record<string, DateRangeValue>,
    right: Record<string, DateRangeValue>
  ): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(key => {
      const leftValue = left[key];
      const rightValue = right[key];
      return leftValue?.from === rightValue?.from && leftValue?.to === rightValue?.to;
    });
  }

  private getRangeFields(col: DateRangeColumn): { baseField: string; minField: string; maxField: string } {
    const rawField = col.filterField ?? col.sortField;
    const base = this.toRangeFieldBase(rawField);
    return {
      baseField: base,
      minField: base ? `${base}_min` : '',
      maxField: base ? `${base}_max` : '',
    };
  }

  private getColumnKey(col: DateRangeColumn): string {
    return `${col.sortField}::${col.label.toLowerCase()}`;
  }

  private toRangeFieldBase(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const stripped = this.stripRangeSuffix(trimmed);
    const normalized = stripped.replace(/:/g, '_');
    return this.applyRangeFieldAliases(normalized);
  }

  private stripRangeSuffix(value: string): string {
    if (value.endsWith('_min')) return value.slice(0, -4);
    if (value.endsWith('_max')) return value.slice(0, -4);
    return value;
  }

  private applyRangeFieldAliases(value: string): string {
    switch (value) {
      case 'dc_created':
        return 'dublincore_created';
      case 'dc_modified':
        return 'dublincore_modified';
      default:
        return value;
    }
  }
}
