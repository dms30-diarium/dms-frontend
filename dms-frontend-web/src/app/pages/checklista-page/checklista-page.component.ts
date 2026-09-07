import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { DigiArbetsformedlingenAngularModule, DigiButton, DigiDialog } from '@designsystem-se/af-angular';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  CHECKLISTA_LOAD_ERROR_MESSAGE,
  CHECKLISTA_UPDATE_ERROR_MESSAGE,
  CHECKLISTA_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';

type ChecklistaProperties = NuxeoProperties;

interface ChecklistRow {
  id: string;
  name: string;
  note: string;
  isChecked: boolean;
}

@Component({
  selector: 'nuxeo-checklista-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    DigiArbetsformedlingenAngularModule,
    NavigationBreadComponent,
    CaseListTableComponent,
    DigiButton,
    DigiDialog,
  ],
  templateUrl: './checklista-page.component.html',
})
export class ChecklistaPageComponent implements OnInit {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  private readonly route = inject(ActivatedRoute);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auditRefresh = inject(AuditRefreshService);
  private readonly store = inject(GeneralStore);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');

  document = signal<NuxeoDocument<ChecklistaProperties> | null>(null);
  isLoading = signal(true);
  loadError = signal(false);
  isEditOpen = signal(false);
  isSaving = signal(false);
  isDialogOpen = signal(false);
  isEditItem = signal(false);
  editedIndex = signal<number | null>(null);
  checklistsArray = new FormArray<FormGroup>([]);

  editForm = new FormGroup({
    title: new FormControl('', Validators.required),
    checklists: this.checklistsArray,
  });

  dialogForm = new FormGroup({
    name: new FormControl('', Validators.required),
    isChecked: new FormControl(false),
    note: new FormControl(''),
  });

