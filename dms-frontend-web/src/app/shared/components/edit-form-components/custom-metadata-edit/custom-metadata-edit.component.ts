import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  WritableSignal,
} from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { ArendeExtendedProperties, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { CustomMetadataService, CustomMetadataValueType } from '@app/shared/services/custom-metadata.service';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
} from '../../custom-metadata-field/custom-metadata-field.types';
import { TableColumn } from '../../case-list-table/case-list-table.component';
import { CaseListTableComponent } from '../../case-list-table/case-list-table.component';
import { TableItem } from '@app/shared/models/case-table';
import { formatDateForInput } from '@app/shared/utils/date-utils';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { GeneralStore } from '@app/core/services/general-store.service';

interface ValueRow {
  id: string;
  nyckel: string;
  label: string;
  type: CustomMetadataValueType;
  displayValue: string;
  order: number | string | null | undefined;
  valueIndex: number | null;
}

@Component({
  selector: 'nuxeo-custom-metadata-edit',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, CaseListTableComponent],
  templateUrl: './custom-metadata-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomMetadataEditComponent {
  doc = input.required<NuxeoDocument<ArendeExtendedProperties | HandlingExtendedProperties>>();
  valuesSignal = input.required<WritableSignal<DmsMetadataValueEntry[]>>();
  definitionsSignal = input.required<WritableSignal<DmsMetadataDefinitionEntry[]>>();
  definitionDocIdSignal = input.required<WritableSignal<string | null | undefined>>();
  parentRef = input<string | null | undefined>();
  fieldName = input<string | null | undefined>();
  private store = inject(GeneralStore);
  canSeeValues = input();

  private readonly customMetadataService = inject(CustomMetadataService);
  private readonly editedValueRows = signal<TableItem[]>([]);

  inlineValueColumns: TableColumn[] = [
    {
      key: 'label',
      label: 'Fältnamn',
      visible: true,
      tableName: 'customInlineValues',
    },
    {
      key: 'displayValue',
      label: 'Värde',
      visible: true,
      tableName: 'customInlineValues',
      inputConfig: {
        type: (row: TableItem) =>
          this.isValueRow(row) && row.type === 'boolean'
            ? 'checkbox'
            : this.isValueRow(row) && row.type === 'date'
              ? 'datepicker'
              : 'input',
      },
    },
    {
      key: 'order',
      label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',
      visible: true,
      tableName: 'customInlineValues',
      inputConfig: {
        type: 'number',
      },
    },
  ];

  inlineValueColumnOptions = this.inlineValueColumns.map(column => ({
    id: column.key.toString(),
    label: column.label,
    visible: true,
  }));

  normalizedDefinitions = computed(() =>
    this.customMetadataService.normalizeDefinitions(this.definitionsSignal()(), false)
  );

  valueRows = computed<ValueRow[]>(() => {
    const valuesByKey = new Map(this.valuesSignal()().map(entry => [entry.nyckel ?? '', entry]));

    const rows: ValueRow[] = [];

    this.normalizedDefinitions().forEach(definition => {
      const entry = valuesByKey.get(definition.key);
      const type = this.customMetadataService.resolveDefinitionType(definition.type);
      const displayValues = this.getDisplayValues(entry, type, definition.isMulti === true);

      displayValues.forEach((displayValue, index) => {
        rows.push({
          id: displayValues.length > 1 ? `${definition.key}-${index}` : definition.key,
          nyckel: definition.key,
          label: definition.label,
          type,
          displayValue,
          order: definition.order,
          valueIndex: displayValues.length > 1 ? index : null,
        });
      });
    });

    return rows;
  });

  constructor() {
    effect(() => {
      const doc = this.doc();
      if (!this.isArendeDocument(doc)) {
        return;
      }

      const definitionId = doc.properties[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.uid;

      this.definitionDocIdSignal().set(definitionId);

      if (!definitionId) {
        this.definitionsSignal().set([]);
      } else {
        this.fetchDefinitions(definitionId, []);
      }

      // IMPORTANT: do not unconditionally clear `valuesSignal` here — that will wipe values
      // passed in from the parent (edit form).
    });
  }

  onInlineValuesChange(updatedRows: TableItem[]) {
    this.editedValueRows.set(updatedRows);
    this.applyInlineEdits();
  }

  applyInlineEdits() {
    const editedRows = this.editedValueRows();
    if (!editedRows.length) return;

    const currentEntries = [...this.valuesSignal()()];
    const currentDefinitions = [...this.definitionsSignal()()];

    const rowsGroupedByKey = editedRows.reduce<Record<string, ValueRow[]>>((grouped, row) => {
      if (!this.isValueRow(row)) return grouped;
      grouped[row.nyckel] = grouped[row.nyckel] ?? [];
      grouped[row.nyckel].push(row);
      return grouped;
    }, {});

    Object.entries(rowsGroupedByKey).forEach(([fieldKey, fieldRows]) => {
      const row = fieldRows[0];

      const existingIndex = currentEntries.findIndex(entry => entry.nyckel === fieldKey);
      const entry =
        existingIndex >= 0
          ? { ...currentEntries[existingIndex] }
          : { nyckel: fieldKey, typ: this.customMetadataService.typeToBackend(row.type) };

      if (row.type === 'string') {
        const values = fieldRows.map(fieldRow => fieldRow.displayValue);
        entry.strangvarde = values[0] ?? null;
        entry.strangfleravarden = values;
      } else if (row.type === 'date') {
        const values = fieldRows.map(fieldRow => fieldRow.displayValue);
        entry.datumvarde = values[0] ?? null;
        entry.datumfleravarden = values;
      } else {
        const values = fieldRows.map(fieldRow => fieldRow.displayValue === 'Ja');
        entry.booleanvarde = values[0] ?? false;
        entry.booleanfleravarden = values;
      }

      if (existingIndex >= 0) {
        currentEntries[existingIndex] = entry;
      } else {
        currentEntries.push(entry);
      }

      const parsedOrder = Number(row.order);
      const definitionIndex = currentDefinitions.findIndex(definition => definition.nyckel === fieldKey);
      if (definitionIndex >= 0) {
        currentDefinitions[definitionIndex] = {
          ...currentDefinitions[definitionIndex],
          ordning: Number.isFinite(parsedOrder) ? parsedOrder : currentDefinitions[definitionIndex].ordning,
        };
      }
    });

    this.valuesSignal().set(currentEntries);
    this.definitionsSignal().set(currentDefinitions);
  }

  private isArendeDocument(
    doc: NuxeoDocument<ArendeExtendedProperties | HandlingExtendedProperties>
  ): doc is NuxeoDocument<ArendeExtendedProperties> {
    return doc.type === 'Arende';
  }

  private fetchDefinitions(definitionId: string, fallback: DmsMetadataDefinitionEntry[]) {
    this.customMetadataService.getDefinitions(definitionId).subscribe({
      next: definitions => {
        this.definitionsSignal().set(definitions.length ? definitions : fallback);
      },
      error: () => {
        this.definitionsSignal().set(fallback);
      },
    });
  }

  private getDisplayValues(
    entry: DmsMetadataValueEntry | undefined,
    type: CustomMetadataValueType,
    isMulti: boolean
  ): string[] {
    if (!entry) return [''];
    if (type === 'string') {
      if (isMulti) return entry.strangfleravarden?.length ? entry.strangfleravarden : [entry.strangvarde ?? ''];
      return [entry.strangvarde ?? entry.strangfleravarden?.[0] ?? ''];
    }
    if (type === 'date') {
      const values = isMulti && entry.datumfleravarden?.length ? entry.datumfleravarden : [entry.datumvarde ?? ''];
      return values.map(value => formatDateForInput(value));
    }
    const values = isMulti && entry.booleanfleravarden?.length ? entry.booleanfleravarden : [entry.booleanvarde];
    return values.map(value => (value === true ? 'Ja' : value === false ? 'Nej' : ''));
  }

  private isValueRow(row: TableItem): row is ValueRow {
    return typeof row['type'] === 'string' && typeof row['label'] === 'string' && typeof row['nyckel'] === 'string';
  }
}
