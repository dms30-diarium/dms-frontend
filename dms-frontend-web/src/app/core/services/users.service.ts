import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import {
  NuxeoDocument,
  OrganizationParticipant,
  OrganizationSuggestion,
  OrgUnitUserLike,
} from '@shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export interface UserSuggestion {
  id: string;
  username: string;
  displayLabel: string;
  email: string;
  company: string;
  type: string;
  prefixed_id: string;
}

export interface CreateOrganisationUnitRequest {
  kortnamn: string;
  ansvarig: string;
  anvandare: string;
  namn: string;
  kod: string;
  description?: string;
  title: string;
}

interface OrgUnitsResponse {
  currentPageIndex: number;
  currentPageOffset: number;
  currentPageSize: number;
  'entity-type': string;
  entries: NuxeoDocument[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = '/nuxeo/api/v1';

  private getOrgUnits(parentUid: string): Observable<OrgUnitsResponse> {
    const payload = {
      params: {
        repository: 'default',
        providerName: 'default_document_suggestion',
        pageProviderName: 'default_document_suggestion',
        page: 0,
        pageSize: 1000,
        parentRef: parentUid,
        targetType: 'Organisationsdel',
        docType: 'Organisationsdel',
        searchTerm: '',
        sortBy: NUXEO_SCHEMA_FIELDS.dc.title,
        sortOrder: 'ASC',
      },
      context: {},
    };
    return this.http.post<OrgUnitsResponse>(`${this.base}/automation/Document.DMSDocumentSuggestion`, payload, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json+nxrequest',
        Accept: 'application/json',
        'X-NXproperties': '*',
      },
    });
  }

  private createOrganisationalUnit(data: CreateOrganisationUnitRequest, parentUid: string): Observable<NuxeoDocument> {
    const payload = {
      'entity-type': 'document',
      type: 'Organisationsdel',
      name: `org-${data.kod}`,
      parentRef: parentUid,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: data.title,
        [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: data.ansvarig,
        [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: [data.anvandare],
        [NUXEO_SCHEMA_FIELDS.organisationsdel.kod]: data.kod,
        [NUXEO_SCHEMA_FIELDS.organisationsdel.kortnamn]: data.kortnamn,
        [NUXEO_SCHEMA_FIELDS.organisationsdel.namn]: data.namn,
      },
    };

    return this.http.post<NuxeoDocument>(`${this.base}/automation/Document.Create`, payload, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json+nxrequest', Accept: 'application/json' },
    });
  }

  getOrganizationsList() {
    return this.http.get('/api/v1/directory/Organisation');
  }

  getOrganizations(docId: string): Observable<OrganizationSuggestion[]> {
    return this.http
      .get<NuxeoDocument>(`${this.base}/id/${docId}`, {
        withCredentials: true,
        headers: { Accept: 'application/json' },
      })
      .pipe(
        switchMap(doc => {
          if (!doc?.path) throw new Error('Document path not found');

          const rootSegment = doc.path.split('/').filter(Boolean)[0];
          const orgFolderPath = `/${rootSegment}/Organisation`;

          const orgFolderQuery = `SELECT * FROM Document WHERE ecm:path STARTSWITH '${orgFolderPath}' AND ecm:isTrashed = 0`;

          return this.http.get<{ entries: NuxeoDocument[] }>(
            `${this.base}/query?query=${encodeURIComponent(orgFolderQuery)}`,
            { withCredentials: true, headers: { Accept: 'application/json' } }
          );
        }),
        switchMap(res => {
          const orgFolder = res.entries?.[0];
          if (!orgFolder) throw new Error('Organisation folder not found');

          return this.getOrgUnits(orgFolder.uid!).pipe(
            map(orgUnitsResponse => {
              const allEntries = orgUnitsResponse.entries ?? [];
              return allEntries.map(organizationDocument => this.mapOrganizationSuggestion(organizationDocument));
            })
          );
        })
      );
  }

  private createOrganisationalFolder(rootSegment: string, folderName: string): Observable<NuxeoDocument> {
    const payload = {
      'entity-type': 'document',
      type: 'Folder',
      name: folderName,
      parentPath: `/${rootSegment}`,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: folderName,
      },
    };

    return this.http.post<NuxeoDocument>(`${this.base}/automation/Document.Create`, payload, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json+nxrequest', Accept: 'application/json' },
    });
  }

  getcoworkers(searchTerm?: string): Observable<UserSuggestion[]> {
    const payload = { params: { searchType: 'USER_TYPE', searchTerm: searchTerm ?? '', userType: '' }, context: {} };
    return this.http.post<UserSuggestion[]>(`${this.base}/automation/UserGroup.Suggestion`, payload, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  updateCaseAssignment(caseId: string, organizationId: string, caseWorkerId: string): Observable<NuxeoDocument> {
    const payload = {
      params: {
        ansvarig_organisatorisk_enhet: organizationId,
        ansvarig_handlaggare: caseWorkerId,
      },
      context: {},
      input: caseId,
    };
    return this.http.post<NuxeoDocument>(`${this.base}/automation/Document.UpdateArendeAssignees`, payload, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json+nxrequest', Accept: 'application/json' },
    });
  }

  private mapOrganizationSuggestion(org: NuxeoDocument): OrganizationSuggestion {
    return {
      id: org.uid ?? '',
      label: org.title ?? org.uid ?? '',
      participants: this.extractOrganizationParticipants(org),
    };
  }

  private extractOrganizationParticipants(org: NuxeoDocument): OrganizationParticipant[] {
    const props = (org.properties ?? {}) as Record<string, unknown>;
    const ansvarigRaw = props[NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig];
    const anvandareRaw = props[NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare];
    const ansvarig = Array.isArray(ansvarigRaw) ? ansvarigRaw : ansvarigRaw ? [ansvarigRaw] : [];
    const anvandare = Array.isArray(anvandareRaw) ? anvandareRaw : anvandareRaw ? [anvandareRaw] : [];
    const values = [...ansvarig, ...anvandare];

    const unique = new Map<string, OrganizationParticipant>();
    values.forEach(value => {
      const participant = this.mapOrgUser(value);
      if (participant && !unique.has(participant.id)) {
        unique.set(participant.id, participant);
      }
    });

    return Array.from(unique.values());
  }

  private mapOrgUser(entry: unknown): OrganizationParticipant | null {
    if (!entry) return null;

    if (typeof entry === 'string') {
      return { id: entry, label: entry };
    }

    if (typeof entry !== 'object') {
      return null;
    }

    const candidate = entry as OrgUnitUserLike;
    const id = candidate.id ?? candidate.uid ?? candidate.userId;
    if (!id) return null;

    const props = candidate.properties;
    const firstName = props?.firstName ?? props?.firstname;
    const lastName = props?.lastName ?? props?.lastname;
    const username = props?.username;
    const displayLabel = props?.displayLabel ?? candidate.displayLabel;

    const label =
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      displayLabel ||
      candidate.label ||
      candidate.title ||
      username ||
      id;

    return { id, label };
  }
}
