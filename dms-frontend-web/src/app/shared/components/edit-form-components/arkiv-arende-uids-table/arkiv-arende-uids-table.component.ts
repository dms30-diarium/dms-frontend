import { ChangeDetectionStrategy, Component, input, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent } from '../../case-list-table/case-list-table.component';
import { TableColOption } from '../../table-col-options/table-col-options.component';

export interface ArkivArendeUidRow {
  id: string;
  arendeUid: string;
}

@Component({
  selector: 'nuxeo-arkiv-arende-uids-table',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule, CaseListTableComponent],
  templateUrl: './arkiv-arende-uids-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArkivArendeUidsTableComponent {
  isDialogOpen = signal(false);
  tableFields = input.required<WritableSignal<ArkivArendeUidRow[]>>();
  defaultArendeUid = input('');

  form = new FormGroup({
    arendeUid: new FormControl('', [Validators.required]),
  });

  columnConfig = [{ label: 'Arende Uids', key: 'arendeUid', visible: true, tableName: 'arkivArendeUids' }];

  openDialog() {
    this.form.reset({
      arendeUid: this.defaultArendeUid(),
    });
    this.isDialogOpen.set(true);
  }

  addArendeUid() {
    if (this.form.invalid) {
      return;
    }

    const arendeUid = this.form.value.arendeUid ?? '';
    if (!arendeUid.trim()) {
      return;
    }

    const nextEntry: ArkivArendeUidRow = {
      id: crypto.randomUUID(),
      arendeUid,
    };

    this.tableFields().update(currentEntries => [...currentEntries, nextEntry]);
    this.isDialogOpen.set(false);
  }

  removeArendeUid(entry: ArkivArendeUidRow) {
    this.tableFields().update(currentEntries => currentEntries.filter(currentEntry => currentEntry.id !== entry.id));
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.columnConfig.map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: true,
    }));
  }
}
