import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DocumentVersionService } from './document-version.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, NuxeoDocuments } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

function makeDoc(overrides: Partial<NuxeoDocument> = {}): NuxeoDocument {
  return {
    uid: 'doc-1',
    title: 'Test Doc',
    type: 'File',
    properties: {},
    ...overrides,
  } as NuxeoDocument;
}

function makeDocuments(entries: NuxeoDocument[]): NuxeoDocuments {
  return {
    'entity-type': 'documents',
    entries,
    currentPageIndex: 0,
    pageSize: entries.length,
    maxResults: entries.length,
    totalSize: entries.length,
  };
}

describe('DocumentVersionService', () => {
  let service: DocumentVersionService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getSourceDocumentFromProxy',
      'getDocumentVersions',
      'getDocumentById',
      'restoreDocumentVersion',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        DocumentVersionService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(DocumentVersionService);
  });

  describe('getSourceDocumentId', () => {
    it('returns empty string when doc has no uid', done => {
      service.getSourceDocumentId(makeDoc({ uid: undefined })).subscribe(id => {
        expect(id).toBe('');
        done();
      });
    });

    it('returns doc uid directly when not a proxy', done => {
      const doc = makeDoc({ uid: 'doc-1', isProxy: false });
      service.getSourceDocumentId(doc).subscribe(id => {
        expect(id).toBe('doc-1');
        done();
      });
    });

    it('fetches source from proxy when isProxy is true', done => {
      const proxyDoc = makeDoc({ uid: 'proxy-1', isProxy: true });
      apiSpy.getSourceDocumentFromProxy.and.returnValue(of({ uid: 'source-1' } as NuxeoDocument));

      service.getSourceDocumentId(proxyDoc).subscribe(id => {
        expect(id).toBe('source-1');
        expect(apiSpy.getSourceDocumentFromProxy).toHaveBeenCalledWith('proxy-1');
        done();
      });
    });
  });

  describe('getDocumentVersions', () => {
    it('returns empty array when doc has no uid', done => {
      service.getDocumentVersions(makeDoc({ uid: undefined })).subscribe(versions => {
        expect(versions).toEqual([]);
        done();
      });
    });

    it('returns empty array when source id is empty', done => {
      const doc = makeDoc({ uid: 'proxy-1', isProxy: true });
      apiSpy.getSourceDocumentFromProxy.and.returnValue(of({ uid: '' } as NuxeoDocument));

      service.getDocumentVersions(doc).subscribe(versions => {
        expect(versions).toEqual([]);
        done();
      });
    });

    it('filters out source document from version list', done => {
      const doc = makeDoc({ uid: 'src-1', isProxy: false });
      apiSpy.getDocumentVersions.and.returnValue(
        of(makeDocuments([makeDoc({ uid: 'src-1' }), makeDoc({ uid: 'v1' })]))
      );

      service.getDocumentVersions(doc).subscribe(versions => {
        expect(versions.map(v => v.uid)).not.toContain('src-1');
        expect(versions.map(v => v.uid)).toContain('v1');
        done();
      });
    });

    it('sorts versions by major descending, then minor descending', done => {
      const doc = makeDoc({ uid: 'src-1', isProxy: false });
      const entries = [
        {
          uid: 'v1.0',
          properties: { [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 1, [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0 },
        },
        {
          uid: 'v2.1',
          properties: { [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 2, [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 1 },
        },
        {
          uid: 'v2.0',
          properties: { [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 2, [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0 },
        },
      ] as NuxeoDocument[];

      apiSpy.getDocumentVersions.and.returnValue(of(makeDocuments(entries)));

      service.getDocumentVersions(doc).subscribe(versions => {
        expect(versions[0].uid).toBe('v2.1');
        expect(versions[1].uid).toBe('v2.0');
        expect(versions[2].uid).toBe('v1.0');
        done();
      });
    });

    it('filters out version with same major/minor as current doc', done => {
      const doc = makeDoc({
        uid: 'src-1',
        isProxy: false,
        properties: {
          [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 2,
          [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 1,
        },
      });
      const entries = [
        {
          uid: 'v2.1',
          properties: { [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 2, [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 1 },
        },
        {
          uid: 'v1.0',
          properties: { [NUXEO_SCHEMA_FIELDS.uid.majorVersion]: 1, [NUXEO_SCHEMA_FIELDS.uid.minorVersion]: 0 },
        },
      ] as NuxeoDocument[];

      apiSpy.getDocumentVersions.and.returnValue(of(makeDocuments(entries)));

      service.getDocumentVersions(doc).subscribe(versions => {
        expect(versions.map(v => v.uid)).not.toContain('v2.1');
        expect(versions.map(v => v.uid)).toContain('v1.0');
        done();
      });
    });
  });

  describe('getVersionDocument', () => {
    it('delegates to nuxeoApi.getDocumentById', done => {
      const mockDoc = makeDoc({ uid: 'version-uid' });
      apiSpy.getDocumentById.and.returnValue(of(mockDoc));

      service.getVersionDocument('version-uid').subscribe(doc => {
        expect(doc).toBe(mockDoc);
        expect(apiSpy.getDocumentById).toHaveBeenCalledWith('version-uid', true);
        done();
      });
    });
  });

  describe('restoreVersion', () => {
    it('delegates to nuxeoApi.restoreDocumentVersion', done => {
      const mockDoc = makeDoc({ uid: 'restored' });
      apiSpy.restoreDocumentVersion.and.returnValue(of(mockDoc));

      service.restoreVersion('version-id').subscribe(doc => {
        expect(doc).toBe(mockDoc);
        expect(apiSpy.restoreDocumentVersion).toHaveBeenCalledWith('version-id', false);
        done();
      });
    });

    it('passes checkout flag', done => {
      apiSpy.restoreDocumentVersion.and.returnValue(of(makeDoc()));
      service.restoreVersion('vid', true).subscribe(() => {
        expect(apiSpy.restoreDocumentVersion).toHaveBeenCalledWith('vid', true);
        done();
      });
    });
  });
});
