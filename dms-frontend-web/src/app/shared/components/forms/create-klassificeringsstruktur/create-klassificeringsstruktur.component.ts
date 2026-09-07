import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, tap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  KLASSIFICERINGSSTRUKTUR_CREATE_ERROR_MESSAGE,
  KLASSIFICERINGSSTRUKTUR_CREATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-klassificeringsstruktur',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-klassificeringsstruktur.component.html',
})
export class CreateKlassificeringsstrukturComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  private store = inject(GeneralStore);

  defaultPayload: NuxeoDocument | null = null;
  isLoading = signal(false);

  parentUid = input.required<string>();
  path = input.required<string>();
  docType = input<string>('Klassificeringsstruktur');
  dialogClosed = output<NuxeoDocument | null>();

  createKlassificeringsstrukturConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'title',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    { type: 'input', name: 'owner', label: 'Ägare' },
    { type: 'textarea', name: 'purpose', label: 'Syfte' },
    { type: 'input', name: 'version', label: 'Version', validators: [Validators.required] },
    { type: 'datepicker', name: 'validFrom', label: 'GiltigFrån' },
    { type: 'datepicker', name: 'validTill', label: 'Giltig Till' },
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
    owner?: string;
    purpose?: string;
    version?: string;
    validFrom?: string[] | Date[];
    validTill?: string[] | Date[];
  }) {
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }

    const props = this.defaultPayload.properties ?? {};
    const validFrom = Array.isArray(event.validFrom) ? event.validFrom[0] : event.validFrom;
    const validTill = Array.isArray(event.validTill) ? event.validTill[0] : event.validTill;

    const properties: Record<string, unknown> = {
      ...props,
      [NUXEO_SCHEMA_FIELDS.dc.title]: event.title,
      [NUXEO_SCHEMA_FIELDS.klassificeringsstruktur.agare]: event.owner,
      [NUXEO_SCHEMA_FIELDS.klassificeringsstruktur.syfte]: event.purpose,
      [NUXEO_SCHEMA_FIELDS.klassificeringsstruktur.version]: event.version,
      [NUXEO_SCHEMA_FIELDS.klassificeringsstruktur.giltigFran]: validFrom,
      [NUXEO_SCHEMA_FIELDS.klassificeringsstruktur.giltigTill]: validTill,
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
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: KLASSIFICERINGSSTRUKTUR_CREATE_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
          this.isLoading.set(false);
        }),
        catchError(err => {
          console.error('Error during Klassificeringsstruktur creation:', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: KLASSIFICERINGSSTRUKTUR_CREATE_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }
}
