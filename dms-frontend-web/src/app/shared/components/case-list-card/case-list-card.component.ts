import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableItem } from '@models/case-table';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-case-list-card',
  imports: [],
  templateUrl: './case-list-card.component.html',
})
export class CaseListCardComponent {
  index = input(0);
  gridItems = input<TableItem[]>([]);
  viewCase() {
    console.log('Viewing case:', this.gridItems()[this.index()]['link']);
  }
}
