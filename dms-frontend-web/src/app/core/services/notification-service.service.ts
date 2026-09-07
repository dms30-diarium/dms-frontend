import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import {
  SUBSCRIPTION_SUBSCRIBED_MESSAGE,
  SUBSCRIPTION_UNSUBSCRIBED_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { GeneralStore } from './general-store.service';

export interface NuxeoNotification {
  name: string;
  subscribers: string[];
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private api = inject(NuxeoApiService);
  private store = inject(GeneralStore);

  subscribe(docId: string): Observable<NuxeoDocument> {
    return this.api
      .executeNuxeoOperation<void>('Document.Subscribe', {
        input: docId,
        params: {},
        context: {},
      })
      .pipe(
        switchMap(() => this.api.getDocumentById(docId, true)),
        tap(() => this.showSuccess(SUBSCRIPTION_SUBSCRIBED_MESSAGE))
      );
  }

  unsubscribe(docId: string): Observable<NuxeoDocument> {
    return this.api
      .executeNuxeoOperation<void>('Document.Unsubscribe', {
        input: docId,
        params: {},
        context: {},
      })
      .pipe(
        switchMap(() => this.api.getDocumentById(docId, true)),
        tap(() => this.showSuccess(SUBSCRIPTION_UNSUBSCRIBED_MESSAGE))
      );
  }

  isUserSubscribed(documentItem: NuxeoDocument | null | undefined, usernameValue: string | null): boolean {
    if (!documentItem || !usernameValue) {
      return false;
    }

    const rawNotifications = documentItem.properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
    const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];

    const currentUserRef = `user:${usernameValue}`.toLowerCase();

    return notifications.some(notificationItem =>
      (notificationItem.subscribers ?? []).some(subscriber => subscriber.toLowerCase() === currentUserRef)
    );
  }

  private showSuccess(text: string) {
    this.store.notification.set({ show: true, variation: 'success', text });
  }
}
