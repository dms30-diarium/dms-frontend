import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FavoritesService } from './favorites.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

function makeDoc(uid: string): NuxeoDocument {
  return { uid, title: uid, type: 'File', properties: {} } as NuxeoDocument;
}

function makeDocuments(entries: NuxeoDocument[]): SearchResult {
  return {
    'entity-type': 'documents',
    isPaginable: true,
    resultsCount: entries.length,
    entries,
    pageIndex: 0,
    pageCount: 1,
    pageSize: entries.length,
    totalSize: entries.length,
  };
}

describe('FavoritesService', () => {
  let service: FavoritesService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'fetchFavoritesUid',
      'getCollectionDocuments',
      'addToFavorites',
      'removeFromFavorites',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        FavoritesService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(FavoritesService);
  });

  describe('getFavoritesUid', () => {
    it('fetches from API when no cached uid', done => {
      const favDoc = makeDoc('fav-uid');
      apiSpy.fetchFavoritesUid.and.returnValue(of(favDoc));

      service.getFavoritesUid().subscribe(doc => {
        expect(doc).toBe(favDoc);
        expect(apiSpy.fetchFavoritesUid).toHaveBeenCalled();
        done();
      });
    });

    it('returns cached uid when available', done => {
      const favDoc = makeDoc('fav-uid');
      service.favoritesUid.set(favDoc);

      service.getFavoritesUid().subscribe(doc => {
        expect(doc).toBe(favDoc);
        expect(apiSpy.fetchFavoritesUid).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('checkInFavorites', () => {
    it('returns true when document is in favorites', done => {
      const favDoc = makeDoc('fav-uid');
      apiSpy.fetchFavoritesUid.and.returnValue(of(favDoc));
      apiSpy.getCollectionDocuments.and.returnValue(of(makeDocuments([makeDoc('target-uid')])));

      service.checkInFavorites('target-uid').subscribe(result => {
        expect(result).toBeTrue();
        done();
      });
    });

    it('returns false when document is not in favorites', done => {
      const favDoc = makeDoc('fav-uid');
      apiSpy.fetchFavoritesUid.and.returnValue(of(favDoc));
      apiSpy.getCollectionDocuments.and.returnValue(of(makeDocuments([makeDoc('other-uid')])));

      service.checkInFavorites('target-uid').subscribe(result => {
        expect(result).toBeFalse();
        done();
      });
    });
  });

  describe('toggleFavorites', () => {
    it('calls addToFavorites when not in favorites', done => {
      const doc = makeDoc('doc-1');
      apiSpy.addToFavorites.and.returnValue(of(doc));

      service.toggleFavorites('doc-1', false).subscribe(() => {
        expect(apiSpy.addToFavorites).toHaveBeenCalledWith('doc-1');
        done();
      });
    });

    it('calls removeFromFavorites when already in favorites', done => {
      const doc = makeDoc('doc-1');
      apiSpy.removeFromFavorites.and.returnValue(of(doc));

      service.toggleFavorites('doc-1', true).subscribe(() => {
        expect(apiSpy.removeFromFavorites).toHaveBeenCalledWith('doc-1');
        done();
      });
    });
  });
});
