import { computed, inject, Injectable } from '@angular/core';
import { GeneralStore } from '@app/core/services/general-store.service';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

const RAPPORTER_JK_TABLE_NAME = 'RAPPORTER_JK';
const RAPPORTER_POSTLISTA_TABLE_NAME = 'RAPPORTER_POSTLISTA';

@Injectable({ providedIn: 'root' })
export class RapporterTableConfigProvider {
  private readonly generalStore = inject(GeneralStore);

  readonly openCasesTableConfig = computed<TableColumn[]>(() =>
    [
      {
        id: 'arendemening',
        label: this.label('label.ui.schema.arende.arendemening'),
        key: 'arendemening',
        sortField: NUXEO_SCHEMA_FIELDS.arende.arendemening,
        asLink: true,
        visible: true,
        class: 'max-w-[320px] min-w-[220px] truncate',
      },
      {
        id: 'registreratDatum',
        label: this.label('label.ui.schema.arende.arendetRegistreratDatum'),
        key: 'registreratDatum',
        sortField: NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum,
        visible: true,
      },
      {
        id: 'arendenummer',
        label: this.label('label.ui.schema.arende.arendenummer'),
        key: 'arendenummer',
        sortField: NUXEO_SCHEMA_FIELDS.arende.arendenummer,
        visible: true,
      },
      {
        id: 'kommentar',
        label: this.label('label.ui.schema.arende.jkKommentar'),
        key: 'kommentar',
        sortField: NUXEO_SCHEMA_FIELDS.arende.jkKommentar,
        visible: true,
      },
      {
        id: 'rubrik',
        label: this.label('label.ui.schema.arende.motpart'),
        key: 'rubrik',
        sortField: NUXEO_SCHEMA_FIELDS.arende.arendepart,
        visible: true,
      },
    ].map(col => ({ ...col, tableName: RAPPORTER_JK_TABLE_NAME }))
  );

  readonly postlistaTableConfig = computed<TableColumn[]>(() =>
    [
      {
        id: 'kategori',
        label: this.label('label.ui.schema.handling.handlingstyp'),
        key: 'kategori',
        sortField: NUXEO_SCHEMA_FIELDS.handling.handlingstyp,
        visible: true,
        class: 'max-w-[220px] min-w-[160px] truncate',
      },
      {
        id: 'registreringsdatum',
        label: this.label('label.ui.schema.handling.inkommen_datum'),
        key: 'registreringsdatum',
        sortField: NUXEO_SCHEMA_FIELDS.handling.inkommenDatum,
        visible: true,
      },
      {
        id: 'handlingsnummer',
        label: this.label('label.ui.schema.handling.handlingsnummer'),
        key: 'handlingsnummer',
        sortField: NUXEO_SCHEMA_FIELDS.handling.handlingsnummer,
        asLink: true,
        visible: true,
      },
      {
        id: 'beskrivning',
        label: this.generalStore.getValue('label.description') ?? 'Beskrivning',
        key: 'beskrivning',
        sortField: NUXEO_SCHEMA_FIELDS.handling.handlingsnamn,
        visible: true,
        class: 'max-w-[300px] min-w-[220px] truncate',
      },
      {
        id: 'tillhor',
        label: this.label('label.ui.schema.handling.arendenummer'),
        key: 'tillhor',
        sortField: NUXEO_SCHEMA_FIELDS.handling.arendenummer,
        visible: true,
      },
    ].map(col => ({ ...col, tableName: RAPPORTER_POSTLISTA_TABLE_NAME }))
  );

  readonly openCasesDefaultColumnOptions = computed<TableColOption[]>(() =>
    this.openCasesTableConfig().map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible!,
    }))
  );

  readonly postlistaDefaultColumnOptions = computed<TableColOption[]>(() =>
    this.postlistaTableConfig().map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible!,
    }))
  );

  private label(key: string): string {
    return this.generalStore.getValue(key)!;
  }
}
