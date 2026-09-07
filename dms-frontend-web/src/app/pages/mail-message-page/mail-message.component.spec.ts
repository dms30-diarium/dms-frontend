import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { MailMessageComponent } from './mail-message.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuthService } from '@app/core/services/auth.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { LockService } from '@app/core/services/lock-service.service';
import { NotificationService } from '@app/core/services/notification-service.service';
import { ShareLinkService } from '@app/core/services/share-link.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

describe('MailMessageComponent', () => {
  let component: MailMessageComponent;
  let fixture: ComponentFixture<MailMessageComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let favoritesSpy: jasmine.SpyObj<FavoritesService>;
  let lockSpy: jasmine.SpyObj<LockService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let shareLinkSpy: jasmine.SpyObj<ShareLinkService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  function makeDoc(overrides: Record<string, unknown> = {}) {
    return makeNuxeoDocument({
      uid: 'mail-1',
      type: 'MailMessage',
      properties: { ...overrides } as never,
    });
  }

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'createHandlingFromUtkast',
      'deleteDocument',
      'deleteAttachment',
      'getCollections',
      'getCollectionDocuments',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.createHandlingFromUtkast.and.returnValue(of(makeNuxeoDocument({ uid: 'handling-1' })));
    apiSpy.deleteDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.deleteAttachment.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getCollections.and.returnValue(of([]));
    apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [] })));

    favoritesSpy = jasmine.createSpyObj('FavoritesService', ['checkInFavorites', 'toggleFavorites']);
    favoritesSpy.checkInFavorites.and.returnValue(of(false));
    favoritesSpy.toggleFavorites.and.returnValue(of(makeNuxeoDocument()));

    lockSpy = jasmine.createSpyObj('LockService', ['initLockState', 'toggleAndUpdate']);
    lockSpy.toggleAndUpdate.and.returnValue(of(makeNuxeoDocument()));

    notificationSpy = jasmine.createSpyObj('NotificationService', ['subscribe', 'unsubscribe']);
    notificationSpy.subscribe.and.returnValue(of(makeNuxeoDocument()));
    notificationSpy.unsubscribe.and.returnValue(of(makeNuxeoDocument()));

    shareLinkSpy = jasmine.createSpyObj('ShareLinkService', ['buildDocLink', 'copyDocumentLink']);
    shareLinkSpy.buildDocLink.and.returnValue('https://example.com/doc/mail-1');

    authSpy = jasmine.createSpyObj('AuthService', ['username', 'activeRole']);
    authSpy.username.and.returnValue('testuser');
    authSpy.activeRole.and.returnValue('HANDLAGGARE');

    await TestBed.configureTestingModule({
      imports: [MailMessageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: FavoritesService, useValue: favoritesSpy },
        { provide: LockService, useValue: lockSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ShareLinkService, useValue: shareLinkSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    })
      .overrideTemplate(MailMessageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(MailMessageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('document', makeDoc());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('initializes lock state, favorites, and base buttons', () => {
      expect(lockSpy.initLockState).toHaveBeenCalled();
      expect(favoritesSpy.checkInFavorites).toHaveBeenCalledWith('mail-1');
      expect(component.baseButtons().length).toBeGreaterThan(0);
      expect(component.store.openPage()).toBe('mail');
    });
  });

  describe('ngOnDestroy', () => {
    it('clears the open page in the store', () => {
      component.ngOnDestroy();
      expect(component.store.openPage()).toBeNull();
    });
  });

  describe('documentLink', () => {
    it('builds the doc link via ShareLinkService', () => {
      expect(component.documentLink()).toBe('https://example.com/doc/mail-1');
    });
  });

  describe('buttons', () => {
    it('exposes createHandlingFromMail and clear actions', () => {
      expect(component.buttons().length).toBe(2);
    });

    it('opens the create-handling dialog', () => {
      component.buttons()[0].click();
      expect(component.isCreateHandlingOpen()).toBeTrue();
    });
  });

  describe('isPicture', () => {
    it('returns true when the doc has the Picture facet', () => {
      expect(component.isPicture(makeNuxeoDocument({ facets: ['Picture'] }))).toBeTrue();
    });

    it('returns false otherwise', () => {
      expect(component.isPicture(makeNuxeoDocument({ facets: [] }))).toBeFalse();
    });
  });

  describe('getDate', () => {
    it('formats a date value', () => {
      expect(typeof component.getDate('2026-06-15T00:00:00Z')).toBe('string');
    });
  });

  describe('getUserName', () => {
    it('returns the full name when available', () => {
      expect(component.getUserName({ properties: { firstName: 'Alice', lastName: 'Smith' } })).toBe('Alice Smith');
    });

    it('falls back to username then id', () => {
      expect(component.getUserName({ properties: { username: 'alice123' } })).toBe('alice123');
      expect(component.getUserName({ id: 'user-1' })).toBe('user-1');
    });

    it('returns an empty string for a falsy user', () => {
      expect(component.getUserName(null as never)).toBe('');
    });
  });

  describe('onCreateHandling', () => {
    it('creates a handling from the utkast and navigates to it', () => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');
      component.onCreateHandling();
      expect(apiSpy.createHandlingFromUtkast).toHaveBeenCalledWith('mail-1');
      expect(router.navigate).toHaveBeenCalledWith(['/doc/', 'handling-1']);
    });
  });

  describe('deleteDocument', () => {
    it('deletes the document and navigates home', () => {
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate');
      component.deleteDocument();
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('mail-1');
      expect(router.navigate).toHaveBeenCalledWith(['']);
    });
  });

  describe('deleteAttachment', () => {
    it('deletes the attachment and emits reloadDocument', () => {
      const spy = jasmine.createSpy('reloadDocument');
      component.reloadDocument.subscribe(spy);
      component.deleteAttachment(0);
      expect(apiSpy.deleteAttachment).toHaveBeenCalledWith(0, 'mail-1');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('checkInCollection / checkDocumentInCollections', () => {
    it('sets inCollection to false when there are no collections', () => {
      component.checkInCollection();
      expect(component.inCollection()).toBeFalse();
    });

    it('returns true when the document is found in a collection', done => {
      apiSpy.getCollections.and.returnValue(of([{ uid: 'col-1', title: 'Col', date: new Date(), property: 'owner' }]));
      apiSpy.getCollectionDocuments.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'mail-1' })] }))
      );

      component.checkDocumentInCollections('mail-1').subscribe(result => {
        expect(result).toBeTrue();
        done();
      });
    });
  });

  describe('onShare / copyLink', () => {
    it('opens the copy-link dialog', () => {
      component.onShare();
      expect(component.isCopyLinkDialogOpen()).toBeTrue();
    });

    it('delegates to ShareLinkService.copyDocumentLink', () => {
      shareLinkSpy.copyDocumentLink.and.callFake((_uid, cb) => cb(true));
      component.copyLink();
      expect(component.linkWasCopied()).toBeTrue();
    });
  });

  describe('toggleLockState', () => {
    it('delegates to LockService.toggleAndUpdate', () => {
      component.toggleLockState();
      expect(lockSpy.toggleAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getRecipients / getMailSendingDate / getArendenummer', () => {
    it('joins recipients into a comma-separated string', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({ [NUXEO_SCHEMA_FIELDS.mail.recipients]: ['a@b.com', 'c@d.com'] })
      );
      expect(component.getRecipients()).toBe('a@b.com, c@d.com');
    });

    it('returns an empty string when recipients are missing', () => {
      expect(component.getRecipients()).toBe('');
    });

    it('formats the mail sending date', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({ [NUXEO_SCHEMA_FIELDS.mail.sendingDate]: '2026-06-15T00:00:00Z' })
      );
      expect(typeof component.getMailSendingDate()).toBe('string');
    });

    it('extracts arendenummer from extraheradeData', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dms_mail.extraheradeData]: { arendenummer: { varde: 'A-2026-1' } },
        })
      );
      expect(component.getArendenummer()).toBe('A-2026-1');
    });

    it('returns an empty string when extraheradeData is missing', () => {
      expect(component.getArendenummer()).toBe('');
    });
  });

  describe('toggleSubscription', () => {
    it('subscribes when not currently subscribed and emits success', () => {
      component.isSubscribed.set(false);
      component.toggleSubscription();
      expect(notificationSpy.subscribe).toHaveBeenCalledWith('mail-1');
    });

    it('shows a danger notification when the operation errors', () => {
      notificationSpy.subscribe.and.returnValue(throwError(() => new Error('failed')));
      component.isSubscribed.set(false);
      component.toggleSubscription();
      expect(component.store.notification().variation).toBe('danger');
    });
  });
});
