import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiDialog, DigiButton } from '@designsystem-se/af-angular';
import { DomSanitizer } from '@angular/platform-browser';
import { NuxeoDocument, NxBlobLike } from '@app/shared/api/nuxeo-api.types';
import { FileUploadComponent, UploadedFile } from '../file-upload/file-upload.component';
import { switchMap, tap } from 'rxjs';
import { ImageButtonComponent } from '../image-button/image-button.component';
import { RouterLink } from '@angular/router';
import { formatFileSize } from '@app/shared/utils/download-utils';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [DigiDialog, FileUploadComponent, DigiButton, ImageButtonComponent, RouterLink],
})
export class PdfViewerComponent {
  sanitizer = inject(DomSanitizer);
  mimeType = input();
  isPreview = input(false);
  canDelete = input(true);
  useBackendPrint = input(false);
  showDownloadButton = input(true);
  showActionButtons = input(true);
  parentDoc = input<NuxeoDocument<object>>();
  blobUrl = input<string>('');
  shouldShowPreview = signal<boolean>(false);
  showDeleteConfirmation = signal<boolean>(false);
  showFileUpload = signal<boolean>(false);
  fileBatchId = '';
  updFile: UploadedFile[] | null = null;
  doc = input.required<NuxeoDocument>();
  readonly nuxeoApi = inject(NuxeoApiService);
  reloadDocument = output();
  backendPrintRequested = output<NuxeoDocument>();
  downloadUrl!: string;
  fileType = signal('');
  fileLink = computed(() => this.getFileLink());
  filePreviewLink = computed(() => ['/doc', this.doc().uid]);
  fileName = computed(() => this.getFileBlob()?.name ?? '');
  fileSize = computed(() => this.getFileSize());
  hasFileMetadata = computed(() => Boolean(this.fileName() || this.fileSize()));
  @ViewChild('pdfFrame') private pdfFrame?: ElementRef<HTMLIFrameElement>;

  constructor() {
    effect(() => {
      if (!this.doc()?.uid) return;
      this.downloadUrl = this.nuxeoApi.downloadFile(this.doc().uid);
    });
    effect(() => {
      if (!this.doc()) return;

      this.fileType.set(this.getFileType());
    });
  }

  getFileType() {
    const mimeValue = this.mimeType() ?? this.doc()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content]?.['mime-type'];
    const mime = typeof mimeValue === 'string' ? mimeValue : '';

    if (/^image\//i.test(mime) || /application\/(photoshop|illustrator|postscript)/i.test(mime)) {
      return 'img';
    }
    if (/^video\//i.test(mime)) {
      return 'video';
    }
    return 'pdf';
  }

  getFileBlob(): NxBlobLike | undefined {
    return (
      this.doc()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content] ??
      this.doc()?.properties?.[NUXEO_SCHEMA_FIELDS.fil.vattenstampel]
    );
  }

  getFileSize(): string {
    const length = this.getFileBlob()?.length;
    const lengthNumber = Number(length);

    if (!Number.isFinite(lengthNumber) || lengthNumber <= 0) return '';

    return formatFileSize(lengthNumber);
  }

  getImageUrl(): string {
    if (this.blobUrl()) {
      return this.blobUrl();
    }
    const base = '/nuxeo/nxfile/default';
    const blob = this.doc().properties?.[NUXEO_SCHEMA_FIELDS.file.content];
    return `${base}/${this.doc().uid}/file:content/${blob?.name}?changeToken=${this.doc()?.changeToken}&clientReason=view`;
  }

  getFileLink() {
    let fileUrl;
    const baseViewer = '/nuxeo/ui/vendor/pdfjs/web/viewer.html';

    if (this.blobUrl()) {
      fileUrl = this.blobUrl();
    } else if (
      this.doc()?.properties?.[NUXEO_SCHEMA_FIELDS.fil.vattenstampel] &&
      !this.doc()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content]
    ) {
      const fileName = this.doc()?.properties[NUXEO_SCHEMA_FIELDS.fil.vattenstampel]?.name;
      fileUrl = `/nuxeo/nxfile/default/${this.doc()?.uid}/${NUXEO_SCHEMA_FIELDS.fil.vattenstampel}/${fileName}?changeToken=${this.doc().changeToken}`;
    } else if (this.doc()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content]?.['mime-type'] === 'application/pdf') {
      const fileName = this.doc()?.properties[NUXEO_SCHEMA_FIELDS.file.content]?.name;
      fileUrl = `/nuxeo/nxfile/default/${this.doc()?.uid}/file:content/${fileName}?changeToken=${this.doc().changeToken}`;
    } else {
      fileUrl = `/nuxeo/api/v1/repo/default/id/${this.doc()?.uid}/@rendition/pdf`;
    }

    const encodedFileUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `${baseViewer}?file=${encodedFileUrl}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  deleteAttachment() {
    this.nuxeoApi
      .deleteDocument(this.doc()?.uid)
      .pipe(tap(() => this.reloadDocument.emit()))
      .subscribe();
  }

  uploadFile(event: UploadedFile[]) {
    this.updFile = event;

    this.nuxeoApi
      .initializeUpload()
      .pipe(
        tap(result => (this.fileBatchId = result.batchId)),
        switchMap(result => this.nuxeoApi.uploadFile(result.batchId, event))
      )
      .subscribe();
  }
  downloadFile() {
    window.location.href = this.downloadUrl;
  }

  printFile() {
    if (this.useBackendPrint()) {
      this.backendPrintRequested.emit(this.doc());
      return;
    }
    const iframe = this.pdfFrame?.nativeElement;
    iframe?.contentWindow?.print();
  }

  confirmFileReplace() {
    const parent = this.parentDoc();
    if (!this.updFile) return;
    if (this.doc()?.uid) {
      this.nuxeoApi
        .updateFile(this.doc().uid, this.fileBatchId, this.updFile[0])
        .pipe(tap(() => this.reloadDocument.emit()))
        .subscribe();
    } else if (parent?.uid) {
      this.nuxeoApi
        .attachFile(this.fileBatchId, this.updFile[0].name, parent.uid)
        .pipe(tap(() => this.reloadDocument.emit()))
        .subscribe();
    }
  }
}
