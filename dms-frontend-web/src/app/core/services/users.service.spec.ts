import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './users.service';
import { provideRouter } from '@angular/router';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getcoworkers', () => {
    it('POSTs to UserGroup.Suggestion', done => {
      service.getcoworkers('alice').subscribe(users => {
        expect(users.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/nuxeo/api/v1/automation/UserGroup.Suggestion');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.searchTerm).toBe('alice');
      req.flush([
        {
          id: 'alice',
          username: 'alice',
          displayLabel: 'Alice',
          email: '',
          company: '',
          type: 'user',
          prefixed_id: 'user:alice',
        },
      ]);
    });

    it('uses empty search term when not provided', done => {
      service.getcoworkers().subscribe(() => done());
      const req = httpMock.expectOne('/nuxeo/api/v1/automation/UserGroup.Suggestion');
      expect(req.request.body.params.searchTerm).toBe('');
      req.flush([]);
    });
  });

  describe('updateCaseAssignment', () => {
    it('POSTs to Document.UpdateArendeAssignees with correct params', done => {
      service.updateCaseAssignment('case-1', 'org-1', 'worker-1').subscribe(() => done());

      const req = httpMock.expectOne('/nuxeo/api/v1/automation/Document.UpdateArendeAssignees');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.params.ansvarig_organisatorisk_enhet).toBe('org-1');
      expect(req.request.body.params.ansvarig_handlaggare).toBe('worker-1');
      expect(req.request.body.input).toBe('case-1');
      req.flush({ uid: 'case-1' });
    });
  });

  describe('getOrganizationsList', () => {
    it('GETs the Organisation directory', done => {
      service.getOrganizationsList().subscribe(() => done());

      const req = httpMock.expectOne('/api/v1/directory/Organisation');
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [] });
    });
  });
});
