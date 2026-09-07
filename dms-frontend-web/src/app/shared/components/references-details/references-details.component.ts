import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { tap } from 'rxjs';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { CaseListTableComponent, TableColumn } from '../case-list-table/case-list-table.component';
import { DigiButton, DigiIconTrash } from '@designsystem-se/af-angular';
import { RefsButtonWithDialogComponent } from '../edit-form-components/refs-button-with-dialog/refs-button-with-dialog.component';
import { TableColOption } from '../table-col-options/table-col-options.component';

import { ArendeProperties, HandlingProperties, SearchResult } from '@app/shared/api/nuxeo-api.types';

import { ArendeRefOption } from '../edit-form-components/case-reference.component/case-reference.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DocumentValueService } from '@app/core/services/document-value-service.service';

type BooleanValue = boolean | null | undefined;
type ArendeTypeValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.arendetyp];
type ArendeStatusValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.arendestatus];
type ArendeHandlaggningStatusValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus];
type ArendeBehorighetsStatusValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus];
type ArendeRiktningValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.riktning];
type ArendeSekretessValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.sekretess];
type ArendeSakerhetValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering];
type ArendeBevarasValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.bevarasGallras];
type ArendeUserValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare];
type ArendeChefValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef];
type ArendeBeslutsfattareValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare];
type ArendeMedhandlaggareValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.medhandlaggare];
type ArendeGranskareValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.granskare];
type ArendeEnhetValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet];
type ArendeCounterpartyValue = string | null | undefined;
type ArendeKommentarValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.jkKommentar];
type ArendeAllmanKommentarValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.arende.allmanKommentar];
type LastContributorValue = ArendeProperties[typeof NUXEO_SCHEMA_FIELDS.dc.lastContributor];
type HandlingStatusValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.handlingsstatus];
type HandlingSekretessValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.sekretess];
type HandlingSakerhetValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.sakerhetsskyddsklassificering];
type HandlingBevarasValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.bevarasGallras];
type HandlingBeslutsfattareValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.beslutsfattare];
type HandlingEnhetValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.ansvarigOrganisatoriskEnhet];
type HandlingMedhandlaggareValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.medhandlaggare];
type HandlingGranskareValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.handling.granskare];
type HandlingCreatedByValue = HandlingProperties[typeof NUXEO_SCHEMA_FIELDS.dc.creator];
type RefStatusValue = ArendeStatusValue | ArendeRefOption['status'];
type RefRiktningValue = ArendeRiktningValue | ArendeRefOption['riktning'];
type RefResponsibleOfficerValue = ArendeUserValue | ArendeRefOption['responsibleOfficer'];

interface ReferenceRow {
  id?: ArendeRefOption['id'];
  caseRef?: ArendeRefOption['caseRef'];
  type?: ArendeRefOption['type'];
  comment?: ArendeRefOption['comment'];
  displayType?: ArendeRefOption['displayType'];
  caseTitle?: ArendeRefOption['caseTitle'];
  caseNumber?: ArendeRefOption['caseNumber'];
  status?: RefStatusValue;
  date?: ArendeRefOption['date'];
  responsibleOfficer?: RefResponsibleOfficerValue;
  handlingNumber?: ArendeRefOption['handlingNumber'];
  handlingTitle?: ArendeRefOption['handlingTitle'];
  displayCase?: ArendeRefOption['displayCase'];
  counterparty?: ArendeCounterpartyValue;
  riktning?: RefRiktningValue;
  link?: ArendeRefOption['link'];

  path?: string;
  arendetyp?: ArendeTypeValue;
  arendestatus?: ArendeStatusValue;
  handlaggningsstatus?: ArendeHandlaggningStatusValue;
  behorighetsstatus?: ArendeBehorighetsStatusValue;
  sekretess?: ArendeSekretessValue;
  sakerhetsskyddsklassificering?: ArendeSakerhetValue;
  arendepart?: ArendeCounterpartyValue;
  ansvarigEnhet?: ArendeEnhetValue;
  ansvarigChef?: ArendeChefValue;
  handlaggare?: ArendeUserValue;
  beslutsfattare?: ArendeBeslutsfattareValue;
  medhandlaggare?: ArendeMedhandlaggareValue;
  granskare?: ArendeGranskareValue;
  arendemening?: string;
  internArendemening?: string;
  bevarasGallras?: ArendeBevarasValue;
  innehallerPersonuppgifter?: BooleanValue;
  jkKommentar?: ArendeKommentarValue;
  allmanKommentar?: ArendeAllmanKommentarValue;
  arkiveratDatum?: string;
  gallratDatum?: string;
  makuleratDatum?: string;
  handlaggningPaborjad?: string;
  handlaggningAvslutad?: string;
  beslutatDatum?: string;
  beslutExpedieratDatum?: string;
  created?: string;
  modified?: string;
  lastContributor?: LastContributorValue;

