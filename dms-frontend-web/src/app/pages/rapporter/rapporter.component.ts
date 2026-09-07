import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { TabsComponent, Tab } from '@shared/components/tabs/tabs.component';
import { CaseListTableComponent } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableItem } from '@app/shared/models/case-table';
import { inject } from '@angular/core';
import { TableSortService } from '@app/core/services/table-sort.service';
import { RapporterTableConfigProvider } from './constants';

@Component({
  selector: 'nuxeo-rapporter',
  standalone: true,
  imports: [DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs, TabsComponent, CaseListTableComponent],
  templateUrl: './rapporter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RapporterComponent {
  private readonly tableSortService = inject(TableSortService);
  readonly tableConfigProvider = inject(RapporterTableConfigProvider);

  readonly tabs: Tab[] = [
    { id: 'jk-lista', title: 'JK-lista' },
    { id: 'postlista', title: 'Postlista' },
    { id: 'forteckning', title: 'Förteckning' },
  ];

  activeTabId = signal<string>('jk-lista');
  openCasesRows = signal<TableItem[]>([]);
  openCasesTotal = signal<number>(0);
  openCasesLoading = signal<boolean>(false);
  openCasesPage = signal<number>(0);
  openCasesPageSize = signal<number>(25);
  openCasesSortBy = signal<string>('');
  openCasesSortOrder = signal<'asc' | 'desc'>('desc');
  postlistaRows = signal<TableItem[]>([]);
  postlistaTotal = signal<number>(0);
  postlistaLoading = signal<boolean>(false);
  postlistaPage = signal<number>(0);
  postlistaPageSize = signal<number>(25);
  postlistaSortBy = signal<string>('');
  postlistaSortOrder = signal<'asc' | 'desc'>('desc');

  onTabChanged(tabId: string): void {
    this.activeTabId.set(tabId);
    if (tabId === 'jk-lista') {
      this.openCasesPage.set(0);
    }
    if (tabId === 'postlista') {
      this.postlistaPage.set(0);
    }
  }

  onOpenCasesPageChange(page: number): void {
    this.openCasesPage.set(page);
  }

  onOpenCasesSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.tableSortService.applySortSignals(this.openCasesSortBy, this.openCasesSortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });

    this.openCasesPage.set(0);
  }

  onPostlistaPageChange(page: number): void {
    this.postlistaPage.set(page);
  }

  onPostlistaSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.tableSortService.applySortSignals(this.postlistaSortBy, this.postlistaSortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });

    this.postlistaPage.set(0);
  }
}
