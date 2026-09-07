import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, of, tap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, SearchResult } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';

import {
  CollectionDetailsComponent,
  CollectionDetailsItem,
} from '@app/shared/components/collection-details/collection-details.component';
import { AccordionComponent } from '@app/shared/components/accordion/accordion.component';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { ToggleButtonComponent } from '@app/shared/components/toggle-button/toggle-button.component';
import { Tab, TabsComponent } from '@app/shared/components/tabs/tabs.component';
import { DigiNavigationBreadcrumbs, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CollectionDocumentCardComponent } from '@app/shared/components/collection-document-card.component/collection-document-card.component';
import { CollectionPermissionsComponent } from '@app/shared/components/collection-permissions/collection-permissions.component';

import { NotificationService } from '@app/core/services/notification-service.service';
import { AuthService } from '@app/core/services/auth.service';
import { LockService } from '@app/core/services/lock-service.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { ShareLinkService } from '@app/core/services/share-link.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import {
  COLLECTION_REMOVE_ERROR_MESSAGE,
  COLLECTION_REMOVED_MESSAGE,
  COLLECTION_TRASH_ERROR_MESSAGE,
  COLLECTION_TRASHED_MESSAGE,
  SUBSCRIPTION_DISABLED_MESSAGE,
  SUBSCRIPTION_ENABLED_MESSAGE,
  SUBSCRIPTION_ERROR_MESSAGE,
  SUBSCRIPTION_SUBSCRIBED_MESSAGE,
  LOCK_LOCKED_MESSAGE,
  LOCK_UNLOCKED_MESSAGE,
  LOCK_GENERIC_ERROR_MESSAGE,
  FAVORITE_ADDED_MESSAGE,
  FAVORITE_REMOVED_MESSAGE,
  FAVORITE_UPDATE_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { truncateForTitle, truncateForTable } from '@app/shared/utils/text-utils';
import { TopButtonsPanelComponent } from '@app/shared/components/top-buttons-panel/top-buttons-panel.component';
import { ActionButton, ButtonMenuComponent } from '@app/shared/components/button-menu.component/button-menu.component';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { updateCurrentPage } from '@app/shared/utils/pagination-utils';
import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from '@app/shared/utils/page-size-storage';
import { GridPaginationControlsComponent } from '@app/shared/components/grid-pagination-controls/grid-pagination-controls.component';
import { SvgIconComponent } from '@app/shared/components/svg-icon/svg-icon.component';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';
import { ShareLinksDialogComponent } from '@app/shared/components/share-links-dialog/share-links-dialog.component';
import { BulkDocumentActionsService } from '@app/core/services/bulk-document-actions.service';
import { SortOrder, TableSortService } from '@app/core/services/table-sort.service';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-collection-details-page',
  templateUrl: './collection-details-page.component.html',
  imports: [
    CollectionDetailsComponent,
    AccordionComponent,
    CaseListTableComponent,
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    ToggleButtonComponent,
    TabsComponent,
    RouterLink,
    CollectionDocumentCardComponent,
    TopButtonsPanelComponent,
    CollectionPermissionsComponent,
    ButtonMenuComponent,
    SvgIconComponent,
    GridPaginationControlsComponent,
    ShareLinksDialogComponent,
  ],
})
export class CollectionDetailsPageComponent implements OnInit {
  private apiService = inject(NuxeoApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private auth = inject(AuthService);
  private lockService = inject(LockService);
  private store = inject(GeneralStore);
  private shareLinkService = inject(ShareLinkService);
  private favoritesService = inject(FavoritesService);
  private bulkActions = inject(BulkDocumentActionsService);
  private tableSortService = inject(TableSortService);

  selectedCollectionId = signal<string | null>(null);
  collectionInfo = signal<CollectionDetailsItem | null>(null);

  documents = signal<NuxeoDocument[]>([]);
  loading = signal(false);
  page = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>(NUXEO_SCHEMA_FIELDS.dc.modified);
  sortOrder = signal<SortOrder>('desc');
  readonly pageSizeOptions = [5, 10, 15, 25, 30, 50];
  total = signal(0);

  totalPages = computed(() => {
    const totalItems = Math.max(0, this.total());
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(totalItems / size));
  });

  viewMode = signal<'grid' | 'table'>('table');
  activeTabId = signal<string>('overview');
  selectedFiles = signal<string[]>([]);
  favoriteDocIds = signal<string[]>([]);
  subscribedDocIds = signal<string[]>([]);
  isShareLinksDialogOpen = signal<boolean>(false);

