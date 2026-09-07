import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent } from '../case-list-table/case-list-table.component';
import { ArendeExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { InternalContact } from '@app/pages/case-page/case-types';
import { TableColOption } from '../table-col-options/table-col-options.component';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export interface Contact {
  namn?: string;
  name?: string | null;
  email?: string | null;
  telefon?: string;
  phone?: string | null;
  org?: string | null;
  adress?: string | null;
  postnummer?: string | null;
  city?: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-contact-table',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './contact-table.component.html',
})
export class ContactTableComponent {
  readonly store = inject(GeneralStore);
  saveContact = output();
  isContactDialogOpen = signal(false);
  doc = input.required<NuxeoDocument<ArendeExtendedProperties>>();
  parentRef = input.required<string>();
  type = input.required<'internal' | 'external'>();
  internalContactsData = input<InternalContact[]>([]);

  contacts = computed(() => {
    const props = this.doc()?.properties;
    if (this.type() === 'internal') {
      return this.internalContactsData().map(el => ({
        ...el,
        name: typeof el.name === 'object' && el.name.length ? el.name.join(', ') : el.name,
      }));
    } else {
      const extContacts = props?.[NUXEO_SCHEMA_FIELDS.arende.kontakter];
      return (extContacts ?? []).map((el: Contact) => ({
        type: '',
        name: el.namn,
        email: el.email,
        phone: el.telefon,
        adress: el.adress,
      }));
    }
  });

  customColumnConfig = computed(() => {
    const tableName = 'contactTable';

    if (this.type() === 'internal') {
      return [
        {
          label: this.store.getValue('label.ui.schema.arende.motpart.typ') ?? '',
          key: 'type',
          class: 'w-[20%]',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.cv.namn') ?? '',
          key: this.type() === 'internal' ? 'displayLabel' : 'name',
          class: 'w-[20%] text-wrap max-w-[150px]',
          tableName,
          visible: true,
        },
        {
          label: this.type() === 'internal' ? 'Avdelning enhet' : 'Organisation/Foretag', // don't have this field in messages.json
          key: 'org',
          class: 'w-[20%]',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.arende.motpart.epost') ?? '',
          key: 'email',
          class: 'w-[20%] text-wrap max-w-[100px]',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.arende.motpart.telefon') ?? '',
          key: 'telefon',
          class: 'w-[20%]',
          tableName,
          visible: true,
        },
      ];
    } else {
      return [
        {
          label: this.store.getValue('label.ui.schema.arende.motpart.typ') ?? '',
          key: 'type',
          class: 'w-[10%]',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.cv.namn') ?? '',
          key: this.type() === 'internal' ? 'displayLabel' : 'name',
          class: 'w-[10%] text-wrap max-w-[150px]',
          tableName,
          visible: true,
        },
        {
          label: this.type() === 'internal' ? 'Avdelning enhet' : 'Organisation/Foretag', // don't have this field in messages.json
          key: 'org',
          class: 'w-[15%]',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.arende.motpart.epost') ?? 'E-post',
          key: 'email',
          class: 'w-[20%] text-wrap max-w-[100px]',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.arende.kontakter.telefon') ?? 'Telefon',
          key: 'telefon',
          class: 'w-[15%]',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.arende.motpart.adress') ?? '',
          key: 'adress',
          class: 'w-[15%] ',
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.arende.motpart.postnummer') ?? '',
          key: 'postnummer',
          class: 'w-[15%]  ',
          tableName,
          visible: true,
        },
        {
          label: 'Postort', //don't have this field in messages.json
          key: 'city',
          class: 'w-[15%] ',
          tableName,
          visible: true,
        },
      ];
    }
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
