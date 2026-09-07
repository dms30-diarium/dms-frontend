import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, catchError, finalize, of, switchMap, tap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { UploadedFile } from '../../file-upload/file-upload.component';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';

import {
  PICTURE_CREATE_ERROR_MESSAGE,
  PICTURE_CREATE_SUCCESS_MESSAGE,
  PICTURE_UPLOAD_ERROR_MESSAGE,
  PICTURE_UPLOAD_REQUIRED_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import {
  buildChildPath,
  initDirectoryOptions,
  resolveSubjectIds,
  updateFormFieldOptions,
} from '../document-form-helpers';

@Component({
  selector: 'nuxeo-create-picture-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-picture-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePictureFormComponent implements OnInit {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly directoryOptions = inject(DirectoryOptionsService);

  path = input.required<string>();
  itemType = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();

  defaultPayload = signal<NuxeoDocument | null>(null);
  isLoading = signal(false);
  fileBatchId = '';
  uploadedFileName = '';

  createPictureConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'title',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    { type: 'textarea', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
    {
      type: 'uploadFile',
      name: 'uploadFile',
      label: 'Content',
      maxFiles: 1,
      subText: 'Ladda upp huvudfil',
    },
    { type: 'dropdown', name: 'nature', label: 'Nature', options: [] },
    { type: 'dropdown-search', name: 'subjects', label: 'Subjects', options: [], multiple: true },
    { type: 'dropdown', name: 'coverage', label: 'Coverage', options: [] },
    { type: 'datepicker', name: 'expires', label: 'Expires' },
  ]);

  ngOnInit(): void {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), this.itemType())
      .pipe(tap(result => this.defaultPayload.set(result)))
      .subscribe();

    initDirectoryOptions(this.directoryOptions, (field, opts) =>
      updateFormFieldOptions(this.createPictureConfig, field, opts)
    );
  }

  onFileUpload(event: { files: UploadedFile[]; fieldName: string }) {
    if (event.fieldName !== 'uploadFile') return;
    this.uploadFile(event.files);
  }

  uploadFile(files: UploadedFile[]) {
    if (files.length === 0) {
      this.fileBatchId = '';
      this.uploadedFileName = '';
      this.createPictureConfig.update(fields =>
        fields.map(field => (field.name === 'title' ? { ...field, defaultValue: '' } : field))
      );
      return;
    }

    const file = files[0];
    this.uploadedFileName = file.name;
    this.createPictureConfig.update(fields =>
      fields.map(field => (field.name === 'title' ? { ...field, defaultValue: file.name } : field))
    );

    this.isLoading.set(true);
    this.nuxeoApi
      .initializeUpload()
      .pipe(
        tap(result => (this.fileBatchId = result.batchId)),
        switchMap(result => this.nuxeoApi.uploadFile(result.batchId, files)),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PICTURE_UPLOAD_ERROR_MESSAGE,
          });
        },
      });
  }

  createDocument(event: Record<string, unknown>): void {
    const payload = this.defaultPayload();
    if (!payload) {
      throw new Error('Payload is needed for creating documents');
    }

    if (!this.fileBatchId) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: PICTURE_UPLOAD_REQUIRED_MESSAGE,
      });
      return;
    }

    const titleText = String(event['title'] ?? '').trim();
    const docTitle = titleText || this.uploadedFileName || 'picture';
    const descriptionText = String(event['description'] ?? '').trim();
    const description = descriptionText || null;
    const nature = event['nature'];
    const coverage = event['coverage'];
    const subjects = resolveSubjectIds(event['subjects']);
    const expiresRaw = event['expires'];
    const expires = Array.isArray(expiresRaw) ? expiresRaw[0] : expiresRaw;

    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: docTitle,
      ...(description ? { [NUXEO_SCHEMA_FIELDS.dc.description]: description } : {}),
      ...(nature ? { [NUXEO_SCHEMA_FIELDS.dc.nature]: nature } : {}),
      ...(subjects.length ? { [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects } : {}),
      ...(coverage ? { [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage } : {}),
      ...(expires ? { [NUXEO_SCHEMA_FIELDS.dc.expired]: expires } : {}),
      [NUXEO_SCHEMA_FIELDS.file.content]: {
        'upload-batch': this.fileBatchId,
        'upload-fileId': '0',
      },
    };

    const fullPayload = {
      'entity-type': 'document' as const,
      repository: payload.repository ?? 'default',
      type: this.itemType() || payload.type || 'Picture',
      name: docTitle,
      title: docTitle,
      properties,
    };

    this.isLoading.set(true);
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        switchMap(result => {
          if (result?.uid) {
            return of(result);
          }
          const fallbackPath = buildChildPath(this.path(), docTitle);
          if (!fallbackPath) {
            return of(result);
          }
          return this.nuxeoApi.getPathInfo(fallbackPath).pipe(catchError(() => of(result)));
        }),
        tap(result => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PICTURE_CREATE_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PICTURE_CREATE_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe();
  }
}
