import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import {
  AggBucket,
  NuxeoDocuments,
  SearchResult,
  NuxeoDocument,
  WorkflowInfo,
  ArendeExtendedProperties,
} from '@app/shared/api/nuxeo-api.types';
import { AppRole } from '@app/shared/models/roles';
import { SearchService } from '@app/core/services/search.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { DMS_SEARCH_FIELDS, EXACT_SEARCH_FIELDS, NON_AGGREGATED_FIELDS } from './cases-search.config';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

type ParamObject = Record<string, string | number | string[] | number[]>;

export interface ListCasesOpts {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchField?: string;
  searchAllColumns?: boolean;
  columnFilters?: Record<string, string | string[]>;
  department?: string;
  topic?: string;
  docType?: string;
  pathStartsWith?: string;
  types?: string[];
}

export interface ListByTabOpts extends ListCasesOpts {
  tab?: string;
  username?: string | null;
  orgUnitId?: string | null;
  activeRole?: AppRole | null;
}

@Injectable({ providedIn: 'root' })
export class CasesService {
  private http = inject(HttpClient);
  private base = '/nuxeo/api/v1';
  private searchService = inject(SearchService);
  private store = inject(GeneralStore);

  /** Tabs that don't have endpoints (yet) — return an empty result */
  private readonly NO_ENDPOINT_TABS = new Set<string>([
    'i-choose',
    'folder',
    'group-incoming',
    'to-distribute',
    'to-dispatch',
    'my-tasks',
    'my-monitoring',
  ]);

  /** Properly shaped empty result */
  private emptyResult(): SearchResult<NuxeoDocument<ArendeExtendedProperties>> {
    return {
      'entity-type': 'documents',
      isPaginable: true,
      resultsCount: 0,
      totalSize: 0,
      pageSize: 25,
      pageIndex: 0,
      pageCount: 0,
      entries: [],
    };
  }

  /** Pick the correct `properties` header based on PageProvider */
  private propertiesForProvider(provider: string): string {
    switch (provider) {
      case 'arende_search':
      case 'dms_search':
        return 'dublincore,common,uid,arende';
      default:
        return '*';
    }
  }

