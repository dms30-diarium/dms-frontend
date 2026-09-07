import { inject, Injectable } from '@angular/core';
import { catchError, filter, map, of, switchMap, take, tap, timer } from 'rxjs';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';

export interface AuditRefreshOptions {
  intervalMs?: number;
  attempts?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditRefreshService {
  private readonly nuxeoApi = inject(NuxeoApiService);

  loadDocumentWithAudit<P = NuxeoProperties>(id: string) {
    return this.nuxeoApi.getDocumentById<P>(id, true).pipe(
      switchMap(doc => {
        if (!doc.path) return of(doc);
        return this.nuxeoApi.getPathInfo(doc.path, { enrichers: 'audit' }).pipe(
          map(auditDoc => ({
            ...doc,
            contextParameters: {
              ...doc.contextParameters,
              audit: auditDoc.contextParameters?.audit ?? doc.contextParameters?.audit,
            },
          })),
          catchError(() => of(doc))
        );
      })
    );
  }

  refreshAuditAsync<P = NuxeoProperties>(
    id: string,
    previousTimestamp: number,
    onUpdate: (doc: NuxeoDocument<P>) => void,
    options?: AuditRefreshOptions
  ) {
    const intervalMs = options?.intervalMs ?? 1000;
    const attempts = options?.attempts ?? 5;
    return timer(intervalMs, intervalMs).pipe(
      take(attempts),
      switchMap(() => this.loadDocumentWithAudit<P>(id)),
      tap(doc => onUpdate(doc)),
      filter(doc => this.getLatestAuditTimestamp(doc) > previousTimestamp),
      take(1)
    );
  }

  getLatestAuditTimestamp<P = NuxeoProperties>(doc: NuxeoDocument<P> | null): number {
    if (!doc?.contextParameters?.audit?.length) return 0;
    return Math.max(...doc.contextParameters.audit.map(entry => this.toTimestamp(entry)));
  }

  private toTimestamp(entry: AuditEntry): number {
    const value = entry.eventDate ?? entry.logDate;
    if (!value) return 0;
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }
}
