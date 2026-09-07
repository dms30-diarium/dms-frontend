import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationService } from './notification-service.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from './general-store.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

function makeDoc(uid: string, subscribers: string[] = []): NuxeoDocument {
  return {
    uid,
    title: 'Doc',
    type: 'File',
    properties: {
      'notif:notifications': subscribers.length ? [{ name: 'notify', subscribers }] : [],
    },
  } as unknown as NuxeoDocument;
}

describe('NotificationService', () => {
  let service: NotificationService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeSpy: jasmine.SpyObj<GeneralStore>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'executeNuxeoOperation', 'getDocumentById']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    storeSpy = jasmine.createSpyObj('GeneralStore', ['notification'], {
      notification: { set: jasmine.createSpy('set') },
    });

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    });

    service = TestBed.inject(NotificationService);
  });

  describe('isUserSubscribed', () => {
    it('returns false for null document', () => {
      expect(service.isUserSubscribed(null, 'user1')).toBeFalse();
    });

    it('returns false for null username', () => {
      expect(service.isUserSubscribed(makeDoc('d1'), null)).toBeFalse();
    });

    it('returns false when no notifications', () => {
      expect(service.isUserSubscribed(makeDoc('d1'), 'user1')).toBeFalse();
    });

    it('returns true when user is subscribed', () => {
      const doc = makeDoc('d1', ['user:user1', 'user:user2']);
      expect(service.isUserSubscribed(doc, 'user1')).toBeTrue();
    });

    it('is case-insensitive for username matching', () => {
      const doc = makeDoc('d1', ['user:User1']);
      expect(service.isUserSubscribed(doc, 'user1')).toBeTrue();
    });

    it('returns false when user not in subscriber list', () => {
      const doc = makeDoc('d1', ['user:user2']);
      expect(service.isUserSubscribed(doc, 'user1')).toBeFalse();
    });
  });

  describe('subscribe', () => {
    it('calls Document.Subscribe operation and fetches updated doc', done => {
      const updatedDoc = makeDoc('doc-1', ['user:user1']);
      apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));
      apiSpy.getDocumentById.and.returnValue(of(updatedDoc));

      service.subscribe('doc-1').subscribe(doc => {
        expect(apiSpy.executeNuxeoOperation).toHaveBeenCalledWith(
          'Document.Subscribe',
          jasmine.objectContaining({ input: 'doc-1' })
        );
        expect(apiSpy.getDocumentById).toHaveBeenCalledWith('doc-1', true);
        expect(doc).toBe(updatedDoc);
        done();
      });
    });

    it('shows success notification after subscribe', done => {
      apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));
      apiSpy.getDocumentById.and.returnValue(of(makeDoc('doc-1')));

      service.subscribe('doc-1').subscribe(() => {
        expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
        done();
      });
    });
  });

  describe('unsubscribe', () => {
    it('calls Document.Unsubscribe operation and fetches updated doc', done => {
      const updatedDoc = makeDoc('doc-1');
      apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));
      apiSpy.getDocumentById.and.returnValue(of(updatedDoc));

      service.unsubscribe('doc-1').subscribe(doc => {
        expect(apiSpy.executeNuxeoOperation).toHaveBeenCalledWith(
          'Document.Unsubscribe',
          jasmine.objectContaining({ input: 'doc-1' })
        );
        expect(doc).toBe(updatedDoc);
        done();
      });
    });

    it('shows success notification after unsubscribe', done => {
      apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));
      apiSpy.getDocumentById.and.returnValue(of(makeDoc('doc-1')));

      service.unsubscribe('doc-1').subscribe(() => {
        expect(storeSpy.notification.set).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
        done();
      });
    });
  });
});
