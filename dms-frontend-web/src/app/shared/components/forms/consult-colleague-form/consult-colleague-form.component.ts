import { ChangeDetectionStrategy, Component, inject, input, output, signal, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule, DigiButton } from '@designsystem-se/af-angular';
import { EMPTY, catchError, finalize, tap } from 'rxjs';

import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import {
  EXTERNAL_SHARE_ERROR_PREFIX,
  EXTERNAL_SHARE_MISSING_FIELDS_MESSAGE,
  EXTERNAL_SHARE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-consult-colleague-form',
  standalone: true,
  imports: [GeneralFormComponent, DigiButton, DigiArbetsformedlingenAngularModule],
  templateUrl: './consult-colleague-form.component.html',
})
export class ConsultColleagueFormComponent {
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  documentId = input.required<string>();

  closeDialog = output<void>();
  formSubmitted = output<Record<string, unknown>>();

  private readonly store = inject(GeneralStore);
  private readonly nuxeoApi = inject(NuxeoApiService);

  isSubmitting = signal(false);

  consultFormConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'email',
      label: 'E-post',
      placeholder: 'name@company.com',
      validators: [Validators.required, Validators.email],
    },
    {
      type: 'dropdown',
      name: 'right',
      label: 'Behörighet att',
      options: [
        { id: 'Read', label: 'Läsa' },
        { id: 'ReadWrite', label: 'Skriva' },
        { id: 'Everything', label: 'Full behörighet' },
      ],
      defaultValue: 'Read',
    },
    {
      type: 'datepicker',
      name: 'from',
      label: 'Från',
    },
    {
      type: 'datepicker',
      name: 'to',
      label: 'Till',
      validators: [Validators.required],
    },
    {
      type: 'textarea',
      name: 'notificationEmail',
      label: 'Kommentar för e-post meddelandet',
      placeholder: 'Hi! Could you comment on this document and...',
    },
  ]);

  submit(): void {
    this.generalForm?.submit();
  }

  handleFormResult(formValues: {
    email?: string;
    right?: string;
    from?: string;
    to?: string;
    notificationEmail?: string;
  }) {
    const recipientEmail = formValues?.email?.trim() ?? '';
    const permission = this.getPermission(formValues['right']);
    const startDateIso = this.toStartOfDayIso(formValues['from']);
    const endDateIso = this.toEndOfDayIso(formValues['to']);
    const notificationMessage = formValues?.notificationEmail?.trim() ?? '';

    if (!recipientEmail || !endDateIso) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: EXTERNAL_SHARE_MISSING_FIELDS_MESSAGE,
      });
      return;
    }

    this.isSubmitting.set(true);

    this.nuxeoApi
      .shareDocumentWithExternalUser(this.documentId(), {
        email: recipientEmail,
        permission,
        begin: startDateIso,
        end: endDateIso,
        notify: true,
        comment: notificationMessage,
        invalid: false,
      })
      .pipe(
        tap(() => {
          this.formSubmitted.emit(formValues);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: EXTERNAL_SHARE_SUCCESS_MESSAGE,
          });
          this.closeDialog.emit();
        }),
        catchError(err => {
          const backendMessage =
            err?.error?.message ||
            err?.error?.cause ||
            (typeof err?.error === 'string' ? err.error : '') ||
            err?.message ||
            '';
          console.error('Failed to share document with external user', { err, backendMessage });
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: backendMessage
              ? `${EXTERNAL_SHARE_ERROR_PREFIX}: ${backendMessage}`
              : `${EXTERNAL_SHARE_ERROR_PREFIX}. Försök igen.`,
          });
          return EMPTY;
        }),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe();
  }

  private getPermission(permissionValue: unknown): string {
    if (!permissionValue) return 'Read';
    if (typeof permissionValue === 'string') return permissionValue;
    if (typeof permissionValue === 'object') {
      const obj = permissionValue as { id?: string; label?: string };
      return obj.id ?? obj.label ?? 'Read';
    }
    return 'Read';
  }

  // duplicated code
  private toStartOfDayIso(rawDate: unknown): string | null {
    if (!rawDate) return null;
    const date = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
    if (Number.isNaN(date.getTime())) return null;
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate.toISOString();
  }

  private toEndOfDayIso(rawDate: unknown): string | null {
    if (!rawDate) return null;
    const date = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
    if (Number.isNaN(date.getTime())) return null;
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);
    return normalizedDate.toISOString();
  }
}
