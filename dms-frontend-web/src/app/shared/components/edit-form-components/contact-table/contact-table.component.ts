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
import { ContactOption, UserOption } from '@app/shared/commonTypes';
import { TableItem } from '@app/shared/models/case-table';
import { ContactButtonWithDialogComponent } from '../contact-button-with-dialog/contact-button-with-dialog.component';
import { Contact } from '../../contact-table/contact-table.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { map, tap } from 'rxjs';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { GeneralStore } from '@app/core/services/general-store.service';

@Component({
  selector: 'nuxeo-contact-table',
  imports: [
    DigiArbetsformedlingenAngularModule,
    ReactiveFormsModule,
    CaseListTableComponent,
    ContactButtonWithDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-table.component.html',
})
export class ContactTableComponent implements OnInit {
  apiService = inject(NuxeoApiService);
  private store = inject(GeneralStore);
  saveContact = output();
  isContactDialogOpen = signal(false);
  tableFields = input.required<WritableSignal<ContactOption[]>>();
  contacts = this.tableFields;
  type = input.required<'internal' | 'external'>();
  parentRef = input();
  fieldName = input.required<string>();
  userOptions = signal<UserOption[]>([]);

  ngOnInit(): void {
    if (this.type() === 'internal') {
      this.getUserOptions();
    }
  }

  getUserOptions() {
    this.apiService
      .getUserSuggestions()
      .pipe(
        map(result =>
          result.map(el => ({
            label: el.displayLabel,
            id: el.id,
            email: el.email ?? '',
            company: el.company ?? '',
          }))
        ),
        tap(options => this.userOptions.set(options))
      )
      .subscribe();
  }

  updateEditedData(newContacts: TableItem[]) {
    this.contacts().set(
      newContacts.map(el => {
        const name = el['name'];
        if (typeof name === 'string') {
          const user = this.userOptions().find(user => user.id === el['name']);
          if (!user) {
            return { ...el, email: el?.['email'], org: el?.['company'] };
          }

          return { ...el, email: user?.email, org: user?.company };
        } else if (Array.isArray(name)) {
          const users = this.userOptions().filter(user => el['name'].includes(user.id));
          return {
            ...el,
            email: users
              .map(el => el.email)
              .filter(Boolean)
              .join(', '),
            org: users
              .map(el => el.company)
              .filter(Boolean)
              .join(', '),
          };
        } else {
          return el;
        }
      })
    );
  }
  tableName = signal<string>('contact_table');

  customColumnConfig = computed<TableColumn[]>(() => {
    const isInternal = this.type() === 'internal';
    const tableName = this.tableName();
    if (isInternal) {
      return [
        { label: 'Typ', key: 'type', class: 'w-[20%]', tableName, visible: true },
        {
          label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
          key: 'name',
          class: 'w-[20%]',
          tableName,
          visible: true,
          inputConfig: {
            type: row =>
              row['type'] === 'Ansvarig handlaggare' || row['type'] === 'Beslutsfattare' ? 'dropdown' : 'multiselect',
            options: this.userOptions(),
          },
        },
        {
          label: 'Avdelning enhet',
          key: 'org',
          class: 'w-[20%]',
          tableName,
          visible: true,
        },
        {
          label: 'E-post',
          key: 'email',
          class: 'w-[15%] max-w-[100px] text-wrap',
          tableName,
          visible: true,
        },
        {
          label: 'Telefonnummer',
          key: 'telefon',
          class: 'w-[20%]',
          tableName,
          visible: true,
        },
      ];
    } else {
      return [
        {
          label: 'Typ av motpart på ärende',
          key: 'typ',
          class: 'w-[15%]',
          inputConfig: { type: 'dropdown', options: [] },
          tableName,
          visible: true,
        },
        {
          label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
          key: 'name',
          class: 'w-[15%]',
          tableName,
          visible: true,
          inputConfig: { type: 'input' },
        },
        {
          label: 'Organisation/Foretag',
          key: 'org',
          class: 'w-[15%]',
          tableName,
          visible: true,
          inputConfig: { type: 'input' },
        },
        {
          label: 'E-post',
          key: 'email',
          class: 'w-[15%] max-w-[100px] text-wrap',
          tableName,
          visible: true,
          inputConfig: { type: 'input' },
        },
        {
          label: 'Telefonnummer',
          key: 'telefon',
          class: 'w-[15%]  max-w-[100px] ',
          tableName,
          visible: true,
          inputConfig: { type: 'input' },
        },
        {
          label: 'Adress',
          key: 'adress',
          class: 'w-[15%]  max-w-[100px] ',
          tableName,
          visible: true,
          inputConfig: { type: 'input' },
        },
        {
          label: 'Postnummer',
          key: 'postnummer',
          class: 'w-[10%]  max-w-[100px] ',
          tableName,
          visible: true,
          inputConfig: { type: 'input' },
        },
        {
          label: 'Postort',
          key: 'city',
          class: 'w-[10%]  max-w-[100px] ',
          tableName,
          visible: true,
          inputConfig: { type: 'input' },
        },
      ];
    }
  });

  addContact(contact: Contact) {
    this.contacts().update((contacts: ContactOption[]) => [...contacts, { ...contact, id: crypto.randomUUID() }]);
  }

  removeContact(item: ContactOption) {
    this.contacts().update((contacts: ContactOption[]) => contacts.filter(el => el['id'] !== item['id']));
  }

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
