import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SvgCacheService } from './svg-cache-service';

describe('SvgCacheService', () => {
  let service: SvgCacheService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SvgCacheService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });

    service = TestBed.inject(SvgCacheService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('fetches the svg content as text', () => {
    let result = '';
    service.getSvg('/assets/icon.svg').subscribe(svg => (result = svg));

    const req = httpMock.expectOne('/assets/icon.svg');
    expect(req.request.responseType).toBe('text');
    req.flush('<svg></svg>');

    expect(result).toBe('<svg></svg>');
  });

  it('caches the request and only performs a single http call for repeated sources', () => {
    let firstResult = '';
    let secondResult = '';
    service.getSvg('/assets/icon.svg').subscribe(svg => (firstResult = svg));
    service.getSvg('/assets/icon.svg').subscribe(svg => (secondResult = svg));

    httpMock.expectOne('/assets/icon.svg').flush('<svg></svg>');

    expect(firstResult).toBe('<svg></svg>');
    expect(secondResult).toBe('<svg></svg>');
  });

  it('removes the entry from the cache and re-fetches after a failure', () => {
    let errored = false;
    service.getSvg('/assets/missing.svg').subscribe({ error: () => (errored = true) });

    httpMock.expectOne('/assets/missing.svg').flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();

    service.getSvg('/assets/missing.svg').subscribe();
    httpMock.expectOne('/assets/missing.svg').flush('<svg></svg>');
  });
});
