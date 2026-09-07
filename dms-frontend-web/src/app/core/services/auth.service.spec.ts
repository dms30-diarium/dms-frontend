import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { NxUser } from '@app/shared/api/nuxeo-api.types';

function makeUser(groups: string[] = [], overrides: Partial<NxUser> = {}): NxUser {
  return {
    'entity-type': 'user',
    id: 'testuser',
    isAdministrator: false,
    properties: {
      groups,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
    },
    ...overrides,
  } as unknown as NxUser;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts with user undefined', () => {
    expect(service.user()).toBeUndefined();
  });

  it('starts loaded false', () => {
    expect(service.loaded()).toBeFalse();
  });

  it('isAdmin defaults to false', () => {
    expect(service.isAdmin()).toBeFalse();
  });

  it('username is null before loadMe', () => {
    expect(service.username()).toBeNull();
  });

  describe('roles computed', () => {
    it('returns ADMIN fallback when no groups set', () => {
      expect(service.roles()).toEqual(['ADMIN']);
    });

    it('maps DMS_Registrator to REGISTRATOR after loadMe', async () => {
      const promise = service.loadMe();
      const req = httpMock.expectOne('/nuxeo/api/v1/me');
      req.flush(makeUser(['DMS_Registrator']));
      await promise;
      expect(service.roles()).toContain('REGISTRATOR');
    });

    it('maps multiple groups to multiple roles', async () => {
      const promise = service.loadMe();
      const req = httpMock.expectOne('/nuxeo/api/v1/me');
      req.flush(makeUser(['DMS_Registrator', 'DMS_Admin']));
      await promise;
      expect(service.roles()).toContain('REGISTRATOR');
      expect(service.roles()).toContain('ADMIN');
    });

    it('deduplicates repeated groups', async () => {
      const promise = service.loadMe();
      const req = httpMock.expectOne('/nuxeo/api/v1/me');
      req.flush(makeUser(['DMS_Registrator', 'DMS_Registrator']));
      await promise;
      expect(service.roles().filter(r => r === 'REGISTRATOR').length).toBe(1);
    });
  });

  describe('fullName computed', () => {
    it('returns first + last name after load', async () => {
      const promise = service.loadMe();
      const req = httpMock.expectOne('/nuxeo/api/v1/me');
      req.flush(makeUser([], { properties: { groups: [], firstName: 'Anna', lastName: 'Svensson' } } as never));
      await promise;
      expect(service.fullName()).toBe('Anna Svensson');
    });

    it('falls back to username when name is empty', async () => {
      const promise = service.loadMe();
      const req = httpMock.expectOne('/nuxeo/api/v1/me');
      req.flush(makeUser([], { id: 'jsmith', properties: { groups: [], firstName: '', lastName: '' } } as never));
      await promise;
      expect(service.fullName()).toBe('jsmith');
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the role', async () => {
      const promise = service.loadMe();
      httpMock.expectOne('/nuxeo/api/v1/me').flush(makeUser(['DMS_Admin']));
      await promise;
      expect(service.hasRole('ADMIN')).toBeTrue();
    });

    it('returns false when user lacks the role', async () => {
      const promise = service.loadMe();
      httpMock.expectOne('/nuxeo/api/v1/me').flush(makeUser(['DMS_Registrator']));
      await promise;
      expect(service.hasRole('ADMIN')).toBeFalse();
    });
  });

  describe('setActiveRole', () => {
    it('does not change activeRole when role is not in user roles', async () => {
      const promise = service.loadMe();
      httpMock.expectOne('/nuxeo/api/v1/me').flush(makeUser(['DMS_Registrator']));
      await promise;
      service.setActiveRole('ADMIN');
      expect(service.activeRole()).toBe('REGISTRATOR');
    });

    it('sets activeRole when role is valid', async () => {
      const promise = service.loadMe();
      httpMock.expectOne('/nuxeo/api/v1/me').flush(makeUser(['DMS_Registrator', 'DMS_Admin']));
      await promise;
      service.setActiveRole('ADMIN');
      expect(service.activeRole()).toBe('ADMIN');
    });
  });

  describe('setAdminViewEnabled', () => {
    it('persists to localStorage', () => {
      service.setAdminViewEnabled(false);
      expect(localStorage.getItem('adminViewEnabled')).toBe('false');
    });

    it('updates adminViewEnabled signal', async () => {
      const promise = service.loadMe();
      httpMock.expectOne('/nuxeo/api/v1/me').flush(makeUser(['DMS_Admin'], { isAdministrator: true }));
      await promise;
      service.isAdminSig.set(true);
      service.setAdminViewEnabled(false);
      expect(service.adminViewEnabled()).toBeFalse();
    });
  });

  describe('loadMe error handling', () => {
    it('sets loadError on HTTP failure', async () => {
      const promise = service.loadMe();
      httpMock.expectOne('/nuxeo/api/v1/me').error(new ErrorEvent('Network error'));
      await promise;
      expect(service.loadError()).toBeTruthy();
      expect(service.loaded()).toBeTrue();
    });

    it('does not refetch when already loaded', async () => {
      const p1 = service.loadMe();
      httpMock.expectOne('/nuxeo/api/v1/me').flush(makeUser(['DMS_Registrator']));
      await p1;

      await service.loadMe();
      httpMock.expectNone('/nuxeo/api/v1/me');
    });
  });
});
