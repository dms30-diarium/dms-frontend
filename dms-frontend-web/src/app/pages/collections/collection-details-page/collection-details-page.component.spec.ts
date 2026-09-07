import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, EMPTY, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CollectionDetailsPageComponent } from './collection-details-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { LockService } from '@app/core/services/lock-service.service';
import { NotificationService } from '@app/core/services/notification-service.service';
import { ShareLinkService } from '@app/core/services/share-link.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { BulkDocumentActionsService } from '@app/core/services/bulk-document-actions.service';
import { TableSortService } from '@app/core/services/table-sort.service';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';

function makeStoreMock() {
  return {
    openPage: signal<string | null>(null),
    notification: signal<{ show: boolean; variation?: string; text?: string }>({ show: false }),
    navigationPanelContext: signal<string | null>(null),
    messagesInfo: signal<unknown>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
    getLabelByType: jasmine.createSpy('getLabelByType').and.returnValue(''),
  };
}

function makeAuthMock() {
  return {
    username: signal<string | null>('user1'),
    activeRole: signal<string | null>('REGISTRATOR'),
    isAdmin: computed(() => false),
    isAdminSig: signal(false),
    loaded: signal(false),
    loadError: signal(null),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    loadMe: jasmine.createSpy('loadMe'),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
}

describe('CollectionDetailsPageComponent', () => {
  let component: CollectionDetailsPageComponent;
  let fixture: ComponentFixture<CollectionDetailsPageComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let lockSpy: jasmine.SpyObj<LockService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;
  let shareLinkSpy: jasmine.SpyObj<ShareLinkService>;
  let favoritesSpy: jasmine.SpyObj<FavoritesService>;
  let bulkSpy: jasmine.SpyObj<BulkDocumentActionsService>;
  let tableSortSpy: jasmine.SpyObj<TableSortService>;

  beforeEach(async () => {
    localStorage.clear();
    storeMock = makeStoreMock();
    authMock = makeAuthMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getCollections',
      'getDocumentWithAcls',
      'getCollectionDocuments',
      'removeDocumentFromCollection',
      'trashDocument',
      'getMessagesJSON',
      'fetchFavoritesUid',
      'lockDocument',
      'unlockDocument',
      'getDocumentById',
      'executeNuxeoOperation',
      'addToFavorites',
      'removeFromFavorites',
    ]);
    apiSpy.getCollections.and.returnValue(of([]));
    apiSpy.getDocumentWithAcls.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [], totalSize: 0 })));
    apiSpy.removeDocumentFromCollection.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.trashDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.fetchFavoritesUid.and.returnValue(of(makeNuxeoDocument({ uid: 'fav-uid' })));
    apiSpy.lockDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.unlockDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.executeNuxeoOperation.and.returnValue(of(undefined));
    apiSpy.addToFavorites.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.removeFromFavorites.and.returnValue(of(makeNuxeoDocument()));

    lockSpy = jasmine.createSpyObj('LockService', ['toggleAndUpdate', 'initLockState']);
    lockSpy.toggleAndUpdate.and.returnValue(EMPTY);
    lockSpy.initLockState.and.stub();

    notifSpy = jasmine.createSpyObj('NotificationService', ['subscribe', 'unsubscribe', 'isUserSubscribed']);
    notifSpy.subscribe.and.returnValue(of(makeNuxeoDocument()));
    notifSpy.unsubscribe.and.returnValue(of(makeNuxeoDocument()));
    notifSpy.isUserSubscribed.and.returnValue(false);

    shareLinkSpy = jasmine.createSpyObj('ShareLinkService', ['buildDocLink', 'copyDocumentLink']);
    shareLinkSpy.buildDocLink.and.returnValue('http://example.com/doc/uid-1');
    shareLinkSpy.copyDocumentLink.and.stub();

    favoritesSpy = jasmine.createSpyObj('FavoritesService', ['getFavoritesUid', 'checkInFavorites', 'toggleFavorites']);
    favoritesSpy.getFavoritesUid.and.returnValue(of(makeNuxeoDocument({ uid: 'fav-uid' })));
    favoritesSpy.checkInFavorites.and.returnValue(of(false));
    favoritesSpy.toggleFavorites.and.returnValue(of(makeNuxeoDocument()));

    bulkSpy = jasmine.createSpyObj('BulkDocumentActionsService', [
      'toggleLock',
      'toggleFavorites',
      'toggleSubscriptions',
    ]);
    bulkSpy.toggleLock.and.returnValue(of([]));
    bulkSpy.toggleFavorites.and.returnValue(of([]));
    bulkSpy.toggleSubscriptions.and.returnValue(of([]));

    tableSortSpy = jasmine.createSpyObj('TableSortService', ['applySortSignals']);
    tableSortSpy.applySortSignals.and.callFake(
      (_sortBy: unknown, _sortOrder: unknown, event: { sortBy: string; sortOrder: 'asc' | 'desc' }) => event
    );

    await TestBed.configureTestingModule({
      imports: [CollectionDetailsPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: AuthService, useValue: authMock },
        { provide: LockService, useValue: lockSpy },
        { provide: NotificationService, useValue: notifSpy },
        { provide: ShareLinkService, useValue: shareLinkSpy },
        { provide: FavoritesService, useValue: favoritesSpy },
        { provide: BulkDocumentActionsService, useValue: bulkSpy },
        { provide: TableSortService, useValue: tableSortSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
          },
        },
      ],
    })
      .overrideTemplate(CollectionDetailsPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CollectionDetailsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onTabChanged', () => {
    it('sets activeTabId to the new tab id', () => {
      component.onTabChanged('permissions');
      expect(component.activeTabId()).toBe('permissions');
    });

    it('clears selectedFiles when switching away from overview with files selected', () => {
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.onTabChanged('permissions');
      expect(component.selectedFiles()).toEqual([]);
    });

    it('does not clear selectedFiles when switching to overview', () => {
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.onTabChanged('overview');
      expect(component.selectedFiles()).toEqual(['uid-1', 'uid-2']);
    });

    it('does not clear selectedFiles when they are empty and switching tabs', () => {
      component.selectedFiles.set([]);
      component.onTabChanged('permissions');
      expect(component.selectedFiles()).toEqual([]);
    });
  });

  describe('onTableSelectionChange', () => {
    it('updates selectedFiles signal with the provided ids', () => {
      component.onTableSelectionChange(['uid-1', 'uid-2', 'uid-3']);
      expect(component.selectedFiles()).toEqual(['uid-1', 'uid-2', 'uid-3']);
    });

    it('clears selectedFiles when called with empty array', () => {
      component.selectedFiles.set(['uid-1']);
      component.onTableSelectionChange([]);
      expect(component.selectedFiles()).toEqual([]);
    });
  });

  describe('onToggleButtonChange', () => {
    it('sets viewMode to grid when activeButton is 1', () => {
      component.onToggleButtonChange(1);
      expect(component.viewMode()).toBe('grid');
    });

    it('sets viewMode to table when activeButton is not 1', () => {
      component.viewMode.set('grid');
      component.onToggleButtonChange(0);
      expect(component.viewMode()).toBe('table');
    });

    it('clears selectedFiles when switching to grid mode with files selected', () => {
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.onToggleButtonChange(1);
      expect(component.selectedFiles()).toEqual([]);
    });

    it('does not clear selectedFiles when switching to table mode', () => {
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.viewMode.set('grid');
      component.onToggleButtonChange(0);
      expect(component.selectedFiles()).toEqual(['uid-1', 'uid-2']);
    });
  });

  describe('onPageChange', () => {
    it('updates page signal', () => {
      component.page.set(0);
      component.onPageChange(2);
      expect(component.page()).toBe(2);
    });

    it('does not reload if page is the same', () => {
      component.page.set(3);
      const callsBefore = apiSpy.getCollectionDocuments.calls.count();
      component.onPageChange(3);
      expect(apiSpy.getCollectionDocuments.calls.count()).toBe(callsBefore);
    });

    it('triggers reload when page changes and collectionId is set', () => {
      component.selectedCollectionId.set('col-1');
      const callsBefore = apiSpy.getCollectionDocuments.calls.count();
      component.onPageChange(2);
      expect(apiSpy.getCollectionDocuments.calls.count()).toBeGreaterThan(callsBefore);
    });
  });

  describe('onPageSizeSelect', () => {
    it('updates pageSize signal', () => {
      component.onPageSizeSelect('10');
      expect(component.pageSize()).toBe(10);
    });

    it('resets page to 0 when page size changes', () => {
      component.page.set(5);
      component.onPageSizeSelect('10');
      expect(component.page()).toBe(0);
    });

    it('does nothing for non-numeric value', () => {
      const sizeBefore = component.pageSize();
      component.onPageSizeSelect('abc');
      expect(component.pageSize()).toBe(sizeBefore);
    });

    it('does not update if value equals current pageSize', () => {
      component.pageSize.set(25);
      const callsBefore = apiSpy.getCollectionDocuments.calls.count();
      component.onPageSizeSelect('25');
      expect(apiSpy.getCollectionDocuments.calls.count()).toBe(callsBefore);
    });

    it('saves to localStorage when username is set', () => {
      const setItemSpy = spyOn(Storage.prototype, 'setItem');
      component.onPageSizeSelect('10');
      expect(setItemSpy).toHaveBeenCalled();
    });

    it('does not save to localStorage when username is null', () => {
      authMock.username.set(null);
      const setItemSpy = spyOn(Storage.prototype, 'setItem');
      component.onPageSizeSelect('10');
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('totalPages computed', () => {
    it('returns ceil(total / pageSize)', () => {
      component.total.set(100);
      component.pageSize.set(25);
      expect(component.totalPages()).toBe(4);
    });

    it('returns 1 when total is 0', () => {
      component.total.set(0);
      component.pageSize.set(25);
      expect(component.totalPages()).toBe(1);
    });

    it('rounds up for non-even division', () => {
      component.total.set(11);
      component.pageSize.set(5);
      expect(component.totalPages()).toBe(3);
    });
  });

  describe('selectedDocuments computed', () => {
    it('returns documents matching selectedFiles ids', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      const doc3 = makeNuxeoDocument({ uid: 'uid-3' });
      component.documents.set([doc1, doc2, doc3]);
      component.selectedFiles.set(['uid-1', 'uid-3']);
      expect(component.selectedDocuments()).toEqual([doc1, doc3]);
    });

    it('returns empty array when no files selected', () => {
      component.documents.set([makeNuxeoDocument({ uid: 'uid-1' })]);
      component.selectedFiles.set([]);
      expect(component.selectedDocuments()).toEqual([]);
    });
  });

  describe('lockStates computed', () => {
    it('returns allLocked when all selected docs are locked', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1', lockOwner: 'user1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2', lockOwner: 'user2' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      expect(component.lockStates().allLocked).toBeTrue();
      expect(component.lockStates().allUnlocked).toBeFalse();
      expect(component.lockStates().mixed).toBeFalse();
    });

    it('returns allUnlocked when no selected docs are locked', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      expect(component.lockStates().allUnlocked).toBeTrue();
      expect(component.lockStates().allLocked).toBeFalse();
    });

    it('returns mixed when some docs are locked and some are not', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1', lockOwner: 'user1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      expect(component.lockStates().mixed).toBeTrue();
    });
  });

  describe('favoriteStates computed', () => {
    it('returns allFavorited when all selected docs are in favorites', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.favoriteDocIds.set(['uid-1', 'uid-2']);
      expect(component.favoriteStates().allFavorited).toBeTrue();
      expect(component.favoriteStates().allUnfavorited).toBeFalse();
    });

    it('returns allUnfavorited when no selected docs are in favorites', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      component.favoriteDocIds.set([]);
      expect(component.favoriteStates().allUnfavorited).toBeTrue();
      expect(component.favoriteStates().allFavorited).toBeFalse();
    });

    it('returns mixed when some docs are in favorites and some are not', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.favoriteDocIds.set(['uid-1']);
      expect(component.favoriteStates().mixed).toBeTrue();
    });
  });

  describe('subscriptionStates computed', () => {
    it('returns allSubscribed when all selected docs are subscribed', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.subscribedDocIds.set(['uid-1', 'uid-2']);
      expect(component.subscriptionStates().allSubscribed).toBeTrue();
    });

    it('returns allUnsubscribed when no selected docs are subscribed', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      component.subscribedDocIds.set([]);
      expect(component.subscriptionStates().allUnsubscribed).toBeTrue();
    });

    it('returns mixed when some docs are subscribed and some are not', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.subscribedDocIds.set(['uid-1']);
      expect(component.subscriptionStates().mixed).toBeTrue();
    });
  });

  describe('shareLinks computed', () => {
    it('returns link objects for each selected document', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1', title: 'Doc One' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      const links = component.shareLinks();
      expect(links.length).toBe(1);
      expect(links[0]['uid']).toBe('uid-1');
      expect(links[0]['title']).toBe('Doc One');
    });

    it('returns empty array when no files selected', () => {
      component.selectedFiles.set([]);
      expect(component.shareLinks()).toEqual([]);
    });
  });

  describe('tabs computed', () => {
    it('includes only overview tab when user has no permission access', () => {
      component.fullCollectionDocument.set(null);
      const tabs = component.tabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0]['id']).toBe('overview');
    });

    it('includes permissions tab when user has permission access', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'user1' } as never,
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });
  });

  describe('onBulkShare', () => {
    it('opens share links dialog when files are selected', () => {
      component.selectedFiles.set(['uid-1']);
      component.onBulkShare();
      expect(component.isShareLinksDialogOpen()).toBeTrue();
    });

    it('does not open dialog when no files selected', () => {
      component.selectedFiles.set([]);
      component.onBulkShare();
      expect(component.isShareLinksDialogOpen()).toBeFalse();
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns column options with visible true for each column', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBeGreaterThan(0);
      expect(opts.every(o => o.visible)).toBeTrue();
    });
  });

  describe('tableItems computed', () => {
    it('maps documents to table items with correct fields', () => {
      const doc = makeNuxeoDocument({
        uid: 'uid-1',
        title: 'My Doc',
        type: 'Note',
        properties: {} as never,
      });
      component.documents.set([doc]);
      const items = component.tableItems();
      expect(items.length).toBe(1);
      expect(items[0]['id']).toBe('uid-1');
      expect(items[0]['type']).toBe('Note');
    });

    it('returns empty array when no documents', () => {
      component.documents.set([]);
      expect(component.tableItems()).toEqual([]);
    });
  });

  describe('onGridPageChange', () => {
    it('delegates to onPageChange', () => {
      const spy = spyOn(component, 'onPageChange');
      component.onGridPageChange(3);
      expect(spy).toHaveBeenCalledWith(3);
    });
  });

  describe('onGridPageSizeSelect', () => {
    it('delegates to onPageSizeSelect', () => {
      const spy = spyOn(component, 'onPageSizeSelect');
      component.onGridPageSizeSelect('15');
      expect(spy).toHaveBeenCalledWith('15');
    });
  });

  describe('onSortChange', () => {
    it('calls tableSortService.applySortSignals and reloads when collectionId set', () => {
      component.selectedCollectionId.set('col-1');
      const callsBefore = apiSpy.getCollectionDocuments.calls.count();
      component.onSortChange({ sortBy: 'dc:title', sortOrder: 'asc' });
      expect(tableSortSpy.applySortSignals).toHaveBeenCalled();
      expect(apiSpy.getCollectionDocuments.calls.count()).toBeGreaterThan(callsBefore);
    });

    it('resets page to 0 on sort change', () => {
      component.selectedCollectionId.set('col-1');
      component.page.set(3);
      component.onSortChange({ sortBy: 'dc:title', sortOrder: 'asc' });
      expect(component.page()).toBe(0);
    });
  });

  describe('copyLink', () => {
    it('calls shareLinkService.copyDocumentLink with the collection uid', () => {
      const doc = makeNuxeoDocument({ uid: 'col-uid-1' });
      component.fullCollectionDocument.set(doc);
      component.copyLink();
      expect(shareLinkSpy.copyDocumentLink).toHaveBeenCalledWith('col-uid-1', jasmine.any(Function));
    });

    it('calls copyDocumentLink with undefined uid when no full document', () => {
      component.fullCollectionDocument.set(null);
      component.copyLink();
      expect(shareLinkSpy.copyDocumentLink).toHaveBeenCalledWith(undefined, jasmine.any(Function));
    });
  });

  describe('onTrash', () => {
    it('does nothing when fullCollectionDocument is null', () => {
      component.fullCollectionDocument.set(null);
      component.onTrash();
      expect(apiSpy.trashDocument).not.toHaveBeenCalled();
    });

    it('navigates to /collections and shows success notification on success', () => {
      const doc = makeNuxeoDocument({ uid: 'col-1' });
      component.fullCollectionDocument.set(doc);
      apiSpy.trashDocument.and.returnValue(of(makeNuxeoDocument()));
      component.onTrash();
      expect(apiSpy.trashDocument).toHaveBeenCalledWith('col-1');
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows danger notification on trash error', () => {
      const doc = makeNuxeoDocument({ uid: 'col-1' });
      component.fullCollectionDocument.set(doc);

      apiSpy.trashDocument.and.returnValue(throwError(() => new Error('fail')));
      component.onTrash();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('toggleLockState', () => {
    it('does nothing when fullCollectionDocument is null', () => {
      component.fullCollectionDocument.set(null);
      component.toggleLockState();
      expect(lockSpy.toggleAndUpdate).not.toHaveBeenCalled();
    });

    it('calls toggleAndUpdate and updates document on success', () => {
      const doc = makeNuxeoDocument({ uid: 'col-1' });
      component.fullCollectionDocument.set(doc);
      const updatedDoc = makeNuxeoDocument({ uid: 'col-1', lockOwner: 'user1' });
      lockSpy.toggleAndUpdate.and.returnValue(of(updatedDoc));
      component.toggleLockState();
      expect(lockSpy.toggleAndUpdate).toHaveBeenCalled();
      expect(component.fullCollectionDocument()).toEqual(updatedDoc);
      expect(lockSpy.initLockState).toHaveBeenCalledWith(updatedDoc, jasmine.anything());
    });

    it('shows danger notification on lock error', () => {
      const doc = makeNuxeoDocument({ uid: 'col-1' });
      component.fullCollectionDocument.set(doc);

      lockSpy.toggleAndUpdate.and.returnValue(throwError(() => new Error('fail')));
      component.toggleLockState();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('toggleSubscription', () => {
    it('does nothing when collectionInfo is null', () => {
      component.collectionInfo.set(null);
      component.toggleSubscription();
      expect(notifSpy.subscribe).not.toHaveBeenCalled();
      expect(notifSpy.unsubscribe).not.toHaveBeenCalled();
    });

    it('calls subscribe when not currently subscribed', () => {
      component.collectionInfo.set({ uid: 'col-1', title: 'Col', date: new Date(), property: '' });
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(of(makeNuxeoDocument()));
      notifSpy.isUserSubscribed.and.returnValue(true);
      component.toggleSubscription();
      expect(notifSpy.subscribe).toHaveBeenCalledWith('col-1');
    });

    it('calls unsubscribe when currently subscribed', () => {
      component.collectionInfo.set({ uid: 'col-1', title: 'Col', date: new Date(), property: '' });
      component.isSubscribed.set(true);
      notifSpy.unsubscribe.and.returnValue(of(makeNuxeoDocument()));
      notifSpy.isUserSubscribed.and.returnValue(false);
      component.toggleSubscription();
      expect(notifSpy.unsubscribe).toHaveBeenCalledWith('col-1');
    });

    it('updates isSubscribed and shows success notification', () => {
      component.collectionInfo.set({ uid: 'col-1', title: 'Col', date: new Date(), property: '' });
      component.isSubscribed.set(false);
      notifSpy.subscribe.and.returnValue(of(makeNuxeoDocument()));
      notifSpy.isUserSubscribed.and.returnValue(true);
      component.toggleSubscription();
      expect(component.isSubscribed()).toBeTrue();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows danger notification on subscription error', () => {
      component.collectionInfo.set({ uid: 'col-1', title: 'Col', date: new Date(), property: '' });
      component.isSubscribed.set(false);

      notifSpy.subscribe.and.returnValue(throwError(() => new Error('fail')));
      component.toggleSubscription();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('removeSelectedFromCollection', () => {
    it('does nothing when no collectionId', () => {
      component.selectedCollectionId.set(null);
      component.selectedFiles.set(['uid-1']);
      component.removeSelectedFromCollection();
      expect(apiSpy.removeDocumentFromCollection).not.toHaveBeenCalled();
    });

    it('does nothing when no selected files', () => {
      component.selectedCollectionId.set('col-1');
      component.selectedFiles.set([]);
      component.removeSelectedFromCollection();
      expect(apiSpy.removeDocumentFromCollection).not.toHaveBeenCalled();
    });

    it('removes documents and reloads collection on success', () => {
      component.selectedCollectionId.set('col-1');
      component.selectedFiles.set(['uid-1']);
      const resultDoc = makeNuxeoDocument({ uid: 'uid-2' });
      apiSpy.removeDocumentFromCollection.and.returnValue(of(makeNuxeoDocument()));
      apiSpy.getCollectionDocuments.and.returnValue(of(makeSearchResult({ entries: [resultDoc], totalSize: 1 })));
      component.removeSelectedFromCollection();
      expect(apiSpy.removeDocumentFromCollection).toHaveBeenCalledWith('col-1', ['uid-1']);
      expect(component.selectedFiles()).toEqual([]);
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows danger notification on remove error', () => {
      component.selectedCollectionId.set('col-1');
      component.selectedFiles.set(['uid-1']);

      apiSpy.removeDocumentFromCollection.and.returnValue(throwError(() => new Error('fail')));
      component.removeSelectedFromCollection();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('onBulkLock', () => {
    it('does nothing when no files selected', () => {
      component.selectedFiles.set([]);
      component.onBulkLock();
      expect(bulkSpy.toggleLock).not.toHaveBeenCalled();
    });

    it('calls toggleLock and updates documents on success', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2', lockOwner: 'user1' });
      component.documents.set([doc1, doc2]);
      component.selectedFiles.set(['uid-1', 'uid-2']);
      const updatedDoc1 = makeNuxeoDocument({ uid: 'uid-1', lockOwner: 'user1' });
      bulkSpy.toggleLock.and.returnValue(of([updatedDoc1, doc2]));
      component.onBulkLock();
      expect(bulkSpy.toggleLock).toHaveBeenCalledWith(['uid-1', 'uid-2'], jasmine.anything());
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows locked message when all were unlocked', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      bulkSpy.toggleLock.and.returnValue(of([doc1]));
      component.onBulkLock();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows danger notification on lock error', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);

      bulkSpy.toggleLock.and.returnValue(throwError(() => new Error('fail')));
      component.onBulkLock();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('onBulkAddToFavorites', () => {
    it('does nothing when no files selected', () => {
      component.selectedFiles.set([]);
      component.onBulkAddToFavorites();
      expect(bulkSpy.toggleFavorites).not.toHaveBeenCalled();
    });

    it('calls toggleFavorites and updates favoriteDocIds on success', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      component.favoriteDocIds.set([]);
      bulkSpy.toggleFavorites.and.returnValue(of(['uid-1']));
      component.onBulkAddToFavorites();
      expect(bulkSpy.toggleFavorites).toHaveBeenCalled();
      expect(component.favoriteDocIds()).toEqual(['uid-1']);
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows removed message when all were already favorited', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      component.favoriteDocIds.set(['uid-1']);
      bulkSpy.toggleFavorites.and.returnValue(of([]));
      component.onBulkAddToFavorites();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows danger notification on favorites error', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);

      bulkSpy.toggleFavorites.and.returnValue(throwError(() => new Error('fail')));
      component.onBulkAddToFavorites();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('onBulkSubscribe', () => {
    it('does nothing when no files selected', () => {
      component.selectedFiles.set([]);
      component.onBulkSubscribe();
      expect(bulkSpy.toggleSubscriptions).not.toHaveBeenCalled();
    });

    it('calls toggleSubscriptions and updates subscribedDocIds on success', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      component.subscribedDocIds.set([]);
      bulkSpy.toggleSubscriptions.and.returnValue(of(['uid-1']));
      component.onBulkSubscribe();
      expect(bulkSpy.toggleSubscriptions).toHaveBeenCalled();
      expect(component.subscribedDocIds()).toEqual(['uid-1']);
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows disabled message when all were subscribed', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);
      component.subscribedDocIds.set(['uid-1']);
      bulkSpy.toggleSubscriptions.and.returnValue(of([]));
      component.onBulkSubscribe();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('shows danger notification on subscription error', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      component.documents.set([doc1]);
      component.selectedFiles.set(['uid-1']);

      bulkSpy.toggleSubscriptions.and.returnValue(throwError(() => new Error('fail')));
      component.onBulkSubscribe();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('buttons computed', () => {
    it('includes subscribe button text when not subscribed', () => {
      component.isSubscribed.set(false);
      const buttons = component.buttons();
      expect(buttons.some(b => b.text.toLowerCase().includes('notifera'))).toBeTrue();
    });

    it('includes unsubscribe button text when subscribed', () => {
      component.isSubscribed.set(true);
      const buttons = component.buttons();
      expect(buttons.some(b => b.text.toLowerCase().includes('avsluta'))).toBeTrue();
    });

    it('includes trash button when user can edit', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'user1' } as never,
      });
      component.fullCollectionDocument.set(doc);
      const buttons = component.buttons();
      expect(buttons.some(b => b.text.toLowerCase().includes('ta bort'))).toBeTrue();
    });

    it('includes unlock button icon when document is locked by user', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'user1' } as never,
      });
      component.fullCollectionDocument.set(doc);
      component.isLockedByUser.set(true);
      const buttons = component.buttons();

      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('does not include trash button when user cannot edit', () => {
      component.fullCollectionDocument.set(null);
      const buttons = component.buttons();
      expect(buttons.some(b => b.text.toLowerCase().includes('ta bort'))).toBeFalse();
    });
  });

  describe('hasPermissionAccess via tabs computed', () => {
    it('grants access when user is admin', () => {
      authMock.isAdmin = computed(() => true);
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
      });
      component.fullCollectionDocument.set(doc);

      const tabs = component.tabs();

      expect(tabs.length).toBeGreaterThanOrEqual(1);
    });

    it('returns false when username is null', () => {
      authMock.username.set(null);
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'user1' } as never,
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0]['id']).toBe('overview');
    });

    it('grants access via ACL with string principal matching username', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: 'user1' as never,
                  permission: 'Everything',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });

    it('grants access via ACL with object principal having id matching username', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: { id: 'user1', 'entity-type': 'user' } as never,
                  permission: 'ReadWrite',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });

    it('denies access when ACE has grant: false', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: 'user1' as never,
                  permission: 'Everything',
                  grant: false,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeFalse();
    });

    it('denies access when permission is insufficient', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: 'user1' as never,
                  permission: 'Read',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeFalse();
    });

    it('grants access via ACL using ace (not aces) field', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              ace: [
                {
                  username: 'user1' as never,
                  permission: 'ReadWrite',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });

    it('grants access via group membership in ACL', () => {
      authMock.user.set({
        'entity-type': 'user',
        id: 'user1',
        properties: { groups: ['admins'] },
      } as never);
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: 'admins' as never,
                  permission: 'Everything',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });

    it('handles ACL principal with colon prefix (group:admins)', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: 'user:user1' as never,
                  permission: 'Everything',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });

    it('handles ACL principal with groupname property', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: { groupname: 'user1' } as never,
                  permission: 'ReadWrite',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });

    it('handles ACL principal with username property in object', () => {
      const doc = makeNuxeoDocument({
        uid: 'col-1',
        properties: { 'dc:creator': 'other-user' } as never,
        contextParameters: {
          acls: [
            {
              name: 'local',
              aces: [
                {
                  username: { username: 'user1' } as never,
                  permission: 'Everything',
                  grant: true,
                },
              ],
            },
          ],
        },
      });
      component.fullCollectionDocument.set(doc);
      const tabs = component.tabs();
      expect(tabs.some(t => t['id'] === 'permissions')).toBeTrue();
    });
  });

  describe('documentLink computed', () => {
    it('returns link built by shareLinkService', () => {
      const doc = makeNuxeoDocument({ uid: 'col-abc' });
      component.fullCollectionDocument.set(doc);
      shareLinkSpy.buildDocLink.and.returnValue('http://example.com/doc/col-abc');
      expect(component.documentLink()).toBe('http://example.com/doc/col-abc');
    });

    it('calls buildDocLink with undefined when no document', () => {
      component.fullCollectionDocument.set(null);
      component.documentLink();
      expect(shareLinkSpy.buildDocLink).toHaveBeenCalledWith(undefined);
    });
  });

  describe('ngOnInit with collectionId', () => {
    it('loads collection documents when selectedCollectionId is set manually', () => {
      component.selectedCollectionId.set('col-999');
      const callsBefore = apiSpy.getCollectionDocuments.calls.count();

      component.onPageChange(1);
      expect(apiSpy.getCollectionDocuments.calls.count()).toBeGreaterThan(callsBefore);
    });

    it('does not call getCollections when no route id param', () => {
      expect(component.selectedCollectionId()).toBeNull();
    });
  });

  describe('restorePageSize', () => {
    it('restores page size from localStorage when username is set', () => {
      const data = { pageSizeMap: { user1: 50 } };
      localStorage.setItem('pageSizeByUsername', JSON.stringify(data));
      component.ngOnInit();
      expect(component.pageSize()).toBe(50);
    });
  });
});
