import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { switchMap, tap } from 'rxjs';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

type FavoriteCategory = 'arende' | 'handling' | 'utkast' | 'other';

interface FavoriteRow {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  link: string[];
  category: FavoriteCategory;
}

interface FavoriteGroups {
  arende: FavoriteRow[];
  handling: FavoriteRow[];
  utkast: FavoriteRow[];
  other: FavoriteRow[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-favorites',
  imports: [RouterModule, DigiArbetsformedlingenAngularModule, CaseListTableComponent],
  templateUrl: './favorites.component.html',
})
export class FavoritesComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  readonly generalStore = inject(GeneralStore);
  favoriteDocs = signal<NuxeoDocument[]>([]);
  entries = computed<FavoriteRow[]>(() => this.favoriteDocs().map(doc => this.mapFavoriteRow(doc)));

  private readonly baseColumnConfig: Omit<TableColumn, 'tableName'>[] = [
    {
      label: 'Titel eller filnamn',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      class: 'w-[45%]',
      asLink: true,
      visible: true,
    },
    {
      label: 'Typ',
      key: 'typeLabel',
      class: 'w-[45%]',
      visible: true,
      inputConfig: { type: 'textWithIcon' as const },
    },
  ];

  readonly arendeTableConfig = this.buildTableConfig('FAVORITES_ARENDE');
  readonly handlingTableConfig = this.buildTableConfig('FAVORITES_HANDLING');
  readonly utkastTableConfig = this.buildTableConfig('FAVORITES_UTKAST');
  readonly otherTableConfig = this.buildTableConfig('FAVORITES_OTHER');

  readonly groupedEntries = computed<FavoriteGroups>(() => {
    const groups: FavoriteGroups = {
      arende: [],
      handling: [],
      utkast: [],
      other: [],
    };
    for (const entry of this.entries()) {
      groups[entry.category].push(entry);
    }
    return groups;
  });

  readonly arendeEntries = computed(() => this.groupedEntries().arende);
  readonly handlingEntries = computed(() => this.groupedEntries().handling);
  readonly utkastEntries = computed(() => this.groupedEntries().utkast);
  readonly otherEntries = computed(() => this.groupedEntries().other);

  readonly arendeTotal = computed(() => this.arendeEntries().length);
  readonly handlingTotal = computed(() => this.handlingEntries().length);
  readonly utkastTotal = computed(() => this.utkastEntries().length);
  readonly otherTotal = computed(() => this.otherEntries().length);

  // client-side grouping only, no pagination

  ngOnInit(): void {
    this.getFavorites();
  }

  getFavorites() {
    this.nuxeoApi
      .fetchFavoritesUid()
      .pipe(
        switchMap(data => this.nuxeoApi.getCollectionDocuments(data.uid)),
        tap(data => {
          this.favoriteDocs.set(data.entries);
        })
      )
      .subscribe();
  }

  removeFromFavorites(item: FavoriteRow) {
    if (!item.id) return;
    this.nuxeoApi
      .removeFromFavorites(item.id)
      .pipe(tap(() => this.getFavorites()))
      .subscribe();
  }

  getDefaultColumnOptions(tableConfig: TableColumn[]): TableColOption[] {
    return tableConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: true,
    }));
  }

  private buildTableConfig(tableName: string): TableColumn[] {
    return this.baseColumnConfig.map(col => ({ ...col, tableName }));
  }

  private mapFavoriteRow(doc: NuxeoDocument): FavoriteRow {
    return {
      id: doc.uid,
      title: doc.title ?? '',
      type: doc.type,
      typeLabel: this.resolveTypeLabel(doc.type),
      link: ['/doc', doc.uid],
      category: this.resolveCategory(doc.type),
    };
  }

  private resolveCategory(docType: string): FavoriteCategory {
    if (docType === 'Arende') return 'arende';
    if (docType === 'Handling') return 'handling';
    if (docType === 'Utkast') return 'utkast';
    return 'other';
  }

  private resolveTypeLabel(docType: string): string {
    const messages = this.generalStore.messagesInfo();
    const key = `label.document.type.${docType.toLowerCase()}`;
    const label = messages?.[key];
    return label ?? docType ?? '';
  }

  // pagination removed for favorites
}
