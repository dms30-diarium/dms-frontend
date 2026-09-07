import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, tap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  buildGenericCreateErrorMessage,
  buildGenericCreatedMessage,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-create-simple-document-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-simple-document-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSimpleDocumentFormComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  private store = inject(GeneralStore);

  defaultPayload: NuxeoDocument | null = null;
  isLoading = signal(false);

  path = input.required<string>();
  docType = input.required<string>();
  formName = input<string>('New Document');
  dialogClosed = output<NuxeoDocument | null>();

  formConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'title',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    { type: 'textarea', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
  ]);

  ngOnInit(): void {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), this.docType())
      .pipe(
        tap(result => {
          this.defaultPayload = result;
        })
      )
      .subscribe();
  }

  createDocument(event: { title?: string; description?: string }) {
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }

    const props = this.defaultPayload.properties ?? {};
    const properties: Record<string, unknown> = {
      ...props,
      [NUXEO_SCHEMA_FIELDS.dc.title]: event.title,
      [NUXEO_SCHEMA_FIELDS.dc.description]: event.description,
    };

    const fullPayload = {
      ...this.defaultPayload,
      name: event.title,
      properties,
    };

    this.isLoading.set(true);
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(result => {
          const name = this.docType();
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: buildGenericCreatedMessage(name),
          });
          this.dialogClosed.emit(result);
          this.isLoading.set(false);
        }),
        catchError(() => {
          const name = this.docType();
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: buildGenericCreateErrorMessage(name),
          });
          this.dialogClosed.emit(null);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }
}