  columnConfig: TableColumn[] = [
    { label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn', key: 'name', visible: true },
    {
      label: this.store.getValue('label.ui.schema.checklista.checklistepunkt.klar') ?? 'Klar',
      key: 'isChecked',
      visible: true,
    },
    { label: 'Notering', key: 'note', visible: true },
  ].map(col => ({ ...col, tableName: 'CHECKLISTA' }));

  private readonly emptyProps: ChecklistaProperties = Object.create(null);
  props = computed(() => this.document()?.properties ?? this.emptyProps);
  readonly formatDateOrMissing = formatDateOrMissing;
  readonly getUserFullName = formatUserFullName;
  contributorsLabel = computed(() =>
    this.props()
      [NUXEO_SCHEMA_FIELDS.dc.contributors]?.map(val => formatUserFullName(val))
      .join(' ')
  );
  checklistRows = computed(() => this.toChecklistRows(this.props()[NUXEO_SCHEMA_FIELDS.checklista.checklistesteg]));
  auditEntries = computed<AuditEntry[]>(() => {
    const entries = this.document()?.contextParameters?.audit ?? [];
    return [...entries].sort((entryA, entryB) => {
      const timeA = Date.parse(entryA.eventDate ?? entryA.logDate ?? '');
      const timeB = Date.parse(entryB.eventDate ?? entryB.logDate ?? '');
      const valueA = Number.isNaN(timeA) ? 0 : timeA;
      const valueB = Number.isNaN(timeB) ? 0 : timeB;
      return valueB - valueA;
    });
  });

  ngOnInit(): void {
    this.route.params
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.loadError.set(false);
          this.document.set(null);
        }),
        switchMap(params => this.auditRefresh.loadDocumentWithAudit(params['id'])),
        tap(doc => {
          this.document.set(doc);
          this.isLoading.set(false);
        }),
        catchError(() => {
          this.store.notification.set({ show: true, variation: 'danger', text: CHECKLISTA_LOAD_ERROR_MESSAGE });
          this.loadError.set(true);
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  openEdit(): void {
    const doc = this.document();
    if (!doc) return;
    this.resetFormFromDocument(doc);
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.dialogForm.reset();
    this.isDialogOpen.set(false);
    this.isEditItem.set(false);
    this.editedIndex.set(null);
  }

  openItemDialog(item?: ChecklistRow) {
    if (item) {
      const index = this.checklistsArray.value.findIndex(
        checklist => checklist.name === item.name && checklist.note === item.note
      );
      this.editedIndex.set(index !== -1 ? index : null);
      this.isEditItem.set(true);
      this.dialogForm.patchValue({
        name: item.name,
        note: item.note,
        isChecked: item.isChecked,
      });
    } else {
      this.dialogForm.reset({ name: '', note: '', isChecked: false });
      this.editedIndex.set(null);
      this.isEditItem.set(false);
    }
    this.isDialogOpen.set(true);
  }

  addOrUpdateItem(): void {
    if (this.dialogForm.invalid) return;
    const { name, note, isChecked } = this.dialogForm.value;
    const payload = {
      name: name?.toString() ?? '',
      note: note?.toString() ?? '',
      isChecked: !!isChecked,
    };

    if (this.isEditItem() && this.editedIndex() !== null) {
      const group = this.checklistsArray.at(this.editedIndex()!);
      group.patchValue(payload);
    } else {
      this.checklistsArray.push(
        new FormGroup({
          name: new FormControl(payload.name, Validators.required),
          note: new FormControl(payload.note),
          isChecked: new FormControl(payload.isChecked),
        })
      );
    }

    this.dialogForm.reset();
    this.isDialogOpen.set(false);
    this.isEditItem.set(false);
    this.editedIndex.set(null);
  }

  deleteItem(item: ChecklistRow): void {
    const index = this.checklistsArray.value.findIndex(
      checklist => checklist.name === item.name && checklist.note === item.note
    );
    if (index !== -1) {
      this.checklistsArray.removeAt(index);
    }
  }

  saveEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const doc = this.document();
    if (!doc) return;
    const previousAuditTimestamp = this.auditRefresh.getLatestAuditTimestamp(doc);
    const { title, checklists } = this.editForm.value;
    const updates: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: title ?? doc.title,
      [NUXEO_SCHEMA_FIELDS.checklista.checklistesteg]: (checklists ?? []).map(checklist => ({
        namn: checklist.name,
        notering: checklist.note,
        klar: checklist.isChecked,
      })),
    };

    this.isSaving.set(true);
    this.nuxeoApi
      .editDocument(doc.uid, updates)
      .pipe(
        switchMap(() => this.auditRefresh.loadDocumentWithAudit(doc.uid)),
        tap(fullDoc => {
          this.document.set(fullDoc);
          this.auditRefresh
            .refreshAuditAsync(doc.uid, previousAuditTimestamp, updatedDoc => this.document.set(updatedDoc))
            .subscribe();
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CHECKLISTA_UPDATE_SUCCESS_MESSAGE,
          });
          this.isSaving.set(false);
          this.isEditOpen.set(false);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CHECKLISTA_UPDATE_ERROR_MESSAGE,
          });
          this.isSaving.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.columnConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }));
  }

  private resetFormFromDocument(doc: NuxeoDocument): void {
    const title = doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.title] ?? doc.title ?? '';
    this.editForm.patchValue({ title });
    this.checklistsArray.clear();
    const items = doc.properties?.[NUXEO_SCHEMA_FIELDS.checklista.checklistesteg] ?? [];
    items.forEach(item => {
      this.checklistsArray.push(
        new FormGroup({
          name: new FormControl(item.namn ?? '', Validators.required),
          note: new FormControl(item.notering ?? ''),
          isChecked: new FormControl(Boolean(item.klar)),
        })
      );
    });
  }

  private toChecklistRows(value: unknown): ChecklistRow[] {
    const items = Array.isArray(value) ? value : [];
    return items.map((item, index) => ({
      id: `${index}-${item.namn}`,
      name: item.namn ?? '',
      note: item.notering ?? '',
      isChecked: Boolean(item.klar),
    }));
  }
}
