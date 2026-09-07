import { ChangeDetectionStrategy, Component, input, output, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { CommonModule } from '@angular/common';

export interface ExternalRefOption {
  referens?: string | null;
  comment?: string | null;
  title?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-extern-referens',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent, CommonModule],
  templateUrl: './extern-referens.component.html',
})
export class ExternReferensComponent {
  isContactDialogOpen = signal(false);

  tableFields = input.required<WritableSignal<ExternalRefOption[]>>();
  heading = input<string>('');
  fieldName = input<string>('');
  parentRef = input();
  references = this.tableFields;
  shouldShowTable = input(true);
  saveReferences = output();

  form = new FormGroup({
    referens: new FormControl(''),
    comment: new FormControl(''),
  });

  readonly CUSTOM_TABLE_NAME = 'CUSTOM';

  // Base column config without tableName
  private readonly CUSTOM_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    { label: 'Referens', key: 'referens', visible: true },
    { label: 'Referenskommentar', key: 'comment', visible: true },
  ];

  // Add tableName to each column
  readonly CUSTOM_COLS: TableColumn[] = this.CUSTOM_COLS_BASE.map(c => ({
    ...c,
    tableName: this.CUSTOM_TABLE_NAME,
  }));

  addContact() {
    const { referens, comment } = this.form.value;
    const newContact = { referens, comment };

    this.references().update((refs: ExternalRefOption[]) => [...refs, newContact]);
    this.saveReferences.emit();
  }

  removeContact(item: ExternalRefOption) {
    this.references().update((refs: ExternalRefOption[]) => refs.filter(el => el.referens !== item.referens));
  }

  /** Returns default column options for the table */
  getDefaultColumnOptions(): TableColOption[] {
    return this.CUSTOM_COLS.map(col => ({
      id: col.key,
      label: col.label,
      visible: true,
    }));
  }
}
