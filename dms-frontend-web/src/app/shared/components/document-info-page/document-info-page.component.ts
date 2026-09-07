import { ChangeDetectionStrategy, Component, computed, input, output, ViewChild } from '@angular/core';

import { DigiButton, DigiDialog } from '@designsystem-se/af-angular';

import { AuditEntry } from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
export interface InfoItem {
  label: string;
  value: unknown;
  preserveWhitespace?: boolean;
}

@Component({
  selector: 'nuxeo-document-info-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavigationBreadComponent, GeneralFormComponent, DigiButton, DigiDialog],
  templateUrl: './document-info-page.component.html',
})
export class DocumentInfoPageComponent {
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;
  docId = input<string>('');
  title = input<string>('');
  subtitle = input<string>('');
  statusTitle = input<string>('Status');
  detailTitle = input<string>('');
  statusItems = input<InfoItem[]>([]);
  detailItems = input<InfoItem[]>([]);
  auditEntries = input<AuditEntry[]>([]);

  showEdit = input<boolean>(true);
  editLabel = input<string>('Redigera');
  editDialogHeading = input<string>('Redigera');
  editConfig = input<FieldConfig[]>([]);
  isEditOpen = input<boolean>(false);
  isSaving = input<boolean>(false);

  editOpen = output();
  editClose = output();
  formResult = output<Record<string, unknown>>();

  hasAuditEntries = computed(() => (this.auditEntries() ?? []).length > 0);

  submitEdit(): void {
    this.generalForm?.submit();
  }

  getAuditLabel(entry: AuditEntry): string {
    return entry.eventId ?? '';
  }

  getAuditTime(entry: AuditEntry): string {
    return formatDateOrMissing(entry.eventDate ?? entry.logDate);
  }
}
