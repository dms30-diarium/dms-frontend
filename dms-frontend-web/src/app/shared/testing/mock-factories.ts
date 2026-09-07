/**
 * Shared factory helpers for building fully-typed mock objects in spec files,
 * avoiding `any` while keeping test setup concise. Each factory fills in every
 * required field with a sensible default and accepts a partial override.
 */
import {
  NuxeoDocument,
  NuxeoProperties,
  SearchResult,
  UserSuggestion,
  WorkflowInfo,
  Direction,
  NxUser,
  Statistics,
  AuditEntry,
  AuditLogEntries,
} from '@app/shared/api/nuxeo-api.types';

export function makeNuxeoDocument<P = NuxeoProperties>(
  overrides: Partial<Omit<NuxeoDocument<P>, 'properties'>> & { properties?: P } = {}
): NuxeoDocument<P> {
  return {
    'entity-type': 'document',
    repository: 'default',
    uid: 'uid-1',
    path: '/path',
    type: 'Document',
    name: 'doc',
    title: 'Title',
    isCheckedOut: false,
    isRecord: false,
    isTrashed: false,
    facets: [],
    schemas: [],
    lastModified: '2024-01-01T00:00:00Z',
    properties: {} as P,
    ...overrides,
  };
}

export function makeSearchResult<E = NuxeoDocument>(overrides: Partial<SearchResult<E>> = {}): SearchResult<E> {
  return {
    'entity-type': 'documents',
    isPaginable: true,
    resultsCount: overrides.entries?.length ?? 0,
    totalSize: overrides.entries?.length ?? 0,
    pageSize: 25,
    pageIndex: 0,
    pageCount: 1,
    entries: [],
    ...overrides,
  };
}

export function makeUserSuggestion(overrides: Partial<UserSuggestion> = {}): UserSuggestion {
  return {
    id: 'user-1',
    displayLabel: 'User One',
    'entity-type': 'userEntry',
    ...overrides,
  };
}

export function makeDirection(overrides: Partial<Direction> = {}): Direction {
  return {
    id: 'dir-1',
    displayLabel: 'Direction One',
    ...overrides,
  };
}

export function makeNxUser(overrides: Partial<NxUser> = {}): NxUser {
  return {
    'entity-type': 'user',
    id: 'user-1',
    ...overrides,
  };
}

export function makeWorkflowInfo(overrides: Partial<WorkflowInfo> = {}): WorkflowInfo {
  return {
    'entity-type': 'task',
    id: 'wf-1',
    name: 'wf',
    title: 'Workflow',
    workflowInstanceId: 'wf-1',
    workflowModelName: 'model',
    workflowInitiator: 'initiator',
    workflowTitle: 'Workflow Title',
    workflowLifeCycleState: 'running',
    graphResource: '',
    state: 'running',
    directive: null,
    created: new Date('2024-01-01T00:00:00Z'),
    dueDate: new Date('2024-01-08T00:00:00Z'),
    nodeName: 'node',
    targetDocumentIds: [],
    actors: [],
    delegatedActors: [],
    comments: [],
    variables: {
      deadline: new Date('2024-01-08T00:00:00Z'),
      paminnelse: new Date('2024-01-05T00:00:00Z'),
    },
    taskInfo: { taskActions: [] },
    ...overrides,
  };
}

export function makeAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    'entity-type': 'logEntry',
    id: 1,
    ...overrides,
  };
}

export function makeAuditLogEntries(overrides: Partial<AuditLogEntries> = {}): AuditLogEntries {
  return {
    'entity-type': 'logEntries',
    isPaginable: true,
    resultsCount: overrides.entries?.length ?? 0,
    pageSize: 40,
    maxPageSize: 100,
    resultsCountLimit: 1000,
    currentPageSize: overrides.entries?.length ?? 0,
    currentPageIndex: 0,
    currentPageOffset: 0,
    numberOfPages: 1,
    isPreviousPageAvailable: false,
    isNextPageAvailable: false,
    isLastPageAvailable: true,
    isSortable: false,
    hasError: false,
    entries: [],
    ...overrides,
  };
}

export function makeStatistics(overrides: Partial<Statistics> = {}): Statistics {
  return {
    arenden: { ansvarig_organisatorisk_enhet: [], arendetyp: [], totalt: 0 },
    stangda_arenden: { ansvarig_organisatorisk_enhet: [], arendetyp: [], totalt: 0 },
    genomsnittlig_arendetid: 0,
    genomsnittlig_handlaggningstid: 0,
    totalt_inkomna_handlingar: 0,
    totalt_upprattade_handlingar: 0,
    ...overrides,
  };
}