  isSubscribed = signal<boolean>(false);
  isLockedByUser = signal(false);
  fullCollectionDocument = signal<NuxeoDocument | null>(null);
  isCopyLinkDialogOpen = signal<boolean>(false);
  linkWasCopied = signal<boolean>(false);

  documentLink = computed(() => {
    const doc = this.fullCollectionDocument();
    return this.shareLinkService.buildDocLink(doc?.uid);
  });

  selectedDocuments = computed(() => {
    const ids = this.selectedFiles();
    const docs = this.documents();
    return docs.filter(doc => ids.includes(doc.uid));
  });

  lockStates = computed(() => {
    const docs = this.selectedDocuments();
    const locked = docs.filter(doc => !!doc.lockOwner);
    const unlocked = docs.filter(doc => !doc.lockOwner);
    return {
      allLocked: locked.length > 0 && unlocked.length === 0,
      allUnlocked: unlocked.length > 0 && locked.length === 0,
      mixed: locked.length > 0 && unlocked.length > 0,
    };
  });

  favoriteStates = computed(() => {
    const docs = this.selectedDocuments();
    const favIds = this.favoriteDocIds();
    const inFavorites = docs.filter(doc => favIds.includes(doc.uid));
    const notInFavorites = docs.filter(doc => !favIds.includes(doc.uid));
    return {
      allFavorited: inFavorites.length > 0 && notInFavorites.length === 0,
      allUnfavorited: notInFavorites.length > 0 && inFavorites.length === 0,
      mixed: inFavorites.length > 0 && notInFavorites.length > 0,
    };
  });

  subscriptionStates = computed(() => {
    const docs = this.selectedDocuments();
    const subIds = this.subscribedDocIds();
    const subscribed = docs.filter(doc => subIds.includes(doc.uid));
    const unsubscribed = docs.filter(doc => !subIds.includes(doc.uid));
    return {
      allSubscribed: subscribed.length > 0 && unsubscribed.length === 0,
      allUnsubscribed: unsubscribed.length > 0 && subscribed.length === 0,
      mixed: subscribed.length > 0 && unsubscribed.length > 0,
    };
  });

  shareLinks = computed(() =>
    this.selectedDocuments().map(doc => ({
      uid: doc.uid,
      title: doc.title ?? doc.uid,
      link: this.shareLinkService.buildDocLink(doc.uid),
    }))
  );

  truncateTitle = (value: unknown) => truncateForTitle(value);

  readonly COLLECTIONS_TABLE_NAME = 'COLLECTIONS';

  tableConfig: TableColumn[] = [
    {
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      class: 'min-w-[30%]',
      asLink: true,
      visible: true,
    },
    { label: 'Typ', key: 'type', class: 'min-w-[20%]', visible: true },
    { label: 'Datum', key: 'Datum', sortField: NUXEO_SCHEMA_FIELDS.dc.modified, class: 'min-w-[20%]', visible: true },
    { label: 'Skapad av', key: 'Avsandare', class: 'min-w-[20%]', visible: true },
  ].map(column => ({ ...column, tableName: this.COLLECTIONS_TABLE_NAME }));

