import { Component, inject, OnInit } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import {
  CollectionCardComponent,
  CollectionCardItem,
} from '@app/shared/components/collection-card/collection-card.component';
import { DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
@Component({
  selector: 'nuxeo-collection-page',
  imports: [CollectionCardComponent, DigiNavigationBreadcrumbs],
  templateUrl: './collection-page.component.html',
})
export class CollectionPageComponent implements OnInit {
  private collectionService = inject(NuxeoApiService);
  items: CollectionCardItem[] = [];
  ngOnInit(): void {
    this.collectionService.getCollections().subscribe(data => {
      this.items = data;
    });
  }
}
