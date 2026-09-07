import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CasesService } from './cases.service';
import { GeneralStore } from './general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';

describe('CasesService', () => {
  let service: CasesService;
  let httpMock: HttpTestingController;
  let storeSpy: jasmine.SpyObj<GeneralStore>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    storeSpy = jasmine.createSpyObj('GeneralStore', ['messagesInfo', 'getLabelByType', 'getValue', 'getStatus'], {
      messagesInfo: jasmine.createSpy().and.returnValue(null),
    });
    storeSpy.messagesInfo.and.returnValue(null);

    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        CasesService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: GeneralStore, useValue: storeSpy },
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(CasesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getStatusColor', () => {
    it('returns "approved" for oppet', () => {
      expect(service.getStatusColor('oppet')).toBe('approved');
    });

    it('returns "approved" for beslutat', () => {
      expect(service.getStatusColor('beslutat')).toBe('approved');
    });

    it('returns "approved" for registrerat', () => {
      expect(service.getStatusColor('registrerat')).toBe('approved');
    });

    it('returns "approved" for underFordelning (camelCase id matched case-insensitively)', () => {
      expect(service.getStatusColor('underFordelning')).toBe('approved');
    });

    it('returns "approved" for underHandlaggning (camelCase id matched case-insensitively)', () => {
      expect(service.getStatusColor('underHandlaggning')).toBe('approved');
    });

    it('returns "approved" for expedierat', () => {
      expect(service.getStatusColor('expedierat')).toBe('approved');
    });

    it('returns "approved" for avslutat', () => {
      expect(service.getStatusColor('avslutat')).toBe('approved');
    });

    it('returns "neutral" for stangt', () => {
      expect(service.getStatusColor('stangt')).toBe('neutral');
    });

    it('returns "denied" for makulerat', () => {
      expect(service.getStatusColor('makulerat')).toBe('denied');
    });

    it('returns "denied" for makulerad', () => {
      expect(service.getStatusColor('makulerad')).toBe('denied');
    });

    it('returns "beta" for gallrat', () => {
      expect(service.getStatusColor('gallrat')).toBe('beta');
    });

    it('returns "prompt" for arkiverat', () => {
      expect(service.getStatusColor('arkiverat')).toBe('prompt');
    });

    it('returns "neutral" for avstallt', () => {
      expect(service.getStatusColor('avstallt')).toBe('neutral');
    });

    it('returns "missing" for utkast lifecycle', () => {
      expect(service.getStatusColor('utkast')).toBe('missing');
    });

    it('returns "prompt" for diarieford lifecycle', () => {
      expect(service.getStatusColor('diarieford')).toBe('prompt');
    });

    it('returns default fallback for unknown status', () => {
      expect(service.getStatusColor('unknown')).toBe('missing');
    });

    it('returns custom fallback for unknown status', () => {
      expect(service.getStatusColor('', { fallback: 'approved' })).toBe('approved');
    });

    it('returns fallback for empty string', () => {
      expect(service.getStatusColor('')).toBe('missing');
    });
  });

  describe('getStatusVariation', () => {
    it('returns "secondary" for gallrat', () => {
      expect(service.getStatusVariation('gallrat')).toBe('secondary');
    });

    it('returns "secondary" for arkiverat', () => {
      expect(service.getStatusVariation('arkiverat')).toBe('secondary');
    });

    it('returns "secondary" for avstallt', () => {
      expect(service.getStatusVariation('avstallt')).toBe('secondary');
    });

    it('returns "primary" for oppet', () => {
      expect(service.getStatusVariation('oppet')).toBe('primary');
    });

    it('returns "primary" for unknown status', () => {
      expect(service.getStatusVariation('unknown')).toBe('primary');
    });
  });

  describe('getStatusLabel', () => {
    it('returns empty string for null', () => {
      storeSpy.messagesInfo.and.returnValue(null);
      expect(service.getStatusLabel(null)).toBe('');
    });

    it('returns empty string for empty string', () => {
      storeSpy.messagesInfo.and.returnValue(null);
      expect(service.getStatusLabel('')).toBe('');
    });

    it('capitalizes first letter when no messages', () => {
      storeSpy.messagesInfo.and.returnValue(null);
      expect(service.getStatusLabel('oppet')).toBe('Oppet');
    });

    it('returns translated label from messagesInfo', () => {
      storeSpy.messagesInfo.and.returnValue({
        'label.ui.state.oppet': 'Öppet',
      });
      expect(service.getStatusLabel('oppet')).toBe('Öppet');
    });

    it('capitalizes first letter when key not found in messages', () => {
      storeSpy.messagesInfo.and.returnValue({ 'label.other': 'Other' });
      expect(service.getStatusLabel('stangt')).toBe('Stangt');
    });
  });

  describe('getCaseById', () => {
    it('calls correct API endpoint', () => {
      service.getCaseById('test-uid').subscribe();
      const req = httpMock.expectOne(r => r.url.includes('test-uid'));
      expect(req.request.method).toBe('GET');
      req.flush({ uid: 'test-uid' });
    });
  });

  describe('getAllTasks', () => {
    it('GETs task endpoint with defaults', () => {
      service.getAllTasks().subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/task'));
      expect(req.request.method).toBe('GET');
      expect(req.request.url).toContain('pageSize=25');
      expect(req.request.url).toContain('currentPageIndex=0');
      req.flush({ entries: [] });
    });

    it('uses provided pageSize and currentPage', () => {
      service.getAllTasks(50, 2).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/task'));
      expect(req.request.url).toContain('pageSize=50');
      expect(req.request.url).toContain('currentPageIndex=2');
      req.flush({ entries: [] });
    });
  });

  describe('listByTab', () => {
    it('returns empty result for NO_ENDPOINT tab without HTTP call', done => {
      service.listByTab({ tab: 'my-tasks' }).subscribe(result => {
        expect(result.entries).toEqual([]);
        expect(result.resultsCount).toBe(0);
        done();
      });
      httpMock.expectNone(r => r.url.includes('/search/'));
    });

    it('GETs arende_search for all-docs tab', () => {
      service.listByTab({ tab: 'all-docs' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('arende_search') || r.url.includes('dms_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [], totalSize: 0 });
    });

    it('GETs arende_search for my-cases tab', () => {
      service.listByTab({ tab: 'my-cases', username: 'user1' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/search/pp/'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [], totalSize: 0 });
    });

    it('GETs dms_search for my-utkasts tab', () => {
      service.listByTab({ tab: 'my-utkasts' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('dms_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [], totalSize: 0 });
    });

    it('GETs mailmessage_search for e-post tab', () => {
      service.listByTab({ tab: 'e-post' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('mailmessage_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [], totalSize: 0 });
    });
  });

  describe('getCountByTab', () => {
    it('returns 0 for NO_ENDPOINT tab without HTTP call', done => {
      service.getCountByTab({ tab: 'folder' }).subscribe(count => {
        expect(count).toBe(0);
        done();
      });
      httpMock.expectNone(r => r.url.includes('/search/'));
    });

    it('GETs and maps totalSize for valid tab', done => {
      service.getCountByTab({ tab: 'all-docs' }).subscribe(count => {
        expect(count).toBe(42);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/search/pp/'));
      req.flush({ entries: [], totalSize: 42 });
    });

    it('returns 0 when totalSize is undefined', done => {
      service.getCountByTab({ tab: 'all-docs' }).subscribe(count => {
        expect(count).toBe(0);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/search/pp/'));
      req.flush({ entries: [] });
    });
  });

  describe('getHandlingWithFile', () => {
    it('POSTs to Document.GetChildren', () => {
      service.getHandlingWithFile('parent-1').subscribe();
      const req = httpMock.expectOne(r => r.url.includes('Document.GetChildren'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body.input).toBe('doc:parent-1');
      req.flush({ entries: [] });
    });
  });

  describe('listViaPageProvider', () => {
    it('GETs default_search provider', () => {
      service.listViaPageProvider({}).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('default_search'));
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });

    it('adds search term when provided', () => {
      service.listViaPageProvider({ search: 'test' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('default_search'));
      expect(req.request.params.get('ecm_fulltext')).toBe('test*');
      req.flush({ entries: [] });
    });

    it('adds pathStartsWith when provided', () => {
      service.listViaPageProvider({ pathStartsWith: '/some/path' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('default_search'));
      expect(req.request.params.get('ecm_path')).toBe('/some/path');
      req.flush({ entries: [] });
    });
  });

  describe('getCreatedAggBucketsByTab', () => {
    it('returns empty array for NO_ENDPOINT tab', done => {
      service.getCreatedAggBucketsByTab({ tab: 'my-monitoring' }).subscribe(buckets => {
        expect(buckets).toEqual([]);
        done();
      });
      httpMock.expectNone(r => r.url.includes('/search/'));
    });

    it('returns empty array when no aggregations in response', done => {
      service.getCreatedAggBucketsByTab({ tab: 'all-docs' }).subscribe(buckets => {
        expect(buckets).toEqual([]);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/search/pp/'));
      req.flush({ entries: [] });
    });

    it('returns buckets from aggregations', done => {
      service.getCreatedAggBucketsByTab({ tab: 'all-docs' }).subscribe(buckets => {
        expect(buckets.length).toBe(2);
        done();
      });
      const req = httpMock.expectOne(r => r.url.includes('/search/pp/'));
      req.flush({
        entries: [],
        aggregations: {
          dublincore_created_agg: {
            buckets: [
              { key: '2024', docCount: 5 },
              { key: '2023', docCount: 3 },
            ],
          },
        },
      });
    });
  });
});
