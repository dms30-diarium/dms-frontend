import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, input, output, signal } from '@angular/core';

import { Validators } from '@angular/forms';
import { DigiButton, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { EMPTY, catchError, finalize, of, switchMap, tap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { findInvalidEmails, parseEmails } from '../email-form-helpers';
import { NuxeoApiService, SendCaseEmailPayload } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { AccordionCopyComponent } from '../accordion-copy/accordion-copy.component';
import {
  buildInvalidEmailMessage,
  EXPEDIT_HANDLING_RECIPIENT_REQUIRED_MESSAGE,
  EXPEDIT_HANDLING_SENT_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Component({
  selector: 'nuxeo-expedit-handling',
  standalone: true,
  imports: [GeneralFormComponent, DigiButton, DigiArbetsformedlingenAngularModule],
  templateUrl: './expedit-handling.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpeditHandlingComponent implements OnInit {
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  caseId = input.required<string>();
  document = input.required<NuxeoDocument<HandlingExtendedProperties>>();

  closeDialog = output<void>();
  emailSent = output<void>();

  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  copyRecipients = signal<Record<string, string>>({});
  templateOptions = signal<Option[]>([]);
  defaultTemplate = signal<Option[]>([]);
  isSubmitting = signal(false);
  selectedHandlingFormat = signal<'digital' | 'paper'>('digital');

  emailFormConfig = signal<FieldConfig[]>([]);

  ngOnInit(): void {
    this.buildEmailFormConfig();
    this.loadDirectoryOptions();
  }

  submit(): void {
    this.generalForm?.submit();
  }

  selectedRadioChanged(event: { selectedValue: string; fieldName: string }) {
    if (event.fieldName !== 'handlingFormat') {
      return;
    }

    this.selectedHandlingFormat.set(event.selectedValue === 'paper' ? 'paper' : 'digital');
    this.buildEmailFormConfig();
  }

  private copyRecipientsChange(event: Record<string, string>) {
    this.copyRecipients.set(event);
  }

  handleFormResult(result: {
    recipients?: string;
    replyTo?: string;
    expeditDate?: string;
    handlingFormat?: string;
    template?: Option[];
    subject?: string;
  }) {
    const recipients = parseEmails(result['recipients']);
    const ccRecipients = this.copyRecipients()['ccRecipients'] ? [this.copyRecipients()['ccRecipients']] : [];
    const template = result['template']?.[0]?.id;
    const subject = result['subject'] ?? '';

    const invalidEmails = [...findInvalidEmails(result['recipients']), ...findInvalidEmails(result['replyTo'])];

    const payload: SendCaseEmailPayload = {
      template,
      subject,
      replyTo: parseEmails(result['replyTo']),
      recipients,
      ccRecipients,
      handling: {
        [NUXEO_SCHEMA_FIELDS.handling.expedieradDatum]: result['expeditDate']?.[0],
        [NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats]: result['handlingFormat'],
      },
    };

    if (payload.recipients.length === 0) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: EXPEDIT_HANDLING_RECIPIENT_REQUIRED_MESSAGE,
      });
      return;
    }

    if (invalidEmails.length) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: buildInvalidEmailMessage(invalidEmails),
      });
      return;
    }

    this.isSubmitting.set(true);
    (result['handlingFormat'] !== 'paper' ? this.nuxeoApi.sendCaseEmail(this.document().uid, payload) : of(null))
      .pipe(
        switchMap(() =>
          this.nuxeoApi.editDocument(this.document().uid, {
            [NUXEO_SCHEMA_FIELDS.handling.expedieradDatum]: result['expeditDate']?.[0],
            [NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats]: result['handlingFormat'],
          })
        ),
        tap(() => {
          this.store.notification.set({ show: true, variation: 'success', text: EXPEDIT_HANDLING_SENT_MESSAGE });
          this.emailSent.emit();
          this.closeDialog.emit();
        }),
        catchError(err => {
          const backendMessage =
            err?.error?.message ||
            err?.error?.cause ||
            (typeof err?.error === 'string' ? err.error : '') ||
            err?.message ||
            '';
          console.error('Failed to send email', { err, backendMessage });
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: backendMessage
              ? `Kunde inte skicka e-post: ${backendMessage}`
              : 'Kunde inte skicka e-post. Försök igen.',
          });
          return EMPTY;
        }),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe();
  }

  private loadDirectoryOptions() {
    this.nuxeoApi
      .getMailTemplates()
      .pipe(
        tap(result => {
          const options =
            result.entries?.map(entry => ({
              id: entry.uid ?? entry.title,
              label: entry.title ?? entry.uid,
            })) ?? [];

          this.templateOptions.set(options);
          this.defaultTemplate.set(options.filter(option => option.label === 'Expediera handling'));
          this.buildEmailFormConfig();
        })
      )
      .subscribe();
  }

  private buildEmailFormConfig() {
    const handlingName = this.document().title;

    this.emailFormConfig.set([
      {
        type: 'text',
        name: 'handlingName',
        label: 'Handling',
        defaultValue: handlingName,
      },
      {
        type: 'radio',
        name: 'handlingFormat',
        label: 'Format',
        defaultValue: this.selectedHandlingFormat(),
        options: [
          { label: 'Digital', id: 'digital' },
          { label: 'Papper', id: 'paper' },
        ],
      },
      ...(this.selectedHandlingFormat() === 'digital'
        ? [
            {
              type: 'dropdown-search' as const,
              name: 'template',
              label: 'E-postmall',
              options: this.templateOptions(),
              defaultValue: this.defaultTemplate(),
            },
            {
              type: 'input' as const,
              name: 'subject',
              label: 'Ämne',
              validators: [Validators.required],
            },
          ]
        : []),
      {
        type: 'datepicker',
        name: 'expeditDate',
        label: 'Expediera datum',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'recipients',
        label: 'Mottagare',
        placeholder: '',
        validators: [Validators.required],
      },
      {
        type: 'component',
        name: 'copyRecipients',
        class: AccordionCopyComponent,
        placeholder: 'Separera flera adresser med komma',
        props: {
          formChange: (event: Record<string, string>) => this.copyRecipientsChange(event),
        },
      },
    ]);
  }
}
