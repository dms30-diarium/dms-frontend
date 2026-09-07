import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { DigiButton, DigiDialog } from '@designsystem-se/af-angular';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { catchError, EMPTY, tap } from 'rxjs';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  CREATE_CHECKLIST_ERROR_MESSAGE,
  CREATE_CHECKLIST_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-create-checklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DigiArbetsformedlingenAngularModule, DigiButton, DigiDialog, CaseListTableComponent],
  templateUrl: './create-checklist.component.html',
})
export class CreateChecklistComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  private store = inject(GeneralStore);
  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();

  isDialogOpen = signal(false);
  isEdit = signal(false);
  editedIndex = signal<number | null>(null);
  defaultPayload: NuxeoDocument | null = null;

  form = new FormGroup({
    checklistTitle: new FormControl(''),
    checklists: new FormArray<FormGroup>([]),
  });

  dialogForm = new FormGroup({
    name: new FormControl('', Validators.required),
    isChecked: new FormControl(false),
    note: new FormControl(''),
  });

  columnOptions: TableColumn[] = [
    { label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn', key: 'name', visible: true },
    {
      label: this.store.getValue('label.ui.schema.checklista.checklistepunkt.klar') ?? 'Klar',
      key: 'isChecked',
      visible: true,
    },
    { label: 'Notefering', key: 'note', visible: true },
  ].map(col => ({ ...col, tableName: 'ASD' }));

  get checklistsArray(): FormArray {
    return this.form.get('checklists') as FormArray;
  }
  ngOnInit() {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Checklista')
      .pipe(
        tap(result => {
          this.defaultPayload = result;
        })
      )
      .subscribe();
  }

  deleteItem(item: { name: string }) {
    const index = this.checklistsArray.value.findIndex((el: { name: string }) => el.name === item.name);
    if (index !== -1) {
      this.checklistsArray.removeAt(index);
    }
  }
  editItem(item: { name: string }) {
    this.isEdit.set(true);
    this.isDialogOpen.set(true);
    const index = this.checklistsArray.value.findIndex((el: { name: string }) => el.name === item.name);
    this.editedIndex.set(index !== -1 ? index : null);
    this.dialogForm.patchValue(item);
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.columnOptions.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }));
  }
  addToTheTable() {
    if (this.dialogForm.invalid) return;

    if (this.isEdit()) {
      const index = this.editedIndex();
      const group = this.checklistsArray.at(index!);

      group.patchValue({
        name: this.dialogForm.value.name,
        isChecked: this.dialogForm.value.isChecked,
        note: this.dialogForm.value.note,
      });
    } else {
      this.checklistsArray.push(
        new FormGroup({
          name: new FormControl(this.dialogForm.value.name),
          isChecked: new FormControl(!!this.dialogForm.value.isChecked),
          note: new FormControl(this.dialogForm.value.note),
        })
      );
    }

    this.dialogForm.reset();
    this.isDialogOpen.set(false);
  }

  submit() {
    const { checklistTitle, checklists } = this.form.value;
    if (!this.defaultPayload || !checklistTitle) {
      throw Error('Payload is needed for creating documents');
    }
    const fullPayload = {
      ...this.defaultPayload,
      name: checklistTitle,
      properties: {
        ...this.defaultPayload?.properties,
        [NUXEO_SCHEMA_FIELDS.dc.title]: checklistTitle,
        [NUXEO_SCHEMA_FIELDS.checklista.checklistesteg]: checklists?.map(el => ({
          namn: el.name,
          notering: el.note,
          klar: el.isChecked,
        })),
      },
    };
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(result => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CREATE_CHECKLIST_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
        }),
        catchError(err => {
          console.error('Error during Beslut creation:', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CREATE_CHECKLIST_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        })
      )
      .subscribe();
  }
}
