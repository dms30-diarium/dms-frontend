import { inject, Injectable, WritableSignal } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { Observable, of, tap } from 'rxjs';
import { map } from 'rxjs/operators';
type AnyRecord = Record<string, unknown>;
@Injectable({ providedIn: 'root' })
export class DocumentValueService {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly documentTitleCache = new Map<string, string>();

  isRecord(value: unknown): value is AnyRecord {
    return typeof value === 'object' && value !== null;
  }

  getString(obj: AnyRecord, key: string): string | undefined {
    const v = obj[key];
    return typeof v === 'string' ? v : undefined;
  }

  getDirectoryLabel(value: unknown): string {
    if (!value) return '';

    if (typeof value === 'string') {
      return value;
    }

    if (!this.isRecord(value)) return '';

    const properties = this.isRecord(value['properties']) ? value['properties'] : undefined;

    return this.getString(properties ?? {}, 'id') ?? this.getString(value, 'id') ?? '';
  }

  resolveDocumentTitle(uid: string | undefined, field?: WritableSignal<string>): Observable<string> {
    if (!uid) return of('');
    return this.nuxeoApi.getDocumentById(uid).pipe(
      tap(doc => field?.set(doc.title)),
      map(doc => doc.title)
    );
  }

  resolveDocumentTitles(uids: string[]): Observable<Record<string, string>> {
    const uniqueUids = Array.from(new Set(uids.filter(Boolean)));
    const missing = uniqueUids.filter(uid => !this.documentTitleCache.has(uid));
    if (!missing.length) return of(this.getTitleRecord(uniqueUids));

    return this.nuxeoApi.getSeveralDocsByUids(missing).pipe(
      map(result => {
        result.entries.forEach(entry => {
          this.documentTitleCache.set(entry.uid, entry.title ?? entry.uid);
        });
        return this.getTitleRecord(uniqueUids);
      })
    );
  }

  private getTitleRecord(uids: string[]): Record<string, string> {
    const record: Record<string, string> = {};
    uids.forEach(uid => {
      const title = this.documentTitleCache.get(uid);
      if (title) record[uid] = title;
    });
    return record;
  }

  getDate(value: string | Date | null | undefined): string {
    return formatDateOrMissing(value);
  }

  getHandlingStatusLabel(state: string | null | undefined): string {
    return state ?? '';
  }

  resolveValue(value: unknown): string | Observable<string> {
    if (!value) return '';

    if (typeof value === 'string' && this.isUuid(value)) {
      return this.nuxeoApi.getDocumentById(value).pipe(map(doc => doc.title));
    }

    if (typeof value === 'string' && this.isIsoDate(value)) {
      return this.getDate(value);
    }

    if (typeof value === 'string' || typeof value === 'object') {
      return this.getDirectoryLabel(value);
    }

    return '';
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }
}
