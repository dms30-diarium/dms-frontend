import { ChangeDetectionStrategy, Component, inject, input, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { ContactOption } from '@app/shared/commonTypes';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { GeneralStore } from '@app/core/services/general-store.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-simple-contact-table',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './simple-contact-table.component.html',
})
export class SimpleContactTableComponent {
  isContactDialogOpen = signal(false);
  private store = inject(GeneralStore);
  tableFields = input.required<WritableSignal<ContactOption[]>>();
  fieldName = input.required<string>();

  contacts = this.tableFields;

  form = new FormGroup({
    namn: new FormControl(''),
    email: new FormControl(''),
  });

  columns: TableColumn[] = [
    {
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
      key: 'namn',
      class: 'w-[50%]',
      visible: true,
      tableName: 'simpleContact',
    },
    { label: 'Email', key: 'email', class: 'w-[50%]', visible: true, tableName: 'simpleContact' },
  ];

  addContact() {
    const { namn, email } = this.form.value;
    if (!namn && !email) return;
    const newContact = { namn, email, id: crypto.randomUUID() };

    this.contacts().update((existingContacts: ContactOption[]) => [...existingContacts, newContact]);
  }

  removeContact(item: ContactOption) {
    this.contacts().update((existingContacts: ContactOption[]) =>
      existingContacts.filter(contact => contact.id !== item.id)
    );
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.columns.map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: true,
    }));
  }
}
