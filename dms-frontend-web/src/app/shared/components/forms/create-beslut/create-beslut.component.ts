import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { catchError, EMPTY, tap } from 'rxjs';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  CREATE_BESLUT_ERROR_MESSAGE,
  CREATE_BESLUT_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-beslut',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-beslut.component.html',
})
export class CreateBeslutComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  defaultPayload: NuxeoDocument | null = null;
  parentUid = input.required<string>();
  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();
  private store = inject(GeneralStore);

  createFolderConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'code',
      label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',
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

  ngOnInit() {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Beslut')
      .pipe(
        tap(result => {
          this.defaultPayload = result;
        })
      )
      .subscribe();
  }

  createDocument(event: Record<'name' | 'shortName' | 'code' | 'sort' | 'dateFrom' | 'dateTill', string>) {
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }
    const fullPayload = {
      ...this.defaultPayload,
      name: event.name,
      properties: {
        ...this.defaultPayload?.properties,
        [NUXEO_SCHEMA_FIELDS.cv.kod]: event.code,
        [NUXEO_SCHEMA_FIELDS.cv.kortnamn]: event.shortName,
        [NUXEO_SCHEMA_FIELDS.cv.namn]: event.name,
        [NUXEO_SCHEMA_FIELDS.cv.sortering]: event.sort,
        [NUXEO_SCHEMA_FIELDS.cv.giltigFran]: event.dateFrom[0],
        [NUXEO_SCHEMA_FIELDS.cv.giltigTill]: event.dateTill[0],
      },
    };
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(result => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CREATE_BESLUT_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(err => {
          console.error('Error during Beslut creation:', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CREATE_BESLUT_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        })
      )
      .subscribe();
  }
}
