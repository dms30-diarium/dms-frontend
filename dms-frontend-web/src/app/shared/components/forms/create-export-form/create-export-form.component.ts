import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, finalize, switchMap, tap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import {
  buildGenericCreateErrorMessage,
  buildGenericCreatedMessage,
} from '@app/shared/constants/notification-messages';
import {
  ArkivArendeUidRow,
  ArkivArendeUidsTableComponent,
} from '../../edit-form-components/arkiv-arende-uids-table/arkiv-arende-uids-table.component';
import { UploadedFile } from '../../file-upload/file-upload.component';

export interface ExportFormEvent {
  title?: string;
  description?: string;
  exportPath?: string;
  status?: string;
  arendeUids?: ArkivArendeUidRow[];
}

@Component({
  selector: 'nuxeo-create-export-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-export-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateExportFormComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);

  defaultPayload: NuxeoDocument | null = null;
  isLoading = signal(false);
  arendeUids = signal<ArkivArendeUidRow[]>([]);
  exportZipBatchId = '';

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
    {
      type: 'component',
      name: 'arendeUids',
      label: 'Arende Uids',
      class: ArkivArendeUidsTableComponent,
      props: { tableFields: this.arendeUids },
    },
    { type: 'input', name: 'exportPath', label: 'Export Path' },
    { type: 'uploadFile', name: 'exportZip', label: 'Export Zip', maxFiles: 1 },
    { type: 'input', name: 'status', label: 'Status' },
  ]);

  ngOnInit(): void {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Export')
      .pipe(tap(document => (this.defaultPayload = document)))
      .subscribe();
  }

  createDocument(formEvent: ExportFormEvent) {
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }

    const properties: NuxeoProperties = {
      ...this.defaultPayload.properties,
      [NUXEO_SCHEMA_FIELDS.dc.title]: formEvent.title,
      [NUXEO_SCHEMA_FIELDS.dc.description]: formEvent.description,
      [NUXEO_SCHEMA_FIELDS.export.exportvag]: formEvent.exportPath,
      [NUXEO_SCHEMA_FIELDS.export.status]: formEvent.status,
      [NUXEO_SCHEMA_FIELDS.export.arendeUids]: (formEvent.arendeUids ?? []).map(entry => entry.arendeUid),
    };

    if (this.exportZipBatchId) {
      properties[NUXEO_SCHEMA_FIELDS.export.exportZip] = {
        'upload-batch': this.exportZipBatchId,
        'upload-fileId': '0',
      };
    }

    const fullPayload = {
      ...this.defaultPayload,
      name: formEvent.title,
      properties,
    };

    this.isLoading.set(true);
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(createdDocument => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: buildGenericCreatedMessage('Export'),
          });
          this.dialogClosed.emit(createdDocument);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: buildGenericCreateErrorMessage('Export'),
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe();
  }

  onFileUpload(uploadEvent: { files: UploadedFile[]; fieldName: string }) {
    if (uploadEvent.fieldName !== 'exportZip') {
      return;
    }

    if (!uploadEvent.files.length) {
      this.exportZipBatchId = '';
      return;
    }

    this.isLoading.set(true);
    this.nuxeoApi
      .initializeUpload()
      .pipe(
        tap(batch => {
          this.exportZipBatchId = batch.batchId;
        }),
        switchMap(batch => this.nuxeoApi.uploadFile(batch.batchId, uploadEvent.files)),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        error: () => {
          this.exportZipBatchId = '';
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: buildGenericCreateErrorMessage('Export'),
          });
        },
      });
  }
}
