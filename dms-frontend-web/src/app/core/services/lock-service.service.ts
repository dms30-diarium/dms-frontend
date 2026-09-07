import { Injectable, inject } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { AuthService } from '@app/core/services/auth.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { Observable, switchMap, tap, throwError } from 'rxjs';
import {
  buildLockUnauthorizedMessage,
  LOCK_GENERIC_ERROR_MESSAGE,
  LOCK_LOCKED_MESSAGE,
  LOCK_UNLOCKED_MESSAGE,
} from '@app/shared/constants/notification-messages';

@Injectable({ providedIn: 'root' })
export class LockService {
  private api = inject(NuxeoApiService);
  private auth = inject(AuthService);
  private store = inject(GeneralStore);

  /**
   * Toggle lock + update component state + notify user
   */
  toggleAndUpdate(
    doc: NuxeoDocument<object>,
    isLockedByUser: { set: (value: boolean) => void },
    reloadEmitter?: { emit: () => void }
  ): Observable<NuxeoDocument> {
    const username = this.auth.username()?.toLowerCase();
    const owner = doc.lockOwner?.toLowerCase();
    const isAdmin = this.auth.isAdmin();
    const isOwner = owner === username;
    const isLocked = !!owner;
    let action$: Observable<NuxeoDocument>;

    if (isLocked) {
      if (isOwner || isAdmin) {
        action$ = this.api.unlockDocument(doc.uid);
      } else {
        this.showError(buildLockUnauthorizedMessage(doc.lockOwner));
        return throwError(() => new Error('Unauthorized unlock'));
      }
    } else {
      action$ = this.api.lockDocument(doc.uid);
    }

    return action$.pipe(
      switchMap(() => this.api.getDocumentById(doc.uid)),
      tap(updatedDoc => {
        const locked = updatedDoc.lockOwner?.toLowerCase() === username;
        isLockedByUser.set(locked);

        this.showSuccess(locked ? LOCK_LOCKED_MESSAGE : LOCK_UNLOCKED_MESSAGE);

        reloadEmitter?.emit();
      }),
      tap({
        error: () => this.showError(LOCK_GENERIC_ERROR_MESSAGE),
      })
    );
  }

  initLockState(doc: NuxeoDocument<object>, isLockedSignal: { set: (value: boolean) => void }) {
    isLockedSignal.set(doc.lockOwner ? true : false);
  }

  private showSuccess(text: string) {
    this.store.notification.set({ show: true, variation: 'success', text });
  }

  private showError(text: string) {
    this.store.notification.set({ show: true, variation: 'danger', text });
  }
}