  private buildPageProviderParams(
    opts: ListByTabOpts,
    settings?: { forceDmsSearch?: boolean }
  ): { provider: string; params: ParamObject; rawParams: ParamObject; properties: string } {
    const {
      tab,
      username,
      page = 0,
      pageSize = 25,
      sortBy,
      sortOrder,
      search,
      searchField,
      searchAllColumns,
      columnFilters,
      docType,
      types,
      pathStartsWith,
    } = opts;

    let provider = 'arende_search';
    const params: ParamObject = {
      currentPageIndex: page,
      pageSize,
      offset: page * pageSize,
    };

    if (sortBy) params['sortBy'] = sortBy;
    if (sortBy && sortOrder) params['sortOrder'] = sortOrder.toUpperCase();

    const tabKey = (tab ?? '').toLowerCase();

    switch (tabKey) {
      case 'all-docs':
        provider = 'arende_search';
        break;
      case 'my-cases':
        provider = 'arende_search';
        if (username) params['arende_ansvarig_handlaggare'] = [username];
        break;
      case 'my-utkasts':
        provider = 'dms_search';
        break;
      case 'my-co-handled-cases':
        provider = 'arende_search';
        if (username) params['arende_medhandlaggare'] = username;
        break;
      case 'ready-to-close':
        provider = 'dms_search';
        params['additionalClause'] =
          ` AND ecm:currentLifeCycleState = '${NUXEO_VOCAB_IDS.arendestatus.avslutatAvHandlaggare}'`;
        break;
      case 'e-post':
        provider = 'mailmessage_search';
        break;
      case 'scans':
        provider = 'nxql_search';
        params['queryParams'] = 'SELECT * FROM Importorfil WHERE ecm:isTrashed = 0';
        break;
      default:
        throw new Error(`Unknown tab: ${tabKey}`);
    }

    const rawSearch = (search ?? '').trim();
    const field = (searchField ?? '').trim();
    const shouldSearchAll = !!searchAllColumns && !!rawSearch;
    const columnFilterKeys = Object.keys(columnFilters ?? {});

    const hasDmsColumnFilters = columnFilterKeys.some(key => DMS_SEARCH_FIELDS.has(key));
    const hasRangeFilters = columnFilterKeys.some(k => k.endsWith('_min') || k.endsWith('_max'));
    const hasAggFilters = columnFilterKeys.some(k => k.endsWith('_agg'));
    const forceDmsSearch = settings?.forceDmsSearch === true;

    let useDmsSearch =
      forceDmsSearch ||
      (!!rawSearch && !!field && DMS_SEARCH_FIELDS.has(field)) ||
      hasDmsColumnFilters ||
      hasRangeFilters ||
      hasAggFilters;

    if (shouldSearchAll) useDmsSearch = true;
    if (tabKey === 'my-co-handled-cases' && !shouldSearchAll) useDmsSearch = false;

    if (provider === 'arende_search' && useDmsSearch) provider = 'dms_search';

    const textSearch = rawSearch ? this.searchService.toContainsPattern(rawSearch) : '';

    if (shouldSearchAll) {
      params['system_fulltext'] = JSON.stringify(rawSearch);
    } else if (textSearch) {
      params[field || 'dublincore_title'] = field && EXACT_SEARCH_FIELDS.has(field) ? rawSearch : textSearch;
    }

    Object.entries(columnFilters ?? {}).forEach(([filterField, filterValue]) => {
      if (Array.isArray(filterValue)) {
        const key =
          NON_AGGREGATED_FIELDS.has(filterField) || filterField.endsWith('_agg') ? filterField : `${filterField}_agg`;
        params[key] = filterValue;
      } else if (filterValue != null && filterValue !== '') {
        params[filterField] = this.isExactColumnFilter(filterField)
          ? filterValue
          : this.searchService.toContainsPattern(filterValue);
      }
    });

    if (pathStartsWith) params['ecm_path'] = pathStartsWith;

    if (provider === 'dms_search') {
      if (docType) params['system_primaryType_agg'] = [docType];
      else if (types?.length) params['system_primaryType_agg'] = types;
      else if (tabKey === 'my-utkasts') params['system_primaryType_agg'] = ['Utkast'];
      else if (!['e-post', 'scans'].includes(tabKey)) params['system_primaryType_agg'] = ['Arende'];

      if (!params['additionalClause']) params['additionalClause'] = '';
    } else {
      if (docType) params['ecm_primaryType'] = docType;
      else if (types?.length) params['ecm_primaryType'] = types.join(',');
    }

    const rawParams = { ...params };

    const urlParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? JSON.stringify(value) : value])
    );

    const properties = this.propertiesForProvider(provider);

    return { provider, params: urlParams, rawParams, properties };
  }

  getAllTasks(pageSize?: number, currentPage?: number) {
    return this.http.get<SearchResult<WorkflowInfo>>(
      `${this.base}/task?pageSize=${pageSize ?? 25}&currentPageIndex=${currentPage ?? 0}`,
      {
        headers: {
          'fetch-task': 'targetDocumentIds,actors',
          'fetch-document': 'properties',
          properties: '*',
        },
      }
    );
  }

  listByTab(opts: ListByTabOpts): Observable<SearchResult<NuxeoDocument<ArendeExtendedProperties>>> {
    const tabKey = (opts.tab ?? '').toLowerCase();

    // Short-circuit tabs without endpoints (yet)
    if (this.NO_ENDPOINT_TABS.has(tabKey)) {
      return of(this.emptyResult());
    }
    const { provider, params, properties } = this.buildPageProviderParams(opts);
    return this.http.get<SearchResult<NuxeoDocument<ArendeExtendedProperties>>>(
      `${this.base}/search/pp/${provider}/execute`,
      {
        params,
        withCredentials: true,
        headers: {
          accept: 'application/json',
          'enrichers-document': 'permissions',
          'fetch-aggregate': 'key',
          'fetch-document': 'properties',
          'translate-directoryEntry': 'label',
          properties,
        },
      }
    );
  }

  getCountByTab(opts: ListByTabOpts): Observable<number> {
    const tabKey = (opts.tab ?? '').toLowerCase();

    if (this.NO_ENDPOINT_TABS.has(tabKey)) {
      return of(0);
    }

    const { provider, params } = this.buildPageProviderParams({
      ...opts,
      page: 0,
      pageSize: 1,
    });

    return this.http
      .get<SearchResult>(`${this.base}/search/pp/${provider}/execute`, {
        params,
        withCredentials: true,
        headers: {
          accept: 'application/json',
          properties: 'uid',
        },
      })
      .pipe(map(response => response.totalSize ?? 0));
  }

  private isExactColumnFilter(filterField: string): boolean {
    return EXACT_SEARCH_FIELDS.has(filterField) || filterField.endsWith('_min') || filterField.endsWith('_max');
  }

  getCsvExportParams(opts: ListByTabOpts): {
    providerName: string;
    namedParameters: Record<string, unknown>;
    queryParams: unknown[];
  } {
    const { provider, rawParams } = this.buildPageProviderParams(opts);

    const paginationKeys = new Set(['currentPageIndex', 'pageSize', 'offset', 'sortBy', 'sortOrder']);
    const namedParameters: Record<string, unknown> = {};
    const queryParams: unknown[] = [];

    for (const [key, value] of Object.entries(rawParams)) {
      if (paginationKeys.has(key)) continue;
      if (key === 'queryParams') {
        queryParams.push(value);
        continue;
      }
      namedParameters[key] = Array.isArray(value) ? JSON.stringify(value) : value;
    }

    return { providerName: provider, namedParameters, queryParams };
  }

  getCreatedAggBucketsByTab(opts: ListByTabOpts): Observable<AggBucket[]> {
    const tabKey = (opts.tab ?? '').toLowerCase();
    if (this.NO_ENDPOINT_TABS.has(tabKey)) {
      return of([]);
    }

    const baseParams: ListByTabOpts = {
      ...opts,
      page: 0,
      pageSize: 1,
    };

    const { provider, params, properties } = this.buildPageProviderParams(baseParams, { forceDmsSearch: true });

    return this.http
      .get<SearchResult>(`${this.base}/search/pp/${provider}/execute`, {
        params,
        withCredentials: true,
        headers: {
          accept: 'application/json',
          'enrichers-document': 'permissions',
          'fetch-aggregate': 'key',
          'fetch-document': 'properties',
          'translate-directoryEntry': 'label',
          properties,
        },
      })
      .pipe(
        map(response => {
          const agg = response.aggregations?.dublincore_created_agg;
          if (!agg) return [];
          if (agg.buckets?.length) return agg.buckets;
          return agg.extendedBuckets ?? [];
        })
      );
  }

  getCaseById(id: string): Observable<NuxeoDocument> {
    return this.http.get<NuxeoDocument>(`${this.base}/id/${id}`, {
      headers: { properties: '*' },
    });
  }

  getHandlingWithFile(parentId: string) {
    return this.http.post<SearchResult>(
      `${this.base}/automation/Document.GetChildren`,
      { input: `doc:${parentId}` },
      {
        headers: {
          properties: '*',
          'enrichers-document':
            'subtypes,permissions,hasContent,firstAccessibleAncestor,breadcrumb,thumbnail,renditions',
        },
      }
    );
  }

  listViaPageProvider(opts: ListCasesOpts = {}) {
    const {
      page = 0,
      pageSize = 25,
      sortBy = NUXEO_SCHEMA_FIELDS.dc.modified,
      sortOrder = 'desc',
      search = '',
      pathStartsWith,
      docType,
      types,
    } = opts;

    let params = new HttpParams()
      .set('ecm_fulltext', (search ?? '').trim() ? `${(search ?? '').trim()}*` : '')
      .set('currentPageIndex', String(page))
      .set('pageSize', String(pageSize))
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder.toUpperCase())
      .set('countTotal', 'true');

    if (pathStartsWith) params = params.set('ecm_path', pathStartsWith);
    if (docType) params = params.set('ecm_primaryType', docType);
    if (types?.length) params = params.set('ecm_primaryType', types.join(','));

    return this.http.get<NuxeoDocuments>(`${this.base}/search/pp/default_search/execute`, {
      params,
      withCredentials: true,
      headers: { 'X-NXenrichers.document': 'thumbnail', 'X-NXproperties': '*' },
    });
  }

  getStatusColor(
    statusName: string,
    options?: { fallback?: 'approved' | 'missing' | 'prompt' | 'denied' | 'neutral' | 'beta' }
  ): 'approved' | 'missing' | 'prompt' | 'denied' | 'neutral' | 'beta' {
    const fallback = options?.fallback ?? 'missing';
    if (!statusName) return fallback;

    const lowered = statusName.trim().toLowerCase();
    if (!lowered) return fallback;

    const { arendestatus, handlingLifecycle } = NUXEO_VOCAB_IDS;

    switch (lowered) {
      case arendestatus.oppet.toLowerCase():
      case arendestatus.registrerat.toLowerCase():
      case arendestatus.underFordelning.toLowerCase():
      case arendestatus.underHandlaggning.toLowerCase():
      case arendestatus.beslutat.toLowerCase():
      case arendestatus.expedierat.toLowerCase():
      case arendestatus.avslutat.toLowerCase():
      case arendestatus.avslutatAvHandlaggare.toLowerCase():
        return 'approved';
      case handlingLifecycle.diarieford.toLowerCase():
        return 'prompt';
      case arendestatus.stangt.toLowerCase():
        return 'neutral';
      case arendestatus.makulerat.toLowerCase():
      case arendestatus.makulerad.toLowerCase():
      case handlingLifecycle.makulerad.toLowerCase():
        return 'denied';
      case arendestatus.gallrat.toLowerCase():
      case handlingLifecycle.gallrad.toLowerCase():
        return 'beta';
      case arendestatus.arkiverat.toLowerCase():
      case handlingLifecycle.arkiverad.toLowerCase():
        return 'prompt';
      case arendestatus.avstallt.toLowerCase():
      case handlingLifecycle.avstalld.toLowerCase():
        return 'neutral';
      case handlingLifecycle.utkast.toLowerCase():
        return 'missing';

      default:
        return fallback;
    }
  }

  getStatusVariation(statusName: string): 'primary' | 'secondary' {
    const lowered = statusName.trim().toLowerCase();
    const { arendestatus, handlingLifecycle } = NUXEO_VOCAB_IDS;

    switch (lowered) {
      case arendestatus.gallrat:
      case handlingLifecycle.gallrad:
      case arendestatus.arkiverat:
      case handlingLifecycle.arkiverad:
      case arendestatus.avstallt:
      case handlingLifecycle.avstalld:
        return 'secondary';
      default:
        return 'primary';
    }
  }

  getStatusLabel(statusName: string | null | undefined): string {
    const raw = statusName ?? '';
    const trimmed = raw.trim();
    if (!trimmed) return '';

    const messages = this.store.messagesInfo();
    if (messages) {
      const lowered = trimmed.toLowerCase();
      for (const [key, value] of Object.entries(messages)) {
        if (!value) continue;
        const keyLower = key.toLowerCase();
        if (!keyLower.startsWith('label.')) continue;
        if (keyLower.endsWith(`.${lowered}`)) return value;
      }
    }

    const first = trimmed[0];
    if (!first) return trimmed;
    return `${first.toUpperCase()}${trimmed.slice(1)}`;
  }
}
