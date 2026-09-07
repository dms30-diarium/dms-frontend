import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { HistoryGuard } from './history-guard.guard';
import { HistoryService } from '@services/history-service.service';

describe('HistoryGuard', () => {
  let guard: HistoryGuard;
  let historySpy: jasmine.SpyObj<HistoryService>;

  beforeEach(() => {
    historySpy = jasmine.createSpyObj('HistoryService', ['addPage']);

    TestBed.configureTestingModule({
      providers: [
        HistoryGuard,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HistoryService, useValue: historySpy },
      ],
    });

    guard = TestBed.inject(HistoryGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('records the visited url and allows navigation', () => {
      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/cases/123' } as RouterStateSnapshot;

      const result = guard.canActivate(route, state);

      expect(historySpy.addPage).toHaveBeenCalledWith('/cases/123');
      expect(result).toBeTrue();
    });
  });
});
