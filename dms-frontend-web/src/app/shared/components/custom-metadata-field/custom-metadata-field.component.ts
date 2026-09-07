import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { CustomMetadataDocumentProperties, CustomMetadataService } from '@app/shared/services/custom-metadata.service';
import {
  DisplayableMetadataField,
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
  NormalizedMetadataDefinition,
} from './custom-metadata-field.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-custom-metadata-field',
  standalone: true,
  imports: [],
  templateUrl: './custom-metadata-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomMetadataFieldComponent {
  documentData = input<NuxeoDocument<CustomMetadataDocumentProperties> | null>();
  definitionDocumentId = input<string>();
  metadataValueEntries = input<DmsMetadataValueEntry[] | null>();
  hasVisibleFields = output<boolean>();
  private readonly customMetadataService = inject(CustomMetadataService);

  private definitionEntries = signal<DmsMetadataDefinitionEntry[]>([]);

  constructor() {
    effect(() => {
      const doc = this.documentData() ?? null;
      const localDefinitions = this.customMetadataService.getDefinitionsFromDocument(doc);
      this.definitionEntries.set(localDefinitions);

      let definitionId = this.definitionDocumentId();
      if (!definitionId && doc) {
        definitionId = doc.properties[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.uid;
      }
      if (!definitionId) return;

      this.customMetadataService.getDefinitions(definitionId).subscribe({
        next: remoteDefinitions => {
          this.definitionEntries.set(remoteDefinitions.length ? remoteDefinitions : localDefinitions);
        },
        error: () => {
          this.definitionEntries.set(localDefinitions);
        },
      });
    });
  }

  metadataDefinitions = computed<NormalizedMetadataDefinition[]>(() => {
    return this.customMetadataService.normalizeDefinitions(this.definitionEntries());
  });

  metadataValues = computed<DmsMetadataValueEntry[]>(() => {
    return this.customMetadataService.getMetadataValues(this.documentData() ?? null, this.metadataValueEntries());
  });

  displayedFields = computed<DisplayableMetadataField[]>(() => {
    const activeDefinitions = this.metadataDefinitions();
    const values = this.metadataValues();
    const valueMap = new Map<string, DmsMetadataValueEntry>();
    values.forEach(entry => {
      if (entry?.nyckel) {
        valueMap.set(entry.nyckel, entry);
      }
    });

    const definitionBasedFields = activeDefinitions.map(definition => {
      const rawValue = valueMap.get(definition.key);
      const resolvedType = this.customMetadataService.resolveDefinitionType(definition.type);
      return {
        key: definition.key,
        label: definition.label,
        displayValue: this.customMetadataService.stringifyValue(resolvedType, definition.isMulti, rawValue),
        order: definition.order,
      };
    });

    const fields = definitionBasedFields;
    const hasAnyVisible = fields.some(field => field.displayValue);
    this.hasVisibleFields.emit(hasAnyVisible);
    return fields;
  });
}
