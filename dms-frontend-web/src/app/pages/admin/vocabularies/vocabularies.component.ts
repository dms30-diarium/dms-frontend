import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewChild } from '@angular/core';

import { DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, finalize, tap } from 'rxjs';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryEntry } from '@app/shared/api/nuxeo-api.types';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { TableItem } from '@models/case-table';
import { VOCABULARY_TABLE_CONFIG } from './vocabulary-table.constants';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  VOCABULARY_ENTRIES_LOAD_ERROR_MESSAGE,
  VOCABULARY_ENTRY_CREATE_ERROR_MESSAGE,
  VOCABULARY_ENTRY_CREATE_SUCCESS_MESSAGE,
  VOCABULARY_ENTRY_DELETE_ERROR_MESSAGE,
  VOCABULARY_ENTRY_DELETE_SUCCESS_MESSAGE,
  VOCABULARY_ENTRY_UPDATE_ERROR_MESSAGE,
  VOCABULARY_ENTRY_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Component({
  selector: 'nuxeo-vocabularies',
  standalone: true,
  imports: [
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    ReactiveFormsModule,
    CaseListTableComponent,
    GeneralFormComponent,
  ],
  templateUrl: './vocabularies.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VocabulariesComponent implements OnInit {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);

  readonly vocabularyOptions = signal<{ id: string; label: string }[]>([]);
  readonly isLoadingVocabularies = signal(false);
  readonly form = new FormGroup({
    vocabulary: new FormControl<string>(''),
  });

  readonly selectedVocabulary = signal<string | null>(null);
  readonly rows = signal<TableItem[]>([]);
  readonly isLoading = signal(false);
  readonly isAddEntryOpen = signal(false);
  readonly editingEntryId = signal<string | null>(null);
  readonly deleteEntryTarget = signal<TableItem | null>(null);
  readonly entryFormConfig = signal<FieldConfig[]>(this.buildEntryFormConfig());

  ngOnInit(): void {
    this.isLoadingVocabularies.set(true);
    this.nuxeoApi
      .getDirectories()
      .pipe(
        tap(result => {
          const options = (result.entries ?? [])
            .map(directory => ({ id: directory.name, label: directory.name }))
            .sort((optionA, optionB) => optionA.label.localeCompare(optionB.label));
          this.vocabularyOptions.set(options);
        }),
        catchError(() => {
          this.vocabularyOptions.set([]);
          return EMPTY;
        }),
        finalize(() => this.isLoadingVocabularies.set(false))
      )
      .subscribe();
  }

  @ViewChild(GeneralFormComponent) private entryFormComponent?: GeneralFormComponent;

  readonly tableConfig: TableColumn[] = VOCABULARY_TABLE_CONFIG;

  readonly defaultColumnOptions: TableColOption[] = this.tableConfig.map(column => ({
    id: column.key.toString(),
    label: column.label,
    visible: column.visible ?? true,
  }));

  onVocabularyChange(value: string) {
    const selected = value?.trim() || null;
    this.selectedVocabulary.set(selected);

    if (!selected) {
      this.rows.set([]);
      return;
    }

    this.isLoading.set(true);
    this.nuxeoApi
      .getDirectoryEntries(selected, 0)
      .pipe(
        tap(result => {
          const entries = result.entries ?? [];
          this.rows.set(
            entries.map(entry => ({
              id: entry.id ?? '',
              label: entry.properties?.label ?? '',
              obsolete: entry.properties?.obsolete ?? 0,
              ordering: entry.properties?.ordering ?? '-',
            }))
          );
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: VOCABULARY_ENTRIES_LOAD_ERROR_MESSAGE,
          });
          this.rows.set([]);
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe();
  }

  private buildEntryFormConfig(
    values: { id?: string; label?: string; obsolete?: boolean; ordering?: string } = {},
    isEditing = false
  ): FieldConfig[] {
    const fields: FieldConfig[] = [];

    if (!isEditing) {
      fields.push({
        type: 'input',
        name: 'id',
        label: 'ID',
        placeholder: 'ID',
        defaultValue: values.id ?? '',
        validators: [Validators.required],
      });
    }

    fields.push(
      {
        type: 'input',
        name: 'label',
        label: 'Label',
        placeholder: 'Label',
        defaultValue: values.label ?? '',
      },
      {
        type: 'checkbox',
        name: 'obsolete',
        label: 'Obsolete',
        defaultValue: values.obsolete ?? false,
      },
      {
        type: 'input',
        name: 'ordering',
        label: 'Ordering',
        placeholder: 'Ordering',
        inputType: 'number',
        defaultValue: values.ordering ?? '',
        validators: [Validators.pattern('^[0-9]*$')],
      }
    );

    return fields;
  }

  openAddEntry() {
    this.editingEntryId.set(null);
    this.entryFormConfig.set(this.buildEntryFormConfig());
    this.isAddEntryOpen.set(true);
  }

  closeAddEntry() {
    this.isAddEntryOpen.set(false);
    this.editingEntryId.set(null);
    this.entryFormConfig.set(this.buildEntryFormConfig());
  }

  openEditEntry(item: TableItem) {
    const entryId = item?.['id']?.toString().trim();
    if (!entryId) {
      return;
    }

    const obsoleteRaw = item?.['obsolete'];
    const orderingRaw = item?.['ordering'];
    const obsolete = obsoleteRaw === 1;

    this.editingEntryId.set(entryId);
    this.entryFormConfig.set(
      this.buildEntryFormConfig(
        {
          id: entryId,
          label: item?.['label']?.toString() ?? '',
          obsolete,
          ordering: orderingRaw === '-' || orderingRaw == null ? '' : orderingRaw.toString(),
        },
        true
      )
    );
    this.isAddEntryOpen.set(true);
  }

  submitEntryForm() {
    this.entryFormComponent?.submit();
  }

  handleEntryFormResult(rawValues: Record<string, unknown>) {
    const directoryName = this.selectedVocabulary();
    if (!directoryName) {
      return;
    }

    const isEditing = !!this.editingEntryId();
    const rawId = isEditing ? this.editingEntryId() : rawValues['id'];
    const entryId = rawId?.toString().trim() ?? '';
    if (!entryId) {
      return;
    }

    const rawLabel = rawValues['label'];
    const rawOrdering = rawValues['ordering'];
    const rawObsolete = rawValues['obsolete'];
    const rawOrderingText = rawOrdering?.toString().trim() ?? '';
    const parsedOrdering = rawOrderingText ? Number(rawOrderingText) : undefined;
    const obsolete = rawObsolete === true;

    const entry: DirectoryEntry = {
      'entity-type': 'directoryEntry',
      directoryName,
      id: entryId,
      properties: {
        id: entryId,
        label: rawLabel?.toString().trim() || undefined,
        obsolete: obsolete ? 1 : 0,
        ordering: Number.isFinite(parsedOrdering) ? parsedOrdering : undefined,
      },
    };

    const request$ = isEditing
      ? this.nuxeoApi.updateDirectoryEntry(directoryName, entryId, entry)
      : this.nuxeoApi.createDirectoryEntry(directoryName, entry);

    request$
      .pipe(
        tap(() => {
          this.closeAddEntry();
          this.onVocabularyChange(directoryName);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: isEditing ? VOCABULARY_ENTRY_UPDATE_SUCCESS_MESSAGE : VOCABULARY_ENTRY_CREATE_SUCCESS_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: isEditing ? VOCABULARY_ENTRY_UPDATE_ERROR_MESSAGE : VOCABULARY_ENTRY_CREATE_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  deleteEntry(item: TableItem) {
    const directoryName = this.selectedVocabulary();
    const entryId = item?.['id']?.toString().trim();
    if (!directoryName || !entryId) {
      return;
    }

    this.nuxeoApi
      .deleteDirectoryEntry(directoryName, entryId)
      .pipe(
        tap(() => {
          this.onVocabularyChange(directoryName);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: VOCABULARY_ENTRY_DELETE_SUCCESS_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: VOCABULARY_ENTRY_DELETE_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  confirmDeleteEntry() {
    const target = this.deleteEntryTarget();
    if (target) {
      this.deleteEntry(target);
    }
    this.deleteEntryTarget.set(null);
  }
}
