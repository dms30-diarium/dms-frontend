import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, Route } from '@angular/router';
import { computed } from '@angular/core';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

function runGuard(route: Partial<Route>, authOverrides: { isAdmin?: boolean; roles?: string[] }): boolean | UrlTree {
  const isAdmin = authOverrides.isAdmin ?? false;
  const roles = authOverrides.roles ?? [];

  const authSpy = {
    roles: computed(() => roles),
    isAdmin: computed(() => isAdmin),
  };

  const routerSpy = jasmine.createSpyObj('Router', ['parseUrl']);
  routerSpy.parseUrl.and.callFake((url: string) => ({ toString: () => url }) as unknown as UrlTree);

  TestBed.overrideProvider(AuthService, { useValue: authSpy });
  TestBed.overrideProvider(Router, { useValue: routerSpy });

  return TestBed.runInInjectionContext(() => roleGuard(route as Route, [])) as boolean | UrlTree;
}

describe('roleGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('allows access when no roles required', () => {
    const result = runGuard({ data: { roles: [] } }, { roles: [] });
    expect(result).toBeTrue();
  });

  it('allows access for admin regardless of required roles', () => {
    const result = runGuard({ data: { roles: ['REGISTRATOR'] } }, { isAdmin: true, roles: [] });
    expect(result).toBeTrue();
  });

  it('allows access when user has required role', () => {
    const result = runGuard({ data: { roles: ['REGISTRATOR'] } }, { roles: ['REGISTRATOR'] });
    expect(result).toBeTrue();
  });

  it('redirects to /forbidden when user lacks required role', () => {
    const result = runGuard({ data: { roles: ['ADMIN'] } }, { roles: ['REGISTRATOR'] });
    expect(result).not.toBeTrue();
  });

  it('allows access when route data is undefined', () => {
    const result = runGuard({}, { roles: [] });
    expect(result).toBeTrue();
  });
});
