import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, catchError, finalize, of, switchMap, tap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import {
  COLLECTION_CREATE_ERROR_MESSAGE,
  COLLECTION_CREATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import {
  buildChildPath,
  initDirectoryOptions,
  resolveExpiresDate,
  resolveSubjectIds,
  updateFormFieldOptions,
} from '../document-form-helpers';

@Component({
  selector: 'nuxeo-create-collection-form',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-collection-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCollectionFormComponent implements OnInit {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly directoryOptions = inject(DirectoryOptionsService);

  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();

  defaultPayload = signal<NuxeoDocument | null>(null);
  isLoading = signal(false);

  createCollectionConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'title',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      validators: [Validators.required],
    },
    { type: 'textarea', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
    { type: 'dropdown', name: 'nature', label: 'Natur', options: [] },
    { type: 'dropdown-search', name: 'subjects', label: 'Subjects', options: [], multiple: true },
    { type: 'dropdown', name: 'coverage', label: 'Coverage', options: [] },
    { type: 'datepicker', name: 'expires', label: 'Expires' },
  ]);

  ngOnInit(): void {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Collection')
      .pipe(tap(result => this.defaultPayload.set(result)))
      .subscribe();

    initDirectoryOptions(this.directoryOptions, (field, opts) =>
      updateFormFieldOptions(this.createCollectionConfig, field, opts)
    );
  }

  createDocument(event: Record<string, unknown>): void {
    const payload = this.defaultPayload();
    if (!payload) {
      throw new Error('Payload is needed for creating documents');
    }

    const docTitle = String(event['title'] ?? '').trim() || 'collection';
    const descriptionText = String(event['description'] ?? '').trim();
    const description = descriptionText || null;
    const nature = event['nature'];
    const coverage = event['coverage'];
    const subjects = resolveSubjectIds(event['subjects']);
    const expires = resolveExpiresDate(event['expires']);

    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: docTitle,
      ...(description ? { [NUXEO_SCHEMA_FIELDS.dc.description]: description } : {}),
      ...(nature ? { [NUXEO_SCHEMA_FIELDS.dc.nature]: nature } : {}),
      ...(subjects.length ? { [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects } : {}),
      ...(coverage ? { [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage } : {}),
      ...(expires ? { [NUXEO_SCHEMA_FIELDS.dc.expired]: expires } : {}),
      [NUXEO_SCHEMA_FIELDS.collection.documentIds]: [],
    };

    const fullPayload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      repository: payload.repository ?? 'default',
      type: 'Collection',
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
            text: COLLECTION_CREATE_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: COLLECTION_CREATE_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe();
  }
}
