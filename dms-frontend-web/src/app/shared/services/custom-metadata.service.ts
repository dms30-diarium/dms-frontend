import { inject, Injectable } from '@angular/core';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import {
  ArendeExtendedProperties,
  HandlingstypProperties,
  NuxeoDocument,
  NuxeoProperties,
} from '@app/shared/api/nuxeo-api.types';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
  NormalizedMetadataDefinition,
} from '@app/shared/components/custom-metadata-field/custom-metadata-field.types';
import { map, Observable, switchMap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export type CustomMetadataDocumentProperties = (NuxeoProperties | ArendeExtendedProperties) & {
  'dmsmetadatadefinition:faltdefinition'?: DmsMetadataDefinitionEntry[] | null;
  'dmsmetadatadefinition:definition'?: DmsMetadataDefinitionEntry[] | null;
  'dmsmetadataanpassad:falt'?: DmsMetadataValueEntry[] | null;
  'dmsmetadataanpassad:metadata'?: DmsMetadataValueEntry[] | null;
};

export type CustomMetadataValueType = 'string' | 'date' | 'boolean';

@Injectable({ providedIn: 'root' })
export class CustomMetadataService {
  private readonly api = inject(NuxeoApiService);
  private readonly documentValueService = inject(DocumentValueService);

  getDefinitions(definitionDocumentId: string): Observable<DmsMetadataDefinitionEntry[]> {
    return this.api
      .getDocumentById<CustomMetadataDocumentProperties | HandlingstypProperties>(definitionDocumentId, true)
      .pipe(map(document => this.getDefinitionsFromDocument(document)));
  }

  getDefinitionsFromDocument(
    document: NuxeoDocument<CustomMetadataDocumentProperties | HandlingstypProperties> | null | undefined
  ): DmsMetadataDefinitionEntry[] {
    return (
      document?.properties[NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition] ??
      document?.properties[NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.definition] ??
      []
    );
  }

  getMetadataValues(
    document: NuxeoDocument<CustomMetadataDocumentProperties> | null,
    metadataValueEntries: DmsMetadataValueEntry[] | null | undefined
  ): DmsMetadataValueEntry[] {
    if (metadataValueEntries) return metadataValueEntries;
    if (!document) return [];
    return (
      document.properties[NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt] ??
      document.properties[NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.metadata] ??
      []
    );
  }

  normalizeDefinitions(definitions: DmsMetadataDefinitionEntry[], activeOnly = true): NormalizedMetadataDefinition[] {
    return definitions
      .filter(definition => Boolean(definition.nyckel) && (!activeOnly || definition.aktiv === true))
      .map(definition => ({
        key: definition.nyckel ?? '',
        label: definition.nyckel ?? '',
        type: definition.typ,
        isMulti: definition.flervardig,
        order: definition.ordning,
      }))
      .sort((left, right) => this.compareDefinitions(left, right));
  }

  resolveDefinitionType(type: DmsMetadataDefinitionEntry['typ']): CustomMetadataValueType {
    const value = this.readTypeValue(type);
    if (value === 'Boolean' || value === 'boolean') return 'boolean';
    if (value === 'Date' || value === 'date') return 'date';
    return 'string';
  }

  typeToBackend(type: CustomMetadataValueType): string {
    if (type === 'boolean') return 'Boolean';
    if (type === 'date') return 'Date';
    return 'String';
  }

  stringifyValue(
    type: CustomMetadataValueType,
    isMulti: boolean | string | null | undefined,
    value: DmsMetadataValueEntry | undefined
  ): string {
    if (!value) return '';

    if (type === 'string') {
      const multiValues = value.strangfleravarden ?? [];
      if (isMulti) return this.cleanTextValues(multiValues.length ? multiValues : [value.strangvarde]);
      return value.strangvarde ?? multiValues[0] ?? '';
    }

    if (type === 'date') {
      const multiValues = value.datumfleravarden ?? [];
      if (isMulti) {
        const values = multiValues.length ? multiValues : [value.datumvarde];
        return this.cleanTextValues(values.map(dateValue => this.documentValueService.getDate(dateValue)));
      }
      const dateValue = value.datumvarde ?? multiValues[0];
      return dateValue ? this.documentValueService.getDate(dateValue) : '';
    }

    const formatBoolean = (booleanValue: boolean | null | undefined) =>
      booleanValue === true ? 'Ja' : booleanValue === false ? 'Nej' : '';
    if (isMulti) {
      const multiValues = value.booleanfleravarden ?? [];
      const values = multiValues.length ? multiValues : [value.booleanvarde];
      return this.cleanTextValues(values.map(booleanValue => formatBoolean(booleanValue)));
    }
    return formatBoolean(value.booleanvarde ?? value.booleanfleravarden?.[0]);
  }

  saveDefinitionsThenDocument(
    documentId: string,
    properties: Record<string, unknown>,
    definitionDocumentId: string | null | undefined,
    definitions: DmsMetadataDefinitionEntry[] | undefined
  ): Observable<NuxeoDocument> {
    if (definitionDocumentId && definitions) {
      return this.api
        .editDocument(definitionDocumentId, { [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: definitions })
        .pipe(switchMap(() => this.api.editDocument(documentId, properties)));
    }
    return this.api.editDocument(documentId, properties);
  }

  private compareDefinitions(left: NormalizedMetadataDefinition, right: NormalizedMetadataDefinition): number {
    const leftOrder = Number(left.order);
    const rightOrder = Number(right.order);
    if (Number.isFinite(leftOrder) && Number.isFinite(rightOrder) && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    if (Number.isFinite(leftOrder)) return -1;
    if (Number.isFinite(rightOrder)) return 1;
    return left.label.localeCompare(right.label);
  }

  private cleanTextValues(values: (string | null | undefined)[]): string {
    return Array.from(new Set(values.map(value => value?.toString().trim()).filter(Boolean))).join(', ');
  }

  private readTypeValue(type: DmsMetadataDefinitionEntry['typ']): string {
    if (typeof type === 'string') return type;
    if (type && typeof type === 'object' && 'id' in type) return String(type.id);
    return '';
  }
}
