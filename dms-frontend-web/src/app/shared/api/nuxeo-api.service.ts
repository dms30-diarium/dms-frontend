import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { isPermissionError } from '@app/shared/utils/nuxeo-error-handler';
import {
  AdvancedSearchDocument,
  NuxeoDocument,
  NuxeoFileDocument,
  Direction,
  SearchResult,
  NuxeoDocuments,
  NxUser,
  UserSuggestion,
  SavedSearchResult,
  SavedSearchParams,
  NuxeoGroup,
  GroupSearchResponse,
  UserSearchResponse,
  DirectoriesResponse,
  DirectoryEntry,
  DirectoryEntriesResponse,
  Statistics,
  NuxeoProperties,
  AuditLogEntries,
  WorkflowInfo,
  MessagesJson,
  BulkRunActionParams,
  BulkRunActionResponse,
  BulkStatusResponse,
  NuxeoAcls,
  HandlingExtendedProperties,
  TemplateField,
  TemplateSourceProperties,
  NuxeoExtendedProperties,
} from './nuxeo-api.types';
import { ListCasesOpts } from '@app/core/services/cases.service';
import { CollectionCardItem } from '@app/shared/components/collection-card/collection-card.component';
import { UploadedFile } from '../components/file-upload/file-upload.component';
import { GeneralSearchResult } from '../components/navbar/navbar.component';
import { FileItem, LifecycleHistoryResponse, Transitions } from '@app/pages/case-page/case-types';
import { Option } from '@app/shared/commonTypes';

export interface SendCaseEmailPayload {
  template?: string;
  recipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  replyTo?: string[];
  body?: string;
  templateContent?: string;
  subject?: string;
  attachedHandlingar?: string[];
  attachHandling?: boolean;
  uppratta?: boolean;
  attachments?: unknown[];
  handling?: Record<string, unknown>;
}

export interface CreateHandlingFromNotePayload extends Record<string, unknown> {
  input: string;
  params: {
    arende: string;
    handling: Record<string, unknown>;
    anteckning: string;
  };
  context: Record<string, unknown>;
}

