import { ChangeDetectionStrategy, Component, computed, input, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';

@Component({
  selector: 'nuxeo-handlingsnamn-options',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './handlingsnamn-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HandlingsnamnOptionsComponent {
  tableFields = input.required<WritableSignal<string[]>>();

  isDialogOpen = signal(false);

  form = new FormGroup({
    handlingsnamn: new FormControl('', { nonNullable: true }),
  });

  private readonly TABLE_NAME = 'HANDLINGSNAMN';

  readonly COLS: TableColumn[] = [
    { label: 'Handlingsnamn', key: 'handlingsnamn', visible: true, tableName: this.TABLE_NAME },
  ];

  readonly defaultColumnOptions: TableColOption[] = [{ id: 'handlingsnamn', label: 'Handlingsnamn', visible: true }];

  values = computed<TableItem[]>(() => this.tableFields()().map(v => ({ id: v, handlingsnamn: v })));

  save(): void {
    const value = this.form.controls.handlingsnamn.value.trim();
    if (!value) return;
    this.tableFields().update(items => [...items, value]);
    this.form.reset();
    this.isDialogOpen.set(false);
  }

  remove(item: TableItem): void {
    this.tableFields().update(items => items.filter(v => v !== item['id']));
  }
}
