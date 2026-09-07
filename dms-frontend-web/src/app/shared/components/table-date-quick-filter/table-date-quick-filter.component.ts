import { ChangeDetectionStrategy, Component, computed, input, inject, output } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import type { AggBucket } from '@app/shared/api/nuxeo-api.types';
import type { Option } from '@app/shared/commonTypes';
import { GeneralStore } from '@app/core/services/general-store.service';

@Component({
  selector: 'nuxeo-table-date-quick-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiArbetsformedlingenAngularModule],
  templateUrl: './table-date-quick-filter.component.html',
})
export class TableDateQuickFilterComponent {
  private store = inject(GeneralStore);
  quickRangeBuckets = input<AggBucket[]>([]);
  quickRangeSelection = input<string[]>([]);
  dateRangeChange = output<{ field: string; value: string[] | string }>();
  selectedItems = input<string[]>([]);
  selectedItemsChanged = output<string[]>();

  quickRangeFilterItems = computed<Option[]>(() => {
    if (this.quickRangeBuckets().length) {
      return this.quickRangeBuckets().map(option => ({
        id: option.key,
        label: this.store.messagesInfo()?.[`label.ui.aggregate.${option.key}`] + ` (${option.docCount})`,
      }));
    }

    return [];
  });

  onSubmit(e: CustomEvent) {
    this.selectedItemsChanged.emit(e.detail.checked);
    this.dateRangeChange.emit({ field: 'dublincore_created_agg', value: e.detail.checked });
  }
  onReset() {
    this.selectedItemsChanged.emit([]);
    this.dateRangeChange.emit({ field: 'dublincore_created_agg', value: [] });
  }
}
