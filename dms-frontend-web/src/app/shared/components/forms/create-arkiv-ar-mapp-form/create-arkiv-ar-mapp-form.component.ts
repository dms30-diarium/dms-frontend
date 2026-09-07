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

interface ArkivArMappFormEvent {
  title?: string;
  description?: string;
  ar?: string;
}

@Component({
  selector: 'nuxeo-create-arkiv-ar-mapp-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-arkiv-ar-mapp-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateArkivArMappFormComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);

  defaultPayload!: NuxeoDocument;
  isLoading = signal(false);

  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();

  formConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'title',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    { type: 'textarea', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
    { type: 'input', name: 'ar', label: 'Ar', validators: [Validators.required], inputType: 'number' },
  ]);

  ngOnInit(): void {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'ArkivArMapp')
      .pipe(
        tap(document => {
          this.defaultPayload = document;
          this.formConfig.update(currentConfig =>
            currentConfig.map(fieldConfig =>
              fieldConfig.name === 'ar'
                ? {
                    ...fieldConfig,
                    defaultValue: String(document.properties[NUXEO_SCHEMA_FIELDS.arkivarmapp.ar]),
                  }
                : fieldConfig
            )
          );
        })
      )
      .subscribe();
  }

  createDocument(formEvent: ArkivArMappFormEvent) {
    this.isLoading.set(true);

    const properties: Record<string, unknown> = {
      ...this.defaultPayload.properties,
      [NUXEO_SCHEMA_FIELDS.dc.title]: formEvent.title,
      [NUXEO_SCHEMA_FIELDS.dc.description]: formEvent.description,
      [NUXEO_SCHEMA_FIELDS.arkivarmapp.ar]: formEvent.ar,
    };

    const fullPayload = {
      ...this.defaultPayload,
      name: formEvent.title,
      properties,
    };

    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(createdDocument => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: buildGenericCreatedMessage('ArkivArMapp'),
          });
          this.dialogClosed.emit(createdDocument);
          this.isLoading.set(false);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: buildGenericCreateErrorMessage('ArkivArMapp'),
          });
          this.dialogClosed.emit(null);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }
}
