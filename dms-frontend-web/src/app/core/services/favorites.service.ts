import { inject, Injectable, signal } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { map, Observable, of, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  inFavorites = signal<boolean>(false);
  apiService = inject(NuxeoApiService);
  favoritesUid = signal<NuxeoDocument | null>(null);

  checkInFavorites(uid: string) {
    return this.getFavoritesUid().pipe(
      switchMap(result => this.apiService.getCollectionDocuments(result.uid)),
      map(favorites => {
        const favorite = favorites.entries.find(el => el.uid === uid);
        return !!favorite;
      })
    );
  }

  getFavoritesUid() {
    const favUid = this.favoritesUid();
    if (!favUid) {
      return this.apiService.fetchFavoritesUid();
    }
    return of(favUid);
  }

  toggleFavorites(uid: string, inFavorites: boolean): Observable<NuxeoDocument> {
    if (!inFavorites) {
      return this.apiService.addToFavorites(uid);
    } else {
      return this.apiService.removeFromFavorites(uid);
    }
  }
}
