import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  WritableSignal,
} from '@angular/core';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '../../case-list-table/case-list-table.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { map, tap } from 'rxjs';
import { Option } from '@app/shared/commonTypes';
import { RefsButtonWithDialogComponent } from '../refs-button-with-dialog/refs-button-with-dialog.component';
import { TableItem } from '@app/shared/models/case-table';
import { TableColOption } from '../../table-col-options/table-col-options.component';
import { SearchResult, NxUser, ContactEntry } from '@app/shared/api/nuxeo-api.types';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { CommonModule } from '@angular/common';

export interface ArendeRefOption {
  id?: string | null;
  caseRef?: string | null;
  type?: string | null;
  comment?: string | null;
  displayType?: string;
  caseTitle?: string;
  caseNumber?: string;
  status?: string;
  date?: string;
  responsibleOfficer?: string;
  handlingNumber?: string | null;
  handlingTitle?: string;
  displayCase?: string;
  counterparty?: string;
  riktning?: string;
  link?: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-case-reference',
  imports: [DigiArbetsformedlingenAngularModule, CaseListTableComponent, RefsButtonWithDialogComponent, CommonModule],
  templateUrl: './case-reference.component.html',
})
export class CaseReferenceComponent implements OnInit {
  tableFields = input.required<WritableSignal<ArendeRefOption[]>>();
  references = this.tableFields;
  refType = input.required<'Handling' | 'Arende'>();
  parentRef = input.required<string>();
  fieldName = input.required<string>();
  shouldShowTable = input<boolean>(true);
  saveReferences = output();

  apiService = inject(NuxeoApiService);
  valueService = inject(DocumentValueService);

  typeOptions = signal<Option[]>([]);
  caseOptions = signal<Option[]>([]);

  customColumnConfig = computed<TableColumn[]>(() => {
    const isArende = this.refType() === 'Arende';
    const tableName = isArende ? 'REFERENCE_ARENDE' : 'REFERENCE_HANDLING';

    const baseCols: Omit<TableColumn, 'tableName'>[] = isArende
      ? [
          { label: 'Ärendenummer', key: 'caseNumber', asLink: true, visible: true },
          { label: 'Ärendemening', key: 'caseTitle', visible: true, class: 'min-w-[200px] max-w-[200px] truncate' },
          {
            label: 'Referenstyp',
            key: 'type',
            inputConfig: { type: 'dropdown', options: this.typeOptions() },
            visible: true,
            class: 'min-w-[200px]',
          },
          { label: 'Referenskommentar', key: 'comment', inputConfig: { type: 'input' }, visible: true },
          { label: 'Motpart', key: 'counterparty', visible: true },
          { label: 'Status', key: 'status', visible: true },
          { label: 'Datum', key: 'date', visible: true },
          { label: 'Ansvarig handläggare', key: 'responsibleOfficer', visible: true },
          { label: 'Avdelning/enhet', key: 'departmentUnit', visible: true },
        ]
      : [
          { label: 'Handlingsnummer', key: 'handlingNumber', asLink: true, visible: true },
          { label: 'Handlingsnamn', key: 'handlingTitle', visible: true },
          {
            label: 'Referenstyp',
            key: 'type',
            inputConfig: { type: 'dropdown', options: this.typeOptions() },
            visible: true,
          },
          { label: 'Referenskommentar', key: 'comment', inputConfig: { type: 'input' }, visible: true },
          { label: 'Avsändare/Mottagare', key: 'counterparty', visible: true },
          { label: 'Riktning', key: 'riktning', visible: true },
          { label: 'Datum', key: 'date', visible: true },
          { label: 'Ansvarig handläggare', key: 'responsibleOfficer', visible: true },
        ];

    return baseCols.map(col => ({ ...col, tableName }));
  });

  ngOnInit(): void {
    this.getReferenstypSuggestions();
    this.getSuggestions();
    this.updateTableData();
  }

  updateEditedData(e: TableItem[]) {
    this.references().set(e);
  }

  updateTableData() {
    const uids: string[] = this.references()().reduce<string[]>((acc, el) => {
      if (el.caseRef) acc.push(el.caseRef);
      return acc;
    }, []);

    if (uids.length > 0) this.getDataForTable(uids);
  }

