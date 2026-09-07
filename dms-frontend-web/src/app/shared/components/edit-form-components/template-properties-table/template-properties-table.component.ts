import { ChangeDetectionStrategy, Component, computed, input, signal, WritableSignal } from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { TemplateField } from '@app/shared/api/nuxeo-api.types';

type TemplateFieldRow = TemplateField & { __index: number };

@Component({
  selector: 'nuxeo-template-properties-table',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, CaseListTableComponent],
  templateUrl: './template-properties-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplatePropertiesTableComponent {
  tableFields = input.required<WritableSignal<TemplateField[]>>();

  isDialogOpen = signal(false);
  editingIndex = signal<number | null>(null);
  draftNyckel = signal('');
  draftVarde = signal('');

  readonly rows = computed<TemplateFieldRow[]>(() =>
    (this.tableFields()() ?? []).map((entry, index) => ({ ...entry, __index: index }))
  );

  readonly columnConfig: TableColumn[] = [
    { label: 'Nyckel', key: 'nyckel', class: 'w-[40%]', visible: true, tableName: 'templateProperties' },
    { label: 'Värde', key: 'varde', class: 'w-[40%]', visible: true, tableName: 'templateProperties' },
  ];

  openDialog(entry?: TemplateFieldRow) {
    this.editingIndex.set(entry?.__index ?? null);
    this.draftNyckel.set(entry?.nyckel ?? '');
    this.draftVarde.set(entry?.varde ?? '');
    this.isDialogOpen.set(true);
  }

  setDraftNyckel(value: string | number) {
    this.draftNyckel.set(String(value));
  }

  setDraftVarde(value: string | number) {
    this.draftVarde.set(String(value));
  }

  saveField() {
    const nyckel = this.draftNyckel().trim();
    const varde = this.draftVarde().trim();
    if (!nyckel) return;

    const nextEntry: TemplateField = { nyckel, varde };
    const editIndex = this.editingIndex();

    this.tableFields().update(current => {
      const list = [...(current ?? [])];
      if (editIndex !== null && editIndex >= 0 && editIndex < list.length) {
        list[editIndex] = nextEntry;
        return list;
      }
      return [...list, nextEntry];
    });

    this.closeDialog();
  }

  removeField(row: TemplateFieldRow) {
    this.tableFields().update(current => (current ?? []).filter((_, index) => index !== row.__index));
  }

  closeDialog() {
    this.isDialogOpen.set(false);
    this.editingIndex.set(null);
    this.draftNyckel.set('');
    this.draftVarde.set('');
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.columnConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: true,
    }));
  }
}
