export const DMS_SEARCH_FIELDS = new Set<string>([
  'arende_arendenummer',
  'arende_arendemening',
  'arende_arendepart',
  'arende_arendetyp',
  'arende_arendestatus',
  'arende_behorighetsstatus',
  'arende_handlaggningsstatus',
  'arende_riktning',
  'arende_sekretess',
  'arende_sakerhetsskyddsklassificering',
  'arende_ansvarig_organisatorisk_enhet',
  'arende_ansvarig_handlaggare',
  'handling_handlingsstatus',
  'handling_handlingsriktning',
  'handling_sekretess',
  'handling_sakerhetsskyddsklassificering',
  'handling_ansvarig_organisatorisk_enhet',
  'handling_ansvarig_handlaggare',
]);

export const EXACT_SEARCH_FIELDS = new Set<string>([
  'arende_ansvarig_organisatorisk_enhet',
  'arende_ansvarig_handlaggare',
  'handling_ansvarig_organisatorisk_enhet',
  'handling_ansvarig_handlaggare',
  'dc_created',
  'dc_modified',
  'dublincore_created_agg',
  'dc_created_agg',
  'dc_modified_agg',
]);

export const NON_AGGREGATED_FIELDS = new Set<string>([
  'arende_ansvarig_handlaggare',
  'arende_ansvarig_organisatorisk_enhet',
]);
