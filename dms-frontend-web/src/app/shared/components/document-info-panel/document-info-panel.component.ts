import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';

import { AccordionComponent } from '@app/shared/components/accordion/accordion.component';
import { AuditEntry, FilesEntry, NuxeoDocument, NuxeoFileDocument, NxBlobLike } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { getInitials } from '@app/shared/utils/initials';
import { TabsComponent, Tab } from '@app/shared/components/tabs/tabs.component';
import { FileUploadComponent, UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { HandlingFilesComponent } from '@app/shared/components/handling-files/handling-files.component';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import {
  DigiArbetsformedlingenAngularModule,
  DigiIconDownload,
  DigiIconEye,
  DigiIconFileDocument,
  DigiIconFilePdf,
  DigiIconFolder,
  DigiIconImage,
  DigiIconRedo,
  DigiIconTrash,
} from '@designsystem-se/af-angular';
import { CommentsComponent } from '@app/shared/components/comments/comments.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { buildDownloadOptions, formatFileSize } from '@app/shared/utils/download-utils';
import {
  ATTACHMENT_DELETE_ERROR_MESSAGE,
  ATTACHMENT_REPLACE_ERROR_MESSAGE,
  ATTACHMENTS_LOAD_ERROR_MESSAGE,
  ATTACHMENTS_UPLOAD_ERROR_MESSAGE,
  TAG_ADDED_MESSAGE,
  TAG_ADD_ERROR_MESSAGE,
  TAG_ALREADY_EXISTS_MESSAGE,
  TAG_REMOVED_MESSAGE,
  TAG_REMOVE_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

interface DocumentAttachmentItem {
  id: string;
  title: string;
  typeLabel: string;
  mimeType: string;
  fileKind: 'pdf' | 'img' | 'video' | 'other';
  fileDocId?: string;
  blobUrl: string;
  inlineUrl: string;
  downloadUrl: string;
}

@Component({
  selector: 'nuxeo-document-info-panel',
  standalone: true,
  imports: [
    AccordionComponent,
    TabsComponent,
    FileUploadComponent,
    HandlingFilesComponent,
    PdfViewerComponent,
    DigiArbetsformedlingenAngularModule,
    DigiIconDownload,
    DigiIconEye,
    DigiIconFileDocument,
    DigiIconFilePdf,
    DigiIconFolder,
    DigiIconImage,
    DigiIconRedo,
    DigiIconTrash,
    CommentsComponent,
  ],
  templateUrl: './document-info-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentInfoPanelComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  document = input.required<NuxeoDocument>();
  reloadDocument = output<void>();
  showAttachments = input<boolean>(true);
  showDownloads = input<boolean>(true);
  showTabs = input<boolean>(true);

  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly destroyRef = inject(DestroyRef);

  tabs: Tab[] = [
    { id: 'comments', title: 'Comments' },
    { id: 'activity', title: 'Activity' },
  ];
  activeTabId = signal('comments');
  auditEntries = signal<AuditEntry[]>([]);
  isLoadingAudit = signal(false);
  auditError = signal<string | null>(null);
  arkivMyndighetLabel = signal('');
  tagLabels = signal<string[]>([]);
  newTagInput = signal('');
  isUploadingAttachments = signal(false);
  noteAttachments = signal<DocumentAttachmentItem[]>([]);
  attachments = signal<NuxeoFileDocument[]>([]);
  isLoadingAttachments = signal(false);
  previewAttachment = signal<DocumentAttachmentItem | null>(null);
  previewDoc = signal<NuxeoDocument | null>(null);
  replaceAttachmentIndex = signal<number | null>(null);
  isDownloadDialogOpen = signal(false);

  private uploadedAttachmentIds = new Set<string>();
  private pendingAttachmentIds = new Set<string>();

  @ViewChild('replaceInput') private replaceInput?: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      const baseTags = this.getDocumentTags();
      this.tagLabels.set(baseTags);
      this.uploadedAttachmentIds.clear();
      this.pendingAttachmentIds.clear();
    });

    effect(() => {
      const doc = this.document();
      if (!doc?.uid || !this.showAttachments()) {
        this.noteAttachments.set([]);
        this.attachments.set([]);
        this.isLoadingAttachments.set(false);
        return;
      }
      this.syncAttachments(doc);
    });

    effect(() => {
      const doc = this.document();
      if (!doc?.uid) {
        this.auditEntries.set([]);
        return;
      }

      this.isLoadingAudit.set(true);
      this.auditError.set(null);

      this.nuxeoApi
        .getDocumentAudit(doc.uid, { currentPageIndex: 0, pageSize: 40 })
        .pipe(
          finalize(() => this.isLoadingAudit.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: result => {
            this.auditEntries.set(result.entries ?? []);
          },
          error: () => {
            this.auditEntries.set([]);
            this.auditError.set('Kunde inte ladda aktivitet.');
          },
        });
    });

    effect(() => {
      const doc = this.document();
      const myndighetUid = String(doc?.properties[NUXEO_SCHEMA_FIELDS.arkiv.myndighet] ?? '');

      if (!myndighetUid) {
        this.arkivMyndighetLabel.set('');
        return;
      }

      this.nuxeoApi
        .getDocumentById(myndighetUid)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: myndighetDocument => this.arkivMyndighetLabel.set(myndighetDocument.title),
          error: () => this.arkivMyndighetLabel.set(myndighetUid),
        });
    });
  }

  title = computed(() => {
    const doc = this.document();
    return doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.title] || doc.title || doc.uid;
  });

  isNoteDocument = computed(() => this.document()?.type === 'Note');

  isFileDocument = computed(() => {
    const type = this.document()?.type;
    return type === 'Fil' || type === 'File' || type === 'Utkastmall' || type === 'EPostmall';
  });

  isSimpleTemplateDocument = computed(() => {
    const type = this.document()?.type;
    return type === 'Utkastmall' || type === 'EPostmall';
  });

  isArkivDocument = computed(() => this.document()?.type === 'Arkiv');

  downloadOptions = computed(() => {
    const docId = this.document()?.uid ?? '';
    return buildDownloadOptions(docId);
  });

  getDate(value: string | Date | (string | Date)[] | undefined | null): string {
    const resolved = Array.isArray(value) ? value[0] : value;
    return formatDateOrMissing(resolved ?? null);
  }

  getCreator(): string {
    const value = this.document().properties?.[NUXEO_SCHEMA_FIELDS.dc.creator];
    const record = Object(value);
    const properties = Object(Reflect.get(record, 'properties'));
    const firstValue =
      Reflect.get(properties, 'firstName') ?? Reflect.get(properties, NUXEO_SCHEMA_FIELDS.user.firstName);
    const lastValue = Reflect.get(properties, 'lastName') ?? Reflect.get(properties, NUXEO_SCHEMA_FIELDS.user.lastName);
    const firstText = Object.prototype.toString.call(firstValue) === '[object String]' ? String(firstValue).trim() : '';
    const lastText = Object.prototype.toString.call(lastValue) === '[object String]' ? String(lastValue).trim() : '';
    const fullName = `${firstText} ${lastText}`.trim();
    return fullName;
  }

  getContributorsList(): string[] {
    const contributors = this.document().properties?.[NUXEO_SCHEMA_FIELDS.dc.contributors];
    if (!Array.isArray(contributors)) return [];
    return contributors
      .map(contributorEntry => {
        const record = Object(contributorEntry);
        const properties = Object(Reflect.get(record, 'properties'));
        const firstValue =
          Reflect.get(properties, 'firstName') ?? Reflect.get(properties, NUXEO_SCHEMA_FIELDS.user.firstName);
        const lastValue =
          Reflect.get(properties, 'lastName') ?? Reflect.get(properties, NUXEO_SCHEMA_FIELDS.user.lastName);
        const firstText =
          Object.prototype.toString.call(firstValue) === '[object String]' ? String(firstValue).trim() : '';
        const lastText =
          Object.prototype.toString.call(lastValue) === '[object String]' ? String(lastValue).trim() : '';
        return `${firstText} ${lastText}`.trim();
      })
      .filter(contributorName => contributorName.length > 0);
  }

  getStateLabel(): string {
    return this.document().state ?? '—';
  }

  getVersionLabel(): string {
    return this.getVersionLabelFor(this.document());
  }

  getFormatLabel(): string {
    const doc = this.document();
    const mime = this.isNoteDocument()
      ? (doc.properties?.[NUXEO_SCHEMA_FIELDS.note.mimeType] ?? doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.format])
      : (doc.properties?.[NUXEO_SCHEMA_FIELDS.file.content]?.['mime-type'] ??
        doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.format]);
    const value = mime == null ? '' : String(mime);
    return value || '—';
  }

  getArkivExportZip() {
    return this.document().properties[NUXEO_SCHEMA_FIELDS.arkiv.exportZip];
  }

  getArkivExportZipName(): string {
    return String(this.getArkivExportZip()?.name ?? '');
  }

  getArkivExportZipSize(): string {
    const length = this.getArkivExportZip()?.length;
    if (length === null || length === undefined || length === '') {
      return '';
    }
    return formatFileSize(Number(length));
  }

  getArkivExportZipUrl(): string {
    return String(this.getArkivExportZip()?.blobUrl ?? '');
  }

  getArkivMyndighetLabel(): string {
    const myndighet = this.document().properties[NUXEO_SCHEMA_FIELDS.arkiv.myndighet];
    if (myndighet && 'title' in Object(myndighet)) {
      return String(Object(myndighet)['title']);
    }
    return this.arkivMyndighetLabel();
  }

  getNatureLabel(): string {
    const value = this.document().properties[NUXEO_SCHEMA_FIELDS.dc.nature];
    const label = value?.properties?.label ?? '';
    if (label) return String(label);
    const natureId = value?.id ?? value?.properties?.id ?? value;
    const key = natureId ? `label.nature.${natureId}` : '';
    return key ? (this.store.messagesInfo()?.[key] ?? '') : '';
  }

  getSubjectLabels(): string[] {
    const value = this.document().properties[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const items = Array.isArray(value) ? value : [value];
    return items
      .map(item => {
        return String(item?.properties?.['label_en'] ?? item?.properties?.['label'] ?? '');
      })
      .filter(item => item.length > 0);
  }

  getCoverageLabel(): string {
    const value = this.document().properties[NUXEO_SCHEMA_FIELDS.dc.coverage];
    const labelText = value?.properties?.['label_en'] ?? value?.properties?.['label'] ?? '';
    const parentLabel =
      value?.properties?.['parent']?.properties?.['label_en'] ??
      value?.properties?.['parent']?.properties?.['label'] ??
      '';
    return parentLabel && labelText ? `${parentLabel}/${labelText}` : parentLabel || labelText;
  }

  getEpostmallSubjectLabel(): string {
    const value = this.document().properties[NUXEO_SCHEMA_FIELDS.epostmall.amne];
    const text = value == null ? '' : String(value).trim();
    return text || '—';
  }

  getUtkastmallProperties(): { nyckel: string; varde: string }[] {
    const value = this.document().properties[NUXEO_SCHEMA_FIELDS.utkastmall.egenskaper];
    if (!Array.isArray(value)) return [];
    return value
      .map(entry => {
        const record = Object(entry);
        const nyckel = String(Reflect.get(record, 'nyckel') ?? '').trim();
        const varde = String(Reflect.get(record, 'varde') ?? '').trim();
        return { nyckel, varde };
      })
      .filter(entry => entry.nyckel.length > 0 || entry.varde.length > 0);
  }

  getInitials(name: string): string {
    return getInitials(name);
  }

  getAuditLabel(entry: AuditEntry): string {
    return entry.eventId ?? '';
  }

  getAuditTime(entry: AuditEntry): string {
    return formatDateOrMissing(entry.eventDate ?? entry.logDate);
  }

  onTabChanged(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  onNewTagInput(event: Event): void {
    const target = Object(event)['target'];
    const value = Object(target)['value'] ?? '';
    this.newTagInput.set(String(value));
  }

  addTag(): void {
    const documentId = this.document().uid;
    const raw = this.newTagInput().trim();
    if (!documentId || !raw) return;

    if (this.tagLabels().includes(raw)) {
      this.newTagInput.set('');
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: TAG_ALREADY_EXISTS_MESSAGE,
      });
      return;
    }

    this.nuxeoApi
      .tagDocument(documentId, raw)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updatedDoc => {
          this.tagLabels.set(this.extractTagLabels(updatedDoc?.properties?.[NUXEO_SCHEMA_FIELDS.nxtag.tags]));
          this.newTagInput.set('');
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: TAG_ADDED_MESSAGE,
          });
          this.reloadDocument.emit();
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: TAG_ADD_ERROR_MESSAGE,
          });
        },
      });
  }

  removeTag(tag: string): void {
    const documentId = this.document().uid;
    if (!documentId) return;
    if (!tag) return;

    this.nuxeoApi
      .untagDocument(documentId, tag)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updatedDoc => {
          this.tagLabels.set(this.extractTagLabels(updatedDoc?.properties?.[NUXEO_SCHEMA_FIELDS.nxtag.tags]));
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: TAG_REMOVED_MESSAGE,
          });
          this.reloadDocument.emit();
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: TAG_REMOVE_ERROR_MESSAGE,
          });
        },
      });
  }

  onAttachmentFilesChange(files: UploadedFile[]): void {
    const documentId = this.document().uid;
    if (!documentId || !files?.length) return;

    const newFiles = files.filter(
      file => !this.uploadedAttachmentIds.has(file.id) && !this.pendingAttachmentIds.has(file.id)
    );
    if (!newFiles.length) return;

    newFiles.forEach(file => this.pendingAttachmentIds.add(file.id));
    this.isUploadingAttachments.set(true);

    this.nuxeoApi
      .initializeUpload()
      .pipe(
        switchMap(batch => {
          const uploads = newFiles.map((file, index) =>
            this.nuxeoApi
              .uploadFile(batch.batchId, [file], index)
              .pipe(map(() => ({ file, batchId: batch.batchId, fileId: index })))
          );

          return forkJoin(uploads);
        }),
        switchMap(uploads => this.persistAttachments(documentId, uploads)),
        finalize(() => this.isUploadingAttachments.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          newFiles.forEach(file => {
            this.pendingAttachmentIds.delete(file.id);
            this.uploadedAttachmentIds.add(file.id);
          });
          this.reloadDocument.emit();
        },
        error: () => {
          newFiles.forEach(file => this.pendingAttachmentIds.delete(file.id));
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: ATTACHMENTS_UPLOAD_ERROR_MESSAGE,
          });
        },
      });
  }

  openNoteAttachment(attachment: DocumentAttachmentItem): void {
    if (!attachment.inlineUrl) return;
    const fileDocId = attachment.fileDocId;
    if (fileDocId) {
      this.nuxeoApi
        .getDocumentById(fileDocId, true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: doc => {
            this.previewDoc.set(doc);
            this.previewAttachment.set(attachment);
          },
          error: () => {
            this.previewDoc.set(null);
            this.previewAttachment.set(attachment);
          },
        });
      return;
    }

    this.previewDoc.set(null);
    this.previewAttachment.set(attachment);
  }

  deleteNoteAttachment(index: number): void {
    const documentId = this.document().uid;
    if (!documentId) return;
    this.nuxeoApi
      .deleteAttachment(index, documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.noteAttachments.update(items => items.filter((_, idx) => idx !== index));
          this.reloadDocument.emit();
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: ATTACHMENT_DELETE_ERROR_MESSAGE,
          });
        },
      });
  }

  triggerReplaceAttachment(index: number): void {
    this.replaceAttachmentIndex.set(index);
    this.replaceInput?.nativeElement.click();
  }

  onReplaceFileSelected(event: Event): void {
    const index = this.replaceAttachmentIndex();
    const target = Object(event)['target'];
    const filesValue = Reflect.get(Object(target), 'files');
    const fileCandidate = Reflect.get(Object(filesValue), '0');
    const file = fileCandidate instanceof File ? fileCandidate : null;

    if (index == null || !file || !this.document().uid) {
      if (target) {
        Reflect.set(Object(target), 'value', '');
      }
      return;
    }

    const uploadFile = Object.assign(file, { id: `replace-${Date.now()}` });
    this.isUploadingAttachments.set(true);

    this.nuxeoApi
      .initializeUpload()
      .pipe(
        switchMap(batch => this.nuxeoApi.uploadFile(batch.batchId, [uploadFile], 0).pipe(map(() => batch.batchId))),
        switchMap(batchId => this.replaceAttachmentAtIndex(this.document().uid, batchId, index)),
        finalize(() => {
          this.isUploadingAttachments.set(false);
          this.replaceAttachmentIndex.set(null);
          if (target) {
            Reflect.set(Object(target), 'value', '');
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.reloadDocument.emit();
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: ATTACHMENT_REPLACE_ERROR_MESSAGE,
          });
        },
      });
  }

  private getDocumentTags(): string[] {
    const tags = this.document().properties?.[NUXEO_SCHEMA_FIELDS.nxtag.tags];
    return this.extractTagLabels(tags);
  }

  private extractTagLabels(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];
    const labels = tags
      .map(tagEntry => {
        if (Object.prototype.toString.call(tagEntry) === '[object String]') {
          return String(tagEntry).trim();
        }
        const record = Object(tagEntry);
        const labelValue = Reflect.get(record, 'label');
        const valueValue = Reflect.get(record, 'value');
        const labelText =
          Object.prototype.toString.call(labelValue) === '[object String]' ? String(labelValue).trim() : '';
        const valueText =
          Object.prototype.toString.call(valueValue) === '[object String]' ? String(valueValue).trim() : '';
        return labelText || valueText;
      })
      .map(entry => entry.trim())
      .filter(tagValue => tagValue.length > 0);
    return Array.from(new Set(labels));
  }

  private getVersionLabelFor(doc: NuxeoDocument | null | undefined): string {
    if (!doc) return '—';
    const major = doc.properties?.[NUXEO_SCHEMA_FIELDS.uid.majorVersion];
    const minor = doc.properties?.[NUXEO_SCHEMA_FIELDS.uid.minorVersion];
    const majorValue = major == null ? '' : String(major);
    const minorValue = minor == null ? '' : String(minor);
    if (majorValue && minorValue) return `${majorValue}.${minorValue}`;
    return majorValue || '—';
  }

  private syncAttachments(doc: NuxeoDocument): void {
    const fileEntries = doc.properties?.[NUXEO_SCHEMA_FIELDS.files.files];
    if (Array.isArray(fileEntries) && fileEntries.length) {
      this.noteAttachments.set(this.mapNoteAttachments(fileEntries, doc.uid));
      this.attachments.set([]);
      this.isLoadingAttachments.set(false);
      return;
    }

    if (this.isFolderish()) {
      this.loadAttachmentDocuments(doc.uid);
      return;
    }

    this.noteAttachments.set([]);
    this.attachments.set([]);
    this.isLoadingAttachments.set(false);
  }

  private loadAttachmentDocuments(documentId: string): void {
    this.isLoadingAttachments.set(true);
    this.nuxeoApi
      .getEntriesForParentPath<NuxeoFileDocument>(documentId)
      .pipe(
        map(result => (result.entries ?? []).filter(entry => entry.type === 'Fil')),
        tap(entries => this.attachments.set(entries)),
        finalize(() => this.isLoadingAttachments.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        error: () => {
          this.attachments.set([]);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: ATTACHMENTS_LOAD_ERROR_MESSAGE,
          });
        },
      });
  }

  private mapNoteAttachments(entries: FilesEntry[], documentId: string): DocumentAttachmentItem[] {
    return entries.map((entry, index) => {
      const file = entry.file ?? {};
      const title = file.name ?? `Bilaga ${index + 1}`;
      const blobUrl = this.resolveBlobUrl(file);
      const rawMimeType = file['mime-type'] ?? '';
      const mimeType = rawMimeType ? String(rawMimeType) : '';
      const fileKind = this.inferFileKind(mimeType, title);
      const inlineUrl = this.buildAttachmentPreviewUrl(blobUrl, documentId, index, fileKind);
      const downloadUrl = blobUrl || '';
      const fileDocId = this.extractFileDocId(blobUrl, documentId);
      return {
        id: `${documentId}-${index}`,
        title,
        typeLabel: 'bilaga',
        mimeType,
        fileKind,
        fileDocId,
        blobUrl,
        inlineUrl,
        downloadUrl,
      };
    });
  }

  private resolveBlobUrl(file: NxBlobLike): string {
    const blobUrlValue = file.blobUrl;
    const blobUrlText =
      Object.prototype.toString.call(blobUrlValue) === '[object String]' ? String(blobUrlValue).trim() : '';
    if (blobUrlText) return blobUrlText;

    const dataValue = file.data;
    const dataText = Object.prototype.toString.call(dataValue) === '[object String]' ? String(dataValue).trim() : '';
    if (dataText) return dataText;

    const record = Object(file);
    const downloadUrl = Reflect.get(record, 'download-url');
    const downloadUrlText =
      Object.prototype.toString.call(downloadUrl) === '[object String]' ? String(downloadUrl).trim() : '';
    return downloadUrlText;
  }

  private buildInlineUrl(url: string): string {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}inline=true`;
  }

  private buildAttachmentPreviewUrl(
    blobUrl: string,
    documentId: string,
    index: number,
    kind: DocumentAttachmentItem['fileKind']
  ): string {
    if (!blobUrl) return '';
    if (kind !== 'other') {
      return this.buildInlineUrl(blobUrl);
    }
    const xpath = `files:files/${index}/file`;
    return `/nuxeo/api/v1/repo/default/id/${documentId}/@rendition/pdf?xpath=${encodeURIComponent(xpath)}`;
  }

  private extractFileDocId(blobUrl: string, documentId: string): string | undefined {
    if (!blobUrl) return undefined;
    const match = blobUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!match) return undefined;
    const candidate = match[0];
    if (candidate === documentId) return undefined;
    return candidate;
  }

  private inferFileKind(mimeType: string, name: string): DocumentAttachmentItem['fileKind'] {
    const rawMime = mimeType || '';
    if (rawMime.startsWith('image/')) return 'img';
    if (rawMime.startsWith('video/')) return 'video';
    if (rawMime === 'application/pdf') return 'pdf';

    const ext = name.split('.').pop() || '';
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'img';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
    return 'other';
  }

  private replaceAttachmentAtIndex(documentId: string, batchId: string, index: number): Observable<unknown> {
    const existingEntries = this.getExistingFileEntries();
    if (!existingEntries.length || index < 0 || index >= existingEntries.length) {
      return of(null);
    }

    const updatedEntries = [...existingEntries];
    updatedEntries[index] = this.buildFilesEntry(batchId, 0);
    return this.nuxeoApi.editDocument(documentId, { [NUXEO_SCHEMA_FIELDS.files.files]: updatedEntries });
  }

  private persistAttachments(
    documentId: string,
    uploads: { file: UploadedFile; batchId: string; fileId: number }[]
  ): Observable<unknown> {
    if (!uploads.length) {
      return of(null);
    }

    if (this.supportsFilesSchema()) {
      const existingEntries = this.getExistingFileEntries();
      const newEntries = uploads.map(upload => this.buildFilesEntry(upload.batchId, upload.fileId));
      const mergedEntries = [...existingEntries, ...newEntries];
      return this.nuxeoApi.editDocument(documentId, { [NUXEO_SCHEMA_FIELDS.files.files]: mergedEntries });
    }

    if (this.isFolderish()) {
      return forkJoin(
        uploads.map(upload =>
          this.nuxeoApi.attachFile(
            upload.batchId,
            upload.file.name,
            documentId,
            NUXEO_VOCAB_IDS.filTyp.bilaga,
            upload.fileId
          )
        )
      );
    }

    const existingEntries = this.getExistingFileEntries();
    const newEntries = uploads.map(upload => this.buildFilesEntry(upload.batchId, upload.fileId));
    const mergedEntries = [...existingEntries, ...newEntries];
    return this.nuxeoApi.editDocument(documentId, { [NUXEO_SCHEMA_FIELDS.files.files]: mergedEntries });
  }

  private buildFilesEntry(batchId: string, fileId: number): FilesEntry {
    return {
      file: {
        'upload-batch': batchId,
        'upload-fileId': String(fileId),
      },
    };
  }

  private getExistingFileEntries(): FilesEntry[] {
    const entries = this.document().properties?.[NUXEO_SCHEMA_FIELDS.files.files];
    return Array.isArray(entries) ? [...entries] : [];
  }

  private supportsFilesSchema(): boolean {
    const schemas = this.document().schemas ?? [];
    return schemas.some(schema => schema.name === 'files');
  }

  private isFolderish(): boolean {
    return this.document().facets?.includes('Folderish') ?? false;
  }
}
