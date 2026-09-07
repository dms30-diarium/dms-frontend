import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { FileItem, Filer } from '@app/pages/case-page/case-types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  DOWNLOAD_ALL_FILES_ERROR_MESSAGE,
  DOWNLOAD_ALL_FILES_PREPARING_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { formatFileSize } from '@app/shared/utils/download-utils';

@Component({
  selector: 'nuxeo-download-all-files',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './download-all-files.component.html',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule],
})
export class DownloadAllFilesComponent implements OnInit {
  caseUid = input.required<string>();
  readonly apiService = inject(NuxeoApiService);
  readonly store = inject(GeneralStore);
  closeDialog = output();

  downloadModeControl = new FormControl<'merge-all' | 'separate-files'>('merge-all', { nonNullable: true });
  exportOriginalContentControl = new FormControl(true, { nonNullable: true });
  exportPDFRenditionContentControl = new FormControl(false, { nonNullable: true });
  exportWatermarkedContentControl = new FormControl(false, { nonNullable: true });
  filesByHandling = signal<FileItem[]>([]);
  selectedFileIds = signal<string[]>([]);
  isDownloading = signal(false);
  selectedCount = computed(() => this.selectedFileIds().length);
  allFileIds = computed(() => this.filesByHandling().flatMap(fileGroup => fileGroup.filer.map(file => file.id)));
  form = new FormGroup<Record<string, FormControl<boolean>>>({});
  selectAllControl = new FormControl(false, { nonNullable: true });

  ngOnInit(): void {
    this.apiService.getDownloadAllFiles(this.caseUid()).subscribe(data => {
      this.filesByHandling.set(data);
      this.initFilesControls(data);
    });

    this.selectAllControl.valueChanges.subscribe(checked => {
      this.toggleAll(checked);
    });

    this.form.valueChanges.subscribe(() => {
      const selectedFileIds = this.collectSelectedFileIds();
      this.selectedFileIds.set(selectedFileIds);
      this.selectAllControl.setValue(
        this.allFileIds().length > 0 && selectedFileIds.length === this.allFileIds().length,
        {
          emitEvent: false,
        }
      );
    });
  }

  toggleHandlingFiles(fileGroup: FileItem, checked: boolean): void {
    fileGroup.filer.forEach(file => {
      this.form.controls[file.id].setValue(checked, { emitEvent: false });
    });
    this.syncSelectionState();
  }

  toggleHandlingSelection(fileGroup: FileItem): void {
    this.toggleHandlingFiles(fileGroup, !this.isAllHandlingFilesSelected(fileGroup));
  }

  isAllHandlingFilesSelected(fileGroup: FileItem): boolean {
    return fileGroup.filer.every(file => this.form.controls[file.id].value === true);
  }

  selectedCountForHandling(fileGroup: FileItem): number {
    return fileGroup.filer.filter(file => this.form.controls[file.id].value === true).length;
  }

  downloadFiles() {
    const selectedFileIds = this.selectedFileIds();
    if (selectedFileIds.length === 0) {
      return;
    }

    this.isDownloading.set(true);
    this.store.notification.set({
      show: true,
      variation: 'info',
      text: DOWNLOAD_ALL_FILES_PREPARING_MESSAGE,
    });

    const downloadRequest =
      this.downloadModeControl.value === 'separate-files'
        ? this.apiService.LaddanerZipExport(this.caseUid(), selectedFileIds, {
            exportOriginalContent: this.exportOriginalContentControl.value,
            exportPDFRenditionContent: this.exportPDFRenditionContentControl.value,
            exportWatermarkedContent: this.exportWatermarkedContentControl.value,
          })
        : this.apiService.downloadAllFiles(this.caseUid(), selectedFileIds);

    downloadRequest.subscribe(
      response => this.saveDownloadResponse(response),
      () => this.showDownloadError()
    );
  }

  onDownloadModeChange(value: string): void {
    if (value === 'merge-all' || value === 'separate-files') {
      this.downloadModeControl.setValue(value);
    }
  }

  getFileCount(fileIndex: number, totalCount: number): string {
    return `${fileIndex}(${totalCount})`;
  }

  getOriginalFormat(file: Filer): string {
    return file.mimetype;
  }

  getFileSize(file: Filer): string {
    return formatFileSize(file.length);
  }

  private initFilesControls(fileGroups: FileItem[]): void {
    fileGroups.forEach(fileGroup => {
      fileGroup.filer.forEach(file => {
        if (!this.form.contains(file.id)) {
          this.form.addControl(file.id, new FormControl(false, { nonNullable: true }));
        }
      });
    });
  }

  private toggleAll(checked: boolean): void {
    Object.keys(this.form.controls).forEach(fileId => {
      this.form.controls[fileId].setValue(checked, { emitEvent: false });
    });
    this.syncSelectionState();
  }

  private syncSelectionState(): void {
    const selectedFileIds = this.collectSelectedFileIds();
    this.selectedFileIds.set(selectedFileIds);
    this.selectAllControl.setValue(
      this.allFileIds().length > 0 && selectedFileIds.length === this.allFileIds().length,
      {
        emitEvent: false,
      }
    );
  }

  private collectSelectedFileIds(): string[] {
    return Object.entries(this.form.value)
      .filter(([_fileId, selected]) => selected === true)
      .map(([fileId]) => fileId);
  }

  private saveDownloadResponse(response: HttpResponse<Blob>): void {
    const blob = response.body!;
    const contentDispositionHeader = response.headers.get('content-disposition')!;
    const filenameMatch = contentDispositionHeader.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)!;
    const filename = decodeURIComponent(filenameMatch[1]!);

    const objectUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = filename;
    downloadLink.click();
    URL.revokeObjectURL(objectUrl);
    this.isDownloading.set(false);
    this.store.notification.set({ show: false });
  }

  private showDownloadError(): void {
    this.isDownloading.set(false);
    this.store.notification.set({
      show: true,
      variation: 'danger',
      text: DOWNLOAD_ALL_FILES_ERROR_MESSAGE,
    });
  }
}
