import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CollectionCardItem } from '../collection-card/collection-card.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';

export interface CollectionDetailsItem extends CollectionCardItem {
  state?: string;
  changeToken?: string;
  contributors?: string[];
  created?: string;
  creator?: string;
  lastContributor?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-collection-details',
  imports: [],
  templateUrl: './collection-details.component.html',
})
export class CollectionDetailsComponent {
  collection = input.required<CollectionDetailsItem | null>();

  readonly getUserFullName = formatUserFullName;

  properties = computed(() => ({
    title: this.collection()?.title ?? '—',
    state: this.collection()?.state ?? '—',
    changeToken: this.collection()?.changeToken ?? '—',
    lastModified: this.collection()?.date ?? '—',
    created: this.collection()?.created ?? '—',
    creator: this.collection()?.creator ?? '—',
    contributors: this.collection()?.contributors ?? [],
    lastContributor: this.collection()?.lastContributor ?? '—',
  }));

  getDate(date: string | Date | undefined | null): string {
    return formatDateOrMissing(date);
  }
}
