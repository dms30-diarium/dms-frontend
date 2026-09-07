import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { GeneralStore } from '@app/core/services/general-store.service';
import { ContactEntry, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-handling-actors',
  standalone: true,
  imports: [CaseListTableComponent],
  templateUrl: './handling-actors.component.html',
})
export class HandlingActorsComponent {
  doc = input.required<NuxeoDocument<HandlingExtendedProperties>>();
  private store = inject(GeneralStore);

  columns: TableColumn[] = [
    { id: 'typ', label: 'Typ', key: 'typ', visible: true, tableName: 'HANDLING_PARTIES' },
    {
      id: 'namn',
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
      key: 'namn',
      visible: true,
      tableName: 'HANDLING_PARTIES',
    },
    {
      id: 'organization',
      label: 'Organisation/Företag',
      key: 'organization',
      visible: true,
      tableName: 'HANDLING_PARTIES',
    },
    { id: 'email', label: 'E‑post', key: 'email', visible: true, tableName: 'HANDLING_PARTIES' },
    { id: 'telefon', label: 'Telefon', key: 'telefon', visible: true, tableName: 'HANDLING_PARTIES' },
    { id: 'adress', label: 'Adress', key: 'adress', visible: true, tableName: 'HANDLING_PARTIES' },
  ];

  defaultColumnOptions = computed(() =>
    this.columns.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }))
  );

  rows = computed(() => {
    const props = this.doc().properties ?? {};
    const senders = props[NUXEO_SCHEMA_FIELDS.handling.avsandare];
    const recipients = props[NUXEO_SCHEMA_FIELDS.handling.mottagare];

    const result: {
      typ: string;
      namn: string;
      organization: string;
      email: string;
      telefon: string;
      adress: string;
    }[] = [];

    const mapContact = (label: string, contact: ContactEntry) => {
      const rec = contact as Record<string, unknown>;
      const organization =
        (typeof rec['org'] === 'string' && rec['org']) ||
        (typeof rec['organisation'] === 'string' && rec['organisation']) ||
        (typeof rec['foretag'] === 'string' && rec['foretag']) ||
        '';
      const adress =
        (typeof rec['adress'] === 'string' && rec['adress']) ||
        (typeof rec['adress'] === 'string' && rec['adress']) ||
        '';

      return {
        typ: label,
        namn: contact.namn ?? '',
        organization,
        email: contact.epost ?? '',
        telefon: contact.telefon ?? '',
        adress,
      };
    };

    (senders ?? []).forEach(contact => result.push(mapContact('Avsändare', contact)));
    (recipients ?? []).forEach(contact => result.push(mapContact('Mottagare', contact)));

    return result;
  });
}