  tableItems = computed(() =>
    this.documents().map(doc => {
      const creatorName = doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.creator];

      return {
        id: doc.uid,
        title: truncateForTable(doc.title ?? '—'),
        type: doc.type ?? '—',
        Datum: this.getDate(doc.lastModified),
        Avsandare: creatorName || '—',
        link: ['/doc', doc.uid],
      };
    })
  );

  canViewPermissionsTab = computed(() => this.hasPermissionAccess());
  canEditCollection = computed(() => this.hasPermissionAccess());

  buttons = computed<ActionButton[]>(() => {
    const actions: ActionButton[] = [
      createButton(this.isSubscribed() ? 'unsubscribe' : 'subscribeChanges', () => this.toggleSubscription()),
      createButton('share', () => this.isCopyLinkDialogOpen.set(true)),
    ];

    if (this.canEditCollection()) {
      actions.push(
        createButton(this.isLockedByUser() ? 'unlock' : 'lock', () => this.toggleLockState()),
        createButton('trashCollection', () => this.onTrash())
      );
    }

    return actions;
  });

  tabs = computed<Tab[]>(() => {
    const base: Tab[] = [{ id: 'overview', title: 'Översikt' }];
    if (this.canViewPermissionsTab()) {
      base.push({ id: 'permissions', title: 'Behörigheter' });
    }
    return base;
  });

  constructor() {
    effect(() => {
      if (this.activeTabId() === 'permissions' && !this.canViewPermissionsTab()) {
        this.activeTabId.set('overview');
      }
    });
    effect(() => {
      const total = this.total();
      const pageSize = this.pageSize();
      const current = this.page();
      updateCurrentPage(this.page, total, pageSize);
      if (this.page() !== current) {
        this.reloadCollectionDocuments();
      }
    });
  }

  ngOnInit(): void {
    this.restorePageSize();
    const collectionId = this.route.snapshot.paramMap.get('id');
    if (collectionId) {
      this.loadCollection(collectionId);
    }
  }

  onEdit(): void {
    console.log('Work in progress');
  }

  onTrash(): void {
    const doc = this.fullCollectionDocument();
    if (!doc || !doc.uid) return;
    this.apiService.trashDocument(doc.uid).subscribe({
      next: () => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: COLLECTION_TRASHED_MESSAGE,
        });
        this.router.navigate(['/collections']);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: COLLECTION_TRASH_ERROR_MESSAGE,
        });
      },
    });
  }

  onNotification(): void {
    console.log('Work in progress');
  }

  onPageChange(newPage: number) {
    if (newPage === this.page()) return;
    this.page.set(newPage);
    this.reloadCollectionDocuments();
  }

  onPageSizeSelect(value: string | number) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    if (nextValue === this.pageSize()) return;
    this.pageSize.set(nextValue);
    this.page.set(0);
    this.reloadCollectionDocuments();
    const username = this.auth.username();
    if (username) {
      savePageSize(username, GLOBAL_PAGE_SIZE_KEY, nextValue);
    }
  }

  onSortChange(event: { sortBy: string; sortOrder: SortOrder }): void {
    this.tableSortService.applySortSignals(this.sortBy, this.sortOrder, event, {
      sortBy: NUXEO_SCHEMA_FIELDS.dc.modified,
      sortOrder: 'desc',
    });
    this.page.set(0);
    this.reloadCollectionDocuments();
  }

  onGridPageChange(newPage: number): void {
    this.onPageChange(newPage);
  }

  onGridPageSizeSelect(value: string | number): void {
    this.onPageSizeSelect(value);
  }

  private restorePageSize() {
    const username = this.auth.username();
    if (!username) return;
    const savedSize = loadPageSize(username, GLOBAL_PAGE_SIZE_KEY);
    if (savedSize != null) {
      this.pageSize.set(savedSize);
    }
  }

  toggleLockState() {
    const doc = this.fullCollectionDocument();
    if (!doc) return;

    this.lockService.toggleAndUpdate(doc, this.isLockedByUser).subscribe({
      next: updatedDoc => {
        this.fullCollectionDocument.set(updatedDoc);
        this.lockService.initLockState(updatedDoc, this.isLockedByUser);
      },
      error: () => {
        this.store.notification.set({ show: true, variation: 'danger', text: LOCK_GENERIC_ERROR_MESSAGE });
      },
    });
  }

  toggleSubscription(): void {
    const collection = this.collectionInfo();
    if (!collection) return;

    const documentId = collection.uid;
    const isCurrentlySubscribed = this.isSubscribed();

    const operation$ = isCurrentlySubscribed
      ? this.notificationService.unsubscribe(documentId)
      : this.notificationService.subscribe(documentId);

    operation$
      .pipe(
        tap(updatedDocument => {
          const stillSubscribed = this.notificationService.isUserSubscribed(updatedDocument, this.auth.username());
          this.isSubscribed.set(stillSubscribed);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: stillSubscribed ? SUBSCRIPTION_ENABLED_MESSAGE : SUBSCRIPTION_DISABLED_MESSAGE,
          });
        })
      )
      .subscribe({
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: SUBSCRIPTION_ERROR_MESSAGE,
          });
        },
      });
  }

  onTabChanged(tabId: string): void {
    this.activeTabId.set(tabId);
    if (tabId !== 'overview' && this.selectedFiles().length) {
      this.selectedFiles.set([]);
    }
  }

  onTableSelectionChange(ids: string[]): void {
    this.selectedFiles.set(ids);
  }

  removeSelectedFromCollection(): void {
    const collectionId = this.selectedCollectionId();
    const selectedIds = this.selectedFiles();
    if (!collectionId || !selectedIds.length) return;

    this.loading.set(true);
    this.apiService
      .removeDocumentFromCollection(collectionId, selectedIds)
      .pipe(
        tap(() => {
          this.page.set(0);
        }),
        switchMap(() =>
          this.apiService.getCollectionDocuments(
            collectionId,
            this.page(),
            this.pageSize(),
            this.sortBy(),
            this.sortOrder()
          )
        )
      )
      .subscribe({
        next: result => {
          this.documents.set(result.entries);
          this.total.set(result.totalSize ?? result.resultsCount ?? result.entries.length);
          this.selectedFiles.set([]);
          this.loading.set(false);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: COLLECTION_REMOVED_MESSAGE,
          });
        },
        error: () => {
          this.loading.set(false);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: COLLECTION_REMOVE_ERROR_MESSAGE,
          });
        },
      });
  }

  onBulkLock(): void {
    const ids = this.selectedFiles();
    if (!ids.length) return;
    const lockState = this.lockStates();
    const shouldLock = lockState.allUnlocked || lockState.mixed;

    this.bulkActions.toggleLock(ids, this.documents()).subscribe({
      next: updatedDocs => {
        this.documents.update(current => current.map(doc => updatedDocs.find(d => d.uid === doc.uid) ?? doc));
        const msg = shouldLock ? LOCK_LOCKED_MESSAGE : LOCK_UNLOCKED_MESSAGE;
        this.store.notification.set({ show: true, variation: 'success', text: msg, belowTopPanel: true });
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: LOCK_GENERIC_ERROR_MESSAGE,
          belowTopPanel: true,
        });
      },
    });
  }

  onBulkAddToFavorites(): void {
    const ids = this.selectedFiles();
    if (!ids.length) return;
    const shouldAddToFavorites = !this.favoriteStates().allFavorited;

    this.bulkActions.toggleFavorites(ids, this.favoriteDocIds()).subscribe({
      next: updatedFavIds => {
        this.favoriteDocIds.set(updatedFavIds);
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: shouldAddToFavorites ? FAVORITE_ADDED_MESSAGE : FAVORITE_REMOVED_MESSAGE,
          belowTopPanel: true,
        });
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: FAVORITE_UPDATE_ERROR_MESSAGE,
          belowTopPanel: true,
        });
      },
    });
  }

  onBulkSubscribe(): void {
    const ids = this.selectedFiles();
    if (!ids.length) return;
    const wasAllUnsubscribed = this.subscriptionStates().allUnsubscribed;
    const wasMixed = this.subscriptionStates().mixed;

    this.bulkActions.toggleSubscriptions(ids, this.subscribedDocIds()).subscribe({
      next: updatedSubIds => {
        this.subscribedDocIds.set(updatedSubIds);
        const msg = wasAllUnsubscribed || wasMixed ? SUBSCRIPTION_SUBSCRIBED_MESSAGE : SUBSCRIPTION_DISABLED_MESSAGE;
        this.store.notification.set({ show: true, variation: 'success', text: msg, belowTopPanel: true });
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: SUBSCRIPTION_ERROR_MESSAGE,
          belowTopPanel: true,
        });
      },
    });
  }

  onBulkShare(): void {
    if (!this.selectedFiles().length) return;
    this.isShareLinksDialogOpen.set(true);
  }

  private loadCollection(collectionId: string): void {
    this.selectedCollectionId.set(collectionId);
    this.selectedFiles.set([]);
    this.loading.set(true);
    this.page.set(0);

    this.apiService
      .getCollections()
      .pipe(
        switchMap(collections => {
          const selectedCollection = collections.find(collection => collection.uid === collectionId) ?? null;
          if (!selectedCollection) {
            return of(null);
          }

          return this.apiService.getDocumentWithAcls(collectionId).pipe(
            switchMap(fullDoc => {
              const collectionDetails: CollectionDetailsItem = {
                uid: fullDoc.uid,
                title: fullDoc.title ?? '(saknas)',
                date: fullDoc.lastModified ? new Date(fullDoc.lastModified) : new Date(),
                property: selectedCollection.property,
                state: fullDoc.state,
                changeToken: fullDoc.changeToken,
                created: fullDoc.properties?.[NUXEO_SCHEMA_FIELDS.dc.created],
                creator: formatUserFullName(fullDoc.properties?.[NUXEO_SCHEMA_FIELDS.dc.creator]),
                contributors: fullDoc.properties[NUXEO_SCHEMA_FIELDS.dc.contributors]?.map(val =>
                  formatUserFullName(val)
                ),
              };

              this.collectionInfo.set(collectionDetails);
              this.fullCollectionDocument.set(fullDoc);
              this.lockService.initLockState(fullDoc, this.isLockedByUser);

              this.isSubscribed.set(this.notificationService.isUserSubscribed(fullDoc, this.auth.username()));

              return of(fullDoc);
            })
          );
        })
      )
      .subscribe();

    this.loadCollectionDocuments(collectionId, this.page(), this.pageSize());
  }

  private loadCollectionDocuments(collectionId: string, page: number, pageSize: number): void {
    this.loading.set(true);
    this.apiService.getCollectionDocuments(collectionId, page, pageSize, this.sortBy(), this.sortOrder()).subscribe({
      next: (result: SearchResult) => {
        this.documents.set(result.entries);
        this.total.set(result.totalSize ?? result.resultsCount ?? result.entries.length);
        this.loading.set(false);
        this.loadFavoriteIds();
        const username = this.auth.username();
        const subIds = result.entries
          .filter(doc => this.notificationService.isUserSubscribed(doc, username))
          .map(doc => doc.uid);
        this.subscribedDocIds.set(subIds);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadFavoriteIds(): void {
    this.favoritesService
      .getFavoritesUid()
      .pipe(switchMap(favDoc => this.apiService.getCollectionDocuments(favDoc.uid, 0, this.pageSize())))
      .subscribe({
        next: result => this.favoriteDocIds.set(result.entries.map(e => e.uid)),
      });
  }

  private reloadCollectionDocuments(): void {
    const collectionId = this.selectedCollectionId();
    if (!collectionId) return;
    this.loadCollectionDocuments(collectionId, this.page(), this.pageSize());
  }

  private hasPermissionAccess(): boolean {
    const doc = this.fullCollectionDocument();
    const username = this.auth.username();
    if (!doc || !username) return false;

    const creatorRaw = doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.creator];
    const creator = creatorRaw == null ? '' : String(creatorRaw);
    if (creator && creator === username) return true;
    if (this.auth.isAdmin()) return true;

    const user = this.auth.user();
    const props = user?.properties ?? {};
    const groupsValue =
      'groups' in props
        ? props.groups
        : NUXEO_SCHEMA_FIELDS.user.groups in props
          ? props[NUXEO_SCHEMA_FIELDS.user.groups]
          : [];
    const groupIds = Array.isArray(groupsValue)
      ? groupsValue.map(entry => String(entry ?? '')).filter(entry => entry)
      : [];

    const aclsValue = doc.contextParameters?.acls ?? [];
    const acls = Array.isArray(aclsValue) ? aclsValue : [];
    const allowedPermissions = new Set(['everything', 'readwrite']);

    for (const acl of acls) {
      const entriesValue = acl.aces ?? acl.ace ?? [];
      const entries = Array.isArray(entriesValue) ? entriesValue : [];
      for (const ace of entries) {
        if (ace.grant === false || ace.granted === false) continue;

        const principalValue = ace.username;
        let principalId = '';
        if (principalValue instanceof Object) {
          if ('id' in principalValue) {
            principalId = String(principalValue['id'] ?? '');
          } else if ('groupname' in principalValue) {
            principalId = String(principalValue['groupname'] ?? '');
          } else if ('username' in principalValue) {
            principalId = String(principalValue['username'] ?? '');
          }
        } else {
          const raw = principalValue == null ? '' : String(principalValue);
          principalId = raw.includes(':') ? raw.split(':').slice(1).join(':') : raw;
        }
        if (!principalId) continue;
        const permissionRaw = ace.permission == null ? '' : String(ace.permission);
        const permission = permissionRaw.toLowerCase();
        if (!allowedPermissions.has(permission)) continue;
        if (principalId === username) return true;
        if (groupIds.includes(principalId)) return true;
      }
    }

    return false;
  }

  getDate(date: Date | string | null | undefined): string {
    return formatDateOrMissing(date);
  }

  copyLink() {
    this.shareLinkService.copyDocumentLink(this.fullCollectionDocument()?.uid, copied =>
      this.linkWasCopied.set(copied)
    );
  }

  onToggleButtonChange(activeButton: number) {
    const nextMode = activeButton === 1 ? 'grid' : 'table';
    this.viewMode.set(nextMode);
    if (nextMode !== 'table' && this.selectedFiles().length) {
      this.selectedFiles.set([]);
    }
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.tableConfig.map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: true,
    }));
  }
}
