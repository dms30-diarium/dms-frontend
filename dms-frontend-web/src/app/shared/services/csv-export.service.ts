import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GeneralStore } from '@app/core/services/general-store.service';
import { EMPTY, catchError, tap } from 'rxjs';
import {
  CSV_EXPORT_ABORTED_MESSAGE,
  CSV_EXPORT_DOWNLOAD_LINK_ERROR_MESSAGE,
  CSV_EXPORT_EXTRACT_ID_ERROR_MESSAGE,
  CSV_EXPORT_FAILED_MESSAGE,
  CSV_EXPORT_LOADING_MESSAGE,
  CSV_EXPORT_NO_COLUMNS_MESSAGE,
  CSV_EXPORT_RESULT_ERROR_MESSAGE,
  CSV_EXPORT_START_ERROR_MESSAGE,
  CSV_EXPORT_TIMEOUT_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';

interface ExportStatusResponse {
  url?: string;
  value?: {
    commandId: string;
    state: string;
    completed: string | null;
    url?: string;
  };
  state?: string;
}

interface ExportResultResponse {
  url?: string;
  value?: {
    url: string;
  };
}

export interface CSVExportConfig {
  headers: string[];
  fields: string[];
  providerName: string;
  currentPageIndex: number;
  offset: number;
  pageSize: number;
  namedParameters: Record<string, unknown>;
  queryParams: unknown[];
}

export interface CSVExportColumnSource {
  label: string;
  key: string;
  sortField?: string;
  searchField?: string;
}

export interface CSVExportColumn {
  header: string;
  field: string;
}

export interface LocalCSVExportConfig {
  headers: string[];
  rows: string[][];
  filename: string;
}

@Injectable({
  providedIn: 'root',
})
export class CSVExportService {
  private readonly startExportUrl = '/nuxeo/api/v1/automation/Export.CSVExport/@async';
  private readonly exportStatusUrl = '/nuxeo/site/api/v1/automation/Export.CSVExport/@async';
  private http = inject(HttpClient);
  private store = inject(GeneralStore);
  private finalizedAsyncIds = new Set<string>();

  getExportColumns(columns: CSVExportColumnSource[], excludedFields: string[]): CSVExportColumn[] {
    const exportColumns = columns
      .map(col => ({
        header: col.label,
        field: String(col.sortField || col.searchField || col.key),
      }))
      .filter(
        (col): col is CSVExportColumn =>
          !!col.field &&
          col.field !== 'actions' &&
          col.field !== 'padding' &&
          !col.field.startsWith('case:') &&
          !excludedFields.includes(col.field)
      );

    const seenFields = new Set<string>();
    return exportColumns.filter(col => {
      if (seenFields.has(col.field)) {
        return false;
      }
      seenFields.add(col.field);
      return true;
    });
  }

  exportToCSV(config: CSVExportConfig): void {
    this.notifyLoading(CSV_EXPORT_LOADING_MESSAGE);

    const exportParams = {
      params: config,
    };

    this.http
      .post<object>(this.startExportUrl, exportParams, { observe: 'response' })
      .pipe(
        tap(response => {
          const locationHeader = response.headers.get('location') ?? response.headers.get('Location');
          const match = locationHeader?.match(/\/([^/]+)\/status/);
          const asyncId = match?.[1];

          if (asyncId) {
            this.pollExportStatus(asyncId);
          } else {
            this.notifyError(CSV_EXPORT_EXTRACT_ID_ERROR_MESSAGE);
          }
        }),
        catchError(() => {
          this.notifyError(CSV_EXPORT_START_ERROR_MESSAGE);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private pollExportStatus(asyncId: string, retries = 0, maxRetries = 30): void {
    if (this.finalizedAsyncIds.has(asyncId)) {
      return;
    }

    if (retries >= maxRetries) {
      this.notifyError(CSV_EXPORT_TIMEOUT_ERROR_MESSAGE);
      return;
    }

    setTimeout(() => {
      const statusUrl = `${this.exportStatusUrl}/${asyncId}/status`;

      this.http
        .get<ExportStatusResponse>(statusUrl, { observe: 'response' })
        .pipe(
          tap(fullResponse => {
            if (fullResponse.body) {
              this.handleStatusResponse(asyncId, fullResponse.body, retries, maxRetries);
            }
          }),
          catchError(() => {
            this.pollExportStatus(asyncId, retries + 1, maxRetries);
            return EMPTY;
          })
        )
        .subscribe();
    }, 500);
  }

  private handleStatusResponse(
    asyncId: string,
    response: ExportStatusResponse,
    retries: number,
    maxRetries: number
  ): void {
    if (this.finalizedAsyncIds.has(asyncId)) {
      return;
    }

    const state = response.value?.state || response.state;
    const commandId = response.value?.commandId;
    const resultUrl = response.url || response.value?.url;

    if (resultUrl) {
      this.clearNotification();
      this.finalizeAsync(asyncId);
      this.downloadFromUrl(resultUrl);
      return;
    }

    if (state === 'COMPLETED' || state === 'DONE') {
      this.fetchExportResult(commandId || asyncId, asyncId);
      return;
    }

    if (state === 'FAILED') {
      this.finalizeAsync(asyncId);
      this.notifyError(CSV_EXPORT_FAILED_MESSAGE);
      return;
    }

    if (state === 'ABORTED') {
      this.finalizeAsync(asyncId);
      this.notifyError(CSV_EXPORT_ABORTED_MESSAGE);
      return;
    }

    this.pollExportStatus(asyncId, retries + 1, maxRetries);
  }

  private fetchExportResult(resultId: string, asyncId: string): void {
    if (this.finalizedAsyncIds.has(asyncId)) {
      return;
    }

    const resultUrl = `${this.exportStatusUrl}/${resultId}`;

    this.http
      .get<ExportResultResponse>(resultUrl)
      .pipe(
        tap(response => {
          const url = response.url || response.value?.url;
          if (url) {
            this.clearNotification();
            this.finalizeAsync(asyncId);
            this.downloadFromUrl(url);
          } else {
            this.notifyError(CSV_EXPORT_DOWNLOAD_LINK_ERROR_MESSAGE);
          }
        }),
        catchError(() => {
          this.notifyError(CSV_EXPORT_RESULT_ERROR_MESSAGE);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private downloadFromUrl(url: string, filename?: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener';
    if (filename) {
      link.download = filename;
    }
    link.click();
  }

  notifyError(text: string): void {
    this.store.notification.set({
      show: true,
      variation: 'danger',
      text,
    });
  }

  private notifyLoading(text: string): void {
    this.store.notification.set({
      show: true,
      variation: 'info',
      text,
    });
  }

  notifyNoExportableColumns(): void {
    this.store.notification.set({
      show: true,
      variation: 'danger',
      text: CSV_EXPORT_NO_COLUMNS_MESSAGE,
    });
  }

  exportRowsToCSV(config: LocalCSVExportConfig): void {
    const content = this.toCsvContent(config.headers, config.rows);
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    this.downloadFromUrl(url, `${config.filename}.csv`);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private toCsvContent(headers: string[], rows: string[][]): string {
    return [headers, ...rows].map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  private clearNotification(): void {
    this.store.notification.set({ show: false });
  }

  private finalizeAsync(asyncId: string): void {
    this.finalizedAsyncIds.add(asyncId);
  }
}
