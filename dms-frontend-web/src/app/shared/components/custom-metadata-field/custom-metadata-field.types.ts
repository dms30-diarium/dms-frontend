export type CustomMetadataFieldType = unknown;

export interface DmsMetadataDefinitionEntry {
  nyckel?: string;
  flervardig?: boolean | string | null;
  aktiv?: boolean | string | null;
  typ?: unknown;
  ordning?: number | string | null;
}

export interface DmsMetadataValueEntry {
  nyckel?: string;
  strangvarde?: string | null;
  strangfleravarden?: string[] | null;
  datumvarde?: string | null;
  datumfleravarden?: string[] | null;
  booleanvarde?: boolean | null;
  booleanfleravarden?: boolean[] | null;
  typ?: string | null;
}

export interface NormalizedMetadataDefinition {
  key: string;
  label: string;
  type: CustomMetadataFieldType;
  isMulti: boolean | string | null | undefined;
  order: number | string | null | undefined;
}

export interface DisplayableMetadataField {
  key: string;
  label: string;
  displayValue: string;
  order: number | string | null | undefined;
}
