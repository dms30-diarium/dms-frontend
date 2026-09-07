import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { catchError, EMPTY, tap } from 'rxjs';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import {
  CREATE_MAILFOLDER_ERROR_MESSAGE,
  CREATE_MAILFOLDER_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-mailfolder-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-mailFolder-form.component.html',
})
export class CreateMailFolderComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  defaultPayload: NuxeoDocument | null = null;
  parentUid = input.required<string>();
  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();
  private store = inject(GeneralStore);

  createFolderConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'name',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    { type: 'input', name: 'email', label: 'Email', validators: [Validators.required] },
    { type: 'input', name: 'password', label: 'Password', validators: [Validators.required], inputType: 'password' },
  ]);

  ngOnInit() {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'MailFolder')
      .pipe(
        tap(result => {
          this.defaultPayload = result;
        })
      )
      .subscribe();
  }

  createDocument(event: Record<'name' | 'email' | 'password', string>) {
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }
    const fullPayload = {
      ...this.defaultPayload,
      name: event.name,
      properties: {
        ...this.defaultPayload?.properties,
        [NUXEO_SCHEMA_FIELDS.dc.title]: event.name ?? 'MailFolder',
        [NUXEO_SCHEMA_FIELDS.prot.email]: event.email,
        [NUXEO_SCHEMA_FIELDS.prot.password]: event.password,
        [NUXEO_SCHEMA_FIELDS.prot.protocolType]: 'imaps',
        [NUXEO_SCHEMA_FIELDS.prot.host]: 'imap.gmail.com',
        [NUXEO_SCHEMA_FIELDS.prot.port]: '993',
        [NUXEO_SCHEMA_FIELDS.prot.socketFactoryFallback]: false,
        [NUXEO_SCHEMA_FIELDS.prot.socketFactoryPort]: 993,
        [NUXEO_SCHEMA_FIELDS.prot.starttlsEnable]: true,
        [NUXEO_SCHEMA_FIELDS.prot.sslProtocols]: 'TLSv1.2',
        [NUXEO_SCHEMA_FIELDS.prot.emailsLimit]: 100,
      },
    };
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(result => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CREATE_MAILFOLDER_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(err => {
          console.error('Error during Year Folder creation:', err);
          this.dialogClosed.emit(null);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CREATE_MAILFOLDER_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }
}