  handlingStatus?: HandlingStatusValue;
  handlingSekretess?: HandlingSekretessValue;
  handlingSakerhetsskyddsklassificering?: HandlingSakerhetValue;
  handlingBevarasGallras?: HandlingBevarasValue;
  handlingInnehallerPersonuppgifter?: BooleanValue;
  handlingBeslutsfattare?: HandlingBeslutsfattareValue;
  handlingAnsvarigEnhet?: HandlingEnhetValue;
  handlingMedhandlaggare?: HandlingMedhandlaggareValue;
  handlingGranskare?: HandlingGranskareValue;
  handlingGranskningsdatum?: string;
  handlingGranskningskommentar?: string;
  handlingUpprattadDatum?: string;
  handlingArkiveradDatum?: string;
  handlingGallradDatum?: string;
  handlingMakuleradDatum?: string;
  handlingSignerad?: BooleanValue;
  handlingCreatedBy?: HandlingCreatedByValue;
  handlingModified?: string;
}

@Component({
  selector: 'nuxeo-references-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseListTableComponent, DigiButton, DigiIconTrash, RefsButtonWithDialogComponent],
  templateUrl: './references-details.component.html',
})
export class ReferencesDetailsComponent implements OnInit {
  parentRef = input.required<string>();
  references = input.required<ArendeRefOption[]>();
  refType = input.required<'Handling' | 'Arende'>();
  columnsConfig = input.required<TableColumn[]>();
  hideAddButton = input<boolean>(false);

  updateReferences = output<ArendeRefOption[]>();

  private apiService = inject(NuxeoApiService);
  private documentValueService = inject(DocumentValueService);

  newReferences = signal<ReferenceRow[]>([]);

  sourceRows = computed<ReferenceRow[]>(() => (this.newReferences().length ? this.newReferences() : this.references()));

  constructor() {
    effect(() => {
      if (this.references().length) {
        const ids = this.collectDocumentIds(this.references());
        this.getDataForTable(ids);
      } else {
        this.newReferences.set([]);
      }
    });
  }

  ngOnInit(): void {
    const ids = this.collectDocumentIds(this.references());
    this.getDataForTable(ids);
  }

  private collectDocumentIds(refs: ArendeRefOption[]): string[] {
    const ids: string[] = [];
    refs.forEach(ref => {
      if (ref.caseRef) ids.push(ref.caseRef);
    });
    return ids;
  }

