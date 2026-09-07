import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, catchError, finalize, switchMap, tap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, TemplateField } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { Option } from '@app/shared/commonTypes';
import { UploadedFile } from '../../file-upload/file-upload.component';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';
import { initDirectoryOptions, updateFormFieldOptions } from '../document-form-helpers';
import { TemplatePropertiesTableComponent } from '../../edit-form-components/template-properties-table/template-properties-table.component';

import {
  FILE_CREATE_ERROR_MESSAGE,
  FILE_CREATE_SUCCESS_MESSAGE,
  FILE_UPLOAD_ERROR_MESSAGE,
  FILE_UPLOAD_REQUIRED_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

interface FileFormEvent {
  title: string;
  description?: string | null;
  subject?: string | null;
  nature?: string | null;
  subjects?: Option[] | string[] | null;
  coverage?: string | null;
  expires?: (string | Date)[] | string | Date | null;
  templateProperties?: TemplateField[];
}

@Component({
  selector: 'nuxeo-create-file-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-file-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFileFormComponent implements OnInit {
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
  templateProperties = signal<TemplateField[]>([]);

  createFileConfig = signal<FieldConfig[]>([]);

  ngOnInit(): void {
    this.createFileConfig.set(this.buildFormConfig());

    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), this.itemType())
      .pipe(tap(result => this.defaultPayload.set(result)))
      .subscribe();

    if (this.isUtkastmallType() || this.isEPostmallType()) {
      return;
    }

    initDirectoryOptions(this.directoryOptions, (field, opts) =>
      updateFormFieldOptions(this.createFileConfig, field, opts)
    );
  }

  onFileUpload(event: { files: UploadedFile[]; fieldName: string }) {
    if (event.fieldName !== 'uploadFile') return;
    this.uploadFile(event.files);
  }

  uploadFile(files: UploadedFile[]) {
    const config = this.createFileConfig();

    if (files.length === 0) {
      this.fileBatchId = '';
      this.uploadedFileName = '';
      this.createFileConfig.set(config.map(field => (field.name === 'title' ? { ...field, defaultValue: '' } : field)));
      return;
    }

    const file = files[0];
    this.uploadedFileName = file.name;
    this.createFileConfig.set(
      config.map(field => (field.name === 'title' ? { ...field, defaultValue: file.name } : field))
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
            text: FILE_UPLOAD_ERROR_MESSAGE,
          });
        },
      });
  }

  createDocument(rawEvent: unknown): void {
    const payload = this.defaultPayload();
    if (!payload) {
      throw new Error('Payload is needed for creating documents');
    }

    if (!this.fileBatchId) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: FILE_UPLOAD_REQUIRED_MESSAGE,
      });
      return;
    }

    const event = rawEvent as FileFormEvent;
    const isUtkastmall = this.isUtkastmallType();
    const isEPostmall = this.isEPostmallType();
    const docTitle = String(event.title ?? this.uploadedFileName ?? 'file').trim() || 'file';
    const description = typeof event.description === 'string' ? event.description.trim() : (event.description ?? null);
    const subject = typeof event.subject === 'string' ? event.subject.trim() : '';
    const nature = this.toOptionId(event.nature, 'nature');
    const coverage = this.toOptionId(event.coverage, 'coverage');
    const subjects = this.toOptionIds(event.subjects, 'subjects');
    const expires = this.toIsoDate(event.expires);
    const templateProperties = (event.templateProperties ?? []).map(field => ({
      nyckel: String(field?.nyckel ?? '').trim(),
      varde: String(field?.varde ?? '').trim(),
    }));

    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.fil.typ]: NUXEO_VOCAB_IDS.filTyp.bilaga,
      [NUXEO_SCHEMA_FIELDS.dc.title]: docTitle,
      ...(description ? { [NUXEO_SCHEMA_FIELDS.dc.description]: description } : {}),
      ...(isEPostmall && subject ? { [NUXEO_SCHEMA_FIELDS.epostmall.amne]: subject } : {}),
      ...(!isUtkastmall && !isEPostmall && nature ? { [NUXEO_SCHEMA_FIELDS.dc.nature]: nature } : {}),
      ...(!isUtkastmall && !isEPostmall && subjects.length ? { [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects } : {}),
      ...(!isUtkastmall && !isEPostmall && coverage ? { [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage } : {}),
      ...(!isUtkastmall && !isEPostmall && expires ? { [NUXEO_SCHEMA_FIELDS.dc.expired]: expires } : {}),
      ...(isUtkastmall ? { [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: templateProperties } : {}),
      [NUXEO_SCHEMA_FIELDS.file.content]: {
        'upload-batch': this.fileBatchId,
        'upload-fileId': '0',
      },
    };

    const fullPayload = {
      'entity-type': 'document' as const,
      repository: payload.repository ?? 'default',
      type: this.itemType() || payload.type || 'File',
      name: docTitle,
      title: docTitle,
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
            text: FILE_CREATE_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: FILE_CREATE_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe();
  }

  private toOptionId(value: unknown, fieldName?: 'nature' | 'coverage' | 'subjects'): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
      if (fieldName) {
        const fromLabel = this.findOptionIdByLabel(fieldName, trimmed);
        if (fromLabel) return fromLabel;
      }
      return trimmed;
    }
    if (value && typeof value === 'object' && 'id' in value) {
      const raw = (value as { id?: unknown }).id;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
        return trimmed;
      }
      if (raw != null) {
        const trimmed = String(raw).trim();
        if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
        return trimmed;
      }
    }
    if (value && typeof value === 'object' && 'value' in value) {
      const raw = (value as { value?: unknown }).value;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
        if (fieldName) {
          const fromLabel = this.findOptionIdByLabel(fieldName, trimmed);
          if (fromLabel) return fromLabel;
        }
        return trimmed;
      }
      if (raw != null) {
        const trimmed = String(raw).trim();
        if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
        if (fieldName) {
          const fromLabel = this.findOptionIdByLabel(fieldName, trimmed);
          if (fromLabel) return fromLabel;
        }
        return trimmed;
      }
    }
    return null;
  }

  private toOptionIds(value: FileFormEvent['subjects'], fieldName?: 'nature' | 'coverage' | 'subjects'): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(item => this.toOptionId(item, fieldName)).filter((entry): entry is string => Boolean(entry));
    }
    const single = this.toOptionId(value, fieldName);
    return single ? [single] : [];
  }

  private findOptionIdByLabel(fieldName: 'nature' | 'coverage' | 'subjects', label: string): string | null {
    const field = this.createFileConfig().find(config => config.name === fieldName);
    if (!field || !Array.isArray(field.options)) return null;
    const normalized = label.trim().toLowerCase();
    const match = field.options.find(option => option.label.trim().toLowerCase() === normalized);
    return match?.id ?? null;
  }

  private toIsoDate(value: FileFormEvent['expires']): string {
    if (!value) return '';
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) return '';
    if (raw instanceof Date) return toISODateOnlyString(raw);
    const trimmed = String(raw).trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
    return trimmed;
  }

  private isUtkastmallType(): boolean {
    return this.itemType() === 'Utkastmall';
  }

  private isEPostmallType(): boolean {
    return this.itemType() === 'EPostmall';
  }

  private buildFormConfig(): FieldConfig[] {
    const base: FieldConfig[] = [
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
    ];

    if (this.isUtkastmallType()) {
      return [
        ...base,
        {
          type: 'component',
          name: 'templateProperties',
          label: 'Egenskaper',
          class: TemplatePropertiesTableComponent,
          props: { tableFields: this.templateProperties },
        },
      ];
    }

    if (this.isEPostmallType()) {
      return [...base, { type: 'input', name: 'subject', label: 'Amne' }];
    }

    return [
      ...base,
      { type: 'dropdown', name: 'nature', label: 'Nature', options: [] },
      { type: 'dropdown-search', name: 'subjects', label: 'Subjects', options: [], multiple: true },
      { type: 'dropdown', name: 'coverage', label: 'Coverage', options: [] },
      { type: 'datepicker', name: 'expires', label: 'Expires' },
    ];
  }
}
