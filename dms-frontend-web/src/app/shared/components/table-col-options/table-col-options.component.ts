import { Component, input, output, signal, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { AuthService } from '@app/core/services/auth.service';

export interface TableColOption {
  label: string;
  visible: boolean;
  id?: string;
}

@Component({
  selector: 'nuxeo-table-col-options',
  imports: [DigiArbetsformedlingenAngularModule],
  templateUrl: './table-col-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableColOptionsComponent implements OnInit {
  columnOptions = input.required<TableColOption[]>();
  defaultColumnOptions = input.required<TableColOption[]>();
  tableName = input.required<string>();

  newColumnOptions = output<TableColOption[]>();
  closeDialog = output<void>();

  localOptions = signal<TableColOption[]>([]);
  allColumnsSelected = computed(() => {
    const options = this.localOptions();
    return options.length > 0 && options.every(option => option.visible);
  });

  private storageKey = '';
  private defaultStorageKey = '';
  private authService = inject(AuthService);

  ngOnInit() {
    if (!this.defaultColumnOptions().length) return;

    const defaults = this.defaultColumnOptions().map((col, item) => ({
      ...col,
      id: col.id ?? `${col.label.replace(/\s+/g, '_')}_${item}`,
    }));

    const name = this.tableName();
    const username = this.authService.username();
    const accountSuffix = username ? `_${username}` : '';

    this.storageKey = `table_columns_current_${name}${accountSuffix}`;
    this.defaultStorageKey = `table_columns_default_${name}`;

    if (!localStorage.getItem(this.defaultStorageKey)) {
      this.saveColumnsToLocalStorage(defaults, this.defaultStorageKey);
    }

    const savedCurrent = this.loadFromLocalStorage(this.storageKey);
    const startOptions = savedCurrent ?? defaults;

    this.localOptions.set(startOptions);
    this.newColumnOptions.emit(startOptions);
  }

  toggleVisibility(col: TableColOption, event: Event | CustomEvent) {
    const checked = this.extractChecked(event);
    const current = this.localOptions();

    const visibleCount = current.filter(opt => opt.visible).length;
    if (!checked && visibleCount === 1) {
      return;
    }

    const updated = current.map(option => (option.id === col.id ? { ...option, visible: checked } : option));

    this.localOptions.set(updated);
    this.saveColumnsToLocalStorage(updated, this.storageKey);
    this.newColumnOptions.emit(updated);
  }

  selectAll() {
    const updated = this.localOptions().map(option => ({ ...option, visible: true }));

    this.localOptions.set(updated);
    this.saveColumnsToLocalStorage(updated, this.storageKey);
    this.newColumnOptions.emit(updated);
  }

  applyChangesAndClose() {
    const options = this.localOptions();
    this.saveColumnsToLocalStorage(options, this.storageKey);
    this.newColumnOptions.emit(options);
    this.closeDialog.emit();
  }

  resetToDefault() {
    const defaults = this.loadFromLocalStorage(this.defaultStorageKey);
    if (!defaults) return;

    this.localOptions.set(defaults);
    this.saveColumnsToLocalStorage(defaults, this.storageKey);
    this.newColumnOptions.emit(defaults);
  }

  private saveColumnsToLocalStorage(options: TableColOption[], key: string) {
    localStorage.setItem(key, JSON.stringify(options));
  }

  private loadFromLocalStorage(key: string): TableColOption[] | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private extractChecked(event: Event | CustomEvent): boolean {
    const target = event.target as { checked?: boolean } | null;
    if (typeof target?.checked === 'boolean') return target.checked;

    const detail = (event as CustomEvent).detail;
    if (typeof detail?.checked === 'boolean') return detail.checked;
    if (typeof detail?.target?.checked === 'boolean') return detail.target.checked;

    return false;
  }
}
