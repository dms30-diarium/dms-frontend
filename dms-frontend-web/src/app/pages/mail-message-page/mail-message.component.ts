import { Component, computed, effect, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { NuxeoDocument, NxBlobLike } from '@app/shared/api/nuxeo-api.types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import { UtkastDialogComponent } from '@app/shared/components/utkast-dialog/utkast-dialog.component';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { AssignCollectionModalComponent } from '@app/shared/components/assign-collection-modal.component/assign-collection-modal.component';
import { ButtonMenuComponent } from '@app/shared/components/button-menu.component/button-menu.component';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';

import { AuthService } from '@app/core/services/auth.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { LockService } from '@app/core/services/lock-service.service';
import { NotificationService, NuxeoNotification } from '@app/core/services/notification-service.service';
import { ShareLinkService } from '@app/core/services/share-link.service';

import { DigiIconPen, DigiDialog, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { EMPTY, catchError, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { CreateHandlingFromMail } from '@app/shared/components/forms/create-handling-from-mail/create-handling-from-mail.component';
import { Option } from '@app/shared/commonTypes';
import { BaseButton, GeneralStore } from '@app/core/services/general-store.service';
import {
  FAVORITE_ADDED_MESSAGE,
  FAVORITE_REMOVED_MESSAGE,
  FAVORITE_UPDATE_ERROR_MESSAGE,
  SUBSCRIPTION_DISABLED_MESSAGE,
  SUBSCRIPTION_ENABLED_MESSAGE,
  SUBSCRIPTION_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';

export interface FileAttachment {
  uid?: string;
  file?: NxBlobLike;
}
@Component({
  selector: 'nuxeo-mail-message',
  imports: [
    RouterModule,
    PdfViewerComponent,
    DigiIconPen,
    DigiDialog,
    UtkastDialogComponent,
    DigiArbetsformedlingenAngularModule,
    NavigationBreadComponent,
    AssignCollectionModalComponent,
    ButtonMenuComponent,
    CreateHandlingFromMail,
  ],
  templateUrl: './mail-message.component.html',
})
export class MailMessageComponent implements OnInit, OnDestroy {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  apiService = inject(NuxeoApiService);
  router = inject(Router);
  readonly nuxeoApi = inject(NuxeoApiService);
  favoritesService = inject(FavoritesService);
  lockService = inject(LockService);
  auth = inject(AuthService);
  store = inject(GeneralStore);
  notificationService = inject(NotificationService);
  shareLinkService = inject(ShareLinkService);

  document = input.required<NuxeoDocument>();
  reloadDocument = output();

  isLockedByUser = signal<boolean>(false);
  previewAttachment = signal<NxBlobLike | null>(null);
  isSendForApprovalOpened = signal<string | null>(null);
  inFavorites = signal<boolean>(false);
  inCollection = signal<boolean>(false);
  isAssignCollectionOpened = signal<string[] | null>(null);
  isCreateHandlingOpen = signal<boolean>(false);
  isSubscribed = signal<boolean>(false);
  baseButtons = signal<BaseButton[]>([]);
  isCopyLinkDialogOpen = signal<boolean>(false);
  linkWasCopied = signal<boolean>(false);

  documentLink = computed(() => this.shareLinkService.buildDocLink(this.document().uid));

  mimeType = '';
  attachments = signal<FileAttachment[]>([]);
  attachmentsOptions = signal<Option[]>([]);
  blobUrl = '';
  role = this.auth.activeRole();

  buttons = computed(() => {
    return [
      createButton('createHandlingFromMail', () => this.isCreateHandlingOpen.set(true)),
      createButton('clear', () => this.deleteDocument()),
    ];
  });

  constructor() {
    effect(() => {
      const files = this.document().properties[NUXEO_SCHEMA_FIELDS.files.files] ?? [];
      const withUid = files.map(el => {
        const uid = el?.file?.blobUrl?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
        return { ...el, uid };
      });
      this.attachments.set(withUid);
    });

    effect(() => {
      this.attachmentsOptions.set(
        this.attachments().map((el, idx) => ({
          id: `attachment-${idx}`,
          label: el.file?.name ?? `Bilaga ${idx + 1}`,
        }))
      );
    });

    effect(() => {
      this.setBaseButtons();
    });
  }

  ngOnInit(): void {
    this.lockService.initLockState(this.document(), this.isLockedByUser);

    const files = this.document().properties[NUXEO_SCHEMA_FIELDS.files.files] ?? [];
    const first = files[0]?.file;
    this.mimeType = first?.['mime-type'] ?? '';
    this.blobUrl = first?.blobUrl ?? '';

    this.favoritesService
      .checkInFavorites(this.document().uid)
      .pipe(tap(result => this.inFavorites.set(result)))
      .subscribe();

    const rawNotifications = this.document().properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
    const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];
    this.isSubscribed.set(this.isUserSubscribed(notifications));

    this.setBaseButtons();
    this.store.baseButtons.set(this.baseButtons());
    this.store.openPage.set('mail');
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }

  onCreateHandling() {
    this.nuxeoApi
      .createHandlingFromUtkast(this.document().uid)
      .pipe(tap(result => this.router.navigate(['/doc/', result.uid])))
      .subscribe();
  }

  isPicture(doc: NuxeoDocument): boolean {
    return doc.facets.includes('Picture');
  }

  getDate(date: string | Date | undefined | null): string {
    return formatDateOrMissing(date);
  }

  getUserName(user: {
    properties?: { firstName?: string; lastName?: string; username?: string };
    id?: string;
  }): string {
    if (!user || typeof user === 'string') return '';
    const firstName = user.properties?.firstName ?? '';
    const lastName = user.properties?.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    if (user.properties?.username) return user.properties.username;
    if (user.id) return user.id;
    return '';
  }

  deleteDocument() {
    this.nuxeoApi.deleteDocument(this.document().uid).subscribe();
    this.router.navigate(['']);
  }

  deleteAttachment(idx: number) {
    this.nuxeoApi.deleteAttachment(idx, this.document().uid).subscribe(() => this.reloadDocument.emit());
  }

  checkInCollection() {
    this.checkDocumentInCollections(this.document().uid)
      .pipe(tap(inCollection => this.inCollection.set(inCollection)))
      .subscribe();
  }

  checkDocumentInCollections(documentId: string): Observable<boolean> {
    return this.apiService.getCollections().pipe(
      switchMap(collections => {
        if (!collections.length) return of([]);

        // fetch documents in all collections
        return forkJoin(
          collections.map(col =>
            this.apiService
              .getCollectionDocuments(col.uid)
              .pipe(map(res => res.entries.some(entry => entry.uid === documentId)))
          )
        );
      }),
      map((results: boolean[]) => results.some(found => found))
    );
  }

  onEdit(): void {
    console.log('Edit action triggered');
  }

  onShare(): void {
    this.isCopyLinkDialogOpen.set(true);
  }

  copyLink() {
    this.shareLinkService.copyDocumentLink(this.document().uid, copied => this.linkWasCopied.set(copied));
  }

  toggleLockState() {
    this.lockService.toggleAndUpdate(this.document(), this.isLockedByUser, this.reloadDocument).subscribe();
  }

  onMore(): void {
    console.log('More action triggered');
  }

  getRecipients(): string {
    const recipients = this.document().properties[NUXEO_SCHEMA_FIELDS.mail.recipients];
    return Array.isArray(recipients) ? recipients.join(', ') : '';
  }
  getMailSendingDate(): string {
    const rawDate = this.document().properties[NUXEO_SCHEMA_FIELDS.mail.sendingDate];

    return this.getDate(typeof rawDate === 'string' || rawDate instanceof Date ? rawDate : null);
  }

  getArendenummer(): string {
    const data = this.document().properties[NUXEO_SCHEMA_FIELDS.dms_mail.extraheradeData];
    if (data && typeof data === 'object' && 'arendenummer' in data && typeof data['arendenummer'] === 'object') {
      const value = data.arendenummer?.varde;
      return typeof value === 'string' ? value : '';
    }
    return '';
  }

  private setBaseButtons(): void {
    const lockPreset = this.isLockedByUser() ? 'unlock' : 'lock';
    const favoritePreset = this.inFavorites() ? 'favoriteActive' : 'favorite';
    const notifyPreset = this.isSubscribed() ? 'stopNotify' : 'notify';
    const buttons: BaseButton[] = [
      createButton('share', () => this.onShare()),
      createButton(lockPreset, () => this.toggleLockState()),
      createButton(favoritePreset, () =>
        this.favoritesService
          .toggleFavorites(this.document().uid, this.inFavorites())
          .pipe(
            tap(() => {
              const nowInFavorites = !this.inFavorites();
              this.inFavorites.set(nowInFavorites);

              this.store.notification.set({
                show: true,
                variation: 'success',
                text: nowInFavorites ? FAVORITE_ADDED_MESSAGE : FAVORITE_REMOVED_MESSAGE,
              });
            }),
            catchError(() => {
              this.store.notification.set({
                show: true,
                variation: 'danger',
                text: FAVORITE_UPDATE_ERROR_MESSAGE,
              });
              return EMPTY;
            })
          )
          .subscribe()
      ),
      createButton('collection', () => this.isAssignCollectionOpened.set([this.document().uid])),
      createButton(notifyPreset, () => this.toggleSubscription()),
    ];

    this.baseButtons.set(buttons);
    this.store.baseButtons.set(buttons);
  }

  toggleSubscription(): void {
    const currentDocument = this.document();
    const documentId = currentDocument.uid;
    const isCurrentlySubscribed = this.isSubscribed();

    const operation$ = isCurrentlySubscribed
      ? this.notificationService.unsubscribe(documentId)
      : this.notificationService.subscribe(documentId);

    operation$
      .pipe(
        tap(updatedDocument => {
          const rawNotifications = updatedDocument.properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
          const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];

          const stillSubscribed = this.isUserSubscribed(notifications);

          this.isSubscribed.set(stillSubscribed);
          this.reloadDocument.emit();

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

  private isUserSubscribed(notifications: NuxeoNotification[]): boolean {
    const username = this.auth.username();
    if (!username) return false;

    const currentUserRef = `user:${username}`.toLowerCase();

    return notifications.some(notification =>
      (notification.subscribers ?? []).some(sub => sub.toLowerCase() === currentUserRef)
    );
  }
}
