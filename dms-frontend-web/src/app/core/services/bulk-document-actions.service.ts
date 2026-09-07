import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

@Injectable({ providedIn: 'root' })
export class BulkDocumentActionsService {
  private api = inject(NuxeoApiService);

  toggleLock(ids: string[], docs: NuxeoDocument[]): Observable<NuxeoDocument[]> {
    const selectedDocs = docs.filter(doc => ids.includes(doc.uid));
    const locked = selectedDocs.filter(doc => doc.lockOwner);
    const unlocked = selectedDocs.filter(doc => !doc.lockOwner);
    const allLocked = locked.length === selectedDocs.length;

    const operations = allLocked
      ? selectedDocs.map(doc => this.api.unlockDocument(doc.uid))
      : unlocked.map(doc => this.api.lockDocument(doc.uid));

    return forkJoin(operations);
  }

  toggleFavorites(ids: string[], favoriteDocIds: string[]): Observable<string[]> {
    const alreadyFavorited = ids.filter(id => favoriteDocIds.includes(id));
    const notYetFavorited = ids.filter(id => !favoriteDocIds.includes(id));
    const allFavorited = alreadyFavorited.length === ids.length;
    const allUnfavorited = notYetFavorited.length === ids.length;
    const idsToAdd = allUnfavorited ? ids : notYetFavorited;

    const operations = allFavorited
      ? ids.map(id => this.api.removeFromFavorites(id))
      : idsToAdd.map(id => this.api.addToFavorites(id));

    return forkJoin(operations).pipe(
      map(() => {
        if (allFavorited) return favoriteDocIds.filter(id => !ids.includes(id));
        return [...new Set([...favoriteDocIds, ...ids])];
      })
    );
  }

  toggleSubscriptions(ids: string[], subscribedDocIds: string[]): Observable<string[]> {
    const alreadySubscribed = ids.filter(id => subscribedDocIds.includes(id));
    const notYetSubscribed = ids.filter(id => !subscribedDocIds.includes(id));
    const allSubscribed = alreadySubscribed.length === ids.length;
    const allUnsubscribed = notYetSubscribed.length === ids.length;
    const idsToSubscribe = allUnsubscribed ? ids : notYetSubscribed;

    const operations = allSubscribed
      ? ids.map(id => this.api.executeNuxeoOperation('Document.Unsubscribe', { input: id, params: {}, context: {} }))
      : idsToSubscribe.map(id =>
          this.api.executeNuxeoOperation('Document.Subscribe', { input: id, params: {}, context: {} })
        );

    return forkJoin(operations).pipe(
      map(() => {
        if (allSubscribed) return subscribedDocIds.filter(id => !ids.includes(id));
        return [...new Set([...subscribedDocIds, ...ids])];
      })
    );
  }
}
