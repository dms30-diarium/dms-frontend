import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { Validators } from '@angular/forms';
import { DigiButton, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { EMPTY, catchError, finalize, switchMap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { NuxeoApiService, SendCaseEmailPayload } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FormSectionTitleComponent } from '../form-section-title/form-section-title.component';
import { SelectHandlingsComponent } from '../select-handlings/select-handlings.component';
import {
  buildInvalidEmailMessage,
  EMAIL_FORM_RECIPIENT_REQUIRED_MESSAGE,
  EMAIL_FORM_SENT_MESSAGE,
  EMAIL_FORM_TEMPLATE_LOAD_ERROR_MESSAGE,
  EMAIL_FORM_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import {
  EmailTemplateLoadDeps,
  findInvalidEmails,
  getEmailOptionId,
  loadEmailTemplateBody,
  parseEmails,
} from '../email-form-helpers';

interface SendEmailFormResult {
  recipients?: string;
  ccRecipients?: string;
  bccRecipients?: string;
  template?: Option[];
  mailBody?: string;
  subject?: string;
  replyTo?: string;
  handlingName?: string;
  handlingType?: string;
  handlingRiktning?: string;
  incomingDate?: string;
  createdDate?: string;
  secret?: string;
  uppratta?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-send-email-form',
  standalone: true,
  imports: [GeneralFormComponent, DigiButton, DigiArbetsformedlingenAngularModule],
  templateUrl: './send-email-form.component.html',
})
export class SendEmailFormComponent implements OnInit {
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  caseId = input.required<string>();
  templateFilter = input<string>('');

  closeDialog = output<void>();
  emailSent = output<void>();

  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);

  handlingTypeOptions = signal<Option[]>([]);
  riktningOptions = signal<Option[]>([]);
  secretOptions = signal<Option[]>([]);
  templateOptions = signal<Option[]>([]);
  attachedFileIds = signal<string[]>([]);
  isSubmitting = signal(false);
  shouldUppratta = signal(true);

  emailFormConfig = signal<FieldConfig[]>([]);

  constructor() {
    effect(() => {
      const filter = this.templateFilter();
      const defaultTemplates = this.templateOptions().filter(templateOption =>
        filter
          ? templateOption.label.toLowerCase().includes(filter.toLowerCase())
          : templateOption.label === 'Skicka e-post'
      );
      if (defaultTemplates.length) {
        loadEmailTemplateBody(defaultTemplates[0].id, this.templateDeps());
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
          defaultValue: defaultTemplates,
        },
        { type: 'input', name: 'subject', label: 'Ämne', validators: [Validators.required] },
        {
          type: 'richtext',
          name: 'mailBody',
          label: 'Meddelande',
          placeholder: 'Text hämtas från vald mall och kan redigeras innan skickning.',
          defaultValue: null,
          validators: [Validators.required],
        },
        {
          type: 'component',
          name: 'handlingsList',
          class: SelectHandlingsComponent,
          props: { caseId: this.caseId(), formChange: (event: string[]) => this.updateSelectedFiles(event) },
        },
        {
          type: 'input',
          name: 'recipients',
          label: 'Mottagare',
          placeholder: 'Ange e-postadresser separerade med kommatecken',
          validators: [Validators.required],
        },
        { type: 'input', name: 'ccRecipients', label: 'Kopia (CC)', placeholder: 'Separera flera adresser med komma' },
        {
          type: 'input',
          name: 'bccRecipients',
          label: 'Hemlig kopia (BCC)',
          placeholder: 'Separera flera adresser med komma',
        },
        { type: 'input', name: 'replyTo', label: 'Svara till' },
      ]);
    });
  }

  ngOnInit(): void {
    this.loadDirectoryOptions();
  }

  updateSelectedFiles(fileIds: string[]) {
    this.attachedFileIds.set(fileIds);
  }

  submit(): void {
    this.generalForm?.submit();
  }

  handleFormResult(result: SendEmailFormResult) {
    const recipients = parseEmails(result['recipients']);
    const ccRecipients = parseEmails(result['ccRecipients']);
    const bccRecipients = parseEmails(result['bccRecipients']);
    const handlingName = result['handlingName'] ?? '';
    const handlingType = getEmailOptionId(result['handlingType']);
    const handlingRiktning = getEmailOptionId(result['handlingRiktning']);
    const incomingDate = result['incomingDate'] ? new Date(result['incomingDate']).toISOString() : '';
    const createdDate = result['createdDate'] ? new Date(result['createdDate']).toISOString() : '';
    const secret = getEmailOptionId(result['secret']);
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
      attachedHandlingar: this.attachedFileIds(),
      handling: {
        [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: handlingName,
        [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: handlingType,
        [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: handlingRiktning,
        [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]: incomingDate || undefined,
        [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]: createdDate || undefined,
        [NUXEO_SCHEMA_FIELDS.handling.sekretess]: secret,
        [NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]: 'true',
        [NUXEO_SCHEMA_FIELDS.handling.avsandare]: [],
        [NUXEO_SCHEMA_FIELDS.handling.mottagare]: [],
      },
    };

    if (payload.recipients.length === 0) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: EMAIL_FORM_RECIPIENT_REQUIRED_MESSAGE,
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
      .sendCaseEmail(this.caseId(), payload)
      .pipe(
        switchMap(() => {
          if (result.uppratta) {
            const notePayload = {
              input: this.caseId(),
              params: {
                arende: this.caseId(),
                handling: {
                  [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: handlingName,
                  [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]: new Date(),
                },
                anteckning: '',
              },
              context: {},
            };
            return this.nuxeoApi.createHandlingFromNote(notePayload);
          }
          return EMPTY;
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
      .subscribe(() => {
        this.store.notification.set({ show: true, variation: 'success', text: EMAIL_FORM_SENT_MESSAGE });
        this.emailSent.emit();
        this.closeDialog.emit();
      });
  }

  onDropdownChanged(selectionChanged: { selectedValue: string; fieldName: string }) {
    if (selectionChanged.fieldName === 'template') {
      loadEmailTemplateBody(selectionChanged.selectedValue, this.templateDeps());
    }
  }

  changeForm(event: Partial<SendEmailFormResult>) {
    this.shouldUppratta.set(!!event.uppratta);
  }

  private templateDeps(): EmailTemplateLoadDeps {
    return {
      nuxeoApi: this.nuxeoApi,
      caseId: this.caseId(),
      store: this.store,
      setMailBody: v => this.setMailBody(v),
      setSubject: v => this.setSubject(v),
      subjectKeys: [NUXEO_SCHEMA_FIELDS.epostmall.amne, NUXEO_SCHEMA_FIELDS.dc.title],
      templateTextErrorMsg: EMAIL_FORM_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE,
      templateLoadErrorMsg: EMAIL_FORM_TEMPLATE_LOAD_ERROR_MESSAGE,
    };
  }

  private setMailBody(value: string) {
    this.generalForm?.form?.get('mailBody')?.setValue(value ?? '');
  }

  private setSubject(value: string) {
    this.generalForm?.form?.get('subject')?.setValue(value ?? '');
  }

  private loadDirectoryOptions() {
    this.nuxeoApi.getMailTemplates().subscribe(result => {
      const templateOptions =
        result.entries?.map(entry => ({ id: entry.uid ?? entry.title, label: entry.title ?? entry.uid })) ?? [];
      this.templateOptions.set(templateOptions);
    });

    this.nuxeoApi.getDirectorySuggestions('Riktning').subscribe(options => {
      this.riktningOptions.set(options.map(option => ({ id: option.id, label: option.displayLabel })));
    });

    this.nuxeoApi.getDirectorySuggestions('Sekretess').subscribe(options => {
      this.secretOptions.set(options.map(option => ({ id: option.id, label: option.displayLabel })));
    });

    this.nuxeoApi.getHandlingTypes().subscribe(result => {
      const handlingTypeOptions =
        result.entries?.map(entry => ({ id: entry.uid ?? entry.title, label: entry.title ?? entry.uid })) ?? [];
      const handlingTypeFallback = handlingTypeOptions.length
        ? handlingTypeOptions
        : [{ id: 'none', label: 'Ingen handlingstyp tillgänglig' }];
      this.handlingTypeOptions.set(handlingTypeFallback);
    });
  }
}
