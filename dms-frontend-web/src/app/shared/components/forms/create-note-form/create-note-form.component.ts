import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { CREATE_NOTE_ERROR_MESSAGE, CREATE_NOTE_SUCCESS_MESSAGE } from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { initDirectoryOptions, resolveSubjectIds, updateFormFieldOptions } from '../document-form-helpers';

@Component({
  selector: 'nuxeo-create-note-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-note-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateNoteFormComponent implements OnInit {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly directoryOptions = inject(DirectoryOptionsService);

  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();

  defaultPayload = signal<NuxeoDocument | null>(null);
  isLoading = signal(false);

  createNoteConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'title',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    { type: 'textarea', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
    {
      type: 'dropdown',
      name: 'format',
      label: 'Format',
      defaultValue: 'text/html',
      options: [
        { label: 'HTML', id: 'text/html' },
        { label: 'Text', id: 'text/plain' },
        { label: 'XML', id: 'text/xml' },
        { label: 'Markdown', id: 'text/markdown' },
      ],
    },
    { type: 'dropdown', name: 'nature', label: 'Nature', options: [] },
    { type: 'dropdown-search', name: 'subjects', label: 'Subjects', options: [], multiple: true },
    { type: 'dropdown', name: 'coverage', label: 'Coverage', options: [] },
    { type: 'datepicker', name: 'expires', label: 'Expires' },
    { type: 'richtext', name: 'note', label: 'Note' },
  ]);

  ngOnInit(): void {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Note')
      .pipe(tap(result => this.defaultPayload.set(result)))
      .subscribe();

    initDirectoryOptions(this.directoryOptions, (field, opts) =>
      updateFormFieldOptions(this.createNoteConfig, field, opts)
    );
  }

  createDocument(event: Record<string, unknown>): void {
    const payload = this.defaultPayload();
    if (!payload) {
      throw new Error('Payload is needed for creating documents');
    }

    const titleValue = event['title'];
    const titleText = typeof titleValue === 'string' ? titleValue.trim() : undefined;
    const description = typeof event['description'] === 'string' ? event['description'].trim() : event['description'];
    const format = typeof event['format'] === 'string' ? event['format'].trim() : event['format'];
    const noteContent = typeof event['note'] === 'string' ? event['note'].trim() : event['note'];
    const nature = typeof event['nature'] === 'string' ? event['nature'].trim() : event['nature'];
    const coverage = typeof event['coverage'] === 'string' ? event['coverage'].trim() : event['coverage'];
    const subjects = resolveSubjectIds(event['subjects']);
    const expiresRaw = event['expires'];
    const expires = Array.isArray(expiresRaw) ? expiresRaw[0] : expiresRaw;

    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: titleValue,
      [NUXEO_SCHEMA_FIELDS.note.mimeType]: format,
      [NUXEO_SCHEMA_FIELDS.dc.description]: description,
      [NUXEO_SCHEMA_FIELDS.note.note]: noteContent,
      [NUXEO_SCHEMA_FIELDS.dc.nature]: nature,
      [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects,
      [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage,
      [NUXEO_SCHEMA_FIELDS.dc.expired]: expires,
    };

    const fullPayload: Partial<NuxeoDocument> = {
      'entity-type': 'document',
      repository: payload.repository ?? 'default',
      type: payload.type ?? 'Note',
      name: titleText ?? 'note',
      title: titleText ?? 'note',
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
            text: CREATE_NOTE_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(err => {
          console.error('Error during Note creation:', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CREATE_NOTE_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe();
  }
}
