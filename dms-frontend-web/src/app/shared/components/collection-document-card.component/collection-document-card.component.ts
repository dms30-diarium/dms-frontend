import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { truncateForTitle } from '@app/shared/utils/text-utils';
import { ImageButtonComponent } from '@shared/components/image-button/image-button.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-collection-document-card',
  standalone: true,
  imports: [ImageButtonComponent, RouterLink],
  templateUrl: './collection-document-card.component.html',
})
export class CollectionDocumentCardComponent implements OnInit {
  // ─── Input ──────────────────────────────────────────────
  doc = input.required<NuxeoDocument>();

  // ─── Dependencies ───────────────────────────────────────
  private apiService = inject(NuxeoApiService);

  // ─── State ──────────────────────────────────────────────
  inFavorites = signal(false);
  inCollection = signal(false);

  // ─── UI Buttons ─────────────────────────────────────────
  buttons = computed(() => [
    createButton(this.inCollection() ? 'inCollection' : 'addToCollection', () => {
      if (this.inCollection()) {
        console.log('Document already in a collection (could remove/change here)');
      } else {
        this.apiService
          .addToCollectionByName('My Default Collection', [this.doc().uid])
          .pipe(tap(() => this.inCollection.set(true)))
          .subscribe();
      }
    }),
  ]);

  // ─── Helpers ────────────────────────────────────────────
  truncateTitle = (value: unknown) => truncateForTitle(value, 40);

  getDate(date: Date | string | null | undefined): string {
    return formatDateOrMissing(date);
  }

  getLastContributor(doc: NuxeoDocument): string {
    const value = doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.lastContributor];
    const props = value?.properties;
    const name = `${props?.firstName ?? ''} ${props?.lastName ?? ''}`.trim();
    return name || props?.username || value?.id || '—';
  }

  ngOnInit(): void {
    this.checkDocumentInCollections(this.doc().uid)
      .pipe(tap(inCollection => this.inCollection.set(inCollection)))
      .subscribe();
  }
  checkDocumentInCollections(documentId: string): Observable<boolean> {
    return this.apiService.getCollections().pipe(
      switchMap(collections => {
        if (!collections.length) return of([]); // ✅ return empty array instead of false

        // fetch documents in all collections
        return forkJoin(
          collections.map(col =>
            this.apiService
              .getCollectionDocuments(col.uid)
              .pipe(map(res => res.entries.some(entry => entry.uid === documentId)))
          )
        );
      }),
      map((results: boolean[]) => results.some(found => found)) // true if in any collection
    );
  }
}
