import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CaseEditOptionsService } from './case-edit-options.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  makeDirection,
  makeUserSuggestion,
  makeSearchResult,
  makeNuxeoDocument,
} from '@app/shared/testing/mock-factories';

describe('CaseEditOptionsService', () => {
  let service: CaseEditOptionsService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'getUserSuggestions',
      'DMSDocumentSuggestion',
      'getLagrumOptions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        CaseEditOptionsService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(CaseEditOptionsService);
  });

  describe('getDirectorySuggestions', () => {
    it('maps API result to options', done => {
      apiSpy.getDirectorySuggestions.and.returnValue(
        of([makeDirection({ displayLabel: 'Option A', id: 'a' }), makeDirection({ displayLabel: 'Option B', id: 'b' })])
      );

      service.getDirectorySuggestions('myDir').subscribe(options => {
        expect(options).toEqual([
          { label: 'Option A', id: 'a' },
          { label: 'Option B', id: 'b' },
        ]);
        done();
      });
    });
  });

  describe('getUserSuggestions', () => {
    it('maps user suggestion results to options', done => {
      apiSpy.getUserSuggestions.and.returnValue(of([makeUserSuggestion({ displayLabel: 'User One', id: 'user1' })]));

      service.getUserSuggestions().subscribe(options => {
        expect(options).toEqual([{ label: 'User One', id: 'user1' }]);
        done();
      });
    });
  });

  describe('getDocumentSuggestions', () => {
    it('maps document suggestion entries to options', done => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeNuxeoDocument({ title: 'Doc A', uid: 'uid-a' }),
              makeNuxeoDocument({ title: 'Doc B', uid: 'uid-b' }),
            ],
          })
        )
      );

      service.getDocumentSuggestions('parent-ref', 'Arende').subscribe(options => {
        expect(options).toEqual([
          { label: 'Doc A', id: 'uid-a' },
          { label: 'Doc B', id: 'uid-b' },
        ]);
        done();
      });
    });

    it('returns empty array when response has no entries', done => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: undefined })));

      service.getDocumentSuggestions('ref', 'Type').subscribe(options => {
        expect(options).toEqual([]);
        done();
      });
    });
  });

  describe('getLagrumSuggestions', () => {
    it('delegates to nuxeoApi.getLagrumOptions', done => {
      apiSpy.getLagrumOptions.and.returnValue(of([{ label: 'Lagrum A', id: 'la' }]));

      service.getLagrumSuggestions().subscribe(options => {
        expect(apiSpy.getLagrumOptions).toHaveBeenCalled();
        expect(options[0].label).toBe('Lagrum A');
        done();
      });
    });
  });

  describe('getBevarasSuggestions', () => {
    it('flattens entries with children', done => {
      apiSpy.getDirectorySuggestions.and.returnValue(
        of([
          makeDirection({
            label: 'Parent',
            id: 'parent',
            children: [
              { absoluteLabel: 'Child A', computedId: 'c-a' },
              { absoluteLabel: 'Child B', computedId: 'c-b' },
            ],
          }),
        ])
      );

      service.getBevarasSuggestions().subscribe(options => {
        expect(options).toEqual([
          { label: 'Child A', id: 'c-a' },
          { label: 'Child B', id: 'c-b' },
        ]);
        done();
      });
    });

    it('returns top-level entry when no children', done => {
      apiSpy.getDirectorySuggestions.and.returnValue(
        of([makeDirection({ label: 'Bevaras', id: 'bev', children: [] })])
      );

      service.getBevarasSuggestions().subscribe(options => {
        expect(options).toEqual([{ label: 'Bevaras', id: 'bev' }]);
        done();
      });
    });
  });
});
