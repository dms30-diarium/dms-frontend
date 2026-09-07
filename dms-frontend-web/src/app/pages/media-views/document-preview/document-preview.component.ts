import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  OnDestroy,
  signal,
  effect,
  inject,
  Injector,
  output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, Validators } from '@angular/forms';
import { Direction, NuxeoDocument, TemplateField } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { BackToPersonalButtonComponent } from '@app/shared/components/back-to-personal-button/back-to-personal-button.component';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { DocumentVersionService } from '@app/core/services/document-version.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { catchError, EMPTY, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { Option } from '@app/shared/commonTypes';
import { DocumentInfoPanelComponent } from '@app/shared/components/document-info-panel/document-info-panel.component';
import { ImageButtonComponent } from '@app/shared/components/image-button/image-button.component';
import { FileUploadComponent, UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { TemplatePropertiesTableComponent } from '@app/shared/components/edit-form-components/template-properties-table/template-properties-table.component';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import {
  DOCUMENT_PREVIEW_EMPTY_NOTE_MESSAGE,
  DOCUMENT_PREVIEW_RESTORE_ERROR_MESSAGE,
  DOCUMENT_PREVIEW_RESTORE_SUCCESS_MESSAGE,
  DOCUMENT_UPDATE_ERROR_MESSAGE,
  DOCUMENT_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-document-preview',
  standalone: true,
  imports: [
    CommonModule,
    PdfViewerComponent,
    GeneralFormComponent,
    FormsModule,
    DigiArbetsformedlingenAngularModule,
    DocumentInfoPanelComponent,
    BackToPersonalButtonComponent,
    ImageButtonComponent,
    FileUploadComponent,
    AngularEditorModule,
  ],
  templateUrl: './document-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPreviewComponent implements OnDestroy {
  document = input<NuxeoDocument | null>(null);
  reloadDocument = output<void>();
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly documentVersionService = inject(DocumentVersionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  noteVersions = signal<NuxeoDocument[]>([]);
  selectedNoteVersionId = signal('');
  notePreviewDoc = signal<NuxeoDocument | null>(null);
  isLoadingNoteVersions = signal(false);
  isLoadingNoteVersionDoc = signal(false);
  isRestoreDialogOpen = signal(false);
  isRestoringNoteVersion = signal(false);
  isEditDialogOpen = signal(false);
  isSavingEdit = signal(false);
  isUploadingAudioReplace = signal(false);
  isAudioReplaceDialogOpen = signal(false);
  audioReplaceFileBatchId = signal('');
  audioReplaceFiles = signal<UploadedFile[]>([]);
  noteDraft = signal('');
  noteDraftOriginal = signal('');
  noteDraftTouched = signal(false);
  isNoteDirty = computed(() => this.noteDraft().trim() !== this.noteDraftOriginal().trim());
  noteEditConfig = signal<FieldConfig[]>([]);
  fileEditConfig = signal<FieldConfig[]>([]);
  noteEditMode = signal<'full' | 'text'>('full');
  noteNatureOptions = signal<Option[]>([]);
  noteSubjectOptions = signal<Option[]>([]);
  noteCoverageOptions = signal<Option[]>([]);
  templateProperties = signal<TemplateField[]>([]);
  noteEditorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '180px',
    maxHeight: '900px',
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
  resolvedNoteEditorConfig = computed(() => {
    const isReadOnly = !!this.selectedNoteVersionId() || this.isSavingEdit();
    return {
      ...this.noteEditorConfig,
      editable: !isReadOnly,
      showToolbar: !isReadOnly,
    };
  });
  @ViewChild('noteEditForm') private noteEditForm?: GeneralFormComponent;
  @ViewChild('fileEditForm') private fileEditForm?: GeneralFormComponent;

  constructor() {
    this.loadNoteDirectoryOptions();
    queueMicrotask(() => {
      effect(
        () => {
          const doc = this.document();
          if (!doc) return;
          const pageKey = doc.type === 'Note' ? 'note' : 'file';
          this.store.openPage.set(pageKey);
          this.store.baseButtons.set([createButton('edit', () => this.openEditDialog())]);
        },
        { injector: this.injector }
      );

      effect(
        () => {
          const doc = this.document();
          if (!doc || doc.type !== 'Note' || this.isEditDialogOpen()) return;
          this.noteEditConfig.set(this.buildNoteEditConfig(doc));
        },
        { injector: this.injector }
      );

      effect(
        () => {
          const doc = this.document();
          if (!doc?.uid || doc.type !== 'Note') {
            this.resetNoteVersionSelection();
            this.noteVersions.set([]);
            return;
          }
          this.resetNoteVersionSelection();
          this.loadNoteVersions(doc);
        },
        { injector: this.injector }
      );

      effect(
        () => {
          if (!this.isNoteDocument()) return;
          const doc = this.activeNoteDocument();
          const value = doc?.properties?.[NUXEO_SCHEMA_FIELDS.note.note];
          const text = typeof value === 'string' ? value : '';
          if (this.selectedNoteVersionId() || !this.noteDraftTouched()) {
            this.noteDraft.set(text);
            this.noteDraftOriginal.set(text);
            this.noteDraftTouched.set(false);
          }
        },
        { injector: this.injector }
      );
    });
  }

  title = computed(() => {
    const doc = this.document();
    return doc?.properties?.[NUXEO_SCHEMA_FIELDS.dc.title] || doc?.title || doc?.uid || '';
  });

  isNoteDocument = computed(() => this.document()?.type === 'Note');
  isAudioDocument = computed(() => this.document()?.type === 'Audio');
  activeNoteDocument = computed(() => this.notePreviewDoc() ?? this.document());

  hasMainFile = computed(() => {
    const doc = this.document();
    if (!doc) return false;
    return Boolean(
      doc.properties?.[NUXEO_SCHEMA_FIELDS.file.content] || doc.properties?.[NUXEO_SCHEMA_FIELDS.fil.vattenstampel]
    );
  });

  audioSourceUrl = computed<string>(() => {
    const doc = this.document();
    if (!doc) return '';
    const file = doc.properties?.[NUXEO_SCHEMA_FIELDS.file.content];
    const rawUrl = typeof file?.data === 'string' ? file.data : typeof file?.blobUrl === 'string' ? file.blobUrl : '';
    if (rawUrl) {
      return this.appendClientReason(rawUrl, 'view');
    }
    const fileName = file?.name;
    if (!doc.uid || !fileName) return '';
    const encodedName = encodeURIComponent(fileName);
    const baseUrl = `/nuxeo/nxfile/default/${doc.uid}/file:content/${encodedName}?changeToken=${doc.changeToken}`;
    return this.appendClientReason(baseUrl, 'view');
  });

  audioMimeType = computed<string>(() => {
    const file = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content];
    const mimeValue = file?.['mime-type'];
    return typeof mimeValue === 'string' && mimeValue.length ? mimeValue : 'audio/mpeg';
  });

  audioDownloadUrl = computed<string>(() => {
    const doc = this.document();
    if (!doc) return '';
    const file = doc.properties?.[NUXEO_SCHEMA_FIELDS.file.content];
    const rawUrl = typeof file?.data === 'string' ? file.data : typeof file?.blobUrl === 'string' ? file.blobUrl : '';
    if (rawUrl) {
      return this.appendClientReason(rawUrl, 'download');
    }
    const fileName = file?.name;
    if (doc.uid && fileName) {
      const encodedName = encodeURIComponent(fileName);
      const baseUrl = `/nuxeo/nxfile/default/${doc.uid}/file:content/${encodedName}?changeToken=${doc.changeToken}`;
      return this.appendClientReason(baseUrl, 'download');
    }
    if (doc.uid) {
      return this.appendClientReason(this.nuxeoApi.downloadFile(doc.uid), 'download');
    }
    return '';
  });

  editDialogHeading = computed(() => (this.isNoteDocument() ? 'Redigera anteckning' : 'Redigera fil'));

  getDate(value: string | Date | undefined | null): string {
    return formatDateOrMissing(value);
  }

  getNoteContent(): string {
    if (!this.isNoteDocument()) return '';
    const activeDoc = this.activeNoteDocument();
    if (!activeDoc) return '';
    const value = activeDoc.properties?.[NUXEO_SCHEMA_FIELDS.note.note];
    const text = Object.prototype.toString.call(value) === '[object String]' ? String(value) : '';
    return text;
  }

  private appendClientReason(url: string, reason: 'view' | 'download'): string {
    if (url.includes('clientReason=')) return url;
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}clientReason=${reason}`;
  }

  downloadAudio(): void {
    const url = this.audioDownloadUrl();
    if (!url) return;
    window.location.href = url;
  }

  openAudioReplaceDialog(): void {
    this.audioReplaceFileBatchId.set('');
    this.audioReplaceFiles.set([]);
    this.isAudioReplaceDialogOpen.set(true);
  }

  closeAudioReplaceDialog(): void {
    this.isAudioReplaceDialogOpen.set(false);
  }

  onAudioReplaceFiles(files: UploadedFile[]): void {
    this.audioReplaceFiles.set(files);
    if (!files.length) {
      this.audioReplaceFileBatchId.set('');
      return;
    }
    this.isUploadingAudioReplace.set(true);
    this.nuxeoApi
      .initializeUpload()
      .pipe(
        tap(result => this.audioReplaceFileBatchId.set(result.batchId)),
        switchMap(result => this.nuxeoApi.uploadFile(result.batchId, files)),
        finalize(() => this.isUploadingAudioReplace.set(false))
      )
      .subscribe({
        error: () => {
          this.isUploadingAudioReplace.set(false);
        },
      });
  }

  confirmAudioReplace(): void {
    const doc = this.document();
    const files = this.audioReplaceFiles();
    const batchId = this.audioReplaceFileBatchId();
    if (!doc?.uid || !files.length || !batchId) return;
    this.nuxeoApi
      .updateFile(doc.uid, batchId, files[0])
      .pipe(
        tap(() => {
          this.reloadDocument.emit();
          this.closeAudioReplaceDialog();
        })
      )
      .subscribe();
  }

  onNoteDraftChange(value: string): void {
    this.noteDraft.set(value);
    this.noteDraftTouched.set(true);
  }

  private loadNoteDirectoryOptions(): void {
    forkJoin({
      nature: this.nuxeoApi
        .getDirectorySuggestions('nature', {
          dbl10n: false,
          localize: true,
          lang: 'en',
          searchTerm: '',
        })
        .pipe(map(entries => this.mapDirectoryEntries(entries))),
      subjects: this.nuxeoApi
        .getDirectorySuggestions('l10nsubjects', {
          dbl10n: true,
          localize: true,
          lang: 'en',
          searchTerm: '',
        })
        .pipe(map(entries => this.mapDirectoryEntries(entries))),
      coverage: this.nuxeoApi
        .getDirectorySuggestions('l10ncoverage', {
          dbl10n: true,
          localize: true,
          lang: 'en',
          searchTerm: '',
        })
        .pipe(map(entries => this.mapDirectoryEntries(entries))),
    })
      .pipe(
        tap(({ nature, subjects, coverage }) => {
          this.noteNatureOptions.set(nature);
          this.noteSubjectOptions.set(subjects);
          this.noteCoverageOptions.set(coverage);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          if (doc.type === 'Note') {
            if (this.noteEditMode() === 'text') {
              this.noteEditConfig.set(this.buildNoteTextEditConfig(doc));
            } else {
              this.noteEditConfig.set(this.buildNoteEditConfig(doc));
            }
          } else {
            this.fileEditConfig.set(this.buildFileEditConfig(doc));
          }
        })
      )
      .subscribe();
  }

  private buildNoteEditConfig(doc: NuxeoDocument): FieldConfig[] {
    const props = doc.properties;
    const titleValue = props[NUXEO_SCHEMA_FIELDS.dc.title] ?? doc.title ?? '';
    const descriptionValue = props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '';
    const formatValue = props[NUXEO_SCHEMA_FIELDS.note.mimeType] ?? props[NUXEO_SCHEMA_FIELDS.dc.format] ?? 'text/html';
    const subjectsValue = props[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const subjectsArray = Array.isArray(subjectsValue) ? subjectsValue : [subjectsValue];
    const subjectIdSet = new Set(
      subjectsArray
        .map(entry => Object(entry)['id'] ?? Object(entry)['value'] ?? entry)
        .map(value => (value ? String(value) : ''))
        .filter(value => value.length > 0)
    );
    const selectedSubjects = this.noteSubjectOptions().filter(option => subjectIdSet.has(option.id));
    return [
      {
        type: 'input',
        name: 'title',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        defaultValue: String(titleValue).trim(),
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: String(descriptionValue).trim(),
      },
      {
        type: 'dropdown',
        name: 'format',
        label: this.store.getValue('noteEditLayout.format') ?? 'Format',
        defaultValue: String(formatValue),
        options: [
          { label: 'HTML', id: 'text/html' },
          { label: 'Text', id: 'text/plain' },
          { label: 'XML', id: 'text/xml' },
          { label: 'Markdown', id: 'text/markdown' },
        ],
      },
      {
        type: 'dropdown',
        name: 'nature',
        label: this.store.getValue('label.dublincore.nature') ?? 'Natur',
        options: this.noteNatureOptions(),
        defaultValue: Object(props[NUXEO_SCHEMA_FIELDS.dc.nature])['id'] ?? props[NUXEO_SCHEMA_FIELDS.dc.nature] ?? '',
      },
      {
        type: 'dropdown-search',
        name: 'subjects',
        label: this.store.getValue('label.dublincore.subjects') ?? 'Ämnen',
        options: this.noteSubjectOptions(),
        multiple: true,
        defaultValue: selectedSubjects,
      },
      {
        type: 'dropdown',
        name: 'coverage',
        label: this.store.getValue('label.dublincore.coverage') ?? 'Täckning',
        options: this.noteCoverageOptions(),
        defaultValue:
          Object(props[NUXEO_SCHEMA_FIELDS.dc.coverage])['id'] ?? props[NUXEO_SCHEMA_FIELDS.dc.coverage] ?? '',
      },
      {
        type: 'datepicker',
        name: 'expires',
        label: this.store.getValue('label.dublincore.expire') ?? 'Förfaller',
        defaultValue: this.toDatepickerValue(props[NUXEO_SCHEMA_FIELDS.dc.expired]),
      },
      {
        type: 'richtext',
        name: 'note',
        label: this.store.getValue('label.directories.nature.note') ?? 'Anteckning',
        defaultValue: String(props[NUXEO_SCHEMA_FIELDS.note.note] ?? ''),
        validators: [Validators.required],
      },
    ];
  }

  private buildNoteTextEditConfig(doc: NuxeoDocument): FieldConfig[] {
    const props = doc.properties;
    return [
      {
        type: 'richtext',
        name: 'note',
        label: 'Note',
        defaultValue: String(props[NUXEO_SCHEMA_FIELDS.note.note] ?? ''),
        validators: [Validators.required],
      },
    ];
  }

  private buildFileEditConfig(doc: NuxeoDocument): FieldConfig[] {
    const props = doc.properties;
    const titleValue = props[NUXEO_SCHEMA_FIELDS.dc.title] ?? doc.title ?? '';
    const descriptionValue = props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '';

    if (doc.type === 'Utkastmall') {
      this.templateProperties.set(this.normalizeTemplateProperties(props[NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]));
      return [
        {
          type: 'input',
          name: 'title',
          label: this.store.getValue('label.dublincore.title') ?? 'Titel',
          defaultValue: String(titleValue).trim(),
          validators: [Validators.required],
        },
        {
          type: 'textarea',
          name: 'description',
          label: this.store.getValue('label.description') ?? 'Beskrivning',
          defaultValue: String(descriptionValue).trim(),
        },
        {
          type: 'component',
          name: 'templateProperties',
          label: this.store.getValue('label.ui.schema.utkastmall.egenskaper') ?? 'Egenskaper',
          class: TemplatePropertiesTableComponent,
          props: { tableFields: this.templateProperties },
        },
      ];
    }

    if (doc.type === 'EPostmall') {
      return [
        {
          type: 'input',
          name: 'title',
          label: this.store.getValue('label.dublincore.title') ?? 'Titel',
          defaultValue: String(titleValue).trim(),
          validators: [Validators.required],
        },
        {
          type: 'textarea',
          name: 'description',
          label: this.store.getValue('label.description') ?? 'Beskrivning',
          defaultValue: String(descriptionValue).trim(),
        },
        {
          type: 'input',
          name: 'subject',
          label: this.store.getValue('label.ui.schema.epostmall.amne') ?? 'Amne',
          defaultValue: String(props[NUXEO_SCHEMA_FIELDS.epostmall.amne] ?? '').trim(),
        },
      ];
    }

    const subjectsValue = props[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const subjectsArray = Array.isArray(subjectsValue) ? subjectsValue : [subjectsValue];
    const subjectIdSet = new Set(
      subjectsArray
        .map(entry => Object(entry)['id'] ?? entry)
        .map(value => (value ? String(value) : ''))
        .filter(value => value.length > 0)
    );
    const selectedSubjects = this.noteSubjectOptions().filter(option => subjectIdSet.has(option.id));
    return [
      {
        type: 'input',
        name: 'title',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        defaultValue: String(titleValue).trim(),
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: String(descriptionValue).trim(),
      },
      {
        type: 'dropdown',
        name: 'nature',
        label: this.store.getValue('label.dublincore.nature') ?? 'Natur',
        options: this.noteNatureOptions(),
        defaultValue: Object(props[NUXEO_SCHEMA_FIELDS.dc.nature])['id'] ?? props[NUXEO_SCHEMA_FIELDS.dc.nature] ?? '',
      },
      {
        type: 'dropdown-search',
        name: 'subjects',
        label: this.store.getValue('label.dublincore.subjects') ?? 'Ämnen',
        options: this.noteSubjectOptions(),
        multiple: true,
        defaultValue: selectedSubjects,
      },
      {
        type: 'dropdown',
        name: 'coverage',
        label: this.store.getValue('label.dublincore.coverage') ?? 'Täckning',
        options: this.noteCoverageOptions(),
        defaultValue:
          Object(props[NUXEO_SCHEMA_FIELDS.dc.coverage])['id'] ?? props[NUXEO_SCHEMA_FIELDS.dc.coverage] ?? '',
      },
      {
        type: 'datepicker',
        name: 'expires',
        label: this.store.getValue('label.dublincore.expire') ?? 'Förfaller',
        defaultValue: this.toDatepickerValue(props[NUXEO_SCHEMA_FIELDS.dc.expired]),
      },
    ];
  }

  openEditDialog(): void {
    const doc = this.document();
    if (!doc) return;
    if (this.isNoteDocument()) {
      this.noteEditMode.set('full');
      this.noteEditConfig.set(this.buildNoteEditConfig(doc));
    } else {
      this.noteEditMode.set('full');
      this.fileEditConfig.set(this.buildFileEditConfig(doc));
    }
    this.isEditDialogOpen.set(true);
  }

  closeEditDialog(): void {
    this.isEditDialogOpen.set(false);
  }

  submitNoteEdit(): void {
    this.noteEditForm?.submit();
  }

  saveNoteEdits(event: Record<string, unknown>): void {
    const doc = this.document();
    const docId = doc?.uid ?? '';
    if (!docId) return;
    const isTextOnly = this.noteEditMode() === 'text';
    const noteContent = String(event['note'] ?? '').trim();

    let properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.note.note]: noteContent,
    };

    if (!isTextOnly) {
      const titleText = String(event['title'] ?? '').trim();
      const description = String(event['description'] ?? '').trim();
      const format = String(event['format'] ?? '').trim() || 'text/html';
      const natureValue = event['nature'];
      const natureRecord = natureValue ? Object(natureValue) : {};
      const natureText = String(natureRecord['id'] ?? natureRecord['value'] ?? natureValue ?? '').trim();
      const coverageValue = event['coverage'];
      const coverageRecord = coverageValue ? Object(coverageValue) : {};
      const coverageText = String(coverageRecord['id'] ?? coverageRecord['value'] ?? coverageValue ?? '').trim();
      const subjectsRaw = event['subjects'];
      const subjects: string[] = Array.isArray(subjectsRaw)
        ? subjectsRaw
            .map(entry => {
              const entryRecord = entry ? Object(entry) : {};
              const entryValue = entryRecord['id'] ?? entryRecord['value'] ?? entry ?? '';
              return String(entryValue ?? '').trim();
            })
            .filter(value => value)
        : [];
      const expiresRaw = event['expires'];
      const expiresValue = Array.isArray(expiresRaw) ? expiresRaw[0] : expiresRaw;
      const expires = expiresValue ? expiresValue : null;

      properties = {
        [NUXEO_SCHEMA_FIELDS.dc.title]: titleText,
        [NUXEO_SCHEMA_FIELDS.dc.description]: description,
        [NUXEO_SCHEMA_FIELDS.note.mimeType]: format,
        [NUXEO_SCHEMA_FIELDS.note.note]: noteContent,
        [NUXEO_SCHEMA_FIELDS.dc.nature]: natureText || null,
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects,
        [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverageText || null,
        [NUXEO_SCHEMA_FIELDS.dc.expired]: expires,
      };
    }

    this.saveNoteProperties(docId, properties, noteContent, true);
  }

  submitFileEdit(): void {
    this.fileEditForm?.submit();
  }

  saveInlineNote(): void {
    if (!this.isNoteDocument() || this.selectedNoteVersionId()) return;
    const doc = this.document();
    const docId = doc?.uid ?? '';
    if (!docId) return;
    if (!this.isNoteDirty()) return;
    const noteContent = this.noteDraft().trim();
    const plainText = this.stripHtml(noteContent).trim();
    if (!plainText) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: DOCUMENT_PREVIEW_EMPTY_NOTE_MESSAGE,
      });
      return;
    }
    this.saveNoteProperties(docId, { [NUXEO_SCHEMA_FIELDS.note.note]: noteContent }, noteContent, false);
  }

  saveFileEdits(event: Record<string, unknown>): void {
    const doc = this.document();
    if (!doc?.uid) return;
    const docId = doc.uid;
    const titleValue = event['title'];
    const descriptionValue = event['description'];
    const titleText = Object.prototype.toString.call(titleValue) === '[object String]' ? String(titleValue).trim() : '';
    const description =
      Object.prototype.toString.call(descriptionValue) === '[object String]' ? String(descriptionValue).trim() : '';
    let properties: Record<string, unknown>;

    if (doc.type === 'Utkastmall') {
      const templateProperties = this.normalizeTemplateProperties(event['templateProperties']);
      properties = {
        [NUXEO_SCHEMA_FIELDS.dc.title]: titleText,
        [NUXEO_SCHEMA_FIELDS.dc.description]: description,
        [NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper]: templateProperties,
      };
    } else if (doc.type === 'EPostmall') {
      const subjectValue = event['subject'];
      const subject =
        Object.prototype.toString.call(subjectValue) === '[object String]' ? String(subjectValue).trim() : '';
      properties = {
        [NUXEO_SCHEMA_FIELDS.dc.title]: titleText,
        [NUXEO_SCHEMA_FIELDS.dc.description]: description,
        [NUXEO_SCHEMA_FIELDS.epostmall.amne]: subject,
      };
    } else {
      const nature = event['nature'];
      const coverage = event['coverage'];
      const subjectsRaw = event['subjects'];
      const subjects: string[] = Array.isArray(subjectsRaw)
        ? subjectsRaw
            .map(entry => Object(entry)['id'] ?? Object(entry)['value'] ?? entry)
            .map(value => (value ? String(value) : ''))
            .filter(value => value.length > 0)
        : [];
      const expiresRaw = event['expires'];
      const expires = Array.isArray(expiresRaw) ? expiresRaw[0] : expiresRaw;
      properties = {
        [NUXEO_SCHEMA_FIELDS.dc.title]: titleText,
        [NUXEO_SCHEMA_FIELDS.dc.description]: description,
        [NUXEO_SCHEMA_FIELDS.dc.nature]: nature,
        [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects,
        [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage,
        [NUXEO_SCHEMA_FIELDS.dc.expired]: expires,
      };
    }

    this.isSavingEdit.set(true);
    this.nuxeoApi
      .editDocument(docId, properties)
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: DOCUMENT_UPDATE_SUCCESS_MESSAGE,
          });
          this.isEditDialogOpen.set(false);
          this.reloadDocument.emit();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DOCUMENT_UPDATE_ERROR_MESSAGE,
          });
          return EMPTY;
        }),
        finalize(() => this.isSavingEdit.set(false))
      )
      .subscribe();
  }

  private normalizeTemplateProperties(value: unknown): TemplateField[] {
    if (!Array.isArray(value)) return [];
    return value
      .map(entry => {
        const record = Object(entry);
        const nyckel = String(record['nyckel'] ?? '').trim();
        const varde = String(record['varde'] ?? '').trim();
        return { nyckel, varde };
      })
      .filter(entry => entry.nyckel.length > 0 || entry.varde.length > 0);
  }

  getNoteVersionOptionLabel(doc: NuxeoDocument): string {
    const version = this.getVersionLabelFor(doc);
    const date = this.getDate(doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.modified] ?? doc.lastModified);
    if (version && version !== '—') return `Version ${version} • ${date}`;
    return `Version • ${date}`;
  }

  getCurrentNoteVersionOptionLabel(): string {
    const doc = this.document();
    if (!doc) return 'Aktuell';
    const version = this.getVersionLabelFor(doc);
    if (version && version !== '—') return `Aktuell (${version})`;
    return 'Aktuell';
  }

  getActiveNoteVersionLabel(): string {
    const doc = this.notePreviewDoc();
    if (!doc) return this.getCurrentNoteVersionOptionLabel();
    const version = this.getVersionLabelFor(doc);
    if (version && version !== '—') return `Vald version (${version})`;
    return 'Vald version';
  }

  onNoteVersionSelect(versionId: string): void {
    if (!this.isNoteDocument()) return;
    this.selectedNoteVersionId.set(versionId);
    if (!versionId) {
      this.notePreviewDoc.set(null);
      return;
    }

    this.isLoadingNoteVersionDoc.set(true);
    this.documentVersionService
      .getVersionDocument(versionId)
      .pipe(
        finalize(() => this.isLoadingNoteVersionDoc.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: doc => this.notePreviewDoc.set(doc),
        error: () => {
          this.notePreviewDoc.set(null);
          this.selectedNoteVersionId.set('');
        },
      });
  }

  openRestoreDialog(): void {
    if (!this.selectedNoteVersionId()) return;
    this.isRestoreDialogOpen.set(true);
  }

  restoreSelectedNoteVersion(): void {
    const versionId = this.selectedNoteVersionId();
    if (!versionId) return;

    this.isRestoringNoteVersion.set(true);
    this.documentVersionService
      .restoreVersion(versionId, false)
      .pipe(
        tap(() => {
          this.selectedNoteVersionId.set('');
          this.notePreviewDoc.set(null);
          this.reloadDocument.emit();
          this.isRestoreDialogOpen.set(false);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: DOCUMENT_PREVIEW_RESTORE_SUCCESS_MESSAGE,
          });
        }),
        finalize(() => this.isRestoringNoteVersion.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DOCUMENT_PREVIEW_RESTORE_ERROR_MESSAGE,
          });
        },
      });
  }

  openNoteEdit(): void {
    if (!this.isNoteDocument() || this.selectedNoteVersionId()) return;
    const doc = this.document();
    if (!doc) return;
    this.noteEditMode.set('text');
    this.noteEditConfig.set(this.buildNoteTextEditConfig(doc));
    this.isEditDialogOpen.set(true);
  }

  private saveNoteProperties(
    docId: string,
    properties: Record<string, unknown>,
    noteContent: string,
    closeDialog: boolean
  ): void {
    this.isSavingEdit.set(true);
    const isProxy = this.document()?.isProxy === true;
    const targetId$ = isProxy
      ? this.nuxeoApi.getSourceDocumentFromProxy(docId).pipe(map(source => source.uid))
      : of(docId);

    targetId$
      .pipe(
        switchMap(targetId => this.nuxeoApi.editDocument(targetId, properties)),
        tap(() => {
          this.selectedNoteVersionId.set('');
          this.notePreviewDoc.set(null);
          this.noteDraftOriginal.set(noteContent);
          this.noteDraftTouched.set(false);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: DOCUMENT_UPDATE_SUCCESS_MESSAGE,
          });
          if (closeDialog) {
            this.isEditDialogOpen.set(false);
          }
          this.reloadDocument.emit();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DOCUMENT_UPDATE_ERROR_MESSAGE,
          });
          return EMPTY;
        }),
        finalize(() => this.isSavingEdit.set(false))
      )
      .subscribe();
  }

  private getVersionLabelFor(doc: NuxeoDocument | null | undefined): string {
    if (!doc) return '—';
    const major = doc.properties?.[NUXEO_SCHEMA_FIELDS.uid.majorVersion];
    const minor = doc.properties?.[NUXEO_SCHEMA_FIELDS.uid.minorVersion];
    const majorType = Object.prototype.toString.call(major);
    const minorType = Object.prototype.toString.call(minor);
    const majorValue = majorType === '[object Number]' || majorType === '[object String]' ? String(major) : '';
    const minorValue = minorType === '[object Number]' || minorType === '[object String]' ? String(minor) : '';
    if (majorValue && minorValue) return `${majorValue}.${minorValue}`;
    if (majorValue) return majorValue;
    return '—';
  }

  private resetNoteVersionSelection(): void {
    this.selectedNoteVersionId.set('');
    this.notePreviewDoc.set(null);
    this.isLoadingNoteVersions.set(false);
    this.isLoadingNoteVersionDoc.set(false);
  }

  private loadNoteVersions(doc: NuxeoDocument): void {
    this.isLoadingNoteVersions.set(true);
    this.documentVersionService
      .getDocumentVersions(doc)
      .pipe(
        finalize(() => this.isLoadingNoteVersions.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: versions => this.noteVersions.set(versions),
        error: () => this.noteVersions.set([]),
      });
  }

  private mapDirectoryEntries(entries: Direction[]): Option[] {
    const options: Option[] = [];
    entries.forEach(entry => {
      const children = entry.children ?? [];
      if (children.length) {
        children.forEach(child => {
          const computedId = child.computedId ?? '';
          const id = computedId ? computedId.split('/').pop() || computedId : '';
          if (!id) return;
          const label = child.absoluteLabel ?? child.computedId ?? id;
          options.push({ id, label, value: id });
        });
        return;
      }
      const id = entry.id || entry.computedId;
      if (!id) return;
      const label = entry.absoluteLabel || entry.displayLabel || entry.label || entry.id || entry.computedId || id;
      options.push({ id, label, value: id });
    });
    return options;
  }

  private toDatepickerValue(value: unknown): Date[] | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return [value];
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const date = new Date(numeric);
      if (!Number.isNaN(date.getTime())) return [date];
    }
    const stringValue = Object.prototype.toString.call(value) === '[object String]' ? String(value).trim() : '';
    if (stringValue) {
      const date = new Date(stringValue);
      if (!Number.isNaN(date.getTime())) return [date];
    }
    return null;
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, ' ');
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }
}
