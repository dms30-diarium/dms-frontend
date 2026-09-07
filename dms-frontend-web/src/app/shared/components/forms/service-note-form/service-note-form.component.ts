import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule, DigiButton, DigiLoaderSpinner } from '@designsystem-se/af-angular';
import { CreateHandlingFromNotePayload, NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { ArendeExtendedProperties, ContactEntry, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { AuthService } from '@app/core/services/auth.service';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import {
  SERVICE_NOTE_SAVE_ERROR_MESSAGE,
  SERVICE_NOTE_SAVED_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

interface ContactDetails {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  organization: string | null;
}

@Component({
  selector: 'nuxeo-service-note-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DigiButton,
    DigiLoaderSpinner,
    DigiArbetsformedlingenAngularModule,
    AngularEditorModule,
  ],
  templateUrl: './service-note-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceNoteFormComponent implements OnInit {
  casePath = input.required<string>();
  noteDocumentId = input<string | null>(null);
  caseNumber = input<string | null>(null);
  caseDocument = input<NuxeoDocument<ArendeExtendedProperties> | null>(null);

  closeDialog = output<void>();
  handlingCreated = output<NuxeoDocument>();

  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly auth = inject(AuthService);

  private noteRequiredValidator = (control: AbstractControl): ValidationErrors | null => {
    const rawValue = control.value ?? '';
    const plainText = this.stripHtml(String(rawValue)).trim();
    return plainText ? null : { required: true };
  };

  noteControl = new FormControl('', { nonNullable: true, validators: [this.noteRequiredValidator] });
  isSubmitting = signal(false);
  readonly todayDisplay = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  userFullName = signal('');
  userInitials = signal('');
  userCompany = signal<string | null>(null);
  userLogoUrl = signal<string | null>(null);
  private readonly primaryContact = computed(() => this.extractPrimaryContact(this.caseDocument()));
  footerAddress = computed(() => this.extractAddress(this.caseDocument(), this.primaryContact()));
  contactEmail = computed(() => this.primaryContact()?.email ?? '');
  contactPhone = computed(() => this.primaryContact()?.phone ?? '');
  caseDocumentTitle = computed(() => this.caseDocument()?.title ?? '');
  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '200px',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    placeholder: '',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    defaultParagraphSeparator: 'p',
    defaultFontName: '',
    defaultFontSize: '',
    toolbarPosition: 'top',
    sanitize: true,
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' },
    ],
    customClasses: [
      { name: 'quote', class: 'quote' },
      { name: 'redText', class: 'redText' },
      { name: 'titleText', class: 'titleText', tag: 'h1' },
    ],
    toolbarHiddenButtons: [['insertImage', 'insertVideo', 'toggleEditorMode']],
  };

  ngOnInit(): void {
    this.populateUserDetails();
  }

  onCancel(): void {
    this.noteControl.reset('');
    this.closeDialog.emit();
  }

  onCreateHandling(): void {
    this.noteControl.markAsTouched();
    const rawValue = (this.noteControl.value ?? '').trim();
    const plainText = this.stripHtml(rawValue).trim();

    if (!plainText) return;

    const caseId = this.caseDocument()?.uid?.trim() ?? '';
    if (!caseId) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: SERVICE_NOTE_SAVE_ERROR_MESSAGE,
      });
      return;
    }

    this.isSubmitting.set(true);

    this.nuxeoApi
      .createHandlingFromNote(this.buildHandlingPayload(caseId, plainText))
      .pipe(
        tap(created => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: SERVICE_NOTE_SAVED_MESSAGE,
          });
          this.handlingCreated.emit(created);
          this.closeDialog.emit();
          this.noteControl.reset('');
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: SERVICE_NOTE_SAVE_ERROR_MESSAGE,
          });
          return EMPTY;
        }),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe();
  }

  private buildHandlingPayload(caseId: string, noteText: string): CreateHandlingFromNotePayload {
    const nowIso = new Date().toISOString();
    const handling: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: 'Tjänsteanteckning',
      [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: NUXEO_VOCAB_IDS.arendeRiktning.intern,
      [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]: nowIso,
      [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]: nowIso,
    };

    return {
      input: caseId,
      params: {
        arende: caseId,
        handling,
        anteckning: noteText,
      },
      context: {},
    };
  }

  private populateUserDetails(): void {
    const fullname = this.auth.fullName() ?? this.auth.username() ?? '';
    this.userFullName.set(fullname);
    this.userInitials.set(this.extractInitials(fullname));
    this.userCompany.set(this.getUserProperty('company'));
    this.userLogoUrl.set(this.getUserAvatarUrl());
  }

  private getUserProperty(key: string): string | null {
    const properties = this.auth.user()?.properties ?? null;
    const rawValue = properties?.[key];
    if (typeof rawValue === 'string' && rawValue.trim().length) {
      return rawValue;
    }
    return null;
  }

  private extractInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ').filter(Boolean);
    if (!parts.length) return name.slice(0, 2).toUpperCase();
    return parts
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private getUserAvatarUrl(): string | null {
    const properties = this.auth.user()?.properties ?? null;
    const avatar = properties?.[NUXEO_SCHEMA_FIELDS.user.avatar];

    if (typeof avatar?.['download-url'] === 'string') {
      return avatar['download-url'];
    }
    if (typeof avatar?.data === 'string') {
      return avatar.data;
    }

    const companyLogo = properties?.[NUXEO_SCHEMA_FIELDS.company.logo];
    if (typeof companyLogo?.['download-url'] === 'string') {
      return companyLogo['download-url'];
    }
    if (typeof companyLogo?.data === 'string') {
      return companyLogo.data;
    }

    return null;
  }

  isNoteEmpty(): boolean {
    const value = this.noteControl.value ?? '';
    return !this.stripHtml(value).trim();
  }

  private stripHtml(value: string): string {
    if (!value) return '';
    return value
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ');
  }

  private extractAddress(
    doc: NuxeoDocument<ArendeExtendedProperties> | null | undefined,
    contact: ContactDetails | null
  ): string {
    if (!doc) return '';

    const props = doc.properties ?? {};
    const directAddress = props[NUXEO_SCHEMA_FIELDS.arende.adress] ?? props[NUXEO_SCHEMA_FIELDS.arende.besoksadress];
    if (typeof directAddress === 'string' && directAddress.trim().length) {
      return directAddress.trim();
    }

    if (contact?.address) return contact.address;

    return '';
  }

  private extractPrimaryContact(doc?: NuxeoDocument<ArendeExtendedProperties> | null): ContactDetails | null {
    if (!doc?.properties) return null;
    const contacts = doc.properties[NUXEO_SCHEMA_FIELDS.arende.kontakter];
    if (!Array.isArray(contacts) || !contacts.length) {
      return null;
    }

    const normalizedContacts = contacts.map(contact => this.mapContact(contact));
    const prioritized =
      normalizedContacts.find(contact => contact.email || contact.phone || contact.address) ??
      normalizedContacts[0] ??
      null;
    if (!prioritized) return null;
    return prioritized;
  }

  private mapContact(contact: ContactEntry | undefined): ContactDetails {
    const toNullableTrimmed = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const organization = toNullableTrimmed(contact?.organisation) ?? toNullableTrimmed(contact?.foretag);
    return {
      name: toNullableTrimmed(contact?.namn),
      email: toNullableTrimmed(contact?.epost),
      phone: toNullableTrimmed(contact?.telefon),
      address: toNullableTrimmed(contact?.adress),
      organization,
    };
  }
}
