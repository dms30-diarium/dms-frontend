import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BulkDocumentActionsService } from './bulk-document-actions.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

function makeDoc(uid: string, lockOwner?: string): NuxeoDocument {
  return { uid, title: uid, type: 'File', lockOwner, properties: {} } as NuxeoDocument;
}

describe('BulkDocumentActionsService', () => {
  let service: BulkDocumentActionsService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'lockDocument',
      'unlockDocument',
      'addToFavorites',
      'removeFromFavorites',
      'executeNuxeoOperation',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        BulkDocumentActionsService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(BulkDocumentActionsService);
  });

  describe('toggleLock', () => {
    it('unlocks all docs when all are locked', done => {
      const docs = [makeDoc('d1', 'user1'), makeDoc('d2', 'user2')];
      apiSpy.unlockDocument.and.returnValue(of(makeDoc('d1')));

      service.toggleLock(['d1', 'd2'], docs).subscribe(results => {
        expect(apiSpy.unlockDocument).toHaveBeenCalledTimes(2);
        expect(apiSpy.lockDocument).not.toHaveBeenCalled();
        expect(results.length).toBe(2);
        done();
      });
    });

    it('locks only unlocked docs when mixed', done => {
      const docs = [makeDoc('d1', 'user1'), makeDoc('d2')];
      apiSpy.lockDocument.and.returnValue(of(makeDoc('d2')));

      service.toggleLock(['d1', 'd2'], docs).subscribe(results => {
        expect(apiSpy.lockDocument).toHaveBeenCalledWith('d2');
        expect(apiSpy.unlockDocument).not.toHaveBeenCalled();
        expect(results.length).toBe(1);
        done();
      });
    });

    it('locks all when none are locked', done => {
      const docs = [makeDoc('d1'), makeDoc('d2')];
      apiSpy.lockDocument.and.returnValue(of(makeDoc('d1')));

      service.toggleLock(['d1', 'd2'], docs).subscribe(() => {
        expect(apiSpy.lockDocument).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('operates only on selected ids', done => {
      const docs = [makeDoc('d1'), makeDoc('d2'), makeDoc('d3')];
      apiSpy.lockDocument.and.returnValue(of(makeDoc('d1')));

      service.toggleLock(['d1'], docs).subscribe(() => {
        expect(apiSpy.lockDocument).toHaveBeenCalledWith('d1');
        expect(apiSpy.lockDocument).not.toHaveBeenCalledWith('d2');
        done();
      });
    });
  });

  describe('toggleFavorites', () => {
    it('removes from favorites when all are favorited', done => {
      const ids = ['d1', 'd2'];
      const favorites = ['d1', 'd2', 'd3'];
      apiSpy.removeFromFavorites.and.returnValue(of({} as NuxeoDocument));

      service.toggleFavorites(ids, favorites).subscribe(result => {
        expect(apiSpy.removeFromFavorites).toHaveBeenCalledTimes(2);
        expect(result).not.toContain('d1');
        expect(result).not.toContain('d2');
        expect(result).toContain('d3');
        done();
      });
    });

    it('adds to favorites when none are favorited', done => {
      const ids = ['d1', 'd2'];
      const favorites: string[] = [];
      apiSpy.addToFavorites.and.returnValue(of({} as NuxeoDocument));

      service.toggleFavorites(ids, favorites).subscribe(result => {
        expect(apiSpy.addToFavorites).toHaveBeenCalledTimes(2);
        expect(result).toContain('d1');
        expect(result).toContain('d2');
        done();
      });
    });

    it('adds only non-favorited docs when mixed', done => {
      const ids = ['d1', 'd2'];
      const favorites = ['d1'];
      apiSpy.addToFavorites.and.returnValue(of({} as NuxeoDocument));

      service.toggleFavorites(ids, favorites).subscribe(result => {
        expect(apiSpy.addToFavorites).toHaveBeenCalledWith('d2');
        expect(apiSpy.addToFavorites).not.toHaveBeenCalledWith('d1');
        expect(result).toContain('d1');
        expect(result).toContain('d2');
        done();
      });
    });
  });

  describe('toggleSubscriptions', () => {
    it('unsubscribes all when all subscribed', done => {
      const ids = ['d1', 'd2'];
      const subscribed = ['d1', 'd2'];
      apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));

      service.toggleSubscriptions(ids, subscribed).subscribe(result => {
        expect(apiSpy.executeNuxeoOperation).toHaveBeenCalledWith('Document.Unsubscribe', jasmine.anything());
        expect(result).toEqual([]);
        done();
      });
    });

    it('subscribes all when none subscribed', done => {
      const ids = ['d1', 'd2'];
      const subscribed: string[] = [];
      apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));

      service.toggleSubscriptions(ids, subscribed).subscribe(result => {
        expect(apiSpy.executeNuxeoOperation).toHaveBeenCalledWith('Document.Subscribe', jasmine.anything());
        expect(result).toContain('d1');
        expect(result).toContain('d2');
        done();
      });
    });

    it('subscribes only unsubscribed when mixed', done => {
      const ids = ['d1', 'd2'];
      const subscribed = ['d1'];
      apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));

      service.toggleSubscriptions(ids, subscribed).subscribe(result => {
        expect(apiSpy.executeNuxeoOperation).toHaveBeenCalledWith(
          'Document.Subscribe',
          jasmine.objectContaining({ input: 'd2' })
        );
        expect(result).toContain('d1');
        expect(result).toContain('d2');
        done();
      });
    });
  });
});
