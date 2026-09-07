import { ChangeDetectionStrategy, Component, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { TableColOption } from '../../table-col-options/table-col-options.component';

import { Option } from '@app/shared/commonTypes';
import { TableItem } from '@app/shared/models/case-table';
import { arendemeningValidators, MINIMUM_WORDS_VALIDATION_TEXT } from '@app/shared/utils/validators-utils';

export interface ExternalRefOption {
  referens?: string | null;
  comment?: string | null;
  title?: string;
}

@Component({
  selector: 'nuxeo-arendemening-options',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './arendemening-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArendemeningOptionsComponent implements OnInit {
  isContactDialogOpen = signal(false);
  minimumWordsValidationText = MINIMUM_WORDS_VALIDATION_TEXT;

  heading = input<string>('');
  fieldName = input<string>('');
  parentRef = input();
  values = signal<TableItem[]>([]);
  defaultValue = input<string[]>();
  saveReferences = output();
  arendemeningChange = input<(event: Record<string, string>[]) => void>();

  form = new FormGroup({
    arendemening: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, ...arendemeningValidators()],
    }),
  });

  readonly CUSTOM_TABLE_NAME = 'CUSTOM';

  // Base column config without tableName
  private readonly CUSTOM_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    { label: 'Arendemening', key: 'arendemening', visible: true },
  ];

  // Add tableName to each column
  readonly CUSTOM_COLS: TableColumn[] = this.CUSTOM_COLS_BASE.map(c => ({
    ...c,
    tableName: this.CUSTOM_TABLE_NAME,
  }));

  ngOnInit(): void {
    const defaultValue = this.defaultValue();
    if (defaultValue) {
      this.values.set(defaultValue.map(el => ({ id: el, arendemening: el })));
    }
  }

  addContact(): boolean {
    if (this.form.invalid) {
      this.form.controls.arendemening.markAsDirty();
      this.form.markAllAsTouched();
      this.form.updateValueAndValidity();
      return false;
    }

    const arendemening = this.form.controls.arendemening.value;
    this.values.update((items: TableItem[]) => [...items, { id: arendemening, arendemening: arendemening }]);
    this.arendemeningChange()?.(this.values());
    this.form.reset();
    return true;
  }

  saveContact() {
    if (this.addContact()) {
      this.isContactDialogOpen.set(false);
    }
  }

  removeContact(item: Option) {
    this.values.update((refs: TableItem[]) => refs.filter(el => el['id'] !== item.id));
    this.arendemeningChange()?.(this.values());
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
