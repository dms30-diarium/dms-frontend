import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { DigiNavigationPaginationCustomEvent } from '@designsystem-se/af';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-grid-pagination-controls',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule],
  templateUrl: './grid-pagination-controls.component.html',
})
export class GridPaginationControlsComponent {
  totalPages = input<number>(1);
  currentPage = input<number>(0);
  pageSize = input<number>(25);
  pageSizeOptions = input<number[]>([5, 10, 15, 25, 30, 50]);
  pageSizeLabel = input<string>('Rader per sida');
  pageSizePlaceholder = input<string>('Rader per sida');
  showPageSize = input<boolean>(true);

  pageChange = output<number>();
  pageSizeSelect = output<string>();

  onPageChange(event: DigiNavigationPaginationCustomEvent<number>): void {
    this.pageChange.emit(Math.max(0, event.detail - 1));
  }

  onPageSizeChange(value: string): void {
    this.pageSizeSelect.emit(value);
  }
}
