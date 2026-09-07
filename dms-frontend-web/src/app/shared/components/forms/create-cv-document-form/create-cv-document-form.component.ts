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
  selector: 'nuxeo-create-cv-document-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-cv-document-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCvDocumentFormComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  private store = inject(GeneralStore);

  defaultPayload: NuxeoDocument | null = null;
  isLoading = signal(false);

  path = input.required<string>();
  docType = input.required<string>();
  formName = input<string>('New Document');
  dialogClosed = output<NuxeoDocument | null>();

  formConfig = signal<FieldConfig[]>([
    { type: 'input', name: 'title', label: 'Titel' },
    {
      type: 'input',
      name: 'code',
      label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',
      validators: [Validators.required],
    },
    {
      type: 'input',
      name: 'codeName',
      label: this.store.getValue('label.ui.schema.cv.kodnamn') ?? 'Kodnamn',
      validators: [Validators.required],
    },
    {
      type: 'input',
      name: 'shortName',
      label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',
      validators: [Validators.required],
    },
    {
      type: 'input',
      name: 'name',
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
      validators: [Validators.required],
    },
    { type: 'textarea', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
    {
      type: 'input',
      name: 'sort',
      label: this.store.getValue('label.ui.schema.cv.sortering') ?? 'Sortering',
      validators: [Validators.required],
      inputType: 'number',
    },
    {
      type: 'datepicker',
      name: 'dateFrom',
      label: this.store.getValue('label.ui.schema.cv.giltigFran') ?? 'Giltig från',
      validators: [Validators.required],
    },
    {
      type: 'datepicker',
      name: 'dateTill',
      label: this.store.getValue('label.ui.schema.cv.giltigTill') ?? 'Giltig till',
      validators: [Validators.required],
    },
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

  createDocument(event: {
    title?: string;
    code?: string;
    codeName?: string;
    shortName?: string;
    name?: string;
    description?: string;
    sort?: string | number;
    dateFrom?: Date[] | string[];
    dateTill?: Date[] | string[];
  }) {
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }

    const title = event.title?.trim() || event.name?.trim() || '';
    const props = this.defaultPayload.properties ?? {};
    const properties: Record<string, unknown> = {
      ...props,
      [NUXEO_SCHEMA_FIELDS.dc.title]: title,
      [NUXEO_SCHEMA_FIELDS.dc.description]: event.description,
      [NUXEO_SCHEMA_FIELDS.cv.kod]: event.code,
      [NUXEO_SCHEMA_FIELDS.cv.kodnamn]: event.codeName,
      [NUXEO_SCHEMA_FIELDS.cv.kortnamn]: event.shortName,
      [NUXEO_SCHEMA_FIELDS.cv.namn]: event.name,
      [NUXEO_SCHEMA_FIELDS.cv.sortering]: event.sort,
      [NUXEO_SCHEMA_FIELDS.cv.giltigFran]: event.dateFrom?.[0],
      [NUXEO_SCHEMA_FIELDS.cv.giltigTill]: event.dateTill?.[0],
    };

    const fullPayload = {
      ...this.defaultPayload,
      name: title,
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
