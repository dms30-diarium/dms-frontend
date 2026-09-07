import { ActivatedRoute } from '@angular/router';
import { catchError, of, Subscription, switchMap, tap } from 'rxjs';
import { AuditRefreshService } from '@app/core/services/audit-refresh.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuditEntry, NuxeoDocument, NxUser } from '@app/shared/api/nuxeo-api.types';
import { InfoItem } from '@app/shared/components/document-info-page/document-info-page.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { getUserFullName } from '@app/shared/utils/display-label';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export function sortAuditEntries(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((a, b) => {
    const timeA = Date.parse(a.eventDate ?? a.logDate ?? '');
    const timeB = Date.parse(b.eventDate ?? b.logDate ?? '');
    const valueA = Number.isNaN(timeA) ? 0 : timeA;
    const valueB = Number.isNaN(timeB) ? 0 : timeB;
    return valueB - valueA;
  });
}

export function buildVocabStatusItems(document: NuxeoDocument | null, props: Record<string, unknown>): InfoItem[] {
  return [
    { label: 'Status', value: document?.state ?? '' },
    { label: 'Senast ändrad', value: formatDateOrMissing(document?.lastModified) },
    { label: 'Skapad', value: formatDateOrMissing(props[NUXEO_SCHEMA_FIELDS.dc.created]) },
    { label: 'Skapad av', value: getUserFullName(props[NUXEO_SCHEMA_FIELDS.dc.creator] as NxUser | undefined) },
    {
      label: 'Bidragsgivare',
      value: (props[NUXEO_SCHEMA_FIELDS.dc.contributors] as NxUser[] | undefined)
        ?.map(val => getUserFullName(val))
        .join(' '),
    },
  ];
}

export function loadVocabPage<T>(deps: {
  route: ActivatedRoute;
  auditRefresh: AuditRefreshService;
  docTypeName: string;
  setLoading: (v: boolean) => void;
  setError: (v: boolean) => void;
  setDocument: (doc: NuxeoDocument<T> | null) => void;
  onLoad?: () => void;
  store?: GeneralStore;
}): Subscription {
  const { route, auditRefresh, docTypeName, setLoading, setError, setDocument, onLoad, store } = deps;
  return route.params
    .pipe(
      tap(() => {
        setLoading(true);
        setError(false);
        setDocument(null);
      }),
      switchMap(params => auditRefresh.loadDocumentWithAudit<T>(params['id'])),
      tap(doc => {
        setDocument(doc);
        setLoading(false);
        onLoad?.();
      }),
      catchError(() => {
        store?.notification.set({ show: true, variation: 'danger', text: `Det gick inte att ladda ${docTypeName}.` });
        setError(true);
        setLoading(false);
        return of(null);
      })
    )
    .subscribe();
}

export function saveVocabDocument<T>(deps: {
  uid: string;
  updates: Record<string, unknown>;
  previousAuditTimestamp: number | undefined;
  nuxeoApi: NuxeoApiService;
  auditRefresh: AuditRefreshService;
  store: GeneralStore;
  docTypeName: string;
  onDocumentUpdate: (doc: NuxeoDocument<T>) => void;
  setSaving: (v: boolean) => void;
  setEditOpen: (v: boolean) => void;
  successMsg: string;
  errorMsg: string;
}): void {
  const {
    uid,
    updates,
    previousAuditTimestamp,
    nuxeoApi,
    auditRefresh,
    store,
    onDocumentUpdate,
    setSaving,
    setEditOpen,
    successMsg,
    errorMsg,
  } = deps;

  setSaving(true);
  nuxeoApi
    .editDocument(uid, updates)
    .pipe(
      switchMap(() => auditRefresh.loadDocumentWithAudit<T>(uid)),
      tap(fullDoc => {
        onDocumentUpdate(fullDoc);
        auditRefresh
          .refreshAuditAsync<T>(uid, previousAuditTimestamp ?? 0, updatedDoc => onDocumentUpdate(updatedDoc))
          .subscribe();
        store.notification.set({ show: true, variation: 'success', text: successMsg });
        setSaving(false);
        setEditOpen(false);
      }),
      catchError(() => {
        store.notification.set({ show: true, variation: 'danger', text: errorMsg });
        setSaving(false);
        return of(null);
      })
    )
    .subscribe();
}
