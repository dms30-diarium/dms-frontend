import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  WritableSignal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { ContactOption, Option } from '@app/shared/commonTypes';
import { TableItem } from '@app/shared/models/case-table';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { map, tap } from 'rxjs';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { ArendeExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-motpart-edit-table',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './motpart-edit-table.component.html',
})
export class MotpartEditTableComponent implements OnInit {
  apiService = inject(NuxeoApiService);
  saveContact = output();
  isContactDialogOpen = signal(false);
  tableFields = input.required<WritableSignal<ContactOption[]>>();
  doc = input.required<NuxeoDocument<ArendeExtendedProperties>>();
  contacts = this.tableFields;
  parentRef = input();
  fieldName = input.required<string>();
  motpartTypOptions = signal<Option[]>([]);
  type!: WritableSignal<string | undefined>;

  ngOnInit(): void {
    this.getMotpartTypOptions();
    this.type = signal(this.doc().properties?.[NUXEO_SCHEMA_FIELDS.arende.motpart]?.typ?.id);
  }

  getMotpartTypOptions() {
    this.apiService
      .getDirectorySuggestions('MotpartTyp')
      .pipe(
        map(result => result.map(el => ({ label: el.displayLabel, id: el.id }))),
        tap(options => this.motpartTypOptions.set(options))
      )
      .subscribe();
  }

  updateEditedData(newContacts: TableItem[]) {
    this.type.set(newContacts[0]?.['typ']);
    this.contacts().set(newContacts);
  }
  tableName = signal<string>('motpart_table');

  customColumnConfig = computed<TableColumn[]>(() => {
    const privatePerson = this.type() === 'privatePerson';
    const tableName = this.tableName();

    return [
      {
        label: 'Typ av motpart på ärende',
        key: 'typ',
        class: 'w-[15%]',
        inputConfig: { type: 'dropdown', options: this.motpartTypOptions() },
        tableName,
        visible: true,
      },
      {
        label: 'Motpartens namn',
        key: 'motpart',
        class: 'w-[15%]',
        tableName,
        visible: true,
        inputConfig: { type: 'input' },
      },
      {
        label: privatePerson ? 'Motpartens personummer' : 'Motpartens organisationsnummer',
        key: 'organisationsnummer',
        class: 'w-[15%]',
        tableName,
        visible: true,
        inputConfig: { type: 'input' },
      },
      {
        label: 'E-post',
        key: 'epost',
        class: 'w-[15%] max-w-[100px] text-wrap',
        tableName,
        visible: true,
        inputConfig: { type: 'input' },
      },
      {
        label: 'Telefonnummer',
        key: 'telefon',
        class: 'w-[15%] max-w-[100px] text-wrap',
        tableName,
        visible: true,
        inputConfig: { type: 'input' },
      },
      {
        label: 'Adress',
        class: 'w-[15%] max-w-[100px] text-wrap',
        key: 'adress',
        tableName,
        visible: true,
        inputConfig: { type: 'input' },
      },
      {
        label: 'Postnummer',
        key: 'postnummer',
        class: 'w-[20%] max-w-[100px] text-wrap',
        tableName,
        visible: true,
        inputConfig: { type: 'input' },
      },
      {
        label: 'Postort',
        key: 'city',
        class: 'w-[20%] max-w-[100px] text-wrap',
        tableName,
        visible: true,
        inputConfig: { type: 'input' },
      },
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