  private isContactEntry(v: unknown): v is ContactEntry {
    if (typeof v !== 'object' || v === null) return false;
    const o = v;
    return 'namn' in o || 'email' in o || 'telefon' in o;
  }

  private extractNames(value: unknown): string {
    if (Array.isArray(value)) {
      return value
        .map(el => {
          if (typeof el === 'string') return el;
          if (this.isContactEntry(el) && typeof el.namn === 'string') return el.namn;
          return '';
        })
        .filter(Boolean)
        .join(', ');
    }
    if (typeof value === 'string') return value;
    return '';
  }

  private getDataForTable(uids: string[]) {
    this.apiService
      .getSeveralDocsByUids(uids)
      .pipe(
        tap((data: SearchResult) => {
          const updatedRefs: ArendeRefOption[] = [];

          this.references()().forEach(ref => {
            const found = data.entries.find(d => d.uid === ref.caseRef);

            if (!found) return;

            if (this.refType() === 'Arende') {
              const arendeProps = found.properties;
              updatedRefs.push({
                ...ref,
                caseNumber: arendeProps[NUXEO_SCHEMA_FIELDS.arende.arendenummer] ?? '—',
                caseTitle: arendeProps[NUXEO_SCHEMA_FIELDS.arende.arendemening] ?? found.title ?? '—',
                status: this.valueService.getDirectoryLabel(arendeProps[NUXEO_SCHEMA_FIELDS.arende.arendestatus]),
                date: this.valueService.getDate(arendeProps[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
                responsibleOfficer: this.safeUser(arendeProps[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]),
                counterparty: found.properties[NUXEO_SCHEMA_FIELDS.case.counterparty] ?? '',
                link: ['/doc', found.uid],
              });
            } else {
              const handlingProps = found.properties;
              const avs = this.extractNames(handlingProps[NUXEO_SCHEMA_FIELDS.handling.avsandare]);
              const mott = this.extractNames(handlingProps[NUXEO_SCHEMA_FIELDS.handling.mottagare]);

              updatedRefs.push({
                ...ref,
                handlingNumber: handlingProps[NUXEO_SCHEMA_FIELDS.handling.handlingsnummer] ?? '',
                handlingTitle: handlingProps[NUXEO_SCHEMA_FIELDS.handling.handlingsnamn] ?? found.title ?? '—',
                counterparty: [avs, mott].filter(Boolean).join(' / '),
                riktning: this.valueService.getDirectoryLabel(
                  handlingProps[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]
                ),
                date: this.valueService.getDate(
                  handlingProps[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum] ??
                    handlingProps[NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum]
                ),
                responsibleOfficer: this.safeUser(handlingProps[NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]),
                link: ['/doc', found.uid],
              });
            }
          });

          this.references().set(updatedRefs);
        })
      )
      .subscribe();
  }

  private getReferenstypSuggestions() {
    this.apiService
      .getDirectorySuggestions('Referenstyp')
      .pipe(
        tap(options => {
          this.typeOptions.set(options.map(el => ({ label: el.label!, id: el.id })));
        })
      )
      .subscribe();
  }

  private getSuggestions() {
    this.apiService
      .DMSDocumentSuggestion(this.parentRef(), 'Arende', 'Handling')
      .pipe(
        map(res => res.entries.map(e => ({ label: e.title, id: e.uid, path: e.path }))),
        tap(opts => this.caseOptions.set(opts))
      )
      .subscribe();
  }

  addContact(newEl: ArendeRefOption) {
    this.references().update(refs => [...refs, newEl]);

    this.saveReferences.emit();
    this.updateTableData();
  }

  removeContact(item: ArendeRefOption) {
    this.references().update(refs => refs.filter(r => r.id !== item.id));
  }

  private safeUser(value: unknown): string {
    if (!value) return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'entity-type' in value && value['entity-type'] === 'user') {
      const user = value as NxUser;
      const props = user.properties ?? {};
      return [props.firstName, props.lastName].filter(Boolean).join(' ') || props.username || '—';
    }
    return '—';
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.customColumnConfig().map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: true,
    }));
  }
}
