import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { NavigationComponent } from './navigation.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { NavPath } from './navigation.component';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';

const mockPathInfo: NuxeoDocument = makeNuxeoDocument({
  uid: 'root-uid',
  type: 'Root',
  title: 'Root',
  contextParameters: { hasFolderishChild: true },
});

const mockEntries: SearchResult = makeSearchResult({
  entries: [
    makeNuxeoDocument({
      uid: 'child-1',
      title: 'Child 1',
      type: 'Folder',
      contextParameters: { hasFolderishChild: false },
    }),
    makeNuxeoDocument({
      uid: 'child-2',
      title: 'Child 2',
      type: 'Workspace',
      contextParameters: { hasFolderishChild: true },
    }),
  ],
});

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getPathInfo',
      'getEntriesForParentPath',
      'getAncestorsById',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getPathInfo.and.returnValue(of(mockPathInfo));
    apiSpy.getEntriesForParentPath.and.returnValue(of(mockEntries));
    apiSpy.getAncestorsById.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [NavigationComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(NavigationComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getPathInfo with root path', () => {
      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/');
    });

    it('sets rootNode from getPathInfo result', () => {
      expect(component.rootNode()?.uid).toBe('root-uid');
    });

    it('rootNode type set from path type', () => {
      expect(component.rootNode()?.title).toBe('Root');
    });

    it('calls getEntriesForParentPath with root uid', () => {
      expect(apiSpy.getEntriesForParentPath).toHaveBeenCalledWith('root-uid');
    });

    it('sets rootNode children from entries', () => {
      expect(component.rootNode()?.children.length).toBe(2);
    });

    it('children have correct uid and title', () => {
      const children = component.rootNode()!.children;
      expect(children[0].uid).toBe('child-1');
      expect(children[1].title).toBe('Child 2');
    });

    it('ancestors defaults to empty', () => {
      expect(component.ancestors()).toEqual([]);
    });
  });

  describe('showChildren', () => {
    it('calls getEntriesForParentPath for given path', () => {
      apiSpy.getEntriesForParentPath.calls.reset();
      const navPath = { uid: 'some-uid', title: 'T', hasChildren: true, children: [] };
      component.showChildren(navPath).subscribe();
      expect(apiSpy.getEntriesForParentPath).toHaveBeenCalledWith('some-uid');
    });

    it('updates currentPath children', () => {
      apiSpy.getEntriesForParentPath.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeNuxeoDocument({
                uid: 'ch-a',
                title: 'Ch A',
                type: 'Folder',
                contextParameters: { hasFolderishChild: false },
              }),
            ],
          })
        )
      );
      const navPath: NavPath = { uid: 'p', title: 'P', hasChildren: true, children: [] };
      component.showChildren(navPath).subscribe();
      expect(navPath.children.length).toBe(1);
      expect(navPath.children[0].uid).toBe('ch-a');
    });
  });

  describe('handleLoadChildren', () => {
    it('calls getEntriesForParentPath for the given path', () => {
      apiSpy.getEntriesForParentPath.calls.reset();
      const navPath = { uid: 'load-uid', title: 'L', hasChildren: true, children: [] };
      component.handleLoadChildren(navPath);
      expect(apiSpy.getEntriesForParentPath).toHaveBeenCalledWith('load-uid');
    });
  });
});
