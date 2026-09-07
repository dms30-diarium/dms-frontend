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
import { EMPTY, catchError, finalize, of, switchMap, tap } from 'rxjs';

import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { NuxeoApiService, SendCaseEmailPayload } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FormSectionTitleComponent } from '../form-section-title/form-section-title.component';
import { SelectHandlingsComponent } from '../select-handlings/select-handlings.component';
import { AccordionCopyComponent } from '../accordion-copy/accordion-copy.component';
import {
  buildInvalidEmailMessage,
  DELIVER_PUBLIC_DOCS_RECIPIENT_REQUIRED_MESSAGE,
  DELIVER_PUBLIC_DOCS_SENT_MESSAGE,
  DELIVER_PUBLIC_DOCS_TEMPLATE_LOAD_ERROR_MESSAGE,
  DELIVER_PUBLIC_DOCS_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { findInvalidEmails, parseEmails, pickFirstString } from '../email-form-helpers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-deliver-public-docs-form',
  standalone: true,
  imports: [GeneralFormComponent, DigiButton, DigiArbetsformedlingenAngularModule],
  templateUrl: './deliver-public-docs-form.component.html',
})
export class DeliverPublicDocsFormComponent implements OnInit {
  @ViewChild(GeneralFormComponent) generalForm!: GeneralFormComponent;

  caseId = input.required<string>();

  closeDialog = output<void>();
  emailSent = output<void>();

  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);

  handlingTypeOptions = signal<Option[]>([]);
  templateOptions = signal<Option[]>([]);
  attachedFileIds = signal<string[]>([]);
  isSubmitting = signal(false);
  copyRecipients = signal<Record<string, string>>({});

  emailFormConfig = signal<FieldConfig[]>([]);

  constructor() {
    effect(() => {
      this.emailFormConfig.set([
        {
          type: 'component',
          name: 'mailSection',
          label: 'E-post',
          class: FormSectionTitleComponent,
          props: { title: 'E-post' },
        },
        {
          type: 'input',
          name: 'recipients',
          label: 'Mottagare',
          placeholder: 'Ange e-postadresser separerade med kommatecken',
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

        { type: 'input', name: 'subject', label: 'Ämne', validators: [Validators.required] },
        {
          type: 'richtext',
          name: 'mailBody',
          label: 'Meddelande',
          placeholder: 'Text hämtas från vald mall och kan redigeras innan skickning.',
          defaultValue: null,
        },
        {
          type: 'component',
          name: 'handlingsList',
          class: SelectHandlingsComponent,
          props: { caseId: this.caseId(), formChange: (event: string[]) => this.updateSelectedFiles(event) },
        },
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

  handleFormResult(result: Record<string, string>) {
    const recipients = parseEmails(result['recipients']);
    const ccRecipients = this.copyRecipients()['ccRecipients'] ? [this.copyRecipients()['ccRecipients']] : [];
    const bccRecipients = this.copyRecipients()['bccRecipients'] ? [this.copyRecipients()['bccRecipients']] : [];
    const template = this.templateOptions().filter(
      templateOption => templateOption.label === 'Utlämning av allmän handling'
    )?.[0]?.id;
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
    };

    if (payload.recipients.length === 0) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: DELIVER_PUBLIC_DOCS_RECIPIENT_REQUIRED_MESSAGE,
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
        tap(() => {
          this.store.notification.set({ show: true, variation: 'success', text: DELIVER_PUBLIC_DOCS_SENT_MESSAGE });
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
      this.loadTemplateBody(selectionChanged.selectedValue);
    }
  }

  private copyRecipientsChange(event: Record<string, string>) {
    this.copyRecipients.set(event);
  }

  private loadTemplateBody(templateId: string | null) {
    this.setMailBody('');
    this.setSubject('');
    if (!templateId) return;

    this.nuxeoApi
      .getRenderedMailTemplate(templateId, this.caseId())
      .pipe(
        switchMap(rendered => {
          const renderedBody = rendered?.content ?? '';
          const renderedSubject = rendered?.subject ?? '';

          if (renderedSubject) this.setSubject(renderedSubject);
          if (renderedBody) {
            this.setMailBody(renderedBody);
            return of(null);
          }

          return this.loadTemplateFromDocument(templateId);
        }),
        catchError(err => {
          console.error('Failed to render template, falling back to raw document', err);
          return this.loadTemplateFromDocument(templateId);
        })
      )
      .subscribe({
        error: err => {
          console.error('Failed to load template body', err);
          this.setMailBody('');
          this.setSubject('');
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DELIVER_PUBLIC_DOCS_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE,
          });
        },
      });
  }

  private setMailBody(value: string) {
    const control = this.generalForm?.form?.get('mailBody');
    control?.setValue(value ?? '');
  }

  private setSubject(value: string) {
    const control = this.generalForm?.form?.get('subject');
    control?.setValue(value ?? '');
  }

  private loadTemplateFromDocument(templateId: string) {
    return this.nuxeoApi.getDocumentById(templateId, true).pipe(
      tap(doc => {
        const props = doc?.properties as Record<string, unknown> | undefined;
        const body =
          pickFirstString(
            props,
            NUXEO_SCHEMA_FIELDS.note.note,
            NUXEO_SCHEMA_FIELDS.mail.body,
            NUXEO_SCHEMA_FIELDS.mail.template,
            NUXEO_SCHEMA_FIELDS.mail.content,
            'dms_mail:body',
            NUXEO_SCHEMA_FIELDS.dc.description
          ) ?? '';
        const subject = pickFirstString(props, NUXEO_SCHEMA_FIELDS.mail.subject, NUXEO_SCHEMA_FIELDS.dc.title) ?? '';
        if (body) this.setMailBody(body);
        if (subject) this.setSubject(subject);
      }),
      catchError(docErr => {
        console.error('Failed to load template document', docErr);
        this.setMailBody('');
        this.setSubject('');
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: DELIVER_PUBLIC_DOCS_TEMPLATE_LOAD_ERROR_MESSAGE,
        });
        return EMPTY;
      })
    );
  }

  private looksLikeUrl(value: string): boolean {
    return /^https?:\/\//i.test(value ?? '');
  }

  private loadDirectoryOptions() {
    this.nuxeoApi
      .getMailTemplates()
      .pipe(
        tap(result => {
          const templateOptions =
            result.entries?.map(entry => ({ id: entry.uid ?? entry.title, label: entry.title ?? entry.uid })) ?? [];

          this.templateOptions.set(templateOptions);
        })
      )
      .subscribe();

    this.nuxeoApi
      .getHandlingTypes()
      .pipe(
        tap(result => {
          const handlingTypeOptions =
            result.entries?.map(entry => ({ id: entry.uid ?? entry.title, label: entry.title ?? entry.uid })) ?? [];
          const handlingTypeFallback = handlingTypeOptions.length
            ? handlingTypeOptions
            : [{ id: 'none', label: 'Ingen handlingstyp tillgänglig' }];
          this.handlingTypeOptions.set(handlingTypeFallback);
        })
      )
      .subscribe();
  }
}
