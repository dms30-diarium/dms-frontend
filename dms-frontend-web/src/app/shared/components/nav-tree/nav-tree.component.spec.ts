import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { NavigationTreeComponent } from './nav-tree.component';
import { NavPath } from '../navigation/navigation.component';

function makeNode(uid: string, title: string, hasChildren = false, children: NavPath[] = []): NavPath {
  return { uid, title, hasChildren, children };
}

describe('NavigationTreeComponent', () => {
  let component: NavigationTreeComponent;
  let fixture: ComponentFixture<NavigationTreeComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationTreeComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(NavigationTreeComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(NavigationTreeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.componentRef.setInput('rootNode', makeNode('root', 'Root', true));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('trackByUid', () => {
    it('returns uid when present', () => {
      expect(component.trackByUid(0, makeNode('u1', 'T'))).toBe('u1');
    });

    it('falls back to title when uid missing', () => {
      const node = { ...makeNode('', 'Title'), uid: undefined } as unknown as NavPath;
      expect(component.trackByUid(0, node)).toBe('Title');
    });

    it('falls back to index when both missing', () => {
      const node = { ...makeNode('', ''), uid: undefined, title: undefined } as unknown as NavPath;
      expect(component.trackByUid(5, node) as unknown).toBe(5);
    });
  });

  describe('getActiveState', () => {
    it('returns true for Root node', () => {
      expect(component.getActiveState(makeNode('r', 'Root'))).toBeTrue();
    });

    it('returns true when node is in ancestors', () => {
      fixture.componentRef.setInput('ancestors', [{ uid: 'a1' }]);
      fixture.detectChanges();
      expect(component.getActiveState(makeNode('a1', 'A'))).toBeTrue();
    });

    it('returns false when node has children but is not ancestor', () => {
      expect(component.getActiveState(makeNode('x', 'X', true))).toBeFalse();
    });

    it('returns undefined when node has no children and is not ancestor', () => {
      expect(component.getActiveState(makeNode('y', 'Y', false))).toBeUndefined();
    });
  });

  describe('manageClick', () => {
    function makeEvent(clientX: number, rectWidth = 200, rectLeft = 0): Parameters<typeof component.manageClick>[0] {
      const button = {
        getBoundingClientRect: () => ({ left: rectLeft, width: rectWidth }),
      };
      return { detail: { target: button, clientX } } as unknown as Parameters<typeof component.manageClick>[0];
    }

    it('emits loadChildren when toggle clicked and children not loaded', () => {
      const emitSpy = jasmine.createSpy('emit');
      component.loadChildren.subscribe(emitSpy);
      const node = makeNode('n1', 'N', true, []);
      component.manageClick(makeEvent(190), node);
      expect(emitSpy).toHaveBeenCalledWith(node);
    });

    it('does not navigate when toggle button clicked', () => {
      spyOn(router, 'navigate');
      const node = makeNode('n1', 'N', true, []);
      component.manageClick(makeEvent(190), node);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('navigates to doc when non-toggle area clicked', () => {
      spyOn(router, 'navigate');
      const node = makeNode('n2', 'N2', false, []);
      component.manageClick(makeEvent(50), node);
      expect(router.navigate).toHaveBeenCalledWith(['/doc', 'n2']);
    });

    it('emits loadChildren on non-toggle click when children not loaded', () => {
      spyOn(router, 'navigate');
      const emitSpy = jasmine.createSpy('emit');
      component.loadChildren.subscribe(emitSpy);
      const node = makeNode('n3', 'N3', true, []);
      component.manageClick(makeEvent(50), node);
      expect(emitSpy).toHaveBeenCalledWith(node);
    });

    it('does not emit loadChildren when children already loaded', () => {
      const emitSpy = jasmine.createSpy('emit');
      component.loadChildren.subscribe(emitSpy);
      const node = makeNode('n4', 'N4', true, [makeNode('c1', 'C1')]);
      component.manageClick(makeEvent(50), node);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
