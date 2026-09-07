import { inject, Injectable, WritableSignal } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { GeneralStore } from '@app/core/services/general-store.service';
import { PrintService } from '@app/core/services/print.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import {
  buildPrintLoadingMessage,
  SELECTED_FILES_DOWNLOAD_SELECTION_REQUIRED_MESSAGE,
  SELECTED_FILES_MERGE_ERROR_MESSAGE,
  SELECTED_FILES_MERGE_SELECTION_REQUIRED_MESSAGE,
  SELECTED_FILES_NONE_PRINTABLE_MESSAGE,
  SELECTED_FILES_NO_FILES_TO_PRINT_MESSAGE,
  SELECTED_FILES_PARTIAL_PRINTABLE_MESSAGE,
  SELECTED_FILES_PREPARING_PDF_MESSAGE,
  SELECTED_FILES_PRINT_SELECTION_REQUIRED_MESSAGE,
  SELECTED_FILES_SELECTED_NOT_FOUND_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Injectable({ providedIn: 'root' })
export class SelectedFilesToolbarService {
  private readonly nuxeoApiService = inject(NuxeoApiService);
  private readonly printService = inject(PrintService);
  private readonly store = inject(GeneralStore);
  private isPrintingFiles = false;

  updateFileSelection(
    selectedFileIds: WritableSignal<Set<string>>,
    event: { file: NuxeoDocument; selected: boolean }
  ): void {
    selectedFileIds.update(current => {
      const next = new Set(current);
      if (event.selected) {
        next.add(event.file.uid);
      } else {
        next.delete(event.file.uid);
      }
      return next;
    });
  }

  updateAttachmentSelection(
    selectedFileIds: WritableSignal<Set<string>>,
    event: { files: NuxeoDocument[]; selected: boolean }
  ): void {
    selectedFileIds.update(current => {
      const next = new Set(current);
      event.files.forEach(file => {
        if (event.selected) {
          next.add(file.uid);
        } else {
          next.delete(file.uid);
        }
      });
      return next;
    });
  }

  clearSelection(selectedFileIds: WritableSignal<Set<string>>): void {
    selectedFileIds.set(new Set());
  }

  printSelectedFiles(files: NuxeoDocument[], selectedFileIds: Set<string>): void {
    if (this.isPrintingFiles) return;

    if (!files.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: SELECTED_FILES_NO_FILES_TO_PRINT_MESSAGE,
      });
      return;
    }

    if (!selectedFileIds.size) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: SELECTED_FILES_PRINT_SELECTION_REQUIRED_MESSAGE,
      });
      return;
    }

    const filesToPrint = files.filter(file => selectedFileIds.has(file.uid));
    if (!filesToPrint.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: SELECTED_FILES_SELECTED_NOT_FOUND_MESSAGE,
      });
      return;
    }

    const printableQueue = this.printService.getPrintableDocuments(filesToPrint);
    if (!printableQueue.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: SELECTED_FILES_NONE_PRINTABLE_MESSAGE,
      });
      return;
    }

    if (printableQueue.length !== filesToPrint.length) {
      this.store.notification.set({
        show: true,
        variation: 'info',
        text: SELECTED_FILES_PARTIAL_PRINTABLE_MESSAGE,
      });
    }

    this.isPrintingFiles = true;
    this.printService.printDocuments(
      printableQueue,
      file => this.notifyPrintLoading(file),
      () => {
        this.isPrintingFiles = false;
      }
    );
  }

  downloadSelectedFilesAsZip(selectedFileIds: Set<string>): void {
    const selectedIds = Array.from(selectedFileIds);
    if (!selectedIds.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: SELECTED_FILES_DOWNLOAD_SELECTION_REQUIRED_MESSAGE,
      });
      return;
    }

    this.nuxeoApiService.downloadBulk(selectedIds).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'selection.zip';
      link.click();
    });
  }

  mergeSelectedFilesAsPdf(caseUid: string, selectedFileIds: Set<string>): void {
    const selectedIds = Array.from(selectedFileIds);
    if (!selectedIds.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: SELECTED_FILES_MERGE_SELECTION_REQUIRED_MESSAGE,
      });
      return;
    }

    this.store.notification.set({
      show: true,
      variation: 'info',
      text: SELECTED_FILES_PREPARING_PDF_MESSAGE,
    });

    this.nuxeoApiService.downloadAllFiles(caseUid, selectedIds).subscribe({
      next: response => this.saveDownloadResponse(response),
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: SELECTED_FILES_MERGE_ERROR_MESSAGE,
        });
      },
    });
  }

  private notifyPrintLoading(file: NuxeoDocument): void {
    this.store.notification.set({
      show: true,
      variation: 'info',
      text: buildPrintLoadingMessage(file.title),
      belowTopPanel: true,
    });
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
    this.store.notification.set({ show: false });
  }
}
