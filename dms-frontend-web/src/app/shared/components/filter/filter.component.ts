import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { CdkMenuModule } from '@angular/cdk/menu';
import { FilterGroup } from './types';
import { FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-filter-menu',
  standalone: true,
  imports: [CdkMenuModule, FormsModule],
  templateUrl: './filter.component.html',
})
export class FilterMenuComponent {
  filters = input.required<FilterGroup[]>();
  selectionChange = output<Record<string, string[]>>();

  private selectedFilters = signal<Record<string, Set<string>>>({});
  hasSelected = computed(() => Object.values(this.selectedFilters()).some(s => s.size > 0));

  selectedCount = computed(() => Object.values(this.selectedFilters()).reduce((acc, set) => acc + set.size, 0));

  searchTerm = signal<string>('');

  toggle(filter: FilterGroup, option: string) {
    const updated = { ...this.selectedFilters() };
    const set = new Set(updated[filter.name] ?? []);
    if (set.has(option)) set.delete(option);
    else {
      if (filter.filterType === 'radio') set.clear();
      set.add(option);
    }
    updated[filter.name] = set;
    this.selectedFilters.set(updated);
  }

  apply() {
    const result: Record<string, string[]> = {};
    for (const f of this.filters()) {
      const set = this.selectedFilters()[f.name];
      if (set?.size) result[f.name] = Array.from(set);
    }
    this.selectionChange.emit(result);
  }

  isChecked(filterName: string, option: string) {
    return this.selectedFilters()[filterName]?.has(option) ?? false;
  }

  resetAll() {
    this.selectedFilters.set({});
    this.selectionChange.emit({});
  }

  filteredOptions(options: { id: string; label: string }[]) {
    const term = this.searchTerm().toLowerCase();
    return term ? options.filter(o => o.label.toLowerCase().includes(term)) : options;
  }
}
