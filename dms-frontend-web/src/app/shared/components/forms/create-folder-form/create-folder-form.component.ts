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
  CREATE_FOLDER_FORM_ERROR_MESSAGE,
  CREATE_FOLDER_FORM_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-folder-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-folder-form.component.html',
})
export class CreateCaseFolderComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  defaultPayload: NuxeoDocument | null = null;
  parentUid = input.required<string>();
  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();
  private store = inject(GeneralStore);

  createFolderConfig = signal<FieldConfig[]>([
    { type: 'input', name: 'year', label: 'Ar(year)', validators: [Validators.required], inputType: 'number' },
    {
      type: 'input',
      name: 'name',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    {
      type: 'dropdown',
      name: 'klass',
      label: 'Klassificeringsstruktur',
      options: [],
      validators: [Validators.required],
    },
  ]);

  ngOnInit() {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Ar')
      .pipe(
        tap(result => {
          this.defaultPayload = result;
        })
      )
      .subscribe();

    this.nuxeoApi
      .DMSDocumentSuggestion(this.parentUid(), 'Klassificeringsstruktur', 'Ar')
      .pipe(
        tap(result => {
          const options = result.entries.map(({ title, uid, path }) => ({ label: title, id: uid, path: path }));
          const updatedConf = this.createFolderConfig().map(el =>
            el.label === 'Klassificeringsstruktur' ? { ...el, options } : el
          );
          this.createFolderConfig.set(updatedConf);
        })
      )
      .subscribe();
  }

  createDocument(event: Record<'name' | 'year' | 'klass', string>) {
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }
    const fullPayload = {
      ...this.defaultPayload,
      name: event.name,
      properties: {
        ...this.defaultPayload?.properties,
        [NUXEO_SCHEMA_FIELDS.ar.ar]: event.year,
        [NUXEO_SCHEMA_FIELDS.ar.klassificeringsstruktur]: event.klass,
      },
    };
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(result => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CREATE_FOLDER_FORM_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(err => {
          console.error('Error during Year Folder creation:', err);
          this.dialogClosed.emit(null);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CREATE_FOLDER_FORM_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }
}
