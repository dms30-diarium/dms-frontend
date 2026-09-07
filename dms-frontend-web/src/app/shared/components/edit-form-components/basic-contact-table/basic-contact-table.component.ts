import { ChangeDetectionStrategy, Component, inject, input, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { ContactOption } from '@app/shared/commonTypes';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';
import { GeneralStore } from '@app/core/services/general-store.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-basic-contact-table',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './basic-contact-table.component.html',
})
export class BasicContactTableComponent {
  isContactDialogOpen = signal(false);
  tableFields = input.required<WritableSignal<ContactOption[]>>();
  heading = input<string>('');
  contacts = this.tableFields;
  private store = inject(GeneralStore);
  fieldName = input.required<string>();
  parentRef = input<string>();

  form = new FormGroup({
    namn: new FormControl(''),
    org: new FormControl(''),
    email: new FormControl(''),
    telefon: new FormControl(''),
    adress: new FormControl(''),
  });

  customColumnConfig: TableColumn[] = [
    {
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
      key: 'namn',
      class: 'w-[20%]',
      visible: true,
      tableName: 'basicContact',
      inputConfig: { type: 'input' },
    },
    {
      label: 'Organisation/Företag',
      key: 'org',
      class: 'w-[20%]',
      visible: true,
      tableName: 'basicContact',
      inputConfig: { type: 'input' },
    },
    {
      label: 'Email',
      key: 'email',
      class: 'w-[20%]',
      visible: true,
      tableName: 'basicContact',
      inputConfig: { type: 'input' },
    },
    {
      label: 'Telefon',
      key: 'telefon',
      class: 'w-[20%]',
      visible: true,
      tableName: 'basicContact',
      inputConfig: { type: 'input' },
    },
    {
      label: 'Adress',
      key: 'adress',
      class: 'w-[20%]',
      visible: true,
      tableName: 'basicContact',
      inputConfig: { type: 'input' },
    },
  ];

  updateEditedData(newContacts: TableItem[]) {
    this.contacts().set(newContacts);
  }

  addContact() {
    const { namn, org, email, telefon, adress } = this.form.value;
    const newContact = { namn, org, email, telefon, adress, id: crypto.randomUUID() };

    this.contacts().update((existingContacts: ContactOption[]) => [...existingContacts, newContact]);
  }

  removeContact(item: ContactOption) {
    this.contacts().update((existingContacts: ContactOption[]) =>
      existingContacts.filter(contact => contact['id'] !== item['id'])
    );
  }
  getDefaultColumnOptions(): TableColOption[] {
    return [
      ...this.customColumnConfig.map(col => ({
        id: col.key.toString(),
        label: col.label,
        visible: true,
      })),
    ];
  }
}
