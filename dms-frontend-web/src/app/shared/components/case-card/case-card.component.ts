import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CasesService } from '@app/core/services/cases.service';
import { TableItem } from '@app/shared/models/case-table';
import { DigiBadgeStatus } from '@designsystem-se/af-angular';
import type { TableColumn } from '../case-list-table/case-list-table.component';

@Component({
  selector: 'nuxeo-case-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, DigiBadgeStatus],
  templateUrl: './case-card.component.html',
})
export class CaseCardComponent {
  caseData = input<TableItem | null>(null);
  columns = input<TableColumn[]>([]);
  tab = input<string>('');
  readonly casesService = inject(CasesService);
  private router = inject(Router);

  usesLegacyCaseLayout(): boolean {
    return this.tab() === 'my-cases' || this.tab() === 'my-co-handled-cases';
  }

  getTitleColumn(): TableColumn | null {
    if (this.usesLegacyCaseLayout()) return null;
    const visibleColumns = this.getVisibleColumns();
    return visibleColumns.find(col => col.asLink) ?? visibleColumns.find(col => col.key === 'title') ?? null;
  }

  getTitle(): string {
    const item = this.caseData();
    const titleColumn = this.getTitleColumn();
    if (!item) return '';
    return titleColumn ? this.getValue(titleColumn) : String(item['title'] ?? '');
  }

  getHeaderDate(): string {
    if (this.usesLegacyCaseLayout()) return String(this.caseData()?.['created'] ?? '');

    const dateColumn = this.getVisibleColumns().find(col => this.isDateColumn(col));
    return dateColumn ? this.getValue(dateColumn) : '';
  }

  getCardFields(): TableColumn[] {
    const titleColumn = this.getTitleColumn();
    const statusColumn = this.getStatusColumn();
    return this.getVisibleColumns()
      .filter(col => col.key !== titleColumn?.key)
      .filter(col => col.key !== statusColumn?.key)
      .slice(0, 6);
  }

  getCaseStatus(): string {
    const item = this.caseData();
    if (this.usesLegacyCaseLayout()) {
      const candidate = item?.['arendestatus'] ?? item?.['status'] ?? item?.['handlaggningsstatus'] ?? '';
      return String(candidate).trim() || '';
    }

    const statusColumn = this.getStatusColumn();
    if (statusColumn) {
      return this.getValue(statusColumn).trim();
    }

    const type = String(item?.['type'] ?? '').trim();
    const stateTypes = new Set(['Utkast', 'MailMessage', 'Importorfil']);
    if (stateTypes.has(type)) {
      return String(item?.['state'] ?? '').trim() || '';
    }

    const candidate = item?.['arendestatus'] ?? item?.['status'] ?? item?.['handlaggningsstatus'] ?? '';
    return String(candidate).trim() || '';
  }

  getCaseStatusColor() {
    return this.casesService.getStatusColor(this.getCaseStatus());
  }

  getCaseStatusVariation() {
    return this.casesService.getStatusVariation(this.getCaseStatus());
  }

  getCaseStatusLabel(): string {
    return this.casesService.getStatusLabel(this.getCaseStatus()) || '';
  }

  openDocument(uid: string): void {
    if (!uid) return;
    this.router.navigate(['/doc/', uid]);
  }

  getValue(col: TableColumn): string {
    const item = this.caseData();
    if (!item) return '';

    const raw = typeof col.formatter === 'function' ? col.formatter(item[col.key], item) : item[col.key];
    if (raw == null || raw === '') return '—';
    if (Array.isArray(raw)) return raw.length ? String(raw[0]) : '—';
    return String(raw);
  }

  private getVisibleColumns(): TableColumn[] {
    return this.columns().filter(col => col.key !== 'actions' && (col.visible ?? true));
  }

  private getStatusColumn(): TableColumn | null {
    return this.getVisibleColumns().find(col => this.isStatusColumn(col)) ?? null;
  }

  private isStatusColumn(col: TableColumn): boolean {
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    return key.includes('status') || key.includes('state');
  }

  private isDateColumn(col: TableColumn): boolean {
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    return col.searchInputType === 'date' || key.includes('date') || key.includes('datum') || key === 'created';
  }
}
