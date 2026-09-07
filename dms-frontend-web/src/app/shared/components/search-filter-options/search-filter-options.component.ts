import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { DigiButton } from '@designsystem-se/af-angular';
import { SearchFilterOption } from './search-filter-options.types';

@Component({
  selector: 'nuxeo-search-filter-options',
  imports: [DigiButton],
  templateUrl: './search-filter-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFilterOptionsComponent implements OnInit {
  filterOptions = input.required<SearchFilterOption[]>();
  defaultFilterOptions = input.required<SearchFilterOption[]>();

  filtersUpdated = output<SearchFilterOption[]>();
  closeDialog = output<void>();

  localOptions = signal<SearchFilterOption[]>([]);

  ngOnInit(): void {
    const startOptions = this.filterOptions().map(option => ({ ...option }));
    this.localOptions.set(startOptions);
  }

  toggleVisibility(option: SearchFilterOption, event: Event): void {
    const target = event.target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    const updated = this.localOptions().map(item => (item.id === option.id ? { ...item, visible: checked } : item));

    this.localOptions.set(updated);
    this.filtersUpdated.emit(updated);
  }

  applyChangesAndClose(): void {
    const options = this.localOptions();
    this.filtersUpdated.emit(options);
    this.closeDialog.emit();
  }

  resetToDefault(): void {
    const defaults = this.defaultFilterOptions().map(option => ({ ...option }));
    this.localOptions.set(defaults);
    this.filtersUpdated.emit(defaults);
  }
}
