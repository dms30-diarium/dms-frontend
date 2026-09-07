import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { CommentsService, NuxeoComment } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    service = TestBed.inject(CommentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('addComment', () => {
    it('POSTs to correct url with parentId defaulting to documentId', () => {
      service.addComment('doc-1', 'hello').subscribe();
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@comment');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.parentId).toBe('doc-1');
      expect(req.request.body.text).toBe('hello');
      req.flush({ 'entity-type': 'comment', text: 'hello' });
    });

    it('uses explicit parentId when provided', () => {
      service.addComment('doc-1', 'reply', 'comment-5').subscribe();
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@comment');
      expect(req.request.body.parentId).toBe('comment-5');
      req.flush({ 'entity-type': 'comment', text: 'reply' });
    });
  });

  describe('getComments', () => {
    it('GETs comments with no params by default', () => {
      service.getComments('doc-1').subscribe();
      const req = httpMock.expectOne(r => r.url === '/nuxeo/api/v1/id/doc-1/@comment');
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [], 'entity-type': 'comments' });
    });

    it('includes pageSize and currentPageIndex params when provided', () => {
      service.getComments('doc-1', { pageSize: 10, currentPageIndex: 2 }).subscribe();
      const req = httpMock.expectOne(r => r.url === '/nuxeo/api/v1/id/doc-1/@comment');
      expect(req.request.params.get('pageSize')).toBe('10');
      expect(req.request.params.get('currentPageIndex')).toBe('2');
      req.flush({ entries: [], 'entity-type': 'comments' });
    });

    it('maps response with default entries when missing', done => {
      service.getComments('doc-1').subscribe(result => {
        expect(result.entries).toEqual([]);
        expect(result['entity-type']).toBe('comments');
        done();
      });
      const req = httpMock.expectOne(r => r.url === '/nuxeo/api/v1/id/doc-1/@comment');
      req.flush({});
    });

    it('passes through totalSize', done => {
      service.getComments('doc-1').subscribe(result => {
        expect(result.totalSize).toBe(42);
        done();
      });
      const req = httpMock.expectOne(r => r.url === '/nuxeo/api/v1/id/doc-1/@comment');
      req.flush({ entries: [], totalSize: 42 });
    });
  });

  describe('updateComment', () => {
    it('PUTs to correct url with payload', () => {
      service.updateComment('comment-1', 'doc-1', 'updated text').subscribe();
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@comment/comment-1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.text).toBe('updated text');
      expect(req.request.body.parentId).toBe('doc-1');
      req.flush({ 'entity-type': 'comment', text: 'updated text' } as NuxeoComment);
    });
  });

  describe('deleteComment', () => {
    it('DELETEs to correct url', () => {
      service.deleteComment('doc-1', 'comment-1').subscribe();
      const req = httpMock.expectOne('/nuxeo/api/v1/id/doc-1/@comment/comment-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
