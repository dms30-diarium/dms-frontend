import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { Validators } from '@angular/forms';
import { DigiButton, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { NuxeoApiService, SendCaseEmailPayload } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { ArendeExtendedProperties, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { FormSectionTitleComponent } from '../form-section-title/form-section-title.component';
import {
  buildInvalidEmailMessage,
  REQUEST_COMPLETION_RECIPIENT_REQUIRED_MESSAGE,
  REQUEST_COMPLETION_SENT_MESSAGE,
  REQUEST_COMPLETION_TEMPLATE_LOAD_ERROR_MESSAGE,
  REQUEST_COMPLETION_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { EmailTemplateLoadDeps, findInvalidEmails, loadEmailTemplateBody, parseEmails } from '../email-form-helpers';

@Component({
  selector: 'nuxeo-request-completion-email-form',
  standalone: true,
  imports: [GeneralFormComponent, DigiButton, DigiArbetsformedlingenAngularModule],
  templateUrl: './request-completion-email-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestCompletionEmailFormComponent implements OnInit {
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  caseId = input.required<string>();
  document = input.required<NuxeoDocument<HandlingExtendedProperties | ArendeExtendedProperties>>();

  closeDialog = output<void>();
  emailSent = output<void>();

  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);

  templateOptions = signal<Option[]>([]);
  isSubmitting = signal(false);
  isSecretHandling = signal(false);

  emailFormConfig = signal<FieldConfig[]>([]);

  constructor() {
    effect(() => {
      const defaultTemplate = this.templateOptions().filter(el => el.label.toLowerCase().includes('komplettering'));
      if (defaultTemplate) {
        loadEmailTemplateBody(defaultTemplate[0]?.id, this.templateDeps());
      }
      this.emailFormConfig.set([
        {
          type: 'component',
          name: 'mailSection',
          label: 'E-post',
          class: FormSectionTitleComponent,
          props: { title: 'E-post' },
        },
        {
          type: 'dropdown-search',
          name: 'template',
          label: 'E-postmall',
          options: this.templateOptions(),
          defaultValue: defaultTemplate,
        },
        { type: 'input', name: 'subject', label: 'Ämne', validators: [Validators.required] },
        {
          type: 'richtext',
          name: 'mailBody',
          label: 'Meddelande',
          placeholder: '',
          defaultValue: null,
          validators: [Validators.required],
          props: { readonly: false },
        },
        ...(this.document().type === 'Handling'
          ? [
              {
                type: 'checkbox' as const,
                name: 'attachFiles',
                label: 'Bifoga filer',
                defaultValue: true,
              },
            ]
          : []),
        {
          type: 'input',
          name: 'recipients',
          label: 'Mottagare',
          placeholder: '',
          validators: [Validators.required],
        },
        { type: 'input', name: 'ccRecipients', label: 'Kopia (CC)', placeholder: '' },
        {
          type: 'input',
          name: 'bccRecipients',
          label: 'Hemlig kopia (BCC)',
          placeholder: '',
        },
        { type: 'input', name: 'replyTo', label: 'Svara till' },
      ]);
    });
  }

  ngOnInit(): void {
    const doc = this.document();

    if (this.isHandling(doc)) {
      const secretess = doc.properties[NUXEO_SCHEMA_FIELDS.handling.sekretess]?.id;
      const isSecret =
        secretess === NUXEO_VOCAB_IDS.sekretess.svagSekretess || secretess === NUXEO_VOCAB_IDS.sekretess.starkSekretess;
      this.isSecretHandling.set(isSecret);
      if (isSecret) {
        this.emailFormConfig.update(config => config.filter(el => el.name !== 'attachFiles'));
      }
    }

    this.loadDirectoryOptions();
    this.prefillFromDocument();
  }

  isHandling(
    doc: NuxeoDocument<HandlingExtendedProperties | ArendeExtendedProperties>
  ): doc is NuxeoDocument<HandlingExtendedProperties> {
    return NUXEO_SCHEMA_FIELDS.handling.sekretess in doc.properties;
  }

  isArende(
    doc: NuxeoDocument<HandlingExtendedProperties | ArendeExtendedProperties>
  ): doc is NuxeoDocument<ArendeExtendedProperties> {
    return NUXEO_SCHEMA_FIELDS.arende.sekretess in doc.properties;
  }

  submit(): void {
    this.generalForm?.submit();
  }

  handleFormResult(result: {
    recipients?: string;
    ccRecipients?: string;
    bccRecipients?: string;
    template?: Option[];
    mailBody?: string;
    attachFiles?: boolean;
    subject?: string;
    replyTo?: string;
  }) {
    const recipients = parseEmails(result['recipients']);
    const ccRecipients = parseEmails(result['ccRecipients']);
    const bccRecipients = parseEmails(result['bccRecipients']);
    const template = result['template']?.[0]?.id;
    const mailBody = result['mailBody'] ?? '';
    const subject = result['subject'] ?? '';

    const invalidEmails = [
      ...findInvalidEmails(result['recipients']),
      ...findInvalidEmails(result['ccRecipients']),
      ...findInvalidEmails(result['bccRecipients']),
      ...findInvalidEmails(result['replyTo']),
    ];

    const payload: SendCaseEmailPayload = {
      template,
      replyTo: parseEmails(result['replyTo']),
      recipients,
      ccRecipients,
      bccRecipients,
      subject,
      templateContent: mailBody,
      body: mailBody,
      attachments: [],
      attachHandling: this.isSecretHandling() ? false : result.attachFiles,
    };

    if (payload.recipients.length === 0) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: REQUEST_COMPLETION_RECIPIENT_REQUIRED_MESSAGE,
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
    this.nuxeoApi
      .sendCaseEmail(this.document().uid, payload)
      .pipe(
        tap(() => {
          this.store.notification.set({ show: true, variation: 'success', text: REQUEST_COMPLETION_SENT_MESSAGE });
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

  onDropdownChanged(selectionChanged: { selectedValue: string; fieldName: string }) {
    if (selectionChanged.fieldName === 'template') {
      loadEmailTemplateBody(selectionChanged.selectedValue, this.templateDeps());
    }
  }

  private templateDeps(): EmailTemplateLoadDeps {
    return {
      nuxeoApi: this.nuxeoApi,
      caseId: this.caseId(),
      store: this.store,
      setMailBody: v => this.setMailBody(v),
      setSubject: v => this.setSubject(v),
      subjectKeys: [NUXEO_SCHEMA_FIELDS.mail.subject, NUXEO_SCHEMA_FIELDS.dc.title],
      templateTextErrorMsg: REQUEST_COMPLETION_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE,
      templateLoadErrorMsg: REQUEST_COMPLETION_TEMPLATE_LOAD_ERROR_MESSAGE,
    };
  }

  private prefillFromDocument() {
    const doc = this.document();
    const props = doc.properties ?? {};
    const senderProp = props[NUXEO_SCHEMA_FIELDS.handling.avsandare] ?? props[NUXEO_SCHEMA_FIELDS.arende.arendepart];
    const recipientsProp =
      props[NUXEO_SCHEMA_FIELDS.handling.mottagare] ?? props[NUXEO_SCHEMA_FIELDS.arende.mottagare] ?? [];

    const extractContactValue = (rawContact: unknown): string => {
      if (!rawContact) return '';
      if (typeof rawContact === 'string') return rawContact;
      if (typeof rawContact === 'object') {
        const contact = rawContact as { email?: unknown; namn?: unknown; title?: unknown };
        const email = typeof contact.email === 'string' ? contact.email : undefined;
        const name = typeof contact.namn === 'string' ? contact.namn : undefined;
        const title = typeof contact.title === 'string' ? contact.title : undefined;
        return email || name || title || '';
      }
      return '';
    };

    const recipientsArr = Array.isArray(recipientsProp) ? recipientsProp : [recipientsProp];
    const recipientsStr = recipientsArr.map(extractContactValue).filter(Boolean).join(', ');

    const senderArr = Array.isArray(senderProp) ? senderProp : [senderProp];
    const senderStr = senderArr.map(extractContactValue).filter(Boolean).join(', ');

    this.emailFormConfig.update(config =>
      config.map(field => {
        if (field.name === 'recipients') {
          return { ...field, defaultValue: recipientsStr };
        }
        if (field.name === 'replyTo') {
          return { ...field, defaultValue: senderStr };
        }
        return field;
      })
    );
  }

  private setMailBody(value: string) {
    this.generalForm?.form?.get('mailBody')?.setValue(value ?? '');
  }

  private setSubject(value: string) {
    const control = this.generalForm?.form?.get('subject');
    const rawSubject = (value ?? '').toString().trim();

    const props = this.document().properties ?? {};
    const handlingNumberRaw =
      props[NUXEO_SCHEMA_FIELDS.handling.handlingsnummer] || props[NUXEO_SCHEMA_FIELDS.handling.arendenummer];
    const caseNumberRaw = props[NUXEO_SCHEMA_FIELDS.arende.arendenummer];
    const idNumber = (handlingNumberRaw ?? caseNumberRaw)?.toString().trim();

    let subject = rawSubject;

    if (idNumber) {
      const prefix = `${idNumber} - `;
      if (!rawSubject) {
        subject = idNumber;
      } else if (!rawSubject.startsWith(prefix)) {
        subject = `${prefix}${rawSubject}`;
      }
    }

    control?.setValue(subject);
  }

  private loadDirectoryOptions() {
    this.nuxeoApi
      .getMailTemplates()
      .pipe(
        tap(result => {
          const opts =
            result.entries?.map(entry => ({
              id: entry.uid ?? entry.title,
              label: entry.title ?? entry.uid,
            })) ?? [];
          this.templateOptions.set(opts);
        })
      )
      .subscribe();
  }
}
