import { inject, Injectable } from '@angular/core';
import { GeneralStore } from '@app/core/services/general-store.service';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { AppRole } from '@app/shared/models/roles';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

const DEFAULT_TABLE_NAME = 'DEFAULT';
const REGISTRATOR_TABLE_NAME = 'REGISTRATOR';
const READY_TO_CLOSE_TABLE_NAME = 'READY_TO_CLOSE';
const MINA_AREDEN_TABLE_NAME = 'MINA_AREDEN';
const MINA_UPPGIFTER_TABLE_NAME = 'MINA_UPPGIFTER';
const MONITORING_TABLE_NAME = 'MINA_UPPGIFTER';
const INKOMMANDE_FILER_ATT_REGISTRERA_TABLE_NAME = 'INKOMMANDE_FILER_ATT_REGISTRERA';
const IMPORT_FILES_TABLE_NAME = 'IMPORT_FILES';

export interface CasesTableConfigResult {
  config: TableColumn[];
  actionsHeader: string | null;
}

@Injectable({ providedIn: 'root' })
export class ConstantProvider {
  generalStore = inject(GeneralStore);

  DEFAULT_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      asLink: true,
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'inkommet',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'inkommet',
      sortField: NUXEO_SCHEMA_FIELDS.dc.created,
      searchInputType: 'date',
      visible: true,
    },
    {
      id: 'motpart',
      label: this.generalStore.getValue('label.ui.schema.arende.motpart') ?? '',
      key: 'motpart',
      sortField: NUXEO_SCHEMA_FIELDS.arende.motpartMotpart,
      visible: true,
    },
    {
      id: 'avdelning',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigOrganisatoriskEnhet') ?? '',
      key: 'avdelning',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet,
      visible: true,
    },
    {
      id: 'rubrik',
      label: 'Rubrik', //doesn't have label on BE
      key: 'rubrik',
      sortField: NUXEO_SCHEMA_FIELDS.dc.subjects,
      visible: true,
    },
  ];
  MINA_AREDEN_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      asLink: true,
      visible: true,
      class: 'max-w-[420px] min-w-[420px] truncate',
    },
    {
      id: 'status',
      label: this.generalStore.getValue('label.ui.schema.arende.arendestatus') ?? '',
      key: 'status',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendestatus,
      visible: true,
    },
    {
      id: 'arendenummer',
      label: this.generalStore.getValue('label.ui.schema.arende.arendenummer') ?? '',
      key: 'arendenummer',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendenummer,
      visible: true,
    },
    {
      id: 'datum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetRegistreratDatum') ?? '',
      key: 'datum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum,
      searchInputType: 'date',
      visible: true,
    },
    {
      id: 'handlaggare',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigHandlaggare') ?? '',
      key: 'handlaggare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare,
      visible: true,
    },

    {
      id: 'arendetyp',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetyp') ?? '',
      key: 'arendetyp',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetyp,
      visible: false,
    },
    {
      id: 'riktning',
      label: this.generalStore.getValue('label.ui.schema.arende.riktning') ?? '',
      key: 'riktning',
      sortField: NUXEO_SCHEMA_FIELDS.arende.riktning,
      visible: false,
    },
    {
      id: 'sekretess',
      label: this.generalStore.getValue('label.ui.schema.arende.sekretess') ?? '',
      key: 'sekretess',
      sortField: NUXEO_SCHEMA_FIELDS.arende.sekretess,
      visible: false,
    },
    {
      id: 'sakerhetsskyddsklassificering',
      label: this.generalStore.getValue('label.ui.schema.arende.sakerhetsskyddsklassificering') ?? '',
      key: 'sakerhetsskyddsklassificering',
      sortField: NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering,
      visible: false,
    },
    {
      id: 'handlaggningsstatus',
      label: this.generalStore.getValue('label.document.type.handlaggningsstatus') ?? '',
      key: 'handlaggningsstatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus,
      visible: false,
    },
    {
      id: 'ansvarigEnhet',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigOrganisatoriskEnhet') ?? '',
      key: 'ansvarigEnhet',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet,
      searchField: 'arende_ansvarig_organisatorisk_enhet',
      visible: false,
    },
    {
      id: 'ansvarigChef',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigOrganisationsenhetschef') ?? '',
      key: 'ansvarigChef',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef,
      searchField: 'arende_ansvarig_organisationsenhetschef',
      visible: false,
    },
    {
      id: 'beslutsfattare',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigBeslutsfattare') ?? '',
      key: 'beslutsfattare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare,
      searchField: 'arende_ansvarig_beslutsfattare',
      visible: false,
    },
    {
      id: 'medhandlaggare',
      label: this.generalStore.getValue('label.ui.schema.arende.medhandlaggare') ?? '',
      key: 'medhandlaggare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.medhandlaggare,
      searchField: 'arende_medhandlaggare',
      visible: false,
    },
    {
      id: 'granskare',
      label: this.generalStore.getValue('label.ui.schema.arende.granskare') ?? '',
      key: 'granskare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.granskare,
      searchField: 'arende_granskare',
      visible: false,
    },
    {
      id: 'behorighetsstatus',
      label: 'Ärendeprocess',
      key: 'behorighetsstatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus,
      class: 'text-center',
      visible: false,
    },
    {
      id: 'motpart',
      label: this.generalStore.getValue('label.ui.schema.arende.motpart') ?? '',
      key: 'motpart',
      sortField: NUXEO_SCHEMA_FIELDS.arende.motpartMotpart,
      visible: false,
    },
    {
      id: 'arendemening',
      label: this.generalStore.getValue('label.ui.schema.arende.arendemening') ?? '',
      key: 'arendemening',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendemening,
      visible: false,
    },
    {
      id: 'internArendemening',
      label: this.generalStore.getValue('label.ui.schema.arende.internArendemening') ?? '',
      key: 'internArendemening',
      sortField: NUXEO_SCHEMA_FIELDS.arende.internArendemening,
      visible: false,
    },
    {
      id: 'arkiveratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetArkiveratDatum') ?? '',
      key: 'arkiveratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum,
      searchField: 'arende_arendet_arkiverat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'gallratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetGallratDatum') ?? '',
      key: 'gallratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum,
      searchField: 'arende_arendet_gallrat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'makuleratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetMakuleratDatum') ?? '',
      key: 'makuleratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum,
      searchField: 'arende_arendet_makulerat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'jkKommentar',
      label: this.generalStore.getValue('label.ui.schema.arende.jkKommentar') ?? '',
      key: 'jkKommentar',
      sortField: NUXEO_SCHEMA_FIELDS.arende.jkKommentar,
      searchField: 'arende_jk_kommentar',
      visible: false,
    },
    {
      id: 'allmanKommentar',
      label: this.generalStore.getValue('label.ui.schema.arende.allmanKommentar') ?? '',
      key: 'allmanKommentar',
      sortField: NUXEO_SCHEMA_FIELDS.arende.allmanKommentar,
      searchField: 'arende_allman_kommentar',
      visible: false,
    },
    {
      id: 'bevarasGallras',
      label: this.generalStore.getValue('label.ui.schema.arende.bevarasGallras') ?? '',

      key: 'bevarasGallras',
      sortField: NUXEO_SCHEMA_FIELDS.arende.bevarasGallras,
      searchField: 'arende_bevaras_gallras',
      visible: false,
    },

    {
      id: 'created',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'created',
      sortField: NUXEO_SCHEMA_FIELDS.dc.created,
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'modified',
      label: this.generalStore.getValue('label.dublincore.modified') ?? '',
      key: 'modified',
      sortField: NUXEO_SCHEMA_FIELDS.dc.modified,
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'lastContributor',
      label: this.generalStore.getValue('label.dublincore.lastContributor') ?? '',
      key: 'lastContributor',
      sortField: NUXEO_SCHEMA_FIELDS.dc.lastContributor,
      searchField: 'dc_lastContributor',
      visible: false,
    },
    {
      id: 'handlaggningPaborjad',
      label: this.generalStore.getValue('label.ui.schema.arende.handlaggningPaborjadDatum') ?? '',
      key: 'handlaggningPaborjad',
      sortField: NUXEO_SCHEMA_FIELDS.arende.handlaggningPaborjadDatum,
      searchField: 'arende_handlaggning_paborjad',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'handlaggningAvslutad',
      label: this.generalStore.getValue('label.ui.schema.arende.handlaggningAvslutadDatum') ?? '',
      key: 'handlaggningAvslutad',
      sortField: NUXEO_SCHEMA_FIELDS.arende.handlaggningAvslutadDatum,
      searchField: 'arende_handlaggning_avslutad',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'beslutatDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.beslutatDatum') ?? '',
      key: 'beslutatDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.beslutatDatum,
      searchField: 'arende_beslutat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'beslutExpedieratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.beslutExpedieratDatum') ?? '',
      key: 'beslutExpedieratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.beslutExpedieratDatum,
      searchField: 'arende_beslut_expedierat_datum',
      searchInputType: 'date',
      visible: false,
    },
  ];

  REGISTRATOR_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      asLink: true,
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'inkommet',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'inkommet',
      sortField: NUXEO_SCHEMA_FIELDS.dc.created,
      searchInputType: 'date',
      visible: true,
    },
    {
      id: 'arendetyp',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetyp') ?? '',
      key: 'arendetyp',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetyp,
      visible: true,
    },
    {
      id: 'arendenummer',
      label: this.generalStore.getValue('label.ui.schema.arende.arendenummer') ?? '',
      key: 'arendenummer',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendenummer,
      visible: true,
      class: 'max-w-[150px] min-w-[150px] w-[150px]',
    },
    {
      id: 'registreratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetRegistreratDatum') ?? '',
      key: 'registreratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum,
      searchInputType: 'date',
      visible: true,
    },
    {
      id: 'arendestatus',
      label: this.generalStore.getValue('label.ui.schema.arende.arendestatus') ?? '',
      key: 'arendestatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendestatus,
      visible: true,
    },
    {
      id: 'handlaggningsstatus',
      label: this.generalStore.getValue('label.document.type.handlaggningsstatus') ?? '',
      key: 'handlaggningsstatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus,
      visible: true,
    },
    {
      id: 'behorighetsstatus',
      label: 'Ärendeprocess',
      key: 'behorighetsstatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus,
      class: 'text-center',
      visible: false,
    },
    {
      id: 'arendepart',
      label: this.generalStore.getValue('label.ui.schema.arende.motpart') ?? '',
      key: 'motpart',
      sortField: NUXEO_SCHEMA_FIELDS.arende.motpartMotpart,
      visible: false,
    },
    {
      id: 'riktning',
      label: this.generalStore.getValue('label.ui.schema.arende.riktning') ?? '',
      key: 'riktning',
      sortField: NUXEO_SCHEMA_FIELDS.arende.riktning,
      visible: true,
    },
    {
      id: 'sekretess',
      label: this.generalStore.getValue('label.ui.schema.arende.sekretess') ?? '',
      key: 'sekretess',
      sortField: NUXEO_SCHEMA_FIELDS.arende.sekretess,
      visible: false,
    },
    {
      id: 'sakerhetsskyddsklassificering',
      label: this.generalStore.getValue('label.ui.schema.arende.sakerhetsskyddsklassificering') ?? '',
      key: 'sakerhetsskyddsklassificering',
      sortField: NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering,
      visible: false,
    },
    {
      id: 'ansvarigEnhet',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigOrganisatoriskEnhet') ?? '',
      key: 'ansvarigEnhet',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet,
      visible: true,
      class: 'min-w-[200px] w-[200px]',
    },
    {
      id: 'ansvarigChef',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigOrganisationsenhetschef') ?? '',
      key: 'ansvarigChef',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef,
      visible: false,
    },
    {
      id: 'handlaggare',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigHandlaggare') ?? '',
      key: 'handlaggare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare,
      visible: true,
    },
    {
      id: 'beslutsfattare',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigBeslutsfattare') ?? '',
      key: 'beslutsfattare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare,
      searchField: 'arende_ansvarig_beslutsfattare',
      visible: false,
    },
    {
      id: 'medhandlaggare',
      label: this.generalStore.getValue('label.ui.schema.arende.medhandlaggare') ?? '',
      key: 'medhandlaggare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.medhandlaggare,
      searchField: 'arende_medhandlaggare',
      visible: false,
    },
    {
      id: 'granskare',
      label: this.generalStore.getValue('label.ui.schema.arende.granskare') ?? '',
      key: 'granskare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.granskare,
      searchField: 'arende_granskare',
      visible: false,
    },
    {
      id: 'arendemening',
      label: this.generalStore.getValue('label.ui.schema.arende.arendemening') ?? '',
      key: 'arendemening',
      class: 'max-w-[300px] min-w-[300px] truncate',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendemening,
      searchField: 'arende_arendemening',
      visible: false,
    },
    {
      id: 'internArendemening',
      label: this.generalStore.getValue('label.ui.schema.arende.internArendemening') ?? '',
      key: 'internArendemening',
      class: 'max-w-[300px] min-w-[300px] truncate',
      sortField: NUXEO_SCHEMA_FIELDS.arende.internArendemening,
      searchField: 'arende_intern_arendemening',
      visible: false,
    },
    {
      id: 'bevarasGallras',
      label: this.generalStore.getValue('label.ui.schema.arende.bevarasGallras') ?? '',
      key: 'bevarasGallras',
      sortField: NUXEO_SCHEMA_FIELDS.arende.bevarasGallras,
      searchField: 'arende_bevaras_gallras',
      visible: false,
    },
    {
      id: 'innehallerPersonuppgifter',
      label: this.generalStore.getValue('label.ui.schema.arende.innehallerPersonuppgifterGdpr') ?? '',
      key: 'innehallerPersonuppgifter',
      sortField: NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr,
      visible: false,
    },
    {
      id: 'jkKommentar',
      label: this.generalStore.getValue('label.ui.schema.arende.jkKommentar') ?? '',
      key: 'jkKommentar',
      sortField: NUXEO_SCHEMA_FIELDS.arende.jkKommentar,
      searchField: 'arende_jk_kommentar',
      visible: false,
    },
    {
      id: 'allmanKommentar',
      label: this.generalStore.getValue('label.ui.schema.arende.allmanKommentar') ?? '',
      key: 'allmanKommentar',
      sortField: NUXEO_SCHEMA_FIELDS.arende.allmanKommentar,
      searchField: 'arende_allman_kommentar',
      visible: false,
    },
    {
      id: 'arkiveratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetArkiveratDatum') ?? '',
      key: 'arkiveratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum,
      searchField: 'arende_arendet_arkiverat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'gallratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetGallratDatum') ?? '',
      key: 'gallratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum,
      searchField: 'arende_arendet_gallrat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'makuleratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetMakuleratDatum') ?? '',
      key: 'makuleratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum,
      searchField: 'arende_arendet_makulerat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'handlaggningPaborjad',
      label: this.generalStore.getValue('label.ui.schema.arende.handlaggningPaborjadDatum') ?? '',
      key: 'handlaggningPaborjad',
      sortField: NUXEO_SCHEMA_FIELDS.arende.handlaggningPaborjadDatum,
      searchField: 'arende_handlaggning_paborjad',
      visible: false,
    },
    {
      id: 'handlaggningAvslutad',
      label: this.generalStore.getValue('label.ui.schema.arende.handlaggningAvslutadDatum') ?? '',
      key: 'handlaggningAvslutad',
      sortField: NUXEO_SCHEMA_FIELDS.arende.handlaggningAvslutadDatum,
      searchField: 'arende_handlaggning_avslutad',
      visible: false,
    },
    {
      id: 'beslutatDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.beslutatDatum') ?? '',
      key: 'beslutatDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.beslutatDatum,
      searchField: 'arende_beslutat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'beslutExpedieratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.beslutExpedieratDatum') ?? '',
      key: 'beslutExpedieratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.beslutExpedieratDatum,
      searchField: 'arende_beslut_expedierat_datum',
      searchInputType: 'date',
      visible: false,
    },
    {
      id: 'modified',
      label: this.generalStore.getValue('label.dublincore.modified') ?? '',
      key: 'modified',
      sortField: NUXEO_SCHEMA_FIELDS.dc.modified,
      visible: false,
    },
    {
      id: 'created',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'created',
      sortField: NUXEO_SCHEMA_FIELDS.dc.created,
      searchInputType: 'date',
      visible: false,
    },
  ];

  READY_TO_CLOSE_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      asLink: true,
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'arendenummer',
      label: this.generalStore.getValue('label.ui.schema.arende.arendenummer') ?? '',
      key: 'arendenummer',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendenummer,
      visible: true,
    },
    {
      id: 'registreratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetRegistreratDatum') ?? '',
      key: 'registreratDatum',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum,
      visible: true,
    },
    {
      id: 'arendetyp',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetyp') ?? '',
      key: 'arendetyp',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendetyp,
      visible: true,
    },
    {
      id: 'arendepart',
      label: this.generalStore.getValue('label.ui.schema.arende.motpart') ?? '',
      key: 'arendepart',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendepart,
      visible: true,
    },
    {
      id: 'riktning',
      label: this.generalStore.getValue('label.ui.schema.arende.riktning') ?? '',
      key: 'riktning',
      sortField: NUXEO_SCHEMA_FIELDS.arende.riktning,
      visible: true,
    },
    {
      id: 'ansvarigEnhet',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigOrganisatoriskEnhet') ?? '',
      key: 'ansvarigEnhet',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet,
      visible: true,
    },
    {
      id: 'handlaggare',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigHandlaggare') ?? '',
      key: 'handlaggare',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare,
      visible: true,
    },
    {
      id: 'arendestatus',
      label: this.generalStore.getValue('label.ui.schema.arende.arendestatus') ?? '',
      key: 'arendestatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.arendestatus,
      visible: true,
    },
    {
      id: 'handlaggningsstatus',
      label: this.generalStore.getValue('label.document.type.handlaggningsstatus') ?? '',
      key: 'handlaggningsstatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus,
      visible: true,
    },
    {
      id: 'behorighetsstatus',
      label: 'Ärendeprocess',
      key: 'behorighetsstatus',
      sortField: NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus,
      class: 'text-center',
      visible: false,
    },
    {
      id: 'sekretess',
      label: this.generalStore.getValue('label.ui.schema.arende.sekretess') ?? '',
      key: 'sekretess',
      sortField: NUXEO_SCHEMA_FIELDS.arende.sekretess,
      visible: false,
    },
    {
      id: 'sakerhetsskyddsklassificering',
      label: this.generalStore.getValue('label.ui.schema.arende.sakerhetsskyddsklassificering') ?? '',
      key: 'sakerhetsskyddsklassificering',
      sortField: NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering,
      visible: false,
    },
    {
      id: 'ansvarigChef',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigOrganisationsenhetschef') ?? '',
      key: 'ansvarigChef',
      sortField: NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef,
      visible: false,
    },
    {
      id: 'beslutsfattare',
      label: this.generalStore.getValue('label.ui.schema.arende.ansvarigBeslutsfattare') ?? '',
      key: 'beslutsfattare',
      searchField: 'arende_ansvarig_beslutsfattare',
      visible: false,
    },
    {
      id: 'medhandlaggare',
      label: this.generalStore.getValue('label.ui.schema.arende.medhandlaggare') ?? '',
      key: 'medhandlaggare',
      searchField: 'arende_medhandlaggare',
      visible: false,
    },
    {
      id: 'granskare',
      label: this.generalStore.getValue('label.ui.schema.arende.granskare') ?? '',
      key: 'granskare',
      searchField: 'arende_granskare',
      visible: false,
    },
    {
      id: 'bevarasGallras',
      label: this.generalStore.getValue('label.ui.schema.arende.bevarasGallras') ?? '',
      key: 'bevarasGallras',
      searchField: 'arende_bevaras_gallras',
      visible: false,
    },
    {
      id: 'arkiveratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetArkiveratDatum') ?? '',
      key: 'arkiveratDatum',
      searchField: 'arende_arendet_arkiverat_datum',
      visible: false,
    },
    {
      id: 'gallratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetGallratDatum') ?? '',
      key: 'gallratDatum',
      searchField: 'arende_arendet_gallrat_datum',
      visible: false,
    },
    {
      id: 'makuleratDatum',
      label: this.generalStore.getValue('label.ui.schema.arende.arendetMakuleratDatum') ?? '',
      key: 'makuleratDatum',
      searchField: 'arende_arendet_makulerat_datum',
      visible: false,
    },
  ];
  MINA_UPPGIFTER_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'docTitel',
      label: 'Dokumenttitel', // doesn't have name from BE
      key: 'docTitel',
      asLink: true,
      visible: true,
      class: 'max-w-[350px] min-w-[350px] w-[350px] truncate',
    },
    {
      id: 'created',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'created',
      visible: true,
    },
    {
      id: 'actors',
      label: this.generalStore.getValue('label.dublincore.contributors') ?? '',
      key: 'actors',
      visible: true,
    },
    {
      id: 'description',
      label: this.generalStore.getValue('label.dublincore.description') ?? '',
      key: 'description',
      visible: true,
    },
    {
      id: 'initiator',
      label: 'Initierad av', //doesnt have label on BE
      key: 'workflowInitiator',
      visible: true,
    },
    { id: 'reminder', label: 'Påminnelse', key: 'reminder', visible: true }, //doesnt have label on BE
    { id: 'deadline', label: 'Deadline', key: 'deadline', visible: true, class: 'text-red-600 font-semibold' }, //doesnt have label on BE
  ];

  MONITORING_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      asLink: true,
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'created',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'created',
      visible: true,
    },
    {
      id: 'actors',
      label: this.generalStore.getValue('label.dublincore.contributors') ?? '',
      key: 'actors',
      visible: true,
    },
    {
      id: 'description',
      label: this.generalStore.getValue('label.dublincore.description') ?? '',
      key: 'description',
      visible: true,
    },
    {
      id: 'initiator',
      label: 'Initiator', //doesn't have label on BE
      key: 'workflowInitiator',
      visible: true,
    },
    { id: 'deadline', label: 'Deadline', key: 'deadline', visible: true, class: 'text-red-600 font-semibold' }, //doesn't have label on BE
    { id: 'reminder', label: 'Reminder', key: 'reminder', visible: true }, //doesn't have label on BE
  ];

  UTKAST_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      asLink: true,
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'created',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'created',
      sortField: NUXEO_SCHEMA_FIELDS.dc.created,
      visible: true,
    },
    { id: 'creator', label: 'Skapare', key: 'creator', sortField: NUXEO_SCHEMA_FIELDS.dc.creator, visible: true }, //doesn't have label on BE
    {
      id: 'lastContributor',
      label: this.generalStore.getValue('label.dublincore.lastContributor') ?? '',
      key: 'lastContributor',
      sortField: NUXEO_SCHEMA_FIELDS.dc.lastContributor,
      visible: true,
    },
    {
      id: 'contributors',
      label: this.generalStore.getValue('label.dublincore.contributors') ?? '',
      key: 'contributors',
      sortField: NUXEO_SCHEMA_FIELDS.dc.contributors,
      visible: true,
    },
    { id: 'state', label: this.generalStore.getValue('label.state') ?? '', key: 'state', visible: true },
  ];

  INKOMMANDE_FILER_ATT_REGISTRERA_TABLE_NAME_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      asLink: true,
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'sender',
      label: this.generalStore.getValue('label.ui.schema.handling.avsandare') ?? '',
      key: 'sender',
      sortField: NUXEO_SCHEMA_FIELDS.mail.sender,
      visible: true,
    },
    {
      id: 'recipients',
      label: this.generalStore.getValue('label.ui.schema.handling.mottagare') ?? '',
      key: 'recipients',
      sortField: NUXEO_SCHEMA_FIELDS.mail.recipients,
      visible: true,
    },
    {
      id: 'sendingDate',
      label: 'Skickad datum',
      key: 'sendingDate',
      sortField: NUXEO_SCHEMA_FIELDS.mail.sendingDate,
      visible: true,
    }, //doesn't have label on BE
    {
      id: 'ccRecipients',
      label: this.generalStore.getValue('label.mail.message.cc_recipients') ?? '',
      key: 'ccRecipients',
      sortField: NUXEO_SCHEMA_FIELDS.mail.ccRecipients,
      visible: false,
    },
    {
      id: 'messageId',
      label: 'Meddelande-ID',
      key: 'messageId',
      sortField: NUXEO_SCHEMA_FIELDS.mail.messageId,
      visible: false,
    }, //doesn't have label on BE
    { id: 'text', label: 'Text', key: 'text', sortField: NUXEO_SCHEMA_FIELDS.mail.text, visible: false }, //doesn't have label on BE
    {
      id: 'created',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'created',
      sortField: NUXEO_SCHEMA_FIELDS.dc.created,
      visible: false,
    },
    {
      id: 'modified',
      label: this.generalStore.getValue('label.dublincore.modified') ?? '',
      key: 'modified',
      sortField: NUXEO_SCHEMA_FIELDS.dc.modified,
      visible: false,
    },
    {
      id: 'lastContributor',
      label: this.generalStore.getValue('label.dublincore.lastContributor') ?? '',
      key: 'lastContributor',
      sortField: NUXEO_SCHEMA_FIELDS.dc.lastContributor,
      searchField: 'dc_lastContributor',
      visible: false,
    },
    {
      id: 'arendenummer',
      label: this.generalStore.getValue('label.ui.schema.arende.arendenummer') ?? '',
      key: 'arendenummer',
      sortField: 'dms_mail:extraheradeData.arendenummer.varde',
      visible: true,
    },
  ];

  IMPORT_FILES_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      id: 'title',
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      asLink: true,
      visible: true,
      class: 'max-w-[360px] min-w-[360px] truncate',
    },
    {
      id: 'modified',
      label: this.generalStore.getValue('label.dublincore.modified') ?? '',
      key: 'modified',
      sortField: NUXEO_SCHEMA_FIELDS.dc.modified,
      visible: true,
    },
    {
      id: 'created',
      label: this.generalStore.getValue('label.dublincore.created') ?? '',
      key: 'created',
      sortField: NUXEO_SCHEMA_FIELDS.dc.created,
      visible: true,
    },
    {
      id: 'lastContributor',
      label: this.generalStore.getValue('label.dublincore.lastContributor') ?? '',
      key: 'lastContributor',
      sortField: NUXEO_SCHEMA_FIELDS.dc.lastContributor,
      visible: true,
    },
    {
      id: 'description',
      label: this.generalStore.getValue('label.dublincore.description') ?? '',
      key: 'description',
      sortField: NUXEO_SCHEMA_FIELDS.dc.description,
      visible: true,
    },
    {
      id: 'dataExtracted',
      label: this.generalStore.getValue('label.ui.schema.import.datumNarDataExtraherades') ?? '',
      key: 'dataExtracted',
      sortField: NUXEO_SCHEMA_FIELDS.import.arDataExtraherad,
      visible: true,
    },
  ];

  DEFAULT_COLS: TableColumn[] = this.DEFAULT_COLS_BASE.map(c => ({
    ...c,
    tableName: DEFAULT_TABLE_NAME,
  }));
  MINA_AREDEN_COLS: TableColumn[] = this.MINA_AREDEN_COLS_BASE.map(c => ({
    ...c,
    tableName: MINA_AREDEN_TABLE_NAME,
  }));

  REGISTRATOR_COLS: TableColumn[] = this.REGISTRATOR_COLS_BASE.map(c => ({
    ...c,
    tableName: REGISTRATOR_TABLE_NAME,
  }));
  READY_TO_CLOSE_COLS: TableColumn[] = this.READY_TO_CLOSE_COLS_BASE.map(c => ({
    ...c,
    tableName: READY_TO_CLOSE_TABLE_NAME,
  }));
  UTKAST_COLS: TableColumn[] = this.UTKAST_COLS_BASE.map(c => ({
    ...c,
    tableName: 'UTKAST_TABLE_NAME',
  }));
  MINA_UPPGIFTER_COLS: TableColumn[] = this.MINA_UPPGIFTER_COLS_BASE.map(c => ({
    ...c,
    tableName: MINA_UPPGIFTER_TABLE_NAME,
  }));

  MONITORING_COLS: TableColumn[] = this.MONITORING_COLS_BASE.map(c => ({
    ...c,
    tableName: MONITORING_TABLE_NAME,
  }));

  INKOMMANDE_FILER_ATT_REGISTRERA_TABLE_NAME_COLS: TableColumn[] =
    this.INKOMMANDE_FILER_ATT_REGISTRERA_TABLE_NAME_COLS_BASE.map(c => ({
      ...c,
      tableName: INKOMMANDE_FILER_ATT_REGISTRERA_TABLE_NAME,
    }));

  IMPORT_FILES_COLS: TableColumn[] = this.IMPORT_FILES_COLS_BASE.map(c => ({
    ...c,
    tableName: IMPORT_FILES_TABLE_NAME,
  }));

  resolveCasesTableConfig = (options: {
    role: AppRole | null;
    tab: string;
    isAdmin: boolean;
  }): CasesTableConfigResult => {
    const roleKey = options.role ? options.role.toLowerCase() : '';
    const tabKey = (options.tab ?? '').toLowerCase();

    if (options.isAdmin) {
      switch (tabKey) {
        case 'my-tasks':
          return { config: this.MINA_UPPGIFTER_COLS, actionsHeader: null };
        case 'e-post':
          return { config: this.INKOMMANDE_FILER_ATT_REGISTRERA_TABLE_NAME_COLS, actionsHeader: 'Åtgärder' };
        case 'scans':
          return { config: this.IMPORT_FILES_COLS, actionsHeader: null };
        case 'my-cases':
        case 'my-co-handled-cases':
          return { config: this.MINA_AREDEN_COLS, actionsHeader: 'Åtgärder' };
        case 'my-utkasts':
          return { config: this.UTKAST_COLS, actionsHeader: 'Åtgärder' };
        case 'my-monitoring':
          return { config: this.MONITORING_COLS, actionsHeader: null };
        case 'all-docs':
          return { config: this.REGISTRATOR_COLS, actionsHeader: 'Åtgärder' };
        case 'ready-to-close':
          return { config: this.READY_TO_CLOSE_COLS, actionsHeader: null };
        default:
          return { config: [], actionsHeader: null };
      }
    }

    if (roleKey === 'registrator') {
      switch (tabKey) {
        case 'my-tasks':
          return { config: this.MINA_UPPGIFTER_COLS, actionsHeader: null };
        case 'all-docs':
          return { config: this.REGISTRATOR_COLS, actionsHeader: 'Åtgärder' };
        case 'e-post':
          return { config: this.INKOMMANDE_FILER_ATT_REGISTRERA_TABLE_NAME_COLS, actionsHeader: null };
        case 'scans':
          return { config: this.IMPORT_FILES_COLS, actionsHeader: null };
        case 'ready-to-close':
          return { config: this.READY_TO_CLOSE_COLS, actionsHeader: null };
        default:
          return { config: [], actionsHeader: null };
      }
    }

    if (roleKey === 'handlaggare') {
      switch (tabKey) {
        case 'my-tasks':
          return { config: this.MINA_UPPGIFTER_COLS, actionsHeader: null };
        case 'my-monitoring':
          return { config: this.MONITORING_COLS, actionsHeader: null };
        case 'my-cases':
        case 'my-co-handled-cases':
          return { config: this.MINA_AREDEN_COLS, actionsHeader: 'Åtgärder' };
        case 'my-utkasts':
          return { config: this.UTKAST_COLS, actionsHeader: 'Åtgärder' };
        default:
          return { config: [], actionsHeader: null };
      }
    }

    return { config: this.DEFAULT_COLS, actionsHeader: 'Åtgärder' };
  };
}
