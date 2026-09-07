import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent } from '../case-list-table/case-list-table.component';
import { ArendeExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { TableColOption } from '../table-col-options/table-col-options.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export interface Contact {
  namn?: string;
  email?: string | null;
  telefon?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-motpart-table',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './motpart-table.component.html',
})
export class MotpartTableComponent {
  doc = input.required<NuxeoDocument<ArendeExtendedProperties>>();
  type = computed(() => this.doc().properties?.[NUXEO_SCHEMA_FIELDS.arende.motpart]?.typ?.id);

  motpartItems = computed(() => {
    const motpartItems = this.doc().properties?.[NUXEO_SCHEMA_FIELDS.arende.motpart];
    return [
      {
        type: motpartItems?.typ?.properties?.label,
        name: motpartItems?.motpart,
        org: motpartItems?.organisationsnummer,
        epost: motpartItems?.epost,
        adress: motpartItems?.adress,
        telefon: motpartItems?.telefon,
        postnummer: motpartItems?.postnummer,
      },
    ];
  });

  customColumnConfig = computed(() => {
    const tableName = 'contactTable';

    return [
      { label: 'Typ av motpart på ärende', key: 'type', class: 'w-[20%]', tableName, visible: true },
      {
        label: 'Motpartens namn',
        key: 'name',
        class: 'w-[20%] text-wrap max-w-[150px]',
        tableName,
        visible: true,
      },
      {
        label: this.type() === 'privatePerson' ? 'Motpartens personummer' : 'Motpartens organisationsnummer',
        key: 'org',
        class: 'w-[20%]',
        tableName,
        visible: true,
      },
      { label: 'E-post', key: 'epost', class: 'w-[20%]', tableName, visible: true },
      { label: 'Telefonnummer', key: 'telefon', class: 'w-[20%]', tableName, visible: true },
      { label: 'Adress', key: 'adress', class: 'w-[20%] text-wrap max-w-[100px]', tableName, visible: true },
      { label: 'Postnummer', key: 'postnummer', class: 'w-[20%] text-wrap max-w-[100px]', tableName, visible: true },
      { label: 'Postort', key: 'city', class: 'w-[20%] text-wrap max-w-[100px]', tableName, visible: true },
    ];
  });

  getDefaultColumnOptions(): TableColOption[] {
    return [
      ...this.customColumnConfig().map(col => ({
        id: col.key.toString(),
        label: col.label,
        visible: true,
      })),
    ];
  }
}
