import { inject, Injectable } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { AuthService } from '@app/core/services/auth.service';
import { Observable, map, of, switchMap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Injectable({ providedIn: 'root' })
export class ServiceNoteStorageService {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly auth = inject(AuthService);

  private queryDocuments(query: string) {
    return this.nuxeoApi.getCaseOptions(query).pipe(map(result => result.entries ?? []));
  }

  private createFromEmpty(
    parentPath: string,
    docType: 'Folder' | 'Note',
    name: string,
    properties: Record<string, unknown>
  ): Observable<NuxeoDocument> {
    return this.nuxeoApi.getEmptyWithDefaults(parentPath, docType).pipe(
      switchMap(emptyDoc => {
        const payload: NuxeoDocument & { name: string } = {
          ...emptyDoc,
          name,
          properties: {
            ...(emptyDoc.properties ?? {}),
            ...properties,
          },
        };

        return this.nuxeoApi.createDocument(payload, parentPath);
      })
    );
  }

  private buildNotesQuery(basePath: string): string {
    return `
      SELECT * FROM Note
      WHERE ecm:path STARTSWITH '${basePath}'
      AND ecm:isTrashed = 0
    `;
  }

  private pickExistingNote(entries: NuxeoDocument[], title: string): NuxeoDocument | null {
    return entries.find(doc => doc.title === title) ?? entries.find(doc => doc.type === 'Note') ?? null;
  }

  private ensureFolder(parentPath: string, name: string): Observable<NuxeoDocument> {
    const folderPath = `${parentPath}/${name}`;

    const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
    const query = `SELECT * FROM Document WHERE ecm:path = '${normalizedPath}' AND ecm:isTrashed = 0`;

    return this.queryDocuments(query).pipe(
      switchMap(entries => {
        const existing = entries[0] ?? null;
        if (existing) {
          return of(existing);
        }

        return this.createFromEmpty(parentPath, 'Folder', name, { [NUXEO_SCHEMA_FIELDS.dc.title]: name });
      })
    );
  }

  private ensureNote(folderPath: string, title: string, html: string): Observable<NuxeoDocument> {
    const normalizedFolderPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
    const query = this.buildNotesQuery(normalizedFolderPath);

    return this.queryDocuments(query).pipe(
      switchMap(entries => {
        const existing = this.pickExistingNote(entries, title);

        const properties: Record<string, unknown> = {
          [NUXEO_SCHEMA_FIELDS.note.note]: html,
          [NUXEO_SCHEMA_FIELDS.note.mimeType]: 'text/html',
          [NUXEO_SCHEMA_FIELDS.dc.title]: title,
        };

        if (existing) {
          return this.nuxeoApi.editDocument(existing.uid, properties);
        }

        return this.createFromEmpty(normalizedFolderPath, 'Note', title, properties);
      })
    );
  }

  private getCaseBasePath(workspaceRoot: string, casePath: string): string {
    const categoryName = this.getCaseRootSegment(casePath);
    return categoryName ? `${workspaceRoot}/${categoryName}` : workspaceRoot;
  }

  private getCaseRootSegment(path: string): string | null {
    if (!path) return null;
    const parts = path.split('/').filter(Boolean);
    return parts.length ? (parts[0] ?? null) : null;
  }

  private getTrimmedUsername(): string {
    const username = this.auth.username();
    return username ? username.trim() : '';
  }
}
