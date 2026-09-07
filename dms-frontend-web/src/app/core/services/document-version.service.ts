import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Injectable({ providedIn: 'root' })
export class DocumentVersionService {
  private readonly nuxeoApi = inject(NuxeoApiService);

  getSourceDocumentId(doc: NuxeoDocument): Observable<string> {
    if (!doc?.uid) return of('');
    if (doc.isProxy) {
      return this.nuxeoApi.getSourceDocumentFromProxy(doc.uid).pipe(map(source => source.uid));
    }
    return of(doc.uid);
  }

  getDocumentVersions(doc: NuxeoDocument): Observable<NuxeoDocument[]> {
    if (!doc?.uid) return of([]);
    const currentMajor = this.parseVersionNumber(doc.properties?.[NUXEO_SCHEMA_FIELDS.uid.majorVersion]);
    const currentMinor = this.parseVersionNumber(doc.properties?.[NUXEO_SCHEMA_FIELDS.uid.minorVersion]);

    return this.getSourceDocumentId(doc).pipe(
      switchMap(sourceId => {
        if (!sourceId) return of([]);
        return this.nuxeoApi.getDocumentVersions(sourceId).pipe(
          map(result => {
            const entries = result.entries ?? [];
            const filtered = entries
              .filter(entry => entry.uid !== sourceId)
              .filter(entry => !this.isSameVersion(entry, currentMajor, currentMinor));
            return this.sortVersions(filtered);
          })
        );
      })
    );
  }

  getVersionDocument(versionId: string): Observable<NuxeoDocument> {
    return this.nuxeoApi.getDocumentById(versionId, true);
  }

  restoreVersion(versionId: string, checkout = false): Observable<NuxeoDocument> {
    return this.nuxeoApi.restoreDocumentVersion(versionId, checkout);
  }

  private sortVersions(entries: NuxeoDocument[]): NuxeoDocument[] {
    return [...entries].sort((a, b) => {
      const majorA = this.parseVersionNumber(a.properties?.[NUXEO_SCHEMA_FIELDS.uid.majorVersion]);
      const majorB = this.parseVersionNumber(b.properties?.[NUXEO_SCHEMA_FIELDS.uid.majorVersion]);
      if (majorA !== majorB) return majorB - majorA;
      const minorA = this.parseVersionNumber(a.properties?.[NUXEO_SCHEMA_FIELDS.uid.minorVersion]);
      const minorB = this.parseVersionNumber(b.properties?.[NUXEO_SCHEMA_FIELDS.uid.minorVersion]);
      if (minorA !== minorB) return minorB - minorA;
      const dateA = new Date(a.properties?.[NUXEO_SCHEMA_FIELDS.dc.modified] ?? a.lastModified ?? 0).getTime();
      const dateB = new Date(b.properties?.[NUXEO_SCHEMA_FIELDS.dc.modified] ?? b.lastModified ?? 0).getTime();
      return dateB - dateA;
    });
  }

  private isSameVersion(entry: NuxeoDocument, major: number, minor: number): boolean {
    if (!major && !minor) return false;
    const entryMajor = this.parseVersionNumber(entry.properties?.[NUXEO_SCHEMA_FIELDS.uid.majorVersion]);
    const entryMinor = this.parseVersionNumber(entry.properties?.[NUXEO_SCHEMA_FIELDS.uid.minorVersion]);
    return entryMajor === major && entryMinor === minor;
  }

  private parseVersionNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }
}
