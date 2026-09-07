import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { computed } from '@angular/core';
import { homeRedirectGuard } from './home-redirect.guard';
import { AuthService } from '../services/auth.service';
import { AppRole } from '@app/shared/models/roles';

function runGuard(activeRole: AppRole | null): UrlTree {
  const authSpy = {
    activeRole: computed(() => activeRole),
  };

  const routerSpy = jasmine.createSpyObj('Router', ['parseUrl']);
  routerSpy.parseUrl.and.callFake((url: string) => ({ toString: () => url }) as unknown as UrlTree);

  TestBed.overrideProvider(AuthService, { useValue: authSpy });
  TestBed.overrideProvider(Router, { useValue: routerSpy });

  return TestBed.runInInjectionContext(() => homeRedirectGuard({} as never, [])) as unknown as UrlTree;
}

describe('homeRedirectGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('redirects to /forbidden when no role', () => {
    const result = runGuard(null);
    expect(result.toString()).toBe('/forbidden');
  });

  it('redirects REGISTRATOR to /registrar', () => {
    const result = runGuard('REGISTRATOR');
    expect(result.toString()).toBe('/registrar');
  });

  it('redirects CHEF to /chef', () => {
    const result = runGuard('CHEF');
    expect(result.toString()).toBe('/chef');
  });

  it('redirects HANDLAGGARE to /handler', () => {
    const result = runGuard('HANDLAGGARE');
    expect(result.toString()).toBe('/handler');
  });

  it('redirects ADMIN to /admin', () => {
    const result = runGuard('ADMIN');
    expect(result.toString()).toBe('/admin');
  });
});