export interface DownloadFilesZipExportOptions {
  exportOriginalContent: boolean;
  exportPDFRenditionContent: boolean;
  exportWatermarkedContent: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NuxeoApiService {
  private http = inject(HttpClient);
  private readonly handlingWithFileEnrichers =
    'subtypes, permissions, hasContent,firstAccessibleAncestor,permissions,breadcrumb,preview,favorites,subscribedNotifications,thumbnail,renditions,pendingTasks,runnableWorkflows,runningWorkflows,collections,audit,subtypes,tags,publications';

  query(nxql: string, opts: { pageSize: number; currentPageIndex: number }): Observable<SearchResult> {
    return this.http.post<SearchResult>('/nuxeo/api/v1/search/pp/nxql_search/execute', {
      query: nxql,
      ...opts,
    });
  }

  getMessagesJSON() {
    return this.http.get<MessagesJson>(`/nuxeo/ui/i18n/messages-sv-SE.json`);
  }

  getRenderedMailTemplate(templateId: string, inputDocId: string): Observable<{ subject?: string; content?: string }> {
    return this.executeNuxeoOperation<{ subject?: string; content?: string }>('DMS.Mail.GetRenderedMailTemplate', {
      input: `doc:${inputDocId}`,
      params: { template: templateId },
      context: {},
    });
  }

  getDownloadAllFiles(uid: string) {
    return this.http.post<FileItem[]>('/nuxeo/api/v1/automation/DMS.ListAllFiles', {
      context: {},
      input: uid,
      params: {},
    });
  }

  downloadAllFiles(arendeUid: string, fileUids: string[]) {
    return this.http.post<Blob>(
      '/nuxeo/api/v1/automation/DMS.Arende.DownloadFiles',
      {
        context: {},
        input: arendeUid,
        params: { ids: fileUids },
      },
      {
        responseType: 'blob' as 'json',
        observe: 'response',
      }
    );
  }

  startZipExport(myndighetUid: string, arendeUid: string): Observable<unknown> {
    return this.http.post<unknown>(
      '/nuxeo/site/automation/DMS.Export.StartaZipExport',
      {
        params: {
          myndighet: myndighetUid,
          arendeUids: arendeUid,
        },
        context: {},
      },
      {
        headers: {
          'Nuxeo-Transaction-Timeout': '30',
          'content-type': 'application/json',
        },
      }
    );
  }

  LaddanerZipExport(arendeUid: string, fileUids: string[], options: DownloadFilesZipExportOptions) {
    return this.http.post<Blob>(
      '/nuxeo/api/v1/automation/DMS.Export.LaddanerZipExport',
      {
        context: {},
        input: arendeUid,
        params: {
          arendeUids: arendeUid,
          exportOriginalContent: options.exportOriginalContent,
          exportPDFRenditionContent: options.exportPDFRenditionContent,
          exportWatermarkedContent: options.exportWatermarkedContent,
          filUids: fileUids.join(','),
          flatExport: true,
          handlingUids: '',
        },
      },
      {
        responseType: 'blob' as 'json',
        observe: 'response',
      }
    );
  }

  queryPageProvider(nxql: string, opts: { pageSize: number; currentPageIndex: number }): Observable<SearchResult> {
    const body = new HttpParams()
      .set('currentPageIndex', opts.currentPageIndex.toString())
      .set('pageSize', opts.pageSize.toString())
      .set('queryParams', nxql);

    return this.http.post<SearchResult>('/nuxeo/api/v1/search/pp/nxql_search/execute', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  queryAuditEntries(opts: {
    principalName?: string;
    eventIds?: string;
    eventCategory?: string;
    currentPageIndex: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<AuditLogEntries> {
    const namedQueryParams: Record<string, string> = {
      principalName: opts.principalName ?? '',
    };

    if (opts.eventIds) {
      namedQueryParams['eventIds'] = opts.eventIds;
    }

    if (opts.eventCategory) {
      namedQueryParams['eventCategory'] = opts.eventCategory;
    }

    return this.executeNuxeoOperation<AuditLogEntries>('Audit.QueryWithPageProvider', {
      params: {
        providerName: 'EVENTS_VIEW',
        namedQueryParams,
        currentPageIndex: opts.currentPageIndex,
        pageSize: opts.pageSize,
        sortBy: opts.sortBy,
        sortOrder: opts.sortBy && opts.sortOrder ? opts.sortOrder.toUpperCase() : undefined,
      },
      context: {},
    });
  }

  requestPageProviderOptions(repository: string): Observable<SearchResult> {
    return this.http.post<SearchResult>(`/nuxeo/api/v1/automation/Repository.PageProvider`, {
      context: {},
      params: {
        page: 0,
        pageProviderName: 'default_document_suggestion',
        pageSize: 20,
        providerName: 'default_document_suggestion',
        repository: repository,
        searchTerm: '',
      },
    });
  }

  launchImporter(importFolder?: string): Observable<unknown> {
    const body: { context: object; params: { importFolder?: string } } = {
      context: {},
      params: {},
    };

    if (importFolder) {
      body.params.importFolder = importFolder;
    }

    return this.executeNuxeoOperation<unknown>('DMS.Importer.LaunchImporter', body);
  }

  extractImportData(documentId: string): Observable<unknown> {
    const body: Record<string, unknown> = {
      context: {},
      params: {},
      input: documentId,
    };

    return this.executeNuxeoOperation<unknown>('DMS.Importer.ExtractData', body);
  }

  executeNuxeoOperation<TResponse = unknown>(
    operationId: string,
    body: Record<string, unknown>
  ): Observable<TResponse> {
    return this.http.post<TResponse>(`/nuxeo/api/v1/automation/${operationId}`, body);
  }

  getPathInfo<P = NuxeoProperties>(
    path: string,
    options?: { enrichers?: string | string[] }
  ): Observable<NuxeoDocument<P>> {
    const extraEnrichers = options?.enrichers
      ? Array.isArray(options.enrichers)
        ? options.enrichers
        : [options.enrichers]
      : [];
    const enrichers = ['subtypes, permissions, hasFolderishChild', ...extraEnrichers]
      .map(enricher => enricher.trim())
      .filter(Boolean);
    const uniqueEnrichers = Array.from(new Set(enrichers));
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const encodedPath = encodeURI(normalizedPath);

    return this.http.get<NuxeoDocument<P>>(`/nuxeo/api/v1/path${encodedPath}`, {
      headers: {
        properties: '*',
        'enrichers-document': uniqueEnrichers.join(','),
        'fetch-document': 'properties,lock',
        'fetch-directoryEntry': 'parent',
        'translate-directoryEntry': 'label',
      },
      params: {},
    });
  }

  editDocument(uid: string, properties: Record<string, unknown>): Observable<NuxeoDocument> {
    return this.http.put<NuxeoDocument>(`/nuxeo/api/v1/id/${uid}`, {
      'entity-type': 'document',
      uid: uid,
      properties: properties,
    });
  }

  saveEditDocProperties(fileId: string, templateId: string, templateProperties: TemplateField[]) {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/SaveUtkastTemplatePropertiesAndRenderPDF`, {
      params: {
        template: templateId,
        templateProperties,
      },
      context: {},
      input: fileId,
    });
  }

  getUtkastDocumentVersions(fileId: string) {
    const query = `SELECT * FROM Document WHERE ecm:versionVersionableId = "${fileId}" AND ecm:isVersion = 1`;

    const params = {
      currentPageIndex: '0',
      pageSize: '100',
      sortBy: `${NUXEO_SCHEMA_FIELDS.uid.majorVersion},${NUXEO_SCHEMA_FIELDS.uid.minorVersion}`,
      sortOrder: 'desc,desc',
      query: query,
    };

    return this.http.get<SearchResult>('/nuxeo/api/v1/search/execute', {
      params,
      headers: {
        properties: '*',
      },
    });
  }

  restoreVersion() {
    return this.http.post<NuxeoDocument>(`nuxeo/api/v1/automation/Document.RestoreVersion`, {});
  }

  getAdvancedDocumentContent<T = NuxeoDocument>(
    uid: string,
    currentPageIndex = 0,
    pageSize = 40,
    isExtended = false,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) {
    const params: Record<string, string> = {
      currentPageIndex: String(currentPageIndex),
      offset: '0',
      pageSize: String(pageSize),
      ecm_parentId: uid,
      ecm_trashed: 'false',
    };
    if (sortBy) params['sortBy'] = sortBy;
    if (sortBy && sortOrder) params['sortOrder'] = sortOrder.toUpperCase();

    return this.http.get<SearchResult<T>>('/nuxeo/api/v1/search/pp/advanced_document_content/execute', {
      params,
      headers: {
        properties: '*',
        ...(isExtended ? { 'fetch-document': 'properties' } : {}),
        'enrichers-document': 'subtypes, permissions, hasFolderishChild',
        'fetch-directoryEntry': 'parent',
        'translate-directoryEntry': 'label',
      },
    });
  }

  getMailMessages(uid: string, currentPageIndex = 0, pageSize = 40, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const params: Record<string, string> = {
      currentPageIndex: String(currentPageIndex),
      offset: '0',
      pageSize: String(pageSize),
      ecm_parentId: uid,
      ecm_trashed: 'false',
    };
    if (sortBy) params['sortBy'] = sortBy;
    if (sortBy && sortOrder) params['sortOrder'] = sortOrder.toUpperCase();

    return this.http.get<SearchResult<NuxeoDocument<NuxeoExtendedProperties>>>(
      '/nuxeo/api/v1/search/pp/mailmessage_search/execute',
      {
        params,
        headers: {
          properties: '*',
          'fetch-document': 'properties',
          'enrichers-document': 'subtypes, permissions, hasFolderishChild',
          'fetch-directoryEntry': 'parent',
          'translate-directoryEntry': 'label',
        },
      }
    );
  }

  getEntriesForParentPath<E = NuxeoDocument>(uid: string): Observable<SearchResult<E>> {
    const nxql = `SELECT * FROM Document WHERE ecm:parentId = '${uid}' AND ecm:mixinType != 'HiddenInNavigation' AND ecm:isVersion = 0 AND ecm:isTrashed = 0 ORDER BY dc:created DESC`;

    const params = new URLSearchParams({
      currentPageIndex: '0',
      offset: '0',
      pageSize: '1000',
      queryParams: nxql,
    });

    return this.http.get<SearchResult<E>>(`/nuxeo/api/v1/search/pp/nxql_search/execute?${params.toString()}`, {
      headers: {
        properties: '*',
        'enrichers-document': 'subtypes, permissions, hasFolderishChild',
        'fetch-directoryEntry': 'parent',
        'translate-directoryEntry': 'label',
      },
    });
  }

  getAncestorsById(uid: string): Observable<NuxeoDocument[]> {
    return this.getDocumentById(uid, false, { enrichers: ['firstAccessibleAncestor'] }).pipe(
      switchMap((document: NuxeoDocument) => {
        const contextParams = Object(document.contextParameters);
        const firstAccessible = Object(Reflect.get(contextParams, 'firstAccessibleAncestor'));
        const firstAccessibleId =
          Reflect.get(firstAccessible, 'uid') ??
          Reflect.get(firstAccessible, 'id') ??
          Reflect.get(firstAccessible, 'path');

        if (!document.parentRef || document.parentRef === '/') return of([document]);
        if (firstAccessibleId && document.uid === firstAccessibleId) return of([document]);

        return this.getAncestorsById(document.parentRef).pipe(map(parents => [...parents, document]));
      }),
      catchError(err => {
        if (isPermissionError(err)) {
          return of([]);
        }
        return throwError(() => err);
      })
    );
  }

  getAdvancedSearchResults(
    params: Record<string, string | number | boolean | readonly (string | number | boolean)[]>
  ): Observable<SearchResult<AdvancedSearchDocument>> {
    return this.http.get<SearchResult<AdvancedSearchDocument>>(`/nuxeo/api/v1/search/pp/dms_search/execute`, {
      headers: {
        'X-NXenrichers.document': 'thumbnail',
        'fetch-aggregate': 'key',
        'fetch-document': 'properties',
        'translate-directoryEntry': 'label',
        properties: '*',
      },
      params,
    });
  }

  getLatestCreatedUsersOrGroups(pageSize = 0, currentPageIndex = 0): Observable<NuxeoDocuments> {
    return this.http.get<NuxeoDocuments>('/nuxeo/api/v1/query/LATEST_CREATED_USERS_OR_GROUPS_PROVIDER', {
      params: {
        pageSize: pageSize.toString(),
        currentPageIndex: currentPageIndex.toString(),
      },
    });
  }

  getUserGroupSuggestions(
    searchTerm = '',
    searchType: 'USER_GROUP_TYPE' | 'USER_TYPE' | 'GROUP_TYPE' = 'USER_GROUP_TYPE'
  ) {
    return this.http.post<UserSuggestion[]>(`/nuxeo/api/v1/automation/UserGroup.Suggestion`, {
      params: {
        searchType,
        searchTerm,
      },
      context: {},
    });
  }

  createUser(payload: {
    'entity-type': 'user';
    id: string;
    properties: {
      username: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      email: string;
      groups?: string[];
      password?: string;
    };
  }): Observable<NxUser> {
    return this.http.post<NxUser>('/nuxeo/api/v1/user', payload);
  }

  createGroup(payload: {
    'entity-type': 'group';
    groupname: string;
    grouplabel?: string;
    memberUsers?: string[];
    memberGroups?: string[];
  }): Observable<unknown> {
    return this.http.post('/nuxeo/api/v1/group', payload);
  }

  searchGroups(query: string, currentPageIndex = 0, pageSize = 50): Observable<GroupSearchResponse> {
    return this.http.get<GroupSearchResponse>('/nuxeo/api/v1/group/search', {
      params: {
        q: query,
        currentPageIndex: currentPageIndex.toString(),
        pageSize: pageSize.toString(),
      },
    });
  }

  getGroup(groupId: string): Observable<NuxeoGroup> {
    return this.http.get<NuxeoGroup>(`/nuxeo/api/v1/group/${encodeURIComponent(groupId)}`);
  }

  getGroupUsers(groupId: string, query = '', currentPageIndex = 0): Observable<UserSearchResponse> {
    return this.http.get<UserSearchResponse>(`/nuxeo/api/v1/group/${encodeURIComponent(groupId)}/@users`, {
      params: {
        q: query,
        currentPageIndex: currentPageIndex.toString(),
      },
    });
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`/nuxeo/api/v1/group/${encodeURIComponent(groupId)}`);
  }

  updateGroup(groupId: string, payload: NuxeoGroup): Observable<NuxeoGroup> {
    return this.http.put<NuxeoGroup>(`/nuxeo/api/v1/group/${encodeURIComponent(groupId)}`, payload);
  }

  searchUsers(query: string, currentPageIndex = 0, pageSize = 50): Observable<UserSearchResponse> {
    return this.http.get<UserSearchResponse>('/nuxeo/api/v1/user/search', {
      params: {
        q: query,
        currentPageIndex: currentPageIndex.toString(),
        pageSize: pageSize.toString(),
      },
    });
  }

  getUser(userId: string): Observable<NxUser> {
    return this.http.get<NxUser>(`/nuxeo/api/v1/user/${encodeURIComponent(userId)}`);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`/nuxeo/api/v1/user/${encodeURIComponent(userId)}`);
  }

  updateUser(userId: string, payload: NxUser): Observable<NxUser> {
    return this.http.put<NxUser>(`/nuxeo/api/v1/user/${encodeURIComponent(userId)}`, payload);
  }

  addUserToGroup(userId: string, groupId: string): Observable<void> {
    return this.http.post<void>(
      `/nuxeo/api/v1/user/${encodeURIComponent(userId)}/group/${encodeURIComponent(groupId)}`,
      {}
    );
  }

  removeUserFromGroup(userId: string, groupId: string): Observable<void> {
    return this.http.delete<void>(
      `/nuxeo/api/v1/user/${encodeURIComponent(userId)}/group/${encodeURIComponent(groupId)}`,
      { responseType: 'text' as 'json' }
    );
  }

  getDirectorySuggestions<T = Direction[]>(
    directoryName: string,
    opts?: {
      dbl10n?: boolean;
      localize?: boolean;
      lang?: string;
      searchTerm?: string;
    }
  ): Observable<T> {
    return this.http.post<T>(`/nuxeo/api/v1/automation/Directory.SuggestEntries`, {
      params: {
        directoryName,
        dbl10n: opts?.dbl10n ?? false,
        localize: opts?.localize ?? true,
        lang: opts?.lang ?? 'en',
        searchTerm: opts?.searchTerm ?? '',
      },
      context: {},
    });
  }

  getDirectories(): Observable<DirectoriesResponse> {
    return this.http.get<DirectoriesResponse>(`/nuxeo/api/v1/directory`, {
      params: { pageSize: '0' },
    });
  }

  getDirectoryEntries(directoryName: string, pageSize = 0): Observable<DirectoryEntriesResponse> {
    return this.http.get<DirectoryEntriesResponse>(`/nuxeo/api/v1/directory/${directoryName}`, {
      params: {
        pageSize: pageSize.toString(),
      },
    });
  }

  createDirectoryEntry(directoryName: string, entry: DirectoryEntry): Observable<DirectoryEntry> {
    return this.http.post<DirectoryEntry>(`/nuxeo/api/v1/directory/${directoryName}`, entry);
  }

  updateDirectoryEntry(directoryName: string, entryId: string, entry: DirectoryEntry): Observable<DirectoryEntry> {
    const encodedId = encodeURIComponent(entryId);
    return this.http.put<DirectoryEntry>(`/nuxeo/api/v1/directory/${directoryName}/${encodedId}`, entry);
  }

  deleteDirectoryEntry(directoryName: string, entryId: string): Observable<void> {
    const encodedId = encodeURIComponent(entryId);
    return this.http.delete<void>(`/nuxeo/api/v1/directory/${directoryName}/${encodedId}`);
  }

  getUserSuggestions(searchTerm = ''): Observable<UserSuggestion[]> {
    return this.http.post<UserSuggestion[]>(`/nuxeo/api/v1/automation/UserGroup.Suggestion`, {
      params: {
        searchTerm,
        searchType: 'USER_TYPE',
      },
      context: {},
    });
  }

  setDeadline(
    docId: string,
    user: string,
    deadline: string,
    reminder?: string,
    description?: string
  ): Observable<UserSuggestion[]> {
    return this.http.post<UserSuggestion[]>(`/nuxeo/api/v1/id/${docId}/@workflow`, {
      'entity-type': 'workflow',
      workflowModelName: 'DeadlineOchPaminnelse',

      variables: {
        anvandare: [user],
        beskrivning: description,
        deadline: deadline,
        paminnelse: reminder,
      },
    });
  }

  deleteWorkflow(workflowId: string): Observable<UserSuggestion[]> {
    return this.http.delete<UserSuggestion[]>(`/nuxeo/api/v1/workflow/${workflowId}`);
  }
  createWorkflow(workflowId: string, payload: unknown) {
    return this.http.post<UserSuggestion[]>(`/nuxeo/api/v1/id/${workflowId}/@workflow`, payload);
  }

  DMSDocumentSuggestion(
    parentId: string,
    targetType: string,
    docType: string,
    searchTerm?: string,
    options?: {
      selectedKlass?: string;
      pageSize?: number;
    }
  ): Observable<SearchResult> {
    const payload = {
      params: {
        documentSchemas: ['*'],
        repository: 'default',
        providerName: 'default_document_suggestion',
        pageProviderName: 'default_document_suggestion',
        page: 0,
        pageSize: options?.pageSize ?? 1000,
        docType,
        parentRef: parentId,
        targetType,
        searchTerm: searchTerm ?? '',
        ...(options?.selectedKlass ? { selectedKlass: options.selectedKlass } : {}),
      },
      context: {},
    };

    return this.http
      .post<SearchResult>(`/nuxeo/api/v1/automation/Document.DMSDocumentSuggestion`, payload, {
        headers: {
          properties: '*',
          'enrichers-document':
            'subtypes, permissions, hasContent,firstAccessibleAncestor,permissions,breadcrumb,preview,favorites,subscribedNotifications,thumbnail,renditions,pendingTasks,runnableWorkflows,runningWorkflows,collections,audit,subtypes,tags,publications',
        },
      })
      .pipe();
  }

  getLagrumOptions(parentRef?: string): Observable<Option[]> {
    if (!parentRef) return of([] as Option[]);
    return this.DMSDocumentSuggestion(parentRef, 'Lagrum', 'Klass').pipe(
      map(result => (result.entries ?? []).map(entry => ({ label: entry.title, id: entry.uid }))),
      catchError(() => of([] as Option[]))
    );
  }

  getHandlingTypes(): Observable<SearchResult> {
    return this.http.post<SearchResult>(`/nuxeo/api/v1/automation/Repository.Query`, {
      params: {
        documentSchemas: ['*'],
        repository: 'default',
        providerName: 'default_document_suggestion',
        pageProviderName: 'default_document_suggestion',
        page: 0,
        pageSize: 20,
        query: 'SELECT * FROM Handlingstyp',
        searchTerm: '',
      },
      context: {},
    });
  }

  getTagSuggestions(searchTerm: string): Observable<unknown[]> {
    return this.http.post<unknown[]>(`/nuxeo/api/v1/automation/Tag.Suggestion`, {
      params: {
        searchTerm,
      },
      context: {},
    });
  }

  tagDocument(documentId: string, tags: string | string[]): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('Services.TagDocument', {
      params: { tags },
      context: {},
      input: documentId,
    });
  }

  untagDocument(documentId: string, tags: string | string[]): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('Services.UntagDocument', {
      params: { tags },
      context: {},
      input: documentId,
    });
  }

  getMailTemplates(): Observable<SearchResult> {
    return this.http.post<SearchResult>(`/nuxeo/api/v1/automation/Repository.Query`, {
      params: {
        documentSchemas: ['*'],
        repository: 'default',
        providerName: 'default_document_suggestion',
        pageProviderName: 'default_document_suggestion',
        page: 0,
        pageSize: 20,
        query: 'SELECT * FROM EPostmall WHERE ecm:isTrashed = 0 AND ecm:isVersion = 0',
        searchTerm: '',
      },
      context: {},
    });
  }

  getCaseOptions(query: string, searchTerm = '') {
    const trimmedTerm = searchTerm.trim();
    const safeTerm = trimmedTerm.replace(/'/g, "''");
    let finalQuery = query;

    if (safeTerm) {
      const orderByToken = ' ORDER BY ';
      const upperQuery = query.toUpperCase();
      const orderByIndex = upperQuery.lastIndexOf(orderByToken);
      const hasWhere = /\bWHERE\b/i.test(query);
      const clause = `dc:title ILIKE '%${safeTerm}%'`;

      if (orderByIndex >= 0) {
        const base = query.slice(0, orderByIndex);
        const orderBy = query.slice(orderByIndex);
        finalQuery = hasWhere
          ? `${base} AND ${clause}${orderBy}`
          : `${base} WHERE ecm:isTrashed = 0 AND ${clause}${orderBy}`;
      } else {
        finalQuery = hasWhere ? `${query} AND ${clause}` : `${query} WHERE ecm:isTrashed = 0 AND ${clause}`;
      }
    }

    const payload = {
      context: {},
      params: {
        documentSchemas: ['*'],
        repository: 'default',
        providerName: 'default_document_suggestion',
        pageProviderName: 'default_document_suggestion',
        page: 0,
        pageSize: 20,
        query: finalQuery,
        searchTerm: trimmedTerm ?? '',
      },
    };
    return this.http.post<SearchResult>(`/nuxeo/api/v1/automation/Repository.Query`, payload);
  }

  createHandling(payload: unknown) {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/DMS.Importer.CreateHandling`, payload);
  }

  createHandlingFromImportFile(importFileId: string): Observable<NuxeoDocument> {
    const payload = {
      context: {},
      input: importFileId,
      params: {},
    };

    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/DMS.Importer.CreateHandling`, payload);
  }

  getEmptyWithDefaults(path: string, type: string): Observable<NuxeoDocument> {
    const prefix = path.startsWith('/') ? '' : '/';
    return this.http.get<NuxeoDocument>(`/nuxeo/api/v1/path${prefix}${path}/@emptyWithDefault?type=${type}`, {
      headers: {
        properties: '*',
        'enrichers-document':
          'subtypes, permissions, hasContent,firstAccessibleAncestor,permissions,breadcrumb,preview,favorites,subscribedNotifications,thumbnail,renditions,pendingTasks,runnableWorkflows,runningWorkflows,collections,audit,subtypes,tags,publications',
      },
    });
  }

  initializeUpload(): Observable<{ batchId: string }> {
    return this.http.post<{ batchId: string }>(`/nuxeo/api/v1/upload/new/default`, {});
  }

  uploadFile(batchId: string, file: UploadedFile[], fileIndex = 0): Observable<unknown> {
    return this.http.post(`/nuxeo/api/v1/upload/${batchId}/${fileIndex}`, file[0], {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file[0].name.trim()),
        'X-File-Type': file[0].type,
        properties: '*',
        'enrichers-document':
          'subtypes, permissions, hasContent,firstAccessibleAncestor,permissions,breadcrumb,preview,favorites,subscribedNotifications,thumbnail,renditions,pendingTasks,runnableWorkflows,runningWorkflows,collections,audit,subtypes,tags,publications',
      },
    });
  }

  attachFile(
    batchId: string | null,
    name: string,
    handlingId: string,
    filTyp: 'huvudfil' | 'bilaga' = NUXEO_VOCAB_IDS.filTyp.huvudfil,
    uploadFileId: string | number = '0',
    templateId?: string
  ): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/id/${handlingId}`, {
      'entity-type': 'document',
      name,
      type: 'Fil',
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.title]: name,
        [NUXEO_SCHEMA_FIELDS.fil.typ]: filTyp,
        ...(batchId
          ? { [NUXEO_SCHEMA_FIELDS.file.content]: { 'upload-batch': batchId, 'upload-fileId': String(uploadFileId) } }
          : {}),
        ...(templateId ? { [NUXEO_SCHEMA_FIELDS.fil.mallenId]: templateId } : {}),
      },
    });
  }

  createDocument<PayloadProps = NuxeoProperties, ResponseProps = PayloadProps>(
    payload: Partial<NuxeoDocument<PayloadProps>>,
    path: string
  ): Observable<NuxeoDocument<ResponseProps>> {
    const prefix = path.startsWith('/') ? '' : '/';
    return this.http.post<NuxeoDocument<ResponseProps>>(`/nuxeo/api/v1/path${prefix}${path}`, payload, {
      headers: { properties: '*' },
    });
  }

  downloadFile(docId: string): string {
    return `/nuxeo/api/v1/repo/default/id/${docId}/@blob/file:content`;
  }

  downloadBulk(docsUids: string[]) {
    return this.http.post<Blob>(
      `/nuxeo/api/v1/automation/Blob.BulkDownload`,
      {
        context: {},
        input: `docs:${docsUids.join(',')}`,
        params: { filename: 'selection-1765537700690.zip' },
      },
      {
        responseType: 'blob' as 'json',
      }
    );
  }

  runBulkAction(params: BulkRunActionParams): Observable<string> {
    return this.http
      .post<BulkRunActionResponse>(
        `/nuxeo/api/v1/automation/Bulk.RunAction/@async`,
        {
          context: {},
          params,
        },
        {
          observe: 'response',
        }
      )
      .pipe(
        map(response => {
          const body = response.body;
          const location = response.headers.get('location') ?? response.headers.get('Location');
          const asyncId = body?.id ?? body?.taskId ?? body?.value?.commandId ?? this.extractBulkAsyncId(location) ?? '';
          if (!asyncId) {
            throw new Error('Missing async bulk action id.');
          }
          return asyncId;
        })
      );
  }

  private extractBulkAsyncId(location?: string | null): string | null {
    if (!location) return null;
    const cleaned = location.split('?')[0]?.split('#')[0] ?? '';
    if (!cleaned) return null;
    const parts = cleaned.split('/').filter(Boolean);
    if (!parts.length) return null;
    const asyncIndex = parts.lastIndexOf('@async');
    if (asyncIndex >= 0 && parts.length > asyncIndex + 1) {
      return parts[asyncIndex + 1];
    }
    const last = parts[parts.length - 1];
    if (last === 'status' && parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return last;
  }

  getBulkActionStatus(commandId: string): Observable<BulkStatusResponse> {
    return this.http.get<BulkStatusResponse>(`/nuxeo/site/api/v1/automation/Bulk.RunAction/@async/${commandId}/status`);
  }

  downloadBulkActionResult(commandId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`/nuxeo/site/api/v1/automation/Bulk.RunAction/@async/${commandId}`);
  }

  deleteDocument(documentId: string): Observable<NuxeoDocument> {
    return this.http.delete<NuxeoDocument>(`/nuxeo/api/v1/id/${documentId}`);
  }

  deleteAttachment(index: number, parentId?: string) {
    const payload = {
      context: {},
      input: parentId,
      params: { xpath: `files:files/${index}` },
    };
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Blob.RemoveFromDocument`, payload);
  }

  deleteMainAttachment(parentDoc?: string) {
    const payload = {
      context: {},
      input: parentDoc,
      params: { xpath: NUXEO_SCHEMA_FIELDS.file.content },
    };
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Blob.RemoveFromDocument`, payload);
  }

