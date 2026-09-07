import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { truncateForTitle } from '@app/shared/utils/text-utils';

import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { Router } from '@angular/router';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export interface CollectionCardItem {
  uid: string;
  title: string;
  date: Date;
  property: string;
}
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-collection-card',
  imports: [SvgIconComponent],
  templateUrl: './collection-card.component.html',
})
export class CollectionCardComponent {
  items = input<CollectionCardItem[]>([]);
  readonly store = inject(GeneralStore);
  apiService = inject(NuxeoApiService);
  router = inject(Router);
  // signals for state
  selectedCollectionId = signal<string | null>(null);
  documents = signal<NuxeoDocument[]>([]);
  loading = signal(false);

  truncateTitle = (value: unknown) => truncateForTitle(value);

  getDate(date: Date | string | null | undefined) {
    return formatDateOrMissing(date);
  }

  selectCollection(collectionId: string) {
    this.selectedCollectionId.set(collectionId);
    this.loading.set(true);

    this.apiService.getCollectionDocuments(collectionId).subscribe(res => {
      const documents = res.entries;
      this.documents.set(documents);
      this.loading.set(false);

      this.router.navigate(['/collections', collectionId], {
        state: { documents },
      });
    });
  }

  backToCollections() {
    this.selectedCollectionId.set(null);
    this.documents.set([]);
  }

  // ────────────────────────────── Table Config ──────────────────────────────
  tableConfig = [
    {
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      class: 'min-w-[30%]',
      asLink: true,
    },
    { label: 'Typ', key: 'type', class: 'min-w-[20%]' },
    { label: 'Datum', key: 'Datum', class: 'min-w-[20%]' },
  ];

  tableItems = computed(() =>
    this.documents().map(doc => ({
      id: doc.uid,
      title: doc.title ?? '—',
      type: doc.type ?? '—',
      Datum: this.getDate(doc.lastModified),
      Avsandare: '—', // optional: map more fields if needed
      link: ['/doc', doc.uid],
    }))
  );
}
