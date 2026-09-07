import { ChangeDetectionStrategy, Component, input, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent } from '../../case-list-table/case-list-table.component';
import { TableColOption } from '../../table-col-options/table-col-options.component';

export interface MetadataDefinitionRow {
  id: string;
  nyckel: string;
  flervardig: boolean | string | null | undefined;
  aktiv: boolean | string | null | undefined;
  typ: unknown;
  ordning: number | string | null | undefined;
}

@Component({
  selector: 'nuxeo-basic-metadata-table',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './basic-metadata-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicMetaDataTableComponent {
  isDialogOpen = signal(false);
  tableFields = input.required<WritableSignal<MetadataDefinitionRow[]>>();
  showAddButton = input(true);
  showActions = input(true);
  editingId = signal<string | null>(null);

  form = new FormGroup({
    nyckel: new FormControl<string>('', [Validators.required]),
    flervardig: new FormControl<boolean | string | null>(false),
    aktiv: new FormControl<boolean | string | null>(false),
    typ: new FormControl<unknown>('', [Validators.required]),
    ordning: new FormControl<number | string | null>(1),
  });

  typeOptions = [
    { id: 'Boolean', label: 'Boolean' },
    { id: 'Date', label: 'Datum' },
    { id: 'String', label: 'String' },
  ];

  columnConfig = [
    { label: 'Nyckel', key: 'nyckel', class: 'w-[30%]', visible: true, tableName: 'basicMetadata' },
    { label: 'Flervärdig', key: 'flervardig', class: 'w-[15%]', visible: true, tableName: 'basicMetadata' },
    { label: 'Aktiv', key: 'aktiv', class: 'w-[15%]', visible: true, tableName: 'basicMetadata' },
    {
      label: 'Typ',
      key: 'typ',
      class: 'w-[20%]',
      visible: true,
      tableName: 'basicMetadata',
      formatter: (value: unknown) => this.formatType(value),
    },
    { label: 'Ordning', key: 'ordning', class: 'w-[10%]', visible: true, tableName: 'basicMetadata' },
  ];

  openDialog(entry?: MetadataDefinitionRow) {
    const nextOrder = (this.tableFields()().length ?? 0) + 1;
    this.editingId.set(entry?.id ?? null);
    this.form.reset({
      nyckel: entry?.nyckel ?? '',
      flervardig: entry?.flervardig ?? false,
      aktiv: entry?.aktiv ?? false,
      typ: entry?.typ ?? '',
      ordning: entry?.ordning ?? nextOrder,
    });
    this.isDialogOpen.set(true);
  }

  addMetadataField() {
    if (this.form.invalid) return;
    const { nyckel, flervardig, aktiv, typ, ordning } = this.form.value;
    if (!nyckel?.toString().trim() || !typ) return;

    const nextEntry: MetadataDefinitionRow = {
      id: this.editingId() ?? crypto.randomUUID(),
      nyckel: nyckel.toString().trim(),
      flervardig: Boolean(flervardig),
      aktiv: Boolean(aktiv),
      typ: typ.toString(),
      ordning: Number.isFinite(Number(ordning)) ? Number(ordning) : (this.tableFields()().length ?? 0) + 1,
    };

    this.tableFields().update(current => {
      const existing = current ?? [];
      if (this.editingId()) {
        return existing.map(item => (item.id === this.editingId() ? nextEntry : item));
      }
      return [...existing, nextEntry];
    });

    this.isDialogOpen.set(false);
    this.editingId.set(null);
  }

  removeField(item: MetadataDefinitionRow) {
    this.tableFields().update(current => (current ?? []).filter(entry => entry.id !== item.id));
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.columnConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: true,
    }));
  }

  private formatType(value: unknown): string {
    const direct = value !== null && value !== undefined && Object(value) !== value ? `${value}` : '';
    if (direct) {
      switch (direct) {
        case 'Date':
          return 'Datum';
        case 'String':
          return 'Sträng';
        case 'Boolean':
          return 'Boolean';
        default:
          return direct;
      }
    }

    const item: Record<string, unknown> = Object(value);
    const props: Record<string, unknown> = Object(item['properties']);
    const label = props['label'];
    const labelText = label !== null && label !== undefined && Object(label) !== label ? `${label}` : '';
    if (labelText) {
      switch (labelText) {
        case 'Date':
          return 'Datum';
        case 'String':
          return 'Sträng';
        case 'Boolean':
          return 'Boolean';
        default:
          return labelText;
      }
    }

    const id = item['id'];
    const idText = id !== null && id !== undefined && Object(id) !== id ? `${id}` : '';
    switch (idText) {
      case 'Date':
        return 'Datum';
      case 'String':
        return 'Text';
      case 'Boolean':
        return 'True/False';
      default:
        return idText;
    }
  }
}
