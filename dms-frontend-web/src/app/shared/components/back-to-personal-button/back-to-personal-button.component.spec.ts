import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';

import { BackToPersonalButtonComponent } from './back-to-personal-button.component';

describe('BackToPersonalButtonComponent', () => {
  let component: BackToPersonalButtonComponent;
  let fixture: ComponentFixture<BackToPersonalButtonComponent>;
  let router: Router;
  let routeSnapshot: { queryParamMap: ReturnType<typeof convertToParamMap> };

  function setup(queryParams: Record<string, string> = {}) {
    routeSnapshot.queryParamMap = convertToParamMap(queryParams);
    fixture = TestBed.createComponent(BackToPersonalButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    routeSnapshot = { queryParamMap: convertToParamMap({}) };

    await TestBed.configureTestingModule({
      imports: [BackToPersonalButtonComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: routeSnapshot } },
      ],
    })
      .overrideTemplate(BackToPersonalButtonComponent, '<div></div>')
      .compileComponents();

    router = TestBed.inject(Router);
    setup();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isPersonalContext', () => {
    it('false when no path provided', () => {
      expect(component.isPersonalContext()).toBeFalse();
    });

    it('true when path input starts with personal workspace path', () => {
      fixture.componentRef.setInput('path', '/default-domain/UserWorkspaces/alice/folder');
      fixture.detectChanges();
      expect(component.isPersonalContext()).toBeTrue();
    });

    it('true when fallback query param path is personal', () => {
      setup({ path: '/default-domain/UserWorkspaces/bob/x' });
      expect(component.isPersonalContext()).toBeTrue();
    });

    it('false for unrelated path', () => {
      fixture.componentRef.setInput('path', '/some/other/path');
      fixture.detectChanges();
      expect(component.isPersonalContext()).toBeFalse();
    });
  });

  describe('navigationParentId', () => {
    it('returns empty string when no parentId', () => {
      expect(component.navigationParentId()).toBe('');
    });

    it('returns parentId when provided', () => {
      fixture.componentRef.setInput('parentId', 'parent-123');
      fixture.detectChanges();
      expect(component.navigationParentId()).toBe('parent-123');
    });
  });

  describe('resolvedPath', () => {
    it('returns parent path of personal path', () => {
      fixture.componentRef.setInput('path', '/default-domain/UserWorkspaces/alice/folder1/folder2');
      fixture.detectChanges();
      expect(component.resolvedPath()).toBe('/default-domain/UserWorkspaces/alice/folder1');
    });

    it('returns empty string for non-personal path', () => {
      fixture.componentRef.setInput('path', '/some/path');
      fixture.detectChanges();
      expect(component.resolvedPath()).toBe('');
    });
  });

  describe('onBackClick', () => {
    it('navigates to /personal when in personal context', () => {
      spyOn(router, 'navigate');
      fixture.componentRef.setInput('path', '/default-domain/UserWorkspaces/alice/folder1/folder2');
      fixture.detectChanges();
      component.onBackClick();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/personal'],
        jasmine.objectContaining({
          queryParams: { path: '/default-domain/UserWorkspaces/alice/folder1' },
        })
      );
    });

    it('navigates to /doc/parentId when not personal and parentId set', () => {
      spyOn(router, 'navigate');
      fixture.componentRef.setInput('parentId', 'p-1');
      fixture.detectChanges();
      component.onBackClick();
      expect(router.navigate).toHaveBeenCalledWith(['/doc', 'p-1']);
    });

    it('navigates to root when neither personal nor parentId', () => {
      spyOn(router, 'navigate');
      component.onBackClick();
      expect(router.navigate).toHaveBeenCalledWith(['']);
    });
  });
});