  deleteSeveralDocument(documentIds: string[]): Observable<NuxeoDocument[]> {
    const input = `docs:${documentIds.join(',')}`;

    const payload = {
      input,
      params: {},
      context: {},
    };

    return this.http.post<NuxeoDocument[]>('/nuxeo/api/v1/automation/Document.Trash', payload);
  }

  trashDocument(documentId: string): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>('/nuxeo/api/v1/automation/Document.Trash', {
      params: {},
      context: {},
      input: documentId,
    });
  }

  addToFavorites(uid: string): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.AddToFavorites`, {
      input: uid,
      context: {},
      params: {},
      headers: { properties: '*' },
    });
  }

  removeFromFavorites(uid: string) {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.RemoveFromFavorites`, {
      context: {},
      input: uid,
      params: {},
      headers: { properties: '*' },
    });
  }

  getCollectionDocuments(
    collectionId: string,
    currentPageIndex = 0,
    pageSize = 10,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) {
    const params: Record<string, string> = {
      currentPageIndex: String(currentPageIndex),
      offset: String(currentPageIndex * pageSize),
      pageSize: String(pageSize),
      queryParams: collectionId,
    };
    if (sortBy) params['sortBy'] = sortBy;
    if (sortBy && sortOrder) params['sortOrder'] = sortOrder.toUpperCase();

    return this.http.get<SearchResult>(`/nuxeo/api/v1/search/pp/default_content_collection/execute`, {
      params,
    });
  }

  fetchFavoritesUid() {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Favorite.Fetch`, {
      context: {},
      params: {},
    });
  }

  setResponsibleManager(utkastId: string, username: string, previousAssignee?: string | null) {
    const normalizedPrevious = previousAssignee?.trim() || null;
    return this.http.put<NuxeoDocument>(`/nuxeo/api/v1/id/${utkastId}`, {
      'entity-type': 'document',
      uid: utkastId,
      properties: {
        [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: username,
        [NUXEO_SCHEMA_FIELDS.handling.granskare]: normalizedPrevious,
        [NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]: null,
        [NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]: null,
        [NUXEO_SCHEMA_FIELDS.handling.godkannandeDatum]: null,
      },
    });
  }

  updateResponsibleManager(utkastId: string, username: string) {
    return this.http.put<NuxeoDocument>(`/nuxeo/api/v1/id/${utkastId}`, {
      'entity-type': 'document',
      uid: utkastId,
      properties: {
        [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: username,
      },
    });
  }

  updateRequester(utkastId: string, username: string) {
    return this.http.put<NuxeoDocument>(`/nuxeo/api/v1/id/${utkastId}`, {
      'entity-type': 'document',
      uid: utkastId,
      properties: {
        [NUXEO_SCHEMA_FIELDS.handling.granskare]: username,
      },
    });
  }

  updateFile(fileId: string, fileBatch: string, file: File) {
    return this.http.put(
      `/nuxeo/api/v1/id/${fileId}`,
      {
        'entity-type': 'document',
        uid: fileId,
        title: file.name,
        properties: {
          [NUXEO_SCHEMA_FIELDS.dc.title]: file.name,
          [NUXEO_SCHEMA_FIELDS.file.content]: {
            'upload-batch': fileBatch,
            'upload-fileId': '0',
          },
        },
      },
      {
        headers: {
          properties: '*',
        },
      }
    );
  }

  getDocumentById<T = NuxeoProperties>(
    id: string,
    shouldHaveProperties = false,
    options?: { enrichers?: string | string[] }
  ): Observable<NuxeoDocument<T>> {
    const extraEnrichers = options?.enrichers
      ? Array.isArray(options.enrichers)
        ? options.enrichers
        : [options.enrichers]
      : [];
    const enrichers = ['thumbnail, runningWorkflows, pendingTasks', ...extraEnrichers]
      .map(enricher => enricher.trim())
      .filter(Boolean);
    const uniqueEnrichers = Array.from(new Set(enrichers));

    return this.http.get<NuxeoDocument<T>>(`/nuxeo/api/v1/id/${id}`, {
      headers: {
        properties: '*',
        'enrichers-document': uniqueEnrichers.join(','),
        'fetch-document': `${shouldHaveProperties ? 'properties,lock' : 'lock'}`,
        'fetch-directoryEntry': 'parent',
        'translate-directoryEntry': 'label',
      },
    });
  }

  getDocumentVersions(documentId: string): Observable<NuxeoDocuments> {
    return this.http.post<NuxeoDocuments>(
      `/nuxeo/api/v1/automation/Document.GetVersions`,
      {
        context: {},
        params: {},
        input: `doc:${documentId}`,
      },
      {
        headers: {
          properties: '*',
        },
      }
    );
  }

  getSourceDocumentFromProxy(proxyId: string): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('Proxy.GetSourceDocument', {
      context: {},
      params: {},
      input: proxyId,
    });
  }

  getDocumentAudit(
    documentId: string,
    options?: { currentPageIndex?: number; pageSize?: number }
  ): Observable<AuditLogEntries> {
    const params = new HttpParams()
      .set('currentPageIndex', String(options?.currentPageIndex ?? 0))
      .set('pageSize', String(options?.pageSize ?? 40));

    return this.http.get<AuditLogEntries>(`/nuxeo/api/v1/id/${documentId}/@audit`, { params });
  }

  restoreDocumentVersion(versionId: string, checkout = false): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('Document.RestoreVersion', {
      context: {},
      params: { checkout },
      input: versionId,
    });
  }

  getHandlingWithFile(parentId: string): Observable<SearchResult<NuxeoFileDocument>> {
    return this.http.post<SearchResult<NuxeoFileDocument>>(
      `/nuxeo/api/v1/automation/Document.GetChildren`,
      { input: `doc:${parentId}`, ecm_trashed: false },
      {
        headers: {
          properties: '*',
          'enrichers-document': this.handlingWithFileEnrichers,
        },
      }
    );
  }

  getHandlingWithFileProperties(parentId: string): Observable<SearchResult<NuxeoDocument<HandlingExtendedProperties>>> {
    return this.http.post<SearchResult<NuxeoDocument<HandlingExtendedProperties>>>(
      `/nuxeo/api/v1/automation/Document.GetChildren`,
      { input: `doc:${parentId}`, ecm_trashed: false },
      {
        headers: {
          'fetch-document': 'properties',
          properties: '*',
          'enrichers-document': this.handlingWithFileEnrichers,
        },
      }
    );
  }
  getHandling<T = NuxeoProperties>(
    parentId: string,
    pageSize: number,
    offset: number,
    currentPageIndex: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    handlingsriktning?: string[],
    searchTerm = ''
  ): Observable<SearchResult<NuxeoDocument<T>>> {
    const trimmedSearchTerm = searchTerm.trim();
    let params = new HttpParams()
      .set('currentPageIndex', String(currentPageIndex))
      .set('offset', String(offset))
      .set('pageSize', String(pageSize))
      .set('ecm_parentId', parentId)
      .set('ecm_trashed', 'false')
      .set('handling_handlingsriktning_agg', handlingsriktning?.length ? JSON.stringify(handlingsriktning) : '');
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortBy && sortOrder) params = params.set('sortOrder', sortOrder.toUpperCase());
    if (trimmedSearchTerm) params = params.set('dublincore_title', `%${trimmedSearchTerm.replace(/%/g, '')}%`);

    return this.http.get<SearchResult<NuxeoDocument<T>>>(`/nuxeo/api/v1/search/pp/handling_search/execute`, {
      params,
      headers: {
        properties: '*',
        'fetch-document': 'properties',
        'enrichers-document': 'subtypes,permissions,hasContent,thumbnail,renditions',
      },
    });
  }

  getUtkastsByParent<T = NuxeoProperties>(
    parentId: string,
    opts?: {
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      pageSize?: number;
      currentPageIndex?: number;
    },
    shouldRequestProps?: boolean
  ) {
    const orderBy = opts?.sortBy ? `ORDER BY ${opts.sortBy} ${opts.sortOrder?.toUpperCase() || 'ASC'}` : '';
    const query = `
      SELECT * FROM Utkast
      WHERE ecm:parentId = '${parentId}'
      AND ecm:isTrashed = 0
      ${orderBy}
    `;

    return this.http.post<SearchResult<NuxeoDocument<T>>>(
      `/nuxeo/api/v1/automation/Repository.Query`,
      {
        params: {
          query,
          pageSize: opts?.pageSize ?? 200,
          currentPageIndex: opts?.currentPageIndex ?? 0,
        },
      },
      {
        headers: {
          'fetch-document': shouldRequestProps ? 'properties' : '',
          properties: '*',
          'enrichers-document': 'subtypes,permissions,hasContent,thumbnail,renditions',
        },
      }
    );
  }

  getFilteredHandlingWithFile(parentId: string, opts?: Partial<ListCasesOpts>): Observable<SearchResult> {
    const query = `
    SELECT * FROM Document
    WHERE ecm:parentId = '${parentId}'
    AND ecm:currentLifeCycleState <> 'deleted'
    ${opts?.search ? `AND dc:title ILIKE '%${opts.search}%'` : ''}
    ${opts?.pathStartsWith ? `AND ecm:path STARTSWITH '${opts.pathStartsWith}'` : ''}
    ${opts?.sortBy ? `ORDER BY ${opts.sortBy} ${opts.sortOrder ? opts.sortOrder : 'DESC'}` : ''}
  `;

    return this.http.post<SearchResult>(
      `/nuxeo/api/v1/automation/Repository.Query`,
      {
        params: {
          query,
          pageSize: opts?.pageSize ?? 25,
          currentPageIndex: opts?.page ?? 0,
        },
      },
      {
        headers: {
          properties: '*',
          'enrichers-document': 'subtypes,permissions,hasContent,thumbnail,renditions',
        },
      }
    );
  }

  getSeveralDocsByUids(uids: string[]): Observable<SearchResult> {
    if (!uids.length) return EMPTY;

    const query = `
      SELECT ecm:uuid, dc:title  
      FROM Document  
      WHERE ecm:uuid IN (${uids.map(uid => `'${uid}'`).join(',')})
    `;

    return this.http.post<SearchResult>(
      `/nuxeo/api/v1/automation/Repository.Query`,
      {
        params: {
          query,
          pageSize: uids.length,
        },
      },
      {
        headers: {
          properties: '*',
          'enrichers-document': 'subtypes,permissions,hasContent,thumbnail,renditions',
        },
      }
    );
  }

  createHandlingFromUtkast(utkastId: string): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.UtkastToHandling`, {
      input: utkastId,
      params: {},
    });
  }

  advanceCaseLifecycle(caseId: string, currentState: string | undefined | null, targetState: string): Observable<void> {
    const { registrerat, underFordelning, underHandlaggning, beslutat, avslutatAvHandlaggare } =
      NUXEO_VOCAB_IDS.arendestatus;
    const order: string[] = [registrerat, underFordelning, underHandlaggning, beslutat, avslutatAvHandlaggare];

    const fromIndex = currentState ? order.indexOf(currentState) : -1;
    const toIndex = order.indexOf(targetState);

    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      return of(void 0);
    }

    const transitions = order.slice(fromIndex + 1, toIndex + 1).map(state => `to_${state}`);

    return transitions.reduce(
      (acc, value) =>
        acc.pipe(
          switchMap(() =>
            this.executeNuxeoOperation<void>('Document.FollowLifecycleTransition', {
              input: caseId,
              params: { value },
            })
          )
        ),
      of(void 0) as Observable<void>
    );
  }

  followLifecycleTransition(docId: string, transitionName: string) {
    return this.http.post<Transitions>(
      '/nuxeo/api/v1/automation/Document.FollowLifecycleTransition',
      {
        params: { value: transitionName },
        input: docId,
        context: {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  getLifecycleTransitions(docId: string) {
    return this.http.post<Transitions>(
      '/nuxeo/api/v1/automation/DMS.Lifecycle.GetLifecycleTransitions',
      {
        params: {},
        input: docId,
        context: {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'enrichers.document': 'thumbnail',
          'X-NXproperties': '*',
        },
      }
    );
  }

  getDocumentLifecycleHistory(docId: string) {
    return this.http.post<LifecycleHistoryResponse>(
      '/nuxeo/api/v1/automation/DMS.Lifecycle.GetDocumentLifecycleHistory',
      { params: {}, input: docId, context: {} },
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  markCaseReadyToClose(caseId: string): Observable<void> {
    const nxql = `SELECT * FROM Utkast WHERE ecm:parentId = '${caseId}' AND ecm:isTrashed = 0`;

    const params = new HttpParams().set('currentPageIndex', '0').set('pageSize', '1').set('queryParams', nxql);

    return this.http
      .get<NuxeoDocuments>('/nuxeo/api/v1/search/pp/nxql_search/execute', {
        params,
        withCredentials: true,
        headers: {
          'enrichers.document': 'thumbnail',
          'X-NXproperties': '*',
        },
      })
      .pipe(
        switchMap(result => {
          if (result.entries && result.entries.length > 0) {
            return throwError(
              () =>
                new Error(
                  'Du kan inte begära att ett ärende avslutas när det fortfarande finns några utkast till dokument.'
                )
            );
          }

          return this.executeNuxeoOperation<void>('Document.FollowLifecycleTransition', {
            input: caseId,
            params: { value: 'to_avslutatAvHandlaggare' },
          });
        })
      );
  }

  closeCase(caseId: string): Observable<unknown> {
    return this.executeNuxeoOperation('Document.FollowLifecycleTransition', {
      input: caseId,
      params: { value: 'to_stangt' },
    });
  }

  markCaseCancelled(caseId: string): Observable<unknown> {
    return this.executeNuxeoOperation('Document.FollowLifecycleTransition', {
      input: caseId,
      params: { value: 'to_makulerad' },
    });
  }

  updateAssignees(
    caseId: string,
    orgId: string,
    userId?: string | null,
    medhandlaggare?: string[]
  ): Observable<unknown> {
    return this.executeNuxeoOperation('Document.UpdateArendeAssignees', {
      input: caseId,
      params: {
        ansvarig_organisatorisk_enhet: orgId,
        ansvarig_handlaggare: userId ?? null,
        medhandlaggare: medhandlaggare ?? undefined,
      },
    });
  }

  getReadytoCloseCases() {
    const query = `SELECT * FROM Arende WHERE  ecm:currentLifeCycleState = '${NUXEO_VOCAB_IDS.arendestatus.avslutatAvHandlaggare}'`;

    const params = new HttpParams()
      .set('query', query)
      .set('pageSize', '50')
      .set('currentPageIndex', '0')
      .set('countTotal', 'true');

    return this.http.get<NuxeoDocuments>('/nuxeo/api/v1/query', {
      params,
      withCredentials: true,
      headers: {
        'enrichers.document': 'thumbnail',
        'X-NXproperties': '*',
      },
    });
  }

  findNearestHandling(path: string): Observable<NuxeoDocument | null> {
    return this.getPathInfo(path).pipe(
      switchMap(document => {
        if (document.type === 'Handling') {
          return of(document);
        }
        if (!document.parentRef) {
          return of(null);
        }
        return this.getDocumentById(document.parentRef).pipe(
          switchMap(parentDocument => {
            if (parentDocument.type === 'Handling') {
              return of(parentDocument);
            }

            return this.findNearestHandling(parentDocument.path);
          })
        );
      })
    );
  }

  getCollections(): Observable<CollectionCardItem[]> {
    const apiUrl =
      '/nuxeo/api/v1/search/pp/user_collections/execute?currentPageIndex=0&offset=0&pageSize=40&sortBy=dc%3Amodified&sortOrder=desc&searchTerm=%25&user=%24currentUser';

    return this.http.get<NuxeoDocuments>(apiUrl).pipe(
      map((response: NuxeoDocuments) =>
        response.entries.map((entry: NuxeoDocument) => {
          const title = entry.properties?.[NUXEO_SCHEMA_FIELDS.dc.title] ?? entry.title ?? '(saknas)';

          const dateString = entry.properties?.[NUXEO_SCHEMA_FIELDS.dc.modified] ?? entry.lastModified;
          const date = dateString ? new Date(dateString) : new Date();

          let property = '(okänd)';
          const creator = entry.properties?.[NUXEO_SCHEMA_FIELDS.dc.creator] as NxUser | undefined;

          if (creator?.properties) {
            const firstName = creator.properties.firstName ?? '';
            const lastName = creator.properties.lastName ?? '';
            property = `${firstName} ${lastName}`.trim() || creator.id || '(okänd)';
          }

          return { uid: entry.uid, title, date, property };
        })
      )
    );
  }

  searchCollections(searchTerm: string): Observable<SearchResult> {
    return this.http.get<SearchResult>('/nuxeo/api/v1/search/pp/user_collections/execute', {
      params: {
        currentPageIndex: 0,
        offset: 0,
        pageSize: 40,
        sortBy: NUXEO_SCHEMA_FIELDS.dc.modified,
        sortOrder: 'desc',
        searchTerm: searchTerm || '%',
        user: '$currentUser',
      },
    });
  }

  createCollection(name: string, description?: string): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('Collection.Create', {
      params: {
        name,
        description: description ?? '',
      },
      context: {},
    });
  }

  addDocumentToCollection(collectionId: string, documentIds: string[]): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('Document.AddToCollection', {
      params: { collection: collectionId },
      context: {},
      input: `docs:${documentIds}`,
    });
  }

  removeDocumentFromCollection(collectionId: string, documentIds: string[]): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('Collection.RemoveFromCollection', {
      params: { collection: collectionId },
      context: {},
      input: `docs:${documentIds}`,
    });
  }

  addToCollectionByName(
    collectionName: string,
    documentsIds: string[],
    description?: string
  ): Observable<NuxeoDocument> {
    return this.searchCollections(collectionName).pipe(
      switchMap(result => {
        const existingCollection = result.entries?.find(
          entry => entry.title?.toLowerCase() === collectionName.toLowerCase()
        );

        if (existingCollection) {
          return this.addDocumentToCollection(existingCollection.uid, documentsIds);
        }

        return this.createCollection(collectionName, description).pipe(
          switchMap(newCollection => this.addDocumentToCollection(newCollection.uid, documentsIds))
        );
      })
    );
  }

  getCollectionsForDocument(documentId: string): Observable<NuxeoDocuments> {
    return this.http.get<NuxeoDocuments>(`/nuxeo/api/v1/id/${documentId}/@collections`);
  }

  uploadAttachmentDocuments(parentUid: string, batchId: string, files: File[]) {
    if (!files || files.length === 0) {
      return of([]);
    }

    return forkJoin(
      files.map((file, index) => {
        const documentName = `bilaga_${index + 1}`;
        const body = {
          'entity-type': 'document',
          name: documentName,
          type: 'Fil',
          properties: {
            [NUXEO_SCHEMA_FIELDS.dc.title]: file.name,
            [NUXEO_SCHEMA_FIELDS.fil.typ]: NUXEO_VOCAB_IDS.filTyp.bilaga,
            [NUXEO_SCHEMA_FIELDS.file.content]: {
              'upload-batch': batchId,
              'upload-fileId': `${index}`,
            },
          },
        };

        return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/id/${parentUid}`, body, {
          headers: {
            'Content-Type': 'application/json',
            properties: '*',
            'enrichers-document':
              'subtypes,permissions,hasContent,firstAccessibleAncestor,breadcrumb,preview,thumbnail',
          },
        });
      })
    );
  }

  /**
   * Backwards-compatible wrapper for automation calls (used e.g. by NotificationService).
   * Prefer executeNuxeoOperation in new code.
   */
  automation<TRequest extends object, TResponse = unknown>(operationId: string, body: TRequest): Observable<TResponse> {
    return this.executeNuxeoOperation<TResponse>(operationId, body as Record<string, unknown>);
  }

  lockDocument(docId: string): Observable<NuxeoDocument> {
    const payload = { params: {}, context: {}, input: docId };
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.Lock`, payload, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json+nxrequest',
        Accept: 'application/json',
        'fetch-document': 'lock',
      },
    });
  }

  unlockDocument(docId: string): Observable<NuxeoDocument> {
    const payload = { params: {}, context: {}, input: docId };
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.Unlock`, payload, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json+nxrequest',
        Accept: 'application/json',
        'fetch-document': 'lock',
      },
    });
  }

  createHandlingFromNote(payload: CreateHandlingFromNotePayload): Observable<NuxeoDocument> {
    return this.executeNuxeoOperation<NuxeoDocument>('DMS.Handling.CreateHandlingFromNote', payload);
  }

  sendCaseEmail(caseId: string, payload: SendCaseEmailPayload): Observable<unknown> {
    const body = {
      context: {},
      input: `doc:${caseId}`,
      params: {
        template: payload.template ?? null,
        subject: payload.subject ?? '',
        templateContent: payload.templateContent ?? payload.body ?? '',
        to: payload.recipients,
        cc: payload.ccRecipients ?? [],
        bcc: payload.bccRecipients ?? [],
        replyto: payload.replyTo ?? [],
        body: payload.templateContent ?? payload.body ?? '',
        attachments: payload.attachments ?? [],
        handling: payload.handling ?? {},
        attachHandling: payload.attachHandling,
        attachedHandlingar: payload.attachedHandlingar,
      },
    };

    return this.http.post(`/nuxeo/api/v1/automation/DMS.Mail.SendMailFromArende`, body, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json+nxrequest',
        Accept: 'application/json',
        'X-NXException-StackTrace': 'true',
        'X-NXException-Trace': 'true',
      },
    });
  }

  checkEmails(mailFolderUid: string) {
    const payload = {
      context: {},
      params: {},
      input: mailFolderUid,
    };
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Mail.CheckInbox`, payload);
  }

  saveSearch(formResult: SavedSearchParams) {
    return this.http.post<SearchResult>(`/nuxeo/api/v1/search/saved`, {
      'entity-type': 'savedSearch',
      pageProviderName: 'dms_search',
      params: formResult,
      title: 'string',
    });
  }

  getSavedSearches() {
    return this.http.get<SavedSearchResult>(`/nuxeo/api/v1/search/saved`);
  }

  shareSearch(usersIds: string[], searchId: string, userId?: string) {
    return this.http.post<SavedSearchResult>(`/nuxeo/api/v1/automation/Document.AddPermission`, {
      context: {},
      input: searchId,
      params: {
        users: usersIds,
        permission: 'Read',
        username: userId,
      },
    });
  }

  shareDocumentWithExternalUser(
    documentId: string,
    params: {
      email: string;
      permission: string;
      begin: string | null;
      end: string | null;
      notify: boolean;
      comment?: string;
      invalid?: boolean;
    }
  ): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.AddPermission`, {
      context: {},
      input: documentId,
      params: {
        users: [],
        username: null,
        email: params.email,
        permission: params.permission,
        begin: params.begin,
        end: params.end,
        notify: params.notify,
        comment: params.comment ?? '',
        invalid: params.invalid ?? false,
      },
    });
  }

  getDocumentAcls(documentId: string): Observable<NuxeoAcls> {
    return this.http.get<NuxeoAcls>(`/nuxeo/api/v1/id/${documentId}/@acl`);
  }

  addDocumentPermission(
    documentId: string,
    params: {
      users: string[];
      permission: string;
      begin: string | null;
      end: string | null;
      notify: boolean;
      comment?: string;
    }
  ): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.AddPermission`, {
      context: {},
      input: documentId,
      params: {
        users: params.users,
        username: null,
        email: null,
        permission: params.permission,
        begin: params.begin,
        end: params.end,
        notify: params.notify,
        comment: params.comment ?? '',
        invalid: false,
      },
    });
  }

  replaceDocumentPermission(
    documentId: string,
    params: {
      username: string;
      permission: string;
      begin: string | null;
      end: string | null;
      notify: boolean;
      comment?: string;
      id: string;
    }
  ): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.ReplacePermission`, {
      context: {},
      input: documentId,
      params: {
        users: [],
        username: params.username,
        email: null,
        permission: params.permission,
        begin: params.begin,
        end: params.end,
        notify: params.notify,
        comment: params.comment ?? '',
        invalid: false,
        id: params.id,
      },
    });
  }

  removeDocumentPermission(documentId: string, aclName: string, aceId: string): Observable<unknown> {
    const safeAcl = encodeURIComponent(aclName);
    const safeAce = encodeURIComponent(aceId);
    return this.http.delete(`/nuxeo/api/v1/id/${documentId}/@acl/${safeAcl}/${safeAce}`);
  }

  removeDocumentPermissionAutomation(
    documentId: string,
    params: {
      id: string;
      acl: string;
    }
  ): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.RemovePermission`, {
      context: {},
      input: documentId,
      params: {
        id: params.id,
        acl: params.acl,
      },
    });
  }

  sendPermissionNotificationEmail(
    documentId: string,
    params: {
      id: string;
    }
  ): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.SendNotificationEmailForPermission`, {
      context: {},
      input: documentId,
      params: {
        id: params.id,
      },
    });
  }

  getDocumentWithAcls(documentId: string): Observable<NuxeoDocument> {
    const params = new HttpParams()
      .set('fetch-acls', 'username,creator,extended')
      .set('depth', 'children')
      .set('time', Date.now().toString())
      .set('properties', '*');
    return this.http.get<NuxeoDocument>(`/nuxeo/api/v1/id/${documentId}`, {
      params,
      headers: {
        properties: '*',
        'fetch-document': 'properties',
        'fetch-acls': 'username,creator,extended',
        'enrichers-document': 'acls',
      },
    });
  }

  blockPermissionInheritance(documentId: string): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.BlockPermissionInheritance`, {
      context: {},
      params: {},
      input: documentId,
    });
  }

  unblockPermissionInheritance(documentId: string): Observable<NuxeoDocument> {
    return this.http.post<NuxeoDocument>(`/nuxeo/api/v1/automation/Document.UnblockPermissionInheritance`, {
      context: {},
      params: {},
      input: documentId,
    });
  }

  deleteSavedSearch(id: string) {
    return this.http.delete<SearchResult>(`/nuxeo/api/v1/search/saved/${id}`);
  }

  filterTemplatesByType(documentId: string): Observable<SearchResult<NuxeoDocument<TemplateSourceProperties>>> {
    return this.http.post<SearchResult<NuxeoDocument<TemplateSourceProperties>>>(
      `/nuxeo/api/v1/automation/javascript.FilterTemplatesByType`,
      {
        params: {},
        context: {},
        input: documentId,
      },
      {
        headers: {
          properties: '*',
          'fetch-document': 'properties',
        },
      }
    );
  }

  renderArendePdf(arendeId: string, templateName: string, templateData: string): Observable<Blob> {
    return this.http.post<Blob>(
      `/nuxeo/api/v1/automation/javascript.RenderPdf`,
      {
        input: arendeId,
        params: {
          templateName,
          attach: true,
          templateData,
        },
        context: {},
      },
      {
        responseType: 'blob' as 'json',
      }
    );
  }

  generateFileFromTemplate(templateId: string, utkastId: string) {
    return this.http.post<SearchResult>(`/nuxeo/site/automation/DMS.TR.GenerateFromTemplate`, {
      params: {
        convertToPDF: false,
        template: templateId,
      },
      input: utkastId,
    });
  }

  getStatistics(payload?: Record<string, unknown> | undefined) {
    return this.http.post<Statistics>(`/nuxeo/api/v1/automation/DMS.GetStatistics`, {
      context: {},
      params: payload,
    });
  }

  getGeneralSearchResults(searchTerm: string) {
    return this.http.post<GeneralSearchResult[]>(`/nuxeo/api/v1/automation/Search.SuggestersLauncher`, {
      params: {
        searchTerm,
      },
    });
  }
  saveChecklist() {
    return this.http.post(`/nuxeo/api/v1/path/Myndighet/Informationsforvaltning/Checklistor`, {
      params: {},
    });
  }
  getDeletedFiles(currentPage: number, pageSize: number, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const params: Record<string, string> = {
      currentPageIndex: String(currentPage),
      pageSize: String(pageSize),
    };
    if (sortBy) params['sortBy'] = sortBy;
    if (sortBy && sortOrder) params['sortOrder'] = sortOrder.toUpperCase();

    return this.http.get<SearchResult>(`/nuxeo/api/v1/search/pp/default_trash_search/execute`, {
      params,
    });
  }
  restoreSelectedFiles(filesToRestore: string | string[]) {
    return this.http.post<SearchResult>(
      `/nuxeo/api/v1/automation/Document.Untrash`,
      {
        input: 'docs:' + (Array.isArray(filesToRestore) ? filesToRestore.join(',') : filesToRestore),
      },
      {
        headers: {
          'nx-es-sync': 'true',
        },
      }
    );
  }
  deleteSelectedFiles(filesToDelete: string | string[]) {
    return this.http.post<SearchResult>(
      `/nuxeo/api/v1/automation/Document.Delete`,
      { input: 'docs:' + (Array.isArray(filesToDelete) ? filesToDelete.join(',') : filesToDelete) },
      {
        headers: {
          'nx-es-sync': 'true',
        },
      }
    );
  }

  editWorkflow(workflowId: string, action: string, payload: Record<string, unknown>) {
    return this.http.put<WorkflowInfo>(`/nuxeo/api/v1/task/${workflowId}/${action}`, payload);
  }
}