  private getDataForTable(uids: string[]): void {
    if (!uids.length) return;

    this.apiService
      .getSeveralDocsByUids(uids)
      .pipe(
        tap((result: SearchResult) => {
          const updated: ReferenceRow[] = [];

          this.references().forEach(ref => {
            const found = result.entries.find(doc => doc.uid === ref.caseRef);

            if (!found) return;

            if (this.refType() === 'Arende') {
              const props: ArendeProperties = found.properties;
              const dir = this.documentValueService;
              const arendetyp = props[NUXEO_SCHEMA_FIELDS.arende.arendetyp];
              const arendestatus = props[NUXEO_SCHEMA_FIELDS.arende.arendestatus];
              const handlaggningsstatus = props[NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus];
              const behorighetsstatus = props[NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus];
              const riktning = props[NUXEO_SCHEMA_FIELDS.arende.riktning];
              const sekretess = props[NUXEO_SCHEMA_FIELDS.arende.sekretess];
              const sakerhetsskyddsklassificering = props[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering];
              const bevarasGallras = props[NUXEO_SCHEMA_FIELDS.arende.bevarasGallras];
              const ansvarigEnhet = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet];
              const innehallerPersonuppgifter = props[NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr];
              const handlaggare = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare];
              const ansvarigChef = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef];
              const beslutsfattare = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare];
              const medhandlaggare = props[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare];
              const granskare = props[NUXEO_SCHEMA_FIELDS.arende.granskare];

              updated.push({
                ...ref,
                path: found.path,
                caseNumber: props[NUXEO_SCHEMA_FIELDS.arende.arendenummer],
                displayType: ref.type ?? undefined,
                caseTitle: props[NUXEO_SCHEMA_FIELDS.arende.arendemening],

                status: arendestatus,
                date: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
                responsibleOfficer: handlaggare,
                counterparty: props[NUXEO_SCHEMA_FIELDS.arende.motpart]?.motpart ?? undefined,

                arendetyp,
                arendestatus,
                handlaggningsstatus,
                behorighetsstatus,
                riktning,
                sekretess,
                sakerhetsskyddsklassificering,
                arendepart: props[NUXEO_SCHEMA_FIELDS.arende.motpart]?.motpart,
                ansvarigEnhet,
                ansvarigChef,
                handlaggare,
                beslutsfattare,
                medhandlaggare,
                granskare,
                arendemening: props[NUXEO_SCHEMA_FIELDS.arende.arendemening],
                internArendemening: props[NUXEO_SCHEMA_FIELDS.arende.internArendemening],
                bevarasGallras,
                innehallerPersonuppgifter,
                jkKommentar: props[NUXEO_SCHEMA_FIELDS.arende.jkKommentar],
                allmanKommentar: props[NUXEO_SCHEMA_FIELDS.arende.allmanKommentar],
                arkiveratDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum]),
                gallratDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum]),
                makuleratDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum]),
                handlaggningPaborjad: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.handlaggningPaborjad]),
                handlaggningAvslutad: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.handlaggningAvslutad]),
                beslutatDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.beslutatDatum]),
                beslutExpedieratDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.arende.beslutExpedieratDatum]),
                created: dir.getDate(props[NUXEO_SCHEMA_FIELDS.dc.created]),
                modified: dir.getDate(props[NUXEO_SCHEMA_FIELDS.dc.modified]),
                lastContributor: props[NUXEO_SCHEMA_FIELDS.dc.lastContributor],
                link: ['/doc', found.uid],
              });
            } else {
              const props: HandlingProperties = found.properties;
              const dir = this.documentValueService;
              const handlingStatus = props[NUXEO_SCHEMA_FIELDS.handling.handlingsstatus];
              const handlingBevarasGallras = props[NUXEO_SCHEMA_FIELDS.handling.bevarasGallras];
              const handlingSekretess = props[NUXEO_SCHEMA_FIELDS.handling.sekretess];
              const handlingSakerhetsskyddsklassificering =
                props[NUXEO_SCHEMA_FIELDS.handling.sakerhetsskyddsklassificering];
              const handlingSignerad = props[NUXEO_SCHEMA_FIELDS.handling.signerad];
              const handlingInnehallerPersonuppgifter =
                props[NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr];
              const counterparty = props[NUXEO_SCHEMA_FIELDS.handling.avsandare]?.[0]?.namn;

              updated.push({
                ...ref,
                path: found.path,
                handlingNumber: props[NUXEO_SCHEMA_FIELDS.handling.handlingsnummer],
                displayType: ref.type ?? undefined,
                handlingTitle: props[NUXEO_SCHEMA_FIELDS.handling.handlingsnamn],
                counterparty,
                riktning: props[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning],
                date: dir.getDate(props[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]),
                responsibleOfficer: props[NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare],

                handlingStatus,
                handlingSekretess,
                handlingSakerhetsskyddsklassificering,
                handlingBevarasGallras,
                handlingInnehallerPersonuppgifter,
                handlingBeslutsfattare: props[NUXEO_SCHEMA_FIELDS.handling.beslutsfattare],
                handlingAnsvarigEnhet: props[NUXEO_SCHEMA_FIELDS.handling.ansvarigOrganisatoriskEnhet],
                handlingMedhandlaggare: props[NUXEO_SCHEMA_FIELDS.handling.medhandlaggare],
                handlingGranskare: props[NUXEO_SCHEMA_FIELDS.handling.granskare],
                handlingGranskningsdatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]),
                handlingGranskningskommentar: props[NUXEO_SCHEMA_FIELDS.handling.granskningskommentar],
                handlingUpprattadDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]),
                handlingArkiveradDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.handling.arkiveradDatum]),
                handlingGallradDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.handling.gallradDatum]),
                handlingMakuleradDatum: dir.getDate(props[NUXEO_SCHEMA_FIELDS.handling.makuleradDatum]),
                handlingSignerad,
                handlingCreatedBy: props[NUXEO_SCHEMA_FIELDS.dc.creator],
                handlingModified: dir.getDate(props[NUXEO_SCHEMA_FIELDS.dc.modified]),
                link: ['/doc', found.uid],
              });
            }
          });
          this.newReferences.set(updated);
        })
      )
      .subscribe();
  }

  removeContact(referenceToRemove: ArendeRefOption): void {
    const filteredReferences = this.references().filter(
      existingReference =>
        !(
          existingReference.caseRef === referenceToRemove.caseRef &&
          existingReference.type === referenceToRemove.type &&
          existingReference.comment === referenceToRemove.comment
        )
    );

    this.updateReferences.emit(filteredReferences);
  }

  addContact(newRef: ArendeRefOption): void {
    this.updateReferences.emit([...this.references(), newRef]);
  }

  getDefaultColumnOptions(): TableColOption[] {
    return this.columnsConfig().map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: column.visible ?? true,
    }));
  }
}
